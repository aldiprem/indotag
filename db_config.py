import mysql.connector
from mysql.connector import Error

def get_db_connection():
    """Create database connection"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='indotag',
            user='root',
            password='Asdf1234_'
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None