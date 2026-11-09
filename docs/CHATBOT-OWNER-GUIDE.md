# Chatbot Owner & Administrator Guide

## 1. Introduction to the Chatbot Creator
Welcome to the **Chatbot Creator Studio**! This platform allows you to design, customize, test, and deploy modern customer support chatbots for your websites and messaging channels without writing complex code or paying high monthly subscription fees.

## 2. Understanding the Dashboard
When you launch the studio, you will see the **Platform Overview**:
- **Total Chatbots**: Number of bots created in your workspace.
- **Published Live**: Number of chatbots active on websites or channels.
- **Draft Assistants**: Chatbots currently undergoing configuration.
- **Production Templates**: Built-in specialized industry assistants ready to deploy.

## 3. Creating an Account or Starting in Standalone Mode
The studio runs directly in your web browser. There is no account registration required to begin. Your chatbots, configurations, and drafts are saved securely in your browser's IndexedDB storage. You can export complete backups at any time.

## 4. Creating Your First Chatbot
1. Click **+ New Chatbot** in the sidebar or overview screen.
2. Select **Start Blank** or pick one of the 8 pre-configured templates.
3. Your new chatbot is created immediately, and you will be redirected to the Studio Builder.

## 5. Choosing a Chatbot Template
Choose from industry-tuned templates:
- **Customer Support**: Resolves common questions and handles human escalation.
- **Instant FAQ Bot**: Answers pricing and policy questions quickly.
- **E-Commerce Assistant**: Promotes discounts and provides shipping info.
- **Lead Qualification**: Captures inbound business inquiries and emails.
- **Booking & Appointment**: Explains clinic/consultation booking procedures.
- **Technical Support**: Assists developers with API documentation.
- **Business Info**: Corporate directory and office directions.
- **Educational Tutor**: Homework and office hours helper.

## 6. Configuring the Assistant's Identity
Under the **Identity & Tone** tab:
- **Assistant Name**: Name displayed in the chat header (e.g., "Sarah from Acme").
- **Business Name**: Your company or organization name.
- **Personality**: Choose between *Friendly*, *Professional*, *Conversational*, *Technical*, or *Casual*.
- **Fallback Message**: Message spoken when the bot cannot match an answer.
- **Human Handoff Message**: Notice displayed when transferring to a human specialist.

## 7. Customizing the Chatbot's Appearance
Under the **Appearance** tab:
- **Primary Brand Color**: Match your website's primary theme.
- **Theme**: Select *Light* or *Dark* mode.
- **Position**: Place the launcher in the *Bottom Right* or *Bottom Left*.
- **Launcher Text**: Text shown on the floating button (e.g., "Chat with us").
- **Custom CSS**: Add optional custom styles without affecting your main website.

## 8. Setting Welcome Messages
Under the **Welcome & Greeting** tab:
- Set your opening greeting message.
- Add **Conversation Starters** (one question per line). These appear as interactive clickable buttons when visitors open the chat.

## 9. Adding Frequently Asked Questions (FAQs)
Under the **Knowledge Base** tab:
1. Click **+ Add Question**.
2. Enter the Question (e.g., "What is your refund policy?").
3. Enter the verified Answer.
4. Add relevant search keywords separated by commas (e.g., "refund, return, money back").
5. Save the entry.

## 10. Importing Business Knowledge
- You can export your FAQ dataset as a CSV file using **Export CSV**.
- Edit questions in Microsoft Excel or Google Sheets, then import them directly.

## 11. Configuring Conversation Workflows
Workflows guide visitors through multi-step forms. For example:
- Asking for a visitor's name.
- Capturing their verified email address.
- Logging their support ticket.

## 12. Creating Quick Replies
Quick replies are buttons presented under a bot response that allow the user to tap an option rather than typing manually.

## 13. Configuring Business Hours
Under the **Business Rules** tab:
- Enable business hours enforcement.
- Specify your weekly schedule.
- When closed, the bot automatically presents your **After-Hours Message**.

## 14. Setting Up Customer Support Handoff
Under the **Human Handoff** tab:
- Enable human escalation.
- Set trigger keywords (e.g., "human, agent, representative").
- Set notification destination email or support ticket link.

