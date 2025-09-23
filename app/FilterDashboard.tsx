'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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

const currency = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

const numberFmt = (n: number) => new Intl.NumberFormat().format(n);

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#e11d48', '#84cc16'];

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
      : options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <Combobox value={value} onChange={onChange} multiple>
      <div className="relative">
        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-400">
          <Combobox.Input
            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
            displayValue={(selected: string[]) =>
              selected
                .map((val) => options.find((option) => option.value === val)?.label || val)
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

const App: React.FC = () => {
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

  // Fetch all data on load (unfiltered)
  const fetchAllData = async () => {
    try {
      setLoadingData(true);
      setDataError(null);
      const res = await fetch('https://intelligentsalesman.com/ism1/API/sales_data.php');
      if (!res.ok) throw new Error(`Error fetching data: ${res.statusText}`);
      const data = await res.json();
      setTableData(Array.isArray(data) ? data : []);
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
      ? filter.options
          .split(',')
          .map((opt: string) => opt.trim())
          .filter(Boolean)
      : [],
    tags: Array.isArray(filter.tags)
      ? filter.tags
      : typeof filter.tags === 'string' && filter.tags
      ? filter.tags
          .split(',')
          .map((tag: string) => tag.trim())
          .filter(Boolean)
      : [],
    multiSelect: filter.multiSelect === true || filter.multiSelect === 1 || filter.multiSelect === '1',
    webapiType: filter.webapiType || 'dynamic',
    staticOptions: filter.staticOptions || '',
    isRankingFilter: !!(
      (filter.query_preview && String(filter.query_preview).trim() !== '') ||
      (filter.querypreview && String(filter.querypreview).trim() !== '')
    ),
    query_preview: filter.query_preview,
    querypreview: filter.querypreview,
  });

  const fetchDynamicOptions = async (filterId: string, webapi: string) => {
    if (!webapi || webapi.trim() === '') return;
    setLoadingOptions((prev) => ({ ...prev, [filterId]: true }));
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
          label: item.name || item.label || item.value || item.id,
        }));
      } else if (data.countries && Array.isArray(data.countries)) {
        options = data.countries.map((item: any) => ({
          value: item.id || item.name || item.value,
          label: item.name || item.label || item.value,
        }));
      }
      setDynamicOptions((prev) => ({ ...prev, [filterId]: options }));
    } catch (e) {
      setDynamicOptions((prev) => ({ ...prev, [filterId]: [] }));
    } finally {
      setLoadingOptions((prev) => ({ ...prev, [filterId]: false }));
    }
  };

  useEffect(() => {
    setLoadingFilters(true);
    fetch('https://intelligentsalesman.com/ism1/API/getFilter.php')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const filtersArray = Array.isArray(data) ? data : Array.isArray(data.filters) ? data.filters : [];
        const normalizedFilters = filtersArray.map(normalizeFilter);
        const activeFilters = normalizedFilters.filter((filter) => filter.isActive !== false && filter.visible !== false);
        setFilters(activeFilters);
        setError(null);

        activeFilters.forEach((filter) => {
          if (
            filter.type === 'select' &&
            filter.webapiType === 'dynamic' &&
            filter.webapi &&
            filter.webapi.trim() !== ''
          ) {
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

  useEffect(() => {
    if (!loadingFilters && selectedFilterIds.length === 0) {
      fetchAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingFilters]);

  const toggleFilterSelection = (filterId: string, checked: boolean) => {
    setSelectedFilterIds((prev) => {
      if (checked) {
        if (prev.includes(filterId)) return prev;
        return [...prev, filterId];
      } else {
        const next = prev.filter((id) => id !== filterId);
        setFilterValues((values) => {
          const copy = { ...values };
          delete copy[filterId];
          return copy;
        });
        if (next.length === 0) {
          fetchAllData();
        }
        return next;
      }
    });
  };

  const handleFilterChange = (id: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [id]: value }));
  };

  const clearAll = () => {
    setSelectedFilterIds([]);
    setFilterValues({});
    setDataError(null);
    fetchAllData();
  };

  const getFilterOptions = (filter: Filter): DynamicOption[] => {
    if (filter.webapiType === 'static' && filter.staticOptions) {
      return filter.staticOptions
        .split(',')
        .map((opt) => opt.trim())
        .filter(Boolean)
        .map((opt) => ({ value: opt, label: opt }));
    }
    if (
      filter.webapiType === 'dynamic' &&
      filter.webapi &&
      filter.webapi.trim() !== '' &&
      dynamicOptions[filter.id]
    ) {
      return dynamicOptions[filter.id];
    }
    if (Array.isArray(filter.options)) {
      return filter.options.map((opt) => ({ value: opt, label: opt }));
    }
    return [];
  };

  const renderFilterControl = (filter: Filter, value: any) => {
    const options = getFilterOptions(filter);
    const isLoading = loadingOptions[filter.id];

    const parseInlineStyle = (styleString: string): React.CSSProperties => {
      if (!styleString) return {} as React.CSSProperties;
      const styles: React.CSSProperties = {};
      styleString.split(';').forEach((style) => {
        const [property, v] = style.split(':').map((s) => s.trim());
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
      className:
        `w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${
          filter.cssClass || ''
        }`,
      style: parseInlineStyle(filter.inlineStyle || ''),
      disabled: isLoading,
      ...createEventHandlers(filter),
    } as any;

    switch (filter.type) {
      case 'text':
        return (
          <input type="text" placeholder={filter.placeholder || `Filter by ${filter.name}`} value={value || ''} {...commonProps} />
        );
      case 'number':
        return (
          <input
            type="number"
            placeholder={filter.placeholder || `Filter by ${filter.name}`} value={value || ''}
            min={filter.min || undefined}
            max={filter.max || undefined}
            {...commonProps}
          />
        );
      case 'date':
        return <input type="date" value={value || ''} {...commonProps} />;
      case 'select':
        if (filter.multiSelect) {
          return (
            <div style={commonProps.style} className={filter.cssClass}>
              <MultiSelectCombobox
                options={options}
                value={Array.isArray(value) ? value : value ? [value] : []}
                onChange={(selected) => {
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
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {isLoading && <div className="text-xs text-gray-500 mt-1">Loading options...</div>}
          </div>
        );
      default:
        return (
          <input type="text" placeholder={filter.placeholder || `Filter by ${filter.name}`} value={value || ''} {...commonProps} />
        );
    }
  };

  const hasEmptyQuery = (f: Filter) => {
    const qp = (f.query_preview ?? f.querypreview ?? '').toString().trim();
    return qp === '';
  };

  const applyFilters = async () => {
    setLoadingData(true);
    setDataError(null);

    try {
      const selected = filters.filter((f) => selectedFilterIds.includes(f.id));

      const selectedWithQuery = selected.filter((f) => !hasEmptyQuery(f));
      const selectedWithoutQuery = selected.filter((f) => hasEmptyQuery(f));

      const isRanking = selectedWithQuery.length > 0;

      if (isRanking) {
        const firstQueryFilter = selectedWithQuery[0];
        const query = (firstQueryFilter.query_preview || firstQueryFilter.querypreview || '').toString();

        const rankingFiltersPayload: Record<string, any> = {};
        const fieldsMap: Record<string, string> = {};
        selected.forEach((f) => {
          if (f.field && typeof f.field === 'string' && f.field.trim() !== '') {
            rankingFiltersPayload[f.field] = filterValues[f.id];
          } else {
            rankingFiltersPayload[f.id] = filterValues[f.id];
          }
          if (f.field && typeof f.field === 'string' && f.field.trim() !== '') {
            fieldsMap[f.id] = f.field;
          }
        });

        const response = await fetch(
          'https://intelligentsalesman.com/ism1/API/api/executeRankingQuery.php',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, rankingFilters: rankingFiltersPayload, fields: fieldsMap }),
          }
        );
        if (!response.ok) throw new Error(`Error fetching ranking data: ${response.statusText}`);
        const data = await response.json();
        setTableData(Array.isArray(data) ? data : []);
      } else {
        const params: any = {};
        selectedWithoutQuery.forEach((filter) => {
          const val = filterValues[filter.id];
          if (val && val !== '' && !(Array.isArray(val) && val.length === 0)) {
            params[filter.field] = filter.multiSelect ? (Array.isArray(val) ? val.join(',') : val) : val;
          }
        });

        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(
          `https://intelligentsalesman.com/ism1/API/sales_data.php?${queryString}`
        );
        if (!response.ok) throw new Error(`Error fetching data: ${response.statusText}`);
        const data = await response.json();
        setTableData(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      setDataError(err.message || 'Failed to fetch data');
      setTableData([]);
    } finally {
      setLoadingData(false);
    }
  };

  // Derived metrics and datasets (always based on tableData => filters apply to ALL panels)
  const parsedRows = useMemo(() => {
    return tableData.map((r) => ({
      ...r,
      salesAmountNum: r.salesAmount !== undefined ? parseFloat(String(r.salesAmount)) || 0 : 0,
      salesQuantityNum: r.salesQuantity !== undefined ? Number(r.salesQuantity) || 0 : 0,
      createdAtDate: r.createdAt ? new Date(r.createdAt) : null,
    }));
  }, [tableData]);

  const totalSalesAmount = useMemo(
    () => parsedRows.reduce((sum, r) => sum + (r.salesAmountNum || 0), 0),
    [parsedRows]
  );

  const totalQuantity = useMemo(
    () => parsedRows.reduce((sum, r) => sum + (r.salesQuantityNum || 0), 0),
    [parsedRows]
  );

  const totalSalesPeople = useMemo(() => {
    const setNames = new Set<string>();
    parsedRows.forEach((r) => {
      if (r.name) setNames.add(String(r.name));
    });
    return setNames.size;
  }, [parsedRows]);

  // Bar chart: Sales by Salesperson (sum of salesAmount)
  const salesByPerson = useMemo(() => {
    const map = new Map<string, number>();
    parsedRows.forEach((r) => {
      const key = r.name ? String(r.name) : 'Unknown';
      map.set(key, (map.get(key) || 0) + (r.salesAmountNum || 0));
    });
    const arr = Array.from(map.entries()).map(([name, amount]) => ({ name, amount }));
    // sort desc and take top 12 for readability
    return arr.sort((a, b) => b.amount - a.amount).slice(0, 12);
  }, [parsedRows]);

  // Pie chart: Distribution by Status
  const statusDistribution = useMemo(() => {
    const map = new Map<string, number>();
    parsedRows.forEach((r) => {
      const key = r.status ? String(r.status) : 'unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [parsedRows]);

  // Monthly sales overview: sum of salesAmount by YYYY-MM
  const monthlyOverview = useMemo(() => {
    const map = new Map<string, number>();
    parsedRows.forEach((r) => {
      if (!r.createdAtDate || isNaN(r.createdAtDate.getTime())) return;
      const yyyy = r.createdAtDate.getFullYear();
      const mm = String(r.createdAtDate.getMonth() + 1).padStart(2, '0');
      const key = `${yyyy}-${mm}`;
      map.set(key, (map.get(key) || 0) + (r.salesAmountNum || 0));
    });
    const arr = Array.from(map.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
    return arr;
  }, [parsedRows]);

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
          <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const selectedFilters = filters.filter((f) => selectedFilterIds.includes(f.id));

  return (
    <div className="p-6 mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Dashboard</h1>
        <p className="text-gray-600">All filters apply to every panel below. Configure filters and click Apply Filters.</p>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
          <div className="flex items-center gap-3">
            <button onClick={clearAll} className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md shadow hover:bg-gray-700 transition">
              Clear All
            </button>
            <button onClick={applyFilters} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition" disabled={selectedFilterIds.length === 0}>
              Apply Filters
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          {filters.map((filter) => (
            <div key={filter.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`filter-${filter.id}`}
                checked={selectedFilterIds.includes(filter.id)}
                onChange={(e) => toggleFilterSelection(filter.id, e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={`filter-${filter.id}`} className="text-sm font-medium text-gray-700 cursor-pointer flex items-center">
                {filter.name}
                {!(hasEmptyQuery(filter)) && (
                  <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Query</span>
                )}
                {filter.type === 'select' && filter.webapiType === 'dynamic' && filter.webapi && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Dynamic</span>
                )}
              </label>
            </div>
          ))}
        </div>

        {selectedFilters.filter(hasEmptyQuery).length > 0 && (
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedFilters.filter(hasEmptyQuery).map((f) => (
              <div key={f.id} className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {f.name}
                  {f.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderFilterControl(f, filterValues[f.id])}
                {f.description && <p className="text-xs text-gray-500 mt-1">{f.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Panels (1-3) */}
     <div className="flex gap-6 mb-8">
  <div className="flex-1 min-w-0 bg-white rounded-xl shadow border border-gray-200 p-5">
    <div className="text-sm text-gray-500">Total Sales Amount</div>
    <div className="mt-2 text-2xl font-bold text-gray-900">{loadingData ? '—' : currency(totalSalesAmount)}</div>
    <div className="mt-1 text-xs text-gray-400">Sum of salesAmount</div>
  </div>
  <div className="flex-1 min-w-0 bg-white rounded-xl shadow border border-gray-200 p-5">
    <div className="text-sm text-gray-500">Total Quantity</div>
    <div className="mt-2 text-2xl font-bold text-gray-900">{loadingData ? '—' : numberFmt(totalQuantity)}</div>
    <div className="mt-1 text-xs text-gray-400">Sum of salesQuantity</div>
  </div>
  <div className="flex-1 min-w-0 bg-white rounded-xl shadow border border-gray-200 p-5">
    <div className="text-sm text-gray-500">Salesperson Count</div>
    <div className="mt-2 text-2xl font-bold text-gray-900">{loadingData ? '—' : numberFmt(totalSalesPeople)}</div>
    <div className="mt-1 text-xs text-gray-400">Unique names</div>
  </div>
</div>

      {/* Charts Row (4-6) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Panel 4: Bar chart - Sales by Salesperson */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 h-96">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Sales by Salesperson</h3>
            <span className="text-xs text-gray-500">Top 12</span>
          </div>
          {loadingData ? (
            <div className="h-full flex items-center justify-center text-gray-500">Loading chart...</div>
          ) : salesByPerson.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={salesByPerson} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-25} textAnchor="end" height={60} interval={0} />
                <YAxis />
                <Tooltip formatter={(v: any) => currency(Number(v))} />
                <Legend />
                <Bar dataKey="amount" name="Sales Amount" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Panel 5: Pie chart - Status Distribution */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 h-96">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Status Distribution</h3>
            <span className="text-xs text-gray-500">Count by status</span>
          </div>
          {loadingData ? (
            <div className="h-full flex items-center justify-center text-gray-500">Loading chart...</div>
          ) : statusDistribution.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie dataKey="value" data={statusDistribution} nameKey="name" outerRadius={110} label>
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Panel 6: Monthly Sales Overview */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-5 h-96 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Sales Overview</h3>
          <span className="text-xs text-gray-500">Sum of salesAmount by month</span>
        </div>
        {loadingData ? (
          <div className="h-full flex items-center justify-center text-gray-500">Loading chart...</div>
        ) : monthlyOverview.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={monthlyOverview} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v: any) => currency(Number(v))} />
              <Legend />
              <Bar dataKey="amount" name="Sales Amount" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Panel 7: Table List View */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-900">Table List View</div>
          <div className="text-sm text-gray-600">Showing {tableData.length} results{selectedFilterIds.length > 0 && (
            <span className="ml-2 text-blue-600"> (selected: {selectedFilters.map((f) => f.name).join(', ')})</span>
          )}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingData ? (
                <tr>
                  <td colSpan={9} className="text-center py-6">
                    Loading data...
                  </td>
                </tr>
              ) : dataError ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-red-600">
                    {dataError}
                  </td>
                </tr>
              ) : parsedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6">
                    {selectedFilterIds.length ? 'No data found for the selected filters' : 'Select filters and click Apply'}
                  </td>
                </tr>
              ) : (
                parsedRows.map((row: any, index: number) => (
                  <tr key={row.id ?? index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{currency(row.salesAmountNum)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{numberFmt(row.salesQuantityNum)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          row.status === 'Active' || row.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : row.status === 'Inactive' || row.status === 'inactive'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.country}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.state}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.createdAt}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.age}</td>
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

export const FilterTablePage: React.FC = App;
export const FilterDashboard: React.FC = App;
export default App;