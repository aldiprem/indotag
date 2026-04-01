import hashlib
import pymysql
from db_config import get_db_connection

class UserService:
    
    @staticmethod
    def hash_password(password):
        if not password:
            return None
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def verify_password(password, password_hash):
        if not password or not password_hash:
            return False
        return hashlib.sha256(password.encode()).hexdigest() == password_hash
    
    @staticmethod
    def create_user(email, password=None, username=None, telegram_id=None, full_name=None):
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
        except pymysql.IntegrityError as e:
            print(f"IntegrityError in create_user: {e}")
            conn.rollback()
            return None
        except Exception as e:
            print(f"Error in create_user: {e}")
            conn.rollback()
            return None
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_user_by_email(email):
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
            return user
        except Exception as e:
            print(f"Error in get_user_by_email: {e}")
            return None
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_user_by_telegram_id(telegram_id):
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            cursor.execute("SELECT * FROM users WHERE telegram_id = %s", (telegram_id,))
            user = cursor.fetchone()
            return user
        except Exception as e:
            print(f"Error in get_user_by_telegram_id: {e}")
            return None
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_user_by_id(user_id):
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            return user
        except Exception as e:
            print(f"Error in get_user_by_id: {e}")
            return None
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def authenticate(email_or_username, password):
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        try:
            # Cari berdasarkan email atau username
            cursor.execute("""
                SELECT * FROM users 
                WHERE email = %s OR username = %s
            """, (email_or_username, email_or_username))
            user = cursor.fetchone()
            
            # Jika tidak ditemukan, coba cari berdasarkan telegram_id
            if not user and email_or_username.isdigit():
                cursor.execute("""
                    SELECT * FROM users 
                    WHERE telegram_id = %s
                """, (int(email_or_username),))
                user = cursor.fetchone()
            
            if user and UserService.verify_password(password, user.get('password_hash')):
                return user
            return None
        except Exception as e:
            print(f"Error in authenticate: {e}")
            return None
        finally:
            cursor.close()
            conn.close()