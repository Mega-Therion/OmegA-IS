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
  {"name":"SAO","lat":-23.5505,"lon":-46.6333},
  {"name":"HKG","lat":22.3193,"lon":114.1694},
  {"name":"BOM","lat":19.0760,"lon":72.8777},
  {"name":"JNB","lat":-26.2041,"lon":28.0473}
]'

# Map ProtonVPN status to a node code
VPN_NODE=""
if command -v protonvpn >/dev/null 2>&1; then
  STATUS=$(protonvpn info 2>/dev/null || true)
else
  STATUS=""
fi

# Detect VPN or local network base
if echo "$STATUS" | grep -qi "Connected"; then
  if echo "$STATUS" | grep -qi "Switzerland\|Zurich\|CH"; then VPN_NODE="ZRH"; fi
  if echo "$STATUS" | grep -qi "Singapore\|SG"; then VPN_NODE="SIN"; fi
  if echo "$STATUS" | grep -qi "Japan\|Tokyo\|JP"; then VPN_NODE="TKY"; fi
  if echo "$STATUS" | grep -qi "United States\|USA\|US"; then VPN_NODE="NYC"; fi
  if echo "$STATUS" | grep -qi "United Kingdom\|London\|UK"; then VPN_NODE="LON"; fi
fi

# Build links
LINKS=()

# Always add core "Spine" paths for the visual effect
LINKS+=("{\"from\":\"ARK\",\"to\":\"NYC\",\"label\":\"BACKBONE\"}")
LINKS+=("{\"from\":\"NYC\",\"to\":\"LON\",\"label\":\"TRANS-ATL\"}")
LINKS+=("{\"from\":\"LON\",\"to\":\"ZRH\",\"label\":\"EURO-NET\"}")
LINKS+=("{\"from\":\"SFO\",\"to\":\"TKY\",\"label\":\"TRANS-PAC\"}")
LINKS+=("{\"from\":\"TKY\",\"to\":\"SIN\",\"label\":\"ASIA-HUB\"}")
LINKS+=("{\"from\":\"SIN\",\"to\":\"SYD\",\"label\":\"OCEANIA\"}")

# Add VPN link if detected
if [[ -n "$VPN_NODE" ]]; then
  LINKS+=("{\"from\":\"$HOME_NODE\",\"to\":\"$VPN_NODE\",\"label\":\"Sovereign-Tunnel\",\"latency_ms\":42}")
fi

# Auto-ping some global hubs to get real colors on the map
for HUB in "NYC=1.1.1.1" "LON=google.co.uk" "SIN=google.com.sg" "ZRH=google.ch"; do
  CODE=${HUB%%=*}
  HOST=${HUB#*=}
  LAT=$(ping -c 1 -W 1 "$HOST" 2>/dev/null | awk -F'/' 'END{print $5}')
  if [[ -n "$LAT" ]]; then
    LINKS+=("{\"from\":\"$HOME_NODE\",\"to\":\"$CODE\",\"label\":\"latency\",\"latency_ms\":$LAT}")
  fi
done

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
