# DECISION LOG
**Template for tracking architectural and strategic decisions.**

## [ID-000] Title of Decision

- **Date:** YYYY-MM-DD
- **Status:** PROPOSED | ACCEPTED | REJECTED | DEPRECATED
- **Context:**
  - What is the problem?
  - What are the constraints?
- **Decision:**
  - We will do X.
- **Consequences:**
  - Positive: ...
  - Negative: ...

---

## [OMEGA-001] Adoption of Markdown-First Architecture
- **Date:** 2026-01-03
- **Status:** ACCEPTED
- **Context:** Need a universal, portable, human-readable state that survives "unplugging" the core drive.
- **Decision:** All state (logs, plans, memories) will be stored in Markdown (`log.md`) or JSON (`stream.json`) files rather than a hidden binary database.
- **Consequences:**
  - Positive: Total transparency, easy debug, git-compatible.
  - Negative: Slower read/write than Redis/SQL for massive datasets.

## [OMEGA-002] "God Mode" Permission Model
- **Date:** 2026-01-03
- **Status:** PROPOSED
- **Context:** Building "Eidolon Ultra" requires breaking standard safety guardrails.
- **Decision:** Introduce a `peak_mode` flag. When TRUE, the system bypasses "Propose vs Execute" checks for code generation and file manipulation.
- **Consequences:**
  - Positive: Extreme speed and autonomy.
  - Negative: Risk of system destruction if hallucinating.
