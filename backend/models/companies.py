"""
Modelos e funções para manipulação de dados de empresas
"""
import sqlite3
import json
import os
import logging
from typing import Dict, Any, List, Optional
from utils.db_utils import safe_db_query, safe_db_execute, get_db_connection

logger = logging.getLogger(__name__)

def search_companies(query: str = "", limit: int = 50) -> List[Dict[str, Any]]:
    """
    Busca empresas por nome ou código
    
    Args:
        query: Termo de busca
        limit: Limite de resultados
        
    Returns:
        Lista de empresas encontradas
    """
    try:
        db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        
        if query:
            # Buscar por nome ou código
            search_query = f"%{query}%"
            rows = safe_db_query(
                db_path,
                'SELECT cod, name, group_name FROM companies WHERE name LIKE ? OR cod LIKE ? LIMIT ?',
                (search_query, search_query, limit),
                fetch_one=False
            )
        else:
            # Buscar todas (limitado)
            rows = safe_db_query(
                db_path,
                'SELECT cod, name, group_name FROM companies LIMIT ?',
                (limit,),
                fetch_one=False
            )
        
        companies = []
        for row in rows:
            companies.append({
                'cod': row[0],
                'name': row[1],
                'group_name': row[2]
            })
        
        return companies
        
    except Exception as e:
        logger.error(f"Erro ao buscar empresas: {str(e)}")
        return []

def get_company_details(company_identifier: str) -> Optional[Dict[str, Any]]:
    """
    Busca detalhes completos de uma empresa pelo código ou CNPJ
    
    Args:
        company_identifier: Código da empresa ou CNPJ
        
    Returns:
        Dados completos da empresa ou None se não encontrada
    """
    try:
        db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        
        # Primeiro, tentar buscar por código exato
        company_basic = safe_db_query(
            db_path,
            'SELECT cod, name, group_name FROM companies WHERE cod = ?',
            (company_identifier,),
            fetch_one=True
        )
        
        # Se não encontrou por código, tentar buscar por CNPJ nos dados detalhados
        if not company_basic:
            all_data = safe_db_query(
                db_path,
                'SELECT cod, companie_data FROM companies_data',
                fetch_one=False
            )
            
            for cod, data_json in all_data:
                if data_json:
                    try:
                        data = json.loads(data_json)
                        # Verificar se o CNPJ bate (considerando diferentes formatos)
                        cnpj_data = data.get('cnpj', '') or data.get('CNPJ', '')
                        if cnpj_data:
                            # Limpar formatação do CNPJ para comparação
                            cnpj_clean = ''.join(filter(str.isdigit, cnpj_data))
                            identifier_clean = ''.join(filter(str.isdigit, company_identifier))
                            
                            if cnpj_clean == identifier_clean:
                                # Encontrou por CNPJ, agora buscar dados básicos
                                company_basic = safe_db_query(
                                    db_path,
                                    'SELECT cod, name, group_name FROM companies WHERE cod = ?',
                                    (cod,),
                                    fetch_one=True
                                )
                                break
                    except:
                        continue
        
        if not company_basic:
            return None
        
        company_cod = company_basic[0]
        
        # Buscar dados detalhados
        company_data_row = safe_db_query(
            db_path,
            'SELECT companie_data FROM companies_data WHERE cod = ?',
            (company_cod,),
            fetch_one=True
        )
        
        company_details = {}
        if company_data_row and company_data_row[0]:
            try:
                company_details = json.loads(company_data_row[0])
            except:
                logger.warning(f"Erro ao fazer parse do JSON para empresa {company_cod}")
                company_details = {}
        
        # Montar resultado final
        result = {
            'cod': company_basic[0],
            'name': company_basic[1],
            'group_name': company_basic[2],
            **company_details  # Mesclar dados detalhados
        }
        
        # Garantir que campos essenciais existam
        if not result.get('razao_social') and result.get('name'):
            result['razao_social'] = result['name']
        
        if not result.get('cnpj'):
            # Tentar diferentes variações de campo CNPJ
            for cnpj_field in ['CNPJ', 'cnpj', 'documento']:
                if result.get(cnpj_field):
                    result['cnpj'] = result[cnpj_field]
                    break
        
        return result
        
    except Exception as e:
        logger.error(f"Erro ao buscar detalhes da empresa {company_identifier}: {str(e)}")
        return None

def get_company_by_cnpj(cnpj: str) -> Optional[Dict[str, Any]]:
    """
    Busca empresa especificamente por CNPJ
    
    Args:
        cnpj: CNPJ da empresa (com ou sem formatação)
        
    Returns:
        Dados da empresa ou None se não encontrada
    """
    return get_company_details(cnpj)

def count_companies() -> int:
    """
    Conta o total de empresas cadastradas
    
    Returns:
        Número total de empresas
    """
    try:
        db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        
        result = safe_db_query(
            db_path,
            'SELECT COUNT(*) FROM companies',
            fetch_one=True
        )
        
        return result[0] if result else 0
        
    except Exception as e:
        logger.error(f"Erro ao contar empresas: {str(e)}")
        return 0

def get_companies_without_details() -> List[str]:
    """
    Retorna lista de códigos de empresas que não têm dados detalhados
    
    Returns:
        Lista de códigos de empresas sem dados detalhados
    """
    try:
        db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        
        rows = safe_db_query(
            db_path,
            '''SELECT c.cod 
               FROM companies c 
               LEFT JOIN companies_data cd ON c.cod = cd.cod 
               WHERE cd.cod IS NULL OR cd.companie_data IS NULL OR cd.companie_data = ''
            ''',
            fetch_one=False
        )
        
        codes = [row[0] for row in rows] if rows else []
        return codes
        
    except Exception as e:
        logger.error(f"Erro ao buscar empresas sem detalhes: {str(e)}")
        return []
