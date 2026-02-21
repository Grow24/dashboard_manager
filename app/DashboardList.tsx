import React, { useEffect, useState } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

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
  is_default?: boolean;
  owner_user_id?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Widget {
  id?: number;
  dashboard_id: number;
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

    // KPI
    if (widget.visual_type === 'KPI') {
      if (normalized && normalized.kind === 'kpi') {
        return (
          <div className="p-4">
            <h4 className="text-lg font-semibold mb-2">{widget.title}</h4>
            <KPIView k={normalized} />
          </div>
        );
      }
      return (
        <div className="p-4">
          <h4 className="text-lg font-semibold mb-2">{widget.title}</h4>
          <div className="text-3xl font-bold">{cfg.value ?? '-'}</div>
        </div>
      );
    }

    // CHART (simple fallback)
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
          <h4 className="text-lg font-semibold mb-2">{widget.title}</h4>
          <div className="flex items-end gap-2 h-40">
            {chartData.map((item: any, i: number) => {
              const v = Number(item.value || 0);
              const pct = maxValue ? Math.max(2, (v / maxValue) * 100) : 0;
              return (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${pct}%` }}
                    title={`${item.label}: ${item.value}`}
                  />
                  <span className="text-[10px] mt-1 truncate w-full text-center">
                    {item.label}
                  </span>
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
      const normalized = normalizeApiResponse(response);

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
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Left: dashboards list */}
      <div style={{ width: 260, borderRight: '1px solid #ddd', overflowY: 'auto' }}>
        <div
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid #eee',
            backgroundColor: '#f5f5f5',
            fontWeight: 600,
          }}
        >
          Dashboards
        </div>

        {loadingDashboards && (
          <div style={{ padding: 10, fontSize: 13, color: '#666' }}>Loading dashboards…</div>
        )}

        {!loadingDashboards && dashboards.length === 0 && (
          <div style={{ padding: 10, fontSize: 13, color: '#666' }}>
            No dashboards found. Create one in Dashboard Manager.
          </div>
        )}

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {dashboards.map((d) => (
            <li
              key={d.id}
              onClick={() => setSelectedDashboard(d)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                backgroundColor:
                  selectedDashboard?.id === d.id ? '#007bff' : 'transparent',
                color: selectedDashboard?.id === d.id ? '#fff' : '#000',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 14,
              }}
            >
              {d.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Right: dashboard visual (same layout as DashboardManager) */}
      <div style={{ flex: 1, padding: 16, background: '#f9f9f9', overflow: 'auto' }}>
        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: 8,
              borderRadius: 4,
              background: '#fee2e2',
              color: '#b91c1c',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {!selectedDashboard ? (
          <div style={{ padding: 20 }}>Select a dashboard to view</div>
        ) : (
          <>
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{selectedDashboard.name}</div>
                {selectedDashboard.description && (
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    {selectedDashboard.description}
                  </div>
                )}
              </div>
              {selectedDashboard.created_at && (
                <div style={{ fontSize: 11, color: '#999' }}>
                  Created:{' '}
                  {new Date(selectedDashboard.created_at).toLocaleDateString()}
                </div>
              )}
            </div>

            <div
              style={{
                borderRadius: 8,
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                padding: 12,
                minHeight: 500,
              }}
            >
              {loadingWidgets ? (
                <div
                  style={{
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: 13,
                  }}
                >
                  Loading widgets…
                </div>
              ) : widgets.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: '#777',
                    fontSize: 14,
                  }}
                >
                  No widgets configured for this dashboard.
                </div>
              ) : (
                <GridLayout
                  className="layout"
                  layout={layout}
                  cols={12}
                  rowHeight={120}
                  width={1200}
                  isDraggable={false}
                  isResizable={false}
                  compactType="vertical"
                  preventCollision={false}
                  margin={[16, 16]}
                  containerPadding={[0, 0]}
                >
                  {widgets.map((w) => {
                    const ds = dataSources.find((d) => d.id === w.data_source_id);
                    const apiData = w.id ? widgetApiData[w.id] : undefined;
                    const isLoading = w.id ? widgetLoadingState[w.id] : false;
                    const err = w.id ? widgetErrors[w.id] : undefined;

                    return (
                      <div key={w.id!.toString()} className="bg-white">
                        <WidgetComponent
                          widget={w}
                          dataSource={ds}
                          apiData={apiData}
                          isLoading={isLoading}
                          error={err}
                        />
                      </div>
                    );
                  })}
                </GridLayout>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardList;