import React, { useEffect, useState } from 'react';
// import BasicTab from './BasicTab';
// at top of FilterDisplay.tsx
import BasicTab, { ThemeProvider } from './BasicTab';

import {
  RefreshCw,
  Edit2,
  Copy,
  Trash2
} from 'lucide-react';

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
  queryBuilder?: any;
  createdAt: Date;
  updatedAt: Date;
}

const API_BASE_URL = 'https://intelligentsalesman.com/ism1/API';

/* ------------------------------
   Small UI helpers (shadcn-like)
   ------------------------------ */
const IconButton: React.FC<{
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}> = ({ title, onClick, children, variant = 'default', size = 'md' }) => {
  const base =
    'inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50';
  const sizes = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-9 w-9 text-base'
  }[size];
  const variants = {
    default:
      'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm',
    danger:
      'bg-white border border-red-100 hover:bg-red-50 text-red-600 shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-50 text-slate-600'
  }[variant];

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`${base} ${sizes} ${variants}`}
    >
      {children}
    </button>
  );
};

const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = 'bg-slate-100 text-slate-800'
}) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
  >
    {children}
  </span>
);

/* ------------------------------
   Main Component
   ------------------------------ */
const FilterManager: React.FC = () => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingFilter, setEditingFilter] = useState<Filter | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Modal visibility for the Create Filter popup
  const [isModalOpen, setIsModalOpen] = useState(false);

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
// inside FilterDisplay component (place above the return / JSX)
const handleSaveFromChild = async (filterData: Partial<Filter>, isEditing = false) => {
  try {
    // saveFilter should be your existing function that sends payload to API
    const ok = await saveFilter(filterData, isEditing); // saveFilter must exist/return boolean
    if (ok) {
      closeModal(); // closeModal must be defined in the same component
    }
    return ok; // BasicTab expects boolean / Promise<boolean>
  } catch (err) {
    console.error('save from child failed', err);
    return false;
  }
};
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
  queryPreview: !!f.queryPreview,
  filterApply: f.filterApply || 'Live',
  tags: f.tags ? (typeof f.tags === 'string' ? JSON.parse(f.tags) : f.tags) : [],
  options: f.options ? (typeof f.options === 'string' ? JSON.parse(f.options) : f.options) : [],
  min: f.min,
  max: f.max,
  pattern: f.pattern,
  advancedConfig: f.advancedConfig ? (typeof f.advancedConfig === 'string' ? JSON.parse(f.advancedConfig) : f.advancedConfig) : {},
  config: f.config ? (typeof f.config === 'string' ? JSON.parse(f.config) : f.config) : {},
  
  // ✅ Parse queryBuilder JSON
  
  queryBuilder: f.queryBuilder
    ? (typeof f.queryBuilder === "string"
        ? JSON.parse(f.queryBuilder)
        : f.queryBuilder)
    : null,
    
  webapi: f.webapi,
  webapiType: f.webapiType || f.webapitype, // ✅ Handle both cases
  staticOptions: f.staticOptions || f.staticoption || '', // ✅ Handle both cases
  cssClass: f.cssClass,
  cssCode: f.cssCode,
  inlineStyle: f.inlineStyle,
  
  // ✅ Event handlers
  onClickHandler: f.onClickHandler,
  onBlurHandler: f.onBlurHandler,
  onChangeHandler: f.onChangeHandler,
  onFocusHandler: f.onFocusHandler,
  onKeyDownHandler: f.onKeyDownHandler,
  onKeyUpHandler: f.onKeyUpHandler,
  
  // ✅ Event handler params/responses
  onClickHandlerParams: f.onClickHandlerParams,
  onClickHandlerResponse: f.onClickHandlerResponse,
  onBlurHandlerParams: f.onBlurHandlerParams,
  onBlurHandlerResponse: f.onBlurHandlerResponse,
  onChangeHandlerParams: f.onChangeHandlerParams,
  onChangeHandlerResponse: f.onChangeHandlerResponse,
  onFocusHandlerParams: f.onFocusHandlerParams,
  onFocusHandlerResponse: f.onFocusHandlerResponse,
  onKeyDownHandlerParams: f.onKeyDownHandlerParams,
  onKeyDownHandlerResponse: f.onKeyDownHandlerResponse,
  onKeyUpHandlerParams: f.onKeyUpHandlerParams,
  onKeyUpHandlerResponse: f.onKeyUpHandlerResponse,
  
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

  const saveFilter = async (filterData: Partial<Filter>, isEditing: boolean = false) => {
  try {
    // Always use api.php as per your backend
    const endpoint = 'api.php';
    
    // Prepare payload with proper structure
    const payload = {
      ...filterData,
      // Ensure queryBuilder is stringified if it's an object
      queryBuilder: typeof filterData.queryBuilder === 'string' 
        ? filterData.queryBuilder 
        : JSON.stringify(filterData.queryBuilder || {}),
      // Ensure other JSON fields are stringified
      tags: typeof filterData.tags === 'string' 
        ? filterData.tags 
        : JSON.stringify(filterData.tags || []),
      options: typeof filterData.options === 'string' 
        ? filterData.options 
        : JSON.stringify(filterData.options || []),
      config: typeof filterData.config === 'string' 
        ? filterData.config 
        : JSON.stringify(filterData.config || {}),
      advancedConfig: typeof filterData.advancedConfig === 'string'
        ? filterData.advancedConfig
        : filterData.advancedConfig
          ? JSON.stringify(filterData.advancedConfig)
          : '',
      // Add id only if editing
      ...(isEditing && filterData.id ? { id: filterData.id } : {})
    };
    
    console.log('Saving filter with payload:', payload);
    
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      await fetchFilters();
      return true;
    } else {
      // setError(data.message || 'Failed to save filter');
      // return false;
    }
  } catch (err) {
    // setError('Network error: Unable to save filter');
    // console.error('Error saving filter:', err);
    // return false;
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

  useEffect(() => {
    fetchFilters();
  }, []);

  const deleteFilter = async (filterId: string) => {
    if (window.confirm('Are you sure you want to delete this filter?')) {
      await deleteFilterAPI(filterId);
    }
  };

  const duplicateFilter = async (filter: Filter) => {
  // Create a clean copy without id, createdAt, updatedAt
  const { id, createdAt, updatedAt, ...filterData } = filter;
  
  const duplicated = {
    ...filterData,
    name: `${filter.name} (Copy)`,
    position: filters.length + 1,
    // Ensure all required fields are present
    type: filter.type || 'text',
    field: filter.field || '',
    defaultValue: filter.defaultValue || '',
    isActive: filter.isActive ?? true,
    required: filter.required ?? false,
    visible: filter.visible ?? true,
    multiSelect: filter.multiSelect ?? false,
    allowCustom: filter.allowCustom ?? false,
    queryPreview: filter.queryPreview ?? false,
    filterApply: filter.filterApply || 'Live',
    tags: filter.tags || [],
    options: filter.options || [],
    config: filter.config || {},
    // Ensure queryBuilder is properly copied
    queryBuilder: filter.queryBuilder || null
  };
  
  const success = await saveFilter(duplicated, false);
  if (success) {
    // Optional: Show success message
    console.log('Filter duplicated successfully');
  }
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

  // Handler to open the CREATE popup from the top ADD button
  const openCreateModal = () => {
    resetNewFilter();
    setEditingFilter(null);
    setIsModalOpen(true);
  };

  // Handler to close modal
  const closeModal = () => {
    setIsModalOpen(false);
    resetNewFilter();
    setEditingFilter(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-sky-500" />
          <p className="text-sm text-slate-600">Loading filters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Data</h3>
          <p className="text-sm text-slate-700 mb-4">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={fetchFilters}
              className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700"
            >
              Retry
            </button>
            <button
              onClick={() => { setError(null); }}
              className="px-4 py-2 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold"></h1>
          <p className="text-sm text-slate-500"></p>
        </div>

        <div className="flex items-center gap-3">
          <IconButton title="Refresh" onClick={fetchFilters} variant="ghost">
            <RefreshCw size={16} />
          </IconButton>

          {/* ADD button that opens the main Create Filter popup directly */}
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm shadow-sm"
            title="Add"
          >
            Create New Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Filters <span className="text-sm text-slate-500">({filters.length})</span></h2>

            {selectedFilters.length > 0 ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (window.confirm(`Delete ${selectedFilters.length} selected filters?`)) {
                      selectedFilters.forEach(id => deleteFilter(id));
                      setSelectedFilters([]);
                    }
                  }}
                  className="text-sm rounded-md bg-red-50 text-red-600 px-3 py-1"
                >
                  Delete Selected ({selectedFilters.length})
                </button>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            {filters.map(filter => (
              <div
                key={filter.id}
                className={`bg-white border border-slate-100 shadow-sm rounded-lg p-4 flex gap-4 items-start ${!filter.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedFilters.includes(filter.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFilters(prev => [...prev, filter.id]);
                      } else {
                        setSelectedFilters(prev => prev.filter(id => id !== filter.id));
                      }
                    }}
                    className="h-5 w-5 rounded border-slate-200 text-sky-600 focus:ring-sky-500"
                    aria-label={`Select ${filter.name}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold truncate">{filter.name}</h4>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <Badge color="bg-slate-100 text-slate-800">{filter.type}</Badge>
                        { !filter.isActive && <Badge color="bg-yellow-50 text-yellow-800">Inactive</Badge> }
                        { filter.required && <Badge color="bg-red-50 text-red-700">Required</Badge> }
                        { filter.multiSelect && <Badge color="bg-emerald-50 text-emerald-700">Multi</Badge>}
                        { filter.webapi && <Badge color="bg-indigo-50 text-indigo-700">API</Badge>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <IconButton
                        title="Edit filter"
                        onClick={() => {
                          // open modal in edit mode
                          setEditingFilter(filter);
                          setIsModalOpen(true);
                        }}
                        variant="default"
                        size="sm"
                      >
                        <Edit2 size={14} />
                      </IconButton>

                      <IconButton
                        title="Duplicate filter"
                        onClick={() => duplicateFilter(filter)}
                        variant="default"
                        size="sm"
                      >
                        <Copy size={14} />
                      </IconButton>

                      <IconButton
                        title="Delete filter"
                        onClick={() => deleteFilter(filter.id)}
                        variant="danger"
                        size="sm"
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>

                  {filter.description && <p className="text-xs text-slate-500 mt-2 truncate">{filter.description}</p>}

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span><strong>Field:</strong> {filter.field || '-'}</span>
                      {filter.defaultValue && <span><strong>Default:</strong> {filter.defaultValue}</span>}
                    </div>

                    <div className="flex items-center gap-3">
                      <span>Created: {filter.createdAt.toLocaleDateString()}</span>
                      {filter.updatedAt.getTime() !== filter.createdAt.getTime() && (
                        <span>Updated: {filter.updatedAt.toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {filter.tags && filter.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {filter.tags.map((t, idx) => (
                        <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: summary / quick actions */}
        <aside className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
            <h3 className="text-sm font-medium">Summary</h3>
            <div className="mt-3 text-sm text-slate-600 space-y-2">
              <div className="flex justify-between"><span>Total</span><strong>{filters.length}</strong></div>
              <div className="flex justify-between"><span>Active</span><strong>{filters.filter(f => f.isActive).length}</strong></div>
              <div className="flex justify-between"><span>With API</span><strong>{filters.filter(f => f.webapi).length}</strong></div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
            <h3 className="text-sm font-medium">Quick Actions</h3>
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={() => {
                  setSelectedFilters(filters.map(f => f.id));
                }}
                className="w-full text-sm rounded-md px-3 py-2 bg-slate-50 hover:bg-slate-100"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedFilters([])}
                className="w-full text-sm rounded-md px-3 py-2 bg-slate-50 hover:bg-slate-100"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal overlay for Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
            aria-hidden
          />
          <div className="relative z-10 max-w-3xl w-full mx-4">
            <div className="bg-white rounded-xl shadow-md p-6 mb-6 w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingFilter ? 'Edit Filter' : 'Create New Filter'}</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    title="Close"
                    onClick={closeModal}
                    className="inline-flex items-center justify-center rounded-md bg-transparent hover:bg-slate-50 px-2 h-8"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <ThemeProvider>
            
            <BasicTab
  filter={editingFilter ?? newFilter}
  isEditing={!!editingFilter}
  editingFilter={editingFilter}
  newFilter={newFilter}
  setNewFilter={setNewFilter}
  resetNewFilter={resetNewFilter}
  fetchFilters={fetchFilters}
  parentMode="modal"
  onSave={handleSaveFromChild}
  onCancel={closeModal}
  setEditingFilter={setEditingFilter}  // <-- add this
/>
          </ThemeProvider>


              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterManager;