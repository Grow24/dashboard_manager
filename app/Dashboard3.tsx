import React, {
  useState, useEffect, createContext, useContext, useRef, forwardRef, useImperativeHandle,
} from 'react';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { v4 as uuidv4 } from 'uuid';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

import { FiRefreshCw } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Typography,
  Grid,
  Paper,
  Chip,
  Menu,
} from '@mui/material';

import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardContent
} from "@/components/ui/card";

// Data and filter types
interface DataItem {
  id: number;
  name: string;
  salesAmount: number;
  salesQuantity: number;
  status: string;
  age: number;
  salary: number;
  country: string;
  state: string;
  createdAt: string;
}

interface Filter {
  id: string;
  key: string;
  type: 'text' | 'numberRange' | 'dropdown';
  value: unknown;
  scope: 'global' | 'individual';
  targetPane?: string;
}

interface FilterMeta {
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
}

interface DynamicOption {
  value: string;
  label: string;
}

interface DashboardContextType {
  data: DataItem[];
  filteredData: DataItem[];
  filters: Filter[];
  setFilters: React.Dispatch<React.SetStateAction<Filter[]>>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within DashboardProvider');
  return context;
};

// SummaryBox component
const SummaryBox: React.FC<{ title: string; value: number }> = ({ title, value }) => (
  <Paper elevation={3} sx={{ p: 2, textAlign: 'center', flex: 1, mx: 1 }}>
    <Typography variant="subtitle1" color="textSecondary">{title}</Typography>
    <Typography variant="h5" fontWeight="bold">{value}</Typography>
  </Paper>
);

