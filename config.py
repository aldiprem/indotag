import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-this'
    
    # Database
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'root'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or ''
    MYSQL_DB = os.environ.get('MYSQL_DB') or 'indotag_marketplace'
    
    # Session
    SESSION_EXPIRY_HOURS = 24
    SESSION_LENGTH = 35
    
    # Telegram
    TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN') or ''
    
    # App
    PORT = 8080
    HOST = '0.0.0.0'