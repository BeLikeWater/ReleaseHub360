# Release Todo Yönetimi

**Route:** `/release-todos`  
**Kategori:** Management (Admin)  
**Öncelik:** P2  
**Kaynak:** ReleaseTodosPage.tsx

> ⚠️ **Mimari Karar:** Bu ekran sadece **tanımlama** ekranıdır. Todo'ların "tamamlandı" olarak işaretlenmesi (isCompleted toggle) **Customer Dashboard** ekranında yapılır — çünkü tamamı müşteri tarafından gerçekleştirilmesi gereken adımlardır. Bu ekranda ve Release Health Check ekranında checkbox / tamamlama izleme yoktur.

---

## Amaç

Her ürün versiyonu için release checklist todo'larını tanımla ve yönet (CRUD). Hangi adımların tamamlanması gerektiğini belirle — tamamlama ise Customer Dashboard'da müşteri tarafından işaretlenir.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Release Todo Yönetimi                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│  [ Ürün Seç ▾ ]    [ Versiyon Seç ▾ ]                     [+ Todo Ekle]     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─ 🔧 Teknik ──────────────────────────────────────────────────────────────┐ │
│ │  PR'lar code review tamamlandı   🔴P0  PRE         [✎] [🗑]            │ │
│ │  Unit testler %80+ geçiyor       🟠P1  PRE         [✎] [🗑]            │ │
│ │  Integration testler OK          🔵P2  DURING      [✎] [🗑]            │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─ ⚙️ Operasyonel ─────────────────────────────────────────────────────────┐ │
│ │  Database migration hazır        🟠P1  PRE         [✎] [🗑]            │ │
│ │  Rollback planı belgelendi       🔵P2  PRE         [✎] [🗑]            │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─ 📢 İletişim ────────────────────────────────────────────────────────────┐ │
│ │  Release notes hazırlandı        🔵P2  POST        [✎] [🗑]            │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

> Checkbox yok — tamamlama işareti Customer Dashboard'dadır.

---

## İşlevler

- **Ürün + Versiyon Seçimi:** Dropdown seçimleriyle belirli bir versiyonun todo'larını görüntüle
- **Todo CRUD:** Todo ekle, düzenle, sil
- **Kategori:** `TECHNICAL` / `OPERATIONAL` / `COMMUNICATION` / `APPROVAL`
- **Öncelik:** P0 (blocker) / P1 (yüksek) / P2 (orta) / P3 (düşük)
- **Zamanlama:** PRE / DURING / POST (deployment'a göre ne zaman yapılacak)
- **Gruplama:** Todo'lar kategoriye göre gruplanır

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/products` | Ürün listesi |
| `GET /api/product-versions?productId=x` | Versiyonlar |
| `GET /api/release-todos?versionId=x` | Todo listesi |
| `POST /api/release-todos` | Todo ekle |
| `PATCH /api/release-todos/:id` | Todo güncelle |
| `DELETE /api/release-todos/:id` | Todo sil |

> `PATCH /api/release-todos/:id` → `{ isCompleted }` payload'u Customer Dashboard tarafından kullanılır.

---

## Tasarım Notları

- Ürün seçilmeden versiyon dropdown disabled
- Versiyon seçilmeden todo listesi ve "Todo Ekle" butonu görünmez
- Todo'lar `sortOrder` alanına göre sıralanır
- P0 todo'lar kırmızı chip `🔴 P0`
- **Bu ekranda tamamlama checkbox'ı yoktur** — Customer Dashboard'a aittir
