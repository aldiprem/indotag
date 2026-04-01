CREATE DATABASE IF NOT EXISTS indotag_marketplace;
USE indotag_marketplace;

-- Users table
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

-- Sessions table
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

-- Usernames for sale
CREATE TABLE IF NOT EXISTS usernames (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- telegram, instagram, etc
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

-- Transactions table
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

-- Event untuk cleanup session expired
CREATE EVENT cleanup_expired_sessions
ON SCHEDULE EVERY 1 HOUR
DO
DELETE FROM sessions WHERE expires_at < NOW();

-- =====================================================
-- Indotag Marketplace Database Schema
-- =====================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS indotag_marketplace;
USE indotag_marketplace;

-- =====================================================
-- Users table
-- =====================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Sessions table
-- =====================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Usernames for sale
-- =====================================================
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
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_username (username),
    INDEX idx_platform (platform),
    INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Transactions table
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_proof TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (username_id) REFERENCES usernames(id) ON DELETE RESTRICT,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_status (status),
    INDEX idx_buyer (buyer_id),
    INDEX idx_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Event for cleanup expired sessions
-- =====================================================

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;

-- Drop event if exists
DROP EVENT IF EXISTS cleanup_expired_sessions;

-- Create event
DELIMITER $$
CREATE EVENT cleanup_expired_sessions
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
ON COMPLETION PRESERVE
DO
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
END$$
DELIMITER ;

-- =====================================================
-- Insert sample data for testing
-- =====================================================

-- Insert admin user (only if not exists)
INSERT IGNORE INTO users (id, email, username, full_name, created_at) VALUES 
(1, 'admin@indotag.site', 'admin', 'Admin Indotag', NOW());

-- Insert sample users
INSERT IGNORE INTO users (email, username, full_name) VALUES 
('seller1@example.com', 'seller_one', 'Seller One'),
('seller2@example.com', 'seller_two', 'Seller Two'),
('buyer1@example.com', 'buyer_one', 'Buyer One');

-- Insert sample usernames (only if not exists)
INSERT IGNORE INTO usernames (username, platform, price, seller_id, description, created_at) VALUES 
('@johndoe', 'telegram', 500000, 1, 'Username premium Telegram, mudah diingat', NOW()),
('@janedoe', 'instagram', 750000, 1, 'Instagram username premium untuk branding', NOW()),
('@technews', 'twitter', 1000000, 2, 'Cocok untuk tech enthusiast dan berita', NOW()),
('@viral_tiktok', 'tiktok', 1500000, 2, 'TikTok username viral, siap pakai', NOW()),
('@gamers', 'telegram', 300000, 3, 'Username komunitas gaming', NOW()),
('@foodie', 'instagram', 450000, 3, 'Perfect for food bloggers', NOW());

-- =====================================================
-- Verify tables created
-- =====================================================
SHOW TABLES;

-- Show table structure summary
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS 'Size_MB'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'indotag_marketplace'
ORDER BY TABLE_NAME;