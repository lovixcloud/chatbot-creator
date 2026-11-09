<?php

namespace ChatbotCreator;

use PDO;
use Exception;

class Database
{
    private static ?PDO $instance = null;
    private static string $driver = 'sqlite';

    private static function env(string $key, string $default): string
    {
        return (string)($_ENV[$key] ?? $_SERVER[$key] ?? getenv($key) ?: $default);
    }

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $driver = self::env('DB_DRIVER', 'sqlite');
            if (!in_array($driver, ['sqlite', 'mysql'], true)) {
                throw new Exception("Unsupported DB_DRIVER '{$driver}'. Use sqlite or mysql.");
            }
            self::$driver = $driver;

            if ($driver === 'sqlite') {
                $dbPath = self::env('DB_PATH', __DIR__ . '/../database/app.sqlite');
                if (!preg_match('/^(?:[A-Za-z]:[\\\\\/]|[\\\\\/])/', $dbPath)) {
                    $dbPath = dirname(__DIR__) . '/' . ltrim(str_replace('\\', '/', $dbPath), '/');
                }
                $dir = dirname($dbPath);
                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }
                self::$instance = new PDO("sqlite:" . $dbPath);
                self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$instance->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                self::$instance->exec('PRAGMA foreign_keys = ON;');
            } else {
                $host = self::env('DB_HOST', '127.0.0.1');
                $port = self::env('DB_PORT', '3306');
                $database = self::env('DB_DATABASE', 'chatbot_creator');
                $username = self::env('DB_USERNAME', 'root');
                $password = self::env('DB_PASSWORD', '');

                $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
                self::$instance = new PDO($dsn, $username, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
            }
        }

        return self::$instance;
    }

    public static function initializeSchema(): void
    {
        $pdo = self::getConnection();
        $schemaSql = file_get_contents(__DIR__ . '/../database/schema.sql');

        // Execute statements
        $queries = array_filter(array_map('trim', explode(';', $schemaSql)));
        foreach ($queries as $query) {
            if (!empty($query)) {
                $pdo->exec($query);
            }
        }

        self::initializePlans($pdo);
    }

    private static function initializePlans(PDO $pdo): void
    {
        $plans = [
            ['plan_starter', 'Free Starter', 'starter', 5, 0, 0, 0, ['Up to 5 active chatbots', 'Full no-code visual builder', 'Website widget embedding']],
            ['plan_standard', 'Standard', 'standard', 40, 5, 50, 0, ['Up to 40 active chatbots', 'Advanced branching workflows', 'Priority email support']],
            ['plan_premium', 'Premium', 'premium', 100, 10, 100, 1, ['Up to 100 active chatbots', 'Unlimited knowledge base entries', 'Advanced analytics']],
            ['plan_enterprise', 'Enterprise', 'enterprise', 999999, 50, 500, 0, ['Unlimited active chatbots', 'White-label widget customization', '24/7 dedicated support']],
        ];

        $sql = self::$driver === 'mysql'
            ? 'INSERT INTO plans
               (id, name, slug, bot_limit, price_monthly, price_yearly, is_popular, features_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
               name = VALUES(name), slug = VALUES(slug), bot_limit = VALUES(bot_limit),
               price_monthly = VALUES(price_monthly), price_yearly = VALUES(price_yearly),
               is_popular = VALUES(is_popular), features_json = VALUES(features_json)'
            : 'INSERT OR IGNORE INTO plans
               (id, name, slug, bot_limit, price_monthly, price_yearly, is_popular, features_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        $stmt = $pdo->prepare($sql);

        foreach ($plans as [$id, $name, $slug, $limit, $monthly, $yearly, $popular, $features]) {
            $stmt->execute([$id, $name, $slug, $limit, $monthly, $yearly, $popular, json_encode($features)]);
        }
    }

    public static function isMySql(): bool
    {
        self::getConnection();
        return self::$driver === 'mysql';
    }
}
