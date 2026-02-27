# Product Catalog V2 - Firebase Yapılandırması

## Firebase Firestore Koleksiyon Yapısı

### Collection: `products`

```javascript
{
  id: "auto-generated-firestore-id",
  productId: 1,
  name: "BOA",
  description: "Business Oriented Application",
  childModuleGroups: [
    {
      moduleGroupId: 1,
      name: "API Yönetimi",
      description: "API yönetim süreçlerine altyapı sağlayan modül grubudur.",
      childModules: [
        {
          moduleId: 1,
          name: "Api First",
          description: "Mevcut servislerin standartlara uygun şekilde API'leşmesini sağlayan...",
          childApis: [
            {
              apiId: 1,
              moduleId: 1,
              name: "API Adı",
              description: "API Açıklaması",
              childApiEndpoints: []
            }
          ]
        }
      ]
    }
  ],
  childModules: [
    {
      moduleId: 146,
      name: "DataSet",
      description: "DataSet",
      childApis: [...]
    }
  ]
}
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products collection
    match /products/{productId} {
      // Herkes okuyabilir
      allow read: if true;
      
      // Sadece authenticated kullanıcılar yazabilir
      allow write: if request.auth != null;
    }
  }
}
```

## Firestore Indexes

Aşağıdaki index'leri Firebase Console'dan manuel olarak oluşturmanız gerekebilir:

```javascript
// products koleksiyonu için
Collection: products
Fields:
  - name (Ascending)
  - productId (Ascending)

Query scope: Collection
```

## Veri Yükleme

1. **JSON Dosyasından Toplu Yükleme:**
   - Ürün Kataloğu ekranına gidin
   - "JSON Yükle" butonuna tıklayın
   - `product-catalog.json` dosyasını seçin
   - Sistem otomatik olarak verileri Firestore'a yükleyecektir

2. **Manuel Ekleme:**
   - Her ekranda "Yeni Ekle" butonları ile manuel veri girişi yapabilirsiniz
   - Hiyerarşik yapıya uygun olarak:
     - Önce Ürün
     - Sonra Modül Grubu
     - Sonra Modül
     - Sonra API
     - Son olarak API Endpoint

## Kullanılan Ekranlar

### 1. Ürün Kataloğu (`/product-catalog`)
- Tüm ürünleri görüntüleme
- Ürün ekleme/düzenleme/silme
- JSON dosyasından toplu yükleme
- Accordion yapısında detaylı görünüm

### 2. Modül Grubu Yönetimi (`/module-group-management`)
- Ürün bazlı modül gruplarını yönetme
- Modül grubu ekleme/düzenleme/silme
- Ürün seçimi ile filtreleme

### 3. Modül Yönetimi (`/module-management`)
- Modül grubu veya doğrudan ürün altında modül yönetimi
- Modül ekleme/düzenleme/silme
- Çift seviyeli filtreleme (Ürün + Modül Grubu)

### 4. API Yönetimi (`/api-management`)
- Modül bazlı API yönetimi
- API ekleme/düzenleme/silme
- Üç seviyeli filtreleme (Ürün + Modül Grubu + Modül)

## Özellikler

✅ **Firebase Realtime Integration:** Tüm veriler Firebase Firestore'dan geliyor
✅ **CRUD Operations:** Her seviyede Create, Read, Update, Delete işlemleri
✅ **Hierarchical Structure:** Ürün → Modül Grubu → Modül → API → Endpoint
✅ **Bulk Upload:** JSON dosyasından toplu veri yükleme
✅ **Responsive Design:** Material-UI ile modern ve responsive tasarım
✅ **Filter System:** Dropdown'larla kolay filtreleme
✅ **Visual Feedback:** Chip'ler ile alt eleman sayıları

## Firebase Setup

### 1. Firebase Console Ayarları

```bash
# Firebase CLI kurulumu
npm install -g firebase-tools

# Firebase login
firebase login

# Firebase init
firebase init firestore
```

### 2. Firestore Rules Deployment

```bash
firebase deploy --only firestore:rules
```

### 3. Indexes Deployment

```bash
firebase deploy --only firestore:indexes
```

## Environment Variables

`.env` dosyasına Firebase config bilgilerinizi ekleyin:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

## Notlar

- JSON dosyası yüklenirken mevcut tüm `products` koleksiyonu temizlenip yeniden oluşturulur
- Tüm CRUD işlemleri gerçek zamanlı olarak Firebase'e yansır
- Hiyerarşik yapı korunarak veriler nested object'ler olarak saklanır
- Silme işlemleri kalıcıdır ve geri alınamaz

## Geliştirme

Yeni bir seviye (örn: API Endpoint) eklemek için:

1. Yeni bir component oluşturun (`ApiEndpointManagement.js`)
2. Firestore güncelleme mantığını ekleyin
3. App.js'e route ekleyin
4. Layout.js'e menü öğesi ekleyin

## Troubleshooting

**Problem:** Firebase'e bağlanılamıyor
**Çözüm:** `firebase.js` dosyasındaki config bilgilerini kontrol edin

**Problem:** JSON yükleme başarısız
**Çözüm:** JSON formatını kontrol edin, `value` array'i olduğundan emin olun

**Problem:** Veri güncellenmiyor
**Çözüm:** Browser console'da Firebase hataları kontrol edin, Firestore rules'ları gözden geçirin
