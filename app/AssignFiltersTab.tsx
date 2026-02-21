import React, { useEffect, useMemo, useState } from "react";

type Dashboard = { id: number; name: string };
type Widget = { id: number; name: string };
type FilterItem = { id: number; name: string };

type ApiSuccess<T> = { success: true } & T;
type ApiFailure = { success: false; message?: string };
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

type Props = { apiBaseUrl: string };

type Scope =
  | { kind: "dashboard" }
  | { kind: "widget"; widgetId: number };

export default function AssignFiltersTab({ apiBaseUrl }: Props) {
  /* ================= EXISTING STATE & LOGIC (UNCHANGED) ================= */
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | "">("");
  const [scope, setScope] = useState<Scope>({ kind: "dashboard" });
  const [selectedFilterIds, setSelectedFilterIds] = useState<Set<number>>(new Set());

  const [isLoadingDashboards, setIsLoadingDashboards] = useState(false);
  const [isLoadingWidgets, setIsLoadingWidgets] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const selectedDashboard = useMemo(() => {
    if (selectedDashboardId === "") return null;
    return dashboards.find(d => d.id === selectedDashboardId) ?? null;
  }, [dashboards, selectedDashboardId]);

  /* ================= EFFECTS (UNCHANGED) ================= */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingDashboards(true);
      try {
        const res = await fetch(`${apiBaseUrl}/get_dashboards.php`);
        const json: ApiResponse<{ dashboards: Dashboard[] }> = await res.json();
        if (json.success && !cancelled) setDashboards(json.dashboards);
      } finally {
        if (!cancelled) setIsLoadingDashboards(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingFilters(true);
      try {
        const res = await fetch(`${apiBaseUrl}/get_filters.php`);
        const json: ApiResponse<{ filters: FilterItem[] }> = await res.json();
        if (json.success && !cancelled) setFilters(json.filters);
      } finally {
        if (!cancelled) setIsLoadingFilters(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!selectedDashboardId) {
      setWidgets([]);
      setScope({ kind: "dashboard" });
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoadingWidgets(true);
      try {
        const res = await fetch(`${apiBaseUrl}/get_widgets.php?dashboard_id=${selectedDashboardId}`);
        const json: ApiResponse<{ widgets: Widget[] }> = await res.json();
        if (json.success && !cancelled) setWidgets(json.widgets);
      } finally {
        if (!cancelled) setIsLoadingWidgets(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBaseUrl, selectedDashboardId]);

  useEffect(() => {
    if (!selectedDashboardId) {
      setSelectedFilterIds(new Set());
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoadingAssigned(true);
      try {
        const url =
          scope.kind === "dashboard"
            ? `${apiBaseUrl}/get_assigned_filters.php?dashboard_id=${selectedDashboardId}`
            : `${apiBaseUrl}/get_assigned_filters.php?dashboard_id=${selectedDashboardId}&widget_id=${scope.widgetId}`;

        const res = await fetch(url);
        const json: ApiResponse<{ filter_ids: number[] }> = await res.json();
        if (json.success && !cancelled) {
          setSelectedFilterIds(new Set(json.filter_ids.map(Number)));
        }
      } finally {
        if (!cancelled) setIsLoadingAssigned(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBaseUrl, selectedDashboardId, scope]);

  function toggleFilter(id: number) {
    setSelectedFilterIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function saveAssignments() {
    if (!selectedDashboardId) return;
    setIsSaving(true);
    setStatus(null);

    try {
      const payload = {
        dashboardId: selectedDashboardId,
        widgetId: scope.kind === "dashboard" ? null : scope.widgetId,
        filterIds: Array.from(selectedFilterIds),
      };

      const res = await fetch(`${apiBaseUrl}/save_assigned_filters.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<{}> = await res.json();
      if (json.success) setStatus("Assignments saved successfully ✅");
    } finally {
      setIsSaving(false);
    }
  }

  /* ================= ✅ REDESIGNED UI ONLY ================= */
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        <div>
          <h2 className="text-2xl font-semibold">Assign Filters</h2>
          <p className="text-sm text-gray-500">
            Assign filters at dashboard or widget level
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded">{error}</div>}
        {status && <div className="bg-green-50 text-green-700 px-4 py-2 rounded">{status}</div>}

        <div className="grid grid-cols-12 gap-6">

          {/* Left Panel */}
          <div className="col-span-12 md:col-span-4 space-y-4">
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <label className="text-sm font-medium">Dashboard</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedDashboardId}
                onChange={e => {
                  setSelectedDashboardId(Number(e.target.value));
                  setScope({ kind: "dashboard" });
                }}
              >
                <option value="">Select dashboard</option>
                {dashboards.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-white border rounded-lg p-4 space-y-3">
              <label className="text-sm font-medium">Assign For</label>
              <select
                className="w-full border rounded px-3 py-2"
                disabled={!selectedDashboardId}
                value={scope.kind === "dashboard" ? "dashboard" : scope.widgetId}
                onChange={e =>
                  e.target.value === "dashboard"
                    ? setScope({ kind: "dashboard" })
                    : setScope({ kind: "widget", widgetId: Number(e.target.value) })
                }
              >
                <option value="dashboard">Dashboard (All Widgets)</option>
                {widgets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Panel */}
          <div className="col-span-12 md:col-span-8">
            <div className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Available Filters</h3>
                <button
                  onClick={saveAssignments}
                  disabled={isSaving || isLoadingAssigned}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-auto">
                {filters.map(f => {
                  const active = selectedFilterIds.has(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleFilter(f.id)}
                      className={`cursor-pointer border rounded px-4 py-3 flex items-center justify-between
                        ${active ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <span>{f.name}</span>
                      <input type="checkbox" checked={active} readOnly />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}