// FilterManager.jsx - Complete Filter Manager Implementation with Tailwind CSS and shadcn/ui
import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useReducer, 
  useCallback, 
  useMemo, 
  useRef 
} from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertCircle, 
  Plus, 
  Trash2, 
  Copy, 
  Save, 
  Upload, 
  X, 
  Search,
  Filter as FilterIcon,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';

// ============================================================================
// PART 1: API REPOSITORY & UTILITIES
// ============================================================================

const apiRepository = {
  getAuthToken() {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
  },

  toQueryString(obj) {
    if (!obj || typeof obj !== 'object') return '';
    const params = new URLSearchParams();
    Object.entries(obj).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(`${key}[]`, v));
      } else if (value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    return params.toString();
  },

  async apiCall(method, url, bodyOrParams = null) {
    const token = this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const config = {
      method,
      headers
    };

    let fullUrl = url;

    if (method === 'GET' && bodyOrParams) {
      const queryString = this.toQueryString(bodyOrParams);
      fullUrl = `${url}?${queryString}`;
    } else if (method !== 'GET' && bodyOrParams) {
      config.body = JSON.stringify(bodyOrParams);
    }

    try {
      console.log('fullUrl 11----');
      console.log(fullUrl);
      console.log(config);
      const response = await fetch(fullUrl, config);
      console.log(response);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }
};

// ============================================================================
// PART 2: VALIDATION SERVICE
// ============================================================================

const validationService = {
  validateDefinition(definition) {
    const errors = [];
    if (!definition || !definition.root) {
      errors.push({ path: 'definition', message: 'Definition root is required' });
      return errors;
    }
    this.traverseNode(definition.root, ['root'], errors);
    return errors;
  },

  traverseNode(node, path, errors) {
    if (!node || !node.type) {
      errors.push({ path: path.join('.'), message: 'Node type is required' });
      return;
    }

    if (node.type === 'group') {
      if (!node.logical || !['AND', 'OR'].includes(node.logical)) {
        errors.push({ path: path.join('.'), message: 'Group must have logical operator (AND/OR)' });
      }
      if (!node.children || !Array.isArray(node.children)) {
        errors.push({ path: path.join('.'), message: 'Group must have children array' });
      } else {
        node.children.forEach((child, idx) => {
          this.traverseNode(child, [...path, 'children', idx], errors);
        });
      }
    } else if (node.type === 'condition') {
      if (!node.field) {
        errors.push({ path: path.join('.'), message: 'Condition must have a field' });
      }
      if (!node.operator) {
        errors.push({ path: path.join('.'), message: 'Condition must have an operator' });
      }
      if (node.field && node.operator) {
        const fieldType = node.fieldType || 'string';
        if (!this.isOperatorCompatible(fieldType, node.operator)) {
          errors.push({ 
            path: path.join('.'), 
            message: `Operator ${node.operator} not compatible with field type ${fieldType}` 
          });
        }
      }
      if (node.value === undefined || node.value === null) {
        if (!['is_null', 'is_not_null', 'is_empty', 'is_not_empty'].includes(node.operator)) {
          errors.push({ path: path.join('.'), message: 'Condition must have a value' });
        }
      }
    }
  },

  isOperatorCompatible(fieldType, operator) {
    const compatibilityMatrix = {
      string: ['eq', 'neq', 'contains', 'starts_with', 'ends_with', 'in', 'not_in', 'is_null', 'is_not_null', 'is_empty', 'is_not_empty'],
      number: ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in', 'is_null', 'is_not_null'],
      date: ['eq', 'before', 'after', 'between', 'relative', 'is_null', 'is_not_null'],
      boolean: ['eq', 'is_null', 'is_not_null'],
      array: ['contains', 'in', 'not_in', 'is_empty', 'is_not_empty']
    };
    return (compatibilityMatrix[fieldType] || []).includes(operator);
  },

  validateUIConfig(uiConfig) {
    const errors = [];
    if (uiConfig.size && !['small', 'medium', 'large'].includes(uiConfig.size)) {
      errors.push({ path: 'uiConfig.size', message: 'Size must be small, medium, or large' });
    }
    if (uiConfig.dimensions) {
      if (uiConfig.dimensions.width && !this.isValidCSSValue(uiConfig.dimensions.width)) {
        errors.push({ path: 'uiConfig.dimensions.width', message: 'Invalid CSS width value' });
      }
      if (uiConfig.dimensions.height && !this.isValidCSSValue(uiConfig.dimensions.height)) {
        errors.push({ path: 'uiConfig.dimensions.height', message: 'Invalid CSS height value' });
      }
    }
    return errors;
  },

  isValidCSSValue(value) {
    if (value === 'auto') return true;
    return /^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/.test(value);
  },

  validatePlacements(instances) {
    const errors = [];
    if (!instances || !Array.isArray(instances) || instances.length === 0) {
      errors.push({ path: 'instances', message: 'At least one placement is required to publish' });
    } else {
      instances.forEach((inst, idx) => {
        if (!inst.targetType) {
          errors.push({ path: `instances[${idx}].targetType`, message: 'Target type is required' });
        }
        if (!inst.targetRef) {
          errors.push({ path: `instances[${idx}].targetRef`, message: 'Target reference is required' });
        }
        if (!inst.placement) {
          errors.push({ path: `instances[${idx}].placement`, message: 'Placement is required' });
        }
      });
    }
    return errors;
  }
};

// ============================================================================
// PART 3: PREDICATE SERVICE
// ============================================================================

