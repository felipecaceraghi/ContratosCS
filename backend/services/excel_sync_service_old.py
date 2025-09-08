import os
import requests
import pandas as pd
import sqlite3
from datetime import datetime
import tempfile
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
            
            # 3. Sincronizar com banco
            print("💾 Sincronizando com banco de dados...")
            result = self._sync_to_database(companies_data)
            
            return {
                "success": True,
                "message": "Sincronização realizada com sucesso",
                "processed_count": result['processed_count'],
                "new_companies": result['new_companies'],
                "updated_companies": result['updated_companies'],
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
        Baixa arquivo do SharePoint usando autenticação Microsoft Graph API
        """
        try:
            # Obter token de acesso
            token = self._get_access_token()
            
            file_url = self.sharepoint_config['file_url']
            print(f"📥 Baixando arquivo do SharePoint: {file_url}")
            
            # Extrair informações da URL
            # URL: https://gofurther-my.sharepoint.com/personal/database_gofurthergroup_com_br/Documents/Controladoria/1%20-%20Cadastro%20de%20Clientes%20v1.xlsm
            
            # Método 1: Tentar via drives API
            site_url = "gofurther.sharepoint.com"
            user_email = "database@gofurthergroup.com.br"
            file_path = "/Documents/Controladoria/1 - Cadastro de Clientes v1.xlsm"
            
            # URL da API Graph para OneDrive pessoal
            graph_url = f"https://graph.microsoft.com/v1.0/users/{user_email}/drive/root:{file_path}:/content"
            
            headers = {
                'Authorization': f'Bearer {token}',
                'Accept': 'application/octet-stream'
            }
            
            print(f"� Tentando API URL: {graph_url}")
            
            response = requests.get(graph_url, headers=headers)
            
            if response.status_code == 200:
                # Salvar arquivo temporário
                with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
                    tmp_file.write(response.content)
                    print(f"✅ Arquivo baixado: {tmp_file.name}")
                    return tmp_file.name
            else:
                print(f"❌ Erro na primeira tentativa: {response.status_code} - {response.text}")
                
                # Método 2: Tentar via sites API
                graph_url2 = f"https://graph.microsoft.com/v1.0/sites/gofurther.sharepoint.com/drives/root/items/root:{file_path}:/content"
                
                print(f"🔗 Tentando API URL alternativa: {graph_url2}")
                response2 = requests.get(graph_url2, headers=headers)
                
                if response2.status_code == 200:
                    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
                        tmp_file.write(response2.content)
                        print(f"✅ Arquivo baixado (método 2): {tmp_file.name}")
                        return tmp_file.name
                else:
                    raise Exception(f"Ambos métodos falharam. Último erro: {response2.status_code} - {response2.text}")
                
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
            # Ler Excel
            df = pd.read_excel(file_path, header=None)
            
            # Encontrar linha de cabeçalhos (linha 4, índice 4)
            header_row = 4
            if len(df) <= header_row:
                raise Exception("Arquivo Excel não tem formato esperado")
            
            # Mapear colunas (só as que existem no banco)
            column_mapping = {
                'Código Domínio': 'cod',
                'Nome Fantasia': 'name', 
                'Grupo': 'group_name'
                # Removido 'CNPJ': 'cnpj' - não existe no banco
            }
            
            # Encontrar índices das colunas
            headers = df.iloc[header_row].values
            col_indices = {}
            
            for i, header in enumerate(headers):
                if header in column_mapping:
                    col_indices[column_mapping[header]] = i
            
            print(f"🔍 Colunas encontradas: {col_indices}")
            
            # Extrair dados (linhas após cabeçalho)
            companies = []
            for idx in range(header_row + 1, len(df)):
                row = df.iloc[idx]
                
                # Verificar se linha tem dados
                if pd.isna(row.iloc[col_indices.get('cod', 0)]):
                    continue
                
                company = {}
                for field, col_idx in col_indices.items():
                    if col_idx < len(row):
                        value = row.iloc[col_idx]
                        company[field] = str(value) if not pd.isna(value) else None
                
                if company.get('cod'):  # Só adicionar se tiver código
                    companies.append(company)
            
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
        Sincroniza dados com o banco SQLite
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Verificar estrutura atual da tabela
            cursor.execute("PRAGMA table_info(companies)")
            columns_info = cursor.fetchall()
            existing_columns = [col[1] for col in columns_info]
            
            print(f"🗃️  Colunas existentes: {existing_columns}")
            
            # Se tabela não existe, criar só com as 3 colunas básicas
            if not existing_columns:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS companies (
                        cod TEXT PRIMARY KEY,
                        name TEXT,
                        group_name TEXT
                    )
                ''')
                print("📋 Tabela companies criada com 3 colunas básicas")
            
            new_companies = 0
            updated_companies = 0
            
            for company in companies_data:
                # Verificar se empresa já existe usando cod como chave
                cursor.execute('SELECT cod FROM companies WHERE cod = ?', (company['cod'],))
                existing = cursor.fetchone()
                
                if existing:
                    # Atualizar empresa existente (só as 3 colunas que existem)
                    cursor.execute('''
                        UPDATE companies 
                        SET name = ?, group_name = ?
                        WHERE cod = ?
                    ''', (company.get('name'), company.get('group_name'), company['cod']))
                    updated_companies += 1
                    print(f"🔄 Atualizada: {company['cod']} - {company.get('name')}")
                else:
                    # Inserir nova empresa (só as 3 colunas que existem)
                    cursor.execute('''
                        INSERT INTO companies (cod, name, group_name)
                        VALUES (?, ?, ?)
                    ''', (company['cod'], company.get('name'), company.get('group_name')))
                    new_companies += 1
                    print(f"➕ Nova: {company['cod']} - {company.get('name')}")
            
            conn.commit()
            conn.close()
            
            print(f"✅ Sincronização concluída: {new_companies} novas, {updated_companies} atualizadas")
            
            return {
                'processed_count': len(companies_data),
                'new_companies': new_companies,
                'updated_companies': updated_companies
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