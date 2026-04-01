import hashlib
import secrets
from datetime import datetime, timedelta
import pymysql
from db_config import get_db_connection
from services.user_service import UserService

class User:
    # Delegate all methods to UserService for backward compatibility
    hash_password = staticmethod(UserService.hash_password)
    verify_password = staticmethod(UserService.verify_password)
    create_user = staticmethod(UserService.create_user)
    get_user_by_email = staticmethod(UserService.get_user_by_email)
    get_user_by_telegram_id = staticmethod(UserService.get_user_by_telegram_id)
    get_user_by_id = staticmethod(UserService.get_user_by_id)
    authenticate = staticmethod(UserService.authenticate)
        
    @staticmethod
    def hash_password(password):
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def verify_password(password, password_hash):
        return hashlib.sha256(password.encode()).hexdigest() == password_hash
    
    @staticmethod
    def create_user(email, password, username=None, telegram_id=None, full_name=None):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            password_hash = User.hash_password(password)
            cursor.execute("""
                INSERT INTO users (email, password_hash, username, telegram_id, full_name)
                VALUES (%s, %s, %s, %s, %s)
            """, (email, password_hash, username, telegram_id, full_name))
            conn.commit()
            return cursor.lastrowid
        except pymysql.IntegrityError as e:
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
        
        cursor.execute("""
            SELECT * FROM users 
            WHERE email = %s OR username = %s OR telegram_id = %s
        """, (email_or_username, email_or_username, email_or_username))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if user and User.verify_password(password, user['password_hash']):
            return user
        return None