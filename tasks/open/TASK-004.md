---
id: TASK-004
status: OPEN
type: FEATURE
scope: FULLSTACK
ux-required: false
n8n-required: false
priority: P1
created-by: release-manager
date: 2025-01-30
---

# TASK-004: Customer Dashboard — Geçiş Planlama, Todo Yürütme, Sorun Bildirme, Release Notları

## Özet

Customer Dashboard'da müşteri rolündeki kullanıcıların ihtiyaç duyduğu dört kritik alt sistem eksik: (1) versiyon geçişi için planlanan ve gerçekleşen tarih girişi, (2) versiyonlara ait todo listesini müşteri tarafında tamamlayabilme, (3) sorun bildirme formu, (4) versiyonların release notlarına erişim. Bu task bu dört alt sistemi sırayla tamamlar.

## Problem / Fırsat

Şu anda müşteri kullanıcısı Customer Dashboard'a girdiğinde hangi versiyonda olduğunu görebiliyor ama:
- Yeni versiyona **ne zaman geçeceğini planlayamıyor** (tarih girişi yok)
- Geçiş tamamlandığında **gerçekleşen tarihi kaydedemediği** için tarihsel raporlama eksik
- Versiyona ait **yapılacaklar listesini görmüyor**, hangi adımları tamamladığını işaretleyemiyor
- Bir sorunla karşılaştığında **direkt dashboarddan bildirim açamıyor**
- **Release notlarına** ulaşmak için ayrı bir kanal veya kişi gerekiyor

Bu eksiklikler müşteri self-servis kapasitesini sıfırlıyor; her aksiyon için kurumun müdahalesi gerekiyor.

## Kullanıcı Hikayeleri

- **Müşteri kullanıcısı** olarak "E-Fatura v2.5.0'a Test ortamında 15 Mart, Prod'da 22 Mart'ta geçeceğiz" diye planlama yapabilmek istiyorum, çünkü bu tarihleri iç ekibimle koordine etmem gerekiyor.
- **Müşteri kullanıcısı** olarak "Test geçişi 16 Mart'ta tamamlandı" diyerek gerçekleşen tarihi kaydedebilmek istiyorum, çünkü bu veriyi release manager'larımızın görmesi gerekiyor.
- **Müşteri kullanıcısı** olarak "DB migration çalıştır" adımını bitti işaretleyebilmek istiyorum, çünkü geçiş sürecinde hiçbir adım atlamamam gerekiyor.
- **Müşteri kullanıcısı** olarak bir sorunla karşılaştığımda doğrudan dashboarddan hata bildirebilmek istiyorum, çünkü mail/Slack kanalı üzerinden bildirmek gecikmeli ve takip edilemiyor.
- **Müşteri kullanıcısı** olarak aldığım ya da almak üzere olduğum versiyonun release notlarını dashboarddan okuyabilmek istiyorum, çünkü versiyonda gelen değişiklikleri iç ekibime anlatmam gerekiyor.

## Kabul Kriterleri (AC)

### Alt Sistem 1 — Geçiş Planlama (Planned / Actual Date)

- [ ] Release Takvimi tab'ında (veya Release Takibi tab'ında) müşterinin sahip olduğu her versiyona karşı "Planla" butonu görünür
- [ ] "Planla" tıklandığında ortam bazlı tarih girişi dialog'u açılır (Test, Pre-Prod, Prod için ayrı satırlar)
- [ ] Planlanan tarih kaydedilince `CustomerVersionTransition` kaydı oluşur ya da güncellenir (`plannedDate`, `environment`, `status = PLANNED`)
- [ ] Ürün kartında "📅 22 Mar geçiş planlandı" badge'i görünür (mavi renk)
- [ ] Gerçekleşen tarih hücresi başlangıçta "—" gösterir; üzerine tıklanınca DatePicker açılır
- [ ] Gerçekleşen tarih girilince `actualDate` kaydedilir ve satır Durum = "Tamam ✅" olur
- [ ] Prod ortamı actual date girildiğinde `CustomerProductMapping.currentVersionId` güncellenir (backend tetikler)
- [ ] `concurrentUpdatePolicy = BLOCK` olan ürünlerde, başka müşterinin planladığı günler kırmızı uyarıyla gösterilir (seçim engellenmez, sadece uyarı verilir — P2 olarak ilerletilecek)
- [ ] Erişim kontrolü: yalnızca `role = CUSTOMER` ve bu müşteriye ait CPM kaydı olan kullanıcı planlama yapabilir

### Alt Sistem 2 — Todo Yürütme (CustomerTodoCompletion)

