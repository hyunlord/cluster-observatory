#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function normalizeIntervalSeconds(value, fallbackSeconds = 300) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackSeconds;
  }

  return Math.max(15, Math.round(parsed));
}

export function buildBatchState({
  startedAt,
  outputPath,
  intervalSeconds,
  status,
  runCount,
  consecutiveFailures,
  lastRunAt,
  lastSuccessAt,
  lastError,
  snapshotCollectorStatus,
  snapshotWarnings
}) {
  return {
    startedAt,
    outputPath,
    intervalSeconds,
    status,
    runCount,
    consecutiveFailures,
    lastRunAt,
    lastSuccessAt,
    lastError,
    snapshotCollectorStatus,
    snapshotWarnings
  };
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

async function findWorkspaceRoot(cwd) {
  let current = cwd;
  while (true) {
    try {
      await readFile(path.join(current, "pnpm-workspace.yaml"), "utf8");
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

async function readSnapshotSummary(outputPath) {
  const raw = await readFile(outputPath, "utf8");
  const snapshot = JSON.parse(raw);
  return {
    collectorStatus: snapshot?.snapshot?.collectorStatus ?? "unknown",
    warnings: snapshot?.snapshot?.collectionWarnings ?? []
  };
}

async function writeState(statePath, state) {
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2));
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: node scripts/collect-gke-snapshot-batch.mjs [options]",
      "",
      "Options:",
      "  --interval-seconds <n>  Refresh cadence in seconds. Defaults to 300.",
      "  --output <path>         Snapshot output path. Defaults to .local/gke-snapshot.local.json.",
      "  --state-file <path>     Batch state JSON path. Defaults to .local/gke-snapshot-batch-status.json.",
      "  --max-runs <n>          Stop after n runs. Useful for smoke tests.",
      "  --once                  Run exactly once and exit.",
      "  --help                  Show this help message.",
      "",
      "Environment:",
      "  KUBECTL_BIN             Alternate kubectl executable or wrapper path.",
      "  GKE_SNAPSHOT_BATCH_INTERVAL_SECONDS  Default interval override."
    ].join("\n")
  );
}

async function runCollector(workspaceRoot, outputPath) {
  await execFileAsync(
    process.execPath,
    [path.join(workspaceRoot, "scripts", "collect-gke-snapshot.mjs"), "--output", outputPath],
    {
      cwd: workspaceRoot,
      env: process.env,
      maxBuffer: 1024 * 1024 * 20
    }
  );

  return readSnapshotSummary(outputPath);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const workspaceRoot = await findWorkspaceRoot(process.cwd());
  const outputPath = path.resolve(workspaceRoot, args.output ?? ".local/gke-snapshot.local.json");
  const statePath = path.resolve(
    workspaceRoot,
    args["state-file"] ?? ".local/gke-snapshot-batch-status.json"
  );
  const intervalSeconds = normalizeIntervalSeconds(
    args["interval-seconds"] ?? process.env.GKE_SNAPSHOT_BATCH_INTERVAL_SECONDS,
    300
  );
  const maxRuns = args.once ? 1 : Number(args["max-runs"] ?? Number.POSITIVE_INFINITY);
  const startedAt = new Date().toISOString();

  let stopped = false;
  let runCount = 0;
  let consecutiveFailures = 0;
  let lastRunAt;
  let lastSuccessAt;
  let lastError = null;
  let snapshotCollectorStatus = "unknown";
  let snapshotWarnings = [];

  const persist = async (status) => {
    await writeState(
      statePath,
      buildBatchState({
        startedAt,
        outputPath,
        intervalSeconds,
        status,
        runCount,
        consecutiveFailures,
        lastRunAt,
        lastSuccessAt,
        lastError,
        snapshotCollectorStatus,
        snapshotWarnings
      })
    );
  };

  const stop = async () => {
    stopped = true;
    await persist("stopped");
  };

  process.on("SIGINT", () => {
    stop().finally(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    stop().finally(() => process.exit(0));
  });

  await persist("idle");

  while (!stopped && runCount < maxRuns) {
    lastRunAt = new Date().toISOString();
    await persist("running");

    try {
      const snapshotSummary = await runCollector(workspaceRoot, outputPath);
      runCount += 1;
      consecutiveFailures = 0;
      lastSuccessAt = new Date().toISOString();
      lastError = null;
      snapshotCollectorStatus = snapshotSummary.collectorStatus;
      snapshotWarnings = snapshotSummary.warnings;
      await persist("healthy");
      process.stdout.write(
        `[snapshot-batch] run ${runCount} complete (${snapshotCollectorStatus}) -> ${outputPath}\n`
      );
    } catch (error) {
      runCount += 1;
      consecutiveFailures += 1;
      lastError = error instanceof Error ? error.message : String(error);
      snapshotCollectorStatus = "failed";
      snapshotWarnings = [];
      await persist("failing");
      process.stderr.write(`[snapshot-batch] run ${runCount} failed: ${lastError}\n`);
    }

    if (stopped || runCount >= maxRuns) {
      break;
    }

    await sleep(intervalSeconds * 1000);
  }

  await persist(stopped ? "stopped" : "completed");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`collect-gke-snapshot-batch failed: ${message}\n`);
    process.exitCode = 1;
  });
}
