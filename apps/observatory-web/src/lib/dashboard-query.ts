import type { DashboardFilters } from "./gke-dashboard-view";

const DASHBOARD_VIEWS = new Set<DashboardFilters["view"]>(["overview", "capacity", "incidents", "cost"]);
const DASHBOARD_DENSITIES = new Set<DashboardFilters["density"]>(["comfortable", "dense"]);

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  namespace: "",
  node: "",
  search: "",
  view: "overview",
  density: "comfortable"
};

export function normalizeDashboardFilters(filters: Partial<DashboardFilters>): DashboardFilters {
  return {
    ...DEFAULT_DASHBOARD_FILTERS,
    ...filters
  };
}

export function filtersFromSearchParams(searchParams: URLSearchParams): DashboardFilters {
  const view = searchParams.get("view");
  const density = searchParams.get("density");

  return normalizeDashboardFilters({
    namespace: searchParams.get("namespace") ?? "",
    node: searchParams.get("node") ?? "",
    search: searchParams.get("search") ?? "",
    view: view && DASHBOARD_VIEWS.has(view as DashboardFilters["view"]) ? (view as DashboardFilters["view"]) : "overview",
    density:
      density && DASHBOARD_DENSITIES.has(density as DashboardFilters["density"])
        ? (density as DashboardFilters["density"])
        : "comfortable"
  });
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

  if (filters.view !== "overview") {
    searchParams.set("view", filters.view);
  }

  if (filters.density !== "comfortable") {
    searchParams.set("density", filters.density);
  }

  return searchParams.toString();
}

export function buildDashboardHref(filters: DashboardFilters): string {
  const query = filtersToQueryString(filters);
  return query ? `/dashboard?${query}` : "/dashboard";
}

export function buildDetailHref(path: string, filters: DashboardFilters): string {
  const query = filtersToQueryString(filters);
  return query ? `${path}?${query}` : path;
}
