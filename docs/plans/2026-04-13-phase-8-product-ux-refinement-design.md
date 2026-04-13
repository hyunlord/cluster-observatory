# Phase 8 Product UX Refinement Design

## Goal

Turn the current dashboard into a more polished product surface without changing the core operating model that is already working.

Phase 8 should improve:

- information density
- sharing and repeatability
- visual consistency
- responsive behavior

It should not add new infrastructure data sources or redesign the product architecture.

## Design Direction

Phase 8 will follow a hybrid approach:

1. keep the current overview and drill-down structure
2. add a `density` control so operators can switch between comfortable and dense layouts
3. add `preset views` that emphasize different operating goals
4. make the current dashboard state shareable through the URL
5. tighten chart, card, and table presentation so the product feels intentional on desktop and mobile

This keeps the dashboard operationally useful while making it more product-grade.

## Scope

### 1. Density Modes

Add a UI control for:

- `Comfortable`
- `Dense`

Behavior:

- `Comfortable` remains the default
- `Dense` reduces padding, row height, and spacing
- both modes show the same data
- the selected mode is persisted in the URL query

Example:

- `?density=comfortable`
- `?density=dense`

### 2. Preset Views

Add a preset selector near the overview header.

Initial presets:

- `Overview`
- `Capacity`
- `Incidents`
- `Cost`

Behavior:

- presets do not change the underlying dataset
- presets change emphasis, ordering, and which sections are visually promoted
- presets should also be reflected in the URL

Example:

- `?view=overview`
- `?view=incidents`

### 3. Shareable State

Expose a `Copy link` control that captures:

- namespace filter
- node filter
- workload search
- selected preset
- selected density

The goal is for one operator to send another a URL that reproduces the same dashboard context.

### 4. Chart and Card Grammar

Phase 8 should make the visual language more consistent.

Rules:

- rank and priority use compact cards
- comparison uses horizontal bars
- change over time uses sparklines
- status uses pills and alert cards
- large empty chart areas should be avoided

The aim is to make the dashboard feel coherent rather than like a collection of unrelated widgets.

### 5. Responsive Behavior

Desktop:

- keep the side rail detail experience
- allow dense layouts to reduce scroll depth

Tablet and mobile:

- move side-rail detail into a full-width panel or drawer
- collapse tables into stacked cards when needed
- keep filters and preset controls usable without crowding

## Information Architecture Impact

Phase 8 does not add new major surfaces.

It refines the existing surfaces:

1. `Overview`
2. `Consumers`
3. `Capacity`
4. `Operations`
5. `Cost`

The main structural addition is a global view state:

- `density`
- `preset`

## URL Contract

The dashboard state should be fully reproducible from the URL.

Query parameters:

- `namespace`
- `node`
- `search`
- `view`
- `density`

This contract supports both sharing and repeatable debugging flows.

## UI Components

### Global Controls

- `PresetSelector`
- `DensityToggle`
- `CopyShareLinkButton`

### Layout Helpers

- density-aware spacing tokens
- responsive section wrappers
- mobile detail presentation helper

### Visual Refinement Targets

- overview hero
- efficiency strip
- history strip
- workload table
- namespace cards
- node occupancy cards
- side detail panel

## Non-Goals

Phase 8 will not include:

- authentication
- saved dashboards
- drag-and-drop customization
- new collector integrations
- long-range historical analytics

## Implementation Plan

1. Add URL-backed `view` and `density` state.
2. Add header controls for preset selection and density toggling.
3. Add a share-link action.
4. Introduce density-aware CSS tokens and section variants.
5. Refine table, card, and panel layouts for dense mode.
6. Add preset-based emphasis rules for overview, incidents, capacity, and cost.
7. Improve mobile behavior for the side detail panel and dense tables.
8. Verify with `pnpm --filter observatory-web typecheck`, `pnpm --filter observatory-web test`, and `pnpm verify`.

## Success Criteria

- operators can switch between comfortable and dense layouts immediately
- a copied link reproduces the current dashboard context
- preset views make different tasks easier without changing data
- desktop and mobile layouts both remain readable
- the dashboard feels more like a polished product than an internal tool
