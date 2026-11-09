/**
 * Standalone Zero-Dependency Serverless Integration Bridge Server
 * Uses native Node.js http module to serve webhooks and route channel messages.
 */

import http from 'node:http';
import url from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { handleTelegramWebhook } from '../telegram-webhook.js';
import { handleWhatsAppWebhook } from '../whatsapp-webhook.js';

const PORT = process.env.PORT || 8080;
const BOT_CONFIG_PATH = process.env.BOT_CONFIG_PATH || './examples/customer-support.json';

function loadBotConfig() {
  try {
    const raw = fs.readFileSync(path.resolve(BOT_CONFIG_PATH), 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load bot config:', e.message);
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Bot-Api-Secret-Token, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    return;
  }

  const config = loadBotConfig();
  if (!config) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Chatbot configuration unavailable' }));
    return;
  }

  // Collect request body
  let bodyChunks = [];
  req.on('data', chunk => bodyChunks.push(chunk));
  req.on('end', async () => {
    const rawBody = Buffer.concat(bodyChunks).toString();
    const wrappedReq = {
      method: req.method,
      headers: req.headers,
      query: parsedUrl.query,
      body: rawBody
    };

    let result = { statusCode: 404, body: JSON.stringify({ error: 'Endpoint not found' }) };

    try {
      if (pathname === '/webhook/telegram') {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const secretToken = process.env.TELEGRAM_SECRET_TOKEN;
        result = await handleTelegramWebhook(wrappedReq, config, botToken, secretToken);
      } else if (pathname === '/webhook/whatsapp') {
        const systemToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
        result = await handleWhatsAppWebhook(wrappedReq, config, systemToken, verifyToken);
      }
    } catch (err) {
      result = {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal Bridge Error', message: err.message })
      };
    }

    res.writeHead(result.statusCode || 200, {
      'Content-Type': (result.headers && result.headers['Content-Type']) || 'application/json'
    });
    res.end(result.body);
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[Integration Bridge] Server running on port ${PORT}`);
  });
}

export default server;
