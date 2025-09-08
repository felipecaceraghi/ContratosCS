import os
import requests
import pandas as pd
import sqlite3
from datetime import datetime
import tempfile
import urllib.parse
import json
from dotenv import load_dotenv

load_dotenv()

class ExcelSyncService:
    def __init__(self):
        self.db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        self.sharepoint_config = {
            'client_id': os.getenv('SHAREPOINT_CLIENT_ID'),
            'client_secret': os.getenv('SHAREPOINT_CLIENT_SECRET'),
            'tenant_id': os.getenv('SHAREPOINT_TENANT_ID'),
            'file_url': os.getenv('SHAREPOINT_FILE_URL')
        }
    
    def sync_companies_from_sharepoint(self):
        """
        Sincronização completa: baixa arquivo do SharePoint e processa
        """
        try:
            # 1. Baixar arquivo do SharePoint
            print("📥 Baixando arquivo do SharePoint...")
            file_content = self._download_sharepoint_file()
            
            # 2. Processar Excel
            print("📊 Processando arquivo Excel...")
            companies_data = self._process_excel_content(file_content)
            
            # 3. Sincronizar com banco (ambas as tabelas)
            print("💾 Sincronizando com banco de dados...")
            result = self._sync_to_database(companies_data)
            
            return {
                "success": True,
                "message": "Sincronização realizada com sucesso",
                "processed_count": result['processed_count'],
                "companies_new": result['companies_new'],
                "companies_updated": result['companies_updated'],
                "companies_data_new": result['companies_data_new'],
                "companies_data_updated": result['companies_data_updated'],
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _download_sharepoint_file(self):
        """
        Baixa arquivo do SharePoint usando a lógica que funciona
        """
        try:
            # Obter token de acesso
            token = self._get_access_token()
            
            file_url = self.sharepoint_config['file_url']
            print(f"📥 Baixando arquivo do SharePoint: {file_url}")
            
            # Usar a lógica que funciona
            # Extrair partes da URL
            decoded_url = urllib.parse.unquote(file_url)
            user = "database_gofurthergroup_com_br"
            file_path = "Controladoria/1 - Cadastro de Clientes v1.xlsm"
            
            headers = {'Authorization': f'Bearer {token}'}
            
            # Obter site ID
            site_url = f"https://graph.microsoft.com/v1.0/sites/gofurther-my.sharepoint.com:/personal/{user}"
            print(f"🔗 Obtendo site ID: {site_url}")
            
            site_response = requests.get(site_url, headers=headers)
            
            if site_response.status_code != 200:
                raise Exception(f"Erro ao obter site ID: {site_response.status_code} - {site_response.text}")
            
            site_id = site_response.json()['id']
            print(f"✅ Site ID obtido: {site_id}")
            
            # Baixar arquivo
            download_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/root:/{file_path}:/content"
            print(f"📥 Baixando de: {download_url}")
            
            file_response = requests.get(download_url, headers=headers)
            
            if file_response.status_code == 200:
                # Salvar arquivo temporário
                with tempfile.NamedTemporaryFile(suffix='.xlsm', delete=False) as tmp_file:
                    tmp_file.write(file_response.content)
                    print(f"✅ Arquivo baixado: {tmp_file.name}")
                    return tmp_file.name
            else:
                raise Exception(f"Erro ao baixar arquivo: {file_response.status_code} - {file_response.text}")
                
        except Exception as e:
            print(f"❌ Erro no download: {e}")
            raise Exception(f"Falha ao baixar arquivo do SharePoint: {e}")
    
    def _get_access_token(self):
        """
        Obtém token de acesso do Microsoft Graph API
        """
        try:
            client_id = self.sharepoint_config['client_id']
            client_secret = self.sharepoint_config['client_secret']
            tenant_id = self.sharepoint_config['tenant_id']
            
            # URL para obter token
            token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
            
            # Dados para requisição de token
            token_data = {
                'grant_type': 'client_credentials',
                'client_id': client_id,
                'client_secret': client_secret,
                'scope': 'https://graph.microsoft.com/.default'
            }
            
            print("🔐 Obtendo token de acesso...")
            
            response = requests.post(token_url, data=token_data)
            
            if response.status_code == 200:
                token_response = response.json()
                access_token = token_response['access_token']
                print("✅ Token obtido com sucesso")
                return access_token
            else:
                raise Exception(f"Erro ao obter token: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Erro na autenticação: {e}")
            raise Exception(f"Falha na autenticação: {e}")
    
    def _process_excel_content(self, file_path):
        """
        Processa o conteúdo do Excel e extrai dados das empresas
        """
        try:
            # Primeiro, verificar quais abas existem no arquivo
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
            print(f"📊 Abas encontradas no Excel: {sheet_names}")
            
            # Tentar encontrar a aba correta (priorizar "Clientes")
            target_sheet = None
            
            # Prioridade 1: Aba exatamente "Clientes"
            if 'Clientes' in sheet_names:
                target_sheet = 'Clientes'
            # Prioridade 2: Aba que contém "cliente" no nome
            elif any('client' in sheet.lower() for sheet in sheet_names):
                for sheet in sheet_names:
                    if 'client' in sheet.lower():
                        target_sheet = sheet
                        break
            # Prioridade 3: Outras abas relacionadas
            else:
                for sheet in sheet_names:
                    if any(word in sheet.lower() for word in ['empresa', 'dados']):
                        target_sheet = sheet
                        break
            
            # Se não encontrar, usar a primeira aba
            if target_sheet is None:
                target_sheet = sheet_names[0]
            
            print(f"📊 Usando aba: '{target_sheet}'")
            
            # Ler Excel da aba específica
            df = pd.read_excel(file_path, sheet_name=target_sheet, header=None)
            
            print(f"📊 Excel carregado: {len(df)} linhas x {len(df.columns)} colunas")
            
            # Debug: Examinar primeiras linhas para entender estrutura
            print("🔍 DEBUG: Primeiras 10 linhas do Excel:")
            for i in range(min(10, len(df))):
                print(f"  Linha {i}: {list(df.iloc[i].head(5).values)}")  # Primeiras 5 colunas
            
            # Tentar encontrar linha de cabeçalhos automaticamente
            header_row = None
            basic_columns = {
                'Código Domínio': 'cod',
                'Nome Fantasia': 'name', 
                'Grupo': 'group_name'
            }
            
            # Procurar linha que contém as colunas essenciais
            for row_idx in range(min(10, len(df))):  # Verificar primeiras 10 linhas
                row_values = df.iloc[row_idx].values
                row_str = ' '.join([str(v) for v in row_values if pd.notna(v)])
                
                print(f"🔍 Verificando linha {row_idx}: {row_str[:100]}...")
                
                # Verificar se contém colunas básicas
                found_basic = 0
                for col_name in basic_columns.keys():
                    if col_name in row_str:
                        found_basic += 1
                
                if found_basic >= 2:  # Pelo menos 2 colunas básicas encontradas
                    header_row = row_idx
                    print(f"✅ Linha de cabeçalho encontrada: {header_row}")
                    break
            
            if header_row is None:
                raise Exception("Não foi possível encontrar linha de cabeçalhos no Excel")
            
            # Colunas extras para tabela companies_data (JSON)
            extra_columns = [
                'Sistema Financeiro', 'Sistema RH', 'Sistema Outros', 'Empresa aberta pela Go?',
                'Contato Principal - Nome', 'Contato Principal - Cargo', 'Contato Principal - Email', 
                'Contato Principal - Celular', 'Plano Contratado', 'SLA', 'BPO Contábil', 'BPO Fiscal',
                'BPO Folha', 'BPO Financeiro', 'BPO RH', 'BPO CND', 'VL BPO Contábil', 'VL BPO Fiscal',
                'VL BPO Folha', 'VL BPO Financeiro', 'VL BPO RH', 'VL BPO Legal', 'Honorário Mensal Total',
                'Competência Inicial - Fixo', 'Diversos Inicial', 'Competência Diversos Inicial',
                'VL Diversos Inicial', 'Implantação', 'Vencimento da Implantação', 'Forma Pgto.',
                'VL Implantação', 'BPO Contábil Faturado', 'BPO Fiscal Faturado', 'BPO Folha Faturado',
                'BPO Financeiro Faturado', 'BPO RH Faturado', 'BPO Legal Faturado', 'Diversos In. Faturado',
                'Implantação Faturado', 'Closer', 'Prospector', 'Oridem do Lead', 'Observação do Closer',
                'Motivo da Troca'
            ]
            
            # Encontrar índices das colunas
            headers = df.iloc[header_row].values
            print(f"🔍 Headers encontrados: {headers[:10]}...")  # Primeiros 10 headers
            
            basic_col_indices = {}
            extra_col_indices = {}
            
            # Busca mais flexível por colunas
            for i, header in enumerate(headers):
                if pd.isna(header):
                    continue
                    
                header_str = str(header).strip()
                
                # Buscar colunas básicas (busca parcial caso de variações)
                for col_key, col_field in basic_columns.items():
                    if col_key.lower() in header_str.lower() or header_str.lower() in col_key.lower():
                        basic_col_indices[col_field] = i
                        print(f"✅ Coluna básica mapeada: '{header_str}' -> {col_field}")
                        break
                
                # Buscar colunas extras
                for extra_col in extra_columns:
                    if extra_col.lower() in header_str.lower() or header_str.lower() in extra_col.lower():
                        extra_col_indices[extra_col] = i
                        break
            
            print(f"🔍 Colunas básicas encontradas: {basic_col_indices}")
            print(f"🔍 Colunas extras encontradas: {len(extra_col_indices)} colunas")
            
            # Verificar se encontramos pelo menos a coluna 'cod'
            if 'cod' not in basic_col_indices:
                raise Exception("Coluna 'Código Domínio' não encontrada no Excel. Verifique o formato do arquivo.")
            
            # Extrair dados (linhas após cabeçalho)
            companies = []
            for idx in range(header_row + 1, len(df)):
                row = df.iloc[idx]
                
                # Verificar se linha tem dados (usar coluna cod)
                cod_col_idx = basic_col_indices.get('cod')
                if cod_col_idx is None or cod_col_idx >= len(row):
                    continue
                    
                cod_value = row.iloc[cod_col_idx]
                if pd.isna(cod_value) or str(cod_value).strip() == '':
                    continue
                
                print(f"🔍 Processando linha {idx}: cod = {cod_value}")
                
                # Extrair dados básicos
                company = {}
                for field, col_idx in basic_col_indices.items():
                    if col_idx < len(row):
                        value = row.iloc[col_idx]
                        company[field] = str(value).strip() if not pd.isna(value) else None
                
                # Extrair dados extras para JSON
                extra_data = {}
                for col_name, col_idx in extra_col_indices.items():
                    if col_idx < len(row):
                        value = row.iloc[col_idx]
                        extra_data[col_name] = str(value).strip() if not pd.isna(value) else None
                
                # Adicionar dados extras ao company
                company['extra_data'] = extra_data
                
                if company.get('cod') and company['cod'].strip():  # Só adicionar se tiver código válido
                    companies.append(company)
                    print(f"✅ Empresa adicionada: {company['cod']} - {company.get('name', 'N/A')}")
            
            print(f"📋 {len(companies)} empresas encontradas no Excel")
            
            # Limpar arquivo temporário
            try:
                os.unlink(file_path)
            except:
                pass
                
            return companies
            
        except Exception as e:
            print(f"❌ Erro ao processar Excel: {e}")
            raise
    
    def _sync_to_database(self, companies_data):
        """
        Sincroniza dados com o banco SQLite - tabelas companies e companies_data
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # === TABELA COMPANIES ===
            print("📋 Sincronizando tabela COMPANIES...")
            
            # Verificar estrutura atual da tabela companies
            cursor.execute("PRAGMA table_info(companies)")
            columns_info = cursor.fetchall()
            existing_columns = [col[1] for col in columns_info]
            
            print(f"🗃️  Colunas existentes em companies: {existing_columns}")
            
            # Se tabela companies não existe, criar
            if not existing_columns:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS companies (
                        cod TEXT PRIMARY KEY,
                        name TEXT,
                        group_name TEXT
                    )
                ''')
                print("📋 Tabela companies criada")
            
            # === TABELA COMPANIES_DATA ===
            print("📋 Sincronizando tabela COMPANIES_DATA...")
            
            # Criar tabela companies_data se não existir
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS companies_data (
                    cod TEXT PRIMARY KEY,
                    name TEXT,
                    group_name TEXT,
                    companie_data TEXT,
                    FOREIGN KEY (cod) REFERENCES companies (cod)
                )
            ''')
            print("📋 Tabela companies_data criada/verificada")
            
            # Contadores
            companies_new = 0
            companies_updated = 0
            companies_data_new = 0
            companies_data_updated = 0
            
            for company in companies_data:
                cod = company['cod']
                name = company.get('name')
                group_name = company.get('group_name')
                extra_data = company.get('extra_data', {})
                extra_data_json = json.dumps(extra_data, ensure_ascii=False)
                
                # === SINCRONIZAR TABELA COMPANIES ===
                cursor.execute('SELECT cod FROM companies WHERE cod = ?', (cod,))
                existing_company = cursor.fetchone()
                
                if existing_company:
                    # Atualizar company existente
                    cursor.execute('''
                        UPDATE companies 
                        SET name = ?, group_name = ?
                        WHERE cod = ?
                    ''', (name, group_name, cod))
                    companies_updated += 1
                    print(f"🔄 Company atualizada: {cod} - {name}")
                else:
                    # Inserir nova company
                    cursor.execute('''
                        INSERT INTO companies (cod, name, group_name)
                        VALUES (?, ?, ?)
                    ''', (cod, name, group_name))
                    companies_new += 1
                    print(f"➕ Company nova: {cod} - {name}")
                
                # === SINCRONIZAR TABELA COMPANIES_DATA ===
                cursor.execute('SELECT cod FROM companies_data WHERE cod = ?', (cod,))
                existing_data = cursor.fetchone()
                
                if existing_data:
                    # Atualizar companies_data existente
                    cursor.execute('''
                        UPDATE companies_data 
                        SET name = ?, group_name = ?, companie_data = ?
                        WHERE cod = ?
                    ''', (name, group_name, extra_data_json, cod))
                    companies_data_updated += 1
                    print(f"🔄 CompanyData atualizada: {cod}")
                else:
                    # Inserir nova companies_data
                    cursor.execute('''
                        INSERT INTO companies_data (cod, name, group_name, companie_data)
                        VALUES (?, ?, ?, ?)
                    ''', (cod, name, group_name, extra_data_json))
                    companies_data_new += 1
                    print(f"➕ CompanyData nova: {cod}")
            
            conn.commit()
            conn.close()
            
            print(f"✅ Companies: {companies_new} novas, {companies_updated} atualizadas")
            print(f"✅ CompaniesData: {companies_data_new} novas, {companies_data_updated} atualizadas")
            
            return {
                'processed_count': len(companies_data),
                'companies_new': companies_new,
                'companies_updated': companies_updated,
                'companies_data_new': companies_data_new,
                'companies_data_updated': companies_data_updated
            }
            
        except Exception as e:
            print(f"❌ Erro ao sincronizar com banco: {e}")
            raise
    
    def get_column_mapping(self):
        """
        Retorna mapeamento de colunas do Excel
        """
        return {
            'Código Domínio': 'cod',
            'Nome Fantasia': 'name',
            'Grupo': 'group_name'
        }
