CREATE DATABASE IF NOT EXISTS indotag_marketplace;
USE indotag_marketplace;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100),
    telegram_id BIGINT UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_telegram_id (telegram_id),
    INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(35) UNIQUE NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_expires_at (expires_at)
);

CREATE TABLE IF NOT EXISTS usernames (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    seller_id INT NOT NULL,
    status ENUM('available', 'sold', 'pending') DEFAULT 'available',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sold_at TIMESTAMP NULL,
    buyer_id INT NULL,
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_username (username)
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (username_id) REFERENCES usernames(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES users(id)
);

SET GLOBAL event_scheduler = ON;
DROP EVENT IF EXISTS cleanup_expired_sessions;
CREATE EVENT cleanup_expired_sessions
ON SCHEDULE EVERY 1 HOUR
DO
DELETE FROM sessions WHERE expires_at < NOW();

INSERT IGNORE INTO users (id, email, username, full_name) VALUES (1, 'admin@indotag.site', 'admin', 'Admin Indotag');
INSERT IGNORE INTO usernames (username, platform, price, seller_id, description) VALUES 
('@johndoe', 'telegram', 500000, 1, 'Username premium Telegram'),
('@janedoe', 'instagram', 750000, 1, 'Instagram username premium'),
('@technews', 'twitter', 1000000, 1, 'Cocok untuk tech enthusiast');