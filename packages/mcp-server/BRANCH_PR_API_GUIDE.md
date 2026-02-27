# 📋 Branch PR List API - Kullanım Kılavuzu

## 🎯 Genel Bakış

Bu endpoint, belirli bir branch'e (örn: master) yapılan tüm Pull Request'leri listeler. Tarih filtresi ile sadece belli bir tarihten sonraki PR'ları getirebilirsiniz.

## 🚀 API Endpoint

```
POST http://localhost:8083/api/branch/pull-requests
```

## 📥 Request Format

**ÖNEMLİ**: Önce repository adını öğrenin!

```bash
# 1. Adım: Repository listesini al
curl -X GET "http://localhost:8083/api/repositories" | jq '.repositories[] | {name, id}'
```

**Ardından doğru repository adını kullan:**

```json
{
  "repository_name": "Cofins.CustomerPortal",  // Listeden gelen 'name' değeri
  "target_branch": "master",
  "start_date": "2024-11-01T00:00:00Z"  // Opsiyonel
}
```

### Parametreler

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `repository_name` | string | Evet | Repository adı (örn: "Cofins.CustomerPortal") |
| `target_branch` | string | Hayır | Target branch adı (varsayılan: "master") |
| `start_date` | string | Hayır | ISO 8601 format tarih (örn: "2024-11-01T00:00:00Z") |

## 📤 Response Format

```json
{
  "repository": "Cofins.CustomerPortal",
  "target_branch": "master",
  "start_date": "2024-11-01T00:00:00Z",
  "total_pull_requests": 25,
  "pull_requests": [
    {
      "pr_id": 12345,
      "title": "Feature: Add new customer API",
      "repository": "Cofins.CustomerPortal",
      "author": "John Doe",
      "created_date": "2024-12-01T10:30:00Z",
      "status": "completed",
      "work_items": [251236, 251240]
    },
    {
      "pr_id": 12344,
      "title": "Bugfix: Fix validation error",
      "repository": "Cofins.CustomerPortal",
      "author": "Jane Smith",
      "created_date": "2024-11-28T14:20:00Z",
      "status": "completed",
      "work_items": [250100]
    }
  ]
}
```

### Response Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `pr_id` | integer | Pull Request ID |
| `title` | string | PR başlığı |
| `repository` | string | Repository adı |
| `author` | string | PR'ı oluşturan kişi |
| `created_date` | string | Oluşturulma tarihi (ISO 8601) |
| `status` | string | PR durumu: "active", "completed", "abandoned" |
| `work_items` | array | İlişkili work item ID'leri |

## 💡 Kullanım Örnekleri

### Örnek 1: Tüm PR'ları Getir

```bash
curl -X POST "http://localhost:8083/api/branch/pull-requests" \
  -H "Content-Type: application/json" \
  -d '{
    "repository_name": "Cofins.CustomerPortal",
    "target_branch": "master"
  }'
```

### Örnek 2: Son Ay'ın PR'larını Getir

```bash
curl -X POST "http://localhost:8083/api/branch/pull-requests" \
  -H "Content-Type: application/json" \
  -d '{
    "repository_name": "Cofins.CustomerPortal",
    "target_branch": "master",
    "start_date": "2024-11-01T00:00:00Z"
  }'
```

### Örnek 3: Farklı Branch

```bash
curl -X POST "http://localhost:8083/api/branch/pull-requests" \
  -H "Content-Type: application/json" \
  -d '{
    "repository_name": "Cofins.CustomerPortal",
    "target_branch": "develop",
    "start_date": "2024-12-01T00:00:00Z"
  }'
```

## 🔍 Filtreleme ve Sıralama

- **Tarih Filtresi**: `start_date` parametresi ile sadece bu tarihten sonraki PR'lar gelir
- **Sıralama**: PR'lar otomatik olarak tarihe göre **yeniden eskiye** sıralanır
- **Durum**: Tüm durumlar dahildir (active, completed, abandoned)

## 🎨 Response İşleme

### Python Örneği

```python
import requests
from datetime import datetime, timedelta

# Son 30 günün PR'larını getir
thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat() + "Z"

response = requests.post(
    "http://localhost:8083/api/branch/pull-requests",
    json={
        "repository_name": "Cofins.CustomerPortal",
        "target_branch": "master",
        "start_date": thirty_days_ago
    }
)

data = response.json()

print(f"Toplam PR: {data['total_pull_requests']}")

for pr in data['pull_requests']:
    print(f"\nPR #{pr['pr_id']}: {pr['title']}")
    print(f"  Yazar: {pr['author']}")
    print(f"  Tarih: {pr['created_date']}")
    print(f"  Durum: {pr['status']}")
    print(f"  Work Items: {', '.join(map(str, pr['work_items']))}")
```

### JavaScript Örneği

```javascript
const response = await fetch('http://localhost:8083/api/branch/pull-requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    repository_name: 'Cofins.CustomerPortal',
    target_branch: 'master',
    start_date: '2024-11-01T00:00:00Z'
  })
});

const data = await response.json();

console.log(`Toplam PR: ${data.total_pull_requests}`);

data.pull_requests.forEach(pr => {
  console.log(`\nPR #${pr.pr_id}: ${pr.title}`);
  console.log(`  Yazar: ${pr.author}`);
  console.log(`  Durum: ${pr.status}`);
  console.log(`  Work Items: ${pr.work_items.join(', ')}`);
});
```

## 📊 Excel/CSV Export

Response'u Excel'e aktarmak için:

```python
import requests
import pandas as pd

response = requests.post(
    "http://localhost:8083/api/branch/pull-requests",
    json={
        "repository_name": "Cofins.CustomerPortal",
        "target_branch": "master",
        "start_date": "2024-11-01T00:00:00Z"
    }
)

