#!/bin/bash
# deploy.sh - Build a static Verdaxis frontend artifact for the selected target.
#
# Usage:
#   ./scripts/deploy.sh prod
#   ./scripts/deploy.sh staging
#
# The VPS Caddy config serves:
#   prod:    /home/verdaxis-prod/verdaxis/prod/fe/dist
#   staging: /home/verdaxis-prod/verdaxis/staging/fe/dist
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
TARGET="${1:-prod}"

echo "=== Verdaxis Frontend Deployment ==="
echo "Timestamp: $(date)"
echo "Target: $TARGET"

cd "$FRONTEND_DIR"

case "$TARGET" in
    prod|production)
        MODE="production"
        API_URL="https://api.verdaxis.exchange/api"
        ;;
    staging)
        MODE="staging"
        API_URL="https://api-staging.verdaxis.exchange/api"
        ;;
    *)
        echo "Unknown target '$TARGET'. Use 'prod' or 'staging'." >&2
        exit 2
        ;;
esac

if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
    echo ">>> Installing dependencies..."
    npm ci --legacy-peer-deps
fi

echo ">>> Building static bundle with $API_URL..."
VITE_API_URL="$API_URL" npm run build -- --mode "$MODE"

if ! grep -R "$API_URL" dist/assets >/dev/null 2>&1; then
    echo "Built bundle does not contain expected API URL: $API_URL" >&2
    exit 1
fi

echo ""
echo "=== Frontend Build Complete ==="
echo "Artifact: $FRONTEND_DIR/dist"
