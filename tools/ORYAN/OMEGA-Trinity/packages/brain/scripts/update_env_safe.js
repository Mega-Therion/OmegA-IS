const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const webhookUrl = 'https://gaingbrain.app.n8n.cloud/webhook-test/member-onboarding';
const envKey = 'N8N_ONBOARDING_WEBHOOK';

try {
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  if (!envContent.includes(envKey)) {
    console.log(`Appending ${envKey} to .env`);
    fs.appendFileSync(envPath, `\n${envKey}=${webhookUrl}\n`);
  } else {
    console.log(`${envKey} already exists in .env, skipping append.`);
  }
} catch (err) {
  console.error('Error updating .env:', err);
  process.exit(1);
}
