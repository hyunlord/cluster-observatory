import React from "react";
import Link from "next/link";
import type { GkeDashboardData, NamespaceDetail } from "../../lib/gke-dashboard";
import { buildDashboardHref, buildDetailHref, normalizeDashboardFilters } from "../../lib/dashboard-query";
import type { DashboardFilters } from "../../lib/gke-dashboard-view";
import { SnapshotTrustPanel } from "./snapshot-trust-panel";

interface NamespaceDetailPanelProps {
  detail?: NamespaceDetail;
  snapshot?: GkeDashboardData["snapshot"];
  dashboardFilters?: DashboardFilters;
}

function dashboardHref(detail: NamespaceDetail, dashboardFilters: DashboardFilters): string {
  return buildDashboardHref({
    ...dashboardFilters,
    namespace: detail.namespace.name,
    node: "",
    search: ""
  });
}

function workloadHref(namespace: string, workload: string, dashboardFilters: DashboardFilters): string {
  return buildDetailHref(`/dashboard/workloads/${encodeURIComponent(namespace)}/${encodeURIComponent(workload)}`, dashboardFilters);
}

function nodeHref(node: string, dashboardFilters: DashboardFilters): string {
  return buildDetailHref(`/dashboard/nodes/${encodeURIComponent(node)}`, dashboardFilters);
}

