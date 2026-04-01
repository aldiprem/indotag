from flask import Flask, render_template, request, jsonify, session, send_from_directory
from db_config import get_db_connection
from services.telegram_service import verify_telegram_user
import os

app = Flask(__name__, 
            template_folder='.',
            static_folder='.',
            static_url_path='/static')
app.secret_key = os.urandom(24)

# Database configuration
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'Asdf1234_'
app.config['MYSQL_DB'] = 'indotag'

# Route untuk static files - PERBAIKAN
@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files"""
    try:
        return send_from_directory('css', filename)
    except Exception as e:
        print(f"Error serving CSS {filename}: {e}")
        return "File not found", 404

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JS files"""
    try:
        return send_from_directory('js', filename)
    except Exception as e:
        print(f"Error serving JS {filename}: {e}")
        return "File not found", 404

@app.route('/')
def index():
    """Halaman utama website"""
    return render_template('index.html')

@app.route('/miniapp')
def miniapp():
    """Halaman MiniApp Telegram"""
    return render_template('html/miniapp.html')

# API endpoints (optional, tapi jangan dihapus biar ga error 404)
@app.route('/api/telegram/auth', methods=['POST'])
def telegram_auth():
    """Endpoint untuk autentikasi Telegram - Opsional"""
    return jsonify({'success': False, 'error': 'Use Telegram WebApp directly'}), 200

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