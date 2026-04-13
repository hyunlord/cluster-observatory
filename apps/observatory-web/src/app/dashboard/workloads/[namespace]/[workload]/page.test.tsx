import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WorkloadDetailPage from "./page";

describe("/dashboard/workloads/[namespace]/[workload]", () => {
  it("renders a dedicated workload operations page with alerts, pod health, and node spread", async () => {
    const view = await WorkloadDetailPage({
      params: Promise.resolve({
        namespace: "application",
        workload: "api-gateway"
      })
    });
    const html = renderToStaticMarkup(view);

    expect(html).toContain("Workload Overview");
    expect(html).toContain("Back to dashboard");
    expect(html).toContain("api-gateway");
    expect(html).toContain("2/3 ready");
    expect(html).toContain("5 total restarts");
    expect(html).toContain("Readiness drift");
    expect(html).toContain("Restart activity");
    expect(html).toContain("CrashLoopBackOff");
    expect(html).toContain("Hot pod");
    expect(html).toContain("api-gateway-2");
    expect(html).toContain("Container health");
    expect(html).toContain("CrashLoopBackOff · 4 restarts");
    expect(html).toContain("Node spread");
    expect(html).toContain("Pods by node");
    expect(html).toContain("1 needs attention");
    expect(html).toContain("Pod health");
    expect(html).toContain("Recent workload events");
    expect(html).toContain("CrashLoopBackOff");
    expect(html).toContain("Log actions");
    expect(html).toContain("Inspect logs with kubectl");
    expect(html).toContain("Quick actions");
    expect(html).toContain("Focus namespace");
    expect(html).toContain("Open primary node");
    expect(html).toContain("Open namespace detail");
    expect(html).toContain("Rightsizing hint");
    expect(html).toContain("Observe");
    expect(html).toContain("Estimated efficiency signal");
    expect(html).toContain("Cost source");
    expect(html).toContain("Priority score");
    expect(html).toContain("Estimated monthly footprint");
    expect(html).toContain("Awaiting OpenCost feed");
    expect(html).toContain("Snapshot trust");
    expect(html).toContain("High confidence");
    expect(html).toContain("Full coverage");
  });

  it("preserves dashboard view state in workload detail navigation", async () => {
    const view = await WorkloadDetailPage({
      params: Promise.resolve({
        namespace: "application",
        workload: "api-gateway"
      }),
      searchParams: Promise.resolve({
        namespace: "application",
        search: "api-gateway",
        view: "cost",
        density: "dense"
      })
    });
    const html = renderToStaticMarkup(view);

    expect(html).toContain("/dashboard?namespace=application&amp;search=api-gateway&amp;view=cost&amp;density=dense");
    expect(html).toContain("/dashboard/namespaces/application?namespace=application&amp;search=api-gateway&amp;view=cost&amp;density=dense");
    expect(html).toContain("/dashboard/nodes/demo-app-pool-b?namespace=application&amp;search=api-gateway&amp;view=cost&amp;density=dense");
  });
});
