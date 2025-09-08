# services/user_service.py
from flask import abort
from flask_jwt_extended import create_access_token
from models.user import User
import bcrypt

class UserService:
    def get_by_email(self, email):
        user = User.find_by_email(email)
        if not user:
            return {"error": "User not found"}
        
        return {
            "name": user["name"],
            "email": user["email"],
            "admin": bool(user["admin"])
        }
    
    def login(self, email, password):
        user = User.find_by_email(email)
        if not user:
            return {"error": "Usuário não encontrado"}
        
        # Verifica a senha (assumindo que está hashada com bcrypt)
        if bcrypt.checkpw(password.encode('utf-8'), user["password"].encode('utf-8')):
            # Gera token JWT - identity deve ser string (email), não objeto
            access_token = create_access_token(identity=user["email"])
            return {
                "message": "Login bem-sucedido",
                "access_token": access_token,
                "user": {
                    "name": user["name"],
                    "email": user["email"],
                    "admin": bool(user["admin"])
                }
            }
        else:
            return {"error": "Senha incorreta"}
    
    def create_user(self, name, email, password, admin=False):
        """Cria um novo usuário (apenas para admins)"""
        if not name or not email or not password:
            return {"error": "Nome, email e senha são obrigatórios"}
        
        # Validações básicas
        if len(password) < 6:
            return {"error": "Senha deve ter pelo menos 6 caracteres"}
        
        if "@" not in email:
            return {"error": "Email inválido"}
        
        # Cria o usuário
        result = User.create(name, email, password, admin)
        return result
    
    
    