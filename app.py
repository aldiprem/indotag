from flask import Flask, render_template, request, jsonify, session
from db_config import get_db_connection
from services.telegram_service import verify_telegram_user
import os

app = Flask(__name__, 
            template_folder='.',
            static_folder='.',
            static_url_path='')
app.secret_key = os.urandom(24)

# Database configuration
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = ''
app.config['MYSQL_DB'] = 'indotag'

@app.route('/')
def index():
    """Halaman utama website"""
    return render_template('index.html')

@app.route('/miniapp')
def miniapp():
    """Halaman MiniApp Telegram"""
    return render_template('html/miniapp.html')

@app.route('/api/telegram/auth', methods=['POST'])
def telegram_auth():
    """Endpoint untuk autentikasi Telegram"""
    try:
        data = request.json
        telegram_data = data.get('telegram_data', {})
        
        # Verify Telegram user
        user_data = verify_telegram_user(telegram_data)
        
        if user_data:
            session['telegram_user'] = user_data
            
            conn = get_db_connection()
            if conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, last_login)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    ON DUPLICATE KEY UPDATE
                    username = VALUES(username),
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name),
                    photo_url = VALUES(photo_url),
                    last_login = NOW()
                """, (user_data['id'], user_data.get('username', ''), 
                      user_data.get('first_name', ''), user_data.get('last_name', ''),
                      user_data.get('photo_url', '')))
                
                conn.commit()
                cursor.close()
                conn.close()
            
            return jsonify({
                'success': True,
                'user': user_data
            })
        
        return jsonify({'success': False, 'error': 'Invalid telegram data'}), 401
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/profile')
def user_profile():
    """Get user profile"""
    if 'telegram_user' in session:
        return jsonify({
            'success': True,
            'user': session['telegram_user']
        })
    return jsonify({'success': False, 'error': 'Not logged in'}), 401

@app.route('/api/telegram/logout', methods=['POST'])
def telegram_logout():
    """Logout user"""
    session.pop('telegram_user', None)
    return jsonify({'success': True})

@app.route('/api/products')
def get_products():
    """Get all products"""
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM products")
            products = cursor.fetchall()
            cursor.close()
            conn.close()
            return jsonify(products)
        return jsonify([])
    except Exception as e:
        print(f"Error getting products: {e}")
        return jsonify([])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)