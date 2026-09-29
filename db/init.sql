SET NAMES utf8mb4;
SET TIME_ZONE = '+08:00';

CREATE DATABASE IF NOT EXISTS auth_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE auth_system;

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Licenses Table
CREATE TABLE IF NOT EXISTS licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    qq VARCHAR(20) NOT NULL,
    owner_name VARCHAR(50) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    upline VARCHAR(50) NOT NULL COMMENT '上级代理',
    start_date DATETIME NOT NULL COMMENT '开通时间',
    expiration_date DATETIME NOT NULL COMMENT '有效期(到期时间)',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_qq (qq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration for older databases created before start_date existed
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'auth_system' AND TABLE_NAME = 'licenses' AND COLUMN_NAME = 'start_date');
SET @ddl := IF(@col_exists = 0,
    'ALTER TABLE licenses ADD COLUMN start_date DATETIME NOT NULL DEFAULT ''1970-01-01 00:00:00'' COMMENT ''开通时间'' AFTER upline',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill any placeholder start dates with the record creation time
UPDATE licenses SET start_date = created_at WHERE start_date = '1970-01-01 00:00:00';

-- Verification Codes (for updates)
CREATE TABLE IF NOT EXISTS verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- 'update_license'
    identifier VARCHAR(100) NOT NULL, -- QQ email
    code VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Data (Test Accounts)
-- Password is '123456' hashed with BCRYPT (Cost 10)
INSERT INTO admins (username, password) VALUES 
('admin', '$2y$10$eLYd0HGc9JM0qxzPkpLtDuL1UZRAS6XAwgVNO7oL9R0M/f/6bkEcW'); 

-- Seed Data (Sample Licenses)
INSERT INTO licenses (qq, owner_name, product_name, upline, start_date, expiration_date) VALUES
('123456789', '张三', '超级授权系统VIP版', '总代理', '2026-01-01 00:00:00', '2026-12-31 23:59:59'),
('987654321', '李四', '企业级管理后台', '核心代理', '2025-01-01 00:00:00', '2025-06-30 23:59:59'),
('11111', '王五', '测试过期产品', '测试员', '2022-01-01 00:00:00', '2023-01-01 00:00:00'); -- Expired
