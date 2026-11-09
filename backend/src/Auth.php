<?php

namespace ChatbotCreator;

use Exception;

class Auth
{
    private static function getSecret(): string
    {
        return (string)($_ENV['JWT_SECRET'] ?? $_SERVER['JWT_SECRET'] ?? getenv('JWT_SECRET') ?: 'chatbot_creator_micro_saas_default_jwt_secret');
    }

    public static function generateToken(array $payload, int $expirySeconds = 86400 * 7): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $payload['exp'] = time() + $expirySeconds;
        $payload['iat'] = time();

        $b64Header = self::base64UrlEncode(json_encode($header));
        $b64Payload = self::base64UrlEncode(json_encode($payload));
        $signature = hash_hmac('sha256', "{$b64Header}.{$b64Payload}", self::getSecret(), true);
        $b64Signature = self::base64UrlEncode($signature);

        return "{$b64Header}.{$b64Payload}.{$b64Signature}";
    }

    public static function verifyToken(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$b64Header, $b64Payload, $b64Signature] = $parts;
        $signature = self::base64UrlDecode($b64Signature);
        $expectedSignature = hash_hmac('sha256', "{$b64Header}.{$b64Payload}", self::getSecret(), true);

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($b64Payload), true);
        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    public static function getAuthenticatedUser(): ?array
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return null;
        }

        $token = $matches[1];
        $payload = self::verifyToken($token);
        if (!$payload || !isset($payload['sub'])) {
            return null;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?");
        $stmt->execute([$payload['sub']]);
        return $stmt->fetch() ?: null;
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
