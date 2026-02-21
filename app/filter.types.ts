// Core Filter Types
export type FilterType = 'date' | 'range' | 'dropdown' | 'multiselect' | 'text' | 'boolean' | 'tag' | 'custom';
export type CreationMode = 'manual' | 'drag-drop';
export type FilterStatus = 'draft' | 'published' | 'deprecated';
export type LogicalOperator = 'AND' | 'OR';

export type StringOperator = 'eq' | 'neq' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in';
export type NumberOperator = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'between' | 'in' | 'not_in';
export type DateOperator = 'eq' | 'before' | 'after' | 'between' | 'relative';
export type BooleanOperator = 'eq';
export type Operator = StringOperator | NumberOperator | DateOperator | BooleanOperator;

export interface ConditionNode {
  type: 'condition';
  field: string;
  operator: Operator;
  value: any;
  binding?: string;
}

export interface GroupNode {
  type: 'group';
  logical: LogicalOperator;
  children: (ConditionNode | GroupNode)[];
}

export interface FilterDefinition {
  root: GroupNode;
}

export interface UIConfig {
  size?: 'small' | 'medium' | 'large';
  dimensions?: {
    width?: string;
    height?: string;
  };
  cssClass?: string;
  style?: Record<string, any>;
  label?: string;
  placeholder?: string;
  tooltip?: string;
  helperText?: string;
  debounceMs?: number;
}

export interface FilterInstance {
  id: string;
  filterId: string;
  targetType: string;
  targetRef: string;
  placement: string;
  panelRef?: string;
  sharedStateGroup?: string;
  uiOverride?: Partial<UIConfig>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Filter {
  id: string | null;
  name: string;
  description: string;
  type: FilterType;
  creationMode: CreationMode;
  definition: FilterDefinition;
  uiDefault: UIConfig;
  version: number;
  status: FilterStatus;
  tags?: string[];
  ownerUserId?: string;
  visibilityScope?: string;
  instances: FilterInstance[];
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface FieldSchema {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  table?: string;
}

export interface Target {
  type: string;
  ref: string;
  label: string;
  capabilities: string[];
}

export interface ValidationError {
  field: string;
  path?: string[];
  message: string;
}

export interface Predicate {
  clientPredicate: ((row: any) => boolean) | null;
  serverParams: Record<string, any>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}