# OMEGA Brain - Browser Automation Guide

**Feature:** Web automation, scraping, and testing with Playwright
**Status:** ✅ Ready for use
**Added:** January 25, 2026

---

## 🎯 Overview

OMEGA Brain now includes full browser automation capabilities powered by Playwright. This enables agents to:

- 🌐 Navigate websites and interact with pages
- 📸 Capture screenshots and generate PDFs
- 🔍 Scrape data from web pages
- 🤖 Automate web workflows
- 🧪 Perform automated testing
- 🍪 Manage cookies and sessions

---

## 📦 Installation

Playwright is already added to `package.json`. Install browsers with:

```bash
cd /home/mega/OmegaUltima/repos/OMEGA-Trinity/packages/brain
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers.

---

## 🚀 Quick Start

### Example 1: Navigate and Screenshot

```javascript
const axios = require('axios');

// Create browser session
const { data: session } = await axios.post('http://localhost:8080/browser/sessions', {}, {
  headers: { 'Authorization': `Bearer ${token}` },
});

const sessionId = session.sessionId;

// Navigate to a website
await axios.post('http://localhost:8080/browser/navigate', {
  sessionId,
  url: 'https://example.com',
}, {
  headers: { 'Authorization': `Bearer ${token}` },
});

// Take screenshot
const { data: screenshot } = await axios.post('http://localhost:8080/browser/screenshot', {
  sessionId,
  options: { fullPage: true },
}, {
  headers: { 'Authorization': `Bearer ${token}` },
});

console.log('Screenshot (base64):', screenshot.base64);

// Close session
await axios.delete(`http://localhost:8080/browser/sessions/${sessionId}`, {
  headers: { 'Authorization': `Bearer ${token}` },
});
```

### Example 2: Web Scraping

```javascript
// Navigate to page
await axios.post('http://localhost:8080/browser/navigate', {
  sessionId,
  url: 'https://news.ycombinator.com',
});

// Scrape data
const { data } = await axios.post('http://localhost:8080/browser/scrape', {
  sessionId,
  selectors: {
    titles: '.titleline > a',
    points: '.score',
  },
});

console.log('Scraped data:', data);
// Output: { titles: [...], points: [...] }
```

### Example 3: Form Automation

```javascript
// Navigate to form
await axios.post('http://localhost:8080/browser/navigate', {
  sessionId,
  url: 'https://example.com/login',
});

// Fill username
await axios.post('http://localhost:8080/browser/fill', {
  sessionId,
  selector: '#username',
  text: 'myusername',
});

// Fill password
await axios.post('http://localhost:8080/browser/fill', {
  sessionId,
  selector: '#password',
  text: 'mypassword',
});

// Click submit
await axios.post('http://localhost:8080/browser/click', {
  sessionId,
  selector: 'button[type="submit"]',
});

