#!/usr/bin/env bash
# build-images.sh — Tüm servislerin Docker image'larını local tag ile build eder.
# Kullanım: ./scripts/build-images.sh [TAG]
# Varsayılan TAG: local
#
# Docker Desktop Kubernetes'i kullandığı için registry'e push gerekmez —
# image'lar doğrudan local Docker daemon'dan okunur.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="${1:-local}"

echo "==> Building images with tag: ${TAG}"

# ─── Frontend ─────────────────────────────────────────────────────────────────
echo ""
echo "── frontend ──────────────────────────────────────────"
docker build \
  --tag "releasehub360/frontend:${TAG}" \
  --file "${REPO_ROOT}/packages/frontend/Dockerfile" \
  "${REPO_ROOT}/packages/frontend"

# ─── Backend ──────────────────────────────────────────────────────────────────
echo ""
echo "── backend ───────────────────────────────────────────"
docker build \
  --tag "releasehub360/backend:${TAG}" \
  --file "${REPO_ROOT}/packages/backend/Dockerfile" \
  "${REPO_ROOT}/packages/backend"

# ─── MCP Server ───────────────────────────────────────────────────────────────
echo ""
echo "── mcp-server ────────────────────────────────────────"
docker build \
  --tag "releasehub360/mcp-server:${TAG}" \
  --file "${REPO_ROOT}/packages/mcp-server/Dockerfile" \
  "${REPO_ROOT}/packages/mcp-server"

echo ""
echo "==> Tüm image'lar başarıyla build edildi:"
docker images | grep "releasehub360" | grep "${TAG}"
