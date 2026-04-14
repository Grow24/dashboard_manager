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
  cssCode?: string;
  onClickHandler?: string;
  onBlurHandler?: string;
  onChangeHandler?: string;
  onFocusHandler?: string;
  onKeyDownHandler?: string;
  onKeyUpHandler?: string;
  onClickHandlerParams?: string;
  onClickHandlerResponse?: string;
  onBlurHandlerParams?: string;
  onBlurHandlerResponse?: string;
  onChangeHandlerParams?: string;
  onChangeHandlerResponse?: string;
  onFocusHandlerParams?: string;
  onFocusHandlerResponse?: string;
  onKeyDownHandlerParams?: string;
  onKeyDownHandlerResponse?: string;
  onKeyUpHandlerParams?: string;
  onKeyUpHandlerResponse?: string;
  query_preview?: string;
  querypreview?: string;
  isRankingFilter?: boolean;
  queryPreview?: string;
  filterApply?: 'Live' | 'Manual';
  condition_operator?: string;
  logical_operator?: string;
  webapitype?: string;
  staticoption?: string;
  queryBuilder?: { queryPreview?: string } | string | null;
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
  const [filterValidationErrors, setFilterValidationErrors] = useState<Record<string, string>>({});
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [queryText, setQueryText] = useState<string>('');

  const normalizeBoolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === '1' || v === 'true' || v === 'yes') return true;
      if (v === '0' || v === 'false' || v === 'no' || v === '') return false;
    }
    return fallback;
  };

  const parseList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item ?? '').trim()).filter(Boolean);
    }
    if (typeof value !== 'string') return [];
    const raw = value.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
      }
      if (typeof parsed === 'string') {
        return parsed.split(',').map((item) => item.trim()).filter(Boolean);
      }
    } catch {
      // not JSON, parse as CSV
    }
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
  };

  const parseQueryBuilderPreview = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'object' && value !== null) {
      const preview = (value as { queryPreview?: unknown }).queryPreview;
      return typeof preview === 'string' ? preview.trim() : '';
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
          const preview = (parsed as { queryPreview?: unknown }).queryPreview;
          return typeof preview === 'string' ? preview.trim() : '';
        }
      } catch {
        return '';
      }
    }
    return '';
  };

  // Fetch assigned filters for this page (only IDs)
  useEffect(() => {
    const fetchAssignedFilterIds = async () => {
      try {
        const response = await fetch('https://intelligentsalesman.com/ism1/API/get_assigned_filters_for_page.php');
        const data = await response.json();
        if (data?.success && Array.isArray(data.filters)) {
          setAssignedFilterIds(data.filters.map((f: { id: string | number }) => String(f.id)));
          return;
        }
        if (Array.isArray(data?.assignedFilterIds)) {
          setAssignedFilterIds(data.assignedFilterIds.map((id: string | number) => String(id)));
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
    setFilters([]);
    setSelectedFilterIds([]);
    setFilterValues({});
    setFilterValidationErrors({});
    setLoadingFilters(false);
    return;
  }

  setLoadingFilters(true);
  fetch('https://intelligentsalesman.com/ism1/API/get_filters.php')
    .then(async res => {
      if (res.ok) return res.json();
      // Backward compatibility for deployments still exposing legacy endpoint name.
      const legacy = await fetch('https://intelligentsalesman.com/ism1/API/getFilter.php');
      if (!legacy.ok) throw new Error(`HTTP error! status: ${legacy.status}`);
      return legacy.json();
    })
    .then(data => {
      const filtersArray = Array.isArray(data) ? data : (Array.isArray(data.filters) ? data.filters : []);
      const normalizedFilters = filtersArray.map(normalizeFilter);
      const activeFilters = normalizedFilters.filter(filter =>
        filter.isActive !== false &&
        filter.visible !== false &&
        assignedFilterIds.includes(filter.id)
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
    if (!loadingFilters && selectedFilterIds.length === 0) {
      console.log('In----------');
      fetchAllData();
    }
  }, [loadingFilters, selectedFilterIds]);

  // Normalize filter helper
  const normalizeFilter = (filter: Partial<Filter>): Filter => ({
    ...filter,
    id: String(filter.id ?? ''),
    options: parseList(filter.options),
    tags: parseList(filter.tags),
    multiSelect: normalizeBoolean(filter.multiSelect, false),
    required: normalizeBoolean(filter.required, false),
    visible: normalizeBoolean(filter.visible, true),
    isActive: normalizeBoolean(filter.isActive, true),
    allowCustom: normalizeBoolean(filter.allowCustom, false),
    webapiType: ((filter.webapiType || filter.webapitype || 'dynamic') as string).toLowerCase() as 'static' | 'dynamic',
    staticOptions: String(filter.staticOptions ?? filter.staticoption ?? ''),
    isRankingFilter: !!((filter.query_preview && String(filter.query_preview).trim() !== '') || (filter.querypreview && String(filter.querypreview).trim() !== '')),
    query_preview: filter.query_preview,
    querypreview: filter.querypreview,
    queryPreview:
      filter.queryPreview ??
      filter.querypreview ??
      filter.query_preview ??
      parseQueryBuilderPreview(filter.queryBuilder) ??
      '0',
    filterApply: filter.filterApply?.toLowerCase() === 'live' ? 'Live' : 'Manual',
    condition_operator: filter.condition_operator || '=',
    logical_operator: filter.logical_operator || 'AND',
    cssCode: typeof filter.cssCode === 'string' ? filter.cssCode : '',
    onClickHandlerParams: typeof filter.onClickHandlerParams === 'string' ? filter.onClickHandlerParams : '',
    onClickHandlerResponse: typeof filter.onClickHandlerResponse === 'string' ? filter.onClickHandlerResponse : '',
    onBlurHandlerParams: typeof filter.onBlurHandlerParams === 'string' ? filter.onBlurHandlerParams : '',
    onBlurHandlerResponse: typeof filter.onBlurHandlerResponse === 'string' ? filter.onBlurHandlerResponse : '',
    onChangeHandlerParams: typeof filter.onChangeHandlerParams === 'string' ? filter.onChangeHandlerParams : '',
    onChangeHandlerResponse: typeof filter.onChangeHandlerResponse === 'string' ? filter.onChangeHandlerResponse : '',
    onFocusHandlerParams: typeof filter.onFocusHandlerParams === 'string' ? filter.onFocusHandlerParams : '',
    onFocusHandlerResponse: typeof filter.onFocusHandlerResponse === 'string' ? filter.onFocusHandlerResponse : '',
    onKeyDownHandlerParams: typeof filter.onKeyDownHandlerParams === 'string' ? filter.onKeyDownHandlerParams : '',
    onKeyDownHandlerResponse: typeof filter.onKeyDownHandlerResponse === 'string' ? filter.onKeyDownHandlerResponse : '',
    onKeyUpHandlerParams: typeof filter.onKeyUpHandlerParams === 'string' ? filter.onKeyUpHandlerParams : '',
    onKeyUpHandlerResponse: typeof filter.onKeyUpHandlerResponse === 'string' ? filter.onKeyUpHandlerResponse : '',
  });

  useEffect(() => {
    if (filters.length === 0) return;
    setFilterValues((prev) => {
      const next = { ...prev };
      filters.forEach((f) => {
        if (next[f.id] !== undefined) return;
        const def = f.defaultValue;
        if (def === undefined || def === null || String(def).trim() === '') return;
        next[f.id] = f.multiSelect ? parseList(def) : String(def);
      });
      return next;
    });
  }, [filters]);

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
      } else if (data.filters && Array.isArray(data.filters)) {
        options = data.filters
          .map((item: unknown) => {
            if (typeof item === 'string') return { value: item, label: item };
            if (item && typeof item === 'object') {
              const obj = item as Record<string, unknown>;
              const label = obj.name ?? obj.label ?? obj.value ?? obj.id;
              if (label != null) {
                const text = String(label);
                return { value: text, label: text };
              }
            }
            return null;
          })
          .filter((opt: DynamicOption | null): opt is DynamicOption => opt !== null);
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
    const qp = (f.query_preview ?? f.querypreview ?? parseQueryBuilderPreview(f.queryBuilder) ?? '').toString().trim();
    return qp === '';
  };

  const isQueryPreviewEnabled = (f: Filter): boolean => {
    const val = f.queryPreview;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (typeof val === 'string') {
      const t = val.trim().toLowerCase();
      return t === '1' || t === 'true' || t === 'yes';
    }
    return false;
  };

  const getFilterValidationError = (filter: Filter, rawValue: unknown): string | null => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return null;
    if (Array.isArray(rawValue) && rawValue.length === 0) return null;

    const value = Array.isArray(rawValue) ? rawValue.join(',') : String(rawValue);
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (filter.pattern && filter.pattern.trim()) {
      try {
        const regex = new RegExp(filter.pattern);
        if (!regex.test(trimmed)) {
          return `${filter.name} format is invalid.`;
        }
      } catch {
        // ignore invalid admin-side regex config to avoid blocking
      }
    }

    if (filter.type === 'number') {
      const num = Number(trimmed);
      if (Number.isNaN(num)) return `${filter.name} must be a number.`;
      const minNum = filter.min !== undefined && filter.min !== '' ? Number(filter.min) : NaN;
      const maxNum = filter.max !== undefined && filter.max !== '' ? Number(filter.max) : NaN;
      if (!Number.isNaN(minNum) && num < minNum) return `${filter.name} must be at least ${minNum}.`;
      if (!Number.isNaN(maxNum) && num > maxNum) return `${filter.name} must be at most ${maxNum}.`;
      return null;
    }

    if (filter.type === 'date') {
      const current = new Date(trimmed);
      if (Number.isNaN(current.getTime())) return `${filter.name} must be a valid date.`;
      if (filter.min) {
        const minDate = new Date(String(filter.min));
        if (!Number.isNaN(minDate.getTime()) && current < minDate) {
          return `${filter.name} must be on or after ${filter.min}.`;
        }
      }
      if (filter.max) {
        const maxDate = new Date(String(filter.max));
        if (!Number.isNaN(maxDate.getTime()) && current > maxDate) {
          return `${filter.name} must be on or before ${filter.max}.`;
        }
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

  // Build the query from selected filters and current values
const buildQueryFromFilters = (selectedIdsOverride?: string[], filterValuesOverride?: Record<string, unknown>) => {
  const selected = filters.filter(f => (selectedIdsOverride ?? selectedFilterIds).includes(f.id));

  if (selected.length === 0) return '';

  const queryFilter = selected.find(f => {
    const qp = (f.query_preview ?? f.querypreview ?? parseQueryBuilderPreview(f.queryBuilder) ?? '').toString().trim();
    return qp !== '';
  });

  // Stored query_preview is a full SQL statement: run it as-is (no UI WHERE merging).
  if (queryFilter) {
    let onlyPreview =
      (queryFilter.query_preview ??
        queryFilter.querypreview ??
        parseQueryBuilderPreview(queryFilter.queryBuilder) ??
        '')
        .toString()
        .trim();
    if (onlyPreview.endsWith(';')) onlyPreview = onlyPreview.slice(0, -1);
    if (onlyPreview) return onlyPreview;
  }

  // No preview: default list query + optional conditions from field values
  let baseQuery = `SELECT id, name, salesAmount,date, salesQuantity, status, age, salary, country, state, createdAt FROM sales_data ORDER BY id DESC`;

  if (baseQuery.endsWith(';')) baseQuery = baseQuery.slice(0, -1);

  const conditionSegments: { logical: string; expression: string }[] = [];
  const liveFilterValues = filterValuesOverride ?? filterValues;

  selected.forEach(filter => {
    const value = liveFilterValues[filter.id];
    if (!value || (Array.isArray(value) && value.length === 0)) return;

    const field = filter.field?.trim() || filter.name?.toLowerCase();

    if (Array.isArray(value)) {
      const quoted = value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ');
      conditionSegments.push({
        logical: String(filter.logical_operator || 'AND').toUpperCase(),
        expression: `${field} IN (${quoted})`,
      });
    } else {
      const operator = String(filter.condition_operator || (filter.type === 'text' ? 'LIKE' : '=')).toUpperCase();
      const escaped = String(value).replace(/'/g, "''");
      if (filter.type === 'text' && operator === 'LIKE') {
        conditionSegments.push({
          logical: String(filter.logical_operator || 'AND').toUpperCase(),
          expression: `${field} LIKE '%${escaped}%'`,
        });
      } else if (['=', '!=', '<>', '>', '<', '>=', '<='].includes(operator)) {
        conditionSegments.push({
          logical: String(filter.logical_operator || 'AND').toUpperCase(),
          expression: `${field} ${operator} '${escaped}'`,
        });
      } else {
        conditionSegments.push({
          logical: String(filter.logical_operator || 'AND').toUpperCase(),
          expression: `${field} = '${escaped}'`,
        });
      }
    }
  });

  let finalQuery = baseQuery;

  if (conditionSegments.length > 0) {
    const cond = conditionSegments.reduce((acc, segment, idx) => {
      if (idx === 0) return segment.expression;
      const safeLogical = segment.logical === 'OR' ? 'OR' : 'AND';
      return `${acc} ${safeLogical} ${segment.expression}`;
    }, '');

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

  const getFilterQueryPreviewSql = (f: Filter | undefined): string => {
    if (!f) return '';
    let sql = (f.query_preview ?? f.querypreview ?? parseQueryBuilderPreview(f.queryBuilder) ?? '')
      .toString()
      .trim();
    if (sql.endsWith(';')) sql = sql.slice(0, -1);
    return sql;
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
        setFilterValidationErrors((prevErrors) => {
          const copy = { ...prevErrors };
          delete copy[filterId];
          return copy;
        });
      }

      const built = buildQueryFromFilters(newSelection);
      const query = typeof built === 'string' ? built : '';
      setQueryText(query);

      // If no filters left selected, reload all data and clear query
      if (newSelection.length === 0) {
        setQueryText('');
        fetchAllData();
      } else if (checked) {
        const toggled = filters.find((x) => x.id === filterId);
        const previewSql = getFilterQueryPreviewSql(toggled);
        if (previewSql && previewSql.toUpperCase().startsWith('SELECT')) {
          setQueryText(previewSql);
          queueMicrotask(() => {
            applyFilters(previewSql, undefined, { bypassValidation: true });
          });
        }
      } else {
        queueMicrotask(() => {
          applyFilters(undefined, undefined, { bypassValidation: false });
        });
      }

      return newSelection;
    });
  };

const handleFilterChange = (id: string, value: unknown) => {
  const changedFilter = filters.find(f => f.id === id);
  if (!changedFilter) return;
  const validationError = getFilterValidationError(changedFilter, value);
  setFilterValidationErrors((prev) => {
    const next = { ...prev };
    if (validationError) next[id] = validationError;
    else delete next[id];
    return next;
  });

  setFilterValues(prev => {
    const newValues = { ...prev, [id]: value };
    const nextQueryRaw = buildQueryFromFilters(undefined, newValues);
    const nextQuery = typeof nextQueryRaw === 'string' ? nextQueryRaw : '';
    setQueryText(nextQuery);

    if (!validationError && changedFilter?.filterApply?.toLowerCase() === 'live') {
      applyFilters(nextQuery, newValues); // passing a guaranteed string
    }

    return newValues;
  });
};

const getRequiredFilterError = (selectedIdsOverride?: string[], valuesOverride?: Record<string, unknown>): string | null => {
  const selected = filters.filter(f => (selectedIdsOverride ?? selectedFilterIds).includes(f.id));
  const values = valuesOverride ?? filterValues;
  const missing = selected.find((f) => {
    if (!f.required) return false;
    const v = values[f.id];
    if (Array.isArray(v)) return v.length === 0;
    return v === undefined || v === null || String(v).trim() === '';
  });
  return missing ? `${missing.name} is required.` : null;
};

const getSelectedValidationError = (selectedIdsOverride?: string[], valuesOverride?: Record<string, unknown>): string | null => {
  const selected = filters.filter(f => (selectedIdsOverride ?? selectedFilterIds).includes(f.id));
  const values = valuesOverride ?? filterValues;
  for (const filter of selected) {
    const err = getFilterValidationError(filter, values[filter.id]);
    if (err) return err;
  }
  return null;
};

const parseHandlerParams = (raw: string | undefined): unknown => {
  if (!raw || !raw.trim()) return undefined;
  const text = raw.trim();
  try {
    return JSON.parse(text);
  } catch {
    // fallback to CSV / plain text
  }
  if (text.includes(',')) {
    return text.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return text;
};

const executeFilterEvent = (
  filter: Filter,
  eventName: 'click' | 'blur' | 'change' | 'focus' | 'keydown' | 'keyup',
  event: unknown,
  value?: unknown
) => {
  const handlerNameMap = {
    click: filter.onClickHandler,
    blur: filter.onBlurHandler,
    change: filter.onChangeHandler,
    focus: filter.onFocusHandler,
    keydown: filter.onKeyDownHandler,
    keyup: filter.onKeyUpHandler,
  };
  const paramsMap = {
    click: filter.onClickHandlerParams,
    blur: filter.onBlurHandlerParams,
    change: filter.onChangeHandlerParams,
    focus: filter.onFocusHandlerParams,
    keydown: filter.onKeyDownHandlerParams,
    keyup: filter.onKeyUpHandlerParams,
  };
  const responseMap = {
    click: filter.onClickHandlerResponse,
    blur: filter.onBlurHandlerResponse,
    change: filter.onChangeHandlerResponse,
    focus: filter.onFocusHandlerResponse,
    keydown: filter.onKeyDownHandlerResponse,
    keyup: filter.onKeyUpHandlerResponse,
  };

  const handlerName = handlerNameMap[eventName]?.trim();
  if (!handlerName) return;

  const params = parseHandlerParams(paramsMap[eventName]);
  const responseTarget = responseMap[eventName]?.trim();
  const win = window as unknown as Record<string, unknown>;

  try {
    let result: unknown;
    const candidate = win[handlerName];
    if (typeof candidate === 'function') {
      result = (candidate as (...args: unknown[]) => unknown)(event, filter, value, params);
    } else {
      // Allow inline JS snippet as advanced fallback
      const fn = new Function('event', 'filter', 'value', 'params', handlerName) as (
        eventArg: unknown,
        filterArg: Filter,
        valueArg: unknown,
        paramsArg: unknown
      ) => unknown;
      result = fn(event, filter, value, params);
    }

    if (responseTarget) {
      win[responseTarget] = result;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : `Failed executing ${eventName} handler`;
    setDataError(message);
  }
};

  const clearAll = () => {
    setSelectedFilterIds([]);
    setFilterValues({});
    setFilterValidationErrors({});
    setQueryText('');
    setDataError(null);
    fetchAllData();
  };

  const applyFilters = async (
    queryOverride?: string,
    valuesOverride?: Record<string, unknown>,
    options?: { bypassValidation?: boolean }
  ) => {
  if (!options?.bypassValidation) {
    const requiredError = getRequiredFilterError(undefined, valuesOverride);
    if (requiredError) {
      setDataError(requiredError);
      return;
    }
    const validationError = getSelectedValidationError(undefined, valuesOverride);
    if (validationError) {
      setDataError(validationError);
      return;
    }
  }
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

  const getFilterOptions = (filter: Filter): DynamicOption[] => {
  const webapiType = (filter.webapiType || filter.webapitype || '').toLowerCase();

  if (webapiType === 'static') {
    const staticRaw = (filter.staticOptions || filter.staticoption || '').trim();
    if (staticRaw !== '') {
      return staticRaw
        .split(',')
        .map(opt => opt.trim())
        .filter(Boolean)
        .map(opt => ({ value: opt, label: opt }));
    }
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

    const parseStyleDeclarations = (styleString: string): React.CSSProperties => {
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

    const mergedStyle = {
      ...parseStyleDeclarations(filter.inlineStyle || ''),
      ...parseStyleDeclarations(filter.cssCode || ''),
    };

    const createEventHandlers = (filter: Filter) => {
      return {
        onClick: (e: React.MouseEvent) => executeFilterEvent(filter, 'click', e, filterValues[filter.id]),
        onBlur: (e: React.FocusEvent) => executeFilterEvent(filter, 'blur', e, filterValues[filter.id]),
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
          handleFilterChange(filter.id, e.target.value);
          executeFilterEvent(filter, 'change', e, e.target.value);
        },
        onFocus: (e: React.FocusEvent) => executeFilterEvent(filter, 'focus', e, filterValues[filter.id]),
        onKeyDown: (e: React.KeyboardEvent) => executeFilterEvent(filter, 'keydown', e, filterValues[filter.id]),
        onKeyUp: (e: React.KeyboardEvent) => executeFilterEvent(filter, 'keyup', e, filterValues[filter.id]),
      };
    };

    const commonProps = {
      className: `w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition ${filter.cssClass || ''}`,
      style: mergedStyle,
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
            required={!!filter.required}
            pattern={filter.pattern || undefined}
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
            required={!!filter.required}
            {...commonProps}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            required={!!filter.required}
            {...commonProps}
          />
        );
      case 'select':
        if (filter.multiSelect) {
          return (
            <div style={mergedStyle} className={filter.cssClass}>
              <MultiSelectCombobox
                options={options}
                value={Array.isArray(value) ? value : value ? [value] : []}
                onChange={selected => {
                  handleFilterChange(filter.id, selected);
                  executeFilterEvent(filter, 'change', { target: { value: selected } }, selected);
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
            <select value={value || ''} required={!!filter.required} {...commonProps}>
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
      {filters.length > 0 && (
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

        {/* Show query editor when selected filter enables query preview */}
{selectedFilters.some(isQueryPreviewEnabled) && (
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
                {filterValidationErrors[f.id] && (
                  <p className="text-xs text-red-600 mt-1">{filterValidationErrors[f.id]}</p>
                )}
                {f.description && (
                  <p className="text-xs text-gray-500 mt-1">{f.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}

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