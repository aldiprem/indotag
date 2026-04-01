import hashlib
import hmac
import json
from typing import Dict, Optional

class TelegramAuth:
    def __init__(self, bot_token):
        self.bot_token = bot_token
    
    def verify_telegram_auth(self, auth_data: Dict) -> Optional[Dict]:
        """
        Verify Telegram Web App / Mini App authentication data
        """
        try:
            # Check if hash exists
            if 'hash' not in auth_data:
                return None
            
            received_hash = auth_data['hash']
            
            # Remove hash from data for verification
            auth_data_copy = auth_data.copy()
            del auth_data_copy['hash']
            
            # Sort items alphabetically by key
            sorted_items = sorted(auth_data_copy.items(), key=lambda x: x[0])
            
            # Create data string
            data_string = '\n'.join([f"{k}={v}" for k, v in sorted_items])
            
            # Generate secret key
            secret_key = hashlib.sha256(self.bot_token.encode()).digest()
            
            # Calculate hash
            computed_hash = hmac.new(
                secret_key,
                data_string.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Verify hash
            if computed_hash != received_hash:
                return None
            
            # Return user data if verification successful
            return {
                'id': int(auth_data.get('id')),
                'first_name': auth_data.get('first_name'),
                'last_name': auth_data.get('last_name'),
                'username': auth_data.get('username'),
                'photo_url': auth_data.get('photo_url'),
                'auth_date': int(auth_data.get('auth_date'))
            }
            
        except Exception as e:
            print(f"Error verifying telegram auth: {e}")
            return None