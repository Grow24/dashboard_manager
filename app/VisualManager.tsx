// VisualManager.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Check, X, Plus, Edit3, Trash2, Copy, MoveUp, MoveDown } from 'lucide-react';
import QueryBuilder, { QueryBuilderData } from './QueryBuilder';

interface FilterItem {
  id: string;
  name: string;
  type: string;
  field: string;
  table_name: string;
  isActive: boolean;
  description?: string;
}

interface Page {
  id: string;
  name: string;
  tables: string[];
  description?: string;
  is_active?: boolean;
  query_builder?: any;
  visual_schema?: VisualSchema | string | null;
  created_at?: string;
  updated_at?: string;
}

interface PageFilterMapping {
  pageId: string;
  filterIds: string[];
}

const API_BASE = 'https://intelligentsalesman.com/ism1/API';

// ================= Visual Designer Types =================

type VisualType =
  | 'table'
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'kpi'
  | 'heatmap'
  | 'combo'
  | 'pivot';

type Aggregate = 'none' | 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct';

interface FieldBinding {
  field: string;        // column name
  label?: string;       // display label
  aggregate?: Aggregate;
  format?: string;      // e.g. currency, percent, number, date
  sort?: 'asc' | 'desc' | 'none';
}

interface AxisSettings {
  title?: string;
  showGrid?: boolean;
  tickFormat?: string;
  rotateTicks?: number;
}

interface LegendSettings {
  show?: boolean;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

interface TooltipSettings {
  show?: boolean;
  format?: string;
}

interface KPISettings {
  value: FieldBinding | null;
  comparison?: FieldBinding | null;
  trendField?: FieldBinding | null;
  target?: number | null;
  prefix?: string;
  suffix?: string;
  colorUp?: string;
  colorDown?: string;
}

interface HeatmapSettings {
  x: FieldBinding | null;
  y: FieldBinding | null;
  value: FieldBinding | null;
  colorScheme?: string;
}

interface ComboSeries {
  type: 'bar' | 'line' | 'area';
  y: FieldBinding | null;
  yAxis?: 'left' | 'right';
  color?: string;
}

interface PivotSettings {
  rows: FieldBinding[];
  columns: FieldBinding[];
  values: FieldBinding[]; // with aggregates
  showTotals?: boolean;
  showSubtotals?: boolean;
}

interface VisualConfig {
  id: string;
  title: string;
  type: VisualType;

  // Encodings
  x?: FieldBinding | null;
  y?: FieldBinding | null;
  series?: FieldBinding | null;   // for color/series split
  size?: FieldBinding | null;     // scatter bubble size
  color?: FieldBinding | null;    // continuous or categorical color

  // Visual-specific settings
  axis?: {
    x?: AxisSettings;
    y?: AxisSettings;
  };
  legend?: LegendSettings;
  tooltip?: TooltipSettings;

  // Table specific
  tableColumns?: FieldBinding[];

  // KPI specific
  kpi?: KPISettings;

  // Heatmap specific
  heatmap?: HeatmapSettings;

  // Combo specific
  combo?: {
    x: FieldBinding | null;
    series: ComboSeries[];
    axis?: { left?: AxisSettings; right?: AxisSettings };
  };

  // Pivot specific
  pivot?: PivotSettings;

  // Layout
  width?: number;   // 1..12
  height?: number;  // rows (for grid), optional
}

interface VisualSchema {
  layoutColumns: 12;
  gap: number;
  subVisuals: VisualConfig[];
}

// Helpers
const newId = () => Math.random().toString(36).slice(2, 9);

const defaultVisualSchema = (): VisualSchema => ({
  layoutColumns: 12,
  gap: 12,
  subVisuals: [
    {
      id: newId(),
      title: 'New Visual',
      type: 'table',
      tableColumns: [],
      legend: { show: true, position: 'right' },
      tooltip: { show: true },
      width: 12,
    }
  ]
});

// ================== Visual Manager ==================

const VisualManager: React.FC = () => {
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [pageFilterMappings, setPageFilterMappings] = useState<PageFilterMapping[]>([]);
  const [applicableFiltersMap, setApplicableFiltersMap] = useState<Record<string, FilterItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Page CRUD modals
  const [showCreatePageModal, setShowCreatePageModal] = useState(false);
  const [showEditPageModal, setShowEditPageModal] = useState(false);
  const [showDeletePageConfirm, setShowDeletePageConfirm] = useState(false);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);

  // Page form fields
  const [pageName, setPageName] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [tablesUsed, setTablesUsed] = useState('');

  // Query Builder Data
  const [queryBuilderData, setQueryBuilderData] = useState<QueryBuilderData | undefined>();

  // Visual Designer state
  const [visualSchema, setVisualSchema] = useState<VisualSchema>(defaultVisualSchema());

  useEffect(() => {
    fetchData();
  }, []);

