#!/bin/bash
export PATH=$HOME/opt/node20/bin:$PATH
export N8N_PORT=5678
export N8N_BASIC_AUTH_ACTIVE=true
export N8N_BASIC_AUTH_USER=omega
export N8N_BASIC_AUTH_PASSWORD=omega
export N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false

echo "Starting OMEGA n8n Server..."
echo "Address: http://localhost:5678"
echo "Username: omega"
echo "Password: omega"

npx n8n start
