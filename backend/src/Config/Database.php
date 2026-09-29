<?php
namespace Config;

use PDO;
use PDOException;

class Database {
    private $host = 'db';
    private $db_name = 'auth_system';
    private $username = 'root';
    private $password = 'root';
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8mb4");
            $this->migrate($this->conn);
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        return $this->conn;
    }

    /**
     * Lightweight schema migration for existing databases.
     * Adds the start_date (开通时间) column when it is missing.
     */
    private function migrate($conn) {
        try {
            $stmt = $conn->query("SHOW COLUMNS FROM licenses LIKE 'start_date'");
            if ($stmt !== false && $stmt->rowCount() === 0) {
                // Existing rows keep created_at as their opening time.
                $conn->exec("ALTER TABLE licenses ADD COLUMN start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开通时间' AFTER upline");
            }
        } catch (PDOException $e) {
            // Table may not exist yet on first boot (init.sql runs at container init).
        }
    }
}