data = response.json()

# DataFrame oluştur
df = pd.DataFrame(data['pull_requests'])

# Work items listesini string'e çevir
df['work_items'] = df['work_items'].apply(lambda x: ', '.join(map(str, x)))

# Excel'e kaydet
df.to_excel('pr_list.xlsx', index=False)

# Veya CSV'ye kaydet
df.to_csv('pr_list.csv', index=False)
```

## 🔄 N8N Entegrasyonu

### N8N Workflow Node

1. **HTTP Request Node** ekleyin
2. Ayarları yapın:
   - Method: `POST`
   - URL: `http://localhost:8083/api/branch/pull-requests`
   - Body Type: `JSON`
   - Body:
     ```json
     {
       "repository_name": "Cofins.CustomerPortal",
       "target_branch": "master",
       "start_date": "{{ $now.minus({days: 30}).toISO() }}"
     }
     ```

3. Response'u işleyin:
   ```javascript
   // Tüm PR'ları döngüye al
   {{ $json.pull_requests }}
   
   // Her PR için
   PR ID: {{ $json.pr_id }}
   Başlık: {{ $json.title }}
   Yazar: {{ $json.author }}
   Durum: {{ $json.status }}
   Work Items: {{ $json.work_items.join(', ') }}
   ```

### N8N ile Otomatik Rapor

```javascript
// Son 7 günün PR'larını al
// Sadece completed olanları filtrele
// Excel raporu oluştur
// Email ile gönder

const completedPRs = items
  .filter(item => item.json.status === 'completed')
  .map(item => ({
    'PR ID': item.json.pr_id,
    'Başlık': item.json.title,
    'Yazar': item.json.author,
    'Tarih': item.json.created_date,
    'Work Items': item.json.work_items.join(', ')
  }));

return completedPRs;
```

## 🎯 Kullanım Senaryoları

### 1. Haftalık Release Raporu
```bash
# Son 7 günün completed PR'ları
curl -X POST "http://localhost:8083/api/branch/pull-requests" \
  -H "Content-Type: application/json" \
  -d "{
    \"repository_name\": \"Cofins.CustomerPortal\",
    \"target_branch\": \"master\",
    \"start_date\": \"$(date -u -v-7d +%Y-%m-%dT%H:%M:%SZ)\"
  }"
```

### 2. Aylık Aktivite Raporu
```python
# Aylık bazda PR sayıları
import requests
from datetime import datetime, timedelta
from collections import defaultdict

response = requests.post(
    "http://localhost:8083/api/branch/pull-requests",
    json={
        "repository_name": "Cofins.CustomerPortal",
        "target_branch": "master",
        "start_date": "2024-01-01T00:00:00Z"
    }
)

# Ay bazında grupla
monthly_counts = defaultdict(int)
for pr in response.json()['pull_requests']:
    month = pr['created_date'][:7]  # YYYY-MM
    monthly_counts[month] += 1

for month, count in sorted(monthly_counts.items()):
    print(f"{month}: {count} PR")
```

### 3. Yazar Bazlı Analiz
```python
# En çok PR açan yazarlar
from collections import Counter

response = requests.post(
    "http://localhost:8083/api/branch/pull-requests",
    json={
        "repository_name": "Cofins.CustomerPortal",
        "target_branch": "master",
        "start_date": "2024-11-01T00:00:00Z"
    }
)

authors = [pr['author'] for pr in response.json()['pull_requests']]
author_counts = Counter(authors)

print("En Aktif Yazarlar:")
for author, count in author_counts.most_common(10):
    print(f"{author}: {count} PR")
```

## 🚨 Hata Kodları

| HTTP Code | Açıklama |
|-----------|----------|
| 200 | Başarılı |
| 400 | Geçersiz parametre |
| 404 | Repository bulunamadı |
| 500 | Sunucu hatası |

## 💡 İpuçları

1. **Performans**: Çok fazla PR varsa, `start_date` kullanarak filtreleme yapın
2. **Tarih Formatı**: ISO 8601 formatı kullanın: `YYYY-MM-DDTHH:MM:SSZ`
3. **Branch Adı**: URL'deki branch adını değil, sadece branch adını kullanın (örn: "master", "develop")
4. **Work Items**: Boş liste `[]` dönebilir (PR'a work item bağlanmamışsa)

## 🎬 Hızlı Başlangıç

```bash
# 1. Server'ı başlat
./start_api_server.sh

# 2. Repository listesini al
curl -X GET "http://localhost:8083/api/repositories" | jq '.repositories[] | {name, id}'

# 3. Doğru repo adını kullanarak PR'ları al
curl -X POST "http://localhost:8083/api/branch/pull-requests" \
  -H "Content-Type: application/json" \
  -d '{"repository_name": "REPOSITORY_NAME_BURAYA", "target_branch": "master"}' \
  | jq '.pull_requests[] | {pr_id, title, author, status}'

# 4. Son ayın PR'larını getir
./test_branch_prs.sh
```

## 🔍 Repository Adını Bulma

### Yöntem 1: API ile (Önerilen)

```bash
curl -X GET "http://localhost:8083/api/repositories" | jq '.repositories[]'
```

Çıktı:
```json
{
  "id": "abc-123-guid",
  "name": "Cofins.CustomerPortal",
  "url": "...",
  "webUrl": "https://dev.azure.com/..."
}
```

**`name` değerini kullanın!**

### Yöntem 2: Azure DevOps URL'den

```
https://dev.azure.com/arc-product/ProductAndDelivery/_git/Cofins.CustomerPortal
                                                            ^^^^^^^^^^^^^^^^^^^
                                                            Repository Name
```

Repository adı: **Cofins.CustomerPortal**
