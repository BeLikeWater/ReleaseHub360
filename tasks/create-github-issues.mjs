/**
 * ReleaseHub360 — GitHub Issue Creator (Full Coverage)
 * DESIGN_DOCUMENT.md 11 section, ~95 issue — tüm gap item'ları kapsar.
 *
 * Kullanım: node tasks/create-github-issues.mjs
 */

import { readFileSync } from 'fs';
import { request } from 'https';
import { resolve } from 'path';

// .env'den oku
const envPath = resolve(process.cwd(), 'packages/backend/.env');
const envContent = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const [key, ...rest] = line.split('=');
      return [key.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
    })
);

const TOKEN = env.GITHUB_TOKEN;
const OWNER = env.GITHUB_OWNER;
const REPO  = env.GITHUB_REPO;

if (!TOKEN || !OWNER || !REPO) {
  console.error('❌ GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO .env dosyasında tanımlı olmalı.');
  process.exit(1);
}

console.log(`\n🚀 GitHub → ${OWNER}/${REPO}\n`);

// ──────────────────────────────────────────────
// Label tanımları
// ──────────────────────────────────────────────
const LABELS = [
  // Section labels
  { name: 'section:1-product',         color: '0075ca', description: 'Section 1 — Product' },
  { name: 'section:2-service',         color: 'e4e669', description: 'Section 2 — Service/API' },
  { name: 'section:3-customer',        color: 'd93f0b', description: 'Section 3 — Customer' },
  { name: 'section:4-cpm',             color: '7057ff', description: 'Section 4 — CustomerProductMapping' },
  { name: 'section:5-calendar',        color: '0e8a16', description: 'Section 5 — Release Calendar & ProductVersion' },
  { name: 'section:6-healthcheck',     color: 'fbca04', description: 'Section 6 — Release Health Check' },
  { name: 'section:7-customer-portal', color: 'b60205', description: 'Section 7 — Customer Dashboard Portal' },
  { name: 'section:8-version-matrix',  color: '006b75', description: 'Section 8 — Service Version Matrix' },
  { name: 'section:9-issues',          color: 'e99695', description: 'Section 9 — Transition Issue Tracking' },
  { name: 'section:10-rbac',           color: 'c5def5', description: 'Section 10 — Authorization & RBAC' },
  { name: 'section:11-dashboard',      color: 'd4c5f9', description: 'Section 11 — Kurum Dashboard & DORA' },
  // Type labels
  { name: 'type:schema',     color: 'bfd4f2', description: 'Prisma schema değişikliği' },
  { name: 'type:backend',    color: 'c2e0c6', description: 'Backend endpoint / logic' },
  { name: 'type:frontend',   color: '1d76db', description: 'Frontend React bileşen / sayfa' },
  { name: 'type:security',   color: 'e11d48', description: 'Şifreleme / güvenlik' },
  { name: 'type:n8n',        color: 'f97316', description: 'n8n workflow' },
  { name: 'type:migration',  color: 'bfdadc', description: 'Data migration / schema migration' },
  { name: 'type:ux',         color: 'f9d0c4', description: 'UX/UI tasarım güncelleme' },
  // Priority labels
  { name: 'priority:P0', color: 'b60205', description: 'Kritik — bu sprint' },
  { name: 'priority:P1', color: 'ff9f1c', description: 'Yüksek — bu çeyrekte' },
  { name: 'priority:P2', color: 'ffec8b', description: 'Orta — planlı' },
];

