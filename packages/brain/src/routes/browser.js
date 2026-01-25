/**
 * OMEGA Brain - Browser Automation API Routes
 *
 * Endpoints for browser automation, web scraping, and testing
 */

const express = require('express');
const router = express.Router();
const browser = require('../services/browser');
const requireAuth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// ===========================
// Session Management
// ===========================

router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const sessionId = req.body.sessionId || uuidv4();
    const options = req.body.options || {};

    await browser.getContext(sessionId, options);

    res.json({
      sessionId,
      message: 'Browser session created',
    });
  } catch (error) {
    console.error('[Browser] Session creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    await browser.closeContext(sessionId);

    res.json({ message: 'Session closed' });
  } catch (error) {
    console.error('[Browser] Session close error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const sessions = browser.getActiveSessions();
    res.json({ sessions });
  } catch (error) {
    console.error('[Browser] List sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Navigation
// ===========================

router.post('/navigate', requireAuth, async (req, res) => {
  try {
    const { sessionId, url, options } = req.body;

    if (!sessionId || !url) {
      return res.status(400).json({ error: 'sessionId and url required' });
    }

    const result = await browser.navigate(sessionId, url, options);

    res.json(result);
  } catch (error) {
    console.error('[Browser] Navigate error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/back', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const result = await browser.goBack(sessionId);
    res.json(result);
  } catch (error) {
    console.error('[Browser] Back error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/forward', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const result = await browser.goForward(sessionId);
    res.json(result);
  } catch (error) {
    console.error('[Browser] Forward error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/reload', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const result = await browser.reload(sessionId);
    res.json(result);
  } catch (error) {
    console.error('[Browser] Reload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Interaction
// ===========================

router.post('/click', requireAuth, async (req, res) => {
  try {
    const { sessionId, selector, options } = req.body;

    if (!sessionId || !selector) {
      return res.status(400).json({ error: 'sessionId and selector required' });
    }

    const result = await browser.click(sessionId, selector, options);
    res.json(result);
  } catch (error) {
    console.error('[Browser] Click error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/fill', requireAuth, async (req, res) => {
  try {
    const { sessionId, selector, text, options } = req.body;

    if (!sessionId || !selector || text === undefined) {
      return res.status(400).json({ error: 'sessionId, selector, and text required' });
    }

    const result = await browser.fill(sessionId, selector, text, options);
    res.json(result);
  } catch (error) {
    console.error('[Browser] Fill error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/type', requireAuth, async (req, res) => {
  try {
    const { sessionId, selector, text, options } = req.body;

    if (!sessionId || !selector || !text) {
      return res.status(400).json({ error: 'sessionId, selector, and text required' });
    }

    const result = await browser.type(sessionId, selector, text, options);
    res.json(result);
  } catch (error) {
    console.error('[Browser] Type error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Data Extraction
// ===========================

router.post('/content', requireAuth, async (req, res) => {
  try {
    const { sessionId, selector } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    const result = await browser.getContent(sessionId, selector);
    res.json({ content: result });
  } catch (error) {
    console.error('[Browser] Get content error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/text', requireAuth, async (req, res) => {
  try {
    const { sessionId, selector } = req.body;

    if (!sessionId || !selector) {
      return res.status(400).json({ error: 'sessionId and selector required' });
    }

    const result = await browser.getText(sessionId, selector);
    res.json({ text: result });
  } catch (error) {
    console.error('[Browser] Get text error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/scrape', requireAuth, async (req, res) => {
  try {
    const { sessionId, selectors } = req.body;

    if (!sessionId || !selectors) {
      return res.status(400).json({ error: 'sessionId and selectors required' });
    }

    const result = await browser.scrape(sessionId, selectors);
    res.json(result);
  } catch (error) {
    console.error('[Browser] Scrape error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/evaluate', requireAuth, async (req, res) => {
  try {
    const { sessionId, script, args } = req.body;

    if (!sessionId || !script) {
      return res.status(400).json({ error: 'sessionId and script required' });
    }

    const result = await browser.evaluate(sessionId, script, args);
    res.json({ result });
  } catch (error) {
    console.error('[Browser] Evaluate error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Screenshot & PDF
// ===========================

router.post('/screenshot', requireAuth, async (req, res) => {
  try {
    const { sessionId, options } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    const result = await browser.screenshot(sessionId, options);
    res.json(result);
  } catch (error) {
    console.error('[Browser] Screenshot error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/pdf', requireAuth, async (req, res) => {
  try {
    const { sessionId, options } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    const result = await browser.pdf(sessionId, options);
    res.json(result);
  } catch (error) {
    console.error('[Browser] PDF error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Waiting
// ===========================

router.post('/wait', requireAuth, async (req, res) => {
  try {
    const { sessionId, selector, milliseconds, options } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    let result;
    if (selector) {
      result = await browser.waitForSelector(sessionId, selector, options);
    } else if (milliseconds) {
      result = await browser.wait(sessionId, milliseconds);
    } else {
      return res.status(400).json({ error: 'selector or milliseconds required' });
    }

    res.json(result);
  } catch (error) {
    console.error('[Browser] Wait error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Cookies
// ===========================

router.get('/cookies/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const cookies = await browser.getCookies(sessionId);
    res.json({ cookies });
  } catch (error) {
    console.error('[Browser] Get cookies error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cookies', requireAuth, async (req, res) => {
  try {
    const { sessionId, cookies } = req.body;

    if (!sessionId || !cookies) {
      return res.status(400).json({ error: 'sessionId and cookies required' });
    }

    const result = await browser.setCookies(sessionId, cookies);
    res.json(result);
  } catch (error) {
    console.error('[Browser] Set cookies error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/cookies/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await browser.clearCookies(sessionId);
    res.json(result);
  } catch (error) {
    console.error('[Browser] Clear cookies error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Health Check
// ===========================

router.get('/health', (req, res) => {
  const sessions = browser.getActiveSessions();
  res.json({
    status: 'healthy',
    activeSessions: sessions.length,
    sessions,
  });
});

module.exports = router;
