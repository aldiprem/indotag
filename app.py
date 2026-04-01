from flask import Flask, request, jsonify, make_response, render_template, send_from_directory
from flask_cors import CORS
import os
from datetime import datetime
from config import Config
from db_config import get_db_connection
from models.user import User
from utils.session_manager import SessionManager
from utils.telegram_auth import TelegramAuth
import pymysql

app = Flask(__name__, 
            static_folder='.',  # Root directory for static files
            static_url_path='')  # Serve static files from root path
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

# Serve static files (CSS, JS, etc)
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('js', filename)

@app.route('/static/img/<path:filename>')
def serve_img(filename):
    return send_from_directory('static/img', filename)

# Serve the main HTML page
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# API Routes
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
        user_agent = request.user_agent.string if request.user_agent else 'Unknown'
        session_token = SessionManager.create_session(
            user['id'],
            user_agent,
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
        cursor = conn.cursor(pymysql.cursors.DictCursor)
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
            user_agent = request.user_agent.string if request.user_agent else 'Unknown'
            session_token = SessionManager.create_session(
                user['id'],
                user_agent,
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

# Marketplace API Routes
@app.route('/api/usernames', methods=['GET'])
def get_usernames():
    """Get all available usernames"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        cursor.execute("""
            SELECT u.*, 
                   s.username as seller_username,
                   s.full_name as seller_name
            FROM usernames u
            JOIN users s ON u.seller_id = s.id
            WHERE u.status = 'available'
            ORDER BY u.created_at DESC
        """)
        
        usernames = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Format response
        result = []
        for username in usernames:
            result.append({
                'id': username['id'],
                'username': username['username'],
                'platform': username['platform'],
                'price': username['price'],
                'description': username['description'],
                'seller': {
                    'username': username['seller_username'],
                    'full_name': username['seller_name']
                },
                'created_at': username['created_at'].isoformat() if username['created_at'] else None
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error getting usernames: {e}")
        return jsonify({'error': 'Failed to load usernames'}), 500

@app.route('/api/usernames/<int:username_id>', methods=['GET'])
def get_username_detail(username_id):
    """Get username detail"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        cursor.execute("""
            SELECT u.*, 
                   s.username as seller_username,
                   s.full_name as seller_name,
                   s.email as seller_email
            FROM usernames u
            JOIN users s ON u.seller_id = s.id
            WHERE u.id = %s
        """, (username_id,))
        
        username = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not username:
            return jsonify({'error': 'Username not found'}), 404
        
        return jsonify({
            'id': username['id'],
            'username': username['username'],
            'platform': username['platform'],
            'price': username['price'],
            'description': username['description'],
            'status': username['status'],
            'seller': {
                'username': username['seller_username'],
                'full_name': username['seller_name'],
                'email': username['seller_email']
            },
            'created_at': username['created_at'].isoformat() if username['created_at'] else None
        })
        
    except Exception as e:
        print(f"Error getting username detail: {e}")
        return jsonify({'error': 'Failed to load username detail'}), 500

@app.route('/api/usernames', methods=['POST'])
def create_username():
    """Create new username listing (requires authentication)"""
    try:
        user = get_user_from_session()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.json
        username = data.get('username')
        platform = data.get('platform')
        price = data.get('price')
        description = data.get('description')
        
        if not all([username, platform, price]):
            return jsonify({'error': 'Username, platform, and price are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO usernames (username, platform, price, seller_id, description)
            VALUES (%s, %s, %s, %s, %s)
        """, (username, platform, price, user['id'], description))
        
        conn.commit()
        username_id = cursor.lastrowid
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Username listed successfully',
            'id': username_id
        }), 201
        
    except Exception as e:
        print(f"Error creating username: {e}")
        return jsonify({'error': 'Failed to create listing'}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get marketplace statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Get total available usernames
        cursor.execute("SELECT COUNT(*) as count FROM usernames WHERE status = 'available'")
        total_usernames = cursor.fetchone()['count']
        
        # Get total users
        cursor.execute("SELECT COUNT(*) as count FROM users")
        total_users = cursor.fetchone()['count']
        
        # Get total completed transactions
        cursor.execute("SELECT COUNT(*) as count FROM transactions WHERE status = 'completed'")
        total_transactions = cursor.fetchone()['count']
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'total_usernames': total_usernames,
            'total_users': total_users,
            'total_transactions': total_transactions
        })
        
    except Exception as e:
        print(f"Error getting stats: {e}")
        return jsonify({
            'total_usernames': 0,
            'total_users': 0,
            'total_transactions': 0
        })

# Handle 404 for all other routes
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

if __name__ == '__main__':
    # Make sure directories exist
    os.makedirs('css', exist_ok=True)
    os.makedirs('js', exist_ok=True)
    os.makedirs('static/img', exist_ok=True)
    
    print(f"Starting Indotag Marketplace on {Config.HOST}:{Config.PORT}")
    print(f"Access the website at: http://{Config.HOST}:{Config.PORT}")
    
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=True
    )