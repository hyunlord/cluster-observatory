import { describe, expect, it } from "vitest";
import { filtersFromSearchParams, filtersToQueryString } from "./dashboard-query";

describe("dashboard-query", () => {
  it("reads filter state from URL search params", () => {
    const filters = filtersFromSearchParams(
      new URLSearchParams("namespace=application&node=demo-app-pool-b&search=api")
    );

    expect(filters).toEqual({
      namespace: "application",
      node: "demo-app-pool-b",
      search: "api"
    });
  });

  it("writes compact query strings without empty filter values", () => {
    const query = filtersToQueryString({
      namespace: "application",
      node: "",
      search: "api"
    });

    expect(query).toBe("namespace=application&search=api");
  });
});
