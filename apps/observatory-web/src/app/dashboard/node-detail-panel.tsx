import React from "react";
import Link from "next/link";
import type { GkeDashboardData, NodeDetail } from "../../lib/gke-dashboard";
import { buildDashboardHref, buildDetailHref, normalizeDashboardFilters } from "../../lib/dashboard-query";
import type { DashboardFilters } from "../../lib/gke-dashboard-view";
import { SnapshotTrustPanel } from "./snapshot-trust-panel";

interface NodeDetailPanelProps {
  detail?: NodeDetail;
  snapshot?: GkeDashboardData["snapshot"];
  dashboardFilters?: DashboardFilters;
}

function dashboardHref(detail: NodeDetail, dashboardFilters: DashboardFilters): string {
  return buildDashboardHref({
    ...dashboardFilters,
    namespace: "",
    node: detail.node.name,
    search: ""
  });
}

function workloadHref(namespace: string, workload: string, dashboardFilters: DashboardFilters): string {
  return buildDetailHref(`/dashboard/workloads/${encodeURIComponent(namespace)}/${encodeURIComponent(workload)}`, dashboardFilters);
}

function namespaceHref(namespace: string, dashboardFilters: DashboardFilters): string {
  return buildDetailHref(`/dashboard/namespaces/${encodeURIComponent(namespace)}`, dashboardFilters);
}

export function NodeDetailPanel({
  detail,
  snapshot,
  dashboardFilters = normalizeDashboardFilters({})
}: NodeDetailPanelProps) {
  if (!detail) {
    return (
      <article className="panel side-panel drawer-panel drawer-panel-page">
        <p className="eyebrow">Node Overview</p>
        <h2>Node not found</h2>
        <p className="muted">The requested node could not be resolved from the current snapshot.</p>
        <Link className="control-pill detail-nav-link" href="/dashboard">
          Back to dashboard
        </Link>
      </article>
    );
  }

  const dominantWorkload =
    detail.workloadGroups.find((group) => group.workload.name === detail.summary.dominantWorkload) ?? detail.workloadGroups[0];

  return (
    <article className="panel side-panel drawer-panel drawer-panel-page">
      <div className="drawer-title-row">
        <div>
          <p className="eyebrow">Node Overview</p>
          <h2>{detail.node.name}</h2>
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
          <span>Workloads</span>
          <strong>{detail.summary.workloadCountLabel}</strong>
        </div>
        <div className="side-kpi">
          <span>Pods on node</span>
          <strong>{detail.summary.podCountLabel}</strong>
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
          <span>Primary namespace</span>
          <strong>{detail.summary.primaryNamespace}</strong>
        </div>
        <div className="side-kpi">
          <span>Dominant workload</span>
          <strong>{detail.summary.dominantWorkload}</strong>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Quick actions</h3>
          <small className="muted">Jump from the current node into the most relevant follow-up views</small>
        </div>
        <div className="quick-action-grid">
          <Link className="control-pill detail-nav-link" href={dashboardHref(detail, dashboardFilters)}>
            Focus node on dashboard
          </Link>
          {dominantWorkload ? (
            <Link
              className="control-pill detail-nav-link"
              href={workloadHref(dominantWorkload.workload.namespace, dominantWorkload.workload.name, dashboardFilters)}
            >
              Open dominant workload
            </Link>
          ) : null}
          <Link
            className="control-pill detail-nav-link"
            href={buildDashboardHref({ ...dashboardFilters, namespace: detail.summary.primaryNamespace, search: "" })}
          >
            Focus namespace
          </Link>
        </div>
      </div>

      {snapshot ? (
        <SnapshotTrustPanel
          snapshot={snapshot}
          description="Confidence and coverage signals for the data behind this node diagnosis"
        />
      ) : null}

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Node risk summary</h3>
          <small className="muted">Collapse node conditions, taints, events, and pod health into one diagnosis block.</small>
        </div>
        <div className="side-kpi-list side-kpi-list-compact">
          <div className="side-kpi">
            <span>Health state</span>
            <strong>{detail.summary.statusLabel}</strong>
          </div>
          <div className="side-kpi">
            <span>Firing conditions</span>
            <strong>{detail.node.conditions.filter((condition) => condition.type !== "Ready" && condition.status === "True").length}</strong>
          </div>
          <div className="side-kpi">
            <span>Warning events</span>
            <strong>{detail.node.events.filter((event) => event.type === "Warning").length}</strong>
          </div>
          <div className="side-kpi">
            <span>Attention pods</span>
            <strong>{detail.pods.filter((pod) => pod.readyContainers < pod.totalContainers || pod.status !== "Running").length}</strong>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Operator actions</h3>
          <small className="muted">Shortcuts for the next diagnosis step once a node looks unhealthy.</small>
        </div>
        <div className="quick-action-grid">
          <Link className="control-pill detail-nav-link" href={dashboardHref(detail, dashboardFilters)}>
            Focus node on dashboard
          </Link>
          {dominantWorkload ? (
            <Link
              className="control-pill detail-nav-link"
              href={workloadHref(dominantWorkload.workload.namespace, dominantWorkload.workload.name, dashboardFilters)}
            >
              Open dominant workload
            </Link>
          ) : null}
          <Link className="control-pill detail-nav-link" href={namespaceHref(detail.summary.primaryNamespace, dashboardFilters)}>
            Open namespace blast radius
          </Link>
          <span className="control-pill control-pill-static">Inspect with kubectl describe node</span>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Capacity posture</h3>
          <small className="muted">Direct node pressure and allocatable usage across compute and GPU</small>
        </div>
        <div className="drawer-capacity-grid">
          <div className="drawer-capacity-card">
            <span>CPU</span>
            <strong>{detail.node.cpu}</strong>
            <small className="muted">{detail.node.cpuPercentage}% saturation</small>
          </div>
          <div className="drawer-capacity-card">
            <span>Memory</span>
            <strong>{detail.node.memory}</strong>
            <small className="muted">{detail.node.memoryPercentage}% saturation</small>
          </div>
          <div className="drawer-capacity-card">
            <span>GPU</span>
            <strong>{detail.node.gpu}</strong>
            <small className="muted">{detail.node.gpuPercentage}% saturation</small>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Node conditions</h3>
          <small className="muted">Kubelet-reported node health signals and pressure indicators</small>
        </div>
        <div className="drawer-pod-list">
          {detail.node.conditions.map((condition) => {
            const tone =
              condition.type === "Ready"
                ? condition.status === "True"
                  ? "healthy"
                  : "critical"
                : condition.status === "True"
                  ? "critical"
                  : "healthy";

            return (
              <div className="drawer-pod-row" key={`${condition.type}-${condition.status}`}>
                <div>
                  <strong>{condition.type}</strong>
                  <p className="muted">{condition.reason ?? "No explicit reason"}</p>
                  {condition.message ? <p className="muted drawer-pod-subline">{condition.message}</p> : null}
                </div>
                <div className="drawer-pod-metrics">
                  <span className={`status-pill status-pill-${tone}`}>{condition.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Node taints</h3>
          <small className="muted">Scheduling constraints currently applied to the node</small>
        </div>
        <div className="drawer-tags">
          {detail.node.taints.length > 0 ? (
            detail.node.taints.map((taint) => (
              <span key={`${taint.key}-${taint.effect}`}>{`${taint.key}${taint.value ? `=${taint.value}` : ""}:${taint.effect}`}</span>
            ))
          ) : (
            <span>No taints</span>
          )}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <h3>Recent node events</h3>
          <small className="muted">Most recent warning and scheduling events tied to this node</small>
        </div>
        <div className="drawer-pod-list">
          {detail.node.events.length > 0 ? (
            detail.node.events.map((event) => (
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
            <p className="muted">No recent node events in the current snapshot.</p>
          )}
        </div>
      </div>

      {detail.hotspotPod ? (
        <div className="detail-section">
          <div className="detail-section-header">
            <h3>Hot pod</h3>
            <small className="muted">Highest restart or readiness risk on this node</small>
          </div>
          <div className="hotspot-card">
            <div>
              <strong>{detail.hotspotPod.name}</strong>
              <p className="muted">
                {detail.hotspotPod.reason} · {detail.hotspotPod.workloadName}
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
          <h3>Hosted workloads</h3>
          <small className="muted">Pods on node grouped by workload so you can see which footprint dominates this node</small>
        </div>
        <div className="pod-group-list">
          {detail.workloadGroups.map((group) => (
            <div className="pod-group-card" key={group.workload.id}>
              <div className="detail-section-header">
                <div>
                  <h3>{group.workload.name}</h3>
                  <small className="muted">
                    {group.workload.namespace} · {group.workload.kind}
                  </small>
                </div>
                <Link
                  className="control-pill detail-nav-link"
                  href={workloadHref(group.workload.namespace, group.workload.name, dashboardFilters)}
                >
                  Open workload
                </Link>
              </div>
              <div className="side-kpi-list side-kpi-list-compact">
                <div className="side-kpi">
                  <span>Pods</span>
                  <strong>{group.pods.length}</strong>
                </div>
                <div className="side-kpi">
                  <span>Healthy</span>
                  <strong>{group.healthyCount}</strong>
                </div>
                <div className="side-kpi">
                  <span>Attention</span>
                  <strong>{group.attentionCount}</strong>
                </div>
                <div className="side-kpi">
                  <span>Restarts</span>
                  <strong>{group.restartCount}</strong>
                </div>
              </div>
              <div className="drawer-pod-list">
                {group.pods.map((pod) => (
                  <div className="drawer-pod-row" key={pod.id}>
                    <div>
                      <strong>{pod.name}</strong>
                      <p className="muted">
                        {pod.reason} · {pod.workloadName}
                      </p>
                      <p className="muted drawer-pod-subline">
                        {pod.readyContainers}/{pod.totalContainers} ready · {pod.restartCount} restarts
                      </p>
                      <p className="muted drawer-pod-subline">
                        {(pod.containers.find((container) => !container.ready) ?? pod.containers[0])?.name ?? "container"} ·{" "}
                        {(pod.containers.find((container) => !container.ready) ?? pod.containers[0])?.reason ??
                          (pod.containers.find((container) => !container.ready) ?? pod.containers[0])?.state ??
                          "unknown"}
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
