import React, { useEffect, useState } from 'react';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';

interface Filter {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'query' | 'lookup' | 'component';
  field: string;
  options?: string[] | string;
  multiSelect?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  required?: boolean;
  visible?: boolean;
  isActive?: boolean;
  description?: string;
  tags?: string[] | string;
  min?: number | string;
  max?: number | string;
  pattern?: string;
  allowCustom?: boolean;
  advancedConfig?: string;
  config?: Record<string, unknown>;
  webapi?: string;
  webapiType?: 'static' | 'dynamic';
  staticOptions?: string;
  createdAt?: string;
  updatedAt?: string;
  position?: number;
  cssClass?: string;
  inlineStyle?: string;
  onClickHandler?: string;
  onBlurHandler?: string;
  onChangeHandler?: string;
  onFocusHandler?: string;
  onKeyDownHandler?: string;
  onKeyUpHandler?: string;
  query_preview?: string;
  querypreview?: string;
  isRankingFilter?: boolean;
  queryPreview?: string;
  filterApply?: 'Live' | 'Manual';
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
                    <span
                      className={`block truncate ${
                        selected ? 'font-semibold' : 'font-normal'
                      }`}
                    >
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

const AccountListPage: React.FC = () => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [assignedFilterIds, setAssignedFilterIds] = useState<string[]>([]);
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [dynamicOptions, setDynamicOptions] = useState<{ [key: string]: DynamicOption[] }>({});
  const [loadingOptions, setLoadingOptions] = useState<{ [key: string]: boolean }>({});
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [queryText, setQueryText] = useState<string>('');

  // Fetch assigned filters for this page (only IDs)
  useEffect(() => {
    const fetchAssignedFilterIds = async () => {
      try {
        const response = await fetch('https://intelligentsalesman.com/ism1/API/get_assigned_filters_for_page.php');
        const data = await response.json();
        console.log('data----------');
        console.log(data);
        if (data.success) {
          setAssignedFilterIds(data.filters.map((f: { id: string }) => f.id));
        }
      } catch (err) {
        console.error('Error fetching assigned filters:', err);
      }
    };
    fetchAssignedFilterIds();
  }, []);

