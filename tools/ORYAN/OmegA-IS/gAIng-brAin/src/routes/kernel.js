const express = require("express");

function createKernelRouter(kernel) {
  const router = express.Router();

  router.get("/snapshot", (req, res) => {
    res.json(kernel.snapshot());
  });

  router.post("/signal", express.json(), (req, res) => {
    const { type, severity, payload, source } = req.body ?? {};
    const id = kernel.ingestSignal({ type, severity, payload, source });
    res.json({ ok: true, id });
  });

  router.post("/mode", express.json(), (req, res) => {
    const { mode } = req.body ?? {};
    kernel.setMode(mode);
    res.json({ ok: true, mode: kernel.snapshot().state.mode });
  });

  router.post("/goals", express.json(), (req, res) => {
    const { goals } = req.body ?? {};
    kernel.setGoals(goals);
    res.json({ ok: true, goals: kernel.snapshot().state.goals });
  });

  return router;
}

module.exports = { createKernelRouter };
