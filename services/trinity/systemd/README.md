# OMEGA systemd

This folder contains systemd units for the OMEGA Trinity stack and a global summary timer.

## Install

```bash
sudo mkdir -p /var/log/omega /var/lib/omega
sudo cp /home/mega/NEXUS/repos/OMEGA-Trinity/systemd/omega-*.service /etc/systemd/system/
sudo cp /home/mega/NEXUS/repos/OMEGA-Trinity/systemd/omega-summary.timer /etc/systemd/system/
sudo systemctl daemon-reload

sudo systemctl enable --now omega-gateway.service
sudo systemctl enable --now omega-bridge.service
sudo systemctl enable --now omega-brain.service
sudo systemctl enable --now omega-jarvis.service
sudo systemctl enable --now omega-summary.timer
```

## Status

```bash
systemctl status omega-gateway.service omega-bridge.service omega-brain.service omega-jarvis.service
systemctl status omega-summary.timer
```

## Summary Output

- `/var/lib/omega/last_summary.md`

## Cleanup

```bash
/home/mega/NEXUS/repos/OMEGA-Trinity/scripts/agent-bridge.sh cleanup
```