  const getApplicableFiltersForPage = async (page: Page): Promise<FilterItem[]> => {
    try {
      const res = await fetch(`${API_BASE}/get_applicable_filters.php?pageId=${page.id}`);
      const data = await res.json();
      if (data.success) {
        return data.filters.map((f: any) => ({
          id: f.id.toString(),
          name: f.name,
          type: f.type,
          field: f.field,
          table_name: f.table_name || '',
          isActive: !!f.isActive,
          description: f.description
        }));
      }
    } catch (err) {
      console.error('Error fetching applicable filters:', err);
    }
    return [];
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch filters
      const filtersResponse = await fetch(`${API_BASE}/get_filters.php`);
      const filtersData = await filtersResponse.json();
      if (filtersData.success) {
        const normalizedFilters = filtersData.filters.map((f: any) => ({
          id: f.id.toString(),
          name: f.name,
          type: f.type,
          field: f.field,
          table_name: f.table_name || '',
          isActive: !!f.isActive,
          description: f.description
        }));
        setFilters(normalizedFilters);
      }

      // Fetch pages
      const pagesResponse = await fetch(`${API_BASE}/get_pages_with_tables.php`);
      const pagesData = await pagesResponse.json();

      let parsedPages: Page[] = [];
      if (pagesData.success) {
        parsedPages = pagesData.pages.map((page: any) => ({
          ...page,
          query_builder: typeof page.query_builder === 'string' && page.query_builder
            ? JSON.parse(page.query_builder)
            : page.query_builder,
          visual_schema: (() => {
            try {
              if (typeof page.visual_schema === 'string' && page.visual_schema) {
                return JSON.parse(page.visual_schema);
              }
              return page.visual_schema || null;
            } catch {
              return null;
            }
          })()
        }));
        setPages(parsedPages);
      }

      // Fetch mappings
      const mappingsResponse = await fetch(`${API_BASE}/get_filter_page_mappings.php`);
      const mappingsData = await mappingsResponse.json();
      if (mappingsData.success) {
        setPageFilterMappings(mappingsData.mappings);
      }

      // Fetch applicable filters for each page
      const filtersByPage: Record<string, FilterItem[]> = {};
      for (const page of parsedPages) {
        const applicable = await getApplicableFiltersForPage(page);
        filtersByPage[page.id] = applicable;
      }
      setApplicableFiltersMap(filtersByPage);

      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getAssignedFiltersForPage = (pageId: string): FilterItem[] => {
    const mapping = pageFilterMappings.find(m => m.pageId === pageId);
    if (!mapping) return [];
    return filters.filter(filter => mapping.filterIds.includes(filter.id) && filter.isActive);
  };

  const toggleFilterForPage = async (pageId: string, filterId: string) => {
    try {
      const currentMapping = pageFilterMappings.find(m => m.pageId === pageId);
      let newFilterIds: string[] = [];

      if (currentMapping) {
        if (currentMapping.filterIds.includes(filterId)) {
          newFilterIds = currentMapping.filterIds.filter(id => id !== filterId);
        } else {
          newFilterIds = [...currentMapping.filterIds, filterId];
        }

        const updatedMappings = pageFilterMappings.map(m =>
          m.pageId === pageId ? { ...m, filterIds: newFilterIds } : m
        );
        setPageFilterMappings(updatedMappings);
      } else {
        const newMapping = { pageId, filterIds: [filterId] };
        setPageFilterMappings([...pageFilterMappings, newMapping]);
      }

      await fetch(`${API_BASE}/save_filter_page_mapping.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, filterIds: newFilterIds })
      });
    } catch (err) {
      console.error('Error updating filter assignment:', err);
      setError('Failed to update filter assignment.');
    }
  };

  const isFilterAssignedToPage = (pageId: string, filterId: string): boolean => {
    const mapping = pageFilterMappings.find(m => m.pageId === pageId);
    return mapping ? mapping.filterIds.includes(filterId) : false;
  };

  const openCreatePageModal = () => {
    setPageName('');
    setPageDescription('');
    setTablesUsed('');
    setSelectedPage(null);
    setQueryBuilderData(undefined);
    setVisualSchema(defaultVisualSchema());
    setShowCreatePageModal(true);
  };

  const handleCreatePage = async () => {
    if (!pageName.trim()) {
      alert('Please enter a visual name');
      return;
    }

    try {
      const payload = {
        page_name: pageName,
        page_description: pageDescription,
        tables_used: tablesUsed,
        is_active: 1,
        query_builder: queryBuilderData,
        visual_schema: visualSchema
      };

      const res = await fetch(`${API_BASE}/api/create_page.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        await fetchData();
        setShowCreatePageModal(false);
        setPageName('');
        setPageDescription('');
        setTablesUsed('');
        setQueryBuilderData(undefined);
        setVisualSchema(defaultVisualSchema());
      } else {
        alert('Create failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Create failed. See console for details.');
    }
  };

  const openEditPageModal = (page: Page) => {
    setSelectedPage(page);
    setPageName(page.name);
    setPageDescription(page.description || '');
    setTablesUsed(page.tables.join(', '));
    setQueryBuilderData(page.query_builder);
    setVisualSchema(
      (page.visual_schema && typeof page.visual_schema === 'object')
        ? (page.visual_schema as VisualSchema)
        : defaultVisualSchema()
    );
    setShowEditPageModal(true);
  };

  const handleUpdatePage = async () => {
    if (!selectedPage) return;
    if (!pageName.trim()) {
      alert('Please enter a visual name');
      return;
    }

    try {
      const payload = {
        id: selectedPage.id,
        page_name: pageName,
        page_description: pageDescription,
        tables_used: tablesUsed,
        is_active: 1,
        query_builder: queryBuilderData,
        visual_schema: visualSchema
      };

      const res = await fetch(`${API_BASE}/api/update_page.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        await fetchData();
        setShowEditPageModal(false);
        setSelectedPage(null);
        setQueryBuilderData(undefined);
      } else {
        alert('Update failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Update failed. See console for details.');
    }
  };

  const confirmDeletePage = (page: Page) => {
    setSelectedPage(page);
    setShowDeletePageConfirm(true);
  };

  const handleDeletePage = async () => {
    if (!selectedPage) return;
    try {
      const res = await fetch(`${API_BASE}/api/delete_page.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedPage.id })
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        setShowDeletePageConfirm(false);
        setSelectedPage(null);
      } else {
        alert('Delete failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Delete failed. See console for details.');
    }
  };

  // ====== Helpers for Visual Designer ======
  const currentFields = useMemo(() => {
    // derive from query builder columns or fieldOptions if you persist them
    // quick fallback: parse columns string into array of names
    const raw = queryBuilderData?.columns?.trim();
    if (!raw || raw === '*') return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }, [queryBuilderData?.columns]);

  const addSubVisual = () => {
    setVisualSchema(vs => ({
      ...vs,
      subVisuals: [
        ...vs.subVisuals,
        {
          id: newId(),
          title: 'New Visual',
          type: 'table',
          tableColumns: [],
          legend: { show: true, position: 'right' },
          tooltip: { show: true },
          width: 6
        }
      ]
    }));
  };

  const duplicateSubVisual = (id: string) => {
    setVisualSchema(vs => {
      const idx = vs.subVisuals.findIndex(v => v.id === id);
      if (idx === -1) return vs;
      const clone = JSON.parse(JSON.stringify(vs.subVisuals[idx])) as VisualConfig;
      clone.id = newId();
      clone.title = clone.title + ' (Copy)';
      const arr = [...vs.subVisuals];
      arr.splice(idx + 1, 0, clone);
      return { ...vs, subVisuals: arr };
    });
  };

  const moveSubVisual = (id: string, direction: 'up' | 'down') => {
    setVisualSchema(vs => {
      const arr = [...vs.subVisuals];
      const idx = arr.findIndex(v => v.id === id);
      if (idx === -1) return vs;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= arr.length) return vs;
      const [item] = arr.splice(idx, 1);
      arr.splice(newIdx, 0, item);
      return { ...vs, subVisuals: arr };
    });
  };