// Wait for navigation
await axios.post('http://localhost:8080/browser/wait', {
  sessionId,
  selector: '.dashboard', // Wait for dashboard to load
});
```

---

## 🔧 API Reference

### Session Management

#### Create Session
```
POST /browser/sessions
```

**Body:**
```json
{
  "sessionId": "optional-custom-id",
  "options": {
    "browserType": "chromium", // chromium, firefox, or webkit
    "viewport": { "width": 1920, "height": 1080 },
    "userAgent": "custom user agent",
    "ignoreHTTPSErrors": false
  }
}
```

**Response:**
```json
{
  "sessionId": "uuid-v4",
  "message": "Browser session created"
}
```

#### Close Session
```
DELETE /browser/sessions/:sessionId
```

#### List Sessions
```
GET /browser/sessions
```

---

### Navigation

#### Navigate to URL
```
POST /browser/navigate
```

**Body:**
```json
{
  "sessionId": "uuid",
  "url": "https://example.com",
  "options": {
    "waitUntil": "load", // load, domcontentloaded, networkidle
    "timeout": 30000
  }
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "status": 200,
  "headers": {...}
}
```

#### Go Back/Forward
```
POST /browser/back
POST /browser/forward
POST /browser/reload
```

---

### Interaction

#### Click Element
```
POST /browser/click
```

**Body:**
```json
{
  "sessionId": "uuid",
  "selector": "button.submit",
  "options": {
    "button": "left", // left, right, middle
    "clickCount": 1,
    "delay": 0
  }
}
```

#### Fill Input
```
POST /browser/fill
```

**Body:**
```json
{
  "sessionId": "uuid",
  "selector": "input[name='email']",
  "text": "user@example.com"
}
```

#### Type Text (with delay)
```
POST /browser/type
```

**Body:**
```json
{
  "sessionId": "uuid",
  "selector": "textarea",
  "text": "Hello world",
  "options": {
    "delay": 100 // ms between keystrokes
  }
}
```

---

### Data Extraction

#### Get Page Content
```
POST /browser/content
```

**Body:**
```json
{
  "sessionId": "uuid",
  "selector": "optional-selector" // If omitted, returns full HTML
}
```

#### Get Text
```
POST /browser/text
```

**Body:**
```json
{
  "sessionId": "uuid",
  "selector": "h1"
}
```

#### Scrape Multiple Elements
```
POST /browser/scrape
```

**Body:**
```json
{
  "sessionId": "uuid",
  "selectors": {
    "headings": "h1, h2, h3",
    "links": "a[href]",
    "images": "img"
  }
}
```

**Response:**
```json
{
  "headings": [
    { "text": "...", "html": "...", "href": null, "src": null }
  ],
  "links": [...],
  "images": [...]
}
```

#### Execute JavaScript
```
POST /browser/evaluate
```

**Body:**
```json
{
  "sessionId": "uuid",
  "script": "() => document.title",
  "args": []
}
```

---

### Screenshot & PDF

#### Take Screenshot
```
POST /browser/screenshot
```

**Body:**
```json
{
  "sessionId": "uuid",
  "options": {
    "type": "png", // png, jpeg
    "fullPage": false,
    "path": "/optional/save/path.png",
    "clip": {
      "x": 0,
      "y": 0,
      "width": 800,
      "height": 600
    }
  }
}
```

**Response:**
```json
{
  "base64": "iVBORw0KGgo...",
  "type": "png"
}
```

#### Generate PDF
```
POST /browser/pdf
```

**Body:**
```json
{
  "sessionId": "uuid",
  "options": {
    "format": "A4", // Letter, Legal, A4, etc.
    "printBackground": true,
    "margin": {
      "top": "1cm",
      "bottom": "1cm",
      "left": "1cm",
      "right": "1cm"
    },
    "path": "/optional/save/path.pdf"
  }
}
```

---

### Waiting

#### Wait for Selector
```
POST /browser/wait
```

**Body:**
```json
{
  "sessionId": "uuid",
  "selector": ".loading-complete",
  "options": {
    "timeout": 30000,
    "state": "visible" // visible, hidden, attached, detached
  }
}
```

#### Wait for Time
```
POST /browser/wait
```

**Body:**
```json
{
  "sessionId": "uuid",
  "milliseconds": 5000
}
```

---

### Cookies

#### Get Cookies
```
GET /browser/cookies/:sessionId
```

#### Set Cookies
```
POST /browser/cookies
```

**Body:**
```json
{
  "sessionId": "uuid",
  "cookies": [
    {
      "name": "session",
      "value": "abc123",
      "domain": "example.com",
      "path": "/",
      "expires": 1234567890,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ]
}
```

#### Clear Cookies
```
DELETE /browser/cookies/:sessionId
```

---

## 🤖 Using Browser Tools with LLMs

The browser service is integrated into the tool registry, so LLMs can use it automatically:

### Available Browser Tools

1. **browser_navigate** - Navigate to a URL
2. **browser_scrape** - Extract data with selectors
3. **browser_screenshot** - Capture screenshots
4. **browser_click** - Click elements
5. **browser_fill** - Fill form inputs
6. **browser_get_text** - Get element text
7. **browser_close** - Close browser session

### Example: LLM Using Browser Tools

```javascript
const toolRegistry = require('./src/services/tool-registry');
const llm = require('./src/services/llm-enhanced');

const browserTools = toolRegistry.getToolDefinitions([
  'browser_navigate',
  'browser_scrape',
  'browser_screenshot',
]);

const response = await llm.callWithTools({
  provider: 'anthropic',
  messages: [
    {
      role: 'user',
      content: 'Go to hacker news and tell me the top 3 story titles',
    },
  ],
  tools: browserTools,
}, {
  browser_navigate: toolRegistry.getTool('browser_navigate').handler,
  browser_scrape: toolRegistry.getTool('browser_scrape').handler,
});

// LLM will automatically:
// 1. Navigate to news.ycombinator.com
// 2. Scrape the story titles
// 3. Return the top 3 titles in natural language
```

---

## 📊 Use Cases

### 1. Research & Data Collection

```javascript
// Research a topic
const tools = ['browser_navigate', 'browser_scrape', 'browser_get_text'];
await llm.callWithTools({
  messages: [{ role: 'user', content: 'Research the latest AI news from TechCrunch' }],
  tools: toolRegistry.getToolDefinitions(tools),
}, handlers);
```

### 2. Competitive Analysis

```javascript
// Monitor competitor websites
await browser.navigate(sessionId, 'https://competitor.com/pricing');
const pricing = await browser.scrape(sessionId, {
  plans: '.pricing-plan',
  prices: '.price',
  features: '.feature-list',
});
```

### 3. Form Testing

```javascript
// Automated form testing
await browser.navigate(sessionId, 'https://app.example.com/signup');
await browser.fill(sessionId, '#email', 'test@example.com');
await browser.fill(sessionId, '#password', 'Test1234!');
await browser.click(sessionId, 'button[type="submit"]');
await browser.waitForSelector(sessionId, '.success-message');
const success = await browser.getText(sessionId, '.success-message');
```

### 4. Screenshot Monitoring

```javascript
// Monitor page changes
const screenshot1 = await browser.screenshot(sessionId, { fullPage: true });
// ... wait some time ...
const screenshot2 = await browser.screenshot(sessionId, { fullPage: true });
// Compare screenshots to detect changes
```

### 5. PDF Reports

```javascript
// Generate PDF reports
await browser.navigate(sessionId, 'https://analytics.example.com/dashboard');
await browser.pdf(sessionId, {
  format: 'A4',
  path: './reports/analytics-2026-01-25.pdf',
});
```

---

## 🔒 Security Considerations

### Sandboxing

- Each session runs in an isolated browser context
- No shared cookies or local storage between sessions
- Sessions automatically cleaned up on close

### Best Practices

✅ **Always close sessions** when done to free resources
✅ **Use timeouts** to prevent hanging requests
✅ **Validate URLs** before navigation
✅ **Sanitize scraped data** before using it
✅ **Respect robots.txt** and rate limits
❌ **Don't scrape login-protected content** without permission
❌ **Don't bypass CAPTCHAs** or anti-bot measures
❌ **Don't violate terms of service**

### Rate Limiting

Consider adding rate limiting for browser endpoints:

```javascript
const rateLimit = require('express-rate-limit');

const browserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many browser requests',
});

