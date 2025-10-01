"""
Utilitário para operações seguras no banco SQLite com retry em caso de lock
"""
import sqlite3
import time
import logging
from functools import wraps

logger = logging.getLogger(__name__)

def retry_db_operation(max_retries=5, delay=0.1):
    """
    Decorator para retry de operações no banco em caso de lock
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except sqlite3.OperationalError as e:
                    if "database is locked" in str(e).lower() and attempt < max_retries - 1:
                        logger.warning(f"Database locked, tentativa {attempt + 1}/{max_retries}. Aguardando {delay}s...")
                        time.sleep(delay * (2 ** attempt))  # Backoff exponential
                        continue
                    else:
                        logger.error(f"Erro no banco após {attempt + 1} tentativas: {str(e)}")
                        raise
                except Exception as e:
                    logger.error(f"Erro não relacionado ao lock: {str(e)}")
                    raise
            return None
        return wrapper
    return decorator

def get_db_connection(db_path, timeout=30.0):
    """
    Cria conexão com timeout configurado para evitar locks
    """
    conn = sqlite3.connect(db_path, timeout=timeout)
    conn.row_factory = sqlite3.Row
    # Configurar WAL mode para melhor concorrência
    conn.execute('PRAGMA journal_mode=WAL;')
    conn.execute('PRAGMA synchronous=NORMAL;')
    conn.execute('PRAGMA temp_store=memory;')
    conn.execute('PRAGMA mmap_size=268435456;')  # 256MB
    return conn

@retry_db_operation(max_retries=5, delay=0.1)
def safe_db_query(db_path, query, params=None, fetch_one=False):
    """
    Executa query de leitura com retry automático
    """
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        if fetch_one:
            result = cursor.fetchone()
        else:
            result = cursor.fetchall()
        
        return result
    finally:
        conn.close()

@retry_db_operation(max_retries=5, delay=0.1)
def safe_db_execute(db_path, query, params=None):
    """
    Executa query de escrita com retry automático
    """
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()