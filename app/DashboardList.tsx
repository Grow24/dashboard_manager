import React, { useEffect, useRef, useState } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  WidgetComponent as SharedWidgetRenderer,
  normalizeApiResponse as normalizeSharedApiResponse,
  normalizeTableResponse as normalizeSharedTableResponse,
  normalizeTextResponse as normalizeSharedTextResponse,
} from './DashboardManager';

/* -------------------- Shared Types (same as DashboardManager) -------------------- */

type DashboardType = 'BASIC' | 'STANDARD';
type VisualType = 'KPI' | 'CHART' | 'TABLE' | 'TEXT' | 'CUSTOM';
type ChartType = 'BAR' | 'PIE' | 'LINE';
type SourceType = 'API' | 'SQL' | 'STATIC';
type HttpMethod = 'GET' | 'POST';

interface Dashboard {
  id: number;
  name: string;
  description?: string;
  type: DashboardType;
  tab_name?: string;
  is_default?: boolean;
  owner_user_id?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Widget {
  id?: number;
  dashboard_id: number;
  tabname?: string | null;
  title?: string;
  visual_type: VisualType;
  chart_type?: ChartType;
  position_row: number;
  position_col: number;
  row_span: number;
  col_span: number;
  background_color?: string;
  config_json?: Record<string, any> | null;
  data_source_id?: number | null;
  refresh_interval_sec?: number | null;
  is_visible?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

interface DataSource {
  id?: number;
  name: string;
  code?: string;
  source_type: SourceType;
  endpoint_url?: string;
  http_method?: HttpMethod;
  request_headers_json?: any;
  request_query_params_json?: any;
  request_body_json?: any | null;
  request_body_template_json?: any;
  response_mapping_json?: any;
  is_cached?: boolean;
  cache_ttl_sec?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface FilterItem {
  id: number;
  name: string;
  is_active?: boolean;
}

/* -------------------- API Helper (same base as DashboardManager) -------------------- */

const API_BASE = 'https://intelligentsalesman.com/ism1/API/dashboard_manager/api/index.php';

function buildApiUrl(path: string) {
  const cleaned = path.replace(/^\//, '');
  const [resourcePart, queryPart] = cleaned.split('?');
  let url = `${API_BASE}?resource=${encodeURIComponent(resourcePart)}`;
  if (queryPart && queryPart.trim() !== '') {
    url += `&${queryPart}`;
  }
  return url;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = buildApiUrl(path);
  const method = (options.method || 'GET').toUpperCase();
  const baseHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...((options && options.headers) ? (options.headers as any) : {}),
  };

  if (options.body && !(options.headers && (options.headers as any)['Content-Type'])) {
    baseHeaders['Content-Type'] = 'application/json';
  }

  const fetchOpts: RequestInit = {
    method,
    mode: 'cors',
    credentials: 'same-origin',
    headers: baseHeaders,
  };

  if (options.body && method !== 'GET' && method !== 'HEAD') {
    fetchOpts.body = options.body;
  }

  const res = await fetch(url, fetchOpts);
  const text = await res.text();

  if (!res.ok) {
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    throw new Error(parsed?.error || parsed?.message || `${res.status} ${res.statusText} - ${text}`);
  }

  if (!text) {
    // @ts-ignore
    return null;
  }

  const data = JSON.parse(text);
  return data as T;
}

/* -------------------- Normalization Utilities (copied from Manager) -------------------- */

type NormalizedKPI = {
  kind: 'kpi';
  value?: number | string;
  unit?: string;
  trend?: number | string;
  trend_direction?: 'up' | 'down' | 'flat';
  previous?: number | null;
  description?: string;
  metrics?: Record<string, number | string>;
  raw?: any;
};
type NormalizedChart = {
  kind: 'chart';
  data: { label: string; value: number }[];
  max?: number;
  raw?: any;
};
type NormalizedTable = {
  kind: 'table';
  columns: string[];
  rows: any[];
  raw?: any;
};
type NormalizedResponse =
  | NormalizedKPI
  | NormalizedChart
  | NormalizedTable
  | { kind: 'raw'; raw: any }
  | { kind: 'text'; text: string; raw?: any };

function inferPanelFormat(visualType?: VisualType, configJson?: Record<string, any> | null): string {
  const vt = (visualType ?? 'CHART') as VisualType;
  if (vt === 'MAP' || vt === 'CHART') return vt;
  const variant = String(configJson?.panel_variant ?? '').trim().toUpperCase();
  if (variant) return variant;
  return vt as string;
}

function normalizeApiResponse(raw: any): NormalizedResponse {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    if ('value' in raw || 'trend' in raw || 'metrics' in raw) {
      const kpi: NormalizedKPI = {
        kind: 'kpi',
        value: raw.value ?? (raw.metrics ? Object.values(raw.metrics)[0] : undefined),
        unit: raw.unit ?? undefined,
        trend: raw.trend ?? undefined,
        trend_direction:
          raw.trend_direction ??
          (typeof raw.trend === 'number'
            ? raw.trend > 0
              ? 'up'
              : raw.trend < 0
              ? 'down'
              : 'flat'
            : undefined),
        previous: raw.previous ?? null,
        description: raw.description ?? undefined,
        metrics: raw.metrics ?? undefined,
        raw,
      };
      return kpi;
    }

    if (Array.isArray(raw.data) && raw.data.length > 0) {
      const data = raw.data.map((d: any) => {
        if (typeof d === 'object')
          return {
            label: d.label ?? d.name ?? d.key ?? String(d.x ?? ''),
            value: Number(d.value ?? d.y ?? 0),
          };
        return { label: String(d[0] ?? ''), value: Number(d[1] ?? 0) };
      });
      return { kind: 'chart', data, max: raw.max ?? undefined, raw };
    }

    if (Array.isArray(raw.rows) && Array.isArray(raw.columns)) {
      return { kind: 'table', columns: raw.columns, rows: raw.rows, raw };
    }

    const numericProps = Object.keys(raw).filter((k) => typeof raw[k] === 'number');
    if (numericProps.length === 1) {
      return { kind: 'kpi', value: raw[numericProps[0]], raw };
    }

    if (typeof raw.text === 'string') {
      return { kind: 'text', text: raw.text, raw };
    }

    return { kind: 'raw', raw };
  }

  if (Array.isArray(raw)) {
    if (raw.length > 0 && typeof raw[0] === 'object') {
      const sample = raw[0] as any;
      const hasChartShape =
        'label' in sample ||
        'name' in sample ||
        'x' in sample ||
        'value' in sample ||
        'y' in sample ||
        'count' in sample ||
        'total' in sample;

      if (hasChartShape) {
        const data = raw.map((item: any, index: number) => {
          const label = item.label ?? item.name ?? item.id ?? item.key ?? String(item.x ?? `Item ${index + 1}`);
          const value = Number(item.value ?? item.y ?? item.count ?? item.total ?? 0);
          return { ...item, label: String(label), value: Number.isFinite(value) ? value : 0 };
        });
        return { kind: 'chart', data, max: undefined, raw };
      }

      const columns = Object.keys(raw[0]);
      return { kind: 'table', columns, rows: raw, raw };
    }

    if (raw.length > 0 && (typeof raw[0] === 'string' || typeof raw[0] === 'number')) {
      return {
        kind: 'table',
        columns: ['value'],
        rows: raw.map((r) => ({ value: r })),
        raw,
      };
    }

    const data = raw.map((item: any, index: number) => {
      if (typeof item === 'object') {
        const label = item.label ?? item.name ?? item.id ?? item.key ?? '';
        const value = Number(item.value ?? item.count ?? item.total ?? 0);
        return { label: String(label), value };
      }
      return { label: `Item ${index}`, value: Number(item) };
    });
    return { kind: 'chart', data, max: undefined, raw };
  }

  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return { kind: 'kpi', value: raw, raw };
  }

  return { kind: 'raw', raw };
}

/* -------------------- Minimal KPI and Widget UI (copied & slightly trimmed) -------------------- */

const KPIView: React.FC<{ k: NormalizedKPI }> = ({ k }) => {
  const valueDisplay = k.value ?? '-';
  const trend = k.trend;
  let trendNumber: number | null = null;
  if (typeof trend === 'number') trendNumber = trend;
  else if (typeof trend === 'string') {
    const parsed = Number(String(trend).replace(/[^\d.-]/g, ''));
    if (!isNaN(parsed)) trendNumber = parsed;
  }
  let dir = k.trend_direction;
  if (!dir && trendNumber !== null)
    dir = trendNumber > 0 ? 'up' : trendNumber < 0 ? 'down' : 'flat';

  const trendColor =
    dir === 'up' ? 'text-green-600' : dir === 'down' ? 'text-red-600' : 'text-gray-500';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–';

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-3">
        <div className="text-3xl font-bold">
          {valueDisplay}
          {k.unit ? ` ${k.unit}` : ''}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center ${trendColor} text-sm`}>
            {arrow}
            <span className="ml-1">{String(trend)}</span>
          </div>
        )}
      </div>
      {k.description && <div className="text-xs text-gray-500 mt-1">{k.description}</div>}
    </div>
  );
};

const WidgetComponent: React.FC<{
  widget: Widget;
  dataSource?: DataSource;
  apiData?: any;
  isLoading?: boolean;
  error?: string;
}> = ({ widget, dataSource, apiData, isLoading, error }) => {
  const cfg = widget.config_json || {};
  const normalized: NormalizedResponse | null =
    apiData?.normalized ?? (apiData ? normalizeApiResponse(apiData) : null);
  const panelVariant = inferPanelFormat(widget.visual_type, cfg);

  const renderTrend = (trend?: number | string, trend_direction?: 'up' | 'down' | 'flat') => {
    if (trend === undefined || trend === null) return null;
    let trendNumber: number | null = null;
    if (typeof trend === 'number') trendNumber = trend;
    else if (typeof trend === 'string') {
      const parsed = Number(String(trend).replace(/[^\d.-]/g, ''));
      if (!isNaN(parsed)) trendNumber = parsed;
    }
    let dir = trend_direction;
    if (!dir && trendNumber !== null) dir = trendNumber > 0 ? 'up' : trendNumber < 0 ? 'down' : 'flat';
    const trendColor = dir === 'up' ? 'text-green-600' : dir === 'down' ? 'text-red-600' : 'text-gray-500';
    const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–';
    return (
      <div className={`flex items-center ${trendColor} text-sm ml-2`}>
        {arrow} <span className="ml-1">{String(trend)}</span>
      </div>
    );
  };

  const renderWidgetContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4">
          <h4 className="text-lg font-semibold">{widget.title}</h4>
          <div className="mt-2 text-red-600 text-sm">Error: {error}</div>
        </div>
      );
    }

    // KPI + KPI variants (Gauge/Progress)
    if (widget.visual_type === 'KPI') {
      if (panelVariant === 'GAUGE' || panelVariant === 'PROGRESS') {
        const raw = Number((normalized && normalized.kind === 'kpi' ? normalized.value : undefined) ?? apiData?.value ?? cfg.value ?? 0);
        const percent = Math.max(0, Math.min(100, raw));
        if (panelVariant === 'GAUGE') {
          return (
            <div className="p-4">
              <h4 className="text-lg font-semibold">{widget.title}</h4>
              <div className="mt-4 flex justify-center">
                <div className="relative w-28 h-28 rounded-full" style={{ background: `conic-gradient(#2563eb ${percent * 3.6}deg, #e5e7eb 0deg)` }}>
                  <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center text-lg font-bold text-slate-700">
                    {percent}%
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="p-4">
            <h4 className="text-lg font-semibold">{widget.title}</h4>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>Progress</span>
                <span>{percent}%</span>
              </div>
              <div className="h-3 rounded bg-slate-100 overflow-hidden">
                <div className="h-full bg-blue-600 rounded transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>
          </div>
        );
      }

