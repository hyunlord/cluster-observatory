#!/usr/bin/env node

import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function getKubectlBinary(env = process.env) {
  const configured = env.KUBECTL_BIN?.trim();
  return configured && configured.length > 0 ? configured : "kubectl";
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

export function parseCpuQuantity(value) {
  if (!value) {
    return 0;
  }

  if (value.endsWith("n")) {
    return round(Number(value.slice(0, -1)) / 1_000_000_000);
  }

  if (value.endsWith("u")) {
    return round(Number(value.slice(0, -1)) / 1_000_000);
  }

  if (value.endsWith("m")) {
    return round(Number(value.slice(0, -1)) / 1000);
  }

  return round(Number(value));
}

export function parseMemoryToGiB(value) {
  if (!value) {
    return 0;
  }

  const match = /^([0-9.]+)(Ki|Mi|Gi|Ti|Pi|Ei|K|M|G|T|P|E)?$/.exec(value);
  if (!match) {
    return 0;
  }

  const quantity = Number(match[1]);
  const unit = match[2] ?? "";
  const multipliers = {
    Ki: 1 / (1024 * 1024),
    Mi: 1 / 1024,
    Gi: 1,
    Ti: 1024,
    Pi: 1024 * 1024,
    Ei: 1024 * 1024 * 1024,
    K: 1 / (1000 * 1000),
    M: 1 / 1000,
    G: 1,
    T: 1000,
    P: 1000 * 1000,
    E: 1000 * 1000 * 1000
  };

  return round(quantity * (multipliers[unit] ?? 1));
}

export function inferClusterMetadata(context) {
  if (!context) {
    return {
      name: "unknown-cluster",
      region: "unknown-region"
    };
  }

  const segments = context.split("_");
  if (segments.length >= 4 && segments[0] === "gke") {
    return {
      name: segments.at(-1),
      region: segments.at(-2)
    };
  }

  return {
    name: context,
    region: "unknown-region"
  };
}

function toHistoryTimestamp(capturedAt) {
  const normalized = new Date(capturedAt).toISOString();
  return normalized.replaceAll(":", "-").replaceAll(".", "-");
}

function sortHistoryEntries(entries) {
  return [...entries].sort((left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime());
}

function sumMetrics(items, selector) {
  return round(
    items.reduce((total, item) => {
      const value = selector(item);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0)
  );
}

function toReadyStatus(node) {
  const readyCondition = node?.status?.conditions?.find((condition) => condition.type === "Ready");
  return readyCondition?.status === "True" ? "Ready" : "NotReady";
}

function extractNodeConditions(node) {
  return (node?.status?.conditions ?? []).map((condition) => ({
    type: condition?.type ?? "Unknown",
    status: condition?.status ?? "Unknown",
    reason: condition?.reason,
    message: condition?.message
  }));
}

function extractNodeTaints(node) {
  return (node?.spec?.taints ?? []).map((taint) => ({
    key: taint?.key ?? "unknown",
    value: taint?.value,
    effect: taint?.effect ?? "NoSchedule"
  }));
}

function getEventCount(event) {
  return Number(event?.deprecatedCount ?? event?.count ?? event?.series?.count ?? 1);
}

function getEventTimestamp(event) {
  return (
    event?.eventTime ||
    event?.series?.lastObservedTime ||
    event?.lastTimestamp ||
    event?.deprecatedLastTimestamp ||
    event?.metadata?.creationTimestamp ||
    new Date().toISOString()
  );
}

function getEventMessage(event) {
  return event?.note || event?.message || "No event note";
}

function getNodeEventName(event) {
  const regarding = event?.regarding ?? event?.involvedObject;
  if (regarding?.kind === "Node") {
    return regarding?.name;
  }

  return undefined;
}

function getEventTarget(event) {
  return event?.regarding ?? event?.involvedObject ?? {};
}

function toDashboardEvent(event) {
  return {
    type: event?.type ?? "Normal",
    reason: event?.reason ?? "Unknown",
    message: getEventMessage(event),
    count: getEventCount(event),
    lastSeen: getEventTimestamp(event)
  };
}

function getPodContainers(pod) {
  return Array.isArray(pod?.spec?.containers) ? pod.spec.containers : [];
}

function getContainerStatuses(pod) {
  return Array.isArray(pod?.status?.containerStatuses) ? pod.status.containerStatuses : [];
}

function getGpuRequestForPod(pod) {
  return getPodContainers(pod).reduce((total, container) => {
    const requests = container?.resources?.requests ?? {};
    return total + Number(requests["nvidia.com/gpu"] ?? 0);
  }, 0);
}

function getGpuLimitForPod(pod) {
  return getPodContainers(pod).reduce((total, container) => {
    const limits = container?.resources?.limits ?? {};
    return total + Number(limits["nvidia.com/gpu"] ?? 0);
  }, 0);
}

function getCpuRequestForContainer(container) {
  return parseCpuQuantity(container?.resources?.requests?.cpu);
}

function getCpuLimitForContainer(container) {
  return parseCpuQuantity(container?.resources?.limits?.cpu);
}

function getMemoryRequestForContainer(container) {
  return parseMemoryToGiB(container?.resources?.requests?.memory);
}

function getMemoryLimitForContainer(container) {
  return parseMemoryToGiB(container?.resources?.limits?.memory);
}

function getGpuRequestForContainer(container) {
  return Number(container?.resources?.requests?.["nvidia.com/gpu"] ?? 0);
}

function getGpuLimitForContainer(container) {
  return Number(container?.resources?.limits?.["nvidia.com/gpu"] ?? 0);
}

function getContainerState(status) {
  if (status?.state?.waiting) {
    return "waiting";
  }

  if (status?.state?.terminated) {
    return "terminated";
  }

  if (status?.state?.running) {
    return "running";
  }

  return "unknown";
}

function getContainerReason(status) {
  return status?.state?.waiting?.reason || status?.state?.terminated?.reason || (status?.ready ? "Running" : undefined);
}

function inferIssueSource(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes("node metrics")) {
    return "node-metrics";
  }
  if (normalized.includes("pod metrics")) {
    return "pod-metrics";
  }
  if (normalized.includes("nodes")) {
    return "nodes";
  }
  if (normalized.includes("pods")) {
    return "pods";
  }
  if (normalized.includes("events")) {
    return "events";
  }
  return label.toLowerCase().replaceAll(/\s+/g, "-");
}

function inferIssueSeverity(source) {
  return source === "nodes" || source === "pods" ? "critical" : "warning";
}

function createCollectionIssue(label, message) {
  const source = inferIssueSource(label);
  return {
    source,
    severity: inferIssueSeverity(source),
    message: `${label} unavailable`,
    detail: message
  };
}

function normalizeCollectionIssues(collectionWarnings = [], collectionIssues = []) {
  const derivedIssues = collectionWarnings.map((warning) => {
    const [label, ...detailParts] = warning.split(" unavailable: ");
    return createCollectionIssue(label, detailParts.join(" unavailable: ") || warning);
  });

  const seen = new Set();
  return [...collectionIssues, ...derivedIssues].filter((issue) => {
    const key = `${issue.source}:${issue.message}:${issue.detail ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getCollectorConfidence(status, issues) {
  if (status === "failed") {
    return "low";
  }

  if (issues.length > 0) {
    return "medium";
  }

  return "high";
}

function getCpuRequestForPod(pod) {
  return getPodContainers(pod).reduce((total, container) => {
    const requests = container?.resources?.requests ?? {};
    return total + parseCpuQuantity(requests.cpu);
  }, 0);
}

function getCpuLimitForPod(pod) {
  return getPodContainers(pod).reduce((total, container) => {
    const limits = container?.resources?.limits ?? {};
    return total + parseCpuQuantity(limits.cpu);
  }, 0);
}

function getMemoryRequestForPod(pod) {
  return getPodContainers(pod).reduce((total, container) => {
    const requests = container?.resources?.requests ?? {};
    return total + parseMemoryToGiB(requests.memory);
  }, 0);
}

function getMemoryLimitForPod(pod) {
  return getPodContainers(pod).reduce((total, container) => {
    const limits = container?.resources?.limits ?? {};
    return total + parseMemoryToGiB(limits.memory);
  }, 0);
}

function normalizeWorkloadName(pod) {
  const owner = pod?.metadata?.ownerReferences?.[0];
  if (owner?.name) {
    return owner.kind === "ReplicaSet" ? owner.name.replace(/-[a-f0-9]{4,}$/, "") : owner.name;
  }

  const labels = pod?.metadata?.labels ?? {};
  return (
    labels["app.kubernetes.io/name"] ||
    labels.app ||
    pod?.metadata?.generateName?.replace(/-$/, "") ||
    pod?.metadata?.name ||
    "unknown-workload"
  );
}

function normalizeWorkloadKind(pod) {
  const owner = pod?.metadata?.ownerReferences?.[0];
  if (owner?.kind === "ReplicaSet") {
    return "Deployment";
  }

  return owner?.kind ?? "Pod";
}

function buildNamespaceUsage(pods, podMetrics, namespaceSignals = new Map()) {
  const usageByNamespace = new Map();

  for (const metric of podMetrics.items ?? []) {
    const namespace = metric?.metadata?.namespace;
    if (!namespace) {
      continue;
    }

    const current =
      usageByNamespace.get(namespace) ??
      {
        name: namespace,
        cpuUsed: 0,
        memoryUsed: 0,
        gpuUsed: 0,
        topWorkload: "unknown-workload",
        alerts: [],
        events: []
      };

    current.cpuUsed = round(
      current.cpuUsed +
        sumMetrics(metric?.containers ?? [], (container) => parseCpuQuantity(container?.usage?.cpu))
    );
    current.memoryUsed = round(
      current.memoryUsed +
        sumMetrics(metric?.containers ?? [], (container) => parseMemoryToGiB(container?.usage?.memory))
    );
    usageByNamespace.set(namespace, current);
  }

  const workloadUsage = new Map();

  for (const pod of pods.items ?? []) {
    const namespace = pod?.metadata?.namespace;
    if (!namespace) {
      continue;
    }

    const namespaceEntry =
      usageByNamespace.get(namespace) ??
      {
        name: namespace,
        cpuUsed: 0,
        memoryUsed: 0,
        gpuUsed: 0,
        topWorkload: "unknown-workload",
        alerts: [],
        events: []
      };

    namespaceEntry.gpuUsed = round(namespaceEntry.gpuUsed + getGpuRequestForPod(pod), 0);
    usageByNamespace.set(namespace, namespaceEntry);

    const workloadName = normalizeWorkloadName(pod);
    const workloadKey = `${namespace}/${workloadName}`;
    const currentScore = workloadUsage.get(workloadKey) ?? 0;
    const metric = (podMetrics.items ?? []).find(
      (item) => item?.metadata?.namespace === namespace && item?.metadata?.name === pod?.metadata?.name
    );
    const score =
      sumMetrics(metric?.containers ?? [], (container) => parseCpuQuantity(container?.usage?.cpu)) +
      sumMetrics(metric?.containers ?? [], (container) => parseMemoryToGiB(container?.usage?.memory));
    workloadUsage.set(workloadKey, currentScore + score);
  }

  for (const [namespace, entry] of usageByNamespace) {
    let bestWorkload = entry.topWorkload;
    let bestScore = -1;

    for (const [workloadKey, score] of workloadUsage) {
      if (!workloadKey.startsWith(`${namespace}/`)) {
        continue;
      }

      if (score > bestScore) {
        bestScore = score;
        bestWorkload = workloadKey.split("/")[1];
      }
    }

    entry.topWorkload = bestWorkload;
  }

  for (const [namespace, signal] of namespaceSignals) {
    const namespaceEntry =
      usageByNamespace.get(namespace) ??
      {
        name: namespace,
        cpuUsed: 0,
        memoryUsed: 0,
        gpuUsed: 0,
        topWorkload: "unknown-workload"
      };

    namespaceEntry.alerts = signal.alerts;
    namespaceEntry.events = signal.events;
    usageByNamespace.set(namespace, namespaceEntry);
  }

  return [...usageByNamespace.values()].sort((left, right) => right.cpuUsed - left.cpuUsed);
}

function buildNodeEvents(events) {
  const eventsByNode = new Map();

  for (const event of events?.items ?? []) {
    const nodeName = getNodeEventName(event);
    if (!nodeName) {
      continue;
    }

    const bucket = eventsByNode.get(nodeName) ?? [];
    bucket.push(toDashboardEvent(event));
    eventsByNode.set(nodeName, bucket);
  }

  for (const [nodeName, bucket] of eventsByNode) {
    bucket.sort((left, right) => new Date(right.lastSeen).getTime() - new Date(left.lastSeen).getTime());
    eventsByNode.set(nodeName, bucket.slice(0, 5));
  }

  return eventsByNode;
}

function buildNodeUsage(nodes, nodeMetrics, pods, events) {
  const gpuRequestsByNode = new Map();
  for (const pod of pods.items ?? []) {
    const nodeName = pod?.spec?.nodeName;
    if (!nodeName) {
      continue;
    }

    gpuRequestsByNode.set(nodeName, (gpuRequestsByNode.get(nodeName) ?? 0) + getGpuRequestForPod(pod));
  }

  const metricsByNode = new Map((nodeMetrics.items ?? []).map((item) => [item?.metadata?.name, item]));
  const eventsByNode = buildNodeEvents(events);

  return (nodes.items ?? []).map((node) => {
    const metric = metricsByNode.get(node?.metadata?.name);
    const gpuAllocatable = Number(node?.status?.allocatable?.["nvidia.com/gpu"] ?? 0);
    const nodeName = node?.metadata?.name;

    return {
      name: nodeName ?? "unknown-node",
      status: toReadyStatus(node),
      cpu: {
        allocatable: parseCpuQuantity(node?.status?.allocatable?.cpu),
        used: parseCpuQuantity(metric?.usage?.cpu),
        unit: "vCPU"
      },
      memory: {
        allocatable: parseMemoryToGiB(node?.status?.allocatable?.memory),
        used: parseMemoryToGiB(metric?.usage?.memory),
        unit: "GiB"
      },
      ...(gpuAllocatable > 0
        ? {
            gpu: {
              allocatable: gpuAllocatable,
              used: gpuRequestsByNode.get(nodeName) ?? 0,
              unit: "GPU",
              model: node?.metadata?.labels?.["cloud.google.com/gke-accelerator"] ?? "GPU"
            }
          }
        : {}),
      conditions: extractNodeConditions(node),
      taints: extractNodeTaints(node),
      events: eventsByNode.get(nodeName) ?? []
    };
  });
}

function normalizeOwnerKind(kind) {
  if (kind === "ReplicaSet") {
    return "Deployment";
  }

  return kind ?? "Pod";
}

function normalizeOwnerName(kind, name) {
  if (!name) {
    return "unknown-workload";
  }

  return kind === "ReplicaSet" ? name.replace(/-[a-f0-9]{4,}$/, "") : name;
}

function createNamespaceSignalBucket() {
  return {
    alerts: [],
    events: []
  };
}

function appendNamespaceAlert(bucket, label, tone) {
  if (bucket.alerts.some((alert) => alert.label === label)) {
    return;
  }

  bucket.alerts.push({ label, tone });
}

function buildEventSignals(pods, events) {
  const podIndex = new Map(
    (pods.items ?? []).map((pod) => [
      `${pod?.metadata?.namespace}/${pod?.metadata?.name}`,
      {
        namespace: pod?.metadata?.namespace,
        workloadName: normalizeWorkloadName(pod),
        workloadKind: normalizeWorkloadKind(pod)
      }
    ])
  );
  const namespaceSignals = new Map();
  const workloadEvents = new Map();

  for (const event of events?.items ?? []) {
    const target = getEventTarget(event);
    const namespace = target?.namespace;
    const dashboardEvent = toDashboardEvent(event);

    if (namespace) {
      const namespaceBucket = namespaceSignals.get(namespace) ?? createNamespaceSignalBucket();
      namespaceBucket.events.push(dashboardEvent);
      if (dashboardEvent.type === "Warning") {
        appendNamespaceAlert(namespaceBucket, dashboardEvent.reason, "warning");
      }
      namespaceSignals.set(namespace, namespaceBucket);
    }

    let workloadNamespace = namespace;
    let workloadName;

    if (target?.kind === "Pod" && namespace && target?.name) {
      const podRef = podIndex.get(`${namespace}/${target.name}`);
      workloadName = podRef?.workloadName;
      workloadNamespace = podRef?.namespace ?? namespace;
    } else if (namespace && target?.kind) {
      workloadName = normalizeOwnerName(target.kind, target?.name);
    }

    if (!workloadNamespace || !workloadName) {
      continue;
    }

    const bucket = workloadEvents.get(`${workloadNamespace}/${workloadName}`) ?? [];
    bucket.push(dashboardEvent);
    workloadEvents.set(`${workloadNamespace}/${workloadName}`, bucket);
  }

  for (const bucket of namespaceSignals.values()) {
    bucket.events.sort((left, right) => new Date(right.lastSeen).getTime() - new Date(left.lastSeen).getTime());
    bucket.events = bucket.events.slice(0, 5);
    bucket.alerts = bucket.alerts.slice(0, 3);
  }

  for (const [key, bucket] of workloadEvents) {
    bucket.sort((left, right) => new Date(right.lastSeen).getTime() - new Date(left.lastSeen).getTime());
    workloadEvents.set(key, bucket.slice(0, 5));
  }

  return { namespaceSignals, workloadEvents };
}

function buildWorkloads(pods, podMetrics, workloadEvents = new Map()) {
  const podMetricsByName = new Map(
    (podMetrics.items ?? []).map((item) => [`${item?.metadata?.namespace}/${item?.metadata?.name}`, item])
  );

  const workloads = new Map();

  for (const pod of pods.items ?? []) {
    const namespace = pod?.metadata?.namespace;
    if (!namespace) {
      continue;
    }

    const workloadName = normalizeWorkloadName(pod);
    const workloadKind = normalizeWorkloadKind(pod);
    const key = `${namespace}/${workloadKind}/${workloadName}`;
    const metric = podMetricsByName.get(`${namespace}/${pod?.metadata?.name}`);
    const current =
      workloads.get(key) ??
      {
        namespace,
        name: workloadName,
        kind: workloadKind,
        replicas: 0,
        node: pod?.spec?.nodeName ?? "unassigned",
        usage: { cpu: 0, memory: 0, gpu: 0 },
        requests: { cpu: 0, memory: 0, gpu: 0 },
        limits: { cpu: 0, memory: 0, gpu: 0 },
        events: workloadEvents.get(`${namespace}/${workloadName}`) ?? []
      };

    current.replicas += 1;
    current.usage.cpu = round(
      current.usage.cpu +
        sumMetrics(metric?.containers ?? [], (container) => parseCpuQuantity(container?.usage?.cpu))
    );
    current.usage.memory = round(
      current.usage.memory +
        sumMetrics(metric?.containers ?? [], (container) => parseMemoryToGiB(container?.usage?.memory))
    );
    current.usage.gpu = round(current.usage.gpu + getGpuRequestForPod(pod), 0);

    current.requests.cpu = round(current.requests.cpu + getCpuRequestForPod(pod));
    current.requests.memory = round(current.requests.memory + getMemoryRequestForPod(pod));
    current.requests.gpu = round(current.requests.gpu + getGpuRequestForPod(pod), 0);

    current.limits.cpu = round(current.limits.cpu + getCpuLimitForPod(pod));
    current.limits.memory = round(current.limits.memory + getMemoryLimitForPod(pod));
    current.limits.gpu = round(current.limits.gpu + getGpuLimitForPod(pod), 0);

    workloads.set(key, current);
  }

  return [...workloads.values()].sort((left, right) => right.usage.cpu - left.usage.cpu);
}

function toPodStatus(pod) {
  for (const status of getContainerStatuses(pod)) {
    const waitingReason = status?.state?.waiting?.reason;
    if (waitingReason) {
      return waitingReason;
    }

    const terminatedReason = status?.state?.terminated?.reason;
    if (terminatedReason) {
      return terminatedReason;
    }
  }

  if (pod?.status?.phase === "Pending") {
    return "Pending";
  }

  if (pod?.status?.phase === "Succeeded") {
    return "Succeeded";
  }

  if (pod?.status?.phase === "Failed") {
    return "Failed";
  }

  return pod?.status?.phase || "Running";
}

function getPodRestartCount(pod) {
  return getContainerStatuses(pod).reduce((total, status) => total + Number(status?.restartCount ?? 0), 0);
}

function getPodReadyCounts(pod) {
  const statuses = getContainerStatuses(pod);
  const readyContainers = statuses.filter((status) => status?.ready).length;
  const totalContainers = Math.max(getPodContainers(pod).length, statuses.length, 1);

  return {
    readyContainers,
    totalContainers
  };
}

function buildPods(pods, podMetrics) {
  const podMetricsByName = new Map(
    (podMetrics.items ?? []).map((item) => [`${item?.metadata?.namespace}/${item?.metadata?.name}`, item])
  );

  return (pods.items ?? []).map((pod) => {
    const namespace = pod?.metadata?.namespace ?? "default";
    const metric = podMetricsByName.get(`${namespace}/${pod?.metadata?.name}`);
    const readiness = getPodReadyCounts(pod);
    const containers = getPodContainers(pod).map((container, index) => {
      const statuses = getContainerStatuses(pod);
      const status =
        statuses.find((entry) => entry?.name && entry.name === container?.name) ??
        statuses[index];

      return {
        name: container?.name ?? status?.name ?? `container-${index}`,
        ready: Boolean(status?.ready),
        restartCount: Number(status?.restartCount ?? 0),
        state: getContainerState(status),
        reason: getContainerReason(status),
        requests: {
          cpu: round(getCpuRequestForContainer(container)),
          memory: round(getMemoryRequestForContainer(container)),
          gpu: round(getGpuRequestForContainer(container), 0)
        },
        limits: {
          cpu: round(getCpuLimitForContainer(container)),
          memory: round(getMemoryLimitForContainer(container)),
          gpu: round(getGpuLimitForContainer(container), 0)
        }
      };
    });
    const reason = toPodStatus(pod);

    return {
      namespace,
      workloadName: normalizeWorkloadName(pod),
      workloadKind: normalizeWorkloadKind(pod),
      name: pod?.metadata?.name ?? "unknown-pod",
      node: pod?.spec?.nodeName ?? "unassigned",
      status: reason,
      reason,
      restartCount: getPodRestartCount(pod),
      readyContainers: readiness.readyContainers,
      totalContainers: readiness.totalContainers,
      containers,
      usage: {
        cpu: round(sumMetrics(metric?.containers ?? [], (container) => parseCpuQuantity(container?.usage?.cpu))),
        memory: round(
          sumMetrics(metric?.containers ?? [], (container) => parseMemoryToGiB(container?.usage?.memory))
        ),
        gpu: round(getGpuRequestForPod(pod), 0)
      }
    };
  });
}

export function buildSnapshotFromKubectlData({
  context,
  source,
  capturedAt,
  nodes,
  nodeMetrics,
  pods,
  podMetrics,
  events,
  collectionWarnings = /** @type {string[]} */ ([]),
  collectionIssues = /** @type {any[]} */ ([])
}) {
  const issues = normalizeCollectionIssues(collectionWarnings, collectionIssues);
  const missingSources = [...new Set(issues.map((issue) => issue.source))];
  const cluster = inferClusterMetadata(context);
  const nodeUsage = buildNodeUsage(nodes, nodeMetrics, pods, events);
  const eventSignals = buildEventSignals(pods, events);
  const namespaces = buildNamespaceUsage(pods, podMetrics, eventSignals.namespaceSignals);
  const workloads = buildWorkloads(pods, podMetrics, eventSignals.workloadEvents);
  const podRows = buildPods(pods, podMetrics);
  const allReady = nodeUsage.every((node) => node.status === "Ready");
  const collectorStatus =
    missingSources.includes("nodes") || missingSources.includes("pods")
      ? "failed"
      : issues.length > 0
        ? "partial"
        : "complete";
  const collectorConfidence = getCollectorConfidence(collectorStatus, issues);

  return {
    cluster: {
      name: cluster.name,
      region: cluster.region,
      source,
      capturedAt,
      health:
        collectorStatus === "failed"
          ? "Unavailable"
          : collectorStatus === "partial"
            ? "Partial"
            : allReady
              ? "Stable"
              : "Degraded"
    },
    snapshot: {
      collectorStatus,
      collectionWarnings,
      collectorConfidence,
      missingSources,
      issues
    },
    usage: {
      cpu: {
        allocatable: round(sumMetrics(nodeUsage, (node) => node.cpu.allocatable)),
        used: round(sumMetrics(nodeUsage, (node) => node.cpu.used)),
        unit: "vCPU"
      },
      memory: {
        allocatable: round(sumMetrics(nodeUsage, (node) => node.memory.allocatable)),
        used: round(sumMetrics(nodeUsage, (node) => node.memory.used)),
        unit: "GiB"
      },
      gpu: {
        allocatable: round(sumMetrics(nodeUsage, (node) => node.gpu?.allocatable ?? 0), 0),
        used: round(sumMetrics(nodeUsage, (node) => node.gpu?.used ?? 0), 0),
        unit: "GPU",
        model: nodeUsage.find((node) => node.gpu?.model)?.gpu?.model ?? "GPU"
      }
    },
    nodes: nodeUsage,
    namespaces,
    workloads,
    pods: podRows
  };
}

export function buildHistoryEntry(snapshot) {
  const warningNodeCount = (snapshot.nodes ?? []).filter(
    (node) =>
      node.status !== "Ready" ||
      (node.conditions ?? []).some((condition) => condition.type !== "Ready" && condition.status === "True") ||
      (node.events ?? []).some((event) => event.type === "Warning")
  ).length;
  const warningWorkloadCount = (snapshot.workloads ?? []).filter((workload) =>
    (workload.events ?? []).some((event) => event.type === "Warning")
  ).length;
  const totalRestarts = (snapshot.pods ?? []).reduce((total, pod) => total + Number(pod.restartCount ?? 0), 0);
  const hotNamespace = [...(snapshot.namespaces ?? [])]
    .sort((left, right) => right.cpuUsed + right.memoryUsed + right.gpuUsed * 100 - (left.cpuUsed + left.memoryUsed + left.gpuUsed * 100))[0]
    ?.name;
  const hotWorkload = [...(snapshot.workloads ?? [])]
    .sort(
      (left, right) =>
        right.usage.cpu + right.usage.memory + right.usage.gpu * 100 - (left.usage.cpu + left.usage.memory + left.usage.gpu * 100)
    )[0]?.name;

  return {
    capturedAt: snapshot.cluster.capturedAt,
    collectorStatus: snapshot.snapshot?.collectorStatus ?? "complete",
    cpuUsed: snapshot.usage.cpu.used,
    cpuAllocatable: snapshot.usage.cpu.allocatable,
    memoryUsed: snapshot.usage.memory.used,
    memoryAllocatable: snapshot.usage.memory.allocatable,
    gpuUsed: snapshot.usage.gpu.used,
    gpuAllocatable: snapshot.usage.gpu.allocatable,
    totalRestarts,
    warningNodeCount,
    warningWorkloadCount,
    hotNamespace,
    hotWorkload
  };
}

export function buildHistoryIndex(existingEntries, nextEntry, limit = 24) {
  return {
    entries: sortHistoryEntries(
      [...existingEntries.filter((entry) => entry.capturedAt !== nextEntry.capturedAt), nextEntry].slice(0, limit + 1)
    ).slice(0, limit)
  };
}

async function readHistoryIndex(indexPath) {
  try {
    const raw = await readFile(indexPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}

export async function persistSnapshotArtifacts({
  outputPath,
  snapshot,
  historyIndexPath = path.join(path.dirname(outputPath), "history", "index.json"),
  historyLimit = 24
}) {
  const historyDir = path.dirname(historyIndexPath);
  const archivePath = path.join(historyDir, `${toHistoryTimestamp(snapshot.cluster.capturedAt)}.json`);
  const nextEntry = buildHistoryEntry(snapshot);
  const existingEntries = await readHistoryIndex(historyIndexPath);
  const historyIndex = buildHistoryIndex(existingEntries, nextEntry, historyLimit);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(historyDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(snapshot, null, 2));
  await writeFile(archivePath, JSON.stringify(snapshot, null, 2));
  await writeFile(historyIndexPath, JSON.stringify(historyIndex, null, 2));

  return {
    outputPath,
    archivePath,
    indexPath: historyIndexPath
  };
}

async function kubectlJson(args) {
  const { stdout } = await execFileAsync(getKubectlBinary(), args, {
    maxBuffer: 1024 * 1024 * 20
  });
  return JSON.parse(stdout);
}

async function kubectlText(args) {
  const { stdout } = await execFileAsync(getKubectlBinary(), args, {
    maxBuffer: 1024 * 1024 * 20
  });
  return stdout.trim();
}

async function safeKubectlJson(label, args) {
  try {
    return {
      data: await kubectlJson(args),
      warning: undefined,
      issue: undefined
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      data: { items: [] },
      warning: `${label} unavailable: ${message}`,
      issue: createCollectionIssue(label, message)
    };
  }
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = token.split("=", 2);
    const key = rawKey.slice(2);
    const nextToken = argv[index + 1];
    const hasSeparateValue = inlineValue === undefined && nextToken && !nextToken.startsWith("--");
    const value = inlineValue ?? (hasSeparateValue ? nextToken : true);
    parsed[key] = value;

    if (hasSeparateValue) {
      index += 1;
    }
  }

  return parsed;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: node scripts/collect-gke-snapshot.mjs [options]",
      "",
      "Options:",
      "  --output <path>   Write the snapshot JSON to a custom path.",
      "  --history-index <path>  Write the history index JSON to a custom path.",
      "  --context <name>  Override kubectl current-context.",
      "  --source <label>  Override the snapshot source label.",
      "                   Defaults to .local/gke-snapshot.local.json.",
      "  --help            Show this help message."
    ].join("\n")
  );
}

async function findWorkspaceRoot(cwd) {
  let current = cwd;
  while (true) {
    try {
      await access(path.join(current, "pnpm-workspace.yaml"));
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return cwd;
      }
      current = parent;
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const workspaceRoot = await findWorkspaceRoot(process.cwd());
  const outputPath = path.resolve(workspaceRoot, args.output ?? ".local/gke-snapshot.local.json");
  const historyIndexPath = path.resolve(
    workspaceRoot,
    args["history-index"] ?? process.env.GKE_DASHBOARD_HISTORY_PATH ?? ".local/history/index.json"
  );
  const context = args.context ?? (await kubectlText(["config", "current-context"]));
  const capturedAt = new Date().toISOString();

  const [nodesResult, nodeMetricsResult, podsResult, podMetricsResult, eventsResult] = await Promise.all([
    safeKubectlJson("nodes", ["get", "nodes", "-o", "json"]),
    safeKubectlJson("node metrics", ["get", "--raw", "/apis/metrics.k8s.io/v1beta1/nodes"]),
    safeKubectlJson("pods", ["get", "pods", "-A", "-o", "json"]),
    safeKubectlJson("pod metrics", ["get", "--raw", "/apis/metrics.k8s.io/v1beta1/pods"]),
    safeKubectlJson("events", ["get", "events", "-A", "-o", "json"])
  ]);
  const collectionWarnings = [
    nodesResult.warning,
    nodeMetricsResult.warning,
    podsResult.warning,
    podMetricsResult.warning,
    eventsResult.warning
  ].filter(Boolean);
  const collectionIssues = [
    nodesResult.issue,
    nodeMetricsResult.issue,
    podsResult.issue,
    podMetricsResult.issue,
    eventsResult.issue
  ].filter(Boolean);

  const snapshot = buildSnapshotFromKubectlData({
    context,
    source: args.source ?? "kubectl metrics snapshot",
    capturedAt,
    nodes: nodesResult.data,
    nodeMetrics: nodeMetricsResult.data,
    pods: podsResult.data,
    podMetrics: podMetricsResult.data,
    events: eventsResult.data,
    collectionWarnings,
    collectionIssues
  });

  await persistSnapshotArtifacts({
    outputPath,
    historyIndexPath,
    snapshot
  });

  process.stdout.write(`${outputPath}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`collect-gke-snapshot failed: ${message}\n`);
    process.exitCode = 1;
  });
}