// ══════════════════════════════════════════════
// Issue tanımları — DESIGN_DOCUMENT.md tüm 11 section
// ══════════════════════════════════════════════
const ISSUES = [

  // ═══════════════════════════════════════════
  // SECTION 1 — PRODUCT (Gap 1-8)
  // ═══════════════════════════════════════════

  {
    title: '[S1-Product] PAT/Token Şifreleme — AES-256 encrypt/decrypt + API maskeleme',
    labels: ['section:1-product', 'type:security', 'type:backend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 1 — Gap #1, #5\n\n## Yapılacak\n- \`azurePat\` ve \`githubToken\` için AES-256 simetrik şifreleme utility'si yaz\n- \`ENCRYPTION_KEY\` ortam değişkeninden anahtar oku\n- DB'ye yazarken \`encrypt()\`, okurken \`decrypt()\`\n- API response'da PAT/Token maskeli (\`•••••abc123\`)\n- \`ENCRYPTION_KEY\` eksikse uygulama başlamaz (startup validation)\n\n## Kabul Kriterleri\n- [ ] \`packages/backend/src/utils/crypto.ts\` — \`encrypt\` / \`decrypt\` export eder\n- [ ] \`azurePat\` DB'ye şifreli yazılır, mevcut düz metin değerler migrate edilir\n- [ ] GET /products endpoint'i PAT alanını maskeli döner\n- [ ] \`ENCRYPTION_KEY\` eksikse uygulama hata ile çıkar`,
  },
  {
    title: '[S1-Product] GitHub Alanları — githubOwner & githubToken (schema + API)',
    labels: ['section:1-product', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 1 — Gap #2\n\n## Yapılacak\n- Prisma: \`githubOwner: String?\`, \`githubToken: String?\` (encrypted)\n- Migration oluştur\n- Product CRUD endpoint'lerini güncelle\n- \`sourceControlType = GITHUB\` ise bu alanlar zorunlu validasyonu\n\n## Kabul Kriterleri\n- [ ] Migration başarılı\n- [ ] POST/PUT /products → \`githubOwner\` + \`githubToken\` kabul eder\n- [ ] \`githubToken\` şifreli yazılır / maskeli döner`,
  },
  {
    title: '[S1-Product] Yeni Flagler — usesReleaseBranches & concurrentUpdatePolicy',
    labels: ['section:1-product', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 1 — Gap #3\n\n## Yapılacak\n- \`usesReleaseBranches: Boolean @default(false)\`\n- \`concurrentUpdatePolicy: Enum (WARN | BLOCK) @default(WARN)\`\n- Migration oluştur\n- Health Check PR toplama mantığını \`usesReleaseBranches\` değerine göre güncelle\n\n## Kabul Kriterleri\n- [ ] Her iki alan schema + migration'da\n- [ ] \`usesReleaseBranches = true\` → Health Check iki aşamalı PR toplama\n- [ ] \`concurrentUpdatePolicy = BLOCK\` → aynı güne ikinci müşteri engellenir\n- [ ] \`WARN\` durumunda uyarı dönülür ama işlem devam eder`,
  },
  {
    title: '[S1-Product] Alan Temizliği — pmType→sourceControlType, deploymentType→supportedArtifactTypes',
    labels: ['section:1-product', 'type:schema', 'type:migration', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 1 — Gap #4, #6\n\n## Yapılacak\n- \`pmType\` → \`sourceControlType\` (enum: AZURE | GITHUB)\n- \`deploymentType\` (tek string) → \`supportedArtifactTypes\` (String[] array: DOCKER, BINARY, GIT_SYNC)\n- \`repoUrl\` kaldır\n- Migration: mevcut \`deploymentType\` değerini ilk eleman olarak array'e taşı\n\n## Kabul Kriterleri\n- [ ] Migration veri kaybı yaşatmadan çalışıyor\n- [ ] \`repoUrl\` DB + API'dan kaldırıldı\n- [ ] TypeScript 0 hata\n- [ ] \`supportedArtifactTypes\` en az 1 eleman zorunlu`,
  },
  {
    title: '[S1-Product] Başlangıç Versiyonu Zorunluluğu — Product + ProductVersion tek transaction',
    labels: ['section:1-product', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 1 — Gap #7\n\n## Yapılacak\n- Product oluşturma endpoint'inde 2. adım: ilk \`ProductVersion\` oluştur\n- \`version >= v1.0.0\`, \`status: RELEASED\`, \`actualReleaseDate: now()\`\n- Tek Prisma transaction\n- \`v0.x.x\` reject\n\n## Kabul Kriterleri\n- [ ] POST /products → body'de \`initialVersion\` + \`initialReleaseDate\` zorunlu\n- [ ] Transaction rollback: PV oluşturulamazsa Product de geri alınır\n- [ ] \`v0.0.1\` → 400 hatası`,
  },
  {
    title: '[S1-Product] Onboarding Wizard — 2 adımlı form (Frontend)',
    labels: ['section:1-product', 'type:frontend', 'type:ux', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 1 — Gap #8\n\n## Yapılacak\n- Mevcut tek adımlı form → 2 adımlı MUI Stepper wizard\n- Adım 1: Ürün bilgileri (mevcut alanlar)\n- Adım 2: Başlangıç versiyonu + yayınlanma tarihi\n\n## Kabul Kriterleri\n- [ ] Adım 1 tamamlanmadan Adım 2'ye geçilmiyor\n- [ ] Adım 2'de versiyon formatı doğrulanıyor (v1.0.0+)\n- [ ] Geri butonu çalışıyor`,
  },

  // ═══════════════════════════════════════════
  // SECTION 2 — SERVICE (Gap 1-12)
  // ═══════════════════════════════════════════

  {
    title: '[S2-Service] Stage İkileştirme — prodStageName + prepStageName + aynı stage senaryosu',
    labels: ['section:2-service', 'type:schema', 'type:backend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 2 — Gap #1, #9\n\n## Yapılacak\n- \`releaseStage\` → \`prodStageName\`, \`prepStageName\`, \`prodStageId\`, \`prepStageId\`\n- Mevcut \`releaseStage\` → \`prodStageName\`'e migrate\n- Health Check: \`prodStageName === prepStageName\` kontrolü\n\n## Kabul Kriterleri\n- [ ] Dört yeni alan schema + migration'da\n- [ ] Eski \`releaseStage\` kaldırıldı\n- [ ] Migration mevcut verileri taşıyor\n- [ ] Tek stage senaryosu doğru çalışıyor`,
  },
  {
    title: '[S2-Service] Stage Getir API — Azure DevOps\'tan stage listesi çekme',
    labels: ['section:2-service', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 2 — Gap #2\n\n## Yapılacak\n- \`GET /services/:id/stages\` endpoint'i\n- Azure DevOps API: \`GET releases?definitionId={id}&$top=1\` → stage parse\n- PAT decrypt edilerek kullanılıyor\n\n## Kabul Kriterleri\n- [ ] Endpoint \`{ stages: string[] }\` döner\n- [ ] Bağlantı hatası = anlamlı hata mesajı\n- [ ] 0 release = uyarı döner`,
  },
  {
    title: '[S2-Service] Release Takip Alanları — lastProdReleaseName & lastProdReleaseDate',
    labels: ['section:2-service', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 2 — Gap #3, #4\n\n## Yapılacak\n- \`lastProdReleaseName: String?\` ve \`lastProdReleaseDate: DateTime?\` ekle\n- Kaldır: \`currentVersion\`, \`currentVersionCreatedAt\`, \`lastReleaseName\`, \`repoUrl\`\n- Health Check PR aralığı \`lastProdReleaseDate\` başlangıç noktası\n\n## Kabul Kriterleri\n- [ ] Yeni alanlar schema + migration'da\n- [ ] Eski alanlar kaldırıldı\n- [ ] PUT /services/:id güncelleme çalışıyor`,
  },
  {
    title: '[S2-Service] Alan Temizliği — serviceImageName→dockerImageName, moduleId NOT NULL',
    labels: ['section:2-service', 'type:schema', 'type:migration', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 2 — Gap #5, #8\n\n## Yapılacak\n- \`serviceImageName\` → \`dockerImageName\`\n- \`moduleId\` → NOT NULL\n\n## Kabul Kriterleri\n- [ ] \`dockerImageName\` schema + API'da\n- [ ] \`moduleId\` NOT NULL — null veri varsa migration hata veriyor\n- [ ] TypeScript 0 hata`,
  },
  {
    title: '[S2-Service] Binary Artifacts — binaryArtifacts string[] (BINARY tip)',
    labels: ['section:2-service', 'type:schema', 'type:backend', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 2 — Gap #6\n\n## Yapılacak\n- \`binaryArtifacts: String[]\` (PostgreSQL string array)\n- \`artifactType = BINARY\` ise zorunlu validasyon\n\n## Kabul Kriterleri\n- [ ] Alan schema + migration'da\n- [ ] POST/PUT /services → array kabul ediyor\n- [ ] DOCKER tipinde yoksayılıyor`,
  },
  {
    title: '[S2-Service] Environment Entity — Product seviyesinde ortam tanımı',
    labels: ['section:2-service', 'section:1-product', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 2 — Gap #7\n\n## Yapılacak\n- \`Environment\` entity: \`name\`, \`url?\`, \`sortOrder\`, \`productId\` (FK)\n- Product'a \`environments Environment[]\` relation\n- CRUD: \`GET/POST/PUT/DELETE /products/:id/environments\`\n\n## Kabul Kriterleri\n- [ ] \`Environment\` tablosu oluşturuluyor\n- [ ] Product → Environment 1:N doğru\n- [ ] Endpoint'ler çalışıyor`,
  },
  {
    title: '[S2-Service] Container Platform Alanları — DOCKER tip için',
    labels: ['section:2-service', 'type:schema', 'type:backend', 'type:security', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 2 — Gap #10\n\n## Yapılacak\n- \`containerPlatform: Enum (RANCHER | OPENSHIFT | KUBERNETES | DOCKER_COMPOSE)?\`\n- \`platformUrl\`, \`platformToken\` (encrypted), \`clusterName\`, \`namespace\`, \`workloadName\`\n\n## Kabul Kriterleri\n- [ ] Tüm alanlar schema + migration'da\n- [ ] \`platformToken\` şifreli / maskeli\n- [ ] DOCKER ise \`containerPlatform\` + \`platformUrl\` zorunlu`,
  },
  {
    title: '[S2-Service] VM Deployment Hedefi — DeploymentTarget entity (BINARY tip)',
    labels: ['section:2-service', 'type:schema', 'type:backend', 'type:security', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 2 — Gap #11\n\n## Yapılacak\n- \`DeploymentTarget\`: \`environmentName\`, \`hostAddress\`, \`deployPath\`, \`protocol (WMI|SSH|AGENT)\`, \`credential\` (encrypted)\n- Service → DeploymentTarget 1:N\n- CRUD endpoint'leri\n\n## Kabul Kriterleri\n- [ ] Tablo oluşturuluyor\n- [ ] \`credential\` encrypted / maskeli`,
  },
  {
    title: '[S2-Service] Canlılık Kontrolü API\'leri — Rancher/OpenShift + WMI/SSH',
    labels: ['section:2-service', 'type:backend', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 2 — Gap #12\n\n## Yapılacak\n- Rancher/OpenShift API: pod/deployment status sorgulama\n- WMI/SSH: Windows/Linux servis durumu\n- Timeout + fallback\n\n## Kabul Kriterleri\n- [ ] En az Rancher API pod status çalışıyor\n- [ ] Timeout durumunda graceful degradation\n- [ ] \`containerPlatform\` değerine göre doğru API çağrılıyor`,
  },

  // ═══════════════════════════════════════════
  // SECTION 3 — CUSTOMER (Gap 1-8)
  // ═══════════════════════════════════════════

  {
    title: '[S3-Customer] emailDomain→emailDomains — tekil string\'den array\'e',
    labels: ['section:3-customer', 'type:schema', 'type:migration', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 3 — Gap #1\n\n## Yapılacak\n- \`emailDomain: String?\` → \`emailDomains: String[]\` (NOT NULL)\n- Domain uniqueness: aynı domain iki müşteriye atanamaz\n- Migration: mevcut \`emailDomain\` → array ilk elemanı\n- Login: domain eşleşmesi \`emailDomains\` üzerinden\n\n## Kabul Kriterleri\n- [ ] Migration veri kaybı yaşatmıyor\n- [ ] Domain uniqueness ihlalinde anlamlı hata\n- [ ] Login endpoint doğru çalışıyor`,
  },
  {
    title: '[S3-Customer] tenantName NOT NULL — zorunlu hale getir',
    labels: ['section:3-customer', 'type:schema', 'type:migration', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 3 — Gap #2\n\n## Yapılacak\n- \`tenantName\` nullable → NOT NULL\n- POST /customers → zorunlu validasyon\n\n## Kabul Kriterleri\n- [ ] Migration başarılı (null varsa hata veriyor)\n- [ ] POST /customers → \`tenantName\` eksikse 400`,
  },
  {
    title: '[S3-Customer] Ticket Platform Alanları — ticketPlatform, URL, token, projectKey',
    labels: ['section:3-customer', 'type:schema', 'type:backend', 'type:security', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 3 — Gap #3\n\n## Yapılacak\n- \`ticketPlatform: Enum (ZENDESK | JIRA | PUSULA | SERVICENOW | OTHER)?\`\n- \`ticketPlatformUrl\`, \`ticketApiToken\` (encrypted), \`ticketProjectKey\`\n\n## Kabul Kriterleri\n- [ ] Tüm alanlar schema + migration'da\n- [ ] \`ticketApiToken\` encrypted / maskeli\n- [ ] \`ticketPlatform\` seçilmişse diğer alanlar zorunlu`,
  },
  {
    title: '[S3-Customer] Azure Hedef Alanları — targetAreaPath, iterationPath, workItemType, tags',
    labels: ['section:3-customer', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 3 — Gap #4\n\n## Yapılacak\n- \`targetAreaPath\`, \`targetIterationPath\`, \`targetWorkItemType @default("Bug")\`, \`targetTags: String[]\`\n\n## Kabul Kriterleri\n- [ ] Alanlar schema + migration'da\n- [ ] CRUD endpoint'leri kapsıyor`,
  },
  {
    title: '[S3-Customer] GitHub Hedef Alanları — targetRepo, labels, projectId, milestone',
    labels: ['section:3-customer', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 3 — Gap #5\n\n## Yapılacak\n- \`targetRepo\`, \`targetLabels: String[]\`, \`targetProjectId\`, \`targetMilestone\`\n\n## Kabul Kriterleri\n- [ ] Alanlar schema + migration'da\n- [ ] \`sourceControlType = GITHUB\` ise \`targetRepo\` zorunlu`,
  },
  {
    title: '[S3-Customer] TicketMapping Entity — duplicate önleme tablosu',
    labels: ['section:3-customer', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 3 — Gap #6\n\n## Yapılacak\n- \`TicketMapping\`: \`externalTicketId\`, \`workItemId\`, \`customerId\`, \`platform\`, \`createdAt\`\n- Unique: \`(externalTicketId, customerId)\`\n\n## Kabul Kriterleri\n- [ ] Tablo oluşturuluyor\n- [ ] Unique ihlalinde sessizce atlar`,
  },
  {
    title: '[S3-Customer] n8n Ticket Workflow — Zendesk/Jira → Azure DevOps/GitHub',
    labels: ['section:3-customer', 'type:n8n', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 3 — Gap #7\n\n## Yapılacak\n- Polling/webhook → ticket çek → dönüştür → hedefe yaz → TicketMapping kaydı\n- Zendesk + Jira ayrı branch logic\n\n## Kabul Kriterleri\n- [ ] \`n8n-workflows/ticket-sync.json\` oluşturulmuş\n- [ ] Duplicate kontrol çalışıyor\n- [ ] Hata durumunda workflow pause + bildirim`,
  },
  {
    title: '[S3-Customer] environments Kaldır — Customer\'dan CPM\'e taşı',
    labels: ['section:3-customer', 'type:schema', 'type:migration', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 3 — Gap #8\n\n## Yapılacak\n- Customer schema'dan \`environments\` kaldır\n- CPM'e taşınacak (Section 4)\n\n## Kabul Kriterleri\n- [ ] \`environments\` Customer'dan kaldırıldı\n- [ ] API response'da artık yok`,
  },

  // ═══════════════════════════════════════════
  // SECTION 4 — CPM (Gap 1-14)
  // ═══════════════════════════════════════════

  {
    title: '[S4-CPM] İlişki Değişikliği — productVersionId → productId FK',
    labels: ['section:4-cpm', 'type:schema', 'type:migration', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 4 — Gap #1\n\n## Yapılacak\n- CPM \`productVersionId\` FK → \`productId\` FK (Product'a bağla)\n- Versiyon takibi ayrı entity'de (CustomerVersionTransition)\n- Migration: mevcut \`productVersionId\` → ProductVersion.productId\n\n## Kabul Kriterleri\n- [ ] CPM artık Product'a FK ile bağlı\n- [ ] Mevcut veriler migrate edilmiş\n- [ ] CRUD endpoint'leri güncellenmiş`,
  },
  {
    title: '[S4-CPM] Granular Abonelik — subscriptionLevel + Resolve Utility',
    labels: ['section:4-cpm', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 4 — Gap #2, #3\n\n## Yapılacak\n- \`subscriptionLevel: Enum (ALL | MODULE | SERVICE)\`\n- \`selectedModuleIds: Int[]\`, \`selectedServiceIds: Int[]\`\n- \`getEffectiveServices(cpm)\` backend utility\n\n## Kabul Kriterleri\n- [ ] Enum + ID array'ler schema'da\n- [ ] \`getEffectiveServices()\` her 3 level'da doğru sonuç\n- [ ] HelmChart / DLL paketleme bu utility'yi kullanıyor`,
  },
  {
    title: '[S4-CPM] Deployment Model — deploymentModel + hostingType enum\'ları',
    labels: ['section:4-cpm', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 4 — Gap #4\n\n## Yapılacak\n- \`deploymentModel: Enum (SAAS | IAAS | ON_PREMISE)\`\n- \`hostingType: Enum (CLOUD | ON_PREMISE | HYBRID)\`\n\n## Kabul Kriterleri\n- [ ] Enum'lar schema + migration'da\n- [ ] CRUD endpoint'leri güncellendi`,
  },
  {
    title: '[S4-CPM] HelmChart Alanları + Üretim API\'si',
    labels: ['section:4-cpm', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 4 — Gap #5, #6\n\n## Yapılacak\n- \`helmChartTemplateName\`, \`helmValuesOverrides\` (JSON), \`helmRepoUrl\`\n- HelmChart generation: efektif servisler → values.yaml → override merge → .tgz\n\n## Kabul Kriterleri\n- [ ] Alanlar schema + migration'da\n- [ ] \`POST /cpm/:id/generate-helm\` → .tgz döner\n- [ ] Override merge çalışıyor`,
  },
  {
    title: '[S4-CPM] DLL/Binary Paketleme API\'si',
    labels: ['section:4-cpm', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 4 — Gap #7\n\n## Yapılacak\n- Efektif servis → binaryArtifacts → folder + README → .zip\n- \`POST /cpm/:id/generate-package\`\n\n## Kabul Kriterleri\n- [ ] ZIP doğru yapıda\n- [ ] README servis + versiyon bilgisi içeriyor`,
  },
  {
    title: '[S4-CPM] Ortam Taşıma + CustomerServiceMapping Kaldır',
    labels: ['section:4-cpm', 'type:schema', 'type:migration', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 4 — Gap #8, #9\n\n## Yapılacak\n- \`Customer.environments\` → \`CustomerProductMapping.environments\` migration\n- \`CustomerServiceMapping\` tablosunu kaldır → abonelik CPM içinde\n\n## Kabul Kriterleri\n- [ ] \`environments\` CPM'de\n- [ ] \`CustomerServiceMapping\` tablosu kaldırıldı\n- [ ] Migration veri kaybı yaşatmıyor`,
  },
  {
    title: '[S4-CPM] artifactType Validasyonu + Git Referans API',
    labels: ['section:4-cpm', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 4 — Gap #11, #12\n\n## Yapılacak\n- CPM \`artifactType\` → Product \`supportedArtifactTypes\` içinde olmalı\n- \`GET /api/products/:id/git-references?type=branches|tags\`\n\n## Kabul Kriterleri\n- [ ] Geçersiz artifactType = 400\n- [ ] Git referans API branch + tag listesi döner`,
  },
  {
    title: '[S4-CPM] Code Sync Entegrasyonu + Son Sync Bilgisi',
    labels: ['section:4-cpm', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 4 — Gap #13, #14\n\n## Yapılacak\n- GIT_SYNC: Customer Dashboard Code Sync tetikleme butonu + API\n- \`lastSyncDate\`, \`lastSyncRef\` alanları CPM'e ekle\n\n## Kabul Kriterleri\n- [ ] \`POST /cpm/:id/trigger-sync\` çalışıyor\n- [ ] \`lastSyncDate\` + \`lastSyncRef\` güncelleniyor`,
  },
  {
    title: '[S4-CPM] Customer Dashboard Aksiyon Butonları (Frontend)',
    labels: ['section:4-cpm', 'type:frontend', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 4 — Gap #10\n\n## Yapılacak\n- \`artifactType\` + \`deploymentModel\` kombinasyonuna göre farklı butonlar\n- DOCKER+IAAS → Helm İndir + Deploy Onayla\n- BINARY → DLL Paketi İndir + FTP Gönder\n- GIT_SYNC → Sync Başlat\n\n## Kabul Kriterleri\n- [ ] 3+ kombinasyon doğru buton gösteriyor\n- [ ] Butonlar ilgili API'leri çağırıyor`,
  },

  // ═══════════════════════════════════════════
  // SECTION 5 — RELEASE CALENDAR & PRODUCT VERSION (Gap 1-19)
  // ═══════════════════════════════════════════

  {
    title: '[S5-Calendar] Durum Makinesi Yeniden Tasarımı — phase→status + migration',
    labels: ['section:5-calendar', 'type:schema', 'type:migration', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 5 — Gap #1, #19\n\n## Yapılacak\n- \`phase\` (6) → \`status\` (5): IN_DEVELOPMENT, TESTING, RELEASED, HOTFIX, DEPRECATED\n- Migration: DEVELOPMENT→IN_DEVELOPMENT, RC/STAGING→TESTING, PRODUCTION→RELEASED, ARCHIVED→DEPRECATED\n- Mevcut müşterilerin \`currentVersionId\` populate script\n\n## Kabul Kriterleri\n- [ ] Yeni enum schema'da\n- [ ] Migration doğru map ediyor\n- [ ] \`currentVersionId\` populate çalışıyor`,
  },
  {
    title: '[S5-Calendar] Tarih Alanı Refaktörü + actualReleaseDate',
    labels: ['section:5-calendar', 'type:schema', 'type:migration', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 5 — Gap #2, #3\n\n## Yapılacak\n- Rename: \`masterStartDate→devStartDate\`, \`testDate→testStartDate\`, \`targetDate→releaseDate\`\n- Kaldır: \`preProdDate\`\n- Yeni: \`actualReleaseDate\` — RELEASED geçişinde \`now()\`\n\n## Kabul Kriterleri\n- [ ] Migration rename doğru\n- [ ] \`actualReleaseDate\` RELEASED'da set ediliyor`,
  },
  {
    title: '[S5-Calendar] Semantik Versiyon + Concurrent Update Policy Validasyonu',
    labels: ['section:5-calendar', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 5 — Gap #4, #14\n\n## Yapılacak\n- \`/^v\\\\d+\\\\.\\\\d+\\\\.\\\\d+$/\` regex validasyonu\n- CVT endpoint'inde BLOCK modu: aynı gün + aynı product check\n\n## Kabul Kriterleri\n- [ ] Geçersiz versiyon = 400\n- [ ] BLOCK modunda aynı gün engelleme çalışıyor\n- [ ] WARN modunda uyarı + kayıt`,
  },
  {
    title: '[S5-Calendar] Tarih Bazlı Uyarı Sistemi + Takvim Filtreleri (Frontend)',
    labels: ['section:5-calendar', 'type:frontend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 5 — Gap #5, #12\n\n## Yapılacak\n- Versiyon listesinde tarih/durum uyarı ikonları + banner\n- Status filtre + "Kullanım dışını gizle" toggle\n\n## Kabul Kriterleri\n- [ ] 3+ uyarı senaryosu çalışıyor\n- [ ] Filtreler doğru\n- [ ] DEPRECATED gizlenebiliyor`,
  },
  {
    title: '[S5-Calendar] RELEASED Geçiş Kısıtı + Deprecation Akışı',
    labels: ['section:5-calendar', 'type:backend', 'type:frontend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 5 — Gap #6, #7, #8\n\n## Yapılacak\n- Takvimden "→ Yayınla" kaldır → Health Check'e yönlendir\n- \`GET /api/product-versions/:id/customer-count\`\n- Deprecation: müşteri >0 → onay dialog, geri dönüşsüz\n\n## Kabul Kriterleri\n- [ ] Takvimden doğrudan RELEASED geçişi yok\n- [ ] customer-count doğru sayı döner\n- [ ] Deprecation onay dialog müşteri sayısını gösteriyor`,
  },
  {
    title: '[S5-Calendar] GIT_SYNC Alanları — gitSyncRef + gitSyncRefType',
    labels: ['section:5-calendar', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 5 — Gap #9\n\n## Yapılacak\n- \`gitSyncRef: String?\`, \`gitSyncRefType: Enum (BRANCH | TAG)?\`\n- Product \`supportedArtifactTypes.includes('GIT_SYNC')\` ise koşullu görünür\n\n## Kabul Kriterleri\n- [ ] Alanlar schema + migration'da\n- [ ] Sadece GIT_SYNC ürünlerinde görünür/zorunlu`,
  },
  {
    title: '[S5-Calendar] CustomerVersionTransition Tablosu + CPM currentVersionId',
    labels: ['section:5-calendar', 'type:schema', 'type:backend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 5 — Gap #13, #15\n\n## Yapılacak\n- \`CustomerVersionTransition\`: customerId, productId, fromVersionId, toVersionId, scheduledDate, status, environment\n- Unique: (customerId, productId, toVersionId, environment)\n- CPM \`currentVersionId\` ekle — COMPLETED olunca otomatik güncelle\n\n## Kabul Kriterleri\n- [ ] Tablo + migration oluşturuldu\n- [ ] CRUD endpoint'leri çalışıyor\n- [ ] COMPLETED → currentVersionId güncelleniyor`,
  },
  {
    title: '[S5-Calendar] Product customerVisibleStatuses + Müşteri Takvim API',
    labels: ['section:5-calendar', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 5 — Gap #16, #17, #18\n\n## Yapılacak\n- \`Product.customerVisibleStatuses: String[] @default(["RELEASED"])\`\n- \`GET /api/customers/:customerId/products/:productId/versions\` — visibility filtresi\n- \`GET /api/products/:productId/transition-calendar?month=2026-03\` — doluluk\n\n## Kabul Kriterleri\n- [ ] customerVisibleStatuses Product edit'te konfigüre edilebilir\n- [ ] Müşteri API sadece görünür statüleri döner\n- [ ] Transition calendar doluluk bilgisi veriyor`,
  },
  {
    title: '[S5-Calendar] UX Tasarımı Güncelleme + Notification (n8n)',
    labels: ['section:5-calendar', 'type:ux', 'type:n8n', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 5 — Gap #10, #11\n\n## Yapılacak\n- \`designs/screens/release-calendar.md\` yeni status enum'una göre güncelle\n- n8n workflow: tarih tetikleyici → e-posta bildirimi\n\n## Kabul Kriterleri\n- [ ] UX dokümanı güncellenmiş\n- [ ] n8n workflow tasarlanmış`,
  },

  // ═══════════════════════════════════════════
  // SECTION 6 — RELEASE HEALTH CHECK (Gap 1-40)
  // ═══════════════════════════════════════════

  {
    title: '[S6-HC] Segmented Control + Sayfa V3 Yeniden Yazımı + Versiyon Seçici',
    labels: ['section:6-healthcheck', 'type:frontend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #1, #2, #3\n\n## Yapılacak\n- MUI ToggleButtonGroup — iki segment: Development / Readiness\n- ReleaseHealthCheckPage V2 → V3 tam yeniden yazım (Firebase/n8n kaldır)\n- Segment'e göre versiyon filtreleme: TESTING / IN_DEVELOPMENT\n- URL hash + localStorage persistence\n\n## Kabul Kriterleri\n- [ ] İki segment çalışıyor + URL'de yansıyor\n- [ ] 0 Firebase import\n- [ ] Versiyon seçici segment'e göre filtreli`,
  },
  {
    title: '[S6-HC] Sağlık Skoru Formülü + Son Yayınlanan Versiyon Query',
    labels: ['section:6-healthcheck', 'type:backend', 'type:frontend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #4, #5\n\n## Yapılacak\n- \`GET /api/product-versions?status=RELEASED&orderBy=actualReleaseDate&limit=1\`\n- Client-side sağlık skoru: 100 başlangıç, engel kartlarından puan kır\n\n## Kabul Kriterleri\n- [ ] Son yayınlanan versiyon endpoint doğru\n- [ ] Skor 0-100 arası, edge case'lerde mantıklı`,
  },
  {
    title: '[S6-HC] PR Yaş Uyarısı + İlerleme Çubuğu (Development)',
    labels: ['section:6-healthcheck', 'type:frontend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #6, #7\n\n## Yapılacak\n- PR açılma tarihi kontrolü: 7g sarı, 14+ kırmızı\n- WI tamamlanma oranı ilerleme çubuğu + yüzde\n\n## Kabul Kriterleri\n- [ ] PR yaş uyarısı görsel\n- [ ] İlerleme çubuğu gerçek veriye dayanıyor`,
  },
  {
    title: '[S6-HC] Teste Al + Release Yayınla Akışları',
    labels: ['section:6-healthcheck', 'type:backend', 'type:frontend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #8, #9\n\n## Yapılacak\n- "Teste Al" → PATCH status: TESTING + onay dialog\n- "Yayınla" → PATCH status: RELEASED + snapshot kaydet\n- Backend durum makinesi validasyonu\n\n## Kabul Kriterleri\n- [ ] IN_DEVELOPMENT → TESTING çalışıyor\n- [ ] TESTING → RELEASED + actualReleaseDate set\n- [ ] Geçersiz geçiş = 400`,
  },
  {
    title: '[S6-HC] Rol Bazlı Varsayılan Segment + UX Güncelleme',
    labels: ['section:6-healthcheck', 'type:frontend', 'type:ux', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #12, #13\n\n## Yapılacak\n- JWT rolüne göre ilk segment: Dev → Development, QA → Readiness\n- UX dokümanları revize\n\n## Kabul Kriterleri\n- [ ] Varsayılan segment rol bazlı doğru\n- [ ] UX dokümanları güncel`,
  },
  {
    title: '[S6-HC] Release Notes Skoru + Version-matched WI + Manuel WI Ekleme',
    labels: ['section:6-healthcheck', 'type:backend', 'type:frontend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #14, #15, #16\n\n## Yapılacak\n- Skor: −2/eksik release note\n- \`GET /api/tfs/work-items?plannedVersion={ver}\` — Planned Version filtresi\n- Manuel WI ekleme: \`POST /api/product-versions/{id}/work-items\`\n\n## Kabul Kriterleri\n- [ ] Eksik note skoru düşürüyor\n- [ ] WI'lar Planned Version'a göre filtreli\n- [ ] Manuel WI doğrulanıp kaydediliyor`,
  },
  {
    title: '[S6-HC] Azure Custom Fields + Release Notes Cascade + Müşteri Koruması',
    labels: ['section:6-healthcheck', 'type:backend', 'type:frontend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #17, #18, #19, #20, #22, #23\n\n## Yapılacak\n- 5 custom field: Planned Version, Customer Name, ReleaseNote Title/Description, ReleaseNoteNotRequired\n- Cascade: Azure dolu → ✅; boş+PR → 🤖 AI; boş+PR yok → ❌\n- WI'da Customer Name + gruplama\n- Müşteri + NotRequired=true → skor −5, engel\n\n## Kabul Kriterleri\n- [ ] 5 custom field parse ediliyor\n- [ ] Cascade 3 durumu doğru ayırt ediyor\n- [ ] Müşteri ihlali −5 puan + engel kartı`,
  },
  {
    title: '[S6-HC] AI Release Note Entegrasyonu',
    labels: ['section:6-healthcheck', 'type:backend', 'type:frontend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #21\n\n## Yapılacak\n- "🤖 AI Üret" tek + "🤖 Tümünü Üret" toplu → POST n8n fire-and-forget\n\n## Kabul Kriterleri\n- [ ] AI butonları n8n'e istek gönderiyor\n- [ ] Batch AI doğru WI'ları seçiyor`,
  },
  {
    title: '[S6-HC] Aksiyonel Release Note Altyapısı',
    labels: ['section:6-healthcheck', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #24\n\n## Yapılacak\n- \`actionRequired: Boolean\` + \`actionGuide: String?\` (markdown)\n- Business ekip için aksiyon rehberi\n\n## Kabul Kriterleri\n- [ ] Alanlar schema + API'da\n- [ ] Frontend'de aksiyon notu farklı ikon/renk\n- [ ] Markdown guide render`,
  },
  {
    title: '[S6-HC] Değişiklik 3-Kategori + Detay Model + Breaking Change + MCP Parser',
    labels: ['section:6-healthcheck', 'type:schema', 'type:backend', 'type:frontend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #25, #26, #27, #28, #29\n\n## Yapılacak\n- \`category: Enum (SCREEN_LAYOUT | API_CHANGE | ENTITY_TABLE)\`\n- Detail: changeAction, fieldName, oldValue, newValue, isBreaking\n- Auto-mark: silme/tip değişikliği → isBreaking=true\n- MCP response parser → system-changes tablosu\n- Manuel ekleme dialog\n\n## Kabul Kriterleri\n- [ ] 3 kategori frontend'de gruplanıyor\n- [ ] Breaking change otomatik işaretleniyor\n- [ ] MCP parse + manuel ekleme çalışıyor`,
  },
  {
    title: '[S6-HC] Todo Veri Modeli + CustomerTodoCompletion + Tekrarlayan',
    labels: ['section:6-healthcheck', 'type:schema', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #30, #31, #32\n\n## Yapılacak\n- \`ReleaseTodo\`: phase, responsibleTeam, priority, scope, customerIds[], isRecurring\n- \`CustomerTodoCompletion\`: todoId + customerId + versionId + completed\n- Yeni versiyon → isRecurring=true şablonları kopyala\n\n## Kabul Kriterleri\n- [ ] Her iki tablo schema'da\n- [ ] Müşteri bazında tamamlama çalışıyor\n- [ ] Tekrarlayan todolar kopyalanıyor`,
  },
  {
    title: '[S6-HC] Release Todo Ekranı + Rehber Upload + HC Özet',
    labels: ['section:6-healthcheck', 'type:frontend', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #33, #34, #35\n\n## Yapılacak\n- \`/release-todos\` CRUD + faz gruplama + şablon yönetimi\n- \`POST /api/release-todos/{id}/upload-guide\` (PDF/MD/DOCX)\n- Health Check'te read-only özet + "[Tümünü Gör]"\n\n## Kabul Kriterleri\n- [ ] Todo ekranı CRUD çalışıyor\n- [ ] Upload/download çalışıyor\n- [ ] HC'de özet görünüm var`,
  },
  {
    title: '[S6-HC] VersionPackage + Yayınla Wizard + GIT_SYNC Branch/Tag',
    labels: ['section:6-healthcheck', 'type:schema', 'type:backend', 'type:frontend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #36, #37, #38\n\n## Yapılacak\n- \`VersionPackage\` + \`VersionPackageItem\` tabloları\n- 3 adımlı wizard: özet → GIT_SYNC branch/tag → son onay\n- GIT_SYNC ise branch/tag zorunlu\n\n## Kabul Kriterleri\n- [ ] VersionPackage tabloları schema'da\n- [ ] 3 adımlı wizard çalışıyor\n- [ ] GIT_SYNC popup zorunlu görünüyor`,
  },
  {
    title: '[S6-HC] Değişen Servis Tespiti + Branch/Tag Autocomplete API',
    labels: ['section:6-healthcheck', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 6 — Gap #39, #40\n\n## Yapılacak\n- BoM \`lastProdRelease ↔ lastPrepRelease\` karşılaştırma → eşitse atla\n- \`GET /api/tfs/branches\` + \`GET /api/tfs/tags\` — MCP proxy\n\n## Kabul Kriterleri\n- [ ] Değişmeyen servisler pakete dahil edilmiyor\n- [ ] Branch/tag autocomplete'de gösteriliyor`,
  },

  // ═══════════════════════════════════════════
  // SECTION 7 — CUSTOMER DASHBOARD / PORTAL (Gap #41-55)
  // ═══════════════════════════════════════════

  {
    title: '[S7-Portal] CVT Environment Alanı + Sıralı Ortam Kontrolü',
    labels: ['section:7-customer-portal', 'type:schema', 'type:backend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 7 — Gap #41, #50\n\n## Yapılacak\n- CVT'ye \`environment\` alanı + unique constraint güncelle\n- Test→Pre-Prod→Prod sıralaması backend'de enforce\n\n## Kabul Kriterleri\n- [ ] \`environment\` alanı CVT'de\n- [ ] Sıra dışı onay reddediliyor`,
  },
  {
    title: '[S7-Portal] Customer Middleware — email domain → customerId',
    labels: ['section:7-customer-portal', 'type:backend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 7 — Gap #42\n\n## Yapılacak\n- JWT email → \`emailDomains\` eşleşmesi → \`req.customerUser\` set\n- Tüm \`/api/customer-*\` route'larda aktif\n\n## Kabul Kriterleri\n- [ ] Middleware doğru müşteriyi buluyor\n- [ ] Domain bulunamazsa 403\n- [ ] Tüm customer route'larda aktif`,
  },
  {
    title: '[S7-Portal] Ürün Kartı Status + Müşteri Takvim API',
    labels: ['section:7-customer-portal', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 7 — Gap #43, #44\n\n## Yapılacak\n- \`GET /api/customer-dashboard/summary\` — version karşılaştırma, todo, hotfix\n- \`GET /api/customer-dashboard/products/{id}/calendar\` — visibility filtresi\n\n## Kabul Kriterleri\n- [ ] Summary versiyon bilgisi döner\n- [ ] Calendar sadece görünür statüleri döner\n- [ ] Hotfix flag dönülüyor`,
  },
  {
    title: '[S7-Portal] HelmChart + Binary/DLL Generation Servisleri',
    labels: ['section:7-customer-portal', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 7 — Gap #45, #46\n\n## Yapılacak\n- HelmChart: efektif → values.yaml → override → .tgz\n- Binary: efektif → binaryArtifacts → folder + README → .zip\n\n## Kabul Kriterleri\n- [ ] HelmChart .tgz doğru yapıda\n- [ ] ZIP doğru artifact'ları içeriyor\n- [ ] Download stream olarak dönüyor`,
  },
  {
    title: '[S7-Portal] FTP Upload + Download Audit Trail',
    labels: ['section:7-customer-portal', 'type:backend', 'type:security', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 7 — Gap #47, #54\n\n## Yapılacak\n- SFTP dosya yükleme (ftpHost/ftpPath/ftpCredentials)\n- Audit: indirme olaylarını logla\n\n## Kabul Kriterleri\n- [ ] SFTP upload başarılı\n- [ ] Audit log çalışıyor`,
  },
  {
    title: '[S7-Portal] Docker IaaS Deploy + SaaS Güncelleme Talebi',
    labels: ['section:7-customer-portal', 'type:backend', 'type:n8n', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 7 — Gap #48, #49\n\n## Yapılacak\n- Docker IaaS: müşteri onayı → DevOps notification → deploy\n- SaaS: \`POST /api/customer-deployments/request-update\` → n8n → RM bildirim\n\n## Kabul Kriterleri\n- [ ] Onay endpoint çalışıyor\n- [ ] SaaS güncelleme talebi RM'e ulaşıyor`,
  },
  {
    title: '[S7-Portal] Cascade → currentVersionId + CustomerServiceVersion',
    labels: ['section:7-customer-portal', 'type:backend', 'type:schema', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 7 — Gap #51, #52\n\n## Yapılacak\n- Prod actual → CPM.currentVersionId güncelle\n- \`CustomerServiceVersion\`: customerId + serviceId → currentRelease, takenAt\n- VersionPackage oku → UPSERT transaction\n\n## Kabul Kriterleri\n- [ ] currentVersionId COMPLETED'da güncelleniyor\n- [ ] CustomerServiceVersion tablosu doğru\n- [ ] UPSERT transaction içinde`,
  },
  {
    title: '[S7-Portal] CPM FTP Alanları + Code Sync Yönlendirme',
    labels: ['section:7-customer-portal', 'type:schema', 'type:backend', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 7 — Gap #53, #55\n\n## Yapılacak\n- CPM: \`binaryDistributionMethod\`, \`ftpHost\`, \`ftpPath\`, \`ftpCredentials\` (encrypted)\n- Code Sync yönlendirme parametreleri\n\n## Kabul Kriterleri\n- [ ] FTP alanları schema + API'da\n- [ ] \`ftpCredentials\` encrypted / maskeli\n- [ ] Code Sync parametreleri iletiliyor`,
  },

  // ═══════════════════════════════════════════
  // SECTION 8 — SERVICE VERSION MATRIX (Gap #56-65)
  // ═══════════════════════════════════════════

  {
    title: '[S8-Matrix] CustomerServiceVersion + History Tabloları',
    labels: ['section:8-version-matrix', 'type:schema', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 8 — Gap #56, #57\n\n## Yapılacak\n- \`CustomerServiceVersion\`: customerId + serviceId (unique) → currentRelease, takenAt, previousRelease\n- \`CustomerServiceVersionHistory\`: append-only (fromRelease, toRelease, transitionDate)\n\n## Kabul Kriterleri\n- [ ] Her iki tablo schema + migration'da\n- [ ] Unique constraint çalışıyor\n- [ ] History yalnızca INSERT`,
  },
  {
    title: '[S8-Matrix] Geçiş Cascade Servisi',
    labels: ['section:8-version-matrix', 'type:backend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 8 — Gap #58\n\n## Yapılacak\n- Prod actual → VersionPackage oku → her servis UPSERT + history INSERT\n- Transaction içinde\n\n## Kabul Kriterleri\n- [ ] Cascade UPSERT + history doğru\n- [ ] VersionPackage boşsa hata vermiyor`,
  },
  {
    title: '[S8-Matrix] Matrix API Endpoint\'leri — pivot, filtre, sıralama',
    labels: ['section:8-version-matrix', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 8 — Gap #59\n\n## Yapılacak\n- 9 endpoint: pivot (müşteri×servis), filtreleme, sıralama\n- Pagination + performans\n\n## Kabul Kriterleri\n- [ ] Pivot: müşteri satır, servis sütun, değer = release\n- [ ] Filtreler doğru\n- [ ] 100+ müşteri × 50+ servis performanslı`,
  },
  {
    title: '[S8-Matrix] Stale Hesaplama + Dashboard Widget + Product Eşiği',
    labels: ['section:8-version-matrix', 'type:backend', 'type:frontend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 8 — Gap #60, #64, #65\n\n## Yapılacak\n- Kaç release geride hesaplama (cache'lenebilir)\n- \`GET /api/service-version-matrix/summary\` — güncel/eski/kritik\n- Product'a \`staleThresholdWarning\` (3) ve \`staleThresholdCritical\` (5)\n\n## Kabul Kriterleri\n- [ ] Stale hesaplama doğru\n- [ ] Summary widget dönüyor\n- [ ] Eşikler Product bazında konfigüre edilebilir`,
  },
  {
    title: '[S8-Matrix] Bootstrap + Export + Toplu Hatırlatma',
    labels: ['section:8-version-matrix', 'type:backend', 'type:n8n', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 8 — Gap #61, #62, #63\n\n## Yapılacak\n- Bootstrap: mevcut verileri tek seferlik import (idempotent)\n- Export: Matrix → Excel, Müşteri → PDF, Stale → CSV\n- n8n: stale müşterilere otomatik e-posta\n\n## Kabul Kriterleri\n- [ ] Bootstrap idempotent\n- [ ] Excel/PDF/CSV doğru üretiliyor\n- [ ] n8n workflow tasarlanmış`,
  },

  // ═══════════════════════════════════════════
  // SECTION 9 — TRANSITION ISSUES (Gap #66-80)
  // ═══════════════════════════════════════════

  {
    title: '[S9-Issues] TransitionIssue + Attachment + Comment Schema',
    labels: ['section:9-issues', 'type:schema', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 9 — Gap #66, #67, #68\n\n## Yapılacak\n- \`TransitionIssue\`: customerId, productId, versionId, serviceId?, title, severity, category, status, assignedTo, resolution\n- \`TransitionIssueAttachment\`: fileName, fileType, storagePath\n- \`TransitionIssueComment\`: authorId, authorSide (CUSTOMER|ORG), content\n\n## Kabul Kriterleri\n- [ ] 3 tablo schema + migration'da\n- [ ] CRUD endpoint'leri çalışıyor\n- [ ] Comment kronolojik sıralı`,
  },
  {
    title: '[S9-Issues] Dosya Yükleme Servisi + Issue ID Generator',
    labels: ['section:9-issues', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 9 — Gap #69, #70\n\n## Yapılacak\n- Multipart upload → S3/minio veya lokal. Uzantı whitelist + 10MB limit\n- Issue ID: \`IS-{autoIncrement}\`\n\n## Kabul Kriterleri\n- [ ] Upload/download çalışıyor\n- [ ] Yasak uzantı reddediliyor\n- [ ] Issue ID formatı doğru`,
  },
  {
    title: '[S9-Issues] Auto-Close + Escalation Cron Jobs',
    labels: ['section:9-issues', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 9 — Gap #71, #72\n\n## Yapılacak\n- Auto-close: RESOLVED + 7g → CLOSED (günlük cron)\n- Escalation: CRITICAL + 4h atanmamış → RM notification (saatlik)\n\n## Kabul Kriterleri\n- [ ] Auto-close cron çalışıyor\n- [ ] Escalation notification tetikleniyor\n- [ ] Scheduler konfigüre edilmiş`,
  },
  {
    title: '[S9-Issues] n8n Notification Workflow — issue bildirimleri',
    labels: ['section:9-issues', 'type:n8n', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 9 — Gap #73\n\n## Yapılacak\n- Yeni sorun, yeni yanıt, çözüm, escalation → e-posta + in-app bildirim\n\n## Kabul Kriterleri\n- [ ] 4 bildirim tipi tasarlanmış\n- [ ] E-posta template'leri oluşturulmuş`,
  },
  {
    title: '[S9-Issues] Kanban Drag & Drop (Frontend)',
    labels: ['section:9-issues', 'type:frontend', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 9 — Gap #74\n\n## Yapılacak\n- Kurum tarafı Kanban görünümü\n- Drag & drop ile status değiştirme\n\n## Kabul Kriterleri\n- [ ] Drag & drop çalışıyor\n- [ ] Status backend'e persist\n- [ ] Geçersiz geçiş engelleniyor`,
  },
  {
    title: '[S9-Issues] Kubernetes Entegrasyonu — Pod/Log/Events (Faz 2)',
    labels: ['section:9-issues', 'type:backend', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 9 — Gap #75, #76, #77\n\n## Yapılacak\n- CPM cluster alanları: clusterPlatform, clusterApiUrl, clusterApiToken, clusterNamespaces\n- @kubernetes/client-node: pod listeleme, log çekme, events\n- Pod → Service eşleştirme\n\n## Kabul Kriterleri\n- [ ] Pod listeleme çalışıyor\n- [ ] Log stream dönüyor\n- [ ] Pod → Service eşleştirme mantıklı`,
  },
  {
    title: '[S9-Issues] İstatistik API + Badge + Cross-Link',
    labels: ['section:9-issues', 'type:backend', 'type:frontend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 9 — Gap #78, #79, #80\n\n## Yapılacak\n- İstatistik: ort. çözüm süresi, kategori dağılımı, müşteri bazlı\n- Customer Dashboard'da açık sorun badge'i\n- Issue detayından cross-link'ler\n\n## Kabul Kriterleri\n- [ ] İstatistik endpoint doğru aggregate\n- [ ] Badge doğru sayı\n- [ ] Cross-link'ler doğru sayfalara`,
  },

  // ═══════════════════════════════════════════
  // SECTION 10 — RBAC (Gap #81-100)
  // ═══════════════════════════════════════════

  {
    title: '[S10-RBAC] UserRole Enum + UserProductAccess Tablosu',
    labels: ['section:10-rbac', 'type:schema', 'type:migration', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 10 — Gap #81, #82\n\n## Yapılacak\n- \`role\` string → enum: ADMIN, RELEASE_MANAGER, DEVELOPER, QA_ENGINEER, DEVOPS, VIEWER, PRODUCT_OWNER\n- \`UserProductAccess\` M:N: userId + productId\n- ADMIN → tüm ürünlere erişim\n\n## Kabul Kriterleri\n- [ ] Enum migration çalışıyor\n- [ ] UserProductAccess tablosu var\n- [ ] ADMIN bypass doğru`,
  },
  {
    title: '[S10-RBAC] CustomerUser + CustomerRole Tablosu',
    labels: ['section:10-rbac', 'type:schema', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 10 — Gap #83, #84\n\n## Yapılacak\n- \`CustomerUser\`: customerId, email, passwordHash, name, customerRole, isActive\n- \`CustomerRole\` enum: CUSTOMER_ADMIN, APP_ADMIN, APPROVER, BUSINESS_USER, PARTNER\n- bcrypt hash\n\n## Kabul Kriterleri\n- [ ] Tablo + enum schema'da\n- [ ] CRUD endpoint'leri var\n- [ ] Password bcrypt`,
  },
  {
    title: '[S10-RBAC] Birleşik Login — User + CustomerUser',
    labels: ['section:10-rbac', 'type:backend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 10 — Gap #85\n\n## Yapılacak\n- \`POST /api/auth/login\` → önce users, bulamazsa customer_users\n- JWT: \`{ type: 'ORG' }\` veya \`{ type: 'CUSTOMER' }\`\n- Cross-table email uniqueness\n\n## Kabul Kriterleri\n- [ ] Kurum kullanıcısı doğru giriş yapıyor\n- [ ] Müşteri kullanıcısı doğru giriş yapıyor\n- [ ] JWT type doğru set`,
  },
  {
    title: '[S10-RBAC] Auth Middleware\'ler — customerJWT, requireRole, filterProducts',
    labels: ['section:10-rbac', 'type:backend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 10 — Gap #86, #87, #88\n\n## Yapılacak\n- \`authenticateCustomerJWT\`: req.customerUser set\n- \`requireCustomerRole(roles[])\`\n- \`filterByUserProducts\`: ADMIN bypass\n\n## Kabul Kriterleri\n- [ ] Unauthorized = 401/403\n- [ ] Rol kontrolü doğru\n- [ ] ADMIN bypass çalışıyor`,
  },
  {
    title: '[S10-RBAC] Ürün Erişimi UI — kullanıcı drawer product checkbox',
    labels: ['section:10-rbac', 'type:frontend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 10 — Gap #89\n\n## Yapılacak\n- Kullanıcı drawer'ında ürün checkbox listesi\n- ADMIN → hepsi seçili + disabled\n\n## Kabul Kriterleri\n- [ ] Checkbox mevcut ürünleri gösteriyor\n- [ ] Kaydetme çalışıyor\n- [ ] ADMIN UI disabled`,
  },
  {
    title: '[S10-RBAC] Müşteri Kullanıcı Yönetimi — kurum + portal',
    labels: ['section:10-rbac', 'type:frontend', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 10 — Gap #90, #91\n\n## Yapılacak\n- Kurum: müşteri detayında kullanıcı CRUD\n- Portal: /customer-dashboard/users — CUSTOMER_ADMIN erişimli\n\n## Kabul Kriterleri\n- [ ] Kurum CRUD çalışıyor\n- [ ] Portal liste + davet + düzenleme\n- [ ] CUSTOMER_ADMIN dışı görmüyor`,
  },
  {
    title: '[S10-RBAC] Frontend Guards + hasPermission Utility',
    labels: ['section:10-rbac', 'type:frontend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 10 — Gap #92, #93, #94\n\n## Yapılacak\n- \`RoleGuard\`: kurum route guard\n- \`CustomerRoleGuard\`: müşteri route guard\n- \`hasPermission(role, permission)\` utility\n\n## Kabul Kriterleri\n- [ ] Yetkisiz → 404 veya redirect\n- [ ] hasPermission doğru boolean\n- [ ] Sidebar yetki bazlı gizleniyor`,
  },
  {
    title: '[S10-RBAC] E-posta Çakışma + Son ADMIN + Partner Domain',
    labels: ['section:10-rbac', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 10 — Gap #95, #96, #97\n\n## Yapılacak\n- Cross-table email uniqueness\n- Son ADMIN koruma: aktif ADMIN ≤ 1 ise engelle\n- PARTNER rolünde emailDomains atla\n\n## Kabul Kriterleri\n- [ ] Aynı e-posta iki tabloda → hata\n- [ ] Son ADMIN koruması çalışıyor\n- [ ] Partner farklı domain'den giriş yapabiliyor`,
  },
  {
    title: '[S10-RBAC] Davet E-postası + Yetki Audit Log',
    labels: ['section:10-rbac', 'type:backend', 'type:n8n', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 10 — Gap #98, #99\n\n## Yapılacak\n- Davet: şifre belirleme linki (24h token)\n- Audit: hassas yetki işlemleri logla\n\n## Kabul Kriterleri\n- [ ] Davet e-postası gönderiliyor\n- [ ] Süresi dolmuş token → hata\n- [ ] Audit log kaydı oluşuyor`,
  },
  {
    title: '[S10-RBAC] Sidebar Dinamik Render — rol bazlı menü',
    labels: ['section:10-rbac', 'type:frontend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 10 — Gap #100\n\n## Yapılacak\n- Sidebar.tsx rol bazlı gizle/göster\n- Müşteri kullanıcıları tamamen farklı menü\n\n## Kabul Kriterleri\n- [ ] VIEWER sadece dashboard + listeler\n- [ ] Müşteri kurum menülerini görmüyor\n- [ ] Performanslı render`,
  },

  // ═══════════════════════════════════════════
  // SECTION 11 — KURUM DASHBOARD & DORA (Gap #101-120)
  // ═══════════════════════════════════════════

  {
    title: '[S11-Dashboard] MetricSnapshot Tablosu',
    labels: ['section:11-dashboard', 'type:schema', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 11 — Gap #101\n\n## Yapılacak\n- \`MetricSnapshot\`: productId, metricType (enum), value, metadata (JSON), periodStart, periodEnd\n- MetricType: DEPLOYMENT_FREQUENCY, LEAD_TIME, CHANGE_FAILURE_RATE, MTTR, CODEBASE_DIVERGENCE, PIPELINE_SUCCESS\n\n## Kabul Kriterleri\n- [ ] Tablo schema + migration'da\n- [ ] Enum tanımlı`,
  },
  {
    title: '[S11-Dashboard] DORA Calculator + Lead Time Servisi',
    labels: ['section:11-dashboard', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 11 — Gap #102, #103\n\n## Yapılacak\n- Scheduled job: DF, LT, CFR, MTTR hesaplama\n- Lead Time: PR merge → actualReleaseDate farkı\n- DORA benchmark: Elite / High / Medium / Low\n\n## Kabul Kriterleri\n- [ ] 4 DORA metriği periyodik hesaplanıyor\n- [ ] Lead Time doğru\n- [ ] MetricSnapshot'a yazılıyor`,
  },
  {
    title: '[S11-Dashboard] Divergence Checker + Pipeline Stats Jobs',
    labels: ['section:11-dashboard', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 11 — Gap #104, #105\n\n## Yapılacak\n- Divergence: CustomerBranch + Git API → behind/ahead (daily)\n- Pipeline: Azure DevOps Build API → success/failure (6 saatlik)\n\n## Kabul Kriterleri\n- [ ] Behind/ahead doğru\n- [ ] Pipeline oranı MetricSnapshot'a yazılıyor`,
  },
  {
    title: '[S11-Dashboard] Config Diff Analyzer',
    labels: ['section:11-dashboard', 'type:backend', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 11 — Gap #106\n\n## Yapılacak\n- CPM.helmValuesOverrides JSON key analizi → farklılık skoru\n- Config drift tespiti\n\n## Kabul Kriterleri\n- [ ] Farklılık skoru hesaplanıyor\n- [ ] Aykırı müşteriler belirlenebiliyor`,
  },
  {
    title: '[S11-Dashboard] Dashboard API\'leri — Summary + DORA + Awareness + Highlights',
    labels: ['section:11-dashboard', 'type:backend', 'priority:P0'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 11 — Gap #107, #108, #109, #110\n\n## Yapılacak\n- \`GET /api/dashboard/summary\` — 5 metrik kartı\n- \`GET /api/dashboard/dora\` + \`/dora/trend\`\n- \`GET /api/dashboard/awareness\` + detay endpoint'leri\n- Highlights engine: rule-based max 5 madde\n\n## Kabul Kriterleri\n- [ ] Summary 5 kart tek endpoint'te\n- [ ] DORA trend zaman serisi\n- [ ] Highlights en kritik 5 maddeyi seçiyor`,
  },
  {
    title: '[S11-Dashboard] Aktif Release Tablosu + Transition Detail',
    labels: ['section:11-dashboard', 'type:backend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 11 — Gap #111, #112\n\n## Yapılacak\n- Aktif release'e "Müşteri Geçişi" sütunu — CVT aggregate\n- \`GET /api/dashboard/version-transition/:versionId\`\n\n## Kabul Kriterleri\n- [ ] Transition sütunu doğru aggregate\n- [ ] Detay endpoint müşteri listesi döner`,
  },
  {
    title: '[S11-Dashboard] Frontend DORA + Awareness Sections',
    labels: ['section:11-dashboard', 'type:frontend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 11 — Gap #113, #114\n\n## Yapılacak\n- 4 DoraMetricCard + DoraTrendChart (renk: Elite=green, Low=red)\n- 3 Awareness skor kartı + drill-down drawer\n\n## Kabul Kriterleri\n- [ ] DORA kartları doğru renk kodlaması\n- [ ] Trend chart Recharts/Nivo\n- [ ] Awareness drill-down detay gösteriyor`,
  },
  {
    title: '[S11-Dashboard] Dönem + Ürün Multi-Select Filtreleri',
    labels: ['section:11-dashboard', 'type:frontend', 'priority:P1'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 11 — Gap #115, #116\n\n## Yapılacak\n- 7g/30g/90g/6ay/1y/özel dropdown\n- Çoklu ürün seçimi → aggregate\n\n## Kabul Kriterleri\n- [ ] Dönem değiştiğinde veriler yenileniyor\n- [ ] Multi-select doğru çalışıyor\n- [ ] "Tümü" seçeneği mevcut`,
  },
  {
    title: '[S11-Dashboard] UX + DORA Eşikleri + Git/MCP Endpoint\'ler',
    labels: ['section:11-dashboard', 'type:ux', 'type:backend', 'priority:P2'],
    body: `## Bağlam\nDESIGN_DOCUMENT.md § 11 — Gap #117, #118, #119, #120\n\n## Yapılacak\n- \`designs/screens/home-dashboard.md\` revize\n- Settings: DORA benchmark eşikleri konfigürasyonu + seed\n- \`GET /api/tfs/compare\` — behind/ahead (MCP proxy)\n- \`GET /api/tfs/builds\` — pipeline run (MCP proxy)\n\n## Kabul Kriterleri\n- [ ] UX dokümanı güncel\n- [ ] DORA eşikleri Settings'den değiştirilebilir\n- [ ] MCP proxy endpoint'leri çalışıyor`,
  },
];

// ──────────────────────────────────────────────
// GitHub API
// ──────────────────────────────────────────────

function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'ReleaseHub360-IssueCreator',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`${res.statusCode}: ${parsed.message || data}`));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ──────────────────────────────────────────────
// Ana akış
// ──────────────────────────────────────────────

async function run() {
  // 1. Bağlantı testi
  console.log('🔍 Repo kontrol ediliyor...');
  try {
    const repo = await githubRequest('GET', `/repos/${OWNER}/${REPO}`);
    console.log(`✅ Repo bulundu: ${repo.full_name}\n`);
  } catch (err) {
    console.error(`❌ Repo erişim hatası: ${err.message}`);
    console.error(`   Kontrol et: OWNER="${OWNER}", REPO="${REPO}"`);
    process.exit(1);
  }

  // 2. Label'lar
  console.log('🏷  Label\'lar oluşturuluyor...');
  const existingLabels = await githubRequest('GET', `/repos/${OWNER}/${REPO}/labels?per_page=100`);
  const existingNames = new Set(existingLabels.map(l => l.name));

  for (const label of LABELS) {
    if (existingNames.has(label.name)) {
      console.log(`   ⏭  Mevcut: ${label.name}`);
    } else {
      try {
        await githubRequest('POST', `/repos/${OWNER}/${REPO}/labels`, label);
        console.log(`   ✅ Oluşturuldu: ${label.name}`);
        await sleep(300);
      } catch (err) {
        console.warn(`   ⚠️  Label hatası (${label.name}): ${err.message}`);
      }
    }
  }

  // 3. Mevcut issue başlıkları (tüm sayfalar — duplicate önleme)
  console.log('\n📋 Mevcut issue\'lar kontrol ediliyor...');
  const existingTitles = new Set();
  let page = 1;
  while (true) {
    const batch = await githubRequest('GET', `/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&page=${page}`);
    if (batch.length === 0) break;
    batch.forEach(i => existingTitles.add(i.title));
    if (batch.length < 100) break;
    page++;
  }
  console.log(`   ${existingTitles.size} mevcut issue bulundu`);

  // 4. Issue'ları oluştur
  console.log(`\n📌 ${ISSUES.length} issue oluşturuluyor...\n`);
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const issue of ISSUES) {
    if (existingTitles.has(issue.title)) {
      console.log(`   ⏭  Mevcut: ${issue.title.substring(0, 70)}...`);
      skipped++;
      continue;
    }
    try {
      const result = await githubRequest('POST', `/repos/${OWNER}/${REPO}/issues`, {
        title: issue.title,
        body: issue.body,
        labels: issue.labels,
      });
      console.log(`   ✅ #${result.number}: ${issue.title.substring(0, 65)}`);
      created++;
      await sleep(600); // rate limit koruma
    } catch (err) {
      console.error(`   ❌ Hata (${issue.title.substring(0, 50)}): ${err.message}`);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`✅ Tamamlandı: ${created} oluşturuldu, ${skipped} atlandı, ${failed} hata`);
  console.log(`📊 Toplam tanımlı: ${ISSUES.length} issue`);
  console.log(`🔗 https://github.com/${OWNER}/${REPO}/issues`);
  console.log(`─────────────────────────────────────────\n`);
}

run().catch(err => {
  console.error('💥 Beklenmeyen hata:', err);
  process.exit(1);
});
