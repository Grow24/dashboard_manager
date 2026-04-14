export type FilterKind =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'query'
  | 'lookup'
  | 'component';

export type FilterApplyMode = 'Live' | 'Manual';

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
  name?: string;
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

export interface FilterRecord {
  id?: string;
  name: string;
  type?: FilterKind;
  field?: string;
  defaultValue?: unknown;
  position?: number;
  description?: string;
  placeholder?: string;
  isActive?: boolean;
  required?: boolean;
  visible?: boolean;
  multiSelect?: boolean;
  allowCustom?: boolean;
  tags?: string[];
  options?: string[];
  min?: number | string;
  max?: number | string;
  pattern?: string;
  advancedConfig?: string | Record<string, unknown>;
  config?: Record<string, unknown>;
  webapi?: string;
  webapiType?: 'static' | 'dynamic';
  staticOptions?: string;
  cssClass?: string;
  cssCode?: string;
  inlineStyle?: string;
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
  queryPreview?: boolean;
  filterApply?: FilterApplyMode;
  queryBuilder?: QueryBuilderData | Record<string, unknown> | string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
