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
  defaultValue?: any;
  required?: boolean;
  visible?: boolean;
  isActive?: boolean;
  description?: string;
  tags?: string[] | string;
  min?: any;
  max?: any;
  pattern?: string;
  allowCustom?: boolean;
  advancedConfig?: string;
  config?: any;
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

const FilterTablePage: React.FC = () => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<{ [key: string]: any }>({});
  const [dynamicOptions, setDynamicOptions] = useState<{ [key: string]: DynamicOption[] }>({});
  const [loadingOptions, setLoadingOptions] = useState<{ [key: string]: boolean }>({});
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [queryText, setQueryText] = useState<string>('');

  // Fetch all data on load (using unified endpoint)
  const fetchAllData = async () => {
    try {
      setLoadingData(true);
      setDataError(null);
      const res = await fetch('https://intelligentsalesman.com/ism1/API/api/unified_query.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:
            'SELECT id, name, salesAmount, salesQuantity, status, age, salary, country, state, createdAt FROM sales_data ORDER BY id DESC',
        }),
      });
      if (!res.ok) throw new Error(`Error fetching data: ${res.statusText}`);
      const data = await res.json();
      setTableData(data);
    } catch (e: any) {
      setDataError(e.message || 'Failed to fetch data');
      setTableData([]);
    } finally {
      setLoadingData(false);
    }
  };

  const normalizeFilter = (filter: any): Filter => ({
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
    webapiType: filter.webapiType || 'dynamic',
    staticOptions: filter.staticOptions || '',
    isRankingFilter: !!((filter.query_preview && String(filter.query_preview).trim() !== '') || (filter.querypreview && String(filter.querypreview).trim() !== '')),
    query_preview: filter.query_preview,
    querypreview: filter.querypreview
  });

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
        options = data.map((item: any) => {
          if (item.id && item.name) return { value: item.id, label: item.name };
          if (typeof item === 'string') return { value: item, label: item };
          if (item.name) return { value: item.name, label: item.name };
          if (item.value && item.label) return { value: item.value, label: item.label };
          const firstKey = Object.keys(item)[0];
          return { value: item[firstKey], label: item[firstKey] };
        });
      } else if (data.data && Array.isArray(data.data)) {
        options = data.data.map((item: any) => ({
          value: item.id || item.name || item.value,
          label: item.name || item.label || item.value || item.id
        }));
      } else if (data.countries && Array.isArray(data.countries)) {
        options = data.countries.map((item: any) => ({
          value: item.id || item.name || item.value,
          label: item.name || item.label || item.value
        }));
      }
      setDynamicOptions(prev => ({ ...prev, [filterId]: options }));
    } catch (e) {
      setDynamicOptions(prev => ({ ...prev, [filterId]: [] }));
    } finally {
      setLoadingOptions(prev => ({ ...prev, [filterId]: false }));
    }
  };

  useEffect(() => {
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
          filter.isActive !== false && filter.visible !== false
        );
        setFilters(activeFilters);
        setError(null);

        activeFilters.forEach(filter => {
          if (filter.type === 'select' &&
            filter.webapiType === 'dynamic' &&
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
  }, []);

  // Load all data by default once filters are loaded and there is no selection
  useEffect(() => {
    if (!loadingFilters && selectedFilterIds.length === 0) {
      fetchAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingFilters]);

  // Helper: whether this filter has an empty query preview (should show its control)
  const hasEmptyQuery = (f: Filter) => {
    const qp = (f.query_preview ?? f.querypreview ?? '').toString().trim();
    return qp === '';
  };

  // Build the query from selected filters and current values
  const buildQueryFromFilters = (selectedIdsOverride?: string[], filterValuesOverride?: Record<string, any>) => {
    const selected = filters.filter(f => (selectedIdsOverride ?? selectedFilterIds).includes(f.id));

    if (selected.length === 0) {
      return '';
    }

    // Pick the first selected filter that has a query_preview as base
    const queryFilter = selected.find(f => {
      const qp = (f.query_preview ?? f.querypreview ?? '').toString().trim();
      return qp !== '';
    });

    let baseQuery = '';
    if (queryFilter) {
      baseQuery = (queryFilter.query_preview || queryFilter.querypreview || '').toString().trim();
      if (baseQuery.endsWith(';')) baseQuery = baseQuery.slice(0, -1);
    } else {
      baseQuery = 'SELECT id, name, salesAmount, salesQuantity, status, age, salary, country, state, createdAt FROM sales_data WHERE 1=1';
    }

    // Build additional conditions from filter values
    const conditions: string[] = [];
    selected.forEach(filter => {
      const liveFilterValues = filterValuesOverride ?? filterValues;
      const value = liveFilterValues[filter.id];
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return;

      const field = (filter.field && filter.field.trim() !== '') ? filter.field : filter.name.toLowerCase();

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
      if (finalQuery.toLowerCase().includes(' where ')) {
        finalQuery += ` AND ${cond}`;
      } else {
        // Insert WHERE before ORDER BY/GROUP BY/LIMIT if present
        const match = finalQuery.match(/\s+(ORDER\s+BY|GROUP\s+BY|LIMIT)\s+/i);
        if (match && match.index !== undefined) {
          const before = finalQuery.substring(0, match.index);
          const after = finalQuery.substring(match.index);
          finalQuery = `${before} WHERE ${cond}${after}`;
        } else {
          finalQuery += ` WHERE ${cond}`;
        }
      }
    }

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

  const handleFilterChange = (id: string, value: any) => {
    setFilterValues(prev => {
      const newValues = { ...prev, [id]: value };

      // Update query text immediately using the latest values
      setQueryText(buildQueryFromFilters(undefined, newValues));

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

  const getFilterOptions = (filter: Filter): DynamicOption[] => {
    if (filter.webapiType === 'static' && filter.staticOptions) {
      return filter.staticOptions
        .split(',')
        .map(opt => opt.trim())
        .filter(Boolean)
        .map(opt => ({ value: opt, label: opt }));
    }
    if (filter.webapiType === 'dynamic' && filter.webapi && filter.webapi.trim() !== '' && dynamicOptions[filter.id]) {
      return dynamicOptions[filter.id];
    }
    if (Array.isArray(filter.options)) {
      return filter.options.map(opt => ({ value: opt, label: opt }));
    }
    return [];
  };

  const renderFilterControl = (filter: Filter, value: any) => {
    const options = getFilterOptions(filter);
    const isLoading = loadingOptions[filter.id];

    const parseInlineStyle = (styleString: string): React.CSSProperties => {
      if (!styleString) return {};
      const styles: React.CSSProperties = {};
      styleString.split(';').forEach(style => {
        const [property, v] = style.split(':').map(s => s.trim());
        if (property && v) {
          const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          (styles as any)[camelProperty] = v;
        }
      });
      return styles;
    };

    const createEventHandlers = (filter: Filter) => {
      const handlers: any = {};

      if (filter.onClickHandler && (window as any)[filter.onClickHandler]) {
        handlers.onClick = (e: any) => (window as any)[filter.onClickHandler!](e, filter);
      }
      if (filter.onBlurHandler && (window as any)[filter.onBlurHandler]) {
        handlers.onBlur = (e: any) => (window as any)[filter.onBlurHandler!](e, filter);
      }
      if (filter.onChangeHandler && (window as any)[filter.onChangeHandler]) {
        handlers.onChange = (e: any) => {
          handleFilterChange(filter.id, e.target.value);
          (window as any)[filter.onChangeHandler!](e, filter);
        };
      } else {
        handlers.onChange = (e: any) => handleFilterChange(filter.id, e.target.value);
      }
      if (filter.onFocusHandler && (window as any)[filter.onFocusHandler]) {
        handlers.onFocus = (e: any) => (window as any)[filter.onFocusHandler!](e, filter);
      }
      if (filter.onKeyDownHandler && (window as any)[filter.onKeyDownHandler]) {
        handlers.onKeyDown = (e: any) => (window as any)[filter.onKeyDownHandler!](e, filter);
      }
      if (filter.onKeyUpHandler && (window as any)[filter.onKeyUpHandler]) {
        handlers.onKeyUp = (e: any) => (window as any)[filter.onKeyUpHandler!](e, filter);
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
                  if (filter.onChangeHandler && (window as any)[filter.onChangeHandler]) {
                    (window as any)[filter.onChangeHandler!]({ target: { value: selected } }, filter);
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

  const applyFilters = async () => {
    if (!queryText.trim()) {
      setDataError('No query to execute');
      return;
    }

    setLoadingData(true);
    setDataError(null);

    try {
      const response = await fetch('https://intelligentsalesman.com/ism1/API/api/unified_query.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });

      if (!response.ok) throw new Error(`Error executing query: ${response.statusText}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTableData(data);
    } catch (err: any) {
      setDataError(err.message || 'Failed to execute query');
      setTableData([]);
    } finally {
      setLoadingData(false);
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dynamic Filters</h1>
        <p className="text-gray-600">
          Select filters, configure only those without a query, and click Apply Filters. Results are ANDed.
        </p>
      </div>

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
              onClick={applyFilters}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
              disabled={selectedFilterIds.length === 0}
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
                {filter.type === 'select' && filter.webapiType === 'dynamic' && filter.webapi && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Dynamic
                  </span>
                )}
              </label>
            </div>
          ))}
        </div>

        {selectedFilterIds.length > 0 && (
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Rank</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingData ? (
                <tr><td colSpan={8} className="text-center py-6">Loading data...</td></tr>
              ) : dataError ? (
                <tr><td colSpan={8} className="text-center py-6 text-red-600">{dataError}</td></tr>
              ) : tableData.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-6">
                  {selectedFilterIds.length ? 'No data found for the selected filters' : 'Select filters and click Apply'}
                </td></tr>
              ) : (
                tableData.map((row: any, index: number) => (
                  <tr key={row.id ?? index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.age}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        row.status === 'Active' || row.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : row.status === 'Inactive' || row.status === 'inactive'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.country}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.state}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.createdAt}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.sales_rank ? row.sales_rank : ''}
                    </td>
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

export default FilterTablePage;