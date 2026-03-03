---
id: TASK-002
status: DONE
type: FIX
scope: BACKEND
ux-required: false
n8n-required: false
priority: P1
created-by: release-manager
date: 2026-03-02
---

# TASK-002: Son Release — prepStageName Boşken En Son Tetiklenen Release'i Getir

## Özet

`last-prep-releases` endpoint'i şu an yalnızca hem `releaseName` hem `prepStageName` dolu olan servisleri işliyor. `prepStageName` boş olan servislerde hiçbir release bilgisi dönmüyor. Doğru davranış: `prepStageName` boşsa en son **tetiklenen** release (succeeded filtresi olmadan) gösterilmeli.

## Problem / Fırsat

Release Manager, bir servis için prep stage tanımlanmamış olsa bile "son release ne?" sorusunu yanıtlamak istiyor. Şu anki davranış:

- `releaseName` dolu + `prepStageName` dolu → son succeeded release'i göster ✅
- `releaseName` dolu + `prepStageName` boş → hiçbir şey gösterme ❌ (SORUN)
- `releaseName` boş → gösterme ✅ (doğru)

Kullanıcı şu geri bildirimi verdi:
> "Ürün tanımında prep stage boş ise o zaman en son tetiklenen release'in numarasını getirir, succeeded durumuna bakmadan."

## Kullanıcı Hikayeleri

- Release Manager olarak, prep stage konfigüre edilmemiş servislerde bile son release numarasını görmek istiyorum, çünkü "bu servis hiç deploy oldu mu, en son ne yaptı?" sorusunu anında yanıtlamam lazım.

## Kabul Kriterleri (AC)

- [ ] `releaseName` dolu, `prepStageName` dolu → son **succeeded** release adı döner (mevcut davranış korunur)
- [ ] `releaseName` dolu, `prepStageName` boş/null → en son tetiklenen release adı döner (status filtresi yok, `releases[0].name`)
- [ ] `releaseName` boş → servis atlanır, sonuç listesine dahil edilmez (mevcut davranış korunur)
- [ ] Yanıt formatı aynı kalır: `{ data: [{ serviceId, lastPrepReleaseName }], authError? }`
- [ ] Frontend "Son Release" sütunu bu veriyi doğru gösterir (mevcut render kodu çalışmaya devam eder)
- [ ] Azure API hatalarında `authError` alanı doldurulur, sayfa çökmez

## Kapsam Dışı (Out of Scope)

- Frontend'de "prep stage var" vs "son tetiklenen" arasında görsel ayrım (V1 için)
- Tooltip ile "succeeded / triggered" farkını gösterme (V1 için)
- Servis bazlı release geçmişi listeleme

## İş Kuralları

- **prepStageName varsa:** VSRM API → `environments` expand → prepStageName eşleşen env → `status === 'succeeded'` → en yeni
- **prepStageName yoksa:** VSRM API → `$top=1` ile en son tetiklenen release → `releases[0].name` (succeeded olup olmadığına bakılmaz)
- Eğer Azure'a ulaşılamazsa ya da definition bulunamazsa: `lastPrepReleaseName: null` dön, sessizce geç

## Öncelik ve Etki

| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Her servis kartında "Son Release" boş görünüyor |
| İş etkisi | RM anlık durum takibinde veri eksik — karar kalitesi düşüyor |
| Teknik risk | Minimal — yalnızca `last-prep-releases` handler'ı |
| Öncelik | P1 |

## Bağımlılıklar

- Backend: `packages/backend/src/routes/tfs.routes.ts` — `GET /api/tfs/last-prep-releases`
- Frontend: Değişiklik yok — aynı `lastPrepReleaseName` alanını kullanıyor

## Handoff Notları

### Backend — 2026-03-02

**Değişen dosya:** `packages/backend/src/routes/tfs.routes.ts`

**Değişiklik özeti:**

`GET /api/tfs/last-prep-releases` endpoint handler'ında iki dallanma eklendi:

```typescript
// releaseName varsa devam et (eski: hem releaseName hem prepStageName zorunluydu)
if (!svc.releaseName) return;

if (svc.prepStageName) {
  // prepStageName varsa: $top=50 + $expand=environments → succeeded filtreli en son
} else {
  // prepStageName yoksa: $top=1, status filtresi yok → en son tetiklenen
}
```

- frontend'e sıfır etki (aynı `{ serviceId, lastPrepReleaseName }` formatı)
- design doc güncellendi: `designs/screens/release-health-check.md` — "Son Release Kolon Davranışı"
- tsc: 0 hata
- Backend 3002'de yeniden başlatıldı, health OK

## RM Handoff — 2026-03-02

- Scope kararı: BACKEND
- ux-required: false
- n8n-required: false
- Öncelik: P1
- Sıradaki rol: backend-developer
- RM Review bekleniyor: Hayır
