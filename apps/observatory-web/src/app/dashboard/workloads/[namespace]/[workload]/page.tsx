import Link from "next/link";
import React from "react";
import { filtersFromSearchParams } from "../../../../../lib/dashboard-query";
import { getGkeDashboardData } from "../../../../../lib/gke-dashboard";
import { buildDashboardView } from "../../../../../lib/gke-dashboard-view";
import { WorkloadDetailPanel } from "../../../workload-detail-panel";

interface WorkloadDetailPageProps {
  params?: Promise<{
    namespace: string;
    workload: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function WorkloadDetailPage(props: WorkloadDetailPageProps) {
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
  const namespace = decodeURIComponent(params?.namespace ?? "");
  const workload = decodeURIComponent(params?.workload ?? "");
  const workloadId = namespace && workload ? `${namespace}/${workload}` : undefined;
  const view = buildDashboardView(
    data,
    { namespace: "", node: "", search: "", view: "overview", density: "comfortable" },
    workloadId
  );

  if (!view.selectedWorkload) {
    return (
      <main className="console-shell detail-shell">
        <section className="panel detail-empty-state">
          <p className="eyebrow">Workload Overview</p>
          <h1>Workload not found</h1>
          <p className="muted">The requested workload could not be resolved from the current snapshot.</p>
          <Link className="control-pill detail-nav-link" href="/dashboard">
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="console-shell detail-shell">
      <header className="panel detail-hero">
        <div>
          <p className="eyebrow">Workload Overview</p>
          <h1>{view.selectedWorkload.workload.name}</h1>
          <p className="lede">
            Follow workload pressure from readiness and restart behavior down to pod placement and request posture.
          </p>
        </div>
        <div className="detail-hero-meta">
          <span className={`status-pill status-pill-${view.selectedWorkload.summary.healthTone}`}>
            {view.selectedWorkload.summary.statusLabel}
          </span>
          <Link className="control-pill detail-nav-link" href={`/dashboard?namespace=${encodeURIComponent(view.selectedWorkload.workload.namespace)}&search=${encodeURIComponent(view.selectedWorkload.workload.name)}`}>
            Back to dashboard
          </Link>
        </div>
      </header>

      <WorkloadDetailPanel
        detail={view.selectedWorkload}
        mode="page"
        snapshot={data.snapshot}
        dashboardFilters={dashboardFilters}
      />
    </main>
  );
}
