# GKE Dashboard Product Roadmap

## Goal

Turn the current dashboard from a single-page resource snapshot into a product-grade GKE operations surface that is:

- easy to scan at a glance
- useful for real troubleshooting
- able to drill from cluster summary to workload ownership
- extensible into logs, events, and cost analysis

## Product Principles

The dashboard should follow four operating principles:

1. Show health and freshness immediately.
2. Make the biggest consumers obvious.
3. Let operators move from summary to cause without context switching.
4. Keep the primary surface compact and readable even as more detail is added.

## Current Progress

- `Phase 1: Operations Overview` — complete
- `Phase 2: Consumers and Capacity` — complete
- `Phase 3: Drill-down Navigation` — complete
- `Phase 4: Operations Workbench` — complete
- `Phase 5: Time and History` — in progress
- `Phase 6: Data Fidelity` — planned
- `Phase 7: Cost and Efficiency` — planned
- `Phase 8: Product UX Refinement` — planned

## Reference Patterns

This roadmap is based on recurring patterns from:

- Grafana Kubernetes monitoring dashboards
- Datadog infrastructure and container maps
- New Relic Kubernetes cluster explorer
- OpenCost cost-allocation views
- Headlamp’s Kubernetes navigation model

The common lessons from those references are:

- overview and drill-down should be separate concerns
- usage alone is not enough; requests, limits, and allocatable must be compared
- workload ownership matters more than raw pod lists on the first pass
- freshness and confidence in the data source must be visible at all times

## Information Architecture

The dashboard product should evolve into these major surfaces:

1. `Overview`
   - cluster KPIs
   - health
   - freshness
   - top-level node and namespace summaries

2. `Consumers`
   - top CPU consumers
   - top memory consumers
   - top GPU consumers
   - workload and namespace rankings

3. `Capacity`
   - usage vs requests vs limits vs allocatable
   - node pressure
   - namespace pressure
   - resource skew and imbalance

4. `Workloads`
   - workload table
   - replicas
   - per-workload usage
   - pod-level drill-down

5. `Operations`
   - events
   - restarts
   - failure indicators
   - stale data alerts
   - links into logs and traces

6. `Cost`
   - namespace cost
   - workload cost
   - idle allocation
   - overprovisioning and rightsizing candidates

## Roadmap

### Phase 1: Operations Overview

Status: complete

Purpose:
- provide a trustworthy cluster summary surface

Scope:
- cluster KPI cards
- freshness and health state
- node utilization
- namespace activity
- auto-refresh and manual refresh

Success criteria:
- an operator can tell whether the cluster looks healthy within a few seconds

### Phase 2: Consumers and Capacity

Status: complete

Purpose:
- show what is actually consuming CPU, memory, and GPU

Scope:
- top CPU consumers
- top memory consumers
- top GPU consumers
- workload analysis table
- requests / limits / usage comparison
- node occupancy breakdown

Success criteria:
- an operator can answer “what is using resources right now?” without leaving the dashboard

### Phase 3: Drill-down Navigation

Status: complete

Purpose:
- move from summaries into workload and pod details

Scope:
- namespace filter
- node filter
- workload search
- workload detail drawer or route
- pod list with usage and status
- node detail surface

Success criteria:
- an operator can move from a hot cluster summary to an accountable workload quickly

## Phase 3 Design

Phase 3 should turn the dashboard from a static diagnostic board into an exploratory workflow.

### Core Questions Phase 3 Must Answer

- Which namespace should I focus on right now?
- Which node is carrying the hottest workloads?
- What pods and replicas make up a selected workload?
- Is a workload spread across nodes or concentrated on one node?
- Can I narrow the entire dashboard without leaving the main page?

### Phase 3 Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Overview header: cluster, freshness, health, refresh state  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Filter bar: namespace | node | workload search | reset      │
└──────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬─────────────────────────────┐
│ Top Consumers                 │ Capacity Compare            │
│ filtered rankings             │ filtered usage posture      │
└───────────────────────────────┴─────────────────────────────┘

