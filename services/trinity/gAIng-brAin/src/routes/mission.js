const express = require('express');
const router = express.Router();
const brain = require('../core/brain');

// Get active mission state
router.get('/', (req, res) => {
    if (brain.activeMission) {
        res.json({ 
            active: true, 
            mission: brain.activeMission 
        });
    } else {
        res.json({ 
            active: false, 
            mission: null 
        });
    }
});

module.exports = router;

