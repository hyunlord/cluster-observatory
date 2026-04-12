import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHistoryEntry,
  buildHistoryIndex,
  buildSnapshotFromKubectlData,
  inferClusterMetadata,
  parseCpuQuantity,
  parseMemoryToGiB,
  persistSnapshotArtifacts
} from "../../../../scripts/collect-gke-snapshot.mjs";

describe("collect-gke-snapshot", () => {
  it("parses kubernetes CPU and memory quantities into dashboard units", () => {
    expect(parseCpuQuantity("250m")).toBe(0.25);
    expect(parseCpuQuantity("2")).toBe(2);
    expect(parseCpuQuantity("495442536n")).toBe(0.5);
    expect(parseCpuQuantity("1250u")).toBe(0);
    expect(parseMemoryToGiB("1024Mi")).toBe(1);
    expect(parseMemoryToGiB("2Gi")).toBe(2);
  });

  it("infers cluster metadata from a GKE context string", () => {
    expect(inferClusterMetadata("gke_demo-project_demo-region_demo-cluster")).toEqual({
      name: "demo-cluster",
      region: "demo-region"
    });
  });

  it("builds a dashboard snapshot from kubectl resources and metrics", () => {
    const snapshot = buildSnapshotFromKubectlData({
      context: "gke_demo-project_demo-region_demo-cluster",
      source: "kubectl metrics snapshot",
      capturedAt: "2026-04-11T00:00:00Z",
      nodes: {
        items: [
          {
            metadata: { name: "node-a" },
            spec: {
              taints: [
                {
                  key: "dedicated",
                  value: "gpu",
                  effect: "NoSchedule"
                }
              ]
            },
            status: {
              allocatable: {
                cpu: "8",
                memory: "32768Mi",
                "nvidia.com/gpu": "1"
              },
              conditions: [
                { type: "Ready", status: "True" },
                { type: "MemoryPressure", status: "True", reason: "KubeletHasInsufficientMemory" }
              ]
            }
          },
          {
            metadata: { name: "node-b" },
            status: {
              allocatable: {
                cpu: "4",
                memory: "16384Mi"
              },
              conditions: [{ type: "Ready", status: "True" }]
            }
          }
        ]
      },
      nodeMetrics: {
        items: [
          {
            metadata: { name: "node-a" },
            usage: {
              cpu: "1200m",
              memory: "10240Mi"
            }
          },
          {
            metadata: { name: "node-b" },
            usage: {
              cpu: "800m",
              memory: "5120Mi"
            }
          }
        ]
      },
      pods: {
        items: [
          {
            metadata: {
              namespace: "monitoring",
              name: "grafana-0",
              ownerReferences: [{ kind: "StatefulSet", name: "monitoring-ui" }]
            },
            spec: {
              nodeName: "node-a",
              containers: [
                {},
                {},
                {
                  resources: {
                    requests: {
                      "nvidia.com/gpu": "1"
                    }
                  }
                }
              ]
            },
            status: {
              phase: "Running",
              containerStatuses: [
                {
                  ready: true,
                  restartCount: 1
                },
                {
                  ready: false,
                  restartCount: 3,
                  state: {
                    waiting: {
                      reason: "CrashLoopBackOff"
                    }
                  }
                }
              ]
            }
          },
          {
            metadata: {
              namespace: "default",
              name: "api-5d4b",
              ownerReferences: [{ kind: "ReplicaSet", name: "api-gateway-5d4b" }]
            },
            spec: {
              nodeName: "node-b",
              containers: [
                {
                  resources: {
                    requests: {}
                  }
                }
              ]
            },
            status: {
              phase: "Running",
              containerStatuses: [
                {
                  ready: true,
                  restartCount: 0
                }
              ]
            }
          }
        ]
      },
      podMetrics: {
        items: [
          {
            metadata: { namespace: "monitoring", name: "grafana-0" },
            containers: [
              {
                usage: {
                  cpu: "900m",
                  memory: "3072Mi"
                }
              }
            ]
          },
          {
            metadata: { namespace: "default", name: "api-5d4b" },
            containers: [
              {
                usage: {
                  cpu: "300m",
                  memory: "1024Mi"
                }
              }
            ]
          }
        ]
      },
      events: {
        items: [
          {
            type: "Warning",
            reason: "NodeHasInsufficientMemory",
            note: "Node node-a is low on memory",
            regarding: {
              kind: "Node",
              name: "node-a"
            },
            deprecatedCount: 2,
            metadata: {
              creationTimestamp: "2026-04-11T00:03:00Z"
            }
          }
        ]
      }
    });

    expect(snapshot.cluster.name).toBe("demo-cluster");
    expect(snapshot.cluster.region).toBe("demo-region");
    expect(snapshot.snapshot.collectorStatus).toBe("complete");
    expect(snapshot.snapshot.collectionWarnings).toEqual([]);
    expect(snapshot.snapshot.collectorConfidence).toBe("high");
    expect(snapshot.snapshot.missingSources).toEqual([]);
    expect(snapshot.snapshot.issues).toEqual([]);
    expect(snapshot.usage.cpu.allocatable).toBe(12);
    expect(snapshot.usage.cpu.used).toBe(2);
    expect(snapshot.usage.memory.allocatable).toBe(48);
    expect(snapshot.usage.gpu.allocatable).toBe(1);
    expect(snapshot.usage.gpu.used).toBe(1);
    expect(snapshot.nodes[0]).toMatchObject({
      name: "node-a",
      status: "Ready"
    });
    expect(snapshot.nodes[0]?.conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "MemoryPressure",
          status: "True"
        })
      ])
    );
    expect(snapshot.nodes[0]?.taints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "dedicated",
          effect: "NoSchedule"
        })
      ])
    );
    expect(snapshot.nodes[0]?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "NodeHasInsufficientMemory",
          type: "Warning",
          count: 2
        })
      ])
    );
    expect(snapshot.namespaces[0]).toMatchObject({
      name: "monitoring",
      topWorkload: "monitoring-ui",
      alerts: [],
      events: []
    });
    expect(snapshot.workloads[0]).toMatchObject({
      name: "monitoring-ui",
      kind: "StatefulSet",
      events: []
    });
    expect(snapshot.pods[0]).toMatchObject({
      name: "grafana-0",
      workloadName: "monitoring-ui",
      status: "CrashLoopBackOff",
      reason: "CrashLoopBackOff",
      restartCount: 4,
      readyContainers: 1,
      totalContainers: 3,
      containers: expect.arrayContaining([
        expect.objectContaining({
          name: "container-0",
          ready: true,
          restartCount: 1
        }),
        expect.objectContaining({
          name: "container-1",
          ready: false,
          restartCount: 3,
          reason: "CrashLoopBackOff"
        })
      ])
    });
  });

  it("marks the snapshot as partial and emits warnings when a kubectl source is unavailable", () => {
    const snapshot = buildSnapshotFromKubectlData({
      context: "gke_demo-project_demo-region_demo-cluster",
      source: "kubectl metrics snapshot",
      capturedAt: "2026-04-11T00:00:00Z",
      nodes: { items: [] },
      nodeMetrics: { items: [] },
      pods: { items: [] },
      podMetrics: { items: [] },
      events: { items: [] },
      collectionWarnings: ["events source unavailable"] as string[]
    });

    expect(snapshot.snapshot.collectorStatus).toBe("partial");
    expect(snapshot.snapshot.collectionWarnings).toEqual(["events source unavailable"]);
    expect(snapshot.snapshot.collectorConfidence).toBe("medium");
    expect(snapshot.snapshot.missingSources).toEqual(["events"]);
    expect(snapshot.snapshot.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "events",
          severity: "warning"
        })
      ])
    );
  });

  it("builds a compact history entry and rolling history index from snapshots", () => {
    const olderEntry = {
      capturedAt: "2026-04-10T00:00:00.000Z",
      collectorStatus: "complete",
      cpuUsed: 1.2,
      cpuAllocatable: 12,
      memoryUsed: 10.5,
      memoryAllocatable: 48,
      gpuUsed: 0,
      gpuAllocatable: 1,
      totalRestarts: 1,
      warningNodeCount: 0,
      warningWorkloadCount: 0,
      hotNamespace: "monitoring",
      hotWorkload: "grafana"
    };
    const snapshot = buildSnapshotFromKubectlData({
      context: "gke_demo-project_demo-region_demo-cluster",
      source: "kubectl metrics snapshot",
      capturedAt: "2026-04-11T00:00:00Z",
      nodes: {
        items: [
          {
            metadata: { name: "node-a" },
            status: {
              allocatable: { cpu: "8", memory: "32768Mi" },
              conditions: [
                { type: "Ready", status: "True" },
                { type: "MemoryPressure", status: "True" }
              ]
            }
          }
        ]
      },
      nodeMetrics: {
        items: [
          {
            metadata: { name: "node-a" },
            usage: { cpu: "1200m", memory: "10240Mi" }
          }
        ]
      },
      pods: {
        items: [
          {
            metadata: {
              namespace: "monitoring",
              name: "grafana-0",
              ownerReferences: [{ kind: "StatefulSet", name: "grafana" }]
            },
            spec: { nodeName: "node-a", containers: [{}] },
            status: {
              phase: "Running",
              containerStatuses: [
                {
                  ready: false,
                  restartCount: 3,
                  state: { waiting: { reason: "CrashLoopBackOff" } }
                }
              ]
            }
          }
        ]
      },
      podMetrics: {
        items: [
          {
            metadata: { namespace: "monitoring", name: "grafana-0" },
            containers: [{ usage: { cpu: "900m", memory: "3072Mi" } }]
          }
        ]
      },
      events: {
        items: [
          {
            type: "Warning",
            reason: "BackOff",
            note: "Pod is crash looping",
            regarding: { kind: "Pod", namespace: "monitoring", name: "grafana-0" },
            metadata: { creationTimestamp: "2026-04-11T00:03:00Z" }
          }
        ]
      }
    });

    const entry = buildHistoryEntry(snapshot);
    const history = buildHistoryIndex([olderEntry], entry, 2);

    expect(entry).toMatchObject({
      collectorStatus: "complete",
      totalRestarts: 3,
      warningNodeCount: 1,
      warningWorkloadCount: 1,
      hotNamespace: "monitoring",
      hotWorkload: "grafana"
    });
    expect(history.entries).toHaveLength(2);
    expect(history.entries[0]?.capturedAt).toBe("2026-04-11T00:00:00Z");
    expect(history.entries[1]?.capturedAt).toBe("2026-04-10T00:00:00.000Z");
  });

  it("persists the latest snapshot plus history archive and index", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cluster-observatory-history-"));
    const snapshot = buildSnapshotFromKubectlData({
      context: "gke_demo-project_demo-region_demo-cluster",
      source: "kubectl metrics snapshot",
      capturedAt: "2026-04-11T01:00:00Z",
      nodes: { items: [] },
      nodeMetrics: { items: [] },
      pods: { items: [] },
      podMetrics: { items: [] },
      events: { items: [] }
    });
    const outputPath = path.join(root, "gke-snapshot.local.json");

    const result = await persistSnapshotArtifacts({
      outputPath,
      snapshot,
      historyLimit: 5
    });

    const writtenSnapshot = JSON.parse(await readFile(outputPath, "utf8"));
    const writtenIndex = JSON.parse(await readFile(result.indexPath, "utf8"));

    expect(writtenSnapshot.cluster.capturedAt).toBe("2026-04-11T01:00:00Z");
    expect(result.archivePath).toContain(path.join("history", "2026-04-11T01-00-00-000Z.json"));
    expect(writtenIndex.entries).toHaveLength(1);
    expect(writtenIndex.entries[0]?.capturedAt).toBe("2026-04-11T01:00:00Z");
  });
});
