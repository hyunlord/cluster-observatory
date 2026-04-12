import type {
  CapacityRow,
  ConsumerRow,
  GkeDashboardData,
  NamespaceDetail,
  NodeDetail,
  NodeWorkloadGroup,
  NodeUsageRow,
  PodRow,
  WorkloadAlert,
  WorkloadDetail,
  WorkloadPodGroup,
  WorkloadRow
} from "./gke-dashboard";

export interface DashboardFilters {
  namespace: string;
  node: string;
  search: string;
}

export interface NodeOccupancyRow {
  name: string;
  status: string;
  cpuPercentage: number;
  memoryPercentage: number;
  gpuPercentage: number;
  topWorkloads: string[];
}

export interface DashboardView {
  filters: DashboardFilters;
  topConsumers: {
    cpu: ConsumerRow[];
    memory: ConsumerRow[];
    gpu: ConsumerRow[];
  };
  capacityRows: CapacityRow[];
  workloads: WorkloadRow[];
  namespaces: GkeDashboardData["namespaces"];
  nodes: NodeUsageRow[];
  nodeOccupancy: NodeOccupancyRow[];
  selectedWorkload?: WorkloadDetail;
  filterOptions: {
    namespaces: string[];
    nodes: string[];
  };
}

function toScalar(value: string): number {
  const match = value.match(/([\d.]+)/);
  return match ? Number(match[1]) : 0;
}

function filterWorkloads(workloads: WorkloadRow[], filters: DashboardFilters): WorkloadRow[] {
  const needle = filters.search.trim().toLowerCase();
  return workloads.filter((workload) => {
    if (filters.namespace && workload.namespace !== filters.namespace) {
      return false;
    }
    if (filters.node && workload.node !== filters.node) {
      return false;
    }
    if (needle && !`${workload.name} ${workload.kind} ${workload.namespace}`.toLowerCase().includes(needle)) {
      return false;
    }
    return true;
  });
}

function createFilteredConsumers(
  consumers: GkeDashboardData["topConsumers"],
  workloads: WorkloadRow[]
): GkeDashboardData["topConsumers"] {
  const allowed = new Set(workloads.map((workload) => workload.id));
  const matches = (row: ConsumerRow) => allowed.has(`${row.namespace}/${row.name}`);

  return {
    cpu: consumers.cpu.filter(matches),
    memory: consumers.memory.filter(matches),
    gpu: consumers.gpu.filter(matches)
  };
}

function createSelectedWorkload(
  workloads: WorkloadRow[],
  pods: PodRow[],
  selectedWorkloadId?: string
): WorkloadDetail | undefined {
  const workload = workloads.find((entry) => entry.id === selectedWorkloadId);
  if (!workload) {
    return undefined;
  }

  const workloadPods = pods.filter((pod) => pod.workloadId === selectedWorkloadId);
  const nodeSpread = [...new Set(workloadPods.map((pod) => pod.node))];
  const sortedPods = [...workloadPods].sort((left, right) => {
    const leftScore =
      left.restartCount * 100 +
      (left.readyContainers < left.totalContainers || left.status !== "Running" ? 10 : 0);
    const rightScore =
      right.restartCount * 100 +
      (right.readyContainers < right.totalContainers || right.status !== "Running" ? 10 : 0);
    return rightScore - leftScore || left.name.localeCompare(right.name);
  });
  const requestCpu = Math.max(toScalar(workload.cpuRequests), 0.01);
  const usageCpu = toScalar(workload.cpuUsage);
  const requestMemory = Math.max(toScalar(workload.memoryRequests), 0.01);
  const usageMemory = toScalar(workload.memoryUsage);
  const headroomPercentage = Math.max(0, Math.round(((requestCpu - usageCpu) / requestCpu) * 100));
  const readyPods = workloadPods.filter(
    (pod) => pod.readyContainers >= pod.totalContainers && pod.status === "Running"
  ).length;
  const totalRestarts = workloadPods.reduce((total, pod) => total + pod.restartCount, 0);
  const degradedPods = workloadPods.filter(
    (pod) => pod.readyContainers < pod.totalContainers || !["Running", "Succeeded"].includes(pod.status)
  ).length;
  const alerts: WorkloadAlert[] = [];
  const hotspotPod = sortedPods[0];
  const podGroupsByNode = new Map<string, WorkloadPodGroup>();

  for (const pod of sortedPods) {
    const group =
      podGroupsByNode.get(pod.node) ??
      {
        node: pod.node,
        healthyCount: 0,
        attentionCount: 0,
        pods: []
      };

    if (pod.readyContainers >= pod.totalContainers && pod.status === "Running") {
      group.healthyCount += 1;
    } else {
      group.attentionCount += 1;
    }

    group.pods.push(pod);
    podGroupsByNode.set(pod.node, group);
  }

  const podGroups = [...podGroupsByNode.values()].sort(
    (left, right) => right.attentionCount - left.attentionCount || right.pods.length - left.pods.length
  );

  if (workload.efficiency === "Hot") {
    alerts.push({ label: "High resource pressure", tone: "critical" });
  } else if (workload.efficiency === "Watch") {
    alerts.push({ label: "Pressure watch", tone: "warning" });
  }

  if (headroomPercentage <= 15) {
    alerts.push({ label: "Low request headroom", tone: headroomPercentage <= 5 ? "critical" : "warning" });
  }

  if ((requestCpu >= 1 && usageCpu / requestCpu < 0.35) || (requestMemory >= 4 && usageMemory / requestMemory < 0.35)) {
    alerts.push({ label: "Over-requested footprint", tone: "warning" });
  }

  if (totalRestarts > 0) {
    alerts.push({ label: "Restart activity", tone: totalRestarts >= 3 ? "critical" : "warning" });
  }

  if (degradedPods > 0) {
    alerts.push({ label: "Readiness drift", tone: "critical" });
  }

  const healthTone: WorkloadDetail["summary"]["healthTone"] =
    degradedPods > 0 || totalRestarts >= 3
      ? "critical"
      : workload.efficiency !== "Healthy" || totalRestarts > 0 || headroomPercentage <= 20
        ? "warning"
        : "healthy";

  return {
    workload,
    pods: sortedPods,
    nodeSpread,
    alerts,
    hotspotPod,
    podGroups,
    summary: {
      primaryNode: nodeSpread[0] ?? workload.node,
      podCount: workloadPods.length,
      headroomLabel: `${headroomPercentage}% CPU headroom to request`,
      readyLabel: `${readyPods}/${workloadPods.length || 1} ready`,
      restartLabel: `${totalRestarts} total restarts`,
      statusLabel:
        degradedPods > 0
          ? `${degradedPods} pod${degradedPods === 1 ? "" : "s"} need attention`
          : totalRestarts > 0
            ? "Pods ready with restart activity"
            : "All pods ready",
      hotspotLabel: hotspotPod?.name,
      healthTone
    }
  };
}

