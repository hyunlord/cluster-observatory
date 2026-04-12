# Cluster Observatory

Cluster Observatory is an open-source GKE dashboard for exploring cluster capacity, node pressure, workload health, and pod-level hot spots from a local snapshot file.

It is designed for the common operator loop:

- spot cluster pressure quickly
- see which workloads are driving CPU, memory, and GPU usage
- drill into nodes and workloads without leaving the dashboard
- keep real infrastructure data local instead of bundling it into the repo

## What it includes

- A Next.js dashboard for:
  - cluster overview
  - top resource consumers
  - node occupancy and node diagnostics
  - workload drill-down with pod health and restart visibility
- A snapshot collector that turns `kubectl` data into a local JSON file
- An anonymized bundled dataset so the UI can be demoed without infrastructure access

## Product tour

The dashboard currently focuses on three operating surfaces:

1. `Overview`
   - cluster KPI cards
   - freshness and source state
   - capacity posture and hottest consumers
2. `Node detail`
   - node pressure
   - conditions, taints, and recent warning events
   - which workloads and pods are making a node hot
3. `Workload detail`
   - per-workload usage, requests, and limits
   - pod readiness and restart drift
   - node spread and hotspot pod analysis

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Using real snapshot data

Collect a local snapshot from any shell that already has `kubectl` access to your target cluster:

```bash
pnpm collect:gke-snapshot
```

By default the collector writes to `.local/gke-snapshot.local.json`, which is ignored by git.

If your cluster is only reachable through a wrapper script or bastion hop, point the collector at that executable:

```bash
KUBECTL_BIN=/path/to/custom-kubectl-wrapper pnpm collect:gke-snapshot
```

The collector is intentionally transport-agnostic. `KUBECTL_BIN` can point to:

- local `kubectl`
- a one-hop SSH wrapper
- a bastion or multi-hop wrapper script
- any executable that eventually runs `kubectl` and returns normal JSON output

That keeps the open-source code generic even when each team reaches its cluster differently.

You can also override the input path explicitly:

```bash
GKE_DASHBOARD_SNAPSHOT_PATH=.local/gke-snapshot.local.json pnpm dev
```

This keeps the repository demo-safe while still letting you render a real cluster locally.

If you also want the dashboard to surface batch collector health in the UI, point it at the batch state file too:

```bash
GKE_DASHBOARD_SNAPSHOT_PATH=.local/gke-snapshot.local.json \
GKE_DASHBOARD_BATCH_STATUS_PATH=.local/gke-snapshot-batch-status.json \
GKE_DASHBOARD_HISTORY_PATH=.local/history/index.json \
pnpm dev
```

## Keeping the snapshot fresh

The dashboard can auto-refresh the browser, but the underlying snapshot still needs to be recollected. Use the bundled batch runner to keep `.local/gke-snapshot.local.json` fresh:

```bash
pnpm collect:gke-snapshot:batch
```

Useful options:

```bash
pnpm collect:gke-snapshot:batch -- --interval-seconds 300
pnpm collect:gke-snapshot:batch -- --once
KUBECTL_BIN=/path/to/custom-kubectl-wrapper pnpm collect:gke-snapshot:batch
```

The batch runner writes a local status file to `.local/gke-snapshot-batch-status.json` with the last run time, last success time, current health, and recent error state.
The collector also keeps a lightweight history index at `.local/history/index.json`, which powers the recent drift and trend cards in the overview.

## Demo workflow

```bash
pnpm install
pnpm collect:gke-snapshot
GKE_DASHBOARD_SNAPSHOT_PATH=.local/gke-snapshot.local.json \
GKE_DASHBOARD_HISTORY_PATH=.local/history/index.json \
pnpm dev
```

If you do not have cluster access, the app falls back to the bundled anonymized sample.

## Development

Run the verification suite:

```bash
pnpm verify
```

Or run checks individually:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter observatory-web build
```

## Privacy and open source notes

- The bundled demo data is anonymized.
- Real cluster snapshots are expected to stay in ignored local files.
- No credentials, bastion details, or project-specific infrastructure identifiers should be committed.
- The default local snapshot path is `.local/gke-snapshot.local.json` so real data stays outside tracked source.
