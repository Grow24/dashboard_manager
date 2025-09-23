import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import debounce from 'lodash.debounce';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
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

interface Filter {
  id?: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'query' | 'lookup' | 'component';
  config?: any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  isActive?: boolean;
  description?: string;
  tags?: string[];
  field?: string;
  defaultValue?: any;
  placeholder?: string;
  required?: boolean;
  visible?: boolean;
  position?: number;
  min?: any;
  max?: any;
  pattern?: string;
  options?: string[];
  multiSelect?: boolean;
  allowCustom?: boolean;
  advancedConfig?: string | object;
  webapi?: string;
  webapiType?: 'static' | 'dynamic';
  staticOptions?: string;
  cssClass?: string;
  inlineStyle?: string;
  onClickHandler?: string;
  onBlurHandler?: string;
  onChangeHandler?: string;
  onFocusHandler?: string;
  onKeyDownHandler?: string;
  onKeyUpHandler?: string;
}

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
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  editingFilter: Filter | null;
  setEditingFilter: (filter: Filter | null) => void;
  newFilter: Partial<Filter>;
  setNewFilter: (filter: Partial<Filter>) => void;
  resetNewFilter: () => void;
  onSubmit?: () => void;
}

// --- Theme Context and Provider ---

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {/* Add 'dark' class to root div for Tailwind dark mode */}
      <div className={theme === 'dark' ? 'dark' : ''}>{children}</div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// --- Query Builder Inner Components and Types ---

const sqlStatements = ['SELECT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
const operators = ['=', '!=', '>', '<', '>=', '<=', 'IN', 'LIKE'];
const logicalOperators = ['AND', 'OR'];

const windowFunctions = {
  aggregate: {
    label: 'Aggregate Functions',
    functions: ['SUM', 'AVG', 'COUNT', 'MAX', 'MIN']
  },
  ranking: {
    label: 'Ranking Functions', 
    functions: ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE']
  },
  value: {
    label: 'Value Functions',
    functions: ['LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE']
  },
  distribution: {
    label: 'Distribution Functions',
    functions: ['PERCENT_RANK', 'CUME_DIST']
  }
};

const orderingStrategies = [
  { value: 'across', label: 'Across (ORDER BY column1)', description: 'Sort across row-like dimension' },
  { value: 'down', label: 'Down (ORDER BY column2)', description: 'Sort by vertical/hierarchical field' },
  { value: 'across_then_down', label: 'Across then Down', description: 'Prioritize row dimension, then column' },
  { value: 'down_then_across', label: 'Down then Across', description: 'Prioritize column dimension, then row' },
  { value: 'nested_loop', label: 'Nested Loop-like', description: 'Repeats logic over subgroups' },
  { value: 'custom', label: 'Custom', description: 'Define your own ordering' }
];

// --- Nested Query Types ---
const aggregateFunctions = ['MAX', 'MIN', 'AVG', 'COUNT', 'SUM'];

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

  const updateFilter = (id: number, key: keyof WhereCondition, value: any) => {
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

// --- FilterModal Component ---

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  editingFilter,
  setEditingFilter,
  newFilter,
  setNewFilter,
  resetNewFilter,
  onSubmit,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'styling' | 'events' | 'validation' | 'options' | 'queryBuilder'>('basic');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  

  const { theme, toggleTheme } = useTheme();

  const filter = isEditing && editingFilter ? editingFilter : newFilter;

  // --- States for Query Builder tab (replacing old queryBuilder tab content) ---

  // Basic states
  const [name, setName] = useState(filter.name || '');
  const [statement, setStatement] = useState(sqlStatements[0]);
  const [columns, setColumns] = useState('*');
  const [tableName, setTableName] = useState('');
  const [whereConditions, setWhereConditions] = useState<WhereCondition[]>([
    { id: 1, field: '', operator: '=', value: '', logicalOperator: 'AND', conditionGroup: 1, valueType: 'constant' }
  ]);
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

  // For table names dropdown
  const [tableOptions, setTableOptions] = useState<string[]>([]);
  const [tableLoading, setTableLoading] = useState(false);

  // For fields of selected table
  const [fieldOptions, setFieldOptions] = useState<{ label: string; value: string }[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  // For all tables' fields (for nested queries and join output columns)
  const [fieldOptionsMap, setFieldOptionsMap] = useState<{ [table: string]: { label: string; value: string }[] }>({});

  // Track current input value for highlighting
  const [tableInputValue, setTableInputValue] = useState('');

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
          } catch (e) {
            console.error(e);
            setTableOptions([]);
          } finally {
            setTableLoading(false);
          }
        }, 300);
      };
    })(),
    []
  );

  // Fetch fields for a table (for nested queries and join output columns)
  const fetchFieldsForTable = useCallback(async (table: string) => {
    if (!table || fieldOptionsMap[table]) return;
    try {
      const res = await fetch(`https://intelligentsalesman.com/ism1/API/gettableinfo.php/api/columns?table=${encodeURIComponent(table)}`);
      if (!res.ok) throw new Error('Failed to fetch columns');
      const data: string[] = await res.json();
      setFieldOptionsMap(prev => ({ ...prev, [table]: data.map(col => ({ label: col, value: col })) }));
    } catch (e) {
      setFieldOptionsMap(prev => ({ ...prev, [table]: [] }));
    }
  }, [fieldOptionsMap]);

  // Reset form when modal opens or tab changes to queryBuilder
  useEffect(() => {
    if (isOpen && activeTab === 'queryBuilder') {
      setName(filter.name || '');
      setStatement(sqlStatements[0]);
      setColumns('*');
      setTableName('');
      setWhereConditions([
        { id: 1, field: '', operator: '=', value: '', logicalOperator: 'AND', conditionGroup: 1, valueType: 'constant' }
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
        outputColumns: []
      });
    }
  }, [isOpen, activeTab, filter.name]);

  // When user types in table name input
  const handleTableInputChange = (_event: any, value: string, reason: string) => {
    if (reason === 'input') {
      setTableInputValue(value);
      debouncedFetchTables(value);
    }
  };

  function handleFilterClick(_event) {
  console.log('Filter clicked', _event);
}

