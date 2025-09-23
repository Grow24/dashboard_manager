import React, { useState, useRef, useEffect } from 'react';
import BasicTab from './BasicTab';
import './GlobalFilter.css';
import FilterCreationPopup from './FilterCreationPopup';
import CreatePagePopup from './CreatePagePopup';
import DashboardCreationPopup from './dashboard';
/**
 * SCOPE AND PRECEDENCE INTEGRATION (High-level)
 * ... (kept as-is)
 */

// Enhanced Types
interface Filter {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  field: string;
  defaultValue: string;
  position: number;
  description?: string;
  placeholder?: string;
  isActive: boolean;
  required: boolean;
  visible: boolean;
  multiSelect: boolean;
  allowCustom: boolean;
  tags?: string[];
  options?: any[];
  min?: string;
  max?: string;
  pattern?: string;
  advancedConfig?: any;
  config: any;
  webapi?: string;
  createdAt: Date;
  updatedAt: Date;
}

type PageGrain = 'row' | 'salesrep' | 'account' | 'product' | 'region';

interface PageAnalytics {
  grain: PageGrain;
  metrics?: string[];
  dimensions?: string[];
  topN?: number;
  bottomN?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  additionalFilters?: Record<string, any>;
}

interface Page {
  id: string;
  name: string;
  url: string;
  description?: string;
  layout?: 'grid' | 'list' | 'card';
  theme?: string;
  customCSS?: string;
  tableStructure?: TableColumn[];
  components?: PageComponent[];
  settings?: PageSettings;
  analytics?: PageAnalytics;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'image' | 'link';
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  position: number;
}

interface PageComponent {
  id: string;
  type: 'header' | 'table' | 'chart' | 'filter' | 'text' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: any;
}

interface PageSettings {
  showHeader?: boolean;
  showFooter?: boolean;
  enableSearch?: boolean;
  enableExport?: boolean;
  pagination?: boolean;
  itemsPerPage?: number;
}

interface PageFilter {
  pageId: string;
  filterId: string;
  position: number;
  isRequired: boolean;
}

interface FilterValue {
  filterId: string;
  value: any;
  appliedAt: Date;
}

// Dashboard additions
type ImportMode = 'dynamic' | 'static';

interface DashboardLocalControls {
  localSortBy?: string;
  localSortDir?: 'asc' | 'desc';
  subsetFilters?: Record<string, any>;
}

interface Dashboard {
  id: string;
  name: string;
  pageId: string;
  importMode: ImportMode;
  localControls: DashboardLocalControls;
  lineage: Lineage;
  staticSnapshot?: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface Lineage {
  filterMasterIds: string[];
  pageName: string;
  pageAnalyticsSummary: string;
  dashboardName: string;
  dashboardImportMode: ImportMode;
}

interface FilterCreationPopupProps {
  open: boolean;
  onClose: () => void;
  onFilterCreated: () => void;
}

// API Configuration
const API_BASE_URL = 'https://intelligentsalesman.com/ism1/API';

// --- Main Component ---
const GlobalFilter: React.FC = () => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [linkedFilters, setLinkedFilters] = useState<PageFilter[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<FilterValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewFilterOpen, setIsNewFilterOpen] = useState(false);
const [isDashboardPopupOpen, setIsDashboardPopupOpen] = useState(false);
  // UI State
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [isCreatingFilter, setIsCreatingFilter] = useState(false);
  const [editingFilter, setEditingFilter] = useState<Filter | null>(null);
  const [draggedFilter, setDraggedFilter] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Page Create/Edit Modal
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);

  // Dashboard State
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardImportMode, setNewDashboardImportMode] = useState<ImportMode>('dynamic');

  // Page Output and Dashboard View
  const [pageOutput, setPageOutput] = useState<any[]>([]);
  const [dashboardView, setDashboardView] = useState<any[]>([]);

  // New filter form state
  const [newFilter, setNewFilter] = useState<Partial<Filter>>({
    name: '',
    type: 'text',
    field: '',
    defaultValue: '',
    position: 1,
    description: '',
    placeholder: '',
    isActive: true,
    required: false,
    visible: true,
    multiSelect: false,
    allowCustom: false,
    tags: [],
    options: [],
    config: {},
    webapi: ''
  });
