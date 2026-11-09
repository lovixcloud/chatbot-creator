import os, re, html

DOC_MAP = [
    ('DEVELOPER-GUIDE.md', 'developer-guide.html', 'Developer Technical Guide', 'Core system architecture, knowledge algorithms, and zero-framework implementation details.'),
    ('CHATBOT-OWNER-GUIDE.md', 'chatbot-owner-guide.html', 'Chatbot Owner Handbook', 'End-user guide to creating, customizing, testing, and embedding chatbots.'),
    ('INSTALLATION-GUIDE.md', 'installation-guide.html', 'Website Installation & CMS Guide', 'Instructions for embedding chatbots into HTML, WordPress, Shopify, and GitHub Pages.'),
    ('INTEGRATION-GUIDE.md', 'integration-guide.html', 'Multi-Channel Integration Guide', 'Connecting Telegram Bot API, Meta WhatsApp Cloud API, and generic webhooks.'),
    ('CONFIGURATION-REFERENCE.md', 'configuration-reference.html', 'Configuration Schema Reference', 'Full JSON configuration fields, types, default values, and structure.'),
    ('API-REFERENCE.md', 'api-reference.html', 'JavaScript API Reference', 'Public API contracts for ChatbotRuntime, KnowledgeEngine, and Channel Adapters.'),
    ('SECURITY-AND-PRIVACY.md', 'security-and-privacy.html', 'Security, CSP & Privacy Guide', 'Input sanitization, credential handling, CSP configuration, and data privacy.'),
    ('TROUBLESHOOTING.md', 'troubleshooting.html', 'Troubleshooting & Diagnostics', 'Solutions for embedding issues, matching discrepancies, and webhook errors.')
]

def md_to_html(md_text):
    lines = md_text.split('\n')
    out = []
    in_code = False
    code_buf = []

    for line in lines:
        if line.startswith('```'):
            if in_code:
                in_code = False
                escaped = html.escape('\n'.join(code_buf))
                out.append(f'<div class="code-wrapper"><button class="copy-btn">Copy</button><pre><code>{escaped}</code></pre></div>')
                code_buf = []
            else:
                in_code = True
                code_buf = []
            continue

        if in_code:
            code_buf.append(line)
            continue

        if line.startswith('# '):
            out.append(f'<h1>{html.escape(line[2:])}</h1>')
        elif line.startswith('## '):
            out.append(f'<h2>{html.escape(line[3:])}</h2>')
        elif line.startswith('### '):
            out.append(f'<h3>{html.escape(line[4:])}</h3>')
        elif line.startswith('#### '):
            out.append(f'<h4>{html.escape(line[5:])}</h4>')
        elif line.startswith('---'):
            out.append('<hr style="margin: 24px 0; border: none; border-top: 1px solid var(--border-color);">')
        elif line.startswith('- ') or line.startswith('* '):
            text = html.escape(line[2:])
            text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
            text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
            out.append(f'<li>{text}</li>')
        elif re.match(r'^\d+\.\s', line):
            content = re.sub(r'^\d+\.\s', '', line)
            text = html.escape(content)
            text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
            text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
            out.append(f'<li>{text}</li>')
        elif line.strip() == '':
            continue
        else:
            text = html.escape(line)
            text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
            text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
            text = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2" style="color: var(--primary);">\1</a>', text)
            out.append(f'<p>{text}</p>')

    return '\n'.join(out)

sidebar_links = '\n'.join([
    f'<li><a href="{target}" class="docs-nav-link">{title}</a></li>'
    for _, target, title, _ in DOC_MAP
])

for md_file, html_file, title, desc in DOC_MAP:
    md_path = os.path.join('docs', md_file)
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    body_html = md_to_html(md_content)

    doc_page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} | Zero-Framework Chatbot Documentation</title>
  <meta name="description" content="{desc}">
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
  <link rel="stylesheet" href="docs.css">