      if (normalized && normalized.kind === 'kpi') {
        return (
          <div className="p-4">
            <div className="flex items-center mb-2">
              <h4 className="text-lg font-semibold">{widget.title}</h4>
              {renderTrend(normalized.trend, normalized.trend_direction)}
            </div>
            <KPIView k={normalized} />
          </div>
        );
      }
      return (
        <div className="p-4">
          <div className="flex items-center mb-2">
            <h4 className="text-lg font-semibold">{widget.title}</h4>
            {renderTrend(apiData?.trend ?? cfg.trend, apiData?.trend_direction ?? cfg.trend_direction)}
          </div>
          <div className="text-3xl font-bold">{cfg.value ?? '-'}</div>
        </div>
      );
    }

    // CHART
    if (widget.visual_type === 'CHART') {
      const chart =
        normalized && normalized.kind === 'chart'
          ? normalized
          : apiData?.normalized?.kind === 'chart'
          ? apiData.normalized
          : null;
      const chartData = chart ? chart.data : apiData?.data ?? cfg.data ?? [];

      if (!chartData || chartData.length === 0) {
        return (
          <div className="p-4">
            <h4 className="text-lg font-semibold mb-2">{widget.title}</h4>
            <div className="text-gray-500 text-sm">No data</div>
          </div>
        );
      }

      const maxValue =
        (chart && chart.max) ??
        apiData?.max ??
        cfg.max ??
        Math.max(...chartData.map((d: any) => Number(d.value || 0)));

      return (
        <div className="p-4">
          <h4 className="text-lg font-semibold mb-3">{widget.title}</h4>
          <div className="space-y-2">
            {chartData.map((item: any, i: number) => {
              const v = Math.max(0, Number(item.value || 0));
              const pct = maxValue ? Math.max(1, (v / maxValue) * 100) : 0;
              return (
                <div key={i} className="grid grid-cols-[120px_1fr_64px] items-center gap-2">
                  <span className="text-[11px] text-slate-600 truncate">{String(item.label)}</span>
                  <div className="h-2 rounded bg-slate-100 overflow-hidden">
                    <div className="h-full rounded bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-500 text-right">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // TABLE (very simple)
    if (widget.visual_type === 'TABLE') {
      const t =
        normalized && normalized.kind === 'table'
          ? normalized
          : apiData?.normalized?.kind === 'table'
          ? apiData.normalized
          : null;
      const columns = t ? t.columns : apiData?.columns ?? cfg.columns ?? [];
      const rows = t ? t.rows : apiData?.rows ?? cfg.rows ?? [];

      return (
        <div className="p-4">
          <h4 className="text-lg font-semibold mb-2">{widget.title}</h4>
          {rows.length === 0 ? (
            <div className="text-gray-500 text-sm">No data</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    {columns.map((c: string) => (
                      <th key={c} className="px-2 py-1 border-b text-left font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any, idx: number) => (
                    <tr key={idx}>
                      {columns.map((c: string) => (
                        <td key={c} className="px-2 py-1 border-b">
                          {r[c] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    // TEXT
    if (widget.visual_type === 'TEXT') {
      const txt =
        (normalized && normalized.kind === 'text' && normalized.text) ||
        apiData?.text ||
        cfg.text ||
        '';
      return (
        <div className="p-4">
          <h4 className="text-lg font-semibold mb-2">{widget.title}</h4>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{txt || 'No text'}</div>
        </div>
      );
    }

    // Default / CUSTOM
    return (
      <div className="p-4">
        <h4 className="text-lg font-semibold mb-2">{widget.title}</h4>
        <div className="text-sm text-gray-700">
          {widget.visual_type} widget – custom rendering not implemented here.
        </div>
      </div>
    );
  };

  return (
    <div
      className="rounded-lg shadow overflow-hidden h-full bg-white"
      style={{ backgroundColor: widget.background_color || 'white' }}
    >
      {renderWidgetContent()}
      {dataSource && (
        <div className="px-3 py-1 border-t text-[10px] text-gray-500 bg-gray-50">
          Source: {dataSource.name}
        </div>
      )}
    </div>
  );
};

/* -------------------- DashboardList using DashboardManager visuals -------------------- */

const DashboardList: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [layout, setLayout] = useState<any[]>([]);
  const [widgetApiData, setWidgetApiData] = useState<Record<number, any>>({});
  const [widgetLoadingState, setWidgetLoadingState] = useState<Record<number, boolean>>({});
  const [widgetErrors, setWidgetErrors] = useState<Record<number, string>>({});
  const [loadingDashboards, setLoadingDashboards] = useState<boolean>(false);
  const [loadingWidgets, setLoadingWidgets] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isListOpen, setIsListOpen] = useState<boolean>(true);
  const [activeWidgetTabName, setActiveWidgetTabName] = useState<string>('');
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState<number>(1200);
  const [allFilters, setAllFilters] = useState<FilterItem[]>([]);
  const [dashboardAssignedFilterIds, setDashboardAssignedFilterIds] = useState<number[]>([]);
  const [widgetAssignedFilterMap, setWidgetAssignedFilterMap] = useState<Record<number, number[]>>({});
  const [selectedFilterIds, setSelectedFilterIds] = useState<number[]>([]);
  const [filterUiStatus, setFilterUiStatus] = useState<string>('');

  const tabNameOptions = Array.from(
    new Set(
      String(selectedDashboard?.tab_name ?? '')
        .split(',')
        .map((tab) => tab.trim())
        .filter(Boolean)
    )
  );

  const getWidgetTabName = (w: Widget) =>
    (w.tabname || (w.config_json?.tab_name as string) || '').trim();

  const visibleWidgetsForActiveTab =
    activeWidgetTabName
      ? widgets.filter((w) => getWidgetTabName(w) === activeWidgetTabName)
      : widgets;
  const widgetLevelAssignedIds = Array.from(
    new Set(Object.values(widgetAssignedFilterMap).flat().map((id) => Number(id)).filter((id) => Number.isFinite(id)))
  );
  const combinedAssignedFilterIds = Array.from(
    new Set([...dashboardAssignedFilterIds, ...widgetLevelAssignedIds].map((id) => Number(id)).filter((id) => Number.isFinite(id)))
  );
  const assignedFiltersForDashboard = allFilters.filter((f) => combinedAssignedFilterIds.includes(Number(f.id)));

  // Load dashboards once
  useEffect(() => {
    async function loadDashboards() {
      setLoadingDashboards(true);
      setError(null);
      try {
        const data = await apiFetch<Dashboard[]>('/dashboards');
        setDashboards(data || []);
        if (data && data.length > 0) {
          setSelectedDashboard(data[0]);
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to load dashboards');
      } finally {
        setLoadingDashboards(false);
      }
    }
    loadDashboards();
  }, []);

  // Load data sources once
  useEffect(() => {
    async function loadDataSources() {
      try {
        const data = await apiFetch<DataSource[]>('/datasources');
        setDataSources(data || []);
      } catch (e) {
        console.error('Failed to load data sources', e);
      }
    }
    loadDataSources();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadFilters() {
      try {
        const res = await fetch('https://intelligentsalesman.com/ism1/API/get_filters.php');
        const data = await res.json();
        const rawFilters = Array.isArray(data?.filters) ? data.filters : [];
        const normalized: FilterItem[] = rawFilters
          .map((f: any) => ({
            id: Number(f.id),
            name: String(f.name ?? f.filter_name ?? `Filter ${f.id}`),
            is_active: f.is_active === undefined ? true : Boolean(Number(f.is_active)),
          }))
          .filter((f: FilterItem) => Number.isFinite(f.id));
        if (!cancelled) setAllFilters(normalized.filter((f) => f.is_active !== false));
      } catch (e) {
        console.error('Failed to load filters', e);
      }
    }
    loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load widgets whenever selected dashboard changes
  useEffect(() => {
    async function loadWidgetsForDashboard() {
      if (!selectedDashboard) {
        setWidgets([]);
        return;
      }

      setLoadingWidgets(true);
      setError(null);

      try {
        const data = await apiFetch<Widget[]>(`/widgets?dashboard_id=${selectedDashboard.id}`);
        setWidgets(data || []);

        const newLayout =
          data?.map((w) => ({
            i: w.id!.toString(),
            x: Number(w.position_col),
            y: Number(w.position_row),
            w: Number(w.col_span),
            h: Number(w.row_span),
            minW: 2,
            minH: 1,
            maxW: 12,
          })) || [];
        setLayout(newLayout);

        // Fetch data for each widget
        (data || []).forEach((w) => {
          if (w.id && w.data_source_id) {
            fetchWidgetData(w);
          }
        });
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to load widgets');
      } finally {
        setLoadingWidgets(false);
      }
    }
    loadWidgetsForDashboard();
  }, [selectedDashboard?.id]);

  useEffect(() => {
    const updateWidth = () => {
      const width = gridContainerRef.current?.getBoundingClientRect().width ?? 1200;
      setGridWidth(Math.max(900, Math.floor(width)));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (tabNameOptions.length === 0) {
      setActiveWidgetTabName('');
      return;
    }
    setActiveWidgetTabName((prev) => (prev && tabNameOptions.includes(prev) ? prev : tabNameOptions[0]));
  }, [selectedDashboard?.id, selectedDashboard?.tab_name, widgets.length]);

  useEffect(() => {
    if (!selectedDashboard?.id) {
      setDashboardAssignedFilterIds([]);
      setWidgetAssignedFilterMap({});
      return;
    }
    let cancelled = false;
    async function loadAssignedFilters() {
      try {
        const dashboardRes = await fetch(
          `https://intelligentsalesman.com/ism1/API/get_assigned_filters.php?dashboard_id=${selectedDashboard.id}`
        );
        const dashboardJson = await dashboardRes.json();
        const dashboardIds = Array.isArray(dashboardJson?.filter_ids)
          ? dashboardJson.filter_ids.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
          : [];
        if (!cancelled) setDashboardAssignedFilterIds(dashboardIds);

        const widgetIds = widgets.map((w) => Number(w.id)).filter((id) => Number.isFinite(id));
        const pairs = await Promise.all(
          widgetIds.map(async (widgetId) => {
            try {
              const widgetRes = await fetch(
                `https://intelligentsalesman.com/ism1/API/get_assigned_filters.php?dashboard_id=${selectedDashboard.id}&widget_id=${widgetId}`
              );
              const widgetJson = await widgetRes.json();
              const ids = Array.isArray(widgetJson?.filter_ids)
                ? widgetJson.filter_ids.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
                : [];
              return [widgetId, ids] as const;
            } catch {
              return [widgetId, []] as const;
            }
          })
        );
        if (!cancelled) setWidgetAssignedFilterMap(Object.fromEntries(pairs));
      } catch (e) {
        console.error('Failed to load assigned filters', e);
      }
    }
    loadAssignedFilters();
    return () => {
      cancelled = true;
    };
  }, [selectedDashboard?.id, widgets]);

  useEffect(() => {
    setSelectedFilterIds(combinedAssignedFilterIds);
    setFilterUiStatus('');
  }, [selectedDashboard?.id, dashboardAssignedFilterIds.join(','), widgetLevelAssignedIds.join(',')]);

  async function fetchWidgetData(widget: Widget) {
    if (!widget.data_source_id || !widget.id || !widget.dashboard_id) return;
    const ds = dataSources.find((d) => d.id === widget.data_source_id);
    if (!ds) return;

    setWidgetLoadingState((prev) => ({ ...prev, [widget.id!]: true }));
    setWidgetErrors((prev) => ({ ...prev, [widget.id!]: '' }));

    try {
      let response: any;

      switch (ds.source_type) {
        case 'API': {
          if (!ds.endpoint_url) throw new Error('API data source missing endpoint URL');
          if (ds.endpoint_url.startsWith('http')) {
            const res = await fetch(ds.endpoint_url, {
              method: ds.http_method || 'GET',
              mode: 'cors',
              headers: ds.request_headers_json || {},
            });
            if (!res.ok) {
              const text = await res.text();
              let parsed = null;
              try {
                parsed = JSON.parse(text);
              } catch {}
              throw new Error(
                parsed?.error || parsed?.message || `${res.status} ${res.statusText} - ${text}`,
              );
            }
            const text = await res.text();
            response = text ? JSON.parse(text) : null;
          } else {
            const path = ds.endpoint_url.replace(/^\//, '');
            response = await apiFetch<any>(path, {
              method: ds.http_method || 'GET',
              headers: ds.request_headers_json || {},
            });
          }
          break;
        }

        case 'SQL': {
          if (!ds.code && !(ds.request_body_template_json?.query)) {
            throw new Error('SQL data source missing query');
          }
          response = await apiFetch<any>('/execute-sql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(ds.request_headers_json || {}),
            },
            body: JSON.stringify({
              query: ds.code || ds.request_body_template_json?.query,
              params: ds.request_query_params_json || {},
            }),
          });
          break;
        }

        case 'STATIC': {
          if (ds.request_body_json) {
            response = ds.request_body_json;
          } else if (ds.request_body_template_json) {
            response = ds.request_body_template_json;
          } else if (ds.code) {
            try {
              response = JSON.parse(ds.code);
            } catch {
              response = ds.code;
            }
          } else {
            throw new Error('Static data source missing data');
          }
          break;
        }

        default:
          throw new Error(`Unsupported data source type: ${ds.source_type}`);
      }

      if (!response) throw new Error('Empty response from data source');
      let normalized: any;
      if (widget.visual_type === 'TABLE') {
        normalized = normalizeSharedTableResponse(response);
      } else if (widget.visual_type === 'TEXT') {
        normalized = normalizeSharedTextResponse(response);
      } else {
        normalized = normalizeSharedApiResponse(response);
      }

      setWidgetApiData((prev) => ({
        ...prev,
        [widget.id!]: { raw: response, normalized },
      }));
    } catch (e: any) {
      console.error(`Failed to fetch data for widget ${widget.id}:`, e);
      setWidgetErrors((prev) => ({
        ...prev,
        [widget.id!]: e.message || 'Failed to load data',
      }));
    } finally {
      setWidgetLoadingState((prev) => ({ ...prev, [widget.id!]: false }));
    }
  }

  return (
    <div className="h-[calc(100vh-70px)] w-full bg-slate-100">
      <div className="h-full flex">
        <aside
          className={`${
            isListOpen ? 'w-[300px]' : 'w-0'
          } relative border-r border-slate-200 bg-white flex flex-col min-h-0 overflow-hidden transition-all duration-200`}
        >
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">DashboardList</h2>
            <button
              type="button"
              onClick={() => setIsListOpen(false)}
              className="text-slate-500 hover:text-slate-700 text-xs"
              aria-label="Collapse dashboard list"
              title="Collapse"
            >
              ◀
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingDashboards && <div className="px-4 py-3 text-sm text-slate-500">Loading dashboards...</div>}
            {!loadingDashboards && dashboards.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">No dashboards found.</div>
            )}
            <ul className="py-1">
              {dashboards.map((d) => {
                const active = selectedDashboard?.id === d.id;
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => setSelectedDashboard(d)}
                      className={`w-full text-left px-4 py-2.5 border-l-4 text-sm transition ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-transparent text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-medium truncate">{d.name}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <button
          type="button"
          onClick={() => setIsListOpen((prev) => !prev)}
          className="h-full w-6 shrink-0 border-r border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          aria-label={isListOpen ? 'Hide dashboard list' : 'Show dashboard list'}
          title={isListOpen ? 'Hide dashboard list' : 'Show dashboard list'}
        >
          {isListOpen ? '◀' : '▶'}
        </button>

        <main className="flex-1 min-h-0 flex flex-col p-4 md:p-6">
          {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          {!selectedDashboard ? (
            <div className="h-full grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-500">
              Select a dashboard to view widgets.
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-xl bg-white border border-slate-200 px-4 py-3 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">{selectedDashboard.name}</h3>
                  {selectedDashboard.description && <p className="text-sm text-slate-500 mt-1">{selectedDashboard.description}</p>}
                  {tabNameOptions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tabNameOptions.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveWidgetTabName(tab)}
                          className={`px-3 py-1 rounded-md text-xs border ${
                            activeWidgetTabName === tab
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-800">Available Filters</h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-[11px] bg-slate-600 text-white rounded hover:bg-slate-700"
                          onClick={() => {
                            setSelectedFilterIds([]);
                            setFilterUiStatus('Cleared selected filters.');
                          }}
                        >
                          Clear All
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1 text-[11px] bg-blue-600 text-white rounded hover:bg-blue-700"
                          onClick={() => setFilterUiStatus(`Applied ${selectedFilterIds.length} filter(s).`)}
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 overflow-x-auto whitespace-nowrap">
                      {assignedFiltersForDashboard.length === 0 ? (
                        <span className="text-xs text-slate-500">
                          No filters are assigned to this dashboard or its widgets.
                        </span>
                      ) : (
                        assignedFiltersForDashboard.map((filter) => {
                          const checked = selectedFilterIds.includes(filter.id);
                          return (
                            <label key={filter.id} className="inline-flex items-center gap-2 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSelectedFilterIds((prev) => {
                                    if (e.target.checked) return Array.from(new Set([...prev, filter.id]));
                                    return prev.filter((id) => id !== filter.id);
                                  });
                                }}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{filter.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    {filterUiStatus && <div className="mt-1 text-[11px] text-blue-600">{filterUiStatus}</div>}
                  </div>
                </div>
                {selectedDashboard.created_at && (
                  <span className="text-xs text-slate-400">Created {new Date(selectedDashboard.created_at).toLocaleDateString()}</span>
                )}
              </div>

              <div ref={gridContainerRef} className="flex-1 min-h-0 rounded-xl bg-white border border-slate-200 p-3 overflow-auto">
                {loadingWidgets ? (
                  <div className="h-full min-h-[260px] grid place-items-center text-sm text-slate-500">Loading widgets...</div>
                ) : visibleWidgetsForActiveTab.length === 0 ? (
                  <div className="h-full min-h-[260px] grid place-items-center text-sm text-slate-500">
                    No widgets configured for this tab.
                  </div>
                ) : (
                  <GridLayout
                    key={`grid-${selectedDashboard.id}-${activeWidgetTabName || 'all'}-${isListOpen ? 'open' : 'closed'}-${gridWidth}`}
                    className="layout"
                    layout={layout.filter((l) => visibleWidgetsForActiveTab.some((w) => w.id?.toString() === l.i))}
                    cols={12}
                    rowHeight={120}
                    width={gridWidth}
                    isDraggable={false}
                    isResizable={false}
                    compactType="vertical"
                    preventCollision={false}
                    margin={[16, 16]}
                    containerPadding={[0, 0]}
                  >
                    {visibleWidgetsForActiveTab.map((w) => {
                      const ds = dataSources.find((d) => d.id === w.data_source_id);
                      const apiData = w.id ? widgetApiData[w.id] : undefined;
                      const isLoading = w.id ? widgetLoadingState[w.id] : false;
                      const err = w.id ? widgetErrors[w.id] : undefined;
                      return (
                        <div key={w.id!.toString()} className="bg-white">
                          <SharedWidgetRenderer
                            widget={w as any}
                            dataSource={ds as any}
                            apiData={apiData}
                            isLoading={isLoading}
                            error={err}
                            contextMenus={[]}
                            widgetContextMenuAssignments={[]}
                          />
                        </div>
                      );
                    })}
                  </GridLayout>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardList;