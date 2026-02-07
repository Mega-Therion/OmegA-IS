/**
 * 🔐 API Key Vault
 * 
 * Secure encrypted storage for API keys and secrets.
 * Supports key rotation, access logging, and expiration.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const ITERATIONS = 100000;

/**
 * Derive encryption key from master password
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt data
 */
function encrypt(data, masterKey) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Combine: salt + iv + authTag + encrypted
  return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt data
 */
function decrypt(encryptedData, masterKey) {
  const buffer = Buffer.from(encryptedData, 'base64');
  
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  const key = deriveKey(masterKey, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  return decipher.update(encrypted) + decipher.final('utf8');
}

/**
 * API Key Vault
 */
class KeyVault {
  constructor(options = {}) {
    this.vaultPath = options.vaultPath || path.join(__dirname, '..', '..', 'data', 'vault.enc');
    this.masterKey = options.masterKey || process.env.VAULT_MASTER_KEY || 'default-dev-key-change-in-prod';
    this.keys = new Map();
    this.accessLog = [];
    this.maxLogEntries = options.maxLogEntries || 1000;
    this.loaded = false;
  }

  /**
   * Initialize vault (load from file or create new)
   */
  async init() {
    try {
      if (fs.existsSync(this.vaultPath)) {
        await this.load();
      } else {
        // Create empty vault
        await this.save();
      }
      this.loaded = true;
      console.log(`[Vault] Initialized with ${this.keys.size} keys`);
    } catch (error) {
      console.error('[Vault] Init failed:', error.message);
      throw error;
    }
  }

  /**
   * Load vault from encrypted file
   */
  async load() {
    const encrypted = fs.readFileSync(this.vaultPath, 'utf8');
    const decrypted = decrypt(encrypted, this.masterKey);
    const data = JSON.parse(decrypted);
    
    this.keys = new Map(Object.entries(data.keys || {}));
    this.accessLog = data.accessLog || [];
  }

  /**
   * Save vault to encrypted file
   */
  async save() {
    const data = {
      keys: Object.fromEntries(this.keys),
      accessLog: this.accessLog.slice(-this.maxLogEntries),
      savedAt: new Date().toISOString()
    };
    
    const encrypted = encrypt(JSON.stringify(data), this.masterKey);
    
    // Ensure directory exists
    const dir = path.dirname(this.vaultPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(this.vaultPath, encrypted);
  }

  /**
   * Store a key
   */
  async set(name, value, options = {}) {
    const entry = {
      value,
      createdAt: new Date().toISOString(),
      expiresAt: options.expiresAt || null,
      rotateAfter: options.rotateAfter || null,
      description: options.description || '',
      tags: options.tags || []
    };
    
    this.keys.set(name, entry);
    this.logAccess('set', name);
    await this.save();
    
    console.log(`[Vault] Stored key: ${name}`);
    return true;
  }

  /**
   * Get a key
   */
  async get(name) {
    const entry = this.keys.get(name);
    
    if (!entry) {
      this.logAccess('get:not_found', name);
      return null;
    }
    
    // Check expiration
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      this.logAccess('get:expired', name);
      return null;
    }
    
    this.logAccess('get', name);
    return entry.value;
  }

  /**
   * Delete a key
   */
  async delete(name) {
    if (!this.keys.has(name)) {
      return false;
    }
    
    this.keys.delete(name);
    this.logAccess('delete', name);
    await this.save();
    
    console.log(`[Vault] Deleted key: ${name}`);
    return true;
  }

  /**
   * List all key names (not values)
   */
  list() {
    return Array.from(this.keys.entries()).map(([name, entry]) => ({
      name,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      description: entry.description,
      tags: entry.tags
    }));
  }

  /**
   * Rotate a key (generate new value)
   */
  async rotate(name, newValue) {
    const entry = this.keys.get(name);
    
    if (!entry) {
      throw new Error(`Key not found: ${name}`);
    }
    
    // Store old value in history
    entry.previousValue = entry.value;
    entry.rotatedAt = new Date().toISOString();
    entry.value = newValue;
    
    this.keys.set(name, entry);
    this.logAccess('rotate', name);
    await this.save();
    
    console.log(`[Vault] Rotated key: ${name}`);
    return true;
  }

  /**
   * Check which keys need rotation
   */
  getKeysNeedingRotation() {
    const now = new Date();
    const needsRotation = [];
    
    for (const [name, entry] of this.keys) {
      if (entry.rotateAfter) {
        const rotateDate = new Date(entry.createdAt);
        rotateDate.setDate(rotateDate.getDate() + entry.rotateAfter);
        
        if (rotateDate < now) {
          needsRotation.push({
            name,
            overdueDays: Math.floor((now - rotateDate) / (1000 * 60 * 60 * 24))
          });
        }
      }
    }
    
    return needsRotation;
  }

  /**
   * Log access for auditing
   */
  logAccess(action, keyName) {
    this.accessLog.push({
      action,
      keyName,
      timestamp: new Date().toISOString()
    });
    
    // Trim if too many entries
    if (this.accessLog.length > this.maxLogEntries) {
      this.accessLog = this.accessLog.slice(-this.maxLogEntries);
    }
  }

  /**
   * Get access log
   */
  getAccessLog(limit = 100) {
    return this.accessLog.slice(-limit);
  }

  /**
   * Validate vault integrity
   */
  async validate() {
    try {
      await this.load();
      return { valid: true, keyCount: this.keys.size };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Change master key
   */
  async changeMasterKey(newMasterKey) {
    const oldKey = this.masterKey;
    this.masterKey = newMasterKey;
    
    try {
      await this.save();
      this.logAccess('master_key_changed', 'vault');
      console.log('[Vault] Master key changed');
      return true;
    } catch (error) {
      this.masterKey = oldKey;
      throw error;
    }
  }
}

/**
 * Express middleware for vault-based API key authentication
 */
function vaultAuthMiddleware(vault) {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    // Check if this is a valid key in the vault
    const keys = vault.list();
    const validKey = keys.find(k => k.tags.includes('api-key'));
    
    if (!validKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const storedKey = await vault.get(validKey.name);
    
    if (storedKey !== apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Add key info to request
    req.apiKeyName = validKey.name;
    next();
  };
}

// Create singleton
const vault = new KeyVault();

module.exports = {
  KeyVault,
  vault,
  vaultAuthMiddleware,
  encrypt,
  decrypt
};
