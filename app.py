from flask import Flask, request, jsonify, session, make_response
from flask_cors import CORS
import os
from datetime import datetime
from config import Config
from db_config import get_db_connection
from models.user import User
from utils.session_manager import SessionManager
from utils.telegram_auth import TelegramAuth

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize Telegram Auth
telegram_auth = TelegramAuth(Config.TELEGRAM_BOT_TOKEN)

def get_user_from_session():
    """Helper to get user from session token in cookie"""
    session_token = request.cookies.get('session_token')
    if session_token:
        session_data = SessionManager.get_session(session_token)
        if session_data:
            return session_data
    return None

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

# Authentication Routes
@app.route('/api/auth/telegram', methods=['POST'])
def auth_telegram():
    """Authenticate user via Telegram Mini App"""
    try:
        auth_data = request.json
        verified_data = telegram_auth.verify_telegram_auth(auth_data)
        
        if not verified_data:
            return jsonify({'error': 'Invalid Telegram authentication'}), 401
        
        # Check if user exists
        user = User.get_user_by_telegram_id(verified_data['id'])
        
        if not user:
            # Create new user
            user_id = User.create_user(
                email=None,
                password=None,
                username=verified_data.get('username'),
                telegram_id=verified_data['id'],
                full_name=f"{verified_data.get('first_name', '')} {verified_data.get('last_name', '')}".strip()
            )
            
            if not user_id:
                return jsonify({'error': 'Failed to create user'}), 500
            
            user = User.get_user_by_id(user_id)
        
        # Create session
        session_token = SessionManager.create_session(
            user['id'],
            request.user_agent.string,
            request.remote_addr
        )
        
        if not session_token:
            return jsonify({'error': 'Failed to create session'}), 500
        
        response = make_response(jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'telegram_id': user['telegram_id'],
                'full_name': user['full_name']
            }
        }))
        
        # Set session cookie
        response.set_cookie(
            'session_token',
            session_token,
            max_age=Config.SESSION_EXPIRY_HOURS * 3600,
            httponly=True,
            secure=True,
            samesite='Lax'
        )
        
        return response
        
    except Exception as e:
        print(f"Error in telegram auth: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user with email/password (for browser users)"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        username = data.get('username')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        # Check if email already exists
        existing_user = User.get_user_by_email(email)
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create user
        user_id = User.create_user(email, password, username)
        
        if not user_id:
            return jsonify({'error': 'Failed to create user'}), 500
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully'
        }), 201
        
    except Exception as e:
        print(f"Error in register: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user with email/password (for browser users)"""
    try:
        data = request.json
        email_or_username = data.get('email_or_username')
        password = data.get('password')
        
        if not email_or_username or not password:
            return jsonify({'error': 'Email/username and password required'}), 400
        
        # Authenticate user
        user = User.authenticate(email_or_username, password)
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if user already has active session
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT session_token FROM sessions 
            WHERE user_id = %s AND expires_at > NOW()
        """, (user['id'],))
        existing_session = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if existing_session:
            # Use existing session
            session_token = existing_session['session_token']
        else:
            # Create new session
            session_token = SessionManager.create_session(
                user['id'],
                request.user_agent.string,
                request.remote_addr
            )
            
            if not session_token:
                return jsonify({'error': 'Failed to create session'}), 500
        
        response = make_response(jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'username': user['username']
            }
        }))
        
        # Set session cookie
        response.set_cookie(
            'session_token',
            session_token,
            max_age=Config.SESSION_EXPIRY_HOURS * 3600,
            httponly=True,
            secure=True,
            samesite='Lax'
        )
        
        return response
        
    except Exception as e:
        print(f"Error in login: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout user"""
    session_token = request.cookies.get('session_token')
    
    if session_token:
        SessionManager.delete_session(session_token)
    
    response = make_response(jsonify({'success': True}))
    response.delete_cookie('session_token')
    
    return response

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """Get current authenticated user"""
    user = get_user_from_session()
    
    if user:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'username': user['username'],
                'telegram_id': user['telegram_id'],
                'full_name': user.get('full_name')
            }
        })
    
    return jsonify({'authenticated': False}), 401

if __name__ == '__main__':
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=True
    )