const handleDashboardCreated = (dashboard) => {
    setDashboards([...dashboards, dashboard]);
  };
  const dragCounter = useRef(0);

  // --- API Functions ---
  const fetchFilters = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/get_filters.php`);
      const data = await response.json();

      if (data.success) {
        const normalizedFilters = data.filters.map((f: any) => ({
          id: f.id.toString(),
          name: f.name,
          type: f.type,
          field: f.field,
          defaultValue: f.defaultValue || '',
          position: parseInt(f.position) || 0,
          description: f.description,
          placeholder: f.placeholder,
          isActive: !!f.isActive,
          required: !!f.required,
          visible: !!f.visible,
          multiSelect: !!f.multiSelect,
          allowCustom: !!f.allowCustom,
          tags: f.tags ? (typeof f.tags === 'string' ? JSON.parse(f.tags) : f.tags) : [],
          options: f.options ? (typeof f.options === 'string' ? JSON.parse(f.options) : f.options) : [],
          min: f.min,
          max: f.max,
          pattern: f.pattern,
          advancedConfig: f.advancedConfig ? (typeof f.advancedConfig === 'string' ? JSON.parse(f.advancedConfig) : f.advancedConfig) : {},
          config: f.config ? (typeof f.config === 'string' ? JSON.parse(f.config) : f.config) : {},
          webapi: f.webapi,
          createdAt: new Date(f.createdAt),
          updatedAt: new Date(f.updatedAt)
        }));

        normalizedFilters.sort((a, b) => a.position - b.position);
        setFilters(normalizedFilters);
      } else {
        setError(data.error || 'Failed to fetch filters');
      }
    } catch (err) {
      setError('Network error: Unable to fetch filters');
      console.error('Error fetching filters:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_pages.php`);
      const data = await response.json();

      if (data.success) {
        const normalizedPages = data.pages.map((p: any) => ({
          id: p.id.toString(),
          name: p.name,
          url: p.url,
          description: p.description,
          layout: p.layout || 'grid',
          theme: p.theme || 'default',
          customCSS: p.customCSS || '',
          tableStructure: p.tableStructure ? (typeof p.tableStructure === 'string' ? JSON.parse(p.tableStructure) : p.tableStructure) : [],
          components: p.components ? (typeof p.components === 'string' ? JSON.parse(p.components) : p.components) : [],
          settings: p.settings ? (typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings) : {
            showHeader: true,
            showFooter: true,
            enableSearch: true,
            enableExport: false,
            pagination: true,
            itemsPerPage: 10
          },
          analytics: p.analytics ? (typeof p.analytics === 'string' ? JSON.parse(p.analytics) : p.analytics) : {
            grain: 'row',
            metrics: [],
            dimensions: [],
            topN: undefined,
            bottomN: undefined,
            sortBy: undefined,
            sortDir: undefined,
            additionalFilters: {}
          },
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }));

        setPages(normalizedPages);
      } else {
        console.error('Failed to fetch pages:', data.error);
      }
    } catch (err) {
      console.error('Error fetching pages:', err);
    }
  };

  const fetchLinkedFilters = async (pageId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_linked_filters.php?pageId=${pageId}`);
      const data = await response.json();
      if (data.success) {
        setLinkedFilters(
          data.links.map((link: any) => ({
            pageId: link.page_id.toString(),
            filterId: link.filter_id.toString(),
            position: parseInt(link.position),
            isRequired: !!link.is_required
          }))
        );
      } else {
        console.error('Failed to fetch linked filters:', data.error);
      }
    } catch (err) {
      console.error('Error fetching linked filters:', err);
    }
  };

  const saveFilter = async (filterData: Partial<Filter>, isEditing: boolean = false) => {
    try {
      const endpoint = isEditing ? 'update_filter.php' : 'create_filter.php';
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filterData)
      });

      const data = await response.json();

      if (data.success) {
        await fetchFilters();
        return true;
      } else {
        setError(data.error || 'Failed to save filter');
        return false;
      }
    } catch (err) {
      setError('Network error: Unable to save filter');
      console.error('Error saving filter:', err);
      return false;
    }
  };

  const deleteFilterAPI = async (filterId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/delete_filter.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: filterId })
      });

      const data = await response.json();

      if (data.success) {
        await fetchFilters();
        return true;
      } else {
        setError(data.error || 'Failed to delete filter');
        return false;
      }
    } catch (err) {
      setError('Network error: Unable to delete filter');
      console.error('Error deleting filter:', err);
      return false;
    }
  };

  const deletePage = async (pageId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/delete_page.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pageId })
      });

      const data = await response.json();

      if (data.success) {
        await fetchPages();
        return true;
      } else {
        setError(data.error || 'Failed to delete page');
        return false;
      }
    } catch (err) {
      setError('Network error: Unable to delete page');
      console.error('Error deleting page:', err);
      return false;
    }
  };

  // Load data
  useEffect(() => {
    fetchFilters();
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      fetchLinkedFilters(selectedPage);
      setPageOutput([]);
      setDashboardView([]);
      setSelectedDashboardId(null);
    } else {
      setLinkedFilters([]);
    }
  }, [selectedPage]);

  // --- Filter CRUD operations ---
  const createFilter = async () => {
    if (!newFilter.name?.trim()) return;
    const success = await saveFilter(newFilter, false);
    if (success) {
      resetNewFilter();
      setIsCreatingFilter(false);
    }
  };

  const updateFilter = async () => {
    if (!editingFilter || !editingFilter.name.trim()) return;
    const success = await saveFilter(editingFilter, true);
    if (success) {
      setEditingFilter(null);
    }
  };

  const deleteFilter = async (filterId: string) => {
    if (window.confirm('Are you sure you want to delete this filter?')) {
      const success = await deleteFilterAPI(filterId);
      if (success) {
        setLinkedFilters(linkedFilters.filter(pf => pf.filterId !== filterId));
        setAppliedFilters(appliedFilters.filter(af => af.filterId !== filterId));
      }
    }
  };

  const duplicateFilter = async (filter: Filter) => {
    const duplicated = { ...filter, name: `${filter.name} (Copy)`, position: filters.length + 1 } as any;
    delete duplicated.id;
    await saveFilter(duplicated, false);
  };

  const resetNewFilter = () => {
    setNewFilter({
      name: '',
      type: 'text',
      field: '',
      defaultValue: '',
      position: filters.length + 1,
      description: '',
      placeholder: '',
      isActive: true,
      required: false,
      visible: true,
      multiSelect: false,
      allowCustom: false,
      tags: [],
      options: [],
      config: {},
      webapi: ''
    });
  };

  // --- Linking filters to page ---
  const linkFilterToPage = async (pageId: string, filterId: string) => {
    if (linkedFilters.some(pf => pf.pageId === pageId && pf.filterId === filterId)) return;

    const maxPosition = linkedFilters.filter(pf => pf.pageId === pageId).reduce((max, pf) => Math.max(max, pf.position), 0);

    try {
      const response = await fetch(`${API_BASE_URL}/add_linked_filter.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, filterId, position: maxPosition + 1, isRequired: false })
      });
      const data = await response.json();
      if (data.success) {
        await fetchLinkedFilters(pageId);
      } else {
        console.error('Failed to link filter:', data.error);
      }
    } catch (err) {
      console.error('Error linking filter:', err);
    }
  };

  const unlinkFilterFromPage = async (pageId: string, filterId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/remove_linked_filter.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, filterId })
      });
      const data = await response.json();
      if (data.success) {
        await fetchLinkedFilters(pageId);
      } else {
        console.error('Failed to unlink filter:', data.error);
      }
    } catch (err) {
      console.error('Error unlinking filter:', err);
    }
  };

  const toggleFilterRequired = async (pageId: string, filterId: string) => {
    const current = linkedFilters.find(pf => pf.pageId === pageId && pf.filterId === filterId);
    if (!current) return;
    const newRequired = !current.isRequired;

    try {
      const response = await fetch(`${API_BASE_URL}/update_linked_filter.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, filterId, isRequired: newRequired })
      });
      const data = await response.json();
      if (data.success) {
        await fetchLinkedFilters(pageId);
      } else {
        console.error('Failed to update required status:', data.error);
      }
    } catch (err) {
      console.error('Error updating required status:', err);
    }
  };

  // --- Apply master filters ---
  const applyFilter = (filterId: string, value: any) => {
    const existingIndex = appliedFilters.findIndex(af => af.filterId === filterId);
    const filterValue: FilterValue = { filterId, value, appliedAt: new Date() };

    if (existingIndex >= 0) {
      const newAppliedFilters = [...appliedFilters];
      newAppliedFilters[existingIndex] = filterValue;
      setAppliedFilters(newAppliedFilters);
    } else {
      setAppliedFilters([...appliedFilters, filterValue]);
    }
  };

  const clearFilter = (filterId: string) => setAppliedFilters(appliedFilters.filter(af => af.filterId !== filterId));
  const clearAllFilters = () => setAppliedFilters([]);

  // --- DnD for linking filters to pages ---
  const handleDragStart = (e: React.DragEvent, filterId: string) => {
    setDraggedFilter(filterId);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const handleDragEnd = () => {
    setDraggedFilter(null);
    dragCounter.current = 0;
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  };
  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--;
  };
  const handleDrop = (e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    dragCounter.current = 0;
    if (draggedFilter) {
      linkFilterToPage(pageId, draggedFilter);
      setDraggedFilter(null);
    }
  };

  // --- Dashboard helpers & preview ---
  const summarizeAnalytics = (analytics?: PageAnalytics): string => {
    if (!analytics) return 'grain=row';
    const parts: string[] = [];
    parts.push(`grain=${analytics.grain}`);
    if (analytics.topN) parts.push(`topN=${analytics.topN}`);
    if (analytics.bottomN) parts.push(`bottomN=${analytics.bottomN}`);
    if (analytics.sortBy) parts.push(`sort=${analytics.sortBy} ${analytics.sortDir || 'desc'}`);
    return parts.join(', ');
    };

  const createDashboard = () => {
    if (!selectedPage) {
      alert('Select a Page first to create a Dashboard.');
      return;
    }
    if (!newDashboardName.trim()) {
      alert('Enter a Dashboard name.');
      return;
    }

    const page = pages.find(p => p.id === selectedPage);
    if (!page) return;

    const lineage: Lineage = {
      filterMasterIds: getFiltersForPage(page.id).map(f => f.id),
      pageName: page.name,
      pageAnalyticsSummary: summarizeAnalytics(page.analytics),
      dashboardName: newDashboardName.trim(),
      dashboardImportMode: newDashboardImportMode
    };

    const id = `${Date.now()}`;
    const now = new Date();
    const newDash: Dashboard = {
      id,
      name: newDashboardName.trim(),
      pageId: page.id,
      importMode: newDashboardImportMode,
      localControls: {},
      lineage,
      staticSnapshot: undefined,
      createdAt: now,
      updatedAt: now
    };

    if (newDash.importMode === 'static') {
      newDash.staticSnapshot = [...pageOutput];
    }

    setDashboards(prev => [...prev, newDash]);
    setSelectedDashboardId(id);
    setIsCreatingDashboard(false);
    setNewDashboardName('');
    setNewDashboardImportMode('dynamic');
  };

  const updateDashboardLocalControls = (updates: Partial<DashboardLocalControls>) => {
    if (!selectedDashboardId) return;
    setDashboards(prev => prev.map(d => (d.id !== selectedDashboardId ? d : { ...d, localControls: { ...d.localControls, ...updates }, updatedAt: new Date() })));
  };

  const getSelectedDashboard = (): Dashboard | undefined => dashboards.find(d => d.id === selectedDashboardId || (dashboards.length === 1 && d.id));

  const applyDashboardSubsetFilters = (input: any[], subsetFilters?: Record<string, any>): any[] => {
    if (!subsetFilters || Object.keys(subsetFilters).length === 0) return input;
    let output = input;
    Object.entries(subsetFilters).forEach(([k, v]) => {
      output = output.filter(row => (Array.isArray(v) ? v.includes(row[k]) : row[k] === v));
    });
    if (output.length > input.length) {
      console.warn('Dashboard subset filters attempted to expand the dataset; ignoring per precedence rules.');
      return input;
    }
    return output;
  };

  const applyPageTransformations = (data: any[], analytics?: PageAnalytics): any[] => {
    let out = [...data];
    if (!analytics) return out;

    if (analytics.sortBy) {
      const dir = (analytics.sortDir || 'desc') === 'asc' ? 1 : -1;
      out.sort((a, b) => {
        const av = a[analytics.sortBy as string];
        const bv = b[analytics.sortBy as string];
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      });
    }

    if (analytics.topN && analytics.topN > 0) out = out.slice(0, analytics.topN);
    if (analytics.bottomN && analytics.bottomN > 0) out = out.slice(-analytics.bottomN);

    return out;
  };

  const applyDashboardLocalSort = (data: any[], dash?: Dashboard): any[] => {
    if (!dash || !dash.localControls || !dash.localControls.localSortBy) return data;
    const dir = (dash.localControls.localSortDir || 'asc') === 'asc' ? 1 : -1;
    const sortBy = dash.localControls.localSortBy;
    return [...data].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      return av > bv ? dir : -dir;
    });
  };

  const simulateFetchPageOutput = () => {
    const page = pages.find(p => p.id === selectedPage);
    if (!page) return;

    const grain = page.analytics?.grain || 'row';
    let data: any[] = [];

    if (grain === 'salesrep') {
      data = [
        { salesrep: 'Alice', revenue: 120000, units: 320, region: 'North' },
        { salesrep: 'Bob', revenue: 95000, units: 270, region: 'West' },
        { salesrep: 'Carol', revenue: 143000, units: 350, region: 'East' },
        { salesrep: 'Dave', revenue: 86000, units: 260, region: 'South' },
        { salesrep: 'Eve', revenue: 112000, units: 300, region: 'Central' }
      ];
    } else if (grain === 'account') {
      data = [
        { account: 'Acme Corp', revenue: 200000, orders: 120 },
        { account: 'Globex', revenue: 150000, orders: 98 },
        { account: 'Initech', revenue: 175000, orders: 111 },
        { account: 'Umbrella', revenue: 95000, orders: 70 }
      ];
    } else if (grain === 'product') {
      data = [
        { product: 'Widget A', revenue: 80000, units: 1200 },
        { product: 'Widget B', revenue: 125000, units: 1500 },
        { product: 'Widget C', revenue: 67000, units: 900 }
      ];
    } else if (grain === 'region') {
      data = [
        { region: 'North', revenue: 220000, accounts: 45 },
        { region: 'West', revenue: 180000, accounts: 38 },
        { region: 'East', revenue: 210000, accounts: 42 },
        { region: 'South', revenue: 160000, accounts: 33 },
        { region: 'Central', revenue: 175000, accounts: 36 }
      ];
    } else {
      data = [
        { id: 1, salesrep: 'Alice', account: 'Acme', revenue: 5000, date: '2025-01-10' },
        { id: 2, salesrep: 'Bob', account: 'Initech', revenue: 3200, date: '2025-01-11' },
        { id: 3, salesrep: 'Carol', account: 'Globex', revenue: 8900, date: '2025-01-12' }
      ];
    }

    const transformed = applyPageTransformations(data, page.analytics);
    setPageOutput(transformed);

    const dash = getSelectedDashboard();
    if (dash) {
      recomputeDashboardView(transformed, dash);
    } else {
      setDashboardView(transformed);
    }
  };

  const recomputeDashboardView = (pageData: any[], dash: Dashboard) => {
    let input = dash.importMode === 'static' ? (dash.staticSnapshot || []) : pageData;
    input = applyDashboardSubsetFilters(input, dash.localControls?.subsetFilters || {});
    const finalView = applyDashboardLocalSort(input, dash);
    setDashboardView(finalView);
  };


  useEffect(() => {
    const dash = getSelectedDashboard();
    if (!dash) {
      setDashboardView(pageOutput);
      return;
    }
    recomputeDashboardView(pageOutput, dash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageOutput, dashboards, selectedDashboardId]);

  // Helpers
  const getFiltersForPage = (pageId: string): Filter[] => {
    const linkedPageFilters = linkedFilters.filter(pf => pf.pageId === pageId).sort((a, b) => a.position - b.position);
    return linkedPageFilters.map(pf => filters.find(f => f.id === pf.filterId)).filter(Boolean) as Filter[];
  };

  const renderFilterForm = (filter: Partial<Filter>, isEditing: boolean) => (
    <div className="filter-form bg-white rounded-xl shadow-lg p-6 mb-6 w-full mx-auto">
      <h3 className="text-xl font-semibold mb-4">{isEditing ? 'Edit Filter' : 'Create New Filter'}</h3>
      <div className="tab-content">
        <BasicTab
          filter={filter}
          isEditing={isEditing}
          editingFilter={editingFilter}
          isCreatingFilter={isCreatingFilter}
          setEditingFilter={setEditingFilter}
          newFilter={newFilter}
          setNewFilter={setNewFilter}
          setIsCreatingFilter={setIsCreatingFilter}
          resetNewFilter={resetNewFilter}
          fetchFilters={fetchFilters}
        />
      </div>
    </div>
  );



  // Loading state
  if (loading) {
    return (
      <div className="filter-manager">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading filters...</p>
        </div>
        <style jsx>{`
          .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; gap: 20px; }
          .loading-spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="filter-manager">
        <div className="error-container">
          <div className="error-message">
            <h3>Error Loading Data</h3>
            <p>{error}</p>
            <button onClick={() => { fetchFilters(); fetchPages(); }} className="btn-retry">Retry</button>
          </div>
        </div>
        <style jsx>{`
          .error-container { display: flex; align-items: center; justify-content: center; height: 50vh; }
          .error-message { text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #dc3545; }
          .error-message h3 { color: #dc3545; margin-bottom: 10px; }
          .error-message p { color: #666; margin-bottom: 20px; }
          .btn-retry { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
          .btn-retry:hover { background: #217dbb; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="filter-manager">
      <div className="header">
        <h1> Filter Manager</h1>
        <div className="header-actions">
          <button onClick={() => { fetchFilters(); fetchPages(); if (selectedPage) fetchLinkedFilters(selectedPage); }} className="btn-refresh" title="Refresh Data">🔄 Refresh</button>
          <button onClick={() => setPreviewMode(!previewMode)} className={`btn-preview ${previewMode ? 'active' : ''}`}>
            {previewMode ? 'Exit Preview' : 'Preview Mode'}
          </button>
          <button
            onClick={() => {
              setIsLinkMode(!isLinkMode);
              if (!isLinkMode) setSelectedPage(null);
            }}
            className={`btn-link ${isLinkMode ? 'active' : ''}`}
          >
            {isLinkMode ? 'Exit Link Mode' : 'Link Mode'}
          </button>
          <button
            onClick={() => setIsDashboardPopupOpen(true)}
            className="btn-create-page"
          >
            + Create Dashboard
          </button>
          <button
            onClick={() => {
              setEditingPage(null);
              setShowCreatePage(true);
            }}
            className="btn-create-page"
          >
            + Create Page
          </button>
          {appliedFilters.length > 0 && (
            <button onClick={clearAllFilters} className="btn-clear">
              Clear All ({appliedFilters.length})
            </button>
          )}
        </div>
      </div>
<DashboardCreationPopup
        open={isDashboardPopupOpen}
        onClose={() => setIsDashboardPopupOpen(false)}
        pages={pages}
        onDashboardCreated={handleDashboardCreated}
      />
      {/* Create Page Modal via Component */}
      <CreatePagePopup
        open={showCreatePage || !!editingPage}
        onClose={() => {
          setShowCreatePage(false);
          setEditingPage(null);
        }}
        onPageCreated={async () => {
          await fetchPages();
          if (selectedPage) await fetchLinkedFilters(selectedPage);
        }}
        editingPage={editingPage}
        API_BASE_URL={API_BASE_URL}
      />

      {/* Left: Filters */}
      <div className={`content${isLinkMode ? ' link-mode' : ''}`}>
        <div className="left-panel">
          <div className="panel-header">
            <h2>Filters ({filters.length})</h2>
            {!isLinkMode && (
              <div className="header-controls" style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setIsNewFilterOpen(true)} className="btn-secondary btn-small">+ New Filter</button>
                <button onClick={() => setIsCreatingFilter(true)} className="btn-primary btn-small">+ Create Filter</button>
                {selectedFilters.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ${selectedFilters.length} selected filters?`)) {
                        selectedFilters.forEach(id => deleteFilter(id));
                        setSelectedFilters([]);
                      }
                    }}
                    className="btn-delete btn-small"
                  >
                    Delete Selected ({selectedFilters.length})
                  </button>
                )}
              </div>
            )}
          </div>

          <FilterCreationPopup
            open={isNewFilterOpen}
            onClose={() => setIsNewFilterOpen(false)}
            onFilterCreated={() => {
              setIsNewFilterOpen(false);
              fetchFilters();
            }}
          />
          {!isLinkMode && isCreatingFilter && renderFilterForm(newFilter, false)}
          {!isLinkMode && editingFilter && renderFilterForm(editingFilter, true)}

          <div className="filter-list">
            {filters.map(filter => (
              <div
                key={filter.id}
                className={`filter-item ${draggedFilter === filter.id ? 'dragging' : ''} ${!filter.isActive ? 'inactive' : ''}`}
                draggable={isLinkMode}
                onDragStart={(e) => handleDragStart(e, filter.id)}
                onDragEnd={handleDragEnd}
              >
                {!isLinkMode && (
                  <input
                    type="checkbox"
                    checked={selectedFilters.includes(filter.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFilters([...selectedFilters, filter.id]);
                      } else {
                        setSelectedFilters(selectedFilters.filter(id => id !== filter.id));
                      }
                    }}
                    className="filter-checkbox"
                  />
                )}

                <div className="filter-info">
                  <h4>{filter.name}</h4>
                  <div className="filter-meta">
                    <span className={`filter-type type-${filter.type}`}>{filter.type}</span>
                    {!filter.isActive && <span className="inactive-badge">Inactive</span>}
                    {filter.required && <span className="required-badge">Required</span>}
                    {filter.multiSelect && <span className="multi-badge">Multi</span>}
                    {filter.webapi && <span className="api-badge">API</span>}
                  </div>
                  {filter.description && <p className="filter-description">{filter.description}</p>}
                  <div className="filter-details">
                    <small><strong>Field:</strong> {filter.field}</small>
                    {filter.defaultValue && <small><strong>Default:</strong> {filter.defaultValue}</small>}
                  </div>
                  {filter.tags && filter.tags.length > 0 && (
                    <div className="filter-tags">
                      {filter.tags.map((tag, index) => (<span key={index} className="tag">{tag}</span>))}
                    </div>
                  )}
                  <div className="filter-dates">
                    <small>Created: {filter.createdAt.toLocaleDateString()}</small>
                    {filter.updatedAt.getTime() !== filter.createdAt.getTime() && (
                      <small>Updated: {filter.updatedAt.toLocaleDateString()}</small>
                    )}
                  </div>
                </div>

                {!isLinkMode && (
                  <div className="filter-actions">
                    <button onClick={() => setEditingFilter(filter)} className="btn-edit" title="Edit">Edit</button>
                    <button onClick={() => duplicateFilter(filter)} className="btn-duplicate" title="Duplicate">Copy</button>
                    <button onClick={() => deleteFilter(filter.id)} className="btn-delete" title="Delete">Delete</button>
                  </div>
                )}

                {isLinkMode && <div className="drag-hint"><span>Drag to link →</span></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel - Linked Filters (only in link mode) */}
        {isLinkMode && (
          <div className="center-panel">
            <div className="panel-header">
              <h2>Linked Filters</h2>
              {selectedPage && <span className="page-name">{pages.find(p => p.id === selectedPage)?.name}</span>}
            </div>
            <div className="linked-filters">
              {!selectedPage ? (
                <div className="no-selection"><p>Select a page from the right panel to view its linked filters.</p></div>
              ) : (
                <>
                  {getFiltersForPage(selectedPage).map(filter => {
                    const pageFilter = linkedFilters.find(pf => pf.pageId === selectedPage && pf.filterId === filter.id);
                    return (
                      <div key={filter.id} className="linked-filter-item">
                        <div className="filter-info">
                          <h4>{filter.name}</h4>
                          <span className={`filter-type type-${filter.type}`}>{filter.type}</span>
                          <div className="filter-controls">
                            <label className="checkbox-label">
                              <input type="checkbox" checked={pageFilter?.isRequired || false} onChange={() => toggleFilterRequired(selectedPage, filter.id)} />
                              Required
                            </label>
                          </div>
                        </div>
                        <button onClick={() => unlinkFilterFromPage(selectedPage, filter.id)} className="btn-unlink">Unlink</button>
                      </div>
                    );
                  })}
                  {getFiltersForPage(selectedPage).length === 0 && (
                    <div className="no-filters">
                      <p>No filters linked to this page.</p>
                      <p>Drag filters from the left panel to link them to this page.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Right Panel - Pages (only in link mode) */}
        {isLinkMode && (
          <div className="rightt-panell">
            <div className="panel-header">
              <h2>Pages ({pages.length})</h2>
            </div>
            <div className="page-list">
              {pages.map(page => {
                const linkedFiltersCount = getFiltersForPage(page.id).length;
                const requiredFiltersCount = linkedFilters.filter(pf => pf.pageId === page.id && pf.isRequired).length;

                return (
                  <div
                    key={page.id}
                    className={`page-item ${selectedPage === page.id ? 'selected' : ''} ${draggedFilter ? 'drop-zone' : ''}`}
                    onClick={() => setSelectedPage(page.id)}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, page.id)}
                  >
                    <div className="page-info">
                      <h4>{page.name}</h4>
                      <span className="page-url">{page.url}</span>
                      {page.description && <p className="page-description">{page.description}</p>}
                      <div className="page-stats">
                        <span className="filter-count">{linkedFiltersCount} filter{linkedFiltersCount !== 1 ? 's' : ''} linked</span>
                        {requiredFiltersCount > 0 && <span className="required-count">({requiredFiltersCount} required)</span>}
                      </div>
                      <div className="page-meta">
                        <span className="layout-badge">{page.layout}</span>
                        <span className="theme-badge">{page.theme}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">grain: {page.analytics?.grain || 'row'}</span>
                        {page.analytics?.topN && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">topN: {page.analytics.topN}</span>}
                        {page.analytics?.bottomN && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">bottomN: {page.analytics.bottomN}</span>}
                      </div>
                    </div>
                    <div className="page-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPage(page);
                          setShowCreatePage(true);
                        }}
                        className="btn-edit-page"
                        title="Edit Page"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(page.id);
                        }}
                        className="btn-delete-page"
                        title="Delete Page"
                      >
                        Delete
                      </button>
                    </div>
                    {draggedFilter && <div className="drop-hint">Drop here</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

  
    </div>
  );
};

export default GlobalFilter;