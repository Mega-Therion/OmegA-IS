# 🚀 gAIng-Brain Deployment Guide

Complete guide for deploying gAIng-Brain and its components to production.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
4. [Environment Configuration](#environment-configuration)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Start the server
npm start

# In another terminal, start the frontend
cd frontend && npm run dev

# Or start Jarvis
cd Jarvis && npm run dev
```

### Docker (Recommended for Production)
```bash
# Build and run with Docker Compose
docker-compose up -d

# With full stack (includes Jarvis)
docker-compose --profile full up -d

# With monitoring (Prometheus + Grafana)
docker-compose --profile monitoring up -d
```

---

## Prerequisites

### Required
- **Node.js** 20+ (LTS)
- **npm** 9+
- **Docker** 24+ (for containerized deployment)
- **Docker Compose** v2+

### Optional (for full features)
- **Supabase** account (database)
- **OpenAI/Grok API** key (LLM features)
- **Mem0** API key (memory persistence)
- **Ngrok** account (public tunneling)

---

## Deployment Options

### Option 1: Docker Compose (Recommended)

Best for: VPS, dedicated servers, self-hosted environments.

```bash
# Clone the repository
git clone https://github.com/gAIng-Collective/gAIng-Brain.git
cd gAIng-Brain

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f brain
```

**Services included:**
| Service | Port | Description |
|---------|------|-------------|
| brain | 8080 | Main API server |
| redis | 6379 | Session cache |
| jarvis | 3001* | Optional: JARVIS UI |
| nginx | 80/443* | Optional: Reverse proxy |

*Requires profile activation

### Option 2: PM2 (Process Manager)

Best for: Traditional server deployments, systemd environments.

```bash
# Install PM2 globally
npm install -g pm2

# Start production services
pm2 start ecosystem.config.js --env production

# Enable startup on boot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### Option 3: Platform Deployment

#### Render / Railway / Fly.io
```bash
# These platforms auto-detect the Dockerfile
# Just push to your connected repo
git push origin main
```

#### Vercel (Jarvis only)
```bash
cd Jarvis
vercel --prod
```

---

## Environment Configuration

### Required Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM Provider (at least one)
OPENAI_API_KEY=sk-your-key
# OR
GROK_API_KEY=your-grok-key
```

### Optional Variables

```env
# Server
PORT=8080
NODE_ENV=production

# Memory
MEM0_API_KEY=your-mem0-key

# Tunneling
ENABLE_NGROK=0
NGROK_AUTHTOKEN=your-token

# Redis (Docker sets automatically)
REDIS_URL=redis://localhost:6379
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# API health
curl http://localhost:8080/health

# Database health
npm run health:db

# Full system check
npm run omega:doctor
```

### Log Management

```bash
# View logs
docker-compose logs -f brain

# PM2 logs
pm2 logs gaing-brain

# Rotate logs
npm run rotate-logs
```

### Backup

```bash
# Backup data volumes
docker run --rm -v gaing-brain_brain-data:/data -v $(pwd):/backup alpine tar czf /backup/brain-data-backup.tar.gz /data

# Backup database (if using local SQLite)
cp vector_store.db vector_store.db.backup
```

### Updates

```bash
# Pull latest
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process
lsof -i :8080
# Kill it
kill -9 <PID>
```

**Docker permission denied:**
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

**Memory issues:**
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm start

# Or in Docker
docker-compose run -e DEBUG=* brain
```

### Get Help

- Check `log.md` for session history
- Run `npm run omega:doctor` for diagnostics
- Open an issue on GitHub

---

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL/TLS certificates in place
- [ ] Firewall rules configured
- [ ] Database backups automated
- [ ] Monitoring dashboards set up
- [ ] Log rotation configured
- [ ] Rate limiting enabled
- [ ] Health checks passing

---

*Built by the gAIng Collective* 🧠
