# ReleaseHub360 — Copilot Agent Instructions

Her oturumda önce `ROADMAP.md` ve `.github/copilot/skills/` klasörünü oku. Aktif role uygun skill dosyasını referans al.

---

## QA → Dev Orchestration (Bug Pipeline)

Bu projede QA, Frontend ve Backend agent'ları pipeline şeklinde çalışır:

```
QA Engineer      → Ekranları audit et → tasks/bugs/ klasörüne ticket yaz
Frontend Dev     → tasks/bugs/ içindeki FRONTEND ticketları al → düzelt → RESOLVED işaretle
Backend Dev      → tasks/bugs/ içindeki BACKEND ticketları al → düzelt → RESOLVED işaretle
```

### Rolleri Aktifleştirme

| Kullanıcı komutu | Ne olur |
|---|---|
| `"QA Engineer olarak tüm ekranları test et"` | `.github/copilot/skills/qa-engineer.prompt.md` referans alınır, Screen Audit Mode çalıştırılır |
| `"Frontend Developer olarak bug'ları düzelt"` | `tasks/bugs/` okunur, FRONTEND etiketli açık ticketlar fix edilir |
| `"Backend Developer olarak bug'ları düzelt"` | `tasks/bugs/` okunur, BACKEND etiketli açık ticketlar fix edilir |
| `"n8n Engineer olarak workflow yaz"` | `.github/copilot/skills/n8n-engineer.prompt.md` referans alınır, talep sürece dönüştürülür, `n8n-workflows/` altına JSON olarak kaydedilir |

### QA Screen Audit Sırası

Tüm ekranlar şu sırayla test edilir (önce riskli / veri yoğun sayfalar):
1. Login → Dashboard → Products → Releases → Customers → diğerleri

### Bug Ticket Akışı

1. QA → `tasks/bugs/BUG-XXX.md` yazar (format: `tasks/bugs/README.md`)
2. Developer → ticket dosyasını okur, düzeltir, en başa `status: RESOLVED` yazar
3. QA → sonraki audit'te RESOLVED ticketları `tasks/bugs/resolved/` klasörüne taşır

---

## Feature Development Pipeline (Sıralı Rol Zinciri)

Yeni bir özellik veya ekran geliştirirken roller **sırasıyla** devreye girer. Her rol bir öncekinin çıktısını temel alır.

```
Release Manager  → Analiz + Feature Spec yaz  → designs/specs/{feature}.md
       ↓
UX Designer      → Spec'i okuyup ekran tasarla → designs/screens/{feature}.md güncelle
       ↓
Backend Dev      → Schema + route değişiklikleri → prisma + routes
       ↓
Frontend Dev     → Ekranı yeniden yaz / güncelle → pages/{Page}.tsx
       ↓
QA Engineer      → Ekranı audit et → tasks/bugs/BUG-XXX.md yaz
```

### Rolleri Sıralı Aktifleştirme

| Aşama | Tetikleyici komut | Ne olur |
|---|---|---|
| **1. RM** | `"release-manager olarak [konu] değerlendir"` | Spec dosyası `designs/specs/` altına yazılır, açık sorular + AC listesi üretilir |
| **2. UX** | `"ux-designer olarak tasarımı yap"` | Spec okunur, ASCII wireframe + bileşen kararları `designs/screens/` altına yazılır |
| **3. Backend** | `"backend-developer olarak geliştir"` | Prisma schema + routes güncellenir, `prisma db push` çalıştırılır |
| **4. Frontend** | `"frontend-developer olarak geliştir"` | İlgili `pages/` dosyası tasarıma göre yeniden yazılır, TypeScript hataları sıfırlanır |
| **5. QA** | `"qa-engineer olarak test et"` | Ekran audit edilir, bulunan buglar `tasks/bugs/BUG-XXX.md` olarak yazılır |

### Önemli Kurallar

