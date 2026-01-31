#!/usr/bin/env bash
set -euo pipefail

OUT="$HOME/.omega_network_nodes.json"
HOME_NODE="${OMEGA_HOME_NODE:-ARK}"
NET_PATH="${OMEGA_NET_PATH:-}"
PING_TARGETS="${OMEGA_NET_PING_TARGETS:-}"

# Known node codes with lat/lon
NODES_JSON='[
  {"name":"ARK","lat":34.7465,"lon":-92.2896},
  {"name":"SFO","lat":37.7749,"lon":-122.4194},
  {"name":"LAX","lat":34.0522,"lon":-118.2437},
  {"name":"NYC","lat":40.7128,"lon":-74.0060},
  {"name":"CHI","lat":41.8781,"lon":-87.6298},
  {"name":"LON","lat":51.5074,"lon":-0.1278},
  {"name":"PAR","lat":48.8566,"lon":2.3522},
  {"name":"AMS","lat":52.3676,"lon":4.9041},
  {"name":"FRA","lat":50.1109,"lon":8.6821},
  {"name":"ZRH","lat":47.3769,"lon":8.5417},
  {"name":"DXB","lat":25.2048,"lon":55.2708},
  {"name":"SIN","lat":1.3521,"lon":103.8198},
  {"name":"TKY","lat":35.6895,"lon":139.6917},
  {"name":"SYD","lat":-33.8688,"lon":151.2093},
  {"name":"SAO","lat":-23.5505,"lon":-46.6333}
]'

# Map ProtonVPN status to a node code
VPN_NODE=""
if command -v protonvpn >/dev/null 2>&1; then
  STATUS=$(protonvpn info 2>/dev/null || true)
else
  STATUS=""
fi

if echo "$STATUS" | grep -qi "Connected"; then
  # crude mapping by country/city keywords
  if echo "$STATUS" | grep -qi "Switzerland\|Zurich\|CH"; then VPN_NODE="ZRH"; fi
  if echo "$STATUS" | grep -qi "Singapore\|SG"; then VPN_NODE="SIN"; fi
  if echo "$STATUS" | grep -qi "Japan\|Tokyo\|JP"; then VPN_NODE="TKY"; fi
  if echo "$STATUS" | grep -qi "United States\|USA\|US"; then VPN_NODE="NYC"; fi
  if echo "$STATUS" | grep -qi "United Kingdom\|London\|UK"; then VPN_NODE="LON"; fi
fi

# Build links from OMEGA_NET_PATH if provided (e.g. ARK->ZRH->SIN)
LINKS=()
if [[ -n "$NET_PATH" ]]; then
  IFS='->' read -ra PARTS <<< "$NET_PATH"
  PREV=""
  for P in "${PARTS[@]}"; do
    CODE=$(echo "$P" | tr -d ' ' | tr '[:lower:]' '[:upper:]')
    if [[ -n "$PREV" && -n "$CODE" ]]; then
      LINKS+=("{\"from\":\"$PREV\",\"to\":\"$CODE\",\"label\":\"PATH\"}")
    fi
    PREV="$CODE"
  done
fi

# Add VPN link if detected
if [[ -n "$VPN_NODE" ]]; then
  LINKS+=("{\"from\":\"$HOME_NODE\",\"to\":\"$VPN_NODE\",\"label\":\"VPN\"}")
fi

# Ping targets optionally: format OMEGA_NET_PING_TARGETS="ZRH=ch-03.protonvpn.net,SIN=sg-07.protonvpn.net"
if [[ -n "$PING_TARGETS" ]]; then
  IFS=',' read -ra TARGETS <<< "$PING_TARGETS"
  for T in "${TARGETS[@]}"; do
    CODE=${T%%=*}
    HOST=${T#*=}
    if [[ -n "$CODE" && -n "$HOST" ]]; then
      LAT=$(ping -c 1 -W 1 "$HOST" 2>/dev/null | awk -F'/' 'END{print $5}')
      if [[ -n "$LAT" ]]; then
        LINKS+=("{\"from\":\"$HOME_NODE\",\"to\":\"$CODE\",\"label\":\"PING\",\"latency_ms\":$LAT}")
      fi
    fi
  done
fi

# Deduplicate links
UNIQ_LINKS=$(printf '%s\n' "${LINKS[@]}" | awk '!seen[$0]++')

cat > "$OUT" <<EOFJSON
{
  "nodes": $NODES_JSON,
  "links": [
    $(printf '%s' "$UNIQ_LINKS" | paste -sd, -)
  ]
}
EOFJSON

echo "Wrote $OUT"
