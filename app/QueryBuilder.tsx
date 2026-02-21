import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import { AddCircleOutline, RemoveCircleOutline, ExpandMore } from '@mui/icons-material';

// Types
export interface WhereCondition {
  id: number;
  field: string;
  operator: string;
  value: string;
  logicalOperator: string;
  conditionGroup: number;
  valueType?: 'constant' | 'nested';
  nestedQuery?: NestedQuery;
}

export interface NestedQuery {
  function: string;
  table: string;
  column: string;
  filters: WhereCondition[];
  nestedQuery?: NestedQuery;
}

export interface WindowFunctionConfig {
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

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER' | 'CROSS' | 'SELF';

export interface JoinConfig {
  joinType: JoinType;
  primaryTable: string;
  primaryAlias: string;
  primaryColumn: string;
  secondaryTable: string;
  secondaryAlias: string;
  secondaryColumn: string;
  joinCondition: string;
  outputColumns: { tableAlias: string; column: string; selected: boolean }[];
}

export interface QueryBuilderData {
  statement: string;
  columns: string;
  tableName: string;
  whereConditions: WhereCondition[];
  groupBy: string;
  having: string;
  orderBy: string;
  limit: string;
  windowFunctionConfigs: WindowFunctionConfig[];
  joinConfig: JoinConfig;
  queryPreview: string;
}

interface QueryBuilderProps {
  initialData?: QueryBuilderData;
  onQueryChange?: (data: QueryBuilderData) => void;
  apiBase?: string;
  tablesUsed?: string;
  onTablesUsedChange?: (tables: string) => void;
}

// Constants
const sqlStatements = ['SELECT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
const operators = ['=', '!=', '>', '<', '>=', '<=', 'IN', 'LIKE'];
const logicalOperators = ['AND', 'OR'];
const aggregateFunctions = ['MAX', 'MIN', 'AVG', 'COUNT', 'SUM'];

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

// NestedQueryBuilder Component
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
            <RemoveCircleOutline />
          </IconButton>
        </Box>
      ))}
      <Button startIcon={<AddCircleOutline />} onClick={addFilter} sx={{ mb: 2 }}>
        Add Filter
      </Button>
      {level < 3 && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onChange({
              ...nestedQuery, nestedQuery: nestedQuery.nestedQuery || {
                function: 'MAX',
                table: '',
                column: '',
                filters: []
              }
            })}
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

