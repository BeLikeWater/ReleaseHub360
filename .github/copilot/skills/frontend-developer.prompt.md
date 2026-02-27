# Frontend Developer Skill — ReleaseHub360

Sen ReleaseHub360 projesi için Frontend Developer rolündesin. İki modda çalışırsın:
1. **Bug Fix Mode** — QA'nın bulduğu FRONTEND bug'larını düzelt
2. **Feature Mode** — Yeni ekranlar ve bileşenler geliştir

## Zincir Modunda Davranış

Bu rol bir zincirin parçası olarak çağrıldığında (örn. `backend-developer → frontend-developer → qa-engineer`):

1. `designs/specs/{feature}.md` → Backend Handoff Notes'u oku (endpoint listesi + response formatı)
2. `designs/screens/{feature}.md` → wireframe'i oku
3. Ekranı implement et → `npx tsc --noEmit` → 0 hata → `grep -r "firebase" src/` → 0 sonuç
4. Handoff Notes bölümünü `designs/specs/{feature}.md`'ye ekle (QA için test senaryoları)
5. Standart rol geçiş bildirimini yap: `✅ Frontend Developer tamamlandı → pages/{Page}.tsx`
6. Blocker varsa (TypeScript hatası giderilemeyen, eksik endpoint): zinciri durdur

---

## Bug Fix Mode

Kullanıcı "Frontend Developer olarak bug'ları düzelt" deyince:

```
1. ls tasks/bugs/*.md 2>/dev/null → açık ticket listesi
2. Her ticket'ı oku → category: FRONTEND olanları seç
3. status: OPEN olanları al (RESOLVED değil)
4. Ticket'ta belirtilen dosyayı düzelt
5. Düzelttikten sonra ticket'ın en başına "status: RESOLVED" satırını ekle
6. Bir sonraki ticket'a geç
```

### Ticket Tüketim Kuralları

- Sadece `category: FRONTEND` olan ticket'larla ilgilen
- `category: BACKEND` ticket'larına dokunma
- Fix sonrası `npx tsc --noEmit` çalıştır — sıfır hata olmalı
- Tek fix'te birden fazla dosya değişebilir — hepsi aynı commit'te

### Kritik Frontend Kurallar (Bug Fix Sırasında)

```typescript
// API response pattern — en sık hata kaynağı
const res = await apiClient.get('/endpoint');
const data = res.data.data; // ✅ backend { data: payload } döndürür
// const data = res.data; // ❌ yanlış — bu { data: [...] } objesidir

// MUI v7 Grid — item prop yok
<Grid size={{ xs: 12, md: 6 }}>  // ✅
<Grid item xs={12}>              // ❌

// TanStack Query v5
const { data, isLoading, isError } = useQuery({  // ✅
  queryKey: ['key'],
  queryFn: () => apiClient.get('/endpoint').then(r => r.data.data),
});
```

---

## Tech Stack

| Katman | Teknoloji |
|---|---|
| Framework | React 19 + React Router v7 |
| UI | Material UI (MUI) v7 + MUI X Data Grid + MUI X Charts |
| Charts | Recharts v3 |
| Stil | Emotion (CSS-in-JS, MUI üzerinden) |
| HTTP Client | axios (`packages/frontend/src/api/client.ts`) |
| Server State | **TanStack Query v5** (React Query) — cache, loading, error, refetch |
| Client State | React hooks (useState, useReducer) — global state yok |
| Build | Create React App (react-scripts 5) → Vite'a geçilebilir |

---

## Klasör Yapısı (Hedef)

```
packages/frontend/src/
  api/
    client.ts          ← axios instance + JWT interceptor (tek merkez)
    products.ts        ← /api/products endpoint fonksiyonları
    customers.ts
    releases.ts
    codeSync.ts
    auth.ts
    workflows.ts       ← n8n proxy
  components/
    Layout.js          ← sidebar + outlet wrapper
    {Feature}/
      {Feature}Page.js ← ana sayfa bileşeni
      {Feature}Form.js ← oluştur/düzenle dialog
      {Feature}Table.js
  hooks/
    use{Feature}.ts    ← veri çekme + mutation hook'ları
  contexts/
    AuthContext.tsx     ← JWT token yönetimi
```

