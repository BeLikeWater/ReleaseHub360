// ═══════════════════════════════════════════════
// ReleaseHub360 — Shared Frontend Types
// Prisma model'lerle 1:1 eşleşir. Faz ilerledikçe genişler.
// ═══════════════════════════════════════════════

// ── Auth ──
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  userType: 'ORG' | 'CUSTOMER';
  customerId?: string;
  customerName?: string;
}

// ── Enums ──
export type SourceControlType = 'AZURE' | 'GITHUB';
export type ArtifactType = 'DOCKER' | 'BINARY' | 'GIT_SYNC';
export type ConcurrentUpdatePolicy = 'WARN' | 'BLOCK';
export type ContainerPlatform = 'RANCHER' | 'OPENSHIFT' | 'KUBERNETES' | 'DOCKER_COMPOSE';

// ── Product ──
export interface Product {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Source control
  sourceControlType: SourceControlType | null;
  azureOrg: string | null;
  azurePat: string | null;           // masked in API responses
  azureProject: string | null;
  azureReleaseProject: string | null;
  githubOwner: string | null;
  githubToken: string | null;        // masked in API responses

  // Artifact & branching
  supportedArtifactTypes: ArtifactType[];
  usesReleaseBranches: boolean;
  concurrentUpdatePolicy: ConcurrentUpdatePolicy | null;

  // Visibility
  customerVisibleStatuses: string[];

  // Deprecated — geriye uyumluluk
  repoUrl: string | null;
  deploymentType: string | null;
  serviceImageName: string | null;
  pmType: string | null;

  // Relation counts (from include)
  _count?: { services: number; versions: number };
}

// ── Service ──
export interface Service {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  port: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Module
  moduleId: string | null;

  // Repo & Pipeline
  repoName: string | null;
  pipelineName: string | null;
  releaseName: string | null;
  releaseProject: string | null;

  // Stage config (ikili stage)
  prodStageName: string | null;
  prepStageName: string | null;
  prodStageId: string | null;
  prepStageId: string | null;

  // Release tracking
  lastProdReleaseName: string | null;
  lastProdReleaseDate: string | null;
  lastPrepReleaseName: string | null;
  lastPrepReleaseDate: string | null;

  // Docker
  dockerImageName: string | null;
  containerPlatform: ContainerPlatform | null;
  platformUrl: string | null;
  platformToken: string | null;      // masked in API responses
  clusterName: string | null;
  namespace: string | null;
  workloadName: string | null;

  // Binary
  binaryArtifacts: string[];
  deploymentTargets: unknown;

  // Deprecated
  repoUrl: string | null;
  serviceImageName: string | null;
  currentVersion: string | null;
  currentVersionCreatedAt: string | null;
  releaseStage: string | null;
  lastReleaseName: string | null;
}

