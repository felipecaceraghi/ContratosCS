from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

companies_bp = Blueprint('companies', __name__, url_prefix='/companies')

@companies_bp.route('/search', methods=['GET'])
@jwt_required()
def search_companies():
    """
    Endpoint para buscar grupos de empresas por group_name
    GET /companies/search?q=termo
    """
    try:
        query = request.args.get('q', '').strip()
        
        if len(query) < 3:
            return jsonify({
                "status": "error",
                "message": "Digite pelo menos 3 caracteres para buscar"
            }), 400
        
        db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Buscar apenas grupos únicos por group_name (case insensitive)
        search_term = f"%{query}%"
        cursor.execute('''
            SELECT DISTINCT group_name, COUNT(*) as company_count
            FROM companies 
            WHERE LOWER(group_name) LIKE LOWER(?) 
              AND group_name IS NOT NULL 
              AND group_name != ''
            GROUP BY group_name
            ORDER BY 
                CASE 
                    WHEN LOWER(group_name) LIKE LOWER(?) THEN 1
                    ELSE 2
                END,
                group_name ASC
            LIMIT 20
        ''', (search_term, f"{query}%"))
        
        groups = []
        for row in cursor.fetchall():
            groups.append({
                "cod": row[0],  # Usando group_name como identificador
                "name": row[0], # group_name como nome também
                "group_name": row[0],
                "company_count": row[1]  # Quantidade de empresas no grupo
            })
        
        conn.close()
        
        return jsonify({
            "status": "success",
            "companies": groups,  # Mantendo o nome "companies" para compatibilidade
            "total": len(groups)
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Erro interno: {str(e)}"
        }), 500

@companies_bp.route('/group/<group_name>/companies', methods=['GET'])
@jwt_required()
def get_companies_by_group(group_name):
    """
    Endpoint para listar todas as empresas de um grupo específico
    GET /companies/group/NOME_GRUPO/companies
    """
    try:
        db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Buscar todas as empresas do grupo
        cursor.execute('''
            SELECT cod, name, group_name 
            FROM companies 
            WHERE group_name = ?
            ORDER BY name ASC
        ''', (group_name,))
        
        companies = []
        for row in cursor.fetchall():
            companies.append({
                "cod": row[0],
                "name": row[1],
                "group_name": row[2]
            })
        
        conn.close()
        
        return jsonify({
            "status": "success",
            "group_name": group_name,
            "companies": companies,
            "total": len(companies)
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Erro interno: {str(e)}"
        }), 500

