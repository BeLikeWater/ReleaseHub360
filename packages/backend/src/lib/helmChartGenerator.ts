/**
 * O-01: Helm Chart Generator
 * Generates a tar.gz archive with Helm chart templates for a given product version.
 */
import archiver from 'archiver';
import { PassThrough } from 'stream';

export interface HelmChartOptions {
  chartName: string;        // e.g. "my-app"
  chartVersion: string;     // e.g. "1.2.3"
  appVersion: string;       // e.g. "1.2.3"
  imageRepository: string;  // e.g. "registry.example.com/my-app"
  imageTag: string;         // e.g. "1.2.3"
  namespace?: string;       // e.g. "production"
  replicas?: number;
  resources?: {
    requests?: { cpu?: string; memory?: string };
    limits?: { cpu?: string; memory?: string };
  };
}

/**
 * Builds a Helm chart as a tar.gz Buffer in memory.
 * Structure: {chartName}/Chart.yaml + values.yaml + templates/deployment.yaml + service.yaml
 */
export function generateHelmChart(opts: HelmChartOptions): Promise<Buffer> {
  const {
    chartName,
    chartVersion,
    appVersion,
    imageRepository,
    imageTag,
    namespace = 'default',
    replicas = 1,
    resources = {
      requests: { cpu: '100m', memory: '128Mi' },
      limits: { cpu: '500m', memory: '512Mi' },
    },
  } = opts;

  const chartYaml = `apiVersion: v2
name: ${chartName}
description: A Helm chart for ${chartName} v${appVersion}
type: application
version: ${chartVersion}
appVersion: "${appVersion}"
`;

  const valuesYaml = `replicaCount: ${replicas}

image:
  repository: ${imageRepository}
  pullPolicy: IfNotPresent
  tag: "${imageTag}"

nameOverride: ""
fullnameOverride: ""

namespace: ${namespace}

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

resources:
  requests:
    cpu: "${resources.requests?.cpu ?? '100m'}"
    memory: "${resources.requests?.memory ?? '128Mi'}"
  limits:
    cpu: "${resources.limits?.cpu ?? '500m'}"
    memory: "${resources.limits?.memory ?? '512Mi'}"

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 5
  targetCPUUtilizationPercentage: 80
`;

  const deploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${chartName}.fullname" . }}
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "${chartName}.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "${chartName}.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "${chartName}.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
              protocol: TCP
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
`;

  const serviceYaml = `apiVersion: v1
kind: Service
metadata:
  name: {{ include "${chartName}.fullname" . }}
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "${chartName}.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "${chartName}.selectorLabels" . | nindent 4 }}
`;

  const helpersYaml = `{{/*
Expand the name of the chart.
*/}}
{{- define "${chartName}.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "${chartName}.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s" $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "${chartName}.labels" -}}
helm.sh/chart: {{ include "${chartName}.chart" . }}
{{ include "${chartName}.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "${chartName}.selectorLabels" -}}
app.kubernetes.io/name: {{ include "${chartName}.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Chart label
*/}}
{{- define "${chartName}.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}
`;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const pass = new PassThrough();

    pass.on('data', (chunk: Buffer) => chunks.push(chunk));
    pass.on('end', () => resolve(Buffer.concat(chunks)));
    pass.on('error', reject);

    const archive = archiver('tar', { gzip: true });
    archive.on('error', reject);
    archive.pipe(pass);

    // Add chart files
    archive.append(chartYaml, { name: `${chartName}/Chart.yaml` });
    archive.append(valuesYaml, { name: `${chartName}/values.yaml` });
    archive.append(deploymentYaml, { name: `${chartName}/templates/deployment.yaml` });
    archive.append(serviceYaml, { name: `${chartName}/templates/service.yaml` });
    archive.append(helpersYaml, { name: `${chartName}/templates/_helpers.tpl` });

    archive.finalize();
  });
}
