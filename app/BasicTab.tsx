import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
// import debounce from 'lodash.debounce'; // Unused
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import {
  Accordion, AccordionSummary, AccordionDetails, Chip, Radio, RadioGroup, FormControlLabel, Box,
} from '@mui/material';
import { AddCircleOutline, RemoveCircleOutline, ExpandMore } from '@mui/icons-material';

// Also import icons you use:
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import type { FilterRecord } from './filter-manager/types';
import {
  sqlStatements,
  operators,
  logicalOperators,
  aggregateFunctions,
  windowFunctions,
  orderingStrategies,
} from './filter-manager/queryBuilder.constants';
import SharedQueryBuilder, { QueryBuilderData } from './filter-manager/SharedQueryBuilder';
import {
  BasicTabBasicSection,
  BasicTabStylingSection,
  BasicTabEventsSection,
  BasicTabValidationSection,
  BasicTabOptionsSection,
  BasicTabQueryBuilderSection,
} from './filter-manager/sections/BasicTabSections';
// --- QB Hydration helpers ---
const useQbHydration = () => {
  const [qbHydrated, setQbHydrated] = React.useState(false);
  return { qbHydrated, setQbHydrated };
};

const safeParseQB = (qb: unknown) => {
  if (!qb) return null;
  if (typeof qb !== 'string') return qb;
  try {
    return JSON.parse(qb);
  } catch {
    return null;
  }
};
type Filter = FilterRecord;

interface ValidationErrors {
  name?: string;
  type?: string;
  field?: string;
  defaultValue?: string;
  position?: string;
  advancedConfig?: string;
  webapi?: string;
  webapiType?: string;
  staticOptions?: string;
  inlineStyle?: string;
  pattern?: string;
}

// New props for parent mode
interface BasicTabProps {
  filter: Partial<Filter> | null;
  isEditing?: boolean;
  editingFilter?: Filter | null;
  newFilter?: Partial<Filter>;
  setNewFilter?: React.Dispatch<React.SetStateAction<Partial<Filter>>>;
  resetNewFilter?: () => void;
  fetchFilters?: () => void;
  parentMode?: 'modal' | 'inline';
  onSave?: (filterData: Partial<Filter>, isEditing?: boolean) => Promise<boolean> | boolean;
  onCancel?: () => void;
  setEditingFilter?: React.Dispatch<React.SetStateAction<Filter | null>>;
}

// --- Theme Context and Provider ---

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider
 * - Reads initial theme from localStorage (key: 'theme') or system preference.
 * - Persists changes to localStorage.
 * - Adds/removes 'dark' class on document.documentElement so Tailwind's `dark:` variants work globally.
 * - Also wraps children (scoped) so components relying on context can read theme.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialTheme = (): Theme => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') return stored;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {
      // ignore
    }
    return 'light';
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore localStorage errors
    }
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {/* min-h-0 lets flex parents pass a bounded height so nested scroll regions work */}
      <div className={`min-h-0 w-full ${theme === 'dark' ? 'dark' : ''}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

/**
 * useTheme hook
 * - Returns ThemeContext if available.
 * - If provider is missing, falls back to reading document.documentElement.classList and provides a toggle
 *   that manipulates the root and localStorage (safe fallback).
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context) return context;

  // Fallback: don't throw, provide a basic implementation that toggles the root class
  const getCurrent = (): Theme => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) return 'dark';
    return 'light';
  };

  const toggleTheme = () => {
    if (typeof document !== 'undefined') {
      const isDark = document.documentElement.classList.toggle('dark');
      try {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
    }
  };

  return { theme: getCurrent(), toggleTheme };
};

// --- Query Builder Inner Components and Types ---

// --- Nested Query Types ---

interface NestedQuery {
  function: string;
  table: string;
  column: string;
  filters: WhereCondition[];
  nestedQuery?: NestedQuery;
}

interface WhereCondition {
  id: number;
  field: string;
  operator: string;
  value: string;
  logicalOperator: string;
  conditionGroup: number;
  valueType?: 'constant' | 'nested';
  nestedQuery?: NestedQuery;
}

interface WindowFunctionConfig {
  id: number;
  functionName: string;
  alias: string;
  column: string;
  nValue: number;
  offsetValue: number;
  defaultValue: string;
  partitionBy: string;
  orderBy: string;
  orderingStrategy: string;
  frameClause: string;
}

type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER' | 'CROSS' | 'SELF';

interface JoinConfig {
  joinType: JoinType;
  primaryTable: string;
  primaryAlias: string;
  primaryColumn: string;
  secondaryTable: string;
  secondaryAlias: string;
  secondaryColumn: string;
  joinCondition: string; // editable override
  outputColumns: { tableAlias: string; column: string; selected: boolean }[];
}

// NestedQueryBuilder component (as provided, integrated here)
const NestedQueryBuilder = ({
  nestedQuery,
  onChange,
  level,
  tableOptions,
  fieldOptionsMap,
  fetchFieldsForTable
}: {
  nestedQuery: NestedQuery;
  onChange: (q: NestedQuery) => void;
  level: number;
  tableOptions: string[];
  fieldOptionsMap: { [table: string]: { label: string; value: string }[] };
  fetchFieldsForTable: (table: string) => void;
}) => {
  const fieldOptions = fieldOptionsMap[nestedQuery.table] || [];

  useEffect(() => {
    if (nestedQuery.table && !fieldOptions.length) {
      fetchFieldsForTable(nestedQuery.table);
    }
    // eslint-disable-next-line
  }, [nestedQuery.table]);

  const addFilter = () => {
    onChange({
      ...nestedQuery,
      filters: [
        ...nestedQuery.filters,
        {
          id: Date.now(),
          field: fieldOptions.length ? fieldOptions[0].value : '',
          operator: '=',
          value: '',
          logicalOperator: 'AND',
          conditionGroup: 1,
          valueType: 'constant'
        }
      ]
    });
  };

  const removeFilter = (id: number) => {
    onChange({
      ...nestedQuery,
      filters: nestedQuery.filters.filter(f => f.id !== id)
    });
  };

  const updateFilter = (id: number, key: keyof WhereCondition, value: unknown) => {
    onChange({
      ...nestedQuery,
      filters: nestedQuery.filters.map(f => f.id === id ? { ...f, [key]: value } : f)
    });
  };

  const handleNestedQueryChange = (q: NestedQuery) => {
    onChange({ ...nestedQuery, nestedQuery: q });
  };

  return (
    <Box sx={{ borderLeft: '3px solid #1976d2', pl: 2, mt: 2, mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Level {level} Nested Query</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Function</InputLabel>
          <Select
            value={nestedQuery.function}
            label="Function"
            onChange={e => onChange({ ...nestedQuery, function: e.target.value })}
          >
            {aggregateFunctions.map(fn => (
              <MenuItem key={fn} value={fn}>{fn}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Table</InputLabel>
          <Select
            value={nestedQuery.table}
            label="Table"
            onChange={e => onChange({ ...nestedQuery, table: e.target.value, column: '', filters: [] })}
          >
            {tableOptions.map(t => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Column</InputLabel>
          <Select
            value={nestedQuery.column}
            label="Column"
            onChange={e => onChange({ ...nestedQuery, column: e.target.value })}
            disabled={!nestedQuery.table}
          >
            {fieldOptions.map(f => (
              <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Typography variant="body2" sx={{ mb: 1 }}>Filters (optional):</Typography>
      {nestedQuery.filters.map(f => (
        <Box key={f.id} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Field</InputLabel>
            <Select
              value={f.field}
              label="Field"
              onChange={e => updateFilter(f.id, 'field', e.target.value)}
              disabled={!nestedQuery.table}
            >
              {fieldOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 80 }}>
            <InputLabel>Operator</InputLabel>
            <Select
              value={f.operator}
              label="Operator"
              onChange={e => updateFilter(f.id, 'operator', e.target.value)}
            >
              {operators.map(op => (
                <MenuItem key={op} value={op}>{op}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Value"
            value={f.value}
            onChange={e => updateFilter(f.id, 'value', e.target.value)}
            sx={{ minWidth: 100 }}
          />
          <FormControl sx={{ minWidth: 80 }}>
            <InputLabel>Logical Op</InputLabel>
            <Select
              value={f.logicalOperator}
              label="Logical Operator"
              onChange={e => updateFilter(f.id, 'logicalOperator', e.target.value)}
            >
              {logicalOperators.map(op => (
                <MenuItem key={op} value={op}>{op}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton color="error" onClick={() => removeFilter(f.id)}>
            <RemoveCircleOutlineIcon />
          </IconButton>
        </Box>
      ))}
      <Button startIcon={<AddCircleOutlineIcon />} onClick={addFilter} sx={{ mb: 2 }}>
        Add Filter
      </Button>
      {/* Nested Query Level 2/3 */}
      {level < 3 && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onChange({ ...nestedQuery, nestedQuery: nestedQuery.nestedQuery || {
              function: 'MAX',
              table: '',
              column: '',
              filters: []
            } })}
          >
            {nestedQuery.nestedQuery ? 'Edit Nested Query (Level ' + (level + 1) + ')' : 'Add Nested Query (Level ' + (level + 1) + ')'}
          </Button>
          {nestedQuery.nestedQuery && (
            <NestedQueryBuilder
              nestedQuery={nestedQuery.nestedQuery}
              onChange={handleNestedQueryChange}
              level={level + 1}
              tableOptions={tableOptions}
              fieldOptionsMap={fieldOptionsMap}
              fetchFieldsForTable={fetchFieldsForTable}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

// --- Main BasicTab Component ---

const BasicTab: React.FC<BasicTabProps> = ({
  filter: propFilter,
  isEditing,
  editingFilter,
  newFilter,
  setNewFilter,
  resetNewFilter,
  fetchFilters,
  parentMode = 'inline',
  onSave,
  onCancel,
  setEditingFilter
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'styling' | 'events' | 'validation' | 'options' | 'queryBuilder'>('basic');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_localFilter, setLocalFilter] = React.useState<Partial<Filter>>({});
  const { theme, toggleTheme } = useTheme();
const { setQbHydrated } = useQbHydration();

  /** Isolated light theme for MUI Query Builder (avoids broken contrast inside Tailwind/dark modal). */
  const queryBuilderMuiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'light',
          background: { paper: '#ffffff', default: '#f9fafb' },
          text: { primary: '#111827', secondary: '#4b5563' },
          divider: '#e5e7eb',
        },
        shape: { borderRadius: 8 },
        zIndex: { modal: 3000, snackbar: 3000, tooltip: 3100 },
        components: {
          MuiAccordion: {
            styleOverrides: {
              root: {
                width: '100%',
                '&:before': { display: 'none' },
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: { root: { backgroundColor: '#ffffff' } },
          },
        },
      }),
    []
  );

  const filter = React.useMemo(
  () => (isEditing ? editingFilter ?? {} : propFilter ?? newFilter ?? {}),
  [isEditing, editingFilter, propFilter, newFilter]
);

  // --- States for Query Builder tab (replacing old queryBuilder tab content) ---

  // Basic states
  const [name, setName] = useState(filter.name || '');
  const [statement, setStatement] = useState(sqlStatements[0]);
  const [columns, setColumns] = useState('*');
  const [tableName, setTableName] = useState('');
  const [whereConditions, setWhereConditions] = useState<WhereCondition[]>([
    { id: 1, field: '', operator: '=', value: '', logicalOperator: 'AND', conditionGroup: 1, valueType: 'constant' }
  ]);
  const [cssCodeError, setCssCodeError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState('');
  const [having, setHaving] = useState('');
  const [orderBy, setOrderBy] = useState('');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Window functions state
  const [windowFunctionConfigs, setWindowFunctionConfigs] = useState<WindowFunctionConfig[]>([]);

  // Join config state
  const [joinConfig, setJoinConfig] = useState<JoinConfig>({
    joinType: 'INNER',
    primaryTable: '',
    primaryAlias: 'c',
    primaryColumn: '',
    secondaryTable: '',
    secondaryAlias: 'o',
    secondaryColumn: '',
    joinCondition: '',
    outputColumns: []
  });

  const currentQueryBuilderData: QueryBuilderData = {
    name,
    statement,
    columns,
    tableName,
    whereConditions,
    groupBy,
    having,
    orderBy,
    limit,
    windowFunctionConfigs,
    joinConfig,
    queryPreview: '',
  };

  const handleSharedQueryChange = useCallback((qb: QueryBuilderData) => {
    setStatement(qb.statement);
    setColumns(qb.columns);
    setTableName(qb.tableName);
    setWhereConditions(qb.whereConditions);
    setGroupBy(qb.groupBy);
    setHaving(qb.having);
    setOrderBy(qb.orderBy);
    setLimit(qb.limit);
    setWindowFunctionConfigs(qb.windowFunctionConfigs);
    setJoinConfig(qb.joinConfig);
  }, []);

  // For table names dropdown
  const [tableOptions, setTableOptions] = useState<string[]>([]);
  const [tableLoading, setTableLoading] = useState(false);

  // For fields of selected table
  const [fieldOptions, setFieldOptions] = useState<{ label: string; value: string }[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  // For all tables' fields (for nested queries and join output columns)
  const [fieldOptionsMap, setFieldOptionsMap] = useState<{ [table: string]: { label: string; value: string }[] }>({});

  // Track current input value for highlighting
  const [_tableInputValue, setTableInputValue] = useState('');

  // Debounced function for table search
  const debouncedFetchTables = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (search: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          setTableLoading(true);
          try {
            const res = await fetch(`https://intelligentsalesman.com/ism1/API/gettableinfo.php/api/tables?search=${encodeURIComponent(search)}`);
            if (!res.ok) throw new Error('Failed to fetch tables');
            const data: string[] = await res.json();
            setTableOptions(data);
          } catch (err) {
            console.error(err);
            setTableOptions([]);
          } finally {
            setTableLoading(false);
          }
        }, 300);
      };
    })(),
    []
  );
