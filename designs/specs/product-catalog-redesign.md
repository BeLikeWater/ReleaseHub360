# UX Brief: Ürün Kataloğu Yeniden Tasarımı

**Hazırlayan:** Release Manager  
**Hedef Kitle:** UX Designer + Frontend Developer  
**Öncelik:** P1  
**Tarih:** 23 Şubat 2026

---

## Sorun Tespiti (RM Gözüyle)

Mevcut sağ panelde şunlar üst üste yığılmış:
1. Versiyonlar (chip listesi)
2. Modül Yapısı → Accordion (ModuleGroup → Module)
3. Servisler → Kart grid
4. API'ler → Tablo

Bu 4 bölüm birbirinden bağımsız görünüyor, oysa aslında **bir hiyerarşi** var:

```
Ürün
└── Modül Grubu
    └── Modül
        └── Servis / API  ← bunlar aynı şey
```

Kullanıcı şu an Servisler'i ve API'leri ayrı bölümlerde görüyor ama bunlar **ürüne değil, modüllere ait**. 
Ekran bunu yansıtmıyor. Kullanıcı "bu servis hangi modüle ait?" sorusunu ekranda cevaplayamıyor.

### Ek Sorunlar

| Sorun | Etki |
|---|---|
| **Versiyonlar** bu ekranda — release bilgisi catalog'da ne işi yapıyor? | Gürültü, odak dağıtıyor |
| **Servis ≠ API ayrımı** — aslında aynı konsept (mikroservis) | İki ayrı bölüm = gereksiz karmaşa |
| **Servisler ve API'ler productId ile bağlı** — moduleId yok | Hiyerarşi kurulamıyor, kim hangi modüle ait bilinmiyor |
| Sağ panel scroll edilmesi gereken çok uzun bir sayfa | Kullanıcı neyi nerede arayacağını bilemiyor |

---

## Bu Ekranın Amacı (Ne Değil, Ne)

**Bu ekran:** Ürünlerin teknik yapısını yönet — modül grupları, modüller, her modülün servisleri (repo adı, pipeline, image, versiyon)

**Bu ekran DEĞİL:** Release takibi, versiyon karşılaştırma, müşteri eşleştirme

→ **Versiyonlar buradan çıkarılmalı.** Release sayfalarına ait.

---

## Hedef Kullanıcı

Release yöneticisi veya teknik lider — ürünün **nasıl yapılandırıldığını** görmek ve düzenlemek istiyor.
- Sabah standupında değil, sprint planning veya onboarding sırasında açıyor
- Sorusu: "Bu ürünün hangi modülleri var, her modülde hangi servisler çalışıyor, onların repo/pipeline bilgileri neler?"
- Sık değişmeyen ama doğru olması kritik bir ekran

---

## Önerilen Yeni Yapı

### Sol Panel — Ürün Listesi (değişmez)
Mevcut hali yeterli. Arama + ürüne tıklama → sağ panele yansır.

---

### Sağ Panel — TAMAMİYLE YENİDEN

Sağ panel **iki sekme** olmalı:

#### Sekme 1: Yapı (Ana sekme)
Hiyerarşik yapı tek yerde, tutarlı bir şekilde gösterilir:

```
Modül Grubu A                                    [+ Modül Grubu]  [⋮ Düzenle/Sil]
├── Modül 1                        [+ Servis Ekle]  [⋮ Düzenle/Sil]
│   ├── cofins-bff-api             repo: OBA.Cofins.Bff  v1.0.20251009  [⋮]
│   └── cofins-file-service        repo: OBA.Cofins.File               [⋮]
├── Modül 2                        [+ Servis Ekle]  [⋮ Düzenle/Sil]
│   └── cofins-worker              repo: OBA.Cofins.Worker  v1.0.0     [⋮]
Modül Grubu B                                    [+ Modül Grubu]  [⋮]
└── (henüz modül eklenmemiş)
```