  const removeSubVisual = (id: string) => {
    setVisualSchema(vs => ({ ...vs, subVisuals: vs.subVisuals.filter(v => v.id !== id) }));
  };

  const updateSubVisual = (id: string, patch: Partial<VisualConfig>) => {
    setVisualSchema(vs => ({
      ...vs,
      subVisuals: vs.subVisuals.map(v => (v.id === id ? { ...v, ...patch } : v))
    }));
  };

  const FieldPicker = ({
    label,
    value,
    onChange,
    allowAggregate = false
  }: {
    label: string;
    value: FieldBinding | null | undefined;
    onChange: (fb: FieldBinding | null) => void;
    allowAggregate?: boolean;
  }) => {
    return (
      <div className="flex gap-2 items-center mb-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">{label}</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={value?.field || ''}
            onChange={(e) => onChange(e.target.value ? { ...(value || { aggregate: 'none' }), field: e.target.value } : null)}
          >
            <option value="">—</option>
            {currentFields.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        {allowAggregate && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Agg</label>
            <select
              className="border rounded px-2 py-1"
              value={value?.aggregate || 'none'}
              onChange={(e) => onChange({ ...(value || { field: '' }), aggregate: e.target.value as Aggregate })}
            >
              {['none','sum','avg','min','max','count','distinct'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  const VisualEditorPanel = ({ v }: { v: VisualConfig }) => {
    const commonXY =
      v.type === 'bar' || v.type === 'line' || v.type === 'area' || v.type === 'scatter' || v.type === 'combo';

    return (
      <div className="border rounded p-3 bg-gray-50">
        <label className="block text-xs text-gray-600 mb-1">Title</label>
        <input
          className="w-full border rounded px-2 py-1 mb-3"
          value={v.title}
          onChange={e => updateSubVisual(v.id, { title: e.target.value })}
        />

        <label className="block text-xs text-gray-600 mb-1">Type</label>
        <select
          className="w-full border rounded px-2 py-1 mb-3"
          value={v.type}
          onChange={(e) => {
            const newType = e.target.value as VisualType;
            const reset: Partial<VisualConfig> = { type: newType };
            if (newType === 'table') {
              reset.tableColumns = v.tableColumns || [];
            } else if (newType === 'kpi') {
              reset.kpi = v.kpi || { value: null, prefix: '', suffix: '', target: null, colorUp: '#16a34a', colorDown: '#dc2626' };
            } else if (newType === 'heatmap') {
              reset.heatmap = v.heatmap || { x: null, y: null, value: null, colorScheme: 'viridis' };
            } else if (newType === 'combo') {
              reset.combo = v.combo || { x: null, series: [] };
            } else if (newType === 'pivot') {
              reset.pivot = v.pivot || { rows: [], columns: [], values: [], showTotals: true, showSubtotals: true };
            }
            updateSubVisual(v.id, reset);
          }}
        >
          {['table','bar','line','area','pie','donut','scatter','kpi','heatmap','combo','pivot'].map(t => (
            <option key={t} value={t}>{t.toUpperCase()}</option>
          ))}
        </select>

        {/* Width */}
        <label className="block text-xs text-gray-600 mb-1">Width (1-12)</label>
        <input
          type="number"
          min={1}
          max={12}
          className="w-24 border rounded px-2 py-1 mb-3"
          value={v.width ?? 12}
          onChange={e => updateSubVisual(v.id, { width: Math.max(1, Math.min(12, Number(e.target.value || 12))) })}
        />

        {/* Encodings by type */}
        {v.type === 'table' && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Table Columns</span>
              <button
                className="text-blue-600 text-sm"
                onClick={() => updateSubVisual(v.id, { tableColumns: (v.tableColumns || []).concat([{ field: '', aggregate: 'none' } as FieldBinding]) })}
              >
                + Add Column
              </button>
            </div>
            {(v.tableColumns || []).map((col, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <FieldPicker
                  label={`Column ${idx + 1}`}
                  value={col}
                  allowAggregate
                  onChange={(fb) => {
                    const arr = [...(v.tableColumns || [])];
                    arr[idx] = fb || { field: '', aggregate: 'none' };
                    updateSubVisual(v.id, { tableColumns: arr });
                  }}
                />
                <button
                  className="text-red-600 text-xs"
                  onClick={() => {
                    const arr = [...(v.tableColumns || [])];
                    arr.splice(idx, 1);
                    updateSubVisual(v.id, { tableColumns: arr });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {(v.type === 'pie' || v.type === 'donut') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldPicker label="Category" value={v.x || null} onChange={(fb) => updateSubVisual(v.id, { x: fb })} />
            <FieldPicker label="Value" value={v.y || null} allowAggregate onChange={(fb) => updateSubVisual(v.id, { y: fb })} />
          </div>
        )}

        {(v.type === 'bar' || v.type === 'line' || v.type === 'area') && (
          <>
            <FieldPicker label="X Axis" value={v.x || null} onChange={(fb) => updateSubVisual(v.id, { x: fb })} />
            <FieldPicker label="Y Axis" value={v.y || null} allowAggregate onChange={(fb) => updateSubVisual(v.id, { y: fb })} />
            <FieldPicker label="Series (optional)" value={v.series || null} onChange={(fb) => updateSubVisual(v.id, { series: fb })} />
          </>
        )}

        {v.type === 'scatter' && (
          <>
            <FieldPicker label="X" value={v.x || null} onChange={(fb) => updateSubVisual(v.id, { x: fb })} />
            <FieldPicker label="Y" value={v.y || null} onChange={(fb) => updateSubVisual(v.id, { y: fb })} />
            <FieldPicker label="Size (optional)" value={v.size || null} onChange={(fb) => updateSubVisual(v.id, { size: fb })} />
            <FieldPicker label="Color (optional)" value={v.color || null} onChange={(fb) => updateSubVisual(v.id, { color: fb })} />
          </>
        )}

        {v.type === 'kpi' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldPicker label="Value" value={v.kpi?.value || null} allowAggregate onChange={(fb) => updateSubVisual(v.id, { kpi: { ...(v.kpi || {}), value: fb } })} />
            <FieldPicker label="Comparison (optional)" value={v.kpi?.comparison || null} allowAggregate onChange={(fb) => updateSubVisual(v.id, { kpi: { ...(v.kpi || {}), comparison: fb } })} />
            <FieldPicker label="Trend Field (optional)" value={v.kpi?.trendField || null} onChange={(fb) => updateSubVisual(v.id, { kpi: { ...(v.kpi || {}), trendField: fb } })} />
            <div>
              <label className="block text-xs text-gray-600 mb-1">Target (optional)</label>
              <input
                className="w-full border rounded px-2 py-1"
                type="number"
                value={v.kpi?.target ?? ''}
                onChange={e => updateSubVisual(v.id, { kpi: { ...(v.kpi || {}), target: e.target.value === '' ? null : Number(e.target.value) } })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Prefix</label>
              <input className="w-full border rounded px-2 py-1" value={v.kpi?.prefix ?? ''} onChange={e => updateSubVisual(v.id, { kpi: { ...(v.kpi || {}), prefix: e.target.value } })} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Suffix</label>
              <input className="w-full border rounded px-2 py-1" value={v.kpi?.suffix ?? ''} onChange={e => updateSubVisual(v.id, { kpi: { ...(v.kpi || {}), suffix: e.target.value } })} />
            </div>
          </div>
        )}

        {v.type === 'heatmap' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldPicker label="X" value={v.heatmap?.x || null} onChange={(fb) => updateSubVisual(v.id, { heatmap: { ...(v.heatmap || {}), x: fb } })} />
            <FieldPicker label="Y" value={v.heatmap?.y || null} onChange={(fb) => updateSubVisual(v.id, { heatmap: { ...(v.heatmap || {}), y: fb } })} />
            <FieldPicker label="Value" value={v.heatmap?.value || null} allowAggregate onChange={(fb) => updateSubVisual(v.id, { heatmap: { ...(v.heatmap || {}), value: fb } })} />
          </div>
        )}

        {v.type === 'combo' && (
          <div className="border rounded p-2">
            <FieldPicker label="X" value={v.combo?.x || null} onChange={(fb) => updateSubVisual(v.id, { combo: { ...(v.combo || { x: null, series: [] }), x: fb } })} />
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Series</span>
              <button
                className="text-blue-600 text-sm"
                onClick={() => updateSubVisual(v.id, {
                  combo: {
                    ...(v.combo || { x: null, series: [] }),
                    series: [...(v.combo?.series || []), { type: 'bar', y: null, yAxis: 'left' }]
                  }
                })}
              >
                + Add Series
              </button>
            </div>
            {(v.combo?.series || []).map((s, idx) => (
              <div key={idx} className="border rounded p-2 mb-2 bg-white">
                <div className="flex gap-2">
                  <label className="text-xs text-gray-600">Type</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={s.type}
                    onChange={e => {
                      const series = [...(v.combo?.series || [])];
                      series[idx] = { ...s, type: e.target.value as ComboSeries['type'] };
                      updateSubVisual(v.id, { combo: { ...(v.combo || { x: null, series: [] }), series } });
                    }}
                  >
                    <option value="bar">Bar</option>
                    <option value="line">Line</option>
                    <option value="area">Area</option>
                  </select>
                  <label className="text-xs text-gray-600">Y Axis</label>
                  <select
                    className="border rounded px-2 py-1"
                    value={s.yAxis || 'left'}
                    onChange={e => {
                      const series = [...(v.combo?.series || [])];
                      series[idx] = { ...s, yAxis: e.target.value as 'left' | 'right' };
                      updateSubVisual(v.id, { combo: { ...(v.combo || { x: null, series: [] }), series } });
                    }}
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                  <button
                    className="text-red-600 text-xs ml-auto"
                    onClick={() => {
                      const series = [...(v.combo?.series || [])];
                      series.splice(idx, 1);
                      updateSubVisual(v.id, { combo: { ...(v.combo || { x: null, series: [] }), series } });
                    }}
                  >
                    Remove
                  </button>
                </div>
                <FieldPicker
                  label="Y"
                  value={s.y || null}
                  allowAggregate
                  onChange={(fb) => {
                    const series = [...(v.combo?.series || [])];
                    series[idx] = { ...s, y: fb };
                    updateSubVisual(v.id, { combo: { ...(v.combo || { x: null, series: [] }), series } });
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {v.type === 'pivot' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border rounded p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Rows</span>
                <button
                  className="text-blue-600 text-sm"
                  onClick={() => updateSubVisual(v.id, { pivot: { ...(v.pivot || { rows: [], columns: [], values: [] }), rows: [ ...(v.pivot?.rows || []), { field: '', aggregate: 'none' } as FieldBinding ] } })}
                >
                  + Add Row
                </button>
              </div>
              {(v.pivot?.rows || []).map((fb, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <FieldPicker label={`Row ${idx + 1}`} value={fb} onChange={(nfb) => {
                    const arr = [ ...(v.pivot?.rows || []) ];
                    arr[idx] = nfb || { field: '' };
                    updateSubVisual(v.id, { pivot: { ...(v.pivot || { rows: [], columns: [], values: [] }), rows: arr } });
                  }} />
                  <button className="text-red-600 text-xs" onClick={() => {
                    const arr = [ ...(v.pivot?.rows || []) ];
                    arr.splice(idx, 1);
                    updateSubVisual(v.id, { pivot: { ...(v.pivot || { rows: [], columns: [], values: [] }), rows: arr } });
                  }}>Remove</button>
                </div>
              ))}
            </div>
            <div className="border rounded p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Columns</span>
                <button
                  className="text-blue-600 text-sm"
                  onClick={() => updateSubVisual(v.id, { pivot: { ...(v.pivot || { rows: [], columns: [], values: [] }), columns: [ ...(v.pivot?.columns || []), { field: '', aggregate: 'none' } as FieldBinding ] } })}
                >
                  + Add Column
                </button>
              </div>
              {(v.pivot?.columns || []).map((fb, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <FieldPicker label={`Column ${idx + 1}`} value={fb} onChange={(nfb) => {
                    const arr = [ ...(v.pivot?.columns || []) ];
                    arr[idx] = nfb || { field: '' };
                    updateSubVisual(v.id, { pivot: { ...(v.pivot || { rows: [], columns: [], values: [] }), columns: arr } });
                  }} />
                  <button className="text-red-600 text-xs" onClick={() => {
                    const arr = [ ...(v.pivot?.columns || []) ];
                    arr.splice(idx, 1);
                    updateSubVisual(v.id, { pivot: { ...(v.pivot || { rows: [], columns: [], values: [] }), columns: arr } });
                  }}>Remove</button>
                </div>
              ))}
            </div>
            <div className="md:col-span-2 border rounded p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Values</span>
                <button
                  className="text-blue-600 text-sm"
                  onClick={() => updateSubVisual(v.id, { pivot: { ...(v.pivot || { rows: [], columns: [], values: [] }), values: [ ...(v.pivot?.values || []), { field: '', aggregate: 'sum' } as FieldBinding ] } })}
                >
                  + Add Value
                </button>
              </div>
              {(v.pivot?.values || []).map((fb, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <FieldPicker label={`Value ${idx + 1}`} value={fb} allowAggregate onChange={(nfb) => {
                    const arr = [ ...(v.pivot?.values || []) ];
                    arr[idx] = nfb || { field: '', aggregate: 'sum' };
                    updateSubVisual(v.id, { pivot: { ...(v.pivot || { rows: [], columns: [], values: [] }), values: arr } });
                  }} />
                  <button className="text-red-600 text-xs" onClick={() => {
                    const arr = [ ...(v.pivot?.values || []) ];
                    arr.splice(idx, 1);
                    updateSubVisual(v.id, { pivot: { ...(v.pivot || { rows: [], columns: [], values: [] }), values: arr } });
                  }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common Options */}
        {commonXY && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="border rounded p-2">
              <div className="text-sm font-medium mb-2">X Axis</div>
              <label className="block text-xs text-gray-600 mb-1">Title</label>
              <input
                className="w-full border rounded px-2 py-1 mb-2"
                value={v.axis?.x?.title || ''}
                onChange={e => updateSubVisual(v.id, { axis: { ...(v.axis || {}), x: { ...(v.axis?.x || {}), title: e.target.value } } })}
              />
              <label className="block text-xs text-gray-600 mb-1">Tick Rotation</label>
              <input
                type="number"
                className="w-24 border rounded px-2 py-1"
                value={v.axis?.x?.rotateTicks ?? 0}
                onChange={e => updateSubVisual(v.id, { axis: { ...(v.axis || {}), x: { ...(v.axis?.x || {}), rotateTicks: Number(e.target.value || 0) } } })}
              />
            </div>
            <div className="border rounded p-2">
              <div className="text-sm font-medium mb-2">Y Axis</div>
              <label className="block text-xs text-gray-600 mb-1">Title</label>
              <input
                className="w-full border rounded px-2 py-1 mb-2"
                value={v.axis?.y?.title || ''}
                onChange={e => updateSubVisual(v.id, { axis: { ...(v.axis || {}), y: { ...(v.axis?.y || {}), title: e.target.value } } })}
              />
              <label className="block text-xs text-gray-600 mb-1">Format</label>
              <input
                className="w-full border rounded px-2 py-1"
                placeholder="e.g. $0,0.00"
                value={v.axis?.y?.tickFormat || ''}
                onChange={e => updateSubVisual(v.id, { axis: { ...(v.axis || {}), y: { ...(v.axis?.y || {}), tickFormat: e.target.value } } })}
              />
            </div>
          </div>
        )}

        {/* Legend and tooltip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <div className="border rounded p-2">
            <div className="text-sm font-medium mb-2">Legend</div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={v.legend?.show ?? true}
                onChange={e => updateSubVisual(v.id, { legend: { ...(v.legend || {}), show: e.target.checked } })}
              />
              <span className="text-sm">Show Legend</span>
            </div>
            <label className="block text-xs text-gray-600 mb-1">Position</label>
            <select
              className="border rounded px-2 py-1"
              value={v.legend?.position || 'right'}
              onChange={e => updateSubVisual(v.id, { legend: { ...(v.legend || { show: true }), position: e.target.value as LegendSettings['position'] } })}
            >
              {['top','right','bottom','left'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="border rounded p-2">
            <div className="text-sm font-medium mb-2">Tooltip</div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={v.tooltip?.show ?? true}
                onChange={e => updateSubVisual(v.id, { tooltip: { ...(v.tooltip || {}), show: e.target.checked } })}
              />
              <span className="text-sm">Show Tooltip</span>
            </div>
            <label className="block text-xs text-gray-600 mb-1">Format</label>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="e.g. 0,0.00 or $0,0"
              value={v.tooltip?.format || ''}
              onChange={e => updateSubVisual(v.id, { tooltip: { ...(v.tooltip || {}), format: e.target.value } })}
            />
          </div>
        </div>
      </div>
    );
  };

  const VisualRendererStub = ({ v }: { v: VisualConfig }) => {
    // This is a placeholder render. Replace with actual chart library.
    return (
      <div className="border rounded p-3 bg-white h-full">
        <div className="text-sm font-medium mb-2">{v.title || v.type.toUpperCase()}</div>
        <div className="text-xs text-gray-600">
          Type: {v.type} • Width: {v.width ?? 12}/12
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Encodings:
          {v.type === 'table' && <div>- Columns: {(v.tableColumns || []).map(c => c.field || '(unset)').join(', ') || '(none)'}</div>}
          {v.x?.field && <div>- X: {v.x.field} {v.x.aggregate && v.x.aggregate !== 'none' ? `(${v.x.aggregate})` : ''}</div>}
          {v.y?.field && <div>- Y: {v.y.field} {v.y.aggregate && v.y.aggregate !== 'none' ? `(${v.y.aggregate})` : ''}</div>}
          {v.series?.field && <div>- Series: {v.series.field}</div>}
          {v.size?.field && <div>- Size: {v.size.field}</div>}
          {v.color?.field && <div>- Color: {v.color.field}</div>}
          {v.type === 'kpi' && <div>- KPI Value: {v.kpi?.value?.field || '(unset)'}</div>}
          {v.type === 'heatmap' && <div>- Heatmap: x={v.heatmap?.x?.field || '(unset)'} y={v.heatmap?.y?.field || '(unset)'} value={v.heatmap?.value?.field || '(unset)'}</div>}
          {v.type === 'combo' && <div>- Combo series: {(v.combo?.series || []).length}</div>}
          {v.type === 'pivot' && <div>- Pivot rows={v.pivot?.rows.length || 0} cols={v.pivot?.columns.length || 0} vals={v.pivot?.values.length || 0}</div>}
        </div>
        <div className="text-[11px] text-gray-400 mt-2 italic">Preview stub (plug in Recharts/ECharts later)</div>
      </div>
    );
  };

  // ---------- UI Rendering ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <button
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Visual Manager</h2>
        <button
          onClick={openCreatePageModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          title="Create Visual"
        >
          <Plus size={16} />
          Create Visual
        </button>
      </div>

      {/* Pages List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pages.map(page => {
          const applicableFilters = applicableFiltersMap[page.id] || [];
          const assignedFilters = getAssignedFiltersForPage(page.id);

          return (
            <div key={page.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{page.name}</h3>
                    {page.description && (
                      <p className="mt-1 text-sm text-gray-500">{page.description}</p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {assignedFilters.length} assigned
                    </span>
                    <button
                      onClick={() => openEditPageModal(page)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded"
                      title="Edit page"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => confirmDeletePage(page)}
                      className="text-red-600 hover:text-red-800 p-1 rounded"
                      title="Delete page"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Tables Used */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Tables used:</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {page.tables.length > 0 ? (
                      page.tables.map(table => (
                        <span
                          key={table}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {table}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">No tables specified</span>
                    )}
                  </div>
                </div>

                {/* Applicable Filters */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700">Applicable Filters:</h4>
                  <div className="mt-2 space-y-3">
                    {applicableFilters.length > 0 ? (
                      applicableFilters.map(filter => {
                        const isAssigned = isFilterAssignedToPage(page.id, filter.id);
                        return (
                          <div
                            key={filter.id}
                            className={`flex items-center justify-between p-3 rounded-md ${
                              isAssigned ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                            }`}
                          >
                            <div>
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">
                                  {filter.name}
                                </span>
                                {filter.table_name && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {filter.table_name}
                                  </span>
                                )}
                              </div>
                              {filter.description && (
                                <p className="mt-1 text-xs text-gray-500">{filter.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => toggleFilterForPage(page.id, filter.id)}
                              className={`p-1 rounded-full ${
                                isAssigned
                                  ? 'text-green-600 hover:text-green-800'
                                  : 'text-gray-400 hover:text-gray-600'
                              }`}
                              title={isAssigned ? 'Remove filter' : 'Assign filter'}
                            >
                              {isAssigned ? <Check size={20} /> : <X size={20} />}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500 italic">No applicable filters found</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Page Modal */}
      {showCreatePageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Create Visual</h3>

            <label className="block mb-3 text-sm">
              <span className="font-medium text-gray-700">Visual Name *</span>
              <input
                value={pageName}
                onChange={e => setPageName(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Account Performance"
              />
            </label>

            <label className="block mb-3 text-sm">
              <span className="font-medium text-gray-700">Description</span>
              <textarea
                value={pageDescription}
                onChange={e => setPageDescription(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="What does this visual show?"
              />
            </label>

            <label className="block mb-4 text-sm">
              <span className="font-medium text-gray-700">Tables Used (comma-separated)</span>
              <input
                value={tablesUsed}
                onChange={e => setTablesUsed(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., account, orders"
              />
            </label>

            {/* Query Builder */}
            <QueryBuilder
              initialData={queryBuilderData}
              onQueryChange={(qb) => {
                setQueryBuilderData(qb);
              }}
              apiBase={API_BASE}
              onTablesUsedChange={setTablesUsed}
            />

            {/* Visual Designer */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-semibold text-gray-800">Visual Designer</h4>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 border rounded" onClick={addSubVisual}>+ Add Sub-Visual</button>
                </div>
              </div>

              {/* Grid of sub-visual editors and previews */}
              <div className="grid grid-cols-12 gap-3">
                {visualSchema.subVisuals.map((v) => (
                  <div key={v.id} className={`col-span-12 md:col-span-${Math.min(12, Math.max(1, v.width ?? 12))}`}>
                    <div className="bg-gray-100 rounded p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">{v.title || 'Visual'}</div>
                        <div className="flex items-center gap-2">
                          <button className="p-1 rounded hover:bg-gray-200" title="Move Up" onClick={() => moveSubVisual(v.id, 'up')}>
                            <MoveUp size={16} />
                          </button>
                          <button className="p-1 rounded hover:bg-gray-200" title="Move Down" onClick={() => moveSubVisual(v.id, 'down')}>
                            <MoveDown size={16} />
                          </button>
                          <button className="p-1 rounded hover:bg-gray-200" title="Duplicate" onClick={() => duplicateSubVisual(v.id)}>
                            <Copy size={16} />
                          </button>
                          <button className="p-1 rounded hover:bg-red-100 text-red-600" title="Remove" onClick={() => removeSubVisual(v.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <VisualEditorPanel v={v} />
                        <VisualRendererStub v={v} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
              <button
                onClick={() => {
                  setShowCreatePageModal(false);
                  setQueryBuilderData(undefined);
                  setVisualSchema(defaultVisualSchema());
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePage}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Page Modal */}
      {showEditPageModal && selectedPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Edit Visual</h3>

            <label className="block mb-3 text-sm">
              <span className="font-medium text-gray-700">Visual Name *</span>
              <input
                value={pageName}
                onChange={e => setPageName(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="block mb-3 text-sm">
              <span className="font-medium text-gray-700">Description</span>
              <textarea
                value={pageDescription}
                onChange={e => setPageDescription(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </label>

            <label className="block mb-4 text-sm">
              <span className="font-medium text-gray-700">Tables Used (comma-separated)</span>
              <input
                value={tablesUsed}
                onChange={e => setTablesUsed(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            {/* Query Builder */}
            <QueryBuilder
              initialData={queryBuilderData}
              onQueryChange={(qb) => setQueryBuilderData(qb)}
              apiBase={API_BASE}
              onTablesUsedChange={setTablesUsed}
            />

            {/* Visual Designer */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-semibold text-gray-800">Visual Designer</h4>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 border rounded" onClick={addSubVisual}>+ Add Sub-Visual</button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3">
                {visualSchema.subVisuals.map((v) => (
                  <div key={v.id} className={`col-span-12 md:col-span-${Math.min(12, Math.max(1, v.width ?? 12))}`}>
                    <div className="bg-gray-100 rounded p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">{v.title || 'Visual'}</div>
                        <div className="flex items-center gap-2">
                          <button className="p-1 rounded hover:bg-gray-200" title="Move Up" onClick={() => moveSubVisual(v.id, 'up')}>
                            <MoveUp size={16} />
                          </button>
                          <button className="p-1 rounded hover:bg-gray-200" title="Move Down" onClick={() => moveSubVisual(v.id, 'down')}>
                            <MoveDown size={16} />
                          </button>
                          <button className="p-1 rounded hover:bg-gray-200" title="Duplicate" onClick={() => duplicateSubVisual(v.id)}>
                            <Copy size={16} />
                          </button>
                          <button className="p-1 rounded hover:bg-red-100 text-red-600" title="Remove" onClick={() => removeSubVisual(v.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <VisualEditorPanel v={v} />
                        <VisualRendererStub v={v} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
              <button
                onClick={() => {
                  setShowEditPageModal(false);
                  setSelectedPage(null);
                  setQueryBuilderData(undefined);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePage}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Page Confirm */}
      {showDeletePageConfirm && selectedPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-medium mb-4">Delete Visual</h3>
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to delete "<strong>{selectedPage.name}</strong>"? This will also remove all filter assignments for this visual. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeletePageConfirm(false);
                  setSelectedPage(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePage}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualManager;