# Bug Ticket Formatı — ReleaseHub360

Bu klasör QA Engineer agent'ının bulduğu bug'ları içerir.

## Klasör Yapısı

```
tasks/bugs/
  README.md          ← bu dosya (şablon)
  BUG-001.md         ← açık ticket
  BUG-002.md         ← açık ticket
  resolved/
    BUG-000.md       ← kapatılan ticketlar burada
```

## Ticket Durumları

| Status | Anlamı |
|---|---|
| `OPEN` | Düzeltilmedi, developer bekliyor |
| `RESOLVED` | Developer düzeltti |
| `WONTFIX` | Kasıtlı davranış, bug değil |

## Bug Ticket Şablonu

Yeni bir bug için `tasks/bugs/BUG-XXX.md` oluştur:

---

```
status: OPEN
category: FRONTEND | BACKEND
priority: P0 | P1 | P2
screen: <Ekran adı>
file: <packages/frontend/src/pages/XxxPage.tsx VEYA packages/backend/src/routes/xxx.ts>
```

# BUG-XXX: <Kısa ve net başlık>

## Sorun

<Ne oluyor? Kullanıcı neyle karşılaşıyor?>

## Adımlar (Reproduce)

1. ...
2. ...

## Beklenen Davranış

<Ne olması gerekiyor?>

## Gerçekleşen Davranış

<Şu an ne oluyor?>

## Teknik Kök Neden

<Kod incelemesinden veya API testinden çıkan sebep>

## Önerilen Fix

<Nasıl düzeltilmeli — opsiyonel>

---

## Öncelik Skalası

| Öncelik | Kriter |
|---|---|
| P0 | Ekran açılmıyor / kullanılamıyor / data kayıp riski |
| P1 | Önemli özellik çalışmıyor ama workaround var |
| P2 | Küçük UI hatası / iyileştirme |
