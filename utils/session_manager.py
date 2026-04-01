import secrets
import string
from datetime import datetime, timedelta
import pymysql
from db_config import get_db_connection

class SessionManager:
    @staticmethod
    def generate_session_token():
        """Generate random 35 character session token"""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(35))
    
    @staticmethod
    def create_session(user_id, user_agent=None, ip_address=None, expiry_hours=24):
        """Create new session for user"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        session_token = SessionManager.generate_session_token()
        expires_at = datetime.now() + timedelta(hours=expiry_hours)
        
        try:
            cursor.execute("""
                INSERT INTO sessions (user_id, session_token, user_agent, ip_address, expires_at)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, session_token, user_agent, ip_address, expires_at))
            conn.commit()
            return session_token
        except Exception as e:
            print(f"Error creating session: {e}")
            return None
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def get_session(session_token):
        """Get session by token, check if valid"""
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        cursor.execute("""
            SELECT s.*, u.id as user_id, u.email, u.username, u.telegram_id
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = %s AND s.expires_at > NOW()
        """, (session_token,))
        session = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return session
    
    @staticmethod
    def delete_session(session_token):
        """Delete session"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM sessions WHERE session_token = %s", (session_token,))
        conn.commit()
        
        cursor.close()
        conn.close()
    
    @staticmethod
    def delete_expired_sessions():
        """Delete all expired sessions"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM sessions WHERE expires_at < NOW()")
        deleted = cursor.rowcount
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return deleted