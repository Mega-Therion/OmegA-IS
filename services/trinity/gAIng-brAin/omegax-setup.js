// ==========================================
// 🧠 OMEGAI MASTER SETUP SCRIPT (CNS Edition)
// ==========================================
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("\n--- 🧠 OMEGAI CNS: MASTER SETUP INITIATED ---");

rl.question('1. Paste your Supabase URL: ', (url) => {
  rl.question('2. Paste your Supabase SERVICE ROLE KEY: ', (key) => {
    
    const envContent = `SUPABASE_URL=${url}\nSUPABASE_KEY=${key}\nNODE_ENV=development`;

    // This script automatically looks for your CNS and Dashboard folders
    const potentialPaths = ['./', './cns', './dashboard', './brain', './gAIng'];
    
    potentialPaths.forEach(path => {
      if (fs.existsSync(path)) {
        fs.writeFileSync(`${path}/.env`, envContent);
        console.log(`✅ Success: Config generated for ${path}`);
      }
    });

    console.log("\n--- ✨ SETUP COMPLETE: JARVIS BRAIN IS SYNCED ---");
    console.log("Next Step: Run 'node server.js' to wake up the system.");
    rl.close();
  });
});