useEffect(() => {
  const incoming = isEditing ? editingFilter ?? {} : propFilter ?? newFilter ?? {};
  setLocalFilter(incoming);
}, [isEditing, editingFilter, propFilter, newFilter]);
  // Fetch fields for a table (for nested queries and join output columns)
  const fetchFieldsForTable = useCallback(async (table: string) => {
    if (!table || fieldOptionsMap[table]) return;
    try {
      const res = await fetch(`https://intelligentsalesman.com/ism1/API/gettableinfo.php/api/columns?table=${encodeURIComponent(table)}`);
      if (!res.ok) throw new Error('Failed to fetch columns');
      const data: string[] = await res.json();
      setFieldOptionsMap(prev => ({ ...prev, [table]: data.map(col => ({ label: col, value: col })) }));
    } catch {
      setFieldOptionsMap(prev => ({ ...prev, [table]: [] }));
    }
  }, [fieldOptionsMap]);

  /** Columns for WHERE / window-function pickers: in join mode use alias.column for both tables. */
  const queryBuilderColumnOptions = useMemo(() => {
    if (joinConfig.primaryTable && joinConfig.secondaryTable) {
      const pa = joinConfig.primaryAlias || joinConfig.primaryTable;
      const sa = joinConfig.secondaryAlias || joinConfig.secondaryTable;
      const pcols = fieldOptionsMap[joinConfig.primaryTable] || [];
      const scols = fieldOptionsMap[joinConfig.secondaryTable] || [];
      return [
        ...pcols.map(c => ({ label: `${pa}.${c.label} (primary)`, value: `${pa}.${c.value}` })),
        ...scols.map(c => ({ label: `${sa}.${c.label} (secondary)`, value: `${sa}.${c.value}` })),
      ];
    }
    return fieldOptions;
  }, [
    joinConfig.primaryTable,
    joinConfig.secondaryTable,
    joinConfig.primaryAlias,
    joinConfig.secondaryAlias,
    fieldOptions,
    fieldOptionsMap,
  ]);

  /** Qualify bare column names for WHERE / window SQL (table.column or join alias.column). */
  const qualifyColumnRef = useCallback(
    (raw: string) => {
      const col = raw?.trim();
      if (!col) return col;
      if (col === '*') return col;

      const jc = joinConfig;
      const hasJoin = !!(jc.primaryTable && jc.secondaryTable);

      if (hasJoin) {
        if (col.includes('.')) return col;
        const pa = jc.primaryAlias || jc.primaryTable;
        const sa = jc.secondaryAlias || jc.secondaryTable;
        const pcols = new Set((fieldOptionsMap[jc.primaryTable] || []).map(c => c.value));
        const scols = new Set((fieldOptionsMap[jc.secondaryTable] || []).map(c => c.value));
        const inP = pcols.has(col);
        const inS = scols.has(col);
        if (inP && !inS) return `${pa}.${col}`;
        if (inS && !inP) return `${sa}.${col}`;
        if (inP && inS) return `${pa}.${col}`;
        return `${pa}.${col}`;
      }

      if (col.includes('.')) {
        const base = col.slice(col.lastIndexOf('.') + 1);
        if (tableName.trim()) return `${tableName}.${base}`;
        return col;
      }
      if (tableName.trim()) return `${tableName}.${col}`;
      return col;
    },
    [joinConfig, fieldOptionsMap, tableName]
  );

  const qualifySqlList = useCallback(
    (expr: string) => {
      if (!expr?.trim()) return expr;
      return expr
        .split(',')
        .map(part => {
          const p = part.trim();
          if (!p) return p;
          const dirMatch = p.match(/^(.+?)(\s+(ASC|DESC))$/i);
          if (dirMatch) {
            return `${qualifyColumnRef(dirMatch[1].trim())}${dirMatch[2]}`;
          }
          return qualifyColumnRef(p);
        })
        .join(', ');
    },
    [qualifyColumnRef]
  );

  // ✅ Hydrate QueryBuilder tab fields when editing an existing filter
// ✅ Hydrate QueryBuilder tab fields when editing an existing filter
useEffect(() => {
  if (!isEditing || !editingFilter) return;

  const f = editingFilter;
  const qbRaw = (f as Filter & { queryBuilder?: unknown })?.queryBuilder;
  const qb = safeParseQB(qbRaw);
  if (!qb) {
    setQbHydrated(false);
    return;
  }

  setName(qb.name ?? f.name ?? '');
  setStatement(qb.statement ?? 'SELECT');
  setColumns(qb.columns ?? '*');
  setTableName(qb.tableName ?? '');
  setWhereConditions(
    Array.isArray(qb.whereConditions) && qb.whereConditions.length
      ? qb.whereConditions
      : [
          {
            id: 1,
            field: '',
            operator: '=',
            value: '',
            logicalOperator: 'AND',
            conditionGroup: 1,
            valueType: 'constant',
          },
        ]
  );
  setGroupBy(qb.groupBy ?? '');
  setHaving(qb.having ?? '');
  setOrderBy(qb.orderBy ?? '');
  setLimit(qb.limit ?? '');
  setWindowFunctionConfigs(Array.isArray(qb.windowFunctionConfigs) ? qb.windowFunctionConfigs : []);
  setJoinConfig(
    qb.joinConfig ?? {
      joinType: 'INNER',
      primaryTable: '',
      primaryAlias: 'c',
      primaryColumn: '',
      secondaryTable: '',
      secondaryAlias: 'o',
      secondaryColumn: '',
      joinCondition: '',
      outputColumns: [],
    }
  );

  // Mark hydrated immediately so the "tab → queryBuilder" reset effect cannot wipe state while column fetch is still in flight.
  setQbHydrated(true);

  // Prefetch fields for table and join tables (async; does not gate hydration)
  (async () => {
    try {
      if (qb.tableName) {
        const res = await fetch(
          `https://intelligentsalesman.com/ism1/API/gettableinfo.php/api/columns?table=${encodeURIComponent(qb.tableName)}`
        );
        if (res.ok) {
          const data: string[] = await res.json();
          const options = data.map(col => ({ label: col, value: col }));
          setFieldOptions(options);
          setFieldOptionsMap(prev => ({ ...prev, [qb.tableName]: options }));
        }
      }
      if (qb.joinConfig?.primaryTable) await fetchFieldsForTable(qb.joinConfig.primaryTable);
      if (qb.joinConfig?.secondaryTable) await fetchFieldsForTable(qb.joinConfig.secondaryTable);
    } catch {
      /* column fetch is best-effort */
    }
  })();
}, [isEditing, editingFilter?.id]);

  // Reset form when tab changes to queryBuilder (create flow only — never clobber loaded edit data)
useEffect(() => {
  if (activeTab !== 'queryBuilder') return;

  if (isEditing) return;

  // Create mode defaults
  setName(filter.name || '');
  setStatement(sqlStatements[0]);
  setColumns('*');
  setTableName('');
  setWhereConditions([
    {
      id: 1,
      field: '',
      operator: '=',
      value: '',
      logicalOperator: 'AND',
      conditionGroup: 1,
      valueType: 'constant',
    },
  ]);
  setGroupBy('');
  setHaving('');
  setOrderBy('');
  setLimit('');
  setError(null);
  setTableOptions([]);
  setFieldOptions([]);
  setTableInputValue('');
  setWindowFunctionConfigs([]);
  setFieldOptionsMap({});
  setJoinConfig({
    joinType: 'INNER',
    primaryTable: '',
    primaryAlias: 'c',
    primaryColumn: '',
    secondaryTable: '',
    secondaryAlias: 'o',
    secondaryColumn: '',
    joinCondition: '',
    outputColumns: [],
  });
}, [activeTab, isEditing, filter?.name]);

  // When user types in table name input
  const handleTableInputChange = (_event: unknown, value: string, reason: string) => {
    if (reason === 'input') {
      setTableInputValue(value);
      debouncedFetchTables(value);
    }
  };

  function _handleFilterClick(_event: React.MouseEvent) {
  console.log('Filter clicked', _event);
}

function _handleFilterChange(_event: React.ChangeEvent) {
  console.log('Filter changed', (_event.target as HTMLInputElement).value);
}
function validateCssCode(css: string): string | null {
  if (!css || css.trim() === '') return null;
  // check balanced braces
  const open = (css.match(/{/g) || []).length;
  const close = (css.match(/}/g) || []).length;
  if (open !== close) {
    return `Mismatched braces: ${open} '{' vs ${close} '}'`;
  }
  // basic per-line check for "property: value;" inside braces
  const lines = css.split('\n');
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.endsWith('{')) {
      inBlock = true;
      continue;
    }
    if (line === '}') {
      inBlock = false;
      continue;
    }
    if (inBlock) {
      // allow comments and var declarations
      if (line.startsWith('/*') || line.startsWith('//')) continue;
      // property lines should contain ':' (colon)
      if (!line.includes(':')) {
        return `Syntax error near line ${i + 1}: missing ':' in declaration`;
      }
      // optional: check for semicolon at end
      // if (!line.trim().endsWith(';')) return `Missing semicolon near line ${i + 1}`;
    } else {
      // outside block, allow selectors or closing braces
      continue;
    }
  }
  return null;
}

  // When table is selected, fetch fields for that table
  // When table is selected, fetch fields for that table
