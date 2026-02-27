# N8N Integration Guide

## Quick Start (AI-Powered Release Notes) ⭐

En hızlı başlangıç için AI-powered endpoint'leri kullanın:

```bash
# API server'ı başlat
python api_server.py

# n8n'den kullan (Docker)
POST http://host.docker.internal:8083/api/release-notes/ai-business
Body: {"pbi_id": 288274}
```

## HTTP API Kullanımı (Önerilen)

Azure PBI Analyzer'ı n8n'den kullanmak için HTTP API wrapper'ı kullanabilirsiniz.

### 1. API Server'ı Başlatın

```bash
# Yeni bağımlılıkları yükleyin
pip install fastapi uvicorn[standard]

# API server'ı başlatın
python api_server.py
```

Server `http://localhost:8000` adresinde çalışacak.

### 2. n8n'de HTTP Request Node Kullanın

#### Örnek 1: PBI Analizi

**HTTP Request Node Ayarları:**
- **Method**: POST
- **URL**: `http://localhost:8000/api/pbi/analyze`
- **Body** (JSON):
```json
{
  "pbi_id": 288274
}
```

**Response:**
```json
{
  "pbi": { ... },
  "tasks": [ ... ],
  "pull_requests": [ ... ],
  "code_statistics": {
    "total_pull_requests": 5,
    "total_files_changed": 7,
    "unique_files_affected": 6
  },
  "summary": "..."
}
```

#### Örnek 2: Technical Release Notes (AI-Powered)

**HTTP Request Node Ayarları:**
- **Method**: POST
- **URL**: `http://localhost:8083/api/release-notes/ai-technical`
- **Body** (JSON):
```json
{
  "pbi_id": 288274
}
```

**Response:**
```json
{
  "release_notes": "# Technical Release Notes\n\n**PBI**: ACM000000022066\n\n---\n\n## 🗄️ Database Changes\n\n- **Foundation_DML_Changes_2025-11-26 23.54.10.sql**\n  - Data modification script\n  - New script added\n\n## 🔌 API & Service Layer Changes\n\n- **Router.cs**\n  - Request routing logic updated\n  - Modified existing functionality\n- **RestrictionControlHelper.cs**\n  - Helper methods modified\n  - Modified existing functionality\n\n## ⚡ Performance Optimizations\n\n- **CacheValueSerializer.cs**\n  - Cache mechanism improvements\n  - Data serialization optimized\n\n## 📊 Summary\n\n- **Total Changes**: 5 pull requests merged\n- **Files Modified**: 5 files across different layers\n- **Database Impact**: 1 schema/data changes",
  "format": "markdown"
}
```

#### Örnek 3: Business Release Notes (AI-Powered)

**HTTP Request Node Ayarları:**
- **Method**: POST
- **URL**: `http://localhost:8083/api/release-notes/ai-business`
- **Body** (JSON):
```json
{
  "pbi_id": 288274
}
```

**Response:**
```json
{
  "release_notes": "# Release Notes\n\n**Feature**: ACM000000022066\n\n---\n\n## 💡 What Changed\n\n### Performance Improvements\n\n**Caching System Enhanced**\n- Improved data caching mechanism for faster retrieval\n- Expected Impact: Reduced server load and faster response times\n\n**Data Processing Optimized**\n- Enhanced data serialization for better performance\n- Expected Impact: Faster data transmission and reduced memory usage\n\n### Database Updates\n\n**1 database changes applied**\n- Schema optimizations and data structure improvements\n- Expected Impact: Better data organization and query performance\n\n### System Integration Updates\n\n**Request Routing Enhanced**\n- Improved request handling and routing logic\n- Expected Impact: More reliable service communication\n\n## 🎯 Expected Business Impact\n\n**User Experience**\n- Faster page load times and data retrieval\n- Smoother application performance\n\n**System Reliability**\n- Improved data consistency and accuracy\n- Better system stability under load\n\n**Overall Impact**\n- Enhanced application performance and reliability\n- Foundation for future feature enhancements\n- Reduced technical debt and improved maintainability\n\n## ✅ Delivery Status\n\n- 3 out of 5 changes deployed to production\n- 2 changes in review/testing phase",
  "format": "markdown"
}
```

#### Örnek 4: Traditional Technical Release Notes

**HTTP Request Node Ayarları:**
- **Method**: POST
- **URL**: `http://localhost:8083/api/release-notes/technical`
- **Body** (JSON):
```json
{
  "pbi_id": 288274
}
```