- [ ] Versiyonlar tab'ında her bekleyen versiyon için "📋 Yapılacaklar" butonu çıkar
- [ ] Buton tıklandığında o versiyon için todos listelenir: scope filtreli (ALL + müşteriye SPECIFIC olanlar)
- [ ] Her todo için checkbox gösterilir; tamamlananlar checked + tamamlayan ismi + tarih gösterilir
- [ ] Checkbox tıklanınca `CustomerTodoCompletion` kaydı upsert edilir (`completed = true/false`)
- [ ] İsteğe bağlı not alanı: checkbox tıklandığında tek satırlık not input'u belirir, Enter ile kaydedilir
- [ ] İlerleme çubuğu: "X/Y tamamlandı" lineer progress bar üstte görünür
- [ ] Tamamlanmamış P0 todo sayısı ürün kartında kırmızı badge olarak gösterilir
- [ ] `scope = SPECIFIC` ama bu müşteri kapsam dışıysa todo gizlenir
- [ ] `requiresOrgParticipation = true` olan todo'larda "Kurum katılımı gerekli" chip badge gösterilir

### Alt Sistem 3 — Sorun Bildirme (TransitionIssue — Customer Create)

- [ ] Versiyonlar tab'ında ya da genel action area'da "🐛 Sorun Bildir" butonu bulunur
- [ ] Dialog açılır: title (zorunlu), description (zorunlu), priority (LOW/MEDIUM/HIGH/CRITICAL — default MEDIUM), etkilenen ürün seçimi (müşterinin ürünleri ile pre-populated)
- [ ] Form submit edilince `POST /api/transition-issues` çağırılır; `customerId` backend'de session'dan otomatik eklenir
- [ ] Başarılı kayıt sonrası snackbar: "Sorun bildiriminiz alındı. Takip no: #XXX"
- [ ] Müşteri, kendi açtığı issue'ları listeleyen "Açık Sorunlarım" section'ı görür (aynı tab ya da alt kısım)
- [ ] Issue listesi: title, status badge (OPEN/IN_PROGRESS/RESOLVED/CLOSED), tarih — salt okunur
- [ ] Erişim kontrolü: müşteri yalnızca kendi `customerId`'siyle eşleşen issue'ları görebilir

### Alt Sistem 4 — Release Notları Erişimi

- [ ] Versiyonlar tab'ında her versiyon satırında "📋 Release Notes" butonu görünür
- [ ] Buton tıklandığında o versiyona ait release notları aynı sayfada (slide-in panel ya da dialog) gösterilir
- [ ] Release notu içeriği: versiyon adı, yayın tarihi, özet (HTML/Markdown render), tag listesi
- [ ] Eğer versiyon için release notu yoksa "Bu versiyon için henüz release notu yayınlanmamıştır" boş state mesajı gösterilir
- [ ] Salt okunur: müşteri release notu editleyemez
- [ ] Erişim kontrolü: yalnızca müşterinin CPM kaydında yer alan productId ile eşleşen versiyonların release notları görüntülenebilir

## Kapsam Dışı (Out of Scope)

- `concurrentUpdatePolicy = BLOCK` aktif engelleme (bugün için sadece warning, tam implementasyon P2)
- Customer–Service Version Matrix otomatik doldurma (Prod actual date sonrası tetiklenen matrix güncelleme — ayrı task)
- Todo'ların kurum tarafından müşteriye atanması (notification entegrasyonu, ayrı task)
- Release notu e-posta ile gönderme
- Sorun bildirimi için dosya/ekran görüntüsü ekleme (P2)

## İş Kuralları

- **Geçiş planlama yetkisi:** Yalnızca `role = CUSTOMER` ve oturum açan kullanıcının `customerId`'si hedef müşteri ile eşleşiyorsa yapılabilir. Backend token'dan `customerId` alır, body'deki değeri güvenmez.
- **Actual date → currentVersion:** Prod ortamı `actualDate` girildiğinde backend otomatik olarak `CustomerProductMapping.currentVersionId = toVersionId` atar. Frontend bu güncellemeyi beklentiye almadan query invalidation ile UI'ı tazeler.
- **Todo scope filtresi:** `scope = ALL` → herkese göster. `scope = SPECIFIC` → `customerIds` array'inde bu müşteri varsa göster, yoksa gizle. Frontend'de değil, backend endpoint'te filtrelenir.
- **Issue customerId:** `POST /api/transition-issues` isteğinde `customerId` body'den alınmaz; JWT'den çözülen kullanıcının `customerId`'si kullanılır.
- **Release notu erişim filtresi:** Backend, `customerId`'ye ait CPM kayıtlarından `productId` listesini çeker; yalnızca bu productId'lere ait versiyonların release notları döndürülür.
- **CustomerTodoCompletion uniqueness:** `(todoId, customerId, versionId)` üçlüsü unique — upsert ile çalışır.

## Öncelik ve Etki

| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Tüm müşteri portal kullanıcıları — her geçiş sürecinde aktif kullanım |
| İş etkisi | Müşteri self-servis oranını artırır; release manager iş yükünü azaltır |
| Teknik risk | Schema migration gerekiyor (CustomerTodoCompletion yeni tablo, CustomerVersionTransition güncelleme); düşük risk |
| Öncelik | P1 — core müşteri portal işlevselliği, başka hiçbir müşteri özelliği bunlar olmadan anlamlı değil |

## Bağımlılıklar

### Schema Değişiklikleri (Blocker)

**`CustomerVersionTransition` — 4 alan ekle:**
```prisma
plannedDate   DateTime?
actualDate    DateTime?
status        String    @default("PLANNED")  // PLANNED | COMPLETED | CANCELLED
environment   String    @default("PROD")     // TEST | PRE_PROD | PROD
```
Unique constraint güncelle: `@@unique([customerId, toVersionId, environment])`

**`CustomerTodoCompletion` — yeni model:**
```prisma
model CustomerTodoCompletion {
  id          String   @id @default(uuid())
  todoId      String
  customerId  String
  versionId   String
  completed   Boolean  @default(false)
  completedAt DateTime?
  completedBy String?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  todo     ReleaseTodo    @relation(fields: [todoId], references: [id])
  customer Customer       @relation(fields: [customerId], references: [id])
  version  ProductVersion @relation(fields: [versionId], references: [id])

  @@unique([todoId, customerId, versionId])
  @@map("customer_todo_completions")
}
```

### Backend Endpoint'leri (Gereken Yeni/Değişen)

