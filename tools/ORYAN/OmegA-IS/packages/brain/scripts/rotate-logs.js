#!/usr/bin/env node
/**
 * Log Rotation Script for gAIng Brain
 *
 * Rotates log.md when it exceeds size threshold:
 * - Archives old logs with timestamp
 * - Compresses archives older than 7 days
 * - Deletes archives older than 90 days
 *
 * Usage: node scripts/rotate-logs.js
 * Add to cron: 0 0 * * * node /path/to/rotate-logs.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'log.md');
const LOGS_DIR = path.join(ROOT, 'logs');
const MAX_SIZE_MB = 5;
const COMPRESS_AFTER_DAYS = 7;
const DELETE_AFTER_DAYS = 90;

function formatDate(date) {
    return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function getFileSizeMB(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size / (1024 * 1024);
    } catch {
        return 0;
    }
}

function ensureLogsDir() {
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
}

function rotateMainLog() {
    const sizeMB = getFileSizeMB(LOG_FILE);
    if (sizeMB < MAX_SIZE_MB) {
        console.log(`log.md is ${sizeMB.toFixed(2)}MB (under ${MAX_SIZE_MB}MB threshold) - no rotation needed`);
        return false;
    }

    ensureLogsDir();
    const archiveName = `log-${formatDate(new Date())}.md`;
    const archivePath = path.join(LOGS_DIR, archiveName);

    console.log(`Rotating log.md (${sizeMB.toFixed(2)}MB) -> ${archiveName}`);
    fs.renameSync(LOG_FILE, archivePath);

    // Create fresh log with header
    const header = `# gAIng Brain Log\n\nRotated at ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(LOG_FILE, header);

    return true;
}

function compressOldLogs() {
    ensureLogsDir();
    const cutoff = Date.now() - (COMPRESS_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const files = fs.readdirSync(LOGS_DIR);

    for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const filePath = path.join(LOGS_DIR, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < cutoff) {
            console.log(`Compressing ${file}...`);
            const content = fs.readFileSync(filePath);
            const compressed = zlib.gzipSync(content);
            fs.writeFileSync(filePath + '.gz', compressed);
            fs.unlinkSync(filePath);
        }
    }
}

function deleteOldArchives() {
    ensureLogsDir();
    const cutoff = Date.now() - (DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const files = fs.readdirSync(LOGS_DIR);

    for (const file of files) {
        if (!file.endsWith('.gz')) continue;

        const filePath = path.join(LOGS_DIR, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < cutoff) {
            console.log(`Deleting old archive ${file}...`);
            fs.unlinkSync(filePath);
        }
    }
}

function main() {
    console.log('=== gAIng Log Rotation ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(');

    const rotated = rotateMainLog();
    compressOldLogs();
    deleteOldArchives();

    console.log(');
    console.log('Done.');
}

main();
