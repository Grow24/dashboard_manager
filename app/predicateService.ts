import { FilterDefinition, GroupNode, ConditionNode, Predicate, Operator } from '../types/filter.types';

export function generatePredicate(definition: FilterDefinition, value: any): Predicate {
  const valueMap = new Map<string, any>();
  
  // Build value map from bindings
  if (typeof value === 'object' && value !== null) {
    Object.entries(value).forEach(([key, val]) => {
      valueMap.set(key, val);
    });
  } else {
    valueMap.set('default', value);
  }

  const clientPredicate = buildClientFn(definition.root, valueMap);
  const serverParams = buildServerParams(definition.root, valueMap, {});

  return { clientPredicate, serverParams };
}

function buildClientFn(node: GroupNode | ConditionNode, valueMap: Map<string, any>): (row: any) => boolean {
  if (node.type === 'group') {
    const childFns = node.children.map(child => buildClientFn(child, valueMap));
    
    if (node.logical === 'AND') {
      return (row: any) => childFns.every(fn => fn(row));
    } else {
      return (row: any) => childFns.some(fn => fn(row));
    }
  } else {
    const resolvedValue = resolveValue(node, valueMap);
    return buildAtomicClientFn(node, resolvedValue);
  }
}

function buildAtomicClientFn(condNode: ConditionNode, resolvedValue: any): (row: any) => boolean {
  const { field, operator } = condNode;

  return (row: any) => {
    const rowValue = getNestedValue(row, field);

    switch (operator) {
      case 'eq':
        return rowValue === resolvedValue;
      case 'neq':
        return rowValue !== resolvedValue;
      case 'contains':
        return String(rowValue).includes(String(resolvedValue));
      case 'starts_with':
        return String(rowValue).startsWith(String(resolvedValue));
      case 'ends_with':
        return String(rowValue).endsWith(String(resolvedValue));
      case 'in':
        return Array.isArray(resolvedValue) && resolvedValue.includes(rowValue);
      case 'not_in':
        return Array.isArray(resolvedValue) && !resolvedValue.includes(rowValue);
      case 'lt':
        return Number(rowValue) < Number(resolvedValue);
      case 'lte':
        return Number(rowValue) <= Number(resolvedValue);
      case 'gt':
        return Number(rowValue) > Number(resolvedValue);
      case 'gte':
        return Number(rowValue) >= Number(resolvedValue);
      case 'between':
        if (Array.isArray(resolvedValue) && resolvedValue.length === 2) {
          const val = Number(rowValue);
          return val >= Number(resolvedValue[0]) && val <= Number(resolvedValue[1]);
        }
        return false;
      case 'before':
        return new Date(rowValue) < new Date(resolvedValue);
      case 'after':
        return new Date(rowValue) > new Date(resolvedValue);
      case 'relative':
        return checkRelativeDate(String(rowValue), String(resolvedValue));
      default:
        return true;
    }
  };
}

function buildServerParams(node: GroupNode | ConditionNode, valueMap: Map<string, any>, out: Record<string, any>): Record<string, any> {
  if (node.type === 'group') {
    node.children.forEach(child => buildServerParams(child, valueMap, out));
  } else {
    const resolvedValue = resolveValue(node, valueMap);
    const paramKey = toParamKey(node.field);

    switch (node.operator) {
      case 'eq':
        out[paramKey] = resolvedValue;
        break;
      case 'in':
        out[`${paramKey}[]`] = resolvedValue;
        break;
      case 'between':
        if (Array.isArray(resolvedValue) && resolvedValue.length === 2) {
          out[`${paramKey}_from`] = resolvedValue[0];
          out[`${paramKey}_to`] = resolvedValue[1];
        }
        break;
      case 'lt':
        out[`${paramKey}_lt`] = resolvedValue;
        break;
      case 'lte':
        out[`${paramKey}_lte`] = resolvedValue;
        break;
      case 'gt':
        out[`${paramKey}_gt`] = resolvedValue;
        break;
      case 'gte':
        out[`${paramKey}_gte`] = resolvedValue;
        break;
      case 'before':
        out[`${paramKey}_before`] = resolvedValue;
        break;
      case 'after':
        out[`${paramKey}_after`] = resolvedValue;
        break;
      case 'contains':
        out[`${paramKey}_contains`] = resolvedValue;
        break;
      default:
        out[paramKey] = resolvedValue;
    }
  }

  return out;
}

function resolveValue(node: ConditionNode, valueMap: Map<string, any>): any {
  if (node.binding && valueMap.has(node.binding)) {
    return valueMap.get(node.binding);
  }
  return node.value;
}

function toParamKey(field: string): string {
  return field.replace('.', '_');
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

export function checkRelativeDate(dateString: string, token: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  
  const match = token.match(/^last_(\d+)_(day|week|month|year)s?$/);
  if (!match) return false;

  const [, amount, unit] = match;
  const num = parseInt(amount, 10);
  
  const threshold = new Date(now);
  switch (unit) {
    case 'day':
      threshold.setDate(threshold.getDate() - num);
      break;
    case 'week':
      threshold.setDate(threshold.getDate() - num * 7);
      break;
    case 'month':
      threshold.setMonth(threshold.getMonth() - num);
      break;
    case 'year':
      threshold.setFullYear(threshold.getFullYear() - num);
      break;
  }

  return date >= threshold && date <= now;
}