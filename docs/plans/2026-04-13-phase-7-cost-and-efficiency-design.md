# Phase 7 Cost and Efficiency Design

## Goal

Add a cost-and-efficiency layer to the dashboard that helps operators spot waste, over-requested workloads, and rightsizing candidates without requiring a billing system on day one.

## Decision

Phase 7 will use a mixed approach:

1. add heuristic efficiency signals now, using existing usage, request, limit, and history data
2. reserve explicit slots for future OpenCost-backed values without changing the UI structure later

This keeps the product useful immediately while avoiding a dead-end data model.

## Scope

### Included

- heuristic efficiency signals in the overview
- namespace-level efficiency posture
- workload-level rightsizing hints
- workload-table badges for waste and low headroom
- explicit `costSource` and confidence messaging
- nullable OpenCost-ready fields in the data model

### Excluded

- real OpenCost API integration
- billing-accurate cost reporting
- cluster-wide monthly chargeback exports
- historical cost charts

## Product Principles

1. Never present heuristic signals as actual billing data.
2. Separate waste signals from reliability signals.
3. Show the next recommended action, not just a score.
4. Keep Phase 7 additive so it does not destabilize existing operations workflows.

## Data Model

Phase 7 adds two layers.

### 1. Heuristic efficiency layer

Computed from usage, requests, limits, and recent history:

- `efficiencyScore`
- `efficiencyState`
- `idleAllocationEstimate`
- `overRequested`
- `underRequestRisk`
- `rightsizingHint`
- `efficiencyConfidence`

### 2. OpenCost-ready layer

Reserved for future real cost data:

- `costSource`
- `estimatedMonthlyCost`
- `actualMonthlyCost`
- `idleCost`
- `sharedCost`

For this phase:

- `costSource` is always `heuristic`
- estimated cost fields may be populated conservatively or left null
- actual cost fields remain null

## Heuristic Rules

### Over-requested

Treat a workload as over-requested when:

- CPU usage / CPU request < 0.35, or
- memory usage / memory request < 0.40

This should only be elevated when request data exists and collector confidence is not low.

### Under-request risk

Treat a workload as under-requested when:

- CPU usage / CPU request > 0.85, or
- memory usage / memory request > 0.90

This is a headroom risk signal, not a failure signal.

### Idle allocation estimate

Estimate idle allocation with:

- `max(request - usage, 0)` for CPU
- `max(request - usage, 0)` for memory

Aggregate it at namespace and overview level.

### Rightsizing hint

Return one of:

- `Reduce requests`
- `Raise requests`
- `Observe`

Rules:

- `Reduce requests` for over-requested workloads with stable health
- `Raise requests` for low-headroom workloads
- `Observe` when data confidence is too low or signals conflict

## UI Changes

### Overview

Add an `Efficiency Signals` section with:

- most over-requested workload
- highest idle allocation namespace
- top rightsizing candidate
- `Cost source: heuristic`

### Namespace detail

Add an `Efficiency posture` card with:

- CPU and memory request efficiency
- idle allocation estimate
- over-requested workload count
- cost source label

### Workload detail

Add a `Rightsizing hint` card with:

- hint label
- confidence
- usage / request / limit comparison
- idle allocation estimate

### Workload table

Add visible badges for:

- over-requested
- low headroom
- tuning needed

## Confidence Rules

- `High`: complete snapshot with request data present
- `Medium`: partial coverage or limited history
- `Low`: missing request data, partial collector state, or conflicting inputs

## Success Criteria

- operators can identify obvious waste from the overview
- namespace and workload detail views explain whether to reduce, raise, or observe resource requests
- the UI clearly labels the source as heuristic, not billing
- future OpenCost integration can replace the source data without redesigning the interface