#### Örnek 5: Traditional Business Release Notes

**HTTP Request Node Ayarları:**
- **Method**: POST
- **URL**: `http://localhost:8083/api/release-notes/business`
- **Body** (JSON):
```json
{
  "pbi_id": 288274
}
```

### 3. Available Endpoints

| Endpoint | Method | Description | Notes |
|----------|--------|-------------|-------|
| `/health` | GET | Health check | - |
| `/api/pbi/analyze` | POST | Complete PBI analysis | Full details |
| `/api/pbi/details` | POST | Get PBI details only | Work item info |
| `/api/pbi/pull-requests` | POST | List all PRs | PR metadata |
| `/api/pbi/code-changes` | POST | Analyze code changes | File statistics |
| `/api/release-notes/technical` | POST | Generate technical notes | Traditional format |
| `/api/release-notes/business` | POST | Generate business notes | Traditional format |
| `/api/release-notes/ai-technical` | POST | **AI-powered technical notes** | ⭐ Kod analizi ile |
| `/api/release-notes/ai-business` | POST | **AI-powered business notes** | ⭐ İş etkisi analizi |

**Önerilen**: AI-powered endpoint'leri kullanın (`/ai-technical`, `/ai-business`). Daha temiz ve odaklı sonuçlar verir.

### 4. n8n Workflow Örneği

#### Basit Workflow - AI Release Notes
```
[Webhook] 
    ↓
[HTTP Request - AI Business Release Notes]
    ↓
[Slack/Email] (Send release notes)
```

#### Gelişmiş Workflow - Otomatik Release Notes
```
[Schedule Trigger - Daily at 5 PM]
    ↓
[Azure DevOps - Get Completed PBIs]
    ↓
[Loop Over Items]
    ↓
[HTTP Request - AI Business Release Notes]
    ↓
[IF Node - Check if has changes]
    ↓
[Confluence - Create Release Note Page]
    ↓
[Slack - Notify Team]
```

#### Teknik + Business Combo Workflow
```
[Manual Trigger]
    ↓
[Set PBI ID]
    ↓
[HTTP Request - AI Technical Notes] ──┐
                                       ├──> [Merge Data]
[HTTP Request - AI Business Notes] ───┘         ↓
                                         [Create Combined Document]
                                                 ↓
                                         [Email to Stakeholders]
```

### 5. Production Deployment

#### Docker ile Deploy

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY . .

RUN pip install -e .

EXPOSE 8000

CMD ["python", "api_server.py"]
```

```bash
# Build
docker build -t azure-pbi-analyzer .

# Run
docker run -d \
  -p 8000:8000 \
  -e AZURE_DEVOPS_ORG=your-org \
  -e AZURE_DEVOPS_PROJECT=your-project \
  -e AZURE_DEVOPS_PAT=your-token \
  azure-pbi-analyzer
```

#### Environment Variables

n8n workflow'unuzda API'yi çağırırken, server'ın aşağıdaki environment variable'ları olduğundan emin olun:

- `AZURE_DEVOPS_ORG`
- `AZURE_DEVOPS_PROJECT`
- `AZURE_DEVOPS_PAT`

### 6. n8n Node Örnekleri

#### Basit Workflow - AI Business Release Notes

1. **Trigger Node** (Manual Trigger veya Webhook)
2. **Set Node** - PBI ID'yi ayarla
   ```json
   {
     "pbi_id": 288274
   }
   ```
3. **HTTP Request Node**
   - URL: `http://host.docker.internal:8083/api/release-notes/ai-business`
   - Method: POST
   - Body: `{{ $json }}`
   - Headers: `Content-Type: application/json`
4. **Code Node** - Parse response
   ```javascript
   return [{
     json: {
       pbi_id: $input.item.json.pbi_id,
       release_notes: JSON.parse($input.item.json).release_notes
     }
   }];
   ```
5. **Slack/Email Node** - Release notes'u gönder
   - Message: `{{ $json.release_notes }}`

#### Gelişmiş Workflow - Günlük Release Notes

