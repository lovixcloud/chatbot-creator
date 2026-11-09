# Chatbot Creator Studio

> **Zero-Framework Customizable Chatbot Creator Micro-SaaS Platform**

A production-ready, lightweight, zero-dependency customer-support chatbot creation studio and runtime engine.

---

## Key Highlights
- **Zero Frameworks & Zero Build Dependencies**: Runs directly in modern browsers using native HTML5, CSS3, ES Modules, and native APIs. No `npm install`, Webpack, Vite, React, or Vue required.
- **Independent Chatbot Runtime**: The chatbot widget executes separately from the studio interface.
- **Deterministic Knowledge-Base Matching**: Keyword-weighted, tokenized matching with configurable confidence scoring.
- **Interactive Conversational Workflows**: Multi-step forms, lead qualification, user variable capture, and human escalation.
- **Isolated Shadow DOM Rendering**: Complete CSS and DOM isolation from the host website.
- **Multi-Channel Adapter Architecture**: Seamless integration for Website Chat, WhatsApp Business Cloud API, Telegram Bot API, and Generic Webhooks.
- **Production-Grade Templates**: 8 industry-tuned templates (Customer Support, FAQ Bot, E-Commerce Assistant, Booking Scheduler, Lead Gen, Tech Support, Business Info, and Education).

---

## Quickstart

Run a static web server from the repository root:
```bash
python3 -m http.server 3000
```
Open `http://localhost:3000` in your web browser.

Run the PHP API from the repository root in a second terminal:
```bash
php -S localhost:8000 backend/router.php
```
The local development frontend on port 3000 connects to port 8000. The router
is required so PHP's built-in server forwards `/api/*` requests to the backend
entry point.

### Single-host PHP deployment

The repository includes a root [`.htaccess`](.htaccess) that routes `/api/*`
to `backend/public/index.php`. This allows shared Apache/PHP hosting to serve
the frontend and API from one HTTPS origin without separate frontend and
backend ports:

1. Upload the repository contents to the hosting document root.
2. Ensure Apache `mod_rewrite` and `AllowOverride All` (or an equivalent
   rewrite configuration) are enabled.
3. Run `composer install --no-dev` in `backend/`, or upload the existing
   `backend/vendor/` directory.
4. Copy `backend/.env.example` to `backend/.env` and configure the database,
   PayPal, `FRONTEND_URL`, and `CORS_ORIGIN` values for the public HTTPS
   origin.
5. Point the browser to `https://your-domain.example/`. The frontend
   automatically uses same-origin `/api` requests; no port 8000 process is
   required.

If the host uses Nginx or does not allow `.htaccess`, configure an equivalent
rule that sends `/api/*` to `backend/public/index.php` while leaving frontend
static files available. Do not expose `backend/.env`, the database file, or
the `backend/database/` directory publicly.

In sandbox mode, paid-plan checkout redirects to `paypal-checkout.html`, a
local PayPal checkout simulator. The plan is not activated until **Approve
payment** completes the capture request. Free Starter can be activated without
payment.

## GitHub Actions single-host deployment

The included [GitHub Actions workflow](.github/workflows/static.yml) deploys
the frontend and PHP API to the same shared-hosting document root over FTPS.
GitHub Pages is not suitable for this application because it cannot execute
PHP or connect to MySQL.

The workflow uses the GitHub `production` Environment. It creates
`backend/.env` during the deployment job from GitHub Environment variables and
secrets, uploads it over FTPS, and never commits it to the repository.

### 1. Prepare the hosting account

The hosting account must provide:

- PHP 8.1 or newer with `curl`, `pdo_mysql`, and `mbstring` enabled.
- Apache `mod_rewrite` (or an equivalent rule) so `/api/*` is routed to
  `backend/public/index.php`.
- FTPS access to the document root.
- A MySQL database and user with permission to create and modify tables.

The root [`.htaccess`](.htaccess) protects `backend/.env`, the database file,
and backend implementation files. Do not remove that protection or expose
`backend/database/` publicly.

### 2. Create the GitHub Environment

In the repository, open **Settings > Environments > New environment**, create
an environment named `production`, and add these **Variables**:

| Variable | Example |
| --- | --- |
| `FRONTEND_URL` | `https://app.example.com` |
| `CORS_ORIGIN` | `https://app.example.com` |
| `DB_DRIVER` | `mysql` |
| `DB_HOST` | `mysql.example.com` |
| `DB_PORT` | `3306` |
| `DB_DATABASE` | `chatbot_creator` |
| `DB_USERNAME` | `chatbot_app` |
| `PAYPAL_MODE` | `live` |
| `FTP_SERVER_DIR` | `/public_html/` |

Add these **Secrets** to the same environment:

| Secret | Value |
| --- | --- |
| `DB_PASSWORD` | MySQL user password |
| `JWT_SECRET` | Long random signing secret |
| `PAYPAL_CLIENT_ID` | PayPal Live REST app client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal Live REST app secret |
| `FTP_SERVER` | FTPS hostname, for example `ftp.example.com` |
| `FTP_USERNAME` | FTPS username |
| `FTP_PASSWORD` | FTPS password |

Use the exact names above. Do not put passwords, PayPal secrets, or JWT
secrets in Variables, source files, workflow YAML, or
[`backend/.env.example`](backend/.env.example). For a sandbox payment test,
set `PAYPAL_MODE` to `sandbox` and use sandbox PayPal credentials.

