#!/bin/bash
# start-frontend.sh - Start or restart the Vite dev server
# Run this on the VPS
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Starting Verdaxis Frontend ==="
echo "Timestamp: $(date)"

cd "$FRONTEND_DIR"

# Kill any existing vite processes
echo ">>> Stopping existing Vite processes..."
pkill -f "vite" || echo "No existing Vite process found"
sleep 1

# Install dependencies if node_modules is missing or package.json changed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo ">>> Installing dependencies..."
    npm install
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo ">>> Creating .env file..."
    cat > .env << 'EOF'
VITE_API_URL=http://144.126.151.136:8000
VITE_AUTHENTIK_URL=http://144.126.151.136:9000
VITE_AUTHENTIK_CLIENT_ID=verdaxis-client-id
EOF
fi

# Start the dev server in background
echo ">>> Starting Vite dev server on 0.0.0.0:5173..."
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
