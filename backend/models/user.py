# models/user.py
import sqlite3
import os
from dotenv import load_dotenv
import bcrypt

# Carrega variáveis do .env
load_dotenv()

class User:
    
    @staticmethod
    def find_by_email(email):
        """Busca usuário pelo email"""
        
        # Caminho do banco
        db_path = os.getenv('DATABASE_PATH', os.path.join(os.path.dirname(__file__), '..', 'infra', 'contracts.db'))
        
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row  # Para acessar por nome da coluna
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT name, email, password, admin 
                FROM users 
                WHERE email = ?
            """, (email,))
            
            user = cursor.fetchone()
            
            if user:
                return dict(user)  # Converte Row para dict
            
            return None
            
        except sqlite3.Error as e:
            print(f"Database error: {e}")
            return None
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def create(name, email, password, admin=False):
        """Cria um novo usuário"""
        
        # Hash da senha
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Caminho do banco
        db_path = os.getenv('DATABASE_PATH', os.path.join(os.path.dirname(__file__), '..', 'infra', 'contracts.db'))
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO users (name, email, password, admin)
                VALUES (?, ?, ?, ?)
            """, (name, email, hashed_password.decode('utf-8'), int(admin)))
            
            conn.commit()
            
            # Retorna o usuário criado (sem senha)
            return {
                "name": name,
                "email": email,
                "admin": admin
            }
            
        except sqlite3.IntegrityError:
            return {"error": "Email já cadastrado"}
        except sqlite3.Error as e:
            print(f"Database error: {e}")
            return {"error": "Erro ao criar usuário"}
        finally:
            if conn:
                conn.close()
    
   