from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.excel_sync_service import ExcelSyncService
import os
from dotenv import load_dotenv

load_dotenv()

sharepoint_bp = Blueprint('sharepoint', __name__, url_prefix='/sharepoint')

@sharepoint_bp.route('/test', methods=['GET'])
def test_sharepoint():
    """
    Endpoint de teste básico (sem autenticação)
    GET /sharepoint/test
    """
    return jsonify({
        "status": "ok",
        "message": "SharePoint routes funcionando",
        "timestamp": "2025-09-04T16:00:00Z"
    })

@sharepoint_bp.route('/init', methods=['GET'])
@jwt_required()
def init_database():
    """
    Endpoint para inicializar/criar as tabelas necessárias
    GET /sharepoint/init
    """
    try:
        import sqlite3
        import os
        
        db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Criar tabela companies se não existir
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS companies (
                cod TEXT PRIMARY KEY,
                name TEXT,
                group_name TEXT
            )
        ''')
        
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
        
        conn.commit()
        
        # Verificar se tabelas foram criadas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            "status": "success",
            "message": "Banco de dados inicializado com sucesso",
            "tables_created": ["companies", "companies_data"],
            "all_tables": tables
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Erro ao inicializar banco: {str(e)}"
        }), 500

@sharepoint_bp.route('/sync', methods=['GET'])
@jwt_required()
def sync_sharepoint():
    """
    Endpoint para sincronização com SharePoint
    GET /sharepoint/sync
    """
    try:
        print("🔍 DEBUG: Iniciando endpoint /sync")
        
        # Pegar URL do arquivo do .env
        file_url = os.getenv('SHAREPOINT_FILE_URL')
        print(f"🔍 DEBUG: file_url = {file_url}")
        
        if not file_url:
            print("❌ DEBUG: SHAREPOINT_FILE_URL não encontrada")
            return jsonify({
                "status": "error",
                "message": "SHAREPOINT_FILE_URL não configurada no ambiente"
            }), 400
        
        # Verificar outras credenciais necessárias
        required_vars = [
            'SHAREPOINT_CLIENT_ID',
            'SHAREPOINT_CLIENT_SECRET', 
            'SHAREPOINT_TENANT_ID'
        ]
        
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            print(f"❌ DEBUG: Variáveis faltando: {missing_vars}")
            return jsonify({
                "status": "error",
                "message": f"Variáveis de ambiente faltando: {', '.join(missing_vars)}"
            }), 400
        
        # Executar sincronização REAL
        try:
            current_user = get_jwt_identity()
            print(f"🔍 DEBUG: current_user = {current_user}")
        except Exception as jwt_error:
            print(f"❌ DEBUG: Erro JWT: {jwt_error}")
            return jsonify({
                "status": "error",
                "message": f"Erro de autenticação JWT: {str(jwt_error)}"
            }), 401
        
        # Inicializar serviço de sincronização
        print("🔍 DEBUG: Inicializando ExcelSyncService")
        sync_service = ExcelSyncService()
        
        # Executar sincronização
        print("🔍 DEBUG: Executando sincronização")
        result = sync_service.sync_companies_from_sharepoint()
        print(f"🔍 DEBUG: Resultado = {result}")
        
        if result['success']:
            return jsonify({
                "status": "success",
                "message": result['message'],
                "file_url": file_url,
                "user": current_user,
                "processed_count": result['processed_count'],
                "companies": {
                    "new": result['companies_new'],
                    "updated": result['companies_updated']
                },
                "companies_data": {
                    "new": result['companies_data_new'],
                    "updated": result['companies_data_updated']
                },
                "timestamp": result['timestamp']
            })
        else:
            print(f"❌ DEBUG: Falha na sincronização: {result['error']}")
            return jsonify({
                "status": "error",
                "message": f"Falha na sincronização: {result['error']}",
                "timestamp": result['timestamp']
            }), 500
        
    except Exception as e:
        print(f"❌ DEBUG: Erro geral no endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": f"Erro durante sincronização: {str(e)}",
            "error_type": type(e).__name__
        }), 500

@sharepoint_bp.route('/status', methods=['GET'])
@jwt_required()
def sharepoint_status():
    """
    Endpoint para verificar status da configuração SharePoint
    GET /sharepoint/status
    """
    try:
        file_url = os.getenv('SHAREPOINT_FILE_URL')
        client_id = os.getenv('SHAREPOINT_CLIENT_ID')
        tenant_id = os.getenv('SHAREPOINT_TENANT_ID')
        
        config_status = {
            "file_url_configured": bool(file_url),
            "client_id_configured": bool(client_id),
            "tenant_id_configured": bool(tenant_id),
        }
        
        all_configured = all(config_status.values())
        
        return jsonify({
            "status": "configured" if all_configured else "incomplete",
            "configuration": config_status,
            "file_url": file_url if file_url else None
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500