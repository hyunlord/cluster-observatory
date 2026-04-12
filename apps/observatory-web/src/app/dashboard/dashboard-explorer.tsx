"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { GkeDashboardData } from "../../lib/gke-dashboard";
import { filtersToQueryString } from "../../lib/dashboard-query";
import type { DashboardFilters } from "../../lib/gke-dashboard-view";
import { buildDashboardView } from "../../lib/gke-dashboard-view";
import { WorkloadDetailPanel } from "./workload-detail-panel";

interface DashboardExplorerProps {
  data: GkeDashboardData;
  initialFilters: DashboardFilters;
}

export function DashboardExplorer({ data, initialFilters }: DashboardExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [namespace, setNamespace] = useState(initialFilters.namespace);
  const [node, setNode] = useState(initialFilters.node);
  const [search, setSearch] = useState(initialFilters.search);
  const [selectedWorkloadId, setSelectedWorkloadId] = useState<string | undefined>(undefined);

  function updateUrl(nextFilters: { namespace: string; node: string; search: string }) {
    const query = filtersToQueryString(nextFilters);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const view = useMemo(
    () => buildDashboardView(data, { namespace, node, search }, selectedWorkloadId),
    [data, namespace, node, search, selectedWorkloadId]
  );

  function summaryTone(label: string) {
    if (label.includes("CPU")) {
      return "healthy";
    }
    if (label.includes("Memory")) {
      return "warning";
    }
    if (label.includes("GPU")) {
      return "critical";
    }
    return data.snapshot.freshness.tone;
  }

  return (
    <div className="dashboard-main-grid">
      <div className="dashboard-content">
        <section className="panel filter-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Explore</p>
              <h2>Filter workload pressure</h2>
            </div>
            <button
              type="button"
              className="control-pill"
              onClick={() => {
                setNamespace("");
                setNode("");
                setSearch("");
                setSelectedWorkloadId(undefined);
                updateUrl({ namespace: "", node: "", search: "" });
              }}
            >
              Reset filters
            </button>
          </div>
          <div className="filter-grid">
            <label className="filter-field">
              <span>Namespace</span>
              <select
                value={namespace}
                onChange={(event) => {
                  const next = event.target.value;
                  setNamespace(next);
                  updateUrl({ namespace: next, node, search });
                }}
              >
                <option value="">All namespaces</option>
                {view.filterOptions.namespaces.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Node</span>
              <select
                value={node}
                onChange={(event) => {
                  const next = event.target.value;
                  setNode(next);
                  updateUrl({ namespace, node: next, search });
                }}
              >
                <option value="">All nodes</option>
                {view.filterOptions.nodes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field filter-field-search">
              <span>Search workloads</span>
              <input
                value={search}
                onChange={(event) => {
                  const next = event.target.value;
                  setSearch(next);
                  updateUrl({ namespace, node, search: next });
                }}
                placeholder="Search by workload, kind, or namespace"
              />
            </label>
          </div>
        </section>

        <section className="summary-grid">
          {data.cluster.summaryCards.map((card) => (
            <article className={`stat-card stat-card-${summaryTone(card.label)}`} key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p className="muted">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="panel pressure-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Cluster Pressure</p>
              <h2>Resource saturation</h2>
            </div>
            <p className="muted">The global pressure baseline stays visible while you drill into specific workloads.</p>
          </div>
          <div className="pressure-grid-cards">
            {data.pressureCards.map((card) => (
              <article className="pressure-card" key={card.label}>
                <div className="pressure-copy">
                  <div>
                    <p>{card.label}</p>
                    <strong>{card.percentage}%</strong>
                  </div>
                  <span className={`status-pill status-pill-${card.tone}`}>{card.tone}</span>
                </div>
                <div className="meter-track meter-track-lg">
                  <div className={`meter-fill meter-fill-${card.tone}`} style={{ width: `${card.percentage}%` }} />
                </div>
                <p className="muted">{card.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel consumers-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Top Consumers</p>
              <h2>Resource heavyweights</h2>
            </div>
            <p className="muted">Filtered by namespace, node, and workload search.</p>
          </div>
          <div className="consumers-grid">
            {[
              { label: "Top CPU", rows: view.topConsumers.cpu },
              { label: "Top Memory", rows: view.topConsumers.memory },
              { label: "Top GPU", rows: view.topConsumers.gpu }
            ]
              .filter((group) => group.rows.length > 0)
              .map((group) => (
                <div className="consumer-panel" key={group.label}>
                  <h3>{group.label}</h3>
                  <div className="consumer-list">
                    {group.rows.map((row) => (
                      <button
                        type="button"
                        className="consumer-row consumer-row-button"
                        key={`${row.namespace}/${row.name}`}
                        onClick={() => setSelectedWorkloadId(`${row.namespace}/${row.name}`)}
                      >
                        <div className="consumer-info">
                          <strong>{row.name}</strong>
                          <small className="muted">
                            {row.namespace} · {row.kind}
                          </small>
                        </div>
                        <div className="consumer-metrics">
                          <strong>{row.usage}</strong>
                          <span className={`status-pill status-pill-${row.tone}`}>{row.share}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="panel capacity-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Capacity Compare</p>
              <h2>Usage vs. Reservations</h2>
            </div>
            <p className="muted">Capacity posture stays visible while you narrow the current scope.</p>
          </div>
          <div className="capacity-grid">
            {view.capacityRows.map((row) => (
              <div className="capacity-card" key={row.label}>
                <div className="capacity-header">
                  <h3>{row.label}</h3>
                  <small className="muted">Allocatable: {row.allocatable}</small>
                </div>
                <div className="capacity-meters">
                  {[
                    ["Usage", row.usage, row.usagePercentage, "healthy"],
                    ["Requests", row.requests, row.requestPercentage, "warning"],
                    ["Limits", row.limits, row.limitPercentage, "critical"]
                  ].map(([label, value, percentage, tone]) => (
                    <div className="capacity-meter-row" key={label}>
                      <div className="meter-label">
                        <span>{label}</span>
                        <strong>
                          {value} ({percentage}%)
                        </strong>
                      </div>
                      <div className="meter-track">
                        <div className={`meter-fill meter-fill-${tone}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel workload-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Workload Analysis</p>
              <h2>Clickable footprint table</h2>
            </div>
            <p className="muted">Select a workload to inspect pods, node placement, and request headroom.</p>
          </div>
          <div className="dashboard-table dashboard-table-workloads">
            <div className="dashboard-row dashboard-row-head">
              <span>Workload</span>
              <span>Namespace</span>
              <span>CPU (U/R/L)</span>
              <span>Memory (U/R/L)</span>
              <span>Status</span>
            </div>
            {view.workloads.map((workload) => (
              <button
                type="button"
                className="dashboard-row dashboard-row-button"
                key={workload.id}
                onClick={() => setSelectedWorkloadId(workload.id)}
              >
                <div className="workload-label">
                  <strong>{workload.name}</strong>
                  <small className="muted">
                    {workload.kind} • {workload.replicas} repl • {workload.node}
                  </small>
                </div>
                <span>{workload.namespace}</span>
                <div className="metric-stack">
                  <strong>{workload.cpuUsage}</strong>
                  <small className="muted">
                    {workload.cpuRequests} / {workload.cpuLimits}
                  </small>
                </div>
                <div className="metric-stack">
                  <strong>{workload.memoryUsage}</strong>
                  <small className="muted">
                    {workload.memoryRequests} / {workload.memoryLimits}
                  </small>
                </div>
                <div className="dashboard-row-status">
                  <span
                    className={`status-pill status-pill-${workload.efficiency === "Healthy" ? "healthy" : workload.efficiency === "Watch" ? "warning" : "critical"}`}
                  >
                    {workload.efficiency}
                  </span>
                  <div className="drawer-tags dashboard-row-tags">
                    {workload.overRequested ? <span>Over-requested</span> : null}
                    {workload.underRequestRisk ? <span>Low headroom</span> : null}
                    <span>{workload.rightsizingHint}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel occupancy-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Node Occupancy</p>
              <h2>Pressure by node</h2>
            </div>
            <p className="muted">Click a node to focus the entire dashboard on that placement.</p>
          </div>
          <div className="occupancy-grid">
            {view.nodeOccupancy.map((occupancy) => (
              <article className="occupancy-card" key={occupancy.name}>
                <div className="occupancy-header">
                  <div>
                    <strong>{occupancy.name}</strong>
                    <p className="muted">{occupancy.status}</p>
                  </div>
                  <span className={`status-pill status-pill-${occupancy.cpuPercentage >= 60 ? "warning" : "healthy"}`}>
                    {occupancy.cpuPercentage}% CPU
                  </span>
                </div>
                <div className="occupancy-metric">
                  <span>Memory</span>
                  <div className="meter-track">
                    <div className="meter-fill meter-fill-warning" style={{ width: `${occupancy.memoryPercentage}%` }} />
                  </div>
                </div>
                <div className="occupancy-metric">
                  <span>GPU</span>
                  <div className="meter-track">
                    <div className="meter-fill meter-fill-critical" style={{ width: `${occupancy.gpuPercentage}%` }} />
                  </div>
                </div>
                <div className="occupancy-tags">
                  {occupancy.topWorkloads.length > 0 ? occupancy.topWorkloads.map((name) => <span key={name}>{name}</span>) : <span>Idle</span>}
                </div>
                <div className="occupancy-actions">
                  <button
                    type="button"
                    className="control-pill"
                    onClick={() => {
                      setNode(occupancy.name);
                      updateUrl({ namespace, node: occupancy.name, search });
                    }}
                  >
                    Focus dashboard
                  </button>
                  <Link className="control-pill detail-nav-link" href={`/dashboard/nodes/${encodeURIComponent(occupancy.name)}`}>
                    Open node detail
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel operator-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Node Utilization</p>
              <h2>Compute and memory distribution</h2>
            </div>
          </div>
          <div className="dashboard-table dashboard-table-operator">
            <div className="dashboard-row dashboard-row-head">
              <span>Node</span>
              <span>CPU</span>
              <span>Memory</span>
              <span>GPU</span>
              <span>Status</span>
            </div>
            {view.nodes.map((nodeRow) => (
              <div className="dashboard-row dashboard-row-operator" key={nodeRow.name}>
                <div className="node-label">
                  <Link className="row-label-link" href={`/dashboard/nodes/${encodeURIComponent(nodeRow.name)}`}>
                    <strong className="row-label">{nodeRow.name}</strong>
                  </Link>
                  <small className="muted">{nodeRow.topWorkload ?? "No dominant workload"}</small>
                </div>
                <div className="metric-cell">
                  <strong>{nodeRow.cpu}</strong>
                  <div className="meter-track">
                    <div className="meter-fill meter-fill-healthy" style={{ width: `${nodeRow.cpuPercentage}%` }} />
                  </div>
                </div>
                <div className="metric-cell">
                  <strong>{nodeRow.memory}</strong>
                  <div className="meter-track">
                    <div className="meter-fill meter-fill-warning" style={{ width: `${nodeRow.memoryPercentage}%` }} />
                  </div>
                </div>
                <div className="metric-cell">
                  <strong>{nodeRow.gpu}</strong>
                  <div className="meter-track">
                    <div className="meter-fill meter-fill-critical" style={{ width: `${nodeRow.gpuPercentage}%` }} />
                  </div>
                </div>
                <span className="status-pill status-pill-healthy">{nodeRow.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel operator-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Namespace Activity</p>
              <h2>Filtered workload footprint</h2>
            </div>
          </div>
          <div className="namespace-grid">
            {view.namespaces.map((namespaceRow) => (
              <article className="namespace-card namespace-card-operator" key={namespaceRow.name}>
                <div className="namespace-header">
                  <div>
                    <Link className="row-label-link" href={`/dashboard/namespaces/${encodeURIComponent(namespaceRow.name)}`}>
                      <h3>{namespaceRow.name}</h3>
                    </Link>
                    <p className="muted">Top workload: {namespaceRow.topWorkload}</p>
                  </div>
                  <span className={`status-pill status-pill-${namespaceRow.pressurePercentage >= 80 ? "critical" : namespaceRow.pressurePercentage >= 60 ? "warning" : "healthy"}`}>
                    {namespaceRow.pressurePercentage}%
                  </span>
                </div>
                <div className="meter-track">
                  <div
                    className={`meter-fill meter-fill-${namespaceRow.pressurePercentage >= 80 ? "critical" : namespaceRow.pressurePercentage >= 60 ? "warning" : "healthy"}`}
                    style={{ width: `${namespaceRow.pressurePercentage}%` }}
                  />
                </div>
                <div className="namespace-stats">
                  <div>
                    <span>CPU</span>
                    <strong>{namespaceRow.cpu}</strong>
                  </div>
                  <div>
                    <span>Memory</span>
                    <strong>{namespaceRow.memory}</strong>
                  </div>
                  <div>
                    <span>GPU</span>
                    <strong>{namespaceRow.gpu}</strong>
                  </div>
                </div>
                <div className="occupancy-actions">
                  <button
                    type="button"
                    className="control-pill"
                    onClick={() => {
                      setNamespace(namespaceRow.name);
                      updateUrl({ namespace: namespaceRow.name, node, search });
                    }}
                  >
                    Focus dashboard
                  </button>
                  <Link className="control-pill detail-nav-link" href={`/dashboard/namespaces/${encodeURIComponent(namespaceRow.name)}`}>
                    Open namespace detail
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <aside className="dashboard-side-rail">
        <WorkloadDetailPanel detail={view.selectedWorkload} snapshot={data.snapshot} />
      </aside>
    </div>
  );
}
