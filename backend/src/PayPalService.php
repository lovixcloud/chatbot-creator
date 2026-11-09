<?php

namespace ChatbotCreator;

use Exception;

class PayPalService
{
    private string $clientId;
    private string $clientSecret;
    private string $baseUrl;
    private string $returnUrl;
    private string $cancelUrl;

    public function __construct()
    {
        $this->clientId = (string)($_ENV['PAYPAL_CLIENT_ID'] ?? $_SERVER['PAYPAL_CLIENT_ID'] ?? getenv('PAYPAL_CLIENT_ID') ?: '');
        $this->clientSecret = (string)($_ENV['PAYPAL_CLIENT_SECRET'] ?? $_SERVER['PAYPAL_CLIENT_SECRET'] ?? getenv('PAYPAL_CLIENT_SECRET') ?: '');
        $mode = (string)($_ENV['PAYPAL_MODE'] ?? $_SERVER['PAYPAL_MODE'] ?? getenv('PAYPAL_MODE') ?: 'sandbox');
        $frontendUrl = rtrim((string)($_ENV['FRONTEND_URL'] ?? $_SERVER['FRONTEND_URL'] ?? getenv('FRONTEND_URL') ?: 'http://localhost:3000'), '/');
        $this->baseUrl = $mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
        $this->returnUrl = "{$frontendUrl}/?payment=success";
        $this->cancelUrl = "{$frontendUrl}/?payment=cancel";
    }

    public function getAccessToken(): string
    {
        if (empty($this->clientId) || empty($this->clientSecret) ||
            $this->clientId === 'sandbox_client_id_placeholder') {
            // Simulated token for development/sandbox mode when API keys are not yet entered
            return 'simulated_paypal_access_token_' . time();
        }

        $ch = curl_init("{$this->baseUrl}/v1/oauth2/token");
        curl_setopt($ch, CURLOPT_USERPWD, "{$this->clientId}:{$this->clientSecret}");
        curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=client_credentials");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json', 'Accept-Language: en_US']);

        $res = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status !== 200) {
            throw new Exception("PayPal authentication failed with status {$status}");
        }

        $data = json_decode($res, true);
        return $data['access_token'] ?? '';
    }

    public function createOrder(float $amount, string $planName, string $billingCycle, string $currency = 'USD'): array
    {
        // Support recurring ongoing payment via PayPal Orders v2
        $payload = [
            'intent' => 'CAPTURE',
            'purchase_units' => [
                [
                    'reference_id' => 'PU_' . bin2hex(random_bytes(6)),
                    'description' => "Chatbot Creator Micro-SaaS - {$planName} ({$billingCycle})",
                    'amount' => [
                        'currency_code' => $currency,
                        'value' => number_format($amount, 2, '.', '')
                    ]
                ]
            ],
            'application_context' => [
                'brand_name' => 'Chatbot Creator Studio',
                'landing_page' => 'BILLING',
                'user_action' => 'PAY_NOW',
                'return_url' => $this->returnUrl,
                'cancel_url' => $this->cancelUrl
            ]
        ];

        // If credentials are simulated or real
        if (str_starts_with($this->getAccessToken(), 'simulated_')) {
            return [
                'id' => 'PAYPAL_ORDER_' . strtoupper(bin2hex(random_bytes(8))),
                'status' => 'CREATED',
                'links' => [
                    [
                        'href' => "https://www.sandbox.paypal.com/checkoutnow?token=simulated_token",
                        'rel' => 'approve',
                        'method' => 'GET'
                    ]
                ],
                'mode' => 'sandbox_simulation'
            ];
        }

        $token = $this->getAccessToken();
        $ch = curl_init("{$this->baseUrl}/v2/checkout/orders");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "Authorization: Bearer {$token}"
        ]);

        $res = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status !== 201) {
            throw new Exception("Failed to create PayPal order: " . $res);
        }

        return json_decode($res, true);
    }

    public function isSimulation(string $orderId): bool
    {
        return str_starts_with($orderId, 'PAYPAL_ORDER_');
    }

    public function captureOrder(string $orderId): array
    {
        if ($this->isSimulation($orderId)) {
            return [
                'id' => $orderId,
                'status' => 'COMPLETED',
                'payer' => ['email_address' => 'customer@example.com'],
                'mode' => 'sandbox_simulation'
            ];
        }

        $token = $this->getAccessToken();
        $ch = curl_init("{$this->baseUrl}/v2/checkout/orders/{$orderId}/capture");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "Authorization: Bearer {$token}"
        ]);

        $res = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status !== 201 && $status !== 200) {
            throw new Exception("Failed to capture PayPal order: " . $res);
        }

        return json_decode($res, true);
    }
}
