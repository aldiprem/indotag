import secrets
import string
from datetime import datetime, timedelta
import pymysql
from db_config import get_db_connection

class SessionManager:
    @staticmethod
    def generate_session_token():
        return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(35))
    
    @staticmethod
    def create_session(user_id, user_agent=None, ip_address=None, expiry_hours=24):
        conn = get_db_connection()
        cursor = conn.cursor()
        session_token = SessionManager.generate_session_token()
        expires_at = datetime.now() + timedelta(hours=expiry_hours)
        try:
            cursor.execute("INSERT INTO sessions (user_id, session_token, user_agent, ip_address, expires_at) VALUES (%s, %s, %s, %s, %s)",
                          (user_id, session_token, user_agent, ip_address, expires_at))
            conn.commit()
            return session_token
        except Exception as e:
            print(f"Error: {e}")
            return None
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_session(session_token):
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT s.*, u.id as user_id, u.email, u.username, u.telegram_id, u.full_name
            FROM sessions s JOIN users u ON s.user_id = u.id
            WHERE s.session_token = %s AND s.expires_at > NOW()
        """, (session_token,))
        session = cursor.fetchone()
        cursor.close()
        conn.close()
        return session
    
    @staticmethod
    def delete_session(session_token):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE session_token = %s", (session_token,))
        conn.commit()
        cursor.close()
        conn.close()