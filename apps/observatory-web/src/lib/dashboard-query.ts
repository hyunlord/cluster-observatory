import type { DashboardFilters } from "./gke-dashboard-view";

export function filtersFromSearchParams(searchParams: URLSearchParams): DashboardFilters {
  return {
    namespace: searchParams.get("namespace") ?? "",
    node: searchParams.get("node") ?? "",
    search: searchParams.get("search") ?? ""
  };
}

export function filtersToQueryString(filters: DashboardFilters): string {
  const searchParams = new URLSearchParams();

  if (filters.namespace) {
    searchParams.set("namespace", filters.namespace);
  }

  if (filters.node) {
    searchParams.set("node", filters.node);
  }

  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  return searchParams.toString();
}
