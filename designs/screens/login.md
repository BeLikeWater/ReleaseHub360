# Login — Auth Ekranı

**Route:** `/login`  
**Kategori:** Auth  
**Öncelik:** P0

---

## Amaç

Kullanıcının JWT tabanlı sisteme giriş yapması. E-posta + şifre. Token alınınca rol bazlı yönlendirme.

---

## ASCII Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [ReleaseHub360 Logo]                     │
│                                                             │
│              ┌─────────────────────────────┐               │
│              │                             │               │
│              │   ReleaseHub360             │               │
│              │   Release Yönetim Platformu │               │
│              │                             │               │
│              │  E-posta                    │               │
│              │  [_________________________]│               │
│              │                             │               │
│              │  Şifre                      │               │
│              │  [_________________________]│               │
│              │                             │               │
│              │  [ ] Beni Hatırla           │               │
│              │                             │               │
│              │  [    Giriş Yap    ]        │               │
│              │                             │               │
│              │  Şifremi unuttum →          │               │
│              └─────────────────────────────┘               │
│                                                             │
│              v1.0.0 · © 2026 ReleaseHub360                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Bileşenler

| Bileşen | MUI | Detay |
|---|---|---|
| Merkez kart | `Card` | Max genişlik 420px, dikey ortalanmış, hafif gölge |
| E-posta alanı | `TextField type="email"` | Otofokus |
| Şifre alanı | `TextField type="password"` | Göster/gizle toggle ikonu |
| Beni Hatırla | `Checkbox` + `FormControlLabel` | Refresh token süresini 7 güne çıkarır |
| Giriş butonu | `Button variant="contained" fullWidth` | Loading spinner giriş sırasında |
| Şifremi unuttum | `Link` | Gelecek sprint — şimdilik sistem admin'e yönlendir notu |
| Arka plan | Koyu tema gradient | Hafif pattern veya solid |

---

## Akış

```
Giriş Yap → POST /api/auth/login
         → 200: accessToken + refreshToken kaydet → rol kontrol
               → ADMIN/RELEASE_MANAGER  → /
               → DEVELOPER              → /release-health-check
               → VIEWER                 → /releases
         → 401: "E-posta veya şifre hatalı"
         → 500: "Sunucu hatası, tekrar deneyin"
```

---

## Hata Durumları

| Hata | Gösterilen mesaj |
|---|---|
| Boş form | Alan zorunlu validasyon (submit öncesi) |
| Hatalı şifre (401) | Kart altında kırmızı `Alert`: "E-posta veya şifre hatalı" |
| Hesap kilitli | "Çok fazla başarısız deneme. 15 dakika bekleyin." |
| Sunucu hatası (500) | "Bağlantı hatası. Tekrar deneyin." + retry butonu |

---

## Token Yönetimi

- `accessToken` → `memory` (React state / Zustand) — localStorage'a yazılmaz
- `refreshToken` → `httpOnly cookie` (backend set eder)
- Her API isteğinde axios interceptor: `Authorization: Bearer <accessToken>`
- 15 dakika sonra token expire → interceptor refresh endpoint'ini çağırır → seamless

---

## Tasarım Notları

- Tam sayfa yüksekliği: `minHeight: '100vh'`, dikey ortalama: `flexDirection: 'column', justifyContent: 'center'`
- Tema: MUI dark mode — `mode: 'dark'`
- Logo: Metin tabanlı — `Typography variant="h5" fontWeight="bold"`
- Kart: `elevation={8}`, `borderRadius: 2`, `p: 4`
- Giriş butonu loading: `<CircularProgress size={20} />` buton içinde