function createNodeOccupancy(nodes: NodeUsageRow[], workloads: WorkloadRow[]): NodeOccupancyRow[] {
  return nodes.map((node) => {
    const topWorkloads = workloads
      .filter((workload) => workload.node === node.name)
      .slice(0, 3)
      .map((workload) => workload.name);

    return {
      name: node.name,
      status: node.status,
      cpuPercentage: node.cpuPercentage,
      memoryPercentage: node.memoryPercentage,
      gpuPercentage: node.gpuPercentage,
      topWorkloads
    };
  });
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function createNodeDetail(
  nodes: NodeUsageRow[],
  workloads: WorkloadRow[],
  pods: PodRow[],
  nodeName: string
): NodeDetail | undefined {
  const node = nodes.find((entry) => entry.name === nodeName);
  if (!node) {
    return undefined;
  }

  const nodeWorkloads = workloads.filter((workload) => workload.node === nodeName);
  const nodePods = pods
    .filter((pod) => pod.node === nodeName)
    .sort((left, right) => {
      const leftScore =
        left.restartCount * 100 +
        (left.readyContainers < left.totalContainers || left.status !== "Running" ? 10 : 0);
      const rightScore =
        right.restartCount * 100 +
        (right.readyContainers < right.totalContainers || right.status !== "Running" ? 10 : 0);
      return rightScore - leftScore || left.name.localeCompare(right.name);
    });
  const namespaces = [...new Set(nodeWorkloads.map((workload) => workload.namespace))].sort();
  const alerts: WorkloadAlert[] = [];
  const podGroupsByWorkload = new Map<string, NodeWorkloadGroup>();

  for (const pod of nodePods) {
    const workload = nodeWorkloads.find((entry) => entry.id === pod.workloadId);
    if (!workload) {
      continue;
    }

    const group =
      podGroupsByWorkload.get(workload.id) ??
      {
        workload,
        pods: [],
        healthyCount: 0,
        attentionCount: 0,
        restartCount: 0,
        hotspotPod: undefined
      };

    const isHealthy = pod.readyContainers >= pod.totalContainers && pod.status === "Running";
    if (isHealthy) {
      group.healthyCount += 1;
    } else {
      group.attentionCount += 1;
    }

    group.restartCount += pod.restartCount;
    group.pods.push(pod);

    if (!group.hotspotPod) {
      group.hotspotPod = pod;
    }

    podGroupsByWorkload.set(workload.id, group);
  }

  const workloadGroups = [...podGroupsByWorkload.values()].sort((left, right) => {
    const leftPressure = left.attentionCount * 100 + left.restartCount;
    const rightPressure = right.attentionCount * 100 + right.restartCount;
    return rightPressure - leftPressure || right.workload.pressurePercentage - left.workload.pressurePercentage;
  });

  const readyPods = nodePods.filter(
    (pod) => pod.readyContainers >= pod.totalContainers && pod.status === "Running"
  ).length;
  const totalRestarts = nodePods.reduce((total, pod) => total + pod.restartCount, 0);
  const attentionPods = nodePods.length - readyPods;
  const hotspotPod = nodePods[0];
  const hotspotWorkload = workloadGroups[0]?.workload;

  if (node.status !== "Ready") {
    alerts.push({ label: "Node not ready", tone: "critical" });
  }

  if (node.conditions.some((condition) => condition.type !== "Ready" && condition.status === "True")) {
    alerts.push({ label: "Node conditions firing", tone: "critical" });
  }

  if (node.taints.length > 0) {
    alerts.push({ label: "Node taints present", tone: "warning" });
  }

  if (node.events.some((event) => event.type === "Warning")) {
    alerts.push({ label: "Recent warning events", tone: "warning" });
  }

  if (node.cpuPercentage >= 85 || node.memoryPercentage >= 85 || node.gpuPercentage >= 90) {
    alerts.push({ label: "Node pressure spike", tone: "critical" });
  } else if (node.cpuPercentage >= 60 || node.memoryPercentage >= 60 || node.gpuPercentage >= 60) {
    alerts.push({ label: "Node pressure watch", tone: "warning" });
  }

  if (attentionPods > 0) {
    alerts.push({ label: "Pod attention on node", tone: attentionPods >= 2 ? "critical" : "warning" });
  }

  if (totalRestarts > 0) {
    alerts.push({ label: "Restart activity", tone: totalRestarts >= 3 ? "critical" : "warning" });
  }

  const healthTone: NodeDetail["summary"]["healthTone"] =
    node.status !== "Ready" || attentionPods > 0 || totalRestarts >= 3
      ? "critical"
      : alerts.length > 0
        ? "warning"
        : "healthy";

  return {
    node,
    workloads: nodeWorkloads,
    workloadGroups,
    pods: nodePods,
    namespaces,
    alerts,
    hotspotPod,
    hotspotWorkload,
    summary: {
      workloadCountLabel: pluralize(nodeWorkloads.length, "workload"),
      podCountLabel: pluralize(nodePods.length, "pod"),
      readyLabel: `${readyPods}/${nodePods.length || 1} ready`,
      restartLabel: `${totalRestarts} total restarts`,
      primaryNamespace: namespaces[0] ?? "No namespace",
      dominantWorkload: hotspotWorkload?.name ?? node.topWorkload ?? "No dominant workload",
      statusLabel:
        attentionPods > 0
          ? `${attentionPods} pod${attentionPods === 1 ? "" : "s"} need attention`
          : node.status === "Ready"
            ? "Node ready"
            : node.status,
      healthTone
    }
  };
}

export function buildDashboardView(
  data: GkeDashboardData,
  filters: DashboardFilters,
  selectedWorkloadId?: string
): DashboardView {
  const workloads = filterWorkloads(data.workloads, filters);
  const filteredPods = data.pods.filter((pod) => {
    if (filters.namespace && pod.namespace !== filters.namespace) {
      return false;
    }
    if (filters.node && pod.node !== filters.node) {
      return false;
    }
    const needle = filters.search.trim().toLowerCase();
    if (needle && !`${pod.workloadName} ${pod.name} ${pod.namespace}`.toLowerCase().includes(needle)) {
      return false;
    }
    return true;
  });

  const namespaces = data.namespaces.filter((namespace) => !filters.namespace || namespace.name === filters.namespace);
  const nodes = data.nodes.filter((node) => !filters.node || node.name === filters.node);

  return {
    filters,
    topConsumers: createFilteredConsumers(data.topConsumers, workloads),
    capacityRows: data.capacityRows,
    workloads,
    namespaces,
    nodes,
    nodeOccupancy: createNodeOccupancy(nodes, workloads),
    selectedWorkload: createSelectedWorkload(workloads, filteredPods, selectedWorkloadId),
    filterOptions: {
      namespaces: [...new Set(data.workloads.map((workload) => workload.namespace))].sort(),
      nodes: [...new Set(data.workloads.map((workload) => workload.node))].sort()
    }
  };
}

export function buildNodeDetailView(data: GkeDashboardData, nodeName: string): NodeDetail | undefined {
  return createNodeDetail(data.nodes, data.workloads, data.pods, nodeName);
}

export function buildNamespaceDetailView(data: GkeDashboardData, namespaceName: string): NamespaceDetail | undefined {
  const namespace = data.namespaces.find((entry) => entry.name === namespaceName);
  if (!namespace) {
    return undefined;
  }

  const workloads = data.workloads
    .filter((workload) => workload.namespace === namespaceName)
    .sort((left, right) => right.pressurePercentage - left.pressurePercentage);
  const pods = data.pods
    .filter((pod) => pod.namespace === namespaceName)
    .sort((left, right) => {
      const leftScore =
        left.restartCount * 100 +
        (left.readyContainers < left.totalContainers || left.status !== "Running" ? 10 : 0);
      const rightScore =
        right.restartCount * 100 +
        (right.readyContainers < right.totalContainers || right.status !== "Running" ? 10 : 0);
      return rightScore - leftScore || left.name.localeCompare(right.name);
    });
  const nodes = data.nodes
    .filter((node) => pods.some((pod) => pod.node === node.name) || workloads.some((workload) => workload.node === node.name))
    .sort(
      (left, right) =>
        right.cpuPercentage + right.memoryPercentage + right.gpuPercentage -
        (left.cpuPercentage + left.memoryPercentage + left.gpuPercentage)
    );

  const alertPool = [...namespace.alerts];
  if (workloads.some((workload) => workload.efficiency === "Hot")) {
    alertPool.push({ label: "Hot workload pressure", tone: "critical" });
  }
  if (pods.some((pod) => pod.restartCount > 0 || pod.readyContainers < pod.totalContainers || pod.status !== "Running")) {
    alertPool.push({ label: "Pod health drift", tone: "warning" });
  }

  const alerts = alertPool.filter(
    (alert, index, source) => source.findIndex((candidate) => candidate.label === alert.label) === index
  );
  const topWorkloads = workloads.slice(0, 3);
  const healthTone: NamespaceDetail["summary"]["healthTone"] =
    alerts.some((alert) => alert.tone === "critical")
      ? "critical"
      : alerts.some((alert) => alert.tone === "warning")
        ? "warning"
        : "healthy";

  return {
    namespace,
    workloads,
    topWorkloads,
    pods,
    nodes,
    alerts,
    events: namespace.events,
    summary: {
      workloadCountLabel: pluralize(workloads.length, "workload"),
      podCountLabel: pluralize(pods.length, "pod"),
      nodeCountLabel: pluralize(nodes.length, "node"),
      busiestNode: nodes[0]?.name ?? "No node involvement",
      topWorkload: topWorkloads[0]?.name ?? namespace.topWorkload,
      statusLabel:
        alerts.length > 0
          ? `${alerts[0]?.label ?? "Namespace activity"} in focus`
          : "Namespace operating normally",
      healthTone
    }
  };
}