// Main QueryBuilder Component
const QueryBuilder: React.FC<QueryBuilderProps> = ({
  initialData,
  onQueryChange,
  apiBase = 'https://intelligentsalesman.com/ism1/API',
  onTablesUsedChange
}) => {
  // Query Builder States
  const [statement, setStatement] = useState(initialData?.statement || sqlStatements[0]);
  const [columns, setColumns] = useState(initialData?.columns || '*');
  const [tableName, setTableName] = useState(initialData?.tableName || '');
  const [whereConditions, setWhereConditions] = useState<WhereCondition[]>(
    initialData?.whereConditions || [
      { id: 1, field: '', operator: '=', value: '', logicalOperator: 'AND', conditionGroup: 1, valueType: 'constant' }
    ]
  );
  const [groupBy, setGroupBy] = useState(initialData?.groupBy || '');
  const [having, setHaving] = useState(initialData?.having || '');
  const [orderBy, setOrderBy] = useState(initialData?.orderBy || '');
  const [limit, setLimit] = useState(initialData?.limit || '');
  const [windowFunctionConfigs, setWindowFunctionConfigs] = useState<WindowFunctionConfig[]>(
    initialData?.windowFunctionConfigs || []
  );
  const [joinConfig, setJoinConfig] = useState<JoinConfig>(
    initialData?.joinConfig || {
      joinType: 'INNER',
      primaryTable: '',
      primaryAlias: 'c',
      primaryColumn: '',
      secondaryTable: '',
      secondaryAlias: 'o',
      secondaryColumn: '',
      joinCondition: '',
      outputColumns: []
    }
  );

  // Table and field options
  const [tableOptions, setTableOptions] = useState<string[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<{ label: string; value: string }[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldOptionsMap, setFieldOptionsMap] = useState<{ [table: string]: { label: string; value: string }[] }>({});
  const [tableInputValue, setTableInputValue] = useState('');

  // Update tables used when relevant fields change
  useEffect(() => {
    const tablesSet = new Set<string>();

    if (tableName.trim()) {
      tablesSet.add(tableName.trim());
    }

    if (joinConfig.primaryTable.trim()) {
      tablesSet.add(joinConfig.primaryTable.trim());
    }

    if (joinConfig.secondaryTable.trim()) {
      tablesSet.add(joinConfig.secondaryTable.trim());
    }

    const tablesArray = Array.from(tablesSet).sort();
    const tablesString = tablesArray.join(', ');

    if (onTablesUsedChange) {
      onTablesUsedChange(tablesString);
    }
  }, [tableName, joinConfig.primaryTable, joinConfig.secondaryTable, onTablesUsedChange]);

  // Debounced function for table search
  const debouncedFetchTables = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (search: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          setTableLoading(true);
          try {
            const res = await fetch(`${apiBase}/gettableinfo.php/api/tables?search=${encodeURIComponent(search)}`);
            if (!res.ok) throw new Error('Failed to fetch tables');
            let data: string[] = await res.json();

            if (tableName && !data.includes(tableName)) {
              data = [tableName, ...data];
            }

            setTableOptions(data);
          } catch (e) {
            console.error(e);
            setTableOptions(tableName ? [tableName] : []);
          } finally {
            setTableLoading(false);
          }
        }, 300);
      };
    })(),
    [tableName, apiBase]
  );

  // Fetch fields for a table
  const fetchFieldsForTable = useCallback(async (table: string) => {
    if (!table || fieldOptionsMap[table]) return;
    try {
      const res = await fetch(`${apiBase}/gettableinfo.php/api/columns?table=${encodeURIComponent(table)}`);
      if (!res.ok) throw new Error('Failed to fetch columns');
      const data: string[] = await res.json();
      setFieldOptionsMap(prev => ({ ...prev, [table]: data.map(col => ({ label: col, value: col })) }));
    } catch (e) {
      setFieldOptionsMap(prev => ({ ...prev, [table]: [] }));
    }
  }, [fieldOptionsMap, apiBase]);

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
          `${apiBase}/gettableinfo.php/api/columns?table=${encodeURIComponent(tableName)}`
        );
        if (!res.ok) throw new Error('Failed to fetch columns');
        const data: string[] = await res.json();
        const options = data.map(col => ({ label: col, value: col }));
        setFieldOptions(options);
        setFieldOptionsMap(prev => ({ ...prev, [tableName]: options }));

        setWhereConditions(conds =>
          conds.map(cond =>
            options.find(o => o.value === cond.field)
              ? cond
              : { ...cond, field: options.length ? options[0].value : '' }
          )
        );
      } catch (e) {
        setFieldOptions([]);
        setFieldOptionsMap(prev => ({ ...prev, [tableName]: [] }));
      } finally {
        setFieldsLoading(false);
      }
    };

    fetchFields();
  }, [tableName, apiBase]);

  // Fetch fields for join tables when they change
  useEffect(() => {
    if (joinConfig.primaryTable) fetchFieldsForTable(joinConfig.primaryTable);
    if (joinConfig.secondaryTable) fetchFieldsForTable(joinConfig.secondaryTable);
  }, [joinConfig.primaryTable, joinConfig.secondaryTable, fetchFieldsForTable]);

  // Update join condition automatically
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

  // Build Nested Query SQL
  const buildNestedQuerySQL = (q: NestedQuery, level = 1): string => {
    if (!q.function || !q.table || !q.column) return '';
    let sql = `SELECT ${q.function}(${q.column}) FROM ${q.table}`;
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
    if (q.nestedQuery) {
      sql += ` AND ${q.column} = (${buildNestedQuerySQL(q.nestedQuery, level + 1)})`;
    }
    return sql;
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

  // Build output columns SQL string
  const buildOutputColumnsSQL = () => {
    if (joinConfig.outputColumns.length === 0) return '*';
    const selectedCols = joinConfig.outputColumns.filter(c => c.selected);
    if (selectedCols.length === 0) return '*';
    return selectedCols.map(c => `${c.tableAlias}.${c.column}`).join(', ');
  };

  // Build the complete SQL query
  const buildQuery = () => {
    if (joinConfig.primaryTable && joinConfig.secondaryTable) {
      const selectClause = buildOutputColumnsSQL();
      let query = `${statement} ${selectClause} FROM ${joinConfig.primaryTable} AS ${joinConfig.primaryAlias} `;
      query += `${joinConfig.joinType} JOIN ${joinConfig.secondaryTable} AS ${joinConfig.secondaryAlias} ON ${joinConfig.joinCondition}`;

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
    }

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

  // Notify parent component of changes
  useEffect(() => {
    if (onQueryChange) {
      const queryData: QueryBuilderData = {
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
        queryPreview: buildQuery()
      };
      onQueryChange(queryData);
    }
  }, [statement, columns, tableName, whereConditions, groupBy, having, orderBy, limit, windowFunctionConfigs, joinConfig]);

  // WHERE Condition Handlers
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

  // Nested Query Handlers
  const handleNestedQueryChange = (id: number, nestedQuery: NestedQuery) => {
    setWhereConditions(conds =>
      conds.map(cond => cond.id === id ? { ...cond, nestedQuery } : cond)
    );
  };

  // Window function handlers
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

  // Join config handlers
  const updateJoinConfig = (key: keyof JoinConfig, value: any) => {
    setJoinConfig(jc => ({ ...jc, [key]: value }));
  };

  const toggleOutputColumn = (tableAlias: string, column: string) => {
    setJoinConfig(jc => {
      const exists = jc.outputColumns.find(c => c.tableAlias === tableAlias && c.column === column);
      if (exists) {
        const updated = jc.outputColumns.map(c =>
          c.tableAlias === tableAlias && c.column === column ? { ...c, selected: !c.selected } : c
        );
        return { ...jc, outputColumns: updated };
      } else {
        const newCol = { tableAlias, column, selected: true };
        return { ...jc, outputColumns: [...jc.outputColumns, newCol] };
      }
    });
  };

  const addAllOutputColumns = (tableAlias: string, tableName: string) => {
    const cols = fieldOptionsMap[tableName] || [];
    setJoinConfig(jc => {
      const newCols = cols
        .filter(c => !jc.outputColumns.find(oc => oc.tableAlias === tableAlias && oc.column === c.value))
        .map(c => ({ tableAlias, column: c.value, selected: true }));
      return { ...jc, outputColumns: [...jc.outputColumns, ...newCols] };
    });
  };

  const clearAllOutputColumns = (tableAlias: string) => {
    setJoinConfig(jc => ({
      ...jc,
      outputColumns: jc.outputColumns.filter(c => c.tableAlias !== tableAlias)
    }));
  };

  return (
    <Box sx={{ mt: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, maxHeight: '60vh', overflowY: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Query Builder Configuration</Typography>

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
        disabled={joinConfig.primaryTable && joinConfig.secondaryTable}
        helperText={joinConfig.primaryTable && joinConfig.secondaryTable ? 'Disabled when join is configured. Use Output Columns below.' : ''}
      />

      <Autocomplete
        freeSolo
        options={tableOptions}
        loading={tableLoading}
        value={tableName}
        inputValue={tableInputValue}
        onChange={(_event, newValue) => {
          if (typeof newValue === 'string') {
            setTableName(newValue);
            setTableInputValue(newValue);
          }
        }}
        onInputChange={(_event, newValue, reason) => {
          if (reason === 'input') {
            setTableInputValue(newValue);
            setTableName(newValue);
            debouncedFetchTables(newValue);
          } else if (reason === 'clear') {
            setTableInputValue('');
            setTableName('');
          }
        }}
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
            disabled={joinConfig.primaryTable && joinConfig.secondaryTable}
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

      {/* Join Configuration */}
      <Accordion>
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
              size="small"
              sx={{ minWidth: 100 }}
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
              size="small"
              sx={{ minWidth: 100 }}
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

          <TextField
            label="Join Condition (editable)"
            fullWidth
            value={joinConfig.joinCondition}
            onChange={e => updateJoinConfig('joinCondition', e.target.value)}
            helperText="Auto-generated. You may override for complex joins."
            sx={{ mb: 2 }}
          />

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
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl sx={{ flex: 1, minWidth: 120 }}>
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
                <FormControl sx={{ width: 150 }}>
                  <RadioGroup
                    row
                    value={cond.valueType || 'constant'}
                    onChange={e => handleWhereChange(cond.id, 'valueType', e.target.value)}
                  >
                    <FormControlLabel value="constant" control={<Radio />} label="Constant" />
                    <FormControlLabel value="nested" control={<Radio />} label="Nested" />
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

      {/* Additional SQL Clauses */}
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
  );
};

export default QueryBuilder;