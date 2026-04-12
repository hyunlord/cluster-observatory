import React from "react";
import { getGkeDashboardData } from "../../../../lib/gke-dashboard";
import { buildNodeDetailView } from "../../../../lib/gke-dashboard-view";
import { NodeDetailPanel } from "../../node-detail-panel";

interface NodeDetailPageProps {
  params?: Promise<{
    node: string;
  }>;
}

export default async function NodeDetailPage(props: NodeDetailPageProps) {
  const data = await getGkeDashboardData(process.cwd());
  const params = props?.params ? await props.params : undefined;
  const nodeName = decodeURIComponent(params?.node ?? "");
  const detail = buildNodeDetailView(data, nodeName);
  const title = detail?.node.name ?? (nodeName || "Node not found");

  return (
    <main className="console-shell detail-shell">
      <header className="panel detail-hero">
        <div>
          <p className="eyebrow">Node Overview</p>
          <h1>{title}</h1>
          <p className="lede">
            Follow node pressure from allocatable saturation into hosted workloads, pod health, and local restart risk.
          </p>
        </div>
        {detail ? (
          <div className="detail-hero-meta">
            <span className={`status-pill status-pill-${detail.summary.healthTone}`}>{detail.summary.statusLabel}</span>
          </div>
        ) : null}
      </header>

      <NodeDetailPanel detail={detail} />
    </main>
  );
}