const predicateService = {
  generatePredicate(definition, value) {
    if (!definition || !definition.root) {
      return { clientPredicate: null, serverParams: {} };
    }

    const valueMap = { __root__: value };
    const clientPredicate = this.buildClientFn(definition.root, valueMap);
    const serverParams = this.buildServerParams(definition.root, valueMap, {});

    return { clientPredicate, serverParams };
  },

  buildClientFn(node, valueMap) {
    if (!node) return () => true;

    if (node.type === 'group') {
      const childFns = (node.children || []).map(child => this.buildClientFn(child, valueMap));
      if (node.logical === 'AND') {
        return (row) => childFns.every(fn => fn(row));
      } else {
        return (row) => childFns.some(fn => fn(row));
      }
    } else if (node.type === 'condition') {
      const resolvedValue = this.resolveValue(node, valueMap);
      return this.buildAtomicClientFn(node, resolvedValue);
    }

    return () => true;
  },

  buildAtomicClientFn(condNode, resolvedValue) {
    const { field, operator } = condNode;
    
    return (row) => {
      const fieldValue = this.getNestedValue(row, field);

      switch (operator) {
        case 'eq':
          return fieldValue == resolvedValue;
        case 'neq':
          return fieldValue != resolvedValue;
        case 'lt':
          return fieldValue < resolvedValue;
        case 'lte':
          return fieldValue <= resolvedValue;
        case 'gt':
          return fieldValue > resolvedValue;
        case 'gte':
          return fieldValue >= resolvedValue;
        case 'between':
          if (Array.isArray(resolvedValue) && resolvedValue.length === 2) {
            return fieldValue >= resolvedValue[0] && fieldValue <= resolvedValue[1];
          }
          return false;
        case 'in':
          return Array.isArray(resolvedValue) && resolvedValue.includes(fieldValue);
        case 'not_in':
          return Array.isArray(resolvedValue) && !resolvedValue.includes(fieldValue);
        case 'contains':
          return String(fieldValue).includes(String(resolvedValue));
        case 'starts_with':
          return String(fieldValue).startsWith(String(resolvedValue));
        case 'ends_with':
          return String(fieldValue).endsWith(String(resolvedValue));
        case 'before':
          return new Date(fieldValue) < new Date(resolvedValue);
        case 'after':
          return new Date(fieldValue) > new Date(resolvedValue);
        case 'relative':
          return this.checkRelativeDate(fieldValue, resolvedValue);
        case 'is_null':
          return fieldValue === null || fieldValue === undefined;
        case 'is_not_null':
          return fieldValue !== null && fieldValue !== undefined;
        case 'is_empty':
          return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
        case 'is_not_empty':
          return fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);
        default:
          return true;
      }
    };
  },

  buildServerParams(node, valueMap, out = {}) {
    if (!node) return out;

    if (node.type === 'group') {
      (node.children || []).forEach(child => {
        this.buildServerParams(child, valueMap, out);
      });
    } else if (node.type === 'condition') {
      const resolvedValue = this.resolveValue(node, valueMap);
      const paramKey = this.toParamKey(node.field);

      switch (node.operator) {
        case 'eq':
          out[paramKey] = resolvedValue;
          break;
        case 'neq':
          out[`${paramKey}_neq`] = resolvedValue;
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
        case 'between':
          if (Array.isArray(resolvedValue) && resolvedValue.length === 2) {
            out[`${paramKey}_from`] = resolvedValue[0];
            out[`${paramKey}_to`] = resolvedValue[1];
          }
          break;
        case 'in':
        case 'not_in':
          out[`${paramKey}_${node.operator}`] = resolvedValue;
          break;
        case 'contains':
          out[`${paramKey}_contains`] = resolvedValue;
          break;
        case 'starts_with':
          out[`${paramKey}_starts`] = resolvedValue;
          break;
        case 'ends_with':
          out[`${paramKey}_ends`] = resolvedValue;
          break;
        case 'before':
          out[`${paramKey}_before`] = resolvedValue;
          break;
        case 'after':
          out[`${paramKey}_after`] = resolvedValue;
          break;
        case 'relative':
          out[`${paramKey}_relative`] = resolvedValue;
          break;
      }
    }

    return out;
  },

  resolveValue(node, valueMap) {
    if (node.binding) {
      return valueMap[node.binding] !== undefined ? valueMap[node.binding] : node.value;
    }
    return node.value;
  },

  toParamKey(field) {
    return field.replace(/\./g, '_');
  },

  getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  },

  checkRelativeDate(dateString, token) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    switch (token) {
      case 'today':
        return diffDays === 0;
      case 'yesterday':
        return diffDays === 1;
      case 'last_7_days':
        return diffDays >= 0 && diffDays <= 7;
      case 'last_30_days':
        return diffDays >= 0 && diffDays <= 30;
      case 'this_month':
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
      default:
        return false;
    }
  }
};

// ============================================================================
// PART 4: URL SYNC SERVICE
// ============================================================================

const urlSyncService = {
  syncToURL(filterId, value) {
    const url = new URL(window.location.href);
    const paramKey = `f_${filterId}`;
    
    if (value === null || value === undefined) {
      url.searchParams.delete(paramKey);
    } else {
      url.searchParams.set(paramKey, JSON.stringify(value));
    }
    
    window.history.replaceState({}, '', url.toString());
  },

  restoreFromURL() {
    const url = new URL(window.location.href);
    const filterValues = new Map();
    
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('f_')) {
        const filterId = key.substring(2);
        try {
          filterValues.set(filterId, JSON.parse(value));
        } catch (e) {
          console.warn(`Failed to parse filter value for ${filterId}:`, e);
        }
      }
    });
    
    return filterValues;
  }
};

// ============================================================================
// PART 5: DEFAULTS & UTILITIES
// ============================================================================

const defaults = {
  getDefaultValueForOperator(operator, fieldType) {
    switch (operator) {
      case 'between':
        return fieldType === 'date' ? [null, null] : [0, 0];
      case 'in':
      case 'not_in':
        return [];
      case 'eq':
      case 'neq':
        if (fieldType === 'boolean') return false;
        if (fieldType === 'number') return 0;
        if (fieldType === 'date') return null;
        return '';
      case 'relative':
        return 'today';
      default:
        return null;
    }
  },

  getTypeDefault(filterType) {
    switch (filterType) {
      case 'date':
        return { from: null, to: null };
      case 'range':
        return { min: 0, max: 100 };
      case 'dropdown':
      case 'multiselect':
        return [];
      case 'text':
        return '';
      case 'boolean':
        return false;
      default:
        return null;
    }
  },

  applyUIProps(filter, instance) {
    const base = filter.uiDefault || {};
    const override = instance.uiOverride || {};
    
    return {
      size: override.size || base.size || 'medium',
      dimensions: { ...base.dimensions, ...override.dimensions },
      cssClass: override.cssClass || base.cssClass || '',
      style: { ...base.style, ...override.style },
      label: override.label || base.label || filter.name || '',
      placeholder: override.placeholder || base.placeholder || '',
      tooltip: override.tooltip || base.tooltip || '',
      debounce: override.debounce !== undefined ? override.debounce : (base.debounce || 300)
    };
  }
};

// ============================================================================
// PART 6: FILTER CONTEXT
// ============================================================================

const FilterContext = createContext(null);

