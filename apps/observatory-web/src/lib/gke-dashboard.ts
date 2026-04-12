import { access, readFile } from "node:fs/promises";
import path from "node:path";
import bundledSnapshot from "../data/gke-snapshot.sample.json";

export interface ClusterSummaryCard {
  label: string;
  value: string;
  detail: string;
}

export interface PressureCard {
  label: string;
  percentage: number;
  value: string;
  tone: "healthy" | "warning" | "critical";
}

export interface ConsumerRow {
  namespace: string;
  name: string;
  kind: string;
  usage: string;
  share: string;
  tone: "healthy" | "warning" | "critical";
}

export interface CapacityRow {
  label: string;
  allocatable: string;
  usage: string;
  requests: string;
  limits: string;
  usagePercentage: number;
  requestPercentage: number;
  limitPercentage: number;
}

export type CostSource = "heuristic" | "opencost";
export type EfficiencyConfidence = "high" | "medium" | "low";
export type RightsizingHint = "Reduce requests" | "Raise requests" | "Observe";

export interface EfficiencyOverviewSignal {
  title: string;
  value: string;
  detail: string;
  tone: "healthy" | "warning" | "critical";
  href: string;
  actionLabel: string;
}

export interface NamespaceEfficiencySummary {
  requestEfficiencyLabel: string;
  idleAllocationEstimate: string;
  overRequestedWorkloads: number;
  rightsizingCandidate: string;
  efficiencyConfidence: EfficiencyConfidence;
  costSource: CostSource;
  estimatedMonthlyCost: number | null;
  actualMonthlyCost: number | null;
  idleMonthlyCost: number | null;
}

export interface WorkloadRow {
  id: string;
  namespace: string;
  name: string;
  kind: string;
  replicas: number;
  node: string;
  cpuUsage: string;
  memoryUsage: string;
  gpuUsage: string;
  cpuRequests: string;
  memoryRequests: string;
  cpuLimits: string;
  memoryLimits: string;
  efficiency: "Healthy" | "Watch" | "Hot";
  pressurePercentage: number;
  events: NodeEventRow[];
  efficiencyScore: number;
  efficiencyConfidence: EfficiencyConfidence;
  overRequested: boolean;
  underRequestRisk: boolean;
  rightsizingHint: RightsizingHint;
  idleAllocationEstimate: string;
  costSource: CostSource;
  estimatedMonthlyCost: number | null;
  actualMonthlyCost: number | null;
  idleMonthlyCost: number | null;
  priorityScore: number;
}

export interface CollectionIssue {
  source: string;
  severity: "info" | "warning" | "critical";
  message: string;
  detail?: string;
}

export interface PodContainerRow {
  name: string;
  ready: boolean;
  restartCount: number;
  state: string;
  reason?: string;
  cpuRequest: string;
  cpuLimit: string;
  memoryRequest: string;
  memoryLimit: string;
}

export interface PodRow {
  id: string;
  namespace: string;
  workloadId: string;
  workloadName: string;
  workloadKind: string;
  name: string;
  node: string;
  status: string;
  reason: string;
  restartCount: number;
  readyContainers: number;
  totalContainers: number;
  cpuUsage: string;
  memoryUsage: string;
  gpuUsage: string;
  containers: PodContainerRow[];
}

export interface WorkloadAlert {
  label: string;
  tone: "healthy" | "warning" | "critical";
}

export interface NodeConditionRow {
  type: string;
  status: string;
  reason?: string;
  message?: string;
}

export interface NodeTaintRow {
  key: string;
  value?: string;
  effect: string;
}

export interface NodeEventRow {
  type: string;
  reason: string;
  message: string;
  count: number;
  lastSeen: string;
}

export interface HistoryTrendCard {
  label: string;
  values: number[];
  latest: string;
  delta: string;
  direction: "up" | "down" | "flat";
  tone: "healthy" | "warning" | "critical";
}

export interface HistoryDriftRow {
  label: string;
  value: string;
  detail: string;
  tone: "healthy" | "warning" | "critical";
}

export interface HistoryAnomaly {
  title: string;
  detail: string;
  tone: "healthy" | "warning" | "critical";
}

export interface HistorySnapshotCard {
  capturedAt: string;
  label: string;
  collectorStatus: "complete" | "partial" | "failed";
  cpuLabel: string;
  memoryLabel: string;
  restartsLabel: string;
  tone: "healthy" | "warning" | "critical";
}

export interface WorkloadPodGroup {
  node: string;
  healthyCount: number;
  attentionCount: number;
  pods: PodRow[];
}

export interface WorkloadDetail {
  workload: WorkloadRow;
  pods: PodRow[];
  nodeSpread: string[];
  alerts: WorkloadAlert[];
  hotspotPod?: PodRow;
  podGroups: WorkloadPodGroup[];
  summary: {
    primaryNode: string;
    podCount: number;
    headroomLabel: string;
    readyLabel: string;
    restartLabel: string;
    statusLabel: string;
    hotspotLabel?: string;
    healthTone: "healthy" | "warning" | "critical";
  };
}

export interface NodeWorkloadGroup {
  workload: WorkloadRow;
  pods: PodRow[];
  healthyCount: number;
  attentionCount: number;
  restartCount: number;
  hotspotPod?: PodRow;
}

export interface NodeDetail {
  node: NodeUsageRow;
  workloads: WorkloadRow[];
  workloadGroups: NodeWorkloadGroup[];
  pods: PodRow[];
  namespaces: string[];
  alerts: WorkloadAlert[];
  hotspotPod?: PodRow;
  hotspotWorkload?: WorkloadRow;
  summary: {
    workloadCountLabel: string;
    podCountLabel: string;
    readyLabel: string;
    restartLabel: string;
    primaryNamespace: string;
    dominantWorkload: string;
    statusLabel: string;
    healthTone: "healthy" | "warning" | "critical";
  };
}

export interface NamespaceDetail {
  namespace: NamespaceUsageRow;
  workloads: WorkloadRow[];
  topWorkloads: WorkloadRow[];
  pods: PodRow[];
  nodes: NodeUsageRow[];
  alerts: WorkloadAlert[];
  events: NodeEventRow[];
  summary: {
    workloadCountLabel: string;
    podCountLabel: string;
    nodeCountLabel: string;
    busiestNode: string;
    topWorkload: string;
    statusLabel: string;
    healthTone: "healthy" | "warning" | "critical";
  };
}

export interface NodeUsageRow {
  name: string;
  cpu: string;
  memory: string;
  gpu: string;
  status: string;
  cpuPercentage: number;
  memoryPercentage: number;
  gpuPercentage: number;
  topWorkload?: string;
  conditions: NodeConditionRow[];
  taints: NodeTaintRow[];
  events: NodeEventRow[];
}

export interface NamespaceUsageRow {
  name: string;
  cpu: string;
  memory: string;
  gpu: string;
  topWorkload: string;
  pressurePercentage: number;
  alerts: WorkloadAlert[];
  events: NodeEventRow[];
  efficiency: NamespaceEfficiencySummary;
}

interface MetricSnapshot {
  allocatable: number;
  used: number;
  unit: string;
  model?: string;
}

interface WorkloadMetricSnapshot {
  cpu: number;
  memory: number;
  gpu: number;
}

interface WorkloadSnapshot {
  namespace: string;
  name: string;
  kind: string;
  replicas: number;
  node: string;
  usage: WorkloadMetricSnapshot;
  requests: WorkloadMetricSnapshot;
  limits: WorkloadMetricSnapshot;
  events?: NodeEventRow[];
}

interface PodSnapshot {
  namespace: string;
  workloadName: string;
  workloadKind: string;
  name: string;
  node: string;
  status: string;
  reason?: string;
  restartCount?: number;
  readyContainers?: number;
  totalContainers?: number;
  containers?: {
    name: string;
    ready: boolean;
    restartCount: number;
    state: string;
    reason?: string;
    requests: WorkloadMetricSnapshot;
    limits: WorkloadMetricSnapshot;
  }[];
  usage: WorkloadMetricSnapshot;
}

interface NodeSnapshot {
  name: string;
  status: string;
  cpu: MetricSnapshot;
  memory: MetricSnapshot;
  gpu?: MetricSnapshot;
  conditions?: NodeConditionRow[];
  taints?: NodeTaintRow[];
  events?: NodeEventRow[];
}

interface NamespaceSnapshot {
  name: string;
  cpuUsed: number;
  memoryUsed: number;
  gpuUsed: number;
  topWorkload: string;
  alerts?: WorkloadAlert[];
  events?: NodeEventRow[];
}

interface GkeSnapshotFile {
  cluster: {
    name: string;
    region: string;
    source: string;
    capturedAt: string;
    health: string;
  };
  snapshot?: {
    collectorStatus?: "complete" | "partial" | "failed";
    collectionWarnings?: string[];
    collectorConfidence?: "high" | "medium" | "low";
    missingSources?: string[];
    issues?: CollectionIssue[];
  };
  usage: {
    cpu: MetricSnapshot;
    memory: MetricSnapshot;
    gpu: MetricSnapshot;
  };
  nodes: NodeSnapshot[];
  namespaces: NamespaceSnapshot[];
  workloads?: WorkloadSnapshot[];
  pods?: PodSnapshot[];
}

interface BatchStatusFile {
  intervalSeconds?: number;
  status?: "idle" | "running" | "healthy" | "failing" | "stopped" | "completed";
  runCount?: number;
  consecutiveFailures?: number;
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastError?: string | null;
  snapshotCollectorStatus?: "complete" | "partial" | "failed";
  snapshotWarnings?: string[];
}

interface HistoryIndexEntry {
  capturedAt: string;
  collectorStatus: "complete" | "partial" | "failed";
  cpuUsed: number;
  cpuAllocatable: number;
  memoryUsed: number;
  memoryAllocatable: number;
  gpuUsed: number;
  gpuAllocatable: number;
  totalRestarts: number;
  warningNodeCount: number;
  warningWorkloadCount: number;
  hotNamespace?: string;
  hotWorkload?: string;
}

interface HistoryIndexFile {
  entries?: HistoryIndexEntry[];
}

interface OpenCostClusterSummary {
  totalMonthlyCost?: number;
  idleMonthlyCost?: number;
  sharedMonthlyCost?: number;
}

interface OpenCostNamespaceSummary {
  name: string;
  monthlyCost?: number;
  idleMonthlyCost?: number;
  sharedMonthlyCost?: number;
}

interface OpenCostWorkloadSummary {
  namespace: string;
  name: string;
  monthlyCost?: number;
  idleMonthlyCost?: number;
  sharedMonthlyCost?: number;
}

interface OpenCostSummaryFile {
  source?: string;
  capturedAt?: string;
  currency?: string;
  cluster?: OpenCostClusterSummary;
  namespaces?: OpenCostNamespaceSummary[];
  workloads?: OpenCostWorkloadSummary[];
}

export interface GkeDashboardData {
  cluster: {
    name: string;
    region: string;
    summaryCards: ClusterSummaryCard[];
  };
  pressureCards: PressureCard[];
  topConsumers: {
    cpu: ConsumerRow[];
    memory: ConsumerRow[];
    gpu: ConsumerRow[];
  };
  capacityRows: CapacityRow[];
  workloads: WorkloadRow[];
  pods: PodRow[];
  snapshot: {
    source: string;
    capturedAt: string;
    health: string;
    collectorStatus: "complete" | "partial" | "failed";
    collectionWarnings: string[];
    collectorConfidence: "high" | "medium" | "low";
    missingSources: string[];
    issues: CollectionIssue[];
    affectedAreas: string[];
    trustNote: string;
    batch: {
      status: "manual" | "idle" | "running" | "healthy" | "failing" | "stopped" | "completed";
      label: string;
      detail: string;
      tone: "healthy" | "warning" | "critical";
      intervalSeconds?: number;
      lastRunAt?: string;
      lastSuccessAt?: string;
      consecutiveFailures: number;
      recentError?: string | null;
    };
    freshness: {
      label: "Fresh" | "Aging" | "Stale";
      detail: string;
      tone: "healthy" | "warning" | "critical";
    };
    history: {
      sampleCount: number;
      trendCards: HistoryTrendCard[];
      driftRows: HistoryDriftRow[];
      note: string;
      anomalies: HistoryAnomaly[];
      recentSnapshots: HistorySnapshotCard[];
    };
  };
  efficiency: {
    costSource: CostSource;
    signals: EfficiencyOverviewSignal[];
    note: string;
  };
  nodes: NodeUsageRow[];
  namespaces: NamespaceUsageRow[];
}

interface WorkloadEfficiencyAnalytics {
  efficiencyScore: number;
  efficiencyConfidence: EfficiencyConfidence;
  overRequested: boolean;
  underRequestRisk: boolean;
  rightsizingHint: RightsizingHint;
  idleCpu: number;
  idleMemory: number;
  idleAllocationEstimate: string;
  costSource: CostSource;
  estimatedMonthlyCost: number | null;
  actualMonthlyCost: number | null;
  idleMonthlyCost: number | null;
  priorityScore: number;
}

function getMetricPercentage(metric: MetricSnapshot): number {
  return metric.allocatable > 0 ? Math.min(100, Math.round((metric.used / metric.allocatable) * 100)) : 0;
}

function getRatioPercentage(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.min(100, Math.round((numerator / denominator) * 100)) : 0;
}

function formatMetricUsage(metric: MetricSnapshot, digits = 2): string {
  return `${metric.used.toFixed(digits)} / ${metric.allocatable.toFixed(digits)} ${metric.unit}`;
}

function formatMetricScalar(value: number, unit: string, digits = 2): string {
  return `${value.toFixed(digits)} ${unit}`;
}

function formatNodeUsage(metric: MetricSnapshot, digits = 1): string {
  return `${metric.used.toFixed(digits)} / ${metric.allocatable.toFixed(digits)}`;
}

function formatNamespaceMetric(value: number, unit: string): string {
  if (unit === "cores") {
    return `${value.toFixed(2)} cores`;
  }

  if (unit === "GiB") {
    return `${value.toFixed(1)} GiB`;
  }

  return `${value.toFixed(0)} ${unit}`;
}

function defaultCollectorConfidence(
  collectorStatus: GkeDashboardData["snapshot"]["collectorStatus"],
  collectionWarnings: string[]
): GkeDashboardData["snapshot"]["collectorConfidence"] {
  if (collectorStatus === "failed") {
    return "low";
  }

  if (collectorStatus === "partial" || collectionWarnings.length > 0) {
    return "medium";
  }

  return "high";
}

function deriveMissingSources(
  warnings: string[],
  issues: CollectionIssue[]
): string[] {
  const fromWarnings = warnings.flatMap((warning) => {
    const normalized = warning.toLowerCase();
    if (normalized.includes("node metrics")) {
      return ["node-metrics"];
    }
    if (normalized.includes("pod metrics")) {
      return ["pod-metrics"];
    }
    if (normalized.includes("nodes")) {
      return ["nodes"];
    }
    if (normalized.includes("pods")) {
      return ["pods"];
    }
    if (normalized.includes("events")) {
      return ["events"];
    }
    return [];
  });

  return [...new Set([...fromWarnings, ...issues.map((issue) => issue.source)].filter(Boolean))];
}

function describeAffectedAreas(missingSources: string[]): string[] {
  const mappings: Record<string, string[]> = {
    nodes: ["node inventory", "node condition diagnostics", "node placement accuracy"],
    "node-metrics": ["cluster pressure", "node saturation", "capacity comparisons"],
    pods: ["pod inventory", "workload drill-down", "restart attribution"],
    "pod-metrics": ["pod CPU and memory usage", "consumer rankings", "workload pressure math"],
    events: ["warning timelines", "hot alerts", "recent namespace and node events"]
  };

  const areas = missingSources.flatMap((source) => mappings[source] ?? [`${source} dependent diagnostics`]);
  return [...new Set(areas)];
}

