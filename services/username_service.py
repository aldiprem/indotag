from db_config import get_db_connection
import pymysql

class UsernameService:
    @staticmethod
    def get_all_usernames(platform=None, search=None, sort='newest'):
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        query = """
            SELECT u.*, s.username as seller_username, s.full_name as seller_name
            FROM usernames u JOIN users s ON u.seller_id = s.id
            WHERE u.status = 'available'
        """
        params = []
        if platform and platform != 'all':
            query += " AND u.platform = %s"
            params.append(platform)
        if search:
            query += " AND u.username LIKE %s"
            params.append(f"%{search}%")
        if sort == 'price_low':
            query += " ORDER BY u.price ASC"
        elif sort == 'price_high':
            query += " ORDER BY u.price DESC"
        else:
            query += " ORDER BY u.created_at DESC"
        cursor.execute(query, params)
        usernames = cursor.fetchall()
        cursor.close()
        conn.close()
        return usernames
    
    @staticmethod
    def get_username_by_id(username_id):
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT u.*, s.username as seller_username, s.full_name as seller_name, s.email as seller_email
            FROM usernames u JOIN users s ON u.seller_id = s.id WHERE u.id = %s
        """, (username_id,))
        username = cursor.fetchone()
        cursor.close()
        conn.close()
        return username
    
    @staticmethod
    def create_username(username, platform, price, seller_id, description=None):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO usernames (username, platform, price, seller_id, description)
                VALUES (%s, %s, %s, %s, %s)
            """, (username, platform, price, seller_id, description))
            conn.commit()
            return cursor.lastrowid
        except Exception as e:
            conn.rollback()
            print(f"Error: {e}")
            return None
        finally:
            cursor.close()
            conn.close()