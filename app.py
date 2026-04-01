from flask import Flask, request, jsonify, make_response, send_from_directory
from flask_cors import CORS
import os
from datetime import datetime
import pymysql
from config import Config
from db_config import get_db_connection
from services.user_service import UserService
from services.username_service import UsernameService
from utils.session_manager import SessionManager

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, supports_credentials=True, origins=['https://indotag.site', 'https://www.indotag.site', 'http://localhost:8080'])

def get_user_from_session():
    session_token = request.cookies.get('session_token')
    if session_token:
        session_data = SessionManager.get_session(session_token)
        if session_data:
            return session_data
    return None

# ==================== STATIC FILES ====================
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('js', filename)

@app.route('/html/<path:filename>')
def serve_html(filename):
    return send_from_directory('html', filename)

# ==================== MAIN PAGES ====================
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/miniapp')
def miniapp():
    return send_from_directory('html', 'miniapp.html')

# ==================== HEALTH CHECK ====================
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

# ==================== AUTHENTICATION ====================
@app.route('/api/auth/telegram', methods=['POST'])
def auth_telegram():
    try:
        data = request.json
        telegram_id = data.get('id')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        username = data.get('username', '')
        
        if not telegram_id:
            return jsonify({'error': 'Invalid Telegram data'}), 401
        
        user = UserService.get_user_by_telegram_id(telegram_id)
        
        if not user:
            full_name = f"{first_name} {last_name}".strip()
            user_id = UserService.create_user(
                email=None, password=None, username=username,
                telegram_id=telegram_id, full_name=full_name if full_name else None
            )
            if not user_id:
                return jsonify({'error': 'Failed to create user'}), 500
            user = UserService.get_user_by_id(user_id)
        
        session_token = SessionManager.create_session(
            user['id'], str(request.user_agent), request.remote_addr
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
        
        response.set_cookie('session_token', session_token,
                           max_age=Config.SESSION_EXPIRY_HOURS * 3600,
                           httponly=True, samesite='Lax', secure=True,
                           domain='indotag.site')
        return response
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        username = data.get('username')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        if UserService.get_user_by_email(email):
            return jsonify({'error': 'Email already registered'}), 400
        
        user_id = UserService.create_user(email, password, username)
        if not user_id:
            return jsonify({'error': 'Failed to create user'}), 500
        
        return jsonify({'success': True, 'message': 'User registered successfully'}), 201
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        email_or_username = data.get('email_or_username')
        password = data.get('password')
        
        if not email_or_username or not password:
            return jsonify({'error': 'Email/username and password required'}), 400
        
        user = UserService.authenticate(email_or_username, password)
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT session_token FROM sessions WHERE user_id = %s AND expires_at > NOW()", (user['id'],))
        existing = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if existing:
            session_token = existing['session_token']
        else:
            session_token = SessionManager.create_session(user['id'], str(request.user_agent), request.remote_addr)
            if not session_token:
                return jsonify({'error': 'Failed to create session'}), 500
        
        response = make_response(jsonify({'success': True, 'user': {'id': user['id'], 'email': user['email'], 'username': user['username']}}))
        response.set_cookie('session_token', session_token, max_age=Config.SESSION_EXPIRY_HOURS * 3600,
                           httponly=True, samesite='Lax', secure=True, domain='indotag.site')
        return response
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session_token = request.cookies.get('session_token')
    if session_token:
        SessionManager.delete_session(session_token)
    response = make_response(jsonify({'success': True}))
    response.delete_cookie('session_token', domain='indotag.site')
    return response

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    user = get_user_from_session()
    if user:
        return jsonify({'authenticated': True, 'user': {
            'id': user['id'], 'email': user['email'], 'username': user['username'],
            'telegram_id': user['telegram_id'], 'full_name': user.get('full_name')
        }})
    return jsonify({'authenticated': False}), 401

# ==================== MARKETPLACE ====================
@app.route('/api/usernames', methods=['GET'])
def get_usernames():
    try:
        platform = request.args.get('platform')
        search = request.args.get('search')
        sort = request.args.get('sort', 'newest')
        usernames = UsernameService.get_all_usernames(platform, search, sort)
        result = [{'id': u['id'], 'username': u['username'], 'platform': u['platform'],
                   'price': float(u['price']), 'description': u['description'],
                   'seller_username': u['seller_username'],
                   'created_at': u['created_at'].isoformat() if u['created_at'] else None} for u in usernames]
        return jsonify(result)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Failed to load usernames'}), 500

@app.route('/api/usernames', methods=['POST'])
def create_username():
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
    
    username_id = UsernameService.create_username(username, platform, price, user['id'], description)
    if not username_id:
        return jsonify({'error': 'Failed to create listing'}), 500
    
    return jsonify({'success': True, 'message': 'Username listed successfully', 'id': username_id}), 201

@app.route('/api/usernames/<int:username_id>/buy', methods=['POST'])
def buy_username(username_id):
    user = get_user_from_session()
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    
    username = UsernameService.get_username_by_id(username_id)
    if not username:
        return jsonify({'error': 'Username not found'}), 404
    if username['status'] != 'available':
        return jsonify({'error': 'Username not available'}), 400
    if username['seller_id'] == user['id']:
        return jsonify({'error': 'Cannot buy your own username'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE usernames SET status = 'pending', buyer_id = %s WHERE id = %s AND status = 'available'", (user['id'], username_id))
        if cursor.rowcount == 0:
            return jsonify({'error': 'Username no longer available'}), 400
        cursor.execute("INSERT INTO transactions (username_id, buyer_id, seller_id, amount, status) VALUES (%s, %s, %s, %s, 'pending')",
                      (username_id, user['id'], username['seller_id'], username['price']))
        conn.commit()
        return jsonify({'success': True, 'message': 'Purchase initiated. Please complete payment.'})
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        return jsonify({'error': 'Failed to process purchase'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT COUNT(*) as count FROM usernames WHERE status = 'available'")
        total_usernames = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) as count FROM users")
        total_users = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) as count FROM transactions WHERE status = 'completed'")
        total_transactions = cursor.fetchone()['count']
        cursor.close()
        conn.close()
        return jsonify({'total_usernames': total_usernames, 'total_users': total_users, 'total_transactions': total_transactions})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'total_usernames': 0, 'total_users': 0, 'total_transactions': 0})

if __name__ == '__main__':
    os.makedirs('css', exist_ok=True)
    os.makedirs('js', exist_ok=True)
    os.makedirs('html', exist_ok=True)
    os.makedirs('services', exist_ok=True)
    os.makedirs('database', exist_ok=True)
    os.makedirs('static/img', exist_ok=True)
    print(f"Starting Indotag Marketplace on {Config.HOST}:{Config.PORT}")
    app.run(host=Config.HOST, port=Config.PORT, debug=True)