</head>
<body>
  <div class="docs-layout">
    <!-- Sidebar -->
    <aside class="docs-sidebar">
      <a href="../index.html" class="docs-brand">
        <div class="brand-icon">C</div>
        <div>
          <strong style="display:block; font-size: 14px;">Chatbot Studio</strong>
          <span style="font-size: 11px; color: var(--slate-500);">Documentation Center</span>
        </div>
      </a>

      <div class="docs-nav-group">
        <div class="docs-nav-title">Guides &amp; References</div>
        <ul class="docs-nav-list">
          <li><a href="index.html" class="docs-nav-link">Documentation Home</a></li>
          {sidebar_links}
        </ul>
      </div>

      <div style="margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <a href="../index.html" class="btn-back">← Back to Studio</a>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="docs-main">
      <div class="docs-topbar">
        <div style="font-size: 13px; color: var(--slate-500);">
          <a href="index.html" style="color: inherit; text-decoration: none;">Docs</a> &gt; <span>{title}</span>
        </div>
        <div style="display: flex; gap: 10px;">
          <a href="{md_file}" class="btn-github-md" target="_blank" title="View raw Markdown file for developers">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            View .MD
          </a>
          <a href="../index.html" class="btn-back">Studio</a>
        </div>
      </div>

      <article class="docs-content">
        {body_html}
      </article>
    </main>
  </div>

  <script>
    // Copy code button script
    document.querySelectorAll('.copy-btn').forEach(btn => {{
      btn.addEventListener('click', async () => {{
        const pre = btn.nextElementSibling;
        const text = pre ? pre.innerText : '';
        try {{
          if (navigator.clipboard) {{
            await navigator.clipboard.writeText(text);
          }} else {{
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }}
          btn.classList.add('copied');
          btn.innerText = 'Copied!';
          setTimeout(() => {{
            btn.classList.remove('copied');
            btn.innerText = 'Copy';
          }}, 2000);
        }} catch(e) {{
          console.error(e);
        }}
      }});
    }});

    // Highlight active sidebar link
    document.querySelectorAll('.docs-nav-link').forEach(link => {{
      if (link.getAttribute('href') === '{html_file}') {{
        link.classList.add('active');
      }}
    }});
  </script>
</body>
</html>"""

    target_path = os.path.join('docs', html_file)
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(doc_page)
    print(f'Generated {target_path}')

# Generate Documentation Hub index.html
hub_cards = '\n'.join([
    f"""<div class="card" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; transition: transform 0.15s;">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;"><a href="{target}" style="color: var(--primary); text-decoration: none;">{title}</a></h3>
      <p style="font-size: 13.5px; color: var(--slate-600); margin-bottom: 16px;">{desc}</p>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <a href="{target}" style="color: var(--primary); font-size: 13px; font-weight: 600; text-decoration: none;">Read Guide →</a>
        <a href="{md_file}" target="_blank" style="font-size: 12px; color: var(--slate-500); text-decoration: none;">.md format</a>
      </div>
    </div>"""
    for md_file, target, title, desc in DOC_MAP
])

hub_page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation Hub | Zero-Framework Chatbot Micro-SaaS</title>
  <meta name="description" content="Central documentation hub for the Zero-Framework Chatbot Creator Micro-SaaS platform.">
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
  <link rel="stylesheet" href="docs.css">
</head>
<body>
  <div class="docs-layout">
    <!-- Sidebar -->
    <aside class="docs-sidebar">
      <a href="../index.html" class="docs-brand">
        <div class="brand-icon">C</div>
        <div>
          <strong style="display:block; font-size: 14px;">Chatbot Studio</strong>
          <span style="font-size: 11px; color: var(--slate-500);">Documentation Center</span>
        </div>
      </a>

      <div class="docs-nav-group">
        <div class="docs-nav-title">Guides &amp; References</div>
        <ul class="docs-nav-list">
          <li><a href="index.html" class="docs-nav-link active">Documentation Home</a></li>
          {sidebar_links}
        </ul>
      </div>

      <div style="margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <a href="../index.html" class="btn-back">← Back to Studio</a>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="docs-main">
      <div class="docs-topbar">
        <div style="font-size: 13px; color: var(--slate-500);">Documentation Center Home</div>
        <a href="../index.html" class="btn-back">← Back to Studio</a>
      </div>

      <article class="docs-content">
        <h1>Platform Documentation Hub</h1>
        <p style="font-size: 16px; color: var(--slate-600); margin-bottom: 32px;">
          Welcome to the comprehensive documentation center for the Zero-Framework Chatbot Creator Micro-SaaS platform. Browse our user and technical guides below, available in both responsive HTML web format and developer Markdown (.md).
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          {hub_cards}
        </div>
      </article>
    </main>
  </div>
</body>
</html>"""

with open('docs/index.html', 'w', encoding='utf-8') as f:
    f.write(hub_page)
print('Generated docs/index.html')