┌───────────────────────────────┬─────────────────────────────┐
│ Workload Analysis             │ Workload Detail Drawer      │
│ clickable rows                │ pods, nodes, reservations   │
└───────────────────────────────┴─────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Node Occupancy                                                │
│ ranked node cards with top workloads and apply-node filter   │
└──────────────────────────────────────────────────────────────┘
```

### Phase 3 Primary Components

#### 1. Filter Bar

Controls:

- namespace select
- node select
- workload search input
- clear filters action

Behavior:

- filters should affect top consumers, capacity, workload analysis, node occupancy, and drawer content
- filter state should be reflected in the URL query so refresh and sharing preserve context

#### 2. Workload Detail Drawer

The drawer is the primary drill-down surface before a dedicated detail route exists.

Contents:

- workload name, namespace, kind, replicas
- CPU, memory, GPU usage
- requests and limits
- efficiency and pressure badges
- node placement summary
- pod list with status, node, and usage

Default state:

- when no workload is selected, show guidance explaining how to start exploring

#### 3. Node Occupancy

This section should answer which nodes are carrying the most pressure and which workloads dominate them.

Each node card should include:

- node name and status
- CPU, memory, and GPU pressure bars
- top workloads on that node
- a quick action to apply the node filter

### Phase 3 Data Contract Additions

The snapshot model should evolve to support:

- `pods[]`
  - namespace
  - workload name
  - workload kind
  - pod name
  - node
  - status
  - cpu usage
  - memory usage
  - gpu usage
- richer workload metadata
  - pod count
  - node spread
  - health summary

When pod-level data is unavailable, the dashboard can derive a temporary fallback model from workload replicas so the UI flow still works.

### Phase 3 Implementation Order

1. Extend the dashboard data model to expose filterable workloads and pod-like rows.
2. Add a client-side exploration shell for filter state and selected workload state.
3. Render the filter bar and workload detail drawer.
4. Add node occupancy cards and node-driven filtering.
5. Sync filters to URL query parameters.
6. Add route and data tests for filter-driven rendering.

### Phase 3 Non-Goals

This phase should not yet include:

- live logs
- Kubernetes events integration
- traces
- cost allocation
- long-range time-series analysis

### Phase 4: Operations Workbench

Status: complete

Purpose:
- connect observability with action-oriented debugging

Scope:
- restarts
- events
- condition changes
- stale source warnings
- links to logs and traces

Success criteria:
- the dashboard becomes a useful starting point during incidents, not just a status board

### Phase 5: Time and History

Status: in progress

Purpose:
- add short-term trend visibility and change detection

Scope:
- snapshot history retention
- lightweight history index
- recent drift calculations
- trend cards and anomaly badges in the overview

Success criteria:
- the dashboard can answer how the latest snapshot differs from recent history without leaving the overview

### Phase 6: Data Fidelity

Status: planned

Purpose:
- make collector output easier to trust and easier to diagnose when partial

Scope:
- richer pod and container metadata
- explicit partial collection reasons
- collector confidence signals
- better error surfacing for missing or degraded sources

Success criteria:
- operators can distinguish healthy data from partial data and understand what is missing

### Phase 7: Cost and Efficiency

Status: planned

Purpose:
- surface waste and allocation quality

Scope:
- OpenCost integration
- workload and namespace cost allocation
- idle resource cost
- request-to-usage mismatch
- rightsizing candidates

Success criteria:
- the dashboard helps with optimization, not only firefighting

### Phase 8: Product UX Refinement

Status: planned

Purpose:
- make the dashboard feel polished, shareable, and product-like

Scope:
- better visual hierarchy
- saved presets
- comparison windows
- export/share
- role-based views

Success criteria:
- the dashboard feels like a cohesive product dashboard, not a stitched-together admin page

## Phase 2 Design

Phase 2 is the next major milestone and should become the first truly diagnostic surface.

### Core Questions Phase 2 Must Answer

- Which workloads are the top CPU consumers?
- Which workloads are the top memory consumers?
- Which nodes are carrying the most pressure?
- Are workloads over-requested or under-requested?
- Is usage concentrated on specific namespaces or nodes?

### Phase 2 Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Overview header: cluster, freshness, health, refresh state  │
└──────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ CPU          │ Memory       │ GPU          │ Freshness    │
│ KPI          │ KPI          │ KPI          │ KPI          │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌───────────────────────────────┬─────────────────────────────┐
│ Top CPU Consumers             │ Top Memory Consumers        │
│ ranked workload list          │ ranked workload list        │
└───────────────────────────────┴─────────────────────────────┘

┌───────────────────────────────┬─────────────────────────────┐
│ Capacity Compare              │ Node Occupancy              │
│ usage / requests / limits     │ per-node ranked pressure    │
└───────────────────────────────┴─────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Workload Table                                               │
│ namespace | workload | replicas | usage | requests | limits │
└──────────────────────────────────────────────────────────────┘
```

### Phase 2 Primary Components

#### 1. Top Consumers

Three ranked panels:

- top CPU consumers
- top memory consumers
- top GPU consumers

Each row should include:

- namespace
- workload name
- current usage
- share of cluster total
- trend or pressure badge

#### 2. Capacity Compare

This section should compare:

- actual usage
- requested resources
- limits
- allocatable capacity

This is one of the most important additions because usage by itself hides waste and risk.

#### 3. Workload Table

Recommended columns:

- namespace
- workload
- kind
- replicas
- CPU usage
- memory usage
- GPU usage
- CPU requests
- memory requests
- CPU limits
- memory limits
- efficiency badge

Recommended interactions:

- search by workload name
- filter by namespace
- filter by node
- sort by CPU, memory, efficiency, or pressure

#### 4. Node Occupancy

Show:

- each node
- aggregate node pressure
- top workload on the node
- CPU / memory / GPU saturation

This can start as ranked node cards or a compact table and later evolve into stacked occupancy visuals.

## Data Requirements for Phase 2

The data model needs to expand beyond the current snapshot shape.

Additional inputs needed:

- workload-level usage
- pod-level ownership mapping
- requests and limits
- replica counts
- node-to-workload occupancy mapping

Preferred source model:

1. usage from metrics or Prometheus
2. ownership and requests/limits from Kubernetes objects
3. cost overlays later from OpenCost

## Implementation Priority

The recommended build order is:

1. extend snapshot contract for workload consumers
2. add top consumer panels
3. add workload table
4. add capacity compare visuals
5. add node occupancy panel
6. add drill-down interactions

## Non-Goals for Phase 2

Do not include these yet:

- full log viewer
- event stream explorer
- cost integration
- trace correlation
- alert rule management

Those belong to later phases and should not bloat the next iteration.

## Immediate Next Step

Implement Phase 2 with:

- top consumer panels
- workload analysis table
- capacity comparison section

That milestone is the point where the dashboard stops being a summary screen and starts becoming a real troubleshooting tool.