function describeTrustNote(
  confidence: GkeDashboardData["snapshot"]["collectorConfidence"],
  missingSources: string[],
  issues: CollectionIssue[]
): string {
  if (confidence === "high") {
    return "All core collector sources are available for this snapshot.";
  }

  if (issues.length === 0 && missingSources.length === 0) {
    return "Collector confidence is reduced even though no explicit issue payload was provided.";
  }

  return `Collector coverage is reduced by ${missingSources.length || issues.length} source issue${missingSources.length === 1 || issues.length === 1 ? "" : "s"}.`;
}

function formatContainerMetric(value: number, unit: "vCPU" | "GiB" | "GPU") {
  if (unit === "GPU") {
    return `${value.toFixed(0)} ${unit}`;
  }

  return unit === "GiB" ? `${value.toFixed(1)} ${unit}` : `${value.toFixed(2)} ${unit}`;
}

function getEfficiencyConfidenceLevel(
  snapshotConfidence: EfficiencyConfidence,
  requestCpu: number,
  requestMemory: number
): EfficiencyConfidence {
  if (snapshotConfidence === "low") {
    return "low";
  }

  if (requestCpu <= 0 && requestMemory <= 0) {
    return "low";
  }

  if (snapshotConfidence === "medium" || requestCpu <= 0 || requestMemory <= 0) {
    return "medium";
  }

  return "high";
}

function formatIdleEstimate(cpu: number, memory: number) {
  return `CPU ${formatMetricScalar(Math.max(cpu, 0), "vCPU")} · Memory ${formatMetricScalar(Math.max(memory, 0), "GiB", 1)}`;
}

function estimateMonthlyCost(cpu: number, memory: number, gpu: number) {
  return Number((cpu * 18 + memory * 4 + gpu * 120).toFixed(2));
}

function estimateIdleMonthlyCost(idleCpu: number, idleMemory: number) {
  return Number((Math.max(idleCpu, 0) * 18 + Math.max(idleMemory, 0) * 4).toFixed(2));
}

function getRequestRatio(usage: number, request: number) {
  return request > 0 ? usage / request : null;
}

function getEfficiencyScore(
  cpuRatio: number | null,
  memoryRatio: number | null,
  overRequested: boolean,
  underRequestRisk: boolean
) {
  const ratios = [cpuRatio, memoryRatio].filter((value): value is number => value !== null);
  if (ratios.length === 0) {
    return 50;
  }

  const baseline = Math.round(
    ratios.reduce((sum, ratio) => sum + Math.max(0, 100 - Math.abs(65 - Math.round(ratio * 100))), 0) / ratios.length
  );

  if (overRequested) {
    return Math.max(20, baseline - 20);
  }

  if (underRequestRisk) {
    return Math.max(25, baseline - 25);
  }

  return Math.min(95, baseline);
}

function getRightsizingHint(
  overRequested: boolean,
  underRequestRisk: boolean,
  confidence: EfficiencyConfidence
): RightsizingHint {
  if (confidence === "low") {
    return "Observe";
  }

  if (underRequestRisk) {
    return "Raise requests";
  }

  if (overRequested) {
    return "Reduce requests";
  }

  return "Observe";
}

function getIdleWeight(cpuIdle: number, memoryIdle: number) {
  return cpuIdle * 10 + memoryIdle;
}

function getPriorityScore(
  efficiencyScore: number,
  overRequested: boolean,
  underRequestRisk: boolean,
  confidence: EfficiencyConfidence,
  idleMonthlyCost: number,
  actualMonthlyCost: number | null
) {
  const base = overRequested ? 55 : underRequestRisk ? 65 : 30;
  const confidenceWeight = confidence === "high" ? 15 : confidence === "medium" ? 10 : 5;
  const wasteWeight = Math.min(20, Math.round(idleMonthlyCost / 10));
  const costWeight = actualMonthlyCost ? Math.min(20, Math.round(actualMonthlyCost / 25)) : 0;
  return Math.max(0, Math.min(100, Math.round(base + confidenceWeight + wasteWeight + costWeight + (100 - efficiencyScore) * 0.1)));
}

function getPressureTone(percentage: number): "healthy" | "warning" | "critical" {
  if (percentage >= 85) {
    return "critical";
  }

  if (percentage >= 60) {
    return "warning";
  }

  return "healthy";
}

function formatPointDelta(value: number) {
  if (value === 0) {
    return "0 pts";
  }

  return `${value > 0 ? "+" : ""}${value} pts`;
}