### 3. Deploy

Push to `main` or run **Actions > Deploy application to shared hosting > Run
workflow**. The workflow installs production Composer dependencies, excludes
the development SQLite database and test files, generates the protected
`backend/.env`, and uploads the frontend and backend together.

After deployment, open `https://app.example.com/` and verify registration,
login, `https://app.example.com/api/plans`, and a sandbox payment before
switching to live PayPal credentials. The API initializes the schema and seed
plans on its first request, so the MySQL user must have the required DDL
permissions.

## PayPal production configuration

The paid-plan flow uses PayPal Orders v2 with `CAPTURE` intent:

1. The backend creates a pending order.
2. The browser redirects to PayPal's approval URL.
3. PayPal returns to `FRONTEND_URL/?payment=success&token=<order-id>`.
4. The frontend calls the backend capture endpoint.
5. The backend verifies the pending order belongs to the authenticated user,
   verifies the plan and amount from its database, captures the order
   server-side, and activates the membership only after PayPal returns
   `COMPLETED`.

To enable real PayPal checkout:

1. Create a PayPal **Live** REST app in the PayPal Developer Dashboard.
2. Add `PAYPAL_MODE=live`, `PAYPAL_CLIENT_ID`, and `PAYPAL_CLIENT_SECRET` to
   the GitHub `production` Environment described above. For a manual
   deployment, put the same values in a private `backend/.env` file; never
   commit `.env`. Start from
   [`backend/.env.example`](backend/.env.example).
3. For the GitHub workflow, also configure the MySQL and public-origin
   variables described in the deployment section:

   ```dotenv
   PAYPAL_MODE=live
   PAYPAL_CLIENT_ID=your_live_client_id
   PAYPAL_CLIENT_SECRET=your_live_client_secret
   FRONTEND_URL=https://app.example.com
   CORS_ORIGIN=https://app.example.com
   DB_DRIVER=mysql
   DB_HOST=mysql.example.com
   DB_PORT=3306
   DB_DATABASE=chatbot_creator
   DB_USERNAME=chatbot_app
   JWT_SECRET=replace_with_a_long_random_secret
   ```

4. Serve the frontend and API over HTTPS. `FRONTEND_URL` must be the public
   origin where `index.html` is hosted; do not use `localhost` in production.
5. Ensure the API can make outbound HTTPS requests to `api-m.paypal.com` and
   that PHP has cURL and `pdo_mysql` enabled.
6. The API initializes the MySQL schema and seed plans on its first request.
   Do not expose the database or `.env` through the web server.
7. Test a low-value live transaction, confirm the PayPal return reaches
   `/?payment=success`, and verify the membership changes only after capture.

The current plans charge one PayPal order per selected monthly or yearly
period. They are **not automatic recurring subscriptions**. Automatic renewal
requires migrating to PayPal Subscriptions API products/plans and adding
verified webhook handling for subscription lifecycle events, cancellations,
refunds, and disputes; do not advertise automatic renewal until that work is
implemented.

For production operations, configure database backups, rotate the JWT and
PayPal credentials through the hosting secret manager, restrict `CORS_ORIGIN`
to the frontend origin, and monitor failed or pending payment transactions.

## MySQL hosted database

The backend supports both SQLite and MySQL through PDO. For a hosted MySQL
deployment:

1. Create the database and an application user in MySQL. Grant the user
   `CREATE`, `ALTER`, `SELECT`, `INSERT`, `UPDATE`, and `DELETE` privileges.
2. Ensure PHP has `pdo_mysql` enabled.
3. Configure `backend/.env`:

   ```dotenv
   DB_DRIVER=mysql
   DB_HOST=mysql.example.com
   DB_PORT=3306
   DB_DATABASE=chatbot_creator
   DB_USERNAME=chatbot_app
   DB_PASSWORD=your_database_password
   ```

4. Start the API or run `php backend/database/seed.php` once from the project
   root. `Database::initializeSchema()` creates all tables and provisions the
   four plans; the seed command additionally creates the demo account and
   template chatbots.
5. Keep MySQL private and allow connections only from the API host. Use TLS
   when required by the managed MySQL provider.

The schema uses portable PDO-compatible types, foreign keys, and prepared
statements. Plan and template seeding uses MySQL `ON DUPLICATE KEY UPDATE` and
SQLite conflict handling, so repeated initialization does not send SQLite-only
`INSERT OR ...` syntax to MySQL.

---

## Running Automated Tests
Execute the automated test suite using native Node.js:
```bash
node tests/run-all.js
```
Or open `tests/index.html` in your browser.

---

## Documentation
- [Developer Guide (37 Sections)](docs/DEVELOPER-GUIDE.md)
- [Chatbot Owner Guide (30 Sections)](docs/CHATBOT-OWNER-GUIDE.md)
- [Website Installation & CMS Guide](docs/INSTALLATION-GUIDE.md)
- [Multi-Channel Integration Guide](docs/INTEGRATION-GUIDE.md)
- [Configuration Reference](docs/CONFIGURATION-REFERENCE.md)
- [API Reference](docs/API-REFERENCE.md)
- [Security & Privacy](docs/SECURITY-AND-PRIVACY.md)
- [Troubleshooting Manual](docs/TROUBLESHOOTING.md)
