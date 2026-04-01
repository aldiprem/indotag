import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'Qwerty123456_Asdf1234'
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'root'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or 'Asdf1234_'
    MYSQL_DB = os.environ.get('MYSQL_DB') or 'indotag'
    SESSION_EXPIRY_HOURS = 24
    PORT = 8080
    HOST = '0.0.0.0'