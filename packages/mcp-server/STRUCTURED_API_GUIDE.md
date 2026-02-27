# 🎯 Structured Release Notes API - Kullanım Kılavuzu

## 📋 Genel Bakış

Yapılandırılmış release note API'si, Azure DevOps PBI'larınızı analiz ederek **method** ve **class** bazında detaylı değişiklik raporları üretir.

## 🚀 API Endpoint

```
POST http://localhost:8083/api/release-notes/structured
```

## 📥 Request Format

```json
{
  "pbi_id": 251236,
  "language": "en"  // "en" (İngilizce) veya "tr" (Türkçe)
}
```

### Parametreler

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `pbi_id` | integer | Evet | Azure DevOps PBI ID |
| `language` | string | Hayır | Çıktı dili: `"en"` veya `"tr"` (varsayılan: `"en"`) |

## 📤 Response Format

```json
{
  "releaseNote": {
    "technical": {
      "title": "API Enhancement: Person Data Retrieval",
      "description": "Updated GetPersonByProductId method to include additional filtering and caching capabilities."
    },
    "business": {
      "title": "Improved Customer Data Access",
      "description": "Users can now access customer information more quickly with enhanced data retrieval mechanisms."
    }
  },
  "changes": {
    "methods": {
      "added": [
        {
          "name": "GetPersonByProductId",
          "class_name": "PersonService",
          "parameters": ["productId: int", "includeDetails: bool"],
          "description": "New method to retrieve person data by product ID"
        }
      ],
      "deleted": [
        {
          "name": "OldMethod",
          "class_name": "PersonService",
          "parameters": ["id: int"],
          "description": "Legacy method removed"
        }
      ],
      "updated": [
        {
          "name": "UpdatePerson",
          "class_name": "PersonService",
          "parameters": ["personId: int", "data: PersonDto", "validate: bool"],
          "description": "Added validation parameter"
        }
      ]
    },
    "classes": {
      "added": [
        {
          "name": "PersonDto",
          "properties": ["Id: int", "Name: string", "Email: string"],
          "description": "New data transfer object for person data"
        }
      ],
      "deleted": [],
      "updated": [
        {
          "name": "PersonModel",
          "properties": ["LastUpdated: DateTime"],
          "description": "Added timestamp tracking"
        }
      ]
    }
  }
}
```

## 🌍 Dil Desteği

### İngilizce (English)
```bash
curl -X POST "http://localhost:8083/api/release-notes/structured" \
  -H "Content-Type: application/json" \
  -d '{"pbi_id": 251236, "language": "en"}'
```

**Örnek Çıktı:**
```json
{
  "releaseNote": {
    "technical": {
      "title": "API Enhancement: Cache Implementation",
      "description": "Implemented Redis caching layer for improved performance..."
    },
    "business": {
      "title": "Faster Data Access",
      "description": "Users will experience 50% faster page load times..."
    }
  }
}
```

### Türkçe (Turkish)
```bash
curl -X POST "http://localhost:8083/api/release-notes/structured" \
  -H "Content-Type: application/json" \
  -d '{"pbi_id": 251236, "language": "tr"}'
```

**Örnek Çıktı:**
```json
{
  "releaseNote": {
    "technical": {
      "title": "API Geliştirmesi: Cache Implementasyonu",
      "description": "Performans iyileştirmesi için Redis önbellekleme katmanı eklendi..."
    },
    "business": {
      "title": "Daha Hızlı Veri Erişimi",
      "description": "Kullanıcılar %50 daha hızlı sayfa yükleme süreleri deneyimleyecek..."
    }
  }
}
```

## 🔄 N8N Entegrasyonu

### Workflow Adımları

1. **HTTP Request Node** ekleyin
2. Şu ayarları yapın:
   - Method: `POST`
   - URL: `http://localhost:8083/api/release-notes/structured`
   - Body Type: `JSON`
   - Body Content:
     ```json
     {
       "pbi_id": {{ $json.pbi_id }},
       "language": "tr"
     }
     ```

3. Response'u kullanın:
   ```javascript
   // Technical title
   {{ $json.releaseNote.technical.title }}
   
   // Business description
   {{ $json.releaseNote.business.description }}
   
   // Added methods
   {{ $json.changes.methods.added }}
   
   // Breaking changes (deleted items)
   {{ $json.changes.methods.deleted }}
   {{ $json.changes.classes.deleted }}
   ```

