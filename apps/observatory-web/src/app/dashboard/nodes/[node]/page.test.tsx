import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NodeDetailPage from "./page";

describe("/dashboard/nodes/[node]", () => {
  it("renders a dedicated node operations page with hosted workloads, pod health, and node hotspots", async () => {
    const view = await NodeDetailPage({
      params: Promise.resolve({
        node: "demo-app-pool-b"
      })
    });
    const html = renderToStaticMarkup(view);

    expect(html).toContain("Node Overview");
    expect(html).toContain("Back to dashboard");
    expect(html).toContain("demo-app-pool-b");
    expect(html).toContain("3/5 ready");
    expect(html).toContain("5 total restarts");
    expect(html).toContain("Hosted workloads");
    expect(html).toContain("Pods on node");
    expect(html).toContain("Hot pod");
    expect(html).toContain("Node conditions");
    expect(html).toContain("MemoryPressure");
    expect(html).toContain("Node taints");
    expect(html).toContain("workload=application");
    expect(html).toContain("Recent node events");
    expect(html).toContain("NodeHasInsufficientMemory");
    expect(html).toContain("api-gateway-2");
    expect(html).toContain("api-gateway");
    expect(html).toContain("auth-service");
    expect(html).toContain("application");
    expect(html).toContain("Quick actions");
    expect(html).toContain("Focus node on dashboard");
    expect(html).toContain("Open dominant workload");
    expect(html).toContain("Node risk summary");
    expect(html).toContain("Operator actions");
    expect(html).toContain("Inspect with kubectl describe node");
    expect(html).toContain("Open namespace blast radius");
  });
});
