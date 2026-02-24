# OmegA-IS (OmegA Intelligent System)

Canonical monorepo for the OmegA ecosystem. This repo consolidates all active work into a single, coherent tree under `OmegA-IS`.

## Repository Layout

```
OmegA-IS/
├── apps/           # User-facing applications
│   └── OmegA-UI/
├── services/       # Core services / backends
│   ├── OmegA-AI/
│   ├── trinity/    # Unified stack (Brain, Bridge, HUD, Public Chat)
│   └── gateway/    # Sovereign Gateway (WASM Filter)
├── tools/          # Tooling, utilities, prototypes
│   ├── OmegA-CL/
│   ├── ORYAN/
│   └── omega-skills/
├── research/       # Experimental and research projects
│   └── OmegA-NL/
├── legacy/         # Legacy or archived implementations
│   └── omega_rust/
├── docs/           # Documentation
└── scripts/        # Automation and maintenance scripts
```

## Quick Start

Most components have their own README files. Start with:

- `apps/OmegA-UI/README.md`
- `services/OmegA-AI/README.md`
- `services/trinity/README.md`

## Contributing

- Keep new work inside the appropriate top-level folder.
- Avoid creating new top-level roots.
- Update `WORKSPACE.md` if you add a new significant component.

## Notes

This repo is the canonical source of truth for OmegA. Legacy or duplicate copies should not be used.
