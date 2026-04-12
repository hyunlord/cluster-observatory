import Link from "next/link";
import React from "react";
import { filtersFromSearchParams } from "../../lib/dashboard-query";
import { getGkeDashboardData } from "../../lib/gke-dashboard";
import { LiveControls } from "./live-controls";
import { DashboardExplorer } from "./dashboard-explorer";

function formatSnapshotTime(capturedAt: string) {
  return new Date(capturedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function buildFootprint(data: Awaited<ReturnType<typeof getGkeDashboardData>>) {
  return [
    {
      label: "Nodes",
      value: String(data.nodes.length),
      detail: `${data.nodes.filter((node) => node.status === "Ready").length} ready`
    },
    {
      label: "Namespaces",
      value: String(data.namespaces.length),
      detail: "active namespaces"
    },
    {
      label: "Workloads",
      value: String(data.workloads.length),
      detail: "tracked workload rows"
    },
    {
      label: "Pods",
      value: String(data.pods.length),
      detail: "live pod records"
    }
  ];
}

interface HotAlertCard {
  title: string;
  detail: string;
  tone: "healthy" | "warning" | "critical";
  href: string;
  actionLabel: string;
}

function sparklinePoints(values: number[]) {
  return values.map((value, index) => ({
    id: `${index}-${value}`,
    height: Math.max(18, Math.round(value * 0.82))
  }));
}

function buildHotAlerts(data: Awaited<ReturnType<typeof getGkeDashboardData>>): HotAlertCard[] {
  const alerts: HotAlertCard[] = [];
  const warningNode = data.nodes.find(
    (node) =>
      node.status !== "Ready" ||
      node.conditions.some((condition) => condition.status === "True" && condition.type !== "Ready") ||
      node.events.some((event) => event.type === "Warning")
  );
  const namespaceAlert = data.namespaces.find((namespace) => namespace.alerts.some((alert) => alert.tone !== "healthy"));
  const hotWorkload =
    data.workloads.find(
      (workload) => workload.efficiency === "Hot" || workload.events.some((event) => event.type === "Warning")
    ) ?? data.workloads[0];
  const snapshotTone =
    data.snapshot.batch.tone === "critical"
      ? "critical"
      : data.snapshot.collectorStatus === "partial"
      ? "warning"
      : data.snapshot.collectorStatus === "failed" || data.snapshot.freshness.tone === "critical"
        ? "critical"
        : "healthy";

  alerts.push({
    title: "Snapshot status",
    detail:
      data.snapshot.batch.recentError ??
      data.snapshot.collectionWarnings[0] ??
      `${data.snapshot.batch.status} batch · ${data.snapshot.collectorStatus} collector · ${data.snapshot.freshness.detail}`,
    tone: snapshotTone,
    href: "#snapshot-status",
    actionLabel: "Inspect snapshot status"
  });

  if (hotWorkload) {
    alerts.push({
      title: "Hot workload",
      detail: `${hotWorkload.namespace}/${hotWorkload.name} · ${hotWorkload.cpuUsage} CPU`,
      tone: hotWorkload.efficiency === "Hot" ? "critical" : "warning",
      href: `/dashboard/workloads/${encodeURIComponent(hotWorkload.namespace)}/${encodeURIComponent(hotWorkload.name)}`,
      actionLabel: "Open workload"
    });
  }

  if (warningNode) {
    alerts.push({
      title: "Node warning",
      detail: `${warningNode.name} · ${warningNode.status} · ${warningNode.memoryPercentage}% memory`,
      tone: "warning",
      href: `/dashboard/nodes/${encodeURIComponent(warningNode.name)}`,
      actionLabel: "Open node"
    });
  }

  if (namespaceAlert) {
    alerts.push({
      title: "Namespace pressure",
      detail: `${namespaceAlert.name} · ${namespaceAlert.alerts[0]?.label ?? namespaceAlert.topWorkload}`,
      tone: namespaceAlert.alerts[0]?.tone ?? "warning",
      href: `/dashboard?namespace=${encodeURIComponent(namespaceAlert.name)}`,
      actionLabel: "Filter namespace"
    });
  }

  return alerts.slice(0, 4);
}

interface DashboardPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage(props: DashboardPageProps) {
  const data = await getGkeDashboardData(process.cwd());
  const footprint = buildFootprint(data);
  const busiestNode = [...data.nodes].sort(
    (left, right) =>
      right.cpuPercentage + right.memoryPercentage + right.gpuPercentage -
      (left.cpuPercentage + left.memoryPercentage + left.gpuPercentage)
  )[0];
  const hottestNamespace = data.namespaces[0];
  const topWorkload = data.workloads[0];
  const hotAlerts = buildHotAlerts(data);
  const searchParams = props?.searchParams;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  const initialFilters = filtersFromSearchParams(params);

  return (
    <main className="console-shell">
      <header className="dashboard-hero">
        <section className="panel hero-primary">
          <p className="eyebrow">Operations Overview</p>
          <div className="hero-row">
            <div>
              <h1>GKE Operations Cockpit</h1>
              <p className="lede">
                A compact live view of cluster capacity, node pressure, namespace load, and refresh state.
              </p>
            </div>
            <div className="hero-meta hero-meta-grid">
              <div className="hero-meta-block">
                <span>Cluster</span>
                <strong className="row-label">{data.cluster.name}</strong>
              </div>
              <div className="hero-meta-block">
                <span>Region</span>
                <strong>{data.cluster.region}</strong>
              </div>
            </div>
          </div>
          <div className="hero-chip-row">
            <span className={`status-pill status-pill-${data.snapshot.freshness.tone}`}>
              {data.snapshot.freshness.label}
            </span>
            <span className="metric-chip">Source: {data.snapshot.source}</span>
            <span className="metric-chip">Captured: {formatSnapshotTime(data.snapshot.capturedAt)}</span>
          </div>
          <section className="hero-footprint">
            <div className="section-header section-header-compact">
              <div>
                <p className="eyebrow">Live footprint</p>
                <h2>Current scope</h2>
              </div>
              <p className="muted">Counts reflect the active snapshot, not a historical rollup.</p>
            </div>
            <div className="hero-footprint-grid">
              {footprint.map((item) => (
                <article className="hero-footprint-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p className="muted">{item.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="panel hero-side" id="snapshot-status">
          <div className="section-header">
            <div>
              <p className="eyebrow">Live State</p>
              <h2>Refresh Control</h2>
            </div>
            <span className={`status-pill status-pill-${data.snapshot.freshness.tone}`}>{data.snapshot.health}</span>
          </div>
          <LiveControls capturedAt={data.snapshot.capturedAt} />
          <div className="hero-side-grid">
            <div className="hero-side-block">
              <span>Age</span>
              <strong>{data.snapshot.freshness.detail}</strong>
            </div>
            <div className="hero-side-block">
              <span>Source provider</span>
              <strong>{data.snapshot.source}</strong>
            </div>
            <div className="hero-side-block">
              <span>Batch status</span>
              <strong>{data.snapshot.batch.label}</strong>
              <p className="muted">{data.snapshot.batch.detail}</p>
            </div>
            <div className="hero-side-block">
              <span>Last success</span>
              <strong>
                {data.snapshot.batch.lastSuccessAt
                  ? formatSnapshotTime(data.snapshot.batch.lastSuccessAt)
                  : "Manual snapshot mode"}
              </strong>
              <p className="muted">Consecutive failures: {data.snapshot.batch.consecutiveFailures}</p>
            </div>
            <div className="hero-side-block">
              <span>Collector confidence</span>
              <strong>{data.snapshot.collectorConfidence}</strong>
              <p className="muted">{data.snapshot.collectorStatus} collector status</p>
            </div>
            <div className="hero-side-block">
              <span>Missing sources</span>
              <strong>
                {data.snapshot.missingSources.length > 0 ? data.snapshot.missingSources.join(", ") : "None"}
              </strong>
              <p className="muted">{data.snapshot.trustNote}</p>
            </div>
          </div>
          {data.snapshot.batch.recentError ? (
            <article className={`hero-status-card hero-status-card-${data.snapshot.batch.tone}`}>
              <span>Recent batch error</span>
              <strong>{data.snapshot.batch.status}</strong>
              <p className="muted">{data.snapshot.batch.recentError}</p>
            </article>
          ) : null}
          {data.snapshot.collectionWarnings.length > 0 ? (
            <article className={`hero-status-card hero-status-card-${data.snapshot.freshness.tone}`}>
              <span>Collector warnings</span>
              <strong>{data.snapshot.collectorStatus}</strong>
              <p className="muted">{data.snapshot.collectionWarnings[0]}</p>
            </article>
          ) : null}
          {data.snapshot.issues.length > 0 ? (
            <article className={`hero-status-card hero-status-card-${data.snapshot.collectorConfidence === "low" ? "critical" : "warning"}`}>
              <span>Collector confidence</span>
              <strong>{data.snapshot.collectorConfidence}</strong>
              <p className="muted">
                {data.snapshot.issues[0]?.source}: {data.snapshot.issues[0]?.message}
              </p>
            </article>
          ) : null}
          <article className={`hero-status-card hero-status-card-${data.snapshot.collectorConfidence === "high" ? "healthy" : "warning"}`}>
            <span>Affected areas</span>
            <strong>{data.snapshot.affectedAreas.length > 0 ? data.snapshot.affectedAreas[0] : "Full coverage"}</strong>
            <p className="muted">
              {data.snapshot.affectedAreas.length > 0
                ? data.snapshot.affectedAreas.slice(1, 3).join(" · ")
                : "Overview, drill-down, and event timelines all have full collector support."}
            </p>
          </article>
          <section className="hero-focus">
            <div className="section-header section-header-compact">
              <div>
                <p className="eyebrow">Attention hotspots</p>
                <h2>Where to look first</h2>
              </div>
            </div>
            <div className="hero-focus-grid">
              <article className="hero-focus-card">
                <span>Hot namespace</span>
                <strong className="row-label">{hottestNamespace?.name ?? "n/a"}</strong>
                <p className="muted">
                  {hottestNamespace ? `${hottestNamespace.cpu} CPU · ${hottestNamespace.memory} memory` : "No namespace data"}
                </p>
                {hottestNamespace ? (
                  <div className="hero-focus-actions">
                    <Link className="hero-focus-link" href={`/dashboard?namespace=${encodeURIComponent(hottestNamespace.name)}`}>
                      Filter to namespace
                    </Link>
                    <Link className="hero-focus-link" href={`/dashboard/namespaces/${encodeURIComponent(hottestNamespace.name)}`}>
                      Open namespace detail
                    </Link>
                  </div>
                ) : null}
              </article>
              <article className="hero-focus-card">
                <span>Busiest node</span>
                <strong className="row-label">{busiestNode?.name ?? "n/a"}</strong>
                <p className="muted">
                  {busiestNode
                    ? `${busiestNode.cpuPercentage}% CPU · ${busiestNode.memoryPercentage}% memory`
                    : "No node pressure data"}
                </p>
                {busiestNode ? (
                  <Link className="hero-focus-link" href={`/dashboard/nodes/${encodeURIComponent(busiestNode.name)}`}>
                    Open node detail
                  </Link>
                ) : null}
              </article>
              <article className="hero-focus-card">
                <span>Top workload</span>
                <strong className="row-label">{topWorkload?.name ?? "n/a"}</strong>
                <p className="muted">
                  {topWorkload ? `${topWorkload.namespace} · ${topWorkload.cpuUsage} CPU` : "No workload pressure data"}
                </p>
                {topWorkload ? (
                  <Link
                    className="hero-focus-link"
                    href={`/dashboard/workloads/${encodeURIComponent(topWorkload.namespace)}/${encodeURIComponent(topWorkload.name)}`}
                  >
                    Open workload detail
                  </Link>
                ) : null}
              </article>
            </div>
          </section>
        </aside>
      </header>

      <section className="hot-alerts-strip panel">
        <div className="section-header section-header-compact">
          <div>
            <p className="eyebrow">Hot Alerts</p>
            <h2>Immediate operator actions</h2>
          </div>
          <p className="muted">The dashboard promotes the highest-signal issues into one compact action strip.</p>
        </div>
        <div className="hot-alerts-grid">
          {hotAlerts.map((alert) => (
            <article className={`hot-alert-card hot-alert-card-${alert.tone}`} key={`${alert.title}-${alert.href}`}>
              <span>{alert.title}</span>
              <strong>{alert.detail}</strong>
              <Link className="hero-focus-link" href={alert.href}>
                {alert.actionLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="history-strip panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Recent Trend</p>
            <h2>Short-window resource drift</h2>
          </div>
          <p className="muted">{data.snapshot.history.note}</p>
        </div>
        <div className="history-grid">
          <div className="history-trend-grid">
            {data.snapshot.history.trendCards.map((card) => (
              <article className="history-card" key={card.label}>
                <div className="history-card-head">
                  <div>
                    <span>{card.label}</span>
                    <strong>{card.latest}</strong>
                  </div>
                  <span className={`status-pill status-pill-${card.tone}`}>{card.delta}</span>
                </div>
                <div className="sparkline" aria-label={card.label}>
                  {sparklinePoints(card.values).map((point) => (
                    <span
                      className={`sparkline-bar sparkline-bar-${card.tone}`}
                      key={point.id}
                      style={{ height: `${point.height}px` }}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="history-drift-panel">
            <div className="section-header section-header-compact">
              <div>
                <p className="eyebrow">Recent Drift</p>
                <h2>Latest change set</h2>
              </div>
              <span className="metric-chip">{data.snapshot.history.sampleCount} retained snapshots</span>
            </div>
            <div className="history-drift-list">
              {data.snapshot.history.driftRows.map((row) => (
                <article className="history-drift-row" key={row.label}>
                  <div>
                    <strong>{row.label}</strong>
                    <p className="muted">{row.detail}</p>
                  </div>
                  <span className={`status-pill status-pill-${row.tone}`}>{row.value}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
        <div className="history-followup-grid">
          <section className="history-followup-panel">
            <div className="section-header section-header-compact">
              <div>
                <p className="eyebrow">Trend alerts</p>
                <h2>What changed most</h2>
              </div>
            </div>
            <div className="history-alert-list">
              {data.snapshot.history.anomalies.map((anomaly) => (
                <article className={`history-alert-card history-alert-card-${anomaly.tone}`} key={anomaly.title}>
                  <strong>{anomaly.title}</strong>
                  <p className="muted">{anomaly.detail}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="history-followup-panel">
            <div className="section-header section-header-compact">
              <div>
                <p className="eyebrow">Recent snapshots</p>
                <h2>Latest retention window</h2>
              </div>
            </div>
            {data.snapshot.history.recentSnapshots.length > 0 ? (
              <div className="history-snapshot-list">
                {data.snapshot.history.recentSnapshots.map((snapshot) => (
                  <article className="history-snapshot-card" key={snapshot.capturedAt}>
                    <div>
                      <strong>{snapshot.label}</strong>
                      <p className="muted">{snapshot.collectorStatus}</p>
                    </div>
                    <div className="history-snapshot-metrics">
                      <span>CPU {snapshot.cpuLabel}</span>
                      <span>Memory {snapshot.memoryLabel}</span>
                      <span>{snapshot.restartsLabel}</span>
                    </div>
                    <span className={`status-pill status-pill-${snapshot.tone}`}>{snapshot.collectorStatus}</span>
                  </article>
                ))}
              </div>
            ) : (
              <article className="history-empty-state">
                <strong>Recent snapshots</strong>
                <p className="muted">History will appear here as soon as retained snapshots are available.</p>
              </article>
            )}
          </section>
        </div>
      </section>

      <section className="panel efficiency-strip">
        <div className="section-header">
          <div>
            <p className="eyebrow">Efficiency Signals</p>
            <h2>Waste and rightsizing hints</h2>
          </div>
          <div className="hero-chip-row">
            <span className="metric-chip">Cost source</span>
            <span className={`status-pill status-pill-${data.efficiency.costSource === "opencost" ? "healthy" : "warning"}`}>
              {data.efficiency.costSource}
            </span>
            <span className="metric-chip">
              {data.efficiency.costSource === "opencost" ? "OpenCost connected" : "Heuristic only"}
            </span>
          </div>
        </div>
        <p className="muted">{data.efficiency.note}</p>
        <div className="hot-alerts-grid">
          {data.efficiency.signals.map((signal) => (
            <article className={`hot-alert-card hot-alert-card-${signal.tone}`} key={`${signal.title}-${signal.href}`}>
              <span>{signal.title}</span>
              <strong>{signal.value}</strong>
              <p className="muted">{signal.detail}</p>
              <Link className="hero-focus-link" href={signal.href}>
                {signal.actionLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <DashboardExplorer data={data} initialFilters={initialFilters} />
    </main>
  );
}