## 15. Selecting Supported Languages
Configure interface language strings and localized replies under the localization section.

## 16. Testing the Chatbot
Every change you make updates the **Live Assistant Preview** in the right column of the Studio in real time. Test asking questions, clicking conversation starter buttons, and verifying fallback messages.

## 17. Publishing the Chatbot
When satisfied with your changes:
1. Click the blue **Publish Chatbot** button.
2. The bot version increments, and the configuration is published.

## 18. Installing on a Standard HTML Website
In the **Publish & Embed** tab in the Chatbot Studio, you have two embed options:

### Option 1: Universal Zero-Dependency Embed (Recommended)
This self-contained snippet includes your customized knowledge base and settings directly in the script tag. It is guaranteed to display immediately on any website without needing a database or backend server:
```html
<!-- Universal Zero-Framework Custom Chatbot Embed -->
<script
  src="https://your-domain.com/chatbot/loader.js"
  data-chatbot-id="your-chatbot-id"
  data-chatbot-data="ENCODED_BOT_CONFIGURATION"
  async
></script>
```

### Option 2: Dynamic Cloud Loader Snippet
For configurations hosted in your serverless backend or static repository:
```html
<script
  src="https://your-domain.com/chatbot/loader.js"
  data-chatbot-id="your-chatbot-id"
  data-config-url="https://your-domain.com/data/templates/your-chatbot-id.json"
  async
></script>
```
Paste either snippet right before the closing `</body>` tag of your HTML pages.

## 19. Installing on WordPress
1. Log into your WordPress Admin Dashboard.
2. Go to **Appearance > Theme File Editor** (or use an "Insert Headers and Footers" plugin).
3. Paste the installation snippet before the closing `</body>` tag in `footer.php`.
4. Click **Update File**.

## 20. Installing on Shopify
1. In Shopify Admin, navigate to **Online Store > Themes**.
2. Click **Actions > Edit Code**.
3. Open `theme.liquid`.
4. Paste the snippet immediately before `</body>`.
5. Click **Save**.

## 21. Integrating with GitHub Pages & Static Websites
Add the snippet directly to your `index.html` file before pushing to GitHub Pages, Cloudflare Pages, or Netlify.

## 22. Configuring WhatsApp
1. Create a Meta Developer App and select WhatsApp Business Platform.
2. Obtain your **Phone Number ID** and **System User Access Token**.
3. Configure the webhook in Meta Developer portal pointing to your serverless bridge URL (`https://your-bridge.com/webhook/whatsapp`).
4. Enter your Verify Token.

## 23. Configuring Telegram
1. Open Telegram and message `@BotFather`.
2. Create a new bot and copy the API token.
3. Set your webhook with secret token:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-bridge.com/webhook/telegram&secret_token=<SECRET>`
4. Enter the bot username in the Integrations panel.

## 24. Understanding Third-Party Integrations
External messaging platforms require an intermediate serverless bridge to protect API credentials. Never place your WhatsApp token or Telegram bot token in public website HTML.

## 25. Managing Multiple Chatbots
Manage an unlimited number of bots from the **My Chatbots** screen. Duplicate bots to test different personalities or deploy unique bots on different subdomains.

## 26. Exporting and Backing Up Configurations
Click the **Export** button on any chatbot card to download a `.json` backup file. Store this file safely to restore or transfer bots across computers.

## 27. Updating Published Chatbots
When you update FAQs or greeting messages, simply click **Publish Chatbot**. Visitors will immediately receive the new configuration without requiring you to reinstall website script tags.

## 28. Privacy Settings
Configure whether chat messages persist across browser tabs or are erased when the tab closes.

## 29. Troubleshooting
If the widget does not appear:
- Check that the script URL is reachable.
- Check browser console for domain authorization errors.
- Confirm that the chatbot status is **Published**.

## 30. Frequently Asked Questions
**Q: Do I need to pay monthly fees for this chatbot?**
A: No. The platform is completely self-contained and zero-framework. Hosting costs on static providers like GitHub Pages are free.

**Q: Will the chatbot slow down my website?**
A: No. The loader script loads asynchronously (`async`) and weighs less than 35KB, ensuring fast page load speeds.
