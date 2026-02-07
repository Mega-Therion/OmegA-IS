# Omega Trinity - Production Deployment Guide

Welcome to the production version of Omega Trinity. This guide will help you get your personal superintelligence stack running 24/7.

## Quick Start (One Command)

Once you have set your environment variables, you can start everything with:

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Prerequisites

1.  **Docker & Docker Compose**: Ensure you have Docker installed.
2.  **Environment Variables**: See `ENV_GUIDE.md` for details.
3.  **Ports**: Ensure ports 80 (HTTP), 443 (HTTPS), and optional ports for monitoring (3001, 9090) are open if you want to access them.

## Accessing the Stack

-   **User Interface (Jarvis)**: `http://localhost` (via Nginx)
-   **Monitoring (Grafana)**: `http://localhost:3001` (User: `admin`, Pass: `admin` or what you set)
-   **API Gateway**: `http://localhost/api/gateway/`

## Operations

### Stopping the Stack
```bash
docker compose -f docker-compose.prod.yml down
```

### Viewing Logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Backups
A backup script is provided at `scripts/backup_volumes.sh`. You can schedule this via cron:
```bash
# Add this to your crontab (crontab -e)
0 2 * * * /home/mega/NEXUS/OmegA/OmegA-SI/services/trinity/scripts/backup_volumes.sh
```

## systemd Integration
To make Omega Trinity start automatically on boot:
1. Copy the service file: `sudo cp omega-trinity.service /etc/systemd/system/`
2. Enable it: `sudo systemctl enable omega-trinity`
3. Start it: `sudo systemctl start omega-trinity`

## Troubleshooting
-   Check `docker compose ps` to ensure all services are `healthy`.
-   Check individual service logs if a container is restarting.
-   Ensure your `.env` file has all required keys.
