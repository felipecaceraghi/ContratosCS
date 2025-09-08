#!/usr/bin/env python3
# create_test_user.py - Script para criar usuário de teste

import sqlite3
import os
import bcrypt
from dotenv import load_dotenv

load_dotenv()

def create_test_user():
    # Caminho do banco
    db_path = os.getenv('DATABASE_PATH', 'infra/contracts.db')
    
    print(f"🔍 Verificando banco de dados: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Criar tabela users se não existir
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                admin INTEGER DEFAULT 0
            )
        ''')
        
        # Verificar se já existe usuário teste
        cursor.execute("SELECT email FROM users WHERE email = ?", ('admin@teste.com',))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print("✅ Usuário de teste já existe: admin@teste.com")
        else:
            # Criar usuário de teste
            password = '123456'
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            cursor.execute('''
                INSERT INTO users (name, email, password, admin)
                VALUES (?, ?, ?, ?)
            ''', ('Administrador', 'admin@teste.com', hashed_password.decode('utf-8'), 1))
            
            print("✅ Usuário de teste criado:")
            print("   Email: admin@teste.com")
            print("   Senha: 123456")
            print("   Admin: Sim")
        
        # Listar todos os usuários
        cursor.execute("SELECT name, email, admin FROM users")
        users = cursor.fetchall()
        
        print(f"\n📋 Usuários no banco ({len(users)} total):")
        for user in users:
            admin_status = "Admin" if user[2] else "Usuário"
            print(f"   - {user[0]} ({user[1]}) - {admin_status}")
        
        conn.commit()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == '__main__':
    create_test_user()
