# Task Formatı — tasks/open/

Bu klasör **Release Manager** tarafından açılan görev ticketlarını içerir.  
Her ticket `TASK-XXX.md` formatında oluşturulur.

## Ticket Durumları

| Status | Anlam |
|---|---|
| `OPEN` | Henüz alınmadı |
| `IN_PROGRESS` | Developer üzerinde çalışıyor |
| `DONE` | Tamamlandı |

## Ticket Şablonu

```markdown
---
id: TASK-XXX
status: OPEN
type: FEATURE | FIX | REFACTOR
scope: FRONTEND | BACKEND | FULLSTACK | UX | N8N
ux-required: true | false
n8n-required: true | false
priority: P0 | P1 | P2
created-by: release-manager
date: YYYY-MM-DD
---

# TASK-XXX: Kısa ve net başlık

## Açıklama

Ne yapılacak, neden, kimin için.

## Kabul Kriterleri

- [ ] AC-1
- [ ] AC-2

## Teknik Notlar

İlgili dosyalar, bağlı endpoint'ler, DB tabloları.

## Handoff Notları

(Tamamlayan developer doldurur)
```

## Tüketim Kuralları

- **Frontend Developer:** `scope: FRONTEND | FULLSTACK` — `ux-required: false` olan task'ları al
- **Backend Developer:** `scope: BACKEND | FULLSTACK` — `ux-required: false` olan task'ları al
- **UX Designer:** `ux-required: true` olan task'ları al → `designs/screens/` altına yaz
- **n8n Engineer:** `n8n-required: true` olan task'ları al → `n8n-workflows/` altına yaz
- Task bittikten sonra `status: DONE` ve Handoff Notları ekle
