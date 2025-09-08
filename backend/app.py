# app.py
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from routes.user_routes import user_bp
from routes.sharepoint_routes import sharepoint_bp
from routes.companies_routes import companies_bp
from routes.contracts_routes import contracts_bp
import os
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()

app = Flask(__name__)

# Configurar CORS para aceitar qualquer origem
CORS(app, 
     origins="*", 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# Configurações básicas
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback-secret-key')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'fallback-jwt-secret')

# Inicializa JWT
jwt = JWTManager(app)

# Handler para requisições OPTIONS (preflight)
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Registra os blueprints
app.register_blueprint(user_bp)
app.register_blueprint(sharepoint_bp)
app.register_blueprint(companies_bp)
app.register_blueprint(contracts_bp, url_prefix='/api/contracts')

# Rota básica pra testar
@app.route('/')
def hello():
    return {"message": "API Contratos funcionando"}

if __name__ == '__main__':
    debug_mode = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')
    port = int(os.getenv('PORT', 5004))  # Usar porta 5004 por padrão
    app.run(host='0.0.0.0', port=port, debug=debug_mode)