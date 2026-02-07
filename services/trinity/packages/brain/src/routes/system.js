/**
 * 📊 System Routes
 *
 * API endpoints for observability, health checks, and system management.
 */

const express = require("express");
const router = express.Router();

// Import services (with graceful fallback)
let observability, selfHealing, orchestrator, plugins, streaming, bridgeClient;

try {
  observability = require("../services/observability");
} catch (e) {
  observability = null;
}
try {
  selfHealing = require("../services/self-healing");
} catch (e) {
  selfHealing = null;
}
try {
  orchestrator = require("../services/orchestrator");
} catch (e) {
  orchestrator = null;
}
try {
  plugins = require("../services/plugins");
} catch (e) {
  plugins = null;
}
try {
  streaming = require("../services/streaming");
} catch (e) {
  streaming = null;
}
try {
  bridgeClient = require("../services/bridge-client");
} catch (e) {
  bridgeClient = null;
}

/**
 * GET /health
 * Basic health check (Kubernetes-style)
 */
router.get("/health", async (req, res) => {
  const health = {
    status: "healthy",
    service: "brain",
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(health);
});

/**
 * GET /ready
 * Readiness probe - checks if service is ready to serve traffic
 */
router.get("/ready", async (req, res) => {
  const ready = {
    ready: true,
    status: "ready",
    service: "brain",
    timestamp: new Date().toISOString(),
  };

  // TODO: Add dependency checks (database, cache, etc.)
  // For now, simple check that service is up

  res.status(200).json(ready);
});

/**
 * GET /live
 * Liveness probe - checks if service is alive
 */
router.get("/live", async (req, res) => {
  res.status(200).json({
    alive: true,
    status: "alive",
    service: "brain",
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /system/health
 * Detailed health check
 */
router.get("/system/health", async (req, res) => {
  const health = {
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || "1.0.0",
  };

  // Check watchdog status if available
  if (selfHealing?.watchdog) {
    health.services = selfHealing.watchdog.getStatus();
  }

  // Check for any issues
  if (health.memory.heapUsed > health.memory.heapTotal * 0.9) {
    health.status = "degraded";
    health.warnings = ["High memory usage"];
  }

  res.json(health);
});

/**
 * GET /system/omega
 * OMEGA Trinity unified health check - checks all three services
 */
router.get("/omega", async (req, res) => {
  const omegaStatus = {
    ok: true,
    service: "omega-trinity",
    timestamp: new Date().toISOString(),
    components: {
      brain: {
        status: "healthy",
        port: process.env.PORT || 8080,
        uptime: process.uptime(),
      },
      bridge: {
        status: "unknown",
        port: 8000,
        url: bridgeClient?.BRIDGE_URL || "http://localhost:8000",
      },
      hud: {
        status: "unknown",
        port: 3000,
        url: process.env.HUD_URL || "http://localhost:3000",
      },
    },
  };

  // Check Bridge health
  if (bridgeClient) {
    try {
      const bridgeHealth = await bridgeClient.getHealth();
      omegaStatus.components.bridge.status = "healthy";
      omegaStatus.components.bridge.details = bridgeHealth.components || {};
    } catch (err) {
      omegaStatus.components.bridge.status = "unavailable";
      omegaStatus.components.bridge.error = err.message;
      omegaStatus.ok = false;
    }
  }

  // Check HUD health (simple fetch)
  try {
    const hudUrl = process.env.HUD_URL || "http://localhost:3000";
    const hudResponse = await fetch(`${hudUrl}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (hudResponse.ok) {
      omegaStatus.components.hud.status = "healthy";
    } else {
      omegaStatus.components.hud.status = "degraded";
    }
  } catch (err) {
    omegaStatus.components.hud.status = "unavailable";
    // Don't fail the whole check for HUD - it's optional
  }

  // Set HTTP status based on overall health
  const httpStatus = omegaStatus.ok ? 200 : 503;
  res.status(httpStatus).json(omegaStatus);
});

/**
 * GET /system/metrics
 * Prometheus-compatible metrics endpoint
 */
router.get("/metrics", (req, res) => {
  if (!observability?.registry) {
    return res.status(503).send("# Metrics not available\n");
  }

  observability.registry.collectSystemMetrics();
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(observability.registry.toPrometheus());
});

/**
 * GET /system/traces
 * View recent traces
 */
router.get("/traces", (req, res) => {
  if (!observability) {
    return res.status(503).json({ error: "Tracing not available" });
  }

  const limit = parseInt(req.query.limit) || 100;

  res.json({
    active: Array.from(observability.traces.active.values()).map(s =>
      s.toJSON()
    ),
    recent: observability.traces.completed.slice(-limit),
  });
});

/**
 * GET /system/errors
 * View error telemetry
 */
router.get("/errors", (req, res) => {
  if (!selfHealing?.telemetry) {
    return res.status(503).json({ error: "Error telemetry not available" });
  }

  res.json(selfHealing.telemetry.getSummary());
});

/**
 * GET /system/circuits
 * View circuit breaker states
 */
router.get("/circuits", (req, res) => {
  if (!selfHealing?.watchdog) {
    return res.status(503).json({ error: "Circuit breakers not available" });
  }

  res.json(selfHealing.watchdog.getStatus());
});

/**
 * POST /system/watchdog/register
 * Register a service for health monitoring
 */
router.post("/watchdog/register", (req, res) => {
  if (!selfHealing?.watchdog) {
    return res.status(503).json({ error: "Watchdog not available" });
  }

  const { name, url, method, timeout, expectedStatus } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: "name and url required" });
  }

  selfHealing.watchdog.register(name, {
    url,
    method: method || "GET",
    timeout: timeout || 5000,
    expectedStatus: expectedStatus || 200,
  });

  res.json({ success: true, registered: name });
});

/**
 * POST /system/watchdog/start
 * Start the health watchdog
 */
router.post("/watchdog/start", (req, res) => {
  if (!selfHealing?.watchdog) {
    return res.status(503).json({ error: "Watchdog not available" });
  }

  selfHealing.watchdog.start();
  res.json({ success: true, message: "Watchdog started" });
});

/**
 * POST /system/watchdog/stop
 * Stop the health watchdog
 */
router.post("/watchdog/stop", (req, res) => {
  if (!selfHealing?.watchdog) {
    return res.status(503).json({ error: "Watchdog not available" });
  }

  selfHealing.watchdog.stop();
  res.json({ success: true, message: "Watchdog stopped" });
});

/**
 * GET /system/plugins
 * List all plugins
 */
router.get("/plugins", (req, res) => {
  if (!plugins) {
    return res.json({ plugins: [], available: false });
  }

  // Create manager if needed
  if (!global.pluginManager) {
    global.pluginManager = new plugins.PluginManager();
  }

  res.json({
    plugins: global.pluginManager.listPlugins(),
    available: true,
  });
});

/**
 * POST /system/plugins/load
 * Load a plugin
 */
router.post("/plugins/load", async (req, res) => {
  if (!plugins || !global.pluginManager) {
    return res.status(503).json({ error: "Plugin system not available" });
  }

  const { pluginId } = req.body;

  if (!pluginId) {
    return res.status(400).json({ error: "pluginId required" });
  }

  const manifests = await global.pluginManager.discoverPlugins();
  const manifest = manifests.find(m => m.id === pluginId);

  if (!manifest) {
    return res.status(404).json({ error: "Plugin not found" });
  }

  const success = await global.pluginManager.loadPlugin(manifest);

  res.json({ success, pluginId });
});

/**
 * POST /system/plugins/unload
 * Unload a plugin
 */
router.post("/plugins/unload", async (req, res) => {
  if (!plugins || !global.pluginManager) {
    return res.status(503).json({ error: "Plugin system not available" });
  }

  const { pluginId } = req.body;
  const success = await global.pluginManager.unloadPlugin(pluginId);

  res.json({ success, pluginId });
});

/**
 * POST /system/plugins/reload
 * Hot reload a plugin
 */
router.post("/plugins/reload", async (req, res) => {
  if (!plugins || !global.pluginManager) {
    return res.status(503).json({ error: "Plugin system not available" });
  }

  const { pluginId } = req.body;
  const success = await global.pluginManager.reloadPlugin(pluginId);

  res.json({ success, pluginId, hotReloaded: true });
});

/**
 * GET /system/orchestrator/sessions
 * List orchestration sessions
 */
router.get("/orchestrator/sessions", (req, res) => {
  if (!orchestrator || !global.orchestrator) {
    return res.json({ sessions: [], available: false });
  }

  res.json({
    sessions: global.orchestrator.getAllSessions().map(s => ({
      id: s.id,
      strategy: s.strategy,
      status: s.status,
      taskCount: s.tasks.length,
    })),
    available: true,
  });
});

/**
 * POST /system/orchestrator/execute
 * Execute a multi-agent task
 */
router.post("/orchestrator/execute", async (req, res) => {
  if (!orchestrator) {
    return res.status(503).json({ error: "Orchestrator not available" });
  }

  // Create orchestrator if needed
  if (!global.orchestrator) {
    global.orchestrator = new orchestrator.MultiAgentOrchestrator();
  }

  const { prompt, strategy, context } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "prompt required" });
  }

  try {
    const result = await global.orchestrator.execute(
      prompt,
      strategy || orchestrator.STRATEGIES.SPECIALIST,
      { context }
    );

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /system/stream/test
 * Test SSE streaming
 */
router.get("/stream/test", (req, res) => {
  if (!streaming) {
    return res.status(503).json({ error: "Streaming not available" });
  }

  const sse = new streaming.SSEResponse(res);

  let count = 0;
  const interval = setInterval(() => {
    if (count >= 10 || !sse.isOpen) {
      clearInterval(interval);
      sse.done({ message: "Stream complete", total: count });
      return;
    }

    sse.send("message", { count: ++count, time: new Date().toISOString() });
  }, 500);
});

module.exports = router;
