#!/bin/bash
# deploy.sh - Server-side deployment script for Verdaxis Frontend
# Run this on the VPS to pull latest code and restart the frontend
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Verdaxis Frontend Deployment ==="
echo "Timestamp: $(date)"

cd "$FRONTEND_DIR"

# Pull latest code
echo ""
echo ">>> Pulling latest code from origin..."
git fetch origin
git checkout main
git pull origin main

# Run the start script
"$SCRIPT_DIR/start-frontend.sh"

echo ""
echo "=== Frontend Deployment Complete ==="
