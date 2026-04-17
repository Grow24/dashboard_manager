import React, { useEffect, useRef, useState } from 'react';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';
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
  type?: string;
  placeholder?: string;
  options?: string[] | string;
  staticOptions?: string;
  query_preview?: string;
  querypreview?: string;
  queryBuilder?: { queryPreview?: string } | string | null;
  filterApply?: 'Live' | 'Manual' | string;
  required?: boolean;
  description?: string;
  min?: number | string;
  max?: number | string;
  pattern?: string;
  logical_operator?: string;
  condition_operator?: string;
  field?: string;
  multiSelect?: boolean;
  webapi?: string;
  webapiType?: 'static' | 'dynamic' | string;
  staticoption?: string;
  cssClass?: string;
  inlineStyle?: string;
  cssCode?: string;
  queryPreview?: string | boolean | number;
}

interface DynamicOption {
  value: string;
  label: string;
}

const MultiSelectCombobox = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  loading = false,
}: {
  options: DynamicOption[];
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  loading?: boolean;
}) => {
  const [query, setQuery] = useState('');
  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <Combobox value={value} onChange={onChange} multiple>
      <div className="relative">
        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-400">
          <Combobox.Input
            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
            displayValue={(selected: string[]) =>
              selected
                .map(
                  (val) =>
                    options.find((option) => option.value === val)?.label || val
                )
                .join(', ')
            }
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </Combobox.Button>
        </div>
        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {loading ? (
            <div className="px-4 py-2 text-gray-500">Loading...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-4 py-2 text-gray-500">No options found.</div>
          ) : (
            filteredOptions.map((option) => (
              <Combobox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-blue-600 text-white' : 'text-gray-900'
                  }`
                }
              >
                {({ selected, active }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                      {option.label}
                    </span>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? 'text-white' : 'text-blue-600'
                        }`}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};

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
  const [filterValues, setFilterValues] = useState<Record<number, unknown>>({});
  const [queryText, setQueryText] = useState<string>('');
  const [filterValidationErrors, setFilterValidationErrors] = useState<Record<number, string>>({});
  const [dynamicOptions, setDynamicOptions] = useState<Record<number, DynamicOption[]>>({});
  const [loadingOptions, setLoadingOptions] = useState<Record<number, boolean>>({});
  const [widgetSelectedFilterIds, setWidgetSelectedFilterIds] = useState<Record<number, number[]>>({});
  const [widgetFilterValues, setWidgetFilterValues] = useState<Record<number, Record<number, unknown>>>({});
  const [widgetFilterValidationErrors, setWidgetFilterValidationErrors] = useState<Record<number, Record<number, string>>>({});
  const [widgetQueryText, setWidgetQueryText] = useState<Record<number, string>>({});
  const [widgetFilterStatus, setWidgetFilterStatus] = useState<Record<number, string>>({});

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
  const assignedFiltersForDashboard = allFilters.filter((f) =>
    dashboardAssignedFilterIds.includes(Number(f.id))
  );
  const selectedFilters = assignedFiltersForDashboard.filter((f) =>
    selectedFilterIds.includes(Number(f.id))
  );
  const parseList = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean);
    if (typeof value !== 'string') return [];
    const raw = value.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v ?? '').trim()).filter(Boolean);
    } catch {}
    return raw.split(',').map((v) => v.trim()).filter(Boolean);
  };
  const getFilterQueryPreview = (f: FilterItem): string => {
    if (typeof f.query_preview === 'string' && f.query_preview.trim()) return f.query_preview.trim();
    if (typeof f.querypreview === 'string' && f.querypreview.trim()) return f.querypreview.trim();
    if (f.queryBuilder && typeof f.queryBuilder === 'object' && typeof f.queryBuilder.queryPreview === 'string') {
      return f.queryBuilder.queryPreview.trim();
    }
    if (typeof f.queryBuilder === 'string') {
      try {
        const parsed = JSON.parse(f.queryBuilder);
        if (parsed && typeof parsed.queryPreview === 'string') return parsed.queryPreview.trim();
      } catch {}
    }
    return '';
  };
  const hasEmptyQuery = (f: FilterItem): boolean => getFilterQueryPreview(f) === '';
  const isQueryPreviewEnabled = (f: FilterItem): boolean => {
    const val = f.queryPreview;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (typeof val === 'string') {
      const t = val.trim().toLowerCase();
      return t === '1' || t === 'true' || t === 'yes';
    }
    return false;
  };
  const buildQueryForFilterSet = (
    filtersPool: FilterItem[],
    selectedIds: number[],
    values: Record<number, unknown>
  ): string => {
    const resolveFilterField = (filter: FilterItem): string => {
      const rawField =
        (filter as any).field ??
        (filter as any).db_field ??
        (filter as any).column ??
        (filter as any).filter_field ??
        '';
      if (typeof rawField === 'string' && rawField.trim() !== '') {
        return rawField.trim();
      }
      // Fallback from label/name: "Country Filter" -> "country"
      const rawName = String(filter.name ?? '').trim();
      const withoutSuffix = rawName.replace(/\s*filter\s*$/i, '');
      const normalized = withoutSuffix
        .replace(/[^a-zA-Z0-9_ ]+/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase();
      return normalized || 'name';
    };
    const selected = filtersPool.filter((f) => selectedIds.includes(f.id));
    if (selected.length === 0) return '';

    const queryFilter = selected.find((f) => getFilterQueryPreview(f) !== '');
    if (queryFilter) {
      let sql = getFilterQueryPreview(queryFilter).trim();
      if (sql.endsWith(';')) sql = sql.slice(0, -1);
      if (sql) return sql;
    }

    let baseQuery =
      'SELECT id, name, salesAmount,date, salesQuantity, status, age, salary, country, state, createdAt FROM sales_data ORDER BY id DESC';
    if (baseQuery.endsWith(';')) baseQuery = baseQuery.slice(0, -1);

    const segments: { logical: string; expression: string }[] = [];
    selected.forEach((filter) => {
      const v = values[filter.id];
      if (!v || (Array.isArray(v) && v.length === 0)) return;
      const field = resolveFilterField(filter);
      const logical = String((filter as any).logical_operator || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND';
      const operator = String((filter as any).condition_operator || ((filter.type || '').toLowerCase() === 'text' ? 'LIKE' : '=')).toUpperCase();

      if (Array.isArray(v)) {
        const quoted = v.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(', ');
        segments.push({ logical, expression: `${field} IN (${quoted})` });
        return;
      }
      const escaped = String(v).replace(/'/g, "''");
      if ((filter.type || '').toLowerCase() === 'text' && operator === 'LIKE') {
        segments.push({ logical, expression: `${field} LIKE '%${escaped}%'` });
      } else {
        segments.push({ logical, expression: `${field} ${['=', '!=', '<>', '>', '<', '>=', '<='].includes(operator) ? operator : '='} '${escaped}'` });
      }
    });

    if (segments.length === 0) return baseQuery;
    const cond = segments.reduce((acc, s, i) => (i === 0 ? s.expression : `${acc} ${s.logical} ${s.expression}`), '');
    const orderPos = baseQuery.toLowerCase().indexOf(' order by');
    return orderPos !== -1
      ? `${baseQuery.slice(0, orderPos)} WHERE ${cond} ${baseQuery.slice(orderPos)}`
      : `${baseQuery} WHERE ${cond}`;
  };
  const buildQueryFromFilters = (
    selectedIdsOverride?: number[],
    filterValuesOverride?: Record<number, unknown>
  ): string =>
    buildQueryForFilterSet(
      assignedFiltersForDashboard,
      selectedIdsOverride ?? selectedFilterIds,
      filterValuesOverride ?? filterValues
    );
  const getFilterValidationError = (filter: FilterItem, rawValue: unknown): string | null => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return null;
    if (Array.isArray(rawValue) && rawValue.length === 0) return null;

    const value = Array.isArray(rawValue) ? rawValue.join(',') : String(rawValue);
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (filter.pattern && String(filter.pattern).trim()) {
      try {
        const regex = new RegExp(String(filter.pattern));
        if (!regex.test(trimmed)) return `${filter.name} format is invalid.`;
      } catch {
        // Ignore admin-side invalid regex
      }
    }

    if ((filter.type || '').toLowerCase() === 'number') {
      const num = Number(trimmed);
      if (Number.isNaN(num)) return `${filter.name} must be a number.`;
      const minNum = filter.min !== undefined && filter.min !== '' ? Number(filter.min) : NaN;
      const maxNum = filter.max !== undefined && filter.max !== '' ? Number(filter.max) : NaN;
      if (!Number.isNaN(minNum) && num < minNum) return `${filter.name} must be at least ${minNum}.`;
      if (!Number.isNaN(maxNum) && num > maxNum) return `${filter.name} must be at most ${maxNum}.`;
      return null;
    }

    if ((filter.type || '').toLowerCase() === 'date') {
      const current = new Date(trimmed);
      if (Number.isNaN(current.getTime())) return `${filter.name} must be a valid date.`;
      if (filter.min) {
        const minDate = new Date(String(filter.min));
        if (!Number.isNaN(minDate.getTime()) && current < minDate) return `${filter.name} must be on or after ${filter.min}.`;
      }
      if (filter.max) {
        const maxDate = new Date(String(filter.max));
        if (!Number.isNaN(maxDate.getTime()) && current > maxDate) return `${filter.name} must be on or before ${filter.max}.`;
      }
      return null;
    }

    const length = trimmed.length;
    const minLen = filter.min !== undefined && filter.min !== '' ? Number(filter.min) : NaN;
    const maxLen = filter.max !== undefined && filter.max !== '' ? Number(filter.max) : NaN;
    if (!Number.isNaN(minLen) && length < minLen) return `${filter.name} length must be at least ${minLen}.`;
    if (!Number.isNaN(maxLen) && length > maxLen) return `${filter.name} length must be at most ${maxLen}.`;
    return null;
  };
  const getRequiredFilterError = (
    selectedIdsOverride?: number[],
    valuesOverride?: Record<number, unknown>
  ): string | null => {
    const selected = assignedFiltersForDashboard.filter((f) =>
      (selectedIdsOverride ?? selectedFilterIds).includes(f.id)
    );
    const values = valuesOverride ?? filterValues;
    const missing = selected.find((f) => {
      if (!f.required) return false;
      const v = values[f.id];
      if (Array.isArray(v)) return v.length === 0;
      return v === undefined || v === null || String(v).trim() === '';
    });
    return missing ? `${missing.name} is required.` : null;
  };
  const getSelectedValidationError = (
    selectedIdsOverride?: number[],
    valuesOverride?: Record<number, unknown>
  ): string | null => {
    const selected = assignedFiltersForDashboard.filter((f) =>
      (selectedIdsOverride ?? selectedFilterIds).includes(f.id)
    );
    const values = valuesOverride ?? filterValues;
    for (const f of selected) {
      const err = getFilterValidationError(f, values[f.id]);
      if (err) return err;
    }
    return null;
  };
  const parseStyleDeclarations = (styleString: string): React.CSSProperties => {
    if (!styleString) return {};
    const styles: React.CSSProperties = {};
    styleString.split(';').forEach((style) => {
      const [property, value] = style.split(':').map((s) => s.trim());
      if (property && value) {
        const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        (styles as Record<string, string>)[camelProperty] = value;
      }
    });
    return styles;
  };
  const fetchDynamicOptions = async (filterId: number, webapi: string) => {
    if (!webapi || webapi.trim() === '') return;
    setLoadingOptions((prev) => ({ ...prev, [filterId]: true }));
    try {
      const response = await fetch(webapi);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      let options: DynamicOption[] = [];
      if (Array.isArray(data)) {
        options = data.map((item: any) => {
          if (item?.id != null && item?.name != null) return { value: String(item.id), label: String(item.name) };
          if (typeof item === 'string') return { value: item, label: item };
          if (item?.value != null && item?.label != null) return { value: String(item.value), label: String(item.label) };
          const firstKey = item && typeof item === 'object' ? Object.keys(item)[0] : null;
          return firstKey ? { value: String(item[firstKey]), label: String(item[firstKey]) } : { value: '', label: '' };
        }).filter((o) => o.value !== '' || o.label !== '');
      } else if (Array.isArray(data?.data)) {
        options = data.data.map((item: any) => ({
          value: String(item?.id ?? item?.name ?? item?.value ?? ''),
          label: String(item?.name ?? item?.label ?? item?.value ?? item?.id ?? ''),
        })).filter((o) => o.value !== '' || o.label !== '');
      }
      setDynamicOptions((prev) => ({ ...prev, [filterId]: options }));
    } catch {
      setDynamicOptions((prev) => ({ ...prev, [filterId]: [] }));
    } finally {
      setLoadingOptions((prev) => ({ ...prev, [filterId]: false }));
    }
  };
  useEffect(() => {
    // Load dynamic options for both dashboard-level and widget-level assigned filters.
    const dynamicFilters = allFilters.filter(
      (filter) =>
        (filter.type || '').toLowerCase() === 'select' &&
        String(filter.webapiType || '').toLowerCase() === 'dynamic' &&
        !!filter.webapi
    );
    dynamicFilters.forEach((filter) => {
      if (!dynamicOptions[filter.id] && !loadingOptions[filter.id]) {
        fetchDynamicOptions(filter.id, String(filter.webapi));
      }
    });
  }, [
    allFilters.map((f) => `${f.id}:${f.webapi || ''}:${f.webapiType || ''}:${f.type || ''}`).join('|'),
    Object.keys(dynamicOptions).join(','),
    Object.keys(loadingOptions).join(','),
  ]);
  const getFilterOptions = (filter: FilterItem): DynamicOption[] => {
    const webapiType = String(filter.webapiType || '').toLowerCase();
    if (webapiType === 'static') {
      const staticRaw = String(filter.staticOptions || filter.staticoption || '').trim();
      if (staticRaw !== '') {
        return staticRaw
          .split(',')
          .map((opt) => opt.trim())
          .filter(Boolean)
          .map((opt) => ({ value: opt, label: opt }));
      }
      if (Array.isArray(filter.options)) return filter.options.map((opt) => ({ value: String(opt), label: String(opt) }));
      return [];
    }
    if (webapiType === 'dynamic') return dynamicOptions[filter.id] || [];
    if (Array.isArray(filter.options)) return filter.options.map((opt) => ({ value: String(opt), label: String(opt) }));
    return parseList(filter.options ?? filter.staticOptions ?? '').map((opt) => ({ value: opt, label: opt }));
  };
  const renderFilterControl = (filter: FilterItem, value: unknown) => {
    const options = getFilterOptions(filter);
    const isLoading = loadingOptions[filter.id];
    const mergedStyle = {
      ...parseStyleDeclarations(filter.inlineStyle || ''),
      ...parseStyleDeclarations(filter.cssCode || ''),
    };
    const commonClass = `w-full rounded-md border px-2.5 py-2 text-xs focus:outline-none focus:ring-2 ${
      filterValidationErrors[filter.id] ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-300'
    } ${filter.cssClass || ''}`;
    if ((filter.type || '').toLowerCase() === 'select') {
      if (filter.multiSelect) {
        return (
          <div style={mergedStyle}>
            <MultiSelectCombobox
              options={options}
              value={Array.isArray(value) ? value.map((v) => String(v)) : value ? [String(value)] : []}
              onChange={(selected) => handleFilterChange(filter.id, selected)}
              placeholder={filter.placeholder || `Select ${filter.name}`}
              loading={isLoading}
            />
          </div>
        );
      }
      return (
        <select
          value={String(value ?? '')}
          onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          className={commonClass}
          style={mergedStyle}
        >
          <option value="">All {filter.name}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={(filter.type ?? '').toLowerCase() === 'number' ? 'number' : (filter.type ?? '').toLowerCase() === 'date' ? 'date' : 'text'}
        value={String(value ?? '')}
        placeholder={filter.placeholder || `Enter ${filter.name}`}
        onChange={(e) => handleFilterChange(filter.id, e.target.value)}
        min={filter.min !== undefined ? String(filter.min) : undefined}
        max={filter.max !== undefined ? String(filter.max) : undefined}
        pattern={filter.pattern || undefined}
        className={commonClass}
        style={mergedStyle}
      />
    );
  };
  const widgetAssignedFiltersByWidget: Record<number, FilterItem[]> = Object.fromEntries(
    widgets
      .filter((w) => Number.isFinite(Number(w.id)))
      .map((w) => {
        const wid = Number(w.id);
        const ids = widgetAssignedFilterMap[wid] ?? [];
        const filters = allFilters.filter((f) => ids.includes(Number(f.id)));
        return [wid, filters];
      })
  );

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
            type: String(f.type ?? f.filter_type ?? 'text').toLowerCase(),
            placeholder: String(f.placeholder ?? ''),
            options: f.options ?? f.staticOptions ?? undefined,
            staticOptions: f.staticOptions ?? f.staticoption ?? undefined,
            query_preview: typeof f.query_preview === 'string' ? f.query_preview : undefined,
            querypreview: typeof f.querypreview === 'string' ? f.querypreview : undefined,
            queryBuilder: f.queryBuilder ?? null,
            queryPreview:
              f.queryPreview ??
              f.querypreview ??
              f.query_preview ??
              (() => {
                if (f.queryBuilder && typeof f.queryBuilder === 'object') {
                  return f.queryBuilder.queryPreview ?? '0';
                }
                if (typeof f.queryBuilder === 'string') {
                  try {
                    const parsed = JSON.parse(f.queryBuilder);
                    return parsed?.queryPreview ?? '0';
                  } catch {
                    return '0';
                  }
                }
                return '0';
              })(),
            filterApply: f.filterApply ?? undefined,
            required: Boolean(f.required),
            description: typeof f.description === 'string' ? f.description : undefined,
            min: f.min ?? undefined,
            max: f.max ?? undefined,
            pattern: typeof f.pattern === 'string' ? f.pattern : undefined,
            logical_operator: f.logical_operator ?? undefined,
            condition_operator: f.condition_operator ?? undefined,
            field: typeof f.field === 'string' ? f.field : undefined,
            multiSelect: Boolean(f.multiSelect),
            webapi: typeof f.webapi === 'string' ? f.webapi : undefined,
            webapiType: String(f.webapiType ?? f.webapitype ?? '').toLowerCase(),
            staticoption: typeof f.staticoption === 'string' ? f.staticoption : undefined,
            cssClass: typeof f.cssClass === 'string' ? f.cssClass : undefined,
            inlineStyle: typeof f.inlineStyle === 'string' ? f.inlineStyle : undefined,
            cssCode: typeof f.cssCode === 'string' ? f.cssCode : undefined,
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
    setSelectedFilterIds(dashboardAssignedFilterIds);
    setQueryText('');
    setFilterValues({});
    setFilterValidationErrors({});
    setFilterUiStatus('');
  }, [selectedDashboard?.id, dashboardAssignedFilterIds.join(',')]);

  useEffect(() => {
    const selectedDefaults: Record<number, number[]> = {};
    Object.entries(widgetAssignedFiltersByWidget).forEach(([wid, filters]) => {
      selectedDefaults[Number(wid)] = filters.map((f) => f.id);
    });
    setWidgetSelectedFilterIds(selectedDefaults);
    setWidgetFilterValues({});
    setWidgetFilterValidationErrors({});
    setWidgetQueryText({});
    setWidgetFilterStatus({});
  }, [selectedDashboard?.id, widgets.length, Object.keys(widgetAssignedFiltersByWidget).join(',')]);

  const toggleFilterSelection = (filterId: number, checked: boolean) => {
    setSelectedFilterIds((prev) => {
      const next = checked
        ? (prev.includes(filterId) ? prev : [...prev, filterId])
        : prev.filter((id) => id !== filterId);
      if (!checked) {
        setFilterValues((curr) => {
          const cp = { ...curr };
          delete cp[filterId];
          return cp;
        });
        setFilterValidationErrors((prev) => {
          const cp = { ...prev };
          delete cp[filterId];
          return cp;
        });
      }
      const q = buildQueryFromFilters(next);
      setQueryText(q);
      if (next.length === 0) {
        setFilterUiStatus('Cleared selected filters.');
      } else if (checked) {
        const selected = assignedFiltersForDashboard.find((f) => f.id === filterId);
        const previewSql = selected ? getFilterQueryPreview(selected) : '';
        if (previewSql && previewSql.toUpperCase().startsWith('SELECT')) {
          setQueryText(previewSql);
          setFilterUiStatus('Live preview query prepared.');
        }
      }
      return next;
    });
  };

  const handleFilterChange = (id: number, value: unknown) => {
    const changedFilter = assignedFiltersForDashboard.find((f) => f.id === id);
    if (!changedFilter) return;
    const validationError = getFilterValidationError(changedFilter, value);
    setFilterValidationErrors((prev) => {
      const next = { ...prev };
      if (validationError) next[id] = validationError;
      else delete next[id];
      return next;
    });
    const newValues = { ...filterValues, [id]: value };
    setFilterValues(newValues);
    const nextQuery = buildQueryFromFilters(undefined, newValues);
    setQueryText(nextQuery);
    if (!validationError && String(changedFilter?.filterApply || '').toLowerCase() === 'live') {
      void applyFilters(nextQuery, { bypassValidation: true });
      setFilterUiStatus('Live filter updated.');
    }
  };

  const clearAllFilters = async () => {
    setSelectedFilterIds([]);
    setFilterValues({});
    setFilterValidationErrors({});
    setQueryText('');
    setFilterUiStatus('Cleared selected filters.');
    // Reset widgets to original datasource state when filters are cleared.
    await Promise.all(
      widgets
        .filter((w) => w.id && w.data_source_id)
        .map((w) => fetchWidgetData(w))
    );
  };

  const applyFilters = async (queryOverride?: string, options?: { bypassValidation?: boolean }) => {
    if (!options?.bypassValidation) {
      const requiredError = getRequiredFilterError();
      if (requiredError) {
        setFilterUiStatus(requiredError);
        return;
      }
      const validationError = getSelectedValidationError();
      if (validationError) {
        setFilterUiStatus(validationError);
        return;
      }
    }

    const q = (queryOverride ?? buildQueryFromFilters()).trim();
    setQueryText(q);
    if (!q || !q.toUpperCase().startsWith('SELECT')) {
      setFilterUiStatus('No valid query to apply.');
      return;
    }

    try {
      const response = await fetch('https://intelligentsalesman.com/ism1/API/api/unified_query.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (!response.ok) throw new Error(`Error executing query: ${response.statusText}`);
      const data = await response.json();
      if ((data as any)?.error) throw new Error((data as any).error);

      // Apply filtered response to dashboard widgets (table/text/chart will normalize accordingly).
      setWidgetApiData((prev) => {
        const next = { ...prev };
        widgets.forEach((w) => {
          if (!w.id) return;
          let normalized: any;
          if (w.visual_type === 'TABLE') {
            normalized = normalizeSharedTableResponse(data);
          } else if (w.visual_type === 'TEXT') {
            normalized = normalizeSharedTextResponse(data);
          } else {
            normalized = normalizeSharedApiResponse(data);
          }
          next[w.id] = { raw: data, normalized };
        });
        return next;
      });
      setFilterUiStatus(`Applied ${selectedFilterIds.length} filter(s).`);
    } catch (err: any) {
      setFilterUiStatus(err?.message || 'Failed to apply filters');
    }
  };

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
                  {assignedFiltersForDashboard.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          {assignedFiltersForDashboard.map((filter) => {
                            const checked = selectedFilterIds.includes(filter.id);
                            return (
                              <label key={filter.id} className="inline-flex items-center gap-2 text-xs text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => toggleFilterSelection(filter.id, e.target.checked)}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{filter.name}</span>
                                {isQueryPreviewEnabled(filter) && (
                                  <span className="ml-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">
                                    Query
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-[11px] bg-slate-600 text-white rounded hover:bg-slate-700"
                          onClick={clearAllFilters}
                        >
                          Clear All
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1 text-[11px] bg-blue-600 text-white rounded hover:bg-blue-700"
                          onClick={applyFilters}
                          disabled={
                            selectedFilterIds.length === 0 ||
                            selectedFilters.every((f) => String(f.filterApply || '').toLowerCase() === 'live')
                          }
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                    {selectedFilters.some(isQueryPreviewEnabled) && (
                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Generated Query (Editable)
                        </label>
                        <textarea
                          value={queryText}
                          onChange={(e) => setQueryText(e.target.value)}
                          className="w-full min-h-[86px] rounded-md border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                          placeholder="Query will be generated here based on selected filters..."
                        />
                        <p className="mt-1 text-[10px] text-slate-500">
                          This query is automatically built from your filter selections but remains editable.
                        </p>
                      </div>
                    )}
                    {selectedFilters.filter(hasEmptyQuery).length > 0 && (
                      <div className="mt-3 border-t border-slate-200 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedFilters.filter(hasEmptyQuery).map((filter) => {
                          const value = filterValues[filter.id] ?? '';
                          return (
                            <div key={filter.id} className="space-y-1">
                              <label className="block text-xs font-medium text-slate-700">
                                {filter.name}
                                {filter.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              {renderFilterControl(filter, value)}
                              {filterValidationErrors[filter.id] && (
                                <p className="text-[10px] text-red-600">{filterValidationErrors[filter.id]}</p>
                              )}
                              {filter.description && (
                                <p className="text-[10px] text-slate-500">{filter.description}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {filterUiStatus && <div className="mt-1 text-[11px] text-blue-600">{filterUiStatus}</div>}
                  </div>
                  )}
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
                      const widgetAssignedFilters = w.id
                        ? widgetAssignedFiltersByWidget[Number(w.id)] ?? []
                        : [];
                      const widgetId = Number(w.id);
                      const selectedIds = widgetSelectedFilterIds[widgetId] ?? widgetAssignedFilters.map((f) => f.id);
                      const currentValues = widgetFilterValues[widgetId] ?? {};
                      const currentErrors = widgetFilterValidationErrors[widgetId] ?? {};
                      const currentQuery = widgetQueryText[widgetId] ?? '';
                      const selectedWidgetFilters = widgetAssignedFilters.filter((f) => selectedIds.includes(f.id));
                      const buildWidgetQuery = (ids: number[], values: Record<number, unknown>) =>
                        buildQueryForFilterSet(widgetAssignedFilters, ids, values);
                      const setWidgetStatus = (msg: string) =>
                        setWidgetFilterStatus((prev) => ({ ...prev, [widgetId]: msg }));
                      const executeWidgetApply = async (
                        idsOverride: number[] = selectedIds,
                        valuesOverride: Record<number, unknown> = currentValues,
                        queryOverride?: string
                      ) => {
                        const selected = widgetAssignedFilters.filter((f) => idsOverride.includes(f.id));
                        const requiredMissing = selected.find((f) => {
                          if (!f.required) return false;
                          const val = valuesOverride[f.id];
                          if (Array.isArray(val)) return val.length === 0;
                          return val === undefined || val === null || String(val).trim() === '';
                        });
                        if (requiredMissing) {
                          setWidgetStatus(`${requiredMissing.name} is required.`);
                          return;
                        }
                        for (const f of selected) {
                          const vErr = getFilterValidationError(f, valuesOverride[f.id]);
                          if (vErr) {
                            setWidgetStatus(vErr);
                            return;
                          }
                        }
                        const queryToRun = ((queryOverride ?? currentQuery) || buildWidgetQuery(idsOverride, valuesOverride)).trim();
                        if (!queryToRun || !queryToRun.toUpperCase().startsWith('SELECT')) {
                          setWidgetStatus('No valid query to apply.');
                          return;
                        }
                        try {
                          const response = await fetch('https://intelligentsalesman.com/ism1/API/api/unified_query.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query: queryToRun }),
                          });
                          if (!response.ok) throw new Error(`Error executing query: ${response.statusText}`);
                          const filtered = await response.json();
                          if ((filtered as any)?.error) throw new Error((filtered as any).error);
                          if (w.id) {
                            let normalized: any;
                            if (w.visual_type === 'TABLE') normalized = normalizeSharedTableResponse(filtered);
                            else if (w.visual_type === 'TEXT') normalized = normalizeSharedTextResponse(filtered);
                            else normalized = normalizeSharedApiResponse(filtered);
                            setWidgetApiData((prev) => ({ ...prev, [w.id!]: { raw: filtered, normalized } }));
                          }
                          setWidgetStatus(`Applied ${idsOverride.length} filter(s).`);
                        } catch (applyErr: any) {
                          setWidgetStatus(applyErr?.message || 'Failed to apply widget filters');
                        }
                      };
                      return (
                        <div key={w.id!.toString()} className="bg-white">
                          {widgetAssignedFilters.length > 0 && (
                            <div className="px-3 py-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    {widgetAssignedFilters.map((f) => {
                                      const checked = selectedIds.includes(f.id);
                                      return (
                                        <label key={f.id} className="inline-flex items-center gap-1.5 text-[11px] text-slate-700">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => {
                                              const nextIds = e.target.checked
                                                ? (selectedIds.includes(f.id) ? selectedIds : [...selectedIds, f.id])
                                                : selectedIds.filter((id) => id !== f.id);
                                              setWidgetSelectedFilterIds((prev) => ({ ...prev, [widgetId]: nextIds }));
                                              if (!e.target.checked) {
                                                setWidgetFilterValues((prev) => {
                                                  const next = { ...(prev[widgetId] ?? {}) };
                                                  delete next[f.id];
                                                  return { ...prev, [widgetId]: next };
                                                });
                                                setWidgetFilterValidationErrors((prev) => {
                                                  const next = { ...(prev[widgetId] ?? {}) };
                                                  delete next[f.id];
                                                  return { ...prev, [widgetId]: next };
                                                });
                                              }
                                              const nextValues = widgetFilterValues[widgetId] ?? {};
                                              const nextQuery = buildWidgetQuery(nextIds, nextValues);
                                              setWidgetQueryText((prev) => ({ ...prev, [widgetId]: nextQuery }));
                                              // Live mode: apply immediately on selection changes.
                                              const hasLive = widgetAssignedFilters
                                                .filter((wf) => nextIds.includes(wf.id))
                                                .some((wf) => String(wf.filterApply || '').toLowerCase() === 'live');
                                              if (hasLive) {
                                                void executeWidgetApply(nextIds, nextValues, nextQuery);
                                              }
                                            }}
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <span>{f.name}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-[10px] bg-slate-600 text-white rounded hover:bg-slate-700"
                                    onClick={async () => {
                                      setWidgetSelectedFilterIds((prev) => ({ ...prev, [widgetId]: [] }));
                                      setWidgetFilterValues((prev) => ({ ...prev, [widgetId]: {} }));
                                      setWidgetFilterValidationErrors((prev) => ({ ...prev, [widgetId]: {} }));
                                      setWidgetQueryText((prev) => ({ ...prev, [widgetId]: '' }));
                                      setWidgetStatus('Cleared widget filters.');
                                      if (w.id) await fetchWidgetData(w);
                                    }}
                                  >
                                    Clear
                                  </button>
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700"
                                    onClick={() => void executeWidgetApply()}
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                              {selectedWidgetFilters.some(isQueryPreviewEnabled) && (
                                <div className="mt-2 border-t border-slate-200 pt-2">
                                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Generated Query (Editable)</label>
                                  <textarea
                                    value={currentQuery}
                                    onChange={(e) => setWidgetQueryText((prev) => ({ ...prev, [widgetId]: e.target.value }))}
                                    className="w-full min-h-[68px] rounded-md border border-slate-300 px-2 py-1 text-[11px] font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  />
                                </div>
                              )}
                              {selectedWidgetFilters.filter(hasEmptyQuery).length > 0 && (
                                <div className="mt-2 border-t border-slate-200 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {selectedWidgetFilters.filter(hasEmptyQuery).map((f) => {
                                    const value = currentValues[f.id] ?? '';
                                    const options = getFilterOptions(f);
                                    const hasError = Boolean(currentErrors[f.id]);
                                    const inputClass = `w-full rounded-md border px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 ${
                                      hasError ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-300'
                                    }`;
                                    return (
                                      <div key={f.id} className="space-y-1">
                                        <label className="block text-[11px] font-medium text-slate-700">{f.name}</label>
                                        {(f.type || '').toLowerCase() === 'select' ? (
                                          <select
                                            value={String(value)}
                                            onChange={(e) => {
                                              const nextVal = e.target.value;
                                              const errMsg = getFilterValidationError(f, nextVal);
                                              setWidgetFilterValidationErrors((prev) => ({
                                                ...prev,
                                                [widgetId]: {
                                                  ...(prev[widgetId] ?? {}),
                                                  ...(errMsg ? { [f.id]: errMsg } : {}),
                                                },
                                              }));
                                              if (!errMsg) {
                                                setWidgetFilterValidationErrors((prev) => {
                                                  const next = { ...(prev[widgetId] ?? {}) };
                                                  delete next[f.id];
                                                  return { ...prev, [widgetId]: next };
                                                });
                                              }
                                              setWidgetFilterValues((prev) => {
                                                const nextVals = { ...(prev[widgetId] ?? {}), [f.id]: nextVal };
                                                const q = buildWidgetQuery(selectedIds, nextVals);
                                                setWidgetQueryText((old) => ({ ...old, [widgetId]: q }));
                                                if (!errMsg && String(f.filterApply || '').toLowerCase() === 'live') {
                                                  void executeWidgetApply(selectedIds, nextVals, q);
                                                }
                                                return { ...prev, [widgetId]: nextVals };
                                              });
                                            }}
                                            className={inputClass}
                                          >
                                            <option value="">All {f.name}</option>
                                            {options.map((opt) => (
                                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <input
                                            type={(f.type || '').toLowerCase() === 'number' ? 'number' : (f.type || '').toLowerCase() === 'date' ? 'date' : 'text'}
                                            value={String(value)}
                                            onChange={(e) => {
                                              const nextVal = e.target.value;
                                              const errMsg = getFilterValidationError(f, nextVal);
                                              setWidgetFilterValidationErrors((prev) => ({
                                                ...prev,
                                                [widgetId]: {
                                                  ...(prev[widgetId] ?? {}),
                                                  ...(errMsg ? { [f.id]: errMsg } : {}),
                                                },
                                              }));
                                              if (!errMsg) {
                                                setWidgetFilterValidationErrors((prev) => {
                                                  const next = { ...(prev[widgetId] ?? {}) };
                                                  delete next[f.id];
                                                  return { ...prev, [widgetId]: next };
                                                });
                                              }
                                              setWidgetFilterValues((prev) => {
                                                const nextVals = { ...(prev[widgetId] ?? {}), [f.id]: nextVal };
                                                const q = buildWidgetQuery(selectedIds, nextVals);
                                                setWidgetQueryText((old) => ({ ...old, [widgetId]: q }));
                                                if (!errMsg && String(f.filterApply || '').toLowerCase() === 'live') {
                                                  void executeWidgetApply(selectedIds, nextVals, q);
                                                }
                                                return { ...prev, [widgetId]: nextVals };
                                              });
                                            }}
                                            className={inputClass}
                                            placeholder={f.placeholder || `Enter ${f.name}`}
                                          />
                                        )}
                                        {currentErrors[f.id] && <p className="text-[10px] text-red-600">{currentErrors[f.id]}</p>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {widgetFilterStatus[widgetId] && (
                                <div className="mt-1 text-[10px] text-blue-600">{widgetFilterStatus[widgetId]}</div>
                              )}
                            </div>
                          )}
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