// Pane component with cross-filtering and new drillableBar type
const Pane: React.FC<{ title: string; type: string }> = ({ title, type }) => {
  const { filteredData, filters, setFilters } = useDashboard();

  // Helper to toggle filters by key and value
  const toggleFilter = (key: string, value: any, type: Filter['type']) => {
    const existingFilter = filters.find((f) => f.key === key && JSON.stringify(f.value) === JSON.stringify(value));
    let newFilters;
    if (existingFilter) {
      newFilters = filters.filter((f) => f !== existingFilter);
    } else {
      newFilters = [...filters, {
        id: uuidv4(),
        key,
        type,
        value,
        scope: 'global',
      }];
    }
    setFilters(newFilters);
  };

  if (type === 'bar') {
    // Bar chart by country with sales count (count of entries)
    const countryCounts = filteredData.reduce<Record<string, number>>((acc, item) => {
      acc[item.country] = (acc[item.country] || 0) + 1;
      return acc;
    }, {});
    const chartData = Object.entries(countryCounts).map(([country, count]) => ({ country, count }));

    return (
      <Paper elevation={3} sx={{ p: 2, flex: 1, minWidth: 300, m: 1 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            onClick={(e) => {
              if (e && e.activeLabel) toggleFilter('country', e.activeLabel, 'dropdown');
            }}
          >
            <XAxis dataKey="country" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#1976d2" cursor="pointer" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    );
  }

  if (type === 'line') {
    // Line chart by age (count of people per age)
    const ageCounts = filteredData.reduce<Record<number, number>>((acc, item) => {
      acc[item.age] = (acc[item.age] || 0) + 1;
      return acc;
    }, {});
    const chartData = Object.entries(ageCounts).map(([age, count]) => ({ age: Number(age), count }));

    return (
      <Paper elevation={3} sx={{ p: 2, flex: 1, minWidth: 300, m: 1 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload[0]) {
                const age = e.activePayload[0].payload.age;
                toggleFilter('age', { min: age, max: age }, 'numberRange');
              }
            }}
          >
            <XAxis dataKey="age" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#388e3c" cursor="pointer" />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    );
  }

  if (type === 'pie') {
    // Pie chart by status (count of people per status)
    const statusCounts = filteredData.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    const chartData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    const COLORS = ['#1976d2', '#388e3c', '#fbc02d', '#d32f2f'];

    return (
      <Paper elevation={3} sx={{ p: 2, flex: 1, minWidth: 300, m: 1 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#1976d2"
              label
              onClick={(entry) => {
                if (entry && 'status' in entry) toggleFilter('status', entry.status, 'dropdown');
              }}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Paper>
    );
  }

  if (type === 'table') {
    return (
      <Paper elevation={3} sx={{ p: 2, flex: 1, minWidth: 300, m: 1, overflowX: 'auto' }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
          <Box component="thead" sx={{ bgcolor: 'grey.200' }}>
            <Box component="tr">
              <Box component="th" sx={{ border: 1, p: 1 }}>ID</Box>
              <Box component="th" sx={{ border: 1, p: 1 }}>Name</Box>
              <Box component="th" sx={{ border: 1, p: 1 }}>Sales Amount</Box>
              <Box component="th" sx={{ border: 1, p: 1 }}>Sales Quantity</Box>
              <Box component="th" sx={{ border: 1, p: 1 }}>Status</Box>
              <Box component="th" sx={{ border: 1, p: 1 }}>Age</Box>
              <Box component="th" sx={{ border: 1, p: 1 }}>Salary</Box>
              <Box component="th" sx={{ border: 1, p: 1 }}>Country</Box>
              <Box component="th" sx={{ border: 1, p: 1 }}>State</Box>
              <Box component="th" sx={{ border: 1, p: 1 }}>Created At</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {filteredData.map((item) => (
              <Box component="tr" key={item.id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.100' } }}>
                <Box component="td" sx={{ border: 1, p: 1 }}>{item.id}</Box>
                <Box component="td" sx={{ border: 1, p: 1 }}>{item.name}</Box>
                <Box component="td" sx={{ border: 1, p: 1 }}>{item.salesAmount}</Box>
                <Box component="td" sx={{ border: 1, p: 1 }}>{item.salesQuantity}</Box>
                <Box component="td" sx={{ border: 1, p: 1 }}>{item.status}</Box>
                <Box component="td" sx={{ border: 1, p: 1 }}>{item.age}</Box>
                <Box component="td" sx={{ border: 1, p: 1 }}>{item.salary}</Box>
                <Box component="td" sx={{ border: 1, p: 1 }}>{item.country}</Box>
                <Box component="td" sx={{ border: 1, p: 1 }}>{item.state}</Box>
                <Box component="td" sx={{ border: 1, p: 1 }}>{item.createdAt}</Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>
    );
  }

  if (type === 'drillableBar') {
    // Render the new drillable bar chart panel
    return (
      <Paper elevation={3} sx={{ p: 2, flex: 1, minWidth: 300, m: 1 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <DrillableBarPanel />
      </Paper>
    );
  }

  return null;
};

// DashboardProvider to hold data and filters
const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DataItem[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);

  // Fetch data from API with filters applied
  useEffect(() => {
    const params: Record<string, unknown> = {};
    filters.forEach((filter) => {
      if (filter.type === 'text' && filter.value) {
        params[filter.key] = filter.value;
      }
      if (filter.type === 'numberRange') {
        if (filter.value?.min !== undefined) params[`${filter.key}_min`] = filter.value.min;
        if (filter.value?.max !== undefined) params[`${filter.key}_max`] = filter.value.max;
      }
      if (filter.type === 'dropdown' && filter.value) {
        if (Array.isArray(filter.value)) {
          params[filter.key] = filter.value.join(',');
        } else {
          params[filter.key] = filter.value;
        }
      }
    });

    axios.get<DataItem[]>('https://intelligentsalesman.com/ism1/API/sales_data.php', { params })
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error('API fetch error:', err);
        setData([]); // Clear data or handle error as needed
      });
  }, [filters]);

  // Client-side filtering (optional, backend should handle filtering)
  const filteredData = React.useMemo(() => {
    if (filters.length === 0) return data;

    return data.filter((item) => filters.every((filter) => {
      const val = item[filter.key as keyof DataItem];

      if (filter.type === 'text') {
        return String(val).toLowerCase().includes(String(filter.value).toLowerCase());
      }

      if (filter.type === 'numberRange') {
        const min = filter.value?.min !== undefined ? Number(filter.value.min) : -Infinity;
        const max = filter.value?.max !== undefined ? Number(filter.value.max) : Infinity;
        const numVal = Number(val);
        return numVal >= min && numVal <= max;
      }

      if (filter.type === 'dropdown') {
        if (!filter.value) return true;
        if (Array.isArray(filter.value)) {
          return filter.value.includes(val);
        }
        return val === filter.value;
      }

      return true;
    }));
  }, [data, filters]);

  return (
    <DashboardContext.Provider value={{
      data, filteredData, filters, setFilters,
    }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

// --- MultiSelectCombobox Component ---
function MultiSelectCombobox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  loading = false,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  loading?: boolean;
}) {
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
}

// FilterModal with dynamic filters fetched from filtermaster and integrated dynamic filter UI
const FilterModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { filters, setFilters } = useDashboard();

  // Local state for filters metadata and values
  const [filterMeta, setFilterMeta] = useState<FilterMeta[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [dynamicOptions, setDynamicOptions] = useState<{ [key: string]: DynamicOption[] }>({});
  const [loadingOptions, setLoadingOptions] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Context menu state
  const [contextMenuAnchorEl, setContextMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [contextMenuFilterId, setContextMenuFilterId] = useState<string | null>(null);

  // Normalize filter data helper
  const normalizeFilter = (filter: Partial<FilterMeta>): FilterMeta => ({
    ...filter,
    options: Array.isArray(filter.options)
      ? filter.options
      : typeof filter.options === 'string' && filter.options
        ? filter.options.split(',').map((opt: string) => opt.trim()).filter(Boolean)
        : [],
    multiSelect: filter.multiSelect === true || filter.multiSelect === 1 || filter.multiSelect === "1",
    webapiType: filter.webapiType || 'dynamic',
    staticOptions: filter.staticOptions || ''
  });

  // Fetch filters metadata when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch('https://intelligentsalesman.com/ism1/API/getFilter.php')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const filtersArray = Array.isArray(data) ? data : (Array.isArray(data.filters) ? data.filters : []);
        const normalizedFilters = filtersArray.map(normalizeFilter);
        setFilterMeta(normalizedFilters);
        setError(null);

        // Initialize filterValues from applied filters to keep state on reopen
        const initialValues: Record<string, unknown> = {};
        normalizedFilters.forEach(f => {
          const appliedFilter = filters.find(
            (af) => af.key === (f.field?.toLowerCase() === 'age' ? 'age' : (f.field || f.name || f.id))
          );

          if (appliedFilter) {
            if (f.type === 'select' && f.multiSelect) {
              initialValues[f.id] = Array.isArray(appliedFilter.value) ? appliedFilter.value : [appliedFilter.value];
            } else if (f.type === 'number') {
              if (appliedFilter.value && typeof appliedFilter.value === 'object') {
                if (appliedFilter.value.min === appliedFilter.value.max) {
                  initialValues[f.id] = String(appliedFilter.value.min);
                } else {
                  initialValues[f.id] = '';
                }
              } else {
                initialValues[f.id] = '';
              }
            } else {
              initialValues[f.id] = appliedFilter.value;
            }
          } else {
            initialValues[f.id] = f.multiSelect ? [] : '';
          }
        });
        setFilterValues(initialValues);

        normalizedFilters.forEach(filter => {
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
        setFilterMeta([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, filters]);

  // Fetch dynamic options helper
  const fetchDynamicOptions = async (filterId: string, webapi: string) => {
    if (!webapi || webapi.trim() === '') return;
    setLoadingOptions(prev => ({ ...prev, [filterId]: true }));
    try {
      const response = await fetch(webapi);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
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
      }
      setDynamicOptions(prev => ({ ...prev, [filterId]: options }));
    } catch {
      setDynamicOptions(prev => ({ ...prev, [filterId]: [] }));
    } finally {
      setLoadingOptions(prev => ({ ...prev, [filterId]: false }));
    }
  };

  // Get options for a filter
  const getFilterOptions = (filter: FilterMeta): DynamicOption[] => {
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

  // Handle filter value change
  const handleFilterChange = (id: string, value: unknown) => {
    setFilterValues(prev => ({ ...prev, [id]: value }));
  };

  // Context menu handlers
  const handleContextMenu = (event: React.MouseEvent<HTMLElement>, filterId: string) => {
    event.preventDefault();
    setContextMenuAnchorEl(event.currentTarget);
    setContextMenuFilterId(filterId);
  };

  const handleCloseContextMenu = () => {
    setContextMenuAnchorEl(null);
    setContextMenuFilterId(null);
  };

  const handleEditFilter = () => {
    if (contextMenuFilterId) {
      window.location.href = `/GlobalFilter`;
    }
    handleCloseContextMenu();
  };

  // Render filter control with context menu wrapper
  const renderFilterControlWithContextMenu = (filter: FilterMeta) => (
    <Box
      onContextMenu={(e) => handleContextMenu(e, filter.id)}
      sx={{ cursor: 'context-menu' }}
    >
      {renderFilterControl(filter)}
    </Box>
  );

  // Render filter control
  const renderFilterControl = (filter: FilterMeta) => {
    const value = filterValues[filter.id] || (filter.multiSelect ? [] : '');
    const options = getFilterOptions(filter);
    const isLoading = loadingOptions[filter.id];

    switch (filter.type) {
      case 'text':
        return (
          <TextField
            size="small"
            fullWidth
            label={filter.name}
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            disabled={isLoading}
          />
        );
      case 'number':
        return (
          <TextField
            size="small"
            fullWidth
            type="number"
            label={filter.name}
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            disabled={isLoading}
          />
        );
      case 'select':
        if (filter.multiSelect) {
          return (
            <MultiSelectCombobox
              options={options}
              value={Array.isArray(value) ? value : value ? [value] : []}
              onChange={(selected) => handleFilterChange(filter.id, selected)}
              placeholder={`Select ${filter.name}`}
              loading={isLoading}
            />
          );
        }
        return (
          <Select
            fullWidth
            size="small"
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            disabled={isLoading}
          >
            <MenuItem value="">All {filter.name}</MenuItem>
            {options.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        );
      default:
        return (
          <TextField
            size="small"
            fullWidth
            label={filter.name}
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            disabled={isLoading}
          />
        );
    }
  };

  // Apply filters
  const applyFilters = () => {
    const allEmpty = filterMeta.every(f => {
      const val = filterValues[f.id];
      if (f.type === 'select' && f.multiSelect) {
        return !val || (Array.isArray(val) && val.length === 0);
      }
      return val === '' || val === null || val === undefined;
    });

    if (allEmpty) {
      setFilters([]);
      onClose();
      return;
    }

    const newFilters: Filter[] = filterMeta.map(f => {
      let filterValue = filterValues[f.id];

      if (f.type === 'select' && f.multiSelect) {
        if (!Array.isArray(filterValue)) {
          filterValue = filterValue ? [filterValue] : [];
        }
      }

      if (f.type === 'number') {
        if (typeof filterValue === 'string' && filterValue.trim() !== '') {
          const num = Number(filterValue);
          if (!isNaN(num)) {
            filterValue = { min: num, max: num };
          } else {
            filterValue = {};
          }
        } else if (typeof filterValue === 'number') {
          filterValue = { min: filterValue, max: filterValue };
        } else {
          filterValue = {};
        }
      }

      const key = f.field?.toLowerCase() === 'age' ? 'age' : (f.field || f.name || f.id);

      return {
        id: f.id,
        key,
        type: f.type === 'select' ? 'dropdown' : (f.type === 'number' ? 'numberRange' : 'text'),
        value: filterValue,
        scope: 'global',
      };
    });

    const filteredNewFilters = newFilters.filter(f => {
      if (f.type === 'dropdown') {
        if (Array.isArray(f.value)) return f.value.length > 0;
        return f.value !== '' && f.value !== null && f.value !== undefined;
      }
      if (f.type === 'numberRange') {
        return (f.value?.min !== undefined && f.value.min !== '') || (f.value?.max !== undefined && f.value.max !== '');
      }
      if (f.type === 'text') {
        return f.value !== '' && f.value !== null && f.value !== undefined;
      }
      return true;
    });

    setFilters(filteredNewFilters);
    onClose();
  };

  // Clear filters
  const clearFilters = () => {
    const clearedValues: Record<string, unknown> = {};
    filterMeta.forEach(f => {
      clearedValues[f.id] = f.multiSelect ? [] : '';
    });
    setFilterValues(clearedValues);
    setFilters([]);
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Open Filters</DialogTitle>
        <DialogContent dividers sx={{ minHeight: 500, maxHeight: '80vh', overflowY: 'auto' }}>
          {loading && <Typography>Loading filters...</Typography>}
          {error && <Typography color="error">{error}</Typography>}
          {!loading && !error && filterMeta.length === 0 && (
            <Typography>No filters available.</Typography>
          )}
          <Grid container spacing={2}>
            {filterMeta.map(filter => (
              <Grid item xs={12} sm={6} md={4} key={filter.id}>
                {renderFilterControlWithContextMenu(filter)}
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={clearFilters} color="secondary">Clear</Button>
          <Button onClick={applyFilters} variant="contained">Apply</Button>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Menu
        open={Boolean(contextMenuAnchorEl)}
        anchorEl={contextMenuAnchorEl}
        onClose={handleCloseContextMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem onClick={handleEditFilter}>Edit Filter</MenuItem>
      </Menu>
    </>
  );
};

// --- New Drillable Bar Chart Panel and Modal ---

// Static data for drillable bar chart panel
const originalData = [
  { name: 'Jan', users: 10 },
  { name: 'Feb', users: 20 },
  { name: 'Mar', users: 30 },
  { name: 'Apr', users: 40 },
  { name: 'May', users: 50 },
  { name: 'Jun', users: 60 },
  { name: 'Jul', users: 70 },
  { name: 'Aug', users: 80 },
  { name: 'Sep', users: 90 },
  { name: 'Oct', users: 100 },
];

const drillDataStatic = [
  { name: "Jan", uv: 4000 },
  { name: "Feb", uv: 3000 },
  { name: "Mar", uv: 2000 },
  { name: "Apr", uv: 2780 },
  { name: "May", uv: 1890 },
  { name: "Jun", uv: 2390 },
  { name: "Jul", uv: 3490 },
];

const productDataStatic = {
  Jan: [
    { product: "Product A", value: 2500 },
    { product: "Product B", value: 1500 },
  ],
  Feb: [
    { product: "Product A", value: 1800 },
    { product: "Product B", value: 1200 },
  ],
  Mar: [
    { product: "Product A", value: 1200 },
    { product: "Product B", value: 800 },
  ],
  Apr: [
    { product: "Product A", value: 1600 },
    { product: "Product B", value: 1180 },
  ],
  May: [
    { product: "Product A", value: 1000 },
    { product: "Product B", value: 890 },
  ],
  Jun: [
    { product: "Product A", value: 1400 },
    { product: "Product B", value: 990 },
  ],
  Jul: [
    { product: "Product A", value: 1400 },
    { product: "Product B", value: 1000 },
    { product: "Product C", value: 1090 },
  ],
};

const stateDataStatic = {
  Jan: [
    { state: "NY", value: 1500 },
    { state: "CA", value: 2500 },
  ],
  Feb: [
    { state: "NY", value: 1200 },
    { state: "CA", value: 1800 },
  ],
  Mar: [
    { state: "NY", value: 800 },
    { state: "CA", value: 1200 },
  ],
  Apr: [
    { state: "NY", value: 1180 },
    { state: "CA", value: 1600 },
  ],
  May: [
    { state: "NY", value: 890 },
    { state: "CA", value: 1000 },
  ],
  Jun: [
    { state: "NY", value: 990 },
    { state: "CA", value: 1400 },
  ],
  Jul: [
    { state: "NY", value: 1000 },
    { state: "CA", value: 1400 },
  ],
};

const productColors = {
  "Product A": "#6366F1",
  "Product B": "#F59E0B",
  "Product C": "#10B981",
};

const stateColors = {
  NY: "#EF4444",
  CA: "#3B82F6",
};

const mergeUsers = (drillData) => {
  return drillData.map(d => {
    const orig = originalData.find(o => o.name === d.name);
    return {
      ...d,
      users: orig ? orig.users : 0,
    };
  });
};

function filterDataForPanel({ data, panelFilters }) {
  return data.filter(item => {
    const users = item.users;
    const name = item.name;

    if (panelFilters.minUsers !== '' && users < Number(panelFilters.minUsers)) return false;
    if (panelFilters.maxUsers !== '' && users > Number(panelFilters.maxUsers)) return false;
    if (panelFilters.selectedMonths.length > 0 && !panelFilters.selectedMonths.includes(name)) return false;

    return true;
  });
}

const DrillableBarChart = ({
  drillData,
  productData,
  stateData,
  stackingMode,
  setStackingMode,
  drillAcross,
  setDrillAcross,
  contextMenu,
  setContextMenu,
  submenuVisible,
  setSubmenuVisible,
  setSelectedMonths,
  setOtherPanelsFilteredMonths
}) => {
  const chartContainerRef = useRef(null);

  const [productDrillAcross, setProductDrillAcross] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        contextMenu.show &&
        !e.target.closest(".context-menu") &&
        !e.target.closest(".submenu")
      ) {
        setContextMenu({ ...contextMenu, show: false });
        setSubmenuVisible({
          stackBar: false,
          drillAcross: false,
          stackBarProduct: false,
          stackBarState: false,
          drillAcrossProduct: false,
          drillAcrossState: false,
          productDrillAcross: false,
        });
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu, setContextMenu, setSubmenuVisible]);

  // Stack Bar handlers
  const handleStackBarByProductIndividual = () => {
    setStackingMode({ type: "product", scope: "individual", month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleStackBarByProductAll = () => {
    setStackingMode({ type: "product", scope: "all" });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleStackBarByStateIndividual = () => {
    setStackingMode({ type: "state", scope: "individual", month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleStackBarByStateAll = () => {
    setStackingMode({ type: "state", scope: "all" });
    setContextMenu({ ...contextMenu, show: false });
  };

  // Drill Across handlers
  const handleDrillAcrossByProductIndividual = () => {
    setDrillAcross({ type: "by-product", scope: "individual", month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleDrillAcrossByProductAll = () => {
    setDrillAcross({ type: "by-product", scope: "all" });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleDrillAcrossByStateIndividual = () => {
    setDrillAcross({ type: "by-state", scope: "individual", month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleDrillAcrossByStateAll = () => {
    setDrillAcross({ type: "by-state", scope: "all" });
    setContextMenu({ ...contextMenu, show: false });
  };

  // Product-wise Drill Across handlers
  const handleProductDrillAcrossByProductIndividual = () => {
    setProductDrillAcross({ type: 'by-product', scope: 'individual', month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleProductDrillAcrossByProductAll = () => {
    setProductDrillAcross({ type: 'by-product', scope: 'all' });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleProductDrillAcrossByStateIndividual = () => {
    setProductDrillAcross({ type: 'by-state', scope: 'individual', month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleProductDrillAcrossByStateAll = () => {
    setProductDrillAcross({ type: 'by-state', scope: 'all' });
    setContextMenu({ ...contextMenu, show: false });
  };

  const resetStackedView = () => {
    setStackingMode(null);
    setDrillAcross(null);
  };

  const resetProductDrillAcross = () => {
    setProductDrillAcross(null);
  };

  const getKeysAndColors = () => {
    if (stackingMode?.type === "state") {
      const allStates = new Set();
      Object.values(stateData).forEach((sList) =>
        sList.forEach((s) => allStates.add(s.state))
      );
      return {
        keys: Array.from(allStates),
        colors: stateColors,
      };
    }
    const allProducts = new Set();
    Object.values(productData).forEach((pList) =>
      pList.forEach((p) => allProducts.add(p.product))
    );
    return {
      keys: Array.from(allProducts),
      colors: productColors,
    };
  };

  const isMonthStacked = (month) => {
    if (!stackingMode) return false;
    if (stackingMode.scope === "all") return true;
    return stackingMode.scope === "individual" && stackingMode.month === month;
  };

  const chartData = drillData.map((d) => {
    const base = { name: d.name };
    const { keys } = getKeysAndColors();

    keys.forEach((key) => { base[key] = 0; });

    if (isMonthStacked(d.name)) {
      const sourceData = stackingMode?.type === "product" ? productData : stateData;
      const breakdown = sourceData[d.name] || [];
      breakdown.forEach((item) => {
        const key = stackingMode?.type === "product" ? item.product : item.state;
        base[key] = item.value;
      });
      base.uv = 0;
    } else {
      base.uv = d.uv;
    }

    return base;
  });

  const { keys, colors } = getKeysAndColors();

  const handleBarClick = (entry) => {
    setOtherPanelsFilteredMonths([entry.name]);
    setSelectedMonths(prev => {
      if (prev.includes(entry.name)) {
        setOtherPanelsFilteredMonths([]);
        return prev.filter(month => month !== entry.name);
      }
      setOtherPanelsFilteredMonths([entry.name]);
      return [entry.name];
    });
  };

  const handleCellContextMenu = (e, entry) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setContextMenu({
      show: true,
      x: e?.clientX || 0,
      y: e?.clientY || 0,
      data: entry
    });
    setSubmenuVisible({
      stackBar: false,
      drillAcross: false,
      stackBarProduct: false,
      stackBarState: false,
      drillAcrossProduct: false,
      drillAcrossState: false,
      productDrillAcross: false,
    });
  };

  const showReset = stackingMode !== null || drillAcross !== null || productDrillAcross !== null;

  const contextMenuNode = contextMenu.show
    ? ReactDOM.createPortal(
        <div
          className="context-menu fixed z-[9999] bg-white border shadow-md rounded w-56"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            userSelect: 'none',
          }}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Stack Bar */}
          <div
            className="relative group"
            onMouseEnter={() => setSubmenuVisible((s) => ({ ...s, stackBar: true }))}
            onMouseLeave={() =>
              setSubmenuVisible((s) => ({
                ...s,
                stackBar: false,
                stackBarProduct: false,
                stackBarState: false,
              }))
            }
          >
            <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
              <span>Stack Bar</span>
              <span className="ml-2">▶</span>
            </div>
            {submenuVisible.stackBar && (
              <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                {/* By Product */}
                <div
                  className="relative group"
                  onMouseEnter={() =>
                    setSubmenuVisible((s) => ({ ...s, stackBarProduct: true }))
                  }
                  onMouseLeave={() =>
                    setSubmenuVisible((s) => ({ ...s, stackBarProduct: false }))
                  }
                >
                  <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                    <span>By Product</span>
                    <span className="ml-2">▶</span>
                  </div>
                  {submenuVisible.stackBarProduct && (
                    <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleStackBarByProductIndividual}
                      >
                        Individual
                      </div>
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleStackBarByProductAll}
                      >
                        All
                      </div>
                    </div>
                  )}
                </div>
                {/* By State */}
                <div
                  className="relative group"
                  onMouseEnter={() =>
                    setSubmenuVisible((s) => ({ ...s, stackBarState: true }))
                  }
                  onMouseLeave={() =>
                    setSubmenuVisible((s) => ({ ...s, stackBarState: false }))
                  }
                >
                  <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                    <span>By State</span>
                    <span className="ml-2">▶</span>
                  </div>
                  {submenuVisible.stackBarState && (
                    <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleStackBarByStateIndividual}
                      >
                        Individual
                      </div>
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleStackBarByStateAll}
                      >
                        All
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Drill Across */}
          <div
            className="relative group"
            onMouseEnter={() => setSubmenuVisible((s) => ({ ...s, drillAcross: true }))}
            onMouseLeave={() =>
              setSubmenuVisible((s) => ({
                ...s,
                drillAcross: false,
                drillAcrossProduct: false,
                drillAcrossState: false,
              }))
            }
          >
            <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
              <span>Drill Across</span>
              <span className="ml-2">▶</span>
            </div>
            {submenuVisible.drillAcross && (
              <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                {/* By Product */}
                <div
                  className="relative group"
                  onMouseEnter={() =>
                    setSubmenuVisible((s) => ({ ...s, drillAcrossProduct: true }))
                  }
                  onMouseLeave={() =>
                    setSubmenuVisible((s) => ({ ...s, drillAcrossProduct: false }))
                  }
                >
                  <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                    <span>By Product</span>
                    <span className="ml-2">▶</span>
                  </div>
                  {submenuVisible.drillAcrossProduct && (
                    <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleDrillAcrossByProductIndividual}
                      >
                        Individual
                      </div>
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleDrillAcrossByProductAll}
                      >
                        All
                      </div>
                    </div>
                  )}
                </div>
                {/* By State */}
                <div
                  className="relative group"
                  onMouseEnter={() =>
                    setSubmenuVisible((s) => ({ ...s, drillAcrossState: true }))
                  }
                  onMouseLeave={() =>
                    setSubmenuVisible((s) => ({ ...s, drillAcrossState: false }))
                  }
                >
                  <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                    <span>By State</span>
                    <span className="ml-2">▶</span>
                  </div>
                  {submenuVisible.drillAcrossState && (
                    <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleDrillAcrossByStateIndividual}
                      >
                        Individual
                      </div>
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleDrillAcrossByStateAll}
                      >
                        All
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Drill Across (Product-wise) */}
          <div
            className="relative group"
            onMouseEnter={() => setSubmenuVisible((s) => ({ ...s, productDrillAcross: true }))}
            onMouseLeave={() => setSubmenuVisible((s) => ({ ...s, productDrillAcross: false }))}
          >
            <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
              <span>Drill Across (Product-wise)</span>
              <span className="ml-2">▶</span>
            </div>
            {submenuVisible.productDrillAcross && (
              <div className="submenu absolute top-0 left-full ml-1 w-48 bg-white border shadow-md rounded z-50">
                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={handleProductDrillAcrossByProductIndividual}
                >
                  By Product (Individual)
                </div>
                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={handleProductDrillAcrossByProductAll}
                >
                  By Product (All)
                </div>
                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={handleProductDrillAcrossByStateIndividual}
                >
                  By State (Individual)
                </div>
                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={handleProductDrillAcrossByStateAll}
                >
                  By State (All)
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={chartContainerRef} className="relative">
      {showReset && (
        <div className="mb-2 flex justify-end">
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              resetStackedView();
              resetProductDrillAcross();
            }}
            sx={{ textTransform: 'none', color: '#4f46e5', borderColor: '#c7d2fe', '&:hover': { backgroundColor: '#e0e7ff' } }}
          >
            Reset View
          </Button>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          barCategoryGap="20%"
          barGap={4}
          margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {stackingMode ? (
            keys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={colors[key]}
                onContextMenu={(e) => handleCellContextMenu(e, { name: key })}
              />
            ))
          ) : (
            <Bar
              dataKey="uv"
              maxBarSize={40}
              isAnimationActive={false}
            >
              {drillData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="#6366F1"
                  onClick={() => handleBarClick(entry)}
                  onContextMenu={(e) => handleCellContextMenu(e, entry)}
                  style={{ cursor: 'context-menu' }}
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>

      {contextMenuNode}
    </div>
  );
};

// Modal component for maximize popup with forwarded ref
const Modal = forwardRef(({ children, onClose }, ref) => {
  const modalRef = useRef(null);
  const headerRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: '90vw', height: '90vh' });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeDir, setResizeDir] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useImperativeHandle(ref, () => modalRef.current);

  const handleHeaderMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleResizeMouseDown = (dir) => (e) => {
    if (e.button !== 0) return;
    setResizeDir(dir);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: parseInt(size.width),
      height: parseInt(size.height)
    });
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else if (resizeDir) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = position.x;
      let newY = position.y;

      if (resizeDir.includes('e')) newWidth = Math.max(300, resizeStart.width + deltaX);
      if (resizeDir.includes('w')) {
        newWidth = Math.max(300, resizeStart.width - deltaX);
        newX = position.x + deltaX;
      }
      if (resizeDir.includes('s')) newHeight = Math.max(300, resizeStart.height + deltaY);
      if (resizeDir.includes('n')) {
        newHeight = Math.max(300, resizeStart.height - deltaY);
        newY = position.y + deltaY;
      }

      setSize({
        width: `${newWidth}px`,
        height: `${newHeight}px`
      });
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setResizeDir(null);
  };

  useEffect(() => {
    if (isDragging || resizeDir) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, resizeDir, dragStart, resizeStart]);

  const ResizeHandle = ({ direction }) => (
    <div
      className={`absolute bg-gray-400 opacity-0 hover:opacity-100 transition-opacity ${
        direction.includes('n') ? 'top-0 h-2 cursor-ns-resize' : 'bottom-0 h-2 cursor-ns-resize'
      } ${
        direction.includes('w') ? 'left-0 w-2 cursor-ew-resize' : 'right-0 w-2 cursor-ew-resize'
      } ${
        direction === 'nw' || direction === 'se' ? 'cursor-nwse-resize' : 
        direction === 'ne' || direction === 'sw' ? 'cursor-nesw-resize' : ''
      }`}
      onMouseDown={handleResizeMouseDown(direction)}
    />
  );

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg flex flex-col"
        style={{
          width: size.width,
          height: size.height,
          transform: `translate(${position.x}px, ${position.y}px)`,
          minWidth: '300px',
          minHeight: '300px'
        }}
      >
        <ResizeHandle direction="n" />
        <ResizeHandle direction="s" />
        <ResizeHandle direction="e" />
        <ResizeHandle direction="w" />
        <ResizeHandle direction="nw" />
        <ResizeHandle direction="ne" />
        <ResizeHandle direction="sw" />
        <ResizeHandle direction="se" />

        <div
          ref={headerRef}
          className="flex justify-end p-2 border-b cursor-move"
          onMouseDown={handleHeaderMouseDown}
        >
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-xl font-bold"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
});
Modal.displayName = 'Modal';

const DrillableBarPanel = () => {
  const [panel1MinUsers, setPanel1MinUsers] = useState('');
  const [panel1MaxUsers, setPanel1MaxUsers] = useState('');
  const [panel1SelectedMonths, setPanel1SelectedMonths] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [maximizedPanel, setMaximizedPanel] = useState(null);
  const modalContainerRef = useRef(null);

  const filteredDrillDataPanel1 = filterDataForPanel({
    data: mergeUsers(drillDataStatic),
    panelFilters: { minUsers: panel1MinUsers, maxUsers: panel1MaxUsers, selectedMonths: panel1SelectedMonths },
  });

  const handleMaximize = (panelKey) => {
    if (panelKey === 'panel1') {
      setMaximizedPanel('panel1');
    }
  };

  const closeMaximize = () => {
    setMaximizedPanel(null);
  };

  return (
    <>
      <Panel
        title="Monthly Sales Overview (Drillable)"
        panel1MinUsers={panel1MinUsers}
        setPanel1MinUsers={setPanel1MinUsers}
        panel1MaxUsers={panel1MaxUsers}
        setPanel1MaxUsers={setPanel1MaxUsers}
        panel1SelectedMonths={panel1SelectedMonths}
        setPanel1SelectedMonths={setPanel1SelectedMonths}
        filteredData={filteredDrillDataPanel1}
        menuOpen={menuOpen}
        setMenuOpenGlobal={setMenuOpen}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        onMaximize={handleMaximize}
      />

      {maximizedPanel === 'panel1' && (
        <Modal ref={modalContainerRef} onClose={closeMaximize}>
          <Panel
            title="Monthly Sales Overview (Drillable) - Maximized"
            panel1MinUsers={panel1MinUsers}
            setPanel1MinUsers={setPanel1MinUsers}
            panel1MaxUsers={panel1MaxUsers}
            setPanel1MaxUsers={setPanel1MaxUsers}
            panel1SelectedMonths={panel1SelectedMonths}
            setPanel1SelectedMonths={setPanel1SelectedMonths}
            filteredData={filteredDrillDataPanel1}
            menuOpen={false}
            setMenuOpenGlobal={() => {}}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            onMaximize={() => {}}
          />
        </Modal>
      )}
    </>
  );
};

const Panel = ({
  title,
  panel1MinUsers,
  setPanel1MinUsers,
  panel1MaxUsers,
  setPanel1MaxUsers,
  panel1SelectedMonths,
  setPanel1SelectedMonths,
  filteredData,
  menuOpen,
  setMenuOpenGlobal,
  showFilters,
  setShowFilters,
  onMaximize,
}) => {
  const [stackingMode, setStackingMode] = useState(null);
  const [drillAcross, setDrillAcross] = useState(null);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, data: null });
  const [submenuVisible, setSubmenuVisible] = useState({
    stackBar: false,
    drillAcross: false,
    stackBarProduct: false,
    stackBarState: false,
    drillAcrossProduct: false,
    drillAcrossState: false,
    productDrillAcross: false,
  });
  const [_selectedMonths, setSelectedMonthsLocal] = useState([]);

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpenGlobal(null);
    } else {
      setMenuOpenGlobal('panel1');
    }
  };

  // Sync selectedMonths with parent
  useEffect(() => {
    setSelectedMonthsLocal(panel1SelectedMonths);
  }, [panel1SelectedMonths]);

  const setSelectedMonthsWrapper = (months) => {
    setSelectedMonthsLocal(months);
    setPanel1SelectedMonths(months);
  };

  return (
    <div className="h-full w-full overflow-y-auto panel-content flex flex-col" style={{ height: '400px', border: '2px solid red', backgroundColor: '#f0f0f0' }}>
      <Card className="relative h-full flex flex-col">
        <CardHeader className="flex justify-between items-center mb-2 panel-header cursor-move">
          <h2 className="font-medium text-sm mt-0 mb-1">{title}</h2>
          <div className="relative">
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                setPanel1MinUsers('');
                setPanel1MaxUsers('');
              }}
              sx={{ mr: 2 }}
              title="Reset Filters"
            >
              <FiRefreshCw className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={toggleMenu}
              sx={{ color: 'text.secondary' }}
              aria-label="Open panel menu"
            >
              &#8942;
            </Button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-50 py-1"
                >
                  <Button variant="ghost" className="w-full justify-start text-sm">Edit</Button>
                  <Button variant="ghost" className="w-full justify-start text-sm">Delete</Button>
                  <Button variant="ghost" className="w-full justify-start text-sm">Details</Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={() => {
                      setMenuOpenGlobal(null);
                      if (onMaximize) {
                        onMaximize('panel1');
                      }
                    }}
                  >
                    Maximize
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => {
                    setShowFilters(!showFilters);
                    setMenuOpenGlobal(null);
                  }}>
                    {showFilters ? 'Hide Filter' : 'Show Filter'}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardHeader>

        {showFilters && (
          <div className="px-4 pb-2">
            <div className="flex space-x-4 items-center">
              <div className="flex flex-col w-32">
                <Label>Min Users</Label>
                <Input
                  type="number"
                  value={panel1MinUsers}
                  onChange={(e) => setPanel1MinUsers(e.target.value)}
                />
              </div>
              <div className="flex flex-col w-32">
                <Label>Max Users</Label>
                <Input
                  type="number"
                  value={panel1MaxUsers}
                  onChange={(e) => setPanel1MaxUsers(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <CardContent className="flex-1 flex flex-col min-h-0 relative">
          <DrillableBarChart
            drillData={filteredData}
            productData={productDataStatic}
            stateData={stateDataStatic}
            stackingMode={stackingMode}
            setStackingMode={setStackingMode}
            drillAcross={drillAcross}
            setDrillAcross={setDrillAcross}
            contextMenu={contextMenu}
            setContextMenu={setContextMenu}
            submenuVisible={submenuVisible}
            setSubmenuVisible={setSubmenuVisible}
            setSelectedMonths={setSelectedMonthsWrapper}
            setOtherPanelsFilteredMonths={() => {}}
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Main Dashboard component
const Dashboard: React.FC = () => {
  const { filteredData, filters, setFilters } = useDashboard();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Calculate summary values
  const totalCount = filteredData.length;
  const totalSalesAmount = filteredData.reduce((sum, item) => sum + Number(item.salesAmount), 0);
  const totalSalesQuantity = filteredData.reduce((sum, item) => sum + Number(item.salesQuantity), 0);

  const removeFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      <Button variant="contained" onClick={() => setIsFilterOpen(true)} sx={{ mb: 2 }}>
        Open Filters
      </Button>

      <Box sx={{ display: 'flex', mb: 3 }}>
        <SummaryBox title="Total Count" value={totalCount} />
        <SummaryBox title="Total Sales Amount" value={totalSalesAmount} />
        <SummaryBox title="Total Sales Quantity" value={totalSalesQuantity} />
        <SummaryBox title="Summary 4" value={456} />
      </Box>

      {filters.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Active Filters:</Typography>
          {filters.map((filter) => (
            <Chip
              key={filter.id}
              label={`${filter.key} ${filter.type === 'numberRange' ? `[${filter.value.min ?? ''} - ${filter.value.max ?? ''}]` : filter.value}`}
              onDelete={() => removeFilter(filter.id)}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Box>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><Pane title="Country Bar Chart" type="bar" /></Grid>
        <Grid item xs={12} md={6}><Pane title="Age Line Chart" type="line" /></Grid>
        <Grid item xs={12} md={6}><Pane title="Status Pie Chart" type="pie" /></Grid>
        <Grid item xs={12} md={6}><Pane title="Data Table" type="table" /></Grid>
        <Grid item xs={12} md={12}><Pane title="Monthly Sales Overview (Drillable)" type="drillableBar" /></Grid>
      </Grid>

      <FilterModal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
    </Box>
  );
};

export default function DashboardWrapper() {
  return (
    <DashboardProvider>
      <Dashboard />
    </DashboardProvider>
  );
}