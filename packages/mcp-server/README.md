# Azure PBI Analyzer MCP Server

Azure DevOps Product Backlog Item (PBI) analiz aracı olarak çalışan bir Model Context Protocol (MCP) server'ı ve HTTP API.

## Özellikler

- 🔍 PBI detaylarını getirme
- 🔗 PBI'a bağlı task'ları bulma (otomatik parent detection)
- 📋 İlişkili pull request'leri listeleme
- 📊 Kod değişikliklerini analiz etme
- 📈 Kapsamlı değişiklik raporu oluşturma
- 📝 **Teknik ve Business Release Note oluşturma**
- 🌐 **HTTP API desteği (n8n entegrasyonu için)**

## Kullanım Modları

### 1️⃣ HTTP API (n8n, Zapier, Make.com için)

En kolay yöntem - herhangi bir automation tool'dan kullanabilirsiniz.

```bash
# API server'ı başlat
./start_api_server.sh
# veya
python api_server.py
```

Server `http://localhost:8000` adresinde çalışır.

**API Endpoints:**
- `GET /health` - Health check
- `POST /api/pbi/analyze` - Tam PBI analizi
- `POST /api/pbi/details` - PBI detayları
- `POST /api/pbi/pull-requests` - PR listesi
- `POST /api/pbi/code-changes` - Kod değişiklik analizi
- `POST /api/release-notes/technical` - Teknik release notes
- `POST /api/release-notes/business` - Business release notes

**API Dokumentasyonu:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

**n8n Entegrasyonu:** Detaylı bilgi için [N8N_INTEGRATION.md](N8N_INTEGRATION.md) dosyasına bakın.

### 2️⃣ MCP Server (Claude Desktop için)

Model Context Protocol ile AI asistanlardan kullanım.

1. Sanal ortam oluşturun:
```bash
python -m venv venv
source venv/bin/activate  # macOS/Linux
```

2. Bağımlılıkları yükleyin:
```bash
pip install -e .
```

3. Environment değişkenlerini ayarlayın:
```bash
cp .env.example .env
# .env dosyasını Azure DevOps bilgilerinizle düzenleyin
```

## Azure DevOps PAT Oluşturma

1. Azure DevOps'ta Settings → Personal Access Tokens
2. New Token oluşturun
3. Şu izinleri verin:
   - **Work Items**: Read
   - **Code**: Read
   - **Pull Requests**: Read

## Kullanım

MCP server'ı başlatın:
```bash
python -m src.server
```

### MCP Client ile Kullanım

Claude Desktop veya başka bir MCP client'ta yapılandırma:

```json
{
  "mcpServers": {
    "azure-pbi-analyzer": {
      "command": "python",
      "args": ["-m", "src.server"],
      "cwd": "/path/to/azure-pbi-analyzer-mcp",
      "env": {
        "AZURE_DEVOPS_ORG": "your-org",
        "AZURE_DEVOPS_PROJECT": "your-project",
        "AZURE_DEVOPS_PAT": "your-pat"
      }
    }
  }
}
```

## Araçlar

### `analyze-pbi`
Bir PBI ID'yi alır ve kapsamlı analiz yapar.

**Parametreler:**
- `pbi_id` (int): Product Backlog Item ID

**Çıktı:**
- PBI detayları
- Bağlı task'lar
- İlişkili pull request'ler
- Kod değişiklik analizi

### `get-pbi-details`
Belirli bir PBI'ın detaylarını getirir.

### `list-pbi-pull-requests`
PBI ve bağlı task'lara ait tüm PR'ları listeler.

### `analyze-code-changes`
Pull request'teki kod değişikliklerini analiz eder.

## Geliştirme

Test çalıştırma:
```bash
pytest
```

Kod formatlama:
```bash
black src/
ruff check src/
```

## Lisans

MIT
