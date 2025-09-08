# tests/conftest.py - Configuração de testes de integração
import pytest
import os
import sys
from dotenv import load_dotenv

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Carregar variáveis de ambiente
load_dotenv()

# Importar aplicação
from app import app

@pytest.fixture(scope="session")
def test_app():
    """Fixture da aplicação Flask para testes"""
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'
    return app

@pytest.fixture
def test_client(test_app):
    """Cliente de teste Flask"""
    return test_app.test_client()

@pytest.fixture
def app_context(test_app):
    """Contexto da aplicação para testes"""
    with test_app.app_context():
        yield test_app

@pytest.fixture(scope="session")
def sharepoint_credentials():
    """Fixture com credenciais do SharePoint para testes reais"""
    required_vars = [
        'SHAREPOINT_CLIENT_ID',
        'SHAREPOINT_CLIENT_SECRET', 
        'SHAREPOINT_TENANT_ID',
        'SHAREPOINT_FILE_URL'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        pytest.skip(f"Variáveis de ambiente faltando para testes do SharePoint: {', '.join(missing_vars)}")
    
    return {
        'client_id': os.getenv('SHAREPOINT_CLIENT_ID'),
        'client_secret': os.getenv('SHAREPOINT_CLIENT_SECRET'),
        'tenant_id': os.getenv('SHAREPOINT_TENANT_ID'),
        'file_url': os.getenv('SHAREPOINT_FILE_URL')
    }

@pytest.fixture(scope="session")
def test_user_credentials():
    """Credenciais de usuário para testes"""
    return {
        'email': os.getenv('TEST_USER_EMAIL', 'felipe.caceraghi@gofurthergroup.com.br'),
        'password': os.getenv('TEST_USER_PASSWORD', '123456')
    }

@pytest.fixture
def auth_token(test_client, test_user_credentials):
    """Token de autenticação válido"""
    response = test_client.post('/auth/login', json=test_user_credentials)
    if response.status_code == 200:
        return response.json['access_token']
    else:
        pytest.skip("Não foi possível fazer login para obter token de autenticação")

@pytest.fixture
def auth_headers(auth_token):
    """Headers com autenticação para requisições"""
    return {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }

# Configuração de markers
def pytest_configure(config):
    """Configurar markers personalizados"""
    config.addinivalue_line("markers", "integration: marca testes de integração")
    config.addinivalue_line("markers", "sharepoint: marca testes que usam SharePoint real")
    config.addinivalue_line("markers", "slow: marca testes que demoram para executar")

def pytest_collection_modifyitems(config, items):
    """Aplicar markers automaticamente"""
    for item in items:
        # Marcar todos os testes como integração
        item.add_marker(pytest.mark.integration)
        
        # Marcar testes do SharePoint
        if "sharepoint" in item.name.lower() or "sharepoint" in str(item.fspath).lower():
            item.add_marker(pytest.mark.sharepoint)
            item.add_marker(pytest.mark.slow)