- **RM spec olmadan UX başlamaz.** UX, `designs/specs/{feature}.md` dosyasını okuyarak işe başlar.
- **UX wireframe olmadan Frontend başlamaz.** Frontend, `designs/screens/{feature}.md` tasarımını referans alır.
- **Backend route ve schema olmadan Frontend API çağrısı yazmaz.** Backend önce biter.
- **QA, Frontend merge olmadan ticket açmaz.** Gerçek implementasyonu test eder, spec'i değil.
- Her rol kendi çıktısını ilgili dosyaya yazar — özetini kullanıcıya değil, dosyaya bırakır.

### Hangi Roller Atlanabilir?

| Durum | Atlananlar |
|---|---|
| Sadece görsel düzenleme | Backend atlanır |
| Sadece backend fix | UX + Frontend atlanır |
| Hızlı hotfix | RM spec yazılmaz, doğrudan Backend + Frontend |
| Yeni ekran | Hiçbiri atlanamaz — tam zincir zorunlu |

---

## Zincirli Komut Sözdizimi

Tek seansta birden fazla rolü **sıralı** çalıştırmak için `→` ayracı kullan. Model her rolü tamamlayıp dosyaya yazar, sonra bir sonrakine geçer. Kullanıcıdan onay beklemeden ilerler.

### Sözdizimi

```
"[rol1] → [rol2] → [rol3]: [konu/hedef]"
```

### Mod Seçenekleri

| Mod | Sözdizimi | Ne yapar |
|---|---|---|
| **Akışkan** (varsayılan) | `rol1 → rol2 → rol3` | Roller arası durmadan ilerler, RM review dahil |
| **Kapılı** | `rol1 → [RM GATE] → rol2` | RM review noktasında durur, kullanıcı "devam" demeden ilerlemez |

### Hazır Zincir Şablonları

**Yeni ekran — tam zincir (akışkan):**
```
"release-manager → ux-designer → release-manager review → backend-developer → release-manager review → frontend-developer → release-manager review → qa-engineer: [ekran/özellik adı]"
```

