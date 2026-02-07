"use strict";

// Resonance middleware skeleton for basic header validation.
function resonanceMiddleware(req, res, next) {
  const required = [
    "x-resonance-authority",
    "x-resonance-consent",
    "x-resonance-trace",
  ];
  const headers = (req && req.headers) || {};
  const missing = required.filter((header) => !headers[header]);

  if (missing.length > 0) {
    if (res && typeof res.status === "function") {
      return res
        .status(400)
        .json({ error: "missing_resonance_headers", missing });
    }

    const err = new Error(
      "Missing Resonance headers: " + missing.join(", ")
    );
    err.statusCode = 400;
    if (typeof next === "function") {
      return next(err);
    }
    return undefined;
  }

  // Attach basic audit metadata for downstream handlers.
  req.resonance = {
    authority: headers["x-resonance-authority"],
    consent: headers["x-resonance-consent"],
    trace: headers["x-resonance-trace"],
  };

  if (typeof next === "function") {
    return next();
  }
  return undefined;
}

module.exports = {
  resonanceMiddleware,
};
