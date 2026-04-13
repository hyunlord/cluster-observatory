import React from "react";
import Link from "next/link";
import type { GkeDashboardData, WorkloadDetail } from "../../lib/gke-dashboard";
import { buildDashboardHref, buildDetailHref, normalizeDashboardFilters } from "../../lib/dashboard-query";
import type { DashboardFilters } from "../../lib/gke-dashboard-view";
import { SnapshotTrustPanel } from "./snapshot-trust-panel";

interface WorkloadDetailPanelProps {
  detail?: WorkloadDetail;
  mode?: "drawer" | "page";
  snapshot?: GkeDashboardData["snapshot"];
  dashboardFilters?: DashboardFilters;
}

function workloadHref(detail: WorkloadDetail, dashboardFilters: DashboardFilters): string {
  return buildDetailHref(
    `/dashboard/workloads/${encodeURIComponent(detail.workload.namespace)}/${encodeURIComponent(detail.workload.name)}`,
    dashboardFilters
  );
}

function dashboardHref(detail: WorkloadDetail, dashboardFilters: DashboardFilters): string {
  return buildDashboardHref({
    ...dashboardFilters,
    namespace: detail.workload.namespace,
    node: "",
    search: detail.workload.name
  });
}

function namespaceHref(detail: WorkloadDetail, dashboardFilters: DashboardFilters): string {
  return buildDetailHref(`/dashboard/namespaces/${encodeURIComponent(detail.workload.namespace)}`, dashboardFilters);
}

