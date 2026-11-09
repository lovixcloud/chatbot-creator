<?php

namespace ChatbotCreator;

use Exception;

class ApiController
{
    // --- AUTHENTICATION ---

    public static function register(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($input['name'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';

        if (empty($name) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Name, email, and password are required.']);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid email address.']);
            return;
        }

        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'Password must be at least 6 characters.']);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'An account with this email already exists.']);
            return;
        }

        $userId = 'usr_' . bin2hex(random_bytes(8));
        $passHash = password_hash($password, PASSWORD_BCRYPT);

        $pdo->beginTransaction();
        try {
            $insert = $pdo->prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'user')");
            $insert->execute([$userId, $name, $email, $passHash]);

            // Assign free starter membership by default (5 bots)
            $memId = 'mem_' . bin2hex(random_bytes(8));
            $mem = $pdo->prepare("INSERT INTO memberships (id, user_id, plan_id, billing_cycle, status, starts_at) VALUES (?, ?, 'plan_starter', 'monthly', 'active', ?)");
            $mem->execute([$memId, $userId, date('Y-m-d H:i:s')]);

            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create user account: ' . $e->getMessage()]);
            return;
        }

        $token = Auth::generateToken(['sub' => $userId, 'email' => $email, 'name' => $name]);
        http_response_code(201);
        echo json_encode([
            'message' => 'User registered successfully',
            'token' => $token,
            'user' => [
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'role' => 'user'
            ]
        ]);
    }

    public static function login(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, name, email, password_hash, role FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid email or password.']);
            return;
        }

        $token = Auth::generateToken(['sub' => $user['id'], 'email' => $user['email'], 'name' => $user['name']]);
        echo json_encode([
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
    }

    public static function me(): void
    {
        $user = Auth::getAuthenticatedUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $pdo = Database::getConnection();
        // Fetch membership details
        $stmt = $pdo->prepare("
            SELECT m.*, p.name as plan_name, p.slug as plan_slug, p.bot_limit, p.price_monthly, p.price_yearly, p.is_popular
            FROM memberships m
            JOIN plans p ON m.plan_id = p.id
            WHERE m.user_id = ? AND m.status = 'active'
            ORDER BY m.created_at DESC
            LIMIT 1
        ");
        $stmt->execute([$user['id']]);
        $membership = $stmt->fetch() ?: [
            'plan_name' => 'Free Starter',
            'plan_slug' => 'starter',
            'bot_limit' => 5,
            'status' => 'active'
        ];

        // Count current chatbots
        $countStmt = $pdo->prepare("SELECT COUNT(*) as count FROM chatbots WHERE user_id = ?");
        $countStmt->execute([$user['id']]);
        $botCount = (int)($countStmt->fetch()['count'] ?? 0);

        echo json_encode([
            'user' => $user,
            'membership' => $membership,
            'bot_count' => $botCount,
            'bot_limit' => (int)$membership['bot_limit']
        ]);
    }

    // --- PLANS & SUBSCRIPTIONS ---

    public static function getPlans(): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT * FROM plans ORDER BY price_monthly ASC");
        $plans = $stmt->fetchAll();

        foreach ($plans as &$p) {
            $p['features'] = json_decode($p['features_json'] ?? '[]', true);
            $p['is_popular'] = (bool)$p['is_popular'];
        }

        echo json_encode(['plans' => $plans]);
    }

    public static function checkoutSubscription(): void
    {
        $user = Auth::getAuthenticatedUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $planId = $input['plan_id'] ?? '';
        $billingCycle = $input['billing_cycle'] ?? 'monthly'; // 'monthly' or 'yearly'

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM plans WHERE id = ?");
        $stmt->execute([$planId]);
        $plan = $stmt->fetch();

        if (!$plan) {
            http_response_code(404);
            echo json_encode(['error' => 'Plan not found']);
            return;
        }

        $amount = $billingCycle === 'yearly' ? (float)$plan['price_yearly'] : (float)$plan['price_monthly'];

        // Free plan requires no payment
        if ($amount <= 0) {
            $memId = 'mem_' . bin2hex(random_bytes(8));
            $up = $pdo->prepare("UPDATE memberships SET status = 'canceled' WHERE user_id = ?");
            $up->execute([$user['id']]);

            $ins = $pdo->prepare("INSERT INTO memberships (id, user_id, plan_id, billing_cycle, status, starts_at) VALUES (?, ?, ?, ?, 'active', ?)");
            $ins->execute([$memId, $user['id'], $planId, $billingCycle, date('Y-m-d H:i:s')]);

            echo json_encode([
                'success' => true,
                'message' => "Activated free plan {$plan['name']}",
                'plan' => $plan
            ]);
            return;
        }

        $paypal = new PayPalService();
        $order = $paypal->createOrder($amount, $plan['name'], $billingCycle);
        $orderId = $order['id'] ?? '';
        if (empty($orderId)) {
            http_response_code(502);
            echo json_encode(['error' => 'PayPal did not return an order ID.']);
            return;
        }

        $txStmt = $pdo->prepare("INSERT INTO payment_transactions (id, user_id, plan_id, amount, currency, provider, transaction_id, billing_type, status, payload_json) VALUES (?, ?, ?, ?, 'USD', 'paypal', ?, 'recurring_ongoing', 'pending', ?)");
        $txStmt->execute([
            'tx_' . bin2hex(random_bytes(8)),
            $user['id'],
            $planId,
            $amount,
            $orderId,
            json_encode(['order' => $order, 'billing_cycle' => $billingCycle])
        ]);

        if ($paypal->isSimulation($orderId)) {
            $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
            $origin = filter_var($origin, FILTER_VALIDATE_URL) ? rtrim($origin, '/') : 'http://localhost:3000';
            $order['links'] = array_values(array_filter(
                $order['links'] ?? [],
                static fn(array $link): bool => ($link['rel'] ?? '') !== 'approve'
            ));
            $order['links'][] = [
                'href' => "{$origin}/paypal-checkout.html?order_id=" . rawurlencode($orderId) . "&plan_id=" . rawurlencode($planId) . "&billing_cycle=" . rawurlencode($billingCycle),
                'rel' => 'approve',
                'method' => 'GET'
            ];
            $order['mode'] = 'sandbox_simulation';
        }

        echo json_encode([
            'success' => true,
            'order' => $order,
            'plan_id' => $planId,
            'billing_cycle' => $billingCycle,
            'amount' => $amount
        ]);
    }

    public static function captureSubscription(): void
    {
        $user = Auth::getAuthenticatedUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $orderId = trim((string)($input['order_id'] ?? ''));
        $billingCycle = $input['billing_cycle'] ?? null;

        if (empty($orderId)) {
            http_response_code(400);
            echo json_encode(['error' => 'order_id required']);
            return;
        }

        $pdo = Database::getConnection();
        $pendingStmt = $pdo->prepare("SELECT id, amount, plan_id, payload_json FROM payment_transactions WHERE user_id = ? AND transaction_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1");
        $pendingStmt->execute([$user['id'], $orderId]);
        $pending = $pendingStmt->fetch();
        if (!$pending) {
            http_response_code(400);
            echo json_encode(['error' => 'Payment order is missing, expired, or already processed.']);
            return;
        }
        $planId = $pending['plan_id'];
        $pendingPayload = json_decode($pending['payload_json'] ?? '', true) ?: [];
        $expectedBillingCycle = $pendingPayload['billing_cycle'] ?? 'monthly';
        if ($billingCycle !== null && $billingCycle !== $expectedBillingCycle) {
            http_response_code(400);
            echo json_encode(['error' => 'Payment billing cycle does not match the order.']);
            return;
        }
        $billingCycle = $expectedBillingCycle;

        $planStmt = $pdo->prepare("SELECT * FROM plans WHERE id = ?");
        $planStmt->execute([$planId]);
        $plan = $planStmt->fetch();
        if (!$plan) {
            http_response_code(404);
            echo json_encode(['error' => 'Plan not found']);
            return;
        }

        if (abs((float)$pending['amount'] - ($billingCycle === 'yearly' ? (float)$plan['price_yearly'] : (float)$plan['price_monthly'])) > 0.001) {
            http_response_code(400);
            echo json_encode(['error' => 'Payment details do not match the selected plan.']);
            return;
        }

        $paypal = new PayPalService();
        $capture = $paypal->captureOrder($orderId);

        if (($capture['status'] ?? '') === 'COMPLETED') {
            $amount = $billingCycle === 'yearly' ? (float)$plan['price_yearly'] : (float)$plan['price_monthly'];
            $pdo->beginTransaction();
            try {
                $txStmt = $pdo->prepare("UPDATE payment_transactions SET status = 'completed', payload_json = ? WHERE id = ?");
                $txStmt->execute([json_encode($capture), $pending['id']]);

                // Deactivate prior memberships
                $up = $pdo->prepare("UPDATE memberships SET status = 'replaced' WHERE user_id = ?");
                $up->execute([$user['id']]);

                // Activate new membership
                $memId = 'mem_' . bin2hex(random_bytes(8));
                $ins = $pdo->prepare("INSERT INTO memberships (id, user_id, plan_id, billing_cycle, status, paypal_order_id, starts_at) VALUES (?, ?, ?, ?, 'active', ?, ?)");
                $ins->execute([$memId, $user['id'], $planId, $billingCycle, $orderId, date('Y-m-d H:i:s')]);

                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'message' => "Successfully upgraded to {$plan['name']}!",
                    'membership' => [
                        'plan_id' => $planId,
                        'plan_name' => $plan['name'],
                        'bot_limit' => (int)$plan['bot_limit'],
                        'billing_cycle' => $billingCycle
                    ]
                ]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['error' => 'Payment recorded but activation failed: ' . $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Payment capture was not completed', 'details' => $capture]);
        }
    }

    // --- CHATBOTS CRUD WITH LIMIT ENFORCEMENT ---

    public static function listChatbots(): void
    {
        $user = Auth::getAuthenticatedUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, name, slug, description, status, config_json, created_at, updated_at FROM chatbots WHERE user_id = ? ORDER BY updated_at DESC");
        $stmt->execute([$user['id']]);
        $bots = $stmt->fetchAll();

        $result = [];
        foreach ($bots as $bot) {
            $config = json_decode($bot['config_json'], true);
            $result[] = $config ?: $bot;
        }

        echo json_encode(['chatbots' => $result]);
    }

    public static function getChatbot(array $params): void
    {
        $user = Auth::getAuthenticatedUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $id = $params['id'] ?? '';
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT config_json FROM chatbots WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $user['id']]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'Chatbot not found']);
            return;
        }

        echo $row['config_json'];
    }

    public static function saveChatbot(): void
    {
        $user = Auth::getAuthenticatedUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['id']) || empty($input['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid chatbot configuration. ID and Name are required.']);
            return;
        }

        $id = $input['id'];
        $name = $input['name'];
        $status = $input['status'] ?? 'draft';
        $desc = $input['identity']['roleDescription'] ?? '';
        $configJson = json_encode($input);

        $pdo = Database::getConnection();

        // Check if existing bot
        $checkStmt = $pdo->prepare("SELECT id FROM chatbots WHERE id = ? AND user_id = ?");
        $checkStmt->execute([$id, $user['id']]);
        $exists = (bool)$checkStmt->fetch();

        if (!$exists) {
            // Check bot limit from membership
            $memStmt = $pdo->prepare("
                SELECT p.bot_limit
                FROM memberships m
                JOIN plans p ON m.plan_id = p.id
                WHERE m.user_id = ? AND m.status = 'active'
                ORDER BY m.created_at DESC LIMIT 1
            ");
            $memStmt->execute([$user['id']]);
            $mem = $memStmt->fetch();
            $limit = (int)($mem['bot_limit'] ?? 5);

            $countStmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM chatbots WHERE user_id = ?");
            $countStmt->execute([$user['id']]);
            $currentCount = (int)($countStmt->fetch()['cnt'] ?? 0);

            if ($currentCount >= $limit) {
                http_response_code(403);
                echo json_encode([
                    'error' => "Bot creation limit reached ({$currentCount}/{$limit}). Please upgrade your membership plan.",
                    'limit_reached' => true,
                    'current_count' => $currentCount,
                    'limit' => $limit
                ]);
                return;
            }

            // Insert new
            $ins = $pdo->prepare("INSERT INTO chatbots (id, user_id, name, slug, description, status, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $now = date('Y-m-d H:i:s');
            $ins->execute([$id, $user['id'], $name, $id, $desc, $status, $configJson, $now, $now]);
        } else {
            // Update existing
            $up = $pdo->prepare("UPDATE chatbots SET name = ?, description = ?, status = ?, config_json = ?, updated_at = ? WHERE id = ? AND user_id = ?");
            $up->execute([$name, $desc, $status, $configJson, date('Y-m-d H:i:s'), $id, $user['id']]);
        }

        echo json_encode([
            'success' => true,
            'message' => 'Chatbot saved successfully',
            'chatbot' => $input
        ]);
    }

    public static function deleteChatbot(array $params): void
    {
        $user = Auth::getAuthenticatedUser();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $id = $params['id'] ?? '';
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("DELETE FROM chatbots WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $user['id']]);

        echo json_encode(['success' => true, 'message' => 'Chatbot deleted']);
    }

    // Public widget endpoint for embedding
    public static function getPublicChatbot(array $params): void
    {
        $id = $params['id'] ?? '';
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT config_json FROM chatbots WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'Chatbot not found or not published']);
            return;
        }

        header('Content-Type: application/json');
        echo $row['config_json'];
    }
}
