# GKE Dashboard Product Roadmap

## Goal

Turn the dashboard into a product-grade GKE operations surface that is:

- easy to scan at a glance
- useful for real troubleshooting
- able to drill from cluster summary to workload ownership
- extensible into logs, events, history, and cost analysis

## Product Principles

The dashboard follows four operating principles:

1. Show health, freshness, and data confidence immediately.
2. Make the largest consumers and hottest risks obvious.
3. Let operators move from summary to cause without context switching.
4. Keep the primary surface compact and readable as more detail is added.

## Current Progress

- `Phase 1: Operations Overview` — complete
- `Phase 2: Consumers and Capacity` — complete
- `Phase 3: Drill-down Navigation` — complete
- `Phase 4: Operations Workbench` — complete
- `Phase 5: Time and History` — complete
- `Phase 6: Data Fidelity` — complete
- `Phase 7: Cost and Efficiency` — complete
- `Phase 8: Product UX Refinement` — in progress

## Reference Patterns

This roadmap draws on recurring patterns from:

- Grafana Kubernetes monitoring dashboards
- Datadog infrastructure and container maps
- New Relic Kubernetes cluster explorer
- OpenCost cost-allocation views
- Headlamp’s Kubernetes navigation model

Common lessons from those references:

- overview and drill-down should remain separate concerns
- usage alone is not enough; requests, limits, and allocatable must be compared
- workload ownership matters more than raw pod lists on the first pass
- freshness and trust in the data source must stay visible

## Information Architecture

The product centers on these major surfaces:

1. `Overview`
   - cluster KPIs
   - health, freshness, and collector confidence
   - hot alerts
   - trends, drift, and efficiency signals

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
   - replicas and pod-level drill-down
   - requests, limits, usage, and tuning guidance

5. `Operations`
   - events
   - restarts
   - failure indicators
   - stale and partial data alerts
   - links into logs and traces

6. `Cost`
   - namespace cost
   - workload cost
   - idle allocation
   - rightsizing candidates
   - OpenCost-ready cost slots

## Phase Summary

### Phase 1: Operations Overview

Status: complete

Delivered:

- cluster KPI cards
- freshness and health state
- node utilization
- namespace activity
- auto-refresh and manual refresh

Success:

- an operator can tell whether the cluster looks healthy within a few seconds

### Phase 2: Consumers and Capacity

Status: complete

Delivered:

- top CPU, memory, and GPU consumers
- workload analysis table
- requests / limits / usage comparison
- node occupancy breakdown

Success:

- an operator can answer “what is using resources right now?” without leaving the dashboard

### Phase 3: Drill-down Navigation

Status: complete

Delivered:

- namespace filter
- node filter
- workload search
- workload detail drawer and route
- pod list with usage and status
- node detail surface

Success:

- an operator can move from a hot cluster summary to an accountable workload quickly

### Phase 4: Operations Workbench

Status: complete

Delivered:

- hot alerts strip
- namespace detail route
- workload and node operator actions
- event summaries
- batch and snapshot health surfaces

Success:

- the dashboard becomes a useful starting point during incidents, not just a status board

### Phase 5: Time and History

Status: complete

Delivered:

- snapshot history retention
- lightweight history index
- recent drift calculations
- trend cards and anomaly badges in the overview

Success:

- the dashboard can explain how the latest snapshot differs from recent history without leaving the overview

### Phase 6: Data Fidelity

Status: complete

Delivered:

- richer pod and container metadata
- explicit partial collection reasons
- collector confidence signals
- missing-source and affected-area summaries
- shared snapshot trust context across overview and detail views

Success:

- operators can distinguish healthy data from partial data and understand what is missing

### Phase 7: Cost and Efficiency

Status: complete

Delivered:

- heuristic efficiency signals in overview, namespace detail, and workload detail
- idle allocation estimates and rightsizing hints
- `costSource` and confidence messaging
- OpenCost-ready slots for actual cost values
- cluster cost summary when an OpenCost summary file is present

Success:

- operators can identify likely waste and headroom issues from the current snapshot
- the UI clearly distinguishes heuristic estimates from actual OpenCost-backed values

### Phase 8: Product UX Refinement

Status: in progress

Delivered so far:

- density modes
- preset views
- shareable URL state
- context-preserving drill-down navigation
- denser mobile card layouts and compact detail behavior

Next:

- stronger preset-specific visual emphasis
- denser comparison views for heavy operators
- additional responsive polish for smaller displays

Success:

- the dashboard feels like a cohesive product surface instead of a stitched-together admin page

## Near-Term Priorities

The next product work should focus on:

1. closing the remaining `Phase 8` polish work
2. wiring a real OpenCost summary feed into the existing cost slots
3. expanding incident workflows with richer log and trace hand-offs

## Non-Goals

The current roadmap does not try to become:

- a full Kubernetes control plane
- a log viewer
- an alert-rule editor
- a custom dashboard builder

Those workflows can integrate later, but the dashboard should remain focused on fast diagnosis and capacity insight.
