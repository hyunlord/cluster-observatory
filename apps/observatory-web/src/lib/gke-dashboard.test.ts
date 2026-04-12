import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getGkeDashboardData } from "./gke-dashboard";
import { buildDashboardView, buildNodeDetailView } from "./gke-dashboard-view";

const tempDirs: string[] = [];
const originalSnapshotPath = process.env.GKE_DASHBOARD_SNAPSHOT_PATH;
const originalHistoryPath = process.env.GKE_DASHBOARD_HISTORY_PATH;
const originalOpenCostPath = process.env.GKE_DASHBOARD_OPENCOST_PATH;

describe("getGkeDashboardData", () => {
  afterEach(() => {
    tempDirs.length = 0;
    if (originalSnapshotPath) {
      process.env.GKE_DASHBOARD_SNAPSHOT_PATH = originalSnapshotPath;
    } else {
      delete process.env.GKE_DASHBOARD_SNAPSHOT_PATH;
    }
    if (originalHistoryPath) {
      process.env.GKE_DASHBOARD_HISTORY_PATH = originalHistoryPath;
    } else {
      delete process.env.GKE_DASHBOARD_HISTORY_PATH;
    }
    if (originalOpenCostPath) {
      process.env.GKE_DASHBOARD_OPENCOST_PATH = originalOpenCostPath;
    } else {
      delete process.env.GKE_DASHBOARD_OPENCOST_PATH;
    }
  });

  it("returns a snapshot-backed resource overview payload without development-only metadata", async () => {
    const data = await getGkeDashboardData(process.cwd());

    expect(data.cluster.name).toBeTruthy();
    expect(data.cluster.summaryCards).toHaveLength(4);
    expect(data.pressureCards).toHaveLength(3);
    expect(data.topConsumers.cpu.length).toBeGreaterThan(0);
    expect(data.topConsumers.memory.length).toBeGreaterThan(0);
    expect(data.capacityRows).toHaveLength(3);
    expect(data.workloads.length).toBeGreaterThan(0);
    expect(data.nodes.length).toBeGreaterThan(0);
    expect(data.namespaces.length).toBeGreaterThan(0);
    expect(data.snapshot.source).toBeTruthy();
    expect(data.snapshot.capturedAt).toMatch(/T/);
    expect(data.snapshot.freshness.label).toBeTruthy();
    expect(data.snapshot.collectorStatus).toBeTruthy();
    expect(Array.isArray(data.snapshot.collectionWarnings)).toBe(true);
    expect(data.snapshot.collectorConfidence).toBeTruthy();
    expect(Array.isArray(data.snapshot.missingSources)).toBe(true);
    expect(Array.isArray(data.snapshot.issues)).toBe(true);
    expect(data.efficiency.costSource).toBe("heuristic");
    expect(data.efficiency.signals.length).toBeGreaterThan(0);
    expect(data.efficiency.signals.some((signal) => signal.title === "Cost feed status")).toBe(true);
    expect(data.workloads[0]?.rightsizingHint).toBeDefined();
    expect(data.workloads[0]?.efficiencyConfidence).toBeDefined();
    expect(data.workloads[0]?.idleAllocationEstimate).toBeDefined();
    expect(data.workloads[0]?.estimatedMonthlyCost).not.toBeNull();
    expect(data.workloads[0]?.events).toBeDefined();
    expect(data.namespaces[0]?.alerts).toBeDefined();
    expect(data.namespaces[0]?.events).toBeDefined();
    expect(data.namespaces[0]?.efficiency).toBeDefined();
    expect(data.pods[0]?.reason).toBeDefined();
    expect(Array.isArray(data.pods[0]?.containers)).toBe(true);
    expect(Object.keys(data)).not.toContain("retrospectives");
  });

  it("prefers a live snapshot file from the workspace local data directory when present", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cluster-observatory-dashboard-"));
    tempDirs.push(root);

    process.env.GKE_DASHBOARD_SNAPSHOT_PATH = ".local/gke-snapshot.local.json";
    await mkdir(path.join(root, ".local"), { recursive: true });
    await writeFile(
      path.join(root, ".local", "gke-snapshot.local.json"),
      JSON.stringify(
        {
          cluster: {
            name: "test-cluster",
            region: "test-region",
            source: "kubectl top snapshot",
            capturedAt: new Date().toISOString(),
            health: "Warning"
          },
          snapshot: {
            collectorStatus: "complete",
            collectionWarnings: [],
            collectorConfidence: "high",
            missingSources: [],
            issues: []
          },
          usage: {
            cpu: { allocatable: 12.5, used: 6.25, unit: "vCPU" },
            memory: { allocatable: 48, used: 21.5, unit: "GiB" },
            gpu: { allocatable: 2, used: 1, unit: "GPU", model: "Test GPU" }
          },
          nodes: [
            {
              name: "node-a",
              status: "Ready",
              cpu: { allocatable: 6, used: 3.2, unit: "vCPU" },
              memory: { allocatable: 24, used: 10.4, unit: "GiB" },
              gpu: { allocatable: 1, used: 1, unit: "GPU", model: "Test GPU" }
            }
          ],
          namespaces: [
            {
              name: "default",
              cpuUsed: 1.75,
              memoryUsed: 4.2,
              gpuUsed: 1,
              topWorkload: "trainer-api"
            }
          ],
          workloads: [
            {
              namespace: "default",
              name: "trainer-api",
              kind: "Deployment",
              replicas: 3,
              node: "node-a",
              usage: { cpu: 2.6, memory: 8.4, gpu: 1 },
              requests: { cpu: 2, memory: 6, gpu: 1 },
              limits: { cpu: 4, memory: 10, gpu: 1 }
            },
            {
              namespace: "monitoring",
              name: "monitoring-ui",
              kind: "StatefulSet",
              replicas: 1,
              node: "node-a",
              usage: { cpu: 0.9, memory: 3.1, gpu: 0 },
              requests: { cpu: 0.5, memory: 2, gpu: 0 },
              limits: { cpu: 1, memory: 4, gpu: 0 }
            }
          ]
        },
        null,
        2
      )
    );

    const data = await getGkeDashboardData(root);

    expect(data.cluster.name).toBe("test-cluster");
    expect(data.cluster.summaryCards[0]?.value).toBe("50%");
    expect(data.cluster.summaryCards[0]?.detail).toBe("6.25 / 12.50 vCPU");
    expect(data.snapshot.source).toBe("kubectl top snapshot");
    expect(data.snapshot.freshness.label).toBe("Fresh");
    expect(data.snapshot.collectorStatus).toBe("complete");
    expect(data.snapshot.collectionWarnings).toEqual([]);
    expect(data.snapshot.collectorConfidence).toBe("high");
    expect(data.snapshot.missingSources).toEqual([]);
    expect(data.snapshot.issues).toEqual([]);
    expect(data.nodes[0]?.gpu).toBe("1 / 1");
    expect(data.namespaces[0]?.topWorkload).toBe("trainer-api");
    expect(data.namespaces[0]?.alerts).toEqual([]);
    expect(data.namespaces[0]?.events).toEqual([]);
    expect(data.pressureCards[0]).toMatchObject({
      label: "CPU Pressure",
      percentage: 50
    });
    expect(data.topConsumers.cpu[0]).toMatchObject({
      name: "trainer-api",
      namespace: "default"
    });
    expect(data.capacityRows[0]).toMatchObject({
      label: "CPU",
      allocatable: "12.50 vCPU",
      requests: "2.50 vCPU"
    });
    expect(data.workloads[0]).toMatchObject({
      name: "trainer-api",
      replicas: 3,
      efficiency: "Hot"
    });
    expect(data.workloads[0]?.rightsizingHint).toBeDefined();
    expect(data.namespaces[0]?.efficiency).toBeDefined();
    expect(data.efficiency.costSource).toBe("heuristic");
    expect(data.efficiency.signals.some((signal) => signal.title === "Cost feed status")).toBe(true);
    expect(data.workloads[0]?.events).toEqual([]);
  });

  it("merges an OpenCost summary file when available and flips the cost source to opencost", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cluster-observatory-dashboard-opencost-"));
    tempDirs.push(root);

    process.env.GKE_DASHBOARD_SNAPSHOT_PATH = ".local/gke-snapshot.local.json";
    await mkdir(path.join(root, ".local"), { recursive: true });
    await writeFile(
      path.join(root, ".local", "gke-snapshot.local.json"),
      JSON.stringify(
        {
          cluster: {
            name: "cost-cluster",
            region: "cost-region",
            source: "kubectl top snapshot",
            capturedAt: new Date().toISOString(),
            health: "Stable"
          },
          snapshot: {
            collectorStatus: "complete",
            collectionWarnings: [],
            collectorConfidence: "high",
            missingSources: [],
            issues: []
          },
          usage: {
            cpu: { allocatable: 16, used: 5, unit: "vCPU" },
            memory: { allocatable: 64, used: 20, unit: "GiB" },
            gpu: { allocatable: 1, used: 0, unit: "GPU", model: "Test GPU" }
          },
          nodes: [
            {
              name: "node-a",
              status: "Ready",
              cpu: { allocatable: 16, used: 5, unit: "vCPU" },
              memory: { allocatable: 64, used: 20, unit: "GiB" }
            }
          ],
          namespaces: [
            {
              name: "application",
              cpuUsed: 3,
              memoryUsed: 12,
              gpuUsed: 0,
              topWorkload: "api"
            },
            {
              name: "monitoring",
              cpuUsed: 1.2,
              memoryUsed: 3.5,
              gpuUsed: 0,
              topWorkload: "grafana"
            }
          ],
          workloads: [
            {
              namespace: "application",
              name: "api",
              kind: "Deployment",
              replicas: 3,
              node: "node-a",
              usage: { cpu: 1.2, memory: 8, gpu: 0 },
              requests: { cpu: 2.4, memory: 16, gpu: 0 },
              limits: { cpu: 4, memory: 24, gpu: 0 }
            },
            {
              namespace: "monitoring",
              name: "grafana",
              kind: "Deployment",
              replicas: 1,
              node: "node-a",
              usage: { cpu: 0.2, memory: 2, gpu: 0 },
              requests: { cpu: 1.2, memory: 6, gpu: 0 },
              limits: { cpu: 2, memory: 8, gpu: 0 }
            }
          ]
        },
        null,
        2
      )
    );
    await writeFile(
      path.join(root, ".local", "opencost-summary.json"),
      JSON.stringify(
        {
          source: "opencost",
          capturedAt: "2026-04-13T00:00:00.000Z",
          currency: "USD",
          cluster: {
            totalMonthlyCost: 1234.56,
            idleMonthlyCost: 210.75,
            sharedMonthlyCost: 125.1
          },
          namespaces: [
            {
              name: "application",
              monthlyCost: 410.25,
              idleMonthlyCost: 90.5,
              sharedMonthlyCost: 34.2
            },
            {
              name: "monitoring",
              monthlyCost: 120.0,
              idleMonthlyCost: 50.0,
              sharedMonthlyCost: 12.0
            }
          ],
          workloads: [
            {
              namespace: "application",
              name: "api",
              monthlyCost: 220.5,
              idleMonthlyCost: 45.75,
              sharedMonthlyCost: 10.0
            },
            {
              namespace: "monitoring",
              name: "grafana",
              monthlyCost: 75.0,
              idleMonthlyCost: 28.0,
              sharedMonthlyCost: 8.0
            }
          ]
        },
        null,
        2
      )
    );

    const data = await getGkeDashboardData(root);

    expect(data.efficiency.costSource).toBe("opencost");
    expect(data.efficiency.signals.some((signal) => signal.title === "Top cost hotspot")).toBe(true);
    expect(data.workloads[0]?.actualMonthlyCost).toBe(220.5);
    expect(data.workloads[0]?.name).toBe("api");
    expect(data.workloads[0]?.costSource).toBe("opencost");
    expect(data.namespaces[0]?.efficiency.actualMonthlyCost).toBe(410.25);
    expect(data.namespaces[0]?.name).toBe("application");
    expect(data.efficiency.costSummary.totalMonthlyCost).toBe(1234.56);
    expect(data.efficiency.costSummary.idleMonthlyCost).toBe(210.75);
    expect(data.efficiency.costSummary.sharedMonthlyCost).toBe(125.1);
  });

  it("reads a sibling batch status file when a local snapshot path is configured", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cluster-observatory-dashboard-batch-"));
    tempDirs.push(root);

    process.env.GKE_DASHBOARD_SNAPSHOT_PATH = ".local/gke-snapshot.local.json";
    await mkdir(path.join(root, ".local"), { recursive: true });
    await writeFile(
      path.join(root, ".local", "gke-snapshot.local.json"),
      JSON.stringify(
        {
          cluster: {
            name: "batch-cluster",
            region: "batch-region",
            source: "local snapshot",
            capturedAt: new Date().toISOString(),
            health: "Stable"
          },
          snapshot: {
            collectorStatus: "complete",
            collectionWarnings: [],
            collectorConfidence: "high",
            missingSources: [],
            issues: []
          },
          usage: {
            cpu: { allocatable: 8, used: 1.5, unit: "vCPU" },
            memory: { allocatable: 16, used: 4.5, unit: "GiB" },
            gpu: { allocatable: 0, used: 0, unit: "GPU", model: "GPU" }
          },
          nodes: [
            {
              name: "node-a",
              status: "Ready",
              cpu: { allocatable: 8, used: 1.5, unit: "vCPU" },
              memory: { allocatable: 16, used: 4.5, unit: "GiB" }
            }
          ],
          namespaces: [
            {
              name: "default",
              cpuUsed: 1.5,
              memoryUsed: 4.5,
              gpuUsed: 0,
              topWorkload: "api"
            }
          ],
          workloads: [
            {
              namespace: "default",
              name: "api",
              kind: "Deployment",
              replicas: 1,
              node: "node-a",
              usage: { cpu: 1.5, memory: 4.5, gpu: 0 },
              requests: { cpu: 1, memory: 4, gpu: 0 },
              limits: { cpu: 2, memory: 8, gpu: 0 }
            }
          ]
        },
        null,
        2
      )
    );
    await writeFile(
      path.join(root, ".local", "gke-snapshot-batch-status.json"),
      JSON.stringify(
        {
          intervalSeconds: 300,
          status: "healthy",
          runCount: 3,
          consecutiveFailures: 0,
          lastRunAt: "2026-04-12T12:00:00.000Z",
          lastSuccessAt: "2026-04-12T12:00:05.000Z",
          lastError: null,
          snapshotCollectorStatus: "complete",
          snapshotWarnings: []
        },
        null,
        2
      )
    );

    const data = await getGkeDashboardData(root);

    expect(data.snapshot.batch.status).toBe("healthy");
    expect(data.snapshot.batch.label).toBe("Healthy batch refresh");
    expect(data.snapshot.batch.intervalSeconds).toBe(300);
    expect(data.snapshot.batch.consecutiveFailures).toBe(0);
    expect(data.snapshot.batch.recentError).toBeNull();
  });

  it("reads history index data and exposes recent trend and drift summaries", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cluster-observatory-dashboard-history-"));
    tempDirs.push(root);

    process.env.GKE_DASHBOARD_SNAPSHOT_PATH = ".local/gke-snapshot.local.json";
    process.env.GKE_DASHBOARD_HISTORY_PATH = ".local/history/index.json";
    await mkdir(path.join(root, ".local", "history"), { recursive: true });
    await writeFile(
      path.join(root, ".local", "gke-snapshot.local.json"),
      JSON.stringify(
        {
          cluster: {
            name: "history-cluster",
            region: "history-region",
            source: "local snapshot",
            capturedAt: "2026-04-12T12:10:00.000Z",
            health: "Stable"
          },
          snapshot: {
            collectorStatus: "complete",
            collectionWarnings: [],
            collectorConfidence: "high",
            missingSources: [],
            issues: []
          },
          usage: {
            cpu: { allocatable: 12, used: 6, unit: "vCPU" },
            memory: { allocatable: 48, used: 20, unit: "GiB" },
            gpu: { allocatable: 1, used: 0, unit: "GPU", model: "GPU" }
          },
          nodes: [],
          namespaces: [],
          workloads: [],
          pods: []
        },
        null,
        2
      )
    );
    await writeFile(
      path.join(root, ".local", "history", "index.json"),
      JSON.stringify(
        {
          entries: [
            {
              capturedAt: "2026-04-12T12:10:00.000Z",
              collectorStatus: "complete",
              cpuUsed: 6,
              cpuAllocatable: 12,
              memoryUsed: 20,
              memoryAllocatable: 48,
              gpuUsed: 0,
              gpuAllocatable: 1,
              totalRestarts: 8,
              warningNodeCount: 1,
              warningWorkloadCount: 2,
              hotNamespace: "application",
              hotWorkload: "api-gateway"
            },
            {
              capturedAt: "2026-04-12T12:05:00.000Z",
              collectorStatus: "complete",
              cpuUsed: 4.8,
              cpuAllocatable: 12,
              memoryUsed: 18,
              memoryAllocatable: 48,
              gpuUsed: 0,
              gpuAllocatable: 1,
              totalRestarts: 5,
              warningNodeCount: 0,
              warningWorkloadCount: 1,
              hotNamespace: "monitoring",
              hotWorkload: "grafana"
            },
            {
              capturedAt: "2026-04-12T12:00:00.000Z",
              collectorStatus: "partial",
              cpuUsed: 5.1,
              cpuAllocatable: 12,
              memoryUsed: 17,
              memoryAllocatable: 48,
              gpuUsed: 0,
              gpuAllocatable: 1,
              totalRestarts: 4,
              warningNodeCount: 0,
              warningWorkloadCount: 0,
              hotNamespace: "ml-runtime",
              hotWorkload: "training-job-01"
            }
          ]
        },
        null,
        2
      )
    );

    const data = await getGkeDashboardData(root);

    expect(data.snapshot.history.sampleCount).toBe(3);
    expect(data.snapshot.history.trendCards[0]).toMatchObject({
      label: "CPU Trend",
      latest: "50%",
      delta: "+10 pts"
    });
    expect(data.snapshot.history.driftRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Restart drift",
          value: "+3"
        }),
        expect.objectContaining({
          label: "Warning nodes",
          value: "+1"
        })
      ])
    );
    expect(data.snapshot.history.anomalies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Restart spike",
          tone: "critical"
        }),
        expect.objectContaining({
          title: "Pressure increase",
          tone: "critical"
        })
      ])
    );
    expect(data.snapshot.history.recentSnapshots).toHaveLength(3);
    expect(data.snapshot.history.recentSnapshots[0]).toMatchObject({
      collectorStatus: "complete",
      cpuLabel: "50%",
      restartsLabel: "8 restarts"
    });
  });

  it("resolves the repo-level local snapshot even when the app directory is used as the current working directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cluster-observatory-dashboard-app-cwd-"));
    tempDirs.push(root);

    process.env.GKE_DASHBOARD_SNAPSHOT_PATH = ".local/gke-snapshot.local.json";
    await mkdir(path.join(root, "apps", "observatory-web"), { recursive: true });
    await mkdir(path.join(root, ".local"), { recursive: true });
    await writeFile(
      path.join(root, ".local", "gke-snapshot.local.json"),
      JSON.stringify(
        {
          cluster: {
            name: "app-cwd-cluster",
            region: "app-cwd-region",
            source: "local snapshot",
            capturedAt: new Date().toISOString(),
            health: "Stable"
          },
          snapshot: {
            collectorStatus: "complete",
            collectionWarnings: [],
            collectorConfidence: "high",
            missingSources: [],
            issues: []
          },
          usage: {
            cpu: { allocatable: 10, used: 1.5, unit: "vCPU" },
            memory: { allocatable: 32, used: 7.2, unit: "GiB" },
            gpu: { allocatable: 0, used: 0, unit: "GPU", model: "GPU" }
          },
          nodes: [
            {
              name: "node-a",
              status: "Ready",
              cpu: { allocatable: 10, used: 1.5, unit: "vCPU" },
              memory: { allocatable: 32, used: 7.2, unit: "GiB" }
            }
          ],
          namespaces: [
            {
              name: "default",
              cpuUsed: 1.5,
              memoryUsed: 7.2,
              gpuUsed: 0,
              topWorkload: "api",
              alerts: [],
              events: []
            }
          ],
          workloads: [
            {
              namespace: "default",
              name: "api",
              kind: "Deployment",
              replicas: 1,
              node: "node-a",
              usage: { cpu: 1.5, memory: 7.2, gpu: 0 },
              requests: { cpu: 1, memory: 4, gpu: 0 },
              limits: { cpu: 2, memory: 8, gpu: 0 },
              events: []
            }
          ]
        },
        null,
        2
      )
    );

    const data = await getGkeDashboardData(path.join(root, "apps", "observatory-web"));

    expect(data.cluster.name).toBe("app-cwd-cluster");
    expect(data.snapshot.source).toBe("local snapshot");
  });

  it("builds a filtered workload view with drawer-ready detail data", async () => {
    const data = await getGkeDashboardData(process.cwd());

    const view = buildDashboardView(
      data,
      {
        namespace: "application",
        node: "demo-app-pool-b",
        search: "api"
      },
      "application/api-gateway"
    );

    expect(view.filters.namespace).toBe("application");
    expect(view.filters.node).toBe("demo-app-pool-b");
    expect(view.workloads).toHaveLength(1);
    expect(view.workloads[0]?.name).toBe("api-gateway");
    expect(view.topConsumers.cpu[0]?.name).toBe("api-gateway");
    expect(view.nodeOccupancy.every((node) => node.name === "demo-app-pool-b")).toBe(true);
    expect(view.selectedWorkload?.workload.name).toBe("api-gateway");
    expect(view.selectedWorkload?.pods.length).toBeGreaterThan(0);
    expect(view.selectedWorkload?.pods[0]?.name).toContain("api-gateway");
    expect(view.selectedWorkload?.summary.readyLabel).toBe("2/3 ready");
    expect(view.selectedWorkload?.summary.restartLabel).toBe("5 total restarts");
    expect(view.selectedWorkload?.summary.hotspotLabel).toBe("api-gateway-2");
    expect(view.selectedWorkload?.hotspotPod?.name).toBe("api-gateway-2");
    expect(view.selectedWorkload?.podGroups[0]?.node).toBe("demo-app-pool-b");
    expect(view.selectedWorkload?.podGroups[0]?.attentionCount).toBe(1);
    expect(view.selectedWorkload?.alerts.map((alert) => alert.label)).toEqual(
      expect.arrayContaining(["Readiness drift", "Restart activity", "Pressure watch"])
    );
  });

  it("prefers real pod snapshot data over replica-derived fallback rows", async () => {
    const data = await getGkeDashboardData(process.cwd());
    const view = buildDashboardView(data, { namespace: "", node: "", search: "training" }, "ml-runtime/training-job-01");

    expect(view.selectedWorkload?.pods[0]?.name).toBe("training-job-01-0");
    expect(view.selectedWorkload?.pods[0]?.status).toBe("Running");
    expect(view.selectedWorkload?.pods[0]?.restartCount).toBeGreaterThanOrEqual(1);
    expect(view.selectedWorkload?.pods[0]?.readyContainers).toBe(1);
    expect(view.selectedWorkload?.pods[0]?.reason).toBeTruthy();
    expect(view.selectedWorkload?.pods[0]?.containers.length).toBeGreaterThan(0);
  });

  it("builds a node detail view with hosted workloads, pod health, and hotspot summaries", async () => {
    const data = await getGkeDashboardData(process.cwd());
    const detail = buildNodeDetailView(data, "demo-app-pool-b");

    expect(detail?.node.name).toBe("demo-app-pool-b");
    expect(detail?.summary.workloadCountLabel).toBe("2 workloads");
    expect(detail?.summary.podCountLabel).toBe("5 pods");
    expect(detail?.summary.readyLabel).toBe("3/5 ready");
    expect(detail?.summary.restartLabel).toBe("5 total restarts");
    expect(detail?.summary.primaryNamespace).toBe("application");
    expect(detail?.hotspotPod?.name).toBe("api-gateway-2");
    expect(detail?.hotspotWorkload?.name).toBe("api-gateway");
    expect(detail?.workloadGroups[0]?.workload.name).toBe("api-gateway");
    expect(detail?.workloadGroups[0]?.attentionCount).toBe(1);
    expect(detail?.workloadGroups[0]?.pods[0]?.name).toBe("api-gateway-2");
    expect(detail?.namespaces).toEqual(["application"]);
    expect(detail?.alerts.map((alert) => alert.label)).toEqual(
      expect.arrayContaining(["Pod attention on node", "Restart activity", "Node conditions firing", "Node taints present"])
    );
    expect(detail?.node.conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "MemoryPressure",
          status: "True"
        })
      ])
    );
    expect(detail?.node.taints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "workload",
          effect: "NoSchedule"
        })
      ])
    );
    expect(detail?.node.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "NodeHasInsufficientMemory",
          type: "Warning"
        })
      ])
    );
  });
});