export function NamespaceDetailPanel({
  detail,
  snapshot,
  dashboardFilters = normalizeDashboardFilters({})
}: NamespaceDetailPanelProps) {
  if (!detail) {
    return (
      <article className="panel side-panel drawer-panel drawer-panel-page">
        <p className="eyebrow">Namespace Overview</p>
        <h2>Namespace not found</h2>
        <p className="muted">The requested namespace could not be resolved from the current snapshot.</p>
        <Link className="control-pill detail-nav-link" href="/dashboard">
          Back to dashboard
        </Link>
      </article>
    );
  }

  const topWorkload = detail.topWorkloads[0];
  const busiestNode = detail.nodes[0];

  return (
    <article className="panel side-panel drawer-panel drawer-panel-page">
      <div className="drawer-title-row">
        <div>
          <p className="eyebrow">Namespace Overview</p>
          <h2>{detail.namespace.name}</h2>
        </div>
        <Link className="control-pill detail-nav-link" href={dashboardHref(detail, dashboardFilters)}>
          Back to dashboard
        </Link>
      </div>

      <div className="drawer-health-row">
        <span className={`status-pill status-pill-${detail.summary.healthTone}`}>{detail.summary.statusLabel}</span>
        {detail.alerts.map((alert) => (
          <span className={`status-pill status-pill-${alert.tone}`} key={alert.label}>
            {alert.label}
          </span>
        ))}
      </div>

      <div className="side-kpi-list">
        <div className="side-kpi">
          <span>CPU</span>
          <strong>{detail.namespace.cpu}</strong>
        </div>
        <div className="side-kpi">
          <span>Memory</span>
          <strong>{detail.namespace.memory}</strong>
        </div>
        <div className="side-kpi">
          <span>GPU</span>
          <strong>{detail.namespace.gpu}</strong>
        </div>
        <div className="side-kpi">
          <span>Workloads</span>
          <strong>{detail.summary.workloadCountLabel}</strong>
        </div>
        <div className="side-kpi">
          <span>Pods</span>
          <strong>{detail.summary.podCountLabel}</strong>
        </div>
        <div className="side-kpi">
          <span>Nodes</span>
          <strong>{detail.summary.nodeCountLabel}</strong>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Quick actions</h3>
          <small className="muted">Jump from the namespace summary into the hottest workload or busiest node.</small>
        </div>
        <div className="quick-action-grid">
          <Link className="control-pill detail-nav-link" href={dashboardHref(detail, dashboardFilters)}>
            Focus namespace on dashboard
          </Link>
          {topWorkload ? (
            <Link className="control-pill detail-nav-link" href={workloadHref(detail.namespace.name, topWorkload.name, dashboardFilters)}>
              Open top workload
            </Link>
          ) : null}
          {busiestNode ? (
            <Link className="control-pill detail-nav-link" href={nodeHref(busiestNode.name, dashboardFilters)}>
              Open busiest node
            </Link>
          ) : null}
        </div>
      </div>

      {snapshot ? (
        <SnapshotTrustPanel
          snapshot={snapshot}
          description="Namespace diagnostics depend on the same collector coverage as the overview"
        />
      ) : null}

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Efficiency posture</h3>
          <small className="muted">Estimated efficiency signals for request tuning and idle allocation.</small>
        </div>
        <div className="side-kpi-list side-kpi-list-compact">
          <div className="side-kpi">
            <span>Request efficiency</span>
            <strong>{detail.namespace.efficiency.requestEfficiencyLabel}</strong>
          </div>
          <div className="side-kpi">
            <span>Idle allocation estimate</span>
            <strong>{detail.namespace.efficiency.idleAllocationEstimate}</strong>
          </div>
          <div className="side-kpi">
            <span>Over-requested workloads</span>
            <strong>{detail.namespace.efficiency.overRequestedWorkloads}</strong>
          </div>
          <div className="side-kpi">
            <span>Cost source</span>
            <strong>{detail.namespace.efficiency.costSource}</strong>
          </div>
          <div className="side-kpi">
            <span>Estimated monthly footprint</span>
            <strong>
              {detail.namespace.efficiency.estimatedMonthlyCost !== null
                ? `$${detail.namespace.efficiency.estimatedMonthlyCost.toFixed(2)}`
                : "n/a"}
            </strong>
          </div>
          <div className="side-kpi">
            <span>Idle monthly cost</span>
            <strong>
              {detail.namespace.efficiency.idleMonthlyCost !== null
                ? `$${detail.namespace.efficiency.idleMonthlyCost.toFixed(2)}`
                : "n/a"}
            </strong>
          </div>
          <div className="side-kpi">
            <span>Actual monthly cost</span>
            <strong>
              {detail.namespace.efficiency.actualMonthlyCost !== null
                ? `$${detail.namespace.efficiency.actualMonthlyCost.toFixed(2)}`
                : "Awaiting OpenCost feed"}
            </strong>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Top workloads</h3>
          <small className="muted">Highest-pressure workloads inside the current namespace.</small>
        </div>
        <div className="pod-group-list">
          {detail.topWorkloads.map((workload) => (
            <div className="pod-group-card" key={workload.id}>
              <div className="detail-section-header">
                <div>
                  <h3>{workload.name}</h3>
                  <small className="muted">
                    {workload.kind} · {workload.cpuUsage} CPU · {workload.memoryUsage} memory
                  </small>
                </div>
                <Link className="control-pill detail-nav-link" href={workloadHref(detail.namespace.name, workload.name, dashboardFilters)}>
                  Open workload
                </Link>
              </div>
              <div className="side-kpi-list side-kpi-list-compact">
                <div className="side-kpi">
                  <span>Replicas</span>
                  <strong>{workload.replicas}</strong>
                </div>
                <div className="side-kpi">
                  <span>Pressure</span>
                  <strong>{workload.pressurePercentage}%</strong>
                </div>
                <div className="side-kpi">
                  <span>Efficiency</span>
                  <strong>{workload.efficiency}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Involved nodes</h3>
          <small className="muted">Nodes currently hosting pods or workload placements for this namespace.</small>
        </div>
        <div className="drawer-tags">
          {detail.nodes.map((node) => (
            <Link className="drawer-tag-link" href={nodeHref(node.name, dashboardFilters)} key={node.name}>
              {node.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Recent namespace events</h3>
          <small className="muted">Latest namespace-scoped events promoted by the snapshot collector.</small>
        </div>
        <div className="drawer-pod-list">
          {detail.events.length > 0 ? (
            detail.events.map((event) => (
              <div className="drawer-pod-row" key={`${event.reason}-${event.lastSeen}`}>
                <div>
                  <strong>{event.reason}</strong>
                  <p className="muted">{event.message}</p>
                  <p className="muted drawer-pod-subline">{event.lastSeen}</p>
                </div>
                <div className="drawer-pod-metrics">
                  <span className={`status-pill status-pill-${event.type === "Warning" ? "critical" : "healthy"}`}>
                    {event.type}
                  </span>
                  <span>{event.count}x</span>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No recent namespace events in the current snapshot.</p>
          )}
        </div>
      </div>
    </article>
  );
}
