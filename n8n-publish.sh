#!/usr/bin/env bash
# n8n-publish.sh — Workflow'u local n8n'e publish et + aktif et
# Kullanım: bash n8n-publish.sh n8n-workflows/dosya.json [--test] [--force]
#
# GÜVENLİK NOTLARI:
#   • Bu script asla DELETE çağrısı yapmaz. Yalnızca POST (yeni) veya PUT (güncelle).
#   • Güncelleme yapmadan önce onay ister. Onaysız geçmek için --force kullanın.
#   • Aktif/pasif durumu korunur — kasıtlı devre dışı iş akışları yeniden aktive edilmez.
#   • Aynı isimde birden fazla workflow varsa güvenlik için durur.

set -euo pipefail

FILE=${1:-}
TEST_MODE=""
FORCE=""
for arg in "${@:2}"; do
  case "$arg" in
    --test)  TEST_MODE="--test" ;;
    --force) FORCE="--force" ;;
  esac
done

# ─── Yardım ──────────────────────────────────────────────────────────────────
if [ -z "$FILE" ]; then
  echo "Kullanım: bash n8n-publish.sh n8n-workflows/dosya.json [--test] [--force]"
  echo ""
  echo "  --test   Publish sonrası webhook'a test isteği gönder"
  echo "  --force  Güncelleme onay sorusunu atla"
  echo ""
  echo "Mevcut workflow dosyaları:"
  ls n8n-workflows/*.json 2>/dev/null | sed 's/^/  /' || echo "  (yok)"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "❌ Dosya bulunamadı: $FILE"
  exit 1
fi

# ─── Config — .env arama sırası ──────────────────────────────────────────────
# 1. packages/backend/.env  (proje standartı: N8N_URL + N8N_AUTH_TOKEN)
# 2. .env (workspace root)  (N8N_BASE_URL + N8N_API_KEY)
ENV_FILE=""
if [ -f "packages/backend/.env" ]; then ENV_FILE="packages/backend/.env"; fi
if [ -f ".env" ] && [ -z "$ENV_FILE" ]; then ENV_FILE=".env"; fi

_read_env() { grep -s "^$1=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true; }

if [ -n "$ENV_FILE" ]; then
  # Backend .env standartı
  N8N_BASE_URL=$(_read_env N8N_URL)
  N8N_API_KEY=$(_read_env N8N_AUTH_TOKEN)
  # Root .env fallback
  [ -z "$N8N_BASE_URL" ] && N8N_BASE_URL=$(_read_env N8N_BASE_URL)
  [ -z "$N8N_API_KEY"  ] && N8N_API_KEY=$(_read_env N8N_API_KEY)
fi

N8N_BASE_URL=${N8N_BASE_URL:-http://localhost:5678}
N8N_BASE_URL="${N8N_BASE_URL%/}"  # trailing slash temizle

if [ -z "$N8N_API_KEY" ]; then
  echo "❌ n8n API key bulunamadı"
  echo ""
  echo "Adımlar:"
  echo "  1. $N8N_BASE_URL adresini aç"
  echo "  2. Settings → n8n API → Create an API key"
  echo "  3. packages/backend/.env dosyasına ekle:"
  echo "       N8N_AUTH_TOKEN=<api-key>"
  exit 1
fi

# ─── n8n ayakta mı? ──────────────────────────────────────────────────────────
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$N8N_BASE_URL/healthz" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ n8n'e ulaşılamıyor ($N8N_BASE_URL) — HTTP $HTTP_STATUS"
  exit 1
fi

# ─── Workflow adını al ───────────────────────────────────────────────────────
WF_NAME=$(python3 -c "import json; print(json.load(open('$FILE'))['name'])")
echo "📦 Workflow : $WF_NAME"
echo "📁 Dosya    : $FILE"
echo ""

# ─── Mevcut workflow var mı? (güvenli eşleşme) ───────────────────────────────
ALL_WORKFLOWS=$(curl -s \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_BASE_URL/api/v1/workflows?limit=250")

# Aynı isimde kaç workflow var?
MATCH_COUNT=$(echo "$ALL_WORKFLOWS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
name = '$WF_NAME'
matches = [w for w in data.get('data', []) if w['name'] == name]
print(len(matches))
" 2>/dev/null || echo "0")

if [ "$MATCH_COUNT" -gt 1 ]; then
  echo "🛑 GÜVENLİK DURDU: n8n'de '$WF_NAME' adında $MATCH_COUNT adet workflow var."
  echo ""
  echo "   Aynı isimde birden fazla workflow olduğunda hangi workflow'un"
  echo "   güncelleneceği belirsizdir. Lütfen n8n UI'dan fazlalıkları silin:"
  echo "   $N8N_BASE_URL"
  echo ""
  echo "   Sonra tekrar çalıştırın."
  exit 1
fi

EXISTING_ID=$(echo "$ALL_WORKFLOWS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
name = '$WF_NAME'
match = next((w for w in data.get('data', []) if w['name'] == name), None)
print(match['id'] if match else '')
" 2>/dev/null || true)

EXISTING_ACTIVE=$(echo "$ALL_WORKFLOWS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
name = '$WF_NAME'
match = next((w for w in data.get('data', []) if w['name'] == name), None)
print(str(match.get('active', False)).lower() if match else '')
" 2>/dev/null || true)

# n8n API'si POST/PUT sırasında bazı alanları read-only veya geçersiz kabul eder.
# Güvenli payload'u python ile oluştur.
_clean_payload() {
  python3 -c "
import json
wf = json.load(open('$FILE'))
# n8n API yalnızca bu top-level alanları POST/PUT'ta kabul eder
allowed_top = {'name', 'nodes', 'connections', 'settings', 'pinData', 'staticData'}
clean = {k: v for k, v in wf.items() if k in allowed_top}
# settings içinde de sadece izin verilen key'ler
allowed_settings = {'executionOrder', 'saveManualExecutions', 'saveExecutionProgress',
                    'saveDataSuccessExecution', 'saveDataErrorExecution',
                    'timezone', 'executionTimeout', 'maxExecutionTimeout'}
if 'settings' in clean:
    clean['settings'] = {k: v for k, v in clean['settings'].items()
                         if k in allowed_settings and v != ''}
print(json.dumps(clean))
"
}
if [ -n "$EXISTING_ID" ]; then
  echo "⚠️  Bu isimde mevcut bir workflow var:"
  echo "   ID     : $EXISTING_ID"
  echo "   Aktif  : $EXISTING_ACTIVE"
  echo "   İşlem  : PUT (üzerine yazılacak)"
  echo ""

  if [ -z "$FORCE" ]; then
    printf "   Devam etmek istiyor musunuz? [y/N] "
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
      echo ""
      echo "❌ İptal edildi. Hiçbir şey değiştirilmedi."
      exit 0
    fi
  else
    echo "   (--force ile onay atlandı)"
  fi

  echo ""
  echo "🔄 Mevcut workflow güncelleniyor (id: $EXISTING_ID)"
  RESULT=$(_clean_payload | curl -s -X PUT \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d @- \
    "$N8N_BASE_URL/api/v1/workflows/$EXISTING_ID")
  WF_ID=$EXISTING_ID
else
  echo "✨ Yeni workflow oluşturuluyor"
  RESULT=$(_clean_payload | curl -s -X POST \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d @- \
    "$N8N_BASE_URL/api/v1/workflows")
  WF_ID=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || true)
  EXISTING_ACTIVE=""  # yeni workflow — aktive et
fi

if [ -z "$WF_ID" ] || [ "$WF_ID" = "None" ]; then
  echo "❌ Workflow oluşturulamadı. n8n yanıtı:"
  echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
  exit 1
fi

echo "✅ Workflow ID : $WF_ID"

# ─── Aktif durumu koru ───────────────────────────────────────────────────────
# Yeni workflow → aktif et
# Güncellenen workflow → önceki aktif durumuna geri getir (kasıtlı pasifler bozulmasın)
if [ "$EXISTING_ACTIVE" = "true" ] || [ -z "$EXISTING_ACTIVE" ]; then
  ACT_RESULT=$(curl -s -X POST \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    "$N8N_BASE_URL/api/v1/workflows/$WF_ID/activate")
  IS_ACTIVE=$(echo "$ACT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('active','?'))" 2>/dev/null || echo "?")
  echo "⚡ Aktif      : $IS_ACTIVE"
else
  echo "⏸️  Aktif      : false (önceki durum korundu — kasıtlı pasif)"
fi

# ─── Webhook URL ─────────────────────────────────────────────────────────────
WEBHOOK_PATH=$(python3 -c "
import json
wf = json.load(open('$FILE'))
for node in wf.get('nodes', []):
    t = node.get('type', '')
    if 'webhook' in t.lower():
        print(node.get('parameters', {}).get('path', ''))
        break
" 2>/dev/null || true)

echo ""
if [ -n "$WEBHOOK_PATH" ]; then
  WEBHOOK_URL="$N8N_BASE_URL/webhook/$WEBHOOK_PATH"
  echo "🌐 Webhook URL : $WEBHOOK_URL"
fi
echo "🎯 n8n UI      : $N8N_BASE_URL/workflow/$WF_ID"

# ─── Test ────────────────────────────────────────────────────────────────────
if [ "$TEST_MODE" = "--test" ] && [ -n "$WEBHOOK_PATH" ]; then
  echo ""
  echo "─────────────────────────────────"
  echo "🧪 Test isteği gönderiliyor..."
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"test":true}' \
    "$WEBHOOK_URL" \
    | python3 -m json.tool 2>/dev/null || echo "(Yanıt: onReceived modu — workflow arka planda çalışıyor)"

  echo ""
  sleep 2
  echo "📋 Son execution durumu:"
  curl -s \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    "$N8N_BASE_URL/api/v1/executions?workflowId=$WF_ID&limit=1" \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
execs = data.get('data', [])
if not execs:
    print('  Henüz çalıştırma yok')
else:
    ex = execs[0]
    print(f'  Status  : {ex.get(\"status\",\"?\")}')
    print(f'  Mode    : {ex.get(\"mode\",\"?\")}')
    print(f'  Başladı : {ex.get(\"startedAt\",\"?\")}')
" 2>/dev/null || true
fi

echo ""
echo "─────────────────────────────────"
echo "✅ Publish tamamlandı"
