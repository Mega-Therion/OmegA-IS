/**
 * 🔄 Self-Healing Watchdog System
 * 
 * Monitors system health and automatically recovers from failures.
 * Includes circuit breaker, retry logic, and auto-restart capabilities.
 */

const EventEmitter = require('events');
const http = require('http');
const https = require('https');

// Circuit breaker states
const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Failing, reject calls
  HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

/**
 * Circuit Breaker - Prevents cascading failures
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.halfOpenRequests = options.halfOpenRequests || 3;
    
    this.state = CIRCUIT_STATE.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.halfOpenSuccesses = 0;
  }

  async execute(fn) {
    if (this.state === CIRCUIT_STATE.OPEN) {
      // Check if we should try again
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = CIRCUIT_STATE.HALF_OPEN;
        this.halfOpenSuccesses = 0;
        console.log(`[Circuit:${this.name}] Transitioning to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.successes++;

    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.halfOpenRequests) {
        this.state = CIRCUIT_STATE.CLOSED;
        console.log(`[Circuit:${this.name}] Recovered - transitioning to CLOSED`);
      }
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = CIRCUIT_STATE.OPEN;
      console.log(`[Circuit:${this.name}] Threshold exceeded - transitioning to OPEN`);
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes
    };
  }
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry = null
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);
      
      if (onRetry) {
        onRetry({ attempt, delay, error });
      }
      
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Health Watchdog - Monitors services and auto-restarts
 */
class HealthWatchdog extends EventEmitter {
  constructor(options = {}) {
    super();
    this.services = new Map();
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Register a service to monitor
   */
  register(name, config) {
    this.services.set(name, {
      name,
      url: config.url,
      method: config.method || 'GET',
      timeout: config.timeout || 5000,
      expectedStatus: config.expectedStatus || 200,
      onFail: config.onFail || null,
      onRecover: config.onRecover || null,
      circuit: new CircuitBreaker({ name, ...config.circuitBreaker }),
      lastCheck: null,
      lastStatus: null,
      consecutiveFails: 0
    });
    
    console.log(`[Watchdog] Registered service: ${name}`);
  }

  /**
   * Check health of a single service
   */
  async checkService(service) {
    const startTime = Date.now();
    
    try {
      const result = await this.httpCheck(service.url, {
        method: service.method,
        timeout: service.timeout
      });

      const latency = Date.now() - startTime;

      if (result.statusCode === service.expectedStatus) {
        // Service is healthy
        if (service.lastStatus === 'down') {
          console.log(`[Watchdog] ✅ ${service.name} recovered (${latency}ms)`);
          this.emit('recover', { service: service.name, latency });
          if (service.onRecover) service.onRecover();
        }
        
        service.lastStatus = 'up';
        service.consecutiveFails = 0;
        
        return { status: 'up', latency };
      } else {
        throw new Error(`Unexpected status: ${result.statusCode}`);
      }
    } catch (error) {
      service.consecutiveFails++;
      
      if (service.lastStatus !== 'down') {
        console.log(`[Watchdog] ❌ ${service.name} failed: ${error.message}`);
        this.emit('fail', { service: service.name, error: error.message });
        if (service.onFail) service.onFail(error);
      }
      
      service.lastStatus = 'down';
      
      return { status: 'down', error: error.message };
    } finally {
      service.lastCheck = new Date().toISOString();
    }
  }

  /**
   * HTTP health check
   */
  httpCheck(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const lib = urlObj.protocol === 'https:' ? https : http;
      
      const req = lib.request({
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: options.method || 'GET',
        timeout: options.timeout || 5000
      }, (res) => {
        resolve({ statusCode: res.statusCode });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Check all registered services
   */
  async checkAll() {
    const results = {};
    
    for (const [name, service] of this.services) {
      results[name] = await this.checkService(service);
    }
    
    this.emit('check', results);
    return results;
  }

  /**
   * Start the watchdog
   */
  start() {
    if (this.isRunning) return;
    
    console.log('[Watchdog] Starting health monitoring...');
    this.isRunning = true;
    
    // Initial check
    this.checkAll();
    
    // Periodic checks
    this.intervalId = setInterval(() => {
      this.checkAll();
    }, this.checkInterval);
  }

  /**
   * Stop the watchdog
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Watchdog] Stopped');
  }

  /**
   * Get status of all services
   */
  getStatus() {
    const status = {};
    
    for (const [name, service] of this.services) {
      status[name] = {
        status: service.lastStatus || 'unknown',
        lastCheck: service.lastCheck,
        consecutiveFails: service.consecutiveFails,
        circuit: service.circuit.getStatus()
      };
    }
    
    return status;
  }
}

/**
 * Fallback Chain - Try multiple providers in sequence
 */
class FallbackChain {
  constructor(providers = []) {
    this.providers = providers;
    this.circuits = new Map();
    
    // Create circuit breaker for each provider
    for (const provider of providers) {
      this.circuits.set(provider.name, new CircuitBreaker({ 
        name: provider.name,
        failureThreshold: 3,
        resetTimeout: 60000
      }));
    }
  }

  async execute(request) {
    let lastError;
    
    for (const provider of this.providers) {
      const circuit = this.circuits.get(provider.name);
      
      try {
        const result = await circuit.execute(() => provider.handler(request));
        console.log(`[Fallback] Success with provider: ${provider.name}`);
        return { provider: provider.name, result };
      } catch (error) {
        console.log(`[Fallback] Provider ${provider.name} failed: ${error.message}`);
        lastError = error;
      }
    }
    
    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  getStatus() {
    const status = {};
    for (const [name, circuit] of this.circuits) {
      status[name] = circuit.getStatus();
    }
    return status;
  }
}

/**
 * Error Telemetry - Aggregate and report errors
 */
class ErrorTelemetry extends EventEmitter {
  constructor(options = {}) {
    super();
    this.errors = [];
    this.maxErrors = options.maxErrors || 1000;
    this.aggregationWindow = options.aggregationWindow || 60000; // 1 minute
    this.alertThreshold = options.alertThreshold || 10;
  }

  record(error, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      code: error.code,
      context
    };

    this.errors.push(entry);
    
    // Trim old errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Check for alert condition
    const recentErrors = this.getRecentErrors(this.aggregationWindow);
    if (recentErrors.length >= this.alertThreshold) {
      this.emit('alert', {
        count: recentErrors.length,
        window: this.aggregationWindow,
        sample: recentErrors.slice(0, 3)
      });
    }

    this.emit('error', entry);
    return entry;
  }

  getRecentErrors(windowMs = 60000) {
    const cutoff = Date.now() - windowMs;
    return this.errors.filter(e => new Date(e.timestamp).getTime() > cutoff);
  }

  getSummary() {
    const now = Date.now();
    return {
      total: this.errors.length,
      last_minute: this.getRecentErrors(60000).length,
      last_hour: this.getRecentErrors(3600000).length,
      last_error: this.errors[this.errors.length - 1] || null
    };
  }

  clear() {
    this.errors = [];
  }
}

// Create singleton instances
const watchdog = new HealthWatchdog();
const telemetry = new ErrorTelemetry();

// Export everything
module.exports = {
  CIRCUIT_STATE,
  CircuitBreaker,
  retryWithBackoff,
  HealthWatchdog,
  FallbackChain,
  ErrorTelemetry,
  watchdog,
  telemetry
};
