# Tasks — Pipeline Dokümantasyonu

Bu dizin ReleaseHub360'taki tüm iş akışlarını yönetir.

## Dizin Yapısı

```
tasks/
  open/         ← Release Manager'ın açtığı görevler (TASK-XXX.md)
  bugs/         ← QA Engineer'ın bulduğu bug'lar (BUG-XXX.md)
  bugs/resolved/ ← Kapatılan bug'lar
  lessons.md    ← Öğrenilen dersler
  README.md     ← Bu dosya
```

## Pipeline

```
Release Manager
  → tasks/open/TASK-XXX.md oluşturur (scope + ux-required + n8n-required etiketli)
        │
        ├── ux-required: true  → UX Designer
        │     → designs/screens/{ekran}.md günceller
        │
        ├── n8n-required: true → n8n Engineer
        │     → n8n-workflows/{workflow}.json yazar + publish eder
        │
        ├── scope: FRONTEND    → Frontend Developer
        │     → packages/frontend/src/pages/ günceller
        │
        └── scope: BACKEND     → Backend Developer
              → packages/backend/src/routes/ günceller
                    │
                    ▼
              QA Engineer
                → Ekranı / endpoint'i test eder
                → tasks/bugs/BUG-XXX.md yazar
                    │
                    ▼
              Frontend Developer  →  category: FRONTEND bug'ları alır → düzeltir
              Backend Developer   →  category: BACKEND bug'ları alır → düzeltir
                    │
                    ▼
              QA Engineer → RESOLVED bug'ları tasks/bugs/resolved/ klasörüne taşır
```

## Rol → Dizin Eşleşmesi

| Rol | Okur | Yazar |
|---|---|---|
| Release Manager | `ROADMAP.md`, mevcut kod | `tasks/open/TASK-XXX.md` |
| UX Designer | `tasks/open/TASK-XXX.md` | `designs/screens/{ekran}.md` |
| n8n Engineer | `tasks/open/TASK-XXX.md` | `n8n-workflows/{workflow}.json` |
| Backend Developer | `tasks/open/TASK-XXX.md` | `packages/backend/src/routes/` |
| Frontend Developer | `tasks/open/TASK-XXX.md` | `packages/frontend/src/pages/` |
| QA Engineer | Ekranlar + endpoint'ler | `tasks/bugs/BUG-XXX.md` |
| Frontend/Backend Dev | `tasks/bugs/BUG-XXX.md` | Fix + `status: RESOLVED` |
