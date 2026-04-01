import hashlib
import pymysql
from db_config import get_db_connection

class UserService:
    @staticmethod
    def hash_password(password):
        return hashlib.sha256(password.encode()).hexdigest() if password else None
    
    @staticmethod
    def verify_password(password, password_hash):
        return password and password_hash and hashlib.sha256(password.encode()).hexdigest() == password_hash
    
    @staticmethod
    def create_user(email, password, username=None, telegram_id=None, full_name=None):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            password_hash = UserService.hash_password(password) if password else None
            cursor.execute("""
                INSERT INTO users (email, password_hash, username, telegram_id, full_name)
                VALUES (%s, %s, %s, %s, %s)
            """, (email, password_hash, username, telegram_id, full_name))
            conn.commit()
            return cursor.lastrowid
        except Exception as e:
            conn.rollback()
            print(f"Error: {e}")
            return None
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_user_by_email(email):
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        return user
    
    @staticmethod
    def get_user_by_telegram_id(telegram_id):
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT * FROM users WHERE telegram_id = %s", (telegram_id,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        return user
    
    @staticmethod
    def get_user_by_id(user_id):
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        return user
    
    @staticmethod
    def authenticate(email_or_username, password):
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT * FROM users WHERE email = %s OR username = %s", (email_or_username, email_or_username))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        if user and UserService.verify_password(password, user.get('password_hash')):
            return user
        return None