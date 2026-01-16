const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

function getMissionsDir() {
    const rootDir = process.env.VISION_ROOT || path.resolve(process.cwd(), '..');
    return path.resolve(rootDir, 'data', 'missions');
}

function listMissions() {
    const missionsDir = getMissionsDir();
    if (!fs.existsSync(missionsDir)) {
        return [];
    }

    return fs.readdirSync(missionsDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => {
            const filePath = path.join(missionsDir, file);
            try {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
                console.warn('[Missions] Failed to parse mission:', filePath, error.message);
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => {
            const aTime = a.updatedAt || a.createdAt || '';
            const bTime = b.updatedAt || b.createdAt || '';
            return bTime.localeCompare(aTime);
        });
}

router.get('/', (req, res) => {
    res.json(listMissions());
});

module.exports = router;