export const FilterProvider = ({ children }) => {
  const [activeFilters, setActiveFilters] = useState(new Map());
  const [registeredInstances, setRegisteredInstances] = useState(new Map());
  const [predicateCache, setPredicateCache] = useState(new Map());
  const [subscribers, setSubscribers] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [filterDefinitions, setFilterDefinitions] = useState(new Map());

  const registerInstance = useCallback((instance) => {
    if (!instance || !instance.id) {
      console.warn('Invalid instance registration attempt');
      return;
    }

    setRegisteredInstances(prev => {
      const next = new Map(prev);
      if (next.has(instance.id)) {
        console.warn(`Instance ${instance.id} already registered`);
      }
      next.set(instance.id, instance);
      return next;
    });
  }, []);

  const findAffectedTargets = useCallback((filterId) => {
    const targets = new Set();
    registeredInstances.forEach((instance) => {
      if (instance.filterId === filterId && instance.isActive !== false) {
        targets.add(instance.targetRef);
      }
    });
    return targets;
  }, [registeredInstances]);

  const getInstancesForTarget = useCallback((targetRef) => {
    const instances = [];
    registeredInstances.forEach((instance) => {
      if (instance.targetRef === targetRef && instance.isActive !== false) {
        instances.push(instance);
      }
    });
    return instances;
  }, [registeredInstances]);

  const getFilterDefinition = useCallback(async (filterId) => {
    if (filterDefinitions.has(filterId)) {
      return filterDefinitions.get(filterId);
    }

    try {
      const filter = await apiRepository.apiCall('GET', `https://intelligentsalesman.com/ism1/API/filter/filters.php/${filterId}`);
      setFilterDefinitions(prev => {
        const next = new Map(prev);
        next.set(filterId, filter);
        return next;
      });
      return filter;
    } catch (error) {
      console.error(`Failed to load filter ${filterId}:`, error);
      return null;
    }
  }, [filterDefinitions]);

  const buildCombinedPredicate = useCallback(async (instances) => {
    const predicates = [];

    for (const instance of instances) {
      const filterDef = await getFilterDefinition(instance.filterId);
      const filterValue = activeFilters.get(instance.filterId);

      if (filterDef && filterValue !== null && filterValue !== undefined) {
        const singlePredicate = predicateService.generatePredicate(filterDef.definition, filterValue);
        predicates.push(singlePredicate);
      }
    }

    if (predicates.length === 0) {
      return { clientPredicate: null, serverParams: {} };
    }

    const combinedClientPredicate = (row) => {
      return predicates.every(p => !p.clientPredicate || p.clientPredicate(row));
    };

    const combinedServerParams = predicates.reduce((acc, p) => {
      return { ...acc, ...p.serverParams };
    }, {});

    return {
      clientPredicate: combinedClientPredicate,
      serverParams: combinedServerParams
    };
  }, [activeFilters, getFilterDefinition]);

  const recomputePredicates = useCallback(async (targetRefs) => {
    const updates = new Map();

    for (const targetRef of targetRefs) {
      const instances = getInstancesForTarget(targetRef);
      const combinedPredicate = await buildCombinedPredicate(instances);
      updates.set(targetRef, combinedPredicate);
    }

    setPredicateCache(prev => {
      const next = new Map(prev);
      updates.forEach((value, key) => next.set(key, value));
      return next;
    });

    return updates;
  }, [getInstancesForTarget, buildCombinedPredicate]);

  const notifySubscribers = useCallback((targetRefs) => {
    targetRefs.forEach(targetRef => {
      const callbacks = subscribers.get(targetRef);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error(`Subscriber callback error for ${targetRef}:`, error);
          }
        });
      }
    });
  }, [subscribers]);

  const setValue = useCallback(async (filterId, newValue) => {
    const oldValue = activeFilters.get(filterId);
    
    if (oldValue === newValue) return;

    setActiveFilters(prev => {
      const next = new Map(prev);
      next.set(filterId, newValue);
      return next;
    });

    const affectedTargets = findAffectedTargets(filterId);
    await recomputePredicates(affectedTargets);
    notifySubscribers(affectedTargets);
  }, [activeFilters, findAffectedTargets, recomputePredicates, notifySubscribers]);

  const subscribe = useCallback((targetRef, callback) => {
    setSubscribers(prev => {
      const next = new Map(prev);
      if (!next.has(targetRef)) {
        next.set(targetRef, new Set());
      }
      next.get(targetRef).add(callback);
      return next;
    });

    return () => {
      setSubscribers(prev => {
        const next = new Map(prev);
        const callbacks = next.get(targetRef);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            next.delete(targetRef);
          }
        }
        return next;
      });
    };
  }, []);

  const getPredicateForTarget = useCallback((targetRef) => {
    return predicateCache.get(targetRef) || { clientPredicate: null, serverParams: {} };
  }, [predicateCache]);

  const clearScope = useCallback(async (scopeId) => {
    const affectedTargets = new Set();

    setActiveFilters(prev => {
      const next = new Map(prev);
      next.forEach((value, filterId) => {
        next.set(filterId, null);
        findAffectedTargets(filterId).forEach(t => affectedTargets.add(t));
      });
      return next;
    });

    await recomputePredicates(affectedTargets);
    notifySubscribers(affectedTargets);
  }, [findAffectedTargets, recomputePredicates, notifySubscribers]);

  const contextValue = {
    activeFilters,
    registeredInstances,
    predicateCache,
    isLoading,
    registerInstance,
    setValue,
    subscribe,
    getPredicateForTarget,
    clearScope
  };

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within FilterProvider');
  }
  return context;
};

// ============================================================================
// PART 7: COMMON UI COMPONENTS (Tailwind + shadcn)
// ============================================================================

