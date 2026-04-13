import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams()
}));

describe("/dashboard", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("renders Phase 3 exploration controls with filters, node occupancy, and workload detail guidance", async () => {
    const view = await DashboardPage({});
    const html = renderToStaticMarkup(view);

    expect(html).toContain("Operations Overview");
    expect(html).toContain("Preset view");
    expect(html).toContain("Density");
    expect(html).toContain("Copy link");
    expect(html).toContain("Overview");
    expect(html).toContain("Dense");
    expect(html).toContain("Live footprint");
    expect(html).toContain("Hot Alerts");
    expect(html).toContain("Recent Trend");
    expect(html).toContain("Recent Drift");
    expect(html).toContain("Recent snapshots");
    expect(html).toContain("History warming up");
    expect(html).toContain("Efficiency Signals");
    expect(html).toContain("Cost source");
    expect(html).toContain("Monthly cluster cost");
    expect(html).toContain("Idle monthly cost");
    expect(html).toContain("Shared monthly cost");
    expect(html).toContain("Top priority");
    expect(html).toContain("Most over-requested workload");
    expect(html).toContain("Highest idle allocation namespace");
    expect(html).toContain("Top rightsizing candidate");
    expect(html).toContain("Heuristic only");
    expect(html).toContain("Cost feed status");
    expect(html).toContain("Awaiting OpenCost feed");
    expect(html).toContain("Snapshot status");
    expect(html).toContain("Collector confidence");
    expect(html).toContain("Missing sources");
    expect(html).toContain("Affected areas");
    expect(html).toContain("Hot namespace");
    expect(html).toContain("Busiest node");
    expect(html).toContain("Top workload");
    expect(html).toContain("Inspect snapshot status");
    expect(html).toContain("Filter to namespace");
    expect(html).toContain("Open namespace detail");
    expect(html).toContain("Open node detail");
    expect(html).toContain("Open workload detail");
    expect(html).toContain("Auto-refresh");
    expect(html).toContain("Refresh now");
    expect(html).toContain("Batch status");
    expect(html).toContain("Manual snapshot mode");
    expect(html).toContain("Last success");
    expect(html).toContain("Consecutive failures");
    expect(html).toContain("Filter workload pressure");
    expect(html).toContain("Namespace");
    expect(html).toContain("Node");
    expect(html).toContain("Search workloads");
    expect(html).toContain("Cluster Pressure");
    expect(html).toContain("Top Consumers");
    expect(html).toContain("Capacity Compare");
    expect(html).toContain("Workload Analysis");
    expect(html).toContain("Workload Detail");
    expect(html).toContain("Select a workload");
    expect(html).toContain("Node Occupancy");
    expect(html).toContain("Freshness");
    expect(html).toContain("Node Utilization");
    expect(html).toContain("Namespace Activity");
    expect(html).toContain("Source provider");
  });

  it("applies preset and density state from the URL to the rendered dashboard", async () => {
    const view = await DashboardPage({
      searchParams: Promise.resolve({
        view: "capacity",
        density: "dense"
      })
    });
    const html = renderToStaticMarkup(view);

    expect(html).toContain("dashboard-density-dense");
    expect(html).toContain("dashboard-view-capacity");
    expect(html.indexOf("Usage vs. Reservations")).toBeLessThan(html.indexOf("Resource heavyweights"));
  });

  it("renders mobile card labels for compressed workload and node tables", async () => {
    const view = await DashboardPage({});
    const html = renderToStaticMarkup(view);

    expect(html).toContain("mobile-field-label");
    expect(html).toContain("Workload name");
    expect(html).toContain("Namespace scope");
    expect(html).toContain("CPU posture");
    expect(html).toContain("Node name");
    expect(html).toContain("Node status");
  });
});
