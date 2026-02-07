const http = require('http');
const https = require('https');
const { URL } = require('url');

const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
const base = new URL(baseUrl);
const client = base.protocol === 'https:' ? https : http;

function request(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, base);
    const req = client.request(
      {
        method,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        headers: { accept: 'application/json' },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const health = await request('GET', '/health');
  let parsed = null;
  try {
    parsed = JSON.parse(health.body);
  } catch (err) {
    throw new Error('Expected JSON from /health');
  }

  if (health.status !== 200 || !parsed || !parsed.ok) {
    throw new Error(`Health check failed: ${health.status}`);
  }

  const memories = await request('GET', '/memories');
  if (memories.status !== 401) {
    throw new Error(`Expected 401 from /memories without token, got ${memories.status}`);
  }

  console.log('Smoke test ok.');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
