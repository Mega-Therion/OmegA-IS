const EventEmitter = require("node:events");
const crypto = require("node:crypto");

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "evt") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

class ConsciousnessKernel extends EventEmitter {
  constructor({
    tickMs = 750,
    reflectionEveryTicks = 40,
    maxEventLog = 2000,
  } = {}) {
    super();
    this.config = { tickMs, reflectionEveryTicks, maxEventLog };

    this.state = {
      bootedAt: nowIso(),
      tick: 0,
      mode: "operational", // operational | degraded | safe
      focus: null,
      goals: [],
      constraints: [
        "Do not execute dangerous actions without explicit operator confirmation",
        "Prefer observability over autonomy when uncertain",
      ],
      signals: [],
      eventLog: [],
      metrics: {
        signalsSeen: 0,
        reflections: 0,
        focusShifts: 0,
      },
    };

    this._timer = null;
  }

  start() {
    if (this._timer) return;
    this._emit("kernel_started", { config: this.config });
    this._timer = setInterval(() => this._tick(), this.config.tickMs);
  }

  stop() {
    if (!this._timer) return;
    clearInterval(this._timer);
    this._timer = null;
    this._emit("kernel_stopped", {});
  }

  ingestSignal(signal) {
    const normalized = {
      id: makeId("sig"),
      ts: nowIso(),
      type: signal?.type ?? "unknown",
      severity: Number.isFinite(signal?.severity) ? signal.severity : 5,
      source: signal?.source ?? "system",
      payload: signal?.payload ?? null,
    };
    this.state.signals.push(normalized);
    this.state.metrics.signalsSeen += 1;
    this._emit("signal_ingested", normalized);
    return normalized.id;
  }

  setGoals(goals = []) {
    this.state.goals = Array.isArray(goals) ? goals.map(String) : [];
    this._emit("goals_set", { goals: this.state.goals });
  }

  setMode(mode) {
    if (!["operational", "degraded", "safe"].includes(mode)) return;
    if (this.state.mode !== mode) {
      this.state.mode = mode;
      this._emit("mode_changed", { mode });
    }
  }

  snapshot() {
    return JSON.parse(JSON.stringify({
      config: this.config,
      state: {
        ...this.state,
        signals: this.state.signals.slice(-50),
        eventLog: this.state.eventLog.slice(-200),
      },
    }));
  }

  _tick() {
    this.state.tick += 1;

    const nextFocus = this._selectAttention();
    if (nextFocus && (!this.state.focus || this.state.focus.id !== nextFocus.id)) {
      this.state.focus = nextFocus;
      this.state.metrics.focusShifts += 1;
      this._emit("focus_shifted", nextFocus);
    }

    if (this.state.focus?.severity >= 9) this.setMode("safe");
    else if (this.state.focus?.severity >= 7) this.setMode("degraded");
    else this.setMode("operational");

    if (this.state.tick % this.config.reflectionEveryTicks === 0) {
      const reflection = this._reflect();
      this.state.metrics.reflections += 1;
      this._emit("reflection", reflection);
    }

    this._emit("tick", { tick: this.state.tick, mode: this.state.mode });
  }

  _selectAttention() {
    const signals = this.state.signals;
    if (!signals.length) return null;

    const scored = signals.map((s, idx) => {
      const recency = 1 / (1 + (signals.length - 1 - idx));
      const novelty = s.type === "unknown" ? 0.8 : 0.3;
      const score = s.severity + (recency * 2.0) + novelty;
      return { ...s, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  _reflect() {
    const mode = this.state.mode;
    const focus = this.state.focus;

    const audit = {
      id: makeId("refl"),
      ts: nowIso(),
      mode,
      focus: focus ? { id: focus.id, type: focus.type, severity: focus.severity, source: focus.source } : null,
      invariants: [
        { name: "event_log_bounded", ok: this.state.eventLog.length <= this.config.maxEventLog },
        { name: "signals_bounded", ok: this.state.signals.length <= 5000 },
      ],
      recommendation: null,
    };

    if (mode === "safe") {
      audit.recommendation = "Operator action required: high-severity focus detected; halt automation and inspect logs.";
    } else if (mode === "degraded") {
      audit.recommendation = "Reduce concurrency; prioritize health checks; defer non-critical missions.";
    } else {
      audit.recommendation = "Continue normal operation; maintain telemetry.";
    }

    this._emit("audit_generated", audit);
    return audit;
  }

  _emit(type, payload) {
    const evt = { id: makeId("evt"), ts: nowIso(), type, payload };
    this.state.eventLog.push(evt);
    if (this.state.eventLog.length > this.config.maxEventLog) {
      this.state.eventLog.splice(0, this.state.eventLog.length - this.config.maxEventLog);
    }
    this.emit(type, evt);
  }
}

module.exports = { ConsciousnessKernel };
