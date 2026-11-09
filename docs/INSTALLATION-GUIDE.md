# Website Installation & CMS Embedding Guide

This guide explains how to install your published chatbot widget onto common website platforms and Content Management Systems.

---

## 1. The Standard Embedding Snippets

### Option A: Universal Zero-Dependency Embed (Recommended)
Guaranteed to display on any third-party website, CMS, or static host immediately without requiring an external database, API server, or shared browser storage:
```html
<!-- Universal Zero-Framework Custom Chatbot Widget -->
<script
  src="https://YOUR-DOMAIN.com/chatbot/loader.js"
  data-chatbot-id="YOUR-CHATBOT-ID"
  data-chatbot-data="ENCODED_BOT_CONFIGURATION"
  async
></script>
```

### Option B: Dynamic Cloud Loader
Loads configuration dynamically from your origin server, CDN, or serverless API:
```html
<script
  src="https://YOUR-DOMAIN.com/chatbot/loader.js"
  data-chatbot-id="YOUR-CHATBOT-ID"
  data-config-url="https://YOUR-DOMAIN.com/data/templates/YOUR-CHATBOT-ID.json"
  async
></script>
```

### Script Tag Attributes
- `src`: URL to `loader.js` hosted on your static server or CDN.
- `data-chatbot-id`: The unique ID of the chatbot configured in the studio.
- `data-chatbot-data`: Full serialized chatbot configuration (URI-encoded or base64), eliminating database lookup latency and cross-domain storage boundaries.
- `data-config-url`: (Optional) Remote URL to fetch JSON configuration dynamically.
- `async`: Loads the script in the background without delaying initial page render.

---

## 2. Platform-Specific Instructions

### HTML5 Static Websites
Paste the script tag directly before the closing `</body>` tag of your HTML pages.

### WordPress
1. In WordPress Admin, navigate to **Plugins > Add New**.
2. Search for and install **WPCode** (or any header/footer injection plugin).
3. Go to **Code Snippets > Header & Footer**.
4. Paste the snippet into the **Footer** section.
5. Save changes.

### Shopify Storefronts
1. Go to **Online Store > Themes**.
2. Click **... > Edit code**.
3. In the layout folder, open `theme.liquid`.
4. Scroll to the bottom and paste the snippet above the `</body>` tag.
5. Click **Save**.

### GitHub Pages, Netlify & Cloudflare Pages
Commit the script tag into your root `index.html` file and push changes to your Git repository.
