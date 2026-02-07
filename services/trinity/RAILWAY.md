# 🚂 OMEGA-Trinity Deployment Guide (Railway)

This guide explains how the OMEGA-Trinity system is deployed to Railway.

## 🚀 Quick Start

To deploy everything (Brain, Bridge, HUD) or update environment variables:

```powershell
.\deploy-omega.ps1
```

This script will automatically:

1. **Login** (if needed)
2. **Link** to the `OMEGA-Trinity` project
3. **Sync** all secrets from `.env` files (Brain, Bridge, HUD)
4. **Deploy** the codebase

## 🏗 Architecture

The project is a Monorepo. When deployed via `railway up`, it uploads the entire root.

### Services

Railway should automatically detect the services based on `package.json` or you can configure them in the Dashboard.

- **HUD**: `packages/hud` (Next.js)
- **Brain**: `packages/brain` (Node.js)
- **Bridge**: `packages/bridge` (FastAPI/Python)

## 🔄 GitHub Integration

To enable **Continuous Deployment** (Auto-deploy on git push):

1. Run `.\deploy-omega.ps1` to create the project.
2. The script will open the Railway Dashboard.
3. Go to **Settings** > **Git**.
4. Connect `Mega-Therion/OMEGA-Trinity`.

## 🔑 Environment Variables

The script automatically syncs variables from:

- `packages/brain/.env`
- `packages/bridge/.env`
- `packages/hud/.env.local`

**Note:** Never commit these `.env` files to GitHub!