```json
{
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "0 17 * * 1-5"
            }
          ]
        }
      }
    },
    {
      "name": "Get Completed PBIs",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [450, 300],
      "parameters": {
        "method": "GET",
        "url": "https://dev.azure.com/{{$env.AZURE_ORG}}/{{$env.AZURE_PROJECT}}/_apis/wit/wiql?api-version=7.1",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpBasicAuth",
        "options": {
          "qs": {
            "query": "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Done' AND [System.ChangedDate] >= @Today - 1"
          }
        }
      }
    },
    {
      "name": "Loop Over PBIs",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 1,
      "position": [650, 300]
    },
    {
      "name": "Generate AI Business Release Notes",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [850, 300],
      "parameters": {
        "method": "POST",
        "url": "http://host.docker.internal:8083/api/release-notes/ai-business",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "pbi_id",
              "value": "={{ $json.id }}"
            }
          ]
        },
        "options": {
          "timeout": 30000
        }
      }
    },
    {
      "name": "Send to Slack",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 1,
      "position": [1050, 300],
      "parameters": {
        "channel": "#release-notes",
        "text": "={{ $json.release_notes }}",
        "otherOptions": {
          "mrkdwn": true
        }
      }
    }
  ]
}
```

#### Teknik + Business Combo

1. **Manual Trigger**
2. **Set Node** - PBI ID
   ```json
   {
     "pbi_id": 288274
   }
   ```
3. **HTTP Request (Technical)** - Fork başlat
   - URL: `http://host.docker.internal:8083/api/release-notes/ai-technical`
   - Method: POST
4. **HTTP Request (Business)** - Paralel çalışsın
   - URL: `http://host.docker.internal:8083/api/release-notes/ai-business`
   - Method: POST
5. **Merge Node** - Her iki sonucu birleştir
6. **Code Node** - Combined document oluştur
   ```javascript
   const technical = $('HTTP Request (Technical)').first().json;
   const business = $('HTTP Request (Business)').first().json;
   
   return [{
     json: {
       combined_notes: `${business.release_notes}\n\n---\n\n${technical.release_notes}`
     }
   }];
   ```
7. **Email Node** - Gönder

### 7. Test

```bash
# Health check
curl http://localhost:8083/health

# Analyze PBI
curl -X POST http://localhost:8083/api/pbi/analyze \
  -H "Content-Type: application/json" \
  -d '{"pbi_id": 288274}'

# Generate AI business release notes (Önerilen)
curl -X POST http://localhost:8083/api/release-notes/ai-business \
  -H "Content-Type: application/json" \
  -d '{"pbi_id": 288274}'

# Generate AI technical release notes (Önerilen)
curl -X POST http://localhost:8083/api/release-notes/ai-technical \
  -H "Content-Type: application/json" \
  -d '{"pbi_id": 288274}'

# Traditional business release notes
curl -X POST http://localhost:8083/api/release-notes/business \
  -H "Content-Type: application/json" \
  -d '{"pbi_id": 288274}'
```

### 8. Docker Network Notları

n8n Docker container'dan API'ye erişim için:

**macOS/Windows Docker Desktop:**
```
http://host.docker.internal:8083
```

**Linux Docker:**
```
http://172.17.0.1:8083
```

Veya IP adresi ile:
```
http://192.168.1.51:8083  # Your local IP
```

### 9. API Documentation

API'yi çalıştırdıktan sonra otomatik dokümantasyon:
- Swagger UI: `http://localhost:8083/docs`
- ReDoc: `http://localhost:8083/redoc`

## AI-Powered vs Traditional Release Notes

### AI-Powered (Önerilen) ⭐

**장점:**
- ✅ Temiz ve odaklı çıktı
- ✅ Gereksiz detaylar yok (PR listesi, task listesi)
- ✅ Kod seviyesinde değişiklikler (dosya bazlı)
- ✅ Kategorize edilmiş (Database/API/Performance)
- ✅ İş etkisi analizi
- ✅ Emoji'lerle daha okunabilir

**Örnek Çıktı:**
```markdown
## 🗄️ Database Changes
- Foundation_DML_Changes.sql: Data modification script

## 🔌 API Changes
- Router.cs: Request routing logic updated

## ⚡ Performance
- CacheValueSerializer.cs: Cache improvements
```

### Traditional

**장점:**
- ✅ Detaylı istatistikler
- ✅ PR metadata
- ✅ Task detayları

**단점:**
- ❌ Çok fazla gereksiz detay
- ❌ PR listesi (uzun)
- ❌ Task breakdown (gereksiz)

**Ne zaman kullanılır:**
- Tam detaylı rapor gerektiğinde
- Audit için dokümantasyon
- Proje yönetimi metrikleri
- ReDoc: `http://localhost:8000/redoc`