const Dropdown = ({ value, onChange, options = [], optionsSource, placeholder, disabled, multiple = false }) => {
  const [localOptions, setLocalOptions] = useState(options);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (optionsSource) {
      fetchOptions();
    }
  }, [optionsSource, search, page]);

  const fetchOptions = async () => {
    setIsLoading(true);
    try {
      const response = await apiRepository.apiCall('GET', `https://intelligentsalesman.com/ism1/API/filter/options.php/${optionsSource}`, {
        search,
        page,
        pageSize: 50
      });
      setLocalOptions(prev => page === 1 ? response.items : [...prev, ...response.items]);
      setHasMore(response.hasMore || false);
    } catch (error) {
      console.error('Failed to fetch options:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (multiple) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions, opt => opt.value))}
        disabled={disabled}
        multiple
        className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {localOptions.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder || 'Select...'} />
      </SelectTrigger>
      <SelectContent>
        {localOptions.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const DatePicker = ({ value, onChange, disabled }) => {
  return (
    <Input
      type="date"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full"
    />
  );
};

const RangeSlider = ({ value, onChange, min = 0, max = 100, disabled }) => {
  const [localValue, setLocalValue] = useState(value || [min, max]);

  useEffect(() => {
    if (value) setLocalValue(value);
  }, [value]);

  const handleChange = (index, newVal) => {
    const updated = [...localValue];
    updated[index] = Number(newVal);
    setLocalValue(updated);
    onChange(updated);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={localValue[0]}
        onChange={(e) => handleChange(0, e.target.value)}
        disabled={disabled}
        min={min}
        max={max}
        className="w-20"
      />
      <span className="text-sm text-muted-foreground">to</span>
      <Input
        type="number"
        value={localValue[1]}
        onChange={(e) => handleChange(1, e.target.value)}
        disabled={disabled}
        min={min}
        max={max}
        className="w-20"
      />
    </div>
  );
};

const TextInput = ({ value, onChange, placeholder, disabled }) => {
  return (
    <Input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full"
    />
  );
};

const ToggleSwitch = ({ value, onChange, disabled }) => {
  return (
    <Switch
      checked={!!value}
      onCheckedChange={onChange}
      disabled={disabled}
    />
  );
};

// ============================================================================
// PART 8: VALUE INPUT (TYPE-AWARE)
// ============================================================================

const ValueInput = ({ fieldType, operator, value, onChange, disabled }) => {
  if (['is_null', 'is_not_null', 'is_empty', 'is_not_empty'].includes(operator)) {
    return <span className="text-sm text-muted-foreground">No value needed</span>;
  }

  if (operator === 'between') {
    if (fieldType === 'date') {
      return (
        <div className="flex items-center gap-2">
          <DatePicker
            value={value?.[0]}
            onChange={(v) => onChange([v, value?.[1]])}
            disabled={disabled}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <DatePicker
            value={value?.[1]}
            onChange={(v) => onChange([value?.[0], v])}
            disabled={disabled}
          />
        </div>
      );
    } else {
      return (
        <RangeSlider
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );
    }
  }

  if (['in', 'not_in'].includes(operator)) {
    return (
      <Dropdown
        value={value}
        onChange={onChange}
        disabled={disabled}
        multiple={true}
      />
    );
  }

  if (fieldType === 'date') {
    if (operator === 'relative') {
      return (
        <Dropdown
          value={value}
          onChange={onChange}
          disabled={disabled}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'yesterday', label: 'Yesterday' },
            { value: 'last_7_days', label: 'Last 7 Days' },
            { value: 'last_30_days', label: 'Last 30 Days' },
            { value: 'this_month', label: 'This Month' },
            { value: 'last_month', label: 'Last Month' }
          ]}
        />
      );
    }
    return <DatePicker value={value} onChange={onChange} disabled={disabled} />;
  }

  if (fieldType === 'boolean') {
    return <ToggleSwitch value={value} onChange={onChange} disabled={disabled} />;
  }

  if (fieldType === 'number') {
    return (
      <Input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full"
      />
    );
  }

  return <TextInput value={value} onChange={onChange} disabled={disabled} />;
};

// ============================================================================
// PART 9: CONDITION BUILDER (RECURSIVE)
// ============================================================================

const ConditionRow = ({ condition, path, fieldSchema, onChange, onRemove, error }) => {
  const [availableOperators, setAvailableOperators] = useState([]);

  useEffect(() => {
    updateAvailableOperators();
  }, [condition.field]);

  const updateAvailableOperators = () => {
    const field = fieldSchema.find(f => f.name === condition.field);
    const fieldType = field?.type || 'string';
    setAvailableOperators(getOperatorsForType(fieldType));
  };

  const getOperatorsForType = (fieldType) => {
    const operatorsByType = {
      string: [
        { value: 'eq', label: 'Equals' },
        { value: 'neq', label: 'Not Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'starts_with', label: 'Starts With' },
        { value: 'ends_with', label: 'Ends With' },
        { value: 'in', label: 'In' },
        { value: 'not_in', label: 'Not In' }
      ],
      number: [
        { value: 'eq', label: 'Equals' },
        { value: 'neq', label: 'Not Equals' },
        { value: 'lt', label: 'Less Than' },
        { value: 'lte', label: 'Less Than or Equal' },
        { value: 'gt', label: 'Greater Than' },
        { value: 'gte', label: 'Greater Than or Equal' },
        { value: 'between', label: 'Between' },
        { value: 'in', label: 'In' },
        { value: 'not_in', label: 'Not In' }
      ],
      date: [
        { value: 'eq', label: 'Equals' },
        { value: 'before', label: 'Before' },
        { value: 'after', label: 'After' },
        { value: 'between', label: 'Between' },
        { value: 'relative', label: 'Relative' }
      ],
      boolean: [
        { value: 'eq', label: 'Equals' }
      ]
    };
    return operatorsByType[fieldType] || operatorsByType.string;
  };

  const handleFieldChange = (name) => {
    const field = fieldSchema.find(f => f.name === name);
    onChange(path, 'field', name);
    onChange(path, 'fieldType', field?.type || 'string');
    onChange(path, 'operator', '');
    onChange(path, 'value', null);
  };

  return (
    <Card className="mb-2">
      <CardContent className="pt-6">
        <div className="flex items-start gap-2 flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <Select
              value={condition.field || ''}
              onValueChange={handleFieldChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Field" />
              </SelectTrigger>
              <SelectContent>
                {fieldSchema.map(field => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.label || field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <Select
              value={condition.operator || ''}
              onValueChange={(val) => onChange(path, 'operator', val)}
              disabled={!condition.field}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Operator" />
              </SelectTrigger>
             <SelectContent>
  {(() => {
    const selectedField = fieldSchema.find(f => f.name === condition.field);
    const availableOperators = selectedField?.operators || [];
    
    return availableOperators.map(op => (
      <SelectItem key={op} value={op}>
        {op.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </SelectItem>
    ));
  })()}
</SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <ValueInput
              fieldType={condition.fieldType || 'string'}
              operator={condition.operator}
              value={condition.value}
              onChange={(v) => onChange(path, 'value', v)}
              disabled={!condition.operator}
            />
          </div>

          <Button 
            onClick={onRemove} 
            variant="destructive" 
            size="icon"
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

const ConditionBuilder = ({ 
  node, 
  path, 
  fieldSchema, 
  onAddCondition, 
  onAddGroup, 
  onRemoveNode, 
  onConditionChange, 
  onLogicalChange, 
  errors 
}) => {
  const getErrorForPath = (nodePath) => {
    const pathStr = nodePath.join('.');
    const error = errors.find(e => e.path === pathStr);
    return error?.message || null;
  };

  if (node.type === 'group') {
    return (
      <Card className={cn("mb-4", path.length > 1 && "ml-6 border-l-4 border-primary")}>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={node.logical || 'AND'}
              onValueChange={(val) => onLogicalChange(path, val)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => onAddCondition(path)} size="sm" variant="outline" type="button">
              <Plus className="h-4 w-4 mr-1" />
              Condition
            </Button>
            <Button onClick={() => onAddGroup(path)} size="sm" variant="outline" type="button">
              <Plus className="h-4 w-4 mr-1" />
              Group
            </Button>
            {path.length > 1 && (
              <Button onClick={() => onRemoveNode(path)} size="sm" variant="destructive" type="button">
                <Trash2 className="h-4 w-4 mr-1" />
                Remove Group
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            {(node.children || []).map((child, idx) => (
              <ConditionBuilder
                key={idx}
                node={child}
                path={[...path, 'children', idx]}
                fieldSchema={fieldSchema}
                onAddCondition={onAddCondition}
                onAddGroup={onAddGroup}
                onRemoveNode={onRemoveNode}
                onConditionChange={onConditionChange}
                onLogicalChange={onLogicalChange}
                errors={errors}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  } else if (node.type === 'condition') {
    return (
      <ConditionRow
        condition={node}
        path={path}
        fieldSchema={fieldSchema}
        onChange={onConditionChange}
        onRemove={() => onRemoveNode(path)}
        error={getErrorForPath(path)}
      />
    );
  }

  return null;
};

// ============================================================================
// PART 10: MANUAL CONDITIONS TAB
// ============================================================================

const ManualConditionsTab = ({ definition, onChange, errors }) => {
  const [fieldSchema, setFieldSchema] = useState([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);

  const loadFieldSchema = async () => {
    console.log('loadFieldSchema---------------');
    setIsLoadingSchema(true);
    try {
      const response = await apiRepository.apiCall('GET', 'https://intelligentsalesman.com/ism1/API/filter/fields.php');
      setFieldSchema(response.fields || []);
    } catch (error) {
      console.error('Failed to load field schema:', error);
    } finally {
      setIsLoadingSchema(false);
    }
  };

  useEffect(() => {
    if (definition && definition.root) {
      loadFieldSchema();
    }
  }, [definition]);

  // Guard: ensure definition has a valid root
  if (!definition || !definition.root) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Initializing filter definition...
      </div>
    );
  }

  const handleAddCondition = (groupPath) => {
    const newDef = JSON.parse(JSON.stringify(definition));
    const group = getNodeAtPath(newDef.root, groupPath);
    if (group && group.type === 'group') {
      group.children = group.children || [];
      group.children.push({
        type: 'condition',
        field: '',
        operator: '',
        value: null
      });
      onChange(newDef);
    }
  };

  const handleAddGroup = (groupPath) => {
    const newDef = JSON.parse(JSON.stringify(definition));
    const group = getNodeAtPath(newDef.root, groupPath);
    if (group && group.type === 'group') {
      group.children = group.children || [];
      group.children.push({
        type: 'group',
        logical: 'AND',
        children: []
      });
      onChange(newDef);
    }
  };

  const handleRemoveNode = (nodePath) => {
    const newDef = JSON.parse(JSON.stringify(definition));
    const parentPath = nodePath.slice(0, -2);
    const childIndex = nodePath[nodePath.length - 1];
    const parent = getNodeAtPath(newDef.root, parentPath);
    
    if (parent && parent.children) {
      parent.children.splice(childIndex, 1);
      onChange(newDef);
    }
  };

  const handleConditionChange = (nodePath, field, value) => {
    const newDef = JSON.parse(JSON.stringify(definition));
    const node = getNodeAtPath(newDef.root, nodePath);
    if (node) {
      node[field] = value;
      onChange(newDef);
    }
  };

  const handleLogicalChange = (nodePath, logical) => {
    const newDef = JSON.parse(JSON.stringify(definition));
    const node = getNodeAtPath(newDef.root, nodePath);
    if (node && node.type === 'group') {
      node.logical = logical;
      onChange(newDef);
    }
  };

  const getNodeAtPath = (root, path) => {
    if (path.length === 0 || path[0] === 'root') {
      return path.length <= 1 ? root : getNodeAtPath(root, path.slice(1));
    }
    
    let current = root;
    for (let i = 0; i < path.length; i++) {
      if (path[i] === 'children') {
        i++;
        current = current.children[path[i]];
      }
    }
    return current;
  };

  if (isLoadingSchema) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading field schema...</span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] w-full">
      <div className="p-4">
        <ConditionBuilder
          node={definition.root}
          path={['root']}
          fieldSchema={fieldSchema}
          onAddCondition={handleAddCondition}
          onAddGroup={handleAddGroup}
          onRemoveNode={handleRemoveNode}
          onConditionChange={handleConditionChange}
          onLogicalChange={handleLogicalChange}
          errors={errors}
        />
      </div>
    </ScrollArea>
  );
};

// ============================================================================
// PART 11: DRAG-DROP BUILDER TAB (Placeholder)
// ============================================================================

const DragDropBuilderTab = ({ definition, onChange, errors }) => {
  return (
    <div className="flex items-center justify-center p-12">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Drag & Drop Builder</CardTitle>
          <CardDescription>Coming Soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The visual drag & drop builder is under development. Please use Manual mode for now.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// PART 12: CREATION MODE TABS
// ============================================================================

const CreationModeTabs = ({ draft, onChange, errors }) => {
  const [mode, setMode] = useState(draft.creationMode || 'manual');

  const handleModeChange = (newMode) => {
    if (mode !== newMode) {
      const confirmed = window.confirm('Switching modes may reset your definition. Continue?');
      if (confirmed) {
        setMode(newMode);
        onChange('creationMode', newMode);
      }
    }
  };

  return (
    <Tabs value={mode} onValueChange={handleModeChange}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="manual">Manual</TabsTrigger>
        <TabsTrigger value="drag-drop">Drag & Drop</TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="mt-4">
        <ManualConditionsTab
          definition={draft.definition}
          onChange={(newDef) => onChange('definition', newDef)}
          errors={errors}
        />
      </TabsContent>

      <TabsContent value="drag-drop" className="mt-4">
        <DragDropBuilderTab
          definition={draft.definition}
          onChange={(newDef) => onChange('definition', newDef)}
          errors={errors}
        />
      </TabsContent>
    </Tabs>
  );
};

// ============================================================================
// PART 13: FILTER METADATA FORM
// ============================================================================

const FilterMetadataForm = ({ draft, onChange, errors }) => {
  const getErrorMessage = (field) => {
    const error = errors.find(e => e.field === field);
    return error?.message || null;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          type="text"
          value={draft.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Enter filter name"
        />
        {getErrorMessage('name') && (
          <p className="text-sm text-destructive">{getErrorMessage('name')}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={draft.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Enter filter description"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type *</Label>
        <Select
          value={draft.type || 'date'}
          onValueChange={(val) => onChange('type', val)}
        >
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="range">Range</SelectItem>
            <SelectItem value="dropdown">Dropdown</SelectItem>
            <SelectItem value="multiselect">Multi-Select</SelectItem>
            <SelectItem value="text">Text Search</SelectItem>
            <SelectItem value="boolean">Boolean Toggle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          type="text"
          value={draft.tags || ''}
          onChange={(e) => onChange('tags', e.target.value)}
          placeholder="Comma-separated tags"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="visibility">Visibility Scope</Label>
        <Select
          value={draft.visibilityScope || 'private'}
          onValueChange={(val) => onChange('visibilityScope', val)}
        >
          <SelectTrigger id="visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="organization">Organization</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// ============================================================================
// PART 14: UI CONFIG PANEL
// ============================================================================

const UIConfigPanel = ({ draft, onChange, errors }) => {
  const [previewValue, setPreviewValue] = useState(null);

  const handleSizeChange = (size) => {
    onChange('uiDefault', { ...draft.uiDefault, size });
  };

  const handleDimensionChange = (dim, val) => {
    onChange('uiDefault', {
      ...draft.uiDefault,
      dimensions: { ...draft.uiDefault?.dimensions, [dim]: val }
    });
  };

  const handleStyleChange = (field, value) => {
    onChange('uiDefault', {
      ...draft.uiDefault,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="size">Size</Label>
          <Select
            value={draft.uiDefault?.size || 'medium'}
            onValueChange={handleSizeChange}
          >
            <SelectTrigger id="size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="width">Width</Label>
          <Input
            id="width"
            type="text"
            value={draft.uiDefault?.dimensions?.width || ''}
            onChange={(e) => handleDimensionChange('width', e.target.value)}
            placeholder="e.g., 300px, 100%, auto"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="height">Height</Label>
          <Input
            id="height"
            type="text"
            value={draft.uiDefault?.dimensions?.height || ''}
            onChange={(e) => handleDimensionChange('height', e.target.value)}
            placeholder="e.g., 40px, auto"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cssClass">CSS Class</Label>
          <Input
            id="cssClass"
            type="text"
            value={draft.uiDefault?.cssClass || ''}
            onChange={(e) => handleStyleChange('cssClass', e.target.value)}
            placeholder="custom-class-name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            type="text"
            value={draft.uiDefault?.label || ''}
            onChange={(e) => handleStyleChange('label', e.target.value)}
            placeholder="Filter label"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="placeholder">Placeholder</Label>
          <Input
            id="placeholder"
            type="text"
            value={draft.uiDefault?.placeholder || ''}
            onChange={(e) => handleStyleChange('placeholder', e.target.value)}
            placeholder="Placeholder text"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tooltip">Tooltip</Label>
          <Input
            id="tooltip"
            type="text"
            value={draft.uiDefault?.tooltip || ''}
            onChange={(e) => handleStyleChange('tooltip', e.target.value)}
            placeholder="Help text"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="debounce">Debounce (ms)</Label>
          <Input
            id="debounce"
            type="number"
            value={draft.uiDefault?.debounce || 300}
            onChange={(e) => handleStyleChange('debounce', Number(e.target.value))}
          />
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>Preview of configured filter control</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-md bg-muted/50">
            <p className="text-sm text-muted-foreground">Preview rendering coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// PART 15: TARGETING PANEL
// ============================================================================

const TargetingPanel = ({ draft, onChange, errors }) => {
  const [availableTargets, setAvailableTargets] = useState([]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [selectedTargetType, setSelectedTargetType] = useState('');
  const [selectedTargetRef, setSelectedTargetRef] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState('');
  const [selectedPanelRef, setSelectedPanelRef] = useState('');
  const [sharedStateGroup, setSharedStateGroup] = useState('');
  const [uiOverride, setUiOverride] = useState({});

  useEffect(() => {
    loadAvailableTargets();
  }, []);

  const loadAvailableTargets = async () => {
    setIsLoadingTargets(true);
    try {
      const response = await apiRepository.apiCall('GET', 'https://intelligentsalesman.com/ism1/API/filter/targets.php');
      setAvailableTargets(response.targets || []);
    } catch (error) {
      console.error('Failed to load targets:', error);
    } finally {
      setIsLoadingTargets(false);
    }
  };

  const handleAddInstance = () => {
    if (!selectedTargetType || !selectedTargetRef || !selectedPlacement) {
      alert('Please select target type, reference, and placement');
      return;
    }

    const newInstance = {
      id: `instance_${Date.now()}`,
      filterId: draft.id,
      targetType: selectedTargetType,
      targetRef: selectedTargetRef,
      placement: selectedPlacement,
      panelRef: selectedPanelRef || null,
      sharedStateGroup: sharedStateGroup || null,
      uiOverride: Object.keys(uiOverride).length > 0 ? uiOverride : null,
      isActive: true
    };

    const updatedInstances = [...(draft.instances || []), newInstance];
    onChange('instances', updatedInstances);

    setSelectedTargetType('');
    setSelectedTargetRef('');
    setSelectedPlacement('');
    setSelectedPanelRef('');
    setSharedStateGroup('');
    setUiOverride({});
  };

  const handleRemoveInstance = (index) => {
    const updatedInstances = [...draft.instances];
    updatedInstances.splice(index, 1);
    onChange('instances', updatedInstances);
  };

  const handleToggleInstanceActive = (index) => {
    const updatedInstances = [...draft.instances];
    updatedInstances[index].isActive = !updatedInstances[index].isActive;
    onChange('instances', updatedInstances);
  };

  const getTargetsByType = (type) => {
    return availableTargets.filter(t => t.type === type);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Placement</CardTitle>
          <CardDescription>Configure where this filter will appear</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetType">Target Type *</Label>
              <Select
                value={selectedTargetType}
                onValueChange={setSelectedTargetType}
              >
                <SelectTrigger id="targetType">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetRef">Target Reference *</Label>
              <Select
                value={selectedTargetRef}
                onValueChange={setSelectedTargetRef}
                disabled={!selectedTargetType}
              >
                <SelectTrigger id="targetRef">
                  <SelectValue placeholder="Select Target" />
                </SelectTrigger>
                <SelectContent>
                  {getTargetsByType(selectedTargetType).map(target => (
                    <SelectItem key={target.ref} value={target.ref}>
                      {target.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="placement">Placement *</Label>
              <Select
                value={selectedPlacement}
                onValueChange={setSelectedPlacement}
              >
                <SelectTrigger id="placement">
                  <SelectValue placeholder="Select Placement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toolbar">Toolbar</SelectItem>
                  <SelectItem value="sidebar">Sidebar</SelectItem>
                  <SelectItem value="inline">Inline</SelectItem>
                  <SelectItem value="modal">Modal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="panelRef">Panel Reference</Label>
              <Input
                id="panelRef"
                type="text"
                value={selectedPanelRef}
                onChange={(e) => setSelectedPanelRef(e.target.value)}
                placeholder="Optional panel ID"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sharedStateGroup">Shared State Group</Label>
              <Input
                id="sharedStateGroup"
                type="text"
                value={sharedStateGroup}
                onChange={(e) => setSharedStateGroup(e.target.value)}
                placeholder="Optional group ID for syncing"
              />
            </div>
          </div>

          <Button onClick={handleAddInstance} type="button" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Instance
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Placements</CardTitle>
          <CardDescription>
            {draft.instances?.length || 0} placement(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {(draft.instances || []).map((instance, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{instance.targetType}</Badge>
                          <span className="font-medium">{instance.targetRef}</span>
                          <Badge>{instance.placement}</Badge>
                        </div>
                        {instance.sharedStateGroup && (
                          <p className="text-sm text-muted-foreground">
                            Group: {instance.sharedStateGroup}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleToggleInstanceActive(idx)}
                          variant={instance.isActive ? "default" : "outline"}
                          size="sm"
                          type="button"
                        >
                          {instance.isActive ? 'Active' : 'Inactive'}
                        </Button>
                        <Button
                          onClick={() => handleRemoveInstance(idx)}
                          variant="destructive"
                          size="sm"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// PART 16: VALIDATION SUMMARY
// ============================================================================

const ValidationSummary = ({ errors }) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Validation Errors ({errors.length})</AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside space-y-1 mt-2">
          {errors.map((error, idx) => (
            <li key={idx}>
              <strong>{error.path || error.field}:</strong> {error.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

// ============================================================================
// PART 17: FILTER EDITOR PANEL
// ============================================================================

const FilterEditorPanel = ({ filter, onClose, onSave }) => {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(filter)));
  const [activeTab, setActiveTab] = useState('metadata');
  const [validationErrors, setValidationErrors] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = (path, value) => {
    const newDraft = { ...draft };
    
    if (typeof path === 'string') {
      newDraft[path] = value;
    } else {
      let current = newDraft;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
    }

    setDraft(newDraft);
    setIsDirty(true);
    validateDraft(newDraft);
  };

  const validateDraft = (draftToValidate = draft) => {
    const errors = [];

    if (!draftToValidate.name || draftToValidate.name.trim() === '') {
      errors.push({ field: 'name', message: 'Name is required' });
    }
    if (!draftToValidate.type) {
      errors.push({ field: 'type', message: 'Type is required' });
    }

    const defErrors = validationService.validateDefinition(draftToValidate.definition);
    errors.push(...defErrors);

    const uiErrors = validationService.validateUIConfig(draftToValidate.uiDefault || {});
    errors.push(...uiErrors);

    if (draftToValidate.status === 'published') {
      const placementErrors = validationService.validatePlacements(draftToValidate.instances);
      errors.push(...placementErrors);
    }

    setValidationErrors(errors);
    return errors;
  };

  const handleSaveDraft = async () => {
    const errors = validateDraft();
    if (errors.length > 0) {
      alert('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      const method = draft.id ? 'PUT' : 'POST';
      const url = draft.id ? `https://intelligentsalesman.com/ism1/API/filter/filters.php/${draft.id}` : 'https://intelligentsalesman.com/ism1/API/filter/filters.php';
      console.log('url------------------');
      console.log(url);
      const savedFilter = await apiRepository.apiCall(method, url, {
        ...draft,
        status: 'draft'
      });

      setDraft(savedFilter);
      setIsDirty(false);
      alert('Filter saved as draft');
    } catch (error) {
      alert(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    const errors = validateDraft({ ...draft, status: 'published' });
    if (errors.length > 0) {
      alert('Please fix all validation errors before publishing');
      return;
    }

    const confirmed = window.confirm('Publish this filter? It will be available for use.');
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const method = draft.id ? 'PUT' : 'POST';
      const url = draft.id ? `https://intelligentsalesman.com/ism1/API/filter/filters.php/${draft.id}` : 'https://intelligentsalesman.com/ism1/API/filter/filters.php';
      
      const publishedFilter = await apiRepository.apiCall(method, url, {
        ...draft,
        status: 'published',
        version: (draft.version || 0) + 1
      });

      if (publishedFilter.instances && publishedFilter.instances.length > 0) {
        await apiRepository.apiCall('POST', `https://intelligentsalesman.com/ism1/API/filter/filters.php/${publishedFilter.id}/instances`, {
          instances: publishedFilter.instances
        });
      }

      setDraft(publishedFilter);
      setIsDirty(false);
      alert('Filter published successfully');
      onSave();
      onClose();
    } catch (error) {
      alert(`Failed to publish: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('Discard unsaved changes?');
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-2xl font-bold">
          {draft.id ? `Edit Filter: ${draft.name || '(untitled)'}` : 'New Filter'}
        </h2>
        <div className="flex items-center gap-2">
          <Button onClick={handleCancel} variant="outline" type="button">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button onClick={handleSaveDraft} disabled={isSaving} type="button">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={handlePublish} disabled={isSaving} type="button">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Publish
          </Button>
        </div>
      </div>

      <ValidationSummary errors={validationErrors} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="border-b px-4">
          <TabsList>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="definition">Definition</TabsTrigger>
            <TabsTrigger value="ui">UI</TabsTrigger>
            <TabsTrigger value="targeting">Targeting</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="metadata">
              <FilterMetadataForm
                draft={draft}
                onChange={(field, value) => handleFieldChange(field, value)}
                errors={validationErrors}
              />
            </TabsContent>

            <TabsContent value="definition">
              <CreationModeTabs
                draft={draft}
                onChange={(field, value) => handleFieldChange(field, value)}
                errors={validationErrors}
              />
            </TabsContent>

            <TabsContent value="ui">
              <UIConfigPanel
                draft={draft}
                onChange={(field, value) => handleFieldChange(field, value)}
                errors={validationErrors}
              />
            </TabsContent>

            <TabsContent value="targeting">
              <TargetingPanel
                draft={draft}
                onChange={(field, value) => handleFieldChange(field, value)}
                errors={validationErrors}
              />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

// ============================================================================
// PART 18: FILTER LIST PANEL
// ============================================================================

const FilterListItem = ({ filter, onSelect, onClone, onDelete }) => {
  const getStatusVariant = (status) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'deprecated':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSelect(filter.id)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{filter.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{filter.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant={getStatusVariant(filter.status)}>{filter.status}</Badge>
              <Badge variant="outline">v{filter.version ?? 0}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button onClick={() => onClone(filter.id)} variant="outline" size="sm" type="button">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={() => onDelete(filter.id)} variant="destructive" size="sm" type="button">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const FilterListPanel = ({
  filters,
  isLoading,
  searchQuery,
  filterStatus,
  sortBy,
  currentPage,
  totalPages,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onPageChange,
  onNewFilter,
  onSelectFilter
}) => {
  const handleDeleteFilter = async (id) => {
    const confirmed = window.confirm('Delete this filter? This is a soft delete.');
    if (!confirmed) return;
    try {
      await apiRepository.apiCall('DELETE', `https://intelligentsalesman.com/ism1/API/filter/filters.php/${id}`);
      onPageChange(1);
    } catch (e) {
      alert(`Failed to delete 11: ${e.message}`);
    }
  };

  const handleCloneFilter = async (id) => {
    try {
      const original = await apiRepository.apiCall('GET', `https://intelligentsalesman.com/ism1/API/filter/filters.php/${id}`);
      const copy = {
        ...original,
        id: null,
        name: `${original.name} (Copy)`,
        status: 'draft',
        version: 0
      };
      const created = await apiRepository.apiCall('POST', 'https://intelligentsalesman.com/ism1/API/filter/filters.php', copy);
      onSelectFilter(created.id);
    } catch (e) {
      alert(`Failed to clone: ${e.message}`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FilterIcon className="h-6 w-6" />
            Filter Manager
          </h2>
          <Button onClick={onNewFilter} type="button">
            <Plus className="h-4 w-4 mr-2" />
            New Filter
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                placeholder="Search filters..."
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Select value={filterStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="created_at">Created</SelectItem>
              <SelectItem value="updated_at">Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading filters...</span>
            </div>
          ) : filters.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No filters found</p>
              </CardContent>
            </Card>
          ) : (
            filters.map(f => (
              <FilterListItem
                key={f.id}
                filter={f}
                onSelect={onSelectFilter}
                onClone={handleCloneFilter}
                onDelete={handleDeleteFilter}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <Button
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            variant="outline"
            size="sm"
            type="button"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {Math.max(totalPages, 1)}
          </span>
          <Button
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            variant="outline"
            size="sm"
            type="button"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PART 19: FILTER MANAGER SHELL
// ============================================================================

export const FilterManagerShell = () => {
  const [filters, setFilters] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadFilterList = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiRepository.apiCall('GET', 'https://intelligentsalesman.com/ism1/API/filter/filters.php', {
        search: searchQuery || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        sortBy,
        page: currentPage,
        pageSize: 20
      });
      setFilters(response.items || []);
      setTotalPages(Math.ceil((response.total || 0) / 20) || 1);
    } catch (e) {
      alert('Error loading filters');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterStatus, sortBy, currentPage]);

  useEffect(() => {
    loadFilterList();
  }, [loadFilterList]);

  const handleNewFilter = () => {
  const newDraft = {
    id: null,
    name: '',
    description: '',
    type: 'date',
    creationMode: 'manual',
    definition: { 
      root: { 
        type: 'group', 
        logical: 'AND', 
        children: [] 
      } 
    },
    uiDefault: { size: 'medium', dimensions: {}, cssClass: '', style: {} },
    instances: [],
    status: 'draft',
    version: 0
  };
  setSelectedFilter(newDraft);
};

  const handleSelectFilter = async (filterId) => {
    setIsLoading(true);
    try {
      const filter = await apiRepository.apiCall('GET', `https://intelligentsalesman.com/ism1/API/filter/filters.php/${filterId}`);
      setSelectedFilter(filter);
    } catch (e) {
      alert('Error loading filter');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseEditor = () => {
    setSelectedFilter(null);
    loadFilterList();
  };

  return (
    <div className="h-screen bg-background">
      {!selectedFilter ? (
        <FilterListPanel
          filters={filters}
          isLoading={isLoading}
          searchQuery={searchQuery}
          filterStatus={filterStatus}
          sortBy={sortBy}
          currentPage={currentPage}
          totalPages={totalPages}
          onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
          onStatusChange={(s) => { setFilterStatus(s); setCurrentPage(1); }}
          onSortChange={(s) => { setSortBy(s); setCurrentPage(1); }}
          onPageChange={(p) => setCurrentPage(p)}
          onNewFilter={handleNewFilter}
          onSelectFilter={handleSelectFilter}
        />
      ) : (
        <FilterEditorPanel
          filter={selectedFilter}
          onClose={handleCloseEditor}
          onSave={loadFilterList}
        />
      )}
    </div>
  );
};

// ============================================================================
// PART 20: RUNTIME - FILTER RENDERER AND TARGET ADAPTERS
// ============================================================================

export const FilterRenderer = ({ instance, filter }) => {
  const { registerInstance, setValue } = useFilter();
  const [localValue, setLocalValue] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    registerInstance(instance);
    const initial = inferInitialValue(filter, instance);
    setLocalValue(initial);
    if (initial !== undefined && initial !== null) {
      setValue(instance.filterId, initial);
    }
  }, [instance?.id]);

  const uiProps = defaults.applyUIProps(filter, instance);
  const debouncedSet = (nextVal) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setValue(instance.filterId, nextVal);
    }, uiProps.debounce || 300);
  };

  const onChange = (newValue) => {
    setLocalValue(newValue);
    debouncedSet(newValue);
  };

  const renderControl = () => {
    switch (filter.type) {
      case 'date':
        return <DatePicker value={localValue} onChange={onChange} disabled={false} />;
      case 'range':
        return <RangeSlider value={localValue} onChange={onChange} />;
      case 'dropdown':
        return <Dropdown value={localValue} onChange={onChange} placeholder={uiProps.placeholder} />;
      case 'multiselect':
        return <Dropdown value={localValue} onChange={onChange} placeholder={uiProps.placeholder} multiple={true} />;
      case 'text':
        return <TextInput value={localValue} onChange={onChange} placeholder={uiProps.placeholder} />;
      case 'boolean':
        return <ToggleSwitch value={localValue} onChange={onChange} />;
      default:
        return <TextInput value={localValue} onChange={onChange} placeholder={uiProps.placeholder} />;
    }
  };

  return (
    <div
      className={cn("space-y-2", uiProps.cssClass)}
      style={{ ...(uiProps.style || {}), width: uiProps.dimensions?.width, height: uiProps.dimensions?.height }}
      title={uiProps.tooltip}
    >
      {uiProps.label && <Label className="text-sm font-medium">{uiProps.label}</Label>}
      {renderControl()}
    </div>
  );
};

export const inferInitialValue = (filter, instance) => {
  if (instance?.initialValue !== undefined) return instance.initialValue;
  if (filter?.uiDefault?.initialValue !== undefined) return filter.uiDefault.initialValue;
  return defaults.getTypeDefault(filter?.type);
};

export const TableTargetAdapter = ({
  targetRef,
  serverDriven = true,
  fetchData,
  rows,
  columns,
  render
}) => {
  const { subscribe, getPredicateForTarget } = useFilter();
  const [localRows, setLocalRows] = useState(rows || []);
  const [isLoading, setIsLoading] = useState(false);

  const applyChange = useCallback(async () => {
    const { clientPredicate, serverParams } = getPredicateForTarget(targetRef);
    if (serverDriven && fetchData) {
      setIsLoading(true);
      try {
        const data = await fetchData(serverParams || {});
        setLocalRows(data || []);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!rows) return;
      const next = clientPredicate ? rows.filter(clientPredicate) : rows;
      setLocalRows(next);
    }
  }, [fetchData, getPredicateForTarget, rows, serverDriven, targetRef]);

  useEffect(() => {
    const unsubscribe = subscribe(targetRef, applyChange);
    applyChange();
    return unsubscribe;
  }, [applyChange, subscribe, targetRef]);

  if (!render) return null;
  return render({ rows: localRows, columns, isLoading });
};

export const ChartTargetAdapter = ({
  targetRef,
  serverDriven = true,
  fetchSeries,
  series,
  render
}) => {
  const { subscribe, getPredicateForTarget } = useFilter();
  const [localSeries, setLocalSeries] = useState(series || []);
  const [isLoading, setIsLoading] = useState(false);

  const applyChange = useCallback(async () => {
    const { clientPredicate, serverParams } = getPredicateForTarget(targetRef);
    if (serverDriven && fetchSeries) {
      setIsLoading(true);
      try {
        const data = await fetchSeries(serverParams || {});
        setLocalSeries(data || []);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!series) return;
      const next = clientPredicate
        ? series.map(s => ({ ...s, data: (s.data || []).filter(clientPredicate) }))
        : series;
      setLocalSeries(next);
    }
  }, [fetchSeries, getPredicateForTarget, series, serverDriven, targetRef]);

  useEffect(() => {
    const unsubscribe = subscribe(targetRef, applyChange);
    applyChange();
    return unsubscribe;
  }, [applyChange, subscribe, targetRef]);

  if (!render) return null;
  return render({ series: localSeries, isLoading });
};

// ============================================================================
// PART 21: EXPORT AGGREGATOR
// ============================================================================

export default {
  FilterProvider,
  useFilter,
  FilterManagerShell,
  FilterRenderer,
  TableTargetAdapter,
  ChartTargetAdapter
};