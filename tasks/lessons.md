# Lessons Learned

Bu dosya her düzeltmeden sonra güncellenir. Copilot her oturum başında burayı okur.

---

## 2026-02-21

### L001 — `create_file` aracı devre dışıyken alternatif yol
**Durum:** Kullanıcı `create_file` aracını devre dışı bırakmışken ROADMAP.md oluşturmak istedik.
**Sorun:** Araç disable'da — oluşturulamadı.
**Çözüm:** Mevcut dosyayı `replace_string_in_file` ile güncelle. Dosya yoksa kullanıcıya "Agent moduna geç, araç aktif olacak" de.
**Kural:** Araç availability'yi önce kontrol et, alternatif araçla devam et.

---

### L002 — Prisma P1010: Local + Docker PostgreSQL port çakışması
**Durum:** `prisma db push` ve `prisma migrate dev` sürekli P1010 hatası verdi, tüm auth ve SSL çözümleri denendi.
**Sorun:** Homebrew'dan yüklü `postgresql@16` servis olarak çalışıyordu ve port 5432'yi `localhost` (IPv4+IPv6) üzerinde dinliyordu. Docker postgres da aynı portu istiyordu. Node.js `localhost` → `::1` resolve edince local Postgres'e gidiyordu, Docker'a değil.
**Çözüm:** `brew services stop postgresql@16` ile local Postgres'i kapat. Doğrulama: `lsof -i :5432` → sadece `com.docke` görünmeli.
**Kural:** Prisma P1010 çıkarsa **önce** `lsof -i :5432` ile port çakışmasını kontrol et. SSL/auth'u sallamaya kalkışma.

### L003 — Prisma migrate engine binary SSL-bypass workaround
**Durum:** Corporate proxy'de `prisma migrate dev` ve `prisma db push` schema-engine binary doğrulamasında takılıyordu.
**Çözüm:** `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > schema.sql` ile SQL üret, `docker exec -i <container> psql -U user -d db < schema.sql` ile uygula. Seed için `npx tsx prisma/seed.ts` çalıştır.
**Kural:** Migration engine proxy'de takılırsa SQL üretip direkt docker exec ile uygula.

---

## 2026-02-22

### L004 — Proxy/TFS endpoint `.value` sarmalı → `prs.filter is not a function` crash
**Durum:** ReleaseHealthCheckPage'de versiyon seçince sayfa crash oldu.
**Sorun:** `/api/tfs/pull-requests` Azure DevOps pattern'ine göre `{ data: { value: [...], count: N } }` döndürüyor. `r.data.data ?? r.data` ifadesi bu objeyi olduğu gibi alıyor. `.filter()` obje üzerinde çağrılınca `TypeError` fırlatıyor.
**Çözüm:** TFS/proxy endpoint'leri için `.value` çıkarımı zorunlu: `const d = r.data.data ?? r.data; return d.value ?? (Array.isArray(d) ? d : [])`.
**Kural:** QA'da her endpoint için `isinstance(payload, list)` Python check'i çalıştır. Obje geliyorsa `.value` içinde array var mı diye bak.

### L005 — TypeScript tip alanı ≠ API alan adı → sessiz davranış bozukluğu
**Durum:** ReleaseHealthCheckPage'de tamamlanmış P0 todo'lar hâlâ blocker sayılıyordu.
**Sorun:** Frontend tipi `{ status: string }` tanımlamış, API `{ isCompleted: boolean }` dönüyor. `t.status` her zaman `undefined` → `undefined !== 'DONE'` = `true` → tüm todo'lar blocker.
**Çözüm:** Interface/type tanımlarını API'den gelen gerçek alan adlarıyla karşılaştır. Python ile `list(d[0].keys())` çıktısını tip tanımıyla birebir eşleştir.
**Kural:** QA audit sırasında her interface/type için API'de o alan adını grep'le. Alan yoksa → BUG + hemen fix.

### L006 — QA, ticket yazar ama fix uygulamaz → sorun devam eder
**Durum:** QA BUG-007/008 ticket yazıp bitti, bug'lar ertesi oturuma kaldı.
**Sorun:** "Ticket = iş bitti" hatalı varsayım. Ticket ara adımdır; nihai hedef çalışan koddur.
**Çözüm:** QA `qa-engineer.prompt.md` güncellendi: her bug tespit edildiğinde ticket + hemen fix + RESOLVED işareti + TypeScript doğrulaması.
**Kural:** QA audit = Bul + Yaz + Düzelt. Kullanıcı "developer çağır" demeden fix uygulanır.

---

*Yeni bir ders eklemek için şu formatı kullan:*

---

### L004 — EADDRINUSE: Port 3001 zaten kullanimda
**Durum:** Backend `npx tsx src/index.ts` ile baslatilinca `Error: listen EADDRINUSE: address already in use :::3001` verdi.
**Sorun:** Onceki oturumdan kalan bir `tsx watch` prosesi port 3001'i tutuyordu. `lsof` ciktisinda `redwood-broker` aliasli bir node prosesi gorundugu icin atlamiStik.
**Cozum:** `lsof -i :3001` → PID bul → `kill -9 <PID>`. `redwood-broker` = port 3001. Her zaman `lsof -i :3001` ile kontrol et.
**Kural:** "Port mesgul" hatasinda once `lsof -i :<port>` calistir. `redwood-broker` = 3001, `commplex-main` = 5000 gibi alias'lara dikkat et.

---

### L005 — Backend TypeScript route hatalari (36 adet)
**Sorun:** Prisma 5 route dosyalarinda `req.params.id` tipi `string | string[]` fakat Prisma where clause `string` istiyor → TS2322.
**Cozum:** Tum route dosyalarinda global sed: `sed -i '' "s/where: { id: req.params.id }/where: { id: String(req.params.id) }/g" *.ts`
**Ek hatalar:** `endpoint` → `path` (Api model), `versionNumber` → `version` (ProductVersion), `task` → `title` (ReleaseTodo), `jiraKey` yok (Module model'de), `category` zorunlu (Setting model create'de), `affectedEndpoints` yok (SystemChange → `apiPath` kullan).
**Kural:** Route yazarken Prisma schema field isimlerini dogrudan kontrol et. `req.params.id` her zaman `String()` ile cast et.

---

### L006 — Background terminal'de `cd` komutu strip ediliyor

---

### L007 — Constant key setini değiştirirken tüm kullanım noktaları güncellenmeli
**Durum:** `PHASE_META` key'leri `PLANNED/DEVELOPMENT/RC/STAGING/PRODUCTION` → `DEV/TEST/PREP/WAITING/PROD` olarak değiştirildi.
**Sorun:** EditDrawer'da `PHASE_META[v?.phase ?? 'PLANNED'] ?? PHASE_META['PLANNED']` ifadesi güncellenmedi. Runtime'da `undefined` destructure hatası fırlattı.
**Çözüm:** Eski key ismiyle tüm kullanımları grep ile tespit et, `computePhase(v)` veya yeni key ile güncelle.
**Kural:** Bir constant dict'in key setini değiştirirken, değişikliği uygulamadan önce `grep -rn "PHASE_META\[" src/` çalıştır. Her lookup noktasını listele ve hepsini aynı anda güncelle. `TypeScript --noEmit` statik olarak bu hatayı yakalayamaz çünkü key tipi `string`.


**Sorun:** `isBackground: true` ile `cd /path && npm run dev` calistirinca `cd` komutu korunmuyor, iS workspace root'tan calistiriyor.
**Cozum:** `npm run dev --workspace=packages/backend` gibi workspace-aware komut kullan. Ya da `isBackground: false` ile calistir.

```
### L{sayı} — {kısa başlık}
**Durum:** Ne yapmaya çalışıyorduk?
**Sorun:** Ne ters gitti?
**Çözüm:** Nasıl düzelttik?
**Kural:** Bir daha aynı durumda ne yapmalı?
```

---

## Azure DevOps WIT API

### L010 — Azure Work Items API — Double && ve Proje-Scope Hatası
**Durum:** `/api/tfs/work-items?ids=X` endpoint'i "Work item'lar yüklenemedi" hatası veriyordu.
**Sorun:**
1. **Proje-scope URL**: `org/project/_apis/wit/workitems` → Azure 400 Bad Request
2. **Double &&**: Path `wit/workitems?ids=X&` + `&api-version=7.1` → `?ids=X&&api-version=7.1` ("A value is required but was not present")

**Çözüm:** `tfsGetOrg()` helper — org-level URL + trailing `&` temizleme (`path.replace(/&+$/, '')`).

**Kural:**
- `git/*` → proje-scope URL ✓
- `wit/workitems` → org-level URL (proje olmadan)
- URL'de `&&` olmamalı; path'ten trailing `&` strip edilmeli