// ── Api ──
export interface Api {
  id: string;
  productId: string;
  name: string;
  path: string;
  method: string;
  description: string | null;
  isBreaking: boolean;
  isDeprecated: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Module & ModuleGroup ──
export interface ModuleGroup {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  modules?: Module[];
}

export interface Module {
  id: string;
  productId: string;
  moduleGroupId: string | null;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── ProductVersion ──
export type VersionPhase =
  | 'PLANNED'
  | 'DEVELOPMENT'
  | 'RC'
  | 'STAGING'
  | 'PRODUCTION'
  | 'ARCHIVED';

export interface ProductVersion {
  id: string;
  productId: string;
  version: string;
  phase: VersionPhase;
  targetDate: string | null;
  releaseDate: string | null;
  devStartDate: string | null;
  testStartDate: string | null;
  preProdDate: string | null;
  deprecatedAt: string | null;
  description: string | null;
  notesPublished: boolean;
  isHotfix: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  product?: Pick<Product, 'id' | 'name'>;
}

// ── CustomerVersionTransition ──
export interface CustomerVersionTransition {
  id: string;
  customerId: string;
  fromVersionId: string | null;
  toVersionId: string;
  transitionDate: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Pick<Customer, 'id' | 'name' | 'code'>;
  fromVersion?: Pick<ProductVersion, 'id' | 'version' | 'phase'> & { product: Pick<Product, 'id' | 'name'> };
  toVersion?: Pick<ProductVersion, 'id' | 'version' | 'phase'> & { product: Pick<Product, 'id' | 'name'> };
}

// ── VersionPackage ──
export type VersionPackageType = 'HELM_CHART' | 'DOCKER_IMAGE' | 'BINARY' | 'GIT_ARCHIVE';

export interface VersionPackage {
  id: string;
  productVersionId: string;
  packageType: VersionPackageType;
  name: string;
  version: string;
  description: string | null;
  artifactUrl: string | null;
  helmRepoUrl: string | null;
  helmChartName: string | null;
  imageRegistry: string | null;
  imageName: string | null;
  imageTag: string | null;
  sizeBytes: number | null;
  checksum: string | null;
  downloadCount: number;
  lastDownloadedAt: string | null;
  publishedBy: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  productVersion?: Pick<ProductVersion, 'id' | 'version'> & { product: Pick<Product, 'id' | 'name'> };
}

// ── Customer ──
export type TicketPlatform = 'AZURE' | 'GITHUB' | 'JIRA' | 'NONE';

export interface Customer {
  id: string;
  name: string;
  code: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  approverEmails: string[];
  azureReleaseTemplate: string | null;
  devOpsEmails: string[];
  /** @deprecated use emailDomains */
  emailDomain: string | null;
  emailDomains: string[];
  environments: string[];
  supportSuffix: string | null;
  tenantName: string | null;
  // Ticket Platform
  ticketPlatform: TicketPlatform | null;
  ticketBaseUrl: string | null;
  ticketApiToken: string | null;
  ticketProjectKey: string | null;
  // Azure Ticket Targets
  azureTargetAreaPath: string | null;
  azureTargetIterationPath: string | null;
  azureTargetWorkItemType: string | null;
  azureTargetTags: string[];
  // GitHub Ticket Targets
  githubTargetRepo: string | null;
  githubTargetLabels: string[];
  createdAt: string;
  updatedAt: string;
  _count?: { productMappings: number };
}

// ── CustomerProductMapping ──
export type SubscriptionLevel = 'FULL' | 'MODULE_GROUP' | 'MODULE' | 'SERVICE';
export type CpmArtifactType = 'DOCKER' | 'BINARY' | 'GIT_SYNC';
export type CpmDeploymentModel = 'SAAS' | 'ON_PREM';
export type CpmHostingType = 'IAAS' | 'SELF_HOSTED';

export interface CustomerProductMapping {
  id: string;
  customerId: string;
  productVersionId: string;
  productId?: string;
  branch: string | null;
  environment: string | null;
  notes: string | null;
  // License
  licensedModuleGroupIds: string[];
  licensedModuleIds: string[];
  licensedServiceIds: string[];
  licenseTags: string[];
  // Artifact & Deployment
  artifactType: CpmArtifactType | null;
  deploymentModel: CpmDeploymentModel | null;
  hostingType: CpmHostingType | null;
  // Helm
  helmChartTemplateName: string | null;
  helmValuesOverrides: Record<string, unknown> | null;
  helmRepoUrl: string | null;
  // Environments
  environments: string[];
  createdAt: string;
  updatedAt: string;
  customer?: Pick<Customer, 'id' | 'name' | 'code'>;
  productVersion?: ProductVersion & { product: Pick<Product, 'id' | 'name'> };
}

// ── CustomerBranch ──
export interface CustomerBranch {
  id: string;
  customerId: string;
  customerName?: string;
  branchName: string;
  description: string | null;
  baseBranch: string | null;
  isActive: boolean;
  repoName: string | null;
  repoUrl: string | null;
  azurePat: string | null;
  azureOrg: string | null;
  azureProject: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── ReleaseNote ──
export interface ReleaseNote {
  id: string;
  productVersionId: string;
  category: string;
  title: string;
  description: string | null;
  isBreaking: boolean;
  sortOrder: number;
  workitemId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── SystemChange ──
export interface SystemChange {
  id: string;
  productVersionId: string;
  apiPath: string | null;
  changeType: string;
  title: string;
  description: string | null;
  previousValue: string | null;
  newValue: string | null;
  isBreaking: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── ReleaseTodo ──
export interface ReleaseTodo {
  id: string;
  productVersionId: string | null;
  templateId: string | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  isCompleted: boolean;
  completedBy: string | null;
  completedAt: string | null;
  sortOrder: number;
  isTemplate: boolean;
  timing: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── HotfixRequest ──
export interface HotfixRequest {
  id: string;
  productVersionId: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  prUrl: string | null;
  branchName: string | null;
  customerImpact: string | null;
  requestedBy: string | null;
  approvals: unknown;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── UrgentChange ──
export interface UrgentChange {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  affectedProducts: unknown;
  workaroundExists: boolean;
  customerImpact: string | null;
  requestedBy: string | null;
  comments: unknown;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Notification ──
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  linkUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ── Setting ──
export interface Setting {
  id: string;
  key: string;
  value: string;
  category: string;
  isSensitive: boolean;
  updatedAt: string;
}

// ── WorkflowHistory ──
export interface WorkflowHistory {
  id: string;
  workflowType: string;
  n8nWorkflowId: string | null;
  triggeredBy: string | null;
  status: string;
  payload: unknown;
  result: unknown;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
}

// ── ServiceReleaseSnapshot ──
export interface ServiceReleaseSnapshot {
  id: string;
  serviceId: string;
  productVersionId: string;
  releaseName: string | null;
  releasedAt: string | null;
  prIds: unknown;
  publishedBy: string | null;
  notes: string | null;
  createdAt: string;
}

// ── SyncHistory ──
export interface SyncHistory {
  id: string;
  customerBranchId: string;
  sourceBranch: string;
  targetBranch: string;
  status: string;
  conflictDetails: unknown;
  resolvedBy: string | null;
  triggeredBy: string | null;
  completedAt: string | null;
  mergeCommitId: string | null;
  payload: unknown;
  syncBranchName: string | null;
  createdAt: string;
}

// ── API Response Wrappers ──
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