  // Fetch all filters and filter to only assigned ones
  useEffect(() => {
  if (assignedFilterIds.length === 0) {
    setFilters([]);           // Clear filters
    setLoadingFilters(false); // <-- This is the key fix!
    return;
  }

  setLoadingFilters(true);
  fetch('https://intelligentsalesman.com/ism1/API/getFilter.php')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      const filtersArray = Array.isArray(data) ? data : (Array.isArray(data.filters) ? data.filters : []);
      const normalizedFilters = filtersArray.map(normalizeFilter);
      const activeFilters = normalizedFilters.filter(filter =>
        filter.isActive !== false && filter.visible !== false && assignedFilterIds.includes(filter.id)
      );
      setFilters(activeFilters);
      setError(null);

      activeFilters.forEach(filter => {
        if (filter.type === 'select' &&
          filter.webapiType?.toLowerCase() === 'dynamic' &&
          filter.webapi &&
          filter.webapi.trim() !== '') {
          fetchDynamicOptions(filter.id, filter.webapi);
        }
      });
    })
    .catch(() => {
      setError('Failed to load filters. Please try again.');
      setFilters([]);
    })
    .finally(() => setLoadingFilters(false));
}, [assignedFilterIds]);

  // Fetch all data on load (using unified endpoint)
  console.log('fetchAllData--11---------------');
  const fetchAllData = async () => {
    console.log('try-----------------');
    try {
      setLoadingData(true);
      setDataError(null);
      const res = await fetch('https://intelligentsalesman.com/ism1/API/api/unified_query.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:
            "SELECT id, name, salesAmount,date, salesQuantity, status, age, salary, country, state, createdAt FROM sales_data ORDER BY id DESC",
        }),
      });
      console.log('res- start------------------');
      console.log(res);
      console.log('res- end------------------');
      if (!res.ok) throw new Error(`Error fetching data: ${res.statusText}`);
      const data = await res.json();
      console.log('data- start------------------');
      console.log(data);
      console.log('data- end------------------');
      setTableData(data);
    } catch (e: unknown) {
      setDataError((e instanceof Error ? e.message : 'Failed to fetch data') || 'Failed to fetch data');
      setTableData([]);
    } finally {
      setLoadingData(false);
    }
  };

  // Load data by default when filters finish loading and no filters selected
  useEffect(() => {
    console.log('selectedFilterIds 22----------');
    console.log(loadingFilters);
    console.log(selectedFilterIds.length);
    if (!loadingFilters && selectedFilterIds.length == '0') {
      console.log('In----------');
      fetchAllData();
    }
  }, [loadingFilters, selectedFilterIds]);

  // Normalize filter helper
  const normalizeFilter = (filter: Partial<Filter>): Filter => ({
    ...filter,
    options: Array.isArray(filter.options)
      ? filter.options
      : typeof filter.options === 'string' && filter.options
        ? filter.options.split(',').map((opt: string) => opt.trim()).filter(Boolean)
        : [],
    tags: Array.isArray(filter.tags)
      ? filter.tags
      : typeof filter.tags === 'string' && filter.tags
        ? filter.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : [],
        
    multiSelect: filter.multiSelect === true || filter.multiSelect === 1 || filter.multiSelect === '1',
    webapiType: filter.webapiType ? filter.webapiType.toLowerCase() as 'static' | 'dynamic' : 'dynamic',
    staticOptions: filter.staticOptions || '',
    isRankingFilter: !!((filter.query_preview && String(filter.query_preview).trim() !== '') || (filter.querypreview && String(filter.querypreview).trim() !== '')),
    query_preview: filter.query_preview,
    querypreview: filter.querypreview,
    queryPreview: filter.queryPreview ?? filter.querypreview ?? filter.query_preview ?? '0',
  filterApply: filter.filterApply || 'Manual' // default Manual if null
  });

  // Fetch dynamic options for select filters
  const fetchDynamicOptions = async (filterId: string, webapi: string) => {
    if (!webapi || webapi.trim() === '') return;
    setLoadingOptions(prev => ({ ...prev, [filterId]: true }));
    try {
      const response = await fetch(webapi);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${parseError}`);
      }
      let options: DynamicOption[] = [];
      if (Array.isArray(data)) {
        options = data.map((item: unknown) => {
          if (item.id && item.name) return { value: item.id, label: item.name };
          if (typeof item === 'string') return { value: item, label: item };
          if (item.name) return { value: item.name, label: item.name };
          if (item.value && item.label) return { value: item.value, label: item.label };
          const firstKey = Object.keys(item)[0];
          return { value: item[firstKey], label: item[firstKey] };
        });
      } else if (data.data && Array.isArray(data.data)) {
        options = data.data.map((item: unknown) => ({
          value: item.id || item.name || item.value,
          label: item.name || item.label || item.value || item.id
        }));
      } else if (data.countries && Array.isArray(data.countries)) {
        options = data.countries.map((item: unknown) => ({
          value: item.id || item.name || item.value,
          label: item.name || item.label || item.value
        }));
      }
      setDynamicOptions(prev => ({ ...prev, [filterId]: options }));
    } catch {
      setDynamicOptions(prev => ({ ...prev, [filterId]: [] }));
    } finally {
      setLoadingOptions(prev => ({ ...prev, [filterId]: false }));
    }
  };

  // Helper: whether this filter has an empty query preview (should show its control)
  const hasEmptyQuery = (f: Filter) => {
    const qp = (f.query_preview ?? f.querypreview ?? '').toString().trim();
    return qp === '';
  };

  // Build the query from selected filters and current values
const buildQueryFromFilters = (selectedIdsOverride?: string[], filterValuesOverride?: Record<string, unknown>) => {
  const selected = filters.filter(f => (selectedIdsOverride ?? selectedFilterIds).includes(f.id));

  if (selected.length === 0) return '';

  const queryFilter = selected.find(f => {
    const qp = (f.query_preview ?? f.querypreview ?? '').toString().trim();
    return qp !== '';
  });

  // ✅ Always default to full SELECT query if no query preview found
  let baseQuery =
    (queryFilter?.query_preview ||
     queryFilter?.querypreview ||
     '').toString().trim() ||
    `SELECT id, name, salesAmount,date, salesQuantity, status, age, salary, country, state, createdAt FROM sales_data ORDER BY id DESC`;

  if (baseQuery.endsWith(';')) baseQuery = baseQuery.slice(0, -1);

  const conditions: string[] = [];
  const liveFilterValues = filterValuesOverride ?? filterValues;

  selected.forEach(filter => {
    const value = liveFilterValues[filter.id];
    if (!value || (Array.isArray(value) && value.length === 0)) return;

    const field = filter.field?.trim() || filter.name?.toLowerCase();

    if (Array.isArray(value)) {
      const quoted = value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ');
      conditions.push(`${field} IN (${quoted})`);
    } else if (filter.type === 'text') {
      conditions.push(`${field} LIKE '%${String(value).replace(/'/g, "''")}%'`);
    } else {
      conditions.push(`${field} = '${String(value).replace(/'/g, "''")}'`);
    }
  });

  let finalQuery = baseQuery;

  if (conditions.length > 0) {
    const cond = conditions.join(' AND ');

    // ✅ Insert WHERE before ORDER BY if not present
    if (finalQuery.toLowerCase().includes(' where ')) {
      finalQuery += ` AND ${cond}`;
    } else {
      const orderPos = finalQuery.toLowerCase().indexOf(' order by');
      finalQuery =
        orderPos !== -1
          ? finalQuery.slice(0, orderPos) + ` WHERE ${cond} ` + finalQuery.slice(orderPos)
          : `${finalQuery} WHERE ${cond}`;
    }
  }
