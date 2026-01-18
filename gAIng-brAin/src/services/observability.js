/**
 * 📊 OpenTelemetry + Prometheus Observability Stack
 * 
 * Provides distributed tracing, metrics, and logging.
 */

const { EventEmitter } = require('events');

// Metrics store
const metrics = {
  counters: new Map(),
  gauges: new Map(),
  histograms: new Map()
};

// Trace store
const traces = {
  active: new Map(),
  completed: []
};

/**
 * Counter Metric
 */
class Counter {
  constructor(name, help, labels = []) {
    this.name = name;
    this.help = help;
    this.labels = labels;
    this.values = new Map();
  }

  inc(labelsObj = {}, value = 1) {
    const key = this.labelKey(labelsObj);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  labelKey(labelsObj) {
    return JSON.stringify(labelsObj);
  }

  toPrometheus() {
    let output = `# HELP ${this.name} ${this.help}\n`;
    output += `# TYPE ${this.name} counter\n`;
    
    for (const [labels, value] of this.values) {
      const labelStr = labels !== '{}' ? `{${this.formatLabels(labels)}}` : '';
      output += `${this.name}${labelStr} ${value}\n`;
    }
    
    return output;
  }

  formatLabels(labelsJson) {
    const obj = JSON.parse(labelsJson);
    return Object.entries(obj)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }
}

/**
 * Gauge Metric
 */
class Gauge {
  constructor(name, help, labels = []) {
    this.name = name;
    this.help = help;
    this.labels = labels;
    this.values = new Map();
  }

  set(labelsObj = {}, value) {
    const key = JSON.stringify(labelsObj);
    this.values.set(key, value);
  }

  inc(labelsObj = {}, value = 1) {
    const key = JSON.stringify(labelsObj);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  dec(labelsObj = {}, value = 1) {
    const key = JSON.stringify(labelsObj);
    const current = this.values.get(key) || 0;
    this.values.set(key, current - value);
  }

  toPrometheus() {
    let output = `# HELP ${this.name} ${this.help}\n`;
    output += `# TYPE ${this.name} gauge\n`;
    
    for (const [labels, value] of this.values) {
      const obj = JSON.parse(labels);
      const labelStr = Object.keys(obj).length > 0 
        ? `{${Object.entries(obj).map(([k, v]) => `${k}="${v}"`).join(',')}}` 
        : '';
      output += `${this.name}${labelStr} ${value}\n`;
    }
    
    return output;
  }
}

/**
 * Histogram Metric
 */
class Histogram {
  constructor(name, help, buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]) {
    this.name = name;
    this.help = help;
    this.buckets = buckets.sort((a, b) => a - b);
    this.values = [];
    this.sum = 0;
    this.count = 0;
  }

  observe(value) {
    this.values.push(value);
    this.sum += value;
    this.count++;
  }

  toPrometheus() {
    let output = `# HELP ${this.name} ${this.help}\n`;
    output += `# TYPE ${this.name} histogram\n`;
    
    let cumulative = 0;
    for (const bucket of this.buckets) {
      cumulative += this.values.filter(v => v <= bucket).length - cumulative;
      output += `${this.name}_bucket{le="${bucket}"} ${cumulative}\n`;
    }
    output += `${this.name}_bucket{le="+Inf"} ${this.count}\n`;
    output += `${this.name}_sum ${this.sum}\n`;
    output += `${this.name}_count ${this.count}\n`;
    
    return output;
  }
}

/**
 * Span for distributed tracing
 */
class Span {
  constructor(name, traceId, parentId = null) {
    this.name = name;
    this.traceId = traceId;
    this.spanId = this.generateId();
    this.parentId = parentId;
    this.startTime = Date.now();
    this.endTime = null;
    this.status = 'OK';
    this.attributes = {};
    this.events = [];
  }

  generateId() {
    return Math.random().toString(16).slice(2, 18);
  }

  setAttribute(key, value) {
    this.attributes[key] = value;
    return this;
  }

  setStatus(status, message = null) {
    this.status = status;
    if (message) this.attributes.statusMessage = message;
    return this;
  }

  addEvent(name, attributes = {}) {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes
    });
    return this;
  }

  end() {
    this.endTime = Date.now();
    traces.active.delete(this.spanId);
    traces.completed.push(this.toJSON());
    
    // Keep only last 1000 traces
    if (traces.completed.length > 1000) {
      traces.completed = traces.completed.slice(-1000);
    }
  }

  get duration() {
    return (this.endTime || Date.now()) - this.startTime;
  }

  toJSON() {
    return {
      name: this.name,
      traceId: this.traceId,
      spanId: this.spanId,
      parentId: this.parentId,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      status: this.status,
      attributes: this.attributes,
      events: this.events
    };
  }
}

/**
 * Tracer for creating spans
 */
class Tracer {
  constructor(serviceName) {
    this.serviceName = serviceName;
  }

  startSpan(name, options = {}) {
    const traceId = options.traceId || this.generateTraceId();
    const span = new Span(name, traceId, options.parentId);
    span.setAttribute('service.name', this.serviceName);
    traces.active.set(span.spanId, span);
    return span;
  }

  generateTraceId() {
    return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  }
}

/**
 * Metrics Registry
 */
class MetricsRegistry {
  constructor() {
    this.metrics = new Map();
    this.initDefaultMetrics();
  }

  initDefaultMetrics() {
    // Request metrics
    this.register(new Counter(
      'http_requests_total',
      'Total number of HTTP requests',
      ['method', 'path', 'status']
    ));

    this.register(new Histogram(
      'http_request_duration_seconds',
      'HTTP request duration in seconds'
    ));

    // System metrics
    this.register(new Gauge(
      'nodejs_heap_size_bytes',
      'Node.js heap size in bytes'
    ));

    this.register(new Gauge(
      'active_connections',
      'Number of active connections'
    ));

    // AI metrics
    this.register(new Counter(
      'ai_requests_total',
      'Total AI API requests',
      ['agent', 'status']
    ));

    this.register(new Histogram(
      'ai_response_time_seconds',
      'AI response time in seconds'
    ));

    this.register(new Counter(
      'ai_tokens_total',
      'Total AI tokens used',
      ['agent', 'type']
    ));
  }

  register(metric) {
    this.metrics.set(metric.name, metric);
    return metric;
  }

  get(name) {
    return this.metrics.get(name);
  }

  toPrometheus() {
    let output = '';
    for (const metric of this.metrics.values()) {
      output += metric.toPrometheus() + '\n';
    }
    return output;
  }

  // Update system metrics
  collectSystemMetrics() {
    const used = process.memoryUsage();
    this.get('nodejs_heap_size_bytes')?.set({}, used.heapUsed);
  }
}

/**
 * Express middleware for automatic metrics collection
 */
function metricsMiddleware(registry) {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      
      registry.get('http_requests_total')?.inc({
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode
      });

      registry.get('http_request_duration_seconds')?.observe(duration);
    });

    next();
  };
}

/**
 * Express middleware for tracing
 */
function tracingMiddleware(tracer) {
  return (req, res, next) => {
    const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`);
    
    span.setAttribute('http.method', req.method);
    span.setAttribute('http.url', req.url);
    span.setAttribute('http.user_agent', req.headers['user-agent'] || 'unknown');

    // Attach span to request
    req.span = span;

    res.on('finish', () => {
      span.setAttribute('http.status_code', res.statusCode);
      span.setStatus(res.statusCode < 400 ? 'OK' : 'ERROR');
      span.end();
    });

    next();
  };
}

/**
 * Prometheus metrics endpoint handler
 */
function metricsEndpoint(registry) {
  return (req, res) => {
    registry.collectSystemMetrics();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(registry.toPrometheus());
  };
}

/**
 * Traces endpoint handler (for debugging)
 */
function tracesEndpoint(req, res) {
  const limit = parseInt(req.query.limit) || 100;
  res.json({
    active: Array.from(traces.active.values()).map(s => s.toJSON()),
    recent: traces.completed.slice(-limit)
  });
}

// Create singleton instances
const registry = new MetricsRegistry();
const tracer = new Tracer('gaing-brain');

// Export everything
module.exports = {
  Counter,
  Gauge,
  Histogram,
  Span,
  Tracer,
  MetricsRegistry,
  metricsMiddleware,
  tracingMiddleware,
  metricsEndpoint,
  tracesEndpoint,
  registry,
  tracer,
  traces
};
