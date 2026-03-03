# ReleaseHub360 — Tasarım Dokümanı

**Başlangıç:** 28 Şubat 2026  
**Son güncelleme:** 28 Şubat 2026  
**Durum:** Aktif — adım adım olgunlaşıyor

> Bu doküman projenin nihai tasarımını tanımlar. Her varlık (entity) mevcut durumu, hedef durumu ve gap'leri içerir.

---

## 1. Product (Ürün)

Projenin en temel yapı taşı. Tüm versiyon, müşteri, release ve servis yönetimi Product'a bağlıdır.

### 1.1 Temel Bilgiler

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `name` | string | ✅ | Ürün adı |
| `description` | string | — | Ürün açıklaması |
| `isActive` | boolean | ✅ | Aktif/pasif durumu (default: true) |

### 1.2 Source Control Type (Kaynak Kontrol Tipi)

Ürünün kaynak kodunun yönetildiği platform. Seçime göre farklı bağlantı bilgileri gerekir.

| Değer | Açıklama |
|-------|----------|
| `AZURE` | Azure DevOps / TFS üzerinden yönetilen ürün |
| `GITHUB` | GitHub üzerinden yönetilen ürün |

#### Azure Bağlantı Bilgileri (`sourceControlType = AZURE`)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `azureOrg` | string | ✅ | Azure DevOps organizasyon adı |
| `azureProject` | string | ✅ | Azure DevOps proje adı |
| `azurePat` | string (encrypted) | ✅ | Personal Access Token — **DB'de şifreli saklanır** |
| `azureReleaseProject` | string | — | Release pipeline'ları farklı projede ise (ayrı proje adı) |

#### GitHub Bağlantı Bilgileri (`sourceControlType = GITHUB`)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `githubOwner` | string | ✅ | GitHub organization veya kullanıcı adı |
| `githubToken` | string (encrypted) | ✅ | Personal Access Token veya GitHub App Token — **DB'de şifreli saklanır** |

#### PAT / Token Şifreleme Kuralı

- Backend'de AES-256 veya benzeri simetrik şifreleme kullanılır
- Şifreleme anahtarı `.env` → `ENCRYPTION_KEY` ortam değişkeninde tutulur
- DB'ye yazarken: `encrypt(plainPat)` → DB'de cipher text saklanır
- DB'den okurken: `decrypt(cipherText)` → sadece kullanım anında açılır
- API response'da PAT/Token **asla** plain text dönmez — maskeli gösterilir (`•••••abc123`)
- Frontend'de "PAT" alanı `type="password"` olur, düzenleme modu ayrıdır

### 1.3 Artifact Type (Dağıtım Tipi) — Çoklu Seçim

Ürünün müşteriye nasıl ulaştırılabileceğini belirler. **Bir ürün birden fazla artifact type destekleyebilir** — aynı ürün bir müşteriye Docker image olarak, diğerine DLL/binary olarak, bir başkasına kaynak kod olarak satılabilir.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `supportedArtifactTypes` | ArtifactType[] | ✅ | Ürünün desteklediği dağıtım tipleri (en az 1 seçim zorunlu) |

#### Artifact Type Enum Değerleri

| Değer | Açıklama | Müşteri Güncelleme Yöntemi |
|-------|----------|----------------------------|
| `DOCKER` | Docker image üretilir, container registry'ye push edilir | Müşteri yeni image'ı pull eder, container'ı yeniden başlatır |
| `BINARY` | DLL / binary üretilir, FTP veya dosya paylaşımı ile dağıtılır | Müşteriye dosya gönderilir veya FTP'den çekilir |
| `GIT_SYNC` | Codebase satılmış, kod Git üzerinden sync edilir | Müşterinin branch'ine cherry-pick / merge yapılır (Code Sync modülü) |

#### Çoklu Tip Senaryosu

```
Ürün: E-Fatura Platformu
supportedArtifactTypes: [DOCKER, BINARY, GIT_SYNC]

Müşteri A (Akbank)     → DOCKER   → HelmChart üretilir, K8s'e deploy
Müşteri B (Garanti)    → BINARY   → DLL paketi indirir, VM'e deploy
Müşteri C (İş Bankası) → GIT_SYNC → Kod doğrudan branch'ine merge edilir
```

#### Per-Type Konfigürasyon Nerede?

| Konfigürasyon | Katman | Açıklama |
|---------------|--------|----------|
| Ürün hangi tipleri destekler? | **Product** | `supportedArtifactTypes` array |
| Docker image adı nedir? | **Service** | `dockerImageName` (Section 2.5) |
| Binary/DLL dosyaları neler? | **Service** | `binaryArtifacts[]` (Section 2.5) |
| Container nerede çalışıyor? | **Service** | `containerPlatform` + endpoint (Section 2.7) |
| VM'de nerede deploy? | **Service** | `deploymentTargets[]` (Section 2.7) |
| Bu müşteri hangi tipi kullanıyor? | **CustomerProductMapping** | `artifactType` — tek seçim, Product'ın desteklediği tiplerden biri (Section 4.1) |
| HelmChart şablonu / DLL paketi? | **CustomerProductMapping** | Dağıtım detayları (Section 4.4) |

> **RM Gözlemi — Service Alanları Multi-Type'ta:**
> Ürün birden fazla artifact type destekliyorsa, her Service **desteklenen tiplerin tamamı için** ilgili alanları doldurabilir. Örneğin ürün hem DOCKER hem BINARY destekliyorsa:
> - `dockerImageName` + container platform bilgisi doldurulur (DOCKER için)
> - `binaryArtifacts` + VM deployment target bilgisi doldurulur (BINARY için)
> - UX'te bu alanlar Product'ta hangi tiplerin seçili olduğuna göre koşullu gösterilir

#### GIT_SYNC — Senkronizasyon Kaynak Referansı

GIT_SYNC tipinde müşteriye kaynak kod satılmıştır. Peki müşteriye hangi versiyonun kodu gönderilir? Bu, Product'ın branch stratejisine bağlıdır:

| Branch Stratejisi | Sync Kaynağı | Açıklama |
|-------------------|--------------|----------|
| `usesReleaseBranches = true` | Release branch (ör: `release/v2.5.0`) | Branch'teki son durum müşteriye sync edilir |
| `usesReleaseBranches = false` | Tag (ör: `v2.5.0`) | Tag'lanan commit müşteriye sync edilir |

```
GIT_SYNC + usesReleaseBranches = true:
  master ●──●──●──●──●──●
                    │
                    └── release/v2.5.0 ●──●──●
                                              │
                                              └──→ Müşteri branch'ine merge

GIT_SYNC + usesReleaseBranches = false:
  master ●──●──●──●──●──● (tag: v2.5.0)
                          │
                          └──→ Müşteri branch'ine merge
```

> **RM Notu:** GIT_SYNC'in kaynak referansı **ProductVersion** entity'sinde tutulur (Section 5.10 — `gitSyncRef` + `gitSyncRefType`). Her versiyon için hangi branch veya tag'den sync yapılacağı ProductVersion kaydında belirtilir.

> **Not:** `GIT_SYNC` tipindeki ürünler Code Sync modülünün birincil kullanıcısıdır. `DOCKER` ve `BINARY` tiplerde kod senkronizasyonu gerekmez — dağıtım build artifact üzerinden yapılır.

### 1.4 Branch Stratejisi

| Alan | Tip | Default | Açıklama |
|------|-----|---------|----------|
| `usesReleaseBranches` | boolean | false | `true` → her güncelleme için release branch oluşturulur (ör. `release/v2.5.0`). `false` → geliştirme doğrudan master/main üzerinde yapılır. |

**Health Check — PR Toplama Mantığı:**

- `usesReleaseBranches = false` → PR'lar her zaman `main/master` branch'ine merge edilen PR'lardan toplanır
- `usesReleaseBranches = true` → İki aşamalı toplama:
  1. **Release branch oluşmadan önce:** PR'lar `main/master`'a merge edilenlerden toplanır
  2. **Release branch oluştuktan sonra:** PR'lar `release/*` branch'ine merge edilenlerden toplanır

```
Örnek: v2.5.0 versiyonu
──────────────────────────────────────────────────────
  master ●──●──●──●──●──●──●──●──●
                      │
                      └── release/v2.5.0 ●──●──●──●
                          ↑                        ↑
                    branch ayrıldı          release hazır

  PR toplanır:   ←master→ ←release/v2.5.0→
──────────────────────────────────────────────────────
```

### 1.5 Eşzamanlı Müşteri Güncelleme Politikası

Birden fazla müşteri aynı güne geçiş planlarsa ne olur?

| Alan | Tip | Default | Açıklama |
|------|-----|---------|----------|
| `concurrentUpdatePolicy` | enum | `WARN` | `WARN` → müşteriye uyarı gösterilir, isterse devam eder. `BLOCK` → aynı güne ikinci bir müşteri giriş yapamaz. |

### 1.6 Ürün Hiyerarşisi

Sabit 4 katmanlı hiyerarşi — her katman zorunludur:

```
Product
└── ModuleGroup (zorunlu)
    └── Module (zorunlu)
        └── Service / API (birden fazla)
```

| Katman | Açıklama | Zorunlu | Örnek |
|--------|----------|---------|-------|
| **Product** | En üst seviye ürün | ✅ | "E-Fatura Platformu" |
| **ModuleGroup** | Modüllerin mantıksal gruplandırması | ✅ | "Belge Yönetimi", "Entegrasyon", "Raporlama" |
| **Module** | Fonksiyonel birim | ✅ | "Fatura Oluşturma", "E-Arşiv", "GİB Entegrasyonu" |
| **Service / API** | Modüle ait çalışan servisler | ✅ | *(sonraki bölümde detaylandırılacak)* |

> Her Module mutlaka bir ModuleGroup'a ait olmalıdır (`moduleGroupId` **zorunlu**, nullable değil).

---

## Mevcut Durum vs Hedef — Product

| Alan | Mevcut (DB/Schema) | Hedef | Gap |
|------|---------------------|-------|-----|
| `name` | ✅ var | ✅ | — |
| `description` | ✅ var | ✅ | — |
| `pmType` (→ `sourceControlType`) | ✅ var (string) | Enum: `AZURE \| GITHUB` | İsim değişikliği + enum kısıtlaması |
| `azureOrg` | ✅ var | ✅ | — |
| `azureProject` | ✅ var | ✅ | — |
| `azurePat` | ✅ var (**plain text**) | **Encrypted** | 🔴 Şifreleme eklenecek |
| `azureReleaseProject` | ✅ var | ✅ | — |
| `githubOwner` | ❌ yok | ✅ | 🟡 Yeni alan |
| `githubToken` | ❌ yok | ✅ (encrypted) | 🟡 Yeni alan + şifreleme |
| `deploymentType` (→ `supportedArtifactTypes`) | ✅ var (string, tek değer) | **Array:** `ArtifactType[]` | 🔴 Tek enum → çoklu seçim array. Mevcut tek değer → array'e migration |
| `usesReleaseBranches` | ❌ yok | ✅ boolean | 🟡 Yeni alan |
| `concurrentUpdatePolicy` | ❌ yok | ✅ enum (`WARN \| BLOCK`) | 🟡 Yeni alan |
| `repoUrl` | ✅ var | 🔴 **Kaldırılacak** | Artık `azureOrg + azureProject + repoName` ile hesaplanıyor |
| `serviceImageName` | ✅ var | ⚠️ Gözden geçir | Service seviyesine ait olmalı |
| ModuleGroup → Module → Service hiyerarşisi | ✅ var (moduleGroupId nullable) | ✅ (moduleGroupId **zorunlu**) | 🟡 `moduleGroupId` NOT NULL yapılacak |
| Başlangıç versiyonu zorunluluğu | ❌ yok — ürün versiyonsuz oluşturulabiliyor | ✅ — wizard 2. adımda v1.0.0+ başlangıç versiyonu zorunlu (Section 6.3) | 🔴 Backend validation + frontend wizard |
| `customerVisibleStatuses` | ❌ yok | `ProductVersionStatus[]` — varsayılan: `[RELEASED]` (Section 5.11) | 🟡 Yeni alan |

### Yapılması Gerekenler

1. **PAT Şifreleme:** `azurePat` ve yeni `githubToken` alanları için encrypt/decrypt utility
2. **GitHub Alanları:** `githubOwner`, `githubToken` eklenmesi
3. **Yeni Flagler:** `usesReleaseBranches`, `concurrentUpdatePolicy`
4. **Alan İsim Temizliği:** `pmType` → `sourceControlType`, `deploymentType` → `supportedArtifactTypes` (array)
6. **Artifact Type Migration:** Mevcut `deploymentType` tek string → `supportedArtifactTypes` array'e dönüştürme migration'ı
5. **API Maskesi:** PAT/Token alanları API response'da maskeli dönmeli
7. **Başlangıç Versiyonu Zorunluluğu:** Product oluşturma endpoint'inde 2. adım olarak `ProductVersion { version: >=v1.0.0, status: RELEASED }` oluşturma — tek transaction içinde (Section 6.3)
8. **Product Onboarding Wizard (Frontend):** Tek adımlı form → 2 adımlı wizard. Adım 2: mevcut versiyon + yayınlanma tarihi

---

## 2. Service (Servis / API)

Module'ün altında çalışan, bağımsız deploy edilebilir birimler. PR toplama, pipeline izleme, release takibi ve sağlık kontrolünün temel birimidir.

### 2.1 Temel Bilgiler

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `name` | string | ✅ | Servis adı |
| `description` | string | — | Servis açıklaması |
| `moduleId` | FK → Module | ✅ | Ait olduğu modül (zorunlu) |
| `isActive` | boolean | ✅ | Aktif/pasif (default: true) |

### 2.2 Kaynak Kod Bağlantısı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `repoName` | string | ✅ | Repository adı — PR'lar bu repo için toplanır |

> **Not:** Org/project/PAT bilgileri Product seviyesinde zaten tanımlı. Service sadece repo adını tutar. API çağrısı yapılırken `Product.azureOrg + Product.azureProject + Service.repoName` birleştirilir.
>
> **`repoUrl` kaldırıldı** — Eskiden ayrı bir alan olarak saklanıyordu ama artık Product bilgisi + `repoName` ile hesaplanabilir. DB'den kaldırılacak.

### 2.3 Pipeline Bilgisi

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `pipelineName` | string | — | CI/CD pipeline tanım adı (Build pipeline) |

**Gelecek kullanım:** Pipeline durumu izleme, hata alan pipeline için AI otomatik fix önerisi.

### 2.4 Release Tanımı

Azure DevOps'taki Release Definition (veya GitHub Actions workflow) — servisin build artifact'ini ortamlara deploy eden CI/CD pipeline tanımıdır. Buradaki `releaseName`, pipeline tanımının adıdır; müşteriye hangi versiyonun gittiği ayrı bir entity'de (ProductVersion) tutulacaktır.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `releaseName` | string | — | Release definition adı (Azure DevOps / GitHub Release) |
| `prodStageName` | string | — | **Yayınlandı** kabul edilen stage adı (ör: `Prod`, `Production`) |
| `prodStageId` | string | — | Azure DevOps stage ID (stage rename'e karşı koruma) |
| `prepStageName` | string | — | **Teste açıldı** kabul edilen stage adı (ör: `Prep`, `Staging`, `PreProd`) |
| `prepStageId` | string | — | Azure DevOps stage ID (stage rename'e karşı koruma) |
| `lastProdReleaseName` | string | — | Prod'a son yayınlanan release adı (ör: `Release-2026.2.1`) |
| `lastProdReleaseDate` | DateTime | — | Prod'a son yayınlama tarihi — müşterilere duyuru tarihi |

#### Stage Seçimi — UX Kararı

Manuel stage adı girişi hataya açıktır. Bunun yerine:

1. Kullanıcı `releaseName` girdikten sonra → Backend, Azure DevOps API'den o release definition'ın **son tetiklenen release'inin stage listesini** çeker
2. Frontend iki dropdown gösterir: "Yayın Stage'i" ve "Test Stage'i"
3. Kullanıcı listeden seçer — serbest metin girişi yok

```
Akış:
  [releaseName girilir] → "Stage'leri Getir" butonu
       │
       ▼
  Backend → Azure DevOps API: GET releases?definitionId={id}&$top=1
       │
       ▼
  Response: stages = ["Dev", "Test", "Prep", "Prod"]
       │
       ▼
  Frontend: iki dropdown gösterir
       ├── Yayın Stage'i: [Prod ▼]
       └── Test Stage'i:  [Prep ▼]
```

> **RM Notu:** Bu yaklaşım doğru. Manuel giriş "Production" vs "Prod" vs "PROD" tutarsızlığına yol açar. API'den çekmek tek doğru yol.

#### Health Check — PR Toplama Mantığı

İki stage'in son başarılı tarihlerini kullanarak yeni versiyonun scope'u belirlenir:

```
Son başarılı Prod tarihi              Son başarılı Prep tarihi
         │                                    │
         ▼                                    ▼
─────────●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●──────────── zaman
         │          Bu aralıktaki PR'lar       │
         │      = Yeni versiyonun scope'u      │
         │                                     │
    "Son yayınlanan"                    "Teste açılan"
```

**Mantık:**
- `lastProdDate` = `prodStageName` stage'inin son **başarılı** deployment tarihi
- `lastPrepDate` = `prepStageName` stage'inin son **başarılı** deployment tarihi
- **Yeni versiyon PR'ları** = `lastProdDate` ile `lastPrepDate` arasında merge edilen PR'lar
- Eğer Prep'te henüz başarılı deployment yoksa → `lastProdDate` ile **şimdi** arasındaki PR'lar

> **RM Gözlemi — Aykırı Durumlar:**
>
> 1. **Prep başarısız olursa ne olur?** Son başarılı Prep tarihi kullanılır — başarısız deployment'lar yoksayılır. Bu doğru davranış.
> 2. **Prod'dan sonra hiç Prep tetiklenmemişse?** O zaman "yeni versiyon" diye bir şey henüz yoktur — boş state gösterilmeli.
> 3. **Birden fazla Prep arasında PR eklenirse?** Her Prep tetiklendiğinde scope güncellenir. Son başarılı Prep tarihi her zaman günceldir.
> 4. **Stage adları zamanla değişirse?** `prodStageId` ve `prepStageId` kullanıldığından rename sorun olmaz. Stage adı sadece görüntüleme içindir.
> 5. **⚠️ Prod ve Prep aynı stage olursa ne olur?** Aşağıya bakınız.

#### Özel Senaryo: `prodStageName` = `prepStageName` (Tek Stage Akışı)

Bazı ürünlerde test ve yayın stage'i aynıdır — örneğin sadece "Prod" stage'i olan bir release. Bu durumda:

- İki stage aynı olduğundan, **Prep tarihi de Prod tarihi ile aynıdır**
- PR scope'u hesaplanamaz (aralık = 0) → **Son iki başarılı Prod deployment'ı arasındaki PR'lar** kullanılır

```
Sondan bir önceki başarılı Prod          En son başarılı Prod
              │                                    │
              ▼                                    ▼
──────────────●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●──────── zaman
              │       Bu aralıktaki PR'lar         │
              │   = Mevcut versiyonun scope'u       │
              │                                    │
         "Önceki yayın"                    "Son yayın"
```

**Backend Mantığı:**
```
if (prodStageName === prepStageName) {
  // Tek stage: son 2 başarılı deployment tarihi arasındaki PR'lar
  lastDate = secondLastSuccessfulProdDate
  currentDate = lastSuccessfulProdDate
} else {
  // İki farklı stage: Normal akış
  lastDate = lastSuccessfulProdDate
  currentDate = lastSuccessfulPrepDate
}
PR'lar = getPRsMergedBetween(lastDate, currentDate)
```

#### Saklanan vs Runtime Alanlar

| Alan | Saklanan mı? | Neden? |
|------|:---:|------|
| `lastProdReleaseName` | ✅ DB'de | Müşterilere duyurulan release adı — bankalara bildirildiğinin kanıtı |
| `lastProdReleaseDate` | ✅ DB'de | Son yayınlama tarihi — Health Check PR aralığının başlangıcı |
| Prep son release bilgisi | ❌ Runtime | API'den anlık çekilir — cache'lemeye gerek yok |
| `prodStageId` / `prepStageId` | ✅ DB'de | Stage rename'e karşı koruma |

### 2.5 Artifact Bilgileri

Product'ın `supportedArtifactTypes` array'ine göre ilgili alanlar aktif olur. **Bir Product birden fazla artifact type destekleyebileceğinden, bir Service birden fazla tip için alanları doldurabilir** (ör: hem `dockerImageName` hem `binaryArtifacts`).

#### `DOCKER` Alanları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `dockerImageName` | string | ✅ | Container image tam adı (ör: `registry.azurecr.io/efatura-api`) |

#### `BINARY` Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `binaryArtifacts` | string[] (grid) | DLL / binary dosya adları listesi (ör: `EFatura.Api.dll`, `EFatura.Core.dll`) |

**Kullanım:** Paket sağlığı kontrolünde bu dosyaların varlığı ve versiyonu doğrulanır.

#### `GIT_SYNC` Alanları

Docker image veya binary bilgisi gerekmez. Kod doğrudan Git üzerinden sync edilir — `repoName` yeterlidir. Senkronizasyon kaynak referansı (tag veya release branch) ProductVersion entity'sinde tutulur (bkz. Section 5.10).

> **Multi-Type UX Kuralı:** Service ekranında hangi artifact bölümlerinin gösterileceği, o Service'in ait olduğu Product'ın `supportedArtifactTypes` array'ine göre belirlenir. Seçili olmayan tiplere ait alanlar gizlenir.

### 2.7 Deployment Hedefi (Canlılık Kontrolü İçin)

Servisin hangi altyapıda çalıştığını bilmek, **ortamda canlı mı / doğru versiyon mu** kontrolü için zorunludur. Bu bilgi artifact type'a göre farklılaşır.

**Multi-Type Durumunda:** Ürün birden fazla artifact type destekliyorsa, bir Service **hem** container platform **hem** VM deployment bilgilerine sahip olabilir. Kurum aynı servisi farklı müşteriler için farklı şekillerde dağıtabilir, ancak kendi canlılık kontrolü için ilgili tüm hedefleri tanımlamalıdır.

#### `DOCKER` → Container Platform Bilgisi

Image'ın deploy edildiği container orchestration platformu.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `containerPlatform` | enum | ✅ | `RANCHER` \| `OPENSHIFT` \| `KUBERNETES` \| `DOCKER_COMPOSE` |
| `platformUrl` | string | ✅ | Platform API/UI adresi (ör: `https://rancher.mycompany.com`) |
| `platformToken` | string (encrypted) | ✅ | API erişim token'ı — PAT kuralları geçerli (AES-256 + maskeleme) |
| `clusterName` | string | — | Cluster adı (multi-cluster ortamlar için) |
| `namespace` | string | — | Kubernetes/OpenShift namespace (ör: `efatura-prod`) |
| `workloadName` | string | — | Deployment / StatefulSet / Workload adı |

**Canlılık Kontrolü Akışı:**
```
Backend → Platform API → "Bu namespace'te bu image çalışıyor mu?"
  ├── Image tag kontrolü: çalışan versiyon = beklenen versiyon?
  ├── Pod/replica durumu: healthy / unhealthy / pending?
  └── Sonuç: ✅ Canlı (doğru versiyon) | ⚠️ Eski versiyon | ❌ Çalışmıyor
```

> **RM Notu:** `containerPlatform` enum'u genişletilebilir. Şu an Rancher, OpenShift, vanilla K8s ve Docker Compose yeterli. İleride AWS ECS, Azure AKS gibi eklemeler yapılabilir — ama şu an YAGNI.

#### `BINARY` → VM / Sunucu Bilgisi

DLL/binary'nin deploy edildiği sanal makine veya fiziksel sunucu.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `deploymentTargets` | DeploymentTarget[] | ✅ | Ortam başına sunucu listesi |

| DeploymentTarget Alanı | Tip | Açıklama |
|------------------------|-----|----------|
| `environmentName` | string | Hangi ortam (Dev, Test, Prod — Product.environments'tan seçilir) |
| `hostAddress` | string | Sunucu adresi (IP veya hostname, ör: `10.1.2.50` veya `efatura-app01.mycompany.local`) |
| `deployPath` | string | Binary'nin yerleştiği dizin (ör: `C:\Apps\EFatura\bin`) |
| `protocol` | enum | Erişim protokolü: `WMI` \| `SSH` \| `AGENT` |
| `credential` | string (encrypted) | Sunucu erişim bilgisi — şifreli saklanır |

**Canlılık Kontrolü Akışı:**
```
Backend → VM'e bağlan (WMI/SSH/Agent) → Binary dosya kontrolü
  ├── Dosya var mı? (binaryArtifacts listesindeki her DLL)
  ├── Dosya versiyonu / hash doğru mu?
  ├── İlgili servis çalışıyor mu? (Windows Service / systemd)
  └── Sonuç: ✅ Güncel | ⚠️ Eski versiyon | ❌ Dosya eksik
```

#### `GIT_SYNC`

Deployment hedefi gerekmez — kod doğrudan Git üzerinden sync edilir. Canlılık kontrolü Code Sync modülünün kendi commit karşılaştırmasıyla yapılır.

### 2.8 UX Notu — Alan Karmaşıklığı Yönetimi

> **UX Designer Dikkat:** Service entity'sinin alan sayısı fazla. Ekran tasarımında şu yaklaşımlar önerilir:
>
> 1. **Wizard / adımlı form:** Tüm alanları tek form'a koymak yerine adımlara böl:
>    - Adım 1: Temel bilgiler (name, repoName, pipelineName)
>    - Adım 2: Release tanımı (releaseName → stage seçimi → stage'leri getir)
>    - Adım 3: Artifact detayı (Product'ın `supportedArtifactTypes`'ına göre koşullu alanlar)
>    - Adım 4: Deployment hedefi (platform/VM bilgileri — desteklenen artifact type'lara göre)
> 2. **Koşullu görünürlük:** Product'ın `supportedArtifactTypes` seçimine göre sadece ilgili alanlar gösterilsin. DOCKER seçilince VM alanları, BINARY seçilince container alanları gizlensin. Birden fazla tip seçiliyse tüm ilgili bölümler görünür olur.
> 3. **Collapsible bölümler:** İleri düzey alanlar (stage ID'ler, deployment hedefi) varsayılan olarak kapalı olabilir.
> 4. **Platform token girişi:** PAT kurallarıyla aynı — `type="password"`, maskeleme, ayrı düzenleme modu.

### 2.6 Ortamlar (Environments)

Ürüne ait deployment ortamları. Release stage'leriyle eşleşir ama onlardan bağımsız tanımlanır — çünkü her ortamın kendi konfigürasyonu olabilir.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `environments` | Environment[] | ✅ | Ürüne ait ortam listesi |

| Environment Alanı | Tip | Açıklama |
|--------------------|-----|----------|
| `name` | string | Ortam adı (Development, Test, PreProd, Prod) |
| `url` | string | Ortam URL'si (opsiyonel) |
| `sortOrder` | int | Sıralama (akış yönü: Dev → Test → Prep → Prod) |

> **RM Kararı:** Ortamlar **Product seviyesinde** tanımlanmalı, Service seviyesinde değil. Çünkü bir ürünün tüm servisleri aynı ortam setini paylaşır. Service bazında farklı ortam durumu (sağlıklı/sorunlu) ise ayrı bir runtime entity olarak takip edilebilir.

---

## Mevcut Durum vs Hedef — Service

| Alan | Mevcut (DB/Schema) | Hedef | Gap |
|------|---------------------|-------|-----|
| `name` | ✅ var | ✅ | — |
| `description` | ✅ var | ✅ | — |
| `moduleId` | ✅ var (nullable) | ✅ (**zorunlu**) | 🟡 NOT NULL yapılacak |
| `repoName` | ✅ var | ✅ | — |
| `repoUrl` | ✅ var | 🔴 **Kaldırılacak** | `Product.azureOrg + azureProject + repoName` ile hesaplanır |
| `pipelineName` | ✅ var | ✅ | — |
| `releaseName` | ✅ var | ✅ | — |
| `releaseStage` (→ `prodStageName`) | ✅ var (tek stage) | **İki stage ayrımı** | 🟡 `prodStageName` + `prepStageName` olacak |
| `prodStageName` | ❌ yok | ✅ | 🟡 Yeni alan |
| `prepStageName` | ❌ yok | ✅ | 🟡 Yeni alan |
| `prodStageId` | ❌ yok | ✅ | 🟡 Yeni alan (rename koruması) |
| `prepStageId` | ❌ yok | ✅ | 🟡 Yeni alan (rename koruması) |
| `serviceImageName` (→ `dockerImageName`) | ✅ var | ✅ (koşullu: `DOCKER`) | İsim değişikliği |
| `binaryArtifacts` | ❌ yok | ✅ string[] (koşullu: `BINARY`) | 🟡 Yeni alan |
| `containerPlatform` | ❌ yok | ✅ enum (koşullu: `DOCKER`) | 🟡 Yeni alan |
| `platformUrl` | ❌ yok | ✅ (koşullu: `DOCKER`) | 🟡 Yeni alan |
| `platformToken` | ❌ yok | ✅ encrypted (koşullu: `DOCKER`) | 🟡 Yeni alan |
| `clusterName` / `namespace` / `workloadName` | ❌ yok | opsiyonel (koşullu: `DOCKER`) | 🟡 Yeni alanlar |
| `deploymentTargets` | ❌ yok | ✅ (koşullu: `BINARY`) | 🟡 Yeni — ortam+sunucu+path |
| `lastProdReleaseName` | ❌ yok (`lastReleaseName` var) | ✅ **Saklanacak** | 🟡 Müşteriye duyurulan release adı |
| `lastProdReleaseDate` | ❌ yok (`currentVersionCreatedAt` var) | ✅ **Saklanacak** | 🟡 Son yayınlama tarihi |
| `currentVersion` | ✅ var | 🔴 **Kaldırılacak** | `lastProdReleaseName` ile değiştirildi |
| `currentVersionCreatedAt` | ✅ var | 🔴 **Kaldırılacak** | `lastProdReleaseDate` ile değiştirildi |
| `lastReleaseName` | ✅ var | 🔴 **Kaldırılacak** | `lastProdReleaseName` ile netleştirildi |
| `port` | ✅ var | ✅ | Service'e özel port |
| Environments (Product seviyesinde) | ✅ `Customer.environments` string[] | ✅ Product seviyesinde ayrı entity | 🟡 Product'a taşınacak, yapılandırılacak |

### Yapılması Gerekenler

1. **Stage ikileştirme:** `releaseStage` → `prodStageName` + `prepStageName` + `prodStageId` + `prepStageId`
2. **Stage Getir API:** Backend endpoint → Azure DevOps'tan stage listesi çek (dropdown için)
3. **Release takip alanları:** `lastProdReleaseName` + `lastProdReleaseDate` ekle
4. **Alan kaldırma:** `repoUrl`, `currentVersion`, `currentVersionCreatedAt`, `lastReleaseName`, `releaseStage` kaldır
5. **Alan yeniden adlandırma:** `serviceImageName` → `dockerImageName`
6. **Binary artifacts:** `binaryArtifacts` string[] alanı ekle (BINARY tipli ürünler için)
7. **Ortamlar:** Product seviyesinde `Environment` entity oluştur
8. **moduleId NOT NULL:** Zorunlu hale getir
9. **Aynı stage senaryosu:** Backend health check logic'inde `prodStageName === prepStageName` kontrolü ekle
10. **Container platform alanları:** `containerPlatform` enum + `platformUrl` + `platformToken` (encrypted) + cluster/namespace/workload
11. **VM deployment hedefi:** `deploymentTargets` entity (environmentName, hostAddress, deployPath, protocol, credential)
12. **Canlılık kontrolü API'leri:** Rancher/OpenShift API + WMI/SSH entegrasyonu (ileride, P2)

---

## 3. Customer (Müşteri)

Ürünlerin son kullanıcısı olan kurumlar. Her müşterinin kendi talep yönetim sistemi olabilir ve bu talepler kurumun tekil iş yönetim aracına (Azure DevOps / GitHub) aktarılır.

### 3.1 Temel Bilgiler

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `name` | string | ✅ | Müşteri adı (ör: `Akbank`, `Garanti BBVA`) |
| `code` | string (unique) | ✅ | Kısa kod (ör: `AKB`, `GAR`) — referans ve filtreleme için |
| `tenantName` | string | ✅ | Müşterinin tenant/ortam adı (ör: `akbank-prod`) |
| `emailDomains` | string[] | ✅ | E-posta domain listesi — login olan kullanıcıyı müşteriye eşler |
| `contactEmail` | string | — | İletişim e-postası |
| `contactPhone` | string | — | İletişim telefonu |
| `address` | string | — | Adres |
| `notes` | string | — | Serbest not alanı |
| `isActive` | boolean | ✅ | Aktif/pasif (default: true) |

#### E-posta Domain'i ile Müşteri Eşleme

Login olan kullanıcının e-posta domain'i (`@akbank.com.tr`) Customer'ın `emailDomains` listesiyle karşılaştırılır:

```
Kullanıcı login: ahmet.yilmaz@akbank.com.tr
                              ───────────────
                              domain kısmı

DB sorgusu: SELECT * FROM customers 
            WHERE 'akbank.com.tr' = ANY(email_domains)
            
Sonuç → Akbank müşterisi
```

> **RM Gözlemi:**
> 1. **Çoklu domain:** Bir müşterinin birden fazla domain'i olabilir (ör: `akbank.com.tr`, `akbank.com`). Bu yüzden `emailDomain` → `emailDomains` (array) olacak.
> 2. **Domain çakışması:** İki müşteri aynı domain'i paylaşamaz — DB'de unique constraint gerekli (array elemanları bazında).
> 3. **Eşleşme bulunamazsa:** Kullanıcı login olabilir ama müşteri portalına erişemez — "Müşteri kaydınız bulunamadı" mesajı.

### 3.2 Talep Yönetim Sistemi (Ticket Source)

Müşterinin kendi iç talep/destek yönetimi için kullandığı platform. Amaç: Müşteriden gelen talepleri otomatik olarak kurumun kendi iş yönetim aracına (Azure DevOps / GitHub Issues) aktarmak.

```
Müşteri Tarafı                        Kurum Tarafı
─────────────                        ────────────
Zendesk      ─┐                    ┌─ Azure DevOps Work Items
Jira         ─┤                    │  (Area Path ile müşteriye eşleme)
Pusula       ─┼──→ ReleaseHub360 ──┤
ServiceNow   ─┤   (n8n workflow)   │
Diğer        ─┘                    └─ GitHub Issues
                                      (Label + Repository ile eşleme)
```

#### Ticket Platform Bilgileri

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `ticketPlatform` | enum | — | `ZENDESK` \| `JIRA` \| `PUSULA` \| `SERVICENOW` \| `OTHER` |
| `ticketPlatformUrl` | string | — | Platform API/UI adresi (ör: `https://akbank.zendesk.com`) |
| `ticketApiToken` | string (encrypted) | — | API erişim token'ı — PAT kuralları geçerli |
| `ticketProjectKey` | string | — | Platform'daki proje/kuyruk tanımlayıcısı (ör: Jira'da `EFAT`, Zendesk'te grup ID) |

> **RM Notu:** Tüm ticket alanları opsiyonel — her müşteri bu entegrasyonu kullanmak zorunda değil. Entegrasyon aktif olduğunda n8n workflow'u bu bilgileri okuyarak talepleri çeker ve hedefe yazar.

#### Platform-Spesifik Alanlar

| Platform | `ticketProjectKey` ne olur | Ek bilgi |
|----------|---------------------------|----------|
| **Zendesk** | Group ID veya View ID | Ticket status mapping gerekebilir |
| **Jira** | Project Key (ör: `EFAT`) | JQL filtresi opsiyonel olarak eklenebilir |
| **Pusula** | Proje/modül adı | Kuruma özel API — dökümantasyon gerekir |
| **ServiceNow** | Assignment Group | REST API table name: `incident` veya `request` |
| **Other** | Custom identifier | Webhook/API endpoint ayrıca tanımlanabilir |

### 3.3 Talep Hedefi — Kurumun İş Yönetim Aracı

Müşteriden gelen talepler kurumun kendi DevOps aracına aktarılır. Hedef, ürünün `sourceControlType` değerine bağlıdır.

#### Hedef: Azure DevOps (`sourceControlType = AZURE`)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `targetAreaPath` | string | ✅ | Work item'ın oluşturulacağı alan yolu (ör: `EFatura\Müşteriler\Akbank`) |
| `targetIterationPath` | string | — | Varsayılan iteration (sprint) yolu (ör: `EFatura\Sprint 42`) |
| `targetWorkItemType` | string | — | Oluşturulacak iş öğesi tipi (default: `Bug`) — `Bug` \| `Task` \| `User Story` \| `Feature` |
| `targetTags` | string[] | — | Otomatik eklenecek etiketler (ör: `["müşteri-talebi", "akbank"]`) |

> **Area Path neden önemli?** Azure DevOps'ta area path, iş öğelerini organize etmenin temel yoludur. Her müşteri için ayrı alan tanımlamak → filtreleme, raporlama ve erişim kontrolünü mümkün kılar.

#### Hedef: GitHub (`sourceControlType = GITHUB`)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `targetRepo` | string | ✅ | Issue'ların oluşturulacağı repository adı (ör: `efatura-issues`) |
| `targetLabels` | string[] | — | Otomatik eklenecek label'lar (ör: `["customer-request", "akbank"]`) |
| `targetProjectId` | string | — | GitHub Projects board ID (issue'ları otomatik board'a eklemek için) |
| `targetMilestone` | string | — | Varsayılan milestone adı (opsiyonel) |

### 3.4 Talep Aktarım Akışı (Detay)

```
1. n8n workflow tetiklenir (zamanlı polling veya webhook)
       │
       ▼
2. Müşterinin ticket platformuna bağlan
   (ticketPlatformUrl + ticketApiToken + ticketProjectKey)
       │
       ▼
3. Yeni/güncellenen ticket'ları çek
   (son sync tarihinden sonraki kayıtlar)
       │
       ▼
4. Ticket → Work Item dönüşümü
   ├── Başlık: ticket.subject
   ├── Açıklama: ticket.description (HTML → Markdown)
   ├── Kaynak: "[Zendesk #12345] via ReleaseHub360"
   └── Etiketler: targetTags + müşteri kodu
       │
       ▼
5. Hedefe yaz:
   ├── Azure DevOps: POST work items → Area Path = targetAreaPath
   └── GitHub: POST issues → Repo = targetRepo, Labels = targetLabels
       │
       ▼
6. Eşleme kaydı oluştur (duplicate önleme)
   ticketExternalId ↔ workItemId (veya issueNumber)
```

> **RM Gözlemi — Dikkat Edilecek Noktalar:**
>
> 1. **Duplicate önleme:** Aynı ticket iki kez aktarılmamalı. `externalTicketId → workItemId` eşleme tablosu şart.
> 2. **Çift yönlü sync:** İlk fazda tek yönlü (müşteri → kurum) yeterli. Çift yönlü sync (kurum notları → müşterinin Zendesk'ine) çok daha karmaşık — **out of scope (v1)**.
> 3. **Rate limiting:** Zendesk/Jira API'leri rate limit uygular. n8n workflow'unda batch size kontrolü gerekli.
> 4. **Credential rotation:** Token'lar expire edebilir. Süresi dolan token için uyarı mekanizması olmalı.

### 3.5 Diğer Müşteri Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `approverEmails` | string[] | Release onayı verecek müşteri tarafı kişiler |
| `devOpsEmails` | string[] | Teknik iletişim için müşteri DevOps ekibi |
| `supportSuffix` | string | Destek referans kodu eki (ör: ticket numarası prefix'i) |

---

## Mevcut Durum vs Hedef — Customer

| Alan | Mevcut (DB/Schema) | Hedef | Gap |
|------|---------------------|-------|-----|
| `name` | ✅ var | ✅ | — |
| `code` | ✅ var (unique) | ✅ | — |
| `tenantName` | ✅ var (nullable) | ✅ (**zorunlu**) | 🟡 NOT NULL yapılacak |
| `emailDomain` (→ `emailDomains`) | ✅ var (tek string, nullable) | ✅ string[] (**zorunlu**) | 🟡 Tekil → array, NOT NULL |
| `contactEmail` | ✅ var | ✅ | — |
| `contactPhone` | ✅ var | ✅ | — |
| `address` | ✅ var | ✅ | — |
| `notes` | ✅ var | ✅ | — |
| `isActive` | ✅ var | ✅ | — |
| `approverEmails` | ✅ var (string[]) | ✅ | — |
| `devOpsEmails` | ✅ var (string[]) | ✅ | — |
| `supportSuffix` | ✅ var | ✅ | — |
| `azureReleaseTemplate` | ✅ var | ✅ **Kalacak** | Release adımlarını onaylama veri yapısı (şimdilik pasif, ileride aktif) |
| `environments` | ✅ var (string[]) | 🟡 **CustomerProductMapping'e taşınacak** | Her ürün için farklı ortamlar olabilir → ürün-müşteri ilişkisinde tutulmalı |
| `ticketPlatform` | ❌ yok | ✅ enum | 🟡 Yeni alan |
| `ticketPlatformUrl` | ❌ yok | ✅ | 🟡 Yeni alan |
| `ticketApiToken` | ❌ yok | ✅ (encrypted) | 🟡 Yeni alan + şifreleme |
| `ticketProjectKey` | ❌ yok | ✅ | 🟡 Yeni alan |
| `targetAreaPath` | ❌ yok | ✅ (Azure hedef) | 🟡 Yeni alan |
| `targetIterationPath` | ❌ yok | opsiyonel (Azure) | 🟡 Yeni alan |
| `targetWorkItemType` | ❌ yok | opsiyonel (Azure) | 🟡 Yeni alan |
| `targetTags` | ❌ yok | opsiyonel | 🟡 Yeni alan |
| `targetRepo` | ❌ yok | ✅ (GitHub hedef) | 🟡 Yeni alan |
| `targetLabels` | ❌ yok | opsiyonel (GitHub) | 🟡 Yeni alan |
| `targetProjectId` | ❌ yok | opsiyonel (GitHub) | 🟡 Yeni alan |
| `targetMilestone` | ❌ yok | opsiyonel (GitHub) | 🟡 Yeni alan |

### Yapılması Gerekenler

1. **emailDomain → emailDomains:** Tekil string → string array, NOT NULL + domain uniqueness kontrolü
2. **tenantName NOT NULL:** Zorunlu hale getir
3. **Ticket platform alanları:** `ticketPlatform` enum + URL + API token (encrypted) + project key
4. **Azure hedef alanları:** `targetAreaPath` + `targetIterationPath` + `targetWorkItemType` + `targetTags`
5. **GitHub hedef alanları:** `targetRepo` + `targetLabels` + `targetProjectId` + `targetMilestone`
6. **Ticket eşleme tablosu:** `TicketMapping` entity (externalTicketId ↔ workItemId) — duplicate önleme
7. **n8n workflow:** Ticket çekme + dönüştürme + hedefe yazma akışı tasarlanacak
8. **environments kaldır:** Customer'dan sil → CustomerProductMapping'e taşı (Section 4.6)

---

## 4. CustomerProductMapping (Müşteri–Ürün İlişkisi)

Bir müşterinin hangi ürünleri satın aldığını, hangi servis/API’leri kullandığını, nasıl güncelleneceğini ve hangi ortamlara sahip olduğunu tanımlayan kritik entity.

### 4.1 Temel İlişki

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `customerId` | FK → Customer | ✅ | Müşteri |
| `productId` | FK → Product | ✅ | Satın alınan ürün |
| `artifactType` | enum | ✅ | Bu müşterinin kullandığı dağıtım tipi: `DOCKER` \| `BINARY` \| `GIT_SYNC` — Product'ın `supportedArtifactTypes` array'inden biri olmalı |
| `isActive` | boolean | ✅ | Aktif/pasif (default: true) |
| `notes` | string | — | Ek notlar |

> **Not:** Mevcut schema’da `CustomerProductMapping` → `productVersionId` ile ilişkilendirilmiş. Yeni tasarımda **ürüne** bağlanır, versiyon bilgisi ayrı bir yönetim katmanında tutulur (ProductVersion → ileride).

### 4.2 Granular Servis Aboneliği

Müşteri bir ürünü farklı seviyelerde satın alabilir:

```
Seviye 1: Tüm ürün                  → Product’ın altındaki her şey dahil
Seviye 2: Belirli ModuleGroup’lar    → Seçilen grup altındaki tüm modüller + servisler
Seviye 3: Belirli Module’ler         → Seçilen modülün servisleri
Seviye 4: Belirli Service/API’ler    → Sadece işaretlenen servisler
```

#### Abonelik Veri Yapısı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `subscriptionLevel` | enum | ✅ | `FULL_PRODUCT` \| `MODULE_GROUP` \| `MODULE` \| `SERVICE` |
| `subscribedModuleGroupIds` | string[] | koşullu | `MODULE_GROUP` seçildiğinde: dahil olan ModuleGroup ID’leri |
| `subscribedModuleIds` | string[] | koşullu | `MODULE` seçildiğinde: dahil olan Module ID’leri |
| `subscribedServiceIds` | string[] | koşullu | `SERVICE` seçildiğinde: dahil olan Service ID’leri |

**Resolve Logic — Müşterinin Efektif Servis Listesi:**

```
switch (subscriptionLevel) {
  case FULL_PRODUCT:
    return product.allServices()   // tüm hiyerarşideki servisler

  case MODULE_GROUP:
    return subscribedModuleGroupIds
      .flatMap(mg => mg.modules)
      .flatMap(m => m.services)

  case MODULE:
    return subscribedModuleIds
      .flatMap(m => m.services)

  case SERVICE:
    return subscribedServiceIds     // doğrudan servis listesi
}
```

> **RM Gözlemi:** Günün sonunda her işlem (HelmChart üretme, DLL paketleme, versiyon kontrolü) Service/API seviyesine iner. Bu resolve logic backend’de utility fonksiyon olmalı — her yerde tekrar yazılmamalı.

### 4.3 Deployment Modeli

Müşterinin ürünü nasıl kullandığını belirler.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `deploymentModel` | enum | ✅ | `SAAS` \| `ON_PREM` |
| `hostingType` | enum | koşullu | `ON_PREM` ise: `IAAS` \| `SELF_HOSTED` |

#### Deployment Modeli Kararları

```
deploymentModel = SAAS
  → Kurum yönetiyor
  → Customer Dashboard: genel bilgi + "Güncelleme Talep Et" butonu
  → Artifact dağıtımı müşteriye açık değil

deploymentModel = ON_PREM
  └─ hostingType = IAAS
  │    → Kurum altyapısında ama müşteriye ayrılmış ortam
  │    → HelmChart/DLL kurum tarafında yönetilir
  │    → Müşteri onaylar → kurum deploy eder
  │
  └─ hostingType = SELF_HOSTED
       → Müşteri kendi altyapısında çalıştırıyor
       → Portaldan artifact (HelmChart/DLL) download eder
       → Kendi deploy eder
```

### 4.4 Artifact Dağıtımı (Müşterinin `artifactType` Seçimine Göre)

Her `CustomerProductMapping` kaydında müşterinin hangi artifact tipiyle hizmet aldığı belirlidir. Dağıtım akışı bu seçime göre işler.

#### `artifactType = DOCKER` → HelmChart Akışı

##### Senaryo A: IaaS (Kurum Yönetiyor)

```
1. Yeni versiyon hazır → Müşteri Dashboard’da bildirim
       │
       ▼
2. Müşteri versiyonu + hedef ortamı onaylar
       │
       ▼
3. Backend: Müşterinin efektif servis listesine göre HelmChart üret
   ├── subscribedServices.forEach(svc => {
   │     values.yaml’a image: svc.dockerImageName + tag: version ekle
   │   })
   └── HelmChart kurum içi repo’ya push edilir
       │
       ▼
4. Kurum DevOps ekibi deploy eder (otomatik veya manuel)
       │
       ▼
5. Deployment durumu Customer Dashboard’a yansır
```

##### Senaryo B: Self-Hosted (Müşteri Download Eder)

```
1. Yeni versiyon hazır → Müşteri Dashboard’da bildirim
       │
       ▼
2. Müşteri "HelmChart İndir" butonuna tıklar
       │
       ▼
3. Backend: Müşterinin efektif servis listesine göre HelmChart üret
   ├── subscribedServices → values.yaml üretimi
   ├── HelmChart zip olarak paketlenir
   └── Download link’i döner (geçici URL, süreli)
       │
       ▼
4. Müşteri kendi K8s/OpenShift’ine deploy eder
```

**HelmChart İlgili Ek Alanlar (Örün-Müşteri Seviyesinde):**

| Alan | Tip | Açıklama |
|------|-----|----------|
| `helmChartTemplateName` | string | Şablon chart adı (base template — kurum tarafında yönetilir) |
| `helmValuesOverrides` | JSON | Müşteriye özel override’lar (resource limits, ingress, vs.) |
| `helmRepoUrl` | string | IaaS için: chart’ın push edileceği Helm repo URL’i |

#### `artifactType = BINARY` → DLL/Binary Download Akışı

```
1. Yeni versiyon hazır → Müşteri Dashboard’da bildirim
       │
       ▼
2. Müşteri "Güncelleme Paketini İndir" butonuna tıklar
       │
       ▼
3. Backend: Müşterinin efektif servis listesine göre paket üret
   ├── subscribedServices.forEach(svc => {
   │     svc.binaryArtifacts.forEach(dll => zip’e ekle)
   │   })
   ├── Klasör yapısı: /{ModuleGroup}/{Module}/{Service}/dll’ler
   └── ZIP dosyası + README (kurulum notları) döner
       │
       ▼
4. Müşteri indirip kendi VM’lerine deploy eder
```

> **RM Notu — Kurulum Adımları:** ZIP içine otomatik README eklenmesi ileride detaylandırılacak (kurulum script’i, servis restart talimatı vs.). Şimdilik kapsam dışı.

#### `artifactType = GIT_SYNC` → Kaynak Kod Senkronizasyonu

GIT_SYNC'te artifact dağıtımı yoktur — müşteriye kaynak kod doğrudan Git üzerinden taşınır. Ancak **hangi versiyonun kodu** taşınacağının belirlenmesi ve taşıma işleminin yönetilmesi gerekir.

##### Kaynak Referansı Seçimi (Customer Dashboard)

Müşterinin dashboard'unda, yeni bir versiyon hazır olduğunda **kaynak referans bilgisi** gösterilir. Referans tipi Product'ın branch stratejisine bağlıdır:

```
Product.usesReleaseBranches = true
  → Dashboard'da mevcut release branch'ler listelenir
  → Müşteri veya kurum "Bu branch'i sync et" seçer
  → Kaynak: release/v2.5.0

Product.usesReleaseBranches = false
  → Dashboard'da mevcut tag'ler listelenir
  → Müşteri veya kurum "Bu tag'i sync et" seçer
  → Kaynak: v2.5.0
```

| Branch Stratejisi | Dashboard Gösterim | Seçim Davranışı |
|-------------------|--------------------|-----------------|
| `usesReleaseBranches = true` | Release branch listesi (dropdown) | Kaynak branch seçilir → Code Sync tetiklenir |
| `usesReleaseBranches = false` | Tag listesi (dropdown) | Kaynak tag seçilir → Code Sync tetiklenir |

##### Customer Dashboard — GIT_SYNC Görünümü

```
┌─────────────────────────────────────────────────────┐
│  E-Fatura Platformu — İş Bankası (GIT_SYNC)        │
│                                                     │
│  Mevcut Versiyon: v2.4.0                            │
│  Son Sync: 2025-11-15 14:30                         │
│                                                     │
│  ─────────────────────────────────────               │
│  🆕 Yeni Versiyon Mevcut: v2.5.0                    │
│                                                     │
│  Kaynak: [release/v2.5.0 ▾]  ← branch/tag dropdown │
│  Değişiklik Özeti: 14 PR, 3 yeni modül              │
│                                                     │
│  [ 🔄 Code Sync Başlat ]    [ 📋 Değişiklikleri Gör ]│
│                                                     │
└─────────────────────────────────────────────────────┘
```

##### Code Sync Arayüzü (İleride Detaylandırılacak)

"Code Sync Başlat" butonuna tıklandığında açılacak arayüz, ayrı bir ekran/modül olarak tasarlanacaktır. Kabaca:

```
Code Sync Akışı (high-level):
  1. Kaynak referans seçildi (release branch veya tag)
  2. Hedef: müşterinin branch'i (CustomerBranch entity'sinden)
  3. Conflict analizi → AI destekli çözüm önerisi
  4. İnsan onayı (otomatik merge yok)
  5. Cherry-pick / merge işlemi
  6. Sync sonucu → audit log

Bu akışın detayları ayrı bir tasarım bölümünde ele alınacak.
(Bkz: Code Sync modülü — ileride Section X olarak eklenecek)
```

> **RM Notu — DOCKER / BINARY ile Fark:**
> DOCKER ve BINARY'de müşteri build artifact'ını (image veya DLL) alır — kaynak kodla işi yoktur.
> GIT_SYNC'te ise müşteri doğrudan kaynak koda sahiptir ve aktif bir senkronizasyon süreci gerektirir.
> Bu nedenle GIT_SYNC müşterileri için Customer Dashboard'da ek bilgi (kaynak referans, son sync tarihi, conflict durumu) gösterilir.

> **RM Notu — Referans Listesi Nereden Gelir?**
> Release branch / tag listesi Azure DevOps veya GitHub API'sinden runtime'da çekilir (Product'ın source control bilgileriyle). Backend endpoint: `GET /api/products/:id/git-references?type=branches|tags`

### 4.5 Customer Dashboard Davranışı (deploymentModel’e göre)

| Durum | Dashboard Görünüm | Aksiyonlar |
|-------|---------------------|------------|
| **SaaS** | Ürün bilgisi + mevcut versiyon + değişiklik özeti | "✅ Güncelsiniz" veya "Güncelleme Talep Et" butonu |
| **OnPrem — IaaS** | Mevcut versiyon + yeni versiyon bilgisi + değişiklikler | "Versiyonu Onayla" butonu → kurum deploy eder |
| **OnPrem — Self-Hosted** | Mevcut versiyon + yeni versiyon + değişiklikler | "HelmChart İndir" veya "Güncelleme Paketi İndir" butonu |

### 4.6 Ortamlar (Environments — Ürün-Müşteri Seviyesi)

Her müşterinin her ürünü için farklı ortamları olabilir. Bu bilgi `CustomerProductMapping` seviyesinde tutulur.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `environments` | string[] | ✅ | Müşterinin bu ürün için kullandığı ortamlar (ör: `["Test", "Prod"]`) |

> **Neden Customer değil CustomerProductMapping?**
> Bir müşteri A ürünü için sadece "Prod" kullanabilirken, B ürünü için "Dev", "Test", "Prod" ortamlarına sahip olabilir. Ortam bilgisi ürün-müşteri ilişkisine özeldir.
>
> **Migration:** Mevcut `Customer.environments` verisi → o müşterinin tüm `CustomerProductMapping` kayıtlarına kopyalanır, ardından `Customer.environments` alanı kaldırılır.

---

## Mevcut Durum vs Hedef — CustomerProductMapping

| Alan | Mevcut (DB/Schema) | Hedef | Gap |
|------|--------------------|-------|-----|
| `customerId` | ✅ var | ✅ | — |
| `productVersionId` (→ `productId`) | ✅ var (FK → ProductVersion) | FK → **Product** | 🟡 İlişki değişecek |
| `branch` | ✅ var | ✅ | — |
| `environment` (→ `environments`) | ✅ var (tek string) | ✅ string[] | 🟡 Tekil → array |
| `notes` | ✅ var | ✅ | — |
| `isActive` | ❌ yok | ✅ | 🟡 Yeni alan |
| `subscriptionLevel` | ❌ yok | ✅ enum | 🟡 Yeni — granular abonelik |
| `subscribedModuleGroupIds` | ❌ yok | koşullu | 🟡 Yeni alan |
| `subscribedModuleIds` | ❌ yok | koşullu | 🟡 Yeni alan |
| `subscribedServiceIds` | ❌ yok | koşullu | 🟡 Yeni alan |
| `artifactType` | ❌ yok | ✅ enum (`DOCKER` \| `BINARY` \| `GIT_SYNC`) | 🟡 Yeni — müşterinin kullandığı tip (Product'tan validate) |
| `deploymentModel` | ❌ yok | ✅ enum (`SAAS` \| `ON_PREM`) | 🟡 Yeni alan |
| `hostingType` | ❌ yok | koşullu enum (`IAAS` \| `SELF_HOSTED`) | 🟡 Yeni alan |
| `helmChartTemplateName` | ❌ yok | opsiyonel (DOCKER) | 🟡 Yeni alan |
| `helmValuesOverrides` | ❌ yok | opsiyonel (DOCKER) | 🟡 Yeni alan |
| `helmRepoUrl` | ❌ yok | opsiyonel (DOCKER + IAAS) | 🟡 Yeni alan |
| `lastSyncDate` | ❌ yok | opsiyonel (GIT_SYNC) | 🟡 Yeni — son senkronizasyon tarihi |
| `lastSyncRef` | ❌ yok | opsiyonel (GIT_SYNC) | 🟡 Yeni — son sync edilen branch/tag adı |
| CustomerServiceMapping (ayrı tablo) | ✅ var | 🔴 **Kaldırılacak** | Abonelik artık CustomerProductMapping içinde |

### Yapılması Gerekenler

1. **İlişki değişikliği:** `productVersionId` → `productId` (FK → Product). Versiyon takibi ayrı entity’de.
2. **Granular abonelik:** `subscriptionLevel` enum + seviyeye göre ID array’leri
3. **Resolve utility:** `getEffectiveServices(customerProductMapping)` backend utility fonksiyonu
4. **Deployment model:** `deploymentModel` + `hostingType` enum’ları
5. **HelmChart alanları:** `helmChartTemplateName` + `helmValuesOverrides` + `helmRepoUrl`
6. **HelmChart üretim API’si:** Efektif servis listesi → values.yaml üretimi → ZIP
7. **DLL paketleme API’si:** Efektif servis listesi → artifact toplama → ZIP
8. **Ortam taşıma:** `Customer.environments` → `CustomerProductMapping.environments` (migration + alan kaldırma)
9. **CustomerServiceMapping kaldır:** Ayrı tablo yerine abonelik CustomerProductMapping içinde
10. **Customer Dashboard:** artifactType + deploymentModel'e göre farklı buton/aksiyon gösterimi
11. **artifactType validasyonu:** CPM kaydedilirken `artifactType` değeri Product'ın `supportedArtifactTypes` içinde olmalı — backend constraint
12. **Git referans API'si:** `GET /api/products/:id/git-references?type=branches|tags` — Azure DevOps / GitHub API'sinden release branch veya tag listesi çekme
13. **Code Sync entegrasyonu:** GIT_SYNC müşterileri için Customer Dashboard'dan Code Sync modülüne geçiş butonu + tetikleme API'si (ileride detaylandırılacak)
14. **Son sync bilgisi:** GIT_SYNC müşterileri için `lastSyncDate`, `lastSyncRef` (son sync edilen branch/tag) alanları
---

## 5. Release Calendar & ProductVersion (Yayın Takvimi & Ürün Versiyonu)

Her ürünün kendi yayın takvimi vardır. Yeni versiyon tanımları bu takvim üzerinden yapılır. ProductVersion, ürünün yaşam döngüsünün temel birimi — müşteri güncellemeleri, release notes, health check ve artifact dağıtımı bu entity etrafında döner.

### 5.1 Temel Bilgiler

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `productId` | FK → Product | ✅ | Ait olduğu ürün |
| `version` | string (unique per product) | ✅ | Semantik versiyon: `v1.0.0`, `v2.3.1` |
| `status` | enum | ✅ | Versiyonun mevcut durumu (bkz. 5.2) |
| `devStartDate` | DateTime | — | Geliştirmeye başlama tarihi (planlanan) |
| `testStartDate` | DateTime | — | Teste başlama tarihi (planlanan) |
| `releaseDate` | DateTime | — | Yayınlama tarihi (planlanan) |
| `actualReleaseDate` | DateTime | — | Gerçekleşen yayınlama tarihi (status=RELEASED olduğunda set edilir) |
| `description` | string | — | Versiyon açıklaması / sprint hedefi özeti |
| `isHotfix` | boolean | ✅ | Hotfix versiyonu mu? (default: false) |
| `createdBy` | string | — | Oluşturan kullanıcı |

#### Semantik Versiyonlama Kuralı

```
vMAJOR.MINOR.PATCH

v1.0.0 → İlk yayın
v1.1.0 → Yeni özellik (minor)
v1.1.1 → Bug fix (patch)
v2.0.0 → Breaking change / büyük sürüm (major)
```

> **Validasyon:** Versiyon formatı `v` prefix'i ile başlamalı, `MAJOR.MINOR.PATCH` yapısına uymalı. Backend'de regex ile doğrulanır: `/^v\d+\.\d+\.\d+$/`
>
> **Unique constraint:** Aynı Product altında aynı versiyon numarası olamaz → `@@unique([productId, version])`

### 5.2 Durum Makinesi (Status)

Versiyonun yaşam döngüsünü yöneten basit ve explicit durum akışı:

```
PLANNED ──→ IN_DEVELOPMENT ──→ TESTING ──→ RELEASED ──→ DEPRECATED
   │                                           ▲
   │         (Hotfix kısa yol)                 │
   └───────────────────────────────────────────┘
```

| Status | Türkçe | Renk (Chip) | Açıklama |
|--------|--------|-------------|----------|
| `PLANNED` | Başlanmadı | default (gri) | Versiyon oluşturuldu, henüz geliştirme başlamadı |
| `IN_DEVELOPMENT` | Geliştiriliyor | info (mavi) | Aktif geliştirme süreci devam ediyor |
| `TESTING` | Test Ediliyor | warning (turuncu) | Geliştirme tamamlandı, test sürecinde |
| `RELEASED` | Yayınlandı | success (yeşil) | Production'a çıktı, müşteriler kullanabilir |
| `DEPRECATED` | Kullanım Dışı | error (kırmızı) | Hiçbir müşteri kullanmıyor, arşivlenmiş |

#### Geçiş Kuralları

| Mevcut Durum | İzin Verilen Geçişler | Koşul |
|--------------|----------------------|-------|
| `PLANNED` | → `IN_DEVELOPMENT` | Manuel (tarih uyarısı ile) |
| `IN_DEVELOPMENT` | → `TESTING` | Manuel (tarih uyarısı ile) |
| `TESTING` | → `RELEASED` | Release Health Check ekranından "Release'i Yayınla" butonu |
| `RELEASED` | → `DEPRECATED` | Manuel — hiçbir müşteri bu versiyonu kullanmıyorsa |
| `DEPRECATED` | *geri dönüş yok* | Final durum |

**Geri Gidiş Yok:** `RELEASED → TESTING` veya `TESTING → IN_DEVELOPMENT` geçişi geçerli değil. Bir hata bulunursa yeni versiyon (hotfix) oluşturulur.

**Hotfix Kısa Yol:** `isHotfix = true` olan versiyonlar `PLANNED → RELEASED` doğrudan geçiş yapabilir (acil durumlarda test atlama). Ancak bu yine `Release Health Check` ekranından tetiklenir.

> **RM Gözlemi — Neden RC / STAGING yok?**
> Mevcut UX tasarımında `PLANNED → DEVELOPMENT → RC → STAGING → PRODUCTION → ARCHIVED` şeklinde 6 aşamalı bir akış var. Ancak iş gerçeği şu: ekip bu kadar granüler ayrımı takip etmiyor. RC ve Staging teknik deployment kavramları — versiyon yönetimi açısından "test ediliyor" yeterli. Release Manager'ın bilmesi gereken: başlandı mı, test ediliyor mu, çıktı mı.
>
> Teknik deployment aşamaları (hangi stage'e deploy edildi) → **Service seviyesinde** runtime bilgisi olarak takip edilir (Section 2.3 — `prodStageName`, `prepStageName`), versiyon durum makinesini karmaşıklaştırmamalı.

### 5.3 Tarih Bazlı Uyarı Sistemi

Durum güncellemeleri **manuel** yapılır, ancak sistem planlanan tarihlere göre kullanıcıyı **uyarır**. Bu tasarım bilinçli: otomatik durum değişikliği, ekibin farkında olmadan status kaymasına neden olabilir.

#### Uyarı Senaryoları

| Koşul | Mevcut Status | Uyarı Mesajı | Seviye |
|-------|---------------|--------------|--------|
| `devStartDate` ≤ bugün | `PLANNED` | ⚠️ "Geliştirme başlama tarihi geldi. Durumu 'Geliştiriliyor' olarak güncellemek ister misiniz?" | Warning |
| `testStartDate` ≤ bugün | `IN_DEVELOPMENT` | ⚠️ "Test başlama tarihi geldi. Durumu 'Test Ediliyor' olarak güncellemek ister misiniz?" | Warning |
| `releaseDate` ≤ bugün | `TESTING` | 🟢 "Yayınlama tarihi geldi. Version yayına hazır! Release Health Check ekranından yayınlayabilirsiniz." | Info |
| `releaseDate` < bugün - 7 gün | `TESTING` | 🔴 "Yayınlama tarihi 7+ gün geçti. Tarih güncellenmeli veya versiyon yayınlanmalı." | Error |
| `devStartDate` < bugün - 14 gün | `PLANNED` | 🔴 "Başlanmadı ama dev tarihi 2 hafta geçti. Plan güncellemesi gerekli." | Error |

#### Uyarı Gösterim Yerleri

```
1. Release Calendar liste satırında → status chip yanında ikon
   ┌──────────────────────────────────────────────────────────┐
   │  ⬛ PLANNED  ⚠️   E-Fatura    v2.5.0    01 Şub (geçti!) │
   └──────────────────────────────────────────────────────────┘

2. Drawer açıldığında → banner uyarı (MUI Alert)
   ┌────────────────────────────────────────┐
   │ ⚠️ Geliştirme başlama tarihi geldi!    │
   │ [Durumu Güncelle]  [Tarihi Değiştir]  │
   └────────────────────────────────────────┘

3. (İleride) E-posta bildirimi → tarih geldiğinde ilgili kullanıcılara mail
```

> **RM Notu — Notification Roadmap:**
> Şu an sadece ekran içi uyarı. İleride:
> - Tarih geldiğinde e-posta (n8n workflow ile)
> - Yaklaşan release'ler için 3 gün öncesinden hatırlatma
> - Overdue versiyonlar için günlük özet mail
> Bu özellikler ayrı task olarak planlanacak.

### 5.4 RELEASED Durumuna Geçiş — Release Health Check Entegrasyonu

Bir versiyonun `RELEASED` durumuna geçişi **doğrudan takvim ekranından yapılmaz**. Bu kritik geçiş, Release Health Check ekranından tetiklenir:

```
Release Calendar                     Release Health Check
──────────────                       ────────────────────
Versiyon: v2.5.0                     Health Score: 92%
Status: TESTING                      PR'lar: ✅ 14/14 merged
releaseDate: 01 Mar                  Testler: ✅ passed
                                     Release Notes: ✅ onaylı
     ── "Yayına Hazır" uyarısı ──    
     ── "Health Check'e Git →" ──    
                                     [ 🚀 Release'i Yayınla ]
                                            │
                                            ▼
                                     PATCH /api/product-versions/:id
                                     { status: "RELEASED",
                                       actualReleaseDate: now() }
```

**Neden Health Check'ten?**
- Release Manager yayın öncesi son kontrolleri yapmalı (PR durumu, test sonuçları, release notes)
- "Yayınla" aksiyonu bilinçli bir karar — takvimde kazara tıklama olmamalı
- Health Check ekranı zaten bu verinin toplandığı yer

**Takvimde "Yayınla" Yok:**
- Takvim ekranında `TESTING → RELEASED` geçiş butonu **gösterilmez**
- Bunun yerine `releaseDate` geldiğinde uyarı + "Release Health Check'e Git" linki gösterilir

### 5.5 DEPRECATED — Kullanım Dışı Versiyonlar

Hiçbir müşterinin artık kullanmadığı eski versiyonlar `DEPRECATED` olarak işaretlenebilir.

#### Deprecation Koşulları

```
v2.3.0 → RELEASED (6 ay önce)
  └── Bu versiyonu kullanan müşteri var mı?
      │
      ├── EVET → deprecate edilemez, uyarı: "3 müşteri hâlâ bu versiyonda"
      │         → Müşteri listesi gösterilir
      │
      └── HAYIR → "Deprecate Et" butonu aktif
                → Tıklanınca onay dialog:
                  "v2.3.0 kullanım dışı olarak işaretlenecek.
                   Bu işlem geri alınamaz. Emin misiniz?"
```

#### Deprecation Kontrol Sorgusu

```sql
SELECT COUNT(*) FROM customer_product_mappings cpm
JOIN product_versions pv ON pv.productId = cpm.productId
WHERE pv.id = :versionId
  AND cpm.isActive = true
  -- Müşterinin bu versiyonu kullanıp kullanmadığı:
  -- CustomerProductMapping → ProductVersion ilişkisi ileride
  -- Şu an productId bazında kontrol yeterli
```

> **RM Gözlemi — Deprecation ve CustomerProductMapping:**
> Mevcut tasarımda CPM `productId`'ye bağlı (Section 4.1), `productVersionId`'ye değil. Müşterinin hangi versiyonda olduğu bilgisi şu an CPM'de yok — ileride `currentVersionId` (FK → ProductVersion) alanı eklenebilir.
>
> Şimdilik deprecation kontrolü şu şekilde yapılabilir:
> - Eğer ürünün **bir sonraki RELEASED versiyonu** varsa ve tüm müşteriler o versiyona geçtiyse → eski versiyon deprecate edilebilir
> - Bu kontrol tam otomatik olmayabilir — Release Manager bakıp karar verir
> - Takvimde "0 müşteri" etiketi olan RELEASED versiyonlar görsel olarak vurgulanır

#### Deprecated Versiyonların Takvimde Gösterimi

- Varsayılan filtrede `DEPRECATED` versiyonlar **gizlenir** (checkbox: "Kullanım dışı versiyonları göster")
- Gösterildiğinde düşük opasite + strikethrough ile render edilir
- Deprecated versiyon üzerinde başka aksiyon yapılamaz (read-only)

### 5.6 Takvim Görünümleri

Release Calendar ekranı **ürün seçimi zorunlu** olarak açılır. Tüm ürünlerin versiyonlarını tek listede göstermek bilgi kirliliği yaratır — her ürünün kendi takvim ritmi, milestone'ları ve müşteri kitlesi farklıdır.

#### Ürün Seçimi — Obligatory Filter

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Yayın Takvimi                                                  [+ Yeni Versiyon] │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Ürün *  [E-Fatura Platformu ▾]  [Durum: Aktif ▾]  [☑ Kullanım dışını gizle]    │
│                                                               [≡ Liste] [📅]     │
├──────────────────────────────────────────────────────────────────────────────────┤
```

- Sayfa ilk açıldığında ürün seçili değilse → "Lütfen bir ürün seçin" boş state gösterilir
- URL parametresi: `/release-calendar?productId={id}` — doğrudan link ile ürün önceden seçili gelebilir
- Ürün değiştirildiğinde liste/takvim tamamen yenilenir
- "Tümü" seçeneği **yoktur** — kesinlikle tek ürün

> **RM Notu — Neden "Tümü" Yok?**
> Farklı ürünlerin versiyon numaraları ve takvim ritmi birbiriyle ilişkisiz. v2.5.0 E-Fatura'da bambaşka bir anlam taşırken E-Arşiv'de farklı. Karışık listelenmeleri karşılaştırma yapmayı da imkânsız kılar. Müşteri takvimi de ürün bazlı sunulacak (Section 5.11) — tutarlılık açısından kurum tarafı da öyle olmalı.

#### Liste Görünümü (Varsayılan)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Yayın Takvimi                                                  [+ Yeni Versiyon] │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Ürün * [E-Fatura ▾]  [Durum: Aktif ▾]  [☑ Kullanım dışını gizle] [≡ Liste] [📅]│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ Durum              Versiyon  Dev Start   Test Start  Yayın Tarihi  Müşteri       │
│ ──────────────────────────────────────────────────────────────────────────────── │
│ 🔵 Geliştiriliyor  v2.5.0   12 Şub      24 Şub      10 Mar        —            │
│                    ───────────────────────────────── [→ Test] [···]              │
│                                                                                  │
│ 🟠 Test Ediliyor   v2.4.1   01 Şub      15 Şub      27 Şub        —            │
│                    ─────── ⚠️ Yayın tarihi geçti! ── [Health Check →] [···]     │
│                                                                                  │
│ 🟢 Yayınlandı      v2.4.0   01 Ara 25   15 Ara 25   03 Oca 26     5 müşteri    │
│                    ──────────────────────────────────── [Deprecate] [···]        │
│                                                                                  │
│ 🟢 Yayınlandı      v2.3.0   01 Eyl 25   15 Eyl 25   01 Eki 25     0 müşteri   │
│                    ──────────────────────────────────── [Deprecate ✓] [···]      │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

> **Not:** Ürün sütunu kaldırıldı — zaten zorunlu filtre ile seçili. Yerine "Müşteri" sütunu eklendi (bu versiyonda kaç müşteri var).

#### Takvim Görünümü

Aylık grid üzerinde milestone tarihleri gösterilir:

| Event | Renk | Kaynak Alan |
|-------|------|-------------|
| Dev Başlangıcı | 🔵 Mavi | `devStartDate` |
| Test Başlangıcı | 🟡 Sarı | `testStartDate` |
| Hedef Yayın | 🟠 Turuncu | `releaseDate` |
| Gerçekleşen Yayın | 🟢 Yeşil | `actualReleaseDate` (sadece RELEASED) |

### 5.7 Drawer — Versiyon Detay / Düzenleme

```
┌────────────────────────────────────────┐
│ E-Fatura — v2.5.0                [✕]  │
│ ────────────────────────────────────── │
│                                        │
│ ⚠️ Geliştirme başlama tarihi geldi!    │
│ [Durumu Güncelle]  [Tarihi Değiştir]  │
│                                        │
│ ── Temel Bilgiler ──────────────────── │
│ Ürün         E-Fatura Platformu       │
│ Versiyon     v2.5.0                    │
│ Durum        ⬛ Başlanmadı              │
│ Hotfix       Hayır                     │
│                                        │
│ ── Milestone Tarihleri ─────────────── │
│                                        │
│ 🔵 Geliştirme Başlangıcı              │
│    [12/02/2026          ] ⚠️ geçti     │
│                                        │
│ 🟡 Test Başlangıcı                    │
│    [24/02/2026          ]              │
│                                        │
│ 🟠 Hedef Yayınlama                    │
│    [10/03/2026          ]              │
│                                        │
│ ── Açıklama ────────────────────────── │
│ [Sprint 14 hedefleri...            ]   │
│                                        │
│ ── İlgili Bilgiler ─────────────────── │
│ Oluşturan: admin                       │
│ Bu versiyonu kullanan müşteri: 0       │
│ Release Notes: 3 madde (taslak)        │
│                                        │
│ [  İptal  ]         [   Kaydet   ]     │
└────────────────────────────────────────┘
```

### 5.8 Yeni Versiyon Oluşturma

Ürün zaten zorunlu filtreden seçili olduğu için dialog'da tekrar ürün seçimi yoktur.

```
┌─────────────────────────────────────────┐
│ Yeni Versiyon Oluştur             [✕]  │
│ ─────────────────────────────────────── │
│ Ürün            E-Fatura Platformu     │
│                 (filtreden seçili)      │
│ Versiyon *      [v          ]          │
│                 Format: vX.Y.Z         │
│ Hotfix?         [ ] Evet               │
│ Açıklama        [               ]      │
│                                        │
│ ── Milestone Planlama (opsiyonel) ──── │
│ Dev Başlangıcı     [          ]        │
│ Test Başlangıcı    [          ]        │
│ Hedef Yayınlama    [          ]        │
│                                        │
│          [İptal]    [Oluştur]          │
└─────────────────────────────────────────┘
```

**Oluşturma sonrası:** Status otomatik olarak `PLANNED` atanır. Tarihler girilmişse takvim görünümünde hemen görünür.

### 5.9 İş Kuralları

| Kural | Açıklama |
|-------|----------|
| **Versiyon unique** | Aynı Product altında aynı `version` string'i olamaz |
| **Tarih sırası** | `devStartDate ≤ testStartDate ≤ releaseDate` — ihlal edilirse uyarı (bloklama değil) |
| **RELEASED tek kaynak** | `TESTING → RELEASED` geçişi yalnızca Release Health Check ekranından yapılır |
| **DEPRECATED geri dönüş yok** | Deprecate edilen versiyon tekrar aktifleştirilemez |
| **Deprecation kontrolü** | Aktif müşterisi olan versiyon deprecate edilemez |
| **Hotfix hızlı geçiş** | `isHotfix = true` → `PLANNED → RELEASED` direkt geçiş izni (Health Check'ten) |
| **Silme kısıtı** | `RELEASED` veya `DEPRECATED` statüsündeki versiyonlar silinemez |
| **actualReleaseDate** | Sadece `RELEASED` durumuna geçişte otomatik set edilir (now()) — manuel değiştirilemez |

### 5.10 GIT_SYNC Referansı — ProductVersion ile İlişki

GIT_SYNC tipli müşteriler için, her ProductVersion'da hangi branch veya tag üzerinden sync yapılacağı bilgisi tutulur (bkz. Section 1.3):

| Alan | Tip | Koşullu | Açıklama |
|------|-----|---------|----------|
| `gitSyncRef` | string | GIT_SYNC destekleniyorsa | Sync kaynak referansı (ör: `release/v2.5.0` veya `v2.5.0` tag) |
| `gitSyncRefType` | enum | GIT_SYNC destekleniyorsa | `BRANCH` \| `TAG` |

```
Product.usesReleaseBranches = true
  → Versiyon oluşturulurken gitSyncRef otomatik önerilir: "release/{version}"
  → Kullanıcı düzenleyebilir

Product.usesReleaseBranches = false
  → Versiyon oluşturulurken gitSyncRef otomatik önerilir: "{version}" (tag)
  → Kullanıcı düzenleyebilir
```

> **Koşullu Gösterim:** Bu alanlar yalnızca Product'ın `supportedArtifactTypes` array'inde `GIT_SYNC` varsa görünür.

### 5.11 Müşteri Takvim Görünümü — Customer Dashboard Entegrasyonu

Release Calendar yalnızca kurum içi bir araç değildir. Aynı takvim verileri **müşteriye de** sunulur — müşteri yayınlanan versiyonları görsün, upgrade planı yapsın, geçişini gerçekleştirdiğini bildirsin. Bu bölüm müşteri tarafını tanımlar; tam uygulama Customer Dashboard tasarımında ele alınacak.

#### Müşteriye Açılan Versiyon Bilgileri

Müşteri sadece `RELEASED` statüsündeki versiyonları (ve hazırlık aşamasındaki gelecek versiyonları — konfigüre edilebilir) görür:

| Status | Müşteriye Görünür mü? | Gösterim |
|--------|----------------------|----------|
| `PLANNED` | opsiyonel (kurum kararı) | 🔲 "Planlanıyor" — tarihler yaklaşık |
| `IN_DEVELOPMENT` | opsiyonel | 🔵 "Geliştiriliyor" — hedef tarih gösterilir |
| `TESTING` | opsiyonel | 🟠 "Test aşamasında" — yayına yakın |
| `RELEASED` | ✅ her zaman | 🟢 "Yayınlandı" — müşteri bu versiyona geçebilir |
| `DEPRECATED` | ❌ hayır | Gösterilmez |

> **RM Kararı — Visibility Policy:** Hangi statüslerin müşteriye açık olacağı **Product seviyesinde** konfigüre edilebilir. Bazı ürünlerde roadmap şeffaflığı istenir (PLANNED bile gösterilir), bazılarında sadece RELEASED paylaşılır. İlgili alan:

| Alan | Tip | Varsayılan | Açıklama |
|------|-----|------------|----------|
| `customerVisibleStatuses` | `ProductVersionStatus[]` | `[RELEASED]` | Product'ta tanımlanır — müşteriye hangi aşamalar gösterilsin |

#### Müşteri Dashboard — Versiyon Takvimi Görünümü

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  E-Fatura Platformu — Versiyon Takvimi                        Akbank (AKB)  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Mevcut Versiyonunuz: v2.4.0  ✅                                             │
│                                                                              │
│  ── Yeni Versiyonlar ────────────────────────────────────────────────────── │
│                                                                              │
│  🟢 v2.5.0 — Yayınlandı (01 Mar 2026)                                       │
│     Yenilikler: 14 PR, 3 yeni modül, 2 breaking change                      │
│     [📋 Release Notes]   [📅 Geçiş Planla]                                   │
│                                                                              │
│  🟠 v2.6.0 — Test aşamasında (Hedef: 15 Nis 2026)                           │
│     Yenilikler: 8 PR, performans iyileştirmeleri                             │
│     (Henüz planlanamaz — yayınlandığında bildirim alacaksınız)               │
│                                                                              │
│  ── Geçiş Geçmişi ──────────────────────────────────────────────────────── │
│                                                                              │
│  v2.3.0 → v2.4.0  |  12 Oca 2026  |  ✅ Tamamlandı                          │
│  v2.2.0 → v2.3.0  |  15 Eki 2025  |  ✅ Tamamlandı                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Müşteri Geçiş Planlama (Deployment Scheduling)

Müşteri yayınlanmış bir versiyona geçiş yapmak istediğinde tarih seçer. Bu planlama `CustomerVersionTransition` entity'si ile takip edilir:

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `id` | UUID | ✅ (auto) | Primary key |
| `customerProductMappingId` | FK → CPM | ✅ | Hangi müşteri-ürün ilişkisi |
| `fromVersionId` | FK → ProductVersion | ✅ | Mevcut versiyon |
| `toVersionId` | FK → ProductVersion | ✅ | Hedef versiyon (sadece `RELEASED` olanlar) |
| `plannedDate` | DateTime | ✅ | Planlanan geçiş tarihi |
| `status` | enum | ✅ | `PLANNED` \| `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED` |
| `completedDate` | DateTime | — | Müşteri "Geçişi Tamamladım" dediğinde set edilir |
| `notes` | string | — | Müşteri notu |
| `createdAt` | DateTime | ✅ (auto) | Kayıt tarihi |
| `updatedAt` | DateTime | ✅ (auto) | Son güncelleme |

**Unique constraint:** `[customerProductMappingId, toVersionId]` — aynı müşteri aynı versiyona birden fazla geçiş planı oluşturamaz.

##### Planlama Akışı

```
Müşteri Dashboard                             Backend
────────────────                             ────────
"📅 Geçiş Planla" tıklar
  → Tarih seçim dialog açılır
  → [15 Mart 2026] seçer
                                    ┌─ concurrentUpdatePolicy kontrolü
                                    │
                                    ├── BLOCK + aynı gün başka müşteri var?
                                    │     → ❌ "Bu tarihte başka bir müşteri
                                    │          geçişi zaten planlanmış.
                                    │          Lütfen farklı tarih seçin."
                                    │     → Dolu günler takvimde işaretli
                                    │
                                    ├── WARN + aynı gün başka müşteri var?
                                    │     → ⚠️ "Bu tarihte 2 müşteri daha
                                    │          geçiş planlamış. Devam
                                    │          etmek istiyor musunuz?"
                                    │     → [Devam Et] [Farklı Tarih Seç]
                                    │
                                    └── Çakışma yok
                                          → ✅ Geçiş planlandı
                                          → POST /api/customer-version-transitions

"✅ Geçişi Tamamladım" tıklar
  → Onay dialog: "v2.5.0'a geçişi tamamladığınızı onaylıyor musunuz?"
  → PATCH /api/customer-version-transitions/:id
    { status: "COMPLETED", completedDate: now() }
  → CPM.currentVersionId otomatik güncellenir → toVersionId
```

##### Concurrent Update Policy Detayı (Section 1.5 ile bağlantı)

Product'ın `concurrentUpdatePolicy` ayarı, müşterilerin aynı güne geçiş planlamasını kontrol eder:

```
Product: E-Fatura Platformu
concurrentUpdatePolicy: BLOCK

Takvim Kontrol Senaryosu:
  15 Mar → Akbank (v2.4.0 → v2.5.0) ✅ planlandı
  15 Mar → Garanti (v2.4.0 → v2.5.0) ❌ "Bu tarih dolu — farklı gün seçin"
  16 Mar → Garanti (v2.4.0 → v2.5.0) ✅ planlandı

──────────────────────────────────────────────

Product: E-Arşiv Sistemi
concurrentUpdatePolicy: WARN

Takvim Kontrol Senaryosu:
  15 Mar → İş Bankası (v1.1.0 → v1.2.0) ✅ planlandı
  15 Mar → Yapı Kredi (v1.1.0 → v1.2.0) ⚠️ "Aynı gün 1 müşteri daha var" → [Devam Et]
  15 Mar → Yapı Kredi ✅ planlandı (uyarıya rağmen devam etti)
```

> **RM Notu — Kapsam:** `concurrentUpdatePolicy` kontrolü **aynı product + aynı gün** bazında çalışır. Farklı product'lar birbirini etkilemez. Aynı product'ın farklı versiyonlarına geçiş yapan müşteriler de bu kontrole tabidir (çünkü aynı ürünün deploy altyapısı ortaktır).

##### Müşteri Takvim Görünümü — Tarih Seçim Dialog

```
┌──────────────────────────────────────────────────────────────┐
│  Geçiş Planla — E-Fatura v2.5.0                       [✕]  │
│                                                              │
│  Mevcut: v2.4.0 → Hedef: v2.5.0                            │
│                                                              │
│  ← Mart 2026 →                                              │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐        │
│  │  Pzt │  Sal │  Çar │  Per │  Cum │  Cmt │  Paz │        │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤        │
│  │  09  │  10  │  11  │  12  │  13  │  14  │  15  │        │
│  │      │      │      │      │      │      │ 🔴   │        │
│  │      │      │      │      │      │      │ dolu │        │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤        │
│  │  16  │  17  │  18  │  19  │  20  │  21  │  22  │        │
│  │ ✅   │      │      │      │ ✅   │      │      │        │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘        │
│                                                              │
│  🔴 Dolu (başka müşteri planlamış — BLOCK modunda)           │
│  ✅ Uygun                                                    │
│                                                              │
│  Seçilen tarih: [          ]                                │
│  Not:           [                        ]                  │
│                                                              │
│               [İptal]    [📅 Planla]                         │
└──────────────────────────────────────────────────────────────┘
```

> **RM Notu — Dolu Gün Gösterimi:**
> `BLOCK` modunda dolu günler kırmızı ve tıklanamaz. `WARN` modunda sarı uyarı ile gösterilir ama seçilebilir.
> Hangi müşterinin o gün planladığı bilgisi müşteriye **gösterilmez** (gizlilik) — sadece "dolu" veya "yoğun" bilgisi paylaşılır.

##### Kurum Tarafı — Geçiş Takvimi Yönetimi

Kurum (Release Manager) bu geçiş planlarını görebilir — Release Calendar'daki versiyon drawer'ında ek bir sekme olarak:

```
Release Calendar (Kurum Tarafı) — Drawer: v2.5.0
──────────────────────────────────────────────────

 [Detay]  [Müşteri Geçişleri]  [Health Check]

  ── Müşteri Geçiş Planları ─────────────────

  │ Tarih     │ Müşteri      │ Durum       │ Aksiyonlar │
  ├───────────┼──────────────┼─────────────┼────────────┤
  │ 15 Mar    │ Akbank       │ 📅 PLANNED  │ [···]      │
  │ 16 Mar    │ Garanti      │ 📅 PLANNED  │ [···]      │
  │ 20 Mar    │ İş Bankası   │ ✅ COMPLETED │            │
  │ —         │ Yapı Kredi   │ ⏳ Planlamadı│ [Hatırlat] │

  Toplam: 4 müşteri | 2 planlandı | 1 tamamlandı | 1 bekliyor
```

> **RM Notu — Hatırlat:** "Planlamadı" durumundaki müşteriye e-posta hatırlatma gönderilebilir. Bu n8n workflow ile otomatize edilebilir (ileride detaylandırılacak).

#### CPM'e Eklenen Alan — currentVersionId

Müşterinin hangi versiyonda olduğunu takip etmek için `CustomerProductMapping`'e yeni alan:

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `currentVersionId` | FK → ProductVersion | — | Müşterinin şu an kullandığı versiyon. Geçiş `COMPLETED` olduğunda otomatik güncellenir. |

> **RM Gözlemi — Deprecation bağlantısı:** Bu alan Section 5.5'teki deprecation kontrolünü de çözer. "Bu versiyonu hâlâ kullanan müşteri var mı?" sorusu artık direkt sorgulanabilir:
> ```sql
> SELECT COUNT(*) FROM customer_product_mappings
> WHERE currentVersionId = :versionId AND isActive = true
> ```

> **RM Gözlemi — İlk veri:** Mevcut müşterilerin `currentVersionId` alanı henüz boş olacak. İlk geçiş planı oluşturulduğunda `fromVersionId` olarak seçilen versiyon otomatik olarak `currentVersionId`'ye yazılır (eğer boşsa). Alternatif olarak migration script ile mevcut verilere elle atama yapılabilir.

---

## Mevcut Durum vs Hedef — ProductVersion & CustomerVersionTransition

| Alan | Mevcut (DB/Schema) | Hedef | Gap |
|------|--------------------|-------|-----|
| `productId` | ✅ var | ✅ | — |
| `version` | ✅ var | ✅ (semantik validasyon) | 🟡 Format validasyonu eklenecek |
| `phase` (→ `status`) | ✅ var (string: PLANNED, DEVELOPMENT, RC, STAGING, PRODUCTION, ARCHIVED) | Enum: `PLANNED` \| `IN_DEVELOPMENT` \| `TESTING` \| `RELEASED` \| `DEPRECATED` | 🔴 Durum makinesi tamamen değişiyor |
| `masterStartDate` (→ `devStartDate`) | ✅ var | ✅ | İsim değişikliği |
| `testDate` (→ `testStartDate`) | ✅ var | ✅ | İsim değişikliği |
| `preProdDate` | ✅ var | 🔴 **Kaldırılacak** | Pre-prod ayrı aşama değil, test kapsamında |
| `targetDate` (→ `releaseDate`) | ✅ var | ✅ | İsim değişikliği |
| `releaseDate` (→ `actualReleaseDate`) | ✅ var | ✅ (otomatik set) | Anlam değişikliği: planlanan → gerçekleşen |
| `actualReleaseDate` | ❌ yok | ✅ (RELEASED geçişinde set) | 🟡 Yeni alan |
| `description` | ✅ var | ✅ | — |
| `isHotfix` | ✅ var | ✅ | — |
| `notesPublished` | ✅ var | ✅ | — |
| `createdBy` | ✅ var | ✅ | — |
| `gitSyncRef` | ❌ yok | koşullu (GIT_SYNC) | 🟡 Yeni alan |
| `gitSyncRefType` | ❌ yok | koşullu enum | 🟡 Yeni alan |

**Product — Yeni alanlar (5.11):**

| Alan | Mevcut | Hedef | Gap |
|------|--------|-------|-----|
| `customerVisibleStatuses` | ❌ yok | `ProductVersionStatus[]` — müşteriye hangi aşamalar gösterilsin | 🟡 Yeni alan, varsayılan: `[RELEASED]` |

**CustomerProductMapping — Yeni alanlar (5.11):**

| Alan | Mevcut | Hedef | Gap |
|------|--------|-------|-----|
| `currentVersionId` | ❌ yok | FK → ProductVersion — müşterinin aktif versiyonu | 🔴 Yeni alan, deprecation kontrolünde kullanılır |

**CustomerVersionTransition — Yeni tablo (5.11):**

| Alan | Mevcut | Hedef | Gap |
|------|--------|-------|-----|
| `id` | ❌ yok | UUID PK | 🔴 Yeni tablo |
| `customerProductMappingId` | ❌ yok | FK → CPM | 🔴 |
| `fromVersionId` | ❌ yok | FK → ProductVersion | 🔴 |
| `toVersionId` | ❌ yok | FK → ProductVersion | 🔴 |
| `plannedDate` | ❌ yok | DateTime | 🔴 |
| `status` | ❌ yok | Enum: `PLANNED` \| `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED` | 🔴 |
| `completedDate` | ❌ yok | DateTime (nullable) | 🔴 |
| `notes` | ❌ yok | string (nullable) | 🔴 |

### Yapılması Gerekenler

1. **Durum makinesi yeniden tasarımı:** `phase` (6 aşama) → `status` (5 aşama). Migration: `DEVELOPMENT → IN_DEVELOPMENT`, `RC/STAGING → TESTING`, `PRODUCTION → RELEASED`, `ARCHIVED → DEPRECATED`
2. **Tarih alanı refaktörü:** `masterStartDate → devStartDate`, `testDate → testStartDate`, `targetDate → releaseDate`, `preProdDate` kaldır
3. **actualReleaseDate:** Yeni alan — RELEASED geçişinde otomatik `now()` set edilir
4. **Semantik versiyon validasyonu:** Backend'de `/^v\d+\.\d+\.\d+$/` regex kontrolü
5. **Tarih bazlı uyarı sistemi:** Frontend — versiyon listesinde tarih/durum karşılaştırması + uyarı ikonları + banner
6. **RELEASED geçiş kısıtı:** Takvim ekranından `→ Yayınla` butonu kaldır → Health Check'e yönlendirme
7. **Deprecation akışı:** Müşteri sayısı kontrolü + onay dialog + geri dönüşsüz geçiş
8. **Deprecation sorgusu API'si:** `GET /api/product-versions/:id/customer-count` — bu versiyonu kullanan aktif müşteri sayısı (artık `currentVersionId` ile direkt sorgulanır)
9. **GIT_SYNC alanları:** `gitSyncRef` + `gitSyncRefType` — koşullu (Product supportedArtifactTypes kontrolü)
10. **Mevcut UX tasarımı güncelleme:** `designs/screens/release-calendar.md` — phase chip'leri yeni status enum'una göre güncelle
11. **Notification sistemi (ileride):** Tarih geldiğinde e-posta bildirimi — n8n workflow ile (ayrı task)
12. **Takvim filtreleri:** Status bazlı filtre + "Kullanım dışını gizle" toggle
13. **CustomerVersionTransition tablosu:** Prisma schema'ya yeni model ekle — FK'lar (CPM, ProductVersion × 2), unique constraint `[customerProductMappingId, toVersionId]`
14. **Concurrent update policy backend validation:** `POST /api/customer-version-transitions` endpoint'inde `Product.concurrentUpdatePolicy` kontrolü — BLOCK modunda aynı gün + aynı product check
15. **CPM currentVersionId:** Yeni alan ekle + transition COMPLETED olunca otomatik güncelle
16. **Product customerVisibleStatuses:** Yeni alan ekle — varsayılan `[RELEASED]`, Product edit formunda konfigüre edilebilir
17. **Müşteri Dashboard versiyon takvimi API:** `GET /api/customers/:customerId/products/:productId/versions` — müşteriye görünür statüsleri filtrele
18. **Geçiş takvimi takvim doluluğu API:** `GET /api/products/:productId/transition-calendar?month=2026-03` — hangi günlerde kaç müşteri planlamış (müşteri bilgisi gizli)
19. **Migration script:** Mevcut müşterilerin `currentVersionId` alanını doldur (elle veya otomatik)

---

## 6. Release Health Check

Projenin en kritik karar destek ekranı. Bir versiyonun üretime çıkıp çıkamayacağını değerlendiren ve aynı anda aktif geliştirmeyi izleyen **ikili yapıda** bir sayfa.

### 6.1 Sayfa Amacı ve İkili Yapı

Bu sayfa iki eşzamanlı operasyonu barındırır. Bu operasyonlar birbirini takip eden fazlar değil — **aynı anda paralel yürüyen süreçlerdir:**

| Segment | Ad | Soru | Kim Kullanır | Versiyon Durumu |
|---------|----| -----|--------------|-----------------|
| 🛡️ **Yayın Hazırlığı** | Release Readiness | "Bu versiyon bugün üretime çıkabilir mi?" | Release Manager, PO, Team Lead | `TESTING` (veya `PLANNED` hotfix) |
| 🔧 **Geliştirme İzleme** | Development Tracking | "Aktif geliştirmede neler var, hangisi release'e dahil olabilir?" | Developer, Team Lead | `IN_DEVELOPMENT` |

#### Neden İki Ayrı Ekran Değil?

- **Aynı ürünü paylaşırlar.** Ürün seçimi ve "son yayınlanan versiyon" bilgisi ortaktır.
- **Birbirini beslerler.** Geliştirme İzleme'deki bir iş tamamlanıp teste geçtiğinde, Yayın Hazırlığı segmentinde görünür hale gelir.
- **Ama aynı anda görülmelerine gerek yok.** PO genelde readiness'a, developer genelde tracking'e bakar.

#### Neden Tab Değil?

Tab kalıcı bir navigasyon hissi verir — burada iki "görünüm modu" söz konusu. **Apple tarzı Segmented Control** doğru pattern:
- Sayfanın aynı olduğu, perspektifin değiştiği hissini verir
- URL'de state tutulur: `?segment=readiness` / `?segment=development`
- Kullanıcı tercihi localStorage'da saklanır (son seçimi hatırla)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Release Health Check                                       [🔄 Yenile]     │
│                                                                              │
│  Ürün *  [E-Fatura Platformu ▾]                                             │
│  Son yayınlanan: v2.4.0 (12 Oca 2026)                                       │
│                                                                              │
│  ┌───────────────────────────────────────────────┐                           │
│  │  🛡️ Yayın Hazırlığı  │  🔧 Geliştirme İzleme │  ← Segmented Control     │
│  └───────────────────────────────────────────────┘                           │
│                                                                              │
│  ── altında: seçilen segmente göre içerik değişir ──                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

> **RM Notu — Segment İsimlendirmesi:** "Tab" değil "Segment" terminolojisi kullanıyoruz. UX tarafında MUI `ToggleButtonGroup` veya özel Segmented Control bileşeni ile implement edilecek. Görsel olarak sayfanın üst kısmında iki seçenekli, köşeleri yuvarlak bir toggle bar.

### 6.2 Ortak Header — Ürün Seçimi ve Son Yayın Bilgisi

Header her iki segmentte de görünür. Sticky — scroll edilince sayfa üstünde kalır.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  STICKY HEADER                                                               │
│                                                                              │
│  Release Health Check                                       [🔄 Yenile]     │
│                                                                              │
│  Ürün *  [E-Fatura Platformu ▾]                                             │
│  Son yayınlanan: v2.4.0 — 12 Oca 2026                                       │
│                                                                              │
│  ┌────────────────────────────────────────────────┐                          │
│  │ 🛡️ Yayın Hazırlığı  │  🔧 Geliştirme İzleme  │                          │
│  └────────────────────────────────────────────────┘                          │
│                                                                              │
│  (segment'e göre ek seçiciler ve bilgiler burada devam eder)                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Alan | Açıklama |
|------|----------|
| **Ürün seçici** | Zorunlu. Sayfa açılışında boş gelir, ürün seçimi yapılmadan hiçbir veri yüklenmez. |
| **Son yayınlanan versiyon** | Ürün seçilince otomatik hesaplanır: `status = RELEASED` olanlar arasında `actualReleaseDate` en büyük olan. Yoksa "Henüz yayınlanmış versiyon yok" gösterilir. |
| **Segmented Control** | İki seçenekli toggle bar. Varsayılan: kullanıcının son tercihi (localStorage), yoksa "Yayın Hazırlığı". |
| **Yenile butonu** | Tüm TanStack Query cache invalidate eder. |

### 6.3 Zorunlu Başlangıç Versiyonu — Product Onboarding

Bu sistem devam eden ürünlerin release yönetimi için tasarlandı. Bir ürünün referans noktası olmadan takip başlayamaz.

**Kural:** Product oluşturulduğunda `v1.0.0` veya üstü bir başlangıç versiyonu eklenmesi **zorunludur**. Bu versiyon `RELEASED` statüsünde kaydedilir.

#### Product Oluşturma Wizard'ı — 2 Adımlı

```
┌─────────────────────────────────────────────────────┐
│  Yeni Ürün Oluştur                    Adım 1 / 2   │
│  ─────────────────────────────────────────────────── │
│                                                      │
│  Ürün Adı *          [                    ]         │
│  Açıklama            [                    ]         │
│  Source Control *    [AZURE ▾]                       │
│  Azure Org *         [                    ]         │
│  Azure Project *     [                    ]         │
│  Azure PAT *         [••••••••••••••••••••]         │
│  Release Project     [                    ]         │
│  Branch Stratejisi   [ ] Release branch kullan      │
│  Artifact Types *    [☑ DOCKER ☑ BINARY ☐ GIT_SYNC] │
│  Eşzamanlı Güncelleme [WARN ▾]                      │
│                                                      │
│                              [İptal]  [İleri →]     │
└─────────────────────────────────────────────────────┘

                         ↓

┌─────────────────────────────────────────────────────┐
│  Yeni Ürün Oluştur                    Adım 2 / 2   │
│  ─────────────────────────────────────────────────── │
│  🏁 Başlangıç Versiyonu                             │
│                                                      │
│  ℹ️ Bu versiyon ürünün şu anki production           │
│     versiyonudur. RELEASED olarak kaydedilir.       │
│     Tüm yeni versiyonlar bunun üzerine              │
│     oluşturulacak.                                   │
│                                                      │
│  Mevcut Versiyon *  [v         ]                    │
│                     Format: vX.Y.Z (min: v1.0.0)    │
│                                                      │
│  Yayınlanma Tarihi  [DD/MM/YYYY]                    │
│                     (opsiyonel — bilinmiyorsa         │
│                      bugünün tarihi atanır)          │
│                                                      │
│  Açıklama           [Başlangıç versiyonu         ]  │
│                                                      │
│                         [← Geri]  [Oluştur ✅]      │
└─────────────────────────────────────────────────────┘
```

**Oluşturma sonrası:**
1. Product kaydedilir
2. ProductVersion `{ version: "v1.0.0", status: "RELEASED", actualReleaseDate: <girilen tarih veya now()> }` olarak oluşturulur
3. Kullanıcı Ürün Kataloğu'na yönlendirilir

**İş Kuralları:**
- Versiyon `v0.x.x` kabul **edilmez** — minimum `v1.0.0` (bu ürünler production'da, pre-release değil)
- Bu versiyon silinemez (ürünün son RELEASED versiyonu her zaman korunur)
- Tarih girilmezse `actualReleaseDate = now()` atanır

> **RM Gözlemi — Neden zorunlu?**
> 1. `CustomerVersionTransition.fromVersionId` bir referans istiyor (Section 5.11)
> 2. Health Check "son yayınlanan versiyon" gösterecek — başlangıç noktası olmalı
> 3. Release Calendar boş bir ürünle anlamsız
> 4. `CPM.currentVersionId` müşteri eşleştirme için başlangıç versiyonu gerektirir
>
> Bu ürünler zaten live — bu sistem onların yönetim aracı. v1.0.0 olmadan "devam eden ürünü takip et" tasarımı temelden çöker.

### 6.4 Segment 1 — Yayın Hazırlığı (Release Readiness)

Bu segment "Bu versiyon bugün üretime çıkabilir mi?" sorusunu yanıtlar. Versiyon seçimi yapılır, sağlık skoru hesaplanır, tüm bölümler değerlendirilir.

#### Segment Header (Sticky'nin devamı)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ... ortak header ...                                                        │
│  ┌────────────────────────────────────────────────┐                          │
│  │ [🛡️ Yayın Hazırlığı]  │  🔧 Geliştirme İzleme │  ← aktif segment       │
│  └────────────────────────────────────────────────┘                          │
│                                                                              │
│  Versiyon *  [v2.5.0 — TESTING ▾]                                           │
│                                                                              │
│  ┌──────────────┐  ┌──────────────────────────────────────────────────┐     │
│  │  🟡 64/100   │  │ ⚠ 2 açık PR  ❌ 1 P0 todo  ⚡ 1 breaking change │     │
│  │  Sağlık Skoru│  │                                                  │     │
│  └──────────────┘  └──────────────────────────────────────────────────┘     │
│                                                [Release'i Yayınla ✅]       │
│                                                (disabled: skor < 80)        │
├──────────────────────────────────────────────────────────────────────────────┤
│  ── aşağıda: 6 bölüm dikey akış ──                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Versiyon seçici kuralı:** Sadece `TESTING` statüsündeki versiyonlar listelenir. `isHotfix = true` olan `PLANNED` versiyonlar da gösterilir (hotfix kısa yol — Section 5.2).

**Versiyon seçilmeden:** "Bir versiyon seçin — test aşamasındaki versiyonlar burada listelenir" boş state.

#### 6.4.1 Sağlık Skoru

Client-side hesaplanır. Tüm section'lardan gelen veriye göre:

| Etken | Puan Etkisi | Açıklama |
|-------|-------------|----------|
| Her açık/active PR | −3 | Merge edilmemiş iş var |
| Her tamamlanmamış P0 todo | −5 | Kritik iş yapılmadı |
| Her breaking change | −10 | Müşteri etkisi yüksek |
| Her eksik release note (work item'ı olan) | −2 | Dokümantasyon eksik |

```
Başlangıç = 100
Skor = max(0, 100 − toplam kesinti)

Renk:
  ≥ 80  → 🟢 success (yeşil)  → "Release'i Yayınla" butonu aktif
  60–79 → 🟡 warning (sarı)   → buton disabled
  < 60  → 🔴 error (kırmızı)  → buton disabled
```

**Buton disabled tooltip:** "Skor 80'in altında: 2 açık PR, 1 P0 todo bekliyor"

> **RM Notu — Skor formülü iteratif:** İlk versiyonda bu formül basit tutuldu. Gerçek kullanımda ağırlıklar ayarlanabilir. Önemli olan "0–100 arası tek sayı" formatının korunması — karar desteği bu basitliğe bağlı.

#### 6.4.2 Section 1 — Servis Versiyonları (BoM)

Ürünün 4 katmanlı hiyerarşisi üzerinden servis sağlık durumu:

```
📦 Servis Versiyonları (BoM)                                     [⚠️]  [▲/▼]
┌──────────────────────────────────────────────────────────────────────────┐
│ ▼ Ödeme Servisleri (ModuleGroup)                                         │
│    ▼ Core Banking (Module)                                               │
│      cofins-service-api    │ Katalog: 1.0.45 │ Son Release: Release-47   │
│                            │                 │ 3 gün önce │ 2 yeni PR ⚠  │
│      cofins-auth-service   │ Katalog: 2.1.3  │ Son Release: Release-12   │
│                            │                 │ 1 hafta    │ Değişiklik ✅ │
│      cofins-report-api     │ Katalog: 1.3.0  │ Hiç yayınlanmadı ⚪       │
│    ▼ Notification (Module)                                               │
│      cofins-notify-svc     │ Katalog: 3.0.1  │ Son Release: Release-8    │
│                            │                 │ 2 gün      │ Değişiklik ✅ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Veri kaynağı:** `GET /api/products/:id` (nested hiyerarşi) + `GET /api/service-release-snapshots?productId={id}`

**"Yeni PR" chip'e tıklanınca:** Mini popover — snapshot'tan bu yana merge edilen PR'lar listesi.

#### 6.4.3 Section 2 — Pull Requests

```
🔀 Pull Requests          Toplam: 14   Açık: 2   Merged: 12       [⚠️]  [▲/▼]
┌──────────────────────────────────────────────────────────────────────────┐
│ ▼ cofins-service-api  (2 PR — 1 açık)                            [⚠️]  │
│   [OPEN ⚠]  feature/payment-v2       → main   15 Şub  [→ Azure]       │
│   [MERGED ✅] fix/timeout-issue       → main   18 Şub  [→ Azure]       │
│                                                                          │
│ ▼ cofins-auth-service  (1 PR — tümü merged)                     [✅]   │
│   [MERGED ✅] security/jwt-refresh    → main   22 Şub  [→ Azure]       │
└──────────────────────────────────────────────────────────────────────────┘
```

**PR zaman filtresi (Section 2.4 ile bağlantı):**

Bu segment, teste başlanan versiyonun scope'u olan PR'ları gösterir. Tarih aralığı **ürün tanımındaki stage bilgilerinden** hesaplanır:

```
lastProdDate ─────────── scope ─────────── lastPrepDate
     │                                          │
     ▼                                          ▼
     ● ━━━━━ master'a merge edilen PR'lar ━━━━━ ●
     │                                          │
"Son yayınlanan"                      "Teste başlanan"
(prodStage son başarılı)            (prepStage son başarılı)
```

| Kaynak | Değer | Açıklama |
|--------|-------|----------|
| `lastProdDate` | Service `lastProdReleaseDate` (DB'de saklı) | Aralığın başlangıcı |
| `lastPrepDate` | `prepStageName` son başarılı deployment tarihi (runtime — API'den) | Aralığın sonu |

**Tek stage senaryosu:** `prodStageName === prepStageName` ise son iki başarılı Prod deployment'ı arasındaki PR'lar kullanılır (bkz. Section 2.4).

**Release branch dahil etme:** `Product.usesReleaseBranches = true` ise, aynı tarih aralığında release branch'ına yapılan PR'lar da listeye dahil edilir (stabilizasyon / cherry-pick fix'leri). Target branch filtresi: `main` + `release/*`.

**Work Item toplama:** PR'ların `workItemRefs` alanından ID'ler toplanır → Section 3'e iletilir.

**Azure yapılandırması yoksa:** `Alert severity="info"`: "Bu ürün için Azure DevOps yapılandırılmamış."

#### 6.4.4 Section 3 — Work Items

Work item listesi **üç farklı kaynaktan** beslenir:

| Kaynak | Açıklama | Otomatik mi? |
|--------|----------|--------------|
| **PR-linked** | PR'ların `workItemRefs` alanından toplanan WI ID'leri | ✅ Otomatik |
| **Version-matched** | Azure'da `Planned Version` alanı seçilen versiyon ile eşleşen WI'lar | ✅ Otomatik |
| **Manuel ekleme** | Kullanıcının WI ID girerek listeye dahil ettiği öğeler | ❌ Manuel |

> **RM Notu — Neden üç kaynak?**
> PR-linked WI'lar geliştirme sürecini kapsar. Ancak bazı iş öğelerinin kod değişikliği yoktur — konfigürasyon güncellemesi, dokümantasyon, müşteri özel SLA ayarı gibi. Bu WI'lar PR'a bağlı olmasa da release note'lara dahil edilmesi gerekebilir. `Planned Version` eşleştirmesi bunu otomatik çözer; manuel ekleme ise edge case'ler için güvenlik ağıdır.

```
📋 Work Items          Toplam: 27   Done: 21   In Progress: 5   Yeni: 1  [⚠️]  [▲/▼]
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Kaynak │ ID     │ Başlık                  │ Tür     │ Durum       │ Müşteri    │
│  🔗 PR  │ #4521  │ Payment v2 entegrasyonu │ Feature │ In Progress │ —          │
│  🔗 PR  │ #4388  │ JWT timeout düzeltme   │ Bug     │ Done        │ Akbank     │
│  📌 Ver │ #4450  │ SLA config güncellemesi │ Task    │ Done        │ Garanti    │
│  📌 Ver │ #4460  │ Fatura şablon değişikliği│ Task   │ Done        │ —          │
│  ✋ Man │ #4499  │ Lisans yenileme notu    │ Task    │ Done        │ İş Bankası │
│                                                           [+ WI Ekle]          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Kaynak göstergesi:** Her satırda WI'ın nereden geldiği ikonla belirtilir:
- 🔗 PR = PR'dan otomatik toplanan
- 📌 Ver = `Planned Version` eşleşmesinden gelen
- ✋ Man = Manuel eklenen

**Manuel ekleme akışı:** `[+ WI Ekle]` butonuna tıklanınca basit dialog açılır:

```
┌────────────────────────────────────────────┐
│ Work Item Ekle                       [✕]  │
│ ────────────────────────────────────────── │
│ Work Item ID *  [#         ]              │
│                                            │
│ ℹ️ Azure DevOps'tan çekilecek.            │
│    Bulunamazsa hata gösterilir.            │
│                                            │
│            [İptal]    [Ekle]              │
└────────────────────────────────────────────┘
```

Eklenen WI ID → `GET /api/tfs/work-items?ids={id}` ile doğrulanır. Bulunamazsa `Alert error`. Bulunursa listeye eklenir ve versiyona ilişkilendirilir.

##### Azure DevOps Work Item — Zorunlu Alanlar

Health Check'in doğru çalışması için Azure DevOps'taki work item'larda **4 alan** bulunmalıdır. Bu alanlar Azure DevOps proje şablonuna custom field olarak eklenir:

| # | Azure Alan Adı | Tip | Zorunlu mu? | Açıklama |
|---|----------------|-----|-------------|----------|
| 1 | **Planned Version** | string | ✅ | WI'ın hangi versiyon için planlandığı (ör: `v2.5.0`). Health Check version-matched WI toplama bu alana göre filtreler. |
| 2 | **Customer Name** | string | — (opsiyonel) | WI'ın ilişkili olduğu müşteri adı. Müşteri bazlı release note filtreleme ve müşteri iletişimi için. |
| 3 | **ReleaseNote Title** | string | — (opsiyonel) | Release note başlığı — kullanıcının göreceği kısa açıklama. Bu alan doluysa release note "Hazır" kabul edilir. |
| 4 | **ReleaseNote Description** | string (multi-line) | — (opsiyonel) | Release note detay açıklaması — müşteriye iletilecek teknik/fonksiyonel bilgi. |
| 5 | **ReleaseNoteNotRequired** | boolean | — (varsayılan: false) | `true` ise bu WI release note gerekmez — versiyon içeriğinde kalır ama note üretilmez. **Kısıt:** `Customer Name` dolu olan WI'larda bu alan `true` yapılamaz (6.4.5). |

> **RM Notu — Neden Azure'da?**
> Release note verisi work item'ın kendisinde tutulmalı — geliştirici PR yazarken veya WI kapatırken bu alanları doldurabilir. ReleaseHub360 bu verileri **okur**, oluşturmaz. Bu sayede release note hazırlığı geliştirme sürecinin doğal parçası olur. Boş bırakılırsa Health Check'te "Eksik" olarak işaretlenir — veya AI tarafından üretilir (6.4.5).

**Planned Version eşleştirme mantığı:**
```
Versiyon seçildi: v2.5.0
  → GET /api/tfs/work-items?plannedVersion=v2.5.0&productId={id}
  → Azure'da "Planned Version" = "v2.5.0" olan WI'lar döner
  → PR-linked WI'larla birleştirilir (duplicate ID varsa tek satır)
```

**API çağrıları:**
- PR-linked: `GET /api/tfs/work-items?ids={idList}&productId={id}` (PR section'dan toplanan ID'ler)
- Version-matched: `GET /api/tfs/work-items?plannedVersion={version}&productId={id}` (Planned Version filtresi)
- Manuel doğrulama: `GET /api/tfs/work-items?ids={manualId}` (tek ID sorgu)

#### 6.4.5 Section 4 — Release Notes

Release note verileri **kademeli bir karar ağacından** geçerek belirlenir. Her WI için aşağıdaki cascade uygulanır:

##### Release Note Cascade Mantığı

```
WI değerlendirilirken:

│
├─ ReleaseNote Title dolu mu?
│   └─ EVET → ✅ Hazır (Azure'dan okunan değer kullanılır)
│
├─ ReleaseNoteNotRequired = true mu?
│   ├─ Customer Name boş mu?
│   │   └─ EVET → ⬜ Gerekmiyor (versiyon içeriğinde kalır, note yok, skor etkisi yok)
│   └─ Customer Name dolu mu?
│       └─ ❌ YASAK — müşteri talebi release note'suz yayınlanamaz
│          → Uyarı: "Müşteri talebi release note gerektirir"
│
├─ WI bir PR'a bağlı mı?
│   └─ EVET → 🤖 AI Üretilebilir
│       → [🤖 AI Üret] butonu gösterilir
│       → MCP Server: /api/release-notes/structured-for-specific-pbi
│       → Kod değişikliklerinden otomatik üretim
│
└─ WI PR'a bağlı değil + Note boş + NotRequired değil
    └─ ❌ Eksik — Health Check uyarı verir
       → Seçenekler:
          1. Azure'da ReleaseNote alanlarını doldur
          2. Planned Version'ı sonraki versiyona güncelle (erteleme)
          3. ReleaseNoteNotRequired = true işaretle (müşteri talebi değilse)
```

##### Durum Gösterimleri

```
📝 Release Notes          Hazır: 20/27   AI: 2   Gerekmiyor: 3   Eksik: 2  [⚠️]  [▲/▼]
                                                         [🤖 Tümünü Üret]  [AI Üretiliyor ⌛]
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│  #4521  │ Payment v2 entegrasyonu │ Müşteri: —       │ [🤖 AI Üret]            │
│  #4388  │ JWT timeout düzeltme   │ Müşteri: Akbank  │ [✅ Hazır]               │
│         │                         │                  │ ▼ "JWT token yenileme…"  │
│  #4450  │ SLA config güncellemesi │ Müşteri: Garanti │ [✅ Hazır]               │
│         │                         │                  │ ▼ "SLA süreleri güncelle…"│
│  #4460  │ Fatura şablon değişikliği│ Müşteri: —       │ [⬜ Gerekmiyor]          │
│  #4499  │ Lisans yenileme notu    │ Müşteri: İş Bank.│ [❌ Eksik]               │
│         │                         │                  │ ⚠️ Müşteri talebi — note   │
│         │                         │                  │    girilmeli!             │
│  #4510  │ Log düzeltmeleri         │ Müşteri: —       │ [🤖 AI Üretildi ✅]      │
│         │                         │                  │ ▼ "Loglama seviyesi…"    │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Durum sırası:** ❌ Eksik (en üst) → 🤖 AI Üretilebilir → ⬜ Gerekmiyor → ✅ Hazır (en alt). Eksik olanlar yukarıda — dikkat çekilmesi gereken işler önce.

##### AI Release Note Üretimi

PR'a bağlı ama `ReleaseNote Title` boş olan WI'lar için AI üretim altyapısı **zaten mevcuttur:**

| Bileşen | Konum | Görev |
|---------|-------|-------|
| **MCP Server** | `/api/release-notes/structured-for-specific-pbi` | WI ID alır → PR diff'lerini analiz eder → AI ile technical + business release note üretir |
| **n8n Workflow** | `n8n-workflows/release-notes-auto-generate.json` | Eksik WI listesi alır → her biri için MCP'ye sorgulatir → sonuçları backend'e kaydeder |
| **Backend** | `POST /api/release-notes/trigger-generation` | Fire-and-forget: eksik WI'ları bulur → n8n webhook'una gönderir |

**Tek WI için AI üretim:** `[🤖 AI Üret]` butonuna tıklanınca:
1. `POST /api/release-notes/trigger-generation` — `workItemIds: [bu WI ID]`
2. Backend n8n'e gönderir → MCP Server PR diff analizini yapar → release note üretir
3. n8n üretilen note'u `POST /api/release-notes` ile backend'e kaydeder
4. Kullanıcıya: "🤖 AI üretim başlatıldı — birkaç dakika sonra yenileyin"

**Toplu AI üretim:** `[🤖 Tümünü Üret]` butonuna tıklanınca:
1. `POST /api/release-notes/trigger-generation` — `workItemIds: [tüm PR-linked ve note-eksik WI'lar]`
2. Aynı akış — n8n paralel işler
3. Kullanıcıya: "🤖 {n} work item için AI üretim başlatıldı"

> **RM Notu — AI Üretim Sınırı:** AI üretim sadece PR'a bağlı WI'lar için mümkündür — çünkü kod değişikliği yoksa analiz edecek diff de yoktur. PR'a bağlı olmayan WI'lar için release note manuel girilmeli veya `ReleaseNoteNotRequired` işaretlenmelidir.

##### ReleaseNoteNotRequired Kuralı

Bazı WI'ların release note gerektirmediği durumlar vardır: internal refactoring, altyapı güncellemesi, dokümantasyon düzeltmesi gibi. Bu WI'lar Azure'da `ReleaseNoteNotRequired = true` işaretlenerek versiyon içeriğinde bırakılır ama release note üretilmez.

**Kritik kısıt — Müşteri Talebi Koruması:**

```
if (WI.CustomerName != null && WI.ReleaseNoteNotRequired == true) {
  → ❌ YASAK — "İş Bank. talebine ait bir değişiklik release note olmadan yayınlanamaz."
  → Sağlık skorundan −5 puan (P0 todo ile aynı ağırlık)
  → "Release'i Yayınla" butonu skor düşüyor
}
```

> **RM Gözlemi — Neden bu kadar sert?** Müşteri bir talepte bulunmuşsa, o talebin karşılandığını gösteren yazılı kanıt (release note) olmadan yayın yapmak operasyonel risk taşır. Müşteri "bu düzeltmeyi yaptınız mı?" diye sorduğunda kanıt olmalı. Bu kuralın by-pass edilememesi bilinçli bir tasarım kararıdır.

##### Sağlık Skor Etkisi (Güncellenmiş)

| Durum | Skor Etkisi | Açıklama |
|-------|-------------|----------|
| ✅ Hazır | 0 | Etki yok |
| 🤖 AI Üretildi | 0 | AI üretilmiş ve kaydedilmiş — hazır kabul edilir |
| ⬜ Gerekmiyor | 0 | ReleaseNoteNotRequired = true, Customer Name boş |
| 🤖 AI Üretilebilir | −2 | PR bağlı ama henüz üretilmemiş (eksik sayılır) |
| ❌ Eksik (müştersiz) | −2 | Note yok, PR yok, NotRequired değil |
| ❌ Eksik (müşterili + NotRequired ihlali) | −5 | Müşteri talebi note'suz — kritik ihlal |

**Release Note kaynağı:**
- `ReleaseNote Title` → Note başlığı (liste görünümünde gösterilen)
- `ReleaseNote Description` → Detay (expand ile gösterilen)
- AI üretiminde: MCP Server `technical.title` + `business.description` → backend'e kaydedilir
- `Customer Name` → Müşteri sütunu (müşteri bazlı filtreleme + release note gruplandırma)

##### Aksiyonel Release Note Konsepti (İleri Tasarım)

Bazı release note'lar salt bilgilendirme değildir — **okuyucunun aksiyon almasını gerektirir.** Örneğin:
- Muhasebe tanımında değişiklik → finans ekibinin konfigürasyon güncellemesi yapması gerekir
- Yeni bir süreç adımı eklenmesi → operasyon ekibinin iş akışını revize etmesi gerekir
- Parametre değişikliği → son kullanıcının ayarlarını kontrol etmesi gerekir

Bu tür release note'lar **aksiyon gerektirir** etiketiyle işaretlenebilir ve içeriklerinde:
- Ne değişti (teknik özet)
- Kimin ne yapması gerekiyor (hedef rol/ekip)
- Adım adım rehber (guide) linki veya inline talimatlar

> **RM Notu — İleri tasarım:** Aksiyonel release note'ların tam UI tasarımı ve veri modeli ilerideki bir iterasyonda detaylandırılacaktır. Şu an bu kavram bir `actionRequired: boolean` flag'i ve `actionGuide: string` (markdown destekli) alanı olarak planlanmaktadır. Detaylı tasarım Section 7 (Release Notes) kapsamında ele alınacaktır.

> **Neden önemli?** Kurumsal yazılımlarda release note sadece "ne değişti" değil, "ne yapmalıyım" sorusuna da cevap vermelidir. Bir muhasebe modülünde KDV oranı hesaplama mantığı değiştiğinde, finans ekibinin bunu bilmesi yetmez — yeni oranları sisteme girmesi gerekir. Bu rehberlendirme release note'un parçası olmalıdır.

#### 6.4.6 Section 5 — Sistem Değişiklikleri

```
⚡ Sistem Değişiklikleri          Breaking: 1   Normal: 4           [❌]  [▲/▼]
┌──────────────────────────────────────────────────────────────────────────┐
│  ⚡ [BREAKING]  validatePayment — POST /api/v1/payments/validate        │
│     cofins-service-api │ Request model değişti: +transactionId          │
│                                                          [Detayı Gör ▼] │
│                                                                          │
│  ✅ [Normal]   addNotification — POST /api/v1/notify                    │
│     cofins-notify-svc │ Yeni endpoint eklendi                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Skor etkisi:** Her breaking change: −10 puan.

#### 6.4.7 Section 6 — Release Todos

```
☑ Release Todos          Tamamlanan: 7/9   P0 Eksik: 1             [❌]  [▲/▼]
┌──────────────────────────────────────────────────────────────────────────┐
│ ── GEÇİŞ ÖNCESİ ──                                                      │
│  ☐  [P0 ❌]  DB migration scripti çalıştır          DevOps              │
│  ☑  [P1]    Müşteri iletişimi gönder               Delivery             │
│ ── GEÇİŞ ANINDA ──                                                      │
│  ☑  [P1]    Cache flush                             DevOps              │
│ ── GEÇİŞ SONRASI ──                                                     │
│  ☐  [P2]    Smoke test çalıştır                     QA                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Inline güncelleme:** Checkbox toggle → `PATCH /api/release-todos/:id` → optimistic update.

**Skor etkisi:** Tamamlanmamış P0 todo: −5 puan.

#### 6.4.8 Release'i Yayınla — Yayınlama Akışı

"Release'i Yayınla" butonu **her zaman aktiftir** — sağlık skoru ≥ 80 koşulu yoktur. Ancak skor %100 olmadığında buton tıklandığında ek uyarı gösterilir.

##### Adım 1 — Sağlık Kontrolü + Özet

```
┌────────────────────────────────────────────────────────────────────┐
│ 🚀 Release'i Yayınla — v2.5.0                               [✕]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ⚠️ Sağlık skoru %100 değil (%82). Yine de devam edebilirsiniz.   │
│    (Sağlık %100 ise bu uyarı gösterilmez)                         │
│                                                                    │
│ Son durum özeti:                                                   │
│                                                                    │
│  ✅  PR'lar          14 / 14 merged                                │
│  ✅  P0 Geçiş Aksiyon.  3 / 3 tamamlandı                          │
│  ⚠️  Breaking        1 adet — onaylandığı varsayılır              │
│  ⚠️  Sağlık          82 / 100                                     │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ 📦 Bu Versiyona Dahil Olan Servisler                              │
│                                                                    │
│ Son prod release ↔ test release karşılaştırmasında                │
│ değişiklik TESPİT EDİLEN servisler:                               │
│                                                                    │
│  ▼ Ödeme Servisleri (ModuleGroup)                                  │
│    ▼ Core Banking (Module)                                         │
│      ✅ cofins-service-api   Prod: Release-45 → Test: Release-47  │
│         Dahil: 2 PR, 3 work item                                  │
│      ✅ cofins-auth-service  Prod: Release-10 → Test: Release-12  │
│         Dahil: 1 PR, 1 work item                                  │
│    ▼ Notification (Module)                                         │
│      ✅ cofins-notify-svc    Prod: Release-6  → Test: Release-8   │
│         Dahil: 4 PR, 2 work item                                  │
│                                                                    │
│  💤 Değişiklik olmayan servisler: 4 adet (gizli)                  │
│     [Göster ▾]                                                     │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│               [İptal]            [Devam →]                        │
└────────────────────────────────────────────────────────────────────┘
```

**Değişiklik tespit kuralı:** BoM'daki her servis için `lastProdRelease` ile `lastPrepRelease` karşılaştırılır. İkisi aynıysa (yani o servise hiçbir yeni PR merge edilmemişse) → "değişiklik yok" → gösterilmez, kayıt altına alınmaz. Farklıysa → listeye dahil edilir.

> **RM Gözlemi:** 10 servisin yalnızca 5'inde değişiklik varsa, sadece o 5 servis paket içeriğine dahil edilir. Bu hem müşterinin "ne değişti?" sorusuna net cevap verir hem de Customer Dashboard'da gereksiz gürültüyü önler.

##### Adım 2 — Release Branch / Tag Bilgisi (Koşullu)

Bu adım **yalnızca** ürünün `supportedArtifactTypes` array'inde `GIT_SYNC` varsa gösterilir. Codebase dağıtımı yapan ürünlerde, müşterinin branch'ine sync edilecek kaynak branch veya tag bilgisi gereklidir.

```
┌────────────────────────────────────────────────────────────────────┐
│ 🚀 Release'i Yayınla — v2.5.0 — Branch/Tag Bilgisi        [✕]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ 🔀 Source Code Referansı                                          │
│                                                                    │
│ Bu ürün GIT_SYNC dağıtım modeli kullanıyor.                      │
│ Müşterilere sync edilecek kaynak bilgisini girin:                 │
│                                                                    │
│ Referans tipi:                                                     │
│   ◉ Release Branch   ○ Tag                                        │
│   (usesReleaseBranches = true ise branch önceden seçili)          │
│                                                                    │
│ Branch / Tag:  [release/v2.5.0          ▾]                        │
│                (autocomplete — Azure/GitHub'dan branch listesi)    │
│                                                                    │
│ ℹ️ Bu bilgi Customer Dashboard'da gösterilecek                    │
│   ve Code Sync tetiklenirken kullanılacaktır.                     │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│               [← Geri]            [Devam →]                       │
└────────────────────────────────────────────────────────────────────┘
```

**Koşullar:**
- `Product.supportedArtifactTypes.includes('GIT_SYNC')` → bu popup gösterilir
- `Product.usesReleaseBranches = true` → varsayılan "Release Branch" seçili, branch listesi gösterilir
- `Product.usesReleaseBranches = false` → varsayılan "Tag" seçili, tag listesi gösterilir
- `GIT_SYNC` yoksa → bu adım atlanır, doğrudan onay adımına geçilir
- Branch/tag alanı zorunlu — boş bırakılamaz

##### Adım 3 — Son Onay

```
┌────────────────────────────────────────────────────────────────────┐
│ 🚀 Release'i Yayınla — v2.5.0 — Onay                      [✕]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Bu işlem aşağıdakileri gerçekleştirecek:                          │
│                                                                    │
│  1. ✏️ v2.5.0 durumu → RELEASED olarak güncellenecek              │
│  2. 📦 3 servisin paket bilgisi kaydedilecek                      │
│     (değişiklik olan servisler)                                    │
│  3. 📸 3 servisin release snapshot'ı güncellenecek                │
│  4. 🔀 Release branch: release/v2.5.0 kaydedilecek               │
│     (GIT_SYNC yoksa bu satır gösterilmez)                         │
│                                                                    │
│  ⚠️ Bu işlem geri alınamaz.                                      │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│              [← Geri]            [✅ Evet, Yayınla]               │
└────────────────────────────────────────────────────────────────────┘
```

##### Yayınlama API Çağrı Sırası (Sıralı)

```
1. PATCH /api/product-versions/{versionId}
   Body: { status: "RELEASED", actualReleaseDate: now() }
   → ProductVersion kaydı güncellenir

2. POST /api/version-packages
   Body: {
     versionId: "...",
     packages: [
       {
         serviceId: "cofins-service-api",
         moduleId: "...",
         moduleGroupId: "...",
         previousRelease: "Release-45",
         currentRelease: "Release-47",
         prCount: 2,
         workItemCount: 3
       },
       // ... sadece değişiklik olan servisler
     ],
     releaseBranch?: "release/v2.5.0",  // GIT_SYNC ise
     releaseTag?: "v2.5.0"              // GIT_SYNC + tag ise
   }
   → Versiyon paket bilgisi kaydedilir (Customer Dashboard'da gösterilecek)

3. POST /api/service-release-snapshots
   Body: { versionId: "...", services: [değişen servis ID'leri] }
   → Sadece değişiklik olan servislerin snapshot'ı güncellenir
```

##### VersionPackage Veri Modeli

```typescript
interface VersionPackage {
  id: string;
  versionId: string;            // ProductVersion ID
  productId: string;            // ürün referansı
  
  // Paket içeriği — sadece değişiklik olan servisler
  packages: VersionPackageItem[];
  
  // Codebase referansı (GIT_SYNC ise)
  releaseBranch?: string;       // "release/v2.5.0"
  releaseTag?: string;          // "v2.5.0"
  
  createdAt: DateTime;
  createdBy: string;            // userId
}

interface VersionPackageItem {
  serviceId: string;
  serviceName: string;          // denormalize — raporlama kolaylığı
  moduleId: string;
  moduleGroupId: string;
  
  previousRelease: string;      // "Release-45" (önceki prod)
  currentRelease: string;       // "Release-47" (bu versiyondaki)
  
  prCount: number;              // bu aralıktaki merge edilen PR sayısı
  workItemCount: number;        // ilişkili work item sayısı
  prIds: string[];              // PR ID listesi (audit)
  workItemIds: string[];        // WI ID listesi (audit)
}
```

**Üretim kuralları:**
1. BoM'daki her servis için `lastProdRelease` ↔ `lastPrepRelease` karşılaştır
2. Eşitse → bu servis pakete dahil edilmez, snapshot güncellenmez
3. Farklıysa → `VersionPackageItem` oluştur, snapshot güncelle
4. `prCount` ve `workItemCount` → BoM section'daki verilerden hesaplanır
5. `prIds` ve `workItemIds` → PR/WI section'larından toplanır (audit trail)

##### Başarı Sonrası

- Toast: "v2.5.0 başarıyla yayınlandı — 3 servis pakete dahil edildi"
- Versiyon artık RELEASED — Yayın Hazırlığı segment'inden düşer
- Header'daki "Son yayınlanan" bilgisi güncellenir
- Tüm query cache invalidate
- GIT_SYNC ürünlerde: Customer Dashboard'da "sync edilecek branch" bilgisi görünür hale gelir

##### Hata Durumları

| Hata | Davranış |
|------|----------|
| Versiyon güncelleme başarısız | İşlem iptal, toast hata mesajı, servis snapshot güncellenmez |
| Paket kaydı kısmen başarısız | Tam rollback — versiyon RELEASED'a geçmez, kullanıcı bilgilendirilir |
| Snapshot kısmen başarısız | Paket + versiyon OK ise devam eder, toast uyarısı: "N servisin snapshot'ı alınamadı, manuel kontrol gerekebilir" |
| Branch/tag bulunamadı | "Devam" butonu devre dışı, uyarı: "Girilen branch/tag uzak repo'da bulunamadı" |

> **RM Bağlantı — Section 5.4:** Bu buton `TESTING → RELEASED` geçişinin **tek yetkili kaynağıdır**. Release Calendar'dan yayınlama yapılamaz — oradan sadece "Health Check'e Git" yönlendirmesi vardır.

> **RM Bağlantı — Customer Dashboard:** `VersionPackage` kaydı Customer Dashboard'un temel veri kaynağıdır. "Bu versiyonda neler var?" sorusuna buradan cevap verilir. Hiyerarşik gösterim: Ürün → Modül Grubu → Modül → Service/API + release bilgisi.

### 6.5 Segment 2 — Geliştirme İzleme (Development Tracking)

Bu segment aktif geliştirme sürecini izler. Henüz teste alınmamış, üzerinde çalışılan işlerin durumunu gösterir. Temel soru: "Şu an ne geliştiriliyor ve hangisi bu release'e yetişebilir?"

#### Segment Header

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ... ortak header ...                                                        │
│  ┌────────────────────────────────────────────────┐                          │
│  │  🛡️ Yayın Hazırlığı  │ [🔧 Geliştirme İzleme] │  ← aktif segment       │
│  └────────────────────────────────────────────────┘                          │
│                                                                              │
│  Versiyon  [v2.6.0 — IN_DEVELOPMENT ▾]                                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  📊 Geliştirme Özeti                                                │   │
│  │  Toplam PR: 8  │  Açık: 5  │  Merged: 3  │  WI Tamamlanan: 12/20  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────────┤
│  ── aşağıda: geliştirme bölümleri ──                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Versiyon seçici kuralı:** Sadece `IN_DEVELOPMENT` statüsündeki versiyonlar listelenir. Bir ürünün yalnızca bir aktif `IN_DEVELOPMENT` versiyonu olması beklenir, ama teknik olarak birden fazla olabilir.

**Versiyon yoksa:** "Şu an aktif geliştirmede bir versiyon yok. Release Calendar'dan yeni versiyon oluşturabilirsiniz."

#### 6.5.1 Aktif PR'lar

Teste başlanan release'den **sonra** master'a atılmış PR'ları gösterir — henüz herhangi bir release scope'una girmeyen, aktif geliştirme işleri:

```
lastPrepDate ─────────── scope ─────────── now()
     │                                       │
     ▼                                       ▼
     ● ━━━━━ master'a atılmış PR'lar ━━━━━━ ●
     │                                       │
"Teste başlanan"                         "Şu an"
(prepStage son başarılı)              (açık + merged)
```

```
🔀 Aktif Pull Requests                                               [▲/▼]
┌──────────────────────────────────────────────────────────────────────────┐
│ ▼ cofins-service-api  (4 PR — 3 açık)                                    │
│   [OPEN 🔵]   feature/new-invoice-api    → main   26 Şub  [→ Azure]    │
│               Açılalı 2 gün │ 3 reviewer │ 1 comment                    │
│   [OPEN 🔵]   feature/bulk-export        → main   25 Şub  [→ Azure]    │
│               Açılalı 3 gün │ 2 reviewer │ Approved ✅                   │
│   [OPEN 🟡]   fix/memory-leak            → main   20 Şub  [→ Azure]    │
│               Açılalı 8 gün │ 0 reviewer │ ⚠️ İncelenmedi               │
│   [MERGED ✅] refactor/db-connection     → main   24 Şub  [→ Azure]    │
│                                                                          │
│ ▼ cofins-auth-service  (1 PR — açık)                                     │
│   [OPEN 🔵]   feature/oauth2-flow        → main   27 Şub  [→ Azure]    │
│               Açılalı 1 gün │ 1 reviewer │ In Review                     │
└──────────────────────────────────────────────────────────────────────────┘
```

**Yayın Hazırlığı'ndan farkı:**
- Burada `lastPrepDate` sonrasındaki PR'lar gösterilir — Readiness'taki prod→prep aralığının **devamıdır**
- Hem açık hem merged PR'lar dahildir (açık = devam eden iş, merged = henüz teste girmemiş tamamlanmış iş)
- PR "yaşı" ve review durumu önemli — uzun süredir açık + review almamış PR'lar uyarı ile işaretlenir
- Sağlık skoru yok — bu segment karar desteği değil, durum izleme

**Tek stage senaryosu:** `prodStageName === prepStageName` ise, son başarılı deployment tarihinden sonraki PR'lar gösterilir.

**PR yaş uyarısı:**
- 7+ gün açık, reviewer atanmamış → 🟡 sarı uyarı
- 14+ gün açık → 🔴 kırmızı uyarı "Uzun süredir açık"

#### 6.5.2 Work Items Durumu

Readiness segmentindeki üç kaynaklı toplama (6.4.4) burada da geçerlidir — PR-linked, version-matched (`Planned Version` eşleşen) ve manuel eklenen WI'lar birlikte gösterilir:

```
📋 Work Items                    Toplam: 20   Done: 12   Active: 8  [▲/▼]
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Durum Dağılımı:                                                                 │
│  ████████████░░░░░░░░  %60 Done  │  ████████░░░░░░░░░░░░  %40 Active            │
│                                                                                  │
│  Kaynak │ ID     │ Başlık                  │ Tür     │ Durum       │ Müşteri     │
│  🔗 PR  │ #4601  │ Yeni fatura API'si     │ Feature │ In Progress │ —           │
│  🔗 PR  │ #4588  │ Bulk export desteği     │ Feature │ In Progress │ —           │
│  📌 Ver │ #4570  │ Müşteri config taşıma   │ Task    │ Active      │ Garanti     │
│  🔗 PR  │ #4555  │ OAuth2 akışı            │ Feature │ Active      │ —           │
│  🔗 PR  │ #4521  │ Payment v2 entegrasyonu │ Feature │ Done ✅     │ Akbank      │
│  ...                                                               [+ WI Ekle]  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**İlerleme çubuğu:** Tamamlanan / toplam work item oranını görsel olarak gösterir. Ekibin bu versiyondaki ilerleme hızını yansıtır.

**Development'a özel:** `Planned Version` eşleşmesi burada `IN_DEVELOPMENT` versiyonun adıyla yapılır — geliştirici WI'ı açarken `Planned Version = v2.6.0` yazdıysa otomatik listelenir.

#### 6.5.3 Sistem Değişiklikleri (Erken Uyarı)

Henüz geliştirme aşamasında bile breaking change kaydı yapılabilir:

```
⚡ Sistem Değişiklikleri          Kayıtlı: 2   Breaking: 1          [▲/▼]
┌──────────────────────────────────────────────────────────────────────────┐
│  ⚡ [BREAKING]  updateInvoiceSchema — PUT /api/v2/invoices             │
│     cofins-service-api │ Response model değişiyor                       │
│     → Bu değişiklik release'e dahil edilecek — müşteri iletişimi planla │
│                                                                          │
│  ✅ [Normal]   addBulkExport — POST /api/v2/invoices/bulk-export       │
│     cofins-service-api │ Yeni endpoint                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

> **RM Notu:** Geliştirme İzleme'deki breaking change uyarıları "erken uyarı" niteliğindedir. Release Manager daha test aşamasına gelmeden müşteri iletişimini planlayabilir.

#### ~~6.5.4 Release Notes Hazırlığı~~ — Bu Segmentte Yok

Release note hazırlığı **yalnızca Segment 1 — Yayın Hazırlığı** kapsamındadır (6.4.5). Geliştirmesi devam eden işler için release note ile ilgilenilmez — note, versiyon `TESTING` statüsüne geçtiğinde anlam kazanır.

> **RM Gerekçe:** Geliştirme sürecinde WI'lar henüz şekilleniyor, PR'lar merge ediliyor, scope değişebiliyor. Bu aşamada release note yazmak/üretmek hem erken hem de gereksiz yeniden iş (rework) riski taşır. Release note, paket hazırlık sürecinin doğal parçasıdır — test sonrası, yayın öncesi. PR'lar ve Work Item'lar her iki segmentte gösterilir çünkü geliştirme ilerlemesini izlemek ile yayın hazırlığını kontrol etmek farklı ihtiyaçlardır. Ama release note yalnızca "bu sürüm çıkabilir mi?" sorusunun cevabında yer alır.

#### ~~6.5.5 Release Todo Planlaması~~ — Bu Segmentte Yok

Todo planlama ve yönetimi **Release Todo Tanımlama ekranından** (6.4.7.1) yapılır. Development segmentinde ayrı bir todo section'ı yoktur — todo'lar versiyon bağımsız olarak herhangi bir zamanda tanımlanabilir.

> **RM Gerekçe:** Todo'lar müşterinin geçiş sürecindeki aksiyonlardır. Geliştirme sürecinde bunları "izlemek" anlamsızdır çünkü henüz geçiş yapılmamıştır. Todo tanımlama herhangi bir zamanda (geliştirme dahil) yapılabilir ama bu iş ayrı bir ekrandan yönetilir. Health Check Readiness segmentinde ise sadece özet gösterilir.

### 6.6 Segment Geçiş Davranışı

İki segment aynı ürünü paylaşır ama **bağımsız versiyon seçicilere** sahiptir:

| Özellik | Yayın Hazırlığı | Geliştirme İzleme |
|---------|-----------------|-------------------|
| Versiyon filtresi | `status = TESTING` (+ hotfix PLANNED) | `status = IN_DEVELOPMENT` |
| Versiyon seçimi hatırlanır | Evet — localStorage | Evet — localStorage |
| Ürün değişince | Versiyon sıfırlanır | Versiyon sıfırlanır |
| Segment değişince | Son seçilen versiyon korunur | Son seçilen versiyon korunur |

**URL state:**
```
/release-health-check?productId=abc&segment=readiness&versionId=v1
/release-health-check?productId=abc&segment=development&versionId=v2
```

**Segment değişimi animasyonu:** Hızlı crossfade (150ms) — sadece content alanı değişir, header sabit kalır.

### 6.7 Segmentler Arası Veri Akışı

İki segment birbirinden izole değildir — aynı ürünün aynı veri kaynağını farklı perspektiflerden gösterir:

```
                         ┌──────────────────┐
                         │   Product Data    │
                         │  (Stage, Repo,    │
                         │   PR, WI, BoM)    │
                         └────────┬─────────┘
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        │                                                   │
        │              PR Zaman Çizelgesi                    │
        │  ━━━━━●━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━●━━━━━━→     │
        │   lastProd         lastPrep         now()          │
        │       │              │                │            │
        │       └──── Seg 1 ───┘                │            │
        │              │       └──── Seg 2 ─────┘            │
        └───────────────────────────────────────────────────┘
                   │                        │
     ┌─────────────▼─────────┐  ┌───────────▼──────────────┐
     │ Yayın Hazırlığı        │  │ Geliştirme İzleme        │
     │ (TESTING versiyon)     │  │ (IN_DEV versiyon)        │
     │                        │  │                          │
     │ • PR filtresi:         │  │ • PR filtresi:           │
     │   lastProd → lastPrep  │  │   lastPrep → now()       │
     │   + release branch PR  │  │   açık + merged          │
     │                        │  │                          │
     │ • WI: PR'lardan        │  │ • WI: versiyona atanmış  │
     │   otomatik toplama     │  │   + PR'lardan toplama    │
     │                        │  │                          │
     │ • Todo: tamamlanma     │  │ • Todo: planlama modu    │
     │   kontrol modu         │  │                          │
     │                        │  │                          │
     │ • Release Notes:       │  │ • Release Notes:         │
     │   tam/eksik kontrol    │  │   erken hazırlık         │
     │                        │  │                          │
     │ • Sağlık Skoru: ✅     │  │ • İlerleme Çubuğu: 📊   │
     │                        │  │                          │
     │ → "Yayınla" butonu     │  │ → "Teste Al" butonu      │
     └────────────────────────┘  └──────────────────────────┘
```

> **RM Notu — PR Zaman Çizelgesi:** İki segment aynı zaman çizelgesinin farklı dilimlerini gösterir. `lastProdDate` → `lastPrepDate` arası Segment 1'e aittir (yayınlanan son sürümden teste başlanan sürüme kadar). `lastPrepDate` → `now()` arası Segment 2'ye aittir (teste başlandıktan sonraki yeni geliştirmeler). Bu sayede hiçbir PR iki segmentte birden tekrarlanmaz, ancak zaman çizelgesinde boşluk da kalmaz.

#### "Teste Al" Butonu — Development → Testing Geçişi

Geliştirme İzleme segmentinde, versiyon hazır olduğunda `IN_DEVELOPMENT → TESTING` geçişi tetiklenebilir:

```
┌─────────────────────────────────────────────────────┐
│ 🧪 Teste Al — v2.6.0                                │
├─────────────────────────────────────────────────────┤
│ Geliştirme özeti:                                   │
│                                                     │
│  ✅  PR'lar      8 toplam — 3 açık                  │
│  📋  Work Items  12/20 tamamlandı                   │
│  ⚡  Breaking    1 adet — erken uyarı verildi       │
│                                                     │
│ ⚠️ 3 açık PR var. Bu PR'lar merge edilmeden         │
│    test'e geçiş yapılacak. Emin misiniz?            │
│                                                     │
│              [İptal]     [Teste Al →]               │
└─────────────────────────────────────────────────────┘
```

**API:** `PATCH /api/product-versions/{versionId}` → `{ status: "TESTING" }`

**Başarı sonrası:**
- Versiyon `TESTING` olur → Geliştirme İzleme'den düşer
- Yayın Hazırlığı segmentinde görünür hale gelir
- Toast: "v2.6.0 test aşamasına alındı"

> **RM Notu — Açık PR uyarısı:** Test'e geçiş açık PR varken de mümkündür — çünkü bazı PR'lar kasıtlı olarak bir sonraki versiyona bırakılmış olabilir. Ama kullanıcı uyarılır.

### 6.8 İş Kuralları

| Kural | Açıklama |
|-------|----------|
| **Ürün seçimi zorunlu** | Ürün seçilmeden hiçbir segment içeriği gösterilmez |
| **Son yayınlanan versiyon** | `status = RELEASED`, `actualReleaseDate DESC` → ilk kayıt |
| **Versiyon filtresi segment'e göre** | Readiness: TESTING + hotfix PLANNED. Development: IN_DEVELOPMENT |
| **Sağlık skoru sadece Readiness'ta** | Development segmentinde skor yok — onun yerine ilerleme çubuğu |
| **Release'i Yayınla tek kaynak** | TESTING → RELEASED geçişi **yalnızca** bu sayfadan — Release Calendar'dan yapılamaz |
| **Teste Al opsiyonel** | IN_DEVELOPMENT → TESTING geçişi bu sayfadan veya Release Calendar drawer'ından yapılabilir |
| **Hotfix kısa yol** | `isHotfix = true` + `PLANNED` versiyon → Readiness segmentinde gösterilir, `PLANNED → RELEASED` direkt geçiş |
| **Snapshot sadece değişen servisler** | Release onaylandığında yalnızca prod ↔ test arası değişiklik olan servislerin snapshot'ı güncellenir — değişmeyen servisler atlanır |
| **Paket kaydı (VersionPackage)** | Yayınlama anında değişiklik olan servisler `VersionPackage` olarak kaydedilir — Customer Dashboard'un temel veri kaynağı |
| **Yayınla butonu her zaman aktif** | Sağlık skoru < %100 olsa bile buton tıklanabilir — kullanıcıya uyarı gösterilir, akış bloke edilmez |
| **GIT_SYNC branch/tag zorunlu** | `supportedArtifactTypes` içinde GIT_SYNC varsa yayınlama akışında release branch veya tag bilgisi zorunlu istenir |
| **Değişiklik olmayan servis gizli** | BoM'da prod release == test release olan servisler yayınlama paketine dahil edilmez ve Customer Dashboard'da gösterilmez |
| **Todo paylaşımı** | Todo'lar müşterinin geçiş sürecindeki aksiyonlardır. Tanımlama: Release Todo ekranı. Özet: Health Check Readiness. Yürütme (bitti işaretleme): Customer Dashboard |
| **Todo faz yapısı** | Her todo GEÇİŞ ÖNCESİ / ANINDA / SONRASI olarak sınıflandırılır — phase enum: PRE, DURING, POST |
| **Tekrarlayan todo** | `isRecurring = true` şablonlar yeni versiyon oluşturulunca otomatik kopyalanır — her versiyonda sıfırdan başlar |
| **Todo müşteri bazında tamamlama** | Aynı todo her müşteri için ayrı ayrı "yapıldı" işaretlenir (CustomerTodoCompletion tablosu) |
| **Todo scope** | `scope = ALL` → tüm müşteriler, `scope = SPECIFIC` → yalnızca seçilen müşteriler |
| **Todo sadece Readiness'ta (özet)** | Development segmentinde todo section'ı yoktur — todo tanımlama ayrı ekran, izleme Readiness'ta |
| **v1.0.0 zorunlu** | Ürünün ilk versiyonu olmadan Health Check anlamsız — ürün oluşturma wizard'ında zorunlu |
| **Release note cascade** | Azure alanı → AI üretim (PR varsa) → eksik uyarı — bu sırayla değerlendirilir |
| **Müşteri note koruması** | `Customer Name` dolu + `ReleaseNoteNotRequired = true` = ❌ YASAK — müşteri talebi note'suz yayınlanamaz |
| **AI fire-and-forget** | AI üretim asenkron (n8n) — sonuç birkaç dakika sonra sayfayı yenileyince görülür |
| **Release note sadece Readiness'ta** | Release note hazırlığı + cascade + AI üretim yalnızca Yayın Hazırlığı segmentinde — Development'ta release note section'ı yoktur |
| **PR + WI her iki segmentte** | PR'lar ve Work Item'lar her iki segmentte gösterilir (farklı zaman aralığı + perspektifle). Release note + değişiklik analizi sadece Segment 1'de |
| **Değişiklik sadece Readiness'ta** | Sistem değişiklikleri (3 kategori) yalnızca Yayın Hazırlığı segmentinde — Development'ta değişiklik section'ı yoktur |
| **Değişiklik 3 kategori** | Ekran Layout (💻), API Değişikliği (🔌), Entity/Tablo (🗄️) — dosya yolundan otomatik kategori ataması |
| **Breaking otomatik tespit** | Silme, tip değişikliği, imza değişikliği, zorunlu parametre ekleme → otomatik `breaking: true`. Ekleme = `false` (override edilebilir) |
| **MCP response ikili** | AI analizi tek response'ta hem `releaseNote` hem `changes` objesi döner — backend ayrı tablolara kaydeder |

### 6.9 Rol Bazlı Varsayılan Segment

| Rol | Varsayılan Segment | Neden |
|-----|-------------------|-------|
| Release Manager | 🛡️ Yayın Hazırlığı | Karar mercii — "çıkabilir mi?" sorusuna bakıyor |
| Product Owner | 🛡️ Yayın Hazırlığı | Release blocker'ları ve scope arıyor |
| Team Lead | Rol ve duruma göre | Test aşamasında readiness, development'ta tracking |
| Developer | 🔧 Geliştirme İzleme | Kendi PR'larını ve WI'larını takip ediyor |

> **RM Notu:** Varsayılan segment sadece ilk ziyarette kullanılır. Sonraki ziyaretlerde localStorage'daki son tercih geçerlidir.

### 6.10 API Bağlantıları

| Method | Endpoint | Segment | Tetik |
|--------|----------|---------|-------|
| GET | `/api/products` | Ortak | Sayfa açılışı |
| GET | `/api/product-versions?productId={id}` | Ortak | Ürün seçilince |
| GET | `/api/products/{id}` | Her ikisi | Versiyon seçilince (BoM hiyerarşisi) |
| GET | `/api/service-release-snapshots?productId={id}` | Readiness | BoM section |
| GET | `/api/tfs/pull-requests?productId={id}` | Her ikisi | Versiyon seçilince |
| GET | `/api/tfs/work-items?ids={list}&productId={id}` | Her ikisi | PR'lar yüklenince (PR-linked) |
| GET | `/api/tfs/work-items?plannedVersion={ver}&productId={id}` | Her ikisi | Versiyon seçilince (version-matched) |
| GET | `/api/release-notes?versionId={id}` | Her ikisi | Versiyon seçilince |
| POST | `/api/release-notes/trigger-generation` | Her ikisi | AI üretim tetikleme (tek/toplu) |
| GET | `/api/system-changes?versionId={id}` | Her ikisi | Versiyon seçilince |
| GET | `/api/release-todos?versionId={id}` | Readiness | Versiyon seçilince (özet) |
| GET | `/api/release-todos?productId={id}&versionId={id}` | Todo Ekranı | Todo yönetim ekranı |
| POST | `/api/release-todos` | Todo Ekranı | Yeni todo oluştur |
| PATCH | `/api/release-todos/{id}` | Todo Ekranı | Todo güncelle |
| DELETE | `/api/release-todos/{id}` | Todo Ekranı | Todo sil |
| GET | `/api/release-todos/recurring?productId={id}` | Todo Ekranı | Tekrarlayan şablonlar |
| POST | `/api/release-todos/recurring` | Todo Ekranı | Tekrarlayan oluştur |
| POST | `/api/release-todos/{id}/upload-guide` | Todo Ekranı | Rehber doküman yükle |
| PATCH | `/api/product-versions/{id}` | Readiness | Release'i Yayınla (status → RELEASED) |
| POST | `/api/version-packages` | Readiness | Değişen servislerin paket bilgisini kaydet |
| POST | `/api/service-release-snapshots` | Readiness | Değişen servislerin snapshot'ını güncelle |
| GET | `/api/version-packages?versionId={id}` | Customer Dashboard | Versiyon paket içeriği (hiyerarşik) |
| GET | `/api/tfs/branches?repoName={name}` | Readiness | GIT_SYNC ürün — release branch listesi |
| GET | `/api/tfs/tags?repoName={name}` | Readiness | GIT_SYNC ürün — tag listesi |
| PATCH | `/api/product-versions/{id}` | Development | Teste Al |

### 6.11 Boş ve Hata State'leri

| Durum | Gösterim |
|-------|----------|
| Ürün seçilmedi | Merkezi ilustrasyon: "Bir ürün seçerek başlayın" |
| Ürünün hiç versiyonu yok | ❌ "Bu ürünün başlangıç versiyonu eksik" — **Bu durumun oluşmaması gerekir** (6.3 zorunluluğu) ama defensive olarak handle edilir |
| Readiness — TESTING versiyon yok | "Test aşamasında versiyon yok. Geliştirme İzleme segmentinden bir versiyonu teste alabilirsiniz." |
| Development — IN_DEVELOPMENT versiyon yok | "Aktif geliştirmede versiyon yok. Release Calendar'dan yeni versiyon oluşturabilirsiniz." |
| Azure yapılandırılmamış | PR ve WI section'larında: `Alert info` — BoM ve Todo her zaman gösterilir |
| TFS API hatası | İlgili section'da: `Alert error` + "Yenile" butonu |
| Backend 500 | Section başlığında kırmızı ikon + "Yüklenemedi [↻]" |
| Todo PATCH hatası | Optimistic update geri alınır + `Snackbar error` |
| GIT_SYNC branch/tag bulunamadı | Branch/tag popup'ında "Devam" devre dışı, uyarı mesajı |
| Release/Teste Al hatası | Dialog açık kalır + `Alert error` mesajı |

---

## Mevcut Durum vs Hedef — Release Health Check

**Mevcut sayfa:** `packages/frontend/src/pages/ReleaseHealthCheckPage.tsx` — V2 implementasyonu (Firebase bağımlı, eski faz modeli, n8n webhook çağrıları)

| Özellik | Mevcut (V2) | Hedef (V3) | Gap |
|---------|------------|------------|-----|
| Versiyon seçimi | ❌ yok — sadece ürün seçimi | ✅ Ürün + Versiyon seçimi | 🔴 Eklenmeli |
| Segmented Control | ❌ yok — tek görünüm | ✅ Readiness + Development iki segment | 🔴 Yeni mimari |
| Sağlık skoru | 🟡 var ama yüzeysel | ✅ Detaylı formül + engel kartları | 🟡 Formül güncellenmeli |
| BoM (Servis Versiyonları) | ✅ var | ✅ + snapshot delta | 🟡 Snapshot entegrasyonu |
| PR listesi | ✅ var | ✅ + yaş uyarısı (Development) | 🟡 Development perspektifi eklenmeli |
| Work Items | ✅ var (sadece PR-linked) | ✅ Üç kaynak (PR + Version + Manuel) + ilerleme çubuğu | 🔴 Version-matched + manuel ekleme yeni |
| Release Notes | ✅ var (manuel giriş) | ✅ Cascade: Azure → AI → eksik + ReleaseNoteNotRequired + müşteri koruması | 🔴 Cascade mantığı + AI entegrasyonu + müşteri guard |
| Sistem Değişiklikleri | ✅ var | ✅ + erken uyarı (Development) | 🟡 İki perspektif |
| Release Todos | ✅ var | ✅ + planlama modu (Development) | 🟡 İki mod |
| Release Onayla | ✅ var | ✅ + snapshot kaydetme | 🟡 Snapshot entegrasyonu |
| Teste Al | ❌ yok | ✅ IN_DEVELOPMENT → TESTING | 🔴 Yeni aksiyon |
| Firebase bağımlılığı | 🔴 var | ❌ sıfır | 🔴 Tam migration |
| n8n webhook çağrıları | 🔴 var (frontend direkt) | ❌ Backend proxy | 🔴 Proxy'e taşınmalı |
| Son yayınlanan versiyon | ❌ gösterilmiyor | ✅ Header'da sabit | 🔴 Eklenmeli |
| v1.0.0 zorunluluğu | ❌ yok | ✅ Product onboarding'de | 🔴 Yeni kural |

**Product Entity — Yeni alan (6.3):**

| Alan | Mevcut | Hedef | Gap |
|------|--------|-------|-----|
| İlk versiyonun zorunluluğu | ❌ — ürün versiyonsuz oluşturulabiliyor | ✅ — wizard 2. adımda v1.0.0+ zorunlu | 🔴 Backend validation + frontend wizard |

### Yapılması Gerekenler

1. **Segmented Control bileşeni:** MUI ToggleButtonGroup veya custom Segmented Control — iki segment, URL + localStorage state
2. **Sayfa yeniden yazımı:** Mevcut V2 → V3 tam yeniden yazım. Firebase ve n8n webhook bağımlılıkları kaldırılacak
3. **Versiyon seçici:** Segment'e göre filtreleme — TESTING (readiness) / IN_DEVELOPMENT (development)
4. **Son yayınlanan versiyon query:** `GET /api/product-versions?productId={id}&status=RELEASED&orderBy=actualReleaseDate&order=desc&limit=1`
5. **Sağlık skoru formülü:** Client-side hesaplama, engel kartları ile entegre
6. **PR yaş uyarısı:** Development segmentinde PR açılma tarihi kontrolü — 7/14 gün eşikleri
7. **İlerleme çubuğu:** Development segmentinde work item tamamlanma oranı görselleştirmesi
8. **Teste Al akışı:** `PATCH /api/product-versions/:id { status: "TESTING" }` + onay dialog
9. **Release'i Yayınla akışı:** `PATCH /api/product-versions/:id { status: "RELEASED", actualReleaseDate: now() }` + snapshot kaydetme
10. **Product onboarding wizard:** Mevcut tek adımlı ürün oluşturma → 2 adımlı wizard. 2. adımda başlangıç versiyonu (v1.0.0+) zorunlu
11. **Backend validation — v1.0.0 minimum:** Product oluşturma endpoint'inde versiyon `>=1.0.0` kontrolü, `v0.x.x` reject
12. **Mevcut UX tasarımı güncelleme:** `designs/screens/release-health-check.md` + `designs/specs/release-health-check-v3.md` — ikili segment yapısıyla revize
13. **Rol bazlı varsayılan segment:** JWT'den kullanıcı rolüne göre ilk segment kararı (localStorage yoksa)
14. **Release Notes eksik skor etkisi:** Mevcut formüle −2/eksik note ekle
15. **Version-matched WI toplama:** `GET /api/tfs/work-items?plannedVersion={ver}&productId={id}` — Azure `Planned Version` alanına göre WI filtresi
16. **Manuel WI ekleme:** Versiyona WI ilişkilendirme (ID doğrulama + kaydetme) — `POST /api/product-versions/{id}/work-items` + frontend dialog
17. **Azure DevOps custom field zorunluluğu:** Proje şablonuna 5 custom field eklenmeli: `Planned Version`, `Customer Name`, `ReleaseNote Title`, `ReleaseNote Description`, `ReleaseNoteNotRequired`. Dokümante edilmeli.
18. **Release Notes cascade mantığı:** Azure dolu → Hazır; boş + PR bağlı → AI üretilebilir; boş + PR yok + NotRequired değil → Eksik uyarı. Frontend cascade UI + skor entegrasyonu
19. **WI müşteri sütunu:** `Customer Name` alanından müşteri bilgisi gösterme + release note'larda müşteri bazlı gruplandırma
20. **ReleaseNoteNotRequired alanı:** Azure DevOps'ta 5. custom field. Frontend'de WI satırında `[⬜ Gerekmiyor]` gösterimi. CustomerName koruması client-side kontrol
21. **AI release note entegrasyonu:** `[🤖 AI Üret]` (tek) ve `[🤖 Tümünü Üret]` (toplu) butonları → `POST /api/release-notes/trigger-generation` → n8n fire-and-forget. Mevcut altyapı kullanılır (MCP Server + n8n workflow)
22. **Müşteri talebi release note koruması:** `CustomerName != null && ReleaseNoteNotRequired == true` → ❌ skor −5, buton uyarı, by-pass yok. Backend validation da eklenecek
23. **Skor formülü güncelleme:** Release note eksik etkisini cascade durumuna göre farklılaştır: müşterili ihlal = −5, normal eksik = −2
24. **Aksiyonel release note altyapısı:** `actionRequired: boolean` + `actionGuide: string` (markdown) alanları — release note içinde business ekip için aksiyon rehberi. İleri tasarım (Section 7).
25. **Değişiklik 3-kategori yapısı:** system-changes tablosunda `category: SCREEN_LAYOUT | API_CHANGE | ENTITY_TABLE` enum'u. Frontend'de kategori bazlı gruplama + filtreleme
26. **Değişiklik detay modeli:** Her değişiklik satırı için: `{ changeAction: ADDED|DELETED|UPDATED|SIGNATURE, fieldName, oldValue?, newValue?, dataType?, isBreaking }`. Backend tablo + API
27. **Breaking change otomatik işaretleme:** Backend validation — silme/tip değişikliği/imza değişikliği geldiğinde `isBreaking = true` zorla. Ekleme geldiğinde `false` varsayılan
28. **MCP response parser:** n8n workflow veya backend'de MCP `changes` objesini parse edip `system-changes` tablosuna kategori atayarak kaydetme
29. **Değişiklik manuel ekleme UI:** `[+ Değişiklik Ekle]` dialog — kategori seç, alan adı/path gir, breaking işaretle. `POST /api/system-changes`
30. **Todo veri modeli yeniden tasarım:** ReleaseTodo entity: phase (PRE/DURING/POST), responsibleTeam, priority, sortOrder, scope (ALL/SPECIFIC), customerIds[], requiresOrgParticipation, guideUrl, isRecurring, recurringTemplateId. Prisma migration
31. **CustomerTodoCompletion tablosu:** Müşteri bazında todo tamamlama takibi: todoId + customerId + versionId + completed + completedAt + completedBy + notes. Customer Dashboard'dan güncellenir
32. **Tekrarlayan todo mekanizması:** Backend: yeni versiyon oluşturulduğunda `isRecurring = true` şablonları otomatik kopyalama. `POST /api/release-todos/copy-recurring?versionId={id}`
33. **Release Todo Tanımlama ekranı:** `/release-todos?productId={id}&versionId={id}` — CRUD + faz gruplama + tekrarlayan şablon yönetimi + rehber doküman upload. Frontend + backend fullstack
34. **Rehber doküman upload:** `POST /api/release-todos/{id}/upload-guide` + `GET /api/release-todos/{id}/guide` — dosya depolama (local disk veya S3). PDF, MD, DOCX destekli
35. **Health Check todo özet görünümü:** Mevcut inline checkbox → read-only özet. `[Tümünü Gör]` butonu Todo Tanımlama ekranına yönlendirme
36. **VersionPackage veri modeli:** Yeni tablo: `VersionPackage` + `VersionPackageItem`. Yayınlama anında değişiklik olan servislerin paket bilgisini kaydeder. `previousRelease`, `currentRelease`, `prIds`, `workItemIds` alanları. Customer Dashboard'un temel veri kaynağı
37. **Yayınla akışı yeniden tasarım:** 3 adımlı wizard: özet + dahil olan servisler → GIT_SYNC branch/tag (koşullu) → son onay. Skor koşulu kaldırıldı, uyarı ile devam. Sadece değişen servislerin snapshot + paket kaydı
38. **GIT_SYNC release branch/tag popup:** `supportedArtifactTypes.includes('GIT_SYNC')` ise yayınlama sürecinde branch/tag seçimi zorunlu. `usesReleaseBranches` flag'ine göre branch veya tag autocomplete. Customer Dashboard + Code Sync'te kullanılacak
39. **Değişen servis tespiti:** BoM'daki her servis için `lastProdRelease ↔ lastPrepRelease` karşılaştırma mantığı. Eşitse → pakete dahil etme, snapshot güncelleme. Backend endpoint + frontend filtreleme
40. **Branch/tag autocomplete API:** `GET /api/tfs/branches?repoName={name}` + `GET /api/tfs/tags?repoName={name}` — Azure DevOps'tan branch ve tag listesini çekme. MCP Server üzerinden proxy

---

## 7. Customer Dashboard — Müşteri Portalı

Müşterinin sahip olduğu ürünlerin durumunu takip ettiği, yeni versiyonlara geçiş planladığı, paket detaylarını incelediği ve artifact'ları indirdiği ana ekrandır. **Müşteri rolündeki kullanıcılar bu ekranı görür** — kurum çalışanları görmez (onlar Release Calendar + Health Check kullanır).

### 7.1 Müşteri Tespiti ve Giriş

Login olan kullanıcının e-posta domain'i ile müşteri eşleştirilir (Section 3.1 detayı):

```
1. Kullanıcı login olur → JWT'den email alınır
2. Email domain çıkarılır: ahmet.yilmaz@isbank.com.tr → isbank.com.tr
3. DB sorgusu: SELECT * FROM customers WHERE 'isbank.com.tr' = ANY(email_domains)
4. Eşleşme bulundu → customerId context'e set edilir
5. Tüm API çağrılarına customerId otomatik eklenir (middleware)
6. Eşleşme bulunamadı → "Müşteri kaydınız bulunamadı" boş state
```

**Route:** `/customer-dashboard`

**Yetkilendirme:** `role = CUSTOMER` olan kullanıcılar bu sayfaya erişir. Kurum rollerinden (ADMIN, RELEASE_MANAGER, DEVELOPER) bu sayfa erişilemez.

### 7.2 Sayfa Yapısı — İki Katmanlı Düzen

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏢 Hoş geldiniz, İş Bankası                             [🔔 3]  [👤 Profil]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ── ÜRÜN KARTLARI (her zaman görünür, üst katman) ──────────────────────── │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ 📦 Cofins BFF     │  │ 📦 E-Fatura       │  │ 📦 Raporlama     │          │
│  │                    │  │                    │  │                    │          │
│  │ ✅ Güncel           │  │ ⚠️ Bekleyen Güncell│  │ 🔴 Bekleyen Hotfix│          │
│  │ v2.5.0             │  │ Mevcut: v3.1.0     │  │ Mevcut: v1.8.0    │          │
│  │                    │  │ Yeni:   v3.2.0     │  │ Hotfix: v1.8.1-hf │          │
│  │ Todo: 0            │  │ Todo: 3 🔴         │  │ Todo: 1 🔴        │          │
│  │ Son geçiş: 15 Şub  │  │ [Güncellemeyi Al →]│  │ [Güncellemeyi Al →]│          │
│  │                    │  │                    │  │                    │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
│  ── ÜRÜN DETAY (seçilen ürün kartına tıklayınca aşağıda açılır) ────────── │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  📦 E-Fatura Platformu                                    [✕ Kapat] │   │
│  │                                                                      │   │
│  │  ┌────────────┬────────────┬──────────────────┐                     │   │
│  │  │ 📅 Takvim   │ 📋 Versiyonl│ ℹ️ Ürün Bilgisi  │                     │   │
│  │  └────────────┴────────────┴──────────────────┘                     │   │
│  │                                                                      │   │
│  │  ... seçilen tab'ın içeriği ...                                      │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Tek ürünlü müşteri:** Ürün kartı otomatik seçili gelir, detay alanı doğrudan açık başlar. Kart listesi yine gösterilir ama tek kart olur.

#### Ürün Kartı Durum Hesaplama

Her kart müşterinin o üründeki güncellik durumunu gösterir:

| Durum | Koşul | Kart Renk/İkon |
|-------|-------|----------------|
| ✅ Güncel | `currentVersionId` = en son RELEASED versiyonun ID'si | Yeşil border, ✅ ikon |
| ⚠️ Bekleyen Güncelleme | RELEASED versiyon var ama müşteri henüz almamış | Turuncu border, ⚠️ ikon |
| 🔴 Bekleyen Hotfix | Bekleyen versiyonlardan biri `isHotfix = true` | Kırmızı border, 🔴 ikon |
| 📅 Geçiş Planlandı | Müşterinin PLANNED durumunda bir `CustomerVersionTransition` kaydı var | Mavi badge: "15 Mar geçiş planlandı" |
| ⚪ Hiç versiyon almamış | `currentVersionId = null` | Gri, "Henüz kurulum yapılmamış" |

**Todo sayısı:** Müşterinin tamamlamadığı P0 todo sayısı gösterilir (CustomerTodoCompletion tablosundan — Section 6.4.7).

### 7.3 Tab 1 — Takvim (Ürün Release Takvimi)

Ürün seçildikten sonra o ürünün versiyonlarını takvim görünümünde gösterir. Müşterinin geçiş planlaması buradan yapılır.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📅 Release Takvimi — E-Fatura Platformu                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ← Mart 2026 →                                                          │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐                    │
│  │  Pzt │  Sal │  Çar │  Per │  Cum │  Cmt │  Paz │                    │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤                    │
│  │  02  │  03  │  04  │  05  │  06  │  07  │  08  │                    │
│  │      │      │      │      │      │      │      │                    │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤                    │
│  │  09  │  10  │  11  │  12  │  13  │  14  │  15  │                    │
│  │      │      │🟢v2.5│      │      │      │🔴dolu│                    │
│  │      │      │RELSD │      │      │      │      │                    │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤                    │
│  │  16  │  17  │  18  │  19  │  20  │  21  │  22  │                    │
│  │📅biz │      │      │      │🟠v2.6│      │      │                    │
│  │plan. │      │      │      │TESTIN│      │      │                    │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘                    │
│                                                                          │
│  Renk Kodları:                                                          │
│  🟢 Yayınlandı (alınabilir)   ░░ Zaten aldığınız (gri)                 │
│  🟠 Test aşamasında           📅 Sizin geçiş planınız                   │
│  🔵 Geliştiriliyor            🔴 Dolu (concurrentUpdatePolicy: BLOCK)  │
│                                                                          │
│  ── Alt Detay (versiyon tıklandığında) ──                               │
│                                                                          │
│  🟢 v2.5.0 — Yayınlandı (11 Mar 2026)                                   │
│  Yenilikler: 14 PR, 3 yeni modül, 2 breaking change                    │
│                                                                          │
│  [📋 Release Notes]  [📅 Geçiş Planla]  [Güncellemeyi Al →]            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Takvim davranışları:**
- **Visibility filtresi:** Sadece Product'ın `customerVisibleStatuses` ayarındaki statülerdeki versiyonlar gösterilir (Section 5.11)
- **Zaten alınan versiyonlar:** `currentVersionId` ile eşleşen ve daha eski versiyonlar gri modda gösterilir, tıklanamaz
- **Yeni yayınlanan:** `RELEASED` durumunda olan ve müşterinin henüz almadığı versiyonlar yeşil + vurgulu gösterilir
- **Dolu günler:** `concurrentUpdatePolicy = BLOCK` ise başka müşterinin geçiş planladığı günler kırmızı gösterilir (Section 5.6)

#### Geçiş Planlama — Ortam Bazında Tarih Girişi

Müşterinin sahip olduğu tüm ortamlar (CPM.environments) için planlanan tarih girilir:

```
┌──────────────────────────────────────────────────────────────────────┐
│  📅 Geçiş Planla — E-Fatura v2.5.0                           [✕]   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Mevcut: v2.4.0 → Hedef: v2.5.0                                    │
│                                                                      │
│  Ortam bazında planlı geçiş tarihleri:                              │
│                                                                      │
│  ┌────────────┬──────────────────┬──────────────────┐              │
│  │ Ortam      │ Planlanan Tarih  │ Gerçekleşen Tarih│              │
│  ├────────────┼──────────────────┼──────────────────┤              │
│  │ 🧪 Test    │ [15 Mar 2026 📅] │ [      —      ]  │              │
│  │ 🟡 Pre-Prod│ [18 Mar 2026 📅] │ [      —      ]  │              │
│  │ 🟢 Prod    │ [22 Mar 2026 📅] │ [      —      ]  │              │
│  └────────────┴──────────────────┴──────────────────┘              │
│                                                                      │
│  ℹ️ concurrentUpdatePolicy: BLOCK                                   │
│     🔴 22 Mar Prod: başka müşteri planlamış — farklı gün seçin     │
│                                                                      │
│  Not: [                                         ]                   │
│                                                                      │
│              [İptal]            [📅 Planla]                          │
└──────────────────────────────────────────────────────────────────────┘
```

**concurrentUpdatePolicy kontrolü:**
- `BLOCK` → aynı güne başka müşteri planlanmışsa tarih seçimi engellenir (Section 5.6)
- `WARN` → sarı uyarı gösterilir ama devam edilebilir
- Kontrol **yalnızca Prod ortamı** için uygulanır — Test ve Pre-Prod serbest

**Environment-bazlı CustomerVersionTransition güncellemesi:**

```typescript
// Her ortam için ayrı planlama kaydı
interface CustomerVersionTransition {
  // ... mevcut alanlar (Section 5.6) ...
  environment: string;          // hangi ortam için
  plannedDate: DateTime;        // planlanan tarih
  actualDate?: DateTime;        // gerçekleşen tarih
}

// Unique constraint güncellenir:
// [customerProductMappingId, toVersionId, environment]
```

##### Gerçekleşen Tarih Girişi — Inline Düzenleme

Geçiş tamamlandığında müşteri "Gerçekleşen Tarih" hücresine tıklar ve tarih girer:

```
┌────────────┬──────────────────┬──────────────────┬──────────┐
│ Ortam      │ Planlanan Tarih  │ Gerçekleşen Tarih│ Durum    │
├────────────┼──────────────────┼──────────────────┼──────────┤
│ 🧪 Test    │ 15 Mar 2026      │ 15 Mar 2026 ✅   │ Tamam    │
│ 🟡 Pre-Prod│ 18 Mar 2026      │ [📅 tıkla]       │ Bekliyor │
│ 🟢 Prod    │ 22 Mar 2026      │ [📅 tıkla]       │ Bekliyor │
└────────────┴──────────────────┴──────────────────┴──────────┘
```

**Prod ortamı gerçekleşen tarihi girildiğinde:**
1. `CustomerVersionTransition.status` → `COMPLETED`
2. `CustomerVersionTransition.actualDate` → girilen tarih
3. `CustomerProductMapping.currentVersionId` → `toVersionId` olarak güncellenir
4. **Customer–Service Version Matrix güncellenir** — müşterinin hangi servisleri hangi versiyonla aldığı kaydedilir (Section 8'de detaylandırılacak)

> **RM Gözlemi — Neden sadece 2 tarih?** Planlanan ve gerçekleşen. Geçiş süreci karmaşık olabilir ama takip noktası 2'dir: "ne zaman yapacağız?" ve "ne zaman yaptık?". Ortam bazında bu 2 tarih ile hem planlama, hem raporlama, hem de müşteri–servis matrix doldurma işlemleri yapılır.

### 7.4 Tab 2 — Versiyonlar (Güncelleme Detay Sayfası)

[Güncellemeyi Al →] butonu ile açılan ana detay sayfasıdır. Yayınlanmış versiyonları listeler, müşterinin aldığı ve almadığı versiyonları ayrıştırır.

**Route:** `/customer-dashboard/versions?productId={id}`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📦 E-Fatura Platformu — Versiyonlar                          İş Bankası   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Mevcut Versiyonunuz: v2.4.0                                                │
│                                                                              │
│  ── Bekleyen Güncellemeler (almadığınız) ────────────────────────────────── │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🟢 v2.5.0  │  Yayın: 11 Mar 2026  │  14 PR  │  3 breaking change │    │
│  │             │  Geçiş: 📅 22 Mar (planlandı)                        │    │
│  │                                                                     │    │
│  │  [📋 Release Notes]  [📋 Yapılacaklar]  [🔄 Değişiklikler]         │    │
│  │                                                                     │    │
│  │  ── Paket Detayı ──────────────────────────────────────────────    │    │
│  │                                                                     │    │
│  │  ▼ Ödeme Servisleri (ModuleGroup)                                  │    │
│  │    ▼ Core Banking (Module)                                         │    │
│  │      cofins-service-api    │ Release-45 → Release-47  │ 2 PR      │    │
│  │      cofins-auth-service   │ Release-10 → Release-12  │ 1 PR      │    │
│  │    ▼ Notification (Module)                                         │    │
│  │      cofins-notify-svc     │ Release-6  → Release-8   │ 4 PR      │    │
│  │                                                                     │    │
│  │  ── Aksiyonlar ────────────────────────────────────────────────    │    │
│  │                                                                     │    │
│  │  [ ... artifact'a göre aksiyon butonları (7.5'te detay) ... ]      │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ── Aldığınız Versiyonlar ──────────────────────────────────────────────── │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ░░ v2.4.0  │  Alındı: 15 Şub 2026  │  8 PR                       │    │
│  │ ░░ v2.3.0  │  Alındı: 10 Oca 2026  │  5 PR                       │    │
│  │ ░░ v2.2.0  │  Alındı: 01 Ara 2025  │  12 PR                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Aldığınız versiyonların detayları salt okunur görüntülenebilir.            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Paket detayı:** `VersionPackage` tablosundan gelir (Section 6.4.8). Hiyerarşik gösterim: Ürün → Modül Grubu → Modül → Service/API + önceki release → yeni release.

**Müşteri filtresi:** Paket detayında yalnızca müşterinin abone olduğu servisler gösterilir (CPM.subscriptionLevel + resolve logic — Section 4.2). Müşterinin kullanmadığı servisler gizlenir.

#### Alt Ekranlar (Versiyon Seçilince)

| Buton | Yönlendirildiği Sayfa | Veri Kaynağı |
|-------|------------------------|--------------|
| [📋 Release Notes] | Versiyon release note'ları | Section 6.4.5 — releaseNotes tablosu |
| [📋 Yapılacaklar] | Todo listesi (müşteri bitti işaretler) | Section 6.4.7 — ReleaseTodo + CustomerTodoCompletion |
| [🔄 Değişiklikler] | Sistem değişiklikleri (3 kategori) | Section 6.4.6 — systemChanges tablosu |

##### Yapılacaklar (Todo) — Müşteri Yürütme Ekranı

Customer Dashboard'da todo'lar **tam etkileşimli** olarak gösterilir. Müşteri burada todo'ları "yapıldı" olarak işaretler:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📋 Yapılacaklar — E-Fatura v2.5.0                    İş Bankası  [✕]  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  İlerleme: ████████████░░░░░░░░  5/9 tamamlandı                        │
│                                                                          │
│  ── GEÇİŞ ÖNCESİ ──                                                    │
│                                                                          │
│  ☑  [P0] DB migration çalıştır          DevOps    ✅ 15 Mar — A.Yılmaz │
│         📎 migration-v2.5.0.pdf                                         │
│  ☑  [P1] Config güncelle                Delivery  ✅ 15 Mar — M.Kaya   │
│  ☐  [P1] Müşteri iletişimi gönder       Delivery  ⬜ yapılmadı          │
│                                                                          │
│  ── GEÇİŞ ANINDA ──                                                    │
│                                                                          │
│  ☑  [P1] Cache flush                    DevOps    ✅ 16 Mar — A.Yılmaz │
│  ☐  [P1] 🎯 SLA config güncelle         DevOps    ⬜ yapılmadı          │
│         → Kurum katılımı gerekli                                        │
│                                                                          │
│  ── GEÇİŞ SONRASI ──                                                   │
│                                                                          │
│  ☐  [P2] Smoke test                     QA        ⬜ yapılmadı          │
│  ☑  [🔁] REDIS temizle                  DevOps    ✅ 16 Mar — A.Yılmaz │
│  ☐  [🔁] Backup doğrulama              DevOps    ⬜ yapılmadı          │
│  ☑  [P1] Log kontrol                    DevOps    ✅ 16 Mar — A.Yılmaz │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  Checkbox tıkla → tamamla:                                              │
│       → Kim: giriş yapan kullanıcı                                      │
│       → Ne zaman: şu an (otomatik)                                      │
│       → Not eklemek ister misiniz? [opsiyonel text input]               │
└──────────────────────────────────────────────────────────────────────────┘
```

**Todo tamamlama API:**
```
PATCH /api/customer-todo-completions
Body: {
  todoId: "...",
  customerId: "...",
  versionId: "...",
  completed: true,
  notes?: "Migration 3 dakikada tamamlandı"
}
```

**Kapsam filtresi:**
- `scope = ALL` → tüm müşterilere gösterilen todo'lar
- `scope = SPECIFIC, customerIds.includes(currentCustomerId)` → bu müşteriye özel todo'lar (🎯 ikonu)
- `scope = SPECIFIC, !customerIds.includes(currentCustomerId)` → gizlenir

**Kurum katılımı:** `requiresOrgParticipation = true` olan todo'larda "Kurum katılımı gerekli" badge'i gösterilir. İleride kurum tarafı notification entegrasyonu eklenebilir.

### 7.5 Artifact Bazlı Aksiyon Butonları

Müşterinin `artifactType` ve `deploymentModel` kombinasyonuna göre versiyonun aksiyon butonları değişir:

#### SaaS Müşteri (`deploymentModel = SAAS`)

```
┌──────────────────────────────────────────────────────────────┐
│  Aksiyonlar                                                  │
│                                                              │
│  ℹ️ Bu ürün SaaS olarak yönetilmektedir.                    │
│  Güncelleme kurumunuz tarafından uygulanacaktır.             │
│                                                              │
│  [📋 Detayları Görüntüle]    [📩 Güncelleme Talep Et]       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- **Detayları Görüntüle:** Paket detayı, release notes, değişiklikler — salt okunur
- **Güncelleme Talep Et:** Kurum release manager'ına bildirim gönderir (n8n notification)
- Artifact indirme butonu **yok** — SaaS müşterisi deploy yapmaz

#### On-Prem Docker + IaaS (`artifactType = DOCKER, hostingType = IAAS`)

```
┌──────────────────────────────────────────────────────────────┐
│  Aksiyonlar — Docker (IaaS — Kurum Yönetimli)               │
│                                                              │
│  Ortam bazında güncelleme onayı:                            │
│                                                              │
│  ┌────────────┬────────────────┬───────────┐                │
│  │ Ortam      │ Durum          │ Aksiyon   │                │
│  ├────────────┼────────────────┼───────────┤                │
│  │ 🧪 Test    │ ⬜ Onay bekliy. │ [✅ Onayla]│                │
│  │ 🟡 Pre-Prod│ ⏳ Sırada       │     —     │                │
│  │ 🟢 Prod    │ ⏳ Sırada       │     —     │                │
│  └────────────┴────────────────┴───────────┘                │
│                                                              │
│  ℹ️ Onayınız sonrası kurum HelmChart'ı ilgili ortama        │
│     deploy edecektir.                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Onay akışı:**
1. Müşteri ortam için [✅ Onayla] tıklar
2. `POST /api/customer-deployments/approve` → `{ versionId, customerId, environment, artifactType: DOCKER }`
3. Backend: ilgili ortam için HelmChart'ın kurum tarafındaki dizinde o müşteri için güncellenmesi tetiklenir
4. Kurum DevOps'a bildirim gönderilir (n8n)
5. Deploy tamamlanınca kurum durumu günceller → müşteri dashboard'da "✅ Güncellendi" görünür

**Sıralı ortam kontrolü:** Test onaylanmadan Pre-Prod onayı verilemez, Pre-Prod onaylanmadan Prod onaylanamaz. (Sıra CPM.environments dizisine göre belirlenir.)

#### On-Prem Docker + Self-Hosted (`artifactType = DOCKER, hostingType = SELF_HOSTED`)

```
┌──────────────────────────────────────────────────────────────┐
│  Aksiyonlar — Docker (Self-Hosted)                          │
│                                                              │
│  Müşteriye özel HelmChart hazır:                            │
│                                                              │
│  📦 helmchart-isbank-efatura-v2.5.0.tgz                     │
│  İçerik: 3 service (cofins-api, auth-svc, notify-svc)      │
│  Boyut: 2.4 MB                                              │
│                                                              │
│  [⬇️ HelmChart İndir]                                       │
│                                                              │
│  Son indirme: 15 Mar 2026, 14:30 — A.Yılmaz                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**İndirme akışı:**
1. Müşteri [⬇️ HelmChart İndir] tıklar
2. Backend: `getEffectiveServices(customerProductMapping)` → müşteriye özel servis listesi
3. Her servis için dockerImageName + versiyon tag → values.yaml üretimi
4. `helmValuesOverrides` (CPM'den) → müşteriye özel override'lar merge
5. HelmChart `.tgz` olarak paketlenir → geçici download URL döner
6. İndirme kaydedilir (audit trail)

#### On-Prem Binary/DLL (`artifactType = BINARY`)

```
┌──────────────────────────────────────────────────────────────┐
│  Aksiyonlar — Binary/DLL Paketi                             │
│                                                              │
│  Güncelleme paketi hazır:                                   │
│                                                              │
│  📦 isbank-efatura-v2.5.0-dlls.zip                          │
│  İçerik: 3 service, 12 DLL dosyası                          │
│  Boyut: 48 MB                                               │
│                                                              │
│  Dağıtım yöntemi: [⬇️ Download     ▾]                       │
│                     ⬇️ Download                              │
│                     📤 FTP'ye Yükle                          │
│                                                              │
│  [⬇️ Paketi İndir]                                          │
│                                                              │
│  Son indirme: —                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**İndirme akışı:**
1. Efektif servis listesi → her servisin `binaryArtifacts` alanından DLL'ler toplanır
2. Klasör yapısı: `/{ModuleGroup}/{Module}/{Service}/` altında DLL'ler
3. ZIP + README (kurulum notları) üretilir
4. `Download` seçildiyse → geçici URL döner, müşteri indirir
5. `FTP'ye Yükle` seçildiyse → CPM'deki FTP ayarlarına göre upload tetiklenir

**FTP Ayarı (CustomerProductMapping'e eklenen alanlar):**

| Alan | Tip | Koşullu | Açıklama |
|------|-----|---------|----------|
| `binaryDistributionMethod` | enum | `BINARY` ise | `DOWNLOAD` \| `FTP` — varsayılan: `DOWNLOAD` |
| `ftpHost` | string | FTP ise | FTP sunucu adresi |
| `ftpPath` | string | FTP ise | Yükleme dizini |
| `ftpCredentials` | encrypted | FTP ise | FTP kullanıcı/şifre (PAT şifreleme ile aynı mekanizma) |

> **RM Gözlemi — FTP vs Download:** Bazı müşteriler güvenlik politikası gereği doğrudan download yapamaz. FTP/SFTP ile kurum tarafından yükleme yapılması gerekir. Bu seçenek CPM ayarlarına bağlanır — müşterinin tercihi bir kez girilir, her versiyonda otomatik uygulanır.

#### Codebase — GIT_SYNC (`artifactType = GIT_SYNC`)

```
┌──────────────────────────────────────────────────────────────┐
│  Aksiyonlar — Kaynak Kod Senkronizasyonu                    │
│                                                              │
│  Kaynak referans: release/v2.5.0                            │
│  (VersionPackage'dan — Section 6.4.8)                       │
│                                                              │
│  Hedef branch: isbank/main                                  │
│  Son sync: v2.4.0 — 15 Şub 2026                            │
│                                                              │
│  [🔄 Code Sync Başlat →]                                    │
│                                                              │
│  ℹ️ Bu işlem sizi Code Sync sayfasına yönlendirecektir.     │
│     Kaynak: release/v2.5.0 → Hedef: isbank/main            │
│     Conflict analizi + insan onayı gereklidir.              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Yönlendirme:**
- [🔄 Code Sync Başlat →] tıklanınca → `/code-sync?source=release/v2.5.0&target=isbank/main&productId={id}&customerId={id}`
- Code Sync sayfasının detayları ileride ayrı section olarak tasarlanacak
- Şu an sadece yönlendirme + temel parametre iletimi

### 7.6 Artifact Aksiyon Karar Matrisi (Özet)

| deploymentModel | artifactType | hostingType | Dashboard Aksiyonu |
|-----------------|--------------|-------------|---------------------|
| **SAAS** | (hepsi) | — | Salt okunur detay + "Güncelleme Talep Et" |
| **ON_PREM** | DOCKER | IAAS | Ortam bazlı onay → kurum deploy eder |
| **ON_PREM** | DOCKER | SELF_HOSTED | HelmChart üret + download |
| **ON_PREM** | BINARY | IAAS | ZIP üret + FTP upload (kurum yükler) |
| **ON_PREM** | BINARY | SELF_HOSTED | ZIP üret + download (veya FTP, ayara bağlı) |
| **ON_PREM** | GIT_SYNC | — | Code Sync sayfasına yönlendir |

### 7.7 Gerçekleşen Tarih ve Müşteri–Servis Matrix Güncellemesi

Müşteri Prod ortamına geçişi tamamlayıp gerçekleşen tarihi girdiğinde:

```
Gerçekleşen tarih girildi (Prod ortamı)
        │
        ▼
1. CustomerVersionTransition.status → COMPLETED
2. CustomerVersionTransition.actualDate → girilen tarih
        │
        ▼
3. CustomerProductMapping.currentVersionId → toVersionId
   (müşteri artık yeni versiyonda)
        │
        ▼
4. Customer–Service Version Matrix güncelle:
   VersionPackage'daki her servis için:
     CustomerServiceVersion tablosu:
       customerId + serviceId → currentRelease = package.currentRelease
   (hangi müşterinin hangi servisi hangi release'de — Section 8)
        │
        ▼
5. Ürün kartı durumu güncellenir:
   ✅ Güncel (yeni RELEASED versiyon yoksa)
   ⚠️ Hâlâ bekleyen (başka RELEASED versiyon varsa)
```

> **RM Notu — Matrix neden önemli?** Release Manager "cofins-service-api'nin Release-47'sini kullanan müşteriler kim?" sorusunu anında cevaplayabilmeli. Bu soru hem security patch uygulaması, hem geri çağırma (recall), hem de destek kayıtları için kritiktir. Detayları bir sonraki section'da.

### 7.8 API Bağlantıları — Customer Dashboard

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/customer-dashboard/summary` | Müşterinin tüm ürün kartları (status, versiyon, todo sayısı) |
| GET | `/api/customer-dashboard/products/{productId}/calendar` | Ürün release takvimi (müşteri perspektifi) |
| GET | `/api/customer-dashboard/products/{productId}/versions` | Yayınlanmış versiyonlar (alınan/alınmayan ayrımı) |
| GET | `/api/version-packages?versionId={id}` | Versiyon paket detayı (hiyerarşik) |
| GET | `/api/release-notes?versionId={id}` | Release notes (müşteri görünümü) |
| GET | `/api/release-todos?versionId={id}&customerId={id}` | Todo listesi (müşteri kapsamında filtrelenmiş) |
| PATCH | `/api/customer-todo-completions` | Todo tamamlama |
| GET | `/api/system-changes?versionId={id}` | Değişiklik listesi |
| POST | `/api/customer-version-transitions` | Geçiş planı oluştur |
| PATCH | `/api/customer-version-transitions/{id}` | Geçiş planı güncelle (gerçekleşen tarih) |
| POST | `/api/customer-deployments/approve` | Docker IaaS ortam onayı |
| GET | `/api/customer-deployments/helmchart?versionId={id}&customerId={id}` | HelmChart download (Self-Hosted) |
| GET | `/api/customer-deployments/binary-package?versionId={id}&customerId={id}` | Binary/DLL ZIP download |
| POST | `/api/customer-deployments/ftp-upload` | FTP'ye yükleme tetikle |
| POST | `/api/customer-deployments/request-update` | SaaS güncelleme talebi |

### 7.9 İş Kuralları — Customer Dashboard

| Kural | Açıklama |
|-------|----------|
| **Müşteri tespiti** | Login → email domain → Customer.emailDomains eşleşmesi. Eşleşme yoksa erişim yok |
| **Sadece abone olunan servisler** | Paket detayında müşterinin CPM.subscriptionLevel'ına göre filtreleme — abone olmadığı servisi görmez |
| **Takvim visibility** | `Product.customerVisibleStatuses` ayarına göre. Varsayılan: sadece RELEASED |
| **concurrentUpdatePolicy sadece Prod** | Test/Pre-Prod ortamları için concurrent kontrolü uygulanmaz — yalnızca Prod |
| **Gerçekleşen tarih → matrix** | Prod gerçekleşen tarihi girildiğinde `currentVersionId` + customer-service matrix otomatik güncellenir |
| **Sıralı ortam onayı (Docker IaaS)** | Test → Pre-Prod → Prod sırasıyla onay verilmeli — atlama yok |
| **FTP vs Download ayara bağlı** | `CPM.binaryDistributionMethod` = FTP ise download butonu yerine "FTP'ye Yükle" gösterilir |
| **GIT_SYNC yönlendirme** | Code Sync butonuna tıklayınca ayrı sayfaya yönlendirme — sync işlemi Customer Dashboard'da yapılmaz |
| **Aldığı versiyonlar salt okunur** | Müşterinin zaten aldığı versiyonlarda aksiyon butonu yok — sadece görüntüleme |
| **Hotfix öncelikli** | `isHotfix = true` versiyonlar kart ve listede kırmızı vurgu ile öne çıkarılır |
| **Todo kapsam filtresi** | `scope = SPECIFIC` todo'larda sadece o müşterinin ID'si varsa gösterilir |

### 7.10 Boş ve Hata State'leri

| Durum | Gösterim |
|-------|----------|
| Müşteri eşleşmesi bulunamadı | "Müşteri kaydınız bulunamadı. Lütfen yöneticinizle iletişime geçin." |
| Müşterinin hiç ürünü yok | "Henüz atanmış ürününüz bulunmuyor." |
| Ürünün hiç RELEASED versiyonu yok | "Bu ürün için yayınlanmış güncelleme bulunmuyor." |
| Paket detayı henüz oluşmamış | "Bu versiyon için paket bilgisi henüz hazırlanmamış." |
| HelmChart/DLL üretim hatası | "Paket oluşturulurken hata oluştu. Lütfen tekrar deneyin." + [Tekrar Dene] |
| FTP upload hatası | "Dosya yüklenemedi: [hata detayı]. Bağlantı bilgilerini kontrol edin." |
| Code Sync sayfası yok (henüz geliştirme) | "Code Sync modülü yakında aktif olacaktır." placeholder

### 7.11 Gap Analizi (Devam — 41-55)

| # | Konu | Detay |
|---|------|-------|
| 41. | **CustomerVersionTransition environment alanı** | Mevcut entity'ye `environment` alanı eklenmeli. Unique constraint güncellenmeli: `[cpmId, toVersionId, environment]` |
| 42. | **Customer middleware** | Login sonrası email domain → customerId çözümleyen middleware. Tüm customer-dashboard route'larına eklenir |
| 43. | **Ürün kartı status API** | `GET /api/customer-dashboard/summary` — currentVersionId vs son RELEASED karşılaştırması, todo count, hotfix kontrolü |
| 44. | **Müşteri takvim API** | `GET /api/customer-dashboard/products/{id}/calendar` — customerVisibleStatuses filtreli, dolu günler (concurrent policy), geçiş planı overlay |
| 45. | **HelmChart generation servisi** | Backend'de müşteriye özel HelmChart paketleme: efektif servis listesi → values.yaml → override merge → .tgz |
| 46. | **Binary/DLL ZIP generation servisi** | Müşteriye özel ZIP: efektif servisler → binaryArtifacts → folder structure → README → .zip |
| 47. | **FTP upload servisi** | CPM.ftpHost/ftpPath/ftpCredentials ile dosya yükleme. SFTP destekli olmalı |
| 48. | **Docker IaaS onay → deploy tetikleme** | Müşteri onayı → kurum DevOps'a notification → HelmChart deploy (manuel veya n8n otomasyonu) |
| 49. | **SaaS güncelleme talebi** | `POST /api/customer-deployments/request-update` → n8n → release manager bildirim |
| 50. | **Sıralı ortam kontrolü** | Docker IaaS onayında Test→Pre-Prod→Prod sıralaması backend'de enforce edilmeli |
| 51. | **Gerçekleşen tarih → matrix cascade** | Prod actual date girişi → currentVersionId güncelle + CustomerServiceVersion tablosu oluştur/güncelle |
| 52. | **CustomerServiceVersion tablosu** | Yeni entity: customerId + serviceId → currentRelease, takenAt. Section 8'de (Müşteri–Servis Matrix) detaylandırılacak |
| 53. | **CPM FTP alanları** | `binaryDistributionMethod`, `ftpHost`, `ftpPath`, `ftpCredentials` — CPM entity'sine eklenmeli |
| 54. | **Download audit trail** | HelmChart/DLL indirme olaylarını logla: customerId, versionId, timestamp, downloadedBy. Raporlama için |
| 55. | **Code Sync yönlendirme parametreleri** | source (branch/tag), target (customer repo), productId, customerId → query params veya shared state |

---

## 8. Müşteri–Servis Versiyon Matrisi (Customer–Service Version Matrix)

"cofins-service-api'nin Release-47'sini hangi müşteriler kullanıyor?" sorusunu anında cevaplayabilen, ürün–servis–müşteri–release ilişkisini görselleştiren kurum tarafı ekranıdır. Security patch, geri çağırma (recall), destek ve planlama kararları bu ekrana bakılarak verilir.

### 8.1 Veri Modeli — CustomerServiceVersion

Müşterinin her servisi hangi release'de kullandığını tutan tablo:

```typescript
interface CustomerServiceVersion {
  id: string;
  customerId: string;           // FK → Customer
  productId: string;            // FK → Product (denormalize — hızlı filtre)
  serviceId: string;            // FK → Service/API
  currentRelease: string;       // "Release-47" — şu an kullanılan release adı
  currentVersionId: string;     // FK → ProductVersion — hangi ürün versiyonuyla alındı
  takenAt: DateTime;            // bu release'e ne zaman geçildi
  previousRelease?: string;     // "Release-45" — bir önceki release (geçiş geçmişi)
  updatedAt: DateTime;
}

// Unique constraint: [customerId, serviceId]
// Bir müşterinin bir servisi için tek aktif kayıt — güncelleme override eder
```

#### Geçmiş Takibi — CustomerServiceVersionHistory

Müşterinin bir serviste sürüm değiştirdiği her an geçmişe yazılır (audit):

```typescript
interface CustomerServiceVersionHistory {
  id: string;
  customerId: string;
  serviceId: string;
  fromRelease: string;          // "Release-45"
  toRelease: string;            // "Release-47"
  fromVersionId: string;        // ProductVersion: v2.4.0
  toVersionId: string;          // ProductVersion: v2.5.0
  transitionDate: DateTime;     // gerçekleşen tarih
  createdAt: DateTime;
}

// Index: [customerId, serviceId, transitionDate DESC]
```

> **RM Gözlemi — Neden iki tablo?** `CustomerServiceVersion` = anlık durum (bu servisi şu an kim hangi release'de kullanıyor?). `CustomerServiceVersionHistory` = zaman serisi (bu servis bu müşteride ne zaman ne oldu?). Anlık sorgu ve geçmiş analizi farklı ihtiyaçlar — tek tabloda çözmek karmaşıklaşır.

### 8.2 Otomatik Doldurma Mekanizması

Customer Dashboard'da Prod ortamı "Gerçekleşen Tarih" girildiğinde tetiklenen cascade (Section 7.7 referansı):

```
Prod gerçekleşen tarih girildi
        │
        ▼
CustomerVersionTransition.status → COMPLETED
CustomerVersionTransition.actualDate → tarih
        │
        ▼
CustomerProductMapping.currentVersionId → toVersionId
        │
        ▼
VersionPackage'ı oku (toVersionId için)
        │
        ├── Her VersionPackageItem için:
        │     │
        │     ▼
        │   CustomerServiceVersion UPSERT:
        │     WHERE customerId = X AND serviceId = item.serviceId
        │     SET:
        │       previousRelease = mevcut currentRelease (varsa)
        │       currentRelease  = item.currentRelease   ("Release-47")
        │       currentVersionId = toVersionId
        │       takenAt = gerçekleşen tarih
        │
        │   CustomerServiceVersionHistory INSERT:
        │       fromRelease = eski currentRelease
        │       toRelease   = item.currentRelease
        │       fromVersionId = fromVersionId
        │       toVersionId   = toVersionId
        │       transitionDate = gerçekleşen tarih
        │
        └── VersionPackage'da OLMAYAN servisler → dokunulmaz
            (değişmeyen servisin release'i aynı kalır)
```

**Kritik kural:** `VersionPackage` yalnızca **değişen** servisleri içerir (Section 6.4.8). Değişmeyen servisler pakette yoktur — onların `CustomerServiceVersion` kaydı olduğu gibi kalır. Bu sayede "müşterinin X servisi Release-45'te kaldı, Y servisi Release-47'ye geçti" durumu doğal olarak oluşur.

### 8.3 İlk Veri Problemi — Bootstrapping

Sistem ilk kez devreye alındığında veya mevcut müşteriler sisteme eklendiğinde `CustomerServiceVersion` tablosu boş olacaktır:

| Senaryo | Çözüm |
|---------|-------|
| **Yeni müşteri — ilk versiyon alımı** | İlk geçiş tamamlandığında `VersionPackage` üzerinden servis kayıtları oluşur. `previousRelease = null` |
| **Mevcut müşteri — verisi henüz yok** | Admin panelinde "Mevcut Durumu İçe Aktar" butonu: ürünün güncel BoM'u alınır → her servisin `currentRelease` değeri o BoM'daki release olarak set edilir |
| **Kademeli geçiş** | İlk gerçek versiyon geçişine kadar matris boş kalabilir — dashboard'da "Başlangıç verisi henüz girilmemiş" uyarısı gösterilir |

### 8.4 Ekran Tasarımı — Matrix Görünümü

**Route:** `/service-version-matrix`
**Erişim:** ADMIN, RELEASE_MANAGER rolleri (müşteri göremez)

#### Ana Filtreler

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📊 Müşteri–Servis Versiyon Matrisi                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Ürün: [E-Fatura Platformu ▾]     Versiyon: [Tümü ▾]                       │
│  Müşteri: [Tümü ▾]                Servis Arama: [🔍           ]             │
│                                                                              │
│  Görünüm:  ◉ Matrix   ○ Servis Odaklı   ○ Müşteri Odaklı                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Görünüm 1 — Matrix (Varsayılan)

Satırlarda servisler (hiyerarşik), sütunlarda müşteriler. Hücreler release adını gösterir:

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  📊 Matrix — E-Fatura Platformu                                                     │
├───────────────────────────┬─────────────┬─────────────┬──────────────┬──────────────┤
│  Servis                   │ İş Bankası  │ Akbank      │ Garanti      │ Yapı Kredi   │
├───────────────────────────┼─────────────┼─────────────┼──────────────┼──────────────┤
│ ▼ Ödeme Servisleri        │             │             │              │              │
│   ▼ Core Banking          │             │             │              │              │
│     cofins-service-api    │ Release-47  │ Release-47  │ Release-45   │ Release-45   │
│                           │ ✅ güncel    │ ✅ güncel    │ ⚠️ eski (−2) │ ⚠️ eski (−2) │
│     cofins-auth-service   │ Release-12  │ Release-12  │ Release-12   │ Release-10   │
│                           │ ✅ güncel    │ ✅ güncel    │ ✅ güncel     │ ⚠️ eski (−2) │
│   ▼ Notification          │             │             │              │              │
│     cofins-notify-svc     │ Release-8   │ Release-6   │ Release-8    │ Release-6    │
│                           │ ✅ güncel    │ ⚠️ eski (−2)│ ✅ güncel     │ ⚠️ eski (−2) │
├───────────────────────────┼─────────────┼─────────────┼──────────────┼──────────────┤
│ Ürün Versiyonu            │ v2.5.0 ✅   │ v2.5.0 ✅   │ v2.4.0 ⚠️    │ v2.3.0 ⚠️    │
│ Son Geçiş                 │ 15 Mar 2026 │ 18 Mar 2026 │ 10 Oca 2026  │ 01 Ara 2025  │
└───────────────────────────┴─────────────┴─────────────┴──────────────┴──────────────┘

Renk kodları:
  ✅ Güncel — en son yayınlanan release ile aynı
  ⚠️ Eski (−N) — N release geride
  🔴 Kritik (−5+) — 5 veya daha fazla release geride → güvenlik riski
  ⚪ Veri yok — henüz kayıt oluşmamış
```

**Hücre detay popup'ı:** Herhangi bir hücreye tıklandığında:

```
┌──────────────────────────────────────────────────┐
│  cofins-service-api @ İş Bankası                 │
│                                                  │
│  Mevcut Release: Release-47                     │
│  Ürün Versiyonu: v2.5.0                         │
│  Geçiş Tarihi:  15 Mar 2026                    │
│  Önceki Release: Release-45                     │
│                                                  │
│  [📜 Geçmişi Gör]  [📋 Release Notes]           │
│                                                  │
└──────────────────────────────────────────────────┘
```

##### Eski (Stale) Hesaplama Mantığı

Bir servisin "kaç release geride" olduğu, o servisin tüm release'leri arasında sıralama yapılarak hesaplanır:

```
Servis: cofins-service-api
Release geçmişi (en yeniden eskiye):
  Release-47, Release-46, Release-45, Release-44, Release-43

Müşteri İş Bankası → Release-47 → 0 geride → ✅ Güncel
Müşteri Garanti    → Release-45 → 2 geride → ⚠️ Eski (−2)
```

Backend'de bu bilgi `VersionPackageItem`'ların zaman sıralı listesinden türetilir. Her yeni `VersionPackage` oluştuğunda o servise ait en güncel release kaydedilir → diff hesaplanır.

#### Görünüm 2 — Servis Odaklı

Tek bir servis seçili — o servisi kullanan tüm müşterilerin durumu:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🔍 Servis Odağı: cofins-service-api                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  En Güncel Release: Release-47 (v2.5.0 — 11 Mar 2026)                      │
│                                                                              │
│  ┌────────────────┬──────────────┬──────────┬──────────────┬───────────┐    │
│  │ Müşteri        │ Release      │ Durum    │ Geçiş Tarihi │ Versiyon  │    │
│  ├────────────────┼──────────────┼──────────┼──────────────┼───────────┤    │
│  │ İş Bankası     │ Release-47   │ ✅ Güncel │ 15 Mar 2026  │ v2.5.0    │    │
│  │ Akbank         │ Release-47   │ ✅ Güncel │ 18 Mar 2026  │ v2.5.0    │    │
│  │ Garanti        │ Release-45   │ ⚠️ −2    │ 10 Oca 2026  │ v2.4.0    │    │
│  │ Yapı Kredi     │ Release-45   │ ⚠️ −2    │ 01 Ara 2025  │ v2.3.0    │    │
│  │ Ziraat         │ —            │ ⚪ yok    │ —            │ —         │    │
│  └────────────────┴──────────────┴──────────┴──────────────┴───────────┘    │
│                                                                              │
│  Özet: 4 müşteri | 2 güncel | 2 eski | 1 veri yok                          │
│                                                                              │
│  ── Release Dağılımı ──────────────────────────────────────────────────     │
│  Release-47  ██████████████████████  2 müşteri (50%)                        │
│  Release-45  ██████████████████████  2 müşteri (50%)                        │
│                                                                              │
│  ⚠️ 2 müşteri 2+ release geride — geçiş hatırlatması gönderilebilir        │
│     [📩 Toplu Hatırlat]                                                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Kullanım senaryosu:** Security patch yayınlandığında "bu servisi eski release'de kullanan kaç müşteri var?" sorusuna anında cevap. [📩 Toplu Hatırlat] butonu ile gerideki müşterilere e-posta hatırlatması (n8n workflow).

#### Görünüm 3 — Müşteri Odaklı

Tek bir müşteri seçili — o müşterinin tüm servislerinin durumu:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🏢 Müşteri Odağı: Garanti Bankası                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Ürün: E-Fatura Platformu | Mevcut Versiyon: v2.4.0                        │
│  Son Geçiş: 10 Oca 2026 | Bekleyen: v2.5.0 ⚠️                             │
│                                                                              │
│  ┌──────────────────────────┬──────────────┬──────────────┬────────────┐    │
│  │ Servis                   │ Müşterideki  │ En Güncel    │ Fark       │    │
│  ├──────────────────────────┼──────────────┼──────────────┼────────────┤    │
│  │ ▼ Core Banking           │              │              │            │    │
│  │   cofins-service-api     │ Release-45   │ Release-47   │ ⚠️ −2      │    │
│  │   cofins-auth-service    │ Release-12   │ Release-12   │ ✅ güncel   │    │
│  │ ▼ Notification           │              │              │            │    │
│  │   cofins-notify-svc      │ Release-8    │ Release-8    │ ✅ güncel   │    │
│  └──────────────────────────┴──────────────┴──────────────┴────────────┘    │
│                                                                              │
│  Özet: 3 servis | 2 güncel | 1 eski                                        │
│                                                                              │
│  ── Servis Geçiş Geçmişi ─────────────────────────────────────────────     │
│  │ Tarih        │ Olay                                                │     │
│  │ 10 Oca 2026  │ v2.4.0 geçişi: cofins-service-api R-43→R-45       │     │
│  │              │                 cofins-notify-svc R-6→R-8           │     │
│  │ 01 Kas 2025  │ v2.3.0 geçişi: cofins-service-api R-40→R-43       │     │
│  │              │                 cofins-auth-service R-10→R-12       │     │
│                                                                              │
│  [📄 Rapor İndir (Excel)]                                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Kullanım senaryosu:** Müşteri destek talebi açtığında "bu müşterinin servis durumu nedir?" sorusuna anında cevap. Geçmiş timeline ile hangi geçişte ne olduğu görülür.

### 8.5 Toplu Sorgu Senaryoları

Matrix ekranının cevaplaması gereken tipik sorular:

| Soru | Nasıl Cevaplanır |
|------|------------------|
| "Release-45'i hâlâ kim kullanıyor?" | Servis Odaklı görünüm → release filtresi |
| "Garanti'nin servis durumu nedir?" | Müşteri Odaklı görünüm |
| "Kaç müşteri güncel değil?" | Matrix görünüm → footer özet satırı |
| "Bu security patch'i kimlere yollamalıyız?" | Servis Odaklı → eski release'dekiler → [📩 Toplu Hatırlat] |
| "Son 3 ayda kimler güncelleme aldı?" | Müşteri Odaklı → geçiş geçmişi tarihle filtre |
| "En çok geride kalan müşteri kim?" | Matrix → sıralama: "en çok eski servis sayısı"na göre |

### 8.6 Dashboard Widget — Özet Kart

Ana kurum dashboard'unda (Home) bir widget olarak:

```
┌───────────────────────────────────────────┐
│  📊 Müşteri Güncellik Durumu              │
│                                           │
│  ✅ Güncel: 12 müşteri                    │
│  ⚠️ Eski:   5 müşteri                    │
│  🔴 Kritik:  1 müşteri (5+ release geri) │
│                                           │
│  Son güncelleme alan: Akbank (18 Mar)     │
│  En uzun süredir güncelleme almayan:      │
│    Halkbank — 147 gün                     │
│                                           │
│  [Detaya Git →]                           │
└───────────────────────────────────────────┘
```

### 8.7 Excel/CSV Export

Matrix'ten rapor çıktısı alınabilir. Kullanım: yönetim raporları, müşteri toplantısı öncesi hazırlık.

| Export Formatı | İçerik |
|----------------|--------|
| **Matrix Export (Excel)** | Satır: servisler, Sütun: müşteriler, Hücre: release adı + geçiş tarihi |
| **Müşteri Raporu (PDF)** | Tek müşteri için: tüm servisler + release durumu + geçmiş timeline |
| **Stale Report (CSV)** | Güncel olmayan müşteri–servis çiftleri listesi: müşteri, servis, mevcut release, en güncel release, gün sayısı |

### 8.8 API Bağlantıları — Service Version Matrix

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/service-version-matrix?productId={id}` | Matrix görünüm: tüm müşteriler × tüm servisler |
| GET | `/api/service-version-matrix/by-service?serviceId={id}` | Servis odaklı: bu servisi kullanan müşteriler |
| GET | `/api/service-version-matrix/by-customer?customerId={id}&productId={id}` | Müşteri odaklı: bu müşterinin servisleri |
| GET | `/api/service-version-matrix/history?customerId={id}&serviceId={id}` | Geçiş geçmişi timeline |
| GET | `/api/service-version-matrix/stale?productId={id}&threshold={n}` | N+ release gerideki müşteri–servis çiftleri |
| GET | `/api/service-version-matrix/summary` | Dashboard widget verisi |
| POST | `/api/service-version-matrix/bootstrap` | Mevcut müşteriler için ilk veri oluşturma (admin) |
| GET | `/api/service-version-matrix/export?format=excel&productId={id}` | Excel/CSV export |
| POST | `/api/service-version-matrix/notify-stale` | Gerideki müşterilere toplu hatırlatma (n8n tetikle) |

### 8.9 İş Kuralları — Service Version Matrix

| Kural | Açıklama |
|-------|----------|
| **Otomatik güncelleme** | Müşteri Prod geçiş tarihini girince (Section 7.7) → `CustomerServiceVersion` otomatik güncellenir. Manuel müdahale gerekmez |
| **Yalnızca değişen servisler** | VersionPackage'da olmayan servisler (değişmeyen) → mevcut release'de kalır, dokunulmaz |
| **Unique constraint** | Bir müşterinin bir servisi için tek aktif kayıt: `[customerId, serviceId]` |
| **Geçmiş append-only** | `CustomerServiceVersionHistory` hiçbir zaman güncellenmez veya silinmez — audit trail |
| **Stale eşiği** | Varsayılan: 3+ release geride = ⚠️, 5+ = 🔴 kritik. Ürün bazında konfigüre edilebilir |
| **Sadece abone olunan servisler** | Matrix'te müşterinin sahip olmadığı servisler gösterilmez (CPM.subscriptionLevel resolve logic) |
| **Bootstrap idempotent** | "Mevcut Durumu İçe Aktar" birden fazla çalıştırılabilir — varolan kayıtları tekrar yazmaz |
| **Export yetki kontrolü** | Sadece ADMIN ve RELEASE_MANAGER export yapabilir |

### 8.10 Boş ve Hata State'leri

| Durum | Gösterim |
|-------|----------|
| Ürün seçilmedi | "Bir ürün seçin" placeholder |
| Seçili ürünün hiç müşterisi yok | "Bu ürüne atanmış müşteri bulunmuyor." |
| Hiç CustomerServiceVersion kaydı yok | "Henüz servis versiyon verisi oluşmamış. İlk müşteri geçişi tamamlandığında matris otomatik dolacaktır." + [Mevcut Durumu İçe Aktar] butonu |
| Servis odaklı — hiç kullanıcı yok | "Bu servisi kullanan müşteri bulunmuyor." |
| Export başarısız | "Rapor oluşturulamadı. Lütfen tekrar deneyin." |

### 8.11 Gap Analizi (Devam — 56-65)

| # | Konu | Detay |
|---|------|-------|
| 56. | **CustomerServiceVersion tablosu** | Yeni Prisma model: customerId + serviceId (unique) → currentRelease, currentVersionId, takenAt, previousRelease |
| 57. | **CustomerServiceVersionHistory tablosu** | Append-only audit: fromRelease, toRelease, fromVersionId, toVersionId, transitionDate |
| 58. | **Geçiş cascade servisi** | Prod actual date → VersionPackage oku → her item için UPSERT + history INSERT. Transaction içinde olmalı |
| 59. | **Matrix API endpoint'leri** | 9 endpoint (8.8 tablosu). Pivotlama + filtreleme + sıralama backend'de yapılmalı |
| 60. | **Stale hesaplama servisi** | Servisin tüm release'leri arasında sıralama → müşterinin kaç release geride olduğu. Cache'lenebilir |
| 61. | **Bootstrap endpoint** | Admin panelinden mevcut müşteri verilerini tek seferlik import eden batch işlem. Idempotent |
| 62. | **Excel/PDF export servisi** | Matrix → Excel, Müşteri raporu → PDF, Stale → CSV. xlsx kütüphanesi gerekli |
| 63. | **Toplu hatırlatma n8n workflow** | Stale müşterilere otomatik e-posta: "X serviste güncellemeniz mevcut" |
| 64. | **Dashboard widget API** | `GET /api/service-version-matrix/summary` — güncel/eski/kritik müşteri sayıları + en eski güncelleme bilgisi |
| 65. | **Product bazlı stale eşiği** | Product entity'sine `staleThresholdWarning` (varsayılan: 3) ve `staleThresholdCritical` (varsayılan: 5) alanları |

---

## 9. Hata Bildir — Geçiş Sorun Takibi (Transition Issue Reporting)

Müşteri versiyon geçişi sırasında yaşadığı teknik sorunları bildirebildiği, kurum tarafının bu sorunları takip edip çözebildiği iki taraflı issue tracking modülüdür. Geçişin her aşamasında (test, pre-prod, prod) sorun kaydı açılabilir.

### 9.1 Kavram — İki Mod

| Mod | Ne Yapar | Hedef Kullanıcı | Durum |
|-----|----------|-----------------|-------|
| **Manuel** | Müşteri ürün + servis seçer, açıklama yazar, log dosyası yükler | Müşteri | ✅ Aktif — tam tasarım |
| **Otomatik** | Müşterinin Rancher/OpenShift cluster'ına bağlanıp hata alan pod'ların loglarını toplar, müşteriye gösterip onaylatır | Müşteri | 📐 Tasarım dahil — aksiyon sonraya |

> **RM Gözlemi — Neden iki mod?** Manuel mod her müşteriye uygulanabilir — cluster erişimi gerektirmez. Otomatik mod ise büyük kurumsal müşteriler için ciddi zaman tasarrufu sağlar: "podlardan log topla → insan onaylasın → kayıt olsun" akışı, destek ekibinin saatlerini kurtarır. Ancak cluster bağlantısı (API token, endpoint) konfigürasyonu gerektiğinden önce manuel modu hayata geçirip, otomatik modu faz 2 olarak ekliyoruz.

### 9.2 Veri Modeli — TransitionIssue

```typescript
interface TransitionIssue {
  id: string;
  
  // Bağlam
  customerId: string;               // FK → Customer
  productId: string;                 // FK → Product
  versionId: string;                 // FK → ProductVersion — hangi versiyona geçişte sorun yaşandı
  transitionId?: string;             // FK → CustomerVersionTransition (opsiyonel bağlantı)
  environment: string;               // hangi ortamda: "Test" | "Pre-Prod" | "Prod"
  
  // Sorun detayı
  serviceId?: string;                // FK → Service/API (opsiyonel — genel sorun olabilir)
  title: string;                     // kısa başlık
  description: string;               // detaylı açıklama (markdown destekli)
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'DEPLOYMENT' | 'RUNTIME' | 'CONFIG' | 'DATA' | 'INTEGRATION' | 'OTHER';
  
  // Kaynak modu
  reportMode: 'MANUAL' | 'AUTO';    // nasıl oluşturuldu
  
  // Durum
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  
  // Atama & takip
  assignedTo?: string;               // FK → User (kurum tarafında atanan kişi)
  resolution?: string;               // çözüm açıklaması
  resolvedAt?: DateTime;
  
  // Meta
  reportedBy: string;                // FK → User (bildiren müşteri kullanıcısı)
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### TransitionIssueAttachment — Dosya Ekleri

```typescript
interface TransitionIssueAttachment {
  id: string;
  issueId: string;                   // FK → TransitionIssue
  fileName: string;                  // "error-log-2026-03-15.txt"
  fileType: 'LOG' | 'SCREENSHOT' | 'CONFIG' | 'OTHER';
  fileSize: number;                  // bytes
  storagePath: string;               // S3/minio path
  uploadedBy: string;                // FK → User
  uploadedAt: DateTime;
}

// Kısıtlar:
// Maksimum dosya boyutu: 50 MB (konfigüre edilebilir)
// Kabul edilen uzantılar: .log, .txt, .json, .yaml, .yml, .png, .jpg, .pdf, .zip
```

#### TransitionIssueComment — Yorum Zinciri

```typescript
interface TransitionIssueComment {
  id: string;
  issueId: string;                   // FK → TransitionIssue
  authorId: string;                  // FK → User
  authorSide: 'CUSTOMER' | 'ORG';   // müşteri mi kurum mu yazdı
  content: string;                   // yorum (markdown)
  attachmentIds?: string[];          // yoruma ekli dosyalar
  createdAt: DateTime;
}
```

> **RM Gözlemi — Neden ayrı Comment tablosu?** Issue açıldıktan sonra müşteri ve kurum arasında bir diyalog oluşur: "Logları inceledik, şu config değerini kontrol eder misiniz?" gibi. Bu diyalogu issue'nun description'ına karıştırmak yerine yorum zinciri olarak tutmak hem kronolojik takibi kolaylaştırır hem de "kim ne zaman ne dedi" audit ihtiyacını karşılar.

### 9.3 Durum Makinesi

```
                    ┌──────────────────┐
                    │      OPEN        │ ← müşteri kaydı oluşturdu
                    └────────┬─────────┘
                             │ kurum atama yapar
                             ▼
                    ┌──────────────────┐
                    │   IN_PROGRESS    │ ← kurum inceliyor
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
                    ▼                  ▼
        ┌──────────────────┐  ┌──────────────────────┐
        │     RESOLVED     │  │  WAITING_CUSTOMER    │
        │ (kurum çözdü)    │  │ (müşteriden bilgi    │
        └────────┬─────────┘  │  bekleniyor)         │
                 │            └──────────┬───────────┘
                 │                       │ müşteri yanıtladı
                 │                       ▼
                 │            ┌──────────────────┐
                 │            │   IN_PROGRESS    │ (tekrar)
                 │            └──────────────────┘
                 │
                 ▼
        ┌──────────────────┐
        │      CLOSED      │ ← müşteri onayladı veya
        │                  │   7 gün yanıt yoksa otomatik
        └──────────────────┘
```

**Geçiş kuralları:**
- `OPEN → IN_PROGRESS` — kurum kullanıcı atayınca otomatik
- `IN_PROGRESS → WAITING_CUSTOMER` — kurum müşteriden bilgi istediğinde
- `WAITING_CUSTOMER → IN_PROGRESS` — müşteri yorum/dosya eklediğinde
- `IN_PROGRESS → RESOLVED` — kurum çözümü yazdığında
- `RESOLVED → CLOSED` — müşteri "evet, çözüldü" dediğinde veya 7 gün yanıt gelmezse otomatik
- `RESOLVED → IN_PROGRESS` — müşteri "hâlâ sorunlu" derse geri açılır

### 9.4 Müşteri Tarafı — Hata Bildir Ekranı

**Erişim:** Customer Dashboard içinden — versiyonun aksiyon alanında veya genel menüde.

**Tetikleyici:** Müşterinin aktif bir `CustomerVersionTransition` kaydı olmalı (geçiş başlatılmış). Geçiş yoksa "Aktif geçiş bulunmuyor" uyarısı gösterilir.

#### Mod Seçici

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🐛 Hata Bildir — E-Fatura v2.5.0 Geçişi                    İş Bankası    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Ortam: [🧪 Test ▾]   (geçiş yapılan ortamlar listelenir)                  │
│                                                                              │
│  Bildirim Modu:                                                             │
│  ┌─────────────────────────────┬────────────────────────────────────┐       │
│  │  ✏️ Manuel Bildirim          │  🤖 Otomatik Log Toplama           │       │
│  │  (Servis seçin, açıklama   │  (Cluster'dan pod logları         │       │
│  │   yazın, log yükleyin)     │   otomatik toplanır)              │       │
│  └─────────────────────────────┴────────────────────────────────────┘       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Manuel Mod — Sorun Kayıt Formu

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ✏️ Manuel Hata Bildirimi                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Ürün:         E-Fatura Platformu (otomatik — geçiş bağlamından)            │
│  Versiyon:     v2.5.0 (otomatik)                                            │
│  Ortam:        🧪 Test (seçilen)                                            │
│                                                                              │
│  Etkilenen Servis/API:  [cofins-service-api          ▾]                     │
│                         (müşterinin abone olduğu servisler listelenir)       │
│                         [☐ Genel sorun — belirli bir servisle ilgili değil]  │
│                                                                              │
│  Başlık:       [Pod restart döngüsü — cofins-service-api          ]         │
│                                                                              │
│  Önem Derecesi:                                                             │
│    🔴 Kritik (servis çalışmıyor)                                            │
│    🟠 Yüksek (kısmen çalışıyor, iş etkisi var)                             │
│    🟡 Orta   (çalışıyor ama sorun var)                                      │
│    ⚪ Düşük  (kozmetik veya iyileştirme)                                    │
│                                                                              │
│  Kategori:     [🚀 Deployment ▾]                                            │
│                 🚀 Deployment — kurulum/güncelleme sırasında                │
│                 ⚡ Runtime — çalışma zamanında                               │
│                 ⚙️ Config — konfigürasyon sorunu                             │
│                 🗄️ Data — veri tutarsızlığı/migration                        │
│                 🔗 Integration — entegrasyon sorunu                          │
│                 📋 Diğer                                                     │
│                                                                              │
│  Açıklama:                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Geçiş sonrasında cofins-service-api pod'u 2-3 dakikada bir         │   │
│  │ restart oluyor. Loglarda OOMKilled hatası görünüyor.                │   │
│  │ Memory limit: 512Mi → muhtemelen yetmiyor.                         │   │
│  │                                                                      │   │
│  │ Request/Limit değerlerini kontrol etmenizi rica ederiz.             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Dosya Ekle:                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  📎 pod-logs-cofins-api.log       (2.4 MB)     [✕ Kaldır]          │   │
│  │  📎 kubectl-describe-output.txt   (48 KB)      [✕ Kaldır]          │   │
│  │                                                                      │   │
│  │  [+ Dosya Ekle]                                                     │   │
│  │  Kabul: .log .txt .json .yaml .png .jpg .pdf .zip — Max 50MB       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                     [İptal]            [🐛 Bildir]                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Servis listesi:** Müşterinin abone olduğu servisler (CPM.subscriptionLevel → resolve logic). "Genel sorun" checkbox'ı ile servis seçimi opsiyonel hale gelir.

**Ürün ve versiyon:** Geçiş bağlamından otomatik doldurulur. Birden fazla aktif geçiş varsa kullanıcı seçer.

#### Otomatik Mod — Cluster Log Toplama (Tasarım — Aksiyon Sonraya)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🤖 Otomatik Log Toplama                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ℹ️ Bu mod, cluster'ınızdaki hata alan pod'ların loglarını otomatik         │
│     toplar ve sorun kaydı oluşturmanızı kolaylaştırır.                       │
│                                                                              │
│  ── Cluster Bağlantısı ──                                                   │
│                                                                              │
│  Platform:     [Rancher ▾]   (Rancher | OpenShift | Kubernetes)             │
│  Cluster URL:  [https://rancher.isbank.local       ]                        │
│  API Token:    [••••••••••••••••]    ← CPM ayarlarından otomatik            │
│  Namespace:    [efatura-test        ]                                        │
│                                                                              │
│  Durum: 🟢 Bağlantı başarılı                                                │
│                                                                              │
│  [🔍 Pod'ları Tara]                                                          │
│                                                                              │
│  ── Bulunan Sorunlu Pod'lar ──                                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ☐ │ Pod Adı                      │ Durum        │ Restart │ Son Log │   │
│  ├───┼──────────────────────────────┼──────────────┼─────────┼─────────┤   │
│  │ ☑ │ cofins-api-7f8b9-xk2p4      │ CrashLoop    │ 12      │ OOMKill │   │
│  │ ☑ │ cofins-api-7f8b9-m3n7q      │ CrashLoop    │ 8       │ OOMKill │   │
│  │ ☐ │ cofins-auth-5c4d-j9h2       │ Error        │ 3       │ NPE     │   │
│  │ ☐ │ cofins-notify-8a2-r5t1      │ Running ✅    │ 0       │ —       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Seçili pod'lar: 2                                                          │
│                                                                              │
│  [📋 Logları Göster]                                                         │
│                                                                              │
│  ── Log Önizleme ──                                                         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ [cofins-api-7f8b9-xk2p4] Son 100 satır:                            │   │
│  │                                                                      │   │
│  │ 2026-03-15T14:32:01Z ERROR OutOfMemoryError: Java heap space        │   │
│  │ 2026-03-15T14:32:01Z ERROR   at com.cofins.service.PaymentSvc...    │   │
│  │ 2026-03-15T14:31:58Z WARN  Memory usage at 98% (501MB/512MB)       │   │
│  │ ...                                                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ☑ Bu logları sorun kaydına ekle                                            │
│  ☐ Kubernetes events'lerini de dahil et                                     │
│                                                                              │
│  Otomatik doldurulan alanlar:                                               │
│  Servis:   cofins-service-api (pod adından eşleştirildi)                    │
│  Başlık:   "CrashLoopBackOff — cofins-api (OOMKilled)"                      │
│  Önem:     🔴 Kritik (CrashLoop tespiti)                                    │
│  Kategori: ⚡ Runtime                                                        │
│                                                                              │
│  [✏️ Düzenle ve Onayla]  ← manuel form açılır, alanlar prefill              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Otomatik mod akışı:**
1. Cluster bağlantı bilgileri CPM ayarlarından veya müşteri tarafından girilir
2. [🔍 Pod'ları Tara] → backend Kubernetes API'ye bağlanır → pod listesi + status çeker
3. Sorunlu pod'lar (CrashLoopBackOff, Error, OOMKilled, ImagePullBackOff vb.) filtrelenir
4. Müşteri sorunlu pod'ları seçer (checkbox)
5. [📋 Logları Göster] → seçili pod'ların son N satır logu çekilir
6. Müşteri logları inceler, onaylar
7. [✏️ Düzenle ve Onayla] → Manuel form prefill edilmiş olarak açılır:
   - Servis: pod adından service eşleşmesi (pod name pattern → Service entity)
   - Başlık: hata tip + pod özeti otomatik
   - Önem: CrashLoop → Kritik, Error → Yüksek (otomatik öneri)
   - Loglar: otomatik dosya eki olarak eklenir
8. Müşteri düzenler, onaylar → issue kaydı oluşur

**Cluster bağlantı alanları (CPM'ye eklenen):**

| Alan | Tip | Koşullu | Açıklama |
|------|-----|---------|----------|
| `clusterPlatform` | enum | opsiyonel | `RANCHER` \| `OPENSHIFT` \| `KUBERNETES` |
| `clusterApiUrl` | string | platform varsa | Cluster API endpoint URL |
| `clusterApiToken` | encrypted | platform varsa | API erişim token'ı (PAT şifreleme mekanizması) |
| `clusterNamespaces` | string[] | platform varsa | Ortam bazında namespace mapping: `{"Test": "efatura-test", "Prod": "efatura-prod"}` |

> **RM Kararı — Faz Ayrımı:** Otomatik mod tamamen tasarıma dahil edildi. Ancak backend implementasyonu (Kubernetes API bağlantısı, log çekme, pod listeleme) **faz 2** olarak işaretlenmiştir. Faz 1'de yalnızca manuel mod geliştirilir. UI'da otomatik mod tab'ı "Yakında aktif olacak" placeholder ile gösterilir.

### 9.5 Müşteri Tarafı — Sorunlarım Listesi

Müşterinin açtığı tüm sorunların takip listesi:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🐛 Sorunlarım                                            İş Bankası       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Filtre: [Tümü ▾]  [Tüm Ürünler ▾]  [Tüm Ortamlar ▾]   🔍 [          ]   │
│                                                                              │
│  ┌──────┬───────────────────────────────┬──────────┬────────┬──────────┐    │
│  │ #    │ Başlık                        │ Durum    │ Önem   │ Tarih    │    │
│  ├──────┼───────────────────────────────┼──────────┼────────┼──────────┤    │
│  │ IS-3 │ OOMKilled — cofins-api        │ 🟡 Açık  │ 🔴 Krt │ 15 Mar   │    │
│  │      │ E-Fatura v2.5.0 • Test        │          │        │          │    │
│  ├──────┼───────────────────────────────┼──────────┼────────┼──────────┤    │
│  │ IS-2 │ Config hatalı — notify-svc    │ 🔵 İncel.│ 🟠 Yks │ 14 Mar   │    │
│  │      │ E-Fatura v2.5.0 • Test        │ 👤 A.K.  │        │          │    │
│  ├──────┼───────────────────────────────┼──────────┼────────┼──────────┤    │
│  │ IS-1 │ DB migration hatası           │ ✅ Çözüld│ 🟠 Yks │ 10 Mar   │    │
│  │      │ E-Fatura v2.5.0 • Test        │          │        │          │    │
│  └──────┴───────────────────────────────┴──────────┴────────┴──────────┘    │
│                                                                              │
│  Açık: 1  │  İnceleniyor: 1  │  Çözüldü: 1  │  Toplam: 3                  │
│                                                                              │
│                                              [+ 🐛 Yeni Sorun Bildir]       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Satır tıklama → Sorun Detay Sayfası:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🐛 IS-3: OOMKilled — cofins-service-api                           [✕]     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Durum: 🟡 OPEN  │  Önem: 🔴 Kritik  │  Kategori: ⚡ Runtime               │
│  Ürün: E-Fatura v2.5.0  │  Ortam: 🧪 Test  │  Servis: cofins-service-api  │
│  Bildiren: A.Yılmaz  │  Tarih: 15 Mar 2026 14:35                           │
│  Atanan: —                                                                   │
│                                                                              │
│  ── Açıklama ──                                                             │
│  Geçiş sonrasında cofins-service-api pod'u 2-3 dakikada bir restart         │
│  oluyor. Loglarda OOMKilled hatası görünüyor. Memory limit: 512Mi →         │
│  muhtemelen yetmiyor.                                                        │
│                                                                              │
│  ── Ekler ──                                                                │
│  📎 pod-logs-cofins-api.log (2.4 MB) [⬇️]                                  │
│  📎 kubectl-describe-output.txt (48 KB) [⬇️]                               │
│                                                                              │
│  ── Yorumlar ──                                                             │
│                                                                              │
│  [A.Yılmaz — Müşteri — 15 Mar 14:35]                                       │
│  Logları ekledim. Pod 12 kez restart olmuş son 1 saatte.                    │
│                                                                              │
│  ── Henüz kurum yanıtı yok ──                                               │
│                                                                              │
│  Yanıt yaz:                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  [+ 📎 Dosya]                                         [💬 Yorum Ekle]      │
│                                                                              │
│  ── Durum Değişikliği (RESOLVED olduysa) ──                                 │
│  Çözüm karşılıyor mu?  [✅ Evet, Kapat]  [❌ Hayır, Tekrar Aç]            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 9.6 Kurum Tarafı — Geçiş Sorunları Yönetimi

**Route:** `/transition-issues`
**Erişim:** ADMIN, RELEASE_MANAGER, DEVELOPER

#### Liste Ekranı

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🐛 Geçiş Sorunları                                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Filtre:                                                                    │
│  Durum: [Tümü ▾]  Önem: [Tümü ▾]  Ürün: [Tümü ▾]  Müşteri: [Tümü ▾]      │
│  Atanan: [Tümü ▾]  Kategori: [Tümü ▾]         🔍 [                   ]     │
│                                                                              │
│  Görünüm: ◉ Liste  ○ Kanban (duruma göre)                                  │
│                                                                              │
│  ┌────┬──────────────────────────┬────────────┬────────┬──────┬──────────┐  │
│  │ #  │ Başlık                   │ Müşteri    │ Durum  │ Önem │ Atanan   │  │
│  ├────┼──────────────────────────┼────────────┼────────┼──────┼──────────┤  │
│  │IS-3│ OOMKilled — cofins-api   │ İş Bankası │ 🟡 OPEN│ 🔴   │ —        │  │
│  │    │ E-Fatura v2.5.0 • Test   │            │        │      │[Ata ▾]   │  │
│  ├────┼──────────────────────────┼────────────┼────────┼──────┼──────────┤  │
│  │IS-2│ Config — notify-svc      │ İş Bankası │ 🔵 INP │ 🟠   │ A.Kara   │  │
│  │    │ E-Fatura v2.5.0 • Test   │            │        │      │          │  │
│  ├────┼──────────────────────────┼────────────┼────────┼──────┼──────────┤  │
│  │IS-4│ HelmChart hata           │ Garanti    │ 🟡 OPEN│ 🟠   │ —        │  │
│  │    │ E-Fatura v2.5.0 • Pre-P  │            │        │      │[Ata ▾]   │  │
│  ├────┼──────────────────────────┼────────────┼────────┼──────┼──────────┤  │
│  │IS-1│ DB migration hatası      │ İş Bankası │ ✅ RSLV│ 🟠   │ M.Demir  │  │
│  │    │ E-Fatura v2.5.0 • Test   │            │        │      │          │  │
│  └────┴──────────────────────────┴────────────┴────────┴──────┴──────────┘  │
│                                                                              │
│  Özet: Açık: 2  │  İnceleniyor: 1  │  Müşteri Bekl.: 0  │  Çözüldü: 1    │
│  Ortalama çözüm süresi: 1.2 gün   │  SLA aşımı: 0                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

##### Kanban Görünümü

```
┌────────────────┬────────────────┬────────────────┬────────────────┬────────────────┐
│    🟡 OPEN     │  🔵 IN_PROGRESS│ ⏳ WAITING_CUST│   ✅ RESOLVED  │   ⬛ CLOSED    │
│    (2)         │    (1)         │    (0)         │    (1)         │    (3)         │
├────────────────┼────────────────┼────────────────┼────────────────┤────────────────┤
│ ┌────────────┐ │ ┌────────────┐ │                │ ┌────────────┐ │                │
│ │ IS-3 🔴    │ │ │ IS-2 🟠    │ │                │ │ IS-1 🟠    │ │                │
│ │ OOMKilled  │ │ │ Config hata│ │                │ │ DB migr.   │ │                │
│ │ İş Bankası │ │ │ İş Bankası │ │                │ │ İş Bankası │ │                │
│ │ cofins-api │ │ │ notify-svc │ │                │ │            │ │                │
│ │ → [Ata ▾]  │ │ │ 👤 A.Kara  │ │                │ │ 👤 M.Demir │ │                │
│ └────────────┘ │ └────────────┘ │                │ └────────────┘ │                │
│ ┌────────────┐ │                │                │                │                │
│ │ IS-4 🟠    │ │                │                │                │                │
│ │ HelmChart  │ │                │                │                │                │
│ │ Garanti    │ │                │                │                │                │
│ │ → [Ata ▾]  │ │                │                │                │                │
│ └────────────┘ │                │                │                │                │
└────────────────┴────────────────┴────────────────┴────────────────┴────────────────┘
```

**Drag & drop:** Kartlar sürüklenebilir — `OPEN → IN_PROGRESS` geçişi sürükleyerek yapılır (atama dialog'u otomatik açılır).

#### Kurum Detay Sayfası — İnceleme ve Aksiyon

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🐛 IS-3: OOMKilled — cofins-service-api                           [✕]     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ── Bağlam ──                                                               │
│  Müşteri: İş Bankası  │  Ürün: E-Fatura v2.5.0  │  Ortam: 🧪 Test          │
│  Servis: cofins-service-api  │  Release: Release-47                         │
│  Geçiş: v2.4.0 → v2.5.0 (📅 15 Mar planlanan)                              │
│                                                                              │
│  ── Durum & Atama ──                                                        │
│  Durum:    [🟡 OPEN          ▾]   ← değiştirilebilir dropdown               │
│  Atanan:   [👤 Seçin          ▾]                                             │
│  Öncelik:  [🔴 Kritik         ▾]   ← kurum yeniden değerlendirebilir        │
│                                                                              │
│  ── Müşteri Açıklaması ──                                                   │
│  Geçiş sonrasında cofins-service-api pod'u 2-3 dakikada bir restart         │
│  oluyor...                                                                   │
│                                                                              │
│  ── Ekler ──                                                                │
│  📎 pod-logs-cofins-api.log (2.4 MB) [⬇️]                                  │
│  📎 kubectl-describe-output.txt (48 KB) [⬇️]                               │
│                                                                              │
│  ── Kurum Aksiyonları ──                                                    │
│  [📊 Servis Matrix'te Aç] → Service Version Matrix, bu müşteri+servis      │
│  [📋 İlgili Release Notes] → v2.5.0 release notesında bu servisin notları  │
│  [🔗 İlgili PR'lar] → VersionPackage'dan bu servisin PR listesi            │
│                                                                              │
│  ── Yorum Zinciri ──                                                        │
│                                                                              │
│  [A.Yılmaz — 🏢 Müşteri — 15 Mar 14:35]                                    │
│  Logları ekledim. Pod 12 kez restart olmuş son 1 saatte.                    │
│                                                                              │
│  Yanıt yaz:                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  [+ 📎 Dosya]                                          [💬 Yanıtla]        │
│                                                                              │
│  ── Çözüm (RESOLVED durumuna geçerken) ──                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Memory limit 512Mi → 1Gi olarak güncellendi. HelmChart değerleri   │   │
│  │ düzeltildi. Müşteriye yeni chart gönderildi.                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  [✅ Çözüldü Olarak İşaretle]                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Kurum aksiyonları — cross-reference:**
- [📊 Servis Matrix'te Aç] → Section 8, müşteri odaklı görünüm, bu servise odaklı
- [📋 İlgili Release Notes] → Section 6.4.5, bu servise ait release notları
- [🔗 İlgili PR'lar] → VersionPackage'dan servisin PR ID listesi

### 9.7 Dashboard Widget — Açık Sorunlar

Kurum ana dashboard'unda:

```
┌───────────────────────────────────────────┐
│  🐛 Açık Geçiş Sorunları                  │
│                                           │
│  🔴 Kritik: 1  (IS-3 — İş Bankası)       │
│  🟠 Yüksek: 2                            │
│  🟡 Orta:   0                            │
│                                           │
│  Atanmamış: 2 ⚠️                          │
│  Ort. çözüm: 1.2 gün                     │
│                                           │
│  [Tümünü Gör →]                           │
└───────────────────────────────────────────┘
```

Müşteri dashboard'unda (ürün kartında):

```
┌──────────────────┐
│ 📦 E-Fatura       │
│ ⚠️ Bekleyen Güncell│
│ 🐛 1 açık sorun   │  ← kırmızı badge
│ ...               │
└──────────────────┘
```

### 9.8 Bildirimler (Notification)

| Olay | Kim Bildirilir | Kanal |
|------|----------------|-------|
| Yeni sorun açıldı | Kurum: RM + DevOps grubu | n8n → e-posta + in-app |
| Sorun atandı | Atanan kurum kullanıcısı | in-app notification |
| Kurum yanıt verdi | Müşteri (issue sahibi) | n8n → e-posta + in-app |
| Müşteri yanıt verdi | Atanan kurum kullanıcısı | in-app notification |
| Status → RESOLVED | Müşteri (issue sahibi) | n8n → e-posta: "Sorunuz çözüldü, onaylayın" |
| 7 gün yanıt yok (RESOLVED) | — | Otomatik CLOSED |
| Kritik sorun 4+ saat atanmamış | RM | n8n → slack/e-posta escalation |

### 9.9 API Bağlantıları — Transition Issues

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/transition-issues` | Yeni sorun kaydı oluştur (müşteri) |
| GET | `/api/transition-issues?customerId={id}` | Müşterinin sorunları (müşteri dashboard) |
| GET | `/api/transition-issues` | Tüm sorunlar (kurum — filtreleme destekli) |
| GET | `/api/transition-issues/{id}` | Sorun detayı |
| PATCH | `/api/transition-issues/{id}` | Durum/atama/önem güncelleme (kurum) |
| PATCH | `/api/transition-issues/{id}/resolve` | Çözüm yaz + RESOLVED yap |
| PATCH | `/api/transition-issues/{id}/reopen` | Müşteri tekrar açar (RESOLVED → IN_PROGRESS) |
| PATCH | `/api/transition-issues/{id}/close` | Kapat (müşteri onayı veya otomatik) |
| POST | `/api/transition-issues/{id}/comments` | Yorum ekle (müşteri veya kurum) |
| GET | `/api/transition-issues/{id}/comments` | Yorum listesi |
| POST | `/api/transition-issues/{id}/attachments` | Dosya yükle (multipart) |
| GET | `/api/transition-issues/{id}/attachments/{attachmentId}` | Dosya indir |
| GET | `/api/transition-issues/summary` | Dashboard widget verisi (kurum) |
| GET | `/api/transition-issues/stats?productId={id}` | İstatistikler: ort. çözüm süresi, kategori dağılımı |

### 9.10 İş Kuralları — Transition Issues

| Kural | Açıklama |
|-------|----------|
| **Aktif geçiş zorunlu** | Sorun bildirmek için müşterinin o ürüne + versiyona aktif `CustomerVersionTransition` kaydı olmalı (PLANNED veya IN_PROGRESS) |
| **Servis filtresi** | Servis seçimi müşterinin abone olduğu servislerle sınırlı (CPM resolve logic) |
| **Dosya limitleri** | Max 50 MB / dosya, toplam 200 MB / issue. Uzantı whitelist: `.log .txt .json .yaml .yml .png .jpg .pdf .zip` |
| **Auto-close** | RESOLVED durumundaki issue'ya 7 gün müşteri yanıtı gelmezse otomatik CLOSED (cron job) |
| **Escalation** | 🔴 Kritik sorun 4 saat+ atanmamışsa RM'ye escalation notification |
| **Issue ID formatı** | `IS-{autoincrement}` — global sıralama, customer prefix yok |
| **Müşteri göremez** | Müşteri sadece kendi sorunlarını görür. Diğer müşterilerin sorunları gizli |
| **Kurum severity override** | Kurum müşterinin verdiği severity'yi değiştirebilir (yorum ile gerekçe beklenir) |
| **Çözüm zorunlu** | RESOLVED'a geçerken `resolution` alanı boş olamaz |
| **Otomatik mod — faz 2** | Cluster bağlantı alanları CPM'ye eklenir ama Kubernetes API entegrasyonu faz 2'de |

### 9.11 Boş ve Hata State'leri

| Durum | Gösterim |
|-------|----------|
| Aktif geçiş yok | "Aktif versiyon geçişi bulunmuyor. Sorun bildirebilmek için önce bir geçiş planlamalısınız." |
| Müşterinin hiç sorun kaydı yok | "Henüz sorun kaydınız bulunmuyor." |
| Kurum — hiç sorun yok | "Açık geçiş sorunu bulunmuyor. 🎉" |
| Dosya yükleme hatası | "Dosya yüklenemedi: [hata]. Dosya boyutu 50 MB'ı aşıyor olabilir." |
| Otomatik mod — bağlantı hatası | "Cluster'a bağlanılamıyor. URL ve API token bilgilerini kontrol edin." |
| Otomatik mod — faz 2 placeholder | "Otomatik log toplama yakında aktif olacaktır. Şimdilik manuel bildirimi kullanabilirsiniz." |

### 9.12 Gap Analizi (Devam — 66-80)

| # | Konu | Detay |
|---|------|-------|
| 66. | **TransitionIssue tablosu** | Yeni Prisma model: customerId, productId, versionId, serviceId, title, description, severity, category, reportMode, status, assignedTo, resolution |
| 67. | **TransitionIssueAttachment tablosu** | Dosya ekleri: fileName, fileType, fileSize, storagePath. S3/minio entegrasyonu |
| 68. | **TransitionIssueComment tablosu** | Yorum zinciri: authorId, authorSide (CUSTOMER/ORG), content, createdAt |
| 69. | **Dosya yükleme servisi** | Multipart upload → S3/minio. Uzantı whitelist + boyut limit kontrolü |
| 70. | **Issue ID generator** | `IS-{autoIncrement}` formatında global sıralı ID üretimi |
| 71. | **Auto-close cron job** | RESOLVED + 7 gün yanıtsız → CLOSED. Günlük çalışan scheduled task |
| 72. | **Escalation cron job** | Kritik + 4 saat+ atanmamış → RM notification. Saatlik çalışan scheduled task |
| 73. | **n8n notification workflow** | Yeni sorun, yanıt, çözüm, escalation için e-posta + in-app bildirim |
| 74. | **Kanban drag & drop** | Kurum liste ekranında kartları sürükleyerek status değiştirme. MUI DnD veya dnd-kit |
| 75. | **CPM cluster alanları** | `clusterPlatform`, `clusterApiUrl`, `clusterApiToken`, `clusterNamespaces` — faz 2 ama schema'ya eklenebilir |
| 76. | **Kubernetes API servisi (Faz 2)** | Pod listeleme, log çekme, events çekme. `@kubernetes/client-node` kütüphanesi |
| 77. | **Pod → Servis eşleştirme (Faz 2)** | Pod adından Service entity'sine eşleştirme pattern logic'i |
| 78. | **Issue istatistik API** | Ort. çözüm süresi, kategori dağılımı, müşteri bazlı issue sayısı |
| 79. | **Customer Dashboard issue badge** | Ürün kartında açık sorun sayısı badge'i (🐛 N açık sorun) |
| 80. | **İlgili kaynak cross-link** | Issue detayından → Service Matrix, Release Notes, PR listesi yönlendirmeleri |

---

## 10. Yetkilendirme ve Rol Bazlı Erişim Kontrolü (RBAC)

Sistemde iki farklı kullanıcı havuzu vardır: **Kurum kullanıcıları** (ürünü geliştiren/yöneten ekip) ve **Müşteri kullanıcıları** (ürünü kullanan kurumların çalışanları). Her havuzun kendi rolleri, yetkileri ve erişim kuralları vardır. Ek olarak, kurum tarafında **ürün bazlı erişim kısıtlaması** ile "Herkes her ürünü göremez" prensibi uygulanır.

> **RM Perspektifi:**
> Yetkilendirme, release yönetimi platformunun en kritik altyapısıdır. Yanlış yapılandırılmış bir yetki:
> - Müşteriye ait hassas release bilgilerinin yetkisiz kişilere açılmasına,
> - Hazır olmayan bir versiyonun yanlışlıkla yayınlanmasına,
> - Müşteri tarafında yetkisiz bir kişinin güncelleme onayı vermesine,
> - Partner'ın görmemesi gereken internal release note'ları okumasına yol açabilir.
>
> Bu yüzden RBAC, "ekleyerek kapatan" değil **"kapalıyı açarak yetkilendiren"** (deny-by-default) modelde tasarlanmıştır.

### 10.1 Kavram — İki Havuzlu Yetkilendirme Mimarisi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ReleaseHub360 Auth                              │
│                                                                         │
│  ┌─────────────────────┐          ┌──────────────────────────┐         │
│  │  KURUM HAVUZU        │          │  MÜŞTERİ HAVUZU          │         │
│  │  (User tablosu)      │          │  (CustomerUser tablosu)   │         │
│  │                       │          │                            │         │
│  │  Login: company email │          │  Login: müşteri email      │         │
│  │  JWT: { userId,       │          │  JWT: { customerUserId,    │         │
│  │    role, email }      │          │    customerId, customerRole│         │
│  │                       │          │    email }                 │         │
│  │  Roller:              │          │  Roller:                   │         │
│  │  • ADMIN              │          │  • CUSTOMER_ADMIN          │         │
│  │  • PRODUCT_OWNER      │          │  • APP_ADMIN               │         │
│  │  • RELEASE_MANAGER    │          │  • APPROVER                │         │
│  │  • DEVOPS_ENGINEER    │          │  • BUSINESS_USER           │         │
│  │  • DEVELOPER          │          │  • PARTNER                 │         │
│  │  • QA_ENGINEER        │          │                            │         │
│  │  • VIEWER             │          │                            │         │
│  │                       │          │                            │         │
│  │  + Ürün Bazlı Erişim  │          │  + emailDomain eşleşmesi   │         │
│  │   (UserProductAccess) │          │   (Customer.emailDomains)  │         │
│  └─────────────────────┘          └──────────────────────────┘         │
│                                                                         │
│  Ortak katman: JWT → middleware → route guard → API response filtresi  │
└─────────────────────────────────────────────────────────────────────────┘
```

**İki havuz neden ayrı?**
1. Kurum kullanıcıları tüm ürün/müşteri verisine erişir (ürün bazlı filtreleme ile), müşteri kullanıcıları **sadece kendi müşteri verilerini** görür
2. Token payload farklıdır: kurum token'ında `userId + role`, müşteri token'ında `customerUserId + customerId + customerRole`
3. Middleware zinciri farklıdır: kurum route'ları `authenticateJWT + requireRole(...)`, müşteri route'ları `authenticateCustomerJWT + resolveCustomerId`
4. Password politikası farklı olabilir (müşteri SSO, kurum local auth)

> **RM Notu:** İleride kurum kullanıcısına "müşteri portalını müşteri gözüyle gör" (impersonate) özelliği eklenebilir — bu durumda kurum token'ı geçici olarak müşteri context'i taşır. Faz 2 maddesi.

---

### 10.2 Veri Modeli

#### 10.2.1 Kurum Kullanıcısı — User (mevcut, genişletilecek)

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         UserRole @default(DEVELOPER)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Ürün bazlı erişim — M:N
  productAccesses UserProductAccess[]

  @@map("users")
}

enum UserRole {
  ADMIN
  PRODUCT_OWNER
  RELEASE_MANAGER
  DEVOPS_ENGINEER
  DEVELOPER
  QA_ENGINEER
  VIEWER
}
```

> **RM Gözlemi:** Mevcut `role` alanı string olarak tutuluyor. Enum'a geçiş yapılmalı — bu hem TypeScript type safety sağlar hem de geçersiz rol atamasını önler. Migration ile mevcut string değerler enum'a dönüştürülecek.

#### 10.2.2 Ürün Bazlı Erişim — UserProductAccess

```prisma
model UserProductAccess {
  id        String   @id @default(uuid())
  userId    String
  productId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
  @@map("user_product_accesses")
}
```

**Kurallar:**
- `ADMIN` rolü **tüm ürünlere** otomatik erişir — `UserProductAccess` kaydı aranmaz
- Diğer roller **sadece atandıkları ürünleri** görür
- Ürün CRUD'u, versiyon, release note, health check, calendar, service matrix — hepsi bu filtreden geçer
- Kullanıcı davet edilirken ürün ataması yapılır; sonradan düzenlenebilir

#### 10.2.3 Müşteri Kullanıcısı — CustomerUser (yeni)

```prisma
model CustomerUser {
  id           String       @id @default(uuid())
  customerId   String
  email        String       @unique
  passwordHash String
  name         String
  customerRole CustomerRole @default(BUSINESS_USER)
  isActive     Boolean      @default(true)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@map("customer_users")
}

enum CustomerRole {
  CUSTOMER_ADMIN
  APP_ADMIN
  APPROVER
  BUSINESS_USER
  PARTNER
}
```

**Müşteri kullanıcı oluşturma akışı:**
1. **Kurum tarafından:** Müşteri yönetim ekranından "Müşteri Kullanıcı Ekle" → email + rol atanır → davet e-postası gönderilir
2. **Customer Admin tarafından:** Müşteri portalında "Kullanıcı Yönetimi" sekmesinden kendi organizasyonuna kullanıcı ekler
3. **Self-registration (opsiyonel, faz 2):** `emailDomains` ile eşleşen domain'den gelen kullanıcı otomatik kayıt olup BUSINESS_USER rolü alır, CUSTOMER_ADMIN onayı ile aktifleşir

> **RM Notu:** `emailDomains` eşleşmesi artık **customerId tespit** için kullanılır (Section 7.1'deki gibi), ancak yetki kontrolü `CustomerUser.customerRole` üzerinden yapılır. Sadece domain eşleşmesi yetmez — kullanıcının `customer_users` tablosunda kaydı olmalıdır.

#### 10.2.4 Müşteri Ürün Erişimi

Müşteri kullanıcıları sadece `CustomerProductMapping` üzerinden müşteriye atanmış ürünleri görür. Ek bir erişim tablosuna gerek yoktur — CPM zaten bu veriyi taşır:

```
CustomerUser → customerId → CustomerProductMapping → productId → Product
```

Ancak müşteri tarafında **ürün bazlı kısıtlama** ihtiyacı doğarsa (ör: partner sadece belirli ürünleri görebilsin), ileride `CustomerUserProductAccess` tablosu eklenebilir. Şimdilik tüm müşteri kullanıcıları müşterinin tüm ürünlerini görür — rol ile aksiyon kısıtlanır.

---

### 10.3 Kurum Rolleri — Tanımlar ve Sorumluluk Alanları

#### ADMIN

| | |
|---|---|
| **Açıklama** | Sistem yöneticisi. Tüm verilere ve ayarlara tam erişim |
| **Kim?** | Platform sahibi / CTO / DevOps lead |
| **Ürün kısıtı** | Yok — tüm ürünleri görür |
| **Kritik yetki** | Kullanıcı yönetimi, rol atama, sistem ayarları, müşteri yönetimi |

#### PRODUCT_OWNER

| | |
|---|---|
| **Açıklama** | Ürün sahibi. Release lifecycle'ını yönetir, müşteri ile iletişimi koordine eder |
| **Kim?** | Product manager / ürün sorumlusu |
| **Ürün kısıtı** | Sadece atandığı ürünler |
| **Kritik yetki** | Release note düzenleme/yayınlama, versiyon yayınlama, takvim güncelleme, müşteri iletişimi |

#### RELEASE_MANAGER

| | |
|---|---|
| **Açıklama** | Release operasyonlarını yürütür. Deploy onayı, hotfix koordinasyonu, code sync denetimi |
| **Kim?** | Release engineer / DevOps'a yakın operasyonel kişi |
| **Ürün kısıtı** | Sadece atandığı ürünler |
| **Kritik yetki** | Versiyon yayınlama, health check yönetimi, hotfix onaylama, code sync onaylama |

#### DEVOPS_ENGINEER

| | |
|---|---|
| **Açıklama** | Altyapı ve deployment odaklı. Code sync çalıştırma, ortam yönetimi, servis matrix güncelleme |
| **Kim?** | DevOps / SRE ekibindeki mühendisler |
| **Ürün kısıtı** | Sadece atandığı ürünler |
| **Kritik yetki** | Code sync çalıştırma, ortam onaylama, service matrix güncelleme, deployment tetikleme |

#### DEVELOPER

| | |
|---|---|
| **Açıklama** | Geliştirici. Yazdığı kodun release durumunu takip eder, PR'larını izler |
| **Kim?** | Yazılım geliştiriciler |
| **Ürün kısıtı** | Sadece atandığı ürünler |
| **Kritik yetki** | PR görüntüleme, hotfix talebi oluşturma, todo görüntüleme |

#### QA_ENGINEER

| | |
|---|---|
| **Açıklama** | Test mühendisi. Health check verilerini değerlendirir, test durumunu raporlar |
| **Kim?** | QA / test ekibi |
| **Ürün kısıtı** | Sadece atandığı ürünler |
| **Kritik yetki** | Health check detay görüntüleme, test sonucu güncelleme |

#### VIEWER

| | |
|---|---|
| **Açıklama** | Salt okunur erişim. Tüm ekranları görebilir ama hiçbir şey düzenleyemez |
| **Kim?** | Yönetici, stakeholder, audit ekibi |
| **Ürün kısıtı** | Sadece atandığı ürünler |
| **Kritik yetki** | Yok — sadece okuma |

---

### 10.4 Kurum Yetki Matrisi — Detaylı

> Legend: ✅ = tam erişim, 📖 = salt okunur, 🔸 = kısıtlı (detay aşağıda), ❌ = erişim yok

#### 10.4.1 Ürün & Servis Yönetimi

| Yetki | ADMIN | PRODUCT_OWNER | RELEASE_MANAGER | DEVOPS_ENGINEER | DEVELOPER | QA_ENGINEER | VIEWER |
|-------|-------|---------------|-----------------|-----------------|-----------|-------------|--------|
| Ürün listeleme (atanmış) | ✅ (tümü) | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| Ürün oluşturma | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ürün düzenleme | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ürün silme/pasif | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Servis CRUD | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| API/Endpoint CRUD | ✅ | ✅ | ❌ | ✅ | 📖 | 📖 | 📖 |
| Modül/Grup yönetimi | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### 10.4.2 Versiyon & Release Yönetimi

| Yetki | ADMIN | PRODUCT_OWNER | RELEASE_MANAGER | DEVOPS_ENGINEER | DEVELOPER | QA_ENGINEER | VIEWER |
|-------|-------|---------------|-----------------|-----------------|-----------|-------------|--------|
| Versiyon listeleme | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| Versiyon oluşturma | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Versiyon düzenleme | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Versiyon yayınlama** (Release'i Yayınla) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Versiyon deprecate | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Release note görüntüleme | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| **Release note düzenleme** | ✅ | ✅ | 🔸¹ | ❌ | ❌ | ❌ | ❌ |
| **Release note yayınlama** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI release note üretme | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| System change CRUD | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

> ¹ RELEASE_MANAGER release note'u düzenleyebilir ama **yayınlamak** (müşteriye görünür kılmak) PO veya ADMIN onayı gerektirir.

#### 10.4.3 Release Takvimi (Calendar)

| Yetki | ADMIN | PRODUCT_OWNER | RELEASE_MANAGER | DEVOPS_ENGINEER | DEVELOPER | QA_ENGINEER | VIEWER |
|-------|-------|---------------|-----------------|-----------------|-----------|-------------|--------|
| Takvim görüntüleme | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| **Tarih ekleme/düzenleme** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Milestone güncelleme | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerçekleşen tarih girişi | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

#### 10.4.4 Health Check & Release Todos

| Yetki | ADMIN | PRODUCT_OWNER | RELEASE_MANAGER | DEVOPS_ENGINEER | DEVELOPER | QA_ENGINEER | VIEWER |
|-------|-------|---------------|-----------------|-----------------|-----------|-------------|--------|
| Health check görüntüleme | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| BoM / PR / WI detayı | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| Release todo oluşturma | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Release todo düzenleme | ✅ | ✅ | ✅ | 🔸² | ❌ | ❌ | ❌ |
| Release todo tamamlama | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

> ² DEVOPS_ENGINEER sadece kendi `responsibleTeam = DEVOPS` todo'larını düzenleyebilir.

#### 10.4.5 Müşteri Yönetimi

| Yetki | ADMIN | PRODUCT_OWNER | RELEASE_MANAGER | DEVOPS_ENGINEER | DEVELOPER | QA_ENGINEER | VIEWER |
|-------|-------|---------------|-----------------|-----------------|-----------|-------------|--------|
| Müşteri listeleme | ✅ | ✅ | ✅ | ✅ | 📖 | 📖 | 📖 |
| Müşteri oluşturma | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Müşteri düzenleme | ✅ | ✅ | 🔸³ | ❌ | ❌ | ❌ | ❌ |
| Müşteri silme/pasif | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| CPM oluşturma/düzenleme | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Müşteri kullanıcı yönetimi | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

> ³ RELEASE_MANAGER müşterinin iletişim bilgilerini ve notlarını düzenleyebilir, ancak `emailDomains`, `code`, `tenantName` gibi yapısal alanları değiştiremez.

#### 10.4.6 Servis Versiyon Matrisi

| Yetki | ADMIN | PRODUCT_OWNER | RELEASE_MANAGER | DEVOPS_ENGINEER | DEVELOPER | QA_ENGINEER | VIEWER |
|-------|-------|---------------|-----------------|-----------------|-----------|-------------|--------|
| Matris görüntüleme | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| Manuel kayıt düzenleme | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Toplu hatırlat gönderme | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export (Excel/PDF) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| Bootstrapping (içe aktar) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### 10.4.7 Geçiş Sorun Takibi (Transition Issues)

| Yetki | ADMIN | PRODUCT_OWNER | RELEASE_MANAGER | DEVOPS_ENGINEER | DEVELOPER | QA_ENGINEER | VIEWER |
|-------|-------|---------------|-----------------|-----------------|-----------|-------------|--------|
| Sorun listeleme | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| Sorun detayı | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| Soruna atanma | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Sorun çözme (RESOLVED) | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Sorun kapatma (CLOSED) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Yorum yazma (kurum tarafı) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Önem/kategori değiştirme | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

#### 10.4.8 Hotfix Yönetimi

| Yetki | ADMIN | PRODUCT_OWNER | RELEASE_MANAGER | DEVOPS_ENGINEER | DEVELOPER | QA_ENGINEER | VIEWER |
|-------|-------|---------------|-----------------|-----------------|-----------|-------------|--------|
| Hotfix talebi görüntüleme | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| Hotfix talebi oluşturma | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Hotfix onaylama | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Hotfix reddetme | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

#### 10.4.9 Code Sync

| Yetki | ADMIN | PRODUCT_OWNER | RELEASE_MANAGER | DEVOPS_ENGINEER | DEVELOPER | QA_ENGINEER | VIEWER |
|-------|-------|---------------|-----------------|-----------------|-----------|-------------|--------|
| Sync geçmişi görüntüleme | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | 📖 |
| **Sync başlatma** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Conflict çözümü onaylama** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Branch yönetimi | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |

#### 10.4.10 Kullanıcı & Sistem Yönetimi

| Yetki | ADMIN | PRODUCT_OWNER | RELEASE_MANAGER | DEVOPS_ENGINEER | DEVELOPER | QA_ENGINEER | VIEWER |
|-------|-------|---------------|-----------------|-----------------|-----------|-------------|--------|
| Kurum kullanıcı listeleme | ✅ | 📖 | 📖 | ❌ | ❌ | ❌ | ❌ |
| Kullanıcı davet etme | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Rol atama/değiştirme | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kullanıcı pasif yapma | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Ürün erişimi atama** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sistem ayarları | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| n8n workflow yönetimi | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bildirim ayarları (kendi) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### 10.5 Müşteri Rolleri — Tanımlar ve Sorumluluk Alanları

#### CUSTOMER_ADMIN

| | |
|---|---|
| **Açıklama** | Müşteri tarafının süper kullanıcısı. Kendi organizasyonundaki kullanıcıları yönetir, tüm portala tam erişime sahiptir |
| **Kim?** | Müşteri IT yöneticisi / proje müdürü |
| **Kritik yetki** | Müşteri kullanıcı CRUD, todo tamamlama, sorun bildirme, güncelleme onaylama, takvim planlama, tüm verileri görüntüleme |

#### APP_ADMIN

| | |
|---|---|
| **Açıklama** | Teknik operasyon sorumlusu. Güncelleme sürecinin operasyonel adımlarını yürütür |
| **Kim?** | Müşteri tarafı DevOps / uygulama sorumlusu / teknik ekip lideri |
| **Kritik yetki** | Todo listesini tamamlama, sorun bildirme, artifact indirme, ortam onaylama |

#### APPROVER

| | |
|---|---|
| **Açıklama** | Güncelleme kararlarını onaylayan yetkili. Versiyon geçiş planını onaylar, ortam bazlı güncelleme adımlarını tetikler |
| **Kim?** | Müşteri BT direktörü / proje yöneticisi / yetkilendirilmiş karar verici |
| **Kritik yetki** | Güncelleme alma onayı (ortam bazlı), versiyon geçiş planı (schedule) oluşturma/düzenleme |

#### BUSINESS_USER

| | |
|---|---|
| **Açıklama** | İş birimi kullanıcısı. Release hakkında bilgi edinmek için portala erişir, ama operasyonel işlem yapmaz |
| **Kim?** | Müşteri iş analisti / departman yöneticisi / ürün kullanıcısı |
| **Kritik yetki** | Release note okuma, takvim görüntüleme, versiyon bilgilerini inceleme, dashboard izleme |

#### PARTNER

| | |
|---|---|
| **Açıklama** | Müşterinin iş ortağı veya alt yüklenici. Sadece değişiklik listesini (system changes) ve temel versiyon bilgilerini görebilir. En kısıtlı rol |
| **Kim?** | Entegrasyon yapan 3. parti şirket çalışanı / alt yüklenici geliştirici |
| **Kritik yetki** | Değişiklik listesi (breaking changes dahil), API değişiklikleri, versiyon numarası bilgisi |

---

### 10.6 Müşteri Yetki Matrisi — Detaylı

#### 10.6.1 Dashboard & Genel Erişim

| Yetki | CUSTOMER_ADMIN | APP_ADMIN | APPROVER | BUSINESS_USER | PARTNER |
|-------|----------------|-----------|----------|---------------|---------|
| Dashboard (ürün kartları) | ✅ | ✅ | ✅ | ✅ | 🔸⁴ |
| Ürün detayı sayfası | ✅ | ✅ | ✅ | ✅ | 🔸⁴ |
| Bildirim alma | ✅ | ✅ | ✅ | ✅ | ❌ |

> ⁴ PARTNER sadece sistem değişiklikleri olan ürünleri görür — ürün kartında kısıtlı bilgi (versiyon no + değişiklik sayısı).

#### 10.6.2 Versiyon & Paket Bilgisi

| Yetki | CUSTOMER_ADMIN | APP_ADMIN | APPROVER | BUSINESS_USER | PARTNER |
|-------|----------------|-----------|----------|---------------|---------|
| Alınan/alınmayan versiyonlar | ✅ | ✅ | ✅ | ✅ | ❌ |
| Paket detayı (VersionPackage) | ✅ | ✅ | ✅ | 📖 | ❌ |
| **Release notes görüntüleme** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Değişiklik listesi (System Changes)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| Breaking change detayı | ✅ | ✅ | ✅ | 📖 | ✅ |
| PR listesi gösterimi | ✅ | ✅ | ❌ | ❌ | ❌ |

#### 10.6.3 Yapılacaklar (Todo) Yönetimi

| Yetki | CUSTOMER_ADMIN | APP_ADMIN | APPROVER | BUSINESS_USER | PARTNER |
|-------|----------------|-----------|----------|---------------|---------|
| Todo listesini görüntüleme | ✅ | ✅ | ✅ | 📖 | ❌ |
| **Todo tamamlama (checkbox)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| Todo'ya not ekleme | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tamamlama ilerlemesi görme | ✅ | ✅ | ✅ | 📖 | ❌ |

#### 10.6.4 Sorun Bildirme (Transition Issues)

| Yetki | CUSTOMER_ADMIN | APP_ADMIN | APPROVER | BUSINESS_USER | PARTNER |
|-------|----------------|-----------|----------|---------------|---------|
| **Sorun bildirme (yeni kayıt)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| Sorun listesini görüntüleme | ✅ | ✅ | ✅ | 📖 | ❌ |
| Sorun detayı | ✅ | ✅ | ✅ | 📖 | ❌ |
| **Yorum yazma** | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dosya yükleme | ✅ | ✅ | ❌ | ❌ | ❌ |
| Çözüm onaylama (Evet Kapat / Tekrar Aç) | ✅ | ✅ | ❌ | ❌ | ❌ |

#### 10.6.5 Güncelleme Onayı & Geçiş Planlama

| Yetki | CUSTOMER_ADMIN | APP_ADMIN | APPROVER | BUSINESS_USER | PARTNER |
|-------|----------------|-----------|----------|---------------|---------|
| Takvim görüntüleme | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Versiyon geçiş planı oluşturma** (schedule) | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Versiyon geçiş planı düzenleme** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Ortam bazlı güncelleme onayı** (Docker IaaS) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Güncelleme talep etme (SaaS) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Artifact indirme (HelmChart / Binary) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Code Sync sayfasına yönlendirme (GIT_SYNC) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gerçekleşen tarih girişi | ✅ | ✅ | ✅ | ❌ | ❌ |

#### 10.6.6 Kullanıcı Yönetimi (Müşteri İçi)

| Yetki | CUSTOMER_ADMIN | APP_ADMIN | APPROVER | BUSINESS_USER | PARTNER |
|-------|----------------|-----------|----------|---------------|---------|
| Müşteri kullanıcı listeleme | ✅ | ❌ | ❌ | ❌ | ❌ |
| Müşteri kullanıcı ekleme | ✅ | ❌ | ❌ | ❌ | ❌ |
| Müşteri kullanıcı rol değiştirme | ✅ | ❌ | ❌ | ❌ | ❌ |
| Müşteri kullanıcı deaktive etme | ✅ | ❌ | ❌ | ❌ | ❌ |

---

### 10.7 Ürün Bazlı Erişim Kontrol Mekanizması

#### 10.7.1 Kurum Tarafı — UserProductAccess

```
┌────────────────────────────────────────────────────────────────────────┐
│  Kullanıcı & Rol Yönetimi  →  Kullanıcı Detay Drawer                │
├────────────────────────────────────────────────────────────────────────┤
│ Kullanıcı Bilgileri                                                   │
│ ─────────────────────────────────────────                             │
│ Ad:      [Mehmet Yıldız          ]                                    │
│ E-posta: [mehmet@company.com     ]                                    │
│ Rol:     [Developer ▾]                                                │
│                                                                        │
│ Ürün Erişimleri                                                       │
│ ─────────────────────────────────────────                             │
│ ☑  Cofins BFF                                                        │
│ ☑  E-Fatura Platformu                                                │
│ ☐  Raporlama Servisi                                                 │
│ ☐  Muhasebe Modülü                                                   │
│ ☑  IoT Gateway                                                       │
│                                                                        │
│ Seçili: 3 / 5 ürün                                                   │
│                                                                        │
│ [İptal]                               [Kaydet]                       │
└────────────────────────────────────────────────────────────────────────┘
```

**Akış:**
1. Admin, kullanıcı davet/düzenleme drawer'ında ürün checkbox'larını işaretler
2. Backend: `UserProductAccess` kayıtları oluşturulur/silinir
3. Tüm veri API'leri `filterByUserProducts(userId)` middleware'inden geçer
4. ADMIN rolü bu filtreden muaftır — tüm ürünleri görür

**Middleware pseudo-code:**
```typescript
async function filterByUserProducts(req: Request, res: Response, next: NextFunction) {
  if (req.user.role === 'ADMIN') return next(); // Admin bypass

  const accessibleProductIds = await prisma.userProductAccess.findMany({
    where: { userId: req.user.userId },
    select: { productId: true },
  });

  req.accessibleProductIds = accessibleProductIds.map(a => a.productId);

  if (req.accessibleProductIds.length === 0) {
    return res.status(403).json({ error: 'Erişebileceğiniz ürün bulunmuyor.' });
  }

  next();
}
```

**Etkilenen ekranlar:**
- Ürün listesi → sadece atanmış ürünler
- Release Calendar → sadece atanmış ürünlerin versiyonları
- Health Check → sadece atanmış ürünler
- Service Version Matrix → sadece atanmış ürünlerin servisleri/müşterileri
- Transition Issues → sadece atanmış ürünlere ait sorunlar
- Code Sync → sadece atanmış ürünlerin branch'leri

#### 10.7.2 Müşteri Tarafı — CPM Tabanlı Doğal Filtreleme

Müşteri kullanıcıları zaten `customerId` middleware'i ile kısıtlıdır (Section 7.1). Ek olarak CPM sadece müşteriye atanmış ürünleri döndürür:

```
CustomerUser.customerId → CustomerProductMapping → productId → Product
```

Müşteri kullanıcısı, müşterisine atanmamış bir ürünü hiçbir şekilde göremez. Bu, ürün bazlı erişimin müşteri tarafında doğal olarak sağlandığı anlamına gelir.

---

### 10.8 Yetki Uygulama Mimarisi (Enforcement)

#### 10.8.1 JWT Token Payload

**Kurum token:**
```json
{
  "userId": "uuid",
  "email": "mehmet@company.com",
  "name": "Mehmet Yıldız",
  "role": "DEVELOPER",
  "type": "ORG",
  "iat": 1740700800,
  "exp": 1740701700
}
```

**Müşteri token:**
```json
{
  "customerUserId": "uuid",
  "customerId": "uuid",
  "email": "ahmet@isbank.com.tr",
  "name": "Ahmet Yılmaz",
  "customerRole": "APP_ADMIN",
  "type": "CUSTOMER",
  "iat": 1740700800,
  "exp": 1740701700
}
```

> `type` alanı middleware'in hangi yetki zincirini çalıştıracağını belirler.

#### 10.8.2 Middleware Katmanları

```
Kurum Route'ları:
  authenticateJWT → requireRole(...roles) → filterByUserProducts → route handler

Müşteri Route'ları:
  authenticateCustomerJWT → resolveCustomerId → requireCustomerRole(...roles) → route handler
```

**Middleware implementasyonu (genişletilmiş):**

```typescript
// Kurum: Rol kontrolü
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
    if (!roles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }
    next();
  };
}

// Müşteri: Rol kontrolü
export function requireCustomerRole(...roles: CustomerRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.customerUser) return res.status(401).json({ error: 'Müşteri kimlik doğrulama gerekli' });
    if (!roles.includes(req.customerUser.customerRole as CustomerRole)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }
    next();
  };
}

// Müşteri: customerId çözümleme
export async function resolveCustomerId(req: Request, res: Response, next: NextFunction) {
  req.customerId = req.customerUser.customerId;
  // Tüm sorgulara customerId filtresi eklenecek
  next();
}
```

#### 10.8.3 Frontend Route Guard

```typescript
// Kurum route'ları
<Route path="/products" element={<RoleGuard roles={['ADMIN','PRODUCT_OWNER','RELEASE_MANAGER','DEVOPS_ENGINEER','DEVELOPER','QA_ENGINEER','VIEWER']} />}>
  <Route index element={<ProductList />} />
</Route>

<Route path="/admin/users" element={<RoleGuard roles={['ADMIN']} />}>
  <Route index element={<UsersRoles />} />
</Route>

<Route path="/settings" element={<RoleGuard roles={['ADMIN']} />}>
  <Route index element={<Settings />} />
</Route>

// Müşteri route'ları
<Route path="/customer-dashboard" element={<CustomerRoleGuard roles={['CUSTOMER_ADMIN','APP_ADMIN','APPROVER','BUSINESS_USER','PARTNER']} />}>
  <Route index element={<CustomerDashboard />} />
</Route>

<Route path="/customer-dashboard/users" element={<CustomerRoleGuard roles={['CUSTOMER_ADMIN']} />}>
  <Route index element={<CustomerUserManagement />} />
</Route>
```

**Buton/aksiyon seviyesinde gizleme:**
```typescript
// Örnek: Release Note düzenleme butonu
{hasPermission(user.role, 'releaseNote.edit') && (
  <Button onClick={handleEdit}>Düzenle</Button>
)}

// Müşteri: Todo checkbox
{hasCustomerPermission(customerUser.customerRole, 'todo.complete') && (
  <Checkbox checked={todo.completed} onChange={handleToggle} />
)}
```

---

### 10.9 Ekran Erişim Matrisi — Navigasyon Görünürlüğü

#### 10.9.1 Kurum Sidebar

| Menü Öğesi | ADMIN | PO | RM | DevOps | Dev | QA | Viewer |
|------------|-------|----|----|--------|-----|-----|--------|
| 🏠 Ana Sayfa (Dashboard) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 📦 Ürünler | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| 📅 Release Takvimi | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| 🔍 Health Check | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| 🔄 Code Sync | ✅ | ❌ | ✅ | ✅ | 📖 | ❌ | ❌ |
| 🏢 Müşteriler | ✅ | ✅ | ✅ | ✅ | 📖 | 📖 | 📖 |
| 📊 Servis Matrisi | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| 🐛 Geçiş Sorunları | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| 🚨 Acil Değişiklikler | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 📖 |
| 🔥 Hotfix Merkezi | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 📖 |
| ⚙️ Ayarlar | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 👥 Kullanıcılar & Roller | ✅ | 📖 | 📖 | ❌ | ❌ | ❌ | ❌ |

> 📖 = menüde görünür ama içeride CTA butonları gizli (salt okunur)

#### 10.9.2 Müşteri Portal Navigasyonu

| Menü / Sekme | CUSTOMER_ADMIN | APP_ADMIN | APPROVER | BUSINESS_USER | PARTNER |
|--------------|----------------|-----------|----------|---------------|---------|
| 🏠 Ürünlerim (Dashboard) | ✅ | ✅ | ✅ | ✅ | 🔸 |
| 📅 Takvim | ✅ | ✅ | ✅ | ✅ | ❌ |
| 📋 Versiyon Detayı | ✅ | ✅ | ✅ | ✅ | 🔸 |
| 📝 Yapılacaklar (Todo) | ✅ | ✅ | 📖 | 📖 | ❌ |
| 🐛 Sorunlarım | ✅ | ✅ | 📖 | 📖 | ❌ |
| 📄 Release Notes | ✅ | ✅ | ✅ | ✅ | ❌ |
| 🔀 Değişiklikler | ✅ | ✅ | ✅ | ✅ | ✅ |
| 👥 Kullanıcı Yönetimi | ✅ | ❌ | ❌ | ❌ | ❌ |
| 🔔 Bildirimler | ✅ | ✅ | ✅ | ✅ | ❌ |

---

### 10.10 Müşteri Kullanıcı Yönetimi Ekranı

`/customer-dashboard/users` — sadece CUSTOMER_ADMIN erişebilir.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 👥 Kullanıcı Yönetimi                           [+ Kullanıcı Ekle]         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ 🔍 Ara...     [Rol ▾]     [Durum ▾]                   Toplam: 8 kullanıcı   │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ Ad Soyad           │ E-posta              │ Rol            │ Durum │ [⋮]│
│ ├────────────────────┼──────────────────────┼────────────────┼───────┼────┤│
│ │ Ahmet Yılmaz       │ ahmet@isbank.com.tr  │ Yönetici (CA)  │ ✅   │ [⋮]││
│ │ Fatma Kaya         │ fatma@isbank.com.tr  │ Uygulama Yön.  │ ✅   │ [⋮]││
│ │ Mehmet Demir       │ mehmet@isbank.com.tr │ Onaylayıcı     │ ✅   │ [⋮]││
│ │ Zeynep Arslan      │ zeynep@isbank.com.tr │ İş Birimi      │ ✅   │ [⋮]││
│ │ Tech Partner Ltd   │ dev@techpartner.com  │ Partner        │ ✅   │ [⋮]││
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

── Kullanıcı Ekle Drawer ────────────────────────────────────────────────
│ Kullanıcı Ekle                                               [✕]     │
│ ─────────────────────────────────────────────────────────────────── │
│ Ad:      [___________________________]                               │
│ E-posta: [___________________________]                               │
│ Rol:     [İş Birimi Kullanıcısı ▾]                                   │
│           ┌─────────────────────────┐                                │
│           │ Uygulama Yöneticisi     │                                │
│           │ Onaylayıcı              │                                │
│           │ İş Birimi Kullanıcısı   │ ← varsayılan                   │
│           │ Partner                 │                                │
│           └─────────────────────────┘                                │
│                                                                      │
│ ℹ️ Yönetici (CUSTOMER_ADMIN) rolü sadece kurumunuz tarafından       │
│    atanabilir.                                                       │
│                                                                      │
│ [İptal]                         [Daveti Gönder]                     │
──────────────────────────────────────────────────────────────────────
```

**Kurallar:**
- CUSTOMER_ADMIN, kendisi dahil diğer CUSTOMER_ADMIN oluşturamaz — bu yetkiyi **sadece kurum tarafı** verir
- CUSTOMER_ADMIN kendi hesabını silemez / pasif yapamaz
- Partner eklenirken farklı domain'den e-posta girilebilir (`emailDomains` dışı) — bu izin verilen tek istisnadır
- Davet gönderildiğinde: e-posta ile şifre belirleme linki iletilir

---

### 10.11 Login Akışı — Birleşik veya Ayrı?

```
┌──────────────────────────────────────────────────────────────┐
│            ReleaseHub360 — Giriş                             │
│                                                              │
│  E-posta:  [___________________________]                     │
│  Şifre:    [___________________________]                     │
│                                                              │
│  [Giriş Yap]                                                │
│                                                              │
│  ────────────────────────────────────────                    │
│  Backend kontrol sırası:                                    │
│  1. E-posta → users tablosunda ara                          │
│  2. Bulundu → kurum login → ORG token üret                  │
│  3. Bulunamadı → customer_users tablosunda ara              │
│  4. Bulundu → müşteri login → CUSTOMER token üret           │
│  5. Hiçbirinde yok → 401 "Kullanıcı bulunamadı"            │
│  ────────────────────────────────────────                    │
│                                                              │
│  Token.type = ORG → /dashboard redirect                     │
│  Token.type = CUSTOMER → /customer-dashboard redirect       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

> **RM Kararı:** Tek login ekranı, iki tablo. Backend sırasıyla `users` → `customer_users` kontrol eder. Token'daki `type` alanı frontend'in hangi layout'u render edeceğini belirler. Bu, müşteri kullanıcılarının ayrı bir URL hatırlamasını gerektirmez.

**E-posta çakışma koruması:** Hem `users` hem `customer_users`'da aynı e-posta olamaz. Backend her iki tabloda unique kontrol yapar.

---

### 10.12 API Endpoint Tablosu

| # | Yöntem | Endpoint | Açıklama | Yetki |
|---|--------|----------|----------|-------|
| 1 | `POST` | `/api/auth/login` | Birleşik login: kurum + müşteri | Public |
| 2 | `POST` | `/api/auth/refresh` | Token yenileme | Authenticated |
| 3 | `GET` | `/api/users` | Kurum kullanıcı listesi | ADMIN |
| 4 | `POST` | `/api/users` | Kurum kullanıcı davet | ADMIN |
| 5 | `PATCH` | `/api/users/:id` | Kullanıcı güncelle (rol, durum) | ADMIN |
| 6 | `DELETE` | `/api/users/:id` | Kullanıcı sil | ADMIN |
| 7 | `GET` | `/api/users/:id/product-access` | Kullanıcının ürün erişimleri | ADMIN |
| 8 | `PUT` | `/api/users/:id/product-access` | Ürün erişimi toplu güncelle | ADMIN |
| 9 | `GET` | `/api/customer-users` | Müşteri kullanıcı listesi (kurum) | ADMIN, PRODUCT_OWNER |
| 10 | `POST` | `/api/customer-users` | Müşteri kullanıcı oluştur (kurum) | ADMIN, PRODUCT_OWNER |
| 11 | `GET` | `/api/customer-portal/users` | Müşteri kullanıcı listesi (portal) | CUSTOMER_ADMIN |
| 12 | `POST` | `/api/customer-portal/users` | Müşteri kullanıcı ekle (portal) | CUSTOMER_ADMIN |
| 13 | `PATCH` | `/api/customer-portal/users/:id` | Kullanıcı güncelle (portal) | CUSTOMER_ADMIN |
| 14 | `DELETE` | `/api/customer-portal/users/:id` | Kullanıcı sil (portal) | CUSTOMER_ADMIN |
| 15 | `GET` | `/api/auth/me` | Oturum bilgisi (rol, izinler) | Authenticated |
| 16 | `POST` | `/api/auth/change-password` | Şifre değiştirme | Authenticated |
| 17 | `POST` | `/api/auth/forgot-password` | Şifre sıfırlama talebi | Public |
| 18 | `POST` | `/api/auth/reset-password` | Şifre sıfırlama (token ile) | Public (token) |
| 19 | `GET` | `/api/roles/permissions` | Rol-yetki matrisi (frontend config) | Authenticated |

---

### 10.13 İş Kuralları

| # | Kural | Detay |
|---|-------|-------|
| 1 | **Deny-by-default** | Tanımlanmamış bir yetki erişimi otomatik reddedilir. Yeni özellik eklendiğinde yetki matrisi güncellenmeden o özellik hiçbir role açılmaz |
| 2 | **ADMIN bypass** | ADMIN rolü ürün kısıtlaması dahil tüm kontrollerden muaftır. ADMIN, ADMIN'i düzenleyemez (kendi kendine lock-out önleme) |
| 3 | **Ürün erişimi olmadan veri yok** | ADMIN dışındaki roller `UserProductAccess` kaydı olmadan hiçbir ürün verisini göremez. Ürün sayısı 0 → "Erişebileceğiniz ürün bulunmuyor" |
| 4 | **E-posta uniqueness** | Aynı e-posta hem `users` hem `customer_users`'da olamaz. Kurum kullanıcı oluşturulurken her iki tablo kontrol edilir, tersi de geçerli |
| 5 | **CUSTOMER_ADMIN atama** | CUSTOMER_ADMIN rolü sadece kurum tarafı (ADMIN, PRODUCT_OWNER) tarafından atanabilir. CUSTOMER_ADMIN kendisi başka CUSTOMER_ADMIN oluşturamaz |
| 6 | **Partner domain istisnası** | Partner rolündeki müşteri kullanıcıları `Customer.emailDomains` dışında bir domain ile kayıt olabilir. Diğer roller domain eşleşmesi gerektirir |
| 7 | **Self-deactivation engeli** | Hiçbir kullanıcı kendi hesabını pasif yapamaz veya silemez. Frontend'de buton disabled + tooltip |
| 8 | **Son ADMIN koruması** | Aktif ADMIN sayısı 1'e düşecek işlemler engellenir (rol değiştirme, pasif yapma, silme) |
| 9 | **Token type ayrımı** | `type = ORG` token müşteri route'larına erişemez, `type = CUSTOMER` token kurum route'larına erişemez. Middleware hard-block |
| 10 | **Release note yayınlama yetkisi** | Release note'u müşteriye görünür kılma (`notesPublished = true`) sadece PO veya ADMIN yapabilir. RM düzenleyebilir ama yayınlayamaz |
| 11 | **Ortam onayı yetki kontrolü** | Müşteri portalında ortam bazlı güncelleme onayı (Docker IaaS) sadece CUSTOMER_ADMIN, APP_ADMIN, APPROVER rolleri tarafından verilebilir |
| 12 | **Geçiş planı (schedule) yetkisi** | Versiyon geçiş takvimi oluşturma/düzenleme sadece CUSTOMER_ADMIN ve APPROVER rolleri yapabilir. APP_ADMIN bu planı görebilir ama düzenleyemez |
| 13 | **Audit trail** | Hassas yetki işlemleri (rol değişikliği, ürün erişimi ekleme/kaldırma, kullanıcı pasif yapma, müşteri kullanıcı oluşturma) loglama zorunlu. Kim, ne zaman, ne yaptı kaydedilir |

---

### 10.14 Boş & Hata Durumları

| Durum | Gösterim |
|-------|----------|
| Ürün erişimi olmayan kurum kullanıcısı | "Erişebileceğiniz ürün bulunmuyor. Sistem yöneticinizden ürün erişimi talep edin." |
| Müşteri kullanıcısı yetki dışı aksiyon | "Bu işlem için yetkiniz yok. [Rol adı] rolü bu işlemi gerçekleştiremez." + disabled buton (öncelikle buton gizleme, hata son savunma) |
| Müşteri kaydı olmayan login | "Kullanıcı hesabınız bulunamadı. Lütfen yöneticinizle iletişime geçin." |
| CUSTOMER_ADMIN başka CA oluşturmaya çalışırsa | "Yönetici rolü sadece kurumunuz tarafından atanabilir. Lütfen destek ekibiyle iletişime geçin." |
| E-posta çakışması davet sırasında | "Bu e-posta adresi zaten sistemde kayıtlı." |
| Son ADMIN'i değiştirme/silme | "Son yönetici hesabı kaldırılamaz. En az bir aktif yönetici olmalıdır." |
| Partner'ın erişemediği ekrana gitmeye çalışması | Sidebar'da ilgili menü hiç görünmez; URL ile erişim denemesinde 403 + "Bu sayfaya erişim yetkiniz yok." |
| Token süresi dolmuş | "Oturumunuz sona erdi. Lütfen tekrar giriş yapın." + login sayfasına yönlendirme |

---

### 10.15 Gap Analizi (Devam — 81-100)

| # | Konu | Detay |
|---|------|-------|
| 81. | **UserRole enum migration** | User tablosundaki `role` alanı string → enum. Mevcut değerlerin (ADMIN, DEVELOPER vb.) enum'a dönüşümü. Prisma migration |
| 82. | **UserProductAccess tablosu** | Yeni M:N junction tablo: userId + productId, unique constraint. Prisma model + migration |
| 83. | **CustomerUser tablosu** | Yeni tablo: customerId, email, passwordHash, name, customerRole, isActive. Prisma model + migration |
| 84. | **CustomerRole enum** | CUSTOMER_ADMIN, APP_ADMIN, APPROVER, BUSINESS_USER, PARTNER. Prisma enum |
| 85. | **Birleşik login endpoint** | `POST /api/auth/login` — users → customer_users sırasıyla kontrol, farklı token payload üretme |
| 86. | **authenticateCustomerJWT middleware** | Müşteri token'ını doğrulayan, `req.customerUser` set eden middleware |
| 87. | **requireCustomerRole middleware** | Müşteri rolünü kontrol eden middleware |
| 88. | **filterByUserProducts middleware** | Kurum kullanıcısının ürün erişimini tüm sorgulara uygulayan middleware. ADMIN bypass |
| 89. | **Ürün erişimi UI** | Kullanıcı davet/düzenleme drawer'ında ürün checkbox listesi. `PUT /api/users/:id/product-access` |
| 90. | **Müşteri kullanıcı yönetimi (kurum tarafı)** | Müşteri detayında kullanıcı listesi + CRUD. `GET/POST /api/customer-users?customerId={id}` |
| 91. | **Müşteri kullanıcı yönetimi (portal tarafı)** | `/customer-dashboard/users` sayfası. CUSTOMER_ADMIN erişimli |
| 92. | **Frontend RoleGuard component** | Kurum tarafı route guard: `roles` prop ile render/redirect kontrolü |
| 93. | **Frontend CustomerRoleGuard component** | Müşteri tarafı route guard: `customerRoles` prop ile render/redirect kontrolü |
| 94. | **hasPermission utility** | Rol + yetki string → boolean döndüren yardımcı fonksiyon. Button/UI element gizleme için |
| 95. | **E-posta çakışma kontrolü** | Her iki tabloyu (users + customer_users) kontrol eden unique validation helper |
| 96. | **Son ADMIN koruması** | Aktif ADMIN sayısı kontrolü: rol değişikliği + deaktive + silme işlemlerinde |
| 97. | **Partner domain istisnası** | CustomerUser oluşturma sırasında role = PARTNER ise emailDomains kontrolü atlanır |
| 98. | **Müşteri davet e-postası** | Şifre belirleme linki içeren davet e-postası gönderimi. n8n veya nodemailer |
| 99. | **Yetki audit log** | Hassas yetki işlemlerinin (rol, erişim, durum değişiklikleri) loglanması. Yeni audit tablo veya mevcut notification altyapısı |
| 100. | **Frontend sidebar dinamik render** | Kullanıcı rolüne göre sidebar menü öğelerini gizleme/gösterme. Section 10.9 matrisine göre |

---

## 11. Kurum Dashboard — Operasyonel Kokpit & DORA Metrikleri

Mevcut `designs/screens/home-dashboard.md` dosyasındaki basit dashboard, yalnızca "bugün ne yapmalıyım?" sorusunu yanıtlıyordu. Bu bölüm o dashboard'u **stratejik karar destek aracına** dönüştürür: DORA metrikleri, release operasyon metrikleri ve **farkındalık skorları** ile donatılmış, PO ve developer'ların tek bakışta "organizasyonumuz ne durumda?" sorusunu yanıtlayacağı bir kokpit.

> **RM Perspektifi:**
> Bir release yönetim platformu sadece "hangi release aktif" göstermekle kalmaz — **süreçlerin ne kadar sağlıklı çalıştığını ölçer.** DORA metrikleri endüstri standardıdır, ama biz buna ReleaseHub360'a özgü skorlar (Codebase Divergence, Config Drift, Deployment Diversity) ekliyoruz. Bunlar kurumsal yazılım dağıtımının gerçek dünya ağrı noktalarını izler.
>
> **Kritik karar:** Bu dashboard müşteriye gösterilmez — tamamen kurum içi operasyonel izleme aracıdır. Müşterinin kendi dashboard'u (Section 7) ayrıdır.

### 11.1 Sayfa Yapısı

**Route:** `/dashboard` (mevcut home page yerine geçer)
**Erişim:** Tüm kurum rolleri görür, veri ürün erişimine göre filtrelenir (Section 10.7)
**Varsayılan filtre:** Kullanıcının erişebildiği tüm ürünler (çoklu seçim dropdown ile daraltılabilir)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ≡  ReleaseHub360                                     [🔔 3]  [Vacit B. ▾] │
├──────────┬───────────────────────────────────────────────────────────────────┤
│          │  Merhaba, Vacit 👋   1 Mart 2026                                 │
│ Sidebar  │                                                                   │
│          │  Ürün Filtresi: [Tümü ▾]  Dönem: [Son 90 gün ▾]                 │
│  ○ Home  │                                                                   │
│  ...     │  ┌─── BÖLÜM A: OPERASYONEL ÖZET (mevcut dashboard) ──────────┐  │
│          │  │  Üst metrik kartlar + aktif release + bekleyen aksiyonlar   │  │
│          │  └────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          │  ┌─── BÖLÜM B: DORA METRİKLERİ ──────────────────────────────┐  │
│          │  │  4 DORA kartı + trend grafik                               │  │
│          │  └────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          │  ┌─── BÖLÜM C: RELEASE OPS METRİKLERİ ──────────────────────┐  │
│          │  │  Cycle Time, MR Throughput, Pipeline, Todo Count           │  │
│          │  └────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
│          │  ┌─── BÖLÜM D: FARKINDALIK SKORLARI ────────────────────────┐  │
│          │  │  Codebase Div. + Config Drift + Deployment Diversity       │  │
│          │  └────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
└──────────┴───────────────────────────────────────────────────────────────────┘
```

**Rol bazlı bölüm görünürlüğü:**

| Bölüm | ADMIN | PO | RM | DevOps | Dev | QA | Viewer |
|-------|-------|----|----|--------|-----|-----|--------|
| A — Operasyonel Özet | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| B — DORA Metrikleri | ✅ | ✅ | ✅ | ✅ | 📖 | 📖 | 📖 |
| C — Release Ops Metrikleri | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 |
| D — Farkındalık Skorları | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

> Dev ve QA için farkındalık skorları operasyonel bağlamı olmayan üst düzey metriklerdir — görmelerine gerek yok.

---

### 11.2 Bölüm A — Operasyonel Özet (Mevcut Dashboard Genişletilmiş)

Mevcut `home-dashboard.md` tasarımı korunur, aşağıdaki eklemeler yapılır:

#### 11.2.1 Üst Metrik Kartları (Genişletilmiş — 5 kart)

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🔴 2          │ │ 🟡 5         │ │ ✅ 18        │ │ 📦 3         │ │ 🐛 7         │
│ Kritik Alert │ │ Bekleyen Onay│ │ Bu Ay Release│ │ Devam Eden   │ │ Açık Sorun   │
│ pipeline+pod │ │ (Bu hafta)   │ │ Yayınlanan   │ │ Geliştirme   │ │ (TransIssue) │
│              │ │              │ │              │ │ Versiyonlar  │ │              │
│ ↑1 önceki aya│ │              │ │ ↑30% önceki  │ │              │ │ 3 kritik     │
│   göre       │ │              │ │   ay'a göre  │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

| Kart | Veri Kaynağı | Tablo/API |
|------|-------------|-----------|
| Kritik Alert | Pipeline hatası + pod hatası | Azure DevOps Pipeline API (MCP proxy) |
| Bekleyen Onay | Hotfix + PR review bekleyen | `HotfixRequest WHERE status=PENDING` + Azure PR API |
| Bu Ay Release | Bu ay `status=RELEASED` olan versiyonlar | `ProductVersion WHERE status=RELEASED AND actualReleaseDate >= ayBaşı` |
| Devam Eden | `status=IN_DEVELOPMENT` versiyon sayısı | `ProductVersion WHERE status=IN_DEVELOPMENT` |
| Açık Sorun | `TransitionIssue WHERE status IN (OPEN, IN_PROGRESS)` | Section 9 tablosu |

#### 11.2.2 Aktif Release Tablosu + Müşteri Geçiş Durumu

Mevcut tabloya iki yeni sütun eklenir:

```
┌── AKTİF RELEASE'LER ──────────────────────────────────────────────────────┐
│ Ürün          Versiyon  Aşama         Sağlık  Müşteri Geçişi     Eylem   │
│ Cofins BFF    v3.2.1    🧪 Testing     🟢 87%  8/12 geçti (67%)   [→]   │
│ E-Fatura      v2.5.0    ✅ Released    —       5/10 geçti (50%)   [→]   │
│ Raporlama     v1.3.0    🔨 In Dev      📊 62%  —                   [→]   │
│ IoT Gateway   v4.0.0    🧪 Testing     🔴 41%  0/6 (planlanmadı)  [→]   │
└────────────────────────────────────────────────────────────────────────────┘
```

**Müşteri Geçişi sütunu veri kaynağı:**
- `RELEASED` versiyonlar: `CustomerVersionTransition WHERE toVersionId = X` → COMPLETED / toplam müşteri oranı
- `IN_DEVELOPMENT` versiyonlar: gösterilmez (geçiş henüz başlamamış)
- `TESTING` versiyonlar: gösterilmez

> **RM Gözlemi:** Bu sütunla PO, bir versiyon çıktıktan sonra müşterilerin ne kadarının geçiş yaptığını tek satırda görür. %50'nin altı → takip gerekir.

---

### 11.3 Bölüm B — DORA Metrikleri

[DORA (DevOps Research and Assessment)](https://dora.dev) endüstri standardı 4 metrik:

#### 11.3.1 Metrik Kartları

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  📊 DORA Metrikleri                                  Dönem: [Son 90 gün ▾]      │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐                         │
│  │ 🚀 Deployment Frequency │  │ ⏱️ Lead Time for Changes│                         │
│  │                          │  │                          │                         │
│  │     4.2 / hafta          │  │     3.8 gün              │                         │
│  │     ████████████░░░░     │  │     ████░░░░░░░░░░░░     │                         │
│  │     Elite (>1/gün)       │  │     Medium (1g-1h)       │                         │
│  │     ← Önceki: 3.1/hafta │  │     ← Önceki: 5.2 gün   │                         │
│  │     ↑ 35% iyileşme       │  │     ↑ 27% iyileşme       │                         │
│  └────────────────────────┘  └────────────────────────┘                         │
│                                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐                         │
│  │ ❌ Change Failure Rate  │  │ 🔧 Mean Time to Restore │                         │
│  │                          │  │                          │                         │
│  │     8.3%                 │  │     4.1 saat             │                         │
│  │     ██░░░░░░░░░░░░░░     │  │     ████████░░░░░░░░     │                         │
│  │     Elite (<5%=🟢)       │  │     High (<1g=🟢)        │                         │
│  │     ← Önceki: 12.1%     │  │     ← Önceki: 8.6 saat  │                         │
│  │     ↑ 31% iyileşme       │  │     ↑ 52% iyileşme       │                         │
│  └────────────────────────┘  └────────────────────────┘                         │
│                                                                                  │
│  ── Trend Grafiği ─────────────────────────────────────────────────────────────  │
│                                                                                  │
│  [DF] [LT] [CFR] [MTTR]  ← toggle: hangi metrik grafikte gösterilsin            │
│                                                                                  │
│        │                                                                         │
│   5.0  │         ╱╲                                                              │
│   4.0  │    ╱───╱  ╲──╱╲───                                                     │
│   3.0  │───╱              ╲──── ← Deployment Frequency trend (haftalık)          │
│   2.0  │                                                                         │
│        └──────────────────────────────→                                          │
│         Hft1  Hft2  Hft3  ... Hft12                                              │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### 11.3.2 DORA Metrik Tanımları ve Veri Kaynakları

##### 1. Deployment Frequency (DF) — Dağıtım Sıklığı

| | |
|---|---|
| **Tanım** | Belirli dönemde üretime çıkan sürüm sayısı |
| **Formül** | `COUNT(ProductVersion WHERE status=RELEASED AND actualReleaseDate BETWEEN dönemBaşı AND dönemSonu) / haftaSayısı` |
| **Veri kaynağı** | `product_versions` tablosu — `status`, `actualReleaseDate` alanları |
| **Birim** | X release / hafta |
| **Hotfix dahil mi?** | Evet — `isHotfix = true` olanlar da sayılır (hatta ayrı gösterilebilir) |
| **DORA benchmark** | Elite: günde birden fazla, High: haftalık-aylık, Medium: aylık-6aylık, Low: 6 ay+ |

> **RM Doğrulama:** ✅ `ProductVersion` tablosundaki `actualReleaseDate` + `status = RELEASED` ile doğrudan hesaplanır. Hotfix sayısı ayrı bir sub-metric olarak gösterilirse, "asıl feature release" vs "hotfix" ayrımı da görülür.

##### 2. Lead Time for Changes (LT) — Değişiklik Teslim Süresi

| | |
|---|---|
| **Tanım** | Bir PR'ın merge edilmesinden, o PR'ı içeren versiyonun üretime çıkmasına kadar geçen süre |
| **Formül** | `AVG(ProductVersion.actualReleaseDate - PR.mergedAt)` — versiyona dahil olan tüm PR'lar üzerinden ortalama |
| **Veri kaynağı** | `ServiceReleaseSnapshot.prIds` → PR merge tarihi (Azure DevOps / GitHub API) + `ProductVersion.actualReleaseDate` |
| **Birim** | Gün (veya saat) |
| **DORA benchmark** | Elite: <1 saat, High: 1 gün-1 hafta, Medium: 1 hafta-1 ay, Low: 1 ay+ |

> **RM Doğrulama:** ✅ `ServiceReleaseSnapshot` tablosunda `prIds` JSON array olarak saklanıyor (Section 6). Her PR ID'si ile Azure DevOps API'sinden `mergedDate` çekilir. Versiyonun `actualReleaseDate` ile aradaki fark = lead time. Bu hesap biraz pahalıdır — backend'de periyodik olarak hesaplanıp cache'lenmelidir.

##### 3. Change Failure Rate (CFR) — Değişiklik Hata Oranı

| | |
|---|---|
| **Tanım** | Hotfix gerektiren release'lerin toplam release'lere oranı |
| **Formül** | `COUNT(ProductVersion WHERE isHotfix=true AND actualReleaseDate IN dönem) / COUNT(ProductVersion WHERE status=RELEASED AND actualReleaseDate IN dönem) × 100` |
| **Veri kaynağı** | `product_versions` tablosu — `isHotfix`, `status`, `actualReleaseDate` |
| **Birim** | Yüzde (%) |
| **DORA benchmark** | Elite: 0-5%, High: 5-10%, Medium: 10-15%, Low: 16%+ |

> **RM Doğrulama:** ✅ `ProductVersion.isHotfix` boolean alanı zaten var. Hotfix sayısı / toplam release sayısı = CFR. Basit, direkt sorgulanabilir.

##### 4. Mean Time to Restore (MTTR) — Ortalama Kurtarma Süresi

| | |
|---|---|
| **Tanım** | Bir hotfix talebinin açılmasından, hotfix'in üretime çıkmasına kadar geçen ortalama süre |
| **Formül** | `AVG(hotfixVersion.actualReleaseDate - HotfixRequest.createdAt)` |
| **Veri kaynağı** | `hotfix_requests` tablosu (`createdAt`) + `product_versions` tablosu (`actualReleaseDate`, `isHotfix=true`) |
| **Eşleştirme** | `HotfixRequest.productVersionId` → ilgili hotfix versiyonunun release tarihi |
| **Birim** | Saat veya gün |
| **DORA benchmark** | Elite: <1 saat, High: <1 gün, Medium: 1 gün-1 hafta, Low: 1 hafta+ |

> **RM Doğrulama:** ✅ `HotfixRequest` tablosunda `createdAt` var, ilgili `ProductVersion` (hotfix versiyonu) `actualReleaseDate` ile eşleştirilir. Aradaki fark = MTTR. `HotfixRequest.productVersionId` FK zaten mevcut.

#### 11.3.3 DORA Benchmark Renklendirmesi

| Seviye | Renk | Eşik (DF örneği) |
|--------|------|-------------------|
| Elite | 🟢 Yeşil | En iyi %20 |
| High | 🔵 Mavi | İyi performans |
| Medium | 🟡 Sarı | Geliştirilmeli |
| Low | 🔴 Kırmızı | Dikkat gerekli |

Her metrik kartında: mevcut değer + önceki dönem karşılaştırması + DORA benchmark seviyesi + yüzde değişim.

---

### 11.4 Bölüm C — Release Operasyon Metrikleri

DORA'nın ötesinde, ReleaseHub360'a özgü operasyonel metrikler:

#### 11.4.1 Metrik Kartları

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  📈 Release Operasyon Metrikleri                     Dönem: [Son 90 gün ▾]      │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐        │
│  │ ⏳ Cycle Time        │ │ 🔀 MR Throughput    │ │ 🏗️ Pipeline Success │        │
│  │                       │ │                      │ │                      │        │
│  │    12.4 gün           │ │    47 PR / hafta     │ │    94.2%             │        │
│  │    ← Önceki: 15.1 gün│ │    ← Önceki: 38     │ │    ← Önceki: 91.8%  │        │
│  │    ↑ 18% iyileşme     │ │    ↑ 24% artış      │ │    ↑ 2.4% iyileşme  │        │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘        │
│                                                                                  │
│  ┌─────────────────────┐                                                        │
│  │ ☑️ Todo / Versiyon   │  ← "Bu sayı azaldıkça geçiş otomatikleşmiş"           │
│  │                       │                                                        │
│  │    Ort: 14.2 todo     │     ┌──────────────────────────────────────┐           │
│  │    Max: 23  (v3.0.0)  │     │ v2.3 ████████████████████ 22 todo   │           │
│  │    Min: 6   (v2.5.1)  │     │ v2.4 ██████████████ 14 todo        │           │
│  │                       │     │ v2.5 ██████████ 10 todo             │           │
│  │    📉 Trend: azalıyor │     │ v3.0 ████████████████████████ 23    │           │
│  │    (iyi yönde)        │     │ v3.1 ████████ 8 todo                │           │
│  └─────────────────────┘     └──────────────────────────────────────┘           │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### 11.4.2 Metrik Tanımları ve Veri Kaynakları

##### 1. Cycle Time — İş Teslim Süresi

| | |
|---|---|
| **Tanım** | Bir Work Item'ın "Active" statüsüne alınmasından, o WI'ın dahil olduğu versiyonun üretime çıkmasına kadar geçen süre |
| **Formül** | `AVG(ProductVersion.actualReleaseDate - WorkItem.activatedDate)` — versiyona dahil WI'lar üzerinden |
| **Veri kaynağı** | Azure DevOps Work Item API (`System.ActivatedDate`) + `ProductVersion.actualReleaseDate` + `ServiceReleaseSnapshot.prIds` → PR'ın linked WI'ları |
| **Birim** | Gün |
| **Hedef** | Kısa = iyi. Major release'de 20-30 gün normal, minor'da 5-10 gün hedef |

> **RM Doğrulama:** ✅ PR'lar `ServiceReleaseSnapshot.prIds`'de saklanıyor. Her PR'ın linked work item'ları Azure API'sinden alınır. WI'ın `System.ActivatedDate` alanı başlangıç, versiyonun `actualReleaseDate` bitiş. Hesaplama MCP Server veya backend scheduled job ile yapılır.

##### 2. Merge Request (PR) Throughput — PR Akış Hızı

| | |
|---|---|
| **Tanım** | Belirli dönemde merge edilen PR sayısı |
| **Formül** | `COUNT(merged PRs WHERE mergedDate BETWEEN dönemBaşı AND dönemSonu)` — ürün bazlı filtrelenebilir |
| **Veri kaynağı** | Azure DevOps / GitHub Pull Request API (MCP Server proxy) |
| **Birim** | PR / hafta |
| **Hedef** | Trende bakılır — düşüş geliştirme yavaşlaması, ani artış "crunch merge" sinyali |

> **RM Doğrulama:** ✅ Mevcut `GET /api/tfs/pull-requests?productId={id}` endpoint'i zaten PR verisi çekiyor. `status=completed` + `closedDate` üzerinden zaman filtresi uygulanır. Aggregation backend'de yapılır.

##### 3. Pipeline Success Rate — Pipeline Başarı Oranı

| | |
|---|---|
| **Tanım** | Çalışan pipeline'ların başarılı olanlarının oranı |
| **Formül** | `COUNT(builds WHERE result=succeeded) / COUNT(builds) × 100` |
| **Veri kaynağı** | Azure DevOps Build API: `GET /api/tfs/builds?productId={id}&minTime={dönemBaşı}` (MCP Server proxy) |
| **Birim** | Yüzde (%) |
| **Hedef** | >95% = sağlıklı, 90-95% = izle, <90% = müdahale gerekli |

> **RM Doğrulama:** 🟡 Mevcut sistemde pipeline/build verisi MCP Server üzerinden alınabiliyor ancak özel bir aggregation endpoint'i yok. `GET /api/tfs/builds` endpoint'i eklenmeli veya mevcut pipeline-status ekranının API'si genişletilmeli.

##### 4. Todo Count per Version — Versiyon Başına Todo Sayısı

| | |
|---|---|
| **Tanım** | Her versiyona tanımlanan toplam todo sayısı. Azalması = geçiş sürecinin otomatikleştirildiği anlamına gelir |
| **Formül** | `COUNT(ReleaseTodo WHERE productVersionId = X)` — tüm versiyonlar için hesaplanır |
| **Veri kaynağı** | `release_todos` tablosu — `productVersionId` gruplaması |
| **Birim** | Adet / versiyon |
| **Hedef** | Trend olarak azalması beklenir. Ani artış → yeni ürün/özellik, azalma → otomasyon başarılı |

> **RM Doğrulama:** ✅ `ReleaseTodo` tablosunda `productVersionId` FK var. `GROUP BY productVersionId` + `COUNT(*)` = versiyon başına todo. Trend grafiği: versiyonları kronolojik sırala, son N versiyonu göster.

**Bonus — Todo Tamamlanma Oranı:**
```sql
SELECT 
  pv.version,
  COUNT(*) as totalTodos,
  COUNT(ctc.id) as completedByCustomers,
  ROUND(COUNT(ctc.id)::decimal / NULLIF(COUNT(*), 0) * 100, 1) as completionRate
FROM release_todos rt
JOIN product_versions pv ON rt.productVersionId = pv.id
LEFT JOIN customer_todo_completions ctc ON ctc.todoId = rt.id AND ctc.completed = true
GROUP BY pv.id, pv.version
ORDER BY pv.releaseDate DESC
LIMIT 10
```

---

### 11.5 Bölüm D — Farkındalık Skorları (Awareness Scores)

Bu skorlar organizasyonun teknik borç ve yapısal karmaşıklık düzeyini izler. Direkt bir "düzelt" aksiyonu yoktur — farkındalık yaratır, strateji kararlarını besler.

> **RM Perspektifi:** Bu skorlar CTO toplantısında "biz ne durumdayız?" sorusuna cevap verir. Günlük development'ı değil, organizasyonel sağlığı ölçer.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🔍 Farkındalık Skorları (Awareness Scores)                                      │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────┐ ┌─────────────────────────────────┐│
│  │ 🔀 Codebase Divergence Score            │ │ ⚙️ Config Difference Score      ││
│  │                                          │ │                                  ││
│  │       72 / 100                           │ │       45 / 100                   ││
│  │  ╭────────────────╮                      │ │  ╭────────────────╮              ││
│  │  │   ██████████░░ │ 🟡 Orta Risk         │ │  │   ████░░░░░░░░ │ 🟢 Düşük Risk││
│  │  ╰────────────────╯                      │ │  ╰────────────────╯              ││
│  │                                          │ │                                  ││
│  │  GIT_SYNC müşteri: 6                    │ │  IaaS müşteri: 8                ││
│  │  Ort. commit farkı: 142                  │ │  Farklılaşan config: 12/50      ││
│  │  En geride: İş Bankası (234 commit)     │ │  En farklı: Akbank (18 field)   ││
│  │  En güncel: Garanti (12 commit)         │ │  En tutarlı: Garanti (2 field)  ││
│  │                                          │ │                                  ││
│  │  [Detay →]                              │ │  [Detay →]                       ││
│  └─────────────────────────────────────────┘ └─────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────┐ ┌─────────────────────────────────┐│
│  │ 📦 Deployment Diversity Score           │ │ 📊 Genel Sağlık Özeti           ││
│  │                                          │ │                                  ││
│  │       58 / 100                           │ │   DORA               🟡 Medium  ││
│  │  ╭────────────────╮                      │ │   Release Ops        🟢 High    ││
│  │  │   ██████░░░░░░ │ 🟡 Orta              │ │   Codebase Div.      🟡 72/100  ││
│  │  ╰────────────────╯                      │ │   Config Drift       🟢 45/100  ││
│  │                                          │ │   Deploy Diversity   🟡 58/100  ││
│  │  Dağıtım tipleri: 3                     │ │                                  ││
│  │  ├── DOCKER: 12 müşteri (60%)           │ │   Genel:  🟡 Orta Sağlıklı      ││
│  │  ├── BINARY: 5 müşteri (25%)            │ │                                  ││
│  │  └── GIT_SYNC: 3 müşteri (15%)         │ │  "6 müşteri 3+ versiyon geride" ││
│  │                                          │ │  "Config drift artış trendinde"  ││
│  │  Hosting modeli:                        │ │                                  ││
│  │  ├── SaaS: 8 (40%)                     │ │                                  ││
│  │  ├── IaaS: 7 (35%)                     │ │                                  ││
│  │  └── Self-Hosted: 5 (25%)              │ │                                  ││
│  │                                          │ │                                  ││
│  │  [Detay →]                              │ │                                  ││
│  └─────────────────────────────────────────┘ └─────────────────────────────────┘│
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### 11.5.1 Codebase Divergence Score — Kod Ayrışma Skoru

**Kimin için:** GIT_SYNC müşterileri olan ürünler
**Ne ölçer:** Müşteri branch'lerinin kaynak (main/release) branch'ten ne kadar uzaklaştığını

| | |
|---|---|
| **Tanım** | GIT_SYNC müşterilerinin branch'lerinin kaynak koddan ne kadar ayrıştığını gösteren toplam skor |
| **Bileşenler** | (1) Son sync'ten bu yana kaynaktaki commit sayısı, (2) Müşteri branch'indeki özgün commit sayısı (cherry-pick olmayan), (3) Son sync tarihi yaşı |
| **Formül** | Her müşteri için: `divergencePoints = behindCommits × 1.0 + aheadCommits × 1.5 + daysSinceSync × 0.5`. Skor: `100 - (AVG(divergencePoints) / maxThreshold × 100)`. Score 0-100, düşük = çok ayrışmış |
| **Veri kaynağı** | `CustomerBranch` + `SyncHistory` tabloları (Section 4.4) + Git API (commit count behind/ahead) |
| **Hesaplama** | Günlük scheduled job — Git API'den behind/ahead commit sayısı çekilir, `SyncHistory`'den son sync tarihi alınır |
| **Eşikler** | 🟢 80-100 (güncel), 🟡 50-79 (dikkat), 🔴 0-49 (kritik ayrışma) |

**Detay drill-down (Detay → tıklanınca):**

```
┌──────────────────────────────────────────────────────────────────┐
│  Codebase Divergence — Detay                                    │
├──────────────────────────────────────────────────────────────────┤
│  Ürün: E-Fatura Platformu   GIT_SYNC Müşteri: 6               │
│                                                                  │
│  Müşteri       Branch              Behind  Ahead  Son Sync     │
│  ─────────────────────────────────────────────────────────────  │
│  🔴 İş Bankası isbank/main         234     18     45 gün önce  │
│  🟡 Yapı Kredi  ykb/main            89      5     12 gün önce  │
│  🟡 Halkbank   halkbank/develop     67      3     22 gün önce  │
│  🟢 Garanti    garanti/main         12      0     3 gün önce   │
│  🟢 Ziraat     ziraat/main           8      1     5 gün önce   │
│  🟢 QNB        qnb/main              4      0     1 gün önce   │
│                                                                  │
│  ⚠️ İş Bankası 45 gündür sync edilmemiş — 234 commit geride    │
│  📋 Önerilen aksiyon: Code Sync başlat → conflict analizi yap  │
└──────────────────────────────────────────────────────────────────┘
```

> **RM Gözlemi:** Bu skor arttıkça (= ayrışma büyüdükçe) conflict riski katlanarak artar. 200+ commit geride bir müşteri aylar süren bir merge operasyonu gerektirebilir. Erken müdahale kritik.

#### 11.5.2 Config Difference Awareness Score — Konfigürasyon Fark Skoru

**Kimin için:** Özellikle IaaS (kurum yönetimli) müşteriler — ama Self-Hosted için de geçerli
**Ne ölçer:** Müşteriler arası konfigürasyon farklılaşmasının boyutunu

| | |
|---|---|
| **Tanım** | Müşterilerin deployment konfigürasyonlarının birbirinden ve base template'den ne kadar farklılaştığını izler |
| **Bileşenler** | (1) `helmValuesOverrides` JSON field derinliği/boyutu, (2) Müşteriye özel environment variable sayısı, (3) Base template'den sapma oranı |
| **Formül** | Her CPM için: `diffFields = countOverrideKeys(helmValuesOverrides)`. Skor: `100 - (AVG(diffFields) / maxExpectedFields × 100)`. 0-100, yüksek = tutarlı |
| **Veri kaynağı** | `CustomerProductMapping.helmValuesOverrides` (JSON analizi) + `CustomerProductMapping.environments` (ortam sayısı karşılaştırma) |
| **Hesaplama** | Her save/update'de yeniden hesaplanır veya günlük batch job |
| **Eşikler** | 🟢 70-100 (tutarlı), 🟡 40-69 (dikkat), 🔴 0-39 (yüksek farklılaşma) |

> **RM Notu — Faz 1 vs Faz 2:**
> Faz 1'de bu skor `helmValuesOverrides` JSON field'ının key sayısı üzerinden basitçe hesaplanır. Faz 2'de actual config dosyalarının diff analizi (key-by-key karşılaştırma) yapılabilir.

> **Neden önemli?** Config drift arttıkça:
> - Aynı versiyonun bir müşteride çalışıp diğerinde patlaması riski artar
> - Her müşteriye özel test gereksinimi doğar
> - Hotfix'in tüm config varyantlarında çalıştığından emin olmak zorlaşır

#### 11.5.3 Deployment Diversity Score — Dağıtım Çeşitlilik Skoru

**Ne ölçer:** Organizasyonun kaç farklı dağıtım modeli/tipi yönettiğini ve bunların karmaşıklık etkisini

| | |
|---|---|
| **Tanım** | Farklı artifactType + deploymentModel + hostingType kombinasyonlarının sayısı ve dağılımı |
| **Formül** | `uniqueCombinations = DISTINCT(artifactType, deploymentModel, hostingType)`. Skor: `100 - (uniqueCombinations / maxExpectedCombinations × 100)`. Yüksek skor = daha homojen = daha kolay yönetim |
| **Veri kaynağı** | `CustomerProductMapping` tablosu: `artifactType`, `deploymentModel`, `hostingType` alanları |
| **Birim** | 0-100 skor + dağılım grafiği |
| **Eşikler** | 🟢 70-100 (homojen), 🟡 40-69 (çeşitli), 🔴 0-39 (çok parçalı) |

**Değerlendirme:**
```
Olası kombinasyonlar:
  DOCKER + SAAS              → Kurum deploy eder, müşteri dokunmaz
  DOCKER + ON_PREM + IAAS    → Kurum müşteri ortamına deploy eder
  DOCKER + ON_PREM + SELF    → Müşteri HelmChart indirir, kendi deploy eder
  BINARY + ON_PREM + IAAS    → Kurum DLL'leri müşteri VM'ine koyar
  BINARY + ON_PREM + SELF    → Müşteri DLL/ZIP indirir
  GIT_SYNC + ON_PREM + SELF  → Kaynak kod müşteriye sync edilir

6 olası tip × N müşteri = operasyonel karmaşıklık
```

> **RM Gözlemi:** 3+ farklı dağıtım tipi yönetmek ciddi operasyonel yük. Bu skor, standartlaştırma kararını tetikler: "Tüm yeni müşterilere sadece DOCKER+SaaS sunalım mı?"

#### 11.5.4 Genel Sağlık Özeti

Tüm metriklerin tek kart'ta özeti — CTO/VP seviyesinde anlık durum:

```typescript
interface HealthSummary {
  dora: {
    level: 'ELITE' | 'HIGH' | 'MEDIUM' | 'LOW';
    metrics: { df: number; lt: number; cfr: number; mttr: number };
  };
  releaseOps: {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    cycleTime: number;
    mrThroughput: number;
    pipelineSuccess: number;
    avgTodoCount: number;
  };
  awareness: {
    codebaseDivergence: number;  // 0-100
    configDifference: number;    // 0-100
    deploymentDiversity: number; // 0-100
  };
  highlights: string[]; // AI-generated veya rule-based insight'lar
}
```

**Highlights örnekleri (rule-based):**
- "6 müşteri 3+ versiyon geride — toplu güncelleme kampanyası düşünülmeli"
- "Config drift son 30 günde %15 arttı — standart template revizyonu önerilir"
- "MTTR son çeyrekte %52 iyileşti — hotfix süreçleri olgunlaşıyor"
- "GIT_SYNC müşteri İş Bankası 45 gündür sync edilmemiş — Code Sync öncelikli"
- "Todo sayısı son 5 versiyonda %40 azaldı — otomasyon iyileştirmeleri etkili"

---

### 11.6 Versiyon Geçiş Durumu Widget'ı

Aktif release tablosundaki "Müşteri Geçişi" sütununun detay drill-down'u:

```
┌──────────────────────────────────────────────────────────────────┐
│  📊 Versiyon Geçiş Durumu — E-Fatura v2.5.0                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Geçiş İlerleme:  ████████████░░░░░░░░  5/10 müşteri (50%)     │
│                                                                  │
│  ✅ Geçti      │ ⏳ Planlandı   │ ❌ Planlamadı                 │
│  5 müşteri    │ 3 müşteri     │ 2 müşteri                     │
│                                                                  │
│  ── Detay ─────────────────────────────────────────────────────  │
│  Müşteri        Durum          Tarih        Gün Kaldı           │
│  ✅ Akbank      COMPLETED      15 Şub       —                   │
│  ✅ Garanti     COMPLETED      18 Şub       —                   │
│  ✅ Yapı Kredi  COMPLETED      20 Şub       —                   │
│  ✅ Halkbank    COMPLETED      22 Şub       —                   │
│  ✅ QNB         COMPLETED      25 Şub       —                   │
│  ⏳ Ziraat      PLANNED        5 Mar        4 gün               │
│  ⏳ DenizBank   PLANNED        10 Mar       9 gün               │
│  ⏳ VakıfBank   PLANNED        15 Mar       14 gün              │
│  ❌ İş Bankası  —              —            —          [Hatırlat]│
│  ❌ TEB         —              —            —          [Hatırlat]│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Veri kaynağı:** `CustomerVersionTransition WHERE toVersionId = :versionId` + `CustomerProductMapping WHERE productId = :productId` (eşleşme olmayan = planlamadı)

---

### 11.7 Ürün Bazlı Filtre Davranışı

Sayfa açılışında tüm metrikleri kullanıcının erişebildiği **tüm ürünler** üzerinden hesaplar. Ürün filtresi uygulanınca:

| Metrik | Ürün filtresi etkisi |
|--------|---------------------|
| DORA — DF | Sadece seçili ürünlerin release'leri sayılır |
| DORA — LT | Sadece seçili ürünlerin PR'ları |
| DORA — CFR | Sadece seçili ürünlerin hotfix / release oranı |
| DORA — MTTR | Sadece seçili ürünlerin hotfix request'leri |
| Cycle Time | Seçili ürünlerin WI'ları |
| MR Throughput | Seçili ürünlerin repo'larındaki PR'lar |
| Pipeline Success | Seçili ürünlerin pipeline'ları |
| Todo Count | Seçili ürünlerin versiyonlarındaki todo'lar |
| Codebase Div. | Seçili ürünlerin GIT_SYNC müşterileri |
| Config Diff. | Seçili ürünlerin IaaS müşterileri |
| Deploy Diversity | Seçili ürünlerin CPM dağılımı |

**Multi-product seçimde:** aggregate ortalama / toplam gösterilir. Tek ürün seçimde o ürüne özel değerler.

---

### 11.8 Dönem Filtresi

```
[Son 30 gün ▾]
├── Son 7 gün
├── Son 30 gün
├── Son 90 gün (varsayılan)
├── Son 6 ay
├── Son 1 yıl
└── Özel aralık...
```

**Etkisi:** DORA ve Release Ops metrikleri seçilen döneme göre hesaplanır. Farkındalık skorları dönemden bağımsızdır (anlık durum gösterir).

---

### 11.9 API Endpoint Tablosu

| # | Yöntem | Endpoint | Açıklama | Yetki |
|---|--------|----------|----------|-------|
| 1 | `GET` | `/api/dashboard/summary` | Üst 5 metrik kartı | Tüm kurum rolleri |
| 2 | `GET` | `/api/dashboard/active-releases` | Aktif release tablosu + müşteri geçiş durumu | Tüm kurum rolleri |
| 3 | `GET` | `/api/dashboard/pending-actions` | Rol bazlı bekleyen aksiyonlar | Tüm kurum rolleri |
| 4 | `GET` | `/api/dashboard/dora` | DORA 4 metrik + önceki dönem karşılaştırması | PO, RM, ADMIN, DevOps |
| 5 | `GET` | `/api/dashboard/dora/trend` | DORA metrik zaman serisi (haftalık) | PO, RM, ADMIN, DevOps |
| 6 | `GET` | `/api/dashboard/release-ops` | Cycle Time, MR Throughput, Pipeline Success, Todo Count | Tüm kurum rolleri |
| 7 | `GET` | `/api/dashboard/release-ops/todo-trend` | Versiyon bazlı todo sayısı trend | Tüm kurum rolleri |
| 8 | `GET` | `/api/dashboard/awareness` | 3 farkındalık skoru + genel sağlık özeti | ADMIN, PO, RM, DevOps |
| 9 | `GET` | `/api/dashboard/awareness/codebase-detail` | GIT_SYNC müşterileri commit behind/ahead detayı | ADMIN, PO, RM, DevOps |
| 10 | `GET` | `/api/dashboard/awareness/config-detail` | Config diff detay — müşteri bazlı override sayıları | ADMIN, PO, RM, DevOps |
| 11 | `GET` | `/api/dashboard/awareness/deployment-detail` | Dağıtım tipi dağılımı detayı | ADMIN, PO, RM, DevOps |
| 12 | `GET` | `/api/dashboard/version-transition/:versionId` | Versiyon geçiş durumu detayı (müşteri listesi) | PO, RM, ADMIN |
| 13 | `GET` | `/api/dashboard/highlights` | Rule-based insight önerileri | ADMIN, PO, RM |

**Tüm endpoint'ler query parametreleri:**
- `?productIds=id1,id2` — ürün filtresi (boş = tümü)
- `?from=2025-12-01&to=2026-03-01` — dönem filtresi
- `?previousFrom=2025-09-01&previousTo=2025-12-01` — önceki dönem (karşılaştırma)

---

### 11.10 İş Kuralları

| # | Kural | Detay |
|---|-------|-------|
| 1 | **Ürün erişim filtresi** | Tüm dashboard API'leri `filterByUserProducts` middleware'inden geçer. ADMIN hariç kullanıcılar sadece erişebildikleri ürünlerin metriklerini görür |
| 2 | **DORA benchmark eşikleri konfigüre edilebilir** | `Settings` tablosunda `dora.df.eliteThreshold`, `dora.cfr.highThreshold` vb. keys ile ayarlanabilir. Varsayılanlar DORA standardı |
| 3 | **Lead Time cache** | PR merge tarihi alımı pahalıdır (external API). Backend scheduled job (günlük) hesaplar, sonuç cache tablosunda saklanır. Dashboard API cache'den okur |
| 4 | **Codebase Divergence scheduled job** | Günlük çalışır: her `CustomerBranch` için Git API'den behind/ahead commit sayısı çeker, `SyncHistory`'den son sync tarihini alır, skoru hesaplar ve `Settings` veya özel metrik tablosuna yazar |
| 5 | **Config Difference JSON analizi** | `helmValuesOverrides` alanının JSON key derinliğini analiz eder. `null` veya `{}` = 0 fark. Nested key'ler flatten edilerek sayılır (`resources.limits.memory` = 1 key) |
| 6 | **Dönem filtresi DORA + Release Ops'a uygulanır** | Farkındalık skorları dönemden bağımsız — anlık durum gösterir |
| 7 | **Hotfix ayrımı** | DF metriğinde hotfix'ler dahil sayılır ama sub-metric olarak ayrıca gösterilir: `featureReleases: X, hotfixes: Y, total: X+Y` |
| 8 | **Todo Count ürüne özel** | Major version'larda (v3.0.0) todo sayısının artması normaldir — trend sadece aynı ürün içinde anlamlı |
| 9 | **Geçiş durumu sadece RELEASED versiyonlar** | Aktif release tablosundaki "Müşteri Geçişi" sütunu yalnızca `RELEASED` statüsündeki versiyonlar için gösterilir |
| 10 | **Highlights max 5 madde** | Genel Sağlık Özeti kartındaki insight'lar en fazla 5 adet gösterilir — severity'ye göre sıralı |
| 11 | **Pipeline verisi MCP proxy** | Pipeline success rate Azure DevOps Build API'sinden MCP Server üzerinden alınır — frontend doğrudan çağırmaz |
| 12 | **Metric karşılaştırma** | Her metrikte önceki dönem karşılaştırması gösterilir: `↑ %X iyileşme` veya `↓ %X kötüleşme` |

---

### 11.11 Boş & Hata Durumları

| Durum | Gösterim |
|-------|----------|
| Hiç release yok (yeni kurulum) | Tüm DORA kartlarında: "Metrik hesaplaması için en az 1 release gerekiyor." |
| Seçili üründe GIT_SYNC müşteri yok | Codebase Divergence kartı: "Bu üründe GIT_SYNC müşteri bulunmuyor." |
| Seçili üründe IaaS müşteri yok | Config Difference kartı: "Bu üründe IaaS müşteri bulunmuyor." |
| Pipeline verisi alınamıyor | Pipeline Success kartı: "Pipeline verisi alınamadı. Azure DevOps bağlantısını kontrol edin." |
| Lead Time cache güncel değil | LT kartında ince uyarı: "Son güncelleme: 14 saat önce" (24s+ ise sarı badge) |
| Önceki dönem verisi yok | "Karşılaştırma için önceki dönem verisi yetersiz" — trend yüzdesi gösterilmez |
| Kullanıcının ürün erişimi yok | Tüm dashboard boş: "Erişebileceğiniz ürün bulunmuyor. Sistem yöneticinizden ürün erişimi talep edin." |

---

### 11.12 Teknik Uygulama Notları

#### 11.12.1 Backend Scheduled Jobs

| Job | Sıklık | Ne yapar |
|-----|--------|----------|
| `dora-metrics-calculator` | Günlük (gece 02:00) | DF, LT, CFR, MTTR hesaplar, `metric_snapshots` tablosuna yazar |
| `codebase-divergence-checker` | Günlük (gece 03:00) | Her CustomerBranch için Git API'den behind/ahead commit sayısı çeker |
| `config-diff-analyzer` | Her CPM güncelleme + günlük batch | `helmValuesOverrides` JSON key analizi yapar |
| `pipeline-stats-collector` | 6 saatte bir | Azure DevOps Build API'den son dönem pipeline sonuçlarını çeker |

#### 11.12.2 Metric Snapshot Tablosu (Yeni)

```prisma
model MetricSnapshot {
  id          String   @id @default(uuid())
  productId   String?  // null = tüm ürünler aggregate
  metricType  String   // "DORA_DF", "DORA_LT", "DORA_CFR", "DORA_MTTR", 
                       // "OPS_CYCLE_TIME", "OPS_MR_THROUGHPUT", "OPS_PIPELINE_SUCCESS",
                       // "AWARENESS_CODEBASE_DIV", "AWARENESS_CONFIG_DIFF", "AWARENESS_DEPLOY_DIV"
  value       Float
  metadata    Json?    // ek breakdown bilgisi (ör: hotfix vs feature ayrımı)
  periodStart DateTime
  periodEnd   DateTime
  createdAt   DateTime @default(now())

  product Product? @relation(fields: [productId], references: [id])

  @@index([productId, metricType, periodEnd(sort: Desc)])
  @@map("metric_snapshots")
}
```

> **RM Notu:** Tüm metrikleri her API çağrısında hesaplamak performans açısından kabul edilemez (özellikle LT ve Codebase Divergence external API çağrısı gerektirir). Scheduled job hesaplar, snapshot tablosuna yazar, dashboard API snapshot'tan okur. Kullanıcı [🔄 Yenile] tıklanınca real-time hesaplama tetiklenir (opsiyonel, pahalı).

#### 11.12.3 Frontend Bileşen Yapısı

```
DashboardPage/
├── OperationalSummarySection/
│   ├── MetricCards (5 kart)
│   ├── ActiveReleasesTable
│   ├── PendingActionsPanel
│   └── ActivityFeed
├── DoraMetricsSection/
│   ├── DoraMetricCard (×4)
│   └── DoraTrendChart (recharts veya MUI Charts)
├── ReleaseOpsSection/
│   ├── OpsMetricCard (×4)
│   └── TodoTrendChart
└── AwarenessSection/
    ├── CodebaseDivergenceCard
    ├── ConfigDifferenceCard
    ├── DeploymentDiversityCard
    └── HealthSummaryCard
```

---

### 11.13 Gap Analizi (Devam — 101-120)

| # | Konu | Detay |
|---|------|-------|
| 101. | **MetricSnapshot tablosu** | Yeni Prisma model: productId, metricType, value, metadata JSON, periodStart/End. Index: productId + metricType + periodEnd |
| 102. | **DORA metrics calculator job** | Scheduled job: DF, LT, CFR, MTTR hesaplama. ProductVersion + HotfixRequest + ServiceReleaseSnapshot.prIds + Azure PR API |
| 103. | **Lead Time hesaplama servisi** | PR merge tarihlerini Azure DevOps API'den çekip versiyonun actualReleaseDate ile farkını hesaplayan backend servis |
| 104. | **Codebase divergence checker job** | CustomerBranch tablosu + Git API'den behind/ahead commit sayısı. Daily scheduled |
| 105. | **Pipeline stats collector job** | Azure DevOps Build API → pipeline success/failure sayıları. 6 saatlik scheduled job |
| 106. | **Config diff analyzer** | CPM.helmValuesOverrides JSON key analizi. Flatten + count + base template karşılaştırma |
| 107. | **Dashboard summary API** | `GET /api/dashboard/summary` — 5 metrik kartı verisini toplayan aggregate endpoint |
| 108. | **Dashboard DORA API** | `GET /api/dashboard/dora` + `/dora/trend` — MetricSnapshot'tan oku, DORA benchmark seviyelendirmesini ekle |
| 109. | **Dashboard awareness API** | `GET /api/dashboard/awareness` + 3 detay endpoint — farkındalık skorları + drill-down |
| 110. | **Dashboard highlights engine** | Rule-based insight üretimi: metrik eşiklerini kontrol et → string insight üret. Max 5 madde |
| 111. | **Aktif release tablosu genişletme** | Mevcut tabloya "Müşteri Geçişi" sütunu ekleme — `CustomerVersionTransition` aggregate |
| 112. | **Version transition detail endpoint** | `GET /api/dashboard/version-transition/:versionId` — geçiş yapan/planlayan/planlamayan müşteri listesi |
| 113. | **Frontend DORA section** | 4 DoraMetricCard + DoraTrendChart bileşenleri. Renk kodlaması + benchmark seviye gösterimi |
| 114. | **Frontend awareness section** | 3 skor kartı + 1 genel özet kartı + drill-down drawer/dialog'lar |
| 115. | **Dönem filtresi bileşeni** | Dropdown: 7g/30g/90g/6ay/1y/özel. Seçim → tüm DORA + ReleaseOps sorgularını yeniden çalıştır |
| 116. | **Ürün multi-select filtresi** | Çoklu ürün seçimi → tüm metrikleri seçili ürünler için aggregate hesapla |
| 117. | **Mevcut home-dashboard.md güncelleme** | Mevcut designs/screens/home-dashboard.md bu bölümle uyumlu hale getirilmeli |
| 118. | **Settings — DORA eşikleri** | Settings tablosunda DORA benchmark eşikleri konfigürasyonu. Varsayılan değerler seed |
| 119. | **Git API behind/ahead endpoint** | `GET /api/tfs/compare?repoName={name}&source={branch}&target={branch}` — commit farkı. MCP Server proxy |
| 120. | **MCP Server build/pipeline endpoint** | `GET /api/tfs/builds?productId={id}&minTime={date}` — pipeline run sonuçları. MCP Server'a eklenmeli |

---

*Sonraki bölümler: Code Sync (Section 12)...*
