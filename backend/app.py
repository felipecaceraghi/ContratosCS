# app.py
from flask import Flask
from flask_jwt_extended import JWTManager
from routes.user_routes import user_bp
from routes.sharepoint_routes import sharepoint_bp
import os
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()

app = Flask(__name__)

# Configurações básicas
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback-secret-key')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'fallback-jwt-secret')

# Inicializa JWT
jwt = JWTManager(app)

# Registra os blueprints
app.register_blueprint(user_bp)
app.register_blueprint(sharepoint_bp)

# Rota básica pra testar
@app.route('/')
def hello():
    return {"message": "API Contratos funcionando"}

if __name__ == '__main__':
    debug_mode = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')
    port = int(os.getenv('PORT', 5004))  # Usar porta 5004 por padrão
    app.run(host='0.0.0.0', port=port, debug=debug_mode)