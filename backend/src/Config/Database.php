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
     * Lightweight schema migration for databases created before the
     * licenses.start_date (开通时间) column was introduced.
     */
    private function migrate($conn) {
        try {
            $stmt = $conn->prepare(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'licenses' AND COLUMN_NAME = 'start_date'"
            );
            $stmt->execute([':db' => $this->db_name]);
            if ((int)$stmt->fetchColumn() === 0) {
                $conn->exec("ALTER TABLE licenses
                    ADD COLUMN start_date DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'
                    COMMENT '开通时间' AFTER upline");
                $conn->exec("UPDATE licenses SET start_date = created_at
                    WHERE start_date = '1970-01-01 00:00:00'");
            }
        } catch (PDOException $exception) {
            error_log("Migration error: " . $exception->getMessage());
        }
    }
}
