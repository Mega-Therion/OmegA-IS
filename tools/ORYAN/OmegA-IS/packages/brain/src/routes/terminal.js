const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const requireAuth = require('../middleware/auth');

/**
 * 💻 Terminal API
 * Allows direct execution of shell commands from the HUD.
 */
router.post('/exec', requireAuth, (req, res) => {
    const { command, cwd } = req.body;

    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    // Safety: strictly define allowed commands or use a restricted shell if in production.
    // For a personal project, we allow execution but log everything.
    console.log(`[Terminal] Executing: ${command} (CWD: ${cwd || process.cwd()})`);

    exec(command, { cwd: cwd || process.cwd() }, (error, stdout, stderr) => {
        res.json({
            ok: !error,
            stdout: stdout,
            stderr: stderr,
            error: error ? error.message : null
        });
    });
});

module.exports = router;
