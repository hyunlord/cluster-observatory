import { describe, expect, it } from "vitest";
import {
  buildBatchState,
  normalizeIntervalSeconds
} from "../../../../scripts/collect-gke-snapshot-batch.mjs";
import { getKubectlBinary } from "../../../../scripts/collect-gke-snapshot.mjs";

describe("collect-gke-snapshot batch", () => {
  it("normalizes batch intervals with a safe lower bound", () => {
    expect(normalizeIntervalSeconds(undefined, 300)).toBe(300);
    expect(normalizeIntervalSeconds("0", 300)).toBe(300);
    expect(normalizeIntervalSeconds("5", 300)).toBe(15);
    expect(normalizeIntervalSeconds("120", 300)).toBe(120);
  });

  it("uses an alternate kubectl wrapper when configured", () => {
    expect(
      getKubectlBinary({
        ...process.env,
        KUBECTL_BIN: "/tmp/remote-kubectl/kubectl"
      })
    ).toBe("/tmp/remote-kubectl/kubectl");
    expect(getKubectlBinary({ ...process.env, KUBECTL_BIN: "" })).toBe("kubectl");
  });

  it("builds a batch status payload for local inspection", () => {
    expect(
      buildBatchState({
        startedAt: "2026-04-12T12:00:00.000Z",
        outputPath: ".local/gke-snapshot.local.json",
        intervalSeconds: 300,
        status: "healthy",
        runCount: 4,
        consecutiveFailures: 0,
        lastRunAt: "2026-04-12T12:20:00.000Z",
        lastSuccessAt: "2026-04-12T12:20:01.000Z",
        lastError: null,
        snapshotCollectorStatus: "complete",
        snapshotWarnings: []
      })
    ).toEqual({
      startedAt: "2026-04-12T12:00:00.000Z",
      outputPath: ".local/gke-snapshot.local.json",
      intervalSeconds: 300,
      status: "healthy",
      runCount: 4,
      consecutiveFailures: 0,
      lastRunAt: "2026-04-12T12:20:00.000Z",
      lastSuccessAt: "2026-04-12T12:20:01.000Z",
      lastError: null,
      snapshotCollectorStatus: "complete",
      snapshotWarnings: []
    });
  });
});
