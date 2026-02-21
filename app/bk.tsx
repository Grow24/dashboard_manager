import React, { useEffect, useState } from 'react';

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
  widgets?: Widget[];
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
  request_body_template_json?: any;
  response_mapping_json?: any;
  is_cached?: boolean;
  cache_ttl_sec?: number | null;
  created_at?: string;
  updated_at?: string;
}

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

  // Only set Content-Type if we are sending a body and none provided
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

  try {
    const res = await fetch(url, fetchOpts);
    const text = await res.text();

    if (!res.ok) {
      let parsed = null;
      try { parsed = JSON.parse(text); } catch {}
      throw new Error(parsed?.error || parsed?.message || `${res.status} ${res.statusText} - ${text}`);
    }

    if (!text) {
      // @ts-expect-error - text may be null
      return null;
    }

    const data = JSON.parse(text);
    return data as T;
  } catch (err: any) {
    if (err instanceof TypeError) {
      throw new Error(`Network or CORS error: ${err.message}`);
    }
    throw err;
  }
}

/* -------------------- Normalization Utilities -------------------- */

type NormalizedKPI = { kind: 'kpi'; value?: number | string; unit?: string; trend?: number | string; trend_direction?: 'up' | 'down' | 'flat'; previous?: number | null; description?: string; metrics?: Record<string, number | string>; raw?: any; };
type NormalizedChart = { kind: 'chart'; data: { label: string; value: number }[]; max?: number; raw?: any; };
type NormalizedTable = { kind: 'table'; columns: string[]; rows: any[]; raw?: any; };
type NormalizedResponse = NormalizedKPI | NormalizedChart | NormalizedTable | { kind: 'raw'; raw: any; } | { kind: 'text'; text: string; raw?: any; };

function normalizeApiResponse(raw: any): NormalizedResponse {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    if ('value' in raw || 'trend' in raw || 'metrics' in raw) {
      const kpi: NormalizedKPI = {
        kind: 'kpi',
        value: raw.value ?? (raw.metrics ? Object.values(raw.metrics)[0] : undefined),
        unit: raw.unit ?? undefined,
        trend: raw.trend ?? undefined,
        trend_direction: raw.trend_direction ?? (typeof raw.trend === 'number' ? (raw.trend > 0 ? 'up' : raw.trend < 0 ? 'down' : 'flat') : undefined),
        previous: raw.previous ?? null,
        description: raw.description ?? undefined,
        metrics: raw.metrics ?? undefined,
        raw
      };
      return kpi;
    }

    if (Array.isArray(raw.data) && raw.data.length > 0) {
      const data = raw.data.map((d: any) => {
        if (typeof d === 'object') return { label: d.label ?? d.name ?? d.key ?? String(d.x ?? ''), value: Number(d.value ?? d.y ?? 0) };
        return { label: String(d[0] ?? ''), value: Number(d[1] ?? 0) };
      });
      return { kind: 'chart', data, max: raw.max ?? undefined, raw };
    }

    if (Array.isArray(raw.rows) && Array.isArray(raw.columns)) {
      return { kind: 'table', columns: raw.columns, rows: raw.rows, raw };
    }

    const numericProps = Object.keys(raw).filter(k => typeof raw[k] === 'number');
    if (numericProps.length === 1) {
      return { kind: 'kpi', value: raw[numericProps[0]], raw };
    }
    
    // Handle text content
    if (typeof raw.text === 'string') {
      return { kind: 'text', text: raw.text, raw };
    }
    
    return { kind: 'raw', raw };
  }

  if (Array.isArray(raw)) {
    // Handle array of objects as table
    if (raw.length > 0 && typeof raw[0] === 'object') {
      const columns = Object.keys(raw[0]);
      return { kind: 'table', columns, rows: raw, raw };
    }
    
    // Handle flat array
    if (raw.length > 0 && (typeof raw[0] === 'string' || typeof raw[0] === 'number')) {
      return { kind: 'table', columns: ['value'], rows: raw.map(r => ({ value: r })), raw };
    }
    
    // Handle array of simple values as chart
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

  // Handle primitive values as KPI
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return { kind: 'kpi', value: raw, raw };
  }

  return { kind: 'raw', raw };
}

/* -------------------- Presentational components -------------------- */

