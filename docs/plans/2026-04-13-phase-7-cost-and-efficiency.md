# Phase 7 Cost and Efficiency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add heuristic efficiency analysis and OpenCost-ready cost slots so operators can spot waste and rightsizing candidates directly in the dashboard.

**Architecture:** Extend the existing snapshot-to-view-model pipeline with a new efficiency model that computes workload, namespace, and overview signals from usage, requests, limits, and collector confidence. Keep the UI additive by reusing current overview and detail panels while adding clearly labeled heuristic-only cost surfaces.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, existing file-backed snapshot loader and local batch collector.

---

### Task 1: Add failing tests for efficiency modeling

**Files:**
- Modify: `apps/observatory-web/src/lib/gke-dashboard.test.ts`
- Modify: `apps/observatory-web/src/app/dashboard/page.test.tsx`
- Modify: `apps/observatory-web/src/app/dashboard/workloads/[namespace]/[workload]/page.test.tsx`
- Modify: `apps/observatory-web/src/app/dashboard/namespaces/[namespace]/page.test.tsx`

**Step 1: Write the failing tests**

Add tests that expect:

- overview to render `Efficiency Signals` and `Cost source`
- workload detail to render `Rightsizing hint`
- namespace detail to render `Efficiency posture`
- view model to expose:
  - `costSource`
  - `idleAllocationEstimate`
  - `rightsizingHint`
  - `efficiencyConfidence`

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter observatory-web test -- src/lib/gke-dashboard.test.ts src/app/dashboard/page.test.tsx 'src/app/dashboard/workloads/[namespace]/[workload]/page.test.tsx' 'src/app/dashboard/namespaces/[namespace]/page.test.tsx'`

Expected: FAIL with missing fields or missing rendered labels.

### Task 2: Implement efficiency data model

**Files:**
- Modify: `apps/observatory-web/src/lib/gke-dashboard.ts`
- Modify: `apps/observatory-web/src/data/gke-snapshot.sample.json`

**Step 1: Add data structures**

Add interfaces for:

- workload efficiency
- namespace efficiency
- overview efficiency signals
- OpenCost-ready cost fields

**Step 2: Implement heuristic calculators**

Implement helpers to compute:

- request utilization ratios
- idle allocation estimates
- over-requested and under-request risk
- rightsizing hints
- efficiency confidence

**Step 3: Attach the new values to dashboard data**

Wire the computed efficiency layer into:

- overview data
- workload rows
- namespace detail
- workload detail

**Step 4: Run targeted tests**

Run: `pnpm --filter observatory-web test -- src/lib/gke-dashboard.test.ts`

Expected: PASS

### Task 3: Surface efficiency signals in overview

**Files:**
- Modify: `apps/observatory-web/src/app/dashboard/page.tsx`
- Modify: `apps/observatory-web/src/app/globals.css`

**Step 1: Add overview section**

Render a new section with:

- most over-requested workload
- highest idle allocation namespace
- top rightsizing candidate
- cost source badge

**Step 2: Keep labels explicit**

Use wording that makes the data source clear:

- `heuristic signal`
- `estimated efficiency`
- not billing data

**Step 3: Run UI tests**

Run: `pnpm --filter observatory-web test -- src/app/dashboard/page.test.tsx`

Expected: PASS

### Task 4: Add namespace and workload efficiency panels

**Files:**
- Modify: `apps/observatory-web/src/app/dashboard/namespace-detail-panel.tsx`
- Modify: `apps/observatory-web/src/app/dashboard/workload-detail-panel.tsx`
- Modify: `apps/observatory-web/src/app/dashboard/dashboard-explorer.tsx`

**Step 1: Add namespace efficiency posture**

Show:

- CPU and memory efficiency ratios
- idle allocation estimate
- over-requested workload count
- heuristic cost source

**Step 2: Add workload rightsizing hint**

Show:

- hint label
- confidence
- request / usage / limit summary
- idle allocation estimate

**Step 3: Add lightweight workload-table badges**

Show badges for:

- over-requested
- low headroom
- tuning needed

**Step 4: Run targeted tests**

Run: `pnpm --filter observatory-web test -- 'src/app/dashboard/workloads/[namespace]/[workload]/page.test.tsx' 'src/app/dashboard/namespaces/[namespace]/page.test.tsx'`

Expected: PASS

### Task 5: Update roadmap and verify

**Files:**
- Modify: `docs/plans/2026-04-12-gke-dashboard-roadmap.md`

**Step 1: Update roadmap progress**

Mark Phase 7 as `in progress` and describe the heuristic-first, OpenCost-ready strategy.

**Step 2: Run full verification**

Run: `pnpm --filter observatory-web typecheck`
Expected: PASS

Run: `pnpm --filter observatory-web test`
Expected: PASS

Run: `pnpm verify`
Expected: PASS with full score output

**Step 3: Commit**

```bash
git add docs/plans/2026-04-13-phase-7-cost-and-efficiency-design.md docs/plans/2026-04-13-phase-7-cost-and-efficiency.md docs/plans/2026-04-12-gke-dashboard-roadmap.md apps/observatory-web/src/lib/gke-dashboard.ts apps/observatory-web/src/data/gke-snapshot.sample.json apps/observatory-web/src/app/dashboard/page.tsx apps/observatory-web/src/app/dashboard/workload-detail-panel.tsx apps/observatory-web/src/app/dashboard/namespace-detail-panel.tsx apps/observatory-web/src/app/dashboard/dashboard-explorer.tsx apps/observatory-web/src/app/globals.css apps/observatory-web/src/lib/gke-dashboard.test.ts apps/observatory-web/src/app/dashboard/page.test.tsx apps/observatory-web/src/app/dashboard/workloads/[namespace]/[workload]/page.test.tsx apps/observatory-web/src/app/dashboard/namespaces/[namespace]/page.test.tsx
git commit -m "feat: add efficiency signals to the dashboard"
```