| Method | Path | Açıklama |
|--------|------|----------|
| `POST` | `/api/customer-version-transitions` | Geçiş kaydı oluştur (plannedDate + environment) |
| `PATCH` | `/api/customer-version-transitions/:id` | actualDate gir, status güncelle; Prod actualDate → CPM.currentVersionId güncelle |
| `GET` | `/api/customer-version-transitions?customerId=&productId=` | Müşterinin geçiş kayıtlarını listele |
| `GET` | `/api/customer-todo-completions?customerId=&versionId=` | Todo completion durumlarını çek |
| `PATCH` | `/api/customer-todo-completions` | Upsert — todo tamamla/geri al + not ekle |
| `GET` | `/api/transition-issues?customerId=` | Müşterinin kendi issue'larını listele |
| `POST` | `/api/transition-issues` | Sorun bildir (customerId JWT'den) |
| `GET` | `/api/release-notes/by-version/:versionId` | Müşterinin erişebildiği versiyonun release notu |

> `GET /api/release-notes/by-version/:versionId` muhtemelen zaten var; müşteri erişim filtresi eklenmesi yeterli olabilir — backend geliştirici kontrol edecek.

### Bağımsız Sistemler

- `TransitionIssue` Prisma modeli mevcut — sadece customer-side create route ve GET filtresi gerekiyor
- `ReleaseNote` Prisma modeli mevcut — erişim filtresi gerekiyor
- `ReleaseTodo` Prisma modeli mevcut — scope ve customerIds alanları var, kontrol edilmeli

## Açık Sorular

- [ ] `concurrentUpdatePolicy` verisi CPM'de mi, Product'ta mı? → Backend geliştirici `schema.prisma`'yı doğrulayacak
- [ ] `CustomerVersionTransition` mevcut kayıtlar `PROD` ortamlı mı sayılacak? → Migration script gerekebilir (default "PROD" koy)
- [ ] `ReleaseTodo.customerIds` alanının tipi `String[]` mi `Json` mı? → Schema kontrolü gerekli
- [ ] Release notu erişimi için ek lisans/yetki seviyesi var mı? → Şimdilik CPM kaydı yeterli kabul edildi

## Tasarım Notları

UX dosyası bulunmadığı için (`ux-required: false`) frontend geliştirici aşağıdaki rehberi kullanır:

- **Geçiş Planlama:** Release Takvimi tab'ındaki mevcut milestone tablosuna iki sütun eklenir: "Planlanan Tarih" (DatePicker) ve "Gerçekleşen Tarih" (DatePicker, başlangıç disabled yoksa aktif). Ayrı dialog gerekmez.
- **Todo Listeleri:** Her versiyon satırının altında collapse/expand ederek açılan TodoList area. Progress bar üstte. Checkbox + tamamlayan ismi + tarih side-by-side.
- **Sorun Bildir:** Sayfanın sağ üst köşesine sabit "🐛 Sorun Bildir" chip butonu — tüm tab'larda görünür. Dialog içinde form.
- **Release Notes:** Versiyonu listeleyen row'da "📋 Release Notes" chip. Tıklandığında sağ taraftan slide-in Drawer — tam sayfa navigation yerine panel tercih edilir (bağlamı korur).
- **Bileşen stratejisi:** `CustomerDashboardPage.tsx` zaten 928 satır. Her alt sistem için ayrı component dosyası çıkarılır: `CustomerTransitionPlanTable.tsx`, `CustomerTodoList.tsx`, `CustomerIssueReportDialog.tsx`, `CustomerReleaseNoteDrawer.tsx`.

## Geliştirici Uygulama Sırası

```
1. Backend — Schema migration (CustomerTodoCompletion yeni tablo + CustomerVersionTransition alan ekleme)
2. Backend — Yeni/değişen endpoint'ler (yukarıdaki tablo sırasıyla)
3. Frontend — CustomerTransitionPlanTable (planned + actual date giriş)
4. Frontend — CustomerTodoList (todo completion)
5. Frontend — CustomerReleaseNoteDrawer (release notes)
6. Frontend — CustomerIssueReportDialog (sorun bildir + liste)
7. Bütünsel test: todo completion → progress bar güncellenir, actual prod date → ürün kartı "Güncel ✅" olur
```

---

## RM Handoff — 2025-01-30

- Scope kararı: FULLSTACK
- ux-required: false (design doc §7'de yeterince net wireframe var, frontend geliştirici referans alacak)
- n8n-required: false (n8n entegrasyonu bu scope dışında)
- Öncelik: P1
- Sıradaki rol: backend-developer (schema migration blocker — önce bu biter)
- RM Review bekleniyor: Hayır (akışkan mod — backend bittikten sonra frontend-developer direkt başlayabilir)

---

## Backend Handoff — 2025-01-30

### Tamamlanan Schema Değişiklikleri

**`CustomerVersionTransition`** — 4 yeni alan + unique constraint:
- `environment String @default("PROD")` — TEST | PRE_PROD | PROD
- `status String @default("PLANNED")` — PLANNED | COMPLETED | CANCELLED
- `plannedDate DateTime?`
- `actualDate DateTime?`
- `@@unique([customerId, toVersionId, environment])` eklendi
- `db push` ile uygulandı (migration: `task004_customer_dashboard`)

**`CustomerTodoCompletion`** — yeni tablo (customer_todo_completions):
- Fields: todoId, customerId, versionId, completed, completedAt, completedBy, notes
- `@@unique([todoId, customerId, versionId])` — upsert güvenli
- Relations: ReleaseTodo, Customer, ProductVersion

### Uygulanan Endpoint'ler

| Method | Path | Açıklama |
|--------|------|----------|
| `GET` | `/api/customer-version-transitions` | CUSTOMER rolü JWT'den customerId alır, ORG rolü query param |
| `POST` | `/api/customer-version-transitions` | Upsert — CUSTOMER create + ORG create |
| `PATCH` | `/api/customer-version-transitions/:id` | actualDate + status güncelle; Prod actualDate → CPM.currentVersionId |
| `GET` | `/api/customer-todo-completions?customerId=&versionId=` | Todos + completion map + summary {total, completed, p0Incomplete} |
| `PATCH` | `/api/customer-todo-completions` | Upsert single todo completion |
| `GET` | `/api/transition-issues/my` | CUSTOMER JWT'den customerId ile kendi issue'larını görür |
| `POST` | `/api/transition-issues` | CUSTOMER rolü için customerId JWT'den otomatik atanır |
| `GET` | `/api/release-notes/by-version/:versionId` | CPM erişim kontrolü ile müşteri filtreli release notu |

### Frontend için Notlar

- `PATCH /api/customer-version-transitions/:id` — Prod ortamı `actualDate` girilince backend otomatik `CPM.currentVersionId` günceller; frontend sadece query invalidation yapmalı
- `GET /api/customer-todo-completions` response shape:
  ```json
  { "data": [{ ...todo, "completion": { completed, completedBy, completedAt, notes } | null }], "summary": { "total": 9, "completed": 5, "p0Incomplete": 0 } }
  ```
- `GET /api/transition-issues/my` — sadece `role = CUSTOMER` için. ORG kullanıcısı `customerId` filter ile `/api/transition-issues?customerId=` kullanmalı
- `ReleaseTodo` modelinde henüz `scope` ve `customerIds` alanı yok — tüm todo'lar müşteriye görünür (scope=ALL gibi davranır). Kapsam filtrelemesi sonraki iterasyona bırakıldı.

### Dikkat Edilmesi Gerekenler

- `CustomerVersionTransition` upsert kullanıyor — aynı (customer, version, environment) için POST tekrar çağırılınca updated edilir
- `customerTodoCompletions.routes.ts` yeni dosya — app.ts'e import+use eklendi
- Backend PORT=3002'de çalışıyor, `npx tsc --noEmit` 0 hata

- Sıradaki rol: frontend-developer
- RM Review bekleniyor: Hayır
