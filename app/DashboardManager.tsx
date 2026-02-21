
import React, { useEffect, useState, useRef } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
// import 'leaflet/dist/leaflet.css';
// import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import ContextMenuTab from './ContextMenuTab'; // Adjust path as needed
import AssignFiltersTab from './AssignFiltersTab'; // Import the new component
import ReactDOM from 'react-dom';
import { FiRefreshCw } from 'react-icons/fi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
} from 'recharts';
// ... existing interfaces and types ...
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamically import the map component (client-side only)
const MapWidget = dynamic(() => import('../components/MapWidget'), { 
  ssr: false,
  loading: () => <div>Loading map...</div>
});
type DashboardType = 'BASIC' | 'STANDARD';
type VisualType = 'KPI' | 'CHART' | 'TABLE' | 'TEXT' | 'CUSTOM' | 'MAP';
type ChartType = 'BAR' | 'PIE' | 'LINE';
type SourceType = 'API' | 'SQL' | 'STATIC';
type HttpMethod = 'GET' | 'POST';

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
      // @ts-ignore
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
      return { kind: 'table', columns: ['value'], rows: raw.map(r => ({ value: r })), raw };
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

const WidgetComponent: React.FC<{
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
   // MAP widget rendering logic
if (widget.visual_type === 'MAP') {
  const [MapComponents, setMapComponents] = React.useState<any>(null);

  React.useEffect(() => {
    // Dynamically import react-leaflet components on the client side
    const loadMapComponents = async () => {
      const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');
      setMapComponents({ MapContainer, TileLayer, Marker, Popup });
    };

    loadMapComponents();
  }, []);

  let locations: any[] = [];

  if (normalized?.kind === 'raw') {
    const rawData = normalized.raw;

    if (Array.isArray(rawData)) {
      locations = rawData;
    } else if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData.locations)) {
        locations = rawData.locations;
      } else if (Array.isArray(rawData.data)) {
        locations = rawData.data;
      } else if (Array.isArray(rawData.results)) {
        locations = rawData.results;
      }
    }
  }

  // Normalize keys and convert to numbers
  const validLocations = locations
    .map(loc => ({
      lat: Number(loc.lat ?? loc.latitude),
      lng: Number(loc.lng ?? loc.longitude),
      label: loc.label ?? loc.name ?? ''
    }))
    .filter(loc => !isNaN(loc.lat) && !isNaN(loc.lng));

  if (!validLocations.length) {
    return (
      <div className="p-4">
        <h4 className="text-lg font-semibold">{widget.title}</h4>
        <div className="mt-4 text-gray-500">
          No valid location data available.
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Data should be array of objects with lat/lng numbers or numeric strings.
        </div>
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
        const len = chartData.length;
        const points = chartData.map((item: any, i: number) => {
          const x = len === 1 ? 50 : (i / (len - 1)) * 100;
          const y = 100 - ((Number(item.value || 0) / Math.max(1, Number(maxValue))) * 100);
          return `${x},${y}`;
        }).join(' ');

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
      const ticks = Array.from({ length: yTicks }, (_, i) => {
        const val = Math.round(((yTicks - 1 - i) / (yTicks - 1)) * Number(maxValue));
        return val;
      });

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
      const t = normalized && normalized.kind === 'table' ? normalized : (apiData?.normalized && apiData.normalized.kind === 'table' ? apiData.normalized : null);
      const tableColumns = t ? t.columns : (apiData?.columns ?? cfg.columns ?? ['Column']);
      const tableRows = t ? t.rows : (apiData?.rows ?? cfg.rows ?? []);

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
                          {r[c] ?? r[c.toLowerCase()] ?? '-'}
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

        <label className="block mb-1 font-medium">Page Name</label>
<input
  type="text"
  className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
  value={dashboardForm.page_name ?? ''}
  onChange={e =>
    setDashboardForm(prev => ({ ...prev, page_name: e.target.value }))
  }
/>

<label className="block mb-1 font-medium">Tab Name</label>
<input
  type="text"
  className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
  value={dashboardForm.tab_name ?? ''}
  onChange={e =>
    setDashboardForm(prev => ({ ...prev, tab_name: e.target.value }))
  }
/>

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
  existingWidgets: Widget[];
}> = ({
  widgetForm,
  setWidgetForm,
  dataSources,
  saveWidget,
  setShowWidgetModal,
  fetchWidgetData,
  existingWidgets
}) => {
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
          <option value="MAP">MAP</option>
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
            <label className="block mb-1 font-medium">Col Span (Width)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={widgetForm.col_span ?? 3}
              min={1}
              max={12}
              onChange={e => setWidgetForm(prev => ({ ...prev, col_span: parseInt(e.target.value || '3') }))}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Row Span (Height)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={widgetForm.row_span ?? 2}
              min={1}
              onChange={e => setWidgetForm(prev => ({ ...prev, row_span: parseInt(e.target.value || '2') }))}
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
        <label className="block mb-1 font-medium">Context Menu Options (JSON)</label>
<textarea
  className="w-full border border-gray-300 rounded px-3 py-2 mb-3 font-mono text-xs min-h-[100px]"
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
<p className="text-xs text-gray-500 mb-3">
  Define the context menu options for this widget as a JSON array of objects with "label" and "action" keys.
</p>

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
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start z-50 pt-12">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-lg">
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

        <hr className="my-3" />

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

        <div className="flex justify-end gap-2 mt-4">
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
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [widgetForm, setWidgetForm] = useState<Partial<Widget>>({});
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [dataSourceForm, setDataSourceForm] = useState<Partial<DataSource>>({});
  const [contextMenus, setContextMenus] = useState<any[]>([]);
const [widgetContextMenuAssignments, setWidgetContextMenuAssignments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const onLayoutChange = async (newLayout: any[]) => {
    setLayout(newLayout);

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

      updatedWidgets.forEach(async (w) => {
        if (w.id) {
          try {
            await apiFetch(`/widgets/${w.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                position_row: w.position_row,
                position_col: w.position_col,
                row_span: w.row_span,
                col_span: w.col_span,
              }),
              headers: { 'Content-Type': 'application/json', 'X-User-Id': '1' },
            });
          } catch (e) {
            console.error(`Failed to save widget ${w.id} position/size`, e);
          }
        }
      });

      return updatedWidgets;
    });
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
    setDashboardForm({ type: 'STANDARD',page_name: '',tab_name: '', is_default: false, is_active: true, name: '', description: '' });
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
      // Editing existing dashboard
      const updated = await apiFetch<Dashboard>(`/dashboards/${dashboardForm.id}`, {
        method: 'PUT',
        body: JSON.stringify(dashboardForm),
        headers: { 'X-User-Id': '1' },
      });
      setDashboards(prev => prev.map(d => (d.id === updated.id ? updated : d)));
      if (selectedDashboard?.id === updated.id) setSelectedDashboard(updated);
      setShowDashboardModal(false);
    } else {
      // Creating new dashboard
      const created = await apiFetch<Dashboard>('/dashboards', {
        method: 'POST',
        body: JSON.stringify(dashboardForm),
        headers: { 'X-User-Id': '1' },
      });
      setDashboards(prev => [...prev, created]);
      setSelectedDashboard(created);
      setDashboardForm(created); // Update form with the created dashboard (now has ID)
      setShowDashboardModal(false);
    }
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
      row_span: 2,
      col_span: 3,
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
    const effectiveDashboardId =
      widgetForm.dashboard_id ?? selectedDashboard?.id;

    if (!effectiveDashboardId) {
      throw new Error('Widget must be linked to a dashboard');
    }

    // Ensure title
    if (!widgetForm.title || !widgetForm.title.trim()) {
      widgetForm.title = 'Untitled';
    }

    // Build payload explicitly with dashboard_id
    const payload: Partial<Widget> = {
      ...widgetForm,
      dashboard_id: effectiveDashboardId,
    };

    let updatedOrCreated: Widget;
    if (widgetForm.id) {
      updatedOrCreated = await apiFetch<Widget>(`/widgets/${widgetForm.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'X-User-Id': '1' },
      });
      setWidgets(prev =>
        prev.map(w => (w.id === updatedOrCreated.id ? updatedOrCreated : w)),
      );
    } else {
      updatedOrCreated = await apiFetch<Widget>('/widgets', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'X-User-Id': '1' },
      });
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
      setWidgets(prev => prev.filter(w => w.id !== id));
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
  

  async function saveDataSource(formData: Partial<DataSource>) {
  setError(null);
  try {
    if (!formData.name || !formData.name.trim()) {
      setError('Data source name required');
      return;
    }

    const payload = {
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

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

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

                    <div className="mt-6 w-full" style={{ minHeight: '600px' }}>
                      {widgets.length === 0 ? (
                        <div className="p-8 bg-gray-50 rounded text-center text-gray-500">
                          No widgets. Click "Add Widget" to create one.
                        </div>
                      ) : (
                        <GridLayout
                          className="layout"
                          layout={layout}
                          cols={12}
                          rowHeight={120}
                          width={1400}
                          onLayoutChange={onLayoutChange}
                          isDraggable={!isDragMode}
                          isResizable={!isDragMode}
                          compactType="vertical"
                          preventCollision={false}
                          useCSSTransforms={true}
                          margin={[16, 16]}
                          containerPadding={[0, 0]}
                        >
                          {widgets.map(w => {
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