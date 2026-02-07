# OmegA-SI Workspace

Canonical monorepo workspace for all OmegA systems.

## Paths

- Trinity: `services/trinity/`
- UI: `apps/OmegA-UI/`
- CLI: `tools/OmegA-CL/`
- ORYAN: `tools/ORYAN/`

## Common Commands

### Trinity

```bash
cd services/trinity
# start all services (if package scripts exist)
pnpm dev
```

### UI

```bash
cd apps/OmegA-UI
pnpm dev
```

### CLI

```bash
cd tools/OmegA-CL
python3 main.py
```

### ORYAN

```bash
cd tools/ORYAN
./oryan task list
```

## Notes

- `_sources/` contains consolidation manifests and reports.
