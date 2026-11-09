<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use ChatbotCreator\Database;

if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/../');
    $dotenv->safeLoad();
}

echo "Initializing database schema...\n";
Database::initializeSchema();
$pdo = Database::getConnection();

echo "Seeding membership plans...\n";
$plans = [
    [
        'id' => 'plan_starter',
        'name' => 'Free Starter',
        'slug' => 'starter',
        'bot_limit' => 5,
        'price_monthly' => 0.00,
        'price_yearly' => 0.00,
        'is_popular' => 0,
        'features_json' => json_encode([
            'Up to 5 active chatbots',
            'Full no-code visual builder',
            'Standard knowledge base (50 FAQs)',
            'Website widget embedding',
            'Community support'
        ])
    ],
    [
        'id' => 'plan_standard',
        'name' => 'Standard',
        'slug' => 'standard',
        'bot_limit' => 40,
        'price_monthly' => 5.00,
        'price_yearly' => 50.00, // 20% yearly discount
        'is_popular' => 0,
        'features_json' => json_encode([
            'Up to 40 active chatbots',
            'Advanced branching workflows',
            'Expanded knowledge base (500 FAQs)',
            'Multi-channel webhook integration',
            'Custom branding and colors',
            'Priority email support'
        ])
    ],
    [
        'id' => 'plan_premium',
        'name' => 'Premium',
        'slug' => 'premium',
        'bot_limit' => 100,
        'price_monthly' => 10.00,
        'price_yearly' => 100.00, // 20% yearly discount ($100/yr vs $120/yr)
        'is_popular' => 1, // Favorite choice
        'features_json' => json_encode([
            'Up to 100 active chatbots',
            '⭐ Most Popular / Favorite Choice',
            'Unlimited knowledge base entries',
            'WhatsApp & Telegram bridge adapters',
            'Advanced analytics & session history',
            'Dedicated onboarding assistant'
        ])
    ],
    [
        'id' => 'plan_enterprise',
        'name' => 'Enterprise',
        'slug' => 'enterprise',
        'bot_limit' => 999999, // Unlimited
        'price_monthly' => 50.00,
        'price_yearly' => 500.00, // 20% yearly discount ($500/yr vs $600/yr)
        'is_popular' => 0,
        'features_json' => json_encode([
            'Unlimited active chatbots',
            'Custom serverless webhook scaling',
            'Multi-tenant workspace isolation',
            'White-label widget customization',
            'SLA guarantee & 24/7 dedicated support'
        ])
    ]
];

$upsertSuffix = Database::isMySql()
    ? ' ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug), bot_limit = VALUES(bot_limit), price_monthly = VALUES(price_monthly), price_yearly = VALUES(price_yearly), is_popular = VALUES(is_popular), features_json = VALUES(features_json)'
    : ' ON CONFLICT(id) DO UPDATE SET name = excluded.name, slug = excluded.slug, bot_limit = excluded.bot_limit, price_monthly = excluded.price_monthly, price_yearly = excluded.price_yearly, is_popular = excluded.is_popular, features_json = excluded.features_json';
$stmt = $pdo->prepare("INSERT INTO plans (id, name, slug, bot_limit, price_monthly, price_yearly, is_popular, features_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)" . $upsertSuffix);
foreach ($plans as $p) {
    $stmt->execute([
        $p['id'],
        $p['name'],
        $p['slug'],
        $p['bot_limit'],
        $p['price_monthly'],
        $p['price_yearly'],
        $p['is_popular'],
        $p['features_json']
    ]);
}

echo "Seeding default demo user...\n";
$demoUserId = 'usr_demo_admin';
$passwordHash = password_hash('password123', PASSWORD_BCRYPT);
$userUpsert = Database::isMySql()
    ? ' ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), password_hash = VALUES(password_hash), role = VALUES(role)'
    : ' ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, password_hash = excluded.password_hash, role = excluded.role';
$userStmt = $pdo->prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)" . $userUpsert);
$userStmt->execute([
    $demoUserId,
    'Demo Administrator',
    'demo@chatbotcreator.io',
    $passwordHash,
    'admin'
]);

// Seed Starter membership for demo user
$memStmt = $pdo->prepare("INSERT INTO memberships (id, user_id, plan_id, billing_cycle, status, starts_at) VALUES (?, ?, ?, ?, ?, ?)");
$memStmt->execute([
    'mem_' . bin2hex(random_bytes(8)),
    $demoUserId,
    'plan_premium', // Give demo user Premium by default
    'monthly',
    'active',
    date('Y-m-d H:i:s')
]);

echo "Seeding 8 chatbot templates into database...\n";
$templatesDir = __DIR__ . '/../../data/templates';
$files = glob($templatesDir . '/*.json');

$botUpsert = Database::isMySql()
    ? ' ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), name = VALUES(name), slug = VALUES(slug), description = VALUES(description), status = VALUES(status), config_json = VALUES(config_json), updated_at = CURRENT_TIMESTAMP'
    : ' ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, name = excluded.name, slug = excluded.slug, description = excluded.description, status = excluded.status, config_json = excluded.config_json, updated_at = CURRENT_TIMESTAMP';
$botStmt = $pdo->prepare("INSERT INTO chatbots (id, user_id, name, slug, description, status, config_json) VALUES (?, ?, ?, ?, ?, ?, ?)" . $botUpsert);

foreach ($files as $file) {
    $json = file_get_contents($file);
    $data = json_decode($json, true);
    if ($data && isset($data['id'])) {
        $botStmt->execute([
            $data['id'],
            $demoUserId,
            $data['name'] ?? 'Untitled Bot',
            $data['identity']['assistantName'] ?? 'Assistant',
            $data['identity']['roleDescription'] ?? 'Customer Support',
            $data['status'] ?? 'draft',
            $json
        ]);
        echo "  - Seeded template: " . $data['name'] . "\n";
    }
}

echo "Seeding complete successfully!\n";
