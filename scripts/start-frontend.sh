#!/bin/bash
# start-frontend.sh - Local development helper only.
#
# Production and staging are static Vite builds served by Caddy. Use
# scripts/deploy.sh to build artifacts for those environments.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Starting Verdaxis Frontend ==="
echo "Timestamp: $(date)"

cd "$FRONTEND_DIR"

# Install dependencies if node_modules is missing or package.json changed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo ">>> Installing dependencies..."
    npm install
fi

echo ">>> Starting Vite dev server on 0.0.0.0:5173..."
echo ">>> API target comes from .env or defaults in src/services/config.ts."
nohup npm run dev -- --host 0.0.0.0 --port 5173 > frontend.log 2>&1 &

# Wait and check if it started
sleep 3
if pgrep -f "vite" > /dev/null; then
    echo "✓ Frontend started successfully!"
    echo "  URL: http://144.126.151.136:5173/"
    echo "  Logs: $FRONTEND_DIR/frontend.log"
else
    echo "✗ Frontend failed to start. Check frontend.log for details."
    tail -20 frontend.log
    exit 1
fi

echo ""
echo "=== Frontend Started ==="
