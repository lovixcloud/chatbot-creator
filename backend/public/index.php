<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use ChatbotCreator\Database;
use ChatbotCreator\Router;
use ChatbotCreator\ApiController;

if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/../');
    $dotenv->safeLoad();
}

// Auto-initialize DB schema if needed
Database::initializeSchema();

// Set CORS headers. Credentials require an explicit allowed origin.
$configuredOrigin = $_ENV['CORS_ORIGIN'] ?? $_SERVER['CORS_ORIGIN'] ?? getenv('CORS_ORIGIN') ?: '*';
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigin = $configuredOrigin === '*' ? $requestOrigin : $configuredOrigin;
if ($allowedOrigin !== '') {
    header("Access-Control-Allow-Origin: {$allowedOrigin}");
    header('Vary: Origin');
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

$router = new Router();

// Auth Endpoints
$router->add('POST', '/api/auth/register', [ApiController::class, 'register']);
$router->add('POST', '/api/auth/login', [ApiController::class, 'login']);
$router->add('GET', '/api/auth/me', [ApiController::class, 'me']);

// Membership & Billing Endpoints
$router->add('GET', '/api/plans', [ApiController::class, 'getPlans']);
$router->add('POST', '/api/subscription/checkout', [ApiController::class, 'checkoutSubscription']);
$router->add('POST', '/api/subscription/capture', [ApiController::class, 'captureSubscription']);

// Chatbot Management Endpoints
$router->add('GET', '/api/chatbots', [ApiController::class, 'listChatbots']);
$router->add('POST', '/api/chatbots', [ApiController::class, 'saveChatbot']);
$router->add('GET', '/api/chatbots/{id}', [ApiController::class, 'getChatbot']);
$router->add('DELETE', '/api/chatbots/{id}', [ApiController::class, 'deleteChatbot']);

// Public widget embedding endpoint
$router->add('GET', '/api/public/chatbot/{id}', [ApiController::class, 'getPublicChatbot']);

$router->dispatch();
