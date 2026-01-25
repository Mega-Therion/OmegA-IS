/**
 * OMEGA Brain - Browser Automation Service (Playwright)
 *
 * Features:
 * - Web navigation and interaction
 * - Screenshot capture
 * - Web scraping / data extraction
 * - Form filling and automation
 * - PDF generation
 * - Network monitoring
 * - Cookie/session management
 */

const playwright = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// ===========================
// Browser Pool Management
// ===========================

const browserPool = {
  chromium: null,
  firefox: null,
  webkit: null,
};

const contextPool = new Map(); // sessionId -> context

async function getBrowser(browserType = 'chromium') {
  if (!browserPool[browserType]) {
    browserPool[browserType] = await playwright[browserType].launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }
  return browserPool[browserType];
}

async function getContext(sessionId, options = {}) {
  if (!contextPool.has(sessionId)) {
    const browser = await getBrowser(options.browserType || 'chromium');
    const context = await browser.newContext({
      viewport: options.viewport || { width: 1920, height: 1080 },
      userAgent: options.userAgent,
      ignoreHTTPSErrors: options.ignoreHTTPSErrors || false,
      ...options,
    });
    contextPool.set(sessionId, context);
  }
  return contextPool.get(sessionId);
}

async function closeContext(sessionId) {
  const context = contextPool.get(sessionId);
  if (context) {
    await context.close();
    contextPool.delete(sessionId);
  }
}

async function closeAllBrowsers() {
  // Close all contexts
  for (const context of contextPool.values()) {
    await context.close();
  }
  contextPool.clear();

  // Close all browsers
  for (const browser of Object.values(browserPool)) {
    if (browser) {
      await browser.close();
    }
  }
  browserPool.chromium = null;
  browserPool.firefox = null;
  browserPool.webkit = null;
}

// ===========================
// Navigation
// ===========================

async function navigate(sessionId, url, options = {}) {
  const context = await getContext(sessionId, options);
  const page = await context.newPage();

  const navigationOptions = {
    waitUntil: options.waitUntil || 'load',
    timeout: options.timeout || 30000,
  };

  const response = await page.goto(url, navigationOptions);

  return {
    url: page.url(),
    title: await page.title(),
    status: response.status(),
    headers: response.headers(),
  };
}

async function goBack(sessionId) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const pages = context.pages();
  if (pages.length === 0) throw new Error('No active page');

  await pages[0].goBack();
  return { url: pages[0].url() };
}

async function goForward(sessionId) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const pages = context.pages();
  if (pages.length === 0) throw new Error('No active page');

  await pages[0].goForward();
  return { url: pages[0].url() };
}

async function reload(sessionId) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const pages = context.pages();
  if (pages.length === 0) throw new Error('No active page');

  await pages[0].reload();
  return { url: pages[0].url() };
}

// ===========================
// Interaction
// ===========================

async function click(sessionId, selector, options = {}) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  await page.click(selector, options);

  return { success: true };
}

async function fill(sessionId, selector, text, options = {}) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  await page.fill(selector, text, options);

  return { success: true };
}

async function type(sessionId, selector, text, options = {}) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  await page.type(selector, text, options);

  return { success: true };
}

async function select(sessionId, selector, values) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  await page.selectOption(selector, values);

  return { success: true };
}

async function press(sessionId, selector, key) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  await page.press(selector, key);

  return { success: true };
}

// ===========================
// Data Extraction
// ===========================

async function getContent(sessionId, selector = null) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];

  if (selector) {
    const element = await page.$(selector);
    if (!element) throw new Error(`Element not found: ${selector}`);
    return await element.textContent();
  }

  return await page.content();
}

async function getText(sessionId, selector) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  return await page.textContent(selector);
}

async function getAttribute(sessionId, selector, attribute) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  return await page.getAttribute(selector, attribute);
}

async function evaluate(sessionId, script, args = []) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  return await page.evaluate(script, ...args);
}

async function scrape(sessionId, selectors) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  const results = {};

  for (const [key, selector] of Object.entries(selectors)) {
    try {
      results[key] = await page.$$eval(selector, elements =>
        elements.map(el => ({
          text: el.textContent?.trim(),
          html: el.innerHTML,
          href: el.getAttribute('href'),
          src: el.getAttribute('src'),
        }))
      );
    } catch (error) {
      results[key] = { error: error.message };
    }
  }

  return results;
}

// ===========================
// Screenshot & PDF
// ===========================

async function screenshot(sessionId, options = {}) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];

  const screenshotOptions = {
    type: options.type || 'png',
    fullPage: options.fullPage || false,
    clip: options.clip,
  };

  if (options.path) {
    await page.screenshot({ ...screenshotOptions, path: options.path });
    return { path: options.path };
  }

  const buffer = await page.screenshot(screenshotOptions);
  return {
    base64: buffer.toString('base64'),
    type: screenshotOptions.type,
  };
}

async function pdf(sessionId, options = {}) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];

  const pdfOptions = {
    format: options.format || 'A4',
    printBackground: options.printBackground !== false,
    margin: options.margin,
  };

  if (options.path) {
    await page.pdf({ ...pdfOptions, path: options.path });
    return { path: options.path };
  }

  const buffer = await page.pdf(pdfOptions);
  return {
    base64: buffer.toString('base64'),
  };
}

// ===========================
// Waiting
// ===========================

async function waitForSelector(sessionId, selector, options = {}) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  await page.waitForSelector(selector, {
    timeout: options.timeout || 30000,
    state: options.state || 'visible',
  });

  return { success: true };
}

async function waitForNavigation(sessionId, options = {}) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  await page.waitForNavigation({
    waitUntil: options.waitUntil || 'load',
    timeout: options.timeout || 30000,
  });

  return { url: page.url() };
}

async function wait(sessionId, milliseconds) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  await page.waitForTimeout(milliseconds);

  return { success: true };
}

// ===========================
// Network Monitoring
// ===========================

async function enableNetworkMonitoring(sessionId) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  const page = context.pages()[0];
  const requests = [];

  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
    });
  });

  page.on('response', response => {
    const request = requests.find(r => r.url === response.url());
    if (request) {
      request.status = response.status();
      request.statusText = response.statusText();
    }
  });

  return { success: true };
}

// ===========================
// Cookies & Storage
// ===========================

async function getCookies(sessionId) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  return await context.cookies();
}

async function setCookies(sessionId, cookies) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  await context.addCookies(cookies);
  return { success: true };
}

async function clearCookies(sessionId) {
  const context = contextPool.get(sessionId);
  if (!context) throw new Error('No active session');

  await context.clearCookies();
  return { success: true };
}

// ===========================
// Session Management
// ===========================

function getActiveSessions() {
  return Array.from(contextPool.keys());
}

function isSessionActive(sessionId) {
  return contextPool.has(sessionId);
}

// ===========================
// Exports
// ===========================

module.exports = {
  // Session management
  getContext,
  closeContext,
  closeAllBrowsers,
  getActiveSessions,
  isSessionActive,

  // Navigation
  navigate,
  goBack,
  goForward,
  reload,

  // Interaction
  click,
  fill,
  type,
  select,
  press,

  // Data extraction
  getContent,
  getText,
  getAttribute,
  evaluate,
  scrape,

  // Screenshot & PDF
  screenshot,
  pdf,

  // Waiting
  waitForSelector,
  waitForNavigation,
  wait,

  // Network
  enableNetworkMonitoring,

  // Cookies
  getCookies,
  setCookies,
  clearCookies,
};