@companies_bp.route('/generate', methods=['GET'])
@jwt_required()
def generate_company_data():
    """
    Endpoint para obter todos os dados de uma empresa específica para geração de contrato
    FLUXO: Primeiro sincroniza com SharePoint, depois busca os dados
    GET /companies/generate?cod_emp=CODIGO
    """
    try:
        cod_emp = request.args.get('cod_emp', '').strip()
        
        if not cod_emp:
            return jsonify({
                "status": "error",
                "message": "Parâmetro cod_emp é obrigatório"
            }), 400
        
        print(f"🔍 Iniciando geração de contrato para empresa: {cod_emp}")
        
        # === PASSO 1: SINCRONIZAR COM SHAREPOINT ===
        print("📥 Passo 1: Executando sincronização com SharePoint...")
        
        try:
            from services.excel_sync_service import ExcelSyncService
            sync_service = ExcelSyncService()
            
            # Executar sincronização
            sync_result = sync_service.sync_companies_from_sharepoint()
            
            if sync_result['success']:
                print(f"✅ Sincronização concluída: {sync_result['processed_count']} empresas processadas")
            else:
                print(f"⚠️ Aviso: Sincronização com problemas, mas continuando...")
                
        except Exception as sync_error:
            print(f"⚠️ Erro na sincronização (continuando): {str(sync_error)}")
            # Não falhar se sincronização der erro - continuar com dados existentes
        
        # === PASSO 2: BUSCAR DADOS DA EMPRESA ===
        print(f"📊 Passo 2: Buscando dados da empresa {cod_emp}...")
        
        db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # Para retornar como dicionário
        cursor = conn.cursor()
        
        # Buscar dados da empresa na tabela companies_data
        cursor.execute('''
            SELECT * FROM companies_data 
            WHERE cod = ?
        ''', (cod_emp,))
        
        company_data = cursor.fetchone()
        
        if not company_data:
            # Tentar buscar na tabela companies como fallback
            cursor.execute('SELECT cod, name, group_name FROM companies WHERE cod = ?', (cod_emp,))
            basic_company = cursor.fetchone()
            
            if basic_company:
                conn.close()
                return jsonify({
                    "status": "warning",
                    "message": f"Empresa {cod_emp} encontrada mas sem dados detalhados. Execute uma sincronização completa.",
                    "company": {
                        "cod": basic_company[0],
                        "name": basic_company[1],
                        "group_name": basic_company[2],
                        "companie_data": {},
                        "created_at": None,
                        "updated_at": None
                    }
                }), 200
            else:
                conn.close()
                return jsonify({
                    "status": "error",
                    "message": f"Empresa com código {cod_emp} não encontrada"
                }), 404
        
        # Converter Row para dicionário
        company_dict = dict(company_data)
        
        # Parse do JSON armazenado no campo companie_data
        import json
        if company_dict.get('companie_data'):
            try:
                parsed_data = json.loads(company_dict['companie_data'])
                company_dict['companie_data'] = parsed_data
                print(f"🔍 DEBUG: JSON parseado com {len(parsed_data)} campos")
                
                # Debug: mostrar campos não nulos
                non_null_fields = {k: v for k, v in parsed_data.items() if v is not None and v != ''}
                print(f"🔍 DEBUG: {len(non_null_fields)} campos não nulos")
                if non_null_fields:
                    print(f"🔍 DEBUG: Primeiros campos: {list(non_null_fields.items())[:3]}")
                    
            except json.JSONDecodeError as e:
                print(f"❌ DEBUG: Erro ao fazer parse do JSON: {e}")
                company_dict['companie_data'] = {}
        else:
            print("⚠️ DEBUG: Campo companie_data está vazio")
            company_dict['companie_data'] = {}
        
        conn.close()
        
        print(f"✅ Dados da empresa {cod_emp} encontrados e preparados para geração de contrato")
        
        return jsonify({
            "status": "success",
            "message": "Dados da empresa sincronizados e encontrados",
            "company": company_dict,
            "sync_info": {
                "sync_executed": True,
                "processed_count": sync_result.get('processed_count', 0) if 'sync_result' in locals() and sync_result['success'] else None
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Erro geral no endpoint /generate: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Erro interno: {str(e)}"
        }), 500

@companies_bp.route('/<cod>', methods=['GET'])
@jwt_required()
def get_company_details(cod):
    """
    Endpoint para buscar detalhes completos de uma empresa
    GET /companies/CODIGO123
    """
    try:
        db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Buscar dados básicos
        cursor.execute('SELECT cod, name, group_name FROM companies WHERE cod = ?', (cod,))
        company_basic = cursor.fetchone()
        
        if not company_basic:
            conn.close()
            return jsonify({
                "status": "error",
                "message": "Empresa não encontrada"
            }), 404
        
        # Buscar dados detalhados
        cursor.execute('SELECT companie_data FROM companies_data WHERE cod = ?', (cod,))
        company_data_row = cursor.fetchone()
        
        company_data = None
        if company_data_row and company_data_row[0]:
            import json
            try:
                company_data = json.loads(company_data_row[0])
            except:
                company_data = None
        
        conn.close()
        
        result = {
            "cod": company_basic[0],
            "name": company_basic[1],
            "group_name": company_basic[2],
            "details": company_data
        }
        
        return jsonify({
            "status": "success",
            "company": result
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Erro ao buscar detalhes da empresa: {str(e)}"
        }), 500

@companies_bp.route('/count', methods=['GET'])
def get_companies_count():
    """
    Endpoint para obter contagem total de empresas
    GET /companies/count
    """
    try:
        db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM companies')
        count = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            "status": "success",
            "total_companies": count
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Erro ao contar empresas: {str(e)}"
        }), 500