useEffect(() => {
  if (!tableName) {
      setFieldOptions([]);
      setWhereConditions(conds =>
        conds.map(cond => ({ ...cond, field: '' }))
      );
      return;
    }

  const fetchFields = async () => {
    setFieldsLoading(true);
    try {
      const res = await fetch(
        `https://intelligentsalesman.com/ism1/API/gettableinfo.php/api/columns?table=${encodeURIComponent(tableName)}`
      );
      if (!res.ok) throw new Error('Failed to fetch columns');
      const data: string[] = await res.json();
      const options = data.map(col => ({ label: col, value: col }));
      setFieldOptions(options);
      setFieldOptionsMap(prev => ({ ...prev, [tableName]: options }));

      // Normalize only invalid fields (don’t overwrite valid user selections).
      // Keep alias-qualified fields (join / saved queries) even if not in this table’s bare column list.
      setWhereConditions(conds =>
        conds.map(cond =>
          (cond.field && (cond.field.includes('.') || options.find(o => o.value === cond.field)))
            ? cond
            : { ...cond, field: options.length ? options[0].value : '' }
        )
      );
    } catch {
      setFieldOptions([]);
      setFieldOptionsMap(prev => ({ ...prev, [tableName]: [] }));
    } finally {
      setFieldsLoading(false);
    }
  };

  fetchFields();
}, [tableName]);

  // Fetch fields for join tables when they change
  useEffect(() => {
    if (joinConfig.primaryTable) fetchFieldsForTable(joinConfig.primaryTable);
    if (joinConfig.secondaryTable) fetchFieldsForTable(joinConfig.secondaryTable);
  }, [joinConfig.primaryTable, joinConfig.secondaryTable, fetchFieldsForTable]);

  // Update join condition automatically when primary/secondary table/column changes
  useEffect(() => {
    if (
      joinConfig.primaryTable &&
      joinConfig.secondaryTable &&
      joinConfig.primaryColumn &&
      joinConfig.secondaryColumn
    ) {
      const autoCondition = `${joinConfig.primaryAlias || joinConfig.primaryTable}.${joinConfig.primaryColumn} = ${joinConfig.secondaryAlias || joinConfig.secondaryTable}.${joinConfig.secondaryColumn}`;
      setJoinConfig(jc => ({ ...jc, joinCondition: autoCondition }));
    }
  }, [joinConfig.primaryTable, joinConfig.secondaryTable, joinConfig.primaryColumn, joinConfig.secondaryColumn, joinConfig.primaryAlias, joinConfig.secondaryAlias]);

  // Handle join config changes
  const updateJoinConfig = (key: keyof JoinConfig, value: unknown) => {
    setJoinConfig(jc => ({ ...jc, [key]: value }));
  };

  // Handle output columns selection toggle
 const toggleOutputColumn = (tableAlias: string, column: string) => {
  setJoinConfig(jc => {
    const exists = jc.outputColumns.find(c => c.tableAlias === tableAlias && c.column === column);
    if (exists) {
      // toggle selected
      const updated = jc.outputColumns.map(c =>
        c.tableAlias === tableAlias && c.column === column ? { ...c, selected: !c.selected } : c
      );
      return { ...jc, outputColumns: updated };
    } else {
      // add new selected
      const newCol = { tableAlias, column, selected: true };
      return { ...jc, outputColumns: [...jc.outputColumns, newCol] };
    }
  });
};

  // Add all columns from a table to output columns
  const addAllOutputColumns = (tableAlias: string, tableName: string) => {
    const cols = fieldOptionsMap[tableName] || [];
    setJoinConfig(jc => {
      const newCols = cols
        .filter(c => !jc.outputColumns.find(oc => oc.tableAlias === tableAlias && oc.column === c.value))
        .map(c => ({ tableAlias, column: c.value, selected: true }));
      return { ...jc, outputColumns: [...jc.outputColumns, ...newCols] };
    });
  };

  // Clear all output columns from a table
  const clearAllOutputColumns = (tableAlias: string) => {
    setJoinConfig(jc => ({
      ...jc,
      outputColumns: jc.outputColumns.filter(c => c.tableAlias !== tableAlias)
    }));
  };

  // Build output columns SQL string
  const buildOutputColumnsSQL = () => {
    if (joinConfig.outputColumns.length === 0) return '*';
    const selectedCols = joinConfig.outputColumns.filter(c => c.selected);
    if (selectedCols.length === 0) return '*';
    return selectedCols.map(c => `${c.tableAlias}.${c.column}`).join(', ');
  };

  // --- WHERE Condition Handlers ---
  const handleWhereChange = (id: number, key: keyof WhereCondition, value: unknown) => {
    setWhereConditions(conds =>
      conds.map(cond => cond.id === id ? { ...cond, [key]: value } : cond)
    );
  };

  const addWhereCondition = () => {
    setWhereConditions(conds => [
      ...conds,
      {
        id: conds.length ? Math.max(...conds.map(c => c.id)) + 1 : 1,
        field: queryBuilderColumnOptions.length ? queryBuilderColumnOptions[0].value : '',
        operator: '=',
        value: '',
        logicalOperator: 'AND',
        conditionGroup: 1,
        valueType: 'constant'
      }
    ]);
  };

  const removeWhereCondition = (id: number) => {
    setWhereConditions(conds => conds.filter(cond => cond.id !== id));
  };

  // --- Nested Query Handlers ---
  const handleNestedQueryChange = (id: number, nestedQuery: NestedQuery) => {
    setWhereConditions(conds =>
      conds.map(cond => cond.id === id ? { ...cond, nestedQuery } : cond)
    );
  };

  // --- Window function handlers ---
  const addWindowFunction = () => {
    const newId = windowFunctionConfigs.length ? Math.max(...windowFunctionConfigs.map(w => w.id)) + 1 : 1;
    setWindowFunctionConfigs(configs => [
      ...configs,
      {
        id: newId,
        functionName: 'ROW_NUMBER',
        alias: `window_func_${newId}`,
        column: '',
        nValue: 1,
        offsetValue: 1,
        defaultValue: '',
        partitionBy: '',
        orderBy: '',
        orderingStrategy: 'across',
        frameClause: ''
      }
    ]);
  };

  const removeWindowFunction = (id: number) => {
    setWindowFunctionConfigs(configs => configs.filter(config => config.id !== id));
  };

  const updateWindowFunction = (id: number, key: keyof WindowFunctionConfig, value: unknown) => {
    setWindowFunctionConfigs(configs =>
      configs.map(config => config.id === id ? { ...config, [key]: value } : config)
    );
  };

  /**
   * Column names for window ORDER BY presets when the API column picker is empty or still loading.
   * Parses the SELECT "columns" field (e.g. `id, name` or `c.amount`) so preview still shows ORDER BY.
   */
  const getFieldsFromColumnsInput = (): string[] => {
    const c = columns?.trim();
    if (!c || c === '*') return [];
    return c
      .split(',')
      .map(part => {
        const raw = part.trim();
        if (!raw) return '';
        const woAs = raw.replace(/\s+AS\s+["'`]?\w+["'`]?$/i, '').trim();
        const first = woAs.split(/\s+/)[0] || '';
        return first.replace(/^[`'"[(]+|[\]`')\]]+$/g, '');
      })
      .filter(Boolean);
  };

  /**
   * ORDER BY expression inside OVER (...). Used for preview + SQL.
   * - custom: user text only
   * - presets: API column list, else parsed SELECT list, else window column
   */
  const getWindowOverOrderBy = (config: WindowFunctionConfig): string => {
    const rawStrategy = config.orderingStrategy || 'custom';

    if (rawStrategy === 'custom' && config.orderBy?.trim()) {
      return qualifySqlList(config.orderBy);
    }

    // "Custom" with no text: still emit ORDER BY from columns when possible (fixes empty preview / old saves).
    const strategy = rawStrategy === 'custom' ? 'across' : rawStrategy;

    let fields = queryBuilderColumnOptions.map(f => f.value).filter(v => Boolean(v?.trim()));
    if (fields.length < 1) {
      fields = getFieldsFromColumnsInput();
    }
    if (fields.length < 1) {
      const only = config.column?.trim();
      if (only) {
        fields = [only];
      } else {
        return '';
      }
    }

    const withDir = (name: string, dir: 'ASC' | 'DESC') => {
      if (!name?.trim()) return '';
      const base = qualifyColumnRef(name.trim());
      return base ? `${base} ${dir}` : '';
    };

    const selected = config.column?.trim();
    const primary = selected || fields[0] || '';
    const pickOtherThan = (not: string) => {
      const found = fields.find(f => f !== not);
      return found ?? fields[1] ?? fields[0] ?? '';
    };
    const secondary = selected ? pickOtherThan(selected) : fields[1] || fields[0] || '';

    // Presets use explicit ASC/DESC so switching strategies changes the SQL even when only one column exists.
    switch (strategy) {
      case 'across':
        return withDir(primary, 'ASC');
      case 'down':
        return withDir(secondary, 'DESC');
      case 'across_then_down':
        return fields.length >= 2
          ? `${withDir(primary, 'ASC')}, ${withDir(secondary, 'ASC')}`
          : `${withDir(primary, 'ASC')}, ${withDir(secondary, 'DESC')}`;
      case 'down_then_across':
        return fields.length >= 2
          ? `${withDir(secondary, 'DESC')}, ${withDir(primary, 'DESC')}`
          : `${withDir(secondary, 'DESC')}, ${withDir(primary, 'ASC')}`;
      case 'nested_loop':
        return fields.length >= 2
          ? `${withDir(primary, 'ASC')}, ${withDir(secondary, 'DESC')}`
          : `${withDir(primary, 'ASC')}, ${withDir(primary, 'DESC')}`;
      default:
        return config.orderBy?.trim() ? qualifySqlList(config.orderBy) : '';
    }
  };

  // Build window function SQL
  const buildWindowFunctionSQL = (config: WindowFunctionConfig) => {
    const syntheticFirst = getFieldsFromColumnsInput()[0];
    const fallbackCol = queryBuilderColumnOptions[0]?.value || syntheticFirst || 'column';
    let sql = config.functionName;
    if (['SUM', 'AVG', 'COUNT', 'MAX', 'MIN'].includes(config.functionName)) {
      const c = config.column?.trim();
      if (config.functionName === 'COUNT' && (!c || c === '*')) {
        sql += '(*)';
      } else {
        sql += `(${qualifyColumnRef(c || fallbackCol)})`;
      }
    } else if (config.functionName === 'NTILE') {
      sql += `(${config.nValue || 1})`;
    } else if (['LAG', 'LEAD'].includes(config.functionName)) {
      sql += `(${qualifyColumnRef(config.column || fallbackCol)}`;
      const off = config.offsetValue != null ? config.offsetValue : 1;
      const hasDefault = config.defaultValue !== undefined && config.defaultValue !== '';
      if (hasDefault || off !== 1) {
        sql += `, ${off}`;
      }
      if (hasDefault) {
        sql += `, '${String(config.defaultValue).replace(/'/g, "''")}'`;
      }
      sql += ')';
    } else if (config.functionName === 'NTH_VALUE') {
      sql += `(${qualifyColumnRef(config.column || fallbackCol)}, ${config.nValue || 1})`;
    } else if (['FIRST_VALUE', 'LAST_VALUE'].includes(config.functionName)) {
      sql += `(${qualifyColumnRef(config.column || fallbackCol)})`;
    } else {
      sql += '()';
    }
    sql += ' OVER (';
    const overParts: string[] = [];
    if (config.partitionBy) {
      overParts.push(`PARTITION BY ${qualifySqlList(config.partitionBy)}`);
    }
    const orderBy = getWindowOverOrderBy(config);
    if (orderBy) {
      overParts.push(`ORDER BY ${orderBy}`);
    }
    if (config.frameClause) {
      overParts.push(config.frameClause);
    }
    sql += overParts.join(' ');
    sql += ')';
    if (config.alias) {
      sql += ` AS ${config.alias}`;
    }
    return sql;
  };

  // --- Build Nested Query SQL ---
  const qualifyNestedColumn = (table: string, raw: string) => {
    const col = raw?.trim();
    if (!col || !table?.trim()) return raw;
    if (col.includes('.')) return col;
    return `${table}.${col}`;
  };

  const buildNestedQuerySQL = (q: NestedQuery, level = 1): string => {
    if (!q.function || !q.table || !q.column) return '';
    const selCol = qualifyNestedColumn(q.table, q.column);
    let sql = `SELECT ${q.function}(${selCol}) FROM ${q.table}`;
    // Filters
    if (q.filters && q.filters.length > 0) {
      const validFilters = q.filters.filter(f => f.field && (f.value || f.valueType === 'nested'));
      if (validFilters.length > 0) {
        const filterStr = validFilters.map((f, idx) => {
          let val = '';
          if (f.valueType === 'nested' && f.nestedQuery) {
            val = `(${buildNestedQuerySQL(f.nestedQuery, level + 1)})`;
          } else {
            val = `'${f.value.replace(/'/g, "''")}'`;
          }
          const left = qualifyNestedColumn(q.table, f.field);
          return `(${left} ${f.operator} ${val})${idx < validFilters.length - 1 ? ' ' + f.logicalOperator + ' ' : ''}`;
        }).join('');
        sql += ` WHERE ${filterStr}`;
      }
    }
    // Nested query as value
    if (q.nestedQuery) {
      sql += ` AND ${selCol} = (${buildNestedQuerySQL(q.nestedQuery, level + 1)})`;
    }
    return sql;
  };

  // --- Build the complete SQL query with join support ---
  const buildQuery = () => {
    // If join is configured (both tables selected), build join query
    if (joinConfig.primaryTable && joinConfig.secondaryTable) {
      // SELECT clause from output columns or fallback to *
      let selectClause = buildOutputColumnsSQL();

      if (windowFunctionConfigs.length > 0) {
        const windowFunctionSQLs = windowFunctionConfigs.map(config => buildWindowFunctionSQL(config));
        if (selectClause === '*') {
          selectClause = `*, ${windowFunctionSQLs.join(', ')}`;
        } else {
          selectClause = `${selectClause}, ${windowFunctionSQLs.join(', ')}`;
        }
      }

      // FROM and JOIN clause
      let query = `${statement} ${selectClause} FROM ${joinConfig.primaryTable} AS ${joinConfig.primaryAlias} `;

      query += `${joinConfig.joinType} JOIN ${joinConfig.secondaryTable} AS ${joinConfig.secondaryAlias} ON ${joinConfig.joinCondition}`;

      // WHERE clause (filters after join)
      if (whereConditions.length > 0) {
        const validConditions = whereConditions.filter(cond => cond.field && (cond.value || cond.valueType === 'nested'));
        if (validConditions.length > 0) {
          const whereStr = validConditions.map((cond, idx) => {
            let val = '';
            if (cond.valueType === 'nested' && cond.nestedQuery) {
              val = `(${buildNestedQuerySQL(cond.nestedQuery)})`;
            } else {
              val = `'${cond.value.replace(/'/g, "''")}'`;
            }
            return `(${qualifyColumnRef(cond.field)} ${cond.operator} ${val})${idx < validConditions.length - 1 ? ' ' + cond.logicalOperator + ' ' : ''}`;
          }).join('');
          query += ` WHERE ${whereStr}`;
        }
      }

      // GROUP BY, HAVING, ORDER BY, LIMIT
      if (groupBy.trim()) query += ` GROUP BY ${groupBy}`;
      if (having.trim()) query += ` HAVING ${having}`;
      if (orderBy.trim()) query += ` ORDER BY ${orderBy}`;
      if (limit.trim()) query += ` LIMIT ${limit}`;

      return query;
    }

    // Otherwise fallback to single table query (your existing logic)
    if (!tableName.trim()) return '';
    let selectClause = columns;
    if (windowFunctionConfigs.length > 0) {
      const windowFunctionSQLs = windowFunctionConfigs.map(config => buildWindowFunctionSQL(config));
      if (selectClause === '*') {
        selectClause = `*, ${windowFunctionSQLs.join(', ')}`;
      } else {
        selectClause = `${selectClause}, ${windowFunctionSQLs.join(', ')}`;
      }
    }
    let query = `${statement} ${selectClause} FROM ${tableName}`;
    // WHERE
    if (whereConditions.length > 0) {
      const validConditions = whereConditions.filter(cond => cond.field && (cond.value || cond.valueType === 'nested'));
      if (validConditions.length > 0) {
        const whereStr = validConditions.map((cond, idx) => {
          let val = '';
          if (cond.valueType === 'nested' && cond.nestedQuery) {
            val = `(${buildNestedQuerySQL(cond.nestedQuery)})`;
          } else {
            val = `'${cond.value.replace(/'/g, "''")}'`;
          }
          return `(${qualifyColumnRef(cond.field)} ${cond.operator} ${val})${idx < validConditions.length - 1 ? ' ' + cond.logicalOperator + ' ' : ''}`;
        }).join('');
        query += ` WHERE ${whereStr}`;
      }
    }
    if (groupBy.trim()) query += ` GROUP BY ${groupBy}`;
    if (having.trim()) query += ` HAVING ${having}`;
    if (orderBy.trim()) query += ` ORDER BY ${orderBy}`;
    if (limit.trim()) query += ` LIMIT ${limit}`;
    return query;
  };

  // --- End Query Builder states and handlers ---

  // Update filter helper (existing)
  const updateFilter = (updates: Partial<Filter>) => {
  const newUpdates: Partial<Filter> = { ...updates };
  if ('type' in updates && updates.type !== 'select') {
    newUpdates.webapi = '';
    newUpdates.webapiType = undefined;
    newUpdates.staticOptions = '';
  }
  if ('webapiType' in updates) {
    if (updates.webapiType === 'static') newUpdates.webapi = '';
    if (updates.webapiType === 'dynamic') newUpdates.staticOptions = '';
    
    // ✅ ADD THIS: Re-validate field when webapiType changes
    if (filter.field) {
      setTimeout(() => validateField('field'), 0);
    }
  }

  setLocalFilter(prev => ({ ...prev, ...newUpdates }));

  if (isEditing && editingFilter) {
    if (setEditingFilter) {
      setEditingFilter({ ...editingFilter, ...newUpdates });
    }
  } else {
    if (setNewFilter) {
      setNewFilter({ ...(propFilter ?? newFilter ?? {}), ...newUpdates });
    }
  }

  // Clear errors for updated fields
  const newErrors = { ...errors };
  Object.keys(updates).forEach(key => {
    delete newErrors[key as keyof ValidationErrors];
  });
  setErrors(newErrors);
};

 const handleBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName);
  };

  /** Required field format: table.column */
  const tableColumnPattern = /^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/;

  const formatListForInput = (value: unknown, sep: string): string => {
    if (value == null) return '';

    const fromArray = (arr: unknown[]): string =>
      arr
        .map(item => {
          if (typeof item === 'string' || typeof item === 'number') return String(item);
          if (item && typeof item === 'object') {
            const o = item as Record<string, unknown>;
            if ('label' in o && o.label != null) return String(o.label);
            if ('value' in o && o.value != null) return String(o.value);
          }
          return String(item);
        })
        .filter(Boolean)
        .join(sep);

    if (Array.isArray(value)) return fromArray(value);

    if (typeof value === 'string') {
      const t = value.trim();
      if (t.startsWith('[')) {
        try {
          const p = JSON.parse(t);
          if (Array.isArray(p)) return fromArray(p);
        } catch {
          /* show raw if not valid JSON */
        }
      }
      return value;
    }

    return '';
  };

const validateField = (fieldName: string, overrides?: Partial<Filter>) => {
  const f: Partial<Filter> = { ...filter, ...overrides };
  const newErrors = { ...errors };

  switch (fieldName) {
    case 'name': {
      const nm = f.name != null ? String(f.name).trim() : '';
      if (!nm) {
        newErrors.name = 'Filter Name is required';
      } else if (nm.length < 2) {
        newErrors.name = 'Filter Name must be at least 2 characters';
      } else {
        delete newErrors.name;
      }
      break;
    }
    case 'type':
      if (!f.type) {
        newErrors.type = 'Filter Type is required';
      } else {
        delete newErrors.type;
      }
      break;
    case 'webapiType':
      if (f.type === 'select' && !f.webapiType) {
        newErrors.webapiType = 'Web API Type is required';
      } else {
        delete newErrors.webapiType;
      }
      break;
    case 'staticOptions':
      if (f.type === 'select' && f.webapiType === 'static') {
        if (!f.staticOptions || f.staticOptions.trim() === '') {
          newErrors.staticOptions = 'Static values are required';
        } else {
          delete newErrors.staticOptions;
        }
      } else {
        delete newErrors.staticOptions;
      }
      break;
    case 'webapi':
      if (f.type === 'select' && f.webapiType === 'dynamic') {
        if (!f.webapi || f.webapi.trim() === '') {
          newErrors.webapi = 'Web API is required for Dynamic type';
        } else if (!/^https?:\/\//.test(f.webapi.trim())) {
          newErrors.webapi = 'Enter a valid URL (http/https)';
        } else {
          delete newErrors.webapi;
        }
      } else {
        delete newErrors.webapi;
      }
      break;
    case 'field': {
      const fieldValue = (f.field ?? '').trim();
      if (!fieldValue) {
        newErrors.field = 'Field/Column is required';
      } else if (fieldValue.length < 2) {
        newErrors.field = 'Field/Column must be at least 2 characters';
      } else if (!tableColumnPattern.test(fieldValue)) {
        newErrors.field = 'Must be in format: tablename.columnname (e.g., sales_data.date)';
      } else {
        delete newErrors.field;
      }
      break;
    }

    case 'advancedConfig': {
      const advConfigStr = typeof f.advancedConfig === 'string'
        ? f.advancedConfig
        : f.advancedConfig
          ? JSON.stringify(f.advancedConfig)
          : '';
      if (advConfigStr.trim()) {
        try {
          JSON.parse(advConfigStr);
          delete newErrors.advancedConfig;
        } catch {
          newErrors.advancedConfig = 'Invalid JSON format';
        }
      } else {
        delete newErrors.advancedConfig;
      }
      break;
    }
    case 'inlineStyle':
      if (f.inlineStyle && f.inlineStyle.trim()) {
        const styles = f.inlineStyle.split(';').filter(s => s.trim());
        const invalidStyles = styles.filter(style => !style.includes(':'));
        if (invalidStyles.length > 0) {
          newErrors.inlineStyle = 'Invalid CSS format. Use "property: value;" format';
        } else {
          delete newErrors.inlineStyle;
        }
      } else {
        delete newErrors.inlineStyle;
      }
      break;
    case 'pattern':
      if (f.pattern && String(f.pattern).trim()) {
        try {
          new RegExp(String(f.pattern));
          delete newErrors.pattern;
        } catch {
          newErrors.pattern = 'Invalid regular expression';
        }
      } else {
        delete newErrors.pattern;
      }
      break;
  }

  setErrors(newErrors);
};

  // Validation functions (existing)...

 const validateAll = (): boolean => {
  const newErrors: ValidationErrors = {};
  const resolvedName = String(filter.name ?? name ?? '').trim();

  if (!resolvedName) {
    newErrors.name = 'Filter Name is required';
  } else if (resolvedName.length < 2) {
    newErrors.name = 'Filter Name must be at least 2 characters';
  }

  if (!filter.type) {
    newErrors.type = 'Filter Type is required';
  }

  if (filter.type === 'select') {
    if (!filter.webapiType) {
      newErrors.webapiType = 'Web API Type is required';
    }
    if (filter.webapiType === 'static') {
      if (!filter.staticOptions || filter.staticOptions.trim() === '') {
        newErrors.staticOptions = 'Static values are required';
      }
    }
    if (filter.webapiType === 'dynamic') {
      if (!filter.webapi || filter.webapi.trim() === '') {
        newErrors.webapi = 'Web API is required for Dynamic type';
      } else if (!/^https?:\/\//.test(filter.webapi.trim())) {
        newErrors.webapi = 'Enter a valid URL (http/https)';
      }
    }
  }

  const fieldValue = (filter.field ?? '').trim();
  if (!fieldValue) {
    newErrors.field = 'Field/Column is required';
  } else if (fieldValue.length < 2) {
    newErrors.field = 'Field/Column must be at least 2 characters';
  } else if (!tableColumnPattern.test(fieldValue)) {
    newErrors.field = 'Must be in format: tablename.columnname (e.g., sales_data.date)';
  }

  const advConfigStr = typeof filter.advancedConfig === 'string'
    ? filter.advancedConfig
    : filter.advancedConfig
      ? JSON.stringify(filter.advancedConfig)
      : '';

  if (advConfigStr.trim()) {
    try {
      JSON.parse(advConfigStr);
    } catch {
      newErrors.advancedConfig = 'Invalid JSON format';
    }
  }

  if (filter.inlineStyle && filter.inlineStyle.trim()) {
    const styles = filter.inlineStyle.split(';').filter(s => s.trim());
    const invalidStyles = styles.filter(style => !style.includes(':'));
    if (invalidStyles.length > 0) {
      newErrors.inlineStyle = 'Invalid CSS format. Use "property: value;" format';
    }
  }

  if (filter.pattern && String(filter.pattern).trim()) {
    try {
      new RegExp(String(filter.pattern));
    } catch {
      newErrors.pattern = 'Invalid regular expression';
    }
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
  // Validate all fields (existing)...

  // Handle submit: combine all tab data and send to API
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  const resolvedName = String(filter.name ?? name ?? '').trim();

  setTouched({
    name: true,
    type: true,
    field: true,
    defaultValue: true,
    position: true,
    advancedConfig: true,
    webapi: true,
    inlineStyle: true,
    webapiType: true,
    staticOptions: true,
    queryPreview: true,
    filterApply: true,
    pattern: true,
  });

  if (!validateAll()) {
    setIsSubmitting(false);
    return;
  }

  if (activeTab === 'queryBuilder' && !resolvedName) {
    setError('Filter name is required in Query Builder tab');
    setIsSubmitting(false);
    return;
  }

  // ✅ Prepare payload with proper field mapping
  const payload = {
    name: resolvedName,
    type: filter.type,
    field: filter.field,
    defaultValue: filter.defaultValue || '',
    position: filter.position || 1,
    description: filter.description || '',
    placeholder: filter.placeholder || '',
    isActive: filter.isActive ?? true,
    required: filter.required ?? false,
    visible: filter.visible ?? true,
    multiSelect: filter.multiSelect ?? false,
    allowCustom: filter.allowCustom ?? false,
    queryPreview: filter.queryPreview ?? false,
    filterApply: filter.filterApply || 'Live',
    tags: Array.isArray(filter.tags) ? filter.tags : [],
    options: Array.isArray(filter.options) ? filter.options : [],
    min: filter.min || null,
    max: filter.max || null,
    pattern: filter.pattern || '',
    webapiType: filter.webapiType || '',
    staticOptions: filter.staticOptions || '', // ✅ Fixed: use staticOptions
    webapi: filter.webapi || '',
    advancedConfig:
      typeof filter.advancedConfig === 'string'
        ? filter.advancedConfig
        : filter.advancedConfig || '',
    cssClass: filter.cssClass || '',
    cssCode: (filter as Filter & { cssCode?: string }).cssCode || '',
    inlineStyle: filter.inlineStyle || '',
    
    // ✅ Event handlers
    onClickHandler: filter.onClickHandler || '',
    onBlurHandler: filter.onBlurHandler || '',
    onChangeHandler: filter.onChangeHandler || '',
    onFocusHandler: filter.onFocusHandler || '',
    onKeyDownHandler: filter.onKeyDownHandler || '',
    onKeyUpHandler: filter.onKeyUpHandler || '',
    
    // ✅ Event handler params and responses
    onClickHandlerParams: (filter as Filter & { onClickHandlerParams?: string }).onClickHandlerParams || '',
    onClickHandlerResponse: (filter as Filter & { onClickHandlerResponse?: string }).onClickHandlerResponse || '',
    onBlurHandlerParams: (filter as Filter & { onBlurHandlerParams?: string }).onBlurHandlerParams || '',
    onBlurHandlerResponse: (filter as Filter & { onBlurHandlerResponse?: string }).onBlurHandlerResponse || '',
    onChangeHandlerParams: (filter as Filter & { onChangeHandlerParams?: string }).onChangeHandlerParams || '',
    onChangeHandlerResponse: (filter as Filter & { onChangeHandlerResponse?: string }).onChangeHandlerResponse || '',
    onFocusHandlerParams: (filter as Filter & { onFocusHandlerParams?: string }).onFocusHandlerParams || '',
    onFocusHandlerResponse: (filter as Filter & { onFocusHandlerResponse?: string }).onFocusHandlerResponse || '',
    onKeyDownHandlerParams: (filter as Filter & { onKeyDownHandlerParams?: string }).onKeyDownHandlerParams || '',
    onKeyDownHandlerResponse: (filter as Filter & { onKeyDownHandlerResponse?: string }).onKeyDownHandlerResponse || '',
    onKeyUpHandlerParams: (filter as Filter & { onKeyUpHandlerParams?: string }).onKeyUpHandlerParams || '',
    onKeyUpHandlerResponse: (filter as Filter & { onKeyUpHandlerResponse?: string }).onKeyUpHandlerResponse || '',
    
    config: filter.config || {},

    // ✅ Query Builder tab data
    queryBuilder: {
      name: resolvedName,
      statement,
      columns,
      tableName,
      whereConditions,
      groupBy,
      having,
      orderBy,
      limit,
      windowFunctionConfigs,
      joinConfig,
      queryPreview: buildQuery(),
    },

    createdAt: isEditing ? (filter as Filter & { createdAt?: string }).createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(isEditing && filter.id ? { id: filter.id } : {}),
  };

  console.log('Payload being sent:', payload);

  try {
    if (onSave) {
      const result = await onSave(payload, isEditing);
      if (result) {
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      return;
    }

    const endpoint = isEditing ? 'api.php' : 'api.php';
    const response = await fetch(`https://intelligentsalesman.com/ism1/API/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('Response:', response);

    if (!response.ok) {
      const errorText = await response.text();
      alert('Failed to save filter! ' + errorText);
      setIsSubmitting(false);
      return;
    }

    const result = await response.json();
    console.log('Result:', result);

    alert(isEditing ? 'Filter updated successfully!' : 'Filter created successfully!');
    
    if (isEditing) {
      if (setEditingFilter) {
        setEditingFilter(null);
      }
    } else {
      if (resetNewFilter) {
        resetNewFilter();
      }
    }

    if (fetchFilters) {
      fetchFilters();
    }
    if (onCancel) {
      onCancel();
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred: ' + error);
  } finally {
    setIsSubmitting(false);
  }
};

  // Updated getFieldClassName to be theme-aware (existing)...
 // Replace existing getFieldClassName with this (slightly narrower on wide screens)
const getFieldClassName = (fieldName: string, baseClassName: string) => {
  const hasError = errors[fieldName as keyof ValidationErrors] && touched[fieldName];
  // slightly reduced width on larger screens to avoid overflow
  const base = `${baseClassName} rounded-md px-3 py-2 focus:outline-none focus:ring-2`;
  const errorClasses = 'border-red-500 focus:ring-red-400 dark:border-red-700 dark:focus:ring-red-600';
  const lightClasses = 'border-gray-300 focus:ring-blue-400 bg-white text-black';
  const darkClasses = 'border-gray-600 focus:ring-blue-600 bg-gray-800 text-white';

  // baseClassName typically contains width like 'w-full'. Use md constraint to slightly shrink on larger screens
  // result: full width on small screens, 92% on md+ screens
  return `${base} ${hasError ? errorClasses : theme === 'dark' ? darkClasses : lightClasses} w-full md:w-[92%]`;
};
  useEffect(() => {
    if (!isEditing && !filter.type) {
      updateFilter({ type: 'select' });
    }
  }, [isEditing, filter.type]);

  // If parentMode is 'modal', render directly without modal wrapper
  if (parentMode === 'modal') {
    return (
      <div className="flex w-full min-w-0 flex-col space-y-4">
        {/* Tabs — sticky so they stay visible while scrolling long tabs (e.g. QueryBuilder) */}
        <div className="sticky top-0 z-10 -mx-1 border-b border-gray-300 bg-white px-1 pb-0 dark:border-gray-700 dark:bg-gray-900">
          <nav className="flex space-x-6" aria-label="Tabs">
            {['basic', 'styling', 'events', 'validation', 'options', 'queryBuilder'].map((tab) => (
              <button
                key={tab}
                className={`py-3 px-4 -mb-px border-b-2 font-medium ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                onClick={() => setActiveTab(tab as 'basic' | 'styling' | 'events' | 'validation' | 'options' | 'queryBuilder')}
                type="button"
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Form — scroll is on FilterManager modal body; keep min-h-0 so flex children can shrink */}
          <form className="min-h-0 w-full space-y-6 overflow-x-hidden" onSubmit={handleSubmit} noValidate>
          {/* BASIC TAB - new layout: two-columns and reorder of fields */}
<BasicTabBasicSection active={activeTab === 'basic'}>
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Filter Name */}
      <div>
        <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
          Filter Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={filter.name || ''}
          onChange={(e) => updateFilter({ name: e.target.value })}
          onBlur={() => handleBlur('name')}
          placeholder="Enter filter name"
          className={getFieldClassName('name', 'w-full border')}
          required
        />
        {errors.name && touched.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
      </div>

      {/* Field/Column (same row as name) */}
      <div>
        <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
          Field/Column <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={filter.field || ''}
          onChange={(e) => {
  const val = e.target.value;
  updateFilter({ field: val });
  validateField('field', { field: val });
}}
onBlur={() => handleBlur('field')}

          placeholder='E.g. sales_data.status'
          className={getFieldClassName('field', 'w-full border')}
          required
        />
        {errors.field && touched.field && <div className="text-red-500 text-sm mt-1">{errors.field}</div>}
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
          Enter as "tableName.fieldName" (letters, numbers, underscore, one dot)
        </div>
      </div>
    </div>

    {/* Filter Type and Web API Type same row */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <div>
        <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
          Filter Type <span className="text-red-500">*</span>
        </label>
        <select
          value={filter.type || 'select'}
          onChange={(e) => updateFilter({ type: e.target.value as Filter['type'] })}
          onBlur={() => handleBlur('type')}
          className={getFieldClassName('type', 'w-full border')}
          required
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="select">Select</option>
          {/* Removed: QueryBuilder, Lookup, Component Style */}
        </select>
        {errors.type && touched.type && <div className="text-red-500 text-sm mt-1">{errors.type}</div>}
      </div>

      <div>
        <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
          Web API Type {filter.type === 'select' ? <span className="text-red-500">*</span> : null}
        </label>
        <select
          value={filter.webapiType || ''}
          onChange={(e) =>
            updateFilter({ webapiType: e.target.value as 'static' | 'dynamic', webapi: '', staticOptions: '' })
          }
          className={getFieldClassName('webapiType', 'w-full border')}
          required={filter.type === 'select'}
        >
          <option value="">Select Type</option>
          <option value="static">Static</option>
          <option value="dynamic">Dynamic</option>
        </select>
        {errors.webapiType && touched.webapiType && (
          <div className="text-red-500 text-sm mt-1">{errors.webapiType}</div>
        )}
      </div>
    </div>

    {/* Static Values or Web API occupy full row */}
    {filter.type === 'select' && filter.webapiType === 'static' && (
      <div className="mt-4">
        <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
          Static Values
        </label>
        <input
          type="text"
          value={filter.staticOptions || ''}
          onChange={(e) => updateFilter({ staticOptions: e.target.value })}
          onBlur={() => handleBlur('staticOptions')}
          placeholder="e.g. Active,Inactive,Pending"
          className={getFieldClassName('staticOptions', 'w-full border')}
        />
        {errors.staticOptions && touched.staticOptions && (
          <div className="text-red-500 text-sm mt-1">{errors.staticOptions}</div>
        )}
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
          Enter comma-separated values (e.g. Active,Inactive,Pending)
        </div>
      </div>
    )}

    {filter.type === 'select' && filter.webapiType === 'dynamic' && (
      <div className="mt-4">
        <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
          Web API
        </label>
        <input
          type="text"
          value={filter.webapi || ''}
          onChange={(e) => updateFilter({ webapi: e.target.value })}
          onBlur={() => handleBlur('webapi')}
          placeholder="https://example.com/api/endpoint"
          className={getFieldClassName('webapi', 'w-full border')}
        />
        {errors.webapi && touched.webapi && <div className="text-red-500 text-sm mt-1">{errors.webapi}</div>}
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
          Enter API endpoint to fetch options dynamically.
        </div>
      </div>
    )}

    {/* Order/Position (optional now) */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <div>
        <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Order/Position:</label>
        <input
          type="number"
          min={1}
          value={filter.position ?? ''}
          onChange={(e) => {
            const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
            updateFilter({ position: val });
          }}
          placeholder="Order of appearance (optional)"
          className={getFieldClassName('position', 'w-full border')}
        />
        {errors.position && touched.position && <div className="text-red-500 text-sm mt-1">{errors.position}</div>}
      </div>

      <div>
        <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Placeholder:</label>
        <input
          type="text"
          value={filter.placeholder || ''}
          onChange={(e) => updateFilter({ placeholder: e.target.value })}
          placeholder="Placeholder text"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div>
        <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Description:</label>
        <input
          type="text"
          value={filter.description || ''}
          onChange={(e) => updateFilter({ description: e.target.value })}
          placeholder="Short description"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
        />
      </div>
      {/* QueryPreview checkbox and FilterApply dropdown (under Description) */}
    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex items-center space-x-3">
        <input
          id="queryPreviewCheckbox"
          type="checkbox"
          checked={filter.queryPreview ?? false}
          onChange={(e) => updateFilter({ queryPreview: e.target.checked })}
          className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="queryPreviewCheckbox" className="font-medium text-gray-900 dark:text-gray-100 select-none">
          QueryPreview
        </label>
      </div>

      <div>
        <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">FilterApply:</label>
        <select
          value={filter.filterApply || 'Live'}
          onChange={(e) => updateFilter({ filterApply: e.target.value as 'Live' | 'Manual' })}
          className={getFieldClassName('filterApply', 'w-full border')}
        >
          <option value="Live">Live</option>
          <option value="Manual">Manual</option>
        </select>
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
          Live: apply immediately as user changes — Manual: requires explicit Apply
        </div>
      </div>
    </div>
    </div>
  </>
</BasicTabBasicSection>

         <BasicTabStylingSection active={activeTab === 'styling'}>
  <>
    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">🎨 Styling & Appearance</h3>

    <div className="form-group mb-4">
      <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">CSS Class:</label>
      <input
        type="text"
        value={filter.cssClass || ''}
        onChange={(e) => {
          updateFilter({ cssClass: e.target.value });
          // if user clears classes, clear cssCode too
          if (!e.target.value) updateFilter({ cssCode: '' });
        }}
        placeholder="e.g. my-custom-class btn-primary"
        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
      />
      <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
        Add custom CSS classes (space-separated)
      </div>
    </div>

    {/* CSS Code textarea appears when a class name is entered */}
    {filter.cssClass && filter.cssClass.trim() !== '' && (
      <div className="form-group mb-4">
        <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
          CSS for &quot;{filter.cssClass}&quot;
        </label>
        <textarea
          value={filter.cssCode || ''}
          onChange={(e) => {
            updateFilter({ cssCode: e.target.value });
            // immediate validation
            const err = validateCssCode(e.target.value);
            setCssCodeError(err);
          }}
          placeholder={`.${(filter.cssClass || '').split(' ')[0]} { /* css here */ }`}
          className={`w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 ${cssCodeError ? 'border-red-500 focus:ring-red-400' : 'focus:ring-blue-400'}`}
          rows={8}
        />
        {cssCodeError ? (
          <div className="text-red-500 text-sm mt-1">{cssCodeError}</div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">Write CSS for the provided class. Basic syntax is validated live.</div>
        )}
      </div>
    )}
  </>
</BasicTabStylingSection>

          <BasicTabEventsSection active={activeTab === 'events'}>
  <>
    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">⚡ Event Handlers</h3>

    <div className="grid grid-cols-1 gap-4">
      {[
        { label: 'onClick Handler', key: 'onClickHandler' },
        { label: 'onBlur Handler', key: 'onBlurHandler' },
        { label: 'onChange Handler', key: 'onChangeHandler' },
        { label: 'onFocus Handler', key: 'onFocusHandler' },
        { label: 'onKeyDown Handler', key: 'onKeyDownHandler' },
        { label: 'onKeyUp Handler', key: 'onKeyUpHandler' },
      ].map(({ label, key }) => (
        <div key={key} className="border rounded-md p-3">
          <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">{label}:</label>

          {/* function name */}
          <input
            type="text"
            value={(filter as Record<string, unknown>)[key] as string || ''}
            onChange={(e) => updateFilter({ [key]: e.target.value })}
            placeholder={`e.g. handle${label.replace(' Handler', '')}`}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
          />

          {/* params */}
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Parameters (comma-separated or JSON):</label>
          <input
            type="text"
            value={(filter as Record<string, unknown>)[`${key}Params`] as string || ''}
            onChange={(e) => updateFilter({ [`${key}Params`]: e.target.value })}
            placeholder={`e.g. id, 'abc', 123  or  {"id":123,"flag":true}`}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
          />

          {/* response type */}
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Expected Response:</label>
          <select
            value={(filter as Record<string, unknown>)[`${key}Response`] as string || ''}
            onChange={(e) => updateFilter({ [`${key}Response`]: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
          >
            <option value="">(none)</option>
            <option value="void">void</option>
            <option value="boolean">boolean</option>
            <option value="string">string</option>
            <option value="object">object</option>
            <option value="promise">Promise</option>
          </select>
        </div>
      ))}
    </div>

    <div className="text-gray-500 dark:text-gray-400 text-xs mt-2">
      Enter function name, params and expected response type. Your application should map these to actual functions in scope at runtime.
    </div>
  </>
</BasicTabEventsSection>

          <BasicTabValidationSection active={activeTab === 'validation'}>
            <>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Validation Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Min (for number/text):</label>
                  <input
                    type="number"
                    value={filter.min || ''}
                    onChange={(e) => updateFilter({ min: e.target.value })}
                    placeholder="Min value/length"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Max (for number/text):</label>
                  <input
                    type="number"
                    value={filter.max || ''}
                    onChange={(e) => updateFilter({ max: e.target.value })}
                    placeholder="Max value/length"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Regex Pattern:</label>
                  <input
                    type="text"
                    value={filter.pattern || ''}
                    onChange={(e) => updateFilter({ pattern: e.target.value })}
                    onBlur={() => handleBlur('pattern')}
                    placeholder="e.g. ^[A-Za-z0-9]+$"
                    className={getFieldClassName('pattern', 'w-full border')}
                  />
                  {errors.pattern && touched.pattern && (
                    <div className="text-red-500 text-sm mt-1">{errors.pattern}</div>
                  )}
                </div>
              </div>

              <div className="form-group mt-4">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Advanced Config (JSON):</label>
                <textarea
                  value={
                    typeof filter.advancedConfig === 'string'
                      ? filter.advancedConfig
                      : filter.advancedConfig
                        ? JSON.stringify(filter.advancedConfig, null, 2)
                        : ''
                  }
                  onChange={(e) => updateFilter({ advancedConfig: e.target.value })}
                  onBlur={() => handleBlur('advancedConfig')}
                  placeholder='{"key":"value"}'
                  className={getFieldClassName('advancedConfig', 'w-full border font-mono text-xs')}
                  rows={3}
                />
                {errors.advancedConfig && touched.advancedConfig && (
                  <div className="text-red-500 text-sm mt-1">{errors.advancedConfig}</div>
                )}
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Optional: Enter valid JSON for additional configuration
                </div>
              </div>
            </>
          </BasicTabValidationSection>

          <BasicTabOptionsSection active={activeTab === 'options'}>
  <>
    {(filter.type === 'select' ||
      filter.type === 'lookup' ||
      filter.type === 'query' ||
      filter.type === 'component') && (
      <>
        <div className="form-group">
          <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Options (comma separated):</label>
          <input
            type="text"
            value={formatListForInput(filter.options, ', ')}
            onChange={(e) => {
              const options = e.target.value.split(',').map(opt => opt.trim()).filter(Boolean);
              updateFilter({ options });
            }}
            placeholder="e.g. Active,Inactive,Pending"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="form-group flex items-center space-x-6">
          <label className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
            <input
              type="checkbox"
              checked={filter.allowCustom ?? false}
              onChange={(e) => updateFilter({ allowCustom: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="font-medium select-none cursor-pointer">Allow custom values</span>
          </label>
        </div>
      </>
    )}

    <div className="form-group">
      <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Tags (comma separated):</label>
      <input
        type="text"
        value={formatListForInput(filter.tags, ', ')}
        onChange={(e) => {
          const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
          updateFilter({ tags });
        }}
        placeholder="Enter tags"
        // reduced width
        style={{ maxWidth: 420 }}
        className="w-full md:w-auto border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
      />
    </div>

    {/* vertical checkboxes with short descriptions in brackets */}
    <div className="space-y-3 mt-3">
      <label className="flex items-start space-x-3">
        <input
          type="checkbox"
          checked={filter.isActive ?? true}
          onChange={(e) => updateFilter({ isActive: e.target.checked })}
          className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 mt-1"
        />
        <div>
          <span className="font-medium">Active</span>
          <span className="text-gray-500 ml-2"> (Filter active by default)</span>
        </div>
      </label>

      <label className="flex items-start space-x-3">
        <input
          type="checkbox"
          checked={filter.multiSelect ?? false}
          onChange={(e) => updateFilter({ multiSelect: e.target.checked })}
          className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 mt-1"
        />
        <div>
          <span className="font-medium">Multiselect</span>
          <span className="text-gray-500 ml-2"> (Allow selecting multiple values)</span>
        </div>
      </label>

      <label className="flex items-start space-x-3">
        <input
          type="checkbox"
          checked={filter.required ?? false}
          onChange={(e) => updateFilter({ required: e.target.checked })}
          className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 mt-1"
        />
        <div>
          <span className="font-medium">Required</span>
          <span className="text-gray-500 ml-2"> (Field must have a value to submit)</span>
        </div>
      </label>

      <label className="flex items-start space-x-3">
        <input
          type="checkbox"
          checked={filter.visible ?? true}
          onChange={(e) => updateFilter({ visible: e.target.checked })}
          className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 mt-1"
        />
        <div>
          <span className="font-medium">Visible</span>
          <span className="text-gray-500 ml-2"> (Show filter in UI)</span>
        </div>
      </label>
    </div>
  </>
</BasicTabOptionsSection>

          <BasicTabQueryBuilderSection active={activeTab === 'queryBuilder'}>
            <>
              <SharedQueryBuilder
                initialData={currentQueryBuilderData}
                onQueryChange={handleSharedQueryChange}
                apiBase="https://intelligentsalesman.com/ism1/API"
              />
              {false && (
              <MuiThemeProvider theme={queryBuilderMuiTheme}>
              <Box
                className="query-builder-panel w-full min-w-0"
                sx={{
                  p: { xs: 1, sm: 2 },
                  width: '100%',
                  maxWidth: '100%',
                  bgcolor: 'background.paper',
                }}
              >
                {/* Error message */}
                {error && (
                  <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                  </Typography>
                )}

               

                <FormControl fullWidth sx={{ mb: 2 }} variant="outlined">
                  <InputLabel id="qb-sql-statement-label">SQL Statement</InputLabel>
                  <Select
                    labelId="qb-sql-statement-label"
                    value={statement}
                    label="SQL Statement"
                    onChange={(e) => setStatement(e.target.value)}
                  >
                    {sqlStatements.map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Columns (comma separated or *)"
                  fullWidth
                  value={columns}
                  onChange={(e) => setColumns(e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="*, age, salary"
                  disabled={joinConfig.primaryTable && joinConfig.secondaryTable} // disable if join active
                  helperText={joinConfig.primaryTable && joinConfig.secondaryTable ? 'Disabled when join is configured. Use Output Columns below.' : ''}
                />

                {/* Table Name with Autocomplete */}
                <Autocomplete
                  freeSolo
                  options={tableOptions}
                  loading={tableLoading}
                  value={tableName}
                  slotProps={{
                    popper: {
                      sx: { zIndex: 4000 },
                      disablePortal: false,
                    },
                  }}
                  onChange={(_event, newValue) => {
                    setTableName(newValue || '');
                  }}
                  onInputChange={handleTableInputChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Table Name"
                      fullWidth
                      sx={{ mb: 2 }}
                      placeholder="Select or type to search tables"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {tableLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      disabled={joinConfig.primaryTable && joinConfig.secondaryTable} // disable if join active
                      helperText={joinConfig.primaryTable && joinConfig.secondaryTable ? 'Disabled when join is configured.' : ''}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <li key={key} {...otherProps}>
                        {option}
                      </li>
                    );
                  }}
                />

                {/* Join Configuration Section */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Join Configuration</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Join Type</InputLabel>
                <Select
                  value={joinConfig.joinType}
                  label="Join Type"
                  onChange={e => updateJoinConfig('joinType', e.target.value)}
                >
                  {['INNER', 'LEFT', 'RIGHT', 'FULL OUTER', 'CROSS', 'SELF'].map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                  Select the SQL Join type to combine tables.
                </Typography>
              </FormControl>

              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Primary Table</InputLabel>
                <Select
                  value={joinConfig.primaryTable}
                  label="Primary Table"
                  onChange={e => updateJoinConfig('primaryTable', e.target.value)}
                >
                  {tableOptions.map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Primary Alias"
                value={joinConfig.primaryAlias}
                onChange={e => updateJoinConfig('primaryAlias', e.target.value)}
                placeholder="e.g. c"
                size="small"
                sx={{ minWidth: { xs: '100%', sm: 120 } }}
              />

              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Primary Column</InputLabel>
                <Select
                  value={joinConfig.primaryColumn}
                  label="Primary Column"
                  onChange={e => updateJoinConfig('primaryColumn', e.target.value)}
                  disabled={!joinConfig.primaryTable}
                >
                  {(fieldOptionsMap[joinConfig.primaryTable] || []).map(f => (
                    <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Secondary Table</InputLabel>
                <Select
                  value={joinConfig.secondaryTable}
                  label="Secondary Table"
                  onChange={e => updateJoinConfig('secondaryTable', e.target.value)}
                >
                  {tableOptions.map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Secondary Alias"
                value={joinConfig.secondaryAlias}
                onChange={e => updateJoinConfig('secondaryAlias', e.target.value)}
                placeholder="e.g. o"
                size="small"
                sx={{ minWidth: { xs: '100%', sm: 120 } }}
              />

              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Secondary Column</InputLabel>
                <Select
                  value={joinConfig.secondaryColumn}
                  label="Secondary Column"
                  onChange={e => updateJoinConfig('secondaryColumn', e.target.value)}
                  disabled={!joinConfig.secondaryTable}
                >
                  {(fieldOptionsMap[joinConfig.secondaryTable] || []).map(f => (
                    <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mb: 2 }}>
              <TextField
                label="Join Condition (editable)"
                fullWidth
                value={joinConfig.joinCondition}
                onChange={e => updateJoinConfig('joinCondition', e.target.value)}
                helperText="Auto-generated. You may override for complex joins."
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Alias Tables (Optional)</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Primary Alias"
                  value={joinConfig.primaryAlias}
                  onChange={e => updateJoinConfig('primaryAlias', e.target.value)}
                  size="small"
                  sx={{ minWidth: 140 }}
                />
                <TextField
                  label="Secondary Alias"
                  value={joinConfig.secondaryAlias}
                  onChange={e => updateJoinConfig('secondaryAlias', e.target.value)}
                  size="small"
                  sx={{ minWidth: 140 }}
                />
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                Use aliases for shorter references in custom SQL.
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Output Columns</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                <Button size="small" onClick={() => addAllOutputColumns(joinConfig.primaryAlias, joinConfig.primaryTable)}>+ Add All Primary</Button>
                <Button size="small" onClick={() => clearAllOutputColumns(joinConfig.primaryAlias)}>- Clear Primary</Button>
                <Button size="small" onClick={() => addAllOutputColumns(joinConfig.secondaryAlias, joinConfig.secondaryTable)}>+ Add All Secondary</Button>
                <Button size="small" onClick={() => clearAllOutputColumns(joinConfig.secondaryAlias)}>- Clear Secondary</Button>
              </Box>
              <Box sx={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #ddd', p: 1, borderRadius: 1 }}>
                {(fieldOptionsMap[joinConfig.primaryTable] || []).map(col => {
                  const selected = joinConfig.outputColumns.find(c => c.tableAlias === joinConfig.primaryAlias && c.column === col.value)?.selected || false;
                  return (
                    <FormControlLabel
                      key={`primary-${col.value}`}
                      control={
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleOutputColumn(joinConfig.primaryAlias, col.value)}
                        />
                      }
                      label={`${joinConfig.primaryAlias}.${col.label}`}
                    />
                  );
                })}
                {(fieldOptionsMap[joinConfig.secondaryTable] || []).map(col => {
                  const selected = joinConfig.outputColumns.find(c => c.tableAlias === joinConfig.secondaryAlias && c.column === col.value)?.selected || false;
                  return (
                    <FormControlLabel
                      key={`secondary-${col.value}`}
                      control={
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleOutputColumn(joinConfig.secondaryAlias, col.value)}
                        />
                      }
                      label={`${joinConfig.secondaryAlias}.${col.label}`}
                    />
                  );
                })}
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                Select which columns to include in the final result.
              </Typography>
            </Box>
          </AccordionDetails>
                </Accordion>

                {/* Where Conditions */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Where Conditions</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
            {whereConditions.map((cond) => (
              <Box key={cond.id} sx={{ display: 'flex', flexDirection: 'column', mb: 2, border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', lg: 'row' },
                    gap: 1,
                    alignItems: { xs: 'stretch', lg: 'flex-start' },
                    flexWrap: 'wrap',
                  }}
                >
                  <FormControl sx={{ flex: { lg: 1 }, minWidth: { xs: '100%', lg: 160 } }} fullWidth>
                    <InputLabel id={`qb-where-field-${cond.id}`}>Field</InputLabel>
                    <Select
                      labelId={`qb-where-field-${cond.id}`}
                      value={cond.field}
                      label="Field"
                      onChange={(e) => handleWhereChange(cond.id, 'field', e.target.value)}
                      disabled={fieldsLoading || queryBuilderColumnOptions.length === 0}
                    >
                      {queryBuilderColumnOptions.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: { xs: '100%', sm: 100 } }} size="small">
                    <InputLabel id={`qb-where-op-${cond.id}`}>Operator</InputLabel>
                    <Select
                      labelId={`qb-where-op-${cond.id}`}
                      value={cond.operator}
                      label="Operator"
                      onChange={(e) => handleWhereChange(cond.id, 'operator', e.target.value)}
                    >
                      {operators.map(op => (
                        <MenuItem key={op} value={op}>{op}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: { xs: '100%', sm: 220 } }}>
                    <RadioGroup
                      row
                      value={cond.valueType || 'constant'}
                      onChange={e => handleWhereChange(cond.id, 'valueType', e.target.value)}
                    >
                      <FormControlLabel value="constant" control={<Radio />} label="Constant" />
                      <FormControlLabel value="nested" control={<Radio />} label="Nested Query" />
                    </RadioGroup>
                  </FormControl>
                  <FormControl sx={{ minWidth: { xs: '100%', sm: 110 } }} size="small">
                    <InputLabel id={`qb-where-logic-${cond.id}`}>Logical Op</InputLabel>
                    <Select
                      labelId={`qb-where-logic-${cond.id}`}
                      value={cond.logicalOperator}
                      label="Logical Operator"
                      onChange={(e) => handleWhereChange(cond.id, 'logicalOperator', e.target.value)}
                    >
                      {logicalOperators.map(op => (
                        <MenuItem key={op} value={op}>{op}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Group"
                    type="number"
                    sx={{ width: 80 }}
                    value={cond.conditionGroup}
                    onChange={(e) => handleWhereChange(cond.id, 'conditionGroup', Number(e.target.value))}
                    inputProps={{ min: 1 }}
                  />
                  {whereConditions.length > 1 && (
                    <IconButton color="error" onClick={() => removeWhereCondition(cond.id)}>
                      <RemoveCircleOutline />
                    </IconButton>
                  )}
                </Box>
                {/* Value or Nested Query */}
                {cond.valueType === 'constant' && (
                  <TextField
                    label="Value"
                    sx={{ mt: 1, width: 300 }}
                    value={cond.value}
                    onChange={(e) => handleWhereChange(cond.id, 'value', e.target.value)}
                  />
                )}
                {cond.valueType === 'nested' && (
                  <NestedQueryBuilder
                    nestedQuery={cond.nestedQuery || { function: 'MAX', table: '', column: '', filters: [] }}
                    onChange={q => handleNestedQueryChange(cond.id, q)}
                    level={1}
                    tableOptions={tableOptions}
                    fieldOptionsMap={fieldOptionsMap}
                    fetchFieldsForTable={fetchFieldsForTable}
                  />
                )}
              </Box>
            ))}
            <Button startIcon={<AddCircleOutline />} onClick={addWhereCondition} sx={{ mb: 2 }}>
              Add Condition
            </Button>
          </AccordionDetails>
                </Accordion>

                {/* Window Functions */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Window Functions</Typography>
                    {windowFunctionConfigs.length > 0 && (
                      <Chip 
                        label={`${windowFunctionConfigs.length} function${windowFunctionConfigs.length > 1 ? 's' : ''}`} 
                        size="small" 
                        sx={{ ml: 2 }} 
                      />
                    )}
                  </AccordionSummary>
                  <AccordionDetails>
            {windowFunctionConfigs.map((config) => (
              <Box key={config.id} sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Function</InputLabel>
                    <Select
                      value={config.functionName}
                      label="Function"
                      onChange={(e) => updateWindowFunction(config.id, 'functionName', e.target.value)}
                    >
                      {Object.entries(windowFunctions).map(([key, category]) => [
                        <MenuItem key={`${key}-header`} disabled sx={{ fontWeight: 'bold' }}>
                          {category.label}
                        </MenuItem>,
                        ...category.functions.map(func => (
                          <MenuItem key={func} value={func} sx={{ pl: 3 }}>
                            {func}
                          </MenuItem>
                        ))
                      ]).flat()}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Alias"
                    value={config.alias}
                    onChange={(e) => updateWindowFunction(config.id, 'alias', e.target.value)}
                    sx={{ minWidth: 120 }}
                  />
                  <IconButton color="error" onClick={() => removeWindowFunction(config.id)}>
                    <RemoveCircleOutline />
                  </IconButton>
                </Box>
                {['SUM', 'AVG', 'COUNT', 'MAX', 'MIN', 'FIRST_VALUE', 'LAST_VALUE'].includes(config.functionName) && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Column</InputLabel>
                    <Select
                      value={config.column}
                      label="Column"
                      onChange={(e) => updateWindowFunction(config.id, 'column', e.target.value)}
                    >
                      {queryBuilderColumnOptions.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {config.functionName === 'NTILE' && (
                  <TextField
                    label="N Value"
                    type="number"
                    value={config.nValue}
                    onChange={(e) => updateWindowFunction(config.id, 'nValue', Number(e.target.value))}
                    sx={{ mb: 2, width: 120 }}
                    inputProps={{ min: 1 }}
                  />
                )}
                {['LAG', 'LEAD'].includes(config.functionName) && (
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>Column</InputLabel>
                      <Select
                        value={config.column}
                        label="Column"
                        onChange={(e) => updateWindowFunction(config.id, 'column', e.target.value)}
                      >
                        {queryBuilderColumnOptions.map(f => (
                          <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Offset"
                      type="number"
                      value={config.offsetValue}
                      onChange={(e) => updateWindowFunction(config.id, 'offsetValue', Number(e.target.value))}
                      sx={{ width: 100 }}
                      inputProps={{ min: 1 }}
                    />
                    <TextField
                      label="Default Value"
                      value={config.defaultValue}
                      onChange={(e) => updateWindowFunction(config.id, 'defaultValue', e.target.value)}
                      sx={{ width: 120 }}
                    />
                  </Box>
                )}
                {config.functionName === 'NTH_VALUE' && (
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>Column</InputLabel>
                      <Select
                        value={config.column}
                        label="Column"
                        onChange={(e) => updateWindowFunction(config.id, 'column', e.target.value)}
                      >
                        {queryBuilderColumnOptions.map(f => (
                          <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="N Value"
                      type="number"
                      value={config.nValue}
                      onChange={(e) => updateWindowFunction(config.id, 'nValue', Number(e.target.value))}
                      sx={{ width: 100 }}
                      inputProps={{ min: 1 }}
                    />
                  </Box>
                )}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id={`qb-ordering-strategy-${config.id}`}>Ordering Strategy</InputLabel>
                  <Select
                    labelId={`qb-ordering-strategy-${config.id}`}
                    value={
                      config.orderingStrategy &&
                      orderingStrategies.some(s => s.value === config.orderingStrategy)
                        ? config.orderingStrategy
                        : 'across'
                    }
                    label="Ordering Strategy"
                    onChange={(e: SelectChangeEvent<string>) =>
                      updateWindowFunction(config.id, 'orderingStrategy', e.target.value)
                    }
                  >
                    {orderingStrategies.map(strategy => (
                      <MenuItem key={strategy.value} value={strategy.value}>
                        <Box>
                          <Typography variant="body2">{strategy.label}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {strategy.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="Partition By"
                    value={config.partitionBy}
                    onChange={(e) => updateWindowFunction(config.id, 'partitionBy', e.target.value)}
                    sx={{ flex: 1 }}
                    placeholder="department, region"
                  />
                  <TextField
                    label={config.orderingStrategy === 'custom' ? 'Order By (Custom)' : 'Order By (Auto-generated)'}
                    value={config.orderingStrategy === 'custom' ? config.orderBy : getWindowOverOrderBy(config)}
                    onChange={(e) => updateWindowFunction(config.id, 'orderBy', e.target.value)}
                    sx={{ flex: 1 }}
                    placeholder="salary DESC, age ASC"
                    disabled={config.orderingStrategy !== 'custom'}
                  />
                </Box>
                <TextField
                  label="Frame Clause (Optional)"
                  value={config.frameClause}
                  onChange={(e) => updateWindowFunction(config.id, 'frameClause', e.target.value)}
                  fullWidth
                  placeholder="ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW"
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                  Preview: {buildWindowFunctionSQL(config)}
                </Typography>
              </Box>
            ))}
            <Button startIcon={<AddCircleOutline />} onClick={addWindowFunction}>
              Add Window Function
            </Button>
          </AccordionDetails>
                </Accordion>

                {/* Other SQL Clauses */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Additional SQL Clauses</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                              <TextField
                                label="Group By (comma separated)"
                                fullWidth
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value)}
                                sx={{ mb: 2 }}
                                placeholder="age, status"
                              />
                              <TextField
                                label="Having Clause"
                                fullWidth
                                value={having}
                                onChange={(e) => setHaving(e.target.value)}
                                sx={{ mb: 2 }}
                                placeholder="COUNT(age) > 1"
                              />
                              <TextField
                                label="Order By"
                                fullWidth
                                value={orderBy}
                                onChange={(e) => setOrderBy(e.target.value)}
                                sx={{ mb: 2 }}
                                placeholder="age DESC, salary ASC"
                              />
                              <TextField
                                label="Limit"
                                fullWidth
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                sx={{ mb: 2 }}
                                placeholder="10"
                              />
                            </AccordionDetails>
                </Accordion>

                {/* Query Preview */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>Query Preview</Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace', 
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              bgcolor: 'white',
              p: 2,
              border: '1px solid #ddd',
              borderRadius: 1
            }}
          >
            {buildQuery() || 'Query will appear here...'}
          </Typography>
        </Box>
              </Box>
              </MuiThemeProvider>
              )}
            </>
          </BasicTabQueryBuilderSection>

          {/* Submit and Cancel Buttons */}
          <div className="form-group pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : isEditing ? 'Update Filter' : 'Create Filter'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // If parentMode is 'inline', render the original modal
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={() => {}}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-700 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{isEditing ? 'Edit Filter' : 'Create Filter'}</h2>

          <button
            onClick={toggleTheme}
            className="mr-4 px-3 py-1 border rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Toggle theme"
            type="button"
          >
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>

          <button
            onClick={() => {}}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-3xl font-bold leading-none"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-300 dark:border-gray-700 px-6">
          <nav className="flex space-x-6" aria-label="Tabs">
            {['basic', 'styling', 'events', 'validation', 'options', 'queryBuilder'].map((tab) => (
              <button
                key={tab}
                className={`py-3 px-4 -mb-px border-b-2 font-medium ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                onClick={() => setActiveTab(tab as 'basic' | 'styling' | 'events' | 'validation' | 'options' | 'queryBuilder')}
                type="button"
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Form */}
       
          <form className="p-6 space-y-6 max-h-[72vh] overflow-y-auto" onSubmit={handleSubmit} noValidate>
          <BasicTabBasicSection active={activeTab === 'basic'}>
            <>
              {/* Filter Name */}
              <div className="form-group">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
                  Filter Name<span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  value={filter.name || ''}
                  onChange={(e) => updateFilter({ name: e.target.value })}
                  onBlur={() => handleBlur('name')}
                  placeholder="Enter filter name11"
                  className={getFieldClassName('name', 'w-full border')}
                  required
                />
                {errors.name && touched.name && (
                  <div className="text-red-500 text-sm mt-1">{errors.name}</div>
                )}
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Description:</label>
                <textarea
                  value={filter.description || ''}
                  onChange={(e) => updateFilter({ description: e.target.value })}
                  placeholder="Enter filter description22"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                  rows={3}
                />
              </div>
              {/* QueryPreview checkbox and FilterApply dropdown (under Description) */}
  <div className="form-group mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="flex items-center space-x-3">
      <input
        id="queryPreviewCheckbox_inline"
        type="checkbox"
        checked={filter.queryPreview ?? false}
        onChange={(e) => updateFilter({ queryPreview: e.target.checked })}
        className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
      />
      <label htmlFor="queryPreviewCheckbox_inline" className="font-medium text-gray-900 dark:text-gray-100 select-none">
        QueryPreview
      </label>
    </div>

    <div>
      <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">FilterApply:</label>
      <select
        value={filter.filterApply || 'Live'}
        onChange={(e) => updateFilter({ filterApply: e.target.value as 'Live' | 'Manual' })}
        className={getFieldClassName('filterApply', 'w-full border')}
      >
        <option value="Live">Live</option>
        <option value="Manual">Manual</option>
      </select>
      <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
        Live: apply immediately as user changes — Manual: requires explicit Apply
      </div>
    </div>
  </div>

              {/* Filter Type */}
              <div className="form-group">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
                  Filter Type<span className="text-red-500">*</span>:
                </label>
                <select
                  value={filter.type || 'select'}
                  onChange={(e) => updateFilter({ type: e.target.value as Filter['type'] })}
                  onBlur={() => handleBlur('type')}
                  className={getFieldClassName('type', 'w-full border')}
                  required
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select</option>
                  <option value="query">Query Builder</option>
                  <option value="lookup">Lookup</option>
                  <option value="component">Component Style</option>
                </select>
                {errors.type && touched.type && (
                  <div className="text-red-500 text-sm mt-1">{errors.type}</div>
                )}
              </div>

              {/* Web API Type & Static/Dynamic Options */}
              {filter.type === 'select' && (
                <>
                  <div className="form-group">
                    <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
                      Web API Type<span className="text-red-500">*</span>:
                    </label>
                    <select
                      value={filter.webapiType || ''}
                      onChange={(e) =>
                        updateFilter({ webapiType: e.target.value as 'static' | 'dynamic', webapi: '', staticOptions: '' })
                      }
                      className={getFieldClassName('webapiType', 'w-full border')}
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="static">Static</option>
                      <option value="dynamic">Dynamic</option>
                    </select>
                    {errors.webapiType && touched.webapiType && (
                      <div className="text-red-500 text-sm mt-1">{errors.webapiType}</div>
                    )}
                  </div>

                  {filter.webapiType === 'static' && (
                    <div className="form-group">
                      <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
                        Static Values<span className="text-red-500">*</span>:
                      </label>
                      <input
                        type="text"
                        value={filter.staticOptions || ''}
                        onChange={(e) => updateFilter({ staticOptions: e.target.value })}
                        onBlur={() => handleBlur('staticOptions')}
                        placeholder="e.g. Active,Inactive,Pending"
                        className={getFieldClassName('staticOptions', 'w-full border')}
                        required
                      />
                      {errors.staticOptions && touched.staticOptions && (
                        <div className="text-red-500 text-sm mt-1">{errors.staticOptions}</div>
                      )}
                      <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Enter comma-separated values (e.g. Active,Inactive,Pending)
                      </div>
                    </div>
                  )}

                  {filter.webapiType === 'dynamic' && (
                    <div className="form-group">
                      <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
                        Web API<span className="text-red-500">*</span>:
                      </label>
                      <input
                        type="text"
                        value={filter.webapi || ''}
                        onChange={(e) => updateFilter({ webapi: e.target.value })}
                        onBlur={() => handleBlur('webapi')}
                        placeholder="https://example.com/api/endpoint"
                        className={getFieldClassName('webapi', 'w-full border')}
                        required
                      />
                      {errors.webapi && touched.webapi && (
                        <div className="text-red-500 text-sm mt-1">{errors.webapi}</div>
                      )}
                      <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                        Enter the API endpoint to fetch options dynamically.
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Field/Column */}
              <div className="form-group">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
                  Field/Column<span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  value={filter.field || ''}
                  onChange={(e) => {
  const val = e.target.value;
  updateFilter({ field: val });
  validateField('field', { field: val });
}}
onBlur={() => handleBlur('field')}
                  placeholder='E.g. sales_data.status'
                  className={getFieldClassName('field', 'w-full border')}
                  required
                />
                {errors.field && touched.field && (
                  <div className="text-red-500 text-sm mt-1">{errors.field}</div>
                )}
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Enter as "tableName.fieldName" (letters, numbers, underscore, one dot)
                </div>
              </div>

              {/* Default Value */}
              <div className="form-group">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
                  Default Value<span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  value={filter.defaultValue || ''}
                  onChange={(e) => updateFilter({ defaultValue: e.target.value })}
                  onBlur={() => handleBlur('defaultValue')}
                  placeholder="Default value for this filter"
                  className={getFieldClassName('defaultValue', 'w-full border')}
                  required
                />
                {errors.defaultValue && touched.defaultValue && (
                  <div className="text-red-500 text-sm mt-1">{errors.defaultValue}</div>
                )}
              </div>

              {/* Order/Position */}
              <div className="form-group">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">
                  Order/Position<span className="text-red-500">*</span>:
                </label>
                <input
                  type="number"
                  min={1}
                  value={filter.position || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    updateFilter({ position: val });
                  }}
                  onBlur={() => handleBlur('position')}
                  placeholder="Order of appearance"
                  className={getFieldClassName('position', 'w-full border')}
                  required
                />
                {errors.position && touched.position && (
                  <div className="text-red-500 text-sm mt-1">{errors.position}</div>
                )}
              </div>

              {/* Placeholder */}
              <div className="form-group">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Placeholder:</label>
                <input
                  type="text"
                  value={filter.placeholder || ''}
                  onChange={(e) => updateFilter({ placeholder: e.target.value })}
                  placeholder="Placeholder text"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </>
          </BasicTabBasicSection>

          <BasicTabStylingSection active={activeTab === 'styling'}>
            <>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">🎨 Styling & Appearance</h3>
              <div className="form-group mb-4">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">CSS Class:</label>
                <input
                  type="text"
                  value={filter.cssClass || ''}
                  onChange={(e) => updateFilter({ cssClass: e.target.value })}
                  placeholder="e.g. my-custom-class btn-primary"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                />
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Add custom CSS classes (space-separated)
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Inline Style:</label>
                <input
                  type="text"
                  value={filter.inlineStyle || ''}
                  onChange={(e) => updateFilter({ inlineStyle: e.target.value })}
                  onBlur={() => handleBlur('inlineStyle')}
                  placeholder="e.g. color: red; font-weight: bold; background: #f0f0f0;"
                  className={getFieldClassName('inlineStyle', 'w-full border')}
                />
                {errors.inlineStyle && touched.inlineStyle && (
                  <div className="text-red-500 text-sm mt-1">{errors.inlineStyle}</div>
                )}
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  CSS properties separated by semicolons (property: value;)
                </div>
              </div>
            </>
          </BasicTabStylingSection>

          <BasicTabEventsSection active={activeTab === 'events'}>
            <>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">⚡ Event Handlers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'onClick Handler', key: 'onClickHandler' },
                  { label: 'onBlur Handler', key: 'onBlurHandler' },
                  { label: 'onChange Handler', key: 'onChangeHandler' },
                  { label: 'onFocus Handler', key: 'onFocusHandler' },
                  { label: 'onKeyDown Handler', key: 'onKeyDownHandler' },
                  { label: 'onKeyUp Handler', key: 'onKeyUpHandler' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">{label}:</label>
                    <input
                      type="text"
                      value={(filter as Record<string, unknown>)[key] as string || ''}
                      onChange={(e) => updateFilter({ [key]: e.target.value })}
                      placeholder={`e.g. handle${label.replace(' Handler', '')}`}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                ))}
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-xs mt-2">
                Enter function names that will be called on respective events. These functions should be available in your component scope.
              </div>
            </>
          </BasicTabEventsSection>

          <BasicTabValidationSection active={activeTab === 'validation'}>
            <>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Validation Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Min (for number/text):</label>
                  <input
                    type="number"
                    value={filter.min || ''}
                    onChange={(e) => updateFilter({ min: e.target.value })}
                    placeholder="Min value/length"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Max (for number/text):</label>
                  <input
                    type="number"
                    value={filter.max || ''}
                    onChange={(e) => updateFilter({ max: e.target.value })}
                    placeholder="Max value/length"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Regex Pattern:</label>
                  <input
                    type="text"
                    value={filter.pattern || ''}
                    onChange={(e) => updateFilter({ pattern: e.target.value })}
                    onBlur={() => handleBlur('pattern')}
                    placeholder="e.g. ^[A-Za-z0-9]+$"
                    className={getFieldClassName('pattern', 'w-full border')}
                  />
                  {errors.pattern && touched.pattern && (
                    <div className="text-red-500 text-sm mt-1">{errors.pattern}</div>
                  )}
                </div>
              </div>

              <div className="form-group mt-4">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Advanced Config (JSON):</label>
                <textarea
                  value={
                    typeof filter.advancedConfig === 'string'
                      ? filter.advancedConfig
                      : filter.advancedConfig
                        ? JSON.stringify(filter.advancedConfig, null, 2)
                        : ''
                  }
                  onChange={(e) => updateFilter({ advancedConfig: e.target.value })}
                  onBlur={() => handleBlur('advancedConfig')}
                  placeholder='{"key":"value"}'
                  className={getFieldClassName('advancedConfig', 'w-full border font-mono text-xs')}
                  rows={3}
                />
                {errors.advancedConfig && touched.advancedConfig && (
                  <div className="text-red-500 text-sm mt-1">{errors.advancedConfig}</div>
                )}
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Optional: Enter valid JSON for additional configuration
                </div>
              </div>
            </>
          </BasicTabValidationSection>

          <BasicTabOptionsSection active={activeTab === 'options'}>
            <>
              {(filter.type === 'select' ||
                filter.type === 'lookup' ||
                filter.type === 'query' ||
                filter.type === 'component') && (
                <>
                  <div className="form-group">
                    <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Options (comma separated):</label>
                    <input
                      type="text"
                      value={formatListForInput(filter.options, ', ')}
                      onChange={(e) => {
                        const options = e.target.value.split(',').map(opt => opt.trim()).filter(Boolean);
                        updateFilter({ options });
                      }}
                      placeholder="e.g. Active,Inactive,Pending"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div className="form-group flex items-center space-x-6">
                    <label className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                      <input
                        type="checkbox"
                        checked={filter.allowCustom ?? false}
                        onChange={(e) => updateFilter({ allowCustom: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="font-medium select-none cursor-pointer">Allow custom values</span>
                    </label>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Tags (comma separated):</label>
                <input
                  type="text"
                  value={formatListForInput(filter.tags, ', ')}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                    updateFilter({ tags });
                  }}
                  placeholder="Enter tags"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="form-group flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                <input
                  type="checkbox"
                  checked={filter.isActive ?? true}
                  onChange={(e) => updateFilter({ isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  id="active-checkbox"
                />
                <label htmlFor="active-checkbox" className="font-medium select-none cursor-pointer">
                  Active
                </label>
              </div>

              <div className="form-group">
                <label className="flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                  <input
                    type="checkbox"
                    checked={filter.multiSelect ?? false}
                    onChange={(e) => updateFilter({ multiSelect: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium select-none cursor-pointer">Multiselect</span>
                </label>
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Allow users to select multiple values for this filter
                </div>
              </div>

              <div className="form-group flex items-center space-x-6 text-gray-900 dark:text-gray-100">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filter.required ?? false}
                    onChange={(e) => updateFilter({ required: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium select-none cursor-pointer">Required</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filter.visible ?? true}
                    onChange={(e) => updateFilter({ visible: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium select-none cursor-pointer">Visible</span>
                </label>
              </div>
            </>
          </BasicTabOptionsSection>

          <BasicTabQueryBuilderSection active={activeTab === 'queryBuilder'}>
            <>
              <SharedQueryBuilder
                initialData={currentQueryBuilderData}
                onQueryChange={handleSharedQueryChange}
                apiBase="https://intelligentsalesman.com/ism1/API"
              />
              {false && (
              <MuiThemeProvider theme={queryBuilderMuiTheme}>
              <Box
                className="query-builder-panel w-full min-w-0"
                sx={{
                  p: { xs: 1, sm: 2 },
                  width: '100%',
                  maxWidth: '100%',
                  bgcolor: 'background.paper',
                }}
              >
                {/* Error message */}
                {error && (
                  <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                  </Typography>
                )} 

                <FormControl fullWidth sx={{ mb: 2 }} variant="outlined">
                  <InputLabel id="qb-sql-statement-label">SQL Statement</InputLabel>
                  <Select
                    labelId="qb-sql-statement-label"
                    value={statement}
                    label="SQL Statement"
                    onChange={(e) => setStatement(e.target.value)}
                  >
                    {sqlStatements.map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Columns (comma separated or *)"
                  fullWidth
                  value={columns}
                  onChange={(e) => setColumns(e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="*, age, salary"
                  disabled={joinConfig.primaryTable && joinConfig.secondaryTable} // disable if join active
                  helperText={joinConfig.primaryTable && joinConfig.secondaryTable ? 'Disabled when join is configured. Use Output Columns below.' : ''}
                />

                {/* Table Name with Autocomplete */}
                <Autocomplete
                  freeSolo
                  options={tableOptions}
                  loading={tableLoading}
                  value={tableName}
                  slotProps={{
                    popper: {
                      sx: { zIndex: 4000 },
                      disablePortal: false,
                    },
                  }}
                  onChange={(_event, newValue) => {
                    setTableName(newValue || '');
                  }}
                  onInputChange={handleTableInputChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Table Name"
                      fullWidth
                      sx={{ mb: 2 }}
                      placeholder="Select or type to search tables"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {tableLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      disabled={joinConfig.primaryTable && joinConfig.secondaryTable} // disable if join active
                      helperText={joinConfig.primaryTable && joinConfig.secondaryTable ? 'Disabled when join is configured.' : ''}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <li key={key} {...otherProps}>
                        {option}
                      </li>
                    );
                  }}
                />

                {/* Join Configuration Section */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Join Configuration</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Join Type</InputLabel>
                <Select
                  value={joinConfig.joinType}
                  label="Join Type"
                  onChange={e => updateJoinConfig('joinType', e.target.value)}
                >
                  {['INNER', 'LEFT', 'RIGHT', 'FULL OUTER', 'CROSS', 'SELF'].map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                  Select the SQL Join type to combine tables.
                </Typography>
              </FormControl>

              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Primary Table</InputLabel>
                <Select
                  value={joinConfig.primaryTable}
                  label="Primary Table"
                  onChange={e => updateJoinConfig('primaryTable', e.target.value)}
                >
                  {tableOptions.map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Primary Alias"
                value={joinConfig.primaryAlias}
                onChange={e => updateJoinConfig('primaryAlias', e.target.value)}
                placeholder="e.g. c"
                size="small"
                sx={{ minWidth: { xs: '100%', sm: 120 } }}
              />

              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Primary Column</InputLabel>
                <Select
                  value={joinConfig.primaryColumn}
                  label="Primary Column"
                  onChange={e => updateJoinConfig('primaryColumn', e.target.value)}
                  disabled={!joinConfig.primaryTable}
                >
                  {(fieldOptionsMap[joinConfig.primaryTable] || []).map(f => (
                    <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Secondary Table</InputLabel>
                <Select
                  value={joinConfig.secondaryTable}
                  label="Secondary Table"
                  onChange={e => updateJoinConfig('secondaryTable', e.target.value)}
                >
                  {tableOptions.map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Secondary Alias"
                value={joinConfig.secondaryAlias}
                onChange={e => updateJoinConfig('secondaryAlias', e.target.value)}
                placeholder="e.g. o"
                size="small"
                sx={{ minWidth: { xs: '100%', sm: 120 } }}
              />

              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Secondary Column</InputLabel>
                <Select
                  value={joinConfig.secondaryColumn}
                  label="Secondary Column"
                  onChange={e => updateJoinConfig('secondaryColumn', e.target.value)}
                  disabled={!joinConfig.secondaryTable}
                >
                  {(fieldOptionsMap[joinConfig.secondaryTable] || []).map(f => (
                    <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mb: 2 }}>
              <TextField
                label="Join Condition (editable)"
                fullWidth
                value={joinConfig.joinCondition}
                onChange={e => updateJoinConfig('joinCondition', e.target.value)}
                helperText="Auto-generated. You may override for complex joins."
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Alias Tables (Optional)</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Primary Alias"
                  value={joinConfig.primaryAlias}
                  onChange={e => updateJoinConfig('primaryAlias', e.target.value)}
                  size="small"
                  sx={{ minWidth: 140 }}
                />
                <TextField
                  label="Secondary Alias"
                  value={joinConfig.secondaryAlias}
                  onChange={e => updateJoinConfig('secondaryAlias', e.target.value)}
                  size="small"
                  sx={{ minWidth: 140 }}
                />
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                Use aliases for shorter references in custom SQL.
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Output Columns</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                <Button size="small" onClick={() => addAllOutputColumns(joinConfig.primaryAlias, joinConfig.primaryTable)}>+ Add All Primary</Button>
                <Button size="small" onClick={() => clearAllOutputColumns(joinConfig.primaryAlias)}>- Clear Primary</Button>
                <Button size="small" onClick={() => addAllOutputColumns(joinConfig.secondaryAlias, joinConfig.secondaryTable)}>+ Add All Secondary</Button>
                <Button size="small" onClick={() => clearAllOutputColumns(joinConfig.secondaryAlias)}>- Clear Secondary</Button>
              </Box>
              <Box sx={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #ddd', p: 1, borderRadius: 1 }}>
                {(fieldOptionsMap[joinConfig.primaryTable] || []).map(col => {
                  const selected = joinConfig.outputColumns.find(c => c.tableAlias === joinConfig.primaryAlias && c.column === col.value)?.selected || false;
                  return (
                    <FormControlLabel
                      key={`primary-${col.value}`}
                      control={
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleOutputColumn(joinConfig.primaryAlias, col.value)}
                        />
                      }
                      label={`${joinConfig.primaryAlias}.${col.label}`}
                    />
                  );
                })}
                {(fieldOptionsMap[joinConfig.secondaryTable] || []).map(col => {
                  const selected = joinConfig.outputColumns.find(c => c.tableAlias === joinConfig.secondaryAlias && c.column === col.value)?.selected || false;
                  return (
                    <FormControlLabel
                      key={`secondary-${col.value}`}
                      control={
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleOutputColumn(joinConfig.secondaryAlias, col.value)}
                        />
                      }
                      label={`${joinConfig.secondaryAlias}.${col.label}`}
                    />
                  );
                })}
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                Select which columns to include in the final result.
              </Typography>
            </Box>
          </AccordionDetails>
                </Accordion>

                {/* Where Conditions */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Where Conditions</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
            {whereConditions.map((cond) => (
              <Box key={cond.id} sx={{ display: 'flex', flexDirection: 'column', mb: 2, border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', lg: 'row' },
                    gap: 1,
                    alignItems: { xs: 'stretch', lg: 'flex-start' },
                    flexWrap: 'wrap',
                  }}
                >
                  <FormControl sx={{ flex: { lg: 1 }, minWidth: { xs: '100%', lg: 160 } }} fullWidth>
                    <InputLabel id={`qb-where-field-${cond.id}`}>Field</InputLabel>
                    <Select
                      labelId={`qb-where-field-${cond.id}`}
                      value={cond.field}
                      label="Field"
                      onChange={(e) => handleWhereChange(cond.id, 'field', e.target.value)}
                      disabled={fieldsLoading || queryBuilderColumnOptions.length === 0}
                    >
                      {queryBuilderColumnOptions.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: { xs: '100%', sm: 100 } }} size="small">
                    <InputLabel id={`qb-where-op-${cond.id}`}>Operator</InputLabel>
                    <Select
                      labelId={`qb-where-op-${cond.id}`}
                      value={cond.operator}
                      label="Operator"
                      onChange={(e) => handleWhereChange(cond.id, 'operator', e.target.value)}
                    >
                      {operators.map(op => (
                        <MenuItem key={op} value={op}>{op}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: { xs: '100%', sm: 220 } }}>
                    <RadioGroup
                      row
                      value={cond.valueType || 'constant'}
                      onChange={e => handleWhereChange(cond.id, 'valueType', e.target.value)}
                    >
                      <FormControlLabel value="constant" control={<Radio />} label="Constant" />
                      <FormControlLabel value="nested" control={<Radio />} label="Nested Query" />
                    </RadioGroup>
                  </FormControl>
                  <FormControl sx={{ minWidth: { xs: '100%', sm: 110 } }} size="small">
                    <InputLabel id={`qb-where-logic-${cond.id}`}>Logical Op</InputLabel>
                    <Select
                      labelId={`qb-where-logic-${cond.id}`}
                      value={cond.logicalOperator}
                      label="Logical Operator"
                      onChange={(e) => handleWhereChange(cond.id, 'logicalOperator', e.target.value)}
                    >
                      {logicalOperators.map(op => (
                        <MenuItem key={op} value={op}>{op}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Group"
                    type="number"
                    sx={{ width: 80 }}
                    value={cond.conditionGroup}
                    onChange={(e) => handleWhereChange(cond.id, 'conditionGroup', Number(e.target.value))}
                    inputProps={{ min: 1 }}
                  />
                  {whereConditions.length > 1 && (
                    <IconButton color="error" onClick={() => removeWhereCondition(cond.id)}>
                      <RemoveCircleOutline />
                    </IconButton>
                  )}
                </Box>
                {/* Value or Nested Query */}
                {cond.valueType === 'constant' && (
                  <TextField
                    label="Value"
                    sx={{ mt: 1, width: 300 }}
                    value={cond.value}
                    onChange={(e) => handleWhereChange(cond.id, 'value', e.target.value)}
                  />
                )}
                {cond.valueType === 'nested' && (
                  <NestedQueryBuilder
                    nestedQuery={cond.nestedQuery || { function: 'MAX', table: '', column: '', filters: [] }}
                    onChange={q => handleNestedQueryChange(cond.id, q)}
                    level={1}
                    tableOptions={tableOptions}
                    fieldOptionsMap={fieldOptionsMap}
                    fetchFieldsForTable={fetchFieldsForTable}
                  />
                )}
              </Box>
            ))}
            <Button startIcon={<AddCircleOutline />} onClick={addWhereCondition} sx={{ mb: 2 }}>
              Add Condition
            </Button>
          </AccordionDetails>
                </Accordion>

                {/* Window Functions */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Window Functions</Typography>
                    {windowFunctionConfigs.length > 0 && (
                      <Chip 
                        label={`${windowFunctionConfigs.length} function${windowFunctionConfigs.length > 1 ? 's' : ''}`} 
                        size="small" 
                        sx={{ ml: 2 }} 
                      />
                    )}
                  </AccordionSummary>
                  <AccordionDetails>
            {windowFunctionConfigs.map((config) => (
              <Box key={config.id} sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Function</InputLabel>
                    <Select
                      value={config.functionName}
                      label="Function"
                      onChange={(e) => updateWindowFunction(config.id, 'functionName', e.target.value)}
                    >
                      {Object.entries(windowFunctions).map(([key, category]) => [
                        <MenuItem key={`${key}-header`} disabled sx={{ fontWeight: 'bold' }}>
                          {category.label}
                        </MenuItem>,
                        ...category.functions.map(func => (
                          <MenuItem key={func} value={func} sx={{ pl: 3 }}>
                            {func}
                          </MenuItem>
                        ))
                      ]).flat()}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Alias"
                    value={config.alias}
                    onChange={(e) => updateWindowFunction(config.id, 'alias', e.target.value)}
                    sx={{ minWidth: 120 }}
                  />
                  <IconButton color="error" onClick={() => removeWindowFunction(config.id)}>
                    <RemoveCircleOutline />
                  </IconButton>
                </Box>
                {['SUM', 'AVG', 'COUNT', 'MAX', 'MIN', 'FIRST_VALUE', 'LAST_VALUE'].includes(config.functionName) && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Column</InputLabel>
                    <Select
                      value={config.column}
                      label="Column"
                      onChange={(e) => updateWindowFunction(config.id, 'column', e.target.value)}
                    >
                      {queryBuilderColumnOptions.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {config.functionName === 'NTILE' && (
                  <TextField
                    label="N Value"
                    type="number"
                    value={config.nValue}
                    onChange={(e) => updateWindowFunction(config.id, 'nValue', Number(e.target.value))}
                    sx={{ mb: 2, width: 120 }}
                    inputProps={{ min: 1 }}
                  />
                )}
                {['LAG', 'LEAD'].includes(config.functionName) && (
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>Column</InputLabel>
                      <Select
                        value={config.column}
                        label="Column"
                        onChange={(e) => updateWindowFunction(config.id, 'column', e.target.value)}
                      >
                        {queryBuilderColumnOptions.map(f => (
                          <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Offset"
                      type="number"
                      value={config.offsetValue}
                      onChange={(e) => updateWindowFunction(config.id, 'offsetValue', Number(e.target.value))}
                      sx={{ width: 100 }}
                      inputProps={{ min: 1 }}
                    />
                    <TextField
                      label="Default Value"
                      value={config.defaultValue}
                      onChange={(e) => updateWindowFunction(config.id, 'defaultValue', e.target.value)}
                      sx={{ width: 120 }}
                    />
                  </Box>
                )}
                {config.functionName === 'NTH_VALUE' && (
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>Column</InputLabel>
                      <Select
                        value={config.column}
                        label="Column"
                        onChange={(e) => updateWindowFunction(config.id, 'column', e.target.value)}
                      >
                        {queryBuilderColumnOptions.map(f => (
                          <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="N Value"
                      type="number"
                      value={config.nValue}
                      onChange={(e) => updateWindowFunction(config.id, 'nValue', Number(e.target.value))}
                      sx={{ width: 100 }}
                      inputProps={{ min: 1 }}
                    />
                  </Box>
                )}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id={`qb-ordering-strategy-${config.id}`}>Ordering Strategy</InputLabel>
                  <Select
                    labelId={`qb-ordering-strategy-${config.id}`}
                    value={
                      config.orderingStrategy &&
                      orderingStrategies.some(s => s.value === config.orderingStrategy)
                        ? config.orderingStrategy
                        : 'across'
                    }
                    label="Ordering Strategy"
                    onChange={(e: SelectChangeEvent<string>) =>
                      updateWindowFunction(config.id, 'orderingStrategy', e.target.value)
                    }
                  >
                    {orderingStrategies.map(strategy => (
                      <MenuItem key={strategy.value} value={strategy.value}>
                        <Box>
                          <Typography variant="body2">{strategy.label}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {strategy.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="Partition By"
                    value={config.partitionBy}
                    onChange={(e) => updateWindowFunction(config.id, 'partitionBy', e.target.value)}
                    sx={{ flex: 1 }}
                    placeholder="department, region"
                  />
                  <TextField
                    label={config.orderingStrategy === 'custom' ? 'Order By (Custom)' : 'Order By (Auto-generated)'}
                    value={config.orderingStrategy === 'custom' ? config.orderBy : getWindowOverOrderBy(config)}
                    onChange={(e) => updateWindowFunction(config.id, 'orderBy', e.target.value)}
                    sx={{ flex: 1 }}
                    placeholder="salary DESC, age ASC"
                    disabled={config.orderingStrategy !== 'custom'}
                  />
                </Box>
                <TextField
                  label="Frame Clause (Optional)"
                  value={config.frameClause}
                  onChange={(e) => updateWindowFunction(config.id, 'frameClause', e.target.value)}
                  fullWidth
                  placeholder="ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW"
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                  Preview: {buildWindowFunctionSQL(config)}
                </Typography>
              </Box>
            ))}
            <Button startIcon={<AddCircleOutline />} onClick={addWindowFunction}>
              Add Window Function
            </Button>
          </AccordionDetails>
                </Accordion>

                {/* Other SQL Clauses */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Additional SQL Clauses</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                              <TextField
                                label="Group By (comma separated)"
                                fullWidth
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value)}
                                sx={{ mb: 2 }}
                                placeholder="age, status"
                              />
                              <TextField
                                label="Having Clause"
                                fullWidth
                                value={having}
                                onChange={(e) => setHaving(e.target.value)}
                                sx={{ mb: 2 }}
                                placeholder="COUNT(age) > 1"
                              />
                              <TextField
                                label="Order By"
                                fullWidth
                                value={orderBy}
                                onChange={(e) => setOrderBy(e.target.value)}
                                sx={{ mb: 2 }}
                                placeholder="age DESC, salary ASC"
                              />
                              <TextField
                                label="Limit"
                                fullWidth
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                sx={{ mb: 2 }}
                                placeholder="10"
                              />
                            </AccordionDetails>
                </Accordion>

                {/* Query Preview */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>Query Preview</Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace', 
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              bgcolor: 'white',
              p: 2,
              border: '1px solid #ddd',
              borderRadius: 1
            }}
          >
            {buildQuery() || 'Query will appear here...'}
          </Typography>
        </Box>
              </Box>
              </MuiThemeProvider>
              )}
            </>
          </BasicTabQueryBuilderSection>

          {/* Submit Button */}
          <div className="form-group pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : isEditing ? 'Update Filter' : 'Create Filter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BasicTab;