import hashlib
import hmac
import json
from typing import Dict, Optional

# Your Telegram Bot Token
BOT_TOKEN = "8560327887:AAHCjef_6K20ZCzqDHuFkO5UpmWS9STYv7M"  # Replace with your actual bot token

def verify_telegram_user(telegram_data: Dict) -> Optional[Dict]:
    """
    Verify Telegram user data using hash verification
    """
    try:
        if not telegram_data or 'hash' not in telegram_data:
            return None
        
        received_hash = telegram_data.pop('hash')
        
        # Sort and prepare data for verification
        data_check_string = []
        for key in sorted(telegram_data.keys()):
            if key != 'hash':
                data_check_string.append(f"{key}={telegram_data[key]}")
        
        data_check_string = '\n'.join(data_check_string)
        
        # Create secret key
        secret_key = hmac.new(
            b"WebAppData",
            BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        # Compute hash
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Verify
        if computed_hash == received_hash:
            return telegram_data
        
        return None
        
    except Exception as e:
        print(f"Error verifying telegram user: {e}")
        return None

def get_telegram_user_data(telegram_data: Dict) -> Optional[Dict]:
    """
    Extract user data from Telegram WebApp data
    """
    try:
        if 'user' in telegram_data:
            user = json.loads(telegram_data['user'])
            return {
                'id': user.get('id'),
                'username': user.get('username'),
                'first_name': user.get('first_name'),
                'last_name': user.get('last_name'),
                'photo_url': user.get('photo_url', ''),
                'auth_date': telegram_data.get('auth_date')
            }
        return None
    except Exception as e:
        print(f"Error getting user data: {e}")
        return None