console.log('finalQuery ---------------' + finalQuery);
  return finalQuery;
};

  const toggleFilterSelection = (filterId: string, checked: boolean) => {
    setSelectedFilterIds(prev => {
      let newSelection;
      if (checked) {
        if (prev.includes(filterId)) return prev;
        newSelection = [...prev, filterId];
      } else {
        newSelection = prev.filter(id => id !== filterId);
        setFilterValues(values => {
          const copy = { ...values };
          delete copy[filterId];
          return copy;
        });
      }

      // Update query text when selection changes (use intended selection)
      setQueryText(buildQueryFromFilters(newSelection));

      // If no filters left selected, reload all data and clear query
      if (newSelection.length === 0) {
        setQueryText('');
        fetchAllData();
      }

      return newSelection;
    });
  };

const handleFilterChange = (id: string, value: unknown) => {
  setFilterValues(prev => {
    const newValues = { ...prev, [id]: value };
    const nextQueryRaw = buildQueryFromFilters(undefined, newValues);
    const nextQuery = typeof nextQueryRaw === 'string' ? nextQueryRaw : '';
    setQueryText(nextQuery);

    const changedFilter = filters.find(f => f.id === id);
    if (changedFilter?.filterApply?.toLowerCase() === 'live') {
      applyFilters(nextQuery); // passing a guaranteed string
    }

    return newValues;
  });
};

  const clearAll = () => {
    setSelectedFilterIds([]);
    setFilterValues({});
    setQueryText('');
    setDataError(null);
    fetchAllData();
  };

  const applyFilters = async (queryOverride?: string) => {
  let queryToRun = (queryOverride || queryText || '').trim();

  if (!queryToRun.toUpperCase().startsWith('SELECT')) {
    // Try rebuild as a fallback
    const rebuilt = buildQueryFromFilters();
    queryToRun = (typeof rebuilt === 'string' ? rebuilt : '').trim();
  }

  if (!queryToRun || !queryToRun.toUpperCase().startsWith('SELECT')) {
    // No valid query, run default query
    fetchAllData();
    return;
  }

  setLoadingData(true);
  setDataError(null);
  try {
    const response = await fetch('https://intelligentsalesman.com/ism1/API/api/unified_query.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryToRun }),
    });
    if (!response.ok) throw new Error(`Error executing query: ${response.statusText}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    setTableData(data);
  } catch (err: unknown) {
    setDataError((err instanceof Error ? err.message : 'Failed to execute query') || 'Failed to execute query');
    setTableData([]);
  } finally {
    setLoadingData(false);
  }
};

  // *** FIXED getFilterOptions to properly handle static and dynamic webapiType ***
  const getFilterOptions = (filter: Filter): DynamicOption[] => {
  const webapiType = filter.webapitype ? filter.webapitype.toLowerCase() : '';

  if (webapiType === 'static') {
    if (filter.staticoption && filter.staticoption.trim() !== '') {
      return filter.staticoption
        .split(',')
        .map(opt => opt.trim())
        .filter(Boolean)
        .map(opt => ({ value: opt, label: opt }));
    }
    // fallback to options array if staticoption missing or empty
    if (Array.isArray(filter.options)) {
      return filter.options.map(opt => ({ value: opt, label: opt }));
    }
    return [];
  }

  if (webapiType === 'dynamic') {
    if (filter.webapi && filter.webapi.trim() !== '' && dynamicOptions[filter.id]) {
      return dynamicOptions[filter.id];
    }
    return [];
  }

  // fallback: if options is array, use it
  if (Array.isArray(filter.options)) {
    return filter.options.map(opt => ({ value: opt, label: opt }));
  }

  return [];
};

  // Render filter input/select control
  const renderFilterControl = (filter: Filter, value: unknown) => {
    const options = getFilterOptions(filter);
    const isLoading = loadingOptions[filter.id];

    const parseInlineStyle = (styleString: string): React.CSSProperties => {
      if (!styleString) return {};
      const styles: React.CSSProperties = {};
      styleString.split(';').forEach(style => {
        const [property, v] = style.split(':').map(s => s.trim());
        if (property && v) {
          const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          (styles as Record<string, string>)[camelProperty] = v;
        }
      });
      return styles;
    };

    const createEventHandlers = (filter: Filter) => {
      type EventHandler = (e: React.SyntheticEvent, filter: Filter) => void;
      const handlers: Record<string, EventHandler> = {};

      const windowWithHandlers = window as Window & Record<string, EventHandler>;
      if (filter.onClickHandler && windowWithHandlers[filter.onClickHandler]) {
        handlers.onClick = (e: React.MouseEvent) => windowWithHandlers[filter.onClickHandler!](e, filter);
      }
      if (filter.onBlurHandler && windowWithHandlers[filter.onBlurHandler]) {
        handlers.onBlur = (e: React.FocusEvent) => windowWithHandlers[filter.onBlurHandler!](e, filter);
      }
      if (filter.onChangeHandler && windowWithHandlers[filter.onChangeHandler]) {
        handlers.onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
          handleFilterChange(filter.id, e.target.value);
          windowWithHandlers[filter.onChangeHandler!](e, filter);
        };
      } else {
        handlers.onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => handleFilterChange(filter.id, e.target.value);
      }
      if (filter.onFocusHandler && windowWithHandlers[filter.onFocusHandler]) {
        handlers.onFocus = (e: React.FocusEvent) => windowWithHandlers[filter.onFocusHandler!](e, filter);
      }
      if (filter.onKeyDownHandler && windowWithHandlers[filter.onKeyDownHandler]) {
        handlers.onKeyDown = (e: React.KeyboardEvent) => windowWithHandlers[filter.onKeyDownHandler!](e, filter);
      }
      if (filter.onKeyUpHandler && windowWithHandlers[filter.onKeyUpHandler]) {
        handlers.onKeyUp = (e: React.KeyboardEvent) => windowWithHandlers[filter.onKeyUpHandler!](e, filter);
      }

      return handlers;
    };

    const commonProps = {
      className: `w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${filter.cssClass || ''}`,
      style: parseInlineStyle(filter.inlineStyle || ''),
      disabled: isLoading,
      ...createEventHandlers(filter)
    };

    switch (filter.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={filter.placeholder || `Filter by ${filter.name}`}
            value={value || ''}
            {...commonProps}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            placeholder={filter.placeholder || `Filter by ${filter.name}`}
            value={value || ''}
            min={filter.min || undefined}
            max={filter.max || undefined}
            {...commonProps}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            {...commonProps}
          />
        );
      case 'select':
        if (filter.multiSelect) {
          return (
            <div style={parseInlineStyle(filter.inlineStyle || '')} className={filter.cssClass}>
              <MultiSelectCombobox
                options={options}
                value={Array.isArray(value) ? value : value ? [value] : []}
                onChange={selected => {
                  handleFilterChange(filter.id, selected);
                  const windowWithHandlers = window as Window & Record<string, (e: { target: { value: unknown } }, filter: Filter) => void>;
                  if (filter.onChangeHandler && windowWithHandlers[filter.onChangeHandler]) {
                    windowWithHandlers[filter.onChangeHandler!]({ target: { value: selected } }, filter);
                  }
                }}
                placeholder={filter.placeholder || `Select ${filter.name}`}
                loading={isLoading}
              />
            </div>
          );
        }
        return (
          <div className="relative">
            {isLoading && (
              <div className="absolute top-2 right-2 z-10">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
            <select value={value || ''} {...commonProps}>
              <option value="">All {filter.name}</option>
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {isLoading && (
              <div className="text-xs text-gray-500 mt-1">Loading options...</div>
            )}
          </div>
        );
      default:
        return (
          <input
            type="text"
            placeholder={filter.placeholder || `Filter by ${filter.name}`}
            value={value || ''}
            {...commonProps}
          />
        );
    }
  };

  if (loadingFilters) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading filters...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const selectedFilters = filters.filter(f => selectedFilterIds.includes(f.id));

  return (
    <div className="p-6 mx-auto">
      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Available Filters</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md shadow hover:bg-gray-700 transition"
            >
              Clear All
            </button>
            <button
  onClick={() => {
    const freshQuery = buildQueryFromFilters();
    const q = typeof freshQuery === 'string' ? freshQuery : '';
    setQueryText(q);
    applyFilters(q);
  }}
  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
  disabled={
    selectedFilterIds.length === 0 ||
    selectedFilters.every(f => f.filterApply?.toLowerCase() === 'live')
  }
>
  Apply Filters
</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          {filters.map(filter => (
            <div key={filter.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`filter-${filter.id}`}
                checked={selectedFilterIds.includes(filter.id)}
                onChange={(e) => toggleFilterSelection(filter.id, e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor={`filter-${filter.id}`}
                className="text-sm font-medium text-gray-700 cursor-pointer flex items-center">
                {filter.name}
                {!hasEmptyQuery(filter) && (
                  <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Query
                  </span>
                )}
                {filter.type === 'select' && filter.webapiType?.toLowerCase() === 'dynamic' && filter.webapi && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Dynamic
                  </span>
                )}
              </label>
            </div>
          ))}
        </div>

        {/* ✅ Only show when any selected filter has queryPreview = '1' */}
{selectedFilters.some(f => f.queryPreview === '1') && (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Generated Query (Editable)
    </label>
    <textarea
      value={queryText}
      onChange={(e) => setQueryText(e.target.value)}
      className="w-full h-32 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition font-mono text-sm"
      placeholder="Query will be generated here based on your filter selections..."
    />
    <p className="text-xs text-gray-500 mt-1">
      This query is automatically built from your filter selections but remains fully editable.
    </p>
  </div>
)}

        {selectedFilters.filter(hasEmptyQuery).length > 0 && (
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedFilters.filter(hasEmptyQuery).map(f => (
              <div key={f.id} className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {f.name}
                  {f.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderFilterControl(f, filterValues[f.id])}
                {f.description && (
                  <p className="text-xs text-gray-500 mt-1">{f.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {tableData.length} results
          {selectedFilterIds.length > 0 && (
            <span className="ml-2 text-blue-600">
              (selected: {selectedFilters.map(f => f.name).join(', ')})
            </span>
          )}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {tableData.length > 0 ? (
                  Object.keys(tableData[0]).map((col) => (
                    <th
                      key={col}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))
                ) : (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No Data
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingData ? (
                <tr>
                  <td colSpan={tableData.length > 0 ? Object.keys(tableData[0]).length : 1} className="text-center py-6">
                    Loading data...
                  </td>
                </tr>
              ) : dataError ? (
                <tr>
                  <td colSpan={tableData.length > 0 ? Object.keys(tableData[0]).length : 1} className="text-center py-6 text-red-600">
                    {dataError}
                  </td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan={tableData.length > 0 ? Object.keys(tableData[0]).length : 1} className="text-center py-6">
                    {selectedFilterIds.length ? 'No data found for the selected filters' : 'No data available'}
                  </td>
                </tr>
              ) : (
                tableData.map((row: Record<string, unknown>, index: number) => (
                  <tr key={row.id ?? index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {Object.keys(row).map((col) => (
                      <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row[col] != null ? String(row[col]) : ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountListPage;