export const sqlStatements = ['SELECT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
export const operators = ['=', '!=', '>', '<', '>=', '<=', 'IN', 'LIKE'];
export const logicalOperators = ['AND', 'OR'];
export const aggregateFunctions = ['MAX', 'MIN', 'AVG', 'COUNT', 'SUM'];

export const windowFunctions = {
  aggregate: {
    label: 'Aggregate Functions',
    functions: ['SUM', 'AVG', 'COUNT', 'MAX', 'MIN'],
  },
  ranking: {
    label: 'Ranking Functions',
    functions: ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE'],
  },
  value: {
    label: 'Value Functions',
    functions: ['LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE'],
  },
  distribution: {
    label: 'Distribution Functions',
    functions: ['PERCENT_RANK', 'CUME_DIST'],
  },
} as const;

export const orderingStrategies = [
  { value: 'across', label: 'Across (ORDER BY column1)', description: 'Sort across row-like dimension' },
  { value: 'down', label: 'Down (ORDER BY column2)', description: 'Sort by vertical/hierarchical field' },
  { value: 'across_then_down', label: 'Across then Down', description: 'Prioritize row dimension, then column' },
  { value: 'down_then_across', label: 'Down then Across', description: 'Prioritize column dimension, then row' },
  { value: 'nested_loop', label: 'Nested Loop-like', description: 'Repeats logic over subgroups' },
  { value: 'custom', label: 'Custom', description: 'Define your own ordering' },
] as const;
