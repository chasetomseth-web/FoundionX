#!/bin/bash
# ============================================================
# MerchantOS — Production Rollback Script
# Usage: ./scripts/rollback.sh [previous-image-tag]
# ============================================================

set -euo pipefail

DEPLOY_DIR="/opt/merchantos"
TAG_FILE="$DEPLOY_DIR/.current-tag"
PREV_TAG_FILE="$DEPLOY_DIR/.previous-tag"
LOG_FILE="$DEPLOY_DIR/logs/rollback.log" mkdir -p"$DEPLOY_DIR/logs"

log() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $1" | tee -a "$LOG_FILE"
}

log "=== MerchantOS Rollback Initiated ==="

# Determine rollback target
if [ -n "${1:-}" ]; then
  ROLLBACK_TAG="$1" log"Rolling back to specified tag: $ROLLBACK_TAG"
elif [ -f "$PREV_TAG_FILE" ]; then
  ROLLBACK_TAG=$(cat "$PREV_TAG_FILE")
  log "Rolling back to previous tag: $ROLLBACK_TAG"
else
  log "ERROR: No previous tag found and no tag specified"
  exit 1
fi

cd "$DEPLOY_DIR"

# Save current tag as previous before rollback
if [ -f "$TAG_FILE" ]; then
  cp "$TAG_FILE" "$PREV_TAG_FILE"
fi

# Set rollback image tag
export IMAGE_TAG="$ROLLBACK_TAG" log"Pulling rollback images (tag: $ROLLBACK_TAG)..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull frontend worker

log "Deploying rollback frontend..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d \
  --no-deps --scale frontend=2 frontend

# Health check
log "Running health check..."
for i in 1 2 3 4 5; do
  sleep 10
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    log "Health check passed after rollback ✓"
    break
  fi
  if [ $i -eq 5 ]; then
    log "CRITICAL: Health check failed after rollback — manual intervention required"
    exit 1
  fi
  log "Health check attempt $i failed, retrying..."
done

log "Deploying rollback workers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d \
  --no-deps worker

echo "$ROLLBACK_TAG" > "$TAG_FILE" log"Rollback complete. Running tag: $ROLLBACK_TAG" log"=== Rollback Finished ==="
