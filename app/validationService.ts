import { FilterDefinition, GroupNode, ConditionNode, UIConfig, FilterInstance, ValidationError } from '../types/filter.types';

const OPERATOR_COMPATIBILITY: Record<string, string[]> = {
  string: ['eq', 'neq', 'contains', 'starts_with', 'ends_with', 'in', 'not_in'],
  number: ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in'],
  date: ['eq', 'before', 'after', 'between', 'relative'],
  boolean: ['eq'],
};

export function isOperatorCompatible(fieldType: string, operator: string): boolean {
  return OPERATOR_COMPATIBILITY[fieldType]?.includes(operator) || false;
}

export function isValidCSSValue(value: string): boolean {
  return /^(\d+(\.\d+)?(px|rem|em|%|vh|vw)|auto)$/.test(value);
}

function traverseNode(node: GroupNode | ConditionNode, path: string[], errors: ValidationError[]): void {
  if (node.type === 'group') {
    if (!node.logical || !['AND', 'OR'].includes(node.logical)) {
      errors.push({
        field: 'definition',
        path,
        message: `Group at ${path.join('.')} must have logical operator AND or OR`,
      });
    }
    if (!node.children || node.children.length === 0) {
      errors.push({
        field: 'definition',
        path,
        message: `Group at ${path.join('.')} must have at least one child`,
      });
    }
    node.children?.forEach((child, index) => {
      traverseNode(child, [...path, 'children', String(index)], errors);
    });
  } else if (node.type === 'condition') {
    if (!node.field) {
      errors.push({
        field: 'definition',
        path,
        message: `Condition at ${path.join('.')} must have a field`,
      });
    }
    if (!node.operator) {
      errors.push({
        field: 'definition',
        path,
        message: `Condition at ${path.join('.')} must have an operator`,
      });
    }
    if (node.value === undefined || node.value === null || node.value === '') {
      errors.push({
        field: 'definition',
        path,
        message: `Condition at ${path.join('.')} must have a value`,
      });
    }
  }
}

export function validateDefinition(definition: FilterDefinition): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!definition.root) {
    errors.push({ field: 'definition', message: 'Definition must have a root node' });
    return errors;
  }
  traverseNode(definition.root, ['root'], errors);
  return errors;
}

export function validateUIConfig(uiConfig: UIConfig): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (uiConfig.size && !['small', 'medium', 'large'].includes(uiConfig.size)) {
    errors.push({ field: 'uiDefault.size', message: 'Size must be small, medium, or large' });
  }

  if (uiConfig.dimensions?.width && !isValidCSSValue(uiConfig.dimensions.width)) {
    errors.push({ field: 'uiDefault.dimensions.width', message: 'Width must be a valid CSS value' });
  }

  if (uiConfig.dimensions?.height && !isValidCSSValue(uiConfig.dimensions.height)) {
    errors.push({ field: 'uiDefault.dimensions.height', message: 'Height must be a valid CSS value' });
  }

  return errors;
}

export function validatePlacements(instances: FilterInstance[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!instances || instances.length === 0) {
    errors.push({ field: 'instances', message: 'At least one placement is required to publish' });
  }

  instances.forEach((instance, index) => {
    if (!instance.targetType) {
      errors.push({ field: `instances[${index}].targetType`, message: 'Target type is required' });
    }
    if (!instance.targetRef) {
      errors.push({ field: `instances[${index}].targetRef`, message: 'Target reference is required' });
    }
    if (!instance.placement) {
      errors.push({ field: `instances[${index}].placement`, message: 'Placement is required' });
    }
  });

  return errors;
}

export function validateFilter(filter: Partial<Filter>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!filter.name || filter.name.trim() === '') {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (!filter.type) {
    errors.push({ field: 'type', message: 'Filter type is required' });
  }

  if (filter.definition) {
    errors.push(...validateDefinition(filter.definition));
  }

  if (filter.uiDefault) {
    errors.push(...validateUIConfig(filter.uiDefault));
  }

  if (filter.status === 'published' && filter.instances) {
    errors.push(...validatePlacements(filter.instances));
  }

  return errors;
}