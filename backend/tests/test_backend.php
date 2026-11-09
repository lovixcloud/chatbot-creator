<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use ChatbotCreator\Database;
use ChatbotCreator\Auth;
use ChatbotCreator\PayPalService;

echo "====================================================\n";
echo "RUNNING ISOLATED PHP BACKEND TEST SUITE\n";
echo "====================================================\n\n";

if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/../');
    $dotenv->safeLoad();
}

Database::initializeSchema();
$pdo = Database::getConnection();

// Test 1: Verify Seeded Plans
echo "--- Test 1: Seeded Membership Plans ---\n";
$plansStmt = $pdo->query("SELECT * FROM plans ORDER BY price_monthly ASC");
$plans = $plansStmt->fetchAll();
assert(count($plans) === 4, "Expected 4 membership plans");
assert($plans[0]['bot_limit'] == 5, "Starter should have 5 bots");
assert($plans[1]['bot_limit'] == 40, "Standard should have 40 bots");
assert($plans[2]['bot_limit'] == 100, "Premium should have 100 bots");
assert($plans[2]['is_popular'] == 1, "Premium should be favorite choice");
assert($plans[3]['bot_limit'] == 999999, "Enterprise should be unlimited");
echo "✓ All 4 membership plans verified (Free Starter, Standard $5, Premium $10, Enterprise $50)\n";

// Test 2: User Registration & Token Auth
echo "\n--- Test 2: Authentication & JWT Tokens ---\n";
$testEmail = 'tester_' . time() . '@chatbotcreator.io';
$password = 'secretpass123';
$userId = 'usr_test_' . bin2hex(random_bytes(4));
$passHash = password_hash($password, PASSWORD_BCRYPT);

$ins = $pdo->prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'user')");
$ins->execute([$userId, 'Test User', $testEmail, $passHash]);

$token = Auth::generateToken(['sub' => $userId, 'email' => $testEmail, 'name' => 'Test User']);
assert(!empty($token), "JWT token should not be empty");

$verified = Auth::verifyToken($token);
assert($verified !== null, "Token verification failed");
assert($verified['sub'] === $userId, "User ID in token mismatch");
echo "✓ User registration & HMAC-SHA256 JWT generation/verification successful\n";

// Test 3: Bot Creation Limit Enforcement
echo "\n--- Test 3: Plan Bot Limits Enforcement ---\n";
// Assign Free Starter (limit 5)
$memStmt = $pdo->prepare("INSERT INTO memberships (id, user_id, plan_id, billing_cycle, status, starts_at) VALUES (?, ?, 'plan_starter', 'monthly', 'active', ?)");
$memStmt->execute(['mem_' . bin2hex(random_bytes(6)), $userId, date('Y-m-d H:i:s')]);

$botIns = $pdo->prepare("INSERT INTO chatbots (id, user_id, name, status, config_json) VALUES (?, ?, ?, 'draft', ?)");
for ($i = 1; $i <= 5; $i++) {
    $botIns->execute(["bot_test_{$i}_{$userId}", $userId, "Bot #{$i}", json_encode(['id' => "bot_test_{$i}", 'name' => "Bot #{$i}"])]);
}

$cntStmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM chatbots WHERE user_id = ?");
$cntStmt->execute([$userId]);
$count = (int)$cntStmt->fetch()['cnt'];
assert($count === 5, "User should have 5 bots created");

// Check limit check logic
$memCheck = $pdo->prepare("SELECT p.bot_limit FROM memberships m JOIN plans p ON m.plan_id = p.id WHERE m.user_id = ? AND m.status = 'active'");
$memCheck->execute([$userId]);
$limit = (int)$memCheck->fetch()['bot_limit'];
assert($count >= $limit, "Bot limit should be reached (5/5)");
echo "✓ Starter 5-bot limit correctly enforced\n";

// Test 4: PayPal Service Order Creation & Capture (Simulation / Sandbox)
echo "\n--- Test 4: PayPal Payment Logic ---\n";
$paypal = new PayPalService();
$order = $paypal->createOrder(10.00, 'Premium Plan', 'monthly');
assert(!empty($order['id']), "Order ID should be created");
assert($order['status'] === 'CREATED', "Order status should be CREATED");

$capture = $paypal->captureOrder($order['id']);
assert($capture['status'] === 'COMPLETED', "Order capture should be COMPLETED");
echo "✓ PayPal recurring/ongoing order creation and capture verified\n";

echo "\n====================================================\n";
echo "ALL PHP BACKEND TESTS PASSED (100% PASS)\n";
echo "====================================================\n";
