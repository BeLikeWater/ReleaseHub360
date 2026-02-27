# Kullanıcı & Rol Yönetimi

**Route:** `/admin/users`  
**Kategori:** Management (Admin)  
**Öncelik:** P1  
**Yeni Ekran** — JWT auth ile gelen zorunluluk

---

## Amaç

Sisteme erişimi olan kullanıcıları ve rollerini yönet. Yeni kullanıcı ekle, rol ata, hesap durumunu değiştir.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Kullanıcı & Rol Yönetimi                       [+ Kullanıcı Davet Et]       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Kullanıcılar] [Roller]                                                      │
│ ─────────────────────                                                        │
│                                                                              │
│ [Tab: Kullanıcılar] ──────────────────────────────────────────────────────   │
│                                                                              │
│ 🔍 Ara...   [Rol ▾]   [Durum ▾]                          Toplam: 12 kullanıcı│
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ Ad Soyad       │ E-posta             │ Rol            │ Durum │ [⋮] │    │
│ ├────────────────┼─────────────────────┼────────────────┼───────┼──────┤   │
│ │ Vacit B.       │ vacit@company.com   │ Admin          │ ✅    │ [⋮]│    │
│ │ Ali K.         │ ali@company.com     │ Release Manager│ ✅    │ [⋮]│    │
│ │ Mehmet Y.      │ mehmet@company.com  │ Developer      │ ✅    │ [⋮]│    │
│ │ Test Kullanıcı │ test@company.com    │ Viewer         │ 🔴Pasif│[⋮]│    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ [Tab: Roller] ────────────────────────────────────────────────────────────   │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ Rol                │ Kullanıcı Sayısı │ İzinler Özeti         │ [⋮] │    │
│ ├────────────────────┼──────────────────┼───────────────────────┼──────┤   │
│ │ Admin              │ 1                │ Tüm izinler           │ [⋮]│    │
│ │ Release Manager    │ 3                │ Release + Hotfix + Onay│ [⋮]│    │
│ │ Developer          │ 6                │ Görüntüle + PR işlem  │ [⋮]│    │
│ │ Viewer             │ 2                │ Sadece okuma          │ [⋮]│    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

── Kullanıcı Davet Drawer ────────────────────────────────────────────────────
│ Kullanıcı Davet Et                                               [✕]       │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Ad:      [___________________________]                                      │
│ Soyad:   [___________________________]                                      │
│ E-posta: [___________________________]                                      │
│ Rol:     [Developer ▾]                                                      │
│                                                                             │
│ Kullanıcıya davet e-postası gönderilecek.                                  │
│ İlk girişte şifre belirleme linki iletilir.                                │
│                                                                             │
│ [İptal]                               [Daveti Gönder]                      │
──────────────────────────────────────────────────────────────────────────────
```

---

## Roller & İzinler

| Rol | Okuma | Hotfix | Release Onay | Kullanıcı Yönetim | Ayarlar |
|---|---|---|---|---|---|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Release Manager | ✅ | ✅ | ✅ | ❌ | ❌ |
| Developer | ✅ | Talep oluştur | ❌ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/users` | Kullanıcı listesi |
| `POST /api/users/invite` | Davet gönder |
| `PATCH /api/users/:id/role` | Rol güncelle |
| `PATCH /api/users/:id/status` | Aktif/pasif |
| `DELETE /api/users/:id` | Kullanıcı sil |
| `GET /api/roles` | Rol listesi |

---

## Tasarım Notları

- `⋮` menü: Rol Değiştir / Pasif Yap / Sil
- Pasif kullanıcılar: soluk satır, "Aktif Yap" menü seçeneği
- Admin başkasının admin rolünü düzenleyemez (disabled)
- Kendi hesabını silemezsine (disabled + tooltip)