function formatCountDelta(value: number) {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : ""}${value}`;
}

function getDeltaDirection(value: number): "up" | "down" | "flat" {
  if (value > 0) {
    return "up";
  }

  if (value < 0) {
    return "down";
  }

  return "flat";
}

function getDeltaTone(
  value: number,
  mode: "resource" | "restart" | "warning-count"
): "healthy" | "warning" | "critical" {
  if (value === 0) {
    return "healthy";
  }

  if (mode === "resource") {
    if (value >= 10) {
      return "critical";
    }

    return value > 0 ? "warning" : "healthy";
  }

  if (mode === "restart") {
    return value > 0 ? "critical" : "healthy";
  }

  return value > 0 ? "warning" : "healthy";
}

function describeFreshness(capturedAt: string): GkeDashboardData["snapshot"]["freshness"] {
  const capturedTime = new Date(capturedAt).getTime();
  const ageSeconds = Number.isNaN(capturedTime) ? 999_999 : Math.max(0, Math.round((Date.now() - capturedTime) / 1000));

  if (ageSeconds <= 90) {
    return { label: "Fresh", detail: `${ageSeconds}s old`, tone: "healthy" };
  }

  if (ageSeconds <= 300) {
    return { label: "Aging", detail: `${Math.round(ageSeconds / 60)}m old`, tone: "warning" };
  }

  return { label: "Stale", detail: `${Math.round(ageSeconds / 60)}m old`, tone: "critical" };
}

function getHistoryPercentage(used: number, allocatable: number) {
  return allocatable > 0 ? Math.min(100, Math.round((used / allocatable) * 100)) : 0;
}

function createTrendCard(
  label: string,
  entries: HistoryIndexEntry[],
  selector: (entry: HistoryIndexEntry) => number
): HistoryTrendCard {
  const series = [...entries]
    .slice(0, 5)
    .reverse()
    .map((entry) => selector(entry));
  const latest = series.at(-1) ?? 0;
  const previous = series.at(-2) ?? latest;
  const delta = latest - previous;

  return {
    label,
    values: series,
    latest: `${latest}%`,
    delta: formatPointDelta(delta),
    direction: getDeltaDirection(delta),
    tone: getDeltaTone(delta, "resource")
  };
}

function formatHistorySnapshotLabel(capturedAt: string) {
  return new Date(capturedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function createHistorySnapshotCards(entries: HistoryIndexEntry[]): HistorySnapshotCard[] {
  return [...entries]
    .sort((left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime())
    .slice(0, 5)
    .map((entry) => ({
      capturedAt: entry.capturedAt,
      label: formatHistorySnapshotLabel(entry.capturedAt),
      collectorStatus: entry.collectorStatus,
      cpuLabel: `${getHistoryPercentage(entry.cpuUsed, entry.cpuAllocatable)}%`,
      memoryLabel: `${getHistoryPercentage(entry.memoryUsed, entry.memoryAllocatable)}%`,
      restartsLabel: `${entry.totalRestarts} restarts`,
      tone:
        entry.collectorStatus === "failed"
          ? "critical"
          : entry.collectorStatus === "partial"
            ? "warning"
            : "healthy"
    }));
}

function createHistoryAnomalies(entries: HistoryIndexEntry[]): HistoryAnomaly[] {
  if (entries.length < 2) {
    return [
      {
        title: "History warming up",
        detail: "Run another snapshot refresh to unlock change detection.",
        tone: "warning"
      }
    ];
  }

  const sorted = [...entries].sort((left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime());
  const latest = sorted[0];
  const previous = sorted[1];
  const cpuDelta =
    getHistoryPercentage(latest.cpuUsed, latest.cpuAllocatable) - getHistoryPercentage(previous.cpuUsed, previous.cpuAllocatable);
  const memoryDelta =
    getHistoryPercentage(latest.memoryUsed, latest.memoryAllocatable) -
    getHistoryPercentage(previous.memoryUsed, previous.memoryAllocatable);
  const restartDelta = latest.totalRestarts - previous.totalRestarts;
  const warningNodeDelta = latest.warningNodeCount - previous.warningNodeCount;
  const anomalies: HistoryAnomaly[] = [];

  if (restartDelta >= 2) {
    anomalies.push({
      title: "Restart spike",
      detail: `${formatCountDelta(restartDelta)} restarts since the previous snapshot.`,
      tone: "critical"
    });
  }

  if (Math.max(cpuDelta, memoryDelta) >= 10) {
    anomalies.push({
      title: "Pressure increase",
      detail: `CPU ${formatPointDelta(cpuDelta)} · Memory ${formatPointDelta(memoryDelta)} vs previous snapshot.`,
      tone: Math.max(cpuDelta, memoryDelta) >= 10 ? "critical" : "warning"
    });
  }

  if (warningNodeDelta > 0) {
    anomalies.push({
      title: "More warning nodes",
      detail: `${formatCountDelta(warningNodeDelta)} nodes entered a warning state.`,
      tone: "warning"
    });
  }

  if (latest.collectorStatus !== "complete") {
    anomalies.push({
      title: "Partial collection",
      detail: `Latest snapshot collector status is ${latest.collectorStatus}.`,
      tone: latest.collectorStatus === "failed" ? "critical" : "warning"
    });
  }

  if (anomalies.length === 0) {
    anomalies.push({
      title: "No abnormal drift",
      detail: "Recent snapshots are steady across pressure, restarts, and warning nodes.",
      tone: "healthy"
    });
  }

  return anomalies.slice(0, 4);
}

function createHistorySummary(entries: HistoryIndexEntry[]): GkeDashboardData["snapshot"]["history"] {
  if (entries.length === 0) {
    return {
      sampleCount: 0,
      trendCards: [],
      driftRows: [],
      note: "History appears after the first retained snapshot.",
      anomalies: createHistoryAnomalies([]),
      recentSnapshots: []
    };
  }

  const sorted = [...entries].sort((left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime());
  const latest = sorted[0];
  const previous = sorted[1] ?? latest;

  return {
    sampleCount: sorted.length,
    trendCards: [
      createTrendCard("CPU Trend", sorted, (entry) => getHistoryPercentage(entry.cpuUsed, entry.cpuAllocatable)),
      createTrendCard("Memory Trend", sorted, (entry) => getHistoryPercentage(entry.memoryUsed, entry.memoryAllocatable)),
      createTrendCard("GPU Trend", sorted, (entry) => getHistoryPercentage(entry.gpuUsed, entry.gpuAllocatable))
    ],
    driftRows: [
      {
        label: "CPU drift",
        value: formatPointDelta(
          getHistoryPercentage(latest.cpuUsed, latest.cpuAllocatable) -
            getHistoryPercentage(previous.cpuUsed, previous.cpuAllocatable)
        ),
        detail: "vs previous snapshot",
        tone: getDeltaTone(
          getHistoryPercentage(latest.cpuUsed, latest.cpuAllocatable) -
            getHistoryPercentage(previous.cpuUsed, previous.cpuAllocatable),
          "resource"
        )
      },
      {
        label: "Memory drift",
        value: formatPointDelta(
          getHistoryPercentage(latest.memoryUsed, latest.memoryAllocatable) -
            getHistoryPercentage(previous.memoryUsed, previous.memoryAllocatable)
        ),
        detail: "vs previous snapshot",
        tone: getDeltaTone(
          getHistoryPercentage(latest.memoryUsed, latest.memoryAllocatable) -
            getHistoryPercentage(previous.memoryUsed, previous.memoryAllocatable),
          "resource"
        )
      },
      {
        label: "Restart drift",
        value: formatCountDelta(latest.totalRestarts - previous.totalRestarts),
        detail: `${latest.totalRestarts} total restarts`,
        tone: getDeltaTone(latest.totalRestarts - previous.totalRestarts, "restart")
      },
      {
        label: "Warning nodes",
        value: formatCountDelta(latest.warningNodeCount - previous.warningNodeCount),
        detail: `${latest.warningNodeCount} nodes under watch`,
        tone: getDeltaTone(latest.warningNodeCount - previous.warningNodeCount, "warning-count")
      }
    ],
    note:
      sorted.length > 1
        ? `Comparing the latest ${Math.min(sorted.length, 5)} retained snapshots.`
        : "Only one retained snapshot so far. Drift will appear after the next refresh.",
    anomalies: createHistoryAnomalies(sorted),
    recentSnapshots: createHistorySnapshotCards(sorted)
  };
}

function createSummaryCards(snapshot: GkeSnapshotFile): ClusterSummaryCard[] {
  const freshness = describeFreshness(snapshot.cluster.capturedAt);

  return [
    {
      label: "CPU Usage",
      value: `${getMetricPercentage(snapshot.usage.cpu)}%`,
      detail: formatMetricUsage(snapshot.usage.cpu)
    },
    {
      label: "Memory Usage",
      value: `${getMetricPercentage(snapshot.usage.memory)}%`,
      detail: formatMetricUsage(snapshot.usage.memory, 1)
    },
    {
      label: "GPU Usage",
      value: `${getMetricPercentage(snapshot.usage.gpu)}%`,
      detail: `${snapshot.usage.gpu.used.toFixed(0)} / ${snapshot.usage.gpu.allocatable.toFixed(0)} ${snapshot.usage.gpu.model ?? "GPU"}`
    },
    {
      label: "Snapshot Freshness",
      value: freshness.label,
      detail: freshness.detail
    }
  ];
}

function createPressureCards(snapshot: GkeSnapshotFile): PressureCard[] {
  return [
    {
      label: "CPU Pressure",
      percentage: getMetricPercentage(snapshot.usage.cpu),
      value: `${snapshot.usage.cpu.used.toFixed(2)} ${snapshot.usage.cpu.unit} in use`,
      tone: getPressureTone(getMetricPercentage(snapshot.usage.cpu))
    },
    {
      label: "Memory Pressure",
      percentage: getMetricPercentage(snapshot.usage.memory),
      value: `${snapshot.usage.memory.used.toFixed(1)} ${snapshot.usage.memory.unit} in use`,
      tone: getPressureTone(getMetricPercentage(snapshot.usage.memory))
    },
    {
      label: "GPU Pressure",
      percentage: getMetricPercentage(snapshot.usage.gpu),
      value: `${snapshot.usage.gpu.used.toFixed(0)} ${snapshot.usage.gpu.unit} in use`,
      tone: getPressureTone(getMetricPercentage(snapshot.usage.gpu))
    }
  ];
}

function createWorkloadEfficiencyAnalytics(
  workload: WorkloadSnapshot,
  snapshotConfidence: EfficiencyConfidence
): WorkloadEfficiencyAnalytics {
  const cpuRatio = getRequestRatio(workload.usage.cpu, workload.requests.cpu);
  const memoryRatio = getRequestRatio(workload.usage.memory, workload.requests.memory);
  const overRequested =
    (cpuRatio !== null && cpuRatio < 0.35) ||
    (memoryRatio !== null && memoryRatio < 0.4);
  const underRequestRisk =
    (cpuRatio !== null && cpuRatio > 0.85) ||
    (memoryRatio !== null && memoryRatio > 0.9);
  const efficiencyConfidence = getEfficiencyConfidenceLevel(
    snapshotConfidence,
    workload.requests.cpu,
    workload.requests.memory
  );
  const idleCpu = Math.max(workload.requests.cpu - workload.usage.cpu, 0);
  const idleMemory = Math.max(workload.requests.memory - workload.usage.memory, 0);
  const efficiencyScore = getEfficiencyScore(cpuRatio, memoryRatio, overRequested, underRequestRisk);
  const idleMonthlyCost = estimateIdleMonthlyCost(idleCpu, idleMemory);
  const estimatedMonthlyCost = estimateMonthlyCost(
    workload.requests.cpu,
    workload.requests.memory,
    workload.requests.gpu
  );

  return {
    efficiencyScore,
    efficiencyConfidence,
    overRequested,
    underRequestRisk,
    rightsizingHint: getRightsizingHint(overRequested, underRequestRisk, efficiencyConfidence),
    idleCpu,
    idleMemory,
    idleAllocationEstimate: formatIdleEstimate(idleCpu, idleMemory),
    costSource: "heuristic",
    estimatedMonthlyCost,
    actualMonthlyCost: null,
    idleMonthlyCost,
    priorityScore: getPriorityScore(
      efficiencyScore,
      overRequested,
      underRequestRisk,
      efficiencyConfidence,
      idleMonthlyCost,
      null
    )
  };
}

function mapNodes(snapshot: GkeSnapshotFile): NodeUsageRow[] {
  const workloads = snapshot.workloads ?? [];

  return snapshot.nodes.map((node) => {
    const nodeWorkloads = workloads.filter((workload) => workload.node === node.name);
    const topWorkload = [...nodeWorkloads].sort(
      (left, right) => right.usage.cpu + right.usage.memory - (left.usage.cpu + left.usage.memory)
    )[0]?.name;

    return {
      name: node.name,
      cpu: formatNodeUsage(node.cpu),
      memory: `${formatNodeUsage(node.memory)} ${node.memory.unit}`,
      gpu: node.gpu ? formatNodeUsage(node.gpu, 0) : "n/a",
      status: node.status,
      cpuPercentage: getMetricPercentage(node.cpu),
      memoryPercentage: getMetricPercentage(node.memory),
      gpuPercentage: node.gpu ? getMetricPercentage(node.gpu) : 0,
      topWorkload,
      conditions: node.conditions ?? [],
      taints: node.taints ?? [],
      events: node.events ?? []
    };
  });
}

function getWorkloads(snapshot: GkeSnapshotFile): WorkloadSnapshot[] {
  return snapshot.workloads ?? [];
}

function createTopConsumers(snapshot: GkeSnapshotFile): GkeDashboardData["topConsumers"] {
  const workloads = getWorkloads(snapshot);
  const cpuTotal = snapshot.usage.cpu.used || 1;
  const memoryTotal = snapshot.usage.memory.used || 1;
  const gpuTotal = snapshot.usage.gpu.used || snapshot.usage.gpu.allocatable || 1;

  const mapConsumers = (
    unit: "cpu" | "memory" | "gpu",
    total: number,
    labelUnit: "vCPU" | "GiB" | "GPU"
  ): ConsumerRow[] =>
    [...workloads]
      .sort((left, right) => right.usage[unit] - left.usage[unit])
      .slice(0, 5)
      .map((workload) => {
        const value = workload.usage[unit];
        const share = getRatioPercentage(value, total);
        return {
          namespace: workload.namespace,
          name: workload.name,
          kind: workload.kind,
          usage: formatMetricScalar(value, labelUnit, unit === "gpu" ? 0 : unit === "cpu" ? 2 : 1),
          share: `${share}% of cluster`,
          tone: getPressureTone(share)
        };
      });

  return {
    cpu: mapConsumers("cpu", cpuTotal, "vCPU"),
    memory: mapConsumers("memory", memoryTotal, "GiB"),
    gpu: mapConsumers("gpu", gpuTotal, "GPU")
  };
}

function createCapacityRows(snapshot: GkeSnapshotFile): CapacityRow[] {
  const workloads = getWorkloads(snapshot);
  const totals = workloads.reduce(
    (accumulator, workload) => {
      accumulator.cpu.requests += workload.requests.cpu;
      accumulator.cpu.limits += workload.limits.cpu;
      accumulator.memory.requests += workload.requests.memory;
      accumulator.memory.limits += workload.limits.memory;
      accumulator.gpu.requests += workload.requests.gpu;
      accumulator.gpu.limits += workload.limits.gpu;
      return accumulator;
    },
    {
      cpu: { requests: 0, limits: 0 },
      memory: { requests: 0, limits: 0 },
      gpu: { requests: 0, limits: 0 }
    }
  );

  return [
    {
      label: "CPU",
      allocatable: formatMetricScalar(snapshot.usage.cpu.allocatable, "vCPU"),
      usage: formatMetricScalar(snapshot.usage.cpu.used, "vCPU"),
      requests: formatMetricScalar(totals.cpu.requests, "vCPU"),
      limits: formatMetricScalar(totals.cpu.limits, "vCPU"),
      usagePercentage: getRatioPercentage(snapshot.usage.cpu.used, snapshot.usage.cpu.allocatable),
      requestPercentage: getRatioPercentage(totals.cpu.requests, snapshot.usage.cpu.allocatable),
      limitPercentage: getRatioPercentage(totals.cpu.limits, snapshot.usage.cpu.allocatable)
    },
    {
      label: "Memory",
      allocatable: formatMetricScalar(snapshot.usage.memory.allocatable, "GiB", 1),
      usage: formatMetricScalar(snapshot.usage.memory.used, "GiB", 1),
      requests: formatMetricScalar(totals.memory.requests, "GiB", 1),
      limits: formatMetricScalar(totals.memory.limits, "GiB", 1),
      usagePercentage: getRatioPercentage(snapshot.usage.memory.used, snapshot.usage.memory.allocatable),
      requestPercentage: getRatioPercentage(totals.memory.requests, snapshot.usage.memory.allocatable),
      limitPercentage: getRatioPercentage(totals.memory.limits, snapshot.usage.memory.allocatable)
    },
    {
      label: "GPU",
      allocatable: formatMetricScalar(snapshot.usage.gpu.allocatable, "GPU", 0),
      usage: formatMetricScalar(snapshot.usage.gpu.used, "GPU", 0),
      requests: formatMetricScalar(totals.gpu.requests, "GPU", 0),
      limits: formatMetricScalar(totals.gpu.limits, "GPU", 0),
      usagePercentage: getRatioPercentage(snapshot.usage.gpu.used, snapshot.usage.gpu.allocatable),
      requestPercentage: getRatioPercentage(totals.gpu.requests, snapshot.usage.gpu.allocatable),
      limitPercentage: getRatioPercentage(totals.gpu.limits, snapshot.usage.gpu.allocatable)
    }
  ];
}

function getEfficiencyLabel(workload: WorkloadSnapshot): WorkloadRow["efficiency"] {
  const cpuPressure = getRatioPercentage(workload.usage.cpu, Math.max(workload.requests.cpu, 0.01));
  const memoryPressure = getRatioPercentage(workload.usage.memory, Math.max(workload.requests.memory, 0.01));
  const hottest = Math.max(cpuPressure, memoryPressure, workload.usage.gpu > 0 ? 100 : 0);

  if (hottest >= 90) {
    return "Hot";
  }

  if (hottest >= 60) {
    return "Watch";
  }

  return "Healthy";
}

function createWorkloadRows(
  snapshot: GkeSnapshotFile,
  snapshotConfidence: EfficiencyConfidence
): WorkloadRow[] {
  return getWorkloads(snapshot)
    .map((workload) => {
      const pressurePercentage = Math.max(
        getRatioPercentage(workload.usage.cpu, Math.max(workload.requests.cpu, 0.01)),
        getRatioPercentage(workload.usage.memory, Math.max(workload.requests.memory, 0.01)),
        workload.usage.gpu > 0 ? 100 : 0
      );
      const analytics = createWorkloadEfficiencyAnalytics(workload, snapshotConfidence);

      return {
        id: `${workload.namespace}/${workload.name}`,
        namespace: workload.namespace,
        name: workload.name,
        kind: workload.kind,
        replicas: workload.replicas,
        node: workload.node,
        cpuUsage: formatMetricScalar(workload.usage.cpu, "vCPU"),
        memoryUsage: formatMetricScalar(workload.usage.memory, "GiB", 1),
        gpuUsage: formatMetricScalar(workload.usage.gpu, "GPU", 0),
        cpuRequests: formatMetricScalar(workload.requests.cpu, "vCPU"),
        memoryRequests: formatMetricScalar(workload.requests.memory, "GiB", 1),
        cpuLimits: formatMetricScalar(workload.limits.cpu, "vCPU"),
        memoryLimits: formatMetricScalar(workload.limits.memory, "GiB", 1),
        efficiency: getEfficiencyLabel(workload),
        pressurePercentage,
        events: workload.events ?? [],
        efficiencyScore: analytics.efficiencyScore,
        efficiencyConfidence: analytics.efficiencyConfidence,
        overRequested: analytics.overRequested,
        underRequestRisk: analytics.underRequestRisk,
        rightsizingHint: analytics.rightsizingHint,
        idleAllocationEstimate: analytics.idleAllocationEstimate,
        costSource: analytics.costSource,
        estimatedMonthlyCost: analytics.estimatedMonthlyCost,
        actualMonthlyCost: analytics.actualMonthlyCost,
        idleMonthlyCost: analytics.idleMonthlyCost,
        priorityScore: analytics.priorityScore
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore || right.pressurePercentage - left.pressurePercentage);
}

function createNamespaceEfficiencySummary(
  workloadRows: WorkloadRow[],
  snapshotConfidence: EfficiencyConfidence
): NamespaceEfficiencySummary {
  const overRequestedWorkloads = workloadRows.filter((workload) => workload.overRequested).length;
  const idleCpu = workloadRows.reduce((sum, workload) => {
    const match = workload.idleAllocationEstimate.match(/CPU ([\d.]+)/);
    return sum + Number(match?.[1] ?? 0);
  }, 0);
  const idleMemory = workloadRows.reduce((sum, workload) => {
    const match = workload.idleAllocationEstimate.match(/Memory ([\d.]+)/);
    return sum + Number(match?.[1] ?? 0);
  }, 0);
  const cpuRatios = workloadRows
    .map((workload) => {
      const usage = Number(workload.cpuUsage.match(/[\d.]+/)?.[0] ?? 0);
      const request = Number(workload.cpuRequests.match(/[\d.]+/)?.[0] ?? 0);
      return request > 0 ? Math.round((usage / request) * 100) : null;
    })
    .filter((value): value is number => value !== null);
  const memoryRatios = workloadRows
    .map((workload) => {
      const usage = Number(workload.memoryUsage.match(/[\d.]+/)?.[0] ?? 0);
      const request = Number(workload.memoryRequests.match(/[\d.]+/)?.[0] ?? 0);
      return request > 0 ? Math.round((usage / request) * 100) : null;
    })
    .filter((value): value is number => value !== null);
  const averageCpuRatio =
    cpuRatios.length > 0 ? Math.round(cpuRatios.reduce((sum, value) => sum + value, 0) / cpuRatios.length) : 0;
  const averageMemoryRatio =
    memoryRatios.length > 0
      ? Math.round(memoryRatios.reduce((sum, value) => sum + value, 0) / memoryRatios.length)
      : 0;
  const rightsizingCandidate =
    workloadRows.find((workload) => workload.rightsizingHint !== "Observe")?.name ?? "Observe current footprint";

  return {
    requestEfficiencyLabel: `CPU ${averageCpuRatio}% · Memory ${averageMemoryRatio}%`,
    idleAllocationEstimate: formatIdleEstimate(idleCpu, idleMemory),
    overRequestedWorkloads,
    rightsizingCandidate,
    efficiencyConfidence:
      snapshotConfidence === "low" || workloadRows.some((workload) => workload.efficiencyConfidence === "low")
        ? "low"
        : snapshotConfidence === "medium" || workloadRows.some((workload) => workload.efficiencyConfidence === "medium")
          ? "medium"
          : "high",
    costSource: "heuristic",
    estimatedMonthlyCost: Number(workloadRows.reduce((sum, workload) => sum + (workload.estimatedMonthlyCost ?? 0), 0).toFixed(2)),
    actualMonthlyCost: null,
    idleMonthlyCost: Number(workloadRows.reduce((sum, workload) => sum + (workload.idleMonthlyCost ?? 0), 0).toFixed(2))
  };
}

function mergeOpenCostIntoWorkloads(workloads: WorkloadRow[], summary?: OpenCostSummaryFile): WorkloadRow[] {
  if (!summary?.workloads?.length) {
    return workloads;
  }

  const costByWorkload = new Map<string, OpenCostWorkloadSummary>(
    summary.workloads.map((workload) => [`${workload.namespace}/${workload.name}`, workload])
  );

  return workloads.map((workload) => {
    const openCost = costByWorkload.get(workload.id);
    if (!openCost) {
      return workload;
    }

    const actualMonthlyCost = openCost.monthlyCost ?? null;
    const idleMonthlyCost = openCost.idleMonthlyCost ?? workload.idleMonthlyCost;

    return {
      ...workload,
      costSource: "opencost",
      actualMonthlyCost,
      idleMonthlyCost,
      priorityScore: getPriorityScore(
        workload.efficiencyScore,
        workload.overRequested,
        workload.underRequestRisk,
        workload.efficiencyConfidence,
        idleMonthlyCost ?? 0,
        actualMonthlyCost
      )
    };
  });
}

function mapNamespaces(
  snapshot: GkeSnapshotFile,
  workloadRows: WorkloadRow[],
  snapshotConfidence: EfficiencyConfidence,
  openCostSummary?: OpenCostSummaryFile
): NamespaceUsageRow[] {
  const namespaceCostMap = new Map(
    (openCostSummary?.namespaces ?? []).map((namespace) => [namespace.name, namespace] as const)
  );

  return snapshot.namespaces
    .map((namespace) => {
      const namespaceWorkloads = workloadRows.filter((workload) => workload.namespace === namespace.name);
      const namespaceCost = namespaceCostMap.get(namespace.name);
      const baseEfficiency = createNamespaceEfficiencySummary(namespaceWorkloads, snapshotConfidence);
      return {
        name: namespace.name,
        cpu: formatNamespaceMetric(namespace.cpuUsed, "cores"),
        memory: formatNamespaceMetric(namespace.memoryUsed, "GiB"),
        gpu: formatNamespaceMetric(namespace.gpuUsed, "GPU"),
        topWorkload: namespace.topWorkload,
        alerts: namespace.alerts ?? [],
        events: namespace.events ?? [],
        efficiency: {
          ...baseEfficiency,
          costSource: namespaceCost ? "opencost" : baseEfficiency.costSource,
          actualMonthlyCost: namespaceCost?.monthlyCost ?? baseEfficiency.actualMonthlyCost,
          idleMonthlyCost: namespaceCost?.idleMonthlyCost ?? baseEfficiency.idleMonthlyCost
        },
        pressurePercentage: Math.min(
          100,
          Math.round(Math.max(namespace.cpuUsed * 18, namespace.memoryUsed * 3.4, namespace.gpuUsed > 0 ? 100 : 0))
        )
      };
    })
    .sort((left, right) => right.pressurePercentage - left.pressurePercentage);
}

function createEfficiencyOverview(
  workloads: WorkloadRow[],
  namespaces: NamespaceUsageRow[],
  openCostSummary?: OpenCostSummaryFile
): GkeDashboardData["efficiency"] {
  const costSource: CostSource =
    workloads.some((workload) => workload.costSource === "opencost") ||
    namespaces.some((namespace) => namespace.efficiency.costSource === "opencost") ||
    Boolean(openCostSummary)
      ? "opencost"
      : "heuristic";
  const mostOverRequested =
    [...workloads]
      .filter((workload) => workload.overRequested)
      .sort((left, right) => {
        const leftWeight = getIdleWeight(
          Number(left.idleAllocationEstimate.match(/CPU ([\d.]+)/)?.[1] ?? 0),
          Number(left.idleAllocationEstimate.match(/Memory ([\d.]+)/)?.[1] ?? 0)
        );
        const rightWeight = getIdleWeight(
          Number(right.idleAllocationEstimate.match(/CPU ([\d.]+)/)?.[1] ?? 0),
          Number(right.idleAllocationEstimate.match(/Memory ([\d.]+)/)?.[1] ?? 0)
        );
        return rightWeight - leftWeight;
      })[0] ?? workloads[0];
  const idleNamespace =
    [...namespaces].sort((left, right) => {
      const leftWeight = getIdleWeight(
        Number(left.efficiency.idleAllocationEstimate.match(/CPU ([\d.]+)/)?.[1] ?? 0),
        Number(left.efficiency.idleAllocationEstimate.match(/Memory ([\d.]+)/)?.[1] ?? 0)
      );
      const rightWeight = getIdleWeight(
        Number(right.efficiency.idleAllocationEstimate.match(/CPU ([\d.]+)/)?.[1] ?? 0),
        Number(right.efficiency.idleAllocationEstimate.match(/Memory ([\d.]+)/)?.[1] ?? 0)
      );
      return rightWeight - leftWeight;
    })[0] ?? namespaces[0];
  const rightsizingCandidate =
    workloads.find((workload) => workload.rightsizingHint !== "Observe") ?? workloads[0];

  const signals: EfficiencyOverviewSignal[] = [];

  if (mostOverRequested) {
    signals.push({
      title: "Most over-requested workload",
      value: `${mostOverRequested.namespace}/${mostOverRequested.name}`,
      detail: `${mostOverRequested.idleAllocationEstimate} idle allocation estimated`,
      tone: mostOverRequested.overRequested ? "warning" : "healthy",
      href: `/dashboard/workloads/${encodeURIComponent(mostOverRequested.namespace)}/${encodeURIComponent(mostOverRequested.name)}`,
      actionLabel: "Open workload"
    });
  }

  if (idleNamespace) {
    signals.push({
      title: "Highest idle allocation namespace",
      value: idleNamespace.name,
      detail: idleNamespace.efficiency.idleAllocationEstimate,
      tone: idleNamespace.efficiency.overRequestedWorkloads > 0 ? "warning" : "healthy",
      href: `/dashboard/namespaces/${encodeURIComponent(idleNamespace.name)}`,
      actionLabel: "Open namespace"
    });
  }

  if (rightsizingCandidate) {
    signals.push({
      title: "Top rightsizing candidate",
      value: rightsizingCandidate.rightsizingHint,
      detail: `${rightsizingCandidate.name} · ${rightsizingCandidate.efficiencyConfidence} confidence`,
      tone:
        rightsizingCandidate.rightsizingHint === "Raise requests"
          ? "critical"
          : rightsizingCandidate.rightsizingHint === "Reduce requests"
            ? "warning"
            : "healthy",
      href: `/dashboard/workloads/${encodeURIComponent(rightsizingCandidate.namespace)}/${encodeURIComponent(rightsizingCandidate.name)}`,
      actionLabel: "Review workload"
    });
  }

  if (costSource === "opencost") {
    const topCostWorkload =
      [...workloads]
        .filter((workload) => workload.actualMonthlyCost !== null)
        .sort((left, right) => (right.actualMonthlyCost ?? 0) - (left.actualMonthlyCost ?? 0))[0] ?? workloads[0];

    if (topCostWorkload) {
      signals.push({
        title: "Top cost hotspot",
        value:
          topCostWorkload.actualMonthlyCost !== null
            ? `$${topCostWorkload.actualMonthlyCost.toFixed(2)}/mo`
            : "Awaiting OpenCost feed",
        detail: `${topCostWorkload.namespace}/${topCostWorkload.name} · idle $${(topCostWorkload.idleMonthlyCost ?? 0).toFixed(2)}/mo`,
        tone:
          topCostWorkload.actualMonthlyCost !== null && topCostWorkload.actualMonthlyCost >= 200
            ? "warning"
            : "healthy",
        href: `/dashboard/workloads/${encodeURIComponent(topCostWorkload.namespace)}/${encodeURIComponent(topCostWorkload.name)}`,
        actionLabel: "Open workload"
      });
    }
  } else {
    signals.push({
      title: "Cost feed status",
      value: "Awaiting OpenCost feed",
      detail: "Showing heuristic efficiency only until an OpenCost summary is connected.",
      tone: "warning",
      href: "#snapshot-status",
      actionLabel: "Inspect snapshot status"
    });
  }

  return {
    costSource,
    signals,
    note:
      costSource === "opencost"
        ? "OpenCost is connected for actual cost values. Rightsizing and idle signals still include heuristic guidance."
        : "Heuristic only. These signals highlight likely waste and headroom issues, not billing data."
  };
}

function createPodRows(snapshot: GkeSnapshotFile): PodRow[] {
  if (snapshot.pods?.length) {
    return snapshot.pods.map((pod) => ({
      id: `${pod.namespace}/${pod.name}`,
      namespace: pod.namespace,
      workloadId: `${pod.namespace}/${pod.workloadName}`,
      workloadName: pod.workloadName,
      workloadKind: pod.workloadKind,
      name: pod.name,
      node: pod.node,
      status: pod.status,
      reason: pod.reason ?? pod.status,
      restartCount: pod.restartCount ?? 0,
      readyContainers: pod.readyContainers ?? 1,
      totalContainers: pod.totalContainers ?? 1,
      cpuUsage: formatMetricScalar(pod.usage.cpu, "vCPU"),
      memoryUsage: formatMetricScalar(pod.usage.memory, "GiB", 1),
      gpuUsage: formatMetricScalar(pod.usage.gpu, "GPU", 0),
      containers:
        pod.containers?.map((container) => ({
          name: container.name,
          ready: container.ready,
          restartCount: container.restartCount,
          state: container.state,
          reason: container.reason,
          cpuRequest: formatContainerMetric(container.requests.cpu, "vCPU"),
          cpuLimit: formatContainerMetric(container.limits.cpu, "vCPU"),
          memoryRequest: formatContainerMetric(container.requests.memory, "GiB"),
          memoryLimit: formatContainerMetric(container.limits.memory, "GiB")
        })) ?? [
          {
            name: "main",
            ready: pod.status === "Running",
            restartCount: pod.restartCount ?? 0,
            state: pod.status === "Running" ? "running" : "waiting",
            reason: pod.reason ?? pod.status,
            cpuRequest: "0.00 vCPU",
            cpuLimit: "0.00 vCPU",
            memoryRequest: "0.0 GiB",
            memoryLimit: "0.0 GiB"
          }
        ]
    }));
  }

  return getWorkloads(snapshot).flatMap((workload) => {
    const replicas = Math.max(1, workload.replicas);
    return Array.from({ length: replicas }, (_, index) => ({
      id: `${workload.namespace}/${workload.name}-${index}`,
      namespace: workload.namespace,
      workloadId: `${workload.namespace}/${workload.name}`,
      workloadName: workload.name,
      workloadKind: workload.kind,
      name: `${workload.name}-${index}`,
      node: workload.node,
      status: "Running" as const,
      reason: "Running",
      restartCount: 0,
      readyContainers: 1,
      totalContainers: 1,
      cpuUsage: formatMetricScalar(workload.usage.cpu / replicas, "vCPU"),
      memoryUsage: formatMetricScalar(workload.usage.memory / replicas, "GiB", 1),
      gpuUsage: formatMetricScalar(workload.usage.gpu / replicas, "GPU", 0),
      containers: [
        {
          name: "main",
          ready: true,
          restartCount: 0,
          state: "running",
          reason: "Running",
          cpuRequest: formatMetricScalar(workload.requests.cpu / replicas, "vCPU"),
          cpuLimit: formatMetricScalar(workload.limits.cpu / replicas, "vCPU"),
          memoryRequest: formatMetricScalar(workload.requests.memory / replicas, "GiB", 1),
          memoryLimit: formatMetricScalar(workload.limits.memory / replicas, "GiB", 1)
        }
      ]
    }));
  });
}

async function resolveSnapshotPath(workspaceRoot: string): Promise<string | undefined> {
  const configuredPath = process.env.GKE_DASHBOARD_SNAPSHOT_PATH;
  const candidates: string[] = [];
  if (configuredPath) {
    if (path.isAbsolute(configuredPath)) {
      candidates.push(configuredPath);
    } else {
      let current = workspaceRoot;
      while (true) {
        candidates.push(path.resolve(current, configuredPath));
        const parent = path.dirname(current);
        if (parent === current) {
          break;
        }
        current = parent;
      }
    }
  } else {
    candidates.push(path.resolve(workspaceRoot, ".local/gke-snapshot.local.json"));
  }

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return undefined;
}

async function resolveBatchStatusPath(
  workspaceRoot: string,
  snapshotPath?: string
): Promise<string | undefined> {
  const configuredPath = process.env.GKE_DASHBOARD_BATCH_STATUS_PATH;
  const candidates: string[] = [];

  if (configuredPath) {
    if (path.isAbsolute(configuredPath)) {
      candidates.push(configuredPath);
    } else {
      let current = workspaceRoot;
      while (true) {
        candidates.push(path.resolve(current, configuredPath));
        const parent = path.dirname(current);
        if (parent === current) {
          break;
        }
        current = parent;
      }
    }
  } else if (snapshotPath) {
    candidates.push(path.join(path.dirname(snapshotPath), "gke-snapshot-batch-status.json"));
  }

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return undefined;
}

async function resolveHistoryPath(
  workspaceRoot: string,
  snapshotPath?: string
): Promise<string | undefined> {
  const configuredPath = process.env.GKE_DASHBOARD_HISTORY_PATH;
  const candidates: string[] = [];

  if (configuredPath) {
    if (path.isAbsolute(configuredPath)) {
      candidates.push(configuredPath);
    } else {
      let current = workspaceRoot;
      while (true) {
        candidates.push(path.resolve(current, configuredPath));
        const parent = path.dirname(current);
        if (parent === current) {
          break;
        }
        current = parent;
      }
    }
  } else if (snapshotPath) {
    candidates.push(path.join(path.dirname(snapshotPath), "history", "index.json"));
  }

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return undefined;
}

async function resolveOpenCostPath(
  workspaceRoot: string,
  snapshotPath?: string
): Promise<string | undefined> {
  const configuredPath = process.env.GKE_DASHBOARD_OPENCOST_PATH;
  const candidates: string[] = [];

  if (configuredPath) {
    if (path.isAbsolute(configuredPath)) {
      candidates.push(configuredPath);
    } else {
      let current = workspaceRoot;
      while (true) {
        candidates.push(path.resolve(current, configuredPath));
        const parent = path.dirname(current);
        if (parent === current) {
          break;
        }
        current = parent;
      }
    }
  } else if (snapshotPath) {
    candidates.push(path.join(path.dirname(snapshotPath), "opencost-summary.json"));
  }

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return undefined;
}

async function readSnapshot(
  workspaceRoot: string
): Promise<{ snapshot: GkeSnapshotFile; snapshotPath?: string }> {
  const snapshotPath = await resolveSnapshotPath(workspaceRoot);
  if (!snapshotPath) {
    return {
      snapshot: bundledSnapshot as GkeSnapshotFile,
      snapshotPath: undefined
    };
  }

  const raw = await readFile(snapshotPath, "utf8");
  return {
    snapshot: JSON.parse(raw) as GkeSnapshotFile,
    snapshotPath
  };
}

function formatBatchTimestamp(value?: string) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function describeBatchStatus(
  batchStatus: BatchStatusFile | undefined,
  snapshotCollectorStatus: GkeDashboardData["snapshot"]["collectorStatus"]
): GkeDashboardData["snapshot"]["batch"] {
  if (!batchStatus) {
    return {
      status: "manual",
      label: "Manual snapshot mode",
      detail: "No batch status file detected. Refresh depends on a manual collector run.",
      tone: "warning",
      intervalSeconds: undefined,
      lastRunAt: undefined,
      lastSuccessAt: undefined,
      consecutiveFailures: 0,
      recentError: null
    };
  }

  const status = batchStatus.status ?? "idle";
  const consecutiveFailures = batchStatus.consecutiveFailures ?? 0;
  const tone =
    status === "failing" || consecutiveFailures > 0 || snapshotCollectorStatus === "failed"
      ? "critical"
      : status === "stopped" || status === "idle" || snapshotCollectorStatus === "partial"
        ? "warning"
        : "healthy";

  const labels = {
    idle: "Idle batch collector",
    running: "Batch refresh in progress",
    healthy: "Healthy batch refresh",
    failing: "Batch refresh failing",
    stopped: "Batch refresh stopped",
    completed: "Batch refresh completed"
  } as const;

  const detail = batchStatus.lastSuccessAt
    ? `Last success ${formatBatchTimestamp(batchStatus.lastSuccessAt)}`
    : "No successful batch run recorded yet";

  return {
    status,
    label: labels[status] ?? "Batch refresh status",
    detail,
    tone,
    intervalSeconds: batchStatus.intervalSeconds,
    lastRunAt: batchStatus.lastRunAt,
    lastSuccessAt: batchStatus.lastSuccessAt,
    consecutiveFailures,
    recentError: batchStatus.lastError ?? null
  };
}

async function readBatchStatus(
  workspaceRoot: string,
  snapshotPath: string | undefined,
  snapshotCollectorStatus: GkeDashboardData["snapshot"]["collectorStatus"]
): Promise<GkeDashboardData["snapshot"]["batch"]> {
  const batchStatusPath = await resolveBatchStatusPath(workspaceRoot, snapshotPath);
  if (!batchStatusPath) {
    return describeBatchStatus(undefined, snapshotCollectorStatus);
  }

  const raw = await readFile(batchStatusPath, "utf8");
  return describeBatchStatus(JSON.parse(raw) as BatchStatusFile, snapshotCollectorStatus);
}

async function readHistoryIndex(
  workspaceRoot: string,
  snapshotPath: string | undefined
): Promise<GkeDashboardData["snapshot"]["history"]> {
  const historyPath = await resolveHistoryPath(workspaceRoot, snapshotPath);
  if (!historyPath) {
    return createHistorySummary([]);
  }

  const raw = await readFile(historyPath, "utf8");
  const parsed = JSON.parse(raw) as HistoryIndexFile;
  return createHistorySummary(Array.isArray(parsed.entries) ? parsed.entries : []);
}

async function readOpenCostSummary(
  workspaceRoot: string,
  snapshotPath: string | undefined
): Promise<OpenCostSummaryFile | undefined> {
  const openCostPath = await resolveOpenCostPath(workspaceRoot, snapshotPath);
  if (!openCostPath) {
    return undefined;
  }

  const raw = await readFile(openCostPath, "utf8");
  return JSON.parse(raw) as OpenCostSummaryFile;
}

export async function getGkeDashboardData(workspaceRoot: string): Promise<GkeDashboardData> {
  const snapshotResult = await readSnapshot(workspaceRoot);
  const snapshot = snapshotResult.snapshot;
  const collectorStatus = snapshot.snapshot?.collectorStatus ?? "complete";
  const collectionWarnings = snapshot.snapshot?.collectionWarnings ?? [];
  const issues = snapshot.snapshot?.issues ?? [];
  const missingSources = snapshot.snapshot?.missingSources ?? deriveMissingSources(collectionWarnings, issues);
  const collectorConfidence =
    snapshot.snapshot?.collectorConfidence ?? defaultCollectorConfidence(collectorStatus, collectionWarnings);
  const affectedAreas = describeAffectedAreas(missingSources);
  const trustNote = describeTrustNote(collectorConfidence, missingSources, issues);
  const batch = await readBatchStatus(workspaceRoot, snapshotResult.snapshotPath, collectorStatus);
  const history = await readHistoryIndex(workspaceRoot, snapshotResult.snapshotPath);
  const openCostSummary = await readOpenCostSummary(workspaceRoot, snapshotResult.snapshotPath);
  const workloads = mergeOpenCostIntoWorkloads(createWorkloadRows(snapshot, collectorConfidence), openCostSummary);
  const namespaces = mapNamespaces(snapshot, workloads, collectorConfidence, openCostSummary);

  return {
    cluster: {
      name: snapshot.cluster.name,
      region: snapshot.cluster.region,
      summaryCards: createSummaryCards(snapshot)
    },
    pressureCards: createPressureCards(snapshot),
    topConsumers: createTopConsumers(snapshot),
    capacityRows: createCapacityRows(snapshot),
    workloads,
    pods: createPodRows(snapshot),
    snapshot: {
      source: snapshot.cluster.source,
      capturedAt: snapshot.cluster.capturedAt,
      health: snapshot.cluster.health,
      collectorStatus,
      collectionWarnings,
      collectorConfidence,
      missingSources,
      issues,
      affectedAreas,
      trustNote,
      batch,
      freshness: describeFreshness(snapshot.cluster.capturedAt),
      history
    },
    efficiency: createEfficiencyOverview(workloads, namespaces, openCostSummary),
    nodes: mapNodes(snapshot),
    namespaces
  };
}
