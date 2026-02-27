# Release Todo Yönetimi

**Route:** `/release-todos`  
**Kategori:** Management (Admin)  
**Öncelik:** P2  
**Kaynak:** ReleaseTodoManagement.js

---

## Amaç

Release checklist şablonlarını yönet. Her versiyon için hangi adımların tamamlanması gerektiğini belirle. Şablonlar, Release Health Check ekranındaki todo listesine otomatik olarak yüklenir.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Release Todo Yönetimi                                [+ Yeni Şablon] [+ Todo]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─ Şablonlar ──────────────────┐  ┌─ Şablon Detayı ──────────────────────┐  │
│ │                              │  │ Şablon: Standart Release Şablonu     │  │
│ │ ● Standart Release  (12 todo)│  │ Açıklama: Tüm major/minor versiyonlar│  │
│ │ ○ Hotfix Release    (5 todo) │  │                                       │  │
│ │ ○ Beta Release      (8 todo) │  │ [+ Todo Ekle]                        │  │
│ │ ○ Emergency         (3 todo) │  │                                       │  │
│ │                              │  │ ┌─ Teknik ─────────────────────────┐ │  │
│ │                              │  │ │ ☐ PR'lar code review tamamlandı  │ │  │
│ │                              │  │ │ ☐ Unit testler %80+ geçiyor      │ │  │
│ │                              │  │ │ ☐ Integration testler OK         │ │  │
│ │                              │  │ │ ☐ Performance testi yapıldı      │ │  │
│ │                              │  │ └───────────────────────────────────┘ │  │
│ │                              │  │                                       │  │
│ │                              │  │ ┌─ Operasyonel ─────────────────────┐ │  │
│ │                              │  │ │ ☐ Database migration hazır       │ │  │
│ │                              │  │ │ ☐ Rollback planı belgelendi      │ │  │
│ │                              │  │ └───────────────────────────────────┘ │  │
│ │                              │  │                                       │  │
│ │                              │  │ ┌─ İletişim ────────────────────────┐ │  │
│ │                              │  │ │ ☐ Release notes hazırlandı       │ │  │
│ │                              │  │ │ ☐ Müşterilere bildirim gönderildi│ │  │
│ │                              │  │ └───────────────────────────────────┘ │  │
│ └──────────────────────────────┘  └───────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## İşlevler

- **Şablon CRUD:** Yeni şablon oluştur, kopyala, düzenle, sil
- **Todo CRUD:** Şablon içine todo ekle, düzenle, sil, sırala
- **Kategori:** Her todo bir kategoriye ait (Teknik, Operasyonel, İletişim, Onay)
- **Öncelik:** P0 (blocker) / P1 / P2 — P0 tamamlanmadan deployment aktif değil
- **Şablonu Versiyona Uygula:** Release sırasında şablon seçilir → todolar o versiyona kopyalanır

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/todo-templates` | Şablon listesi |
| `POST /api/todo-templates` | Yeni şablon |
| `GET /api/todo-templates/:id/items` | Şablon todoları |
| `POST /api/todo-templates/:id/items` | Todo ekle |
| `PUT /api/todo-templates/:id/items/:itemId` | Güncelle |
| `DELETE /api/todo-templates/:id/items/:itemId` | Sil |
| `POST /api/product-versions/:id/apply-template` | Versiyona uygula |

---

## Tasarım Notları

- Sol panel: `width: 260px` — liste
- Sağ panel: `flex: 1` — detay
- Todo sıralaması: drag & drop (`react-beautiful-dnd`)
- P0 todo'lar: kırmızı etiket `🔴 Blocker`
