# routes/user_routes.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.user_service import UserService
import os

user_bp = Blueprint('users', __name__)

@user_bp.route('/users/<email>', methods=['GET'])
def get_user_by_email(email):
    user_service = UserService()
    user = user_service.get_by_email(email)
    if "error" in user:
        return jsonify(user), 404
    return jsonify(user)

@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email e senha são obrigatórios"}), 400
    
    user_service = UserService()
    result = user_service.login(email, password)
    
    if "error" in result:
        return jsonify(result), 401
    else:
        return jsonify(result), 200

@user_bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    # Verifica se o usuário logado é admin
    current_user = get_jwt_identity()
    if not current_user.get('admin', False):
        return jsonify({"error": "Apenas administradores podem cadastrar usuários"}), 403
    
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    admin = data.get('admin', False)  # Por padrão, não é admin
    
    user_service = UserService()
    result = user_service.create_user(name, email, password, admin)
    
    if "error" in result:
        return jsonify(result), 400
    else:
        return jsonify({
            "message": "Usuário criado com sucesso",
            "user": result
        }), 201

# Versão para testes sem JWT
@user_bp.route('/register-test', methods=['POST'])
def register_test():
    # Simular usuário admin para testes
    current_user = {'email': 'admin@test.com', 'admin': True}
    
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    admin = data.get('admin', False)  # Por padrão, não é admin
    
    user_service = UserService()
    result = user_service.create_user(name, email, password, admin)
    
    if "error" in result:
        return jsonify(result), 400
    else:
        return jsonify({
            "message": "Usuário criado com sucesso",
            "user": result
        }), 201