**Yeni ekran — kapılı (her RM review'da dur):**
```
"release-manager → ux-designer → [RM GATE] → backend-developer → [RM GATE] → frontend-developer → [RM GATE] → qa-engineer: [ekran/özellik adı]"
```

**Sadece backend + frontend (UX hazır, DB değişikliği yok):**
```
"backend-developer → frontend-developer → qa-engineer: [özellik adı]"
```

**Hotfix (hız öncelikli):**
```
"backend-developer → frontend-developer: [bug açıklaması]"
```

**Bug audit + fix:**
```
"qa-engineer → frontend-developer → backend-developer: tüm ekranları audit et ve fix uygula"
```

**RM sprint değerlendirmesi + önceliklendirme:**
```
"release-manager: sprint durumunu değerlendir ve sonraki adımları belirle"
```

### Zincir İçi Davranış Kuralları

Zincirli komut geldiğinde model şunu yapar:

```
1. Komuttaki rolleri ve sıralamayı parse et
2. İlk rolün skill dosyasını oku → o rol olarak çalış
3. Çıktıyı ilgili dosyaya yaz + Handoff Notes ekle
4. [RM GATE] varsa: DUR, kullanıcıya özet sun, "devam" bekle
   [RM GATE] yoksa: bir sonraki role otomatik geç
5. Sonraki rolün skill dosyasını oku → bir önceki rolün Handoff Notes'unu oku
6. Zincir bitene kadar devam et
```

### Rol Geçiş Bildirimi

Her rol geçişinde model şu formatla bildirim yapar — kullanıcı nerede olduğunu takip edebilsin:

```
─────────────────────────────────
✅ [ROL ADI] tamamlandı → [çıktı dosyası]
⏭  Sıradaki: [ROL ADI]
─────────────────────────────────
```

### Zinciri Kırma

Zincir ortasında bir rol **blocker** tespit ederse (TypeScript hatası, eksik endpoint, kritik bug) zinciri durdurur:

```
─────────────────────────────────
🛑 ZİNCİR DURDU — [ROL ADI] blocker buldu
Sebep: [açıklama]
Çözüm önerisi: [ne yapılmalı]
Devam etmek için: "[çözüm sonrası] → devam" yaz
─────────────────────────────────
```

---

## Quality Gate & RM Review Protokolü

Release Manager her faz geçişini onaylar. Bir sonraki faz **RM yeşil ışığı olmadan başlamaz.**

| Geçiş | RM Kontrol Eder | Geçiş Koşulu |
|---|---|---|
| RM Spec → UX | AC eksiksiz mi? Kapsam net mi? Out-of-scope yazılmış mı? | `designs/specs/{feature}.md` oluşturulmuş |
| UX → Backend | Tüm AC ekranları wireframe'de var mı? Boş/hata state'leri tasarlanmış mı? | `designs/screens/{feature}.md` + Handoff Notes mevcut |
| Backend → Frontend | Tüm endpoint'ler dokümante mi? Frontend için hazır mı? | Backend Handoff Notes yazılmış |
| Frontend → QA | TypeScript 0 hata, 0 Firebase import, AC ekranda görsel olarak var mı? | Frontend Handoff Notes yazılmış |
| QA → Done | Tüm kritik bug'lar RESOLVED mi? Release blocker kalmadı mı? | QA Handoff Notes (Summary) yazılmış |

### RM Review Tetikleyici Komutlar

| Komut | Ne yapar |
|---|---|
| `"release-manager olarak UX çıktısını review et"` | `designs/screens/{feature}.md` okunur, spec AC'leriyle birebir karşılaştırılır |
| `"release-manager olarak backend çıktısını review et"` | Handoff Notes okunur, frontend için hazırlık değerlendirilir |
| `"release-manager olarak frontend çıktısını review et"` | AC'ler ekranda karşılanmış mı, edge case'ler var mı kontrol edilir |
| `"release-manager olarak QA sonucunu review et"` | Bug severity dağılımı okunur, release'e yeşil ışık verilir ya da blocker listelenir |
| `"release-manager olarak sprint durumunu değerlendir"` | `tasks/bugs/` + `tasks/todo.md` + `ROADMAP.md` okunur, önceliklendirme + engel analizi yapılır |

### Handoff Notu Standardı

Her rol çıktısını ilgili dosyaya yazdıktan sonra **Handoff Notes** bölümünü ekler. Bu notlar:
- Bir sonraki rolün okuyacağı ilk şeydir
- RM'nin o fazı review edebileceği özeti içerir
- "RM Review bekleniyor" satırı RM'yi tetikler

Format: Her skill dosyasında `## Handoff Notu — Zorunlu Çıktı` bölümünde tanımlıdır.

---

## Workflow Orchestration

### 1. Plan Node Default
- Her non-trivial görevde (3+ adım veya mimari karar içeren) önce plan yaz
- Bir şeyler ters giderse DUR ve planı güncelle — körü körüne devam etme
- Doğrulama adımları için de plan modu kullan
- Belirsizliği azaltmak için upfront detaylı spec yaz

### 2. Subagent Strategy
- Ana context'i temiz tutmak için subagent'leri serbestçe kullan
- Araştırma, keşif ve paralel analizi subagent'lere offload et
- Karmaşık sorunlara daha fazla compute: subagent at
- Her subagent'e tek odaklı görev ver

### 3. Self-Improvement Loop
- Kullanıcıdan herhangi bir düzeltme gelince: `tasks/lessons.md` dosyasını o pattern ile güncelle
- Aynı hatayı tekrar yapmanı önleyecek kurallar yaz
- Hata oranı düşene kadar amansızca iterate et
- Her oturum başında ilgili proje için lessons'ları gözden geçir
- **Skill dosyası güncellemesi:** Bir rol ile çalışırken o rolün skill dosyasında eksik veya yetersiz bir bölüm fark edersen, görevi tamamladıktan sonra ilgili `.github/copilot/skills/{rol}.prompt.md` dosyasını güncel bilgi veya kural ile zenginleştir. Aynı eksiği bir daha yaşamamak için.

### 4. Verification Before Done
- Çalıştığını kanıtlamadan görevi tamamlandı işaretleme
- Bu projeye özel: `grep -r "firebase" packages/frontend/src` → 0 sonuç = migration tamam
- Kendin sor: "Kıdemli bir developer bunu onaylar mıydı?"
- Test çalıştır, logları kontrol et, doğruluğu kanıtla

### 5. Demand Elegance (Balanced)
- Non-trivial değişikliklerde dur ve "daha zarif bir yol var mı?" diye sor
- Bir fix hacky geliyorsa: "Şu an bildiğim her şeyle zarif çözümü implement et"
- Basit, açık fix'ler için bunu atlat — over-engineer etme
- Sunmadan önce kendi işine meydan oku

### 6. Autonomous Bug Fixing
- Bug raporu verilince: sadece düzelt, el tutma isteme
- Loglara, hatalara, başarısız testlere işaret et — sonra çöz
- Kullanıcıdan sıfır context switching gerektirir
- Nasıl yapacağın söylenmeden failing CI testlerini düzelt

---

## Task Management

1. **Plan First:** Planı `tasks/todo.md` dosyasına işaretlenebilir maddelerle yaz
2. **Verify Plan:** İmplementasyona başlamadan önce check et
3. **Track Progress:** Maddeleri tamamlandıkça işaretle
4. **Explain Changes:** Her adımda üst düzey özet ver
5. **Document Results:** `tasks/todo.md`'ye review bölümü ekle
6. **Capture Lessons:** Düzeltmelerden sonra `tasks/lessons.md`'yi güncelle

---

## Core Principles

- **Simplicity First:** Her değişikliği mümkün olduğunca basit yap. Minimal kod etkisi.
- **No Laziness:** Kök nedenleri bul. Geçici fix yok. Senior developer standartları.
- **Minimal Impact:** Değişiklikler sadece gerekli olanı etkilesin. Bug sokmaktan kaçın.

---

## Proje Bağlamı

- **Stack:** React 19 + MUI v7 (frontend), Express + TypeScript (backend), PostgreSQL 16
- **Monorepo:** `packages/frontend`, `packages/backend`, `packages/mcp-server`
- **Auth:** JWT (Firebase tamamen kaldırılıyor)
- **Skill dosyaları:** `.github/copilot/skills/{role}.prompt.md`
  - `release-manager.prompt.md` — feature spec, domain kuralları, önceliklendirme, müşteri perspektifi
  - `ux-designer.prompt.md` — ekran tasarımı, wireframe, Command Center pattern
  - `frontend-developer.prompt.md` — React + TanStack Query, Firebase→API migration
  - `backend-developer.prompt.md` — Express+TS, Prisma, PostgreSQL
  - `devops-engineer.prompt.md` — Docker, CI/CD, k8s
  - `qa-engineer.prompt.md` — Screen Audit Mode, bug ticket yazımı, Jest, Playwright
  - `n8n-engineer.prompt.md` — Workflow tasarımı, döngü (split), node bağlantıları, hata yönetimi
- **Yol haritası:** `ROADMAP.md`

---

## Kod Kuralları (Bu Proje)

- TypeScript — `any` yasak
- `async/await` — promise chain değil
- Her API çağrısında `try/catch`
- Firebase import'u yok: `grep -r "firebase" packages/frontend/src` → 0
- External servisler (n8n, MCP, TFS) backend üzerinden proxy edilir — frontend doğrudan çağırmaz
- Prisma — raw SQL yasak
- Secret'lar `.env`'de — kaynak kodda plain text yok

---

## Dosya Düzeni

```
.github/
  copilot-instructions.md   ← bu dosya (otomatik yüklenir)
  copilot/skills/           ← rol bazlı skill dosyaları
ROADMAP.md                  ← proje yol haritası
tasks/
  todo.md                   ← aktif görev listesi
  lessons.md                ← öğrenilen dersler
  bugs/                     ← QA bug ticketları (BUG-XXX.md)
  bugs/resolved/            ← kapanan ticketlar
packages/
  frontend/                 ← React SPA
  backend/                  ← Express+TS API
  mcp-server/               ← Code Sync servisi
```