const DashboardCard: React.FC<{ dashboard: Dashboard; onSelect: () => void; isSelected: boolean }> = ({ dashboard, onSelect, isSelected }) => (
  <div 
    className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500 border-2 border-blue-500' : ''}`} 
    onClick={onSelect}
  >
    <div className="flex justify-between items-start">
      <div>
        <h3 className="font-semibold text-lg">{dashboard.name}</h3>
        <p className="text-gray-600 text-sm mt-1">{dashboard.description}</p>
      </div>
      <span className={`px-2 py-1 rounded text-xs font-medium ${dashboard.type === 'STANDARD' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
        {dashboard.type}
      </span>
    </div>
    <div className="mt-3 flex justify-between items-center">
      <span className="text-xs text-gray-500">
        {dashboard.created_at ? `Created: ${new Date(dashboard.created_at).toLocaleDateString()}` : ''}
      </span>
      {dashboard.is_default && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Default</span>}
    </div>
  </div>
);

/* KPI Presentation UI (used for preview and actual widget) */
const KPIView: React.FC<{ k: NormalizedKPI; small?: boolean }> = ({ k, small = false }) => {
  const valueDisplay = k.value ?? '-';
  const trend = k.trend;
  let trendNumber: number | null = null;
  if (typeof trend === 'number') trendNumber = trend;
  else if (typeof trend === 'string') {
    const parsed = Number(String(trend).replace(/[^\d.-]/g,''));
    if (!isNaN(parsed)) trendNumber = parsed;
  }
  let dir = k.trend_direction;
  if (!dir && trendNumber !== null) dir = trendNumber > 0 ? 'up' : trendNumber < 0 ? 'down' : 'flat';

  const trendColor = dir === 'up' ? 'text-green-600' : dir === 'down' ? 'text-red-600' : 'text-gray-500';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–';

  return (
    <div className={`flex flex-col ${small ? 'text-sm' : ''}`}>
      <div className="flex items-baseline gap-3">
        <div className={`${small ? 'text-2xl font-semibold' : 'text-3xl font-bold'}`}>{valueDisplay}{k.unit ? ` ${k.unit}` : ''}</div>
        {trend !== undefined && <div className={`flex items-center ${trendColor} text-sm`}>{arrow} <span className="ml-1">{String(trend)}</span></div>}
      </div>
      {k.description && <div className="text-xs text-gray-500 mt-1">{k.description}</div>}
      {k.previous !== undefined && k.previous !== null && <div className="text-xs text-gray-400 mt-1">Previous: {k.previous}</div>}
      {k.metrics && Object.keys(k.metrics).length > 0 && (
        <div className="mt-2 flex gap-3 flex-wrap">
          {Object.entries(k.metrics).map(([key, val]) => (
            <div key={key} className="text-xs bg-gray-100 px-2 py-1 rounded">
              <strong className="mr-1">{key}</strong>{val}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const WidgetComponent: React.FC<{ widget: Widget; dataSource?: DataSource; apiData?: any; isLoading?: boolean; error?: string }> = ({ widget, dataSource, apiData, isLoading, error }) => {
  const cfg = widget.config_json || {};
  const normalized: NormalizedResponse | null = apiData?.normalized ?? (apiData ? normalizeApiResponse(apiData) : null);

  // Chart configuration (from widget config_json.chart_config)
  const chartCfg: any = (cfg.chart_config && typeof cfg.chart_config === 'object') ? cfg.chart_config : {};

  // Default chart config
  const colors: string[] = chartCfg.series_colors ?? chartCfg.colors ?? ['hsl(220 80% 55%)', 'hsl(200 70% 50%)', 'hsl(140 60% 45%)', 'hsl(45 85% 55%)'];
  const barColor = chartCfg.bar_color ?? colors[0];
  const showAxes = chartCfg.show_axes !== undefined ? Boolean(chartCfg.show_axes) : true;
  const xAxisLabel = chartCfg.x_axis_label ?? '';
  const yAxisLabel = chartCfg.y_axis_label ?? '';
  const yTicks = Math.max(2, Number(chartCfg.y_ticks ?? 5));
  const showLegend = chartCfg.show_legend !== undefined ? Boolean(chartCfg.show_legend) : true;
  const showValuesOnBars = chartCfg.show_values_on_bars !== undefined ? Boolean(chartCfg.show_values_on_bars) : false;
  const pieShowLabels = chartCfg.pie?.show_labels_on_pie ?? true;
  const lineStrokeWidth = Number(chartCfg.line?.strokeWidth ?? 2);
  const pointRadius = Number(chartCfg.line?.pointRadius ?? 2);

  // Helper function to render trend indicator
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

  // Table Widget Component (separate component to use hooks)
  const TableWidgetContent: React.FC<{ 
    title: string; 
    normalized: NormalizedResponse | null; 
    apiData?: any; 
    cfg: any;
  }> = ({ title, normalized, apiData, cfg }) => {
    const t = normalized && normalized.kind === 'table' ? normalized : (apiData?.normalized && apiData.normalized.kind === 'table' ? apiData.normalized : null);
    const tableColumns = t ? t.columns : (apiData?.columns ?? cfg.columns ?? ['Column']);
    const tableRows = t ? t.rows : (apiData?.rows ?? cfg.rows ?? []);

    // --- Sorting & Pagination State ---
    const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [currentPage, setCurrentPage] = React.useState(1);
    const rowsPerPage = 5; // adjust as needed

    // Apply sorting
    const sortedRows = React.useMemo(() => {
      if (!sortConfig) return tableRows;
      return [...tableRows].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }, [tableRows, sortConfig]);

    // Apply pagination
    const paginatedRows = React.useMemo(() => {
      const start = (currentPage - 1) * rowsPerPage;
      return sortedRows.slice(start, start + rowsPerPage);
    }, [sortedRows, currentPage]);

    const totalPages = Math.ceil(sortedRows.length / rowsPerPage);

    const requestSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key, direction });
    };

    return (
      <div className="p-4">
        <h4 className="text-lg font-semibold">{title}</h4>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {tableColumns.map((h: string, i: number) => (
                  <th
                    key={i}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort(h)}
                  >
                    <div className="flex items-center">
                      {h}
                      {sortConfig?.key === h ? (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} className="px-6 py-4 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r: any, idx: number) => (
                  <tr key={idx}>
                    {tableColumns.map((c: string, ci: number) => (
                      <td key={ci} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {r[c] ?? r[c.toLowerCase()] ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-300'}`}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-300'}`}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWidgetContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4">
          <h4 className="text-lg font-semibold">{widget.title}</h4>
          <div className="mt-2 text-red-600 text-sm">Error loading data: {error}</div>
        </div>
      );
    }

    // KPI
    if (widget.visual_type === 'KPI') {
      if (normalized && normalized.kind === 'kpi') {
        return (
          <div className="p-4">
            <div className="flex items-center">
              <h4 className="text-lg font-semibold">{widget.title}</h4>
              {renderTrend(normalized.trend, normalized.trend_direction)}
            </div>
            <div className="mt-2">
              <KPIView k={normalized} />
            </div>
          </div>
        );
      }
      const kpiValue = apiData?.value ?? cfg.value ?? '-';
      const kpiTrend = apiData?.trend ?? cfg.trend;
      const kpiTrendDir = apiData?.trend_direction ?? cfg.trend_direction;
      return (
        <div className="p-4">
          <div className="flex items-center">
            <h4 className="text-lg font-semibold">{widget.title}</h4>
            {renderTrend(kpiTrend, kpiTrendDir)}
          </div>
          <div className="mt-2">
            <p className="text-3xl font-bold">{kpiValue}</p>
            {kpiTrend && <p className="text-green-600 text-sm mt-1">{kpiTrend}</p>}
          </div>
        </div>
      );
    }

    // Chart
    if (widget.visual_type === 'CHART') {
      const chartNormalized = normalized && normalized.kind === 'chart' ? normalized : (apiData?.normalized && apiData.normalized.kind === 'chart' ? apiData.normalized : null);
      const chartData = chartNormalized ? chartNormalized.data : (apiData?.data ?? cfg.data ?? []);
      const maxValue = (chartNormalized && chartNormalized.max) ?? apiData?.max ?? cfg.max ?? (chartData.length ? Math.max(...chartData.map((x: any) => Number(x.value || 0))) : 100);

      if (!chartData || chartData.length === 0) {
        return (
          <div className="p-4">
            <h4 className="text-lg font-semibold">{widget.title}</h4>
            <div className="mt-4 text-gray-500">No data available</div>
          </div>
        );
      }

      // Extract trend info from config or normalized raw data
      const trendValue = cfg.trend ?? chartNormalized?.raw?.trend;
      const trendDirection = cfg.trend_direction ?? chartNormalized?.raw?.trend_direction;

      /* ---------------- PIE ---------------- */
      if (widget.chart_type === 'PIE') {
        const total = chartData.reduce((s: number, it: any) => s + Math.max(0, Number(it.value || 0)), 0);
        if (total <= 0) {
          return (
            <div className="p-4">
              <h4 className="text-lg font-semibold">{widget.title}</h4>
              <div className="mt-4 text-gray-500">No data available</div>
            </div>
          );
        }

        // build conic-gradient stops using provided colors
        let accumDeg = 0;
        const stops: string[] = chartData.map((item: any, i: number) => {
          const val = Math.max(0, Number(item.value || 0));
          const deg = (val / total) * 360;
          const start = accumDeg;
          const end = accumDeg + deg;
          accumDeg += deg;
          const color = colors[i % colors.length];
          return `${color} ${start}deg ${end}deg`;
        });

        const gradient = stops.join(', ');

        return (
          <div className="p-4">
            <div className="flex items-center">
              <h4 className="text-lg font-semibold">{widget.title}</h4>
              {renderTrend(trendValue, trendDirection)}
            </div>

            <div className="mt-4 flex flex-col items-center">
              <div
                className="relative w-48 h-48 rounded-full"
                style={{ background: `conic-gradient(${gradient})` }}
                aria-label={widget.title}
                title={chartData.map((it: any, idx: number) => `${it.label}: ${it.value}`).join('\n')}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-full" />
                {/* optional center label */}
                {chartCfg.pie?.center_label && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center text-sm text-gray-600">
                    {chartCfg.pie.center_label}
                  </div>
                )}
              </div>

              {showLegend && (
                <div className="mt-3 flex flex-wrap gap-3 justify-center text-xs">
                  {chartData.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded"
                        style={{ backgroundColor: colors[i % colors.length] }}
                      />
                      <span>{item.label}{pieShowLabels ? ` (${item.value})` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {dataSource && <div className="mt-2 text-xs text-gray-500">Source: {dataSource.name}</div>}
          </div>
        );
      }

      /* ---------------- LINE ---------------- */
      if (widget.chart_type === 'LINE') {
        // Prepare SVG points scaling
        const len = chartData.length;
        const points = chartData.map((item: any, i: number) => {
          const x = len === 1 ? 50 : (i / (len - 1)) * 100;
          const y = 100 - ((Number(item.value || 0) / Math.max(1, Number(maxValue))) * 100);
          return `${x},${y}`;
        }).join(' ');

        // Axis rendering: ticks on Y
        const ticks = Array.from({ length: yTicks }, (_, i) => {
          const v = Math.round((i / (yTicks - 1)) * Number(maxValue));
          return { pos: 100 - (i / (yTicks - 1)) * 100, value: v };
        }).reverse();

        const strokeColor = colors[0];

        return (
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h4 className="text-lg font-semibold">{widget.title}</h4>
                {renderTrend(trendValue, trendDirection)}
              </div>
              {showLegend && <div className="text-xs text-gray-500">Series</div>}
            </div>

            <div className="mt-3 flex">
              {showAxes && (
                <div className="w-12 mr-3 flex flex-col justify-between text-xs text-gray-500">
                  {ticks.map((t, idx) => (
                    <div key={idx} style={{ transform: 'translateY(6px)' }}>{t.value}</div>
                  ))}
                </div>
              )}

              <div className="flex-1">
                <svg viewBox="0 0 100 100" className="w-full h-48">
                  {/* optional axis lines */}
                  {showAxes && <line x1="0" y1="100" x2="100" y2="100" stroke="#e5e7eb" strokeWidth="0.5" />}
                  <polyline
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={lineStrokeWidth}
                    points={points}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {chartData.map((item: any, i: number) => {
                    const x = len === 1 ? 50 : (i / (len - 1)) * 100;
                    const y = 100 - ((Number(item.value || 0) / Math.max(1, Number(maxValue))) * 100);
                    return <circle key={i} cx={x} cy={y} r={pointRadius} fill={colors[i % colors.length]} />;
                  })}
                </svg>

                {xAxisLabel && <div className="text-xs text-center text-gray-500 mt-1">{xAxisLabel}</div>}
              </div>
            </div>

            {dataSource && <div className="mt-2 text-xs text-gray-500">Source: {dataSource.name}</div>}
          </div>
        );
      }

      /* ---------------- BAR ---------------- */
      // Prepare Y ticks
      const ticks = Array.from({ length: yTicks }, (_, i) => {
        const val = Math.round(((yTicks - 1 - i) / (yTicks - 1)) * Number(maxValue));
        return val;
      });

      return (
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h4 className="text-lg font-semibold">{widget.title}</h4>
              {renderTrend(trendValue, trendDirection)}
            </div>
            {showLegend && chartCfg.legend_title && <div className="text-xs text-gray-500">{chartCfg.legend_title}</div>}
          </div>

          <div className="mt-3 flex">
            {showAxes && (
              <div className="w-12 pr-2 flex flex-col justify-between text-xs text-gray-500">
                {ticks.map((t, idx) => (
                  <div key={idx} className="text-right" style={{ lineHeight: 1 }}>{t}</div>
                ))}
              </div>
            )}

            <div className="flex-1 h-48 flex items-end space-x-2">
              {chartData.map((item: any, index: number) => {
                const rawVal = Number(item.value ?? 0);
                const safeMax = (typeof maxValue === 'number' && maxValue > 0) ? Number(maxValue) : 1;
                const pct = ((rawVal / safeMax) * 100) || 0;
                const visiblePct = Math.max(2, Math.min(100, pct)); // min 2% for very small values
                const color = (chartCfg.series_colors && chartCfg.series_colors[index]) ? chartCfg.series_colors[index] : barColor;

                return (
                  <div key={index} className="flex flex-col items-center flex-1 h-full">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t transition-colors"
                        style={{ height: `${visiblePct}%`, backgroundColor: color }}
                        title={`${item.label}: ${item.value}`}
                      >
                        {/* show value on the bar */}
                        {showValuesOnBars && (
                          <div className="text-[10px] text-white text-center" style={{ transform: 'translateY(-100%)' }}>{String(item.value)}</div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs mt-1 truncate text-center" style={{ maxWidth: '100%' }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Axis labels */}
          <div className="mt-2 flex justify-between items-center">
            <div className="text-xs text-gray-500">{yAxisLabel}</div>
            <div className="text-xs text-gray-500">{xAxisLabel}</div>
          </div>

          {dataSource && <div className="mt-2 text-xs text-gray-500">Source: {dataSource.name}</div>}
        </div>
      );
    }

    // Table
    if (widget.visual_type === 'TABLE') {
      return <TableWidgetContent title={widget.title} normalized={normalized} apiData={apiData} cfg={cfg} />;
    }

    // Text
   if (widget.visual_type === 'TEXT') {
  const textContent = normalized && normalized.kind === 'text' ? (normalized as { text: string }).text : (apiData?.text ?? cfg.text ?? '');

  if (!textContent) {
    return (
      <div className="p-4 text-gray-500 italic">
        <h4 className="text-lg font-semibold">{widget.title}</h4>
        <div className="mt-2">No text content available</div>
      </div>
    );
  }

  // If you want to render HTML safely, you can do:
  return (
    <div className="p-4">
      <h4 className="text-lg font-semibold">{widget.title}</h4>
      <div
        className="mt-2 text-gray-700 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: textContent }}
      />
    </div>
  );
}

    // Custom
   if (widget.visual_type === 'CUSTOM') {
  return (
    <div className="p-4">
      <h4 className="text-lg font-semibold">{widget.title}</h4>
      <div className="mt-2 text-gray-600 italic">
        Custom widget content rendering is not implemented yet.
      </div>
      <div className="mt-4">
        <pre className="bg-gray-100 p-2 rounded max-h-48 overflow-auto">
          {JSON.stringify(apiData ?? cfg, null, 2)}
        </pre>
      </div>
    </div>
  );
}

    // default
    return (
      <div className="p-4">
        <h4 className="text-lg font-semibold">{widget.title}</h4>
        <p className="mt-2 text-gray-600">Widget content for {widget.visual_type}</p>
      </div>
    );
  };

  return (
    <div className="rounded-lg shadow overflow-hidden" style={{ backgroundColor: widget.background_color || 'white', gridColumn: `span ${Math.max(1, widget.col_span || 1)}`, gridRow: `span ${Math.max(1, widget.row_span || 1)}` }}>
      {renderWidgetContent()}
    </div>
  );
};

/* --- Modal Components --- */

const DashboardModal: React.FC<{
  dashboardForm: Partial<Dashboard>;
  setDashboardForm: React.Dispatch<React.SetStateAction<Partial<Dashboard>>>;
  widgets: Widget[];
  openCreateWidgetForSelectedDashboard: () => void;
  saveDashboard: () => Promise<void>;
  setShowDashboardModal: React.Dispatch<React.SetStateAction<boolean>>;
  loadWidgets: (dashboardId?: number) => Promise<void>;
  loadDashboards: () => Promise<void>;
}> = ({ 
  dashboardForm, 
  setDashboardForm, 
  widgets, 
  openCreateWidgetForSelectedDashboard, 
  saveDashboard, 
  setShowDashboardModal,
  loadWidgets,
  loadDashboards
}) => {
  const relatedWidgets = widgets.filter(w => w.dashboard_id === dashboardForm.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start z-50 pt-12">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{dashboardForm.id ? 'Edit Dashboard' : 'Create Dashboard'}</h2>

        <label className="block mb-1 font-medium">Name</label>
        <input 
          type="text" 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4" 
          value={dashboardForm.name ?? ''} 
          onChange={e => setDashboardForm(prev => ({ ...prev, name: e.target.value }))} 
        />

        <label className="block mb-1 font-medium">Description</label>
        <textarea 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4" 
          value={dashboardForm.description ?? ''} 
          onChange={e => setDashboardForm(prev => ({ ...prev, description: e.target.value }))} 
        />

        <label className="block mb-1 font-medium">Type</label>
        <select 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4" 
          value={dashboardForm.type ?? 'STANDARD'} 
          onChange={e => setDashboardForm(prev => ({ ...prev, type: e.target.value as DashboardType }))}
        >
          <option value="BASIC">BASIC</option>
          <option value="STANDARD">STANDARD</option>
        </select>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Widgets</h3>
          <div className="flex gap-2 mb-2">
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => {
              if (!dashboardForm.id) {
                (async () => {
                  await saveDashboard();
                  if (!dashboardForm.id) {
                    await loadDashboards();
                  }
                  openCreateWidgetForSelectedDashboard();
                })();
              } else {
                openCreateWidgetForSelectedDashboard();
              }
            }}>Add Widget</button>

            <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => loadWidgets(dashboardForm.id)}>Refresh Widgets</button>
          </div>

          <ul className="max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
            {relatedWidgets.length === 0 && <li className="text-gray-500">No widgets for this dashboard</li>}
            {relatedWidgets.map(w => (
              <li key={w.id} className="flex justify-between items-center mb-1">
                <div>
                  <strong>{w.title}</strong>
                  <div className="text-xs text-gray-500">Type: {w.visual_type}{w.chart_type ? ` (${w.chart_type})` : ''}</div>
                </div>
                <div className="flex gap-2">
                  <button className="text-blue-600" onClick={() => { /* hook edit via parent if needed */ }}>Edit</button>
                  <button className="text-red-600" onClick={() => { /* hook delete via parent if needed */ }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-300" onClick={() => setShowDashboardModal(false)}>Cancel</button>
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={saveDashboard}>Save</button>
        </div>
      </div>
    </div>
  );
};

const WidgetModal: React.FC<{
  widgetForm: Partial<Widget>;
  setWidgetForm: React.Dispatch<React.SetStateAction<Partial<Widget>>>;
  dataSources: DataSource[];
  saveWidget: () => Promise<void>;
  setShowWidgetModal: React.Dispatch<React.SetStateAction<boolean>>;
  fetchWidgetData: (widget: Widget) => Promise<void>;
}> = ({ 
  widgetForm, 
  setWidgetForm, 
  dataSources, 
  saveWidget, 
  setShowWidgetModal,
  fetchWidgetData
}) => {
  // State for preview data (raw + normalized)
  const [previewData, setPreviewData] = useState<{ raw?: any; normalized?: NormalizedResponse } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fetchPreviewData = async () => {
    if (!widgetForm.data_source_id) return;
    const ds = dataSources.find(s => s.id === widgetForm.data_source_id);
    if (!ds) return;

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

    // Directly fetch from the endpoint URL
    if (ds.endpoint_url) {
      try {
        const method = (ds.http_method || 'GET').toUpperCase();
        const headers = ds.request_headers_json || {};
        
        const res = await fetch(ds.endpoint_url, { 
          method, 
          mode: 'cors',
          headers: headers
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const text = await res.text();
        if (!text) {
          setPreviewError('Direct fetch returned empty response');
          setPreviewLoading(false);
          return;
        }
        
        let parsed: any = null;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        const normalized = normalizeApiResponse(parsed);
        setPreviewData({ raw: parsed, normalized });
      } catch (directErr: any) {
        setPreviewError(directErr.message || 'Direct fetch failed (CORS or network)');
      } finally {
        setPreviewLoading(false);
      }
    } else {
      setPreviewError('Data source has no endpoint_url');
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (widgetForm.data_source_id) {
      fetchPreviewData();
    } else {
      setPreviewData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetForm.data_source_id]);

  // Helper function to update config_json
  const updateConfigJson = (key: string, value: any) => {
    setWidgetForm(prev => ({
      ...prev,
      config_json: {
        ...prev.config_json,
        [key]: value
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start z-50 pt-12">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{widgetForm.id ? 'Edit Widget' : 'Create Widget'}</h2>

        <label className="block mb-1 font-medium">Title</label>
        <input 
          type="text" 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
          value={widgetForm.title ?? ''} 
          onChange={e => setWidgetForm(prev => ({ ...prev, title: e.target.value }))} 
        />

        <label className="block mb-1 font-medium">Visual Type</label>
        <select 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
          value={widgetForm.visual_type ?? 'CHART'} 
          onChange={e => setWidgetForm(prev => ({ ...prev, visual_type: e.target.value as VisualType }))}
        >
          <option value="KPI">KPI</option>
          <option value="CHART">CHART</option>
          <option value="TABLE">TABLE</option>
          <option value="TEXT">TEXT</option>
          <option value="CUSTOM">CUSTOM</option>
        </select>

        {widgetForm.visual_type === 'CHART' && (
          <>
            <label className="block mb-1 font-medium">Chart Type</label>
            <select 
              className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
              value={widgetForm.chart_type ?? 'BAR'} 
              onChange={e => setWidgetForm(prev => ({ ...prev, chart_type: e.target.value as ChartType }))}
            >
              <option value="BAR">Bar Chart</option>
              <option value="PIE">Pie Chart</option>
              <option value="LINE">Line Chart</option>
            </select>
          </>
        )}

        {/* KPI Configuration Section */}
        {widgetForm.visual_type === 'KPI' && (
          <div className="mb-4 p-3 bg-blue-50 rounded">
            <h4 className="font-medium mb-2">KPI Configuration</h4>

            <label className="block mb-1 font-medium">Value</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2" 
              value={widgetForm.config_json?.value ?? ''} 
              onChange={e => updateConfigJson('value', e.target.value)}
              placeholder="e.g., 12345"
            />

            <label className="block mb-1 font-medium">Trend</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2" 
              value={widgetForm.config_json?.trend ?? ''} 
              onChange={e => updateConfigJson('trend', e.target.value)}
              placeholder="e.g., +5%"
            />

            <label className="block mb-1 font-medium">Description</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2" 
              value={widgetForm.config_json?.description ?? ''} 
              onChange={e => updateConfigJson('description', e.target.value)}
              placeholder="e.g., Monthly Sales"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block mb-1 font-medium">Position Row</label>
            <input 
              type="number" 
              className="w-full border border-gray-300 rounded px-3 py-2" 
              value={widgetForm.position_row ?? 0} 
              onChange={e => setWidgetForm(prev => ({ ...prev, position_row: parseInt(e.target.value || '0') }))} 
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Position Col</label>
            <input 
              type="number" 
              className="w-full border border-gray-300 rounded px-3 py-2" 
              value={widgetForm.position_col ?? 0} 
              onChange={e => setWidgetForm(prev => ({ ...prev, position_col: parseInt(e.target.value || '0') }))} 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block mb-1 font-medium">Row Span</label>
            <input 
              type="number" 
              className="w-full border border-gray-300 rounded px-3 py-2" 
              value={widgetForm.row_span ?? 1} 
              onChange={e => setWidgetForm(prev => ({ ...prev, row_span: parseInt(e.target.value || '1') }))} 
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Col Span</label>
            <input 
              type="number" 
              className="w-full border border-gray-300 rounded px-3 py-2" 
              value={widgetForm.col_span ?? 1} 
              onChange={e => setWidgetForm(prev => ({ ...prev, col_span: parseInt(e.target.value || '1') }))} 
            />
          </div>
        </div>

        <label className="block mb-1 font-medium">Background Color</label>
        <input 
          type="color" 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
          value={widgetForm.background_color ?? '#ffffff'} 
          onChange={e => setWidgetForm(prev => ({ ...prev, background_color: e.target.value }))} 
        />

        <label className="block mb-1 font-medium">Data Source</label>
        <select 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
          value={widgetForm.data_source_id ?? ''} 
          onChange={e => setWidgetForm(prev => ({ ...prev, data_source_id: e.target.value ? parseInt(e.target.value) : null }))}
        >
          <option value="">-- None --</option>
          {dataSources.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
        </select>

        {widgetForm.data_source_id && (
          <div className="mb-3 p-3 bg-gray-50 rounded">
            <h4 className="font-medium mb-2">Data Preview</h4>
            {previewLoading ? (
              <div className="text-center py-2">Loading...</div>
            ) : previewError ? (
              <div className="text-red-500 text-sm">{previewError}</div>
            ) : previewData ? (
              <div className="text-sm">
                {previewData.normalized && previewData.normalized.kind === 'kpi' ? (
                  <div className="mb-2">
                    <KPIView k={previewData.normalized as NormalizedKPI} small />
                  </div>
                ) : null}
                <pre className="bg-white p-2 rounded border max-h-32 overflow-y-auto">
                  {JSON.stringify(previewData.raw ?? previewData.normalized ?? previewData, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No data available</div>
            )}
          </div>
        )}

        <label className="block mb-1 font-medium">Refresh Interval (sec)</label>
        <input 
          type="number" 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
          value={widgetForm.refresh_interval_sec ?? 0} 
          onChange={e => setWidgetForm(prev => ({ ...prev, refresh_interval_sec: parseInt(e.target.value || '0') }))} 
        />

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-300" onClick={() => setShowWidgetModal(false)}>Cancel</button>
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={saveWidget}>Save</button>
        </div>
      </div>
    </div>
  );
};

const DataSourceModal: React.FC<{
  dataSourceForm: Partial<DataSource>;
  setDataSourceForm: React.Dispatch<React.SetStateAction<Partial<DataSource>>>;
  saveDataSource: () => Promise<void>;
  setShowDataSourceModal: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ 
  dataSourceForm, 
  setDataSourceForm, 
  saveDataSource, 
  setShowDataSourceModal 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start z-50 pt-12">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{dataSourceForm.id ? 'Edit Data Source' : 'Create Data Source'}</h2>

        <label className="block mb-1 font-medium">Name</label>
        <input 
          type="text" 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
          value={dataSourceForm.name ?? ''} 
          onChange={e => setDataSourceForm(prev => ({ ...prev, name: e.target.value }))} 
        />

        <label className="block mb-1 font-medium">Source Type</label>
        <select 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
          value={dataSourceForm.source_type ?? 'API'} 
          onChange={e => setDataSourceForm(prev => ({ ...prev, source_type: e.target.value as SourceType }))}
        >
          <option value="API">API</option>
          <option value="SQL">SQL</option>
          <option value="STATIC">STATIC</option>
        </select>

        <label className="block mb-1 font-medium">Endpoint URL</label>
        <input 
          type="text" 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
          value={dataSourceForm.endpoint_url ?? ''} 
          onChange={e => setDataSourceForm(prev => ({ ...prev, endpoint_url: e.target.value }))} 
        />

        <label className="block mb-1 font-medium">HTTP Method</label>
        <select 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
          value={dataSourceForm.http_method ?? 'GET'} 
          onChange={e => setDataSourceForm(prev => ({ ...prev, http_method: e.target.value as HttpMethod }))}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>

        <label className="block mb-1 font-medium">Cached</label>
        <select 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
          value={dataSourceForm.is_cached ? '1' : '0'} 
          onChange={e => setDataSourceForm(prev => ({ ...prev, is_cached: e.target.value === '1' }))}
        >
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>


        <label className="block mb-1 font-medium">Cache TTL (sec)</label>
        <input 
          type="number" 
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3" 
          value={dataSourceForm.cache_ttl_sec ?? 0} 
          onChange={e => setDataSourceForm(prev => ({ ...prev, cache_ttl_sec: parseInt(e.target.value || '0') }))} 
        />

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-300" onClick={() => setShowDataSourceModal(false)}>Cancel</button>
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={saveDataSource}>Save</button>
        </div>
      </div>
    </div>
  );
};

/* --- Main component --- */

const DashboardManager: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [layout, setLayout] = useState<any[]>([]);
  // widgetApiData stores { raw, normalized }
  const [widgetApiData, setWidgetApiData] = useState<Record<number, any>>({});
  const [widgetLoadingState, setWidgetLoadingState] = useState<Record<number, boolean>>({});
  const [widgetErrors, setWidgetErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dashboards' | 'widgets' | 'datasources'>('dashboards');
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [dashboardForm, setDashboardForm] = useState<Partial<Dashboard>>({});
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [widgetForm, setWidgetForm] = useState<Partial<Widget>>({});
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [dataSourceForm, setDataSourceForm] = useState<Partial<DataSource>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await loadDashboards();
      await loadDataSources();
    })();
  }, []);
  useEffect(() => {
      const newLayout = widgets.map(widget => ({
        i: widget.id!.toString(),
        x: widget.position_col,
        y: widget.position_row,
        w: widget.col_span,
        h: widget.row_span,
        static: false
      }));
      setLayout(newLayout);
    }, [widgets]);

  useEffect(() => {
    if (selectedDashboard) {
      loadWidgets(selectedDashboard.id);
    } else {
      setWidgets([]);
    }
  }, [selectedDashboard?.id]);

  // Fetch API data for widgets with data sources
  useEffect(() => {
    widgets.forEach(widget => {
      if (widget.data_source_id && widget.id) {
        fetchWidgetData(widget);
      }
    });
  }, [widgets, dataSources]);

  useEffect(() => {
  const timers: Record<number, NodeJS.Timeout> = {};

  widgets.forEach(widget => {
    if (widget.id && widget.refresh_interval_sec && widget.refresh_interval_sec > 0) {
      // Clear existing timer if any
      if (timers[widget.id]) clearInterval(timers[widget.id]);

      timers[widget.id] = setInterval(() => {
        fetchWidgetData(widget);
      }, widget.refresh_interval_sec * 1000);
    }
  });

  // Cleanup on unmount or widgets change
  return () => {
    Object.values(timers).forEach(clearInterval);
  };
}, [widgets, dataSources]);

async function fetchWidgetData(widget: Widget) {
  if (!widget.data_source_id || !widget.id) return;

  const dataSource = dataSources.find(ds => ds.id === widget.data_source_id);
  if (!dataSource) return;

  setWidgetLoadingState(prev => ({ ...prev, [widget.id!]: true }));
  setWidgetErrors(prev => ({ ...prev, [widget.id!]: '' }));

  try {
    let response: any;

    switch (dataSource.source_type) {
      case 'API':
        if (!dataSource.endpoint_url) throw new Error('API data source missing endpoint URL');

        if (dataSource.endpoint_url.startsWith('http')) {
          // External API direct fetch with CORS
          const res = await fetch(dataSource.endpoint_url, {
            method: dataSource.http_method || 'GET',
            mode: 'cors',
            headers: dataSource.request_headers_json || {},
          });
          if (!res.ok) {
            const text = await res.text();
            let parsed = null;
            try { parsed = JSON.parse(text); } catch {}
            throw new Error(parsed?.error || parsed?.message || `${res.status} ${res.statusText} - ${text}`);
          }
          const text = await res.text();
          response = text ? JSON.parse(text) : null;
        } else {
          // Proxy fetch via backend
          const path = dataSource.endpoint_url.replace(/^\//, '');
          response = await apiFetch<any>(path, {
            method: dataSource.http_method || 'GET',
            headers: dataSource.request_headers_json || {},
          });
        }
        break;

      case 'SQL':
        // For SQL, send the query or query ID to backend API to execute securely
        if (!dataSource.code && !(dataSource.request_body_template_json?.query)) {
          throw new Error('SQL data source missing query');
        }
        response = await apiFetch<any>('/execute-sql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(dataSource.request_headers_json || {}) },
          body: JSON.stringify({
            query: dataSource.code || dataSource.request_body_template_json?.query,
            params: dataSource.request_query_params_json || {},
          }),
        });
        break;

      case 'STATIC':
        // Static data embedded in config_json or code field
        if (dataSource.config_json) {
          response = dataSource.config_json;
        } else if (dataSource.code) {
          try {
            response = JSON.parse(dataSource.code);
          } catch {
            response = dataSource.code;
          }
        } else {
          throw new Error('Static data source missing data');
        }
        break;

      default:
        throw new Error(`Unsupported data source type: ${dataSource.source_type}`);
    }

    if (!response) throw new Error('Empty response from data source');

    const normalized = normalizeApiResponse(response);

    setWidgetApiData(prev => ({
      ...prev,
      [widget.id!]: { raw: response, normalized }
    }));
  } catch (err: any) {
    console.error(`Failed to fetch data for widget ${widget.id}:`, err);
    setWidgetErrors(prev => ({
      ...prev,
      [widget.id!]: err.message || 'Failed to load data'
    }));
  } finally {
    setWidgetLoadingState(prev => ({ ...prev, [widget.id!]: false }));
  }
}
const onLayoutChange = (newLayout: any[]) => {
    // Remove setLayout(newLayout) to prevent infinite loop
    
    // Update widget positions and spans in state
    setWidgets(prevWidgets => {
      const updatedWidgets = prevWidgets.map(w => {
        const layoutItem = newLayout.find(item => item.i === w.id!.toString());
        if (!layoutItem) return w;
        return {
          ...w,
          position_col: layoutItem.x,
          position_row: layoutItem.y,
          col_span: layoutItem.w,
          row_span: layoutItem.h,
        };
      });
      return updatedWidgets;
    });

    // Optionally, debounce and save updated widgets to backend here
  };

  async function loadDashboards() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Dashboard[]>('/dashboards');
      setDashboards(data || []);
      if (data && data.length > 0) {
        setSelectedDashboard((prev) => {
          if (prev) {
            const found = data.find(d => d.id === prev.id);
            return found || data[0];
          }
          return data[0];
        });
      } else {
        setSelectedDashboard(null);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch dashboards');
    } finally {
      setLoading(false);
    }
  }

  async function loadWidgets(dashboardId?: number) {
    setError(null);
    try {
      if (dashboardId) {
        const data = await apiFetch<Widget[]>(`/widgets?dashboard_id=${dashboardId}`);
        setWidgets(data || []);
      } else {
        const data = await apiFetch<Widget[]>('/widgets');
        setWidgets(data || []);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch widgets');
    }
  }

  async function loadDataSources() {
    setError(null);
    try {
      const data = await apiFetch<DataSource[]>('/datasources');
      setDataSources(data || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch data sources');
    }
  }

  /* --- Dashboard CRUD --- */

  function openCreateDashboard() {
    setDashboardForm({ type: 'STANDARD', is_default: false, is_active: true, name: '', description: '' });
    setShowDashboardModal(true);
  }

  function openEditDashboard(d: Dashboard) {
    setDashboardForm({ ...d });
    setShowDashboardModal(true);
  }

  async function saveDashboard() {
    setError(null);
    try {
      if (!dashboardForm.name || !dashboardForm.name.trim()) {
        setError('Dashboard name is required');
        return;
      }
      if (dashboardForm.id) {
        const updated = await apiFetch<Dashboard>(`/dashboards/${dashboardForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(dashboardForm),
          headers: { 'X-User-Id': '1' },
        });
        setDashboards(prev => prev.map(d => (d.id === updated.id ? updated : d)));
        if (selectedDashboard?.id === updated.id) setSelectedDashboard(updated);
      } else {
        const created = await apiFetch<Dashboard>('/dashboards', {
          method: 'POST',
          body: JSON.stringify(dashboardForm),
          headers: { 'X-User-Id': '1' },
        });
        setDashboards(prev => [...prev, created]);
        setSelectedDashboard(created);
      }
      setShowDashboardModal(false);
      if (dashboardForm.id) loadWidgets(dashboardForm.id);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to save dashboard');
    }
  }

  async function deleteDashboard(id?: number) {
    if (!id) return;
    if (!window.confirm('Delete dashboard? This cannot be undone.')) return;
    setError(null);
    try {
      await apiFetch<void>(`/dashboards/${id}`, { method: 'DELETE', headers: { 'X-User-Id': '1' } });
      setDashboards(prev => prev.filter(d => d.id !== id));
      if (selectedDashboard?.id === id) {
        setSelectedDashboard(null);
        setWidgets([]);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to delete dashboard');
    }
  }

  /* --- Widget CRUD --- */

  function openCreateWidgetForSelectedDashboard() {
    if (!selectedDashboard) {
      alert('Please select a dashboard first');
      return;
    }
    setWidgetForm({
      dashboard_id: selectedDashboard.id!,
      visual_type: 'CHART',
      chart_type: 'BAR',
      position_row: 0,
      position_col: 0,
      row_span: 1,
      col_span: 1,
      is_visible: true,
      sort_order: 0,
      title: '',
    });
    setShowWidgetModal(true);
  }

  function openEditWidget(w: Widget) {
    setWidgetForm({ ...w });
    setShowWidgetModal(true);
  }

  async function saveWidget() {
    setError(null);
    try {
      if (!widgetForm.dashboard_id) throw new Error('Widget must be linked to a dashboard');
      if (!widgetForm.title || !widgetForm.title.trim()) widgetForm.title = 'Untitled';
      let updatedOrCreated: Widget;
      if (widgetForm.id) {
        updatedOrCreated = await apiFetch<Widget>(`/widgets/${widgetForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(widgetForm),
          headers: { 'X-User-Id': '1' },
        });
        setWidgets(prev => prev.map(w => (w.id === updatedOrCreated.id ? updatedOrCreated : w)));
      } else {
        updatedOrCreated = await apiFetch<Widget>('/widgets', {
          method: 'POST',
          body: JSON.stringify(widgetForm),
          headers: { 'X-User-Id': '1' },
        });
        setWidgets(prev => [...prev, updatedOrCreated]);
      }

      // Immediately fetch data for the newly created/updated widget
      if (updatedOrCreated.id && updatedOrCreated.data_source_id) {
        fetchWidgetData(updatedOrCreated);
      }

      setShowWidgetModal(false);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to save widget');
    }
  }

  async function deleteWidget(id?: number) {
    if (!id) return;
    if (!window.confirm('Delete widget?')) return;
    setError(null);
    try {
      await apiFetch<void>(`/widgets/${id}`, { method: 'DELETE', headers: { 'X-User-Id': '1' } });
      setWidgets(prev => prev.filter(w => w.id !== id));
      // Clean up widget data states
      setWidgetApiData(prev => {
        const newData = { ...prev };
        delete newData[id];
        return newData;
      });
      setWidgetLoadingState(prev => {
        const newData = { ...prev };
        delete newData[id];
        return newData;
      });
      setWidgetErrors(prev => {
        const newData = { ...prev };
        delete newData[id];
        return newData;
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to delete widget');
    }
  }

  /* --- DataSource CRUD --- */

  function openCreateDataSource() {
    setDataSourceForm({ source_type: 'API', http_method: 'GET', is_cached: false, name: '', endpoint_url: '' });
    setShowDataSourceModal(true);
  }

  function openEditDataSource(ds: DataSource) {
    setDataSourceForm({ ...ds });
    setShowDataSourceModal(true);
  }

  async function saveDataSource() {
    setError(null);
    try {
      if (!dataSourceForm.name || !dataSourceForm.name.trim()) {
        setError('Data source name required');
        return;
      }

      // Fix for integer fields
      const payload = {
        ...dataSourceForm,
        is_cached: dataSourceForm.is_cached ? 1 : 0,
        cache_ttl_sec: dataSourceForm.cache_ttl_sec || null,
      };

      if (dataSourceForm.id) {
        const updated = await apiFetch<DataSource>(`/datasources/${dataSourceForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
          headers: { 'X-User-Id': '1' },
        });
        setDataSources(prev => prev.map(d => (d.id === updated.id ? updated : d)));
      } else {
        const created = await apiFetch<DataSource>('/datasources', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'X-User-Id': '1' },
        });
        setDataSources(prev => [...prev, created]);
      }
      setShowDataSourceModal(false);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to save data source');
    }
  }

  async function deleteDataSource(id?: number) {
    if (!id) return;
    if (!window.confirm('Delete data source?')) return;
    setError(null);
    try {
      await apiFetch<void>(`/datasources/${id}`, { method: 'DELETE', headers: { 'X-User-Id': '1' } });
      setDataSources(prev => prev.filter(d => d.id !== id));
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to delete data source');
    }
  }

  /* --- Main render --- */

  return (
    <div className="mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Manager</h1>
        <div className="flex gap-2">
          <button onClick={openCreateDashboard} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">Create Dashboard</button>
          <button onClick={() => setActiveTab('dashboards')} className={`py-2 px-3 rounded ${activeTab === 'dashboards' ? 'bg-blue-100' : 'bg-gray-100'}`}>Dashboards</button>
          <button onClick={() => { setActiveTab('widgets'); loadWidgets(); }} className={`py-2 px-3 rounded ${activeTab === 'widgets' ? 'bg-blue-100' : 'bg-gray-100'}`}>Widgets</button>
          <button onClick={() => { setActiveTab('datasources'); loadDataSources(); }} className={`py-2 px-3 rounded ${activeTab === 'datasources' ? 'bg-blue-100' : 'bg-gray-100'}`}>Data Sources</button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" /></div>
      ) : (
        <>
          {activeTab === 'dashboards' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6">
                {dashboards.map(d => (
                  <div key={d.id}>
                    <DashboardCard 
                      dashboard={d} 
                      onSelect={() => { setSelectedDashboard(d); loadWidgets(d.id); }} 
                      isSelected={selectedDashboard?.id === d.id}
                    />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => openEditDashboard(d)} className="text-sm px-2 py-1 bg-white border rounded">Edit</button>
                      <button onClick={() => deleteDashboard(d.id)} className="text-sm px-2 py-1 bg-red-600 text-white rounded">Delete</button>
                    </div>
                  </div>
                ))}
                {dashboards.length === 0 && <div className="col-span-full text-gray-500">No dashboards created</div>}
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Selected Dashboard</h2>
                {selectedDashboard ? (
                  <div className="bg-white rounded-lg p-6 shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold">{selectedDashboard.name}</h3>
                        <p className="text-gray-600">{selectedDashboard.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEditDashboard(selectedDashboard)} className="px-3 py-1 bg-gray-100 rounded">Edit</button>
                        <button onClick={() => deleteDashboard(selectedDashboard.id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
                        <button onClick={openCreateWidgetForSelectedDashboard} className="px-3 py-1 bg-blue-600 text-white rounded">Add Widget</button>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: `repeat(4, minmax(0, 1fr))` }}>
                      {widgets.length === 0 ? <div className="col-span-4 p-8 bg-gray-50 rounded text-center text-gray-500">No widgets</div> : widgets.map(w => {
                        const ds = dataSources.find(ds => ds.id === w.data_source_id);
                        const apiData = w.id ? widgetApiData[w.id] : undefined;
                        const isLoading = w.id ? widgetLoadingState[w.id] : false;
                        const error = w.id ? widgetErrors[w.id] : undefined;
                        return <WidgetComponent key={w.id} widget={w} dataSource={ds} apiData={apiData} isLoading={isLoading} error={error} />;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-6 shadow text-center text-gray-500">No dashboard selected</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'widgets' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-medium">Widgets</h3>
                <div className="flex gap-2">
                  <button onClick={openCreateWidgetForSelectedDashboard} className="px-3 py-1 bg-blue-600 text-white rounded">Add Widget (for selected dashboard)</button>
                  <button onClick={() => loadWidgets()} className="px-3 py-1 bg-gray-200 rounded">Refresh</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dashboard</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {widgets.map(w => (
                      <tr key={w.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{w.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {w.visual_type}
                          {w.chart_type && ` (${w.chart_type})`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dashboards.find(d => d.id === w.dashboard_id)?.name ?? '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Row {w.position_row}, Col {w.position_col}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 mr-3" onClick={() => openEditWidget(w)}>Edit</button>
                          <button className="text-red-600" onClick={() => deleteWidget(w.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {widgets.length === 0 && <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No widgets found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'datasources' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-medium">Data Sources</h3>
                <div className="flex gap-2">
                  <button onClick={openCreateDataSource} className="px-3 py-1 bg-blue-600 text-white rounded">Add Data Source</button>
                  <button onClick={loadDataSources} className="px-3 py-1 bg-gray-200 rounded">Refresh</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cached</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dataSources.map(ds => (
                      <tr key={ds.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ds.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ds.source_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ds.endpoint_url ?? '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ds.is_cached ? `Yes (${ds.cache_ttl_sec ?? 0}s)` : 'No'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 mr-3" onClick={() => openEditDataSource(ds)}>Edit</button>
                          <button className="text-red-600" onClick={() => deleteDataSource(ds.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {dataSources.length === 0 && <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No data sources</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals rendered outside main component to prevent re-rendering issues */}
      {showDashboardModal && (
        <DashboardModal
          dashboardForm={dashboardForm}
          setDashboardForm={setDashboardForm}
          widgets={widgets}
          openCreateWidgetForSelectedDashboard={openCreateWidgetForSelectedDashboard}
          saveDashboard={saveDashboard}
          setShowDashboardModal={setShowDashboardModal}
          loadWidgets={loadWidgets}
          loadDashboards={loadDashboards}
        />
      )}
      {showWidgetModal && (
        <WidgetModal
          widgetForm={widgetForm}
          setWidgetForm={setWidgetForm}
          dataSources={dataSources}
          saveWidget={saveWidget}
          setShowWidgetModal={setShowWidgetModal}
          fetchWidgetData={fetchWidgetData}
        />
      )}
      {showDataSourceModal && (
        <DataSourceModal
          dataSourceForm={dataSourceForm}
          setDataSourceForm={setDataSourceForm}
          saveDataSource={saveDataSource}
          setShowDataSourceModal={setShowDataSourceModal}
        />
      )}
    </div>
  );
};

export default DashboardManager;