**Nasıl çalışır:**
- Accordion → ModuleGroup (expand/collapse)
- Her group içinde: Module listesi (liste satırları)
- Her module satırı inline expand edilebilir → altında o modüle ait servisler çıkar
- Servisler: satır formatında (tablo değil, compact liste) — servis adı, repoName, currentVersion, pipeline adı
- Her seviyede [+ Ekle] butonu o seviyeye uygun şeyi ekler

#### Sekme 2: Ürün Ayarları
Sadece ürüne ait basit form:
- Ürün Adı
- Açıklama
- Repo URL
- Aktif / Pasif

---

## Servis (= API) Satır Tasarımı

Servis satırı kompakt olmalı. Kart formatına gerek yok.

```
[●] cofins-bff-api      OBA.Cofins.Bff   [pipe: OBA.Cofins.Bff]   v1.0.20251009   [⋮]
```

Açıklandığında (satır expand ya da side panel):
- Repo Adı
- Pipeline Adı
- Image Adı
- Mevcut Versiyon + Tarih
- Release Adı
- Port
- Açıklama

**Düzenle** → inline düzenleme veya dialog (UX'in tercihi)

---

## Kaldırılacaklar

| Kaldırılan | Gerekçe |
|---|---|
| Versiyonlar bölümü (sağ panelden) | Release yönetimi sayfasına ait |
| Ayrı "Servisler" bölümü (flat liste) | Modül içine taşınıyor |
| Ayrı "API'ler" bölümü | Servislerle birleşiyor |

---

## Backend'e Yansıyan Değişiklik (Önemli)

Mevcut şemada `Service.productId` var, `Service.moduleId` yok.
Servisleri modüllerin içinde gösterebilmek için `moduleId` eklenmesi gerekiyor. 

Backend Developer'a not:
```
Service modeline moduleId (opsiyonel, FK → Module.id) eklenecek
Mevcut servisler moduleId=null kalabilir (geriye dönük uyumlu)
GET /api/services?moduleId=X → bir modüle ait servisler
```

---

## Boş State'ler

| Durum | Mesaj |
|---|---|
| Modül grubu yok | "Henüz modül grubu eklenmemiş. Yapıyı oluşturmak için [+ Modül Grubu] tıklayın." |
| Modül yok (grup var) | "Bu gruba henüz modül eklenmemiş. [+ Modül Ekle]" |
| Servis yok (modül var) | "Bu modüle henüz servis eklenmemiş. [+ Servis Ekle]" |

---

## Kabul Kriterleri (Frontend tamamlanmış sayıldığında)

- [ ] Sağ panel: Yapı + Ürün Ayarları sekmeleri var
- [ ] Yapı sekmesi: ModuleGroup accordion → Module liste → Servis satırları hiyerarşisi çalışıyor
- [ ] Her seviyede o seviyeye uygun [+ Ekle] butonu var ve çalışıyor
- [ ] Servis satırında: adı, repoName, currentVersion, pipelineName görünüyor
- [ ] Servis düzenleme dialogu tüm alanları içeriyor (repoName, pipelineName, imageAdı, currentVersion, releaseName, port)
- [ ] Versiyonlar bölümü sağ panelden kaldırıldı
- [ ] Ayrı Servisler ve API'ler bölümleri kaldırıldı
- [ ] Service tablosunda moduleId alanı var (nullable)
- [ ] Boş state'ler çalışıyor

---

## UX Designer'a Notlar

Bu ekranı açan kişi sakin bir ortamda, çok bakıştaki bilgiyi hızlı taramak istiyor — "Modül X'in servisleri neler?" sorusunu 2 tıklamada cevaplayabilmeli.

- **Hiyerarşi görsel derinlikle** (indent, çizgi veya arka plan ton farkı) gösterilmeli
- Her accordion seviyesinin **farklı görsel ağırlığı** olsun: Group koyu başlık, Module orta, Servis satır
- Servis satırları çok teknik bilgi içerdiğinden `monospace` font veya `caption` typography kullanılabilir
- Mobil düşünme — bu ekran sadece desktop
- Düzenleme: kart yerine **inline form** veya compact dialog — sayfa yerinde kalmalı