export function WorkloadDetailPanel({
  detail,
  mode = "drawer",
  snapshot,
  dashboardFilters = normalizeDashboardFilters({})
}: WorkloadDetailPanelProps) {
  if (!detail) {
    return (
      <article className="panel side-panel drawer-panel">
        <p className="eyebrow">Workload Detail</p>
        <h2>Select a workload</h2>
        <p className="muted">
          Select a workload from the consumer panels or workload table to inspect pods, node placement, and request
          headroom.
        </p>
      </article>
    );
  }

  return (
    <article className={`panel side-panel drawer-panel ${mode === "page" ? "drawer-panel-page" : ""}`}>
      <div className="drawer-title-row">
        <div>
          <p className="eyebrow">{mode === "page" ? "Workload Overview" : "Workload Detail"}</p>
          <h2>{detail.workload.name}</h2>
        </div>
        {mode === "drawer" ? (
          <Link className="control-pill detail-nav-link" href={workloadHref(detail, dashboardFilters)}>
            Open full detail
          </Link>
        ) : (
          <Link className="control-pill detail-nav-link" href={dashboardHref(detail, dashboardFilters)}>
            Back to dashboard
          </Link>
        )}
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
          <span>Namespace</span>
          <strong>{detail.workload.namespace}</strong>
        </div>
        <div className="side-kpi">
          <span>Replicas / pods</span>
          <strong>{detail.summary.podCount}</strong>
        </div>
        <div className="side-kpi">
          <span>Ready pods</span>
          <strong>{detail.summary.readyLabel}</strong>
        </div>
        <div className="side-kpi">
          <span>Restarts</span>
          <strong>{detail.summary.restartLabel}</strong>
        </div>
        <div className="side-kpi">
          <span>Primary node</span>
          <strong>{detail.summary.primaryNode}</strong>
        </div>
        <div className="side-kpi">
          <span>Headroom</span>
          <strong>{detail.summary.headroomLabel}</strong>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Quick actions</h3>
          <small className="muted">Jump from the current workload into the most useful next views</small>
        </div>
        <div className="quick-action-grid">
          <Link className="control-pill detail-nav-link" href={buildDashboardHref({ ...dashboardFilters, namespace: detail.workload.namespace, node: "", search: "" })}>
            Focus namespace
          </Link>
          <Link className="control-pill detail-nav-link" href={namespaceHref(detail, dashboardFilters)}>
            Open namespace detail
          </Link>
          <Link
            className="control-pill detail-nav-link"
            href={buildDetailHref(`/dashboard/nodes/${encodeURIComponent(detail.summary.primaryNode)}`, dashboardFilters)}
          >
            Open primary node
          </Link>
          <Link className="control-pill detail-nav-link" href={dashboardHref(detail, dashboardFilters)}>
            Focus workload on dashboard
          </Link>
        </div>
      </div>

      {snapshot ? (
        <SnapshotTrustPanel
          snapshot={snapshot}
          description="Container and pod diagnosis should always be read with collector coverage in mind"
        />
      ) : null}

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Rightsizing hint</h3>
          <small className="muted">Estimated efficiency signal, not billing data.</small>
        </div>
        <div className="side-kpi-list side-kpi-list-compact">
          <div className="side-kpi">
            <span>Recommendation</span>
            <strong>{detail.workload.rightsizingHint}</strong>
          </div>
          <div className="side-kpi">
            <span>Confidence</span>
            <strong>{detail.workload.efficiencyConfidence}</strong>
          </div>
          <div className="side-kpi">
            <span>Idle allocation</span>
            <strong>{detail.workload.idleAllocationEstimate}</strong>
          </div>
          <div className="side-kpi">
            <span>Cost source</span>
            <strong>{detail.workload.costSource}</strong>
          </div>
          <div className="side-kpi">
            <span>Priority score</span>
            <strong>{detail.workload.priorityScore}</strong>
          </div>
          <div className="side-kpi">
            <span>Estimated monthly footprint</span>
            <strong>
              {detail.workload.estimatedMonthlyCost !== null
                ? `$${detail.workload.estimatedMonthlyCost.toFixed(2)}`
                : "n/a"}
            </strong>
          </div>
          <div className="side-kpi">
            <span>Actual monthly cost</span>
            <strong>
              {detail.workload.actualMonthlyCost !== null
                ? `$${detail.workload.actualMonthlyCost.toFixed(2)}`
                : "Awaiting OpenCost feed"}
            </strong>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Recent workload events</h3>
          <small className="muted">Recent signals tied to the selected workload in the current snapshot</small>
        </div>
        <div className="drawer-pod-list">
          {detail.workload.events.length > 0 ? (
            detail.workload.events.map((event) => (
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
            <p className="muted">No recent workload events in the current snapshot.</p>
          )}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Log actions</h3>
          <small className="muted">Use these shortcuts to pivot from the snapshot into deeper workload debugging.</small>
        </div>
        <div className="quick-action-grid">
          <Link className="control-pill detail-nav-link" href={dashboardHref(detail, dashboardFilters)}>
            Focus workload on dashboard
          </Link>
          <Link className="control-pill detail-nav-link" href={namespaceHref(detail, dashboardFilters)}>
            Open namespace detail
          </Link>
          <span className="control-pill control-pill-static">Inspect logs with kubectl</span>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Node spread</h3>
          <small className="muted">{detail.nodeSpread.length} active node(s)</small>
        </div>
        <div className="drawer-tags">
          {detail.nodeSpread.map((nodeName) => (
            <Link
              className="drawer-tag-link"
              key={nodeName}
              href={buildDetailHref(`/dashboard/nodes/${encodeURIComponent(nodeName)}`, dashboardFilters)}
            >
              {nodeName}
            </Link>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Capacity posture</h3>
          <small className="muted">Usage, requests, and limits for the current workload footprint</small>
        </div>
        <div className="drawer-capacity-grid">
          <div className="drawer-capacity-card">
            <span>CPU</span>
            <strong>{detail.workload.cpuUsage}</strong>
            <small className="muted">
              Req {detail.workload.cpuRequests} · Lim {detail.workload.cpuLimits}
            </small>
          </div>
          <div className="drawer-capacity-card">
            <span>Memory</span>
            <strong>{detail.workload.memoryUsage}</strong>
            <small className="muted">
              Req {detail.workload.memoryRequests} · Lim {detail.workload.memoryLimits}
            </small>
          </div>
          <div className="drawer-capacity-card">
            <span>GPU</span>
            <strong>{detail.workload.gpuUsage}</strong>
            <small className="muted">Kind {detail.workload.kind}</small>
          </div>
        </div>
      </div>

      {detail.hotspotPod ? (
        <div className="detail-section">
          <div className="detail-section-header">
            <h3>Hot pod</h3>
            <small className="muted">Highest restart or readiness risk in the current workload</small>
          </div>
          <div className="hotspot-card">
            <div>
              <strong>{detail.hotspotPod.name}</strong>
              <p className="muted">
                {detail.hotspotPod.status} · {detail.hotspotPod.node}
              </p>
              <p className="muted drawer-pod-subline">
                {detail.hotspotPod.readyContainers}/{detail.hotspotPod.totalContainers} ready · {detail.hotspotPod.restartCount} restarts
              </p>
            </div>
            <div className="drawer-pod-metrics">
              <span
                className={`status-pill status-pill-${detail.hotspotPod.readyContainers >= detail.hotspotPod.totalContainers && detail.hotspotPod.status === "Running" ? "healthy" : "critical"}`}
              >
                {detail.hotspotPod.readyContainers >= detail.hotspotPod.totalContainers && detail.hotspotPod.status === "Running" ? "Stable" : "Hot"}
              </span>
              <span>{detail.hotspotPod.cpuUsage}</span>
              <span>{detail.hotspotPod.memoryUsage}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Container health</h3>
          <small className="muted">Container-level readiness, restart activity, and request posture for each pod</small>
        </div>
        <div className="pod-group-list">
          {detail.pods.map((pod) => (
            <div className="pod-group-card" key={`${pod.id}-containers`}>
              <div className="detail-section-header">
                <div>
                  <h3>{pod.name}</h3>
                  <small className="muted">
                    {pod.reason} · {pod.restartCount} restarts
                  </small>
                </div>
                <span
                  className={`status-pill status-pill-${pod.readyContainers >= pod.totalContainers && pod.status === "Running" ? "healthy" : "warning"}`}
                >
                  {pod.readyContainers}/{pod.totalContainers} ready
                </span>
              </div>
              <div className="drawer-pod-list">
                {pod.containers.map((container) => (
                  <div className="drawer-pod-row" key={`${pod.id}-${container.name}`}>
                    <div>
                      <strong>{container.name}</strong>
                      <p className="muted">
                        {container.reason ?? container.state} · {container.restartCount} restarts
                      </p>
                      <p className="muted drawer-pod-subline">
                        Req {container.cpuRequest} / {container.memoryRequest} · Lim {container.cpuLimit} / {container.memoryLimit}
                      </p>
                    </div>
                    <div className="drawer-pod-metrics">
                      <span className={`status-pill status-pill-${container.ready ? "healthy" : "warning"}`}>
                        {container.ready ? "Ready" : "Attention"}
                      </span>
                      <span>{container.state}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Pods by node</h3>
          <small className="muted">Pod health grouped by node placement to surface local hotspots</small>
        </div>
        <div className="pod-group-list">
          {detail.podGroups.map((group) => (
            <div className="pod-group-card" key={group.node}>
              <div className="detail-section-header">
                <div>
                  <h3>{group.node}</h3>
                  <small className="muted">
                    {group.attentionCount > 0 ? `${group.attentionCount} needs attention` : "All pods healthy"}
                  </small>
                </div>
                <span className={`status-pill status-pill-${group.attentionCount > 0 ? "warning" : "healthy"}`}>
                  {group.healthyCount} healthy / {group.pods.length} total
                </span>
              </div>
              <div className="drawer-pod-list">
                {group.pods.map((pod) => (
                  <div className="drawer-pod-row" key={pod.id}>
                    <div>
                      <strong>{pod.name}</strong>
                      <p className="muted">
                        {pod.status} · {pod.node}
                      </p>
                      <p className="muted drawer-pod-subline">
                        {pod.readyContainers}/{pod.totalContainers} ready · {pod.restartCount} restarts
                      </p>
                    </div>
                    <div className="drawer-pod-metrics">
                      <span
                        className={`status-pill status-pill-${pod.readyContainers >= pod.totalContainers && pod.status === "Running" ? "healthy" : "warning"}`}
                      >
                        {pod.readyContainers >= pod.totalContainers && pod.status === "Running" ? "Ready" : "Attention"}
                      </span>
                      <span>{pod.cpuUsage}</span>
                      <span>{pod.memoryUsage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