## 🎯 Kullanım Örnekleri

### Python ile Kullanım

```python
import requests
import json

url = "http://localhost:8083/api/release-notes/structured"

# Türkçe release note
response = requests.post(url, json={
    "pbi_id": 251236,
    "language": "tr"
})

data = response.json()

print(f"Teknik Başlık: {data['releaseNote']['technical']['title']}")
print(f"İş Başlığı: {data['releaseNote']['business']['title']}")
print(f"\nEklenen Metodlar: {len(data['changes']['methods']['added'])}")
print(f"Silinen Metodlar: {len(data['changes']['methods']['deleted'])}")
```

### JavaScript ile Kullanım

```javascript
const response = await fetch('http://localhost:8083/api/release-notes/structured', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pbi_id: 251236,
    language: 'en'
  })
});

const data = await response.json();

console.log('Technical:', data.releaseNote.technical.title);
console.log('Business:', data.releaseNote.business.title);
console.log('Added Methods:', data.changes.methods.added.length);
console.log('Breaking Changes:', data.changes.methods.deleted.length);
```

### cURL ile Kullanım

```bash
# İngilizce
curl -X POST "http://localhost:8083/api/release-notes/structured" \
  -H "Content-Type: application/json" \
  -d '{"pbi_id": 251236, "language": "en"}' | jq

# Türkçe
curl -X POST "http://localhost:8083/api/release-notes/structured" \
  -H "Content-Type: application/json" \
  -d '{"pbi_id": 251236, "language": "tr"}' | jq
```

## 🎨 Özellikler

✅ **Method Level Tracking**
- Eklenen metodlar ve parametreleri
- Silinen metodlar (Breaking Changes)
- Güncellenen metodlar ve değişiklikler

✅ **Class Level Tracking**
- Yeni sınıflar ve property'leri
- Silinen sınıflar (Breaking Changes)
- Güncellenen sınıflar ve yeni property'ler

✅ **Dual Perspective**
- Technical: Geliştirici odaklı açıklama
- Business: İş değeri odaklı açıklama

✅ **Multi-Language Support**
- İngilizce (en)
- Türkçe (tr)

✅ **AI-Powered Analysis**
- Azure OpenAI ile kod analizi
- Akıllı değişiklik tespiti
- Context-aware açıklamalar

## 🔍 Breaking Changes Tespiti

Silinen methodlar ve classlar otomatik olarak **breaking change** olarak kabul edilir:

```json
{
  "changes": {
    "methods": {
      "deleted": [
        {
          "name": "OldMethod",
          "class_name": "PersonService",
          "parameters": ["id: int"],
          "description": "Bu method kaldırıldı - Breaking Change!"
        }
      ]
    }
  }
}
```

## 📊 Hata Kodları

| HTTP Code | Açıklama |
|-----------|----------|
| 200 | Başarılı |
| 400 | Geçersiz dil parametresi |
| 500 | Sunucu hatası |

## 🛠 Teknik Detaylar

- **AI Model**: Azure OpenAI GPT-4o-PTU
- **Max Token**: 2000 per request
- **Timeout**: 60 seconds
- **Rate Limit**: Azure OpenAI limitine tabidir
- **Response Format**: Pure JSON (No Markdown)

## 💡 İpuçları

1. **Dil Seçimi**: İç kullanım için Türkçe, dokümantasyon için İngilizce tercih edin
2. **Breaking Changes**: `deleted` arraylerini kontrol edin
3. **Cache**: Aynı PBI için tekrar çağrı yapmayın, sonucu önbellekleyin
4. **Error Handling**: LLM hatalarında fallback response döner

## 🎬 Başlangıç

```bash
# Server'ı başlat
./start_api_server.sh

# Test et
curl http://localhost:8083/health

# Release note üret
curl -X POST "http://localhost:8083/api/release-notes/structured" \
  -H "Content-Type: application/json" \
  -d '{"pbi_id": 251236, "language": "tr"}' | jq
```

## 📞 Destek

API ile ilgili sorularınız için sistem yöneticisine başvurun.
