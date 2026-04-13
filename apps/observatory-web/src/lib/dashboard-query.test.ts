import { describe, expect, it } from "vitest";
import { filtersFromSearchParams, filtersToQueryString } from "./dashboard-query";

describe("dashboard-query", () => {
  it("reads filter state from URL search params", () => {
    const filters = filtersFromSearchParams(
      new URLSearchParams("namespace=application&node=demo-app-pool-b&search=api&view=cost&density=dense")
    );

    expect(filters).toEqual({
      namespace: "application",
      node: "demo-app-pool-b",
      search: "api",
      view: "cost",
      density: "dense"
    });
  });

  it("writes compact query strings without empty filter values", () => {
    const query = filtersToQueryString({
      namespace: "application",
      node: "",
      search: "api",
      view: "incidents",
      density: "dense"
    });

    expect(query).toBe("namespace=application&search=api&view=incidents&density=dense");
  });
});
