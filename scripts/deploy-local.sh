#!/usr/bin/env bash
# deploy-local.sh — Docker Desktop Kubernetes'e Helm ile deploy eder.
#
# Ön koşullar:
#   1. Docker Desktop → Settings → Kubernetes → "Enable Kubernetes" ✓
#   2. kubectl context = docker-desktop  (otomatik kurulur)
#   3. helm >= 3.x kurulu  (brew install helm)
#   4. ./scripts/build-images.sh çalıştırılmış olmalı
#
# Kullanım:
#   ./scripts/deploy-local.sh              # install/upgrade
#   ./scripts/deploy-local.sh --uninstall  # kaldır

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHART="${REPO_ROOT}/helm/releasehub360"
RELEASE="releasehub360"
NAMESPACE="releasehub360"

# ─── Uninstall ────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--uninstall" ]]; then
  echo "==> Helm release kaldırılıyor…"
  helm uninstall "${RELEASE}" --namespace "${NAMESPACE}" 2>/dev/null || true
  kubectl delete namespace "${NAMESPACE}" 2>/dev/null || true
  echo "==> Kaldırıldı."
  exit 0
fi

# ─── Validate ─────────────────────────────────────────────────────────────────
if ! kubectl config current-context | grep -q "docker-desktop"; then
  echo "UYARI: Mevcut kubectl context '$(kubectl config current-context)'"
  echo "Docker Desktop Kubernetes için: kubectl config use-context docker-desktop"
  read -rp "Devam et? (y/N) " confirm
  [[ "${confirm}" =~ ^[Yy]$ ]] || exit 1
fi

# ─── Helm lint ────────────────────────────────────────────────────────────────
echo "==> Helm lint…"
helm lint "${CHART}" \
  -f "${CHART}/values.yaml" \
  -f "${CHART}/values-local.yaml"

# ─── Deploy ───────────────────────────────────────────────────────────────────
echo ""
echo "==> Helm upgrade --install '${RELEASE}' → namespace '${NAMESPACE}'…"
helm upgrade --install "${RELEASE}" "${CHART}" \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  -f "${CHART}/values.yaml" \
  -f "${CHART}/values-local.yaml" \
  --wait \
  --timeout 5m \
  --atomic

# ─── Status ───────────────────────────────────────────────────────────────────
echo ""
echo "==> Pod durumu:"
kubectl get pods -n "${NAMESPACE}"

echo ""
echo "==> Servisler (LoadBalancer = localhost erişimi):"
kubectl get svc -n "${NAMESPACE}"

echo ""
echo "==> Erişim adresleri:"
echo "   Frontend  : http://localhost"
echo "   n8n       : http://localhost:5678"
echo "   Backend   : kubectl port-forward svc/backend 3001:3001 -n ${NAMESPACE}"
echo "   MCP Server: kubectl port-forward svc/mcp-server 8083:8083 -n ${NAMESPACE}"