function handleFilterChange(_event) {
  console.log('Filter changed', _event.target.value);
}

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
        const res = await fetch(`https://intelligentsalesman.com/ism1/API/gettableinfo.php/api/columns?table=${encodeURIComponent(tableName)}`);
        if (!res.ok) throw new Error('Failed to fetch columns');
        const data: string[] = await res.json();
        const options = data.map(col => ({ label: col, value: col }));
        setFieldOptions(options);
        setFieldOptionsMap(prev => ({ ...prev, [tableName]: options }));

        // Update whereConditions fields if empty or invalid
        setWhereConditions(conds =>
          conds.map(cond => {
            if (!options.find(o => o.value === cond.field)) {
              return { ...cond, field: options.length ? options[0].value : '' };
            }
            return cond;
          })
        );
      } catch (e) {
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
  const updateJoinConfig = (key: keyof JoinConfig, value: any) => {
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
        return { ...jc, outputColumns: [...jc.outputColumns, { tableAlias, column, selected: true }] };
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
  const handleWhereChange = (id: number, key: keyof WhereCondition, value: any) => {
    setWhereConditions(conds =>
      conds.map(cond => cond.id === id ? { ...cond, [key]: value } : cond)
    );
  };

  const addWhereCondition = () => {
    setWhereConditions(conds => [
      ...conds,
      {
        id: conds.length ? Math.max(...conds.map(c => c.id)) + 1 : 1,
        field: fieldOptions.length ? fieldOptions[0].value : '',
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
        orderingStrategy: 'custom',
        frameClause: ''
      }
    ]);
  };

  const removeWindowFunction = (id: number) => {
    setWindowFunctionConfigs(configs => configs.filter(config => config.id !== id));
  };

  const updateWindowFunction = (id: number, key: keyof WindowFunctionConfig, value: any) => {
    setWindowFunctionConfigs(configs =>
      configs.map(config => config.id === id ? { ...config, [key]: value } : config)
    );
  };

  // Generate ORDER BY clause based on strategy
  const generateOrderByFromStrategy = (strategy: string, config: WindowFunctionConfig) => {
    const fields = fieldOptions.map(f => f.value);
    if (fields.length < 2) return config.orderBy;

    switch (strategy) {
      case 'across':
        return fields[0] || '';
      case 'down':
        return fields[1] || fields[0] || '';
      case 'across_then_down':
        return fields.length >= 2 ? `${fields[0]}, ${fields[1]}` : fields[0] || '';
      case 'down_then_across':
        return fields.length >= 2 ? `${fields[1]}, ${fields[0]}` : fields[0] || '';
      case 'nested_loop':
        return fields.slice(0, 2).join(', ');
      default:
        return config.orderBy;
    }
  };

  // Build window function SQL
  const buildWindowFunctionSQL = (config: WindowFunctionConfig) => {
    let sql = config.functionName;
    if (['SUM', 'AVG', 'COUNT', 'MAX', 'MIN'].includes(config.functionName)) {
      sql += `(${config.column || '*'})`;
    } else if (config.functionName === 'NTILE') {
      sql += `(${config.nValue || 1})`;
    } else if (['LAG', 'LEAD'].includes(config.functionName)) {
      sql += `(${config.column || fieldOptions[0]?.value || 'column'}`;
      if (config.offsetValue > 1) sql += `, ${config.offsetValue}`;
      if (config.defaultValue) sql += `, '${config.defaultValue}'`;
      sql += ')';
    } else if (config.functionName === 'NTH_VALUE') {
      sql += `(${config.column || fieldOptions[0]?.value || 'column'}, ${config.nValue || 1})`;
    } else if (['FIRST_VALUE', 'LAST_VALUE'].includes(config.functionName)) {
      sql += `(${config.column || fieldOptions[0]?.value || 'column'})`;
    } else {
      sql += '()';
    }
    sql += ' OVER (';
    const overParts = [];
    if (config.partitionBy) {
      overParts.push(`PARTITION BY ${config.partitionBy}`);
    }
    const orderBy = config.orderingStrategy === 'custom' 
      ? config.orderBy 
      : generateOrderByFromStrategy(config.orderingStrategy, config);
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
  const buildNestedQuerySQL = (q: NestedQuery, level = 1): string => {
    if (!q.function || !q.table || !q.column) return '';
    let sql = `SELECT ${q.function}(${q.column}) FROM ${q.table}`;
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
          return `(${f.field} ${f.operator} ${val})${idx < validFilters.length - 1 ? ' ' + f.logicalOperator + ' ' : ''}`;
        }).join('');
        sql += ` WHERE ${filterStr}`;
      }
    }
    // Nested query as value
    if (q.nestedQuery) {
      sql += ` AND ${q.column} = (${buildNestedQuerySQL(q.nestedQuery, level + 1)})`;
    }
    return sql;
  };

  // --- Build the complete SQL query with join support ---
  const buildQuery = () => {
    // If join is configured (both tables selected), build join query
    if (joinConfig.primaryTable && joinConfig.secondaryTable) {
      // SELECT clause from output columns or fallback to *
      const selectClause = buildOutputColumnsSQL();

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
            return `(${cond.field} ${cond.operator} ${val})${idx < validConditions.length - 1 ? ' ' + cond.logicalOperator + ' ' : ''}`;
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
          return `(${cond.field} ${cond.operator} ${val})${idx < validConditions.length - 1 ? ' ' + cond.logicalOperator + ' ' : ''}`;
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
    let newUpdates = { ...updates };
    if ('type' in updates && updates.type !== 'select') {
      newUpdates.webapi = '';
      newUpdates.webapiType = undefined;
      newUpdates.staticOptions = '';
    }
    if ('webapiType' in updates) {
      if (updates.webapiType === 'static') {
        newUpdates.webapi = '';
      }
      if (updates.webapiType === 'dynamic') {
        newUpdates.staticOptions = '';
      }
    }

    if (isEditing && editingFilter) {
      setEditingFilter({ ...editingFilter, ...newUpdates });
    } else {
      setNewFilter({ ...newFilter, ...newUpdates });
    }

    // Clear errors for updated fields
    const newErrors = { ...errors };
    Object.keys(updates).forEach(key => {
      delete newErrors[key as keyof ValidationErrors];
    });
    setErrors(newErrors);
  };

 const handleBlur = (fieldName: string) => {
    setTouched({ ...touched, [fieldName]: true });
    validateField(fieldName);
  };

  const dynamicFieldPattern = /^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/;
  const staticFieldPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const validateField = (fieldName: string) => {
    const newErrors = { ...errors };

    switch (fieldName) {
      case 'name':
        if (!filter.name || filter.name.trim() === '') {
          newErrors.name = 'Filter Name is required';
        } else if (filter.name.trim().length < 2) {
          newErrors.name = 'Filter Name must be at least 2 characters';
        } else {
          delete newErrors.name;
        }
        break;
      case 'type':
        if (!filter.type) {
          newErrors.type = 'Filter Type is required';
        } else {
          delete newErrors.type;
        }
        break;
      case 'webapiType':
        if (filter.type === 'select' && !filter.webapiType) {
          newErrors.webapiType = 'Web API Type is required';
        } else {
          delete newErrors.webapiType;
        }
        break;
      case 'staticOptions':
        if (filter.type === 'select' && filter.webapiType === 'static') {
          if (!filter.staticOptions || filter.staticOptions.trim() === '') {
            newErrors.staticOptions = 'Static values are required';
          } else {
            delete newErrors.staticOptions;
          }
        } else {
          delete newErrors.staticOptions;
        }
        break;
      case 'webapi':
        if (filter.type === 'select' && filter.webapiType === 'dynamic') {
          if (!filter.webapi || filter.webapi.trim() === '') {
            newErrors.webapi = 'Web API is required for Dynamic type';
          } else if (!/^https?:\/\//.test(filter.webapi.trim())) {
            newErrors.webapi = 'Enter a valid URL (http/https)';
          } else {
            delete newErrors.webapi;
          }
        } else {
          delete newErrors.webapi;
        }
        break;
      case 'field':
        if (!filter.field || filter.field.trim() === '') {
          newErrors.field = 'Field/Column is required';
        } else {
          if (filter.webapiType === 'dynamic') {
            if (!dynamicFieldPattern.test(filter.field.trim())) {
              newErrors.field = 'For Dynamic type, enter as "table.column" (letters, numbers, underscore, dot)';
            } else {
              delete newErrors.field;
            }
          } else {
            if (!staticFieldPattern.test(filter.field.trim())) {
              newErrors.field = 'For Static type, enter only "column" (letters, numbers, underscore)';
            } else {
              delete newErrors.field;
            }
          }
        }
        break;
      case 'defaultValue':
        if (!filter.defaultValue || filter.defaultValue.toString().trim() === '') {
          newErrors.defaultValue = 'Default Value is required';
        } else {
          delete newErrors.defaultValue;
        }
        break;
      case 'position':
        if (!filter.position || filter.position < 1) {
          newErrors.position = 'Order/Position is required and must be greater than 0';
        } else {
          delete newErrors.position;
        }
        break;
      case 'advancedConfig':
        const advConfigStr = typeof filter.advancedConfig === 'string'
          ? filter.advancedConfig
          : filter.advancedConfig
            ? JSON.stringify(filter.advancedConfig)
            : '';
        if (advConfigStr.trim()) {
          try {
            JSON.parse(advConfigStr);
            delete newErrors.advancedConfig;
          } catch (e) {
            newErrors.advancedConfig = 'Invalid JSON format';
          }
        } else {
          delete newErrors.advancedConfig;
        }
        break;
      case 'inlineStyle':
        if (filter.inlineStyle && filter.inlineStyle.trim()) {
          const styles = filter.inlineStyle.split(';').filter(s => s.trim());
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
    }

    setErrors(newErrors);
  };

  // Validation functions (existing)...

  const validateAll = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!filter.name || filter.name.trim() === '') {
      newErrors.name = 'Filter Name is required';
    } else if (filter.name.trim().length < 2) {
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

    if (!filter.field || filter.field.trim() === '') {
      newErrors.field = 'Field/Column is required';
    } else {
      if (filter.webapiType === 'dynamic') {
        if (!dynamicFieldPattern.test(filter.field.trim())) {
          newErrors.field = 'For Dynamic type, enter as "table.column" (letters, numbers, underscore, dot)';
        }
      } else {
        if (!staticFieldPattern.test(filter.field.trim())) {
          newErrors.field = 'For Static type, enter only "column" (letters, numbers, underscore)';
        }
      }
    }

    if (!filter.defaultValue || filter.defaultValue.toString().trim() === '') {
      newErrors.defaultValue = 'Default Value is required';
    }

    if (!filter.position || filter.position < 1) {
      newErrors.position = 'Order/Position is required and must be greater than 0';
    }

    const advConfigStr = typeof filter.advancedConfig === 'string'
      ? filter.advancedConfig
      : filter.advancedConfig
        ? JSON.stringify(filter.advancedConfig)
        : '';

    if (advConfigStr.trim()) {
      try {
        JSON.parse(advConfigStr);
      } catch (e) {
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  // Validate all fields (existing)...

  // Handle submit: combine all tab data and send to API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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
    });

    if (!validateAll()) {
      setIsSubmitting(false);
      return;
    }

    // Validate Query Builder tab name if active
    if (activeTab === 'queryBuilder' && !name.trim()) {
      setError('Filter name is required in Query Builder tab');
      setIsSubmitting(false);
      return;
    }

    // Prepare payload combining all tabs data
    const payload = {
      name: filter.name || name,
      type: filter.type,
      field: filter.field,
      defaultValue: filter.defaultValue,
      position: filter.position,
      description: filter.description || '',
      placeholder: filter.placeholder || '',
      isActive: filter.isActive ?? true,
      required: filter.required ?? false,
      visible: filter.visible ?? true,
      multiSelect: filter.multiSelect ?? false,
      allowCustom: filter.allowCustom ?? false,
      tags: filter.tags || [],
      options: filter.options || [],
      min: filter.min || null,
      max: filter.max || null,
      pattern: filter.pattern || '',
      webapiType: filter.webapiType || '',
      staticOptions: filter.staticOptions || '',
      webapi: filter.webapi || '',
      advancedConfig: typeof filter.advancedConfig === 'string'
        ? filter.advancedConfig
        : filter.advancedConfig
          ? JSON.stringify(filter.advancedConfig)
          : '',
      cssClass: filter.cssClass || '',
      inlineStyle: filter.inlineStyle || '',
      onClickHandler: filter.onClickHandler || '',
      onBlurHandler: filter.onBlurHandler || '',
      onChangeHandler: filter.onChangeHandler || '',
      onFocusHandler: filter.onFocusHandler || '',
      onKeyDownHandler: filter.onKeyDownHandler || '',
      onKeyUpHandler: filter.onKeyUpHandler || '',
      config: filter.config || {},

      // Query Builder tab data
      queryBuilder: {
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
        queryPreview: buildQuery(),
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(isEditing && filter.id ? { id: filter.id } : {}),
    };

    try {
      const response = await fetch('https://intelligentsalesman.com/ism1/API/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert('Failed to save filter! ' + errorText);
        setIsSubmitting(false);
        return;
      }

      await response.json();

      alert(isEditing ? 'Filter updated successfully!' : 'Filter created successfully!');
      if (isEditing) {
        setEditingFilter(null);
      } else {
        resetNewFilter();
      }

      onSubmit?.();
      onClose();
    } catch (error) {
      alert('An error occurred: ' + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Updated getFieldClassName to be theme-aware (existing)...
 const getFieldClassName = (fieldName: string, baseClassName: string) => {
    const hasError = errors[fieldName as keyof ValidationErrors] && touched[fieldName];
    const base = `${baseClassName} rounded-md px-3 py-2 focus:outline-none focus:ring-2`;
    const errorClasses = 'border-red-500 focus:ring-red-400 dark:border-red-700 dark:focus:ring-red-600';
    const lightClasses = 'border-gray-300 focus:ring-blue-400 bg-white text-black';
    const darkClasses = 'border-gray-600 focus:ring-blue-600 bg-gray-800 text-white';

    return `${base} ${hasError ? errorClasses : theme === 'dark' ? darkClasses : lightClasses}`;
  };
  useEffect(() => {
    if (!isEditing && !filter.type) {
      updateFilter({ type: 'select' });
    }
  }, [isEditing, filter.type]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
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
            onClick={onClose}
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
                onClick={() => setActiveTab(tab as any)}
                type="button"
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Form */}
        <form className="p-6 space-y-6" onSubmit={handleSubmit} noValidate>
           {activeTab === 'basic' && (
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
                  placeholder="Enter filter name"
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
                  placeholder="Enter filter description"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                  rows={3}
                />
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
                  onChange={(e) => updateFilter({ field: e.target.value })}
                  onBlur={() => handleBlur('field')}
                  placeholder={
                    filter.webapiType === 'dynamic'
                      ? 'E.g. tableName.fieldName (required for Dynamic)'
                      : 'E.g. fieldName (required for Static)'
                  }
                  className={getFieldClassName('field', 'w-full border')}
                  required
                />
                {errors.field && touched.field && (
                  <div className="text-red-500 text-sm mt-1">{errors.field}</div>
                )}
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  {filter.webapiType === 'dynamic'
                    ? 'Enter as "tableName.fieldName" (letters, numbers, underscore, dot)'
                    : 'Enter only "fieldName" (letters, numbers, underscore)'}
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
          )}

          {activeTab === 'styling' && (
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
          )}

          {activeTab === 'events' && (
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
                      value={(filter as any)[key] || ''}
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
          )}

          {activeTab === 'validation' && (
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
                    placeholder="e.g. ^[A-Za-z0-9]+$"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
                  />
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
          )}

          {activeTab === 'options' && (
            <>
              {(filter.type === 'select' || filter.type === 'lookup') && (
                <>
                  <div className="form-group">
                    <label className="block font-medium mb-1 text-gray-900 dark:text-gray-100">Options (comma separated):</label>
                    <input
                      type="text"
                      value={filter.options?.join(', ') || ''}
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
                  value={filter.tags?.join(', ') || ''}
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
          )}

          {activeTab === 'queryBuilder' && (
            <>
              {/* New Query Builder Tab Content */}
              <Box sx={{ p: 2 }}>
                {/* Error message */}
                {error && (
                  <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                  </Typography>
                )}

              

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>SQL Statement</InputLabel>
                  <Select value={statement} label="SQL Statement" onChange={(e) => setStatement(e.target.value)}>
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

              <FormControl sx={{ minWidth: 100 }}>
                <InputLabel>Primary Alias</InputLabel>
                <TextField
                  value={joinConfig.primaryAlias}
                  onChange={e => updateJoinConfig('primaryAlias', e.target.value)}
                  placeholder="Alias"
                  size="small"
                />
              </FormControl>

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

              <FormControl sx={{ minWidth: 100 }}>
                <InputLabel>Secondary Alias</InputLabel>
                <TextField
                  value={joinConfig.secondaryAlias}
                  onChange={e => updateJoinConfig('secondaryAlias', e.target.value)}
                  placeholder="Alias"
                  size="small"
                />
              </FormControl>

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
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Field</InputLabel>
                    <Select
                      value={cond.field}
                      label="Field"
                      onChange={(e) => handleWhereChange(cond.id, 'field', e.target.value)}
                      disabled={fieldsLoading || fieldOptions.length === 0}
                    >
                      {fieldOptions.map(f => (
                        <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ width: 100 }}>
                    <InputLabel>Operator</InputLabel>
                    <Select
                      value={cond.operator}
                      label="Operator"
                      onChange={(e) => handleWhereChange(cond.id, 'operator', e.target.value)}
                    >
                      {operators.map(op => (
                        <MenuItem key={op} value={op}>{op}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ width: 120 }}>
                    <RadioGroup
                      row
                      value={cond.valueType || 'constant'}
                      onChange={e => handleWhereChange(cond.id, 'valueType', e.target.value)}
                    >
                      <FormControlLabel value="constant" control={<Radio />} label="Constant" />
                      <FormControlLabel value="nested" control={<Radio />} label="Nested Query" />
                    </RadioGroup>
                  </FormControl>
                  <FormControl sx={{ width: 100 }}>
                    <InputLabel>Logical Op</InputLabel>
                    <Select
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
                      {fieldOptions.map(f => (
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
                        {fieldOptions.map(f => (
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
                        {fieldOptions.map(f => (
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
                  <InputLabel>Ordering Strategy</InputLabel>
                  <Select
                    value={config.orderingStrategy}
                    label="Ordering Strategy"
                    onChange={(e) => updateWindowFunction(config.id, 'orderingStrategy', e.target.value)}
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
                    value={config.orderingStrategy === 'custom' ? config.orderBy : generateOrderByFromStrategy(config.orderingStrategy, config)}
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
            </>
          )}

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

// --- FilterManager Component with Theme Toggle ---

const FilterManager: React.FC = () => {
  const [isCreatingFilter, setIsCreatingFilter] = useState(false);
  const [editingFilter, setEditingFilter] = useState<Filter | null>(null);
  const [newFilter, setNewFilter] = useState<Partial<Filter>>({
    name: '',
    type: 'select',
    position: 1,
    isActive: true,
    required: false,
    visible: true,
    multiSelect: false,
    allowCustom: false,
    tags: [],
    options: [],
    config: {},
  });

  const { theme, toggleTheme } = useTheme();

  const resetNewFilter = () => {
    setNewFilter({
      name: '',
      type: 'select',
      position: 1,
      isActive: true,
      required: false,
      visible: true,
      multiSelect: false,
      allowCustom: false,
      tags: [],
      options: [],
      config: {},
    });
  };

  return (
    <div className="p-4">
      {/* Button to open modal */}
      <button
        onClick={() => setIsCreatingFilter(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Create Filter
      </button>

      <FilterModal
        isOpen={isCreatingFilter}
        onClose={() => {
          setIsCreatingFilter(false);
          resetNewFilter();
          setEditingFilter(null);
        }}
        isEditing={false}
        editingFilter={editingFilter}
        setEditingFilter={setEditingFilter}
        newFilter={newFilter}
        setNewFilter={setNewFilter}
        resetNewFilter={resetNewFilter}
        onSubmit={() => {
          setIsCreatingFilter(false);
          resetNewFilter();
        }}
      />
    </div>
  );
};

// --- Export wrapped with ThemeProvider ---

const FilterManagerWithTheme: React.FC = () => (
  <ThemeProvider>
    <FilterManager />
  </ThemeProvider>
);

export default FilterManagerWithTheme;