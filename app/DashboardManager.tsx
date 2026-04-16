
import React, { useEffect, useState, useRef } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
// import 'leaflet/dist/leaflet.css';
// import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import ContextMenuTab from './ContextMenuTab'; // Adjust path as needed
import AssignFiltersTab from './AssignFiltersTab'; // Import the new component
import ReactDOM from 'react-dom';
// import { FiRefreshCw } from 'react-icons/fi'; // Unused
// import {
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip as RechartsTooltip,
//   Legend,
//   Cell,
// } from 'recharts'; // Unused
// ... existing interfaces and types ...
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamically import the map component (client-side only)
const _MapWidget = dynamic(() => import('../components/MapWidget'), { 
  ssr: false,
  loading: () => <div>Loading map...</div>
});
type DashboardType = 'BASIC' | 'STANDARD';
type VisualType = 'KPI' | 'CHART' | 'TABLE' | 'TEXT' | 'CUSTOM' | 'MAP';
type ChartType =
  | 'BAR'
  | 'PIE'
  | 'LINE'
  | 'DONUT'
  | 'AREA'
  | 'SCATTER'
  | 'HORIZONTAL_BAR'
  | 'STACKED_BAR'
  | 'MULTI_SERIES_LINE'
  | 'COMBO';
type SourceType = 'API' | 'SQL' | 'STATIC';
type HttpMethod = 'GET' | 'POST';

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; group: string }[] = [
  { value: 'BAR', label: 'Bar Chart', group: 'Comparison' },
  { value: 'HORIZONTAL_BAR', label: 'Horizontal Bar', group: 'Comparison' },
  { value: 'STACKED_BAR', label: 'Stacked Bar', group: 'Comparison' },
  { value: 'LINE', label: 'Line Chart', group: 'Trend' },
  { value: 'AREA', label: 'Area Chart', group: 'Trend' },
  { value: 'MULTI_SERIES_LINE', label: 'Multi-series Line', group: 'Trend' },
  { value: 'COMBO', label: 'Combo (Bar + Line)', group: 'Trend' },
  { value: 'SCATTER', label: 'Scatter Plot', group: 'Distribution' },
  { value: 'PIE', label: 'Pie Chart', group: 'Part-to-Whole' },
  { value: 'DONUT', label: 'Donut Chart', group: 'Part-to-Whole' },
];

const PANEL_FORMAT_OPTIONS: { value: string; label: string; visualType: VisualType }[] = [
  { value: 'KPI', label: 'KPI', visualType: 'KPI' },
  { value: 'GAUGE', label: 'Gauge', visualType: 'KPI' },
  { value: 'PROGRESS', label: 'Progress', visualType: 'KPI' },
  { value: 'CHART', label: 'Chart', visualType: 'CHART' },
  { value: 'TABLE', label: 'Table', visualType: 'TABLE' },
  { value: 'LIST', label: 'List', visualType: 'TABLE' },
  { value: 'TEXT', label: 'Text', visualType: 'TEXT' },
  { value: 'ALERT', label: 'Alert Text', visualType: 'TEXT' },
  { value: 'CUSTOM', label: 'Custom', visualType: 'CUSTOM' },
  { value: 'TIMELINE', label: 'Timeline', visualType: 'CUSTOM' },
  { value: 'MAP', label: 'Map', visualType: 'MAP' },
];

function inferPanelFormat(visualType?: VisualType, configJson?: Record<string, any> | null): string {
  const vt = (visualType ?? 'CHART') as VisualType;
  // MAP / CHART use visual_type directly in the Panel Format dropdown (no panel_variant).
  if (vt === 'MAP' || vt === 'CHART') return vt;
  const variant = String(configJson?.panel_variant ?? '').trim().toUpperCase();
  if (variant) return variant;
  return vt as string;
}

function resolvePanelFormatSelection(selection: string): { visualType: VisualType; panelVariant?: string } {
  const sel = selection.toUpperCase();
  const found = PANEL_FORMAT_OPTIONS.find((opt) => opt.value === sel);
  if (!found) return { visualType: 'CHART' };
  const base = found.visualType;
  if (sel === base) return { visualType: base };
  return { visualType: base, panelVariant: sel };
}

interface Dashboard {
  id: number;
  name: string;
  description?: string;
  type: DashboardType;
  page_name: string;
  tab_name: string;
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
  interaction_config_json?: any[] | null;
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

/** Parse lat/lng from a row (supports common key spellings). */
function getGeoCoords(obj: any): { lat: number; lng: number } | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const latRaw =
    obj.lat ?? obj.latitude ?? obj.Lat ?? obj.Latitude ?? obj.LAT ?? obj.y ?? obj.Y;
  const lngRaw =
    obj.lng ??
    obj.longitude ??
    obj.lon ??
    obj.long ??
    obj.Longitude ??
    obj.Lng ??
    obj.LON ??
    obj.x ??
    obj.X;
  if (latRaw === undefined || lngRaw === undefined) return null;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

/** Rows/objects that look like map markers (used before classifying arrays as chart/table). */
function isLikelyGeoPointArray(arr: any): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const s = arr[0];
  if (!s || typeof s !== 'object') return false;
  if (getGeoCoords(s)) return true;
  if (s.type === 'Feature' && s.geometry?.type === 'Point' && Array.isArray(s.geometry.coordinates)) return true;
  return false;
}

/**
 * Pull marker rows from API payloads (arrays, { data/locations/... }, GeoJSON).
 * Widget fetch stores { raw, normalized } — always pass response body here (e.g. apiData.raw).
 */
function extractMapLocationRows(source: any): any[] {
  if (source == null) return [];
  if (typeof source === 'string') {
    try {
      return extractMapLocationRows(JSON.parse(source));
    } catch {
      return [];
    }
  }
  if (Array.isArray(source)) {
    if (
      source.length >= 2 &&
      typeof source[0] === 'number' &&
      typeof source[1] === 'number'
    ) {
      // Coordinate tuple [lng, lat]
      return [{ lng: source[0], lat: source[1] }];
    }
    if (isLikelyGeoPointArray(source)) return source;
    const fromChildren = source.flatMap((item: any) => extractMapLocationRows(item));
    if (fromChildren.length) return fromChildren;
    return [];
  }
  if (typeof source !== 'object') return [];

  if (source.type === 'FeatureCollection' && Array.isArray(source.features)) {
    return source.features.flatMap((f: any) => extractMapLocationRows(f));
  }
  if (source.type === 'Feature' && source.geometry?.type === 'Point' && Array.isArray(source.geometry.coordinates)) {
    const [lng, lat] = source.geometry.coordinates;
    const label =
      source.properties?.label ?? source.properties?.name ?? source.properties?.title ?? '';
    return [{ lat: Number(lat), lng: Number(lng), label }];
  }

  const nestedKeys = ['locations', 'data', 'results', 'items', 'records', 'markers', 'points', 'rows', 'values'];
  for (const k of nestedKeys) {
    const v = (source as any)[k];
    if (v !== undefined && v !== null) {
      const got = extractMapLocationRows(v);
      if (got.length) return got;
    }
  }

  if (getGeoCoords(source)) {
    return [source];
  }

  return [];
}

export function normalizeApiResponse(raw: any): NormalizedResponse {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    if (Array.isArray(raw.data) && raw.data.length > 0 && isLikelyGeoPointArray(raw.data)) {
      return { kind: 'raw', raw };
    }

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
        if (typeof d === 'object') {
          return {
            ...d,
            label: d.label ?? d.name ?? d.key ?? String(d.x ?? ''),
            value: Number(d.value ?? d.y ?? 0),
          };
        }
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

    if (typeof raw.text === 'string') {
      return { kind: 'text', text: raw.text, raw };
    }

    return { kind: 'raw', raw };
  }

  if (Array.isArray(raw)) {
    if (isLikelyGeoPointArray(raw)) {
      return { kind: 'raw', raw };
    }
    if (raw.length > 0 && typeof raw[0] === 'object') {
      const columns = Object.keys(raw[0]);
      return { kind: 'table', columns, rows: raw, raw };
    }

    if (raw.length > 0 && (typeof raw[0] === 'string' || typeof raw[0] === 'number')) {
      return { kind: 'table', columns: ['value'], rows: raw.map(r => ({ value: r })), raw };
    }

    const data = raw.map((item: any, index: number) => {
      if (typeof item === 'object') {
        const label = item.label ?? item.name ?? item.id ?? item.key ?? '';
        const value = Number(item.value ?? item.count ?? item.total ?? 0);
        return { ...item, label: String(label), value };
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

export function normalizeTableResponse(raw: any): NormalizedTable {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    if (Array.isArray(raw.rows) && Array.isArray(raw.columns)) {
      return { kind: 'table', columns: raw.columns.map(String), rows: raw.rows, raw };
    }

    const candidateArray =
      (Array.isArray(raw.data) && raw.data) ||
      (Array.isArray(raw.results) && raw.results) ||
      (Array.isArray(raw.items) && raw.items) ||
      null;

    if (candidateArray) {
      if (candidateArray.length > 0 && typeof candidateArray[0] === 'object' && !Array.isArray(candidateArray[0])) {
        return { kind: 'table', columns: Object.keys(candidateArray[0]), rows: candidateArray, raw };
      }
      return { kind: 'table', columns: ['value'], rows: candidateArray.map((v: any) => ({ value: v })), raw };
    }
  }

  if (Array.isArray(raw)) {
    if (raw.length > 0 && typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
      return { kind: 'table', columns: Object.keys(raw[0]), rows: raw, raw };
    }
    return { kind: 'table', columns: ['value'], rows: raw.map((v: any) => ({ value: v })), raw };
  }

  return { kind: 'table', columns: ['value'], rows: [], raw };
}

/** API → text panel: stringifies objects so TEXT widgets show live data clearly */
export function normalizeTextResponse(raw: any): { kind: 'text'; text: string; raw?: any } {
  if (raw == null) return { kind: 'text', text: '', raw };
  if (typeof raw === 'string') return { kind: 'text', text: raw, raw };
  if (typeof raw === 'object') {
    if (typeof raw.text === 'string') return { kind: 'text', text: raw.text, raw };
    if (typeof raw.message === 'string') return { kind: 'text', text: raw.message, raw };
    if (typeof raw.body === 'string') return { kind: 'text', text: raw.body, raw };
    return { kind: 'text', text: JSON.stringify(raw, null, 2), raw };
  }
  return { kind: 'text', text: String(raw), raw };
}

function escapeHtmlText(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeCommaSeparatedNames(value: unknown): string {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(',');
}

/* -------------------- Presentational components -------------------- */

const DashboardCard: React.FC<{
  dashboard: Dashboard;
  onSelect: () => void;
  isSelected: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ dashboard, onSelect, isSelected, onDragOver, onDrop, onEdit, onDelete }) => (
  <div
    className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500 border-2 border-blue-500' : ''}`}
    onClick={onSelect}
    onDragOver={onDragOver}
    onDrop={onDrop}
  >
    <div className="flex items-start justify-between gap-2">
      {/* Left: Name & description */}
      <div>
        <h3 className="font-semibold text-lg text-blue-900">{dashboard.name}</h3>
        {dashboard.description && (
          <p className="text-sm text-gray-600 mt-1">{dashboard.description}</p>
        )}
        {(dashboard.page_name || dashboard.tab_name) && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {dashboard.page_name && (
              <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Page: {dashboard.page_name}
              </span>
            )}
            {dashboard.tab_name && (
              <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Tab: {dashboard.tab_name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Type badge + icon buttons */}
      <div className="flex items-center gap-2">
        {dashboard.type === 'STANDARD' && (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded border border-blue-300">
            STANDARD
          </span>
        )}
        {dashboard.type === 'BASIC' && (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-300">
            BASIC
          </span>
        )}

        {/* Edit icon button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
          title="Edit dashboard"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-8.5 8.5a2 2 0 0 1-.878.515l-3 0.75a1 1 0 0 1-1.212-1.212l0.75-3a2 2 0 0 1 .515-.878l8.5-8.5z" />
          </svg>
        </button>

        {/* Delete icon button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-600 text-white hover:bg-red-700"
          title="Delete dashboard"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.5 3a1.5 1.5 0 0 1 1.415-.999h.17A1.5 1.5 0 0 1 11.5 3H15a1 1 0 1 1 0 2h-.293l-.62 9.3A2 2 0 0 1 12.094 16H7.906a2 2 0 0 1-1.993-1.7L5.293 5H5a1 1 0 0 1 0-2h3.5zm-1.7 2 0.58 8.7a1 1 0 0 0 .996.9h4.188a1 1 0 0 0 .996-.9L13.2 5H6.8z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
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

export const WidgetComponent: React.FC<{
  widget: Widget;
  dataSource?: DataSource;
  apiData?: any;
  isLoading?: boolean;
  error?: string;
  onDragStart?: (e: React.DragEvent) => void;
  isDraggable?: boolean;
  contextMenus: any[];                             // Add this
  widgetContextMenuAssignments: any[];
}> = ({ widget, dataSource, apiData, isLoading, error, onDragStart, isDraggable = false, contextMenus, widgetContextMenuAssignments }) => {
  const cfg = widget.config_json || {};
  const normalized: NormalizedResponse | null = apiData?.normalized ?? (apiData ? normalizeApiResponse(apiData) : null);

  const chartCfg: any = (cfg.chart_config && typeof cfg.chart_config === 'object') ? cfg.chart_config : {};

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

  // State for context menus
  const [topRightMenu, setTopRightMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  
 const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; menus: any[] }>({
  visible: false,
  x: 0,
  y: 0,
  menus: [],
});
const [openSubmenuPath, setOpenSubmenuPath] = useState<number[]>([]);
const getParentId = (menu: any) => {
  if (!menu) return null;
  if (menu.parent_id !== undefined && menu.parent_id !== null) return Number(menu.parent_id);
  if (menu.parentId !== undefined && menu.parentId !== null) return Number(menu.parentId);
  return null;
};
const buildMenuHierarchy = (menus: any[]) => {
  const menuMap = new Map();
  menus.forEach(m => menuMap.set(m.id, { ...m, children: [] }));

  const roots: any[] = [];

  menus.forEach(m => {
    const parentId = getParentId(m);
    if (parentId && menuMap.has(parentId)) {
      menuMap.get(parentId).children.push(menuMap.get(m.id));
    } else {
      roots.push(menuMap.get(m.id));
    }
  });

  const result: any[] = [];
  const traverse = (node: any, depth = 0) => {
    result.push({ ...node, depth });
    node.children.forEach((child: any) => traverse(child, depth + 1));
  };
  roots.forEach(root => traverse(root));
  return result;
};
const buildMenuTree = (menus: any[]) => {
  const menuMap = new Map();
  menus.forEach(m => menuMap.set(m.id, { ...m, children: [] }));

  const roots: any[] = [];

  menus.forEach(m => {
    const parentId = getParentId(m);
    if (parentId && menuMap.has(parentId)) {
      menuMap.get(parentId).children.push(menuMap.get(m.id));
    } else {
      roots.push(menuMap.get(m.id));
    }
  });

  return roots;
};
const RecursiveMenu: React.FC<{
  menus: any[];
  level?: number;
  parentPath?: number[];
}> = ({ menus, level = 0, parentPath = [] }) => {
  return (
    <div
      className="absolute bg-white shadow-lg rounded-md py-1 z-50"
      style={{
        top: 0,
        left: level === 0 ? 0 : '100%',
        minWidth: '180px',
        border: '1px solid #ccc',
      }}
    >
      {menus.map(menu => {
        const currentPath = [...parentPath, menu.id];
        const isOpen = openSubmenuPath.length > level && openSubmenuPath[level] === menu.id;

        return (
          <div
            key={menu.id}
            className="relative group"
            onMouseEnter={() => setOpenSubmenuPath(currentPath)}
            onMouseLeave={() => setOpenSubmenuPath(parentPath)}
          >
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex justify-between items-center"
              onClick={() => {
                setContextMenu({ ...contextMenu, visible: false });
                handleMenuAction(menu.event_name || menu.menu_name);
              }}
            >
              <span>{menu.menu_name}</span>
              {menu.children.length > 0 && (
                <span className="ml-2 text-gray-400">{'▶'}</span>
              )}
            </button>

            {/* Render submenu if open */}
            {menu.children.length > 0 && isOpen && (
              <RecursiveMenu menus={menu.children} level={level + 1} parentPath={currentPath} />
            )}
          </div>
        );
      })}
    </div>
  );
};
// Helper: collect the root and all descendant menus from full contextMenus list
const collectDescendants = (rootId: number, allMenus: any[]): any[] => {
  const byId = new Map<number, any>();
  allMenus.forEach(m => byId.set(m.id, { ...m }));

  const visited = new Set<number>();
  const stack = [rootId];
  const out: any[] = [];

  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = byId.get(id);
    if (!node) continue;
    out.push(node);

    // Add children of current node to stack
    for (const m of allMenus) {
      if (m.parent_id === id && !visited.has(m.id)) {
        stack.push(m.id);
      }
    }
  }

  return out;
};

const handleWidgetContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  // Find assigned context menu IDs for this widget
  const assignedMenuIds = widgetContextMenuAssignments
    .filter(a => a.widget_id === widget.id)
    .map(a => a.context_menu_id);

  // Filter contextMenus to only those assigned to this widget
  const assignedMenus = contextMenus.filter(menu => assignedMenuIds.includes(menu.id));

  if (assignedMenus.length === 0) {
    // No assigned menus, do not show context menu
    return;
  }

  // Calculate position within viewport
  const x = Math.min(e.clientX, window.innerWidth - 200);
  const y = Math.min(e.clientY, window.innerHeight - 300);

  setContextMenu({ visible: true, x, y, menus: assignedMenus });
};

  // Ref for the widget container
  const widgetRef = useRef<HTMLDivElement>(null);

  // Close context menus when clicking elsewhere
 // Close context menus when clicking elsewhere
// Close menus ONLY when clicking outside the widget
// Close context menus when clicking elsewhere
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (!widgetRef.current) return;

    // If click is inside the widget, do nothing
    if (widgetRef.current.contains(e.target as Node)) {
      return;
    }

    // Click is truly outside -> close menus
    if (topRightMenu.visible) {
      setTopRightMenu({ visible: false, x: 0, y: 0 });
    }
    if (contextMenu.visible) {
      setContextMenu({ visible: false, x: 0, y: 0, menus: [] });
      setOpenSubmenuPath([]); // Reset submenu path when closing
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [topRightMenu.visible, contextMenu.visible]);

  // Handle three-dot icon click for top-right menu
  const handleTopRightMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Close any existing context menu
    // setContextMenu({ visible: false, x: 0, y: 0, barData: null });
    
    // Toggle top-right menu
    if (topRightMenu.visible) {
      setTopRightMenu({ visible: false, x: 0, y: 0 });
    } else {
      // Ensure coordinates are within viewport
      const x = Math.min(e.clientX, window.innerWidth - 160);
      const y = Math.min(e.clientY, window.innerHeight - 200);
      setTopRightMenu({ visible: true, x, y });
    }
  };

  // Handle right-click on bar for context menu
 

  // Handle menu actions
  const handleMenuAction = (action: string, itemData?: any) => {
  // Close all menus
  setTopRightMenu({ visible: false, x: 0, y: 0 });
  setContextMenu({ visible: false, x: 0, y: 0, menus: [] });
  setOpenSubmenuPath([]); // Reset submenu path

  switch (action) {
    case 'viewDetails':
      alert(`Viewing details for: ${itemData?.label ?? widget.title}`);
      break;
    case 'exportData':
      alert(`Exporting data for: ${itemData?.label ?? widget.title}`);
      break;
    case 'drillDown':
      alert(`Drill down for: ${itemData?.label ?? widget.title}`);
      break;
    default:
      alert(`Action: ${action} for item: ${itemData?.label ?? widget.title}`);
      break;
  }
};

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

  // Keep table-related hooks at component top level to preserve hook order.
  const tableNormalized =
    normalized && normalized.kind === 'table'
      ? normalized
      : apiData?.normalized && apiData.normalized.kind === 'table'
        ? apiData.normalized
        : null;
  const tableRows = React.useMemo<any[]>(() => {
    if (tableNormalized && Array.isArray(tableNormalized.rows)) return tableNormalized.rows;
    if (Array.isArray(apiData?.rows)) return apiData.rows;
    if (Array.isArray(cfg.rows)) return cfg.rows;
    return [];
  }, [tableNormalized, apiData, cfg.rows]);

  const tableColumns = React.useMemo<string[]>(() => {
    // 1) Prefer explicit API columns when available (keeps server ordering).
    if (tableNormalized && Array.isArray(tableNormalized.columns) && tableNormalized.columns.length > 0) {
      return tableNormalized.columns.map(String);
    }
    if (Array.isArray(apiData?.columns) && apiData.columns.length > 0) {
      return apiData.columns.map((c: any) => String(c));
    }
    if (Array.isArray(cfg.columns) && cfg.columns.length > 0) {
      return cfg.columns.map((c: any) => String(c));
    }

    // 2) Otherwise derive all columns from every row (not only first row).
    const ordered = new Set<string>();
    tableRows.forEach((row: any) => {
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        Object.keys(row).forEach((k) => ordered.add(k));
      } else {
        ordered.add('value');
      }
    });
    return ordered.size > 0 ? Array.from(ordered) : ['Column'];
  }, [tableNormalized, apiData, cfg.columns, tableRows]);

  const renderTableCellValue = (row: any, column: string) => {
    const directValue = row?.[column];
    const caseInsensitiveKey =
      directValue !== undefined
        ? null
        : Object.keys(row || {}).find((k) => k.toLowerCase() === column.toLowerCase()) ?? null;
    const value = directValue !== undefined
      ? directValue
      : (caseInsensitiveKey ? row?.[caseInsensitiveKey] : undefined);

    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 5;
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

  const [MapComponents, setMapComponents] = React.useState<any>(null);
  React.useEffect(() => {
    let mounted = true;
    const loadMapComponents = async () => {
      const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');
      if (mounted) setMapComponents({ MapContainer, TileLayer, Marker, Popup });
    };
    loadMapComponents();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [tableRows.length]);

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

    const panelVariant = inferPanelFormat(widget.visual_type, cfg);

    // KPI
    if (widget.visual_type === 'KPI') {
      if (panelVariant === 'GAUGE' || panelVariant === 'PROGRESS') {
        const raw = Number((normalized && normalized.kind === 'kpi' ? normalized.value : undefined) ?? apiData?.value ?? cfg.value ?? 0);
        const percent = Math.max(0, Math.min(100, raw));
        if (panelVariant === 'GAUGE') {
          return (
            <div className="p-4">
              <h4 className="text-lg font-semibold">{widget.title}</h4>
              <div className="mt-4 flex justify-center">
                <div className="relative w-36 h-36 rounded-full" style={{ background: `conic-gradient(#2563eb ${percent * 3.6}deg, #e5e7eb 0deg)` }}>
                  <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center text-xl font-bold text-slate-700">
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
   // MAP widget rendering logic
if (widget.visual_type === 'MAP') {
  const wrapped = apiData && typeof apiData === 'object' && !Array.isArray(apiData) && 'raw' in apiData;
  const rawPayload = wrapped ? (apiData as any).raw : apiData;

  let locations: any[] = extractMapLocationRows(rawPayload);

  if (!locations.length && normalized) {
    locations = extractMapLocationRows((normalized as any).raw);
  }
  if (!locations.length && normalized?.kind === 'table' && Array.isArray(normalized.rows)) {
    locations = extractMapLocationRows(normalized.rows);
  }
  if (!locations.length && normalized?.kind === 'chart' && Array.isArray((normalized as any).data)) {
    locations = extractMapLocationRows((normalized as any).data);
  }

  const validLocations = locations
    .map(loc => {
      if (loc?.geometry?.type === 'Point' && Array.isArray(loc.geometry.coordinates)) {
        const [lng, lat] = loc.geometry.coordinates;
        return {
          lat: Number(lat),
          lng: Number(lng),
          label: loc.properties?.label ?? loc.properties?.name ?? loc.properties?.title ?? '',
        };
      }
      const c = getGeoCoords(loc);
      if (!c) return null;
      return {
        lat: c.lat,
        lng: c.lng,
        label: String(loc.label ?? loc.name ?? loc.title ?? ''),
      };
    })
    .filter((loc): loc is { lat: number; lng: number; label: string } => loc !== null && !Number.isNaN(loc.lat) && !Number.isNaN(loc.lng));

  if (!validLocations.length) {
    const rawPreview = (() => {
      try {
        return JSON.stringify(rawPayload, null, 2);
      } catch {
        return String(rawPayload ?? '');
      }
    })();
    return (
      <div className="p-4">
        <h4 className="text-lg font-semibold">{widget.title}</h4>
        <div className="mt-4 text-gray-500">
          No valid location data available.
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Expected examples: array of objects with lat/lng or latitude/longitude, coordinate tuple [lng,lat], or GeoJSON Point/FeatureCollection.
        </div>
        <pre className="mt-3 max-h-40 overflow-auto text-[11px] leading-4 bg-slate-50 border border-slate-200 rounded p-2 text-slate-600">
{rawPreview}
        </pre>
      </div>
    );
  }

  // Show loading while components are being imported
  if (!MapComponents) {
    return (
      <div className="p-4">
        <h4 className="text-lg font-semibold">{widget.title}</h4>
        <div className="mt-4 text-gray-500">Loading map...</div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents;

  return (
    <div className="p-4 h-full flex flex-col">
      <h4 className="text-lg font-semibold mb-2">{widget.title}</h4>
      <div className="flex-1">
        <MapContainer 
          center={[validLocations[0].lat, validLocations[0].lng]} 
          zoom={10} 
          style={{ height: '300px', width: '100%' }}
          whenReady={(event: any) => {
            // Leaflet can initialize before the grid/tab width is final.
            // Guard delayed invalidation to avoid calling after unmount.
            const map = event?.target;
            const safeInvalidate = () => {
              if (!map || !map._container) return;
              try {
                map.invalidateSize();
              } catch {
                // Map may be detached during rapid tab/dashboard switches.
              }
            };
            setTimeout(safeInvalidate, 0);
            setTimeout(safeInvalidate, 250);
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {validLocations.map((loc, idx) => (
            <Marker key={idx} position={[loc.lat, loc.lng]}>
              <Popup>{loc.label || `Location ${idx + 1}`}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

    // Chart
    if (widget.visual_type === 'CHART') {
      const chartNormalized = normalized && normalized.kind === 'chart' ? normalized : (apiData?.normalized && apiData.normalized.kind === 'chart' ? apiData.normalized : null);
      const chartData = chartNormalized ? chartNormalized.data : (apiData?.data ?? cfg.data ?? []);
      const maxValue = (chartNormalized && chartNormalized.max) ?? apiData?.max ?? cfg.max ?? (chartData.length ? Math.max(...chartData.map((x: any) => Number(x.value || 0))) : 100);
      const effectiveChartType = ((cfg.chart_variant as ChartType | undefined) ?? widget.chart_type ?? 'BAR') as ChartType;

      if (!chartData || chartData.length === 0) {
        return (
          <div className="p-4">
            <h4 className="text-lg font-semibold">{widget.title}</h4>
            <div className="mt-4 text-gray-500">No data available</div>
          </div>
        );
      }

      const trendValue = cfg.trend ?? chartNormalized?.raw?.trend;
      const trendDirection = cfg.trend_direction ?? chartNormalized?.raw?.trend_direction;
      const multiSeriesKeys = (() => {
        const sample = chartData.find((it: any) => it && typeof it === 'object') || {};
        const candidates = Object.keys(sample).filter((k) => !['label', 'name', 'x', 'y'].includes(k));
        const numericCandidates = candidates.filter((k) => chartData.some((row: any) => Number.isFinite(Number(row?.[k]))));
        if (Array.isArray(cfg.series_keys) && cfg.series_keys.length > 0) {
          return cfg.series_keys.filter((k: string) => numericCandidates.includes(k));
        }
        return numericCandidates.length > 0 ? numericCandidates.slice(0, 4) : ['value'];
      })();
      const safeSeriesRows = chartData.map((item: any, i: number) => {
        const label = String(item?.label ?? item?.name ?? `Item ${i + 1}`);
        const series = multiSeriesKeys.map((k: string) => Math.max(0, Number(item?.[k] ?? 0)));
        return { label, series, raw: item };
      });
      const multiSeriesMax = safeSeriesRows.length > 0
        ? Math.max(
            1,
            ...safeSeriesRows.map((row: any) =>
              multiSeriesKeys.length > 0
                ? Math.max(...row.series, 0)
                : Math.max(0, Number(row.raw?.value ?? 0))
            )
          )
        : 1;

      /* ---------------- PIE ---------------- */
      if (effectiveChartType === 'PIE' || effectiveChartType === 'DONUT') {
        const total = chartData.reduce((s: number, it: any) => s + Math.max(0, Number(it.value || 0)), 0);
        if (total <= 0) {
          return (
            <div className="p-4">
              <h4 className="text-lg font-semibold">{widget.title}</h4>
              <div className="mt-4 text-gray-500">No data available</div>
            </div>
          );
        }

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
                {effectiveChartType === 'DONUT' && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-full" />
                )}
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
      if (effectiveChartType === 'LINE' || effectiveChartType === 'AREA' || effectiveChartType === 'SCATTER') {
        const len = chartData.length;
        const points = chartData.map((item: any, i: number) => {
          const x = len === 1 ? 50 : (i / (len - 1)) * 100;
          const y = 100 - ((Number(item.value || 0) / Math.max(1, Number(maxValue))) * 100);
          return `${x},${y}`;
        }).join(' ');
        const areaPath = `0,100 ${points} 100,100`;

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
                  {showAxes && <line x1="0" y1="100" x2="100" y2="100" stroke="#e5e7eb" strokeWidth="0.5" />}
                  {effectiveChartType === 'AREA' && (
                    <polygon points={areaPath} fill={strokeColor} fillOpacity={0.2} />
                  )}
                  {effectiveChartType !== 'SCATTER' && (
                    <polyline
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={lineStrokeWidth}
                      points={points}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
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
      const ticks = Array.from({ length: yTicks }, (_, i) => {
        const val = Math.round(((yTicks - 1 - i) / (yTicks - 1)) * Number(maxValue));
        return val;
      });

      if (effectiveChartType === 'HORIZONTAL_BAR') {
        return (
          <div className="p-4" ref={widgetRef}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h4 className="text-lg font-semibold">{widget.title}</h4>
                {renderTrend(trendValue, trendDirection)}
              </div>
              {showLegend && chartCfg.legend_title && <div className="text-xs text-gray-500">{chartCfg.legend_title}</div>}
            </div>
            <div className="mt-4 space-y-2">
              {chartData.map((item: any, index: number) => {
                const rawVal = Number(item.value ?? 0);
                const safeMax = (typeof maxValue === 'number' && maxValue > 0) ? Number(maxValue) : 1;
                const pct = Math.max(2, Math.min(100, ((rawVal / safeMax) * 100) || 0));
                const color = (chartCfg.series_colors && chartCfg.series_colors[index]) ? chartCfg.series_colors[index] : barColor;
                return (
                  <div key={index}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="h-3 rounded bg-slate-100 overflow-hidden">
                      <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {dataSource && <div className="mt-2 text-xs text-gray-500">Source: {dataSource.name}</div>}
          </div>
        );
      }

      if (effectiveChartType === 'STACKED_BAR' && multiSeriesKeys.length >= 1) {
        const stackedMax = Math.max(1, ...safeSeriesRows.map((r: any) => r.series.reduce((s: number, v: number) => s + v, 0)));
        return (
          <div className="p-4" ref={widgetRef}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h4 className="text-lg font-semibold">{widget.title}</h4>
                {renderTrend(trendValue, trendDirection)}
              </div>
            </div>
            <div className="mt-3 flex-1 h-56 flex items-end space-x-2">
              {safeSeriesRows.map((row: any, rowIndex: number) => (
                <div key={rowIndex} className="flex-1 flex flex-col items-center h-full">
                  <div className="w-full h-full flex items-end">
                    <div className="w-full rounded-t overflow-hidden flex flex-col-reverse bg-slate-100" style={{ height: `${Math.max(2, (row.series.reduce((s: number, v: number) => s + v, 0) / stackedMax) * 100)}%` }}>
                      {row.series.map((v: number, seriesIdx: number) => (
                        <div
                          key={seriesIdx}
                          style={{
                            height: `${Math.max(0, (v / Math.max(1, row.series.reduce((s: number, x: number) => s + x, 0))) * 100)}%`,
                            backgroundColor: colors[seriesIdx % colors.length],
                          }}
                          title={`${multiSeriesKeys[seriesIdx]}: ${v}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs mt-1 truncate text-center" style={{ maxWidth: '100%' }}>{row.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {multiSeriesKeys.map((k: string, i: number) => (
                <div key={k} className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span>{k}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (effectiveChartType === 'MULTI_SERIES_LINE' && multiSeriesKeys.length >= 1) {
        const len = safeSeriesRows.length;
        return (
          <div className="p-4">
            <div className="flex items-center">
              <h4 className="text-lg font-semibold">{widget.title}</h4>
              {renderTrend(trendValue, trendDirection)}
            </div>
            <div className="mt-3">
              <svg viewBox="0 0 100 100" className="w-full h-56">
                {multiSeriesKeys.map((k: string, si: number) => {
                  const pts = safeSeriesRows.map((row: any, i: number) => {
                    const x = len === 1 ? 50 : (i / (len - 1)) * 100;
                    const y = 100 - ((Number(row.raw?.[k] ?? 0) / multiSeriesMax) * 100);
                    return `${x},${y}`;
                  }).join(' ');
                  return (
                    <g key={k}>
                      <polyline fill="none" stroke={colors[si % colors.length]} strokeWidth={lineStrokeWidth} points={pts} />
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {multiSeriesKeys.map((k: string, i: number) => (
                <div key={k} className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span>{k}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (effectiveChartType === 'COMBO' && multiSeriesKeys.length >= 1) {
        const len = safeSeriesRows.length;
        const barKey = multiSeriesKeys[0];
        const lineKey = multiSeriesKeys[1] ?? multiSeriesKeys[0];
        return (
          <div className="p-4">
            <div className="flex items-center">
              <h4 className="text-lg font-semibold">{widget.title}</h4>
              {renderTrend(trendValue, trendDirection)}
            </div>
            <div className="mt-3">
              <svg viewBox="0 0 100 100" className="w-full h-56">
                {safeSeriesRows.map((row: any, i: number) => {
                  const x = len === 1 ? 50 : (i / (len - 1)) * 100;
                  const v = Number(row.raw?.[barKey] ?? row.raw?.value ?? 0);
                  const y = 100 - ((v / multiSeriesMax) * 100);
                  return <rect key={`b-${i}`} x={Math.max(0, x - 3)} y={y} width={6} height={Math.max(2, 100 - y)} fill={colors[0]} opacity={0.8} />;
                })}
                <polyline
                  fill="none"
                  stroke={colors[1] ?? '#2563eb'}
                  strokeWidth={lineStrokeWidth}
                  points={safeSeriesRows.map((row: any, i: number) => {
                    const x = len === 1 ? 50 : (i / (len - 1)) * 100;
                    const y = 100 - ((Number(row.raw?.[lineKey] ?? row.raw?.value ?? 0) / multiSeriesMax) * 100);
                    return `${x},${y}`;
                  }).join(' ')}
                />
              </svg>
            </div>
            <div className="mt-2 text-xs text-gray-600 flex gap-4">
              <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: colors[0] }} />{barKey} (bar)</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: colors[1] ?? '#2563eb' }} />{lineKey} (line)</span>
            </div>
          </div>
        );
      }

      return (
        <div className="p-4" ref={widgetRef}>
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
                const visiblePct = Math.max(2, Math.min(100, pct));
                const color = (chartCfg.series_colors && chartCfg.series_colors[index]) ? chartCfg.series_colors[index] : barColor;

                return (
                 <div 
  key={index} 
  className="flex flex-col items-center flex-1 h-full"
>
  <div className="w-full flex-1 flex items-end">
    <div
      className="w-full rounded-t transition-colors"
      style={{ height: `${visiblePct}%`, backgroundColor: color }}
      title={`${item.label}: ${item.value}`}
    >
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

          <div className="mt-2 flex justify-between items-center">
            <div className="text-xs text-gray-500">{yAxisLabel}</div>
            <div className="text-xs text-gray-500">{xAxisLabel}</div>
          </div>

          {dataSource && <div className="mt-2 text-xs text-gray-500">Source: {dataSource.name}</div>}

          {/* Context Menu */}
         {/* Context Menu - Replace your existing context menu rendering with this */}

        </div>
      );
    }

    // Table
    if (widget.visual_type === 'TABLE') {
      if (panelVariant === 'LIST') {
        return (
          <div className="p-4">
            <h4 className="text-lg font-semibold">{widget.title}</h4>
            <div className="mt-3 space-y-2">
              {(tableRows || []).map((r: any, i: number) => (
                <div key={i} className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  {tableColumns.slice(0, 3).map((c: string, idx: number) => (
                    <div key={c} className={idx === 0 ? 'font-medium text-slate-800' : 'text-slate-600'}>
                      {String(renderTableCellValue(r, c) ?? '')}
                    </div>
                  ))}
                </div>
              ))}
              {(!tableRows || tableRows.length === 0) && <div className="text-sm text-slate-500">No list data available</div>}
            </div>
          </div>
        );
      }
      return (
        <div className="p-4">
          <h4 className="text-lg font-semibold">{widget.title}</h4>
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
                          {renderTableCellValue(r, c)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
    }

    // Text — static body in config_json.text (or body); optional data source fills when static is empty
    if (widget.visual_type === 'TEXT') {
      const staticBody = (cfg.text ?? cfg.body ?? '') as string;
      const apiTextNormalized =
        normalized && normalized.kind === 'text'
          ? (normalized as { text: string }).text
          : apiData?.normalized && (apiData.normalized as NormalizedResponse).kind === 'text'
            ? (apiData.normalized as { text: string }).text
            : '';
      const apiFallback =
        apiData?.raw !== undefined && apiData?.raw !== null
          ? typeof apiData.raw === 'string'
            ? apiData.raw
            : JSON.stringify(apiData.raw, null, 2)
          : '';

      const textContent =
        String(staticBody).trim() !== ''
          ? staticBody
          : apiTextNormalized !== ''
            ? apiTextNormalized
            : apiFallback;

      const renderHtml = Boolean(cfg.render_as_html);
      const textClasses = panelVariant === 'ALERT' ? 'rounded border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2' : '';

      if (!textContent || String(textContent).trim() === '') {
        return (
          <div className="p-4 text-gray-500 italic">
            <h4 className="text-lg font-semibold">{widget.title}</h4>
            <div className="mt-2 text-sm">
              No text content yet. Add a body in the widget editor, or attach a data source.
            </div>
          </div>
        );
      }

      return (
        <div className="p-4">
          <h4 className="text-lg font-semibold">{widget.title}</h4>
          {renderHtml ? (
            <div
              className={`mt-2 text-gray-700 text-sm ${textClasses}`}
              dangerouslySetInnerHTML={{ __html: textContent }}
            />
          ) : (
            <div className={`mt-2 text-gray-700 whitespace-pre-wrap text-sm ${textClasses}`}>
              {escapeHtmlText(textContent)}
            </div>
          )}
        </div>
      );
    }

    // Custom — config_json.custom plus optional data source payload
    if (widget.visual_type === 'CUSTOM') {
      if (panelVariant === 'TIMELINE') {
        const rows = Array.isArray(apiData?.data) ? apiData.data : (Array.isArray(apiData) ? apiData : []);
        return (
          <div className="p-4">
            <h4 className="text-lg font-semibold">{widget.title}</h4>
            <div className="mt-3 space-y-3">
              {rows.slice(0, 20).map((item: any, idx: number) => (
                <div key={idx} className="relative pl-5">
                  <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-blue-600" />
                  <div className="text-sm font-medium text-slate-800">{String(item?.title ?? item?.label ?? item?.name ?? `Event ${idx + 1}`)}</div>
                  <div className="text-xs text-slate-500">{String(item?.date ?? item?.time ?? item?.timestamp ?? '')}</div>
                </div>
              ))}
              {rows.length === 0 && <div className="text-sm text-slate-500">No timeline data available</div>}
            </div>
          </div>
        );
      }
      const customPayload = cfg.custom ?? {};
      const hasApi = apiData?.raw !== undefined && apiData?.raw !== null;

      return (
        <div className="p-4 flex flex-col h-full min-h-0">
          <h4 className="text-lg font-semibold">{widget.title}</h4>
          <div className="mt-3 flex-1 min-h-0 flex flex-col gap-3">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Configuration</div>
              <pre className="bg-gray-50 border border-gray-200 p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(customPayload, null, 2)}
              </pre>
            </div>
            {hasApi && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Data source</div>
                <pre className="bg-gray-50 border border-gray-200 p-3 rounded text-xs overflow-auto max-h-48">
                  {typeof apiData.raw === 'string'
                    ? apiData.raw
                    : JSON.stringify(apiData.raw, null, 2)}
                </pre>
              </div>
            )}
            {!hasApi && (
              <p className="text-xs text-gray-500">
                Optional: attach a data source to merge live API data with the configuration above.
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="p-4">
        <h4 className="text-lg font-semibold">{widget.title}</h4>
        <p className="mt-2 text-gray-600">Widget content for {widget.visual_type}</p>
      </div>
    );
  };

  return (
    <div
      className="rounded-lg shadow overflow-hidden h-full relative"
      style={{ backgroundColor: widget.background_color || 'white' }}
      draggable={isDraggable}
      onDragStart={onDragStart}
      ref={widgetRef}
      onContextMenu={handleWidgetContextMenu}
    >
      {/* Three-dot menu icon */}
      {widget.interaction_config_json && Array.isArray(widget.interaction_config_json) && widget.interaction_config_json.length > 0 && (
        <button
          onClick={handleTopRightMenuClick}
          className="absolute top-2 right-2 z-20 p-1 rounded hover:bg-gray-200 text-gray-600"
          title="Widget menu"
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag start on menu click
        >
          &#8942;
        </button>
      )}

      {/* Top-right menu dropdown - rendered in portal to avoid clipping */}
      {topRightMenu.visible && ReactDOM.createPortal(
        <div
          className="fixed bg-white border rounded shadow-md z-50"
          style={{ top: topRightMenu.y, left: topRightMenu.x, minWidth: '150px' }}
          onClick={e => e.stopPropagation()}
        >
          {widget.interaction_config_json && Array.isArray(widget.interaction_config_json) && widget.interaction_config_json.map((opt: any, idx: number) => (
            <div
              key={idx}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleMenuAction(opt.action);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>,
        document.body
      )}

     {contextMenu.visible && ReactDOM.createPortal(
  <div
    className="fixed z-50"
    style={{ top: contextMenu.y, left: contextMenu.x }}
    onClick={e => e.stopPropagation()}
    onContextMenu={e => e.preventDefault()}
  >
    <RecursiveMenu menus={buildMenuTree(contextMenu.menus)} />
  </div>,
  document.body
)}

      {/* Context menu for bar right-click - rendered in portal to avoid clipping */}
     

      {isDraggable && (
        <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white px-2 py-1 rounded text-xs cursor-move">
          Drag to link
        </div>
      )}
      {renderWidgetContent()}
    </div>
  );
};

/* --- Modal Components --- */

const DashboardModal: React.FC<{
  dashboardForm: Partial<Dashboard>;
  setDashboardForm: React.Dispatch<React.SetStateAction<Partial<Dashboard>>>;
  dashboardModalError: string | null;
  dashboardFieldErrors: { name?: string };
  clearDashboardFieldError: (field: 'name') => void;
  widgets: Widget[];
  openCreateWidgetForSelectedDashboard: () => void;
  saveDashboard: () => Promise<void>;
  setShowDashboardModal: React.Dispatch<React.SetStateAction<boolean>>;
  loadWidgets: (dashboardId?: number) => Promise<void>;
  loadDashboards: () => Promise<void>;
}> = ({
  dashboardForm,
  setDashboardForm,
  dashboardModalError,
  dashboardFieldErrors,
  clearDashboardFieldError,
  widgets,
  openCreateWidgetForSelectedDashboard,
  saveDashboard,
  setShowDashboardModal,
  loadWidgets,
  loadDashboards
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm flex justify-center items-start z-50 pt-12 px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-2xl max-h-[86vh] overflow-y-auto">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-slate-900">{dashboardForm.id ? 'Edit Dashboard' : 'Create Dashboard'}</h2>
          <p className="text-sm text-slate-500 mt-1">Set dashboard details and manage linked widgets.</p>
        </div>

        {dashboardModalError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {dashboardModalError}
          </div>
        )}

        <label className="block mb-1 font-medium text-slate-700">Name</label>
        <input
          type="text"
          className={`w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
            dashboardFieldErrors.name ? 'border-red-400 focus:ring-red-100' : 'border-slate-300'
          }`}
          value={dashboardForm.name ?? ''}
          onChange={e => {
            setDashboardForm(prev => ({ ...prev, name: e.target.value }));
            clearDashboardFieldError('name');
          }}
        />
        {dashboardFieldErrors.name && <p className="text-sm text-red-600 mb-4">{dashboardFieldErrors.name}</p>}

        <label className="block mb-1 font-medium text-slate-700">Description</label>
        <textarea
          className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={dashboardForm.description ?? ''}
          onChange={e => setDashboardForm(prev => ({ ...prev, description: e.target.value }))}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
        <label className="block mb-1 font-medium text-slate-700">Type</label>
        <select
          className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={dashboardForm.type ?? 'STANDARD'}
          onChange={e => setDashboardForm(prev => ({ ...prev, type: e.target.value as DashboardType }))}
        >
          <option value="BASIC">BASIC</option>
          <option value="STANDARD">STANDARD</option>
        </select>
        </div>
        </div>

<label className="block mb-1 font-medium text-slate-700">Tab Name</label>
<input
  type="text"
  className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
  value={dashboardForm.tab_name ?? ''}
  placeholder="e.g. Sales, Marketing, Finance"
  onChange={e =>
    setDashboardForm(prev => ({ ...prev, tab_name: e.target.value }))
  }
/>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-5">
          <button className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800" onClick={() => setShowDashboardModal(false)}>Cancel</button>
          <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white" onClick={saveDashboard}>Save</button>
        </div>
      </div>
    </div>
  );
};

const WidgetModal: React.FC<{
  widgetForm: Partial<Widget>;
  setWidgetForm: React.Dispatch<React.SetStateAction<Partial<Widget>>>;
  dataSources: DataSource[];
  tabNameOptions: string[];
  saveWidget: (merge?: Partial<Widget>) => Promise<void>;
  setShowWidgetModal: React.Dispatch<React.SetStateAction<boolean>>;
  fetchWidgetData: (widget: Widget) => Promise<void>;
  existingWidgets: Widget[];
}> = ({
  widgetForm,
  setWidgetForm,
  dataSources,
  tabNameOptions,
  saveWidget,
  setShowWidgetModal,
  fetchWidgetData,
  existingWidgets
}) => {
  const [previewData, setPreviewData] = useState<{ raw?: any; normalized?: NormalizedResponse } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [customJsonEditor, setCustomJsonEditor] = React.useState('{}');

  React.useEffect(() => {
    setCustomJsonEditor(JSON.stringify(widgetForm.config_json?.custom ?? {}, null, 2));
  }, [widgetForm.id, widgetForm.visual_type]);

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateWidgetForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!widgetForm.title || !widgetForm.title.trim()) {
      errors.title = 'Widget title is required';
    }
    if (widgetForm.visual_type === 'CHART' && !widgetForm.chart_type) {
      errors.chart_type = 'Chart type is required for chart widgets';
    }
    if ((widgetForm.position_row ?? 0) < 0) {
      errors.position_row = 'Position row cannot be negative';
    }
    if ((widgetForm.position_col ?? 0) < 0) {
      errors.position_col = 'Position column cannot be negative';
    }
    if ((widgetForm.col_span ?? 3) < 1 || (widgetForm.col_span ?? 3) > 12) {
      errors.col_span = 'Col span must be between 1 and 12';
    }
    if ((widgetForm.row_span ?? 2) < 1) {
      errors.row_span = 'Row span must be at least 1';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveWidget = async () => {
    if (widgetForm.visual_type === 'CUSTOM') {
      try {
        JSON.parse(customJsonEditor || '{}');
      } catch {
        setFieldErrors(prev => ({ ...prev, custom_json: 'Invalid JSON in custom payload' }));
        return;
      }
    }
    if (!validateWidgetForm()) return;
    if (widgetForm.visual_type === 'CUSTOM') {
      const customObj = JSON.parse(customJsonEditor || '{}');
      await saveWidget({
        config_json: {
          ...(widgetForm.config_json || {}),
          custom: customObj,
        },
      });
      return;
    }
    await saveWidget();
  };

  const fetchPreviewData = async () => {
    if (!widgetForm.data_source_id) return;
    const ds = dataSources.find(s => s.id === widgetForm.data_source_id);
    if (!ds) return;

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

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
  }, [widgetForm.data_source_id]);

  const updateConfigJson = (key: string, value: any) => {
    setWidgetForm(prev => ({
      ...prev,
      config_json: {
        ...prev.config_json,
        [key]: value
      }
    }));
  };

  const findNextAvailablePosition = () => {
    const cols = 12;
    const occupied: Record<string, boolean> = {};

    existingWidgets.forEach(w => {
      if (w.id === widgetForm.id) return;
      for (let r = w.position_row; r < w.position_row + w.row_span; r++) {
        for (let c = w.position_col; c < w.position_col + w.col_span; c++) {
          occupied[`${r}-${c}`] = true;
        }
      }
    });

    const wantedColSpan = widgetForm.col_span || 3;
    const wantedRowSpan = widgetForm.row_span || 2;

    for (let row = 0; row < 100; row++) {
      for (let col = 0; col <= cols - wantedColSpan; col++) {
        let fits = true;
        for (let r = row; r < row + wantedRowSpan && fits; r++) {
          for (let c = col; c < col + wantedColSpan && fits; c++) {
            if (occupied[`${r}-${c}`]) fits = false;
          }
        }
        if (fits) {
          return { row, col };
        }
      }
    }

    return { row: 0, col: 0 };
  };

  useEffect(() => {
    if (!widgetForm.id && widgetForm.dashboard_id) {
      const pos = findNextAvailablePosition();
      setWidgetForm(prev => ({
        ...prev,
        position_row: pos.row,
        position_col: pos.col,
        col_span: prev.col_span || 3,
        row_span: prev.row_span || 2
      }));
    }
  }, [widgetForm.dashboard_id]);

  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm flex justify-center items-start z-50 pt-12 px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-3xl max-h-[86vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{widgetForm.id ? 'Edit Widget' : 'Create Widget'}</h2>
            <p className="text-sm text-slate-500 mt-1">Configure layout, visualization type, and data source.</p>
          </div>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50"
            onClick={() => setShowWidgetModal(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <label className="block mb-1 font-medium text-slate-700">Title</label>
        <input
          type="text"
          className={`w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 ${
            fieldErrors.title ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-200'
          }`}
          value={widgetForm.title ?? ''}
          onChange={e => {
            setWidgetForm(prev => ({ ...prev, title: e.target.value }));
            clearFieldError('title');
          }}
        />
        {fieldErrors.title && <p className="text-sm text-red-600 mb-3">{fieldErrors.title}</p>}

        <label className="block mb-1 font-medium text-slate-700">Tab Name</label>
        <select
          className={`w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 ${
            fieldErrors.tab_name ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-200'
          }`}
          value={widgetForm.tabname ?? ''}
          onChange={e => {
            const value = e.target.value;
            setWidgetForm(prev => ({
              ...prev,
              tabname: value,
              config_json: { ...(prev.config_json || {}), tab_name: value },
            }));
            clearFieldError('tab_name');
          }}
        >
          <option value="">Select Panel</option>
          {tabNameOptions.length > 0 &&
            tabNameOptions.map((tab, idx) => (
              <option key={`${tab}-${idx}`} value={tab}>
                {tab}
              </option>
            ))}
        </select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-1">
          <div>
            <label className="block mb-1 font-medium text-slate-700">Panel Format</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={inferPanelFormat(widgetForm.visual_type, widgetForm.config_json || null)}
              onChange={e => {
                const { visualType, panelVariant } = resolvePanelFormatSelection(e.target.value);
                setWidgetForm(prev => {
                  const nextCfg: Record<string, any> = { ...(prev.config_json || {}) };
                  if (panelVariant) nextCfg.panel_variant = panelVariant;
                  else delete nextCfg.panel_variant;
                  if (visualType === 'MAP' || visualType === 'CHART') {
                    delete nextCfg.panel_variant;
                  }
                  return {
                    ...prev,
                    visual_type: visualType,
                    config_json: nextCfg,
                  };
                });
              }}
            >
              <optgroup label="Metrics">
                <option value="KPI">KPI</option>
                <option value="GAUGE">Gauge</option>
                <option value="PROGRESS">Progress</option>
              </optgroup>
              <optgroup label="Charts">
                <option value="CHART">Chart</option>
              </optgroup>
              <optgroup label="Data Views">
                <option value="TABLE">Table</option>
                <option value="LIST">List</option>
                <option value="TIMELINE">Timeline</option>
              </optgroup>
              <optgroup label="Text & Custom">
                <option value="TEXT">Text</option>
                <option value="ALERT">Alert Text</option>
                <option value="CUSTOM">Custom</option>
              </optgroup>
              <optgroup label="Geo">
                <option value="MAP">Map</option>
              </optgroup>
            </select>
            <p className="text-xs text-slate-500 -mt-2 mb-2">Formats are mapped to core widget types so backend compatibility remains intact.</p>
          </div>

          {widgetForm.visual_type === 'CHART' && (
            <div>
              <label className="block mb-1 font-medium text-slate-700">Chart Type</label>
              <select
                className={`w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 ${
                  fieldErrors.chart_type ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-200'
                }`}
                value={(widgetForm.config_json?.chart_variant as ChartType) ?? widgetForm.chart_type ?? 'BAR'}
                onChange={e => {
                  const selected = e.target.value as ChartType;
                  const canonical = selected === 'DONUT'
                    ? 'PIE'
                    : selected === 'AREA' || selected === 'SCATTER' || selected === 'MULTI_SERIES_LINE'
                      ? 'LINE'
                      : selected === 'HORIZONTAL_BAR' || selected === 'STACKED_BAR' || selected === 'COMBO'
                        ? 'BAR'
                        : selected;
                  setWidgetForm(prev => ({
                    ...prev,
                    chart_type: canonical,
                    config_json: { ...(prev.config_json || {}), chart_variant: selected },
                  }));
                  clearFieldError('chart_type');
                }}
              >
                {Array.from(new Set(CHART_TYPE_OPTIONS.map(opt => opt.group))).map(group => (
                  <optgroup key={group} label={group}>
                    {CHART_TYPE_OPTIONS.filter(opt => opt.group === group).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {fieldErrors.chart_type && <p className="text-sm text-red-600 mb-2">{fieldErrors.chart_type}</p>}
            </div>
          )}
        </div>

        {widgetForm.visual_type === 'KPI' && (
          <div className="mb-4 p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
            <h4 className="font-semibold text-slate-800 mb-3">KPI Configuration</h4>

            <label className="block mb-1 font-medium text-slate-700">Value</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={widgetForm.config_json?.value ?? ''}
              onChange={e => updateConfigJson('value', e.target.value)}
              placeholder="e.g., 12345"
            />

            <label className="block mb-1 font-medium text-slate-700">Trend</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={widgetForm.config_json?.trend ?? ''}
              onChange={e => updateConfigJson('trend', e.target.value)}
              placeholder="e.g., +5%"
            />

            <label className="block mb-1 font-medium text-slate-700">Description</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={widgetForm.config_json?.description ?? ''}
              onChange={e => updateConfigJson('description', e.target.value)}
              placeholder="e.g., Monthly Sales"
            />
          </div>
        )}

        {widgetForm.visual_type === 'TEXT' && (
          <div className="mb-4 p-4 bg-amber-50/80 border border-amber-100 rounded-xl">
            <h4 className="font-semibold text-slate-800 mb-3">Text content</h4>
            <label className="block mb-1 font-medium text-slate-700">Body</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[120px] text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
              value={widgetForm.config_json?.text ?? ''}
              onChange={e => updateConfigJson('text', e.target.value)}
              placeholder="Static text or HTML (see option below). If empty, a data source response is shown when configured."
            />
            <label className="flex items-center gap-2 mt-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(widgetForm.config_json?.render_as_html)}
                onChange={e => updateConfigJson('render_as_html', e.target.checked)}
              />
              Render body as HTML (otherwise plain text is escaped for safety)
            </label>
            <p className="text-xs text-slate-500 mt-2">
              Static body wins when it is non-empty. With only a data source, the API response is formatted as text (JSON for objects).
            </p>
          </div>
        )}

        {widgetForm.visual_type === 'CUSTOM' && (
          <div className="mb-4 p-4 bg-violet-50/80 border border-violet-100 rounded-xl">
            <h4 className="font-semibold text-slate-800 mb-3">Custom configuration (JSON)</h4>
            <textarea
              className={`w-full border rounded-lg px-3 py-2 min-h-[140px] font-mono text-xs focus:outline-none focus:ring-2 ${
                fieldErrors.custom_json ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-violet-200'
              }`}
              value={customJsonEditor}
              onChange={e => {
                setCustomJsonEditor(e.target.value);
                clearFieldError('custom_json');
              }}
              spellCheck={false}
            />
            {fieldErrors.custom_json && (
              <p className="text-sm text-red-600 mt-1">{fieldErrors.custom_json}</p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Stored in <code className="text-xs">config_json.custom</code>. If a data source is set, its response appears together with this payload in the widget.
            </p>
          </div>
        )}

        <div className="mb-4 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
          <h4 className="font-semibold text-slate-800 mb-3">Layout</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block mb-1 font-medium text-slate-700">Position Row</label>
              <input
                type="number"
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                  fieldErrors.position_row ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-200'
                }`}
                value={widgetForm.position_row ?? 0}
                onChange={e => {
                  setWidgetForm(prev => ({ ...prev, position_row: parseInt(e.target.value || '0') }));
                  clearFieldError('position_row');
                }}
              />
              {fieldErrors.position_row && <p className="text-sm text-red-600 mt-1">{fieldErrors.position_row}</p>}
            </div>
            <div>
              <label className="block mb-1 font-medium text-slate-700">Position Col</label>
              <input
                type="number"
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                  fieldErrors.position_col ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-200'
                }`}
                value={widgetForm.position_col ?? 0}
                onChange={e => {
                  setWidgetForm(prev => ({ ...prev, position_col: parseInt(e.target.value || '0') }));
                  clearFieldError('position_col');
                }}
              />
              {fieldErrors.position_col && <p className="text-sm text-red-600 mt-1">{fieldErrors.position_col}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-medium text-slate-700">Col Span (Width)</label>
              <input
                type="number"
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                  fieldErrors.col_span ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-200'
                }`}
                value={widgetForm.col_span ?? 3}
                min={1}
                max={12}
                onChange={e => {
                  setWidgetForm(prev => ({ ...prev, col_span: parseInt(e.target.value || '3') }));
                  clearFieldError('col_span');
                }}
              />
              {fieldErrors.col_span && <p className="text-sm text-red-600 mt-1">{fieldErrors.col_span}</p>}
            </div>
            <div>
              <label className="block mb-1 font-medium text-slate-700">Row Span (Height)</label>
              <input
                type="number"
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                  fieldErrors.row_span ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-200'
                }`}
                value={widgetForm.row_span ?? 2}
                min={1}
                onChange={e => {
                  setWidgetForm(prev => ({ ...prev, row_span: parseInt(e.target.value || '2') }));
                  clearFieldError('row_span');
                }}
              />
              {fieldErrors.row_span && <p className="text-sm text-red-600 mt-1">{fieldErrors.row_span}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          <div>
            <label className="block mb-1 font-medium text-slate-700">Background Color</label>
            <input
              type="color"
              className="w-full h-11 border border-slate-300 rounded-lg px-2 py-2 mb-3 bg-white"
              value={widgetForm.background_color ?? '#ffffff'}
              onChange={e => setWidgetForm(prev => ({ ...prev, background_color: e.target.value }))}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-slate-700">Refresh Interval (sec)</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={widgetForm.refresh_interval_sec ?? 0}
              onChange={e => setWidgetForm(prev => ({ ...prev, refresh_interval_sec: parseInt(e.target.value || '0') }))}
            >
              <option value={0}>Disabled</option>
              <option value={15}>15 sec</option>
              <option value={30}>30 sec</option>
              <option value={60}>60 sec</option>
              <option value={120}>120 sec</option>
            </select>
          </div>
        </div>

        <label className="block mb-1 font-medium text-slate-700">Data Source</label>
        <select
          className="w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 border-slate-300 focus:ring-blue-200"
          value={widgetForm.data_source_id ?? ''}
          onChange={e => setWidgetForm(prev => ({ ...prev, data_source_id: e.target.value ? parseInt(e.target.value) : null }))}
        >
          <option value="">-- None --</option>
          {dataSources.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
        </select>

        {widgetForm.data_source_id && (
          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-semibold text-slate-800 mb-2">Data Preview</h4>
            {previewLoading ? (
              <div className="text-center py-2 text-slate-500">Loading...</div>
            ) : previewError ? (
              <div className="text-red-500 text-sm">{previewError}</div>
            ) : previewData ? (
              <div className="text-sm">
                {previewData.normalized && previewData.normalized.kind === 'kpi' ? (
                  <div className="mb-2">
                    <KPIView k={previewData.normalized as NormalizedKPI} small />
                  </div>
                ) : null}
                <pre className="bg-white p-3 rounded-lg border border-slate-200 max-h-36 overflow-y-auto text-xs">
                  {JSON.stringify(previewData.raw ?? previewData.normalized ?? previewData, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-slate-500 text-sm">No data available</div>
            )}
          </div>
        )}

        <label className="block mb-1 font-medium text-slate-700">Context Menu Options (JSON)</label>
<textarea
  className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-2 font-mono text-xs min-h-[110px] focus:outline-none focus:ring-2 focus:ring-blue-200"
  placeholder='e.g. [{"label":"View Details","action":"viewDetails"},{"label":"Export Data","action":"exportData"}]'
  value={JSON.stringify(widgetForm.interaction_config_json ?? [], null, 2)}
  onChange={e => {
    try {
      const parsed = JSON.parse(e.target.value);
      setWidgetForm(prev => ({ ...prev, interaction_config_json: parsed }));
    } catch {
      // optionally handle JSON parse error
    }
  }}
/>
<p className="text-xs text-slate-500 mb-3">
  Define the context menu options for this widget as a JSON array of objects with "label" and "action" keys.
</p>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-5">
          <button className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800" onClick={() => setShowWidgetModal(false)}>Cancel</button>
          <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveWidget}>Save Widget</button>
        </div>
      </div>
    </div>
  );
};

const DataSourceModal: React.FC<{
  dataSourceForm: Partial<DataSource>;
  setDataSourceForm: React.Dispatch<React.SetStateAction<Partial<DataSource>>>;
  saveDataSource: (formData: Partial<DataSource>) => Promise<void>;
  setShowDataSourceModal: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({
  dataSourceForm,
  setDataSourceForm,
  saveDataSource,
  setShowDataSourceModal
}) => {
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const [headersText, setHeadersText] = React.useState<string>(() =>
    dataSourceForm.request_headers_json
      ? JSON.stringify(dataSourceForm.request_headers_json, null, 2)
      : ''
  );
  const [queryParamsText, setQueryParamsText] = React.useState<string>(() =>
    dataSourceForm.request_query_params_json
      ? JSON.stringify(dataSourceForm.request_query_params_json, null, 2)
      : ''
  );
  const [bodyText, setBodyText] = React.useState<string>(() =>
    dataSourceForm.request_body_json
      ? JSON.stringify(dataSourceForm.request_body_json, null, 2)
      : ''
  );

  // Update the useEffect to handle both field names
React.useEffect(() => {
  setHeadersText(
    dataSourceForm.request_headers_json
      ? JSON.stringify(dataSourceForm.request_headers_json, null, 2)
      : ''
  );
  setQueryParamsText(
    dataSourceForm.request_query_params_json
      ? JSON.stringify(dataSourceForm.request_query_params_json, null, 2)
      : ''
  );
  // Handle both possible field names for static JSON
  const bodyData = dataSourceForm.request_body_template_json || dataSourceForm.request_body_json;
  setBodyText(
    bodyData
      ? JSON.stringify(bodyData, null, 2)
      : ''
  );
}, [
  dataSourceForm.request_headers_json,
  dataSourceForm.request_query_params_json,
  dataSourceForm.request_body_template_json,
  dataSourceForm.request_body_json
]);

// Update applyJsonToForm function
const applyJsonToForm = () => {
  const safeParse = (text: string): any | null => {
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const headersObj = safeParse(headersText);
  const queryObj = safeParse(queryParamsText);
  const bodyObj = safeParse(bodyText);

  setDataSourceForm(prev => ({
    ...prev,
    request_headers_json: headersObj || undefined,
    request_query_params_json: queryObj || undefined,
    // For STATIC sources, prefer request_body_template_json
    // For other sources, you can use either
    request_body_template_json: bodyObj || undefined,
    request_body_json: undefined // Clear the old field to avoid confusion
  }));
};

  const handleSaveClick = async () => {
  if (!validate()) return;

  const safeParse = (text: string): any | null => {
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON", e);
      return null;
    }
  };

  const headersObj = safeParse(headersText);
  const queryParamsObj = safeParse(queryParamsText);
  const bodyObj = safeParse(bodyText);

  const updatedForm = {
    ...dataSourceForm,
    request_headers_json: headersObj,
    request_query_params_json: queryParamsObj,
    request_body_template_json: bodyObj,
    request_body_json: undefined,
  };

  try {
    setSubmitting(true);
    await saveDataSource(updatedForm);  // Pass updated form here
  } finally {
    setSubmitting(false);
  }
};
  const validate = (): boolean => {
  const errors: Record<string, string> = {};

  if (!dataSourceForm.name || !dataSourceForm.name.trim()) {
    errors.name = 'Name is required';
  }

  if (dataSourceForm.source_type === 'API' && (!dataSourceForm.endpoint_url || !dataSourceForm.endpoint_url.trim())) {
    errors.endpoint_url = 'Endpoint URL is required for API sources';
  }

  if (dataSourceForm.source_type === 'STATIC') {
    // Validate that bodyText contains valid JSON
    try {
      JSON.parse(bodyText);
    } catch {
      errors.request_body_json = 'Static JSON data is invalid JSON';
    }
  }

  setFieldErrors(errors);

  return Object.keys(errors).length === 0;
};
  const isApi = dataSourceForm.source_type === 'API';
  const isSql = dataSourceForm.source_type === 'SQL';
  const isStatic = dataSourceForm.source_type === 'STATIC';

  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm flex justify-center items-start z-50 pt-10 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-5xl max-h-[86vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold">
            {dataSourceForm.id ? 'Edit Data Source' : 'Create Data Source'}
          </h2>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={() => setShowDataSourceModal(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Basic Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
        <label className="block mb-1 font-medium">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={`w-full border rounded px-3 py-2 mb-1 text-sm ${
            fieldErrors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={
            isApi
              ? 'e.g. Sales API (Monthly)'
              : isSql
              ? 'e.g. Sales SQL View'
              : 'e.g. Static Sales Data'
          }
          value={dataSourceForm.name ?? ''}
          onChange={e => {
            const v = e.target.value;
            setDataSourceForm(prev => ({ ...prev, name: v }));
            if (fieldErrors.name) {
              setFieldErrors(prevErr => ({ ...prevErr, name: undefined }));
            }
          }}
        />
        {fieldErrors.name && (
          <p className="text-xs text-red-600 mb-2">{fieldErrors.name}</p>
        )}
        </div>

        <div>
        <label className="block mb-1 font-medium">Source Type</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-2 mb-1 text-sm"
          value={dataSourceForm.source_type ?? 'API'}
          onChange={e => {
            const value = e.target.value as SourceType;
            setDataSourceForm(prev => ({
              ...prev,
              source_type: value
            }));
          }}
        >
          <option value="API">API</option>
          <option value="SQL">SQL</option>
          <option value="STATIC">Static JSON</option>
        </select>
        <p className="text-xs text-gray-500 mb-3">
          {isApi &&
            'Call a REST/HTTP endpoint to fetch data (e.g. your PHP API like sales_data.php).'}
          {isSql &&
            'Use a backend-defined SQL data source. Endpoint/JSON fields may be used as parameters if your backend supports it.'}
          {isStatic &&
            'Store static JSON directly in this data source. Widgets will read from this JSON instead of calling an API.'}
        </p>
        </div>

        <div>
        <label className="block mb-1 font-medium">
          Endpoint URL {isApi && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          className={`w-full border rounded px-3 py-2 mb-1 text-sm ${
            fieldErrors.endpoint_url ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={
            isApi
              ? 'e.g. https://example.com/api/sales or /sales_data.php'
              : 'May be ignored for SQL/STATIC depending on backend'
          }
          value={dataSourceForm.endpoint_url ?? ''}
          onChange={e => {
            const v = e.target.value;
            setDataSourceForm(prev => ({ ...prev, endpoint_url: v }));
            if (fieldErrors.endpoint_url) {
              setFieldErrors(prevErr => ({ ...prevErr, endpoint_url: undefined }));
            }
          }}
        />
        <p className="text-xs text-gray-500 mb-2">
          {isApi &&
            'If you use a full URL, the frontend will call it directly with fetch (CORS must be allowed). If you use a relative path, it can be proxied through your app (e.g. /api/sales).'}
          {isSql &&
            'Some setups use this as an identifier or path for the SQL source; check your backend conventions.'}
          {isStatic &&
            'Usually not required for static sources – data comes from the JSON fields below.'}
        </p>
        {fieldErrors.endpoint_url && (
          <p className="text-xs text-red-600 mb-2">{fieldErrors.endpoint_url}</p>
        )}
        </div>

        <div>
        <label className="block mb-1 font-medium">HTTP Method</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3 text-sm"
          value={dataSourceForm.http_method ?? 'GET'}
          onChange={e =>
            setDataSourceForm(prev => ({ ...prev, http_method: e.target.value as HttpMethod }))
          }
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
        </div>

        <div>
        <label className="block mb-1 font-medium">Cached</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-2 mb-1 text-sm"
          value={dataSourceForm.is_cached ? '1' : '0'}
          onChange={e => setDataSourceForm(prev => ({ ...prev, is_cached: e.target.value === '1' }))}
        >
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
        <p className="text-xs text-gray-500 mb-2">
          Enable caching if the response does not change often. Widgets will reuse cached data
          within the TTL below.
        </p>
        </div>

        <div>
        <label className="block mb-1 font-medium text-sm">Cache TTL (sec)</label>
        <input
          type="number"
          className={`w-full border rounded px-3 py-2 mb-1 text-sm ${
            fieldErrors.cache_ttl_sec ? 'border-red-500' : 'border-gray-300'
          }`}
          value={dataSourceForm.cache_ttl_sec ?? 0}
          onChange={e => {
            const v = e.target.value;
            setDataSourceForm(prev => ({
              ...prev,
              cache_ttl_sec: v === '' ? 0 : parseInt(v, 10)
            }));
            if (fieldErrors.cache_ttl_sec) {
              setFieldErrors(prevErr => ({ ...prevErr, cache_ttl_sec: undefined }));
            }
          }}
          min={0}
        />
        {fieldErrors.cache_ttl_sec && (
          <p className="text-xs text-red-600 mb-2">{fieldErrors.cache_ttl_sec}</p>
        )}
        </div>
        </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 mb-3">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Request / Payload JSON</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>

        <label className="block mb-1 font-medium text-sm">Request Headers (JSON)</label>
        <p className="text-xs text-gray-500 mb-1">
          Optional. Key-value pairs sent as HTTP headers.
          {isApi && ' Example: {"Authorization": "Bearer TOKEN"}'}
        </p>
        <textarea
          className={`w-full border rounded px-3 py-2 mb-1 text-xs font-mono min-h-[70px] ${
            fieldErrors.request_headers_json ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder='e.g. { "Authorization": "Bearer TOKEN" }'
          value={headersText}
          onChange={e => {
            setHeadersText(e.target.value);
            if (fieldErrors.request_headers_json) {
              setFieldErrors(prevErr => ({ ...prevErr, request_headers_json: undefined }));
            }
          }}
        />
        {fieldErrors.request_headers_json && (
          <p className="text-xs text-red-600 mb-2">{fieldErrors.request_headers_json}</p>
        )}
        </div>

        <div>
        <label className="block mb-1 font-medium text-sm">Query Parameters (JSON)</label>
        <p className="text-xs text-gray-500 mb-1">
          Optional. Will be appended to the URL query string.
          {isApi && ' Example: {"period": "monthly"}'}
        </p>
        <textarea
          className={`w-full border rounded px-3 py-2 mb-1 text-xs font-mono min-h-[70px] ${
            fieldErrors.request_query_params_json ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder='e.g. { "period": "monthly", "region": "EU" }'
          value={queryParamsText}
          onChange={e => {
            setQueryParamsText(e.target.value);
            if (fieldErrors.request_query_params_json) {
              setFieldErrors(prevErr => ({ ...prevErr, request_query_params_json: undefined }));
            }
          }}
        />
        {fieldErrors.request_query_params_json && (
          <p className="text-xs text-red-600 mb-2">{fieldErrors.request_query_params_json}</p>
        )}
        </div>
        </div>

        <label className="block mb-1 font-medium text-sm">
          {isStatic ? 'Static JSON Data' : 'Request Body (JSON)'}
        </label>
        <p className="text-xs text-gray-500 mb-1">
          {isStatic &&
            'Widgets will consume this JSON directly as the data source result. For example: [{"label":"Jan","value":100}, ...]'}
          {isApi &&
            'Optional. Sent as the HTTP request body for POST/PUT style APIs.'}
          {isSql &&
            'Optional. Can be used as a parameter object for SQL queries if your backend supports it.'}
        </p>
        <textarea
          className={`w-full border rounded px-3 py-2 mb-1 text-xs font-mono min-h-[90px] ${
            fieldErrors.request_body_json ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={
            isStatic
              ? '[{ "label": "Jan", "value": 100 }, { "label": "Feb", "value": 120 }]'
              : '{ "period": "monthly", "year": 2025 }'
          }
          value={bodyText}
          onChange={e => {
            setBodyText(e.target.value);
            if (fieldErrors.request_body_json) {
              setFieldErrors(prevErr => ({ ...prevErr, request_body_json: undefined }));
            }
          }}
        />
        {fieldErrors.request_body_json && (
          <p className="text-xs text-red-600 mb-2">{fieldErrors.request_body_json}</p>
        )}
        </div>

        <div className="flex justify-end gap-2 mt-5 border-t border-slate-200 pt-4">
          <button
            className="px-4 py-2 rounded bg-gray-200 text-sm"
            onClick={() => setShowDataSourceModal(false)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
            onClick={handleSaveClick}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};


const DashboardManager: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [layout, setLayout] = useState<any[]>([]);
  const [widgetApiData, setWidgetApiData] = useState<Record<number, any>>({});
  const [widgetLoadingState, setWidgetLoadingState] = useState<Record<number, boolean>>({});
  const [widgetErrors, setWidgetErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dashboards' | 'widgets' | 'datasources' | 'assignFilters'>('dashboards');
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [dashboardForm, setDashboardForm] = useState<Partial<Dashboard>>({});
  const [dashboardModalError, setDashboardModalError] = useState<string | null>(null);
  const [dashboardFieldErrors, setDashboardFieldErrors] = useState<{ name?: string }>({});
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [widgetForm, setWidgetForm] = useState<Partial<Widget>>({});
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [dataSourceForm, setDataSourceForm] = useState<Partial<DataSource>>({});
  const [contextMenus, setContextMenus] = useState<any[]>([]);
const [widgetContextMenuAssignments, setWidgetContextMenuAssignments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeWidgetTabName, setActiveWidgetTabName] = useState<string>('');
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<number[]>([]);

  // NEW: Drag and drop state
  const [draggedWidget, setDraggedWidget] = useState<Widget | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);

  // NEW: Filters & mappings for Assign Filters tab
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [dashboardFilterMappings, setDashboardFilterMappings] = useState<DashboardFilterMapping[]>([]);
  const [assignFiltersLoading, setAssignFiltersLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = React.useState<number>(1200);
  // Add this for debugging
  const tabNameOptions = Array.from(
    new Set(
      (selectedDashboard?.tab_name || '')
        .split(',')
        .map((tab) => tab.trim())
        .filter(Boolean)
    )
  );

  const getWidgetTabName = (w: Widget) =>
    (w.tabname || (w.config_json?.tab_name as string) || '').trim();
  const getWidgetNumericId = (w: Widget): number | null => {
    const parsed = Number(w.id);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const visibleWidgetsForActiveTab =
    activeWidgetTabName
      ? widgets.filter((w) => getWidgetTabName(w) === activeWidgetTabName)
      : widgets;


  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setGridWidth(rect.width);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    (async () => {
      await loadDashboards();
      await loadDataSources();
      await loadFilters();
      await loadDashboardFilterMappings();
      await fetchContextMenus();               // Add this line
    await fetchWidgetContextMenuAssignments(); // Add this line
    })();
  }, []);

  useEffect(() => {
    if (selectedDashboard) {
      loadWidgets(selectedDashboard.id);
    } else {
      setWidgets([]);
    }
  }, [selectedDashboard?.id]);

  useEffect(() => {
    if (tabNameOptions.length === 0) {
      setActiveWidgetTabName('');
      return;
    }
    setActiveWidgetTabName((prev) => (prev && tabNameOptions.includes(prev) ? prev : tabNameOptions[0]));
  }, [selectedDashboard?.id, selectedDashboard?.tab_name, widgets.length]);

  useEffect(() => {
    widgets.forEach(widget => {
      if (widget.data_source_id && widget.id) {
        fetchWidgetData(widget);
      }
    });
  }, [widgets, dataSources]);

  useEffect(() => {
    // Drop stale selections when list refreshes/changes.
    setSelectedWidgetIds(prev =>
      prev.filter(id => widgets.some(w => getWidgetNumericId(w) === id))
    );
  }, [widgets]);

  useEffect(() => {
    const timers: Record<number, NodeJS.Timeout> = {};

    widgets.forEach(widget => {
      if (widget.id && widget.refresh_interval_sec && widget.refresh_interval_sec > 0) {
        if (timers[widget.id]) clearInterval(timers[widget.id]);

        timers[widget.id] = setInterval(() => {
          fetchWidgetData(widget);
        }, widget.refresh_interval_sec * 1000);
      }
    });

    return () => {
      Object.values(timers).forEach(clearInterval);
    };
  }, [widgets, dataSources]);
  

  async function fetchWidgetData(widget: Widget) {
  // Add validation to prevent calling API without required fields
  if (!widget.data_source_id || !widget.id || !widget.dashboard_id) {
    console.warn('Widget missing required fields:', widget);
    return;
  }

  const dataSource = dataSources.find(ds => ds.id === widget.data_source_id);
  if (!dataSource) return;

  setWidgetLoadingState(prev => ({ ...prev, [widget.id!]: true }));
  setWidgetErrors(prev => ({ ...prev, [widget.id!]: '' }));

  try {
    let response: any;
    console.log('dataSource-----');
console.log(dataSource.source_type);
    switch (dataSource.source_type) {
      case 'API':
        if (!dataSource.endpoint_url) throw new Error('API data source missing endpoint URL');

        if (dataSource.endpoint_url.startsWith('http')) {
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
          const path = dataSource.endpoint_url.replace(/^\//, '');
          response = await apiFetch<any>(path, {
            method: dataSource.http_method || 'GET',
            headers: dataSource.request_headers_json || {},
          });
        }
        break;

      case 'SQL':
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
  console.log('Static data source:', dataSource);
  if (dataSource.request_body_template_json) {
    response = dataSource.request_body_template_json;
  } else if (dataSource.code) {
    try {
      response = JSON.parse(dataSource.code);
    } catch {
      response = dataSource.code;
    }
    console.log('response---------');
    console.log(response);
  } else {
    throw new Error('Static data source missing data');
  }
  break;

      default:
        throw new Error(`Unsupported data source type: ${dataSource.source_type}`);
    }

    if (!response) throw new Error('Empty response from data source');

    let normalized: NormalizedResponse;
    if (widget.visual_type === 'TABLE') {
      normalized = normalizeTableResponse(response);
    } else if (widget.visual_type === 'TEXT') {
      normalized = normalizeTextResponse(response);
    } else {
      normalized = normalizeApiResponse(response);
    }

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

  const persistWidgetLayout = async (item: { id: number; x: number; y: number; w: number; h: number }) => {
    try {
      await apiFetch(`/widgets/${item.id}/layout`, {
        method: 'PUT',
        body: JSON.stringify({
          position_row: Number(item.y),
          position_col: Number(item.x),
          row_span: Math.max(1, Number(item.h)),
          col_span: Math.max(1, Number(item.w)),
        }),
        headers: { 'Content-Type': 'application/json', 'X-User-Id': '1' },
      });
    } catch (e: any) {
      if ((e?.message || '').toLowerCase().includes('widget not found')) return;
      console.error(`Failed to save widget ${item.id} position/size`, e);
    }
  };

  const onLayoutChange = async (newLayout: any[]) => {
    setLayout(newLayout);

    const changedForPersist: Array<{
      id: number;
      position_row: number;
      position_col: number;
      row_span: number;
      col_span: number;
    }> = [];

    setWidgets((prevWidgets) =>
      prevWidgets.map((w) => {
        const wid = getWidgetNumericId(w);
        if (wid === null) return w;
        const layoutItem = newLayout.find((item) => item.i === String(wid));
        if (!layoutItem) return w;

        const nextPositionRow = Number(layoutItem.y);
        const nextPositionCol = Number(layoutItem.x);
        const nextRowSpan = Number(layoutItem.h);
        const nextColSpan = Number(layoutItem.w);

        const changed =
          Number(w.position_row) !== nextPositionRow ||
          Number(w.position_col) !== nextPositionCol ||
          Number(w.row_span) !== nextRowSpan ||
          Number(w.col_span) !== nextColSpan;

        if (!changed) return w;

        changedForPersist.push({
          id: wid,
          position_row: nextPositionRow,
          position_col: nextPositionCol,
          row_span: nextRowSpan,
          col_span: nextColSpan,
        });

        return {
          ...w,
          position_col: nextPositionCol,
          position_row: nextPositionRow,
          col_span: nextColSpan,
          row_span: nextRowSpan,
        };
      })
    );

    if (changedForPersist.length === 0) return;

    await Promise.all(changedForPersist.map((item) => persistWidgetLayout({
      id: item.id,
      x: item.position_col,
      y: item.position_row,
      w: item.col_span,
      h: item.row_span,
    })));
  };

  const onWidgetResizeStop = async (_layout: any[], _oldItem: any, newItem: any) => {
    const id = Number(newItem?.i);
    if (!Number.isFinite(id)) return;

    setWidgets((prev) =>
      prev.map((w) => {
        const wid = getWidgetNumericId(w);
        if (wid !== id) return w;
        return {
          ...w,
          position_col: Number(newItem.x),
          position_row: Number(newItem.y),
          col_span: Math.max(1, Number(newItem.w)),
          row_span: Math.max(1, Number(newItem.h)),
        };
      })
    );

    await persistWidgetLayout({ id, x: Number(newItem.x), y: Number(newItem.y), w: Number(newItem.w), h: Number(newItem.h) });
  };

  const onWidgetDragStop = async (_layout: any[], _oldItem: any, newItem: any) => {
    const id = Number(newItem?.i);
    if (!Number.isFinite(id)) return;

    setWidgets((prev) =>
      prev.map((w) => {
        const wid = getWidgetNumericId(w);
        if (wid !== id) return w;
        return {
          ...w,
          position_col: Number(newItem.x),
          position_row: Number(newItem.y),
        };
      })
    );

    await persistWidgetLayout({ id, x: Number(newItem.x), y: Number(newItem.y), w: Number(newItem.w), h: Number(newItem.h) });
  };

  async function loadDashboards() {
  setLoading(true);
  setError(null);
  try {
    const data = await apiFetch<Dashboard[]>('/dashboards');
    setDashboards(data || []);

    // Only update selected dashboard if it doesn't exist in the new data
    // This prevents unnecessary widget reloads
    if (data && data.length > 0) {
      setSelectedDashboard((prev) => {
        if (!prev) {
          // No dashboard selected, select the first one
          return data[0];
        }
        // Check if current dashboard still exists
        const found = data.find(d => d.id === prev.id);
        if (found) {
          // Dashboard still exists, keep it selected (don't trigger reload)
          return prev;
        }
        // Dashboard was deleted, select first available
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
      let data: Widget[] = [];

      if (dashboardId) {
        const resp = await apiFetch<Widget[]>(`/widgets?dashboard_id=${dashboardId}`);
        data = resp || [];
      } else {
        const resp = await apiFetch<Widget[]>(`/widgets`);
        data = resp || [];
      }

      setWidgets(data);

      const newLayout = data.map(widget => ({
        i: widget.id!.toString(),
        x: Number(widget.position_col),
        y: Number(widget.position_row),
        w: Number(widget.col_span),
        h: Number(widget.row_span),
        minW: 2,
        minH: 1,
        maxW: 12,
      }));

      setLayout(newLayout);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch widgets');
    }
  }


async function fetchContextMenus() {
  try {
    const res = await fetch(`${API_BASE}?resource=context_menus`);
    const data = await res.json();
    setContextMenus(data);
  } catch (e) {
    console.error('Failed to fetch context menus', e);
  }
}

async function fetchWidgetContextMenuAssignments() {
  try {
    const res = await fetch(`${API_BASE}?resource=widget_context_menu_assignments`);
    const data = await res.json();
    setWidgetContextMenuAssignments(data);
  } catch (e) {
    console.error('Failed to fetch widget-context menu assignments', e);
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

  // NEW: Filter loaders
  async function loadFilters() {
    try {
      const res = await fetch('https://intelligentsalesman.com/ism1/API/get_filters.php');
      const data = await res.json();
      if (data.success) {
        const normalized: FilterItem[] = data.filters.map((f: any) => ({
          id: f.id.toString(),
          name: f.name,
          type: f.type,
          field: f.field,
          table_name: f.table_name || '',
          isActive: !!f.isActive,
          description: f.description,
        }));
        setFilters(normalized);
      }
    } catch (e) {
      console.error('Failed to load filters', e);
      setError('Failed to load filters');
    }
  }

async function loadDashboardFilterMappings() {
  try {
    const res = await fetch('https://intelligentsalesman.com/ism1/API/get_dashboard_filter_mappings.php');
    const data = await res.json();

    if (data.success) {
      const normalized: DashboardFilterMapping[] = (data.mappings || []).map((m: any) => ({
        dashboardId: Number(m.dashboardId ?? m.dashboard_id),
        filterIds: Array.isArray(m.filterIds)
          ? m.filterIds.map((id: any) => id.toString())
          : (() => {
              // if it's stored as JSON text in DB, parse it
              if (typeof m.filter_ids === 'string') {
                try {
                  const parsed = JSON.parse(m.filter_ids);
                  return Array.isArray(parsed)
                    ? parsed.map((id: any) => id.toString())
                    : [];
                } catch {
                  return [];
                }
              }
              return [];
            })(),
      }));

      setDashboardFilterMappings(normalized);
    }
  } catch (e) {
    console.error('Failed to load dashboard-filter mappings', e);
    setError('Failed to load dashboard filter mappings');
  }
}

  function getAssignedFiltersForDashboard(dashboardId: number): FilterItem[] {
    const mapping = dashboardFilterMappings.find(m => m.dashboardId === dashboardId);
    if (!mapping) return [];
    return filters.filter(f => mapping.filterIds.includes(f.id) && f.isActive);
  }

  function isFilterAssignedToDashboard(dashboardId: number, filterId: string): boolean {
    const mapping = dashboardFilterMappings.find(m => m.dashboardId === dashboardId);
    return mapping ? mapping.filterIds.includes(filterId) : false;
  }

  async function toggleFilterForDashboard(dashboardId: number, filterId: string) {
    try {
      setAssignFiltersLoading(true);

      const current = dashboardFilterMappings.find(m => m.dashboardId === dashboardId);
      let newFilterIds: string[] = [];

      if (current) {
        if (current.filterIds.includes(filterId)) {
          newFilterIds = current.filterIds.filter(id => id !== filterId);
        } else {
          newFilterIds = [...current.filterIds, filterId];
        }

        setDashboardFilterMappings(prev =>
          prev.map(m =>
            m.dashboardId === dashboardId ? { ...m, filterIds: newFilterIds } : m
          )
        );
      } else {
        newFilterIds = [filterId];
        setDashboardFilterMappings(prev => [...prev, { dashboardId, filterIds: newFilterIds }]);
      }
      console.log('dashboardId------' + dashboardId);

      await fetch('https://intelligentsalesman.com/ism1/API/save_dashboard_filter_mapping.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardId, filterIds: newFilterIds }),
      });
    } catch (e) {
      console.error('Error updating dashboard filter assignment', e);
      setError('Failed to update dashboard filter assignment');
    } finally {
      setAssignFiltersLoading(false);
    }
  }

  async function refreshDashboardManager() {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadDashboards(),
        loadDataSources(),
        loadFilters(),
        loadDashboardFilterMappings(),
      ]);
      if (selectedDashboard) {
        await loadWidgets(selectedDashboard.id);
      }
    } catch (e) {
      console.error('Error refreshing dashboard manager', e);
      setError('Failed to refresh dashboard manager');
    } finally {
      setIsRefreshing(false);
    }
  }

  /* --- Dashboard CRUD --- */

  function openCreateDashboard() {
    setDashboardModalError(null);
    setDashboardFieldErrors({});
    setDashboardForm({ type: 'STANDARD',page_name: '',tab_name: '', is_default: false, is_active: true, name: '', description: '' });
    setShowDashboardModal(true);
  }

  function openEditDashboard(d: Dashboard) {
    setDashboardModalError(null);
    setDashboardFieldErrors({});
    setDashboardForm({ ...d });
    setShowDashboardModal(true);
  }

  const clearDashboardFieldError = (field: 'name') => {
    setDashboardFieldErrors(prev => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  };

  async function saveDashboard() {
  setError(null);
  setDashboardModalError(null);
  setDashboardFieldErrors({});
  try {
    if (!dashboardForm.name || !dashboardForm.name.trim()) {
      setDashboardFieldErrors({ name: 'Dashboard name is required' });
      return;
    }
    const normalizedTabName = normalizeCommaSeparatedNames(dashboardForm.tab_name);
    const payload: Partial<Dashboard> = {
      name: String(dashboardForm.name ?? '').trim(),
      description: dashboardForm.description ?? '',
      type: dashboardForm.type === 'BASIC' ? 'BASIC' : 'STANDARD',
      owner_user_id: dashboardForm.owner_user_id ?? 1,
      is_default: Boolean(dashboardForm.is_default),
      is_active: dashboardForm.is_active ?? true,
      tab_name: normalizedTabName,
      page_name: '',
    };
    if (dashboardForm.id) {
      // Editing existing dashboard
      const updated = await apiFetch<Dashboard>(`/dashboards/${dashboardForm.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'X-User-Id': '1' },
      });
      setDashboards(prev => prev.map(d => (d.id === updated.id ? updated : d)));
      if (selectedDashboard?.id === updated.id) setSelectedDashboard(updated);
      setShowDashboardModal(false);
    } else {
      // Creating new dashboard
      const created = await apiFetch<Dashboard>('/dashboards', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'X-User-Id': '1' },
      });
      setDashboards(prev => [...prev, created]);
      setSelectedDashboard(created);
      setDashboardForm(created); // Update form with the created dashboard (now has ID)
      setShowDashboardModal(false);
    }
  } catch (e: any) {
    console.error(e);
    setDashboardModalError(e.message || 'Failed to save dashboard');
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
      row_span: 2,
      col_span: 3,
      is_visible: true,
      sort_order: 0,
      title: '',
      tabname: activeWidgetTabName || tabNameOptions[0] || '',
      config_json: {
        tab_name: activeWidgetTabName || tabNameOptions[0] || '',
      },
    });
    setShowWidgetModal(true);
  }

  function openEditWidget(w: Widget) {
    const fallbackTab = (w.config_json?.tab_name as string) ?? '';
    setWidgetForm({ ...w, tabname: w.tabname ?? fallbackTab });
    setShowWidgetModal(true);
  }

  async function saveWidget(merge?: Partial<Widget>) {
  setError(null);
  try {
    const form: Partial<Widget> = merge ? { ...widgetForm, ...merge } : widgetForm;

    const effectiveDashboardId =
      form.dashboard_id ?? selectedDashboard?.id;

    if (!effectiveDashboardId) {
      throw new Error('Widget must be linked to a dashboard');
    }

    const toSafeInt = (value: any, fallback: number) => {
      const n = Number(value);
      return Number.isFinite(n) ? Math.trunc(n) : fallback;
    };
    const normalizedTabName = normalizeCommaSeparatedNames(form.tabname);

    const visual = (form.visual_type as VisualType) ?? 'CHART';
    const chartVariant = ((form.config_json as any)?.chart_variant as ChartType | undefined) ?? (form.chart_type as ChartType | undefined) ?? 'BAR';
    const canonicalChartType: ChartType =
      chartVariant === 'DONUT'
        ? 'PIE'
        : chartVariant === 'AREA' || chartVariant === 'SCATTER' || chartVariant === 'MULTI_SERIES_LINE'
          ? 'LINE'
          : chartVariant === 'HORIZONTAL_BAR' || chartVariant === 'STACKED_BAR' || chartVariant === 'COMBO'
            ? 'BAR'
            : chartVariant;

    // Build normalized payload explicitly so layout fields are always posted.
    const cfgOut: Record<string, any> = {
      ...(form.config_json || {}),
      tab_name: normalizedTabName,
    };
    if (visual === 'CHART') {
      cfgOut.chart_variant = chartVariant;
    } else {
      delete cfgOut.chart_variant;
    }
    if (visual === 'MAP' || visual === 'CHART') {
      delete cfgOut.panel_variant;
    }

    const payload: Partial<Widget> = {
      dashboard_id: toSafeInt(effectiveDashboardId, 0),
      title: String(form.title ?? '').trim(),
      visual_type: visual,
      chart_type: visual === 'CHART' ? canonicalChartType : null as any,
      position_row: toSafeInt(form.position_row, 0),
      position_col: toSafeInt(form.position_col, 0),
      row_span: Math.max(1, toSafeInt(form.row_span, 2)),
      col_span: Math.max(1, toSafeInt(form.col_span, 3)),
      background_color: form.background_color,
      data_source_id: form.data_source_id ?? null,
      refresh_interval_sec: toSafeInt(form.refresh_interval_sec, 0),
      is_visible: form.is_visible ?? true,
      sort_order: toSafeInt(form.sort_order, 0),
      tabname: normalizedTabName,
      config_json: cfgOut,
      interaction_config_json: form.interaction_config_json ?? null,
    };

    let updatedOrCreated: Widget;
    if (form.id) {
      updatedOrCreated = await apiFetch<Widget>(`/widgets/${form.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'X-User-Id': '1' },
      });
      if (updatedOrCreated.id) {
        updatedOrCreated = await apiFetch<Widget>(`/widgets/${updatedOrCreated.id}`, {
          method: 'GET',
          headers: { 'X-User-Id': '1' },
        });
      }
      setWidgets(prev => prev.map(w => (w.id === updatedOrCreated.id ? updatedOrCreated : w)));
    } else {
      updatedOrCreated = await apiFetch<Widget>('/widgets', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'X-User-Id': '1' },
      });

      // Fail-safe: explicitly persist layout after create.
      // Some backend paths/defaults may override POST layout fields.
      if (updatedOrCreated.id) {
        const layoutPersisted = await apiFetch<Widget>(`/widgets/${updatedOrCreated.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            position_row: payload.position_row,
            position_col: payload.position_col,
            row_span: payload.row_span,
            col_span: payload.col_span,
            tabname: payload.tabname,
          }),
          headers: { 'X-User-Id': '1' },
        });
        updatedOrCreated = layoutPersisted || updatedOrCreated;
        updatedOrCreated = await apiFetch<Widget>(`/widgets/${updatedOrCreated.id}`, {
          method: 'GET',
          headers: { 'X-User-Id': '1' },
        });
      }
      setWidgets(prev => [...prev, updatedOrCreated]);
    }

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
      setWidgets(prev =>
        prev.filter(w => {
          const wid = getWidgetNumericId(w);
          return wid === null || wid !== id;
        })
      );
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
      // Keep table/grid state in sync with server truth.
      await loadWidgets(activeTab === 'widgets' ? undefined : selectedDashboard?.id);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to delete widget');
    }
  }

  async function deleteSelectedWidgets() {
    if (selectedWidgetIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedWidgetIds.length} selected widget(s)?`)) return;
    setError(null);
    try {
      const results = await Promise.allSettled(
        selectedWidgetIds.map(id =>
          apiFetch<void>(`/widgets/${id}`, { method: 'DELETE', headers: { 'X-User-Id': '1' } })
        )
      );
      const failed = results.filter(result => result.status === 'rejected').length;
      const deletedIds = selectedWidgetIds.filter((_, idx) => results[idx].status === 'fulfilled');
      const deletedIdSet = new Set(deletedIds.map((id) => Number(id)));

      if (deletedIds.length > 0) {
        setWidgets(prev =>
          prev.filter(w => {
            const wid = getWidgetNumericId(w);
            return wid === null || !deletedIdSet.has(wid);
          })
        );
        setWidgetApiData(prev => {
          const next = { ...prev };
          deletedIds.forEach(id => delete next[id]);
          return next;
        });
        setWidgetLoadingState(prev => {
          const next = { ...prev };
          deletedIds.forEach(id => delete next[id]);
          return next;
        });
        setWidgetErrors(prev => {
          const next = { ...prev };
          deletedIds.forEach(id => delete next[id]);
          return next;
        });
      }

      setSelectedWidgetIds([]);
      // Force refresh so Widget List reflects backend after bulk operations.
      await loadWidgets(activeTab === 'widgets' ? undefined : selectedDashboard?.id);
      if (failed > 0) {
        setError(`Deleted ${deletedIds.length} widget(s). Failed to delete ${failed} widget(s).`);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to delete selected widgets');
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
  

  async function saveDataSource(formData: Partial<DataSource>) {
  setError(null);
  try {
    if (!formData.name || !formData.name.trim()) {
      setError('Data source name required');
      return;
    }

  const payload: Record<string, any> = {
      ...formData,
      is_cached: formData.is_cached ? 1 : 0,
      cache_ttl_sec: formData.cache_ttl_sec || null,
    };

    // Remove undefined keys
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    if (formData.id) {
      const updated = await apiFetch<DataSource>(`/datasources/${formData.id}`, {
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

  /* --- NEW: Drag and Drop Functions --- */

  const handleWidgetDragStart = (widget: Widget) => (e: React.DragEvent) => {
    setDraggedWidget(widget);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', widget.id!.toString());
  };

  const handleDashboardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDashboardDrop = (targetDashboard: Dashboard) => async (e: React.DragEvent) => {
  e.preventDefault();

  if (!draggedWidget) return;

  // Don't link to the same dashboard
  if (draggedWidget.dashboard_id === targetDashboard.id) {
    alert('Widget is already on this dashboard');
    setDraggedWidget(null);
    return;
  }

  try {
    // Clone the dragged widget, but create a NEW one on the target dashboard
    const {
      id,
      dashboard_id,
      created_at,
      updated_at,
      ...rest
    } = draggedWidget;

    const payload: Partial<Widget> = {
      ...rest,
      dashboard_id: targetDashboard.id,
      // optional: reset position so it doesn't collide
      position_row: 0,
      position_col: 0,
      row_span: draggedWidget.row_span ?? 2,
      col_span: draggedWidget.col_span ?? 3,
      is_visible: draggedWidget.is_visible ?? true,
      sort_order: draggedWidget.sort_order ?? 0,
    };

    const newWidget = await apiFetch<Widget>('/widgets', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': '1',
      },
    });

    alert(
      `Widget "${draggedWidget.title}" has been linked to dashboard "${targetDashboard.name}"`
    );

    // Reload widgets if we're viewing the target dashboard
    if (selectedDashboard?.id === targetDashboard.id) {
      await loadWidgets(targetDashboard.id);
    }
  } catch (err: any) {
    console.error('Failed to link widget:', err);
    alert(`Failed to link widget: ${err.message}`);
  } finally {
    setDraggedWidget(null);
  }
};

  /* --- Main render --- */

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Manager</h1>
        <div className="flex gap-2">
          <button onClick={openCreateDashboard} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">Create Dashboard</button>
          <button
            onClick={() => setIsDragMode(!isDragMode)}
            className={`py-2 px-4 rounded-lg font-medium ${isDragMode ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            {isDragMode ? '✓ Drag Mode ON' : 'Enable Drag Mode'}
          </button>
          <button onClick={() => setActiveTab('dashboards')} className={`py-2 px-3 rounded ${activeTab === 'dashboards' ? 'bg-blue-100' : 'bg-gray-100'}`}>Dashboards</button>
          <button onClick={() => { setActiveTab('widgets'); loadWidgets(); }} className={`py-2 px-3 rounded ${activeTab === 'widgets' ? 'bg-blue-100' : 'bg-gray-100'}`}>Widgets</button>
          <button onClick={() => { setActiveTab('datasources'); loadDataSources(); }} className={`py-2 px-3 rounded ${activeTab === 'datasources' ? 'bg-blue-100' : 'bg-gray-100'}`}>Data Sources</button>
          <button
  onClick={() => setActiveTab('createContextMenu')}
  className={`py-2 px-3 rounded ${activeTab === 'createContextMenu' ? 'bg-blue-100' : 'bg-gray-100'}`}
>
  Create Context Menu
</button>
          <button
            onClick={() => {
              setActiveTab('assignFilters');
              loadFilters();
              loadDashboardFilterMappings();
            }}
            className={`py-2 px-3 rounded ${activeTab === 'assignFilters' ? 'bg-blue-100' : 'bg-gray-100'}`}
          >
            Assign Filters
          </button>
          <button
            onClick={refreshDashboardManager}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh Dashboard Manager"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-5 h-5 text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {isDragMode && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Drag Mode Active:</strong> Drag any widget from the selected dashboard below and drop it onto another dashboard card above to link it.
          </p>
        </div>
      )}

      {error && !showDashboardModal && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" /></div>
      ) : (
        <>
          {activeTab === 'dashboards' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6">
                {dashboards.map(d => (
                  <DashboardCard
                    key={d.id}
                    dashboard={d}
                    onSelect={() => { setSelectedDashboard(d); loadWidgets(d.id); }}
                    isSelected={selectedDashboard?.id === d.id}
                    onDragOver={handleDashboardDragOver}
                    onDrop={handleDashboardDrop(d)}
                    onEdit={() => openEditDashboard(d)}
                    onDelete={() => deleteDashboard(d.id)}
                  />
                ))}
                {dashboards.length === 0 && <div className="col-span-full text-gray-500">No dashboards created</div>}
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Selected Dashboard</h2>
                {selectedDashboard ? (
                  <div className="bg-white rounded-lg p-6 shadow">
                    <div className="flex justify-between items-start mb-4">
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

                    {tabNameOptions.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {tabNameOptions.map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setActiveWidgetTabName(tab)}
                              className={`px-3 py-1 rounded-md text-sm border ${
                                activeWidgetTabName === tab
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 w-full" style={{ minHeight: '600px' }}>
                      {visibleWidgetsForActiveTab.length === 0 ? (
                        <div className="p-8 bg-gray-50 rounded text-center text-gray-500">
                          No widgets found for the selected tab.
                        </div>
                      ) : (
                        <GridLayout
                          className="layout"
                          layout={layout.filter((l) => visibleWidgetsForActiveTab.some((w) => w.id?.toString() === l.i))}
                          cols={12}
                          rowHeight={120}
                          width={1400}
                          onLayoutChange={onLayoutChange}
                          onResizeStop={onWidgetResizeStop}
                          onDragStop={onWidgetDragStop}
                          isDraggable={!isDragMode}
                          isResizable={!isDragMode}
                          compactType="vertical"
                          preventCollision={false}
                          useCSSTransforms={true}
                          margin={[16, 16]}
                          containerPadding={[0, 0]}
                        >
                          {visibleWidgetsForActiveTab.map(w => {
                            const ds = dataSources.find(ds => ds.id === w.data_source_id);
                            const apiData = w.id ? widgetApiData[w.id] : undefined;
                            const isLoading = w.id ? widgetLoadingState[w.id] : false;
                            const error = w.id ? widgetErrors[w.id] : undefined;

                            return (
                              <div key={w.id!.toString()} className="bg-white">
                                <WidgetComponent
  widget={w}
  dataSource={ds}
  apiData={apiData}
  isLoading={isLoading}
  error={error}
  isDraggable={isDragMode}
  onDragStart={isDragMode ? handleWidgetDragStart(w) : undefined}
  contextMenus={contextMenus}                             // Add this prop
  widgetContextMenuAssignments={widgetContextMenuAssignments} // Add this prop
/>
                              </div>
                            );
                          })}
                        </GridLayout>
                      )}
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
                  <button
                    onClick={deleteSelectedWidgets}
                    disabled={selectedWidgetIds.length === 0}
                    className={`px-3 py-1 rounded ${
                      selectedWidgetIds.length === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    Delete Selected ({selectedWidgetIds.length})
                  </button>
                  <button onClick={openCreateWidgetForSelectedDashboard} className="px-3 py-1 bg-blue-600 text-white rounded">Add Widget (for selected dashboard)</button>
                  <button onClick={() => loadWidgets()} className="px-3 py-1 bg-gray-200 rounded">Refresh</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          aria-label="Select all widgets"
                          checked={widgets.length > 0 && selectedWidgetIds.length === widgets.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedWidgetIds(
                                widgets
                                  .map((w) => getWidgetNumericId(w))
                                  .filter((id): id is number => id !== null)
                              );
                            } else {
                              setSelectedWidgetIds([]);
                            }
                          }}
                        />
                      </th>
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
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            aria-label={`Select widget ${w.title ?? w.id}`}
                            checked={(() => {
                              const id = getWidgetNumericId(w);
                              return id !== null && selectedWidgetIds.includes(id);
                            })()}
                            onChange={(e) => {
                              const id = getWidgetNumericId(w);
                              if (id === null) return;
                              setSelectedWidgetIds(prev =>
                                e.target.checked
                                  ? Array.from(new Set([...prev, id]))
                                  : prev.filter(existingId => existingId !== id)
                              );
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{w.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {w.visual_type}
                          {(w.config_json?.chart_variant || w.chart_type) && ` (${String(w.config_json?.chart_variant || w.chart_type)})`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dashboards.find(d => d.id === w.dashboard_id)?.name ?? '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Row {w.position_row}, Col {w.position_col}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            className="text-blue-600 mr-3 inline-flex items-center justify-center hover:text-blue-800"
                            onClick={() => openEditWidget(w)}
                            aria-label={`Edit widget ${w.title ?? w.id}`}
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path d="M3 17.25V21h3.75l11-11.03-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 2-1.66z" />
                            </svg>
                          </button>
                          <button
                            className="text-red-600 inline-flex items-center justify-center hover:text-red-800"
                            onClick={() => deleteWidget(w.id)}
                            aria-label={`Delete widget ${w.title ?? w.id}`}
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path d="M6 7h12v2H6V7zm2 3h8l-1 10H9L8 10zm3-6h2l1 1h4v2H6V5h4l1-1z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {widgets.length === 0 && <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No widgets found.</td></tr>}
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
          {activeTab === 'createContextMenu' && <ContextMenuTab />}
           {activeTab === 'assignFilters' && <AssignFiltersTab apiBaseUrl="https://intelligentsalesman.com/ism1/API" />}

          {/* NEW: Assign Filters Tab */}
          {activeTab === 'assignFilters' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">Assign Filters to Dashboards</h2>
                {assignFiltersLoading && (
                  <span className="text-sm text-gray-500">Saving...</span>
                )}
              </div>

              {dashboards.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                  No dashboards available. Please create a dashboard first.
                </div>
              ) : filters.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                  No active filters found. Configure filters in Visual Manager / filter master first.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboards.map(d => {
                    const assignedFilters = getAssignedFiltersForDashboard(d.id);
                    // For now: all filters are "applicable"
                    const applicableFilters = filters.filter(f => f.isActive);

                    return (
                      <div key={d.id} className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-gray-900">
                                {d.name}
                              </h3>
                              {d.description && (
                                <p className="mt-1 text-sm text-gray-500">
                                  {d.description}
                                </p>
                              )}
                            </div>
                            <div className="ml-3 flex-shrink-0 flex items-center gap-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {assignedFilters.length} assigned
                              </span>
                              {d.type && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700">
                                  {d.type}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700">Applicable Filters:</h4>
                            <div className="mt-2 space-y-3 max-h-72 overflow-y-auto pr-1">
                              {applicableFilters.length > 0 ? (
                                applicableFilters.map(filter => {
                                  const isAssigned = isFilterAssignedToDashboard(d.id, filter.id);
                                  return (
                                    <div
                                      key={filter.id}
                                      className={`flex items-center justify-between p-3 rounded-md ${
                                        isAssigned ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                                      }`}
                                    >
                                      <div className="pr-3">
                                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                                          <span className="text-sm font-medium text-gray-900">
                                            {filter.name}
                                          </span>
                                          {filter.table_name && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800">
                                              {filter.table_name}
                                            </span>
                                          )}
                                        </div>
                                        {filter.description && (
                                          <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                                            {filter.description}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => toggleFilterForDashboard(d.id, filter.id)}
                                        className={`p-1.5 rounded-full border ${
                                          isAssigned
                                            ? 'bg-green-600 border-green-600 text-white hover:bg-green-700'
                                            : 'bg-white border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400'
                                        }`}
                                        title={isAssigned ? 'Remove filter' : 'Assign filter'}
                                      >
                                        {isAssigned ? '✓' : '+'}
                                      </button>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-sm text-gray-500 italic">
                                  No applicable filters found.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showDashboardModal && (
        <DashboardModal
          dashboardForm={dashboardForm}
          setDashboardForm={setDashboardForm}
          dashboardModalError={dashboardModalError}
          dashboardFieldErrors={dashboardFieldErrors}
          clearDashboardFieldError={clearDashboardFieldError}
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
          tabNameOptions={tabNameOptions}
          saveWidget={saveWidget}
          setShowWidgetModal={setShowWidgetModal}
          fetchWidgetData={fetchWidgetData}
          existingWidgets={widgets}
        />
      )}
      {showDataSourceModal && (
       <DataSourceModal
  dataSourceForm={dataSourceForm}
  setDataSourceForm={setDataSourceForm}
  saveDataSource={saveDataSource}  // no change needed here, just ensure it accepts param
  setShowDataSourceModal={setShowDataSourceModal}
/>
      )}
    </div>
  );
};

export default DashboardManager;