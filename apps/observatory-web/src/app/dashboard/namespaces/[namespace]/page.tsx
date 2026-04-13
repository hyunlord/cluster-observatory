import React from "react";
import { filtersFromSearchParams } from "../../../../lib/dashboard-query";
import { getGkeDashboardData } from "../../../../lib/gke-dashboard";
import { buildNamespaceDetailView } from "../../../../lib/gke-dashboard-view";
import { NamespaceDetailPanel } from "../../namespace-detail-panel";

interface NamespaceDetailPageProps {
  params?: Promise<{
    namespace: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NamespaceDetailPage(props: NamespaceDetailPageProps) {
  const data = await getGkeDashboardData(process.cwd());
  const params = props?.params ? await props.params : undefined;
  const searchParams = props?.searchParams ? await props.searchParams : {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      query.set(key, value);
    }
  }
  const dashboardFilters = filtersFromSearchParams(query);
  const namespaceName = decodeURIComponent(params?.namespace ?? "");
  const detail = buildNamespaceDetailView(data, namespaceName);
  const title = detail?.namespace.name ?? (namespaceName || "Namespace not found");

  return (
    <main className="console-shell detail-shell">
      <header className="panel detail-hero">
        <div>
          <p className="eyebrow">Namespace Overview</p>
          <h1>{title}</h1>
          <p className="lede">
            Track namespace blast radius through top workloads, involved nodes, recent events, and current resource load.
          </p>
        </div>
        {detail ? (
          <div className="detail-hero-meta">
            <span className={`status-pill status-pill-${detail.summary.healthTone}`}>{detail.summary.statusLabel}</span>
          </div>
        ) : null}
      </header>

      <NamespaceDetailPanel detail={detail} snapshot={data.snapshot} dashboardFilters={dashboardFilters} />
    </main>
  );
}