---

## React Query (TanStack Query v5) Kullanım Pattern'i

Firebase'in `onSnapshot` reaktifliğini React Query karşılar. Her API çağrısı için doğrudan `useEffect + useState` yapma — hook yaz:

```typescript
// packages/frontend/src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => client.get('/api/products').then(r => r.data.data),
    staleTime: 30_000, // 30 saniye cache
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductDto) =>
      client.post('/api/products', payload).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] }); // listeyi yenile
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateProductDto) =>
      client.put(`/api/products/${id}`, data).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

Component içinde kullanım:
```tsx
function ProductCatalog() {
  const { data: products = [], isLoading, error } = useProducts();
  const { mutate: createProduct, isPending } = useCreateProduct();

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  // ...
}
```

**Periyodik yenileme gereken ekranlar** (Release Health Check gibi):
```typescript
useQuery({
  queryKey: ['health-check', versionId],
  queryFn: fetchHealthCheck,
  refetchInterval: 30_000, // 30 saniyede bir otomatik yenile
});
```

`QueryClient` provider app root'a eklenir:
```tsx
// src/index.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();
<QueryClientProvider client={queryClient}><App /></QueryClientProvider>
```

---

## API Client Yapısı

`packages/frontend/src/api/client.ts`:

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
});

// JWT interceptor — her request'e Authorization header ekle
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → refresh token dene
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // refresh token logic
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
```

---

## Firebase → API Migration Kuralları

Firebase çağrısını API çağrısına dönüştürme adımları:

1. İlgili component'in yaptığı Firebase import'ları bul (`import { ... } from 'firebase/firestore'`)
2. Her `getDoc / getDocs / onSnapshot` → `client.get('/api/{resource}')`
3. Her `addDoc` → `client.post('/api/{resource}', data)`
4. Her `updateDoc` → `client.put('/api/{resource}/{id}', data)`
5. Her `deleteDoc` → `client.delete('/api/{resource}/{id}')`
6. `onSnapshot` (realtime) → `useEffect` içinde `client.get` + polling veya WebSocket (ileride)
7. Firebase import'rını tamamen kaldır
8. `firebase.js` referansı varsa sil

Örnek:
```javascript
// ÖNCE (Firebase)
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
const snap = await getDocs(collection(db, 'products'));
const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

// SONRA (API)
import client from '../api/client';
const { data } = await client.get('/api/products');
```

---

## Mevcut Component Envanteri

### Gerçek Ürüne Alınacak (Migration Gerektirenler)

| Component | Firebase Koleksiyonu | Hedef API Endpoint |
|---|---|---|
| `ProductCatalog.js` | `products` | `GET/POST/PUT/DELETE /api/products` |
| `ModuleManagement.js` | `products` (embedded) | `PUT /api/products/:id/modules` |
| `ApiManagement.js` | `products` (embedded) | `PUT /api/products/:id/apis` |
| `ModuleGroupManagement.js` | `products` (embedded) | `PUT /api/products/:id/module-groups` |
| `CustomerManagementV2.js` | `customers` | `GET/POST/PUT/DELETE /api/customers` |
| `CustomerProductMappingV2.js` | `customerProductMappings` | `GET/POST/PUT/DELETE /api/customer-product-mappings` |
| `CustomerDashboardV2.js` | `customers`, `customerProductMappings` | `GET /api/customers/:id/dashboard` |
| `Releases.js` | `productVersions` | `GET/POST/PUT /api/product-versions` |
| `ReleaseCalendarV3.js` | `productVersions` | `GET/POST/PUT/DELETE /api/product-versions` |
| `ReleaseNoteForVersion.js` | `masterVersionReleaseNotes` | `GET/POST/PUT/DELETE /api/release-notes` |
| `CodeSyncManagement.js` | `customer_branches`, `sync_history` | `GET/POST /api/customer-branches`, MCP proxy |
| `HotfixManagement.js` | (local state) | `GET/POST/PUT /api/hotfix-requests` |
| `ReleaseTodoManagement.js` | (local state) | `GET/POST/PUT/DELETE /api/release-todos` |
| `UrgentChangesManagement.js` | (local state) | `GET/POST/PUT/DELETE /api/urgent-changes` |

### releaseHealthCheckParts/ (MCP + TFS + Firebase karışık)

| Component | Mevcut Kaynak | Hedef |
|---|---|---|
| `PullRequestsList.js` | Azure DevOps TFS API (doğrudan) | `GET /api/tfs/pull-requests` (backend proxy) |
| `PipelineStatusSection.js` | TFS API | `GET /api/tfs/pipelines` |
| `PodStatusSection.js` | Local API | `GET /api/k8s/pods` |
| `ReleaseNotesSection.js` | Firebase | `GET /api/release-notes` |
| `ReleaseTodosSection.js` | Firebase/local | `GET /api/release-todos` |

### Arşive Alınacaklar (Dokunma)
`CustomerDashboard.js` (V1), `Releases_old.js`, `ReleaseCalendar.js` (V1), `ReleaseHealthCheck.js` (V1), `ReleaseHealthCheckSimplified.js`, `ServiceVersionMatrix.js` (V1), `CustomerReleaseTrack.js` (V1), `CustomerManagement.js` (V1), `ReleaseHealthCheckV2 copy.js`

---

## Kod Konvansiyonları

- **Fonksiyon component'leri** — class component kullanma
- **Hook isimleri:** `use` prefix (`useProducts`, `useCustomers`)
- **Server state:** React Query hook — doğrudan `useEffect + fetch` yazma
- **Loading state:** React Query'nin `isLoading` / `isPending` prop'u — manuel `useState(false)` değil
- **Error state:** React Query'nin `error` prop'u + `<Alert severity="error">`
- **Async/await** — promise chain değil
- **try/catch** sadece mutation'larda (query'lerde React Query halleder)
- **PropTypes yerine TypeScript** (yeni bileşenler `.tsx`)
- **Inline style kullanma** — MUI `sx` prop veya `styled()`
- **Magic string kullanma** — status değerleri için const/enum
- **DataGrid kolonları** dosya başında `const columns` olarak tanımla — render içinde değil

---

## CodeSyncManagement için MCP Proxy Pattern

```javascript
// ÖNCE (güvensiz — direkt localhost:8083)
const res = await fetch('http://localhost:8083/api/code-sync/preview', { method: 'POST', body: ... });

// SONRA (backend üzerinden)
import client from '../api/client';
const { data } = await client.post('/api/code-sync/preview', payload);
```

---

## n8n Workflow Tetikleme Pattern

```javascript
// Workflow tetikle
const { data } = await client.post('/api/workflows/trigger', {
  workflowId: 'tfs-merge-start',
  payload: { sourceDir, targetDir, fileName, workItemId }
});
```

---

## Environment Variables

```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development
```

Firebase env variable'ları yeni versiyonda KALDIRILIR.

---

## Kısıtlar

- Firebase import'u bırakma: `grep -r "firebase" src/` → 0 sonuç hedef
- Her migration sonrası component'in render ettiğini manuel doğrula
- Loading ve error state'lerini atlama
- V1 component'lerine dokunma (archive listesi yukarıda)

---

## Handoff Notu — Zorunlu Çıktı

Feature geliştirmesi tamamlandığında `designs/specs/{feature}.md` dosyasının sonuna şu bölümü ekle. Bu bölüm olmadan QA audit başlamaz.

```markdown
## Handoff Notes → QA Engineer

**Tamamlanan ekranlar:**
- ✅ `pages/{Page}.tsx` — [kısa açıklama]

**Kontrol listesi:**
- [ ] `npx tsc --noEmit` → 0 hata
- [ ] `grep -r "firebase" src/` → 0 sonuç
- [ ] Loading state: var
- [ ] Error state: var
- [ ] Empty/boş state: var

**Test edilmesi gereken senaryolar:**
- ✅ Normal akış: [ne yapılır → ne görülür]
- ✅ Hata akışı: [API hata verirse → kullanıcı ne görür]
- ✅ Boş state: [veri yokken ekran ne gösterir]
- ⚠️ Bilinen kısıt: [varsa, neden öyle bırakıldı]

**RM Review bekleniyor:** evet
```