app.use('/browser', browserLimiter, browserRoutes);
```

---

## ⚡ Performance Tips

### 1. Reuse Sessions

```javascript
// Bad: Create new session for each page
for (const url of urls) {
  const session = await createSession();
  await navigate(session.sessionId, url);
  await closeSession(session.sessionId);
}

// Good: Reuse session
const session = await createSession();
for (const url of urls) {
  await navigate(session.sessionId, url);
}
await closeSession(session.sessionId);
```

### 2. Use Headless Mode

Headless browsers are faster and use less resources (already enabled by default).

### 3. Disable Images/CSS for Scraping

```javascript
await browser.getContext(sessionId, {
  ignoreHTTPSErrors: true,
  bypassCSP: true,
});
```

### 4. Set Appropriate Timeouts

```javascript
// For fast sites
{ timeout: 10000 }

// For slow sites
{ timeout: 60000 }
```

---

## 🧪 Testing

### Manual Testing

```bash
# Create session
curl -X POST http://localhost:8080/browser/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Navigate
curl -X POST http://localhost:8080/browser/navigate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"your-session-id","url":"https://example.com"}'

# Screenshot
curl -X POST http://localhost:8080/browser/screenshot \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"your-session-id","options":{"fullPage":true}}'
```

### Integration Tests

Create `test-browser.js`:

```javascript
const axios = require('axios');
const assert = require('assert');

async function testBrowser() {
  const base = 'http://localhost:8080';
  const headers = { 'Authorization': `Bearer ${process.env.SUPABASE_KEY}` };

  // Create session
  const { data: session } = await axios.post(`${base}/browser/sessions`, {}, { headers });
  const sessionId = session.sessionId;

  try {
    // Navigate
    const { data: nav } = await axios.post(`${base}/browser/navigate`, {
      sessionId,
      url: 'https://example.com',
    }, { headers });

    assert.strictEqual(nav.status, 200);
    assert(nav.title.includes('Example'));

    // Scrape
    const { data: scrape } = await axios.post(`${base}/browser/scrape`, {
      sessionId,
      selectors: { heading: 'h1' },
    }, { headers });

    assert(scrape.heading.length > 0);

    console.log('✅ All browser tests passed!');
  } finally {
    // Clean up
    await axios.delete(`${base}/browser/sessions/${sessionId}`, { headers });
  }
}

testBrowser().catch(console.error);
```

---

## 📚 Additional Resources

- [Playwright Docs](https://playwright.dev/)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [CSS Selectors Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [Web Scraping Best Practices](https://www.scraperapi.com/blog/web-scraping-best-practices/)

---

## 🎉 Summary

OMEGA Brain now has **full browser automation capabilities**! You can:

✅ Navigate websites programmatically
✅ Extract data with web scraping
✅ Automate form filling and clicking
✅ Capture screenshots and PDFs
✅ Let LLMs use browsers via tools
✅ Build web automation workflows

**Next Steps:**
1. Install browsers: `npx playwright install`
2. Register routes in `index.js`
3. Test with example scripts
4. Let your agents browse the web!

---

*Browser Automation powered by Playwright* 🎭
*Ready to browse, scrape, and automate!* 🌐
