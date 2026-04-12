import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NamespaceDetailPage from "./page";

describe("/dashboard/namespaces/[namespace]", () => {
  it("renders a dedicated namespace operations page with top workloads, recent events, and involved nodes", async () => {
    const view = await NamespaceDetailPage({
      params: Promise.resolve({
        namespace: "application"
      })
    });
    const html = renderToStaticMarkup(view);

    expect(html).toContain("Namespace Overview");
    expect(html).toContain("Back to dashboard");
    expect(html).toContain("application");
    expect(html).toContain("Top workloads");
    expect(html).toContain("Recent namespace events");
    expect(html).toContain("Involved nodes");
    expect(html).toContain("api-gateway");
    expect(html).toContain("auth-service");
    expect(html).toContain("demo-app-pool-b");
    expect(html).toContain("Restart hot pods");
    expect(html).toContain("Efficiency posture");
    expect(html).toContain("Idle allocation estimate");
    expect(html).toContain("Over-requested workloads");
    expect(html).toContain("Cost source");
    expect(html).toContain("Open top workload");
    expect(html).toContain("Open busiest node");
    expect(html).toContain("Snapshot trust");
    expect(html).toContain("High confidence");
    expect(html).toContain("Full coverage");
  });
});
