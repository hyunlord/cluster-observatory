import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams()
}));

describe("/", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("renders the dashboard as the primary landing page", async () => {
    const view = await HomePage({});
    const html = renderToStaticMarkup(view);

    expect(html).toContain("Operations Overview");
    expect(html).toContain("Cluster Pressure");
    expect(html).toContain("Top Consumers");
    expect(html).toContain("Capacity Compare");
    expect(html).toContain("Workload Analysis");
    expect(html).toContain("Node Utilization");
    expect(html).toContain("Namespace Activity");
    expect(html).not.toContain("Run detail");
  });
});
