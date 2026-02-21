import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { Filter, FilterInstance, Predicate } from '../types/filter.types';
import { generatePredicate } from '../services/predicateService';
import { apiCall } from '../services/apiRepository';

interface FilterContextState {
  activeFilters: Map<string, any>;
  registeredInstances: Map<string, FilterInstance>;
  predicateCache: Map<string, Predicate>;
  subscribers: Map<string, Set<() => void>>;
  isLoading: boolean;
}

interface FilterContextValue extends FilterContextState {
  registerInstance: (instance: FilterInstance) => void;
  setValue: (filterId: string, newValue: any) => void;
  subscribe: (targetRef: string, callback: () => void) => () => void;
  getPredicateForTarget: (targetRef: string) => Predicate;
  clearScope: (scopeId: string) => void;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

type Action =
  | { type: 'REGISTER_INSTANCE'; payload: FilterInstance }
  | { type: 'SET_VALUE'; payload: { filterId: string; value: any } }
  | { type: 'UPDATE_PREDICATES'; payload: { targetRef: string; predicate: Predicate } }
  | { type: 'ADD_SUBSCRIBER'; payload: { targetRef: string; callback: () => void } }
  | { type: 'REMOVE_SUBSCRIBER'; payload: { targetRef: string; callback: () => void } }
  | { type: 'CLEAR_SCOPE' };

function filterReducer(state: FilterContextState, action: Action): FilterContextState {
  switch (action.type) {
    case 'REGISTER_INSTANCE': {
      const newInstances = new Map(state.registeredInstances);
      newInstances.set(action.payload.id, action.payload);
      return { ...state, registeredInstances: newInstances };
    }
    case 'SET_VALUE': {
      const newFilters = new Map(state.activeFilters);
      newFilters.set(action.payload.filterId, action.payload.value);
      return { ...state, activeFilters: newFilters };
    }
    case 'UPDATE_PREDICATES': {
      const newCache = new Map(state.predicateCache);
      newCache.set(action.payload.targetRef, action.payload.predicate);
      return { ...state, predicateCache: newCache };
    }
    default:
      return state;
  }
}

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(filterReducer, {
    activeFilters: new Map(),
    registeredInstances: new Map(),
    predicateCache: new Map(),
    subscribers: new Map(),
    isLoading: false,
  });

  const subscribersRef = useRef<Map<string, Set<() => void>>>(new Map());
  const filtersCache = useRef<Map<string, Filter>>(new Map());

  const registerInstance = useCallback((instance: FilterInstance) => {
    dispatch({ type: 'REGISTER_INSTANCE', payload: instance });
  }, []);

  const findAffectedTargets = useCallback((filterId: string): Set<string> => {
    const targets = new Set<string>();
    state.registeredInstances.forEach((instance) => {
      if (instance.filterId === filterId && instance.isActive) {
        targets.add(instance.targetRef);
      }
    });
    return targets;
  }, [state.registeredInstances]);

  const getFilterDefinition = useCallback(async (filterId: string): Promise<Filter> => {
    if (filtersCache.current.has(filterId)) {
      return filtersCache.current.get(filterId)!;
    }
    const filter = await apiCall<Filter>('GET', `/api/v1/filters/${filterId}`);
    filtersCache.current.set(filterId, filter);
    return filter;
  }, []);

  const buildCombinedPredicate = useCallback(async (instances: FilterInstance[]): Promise<Predicate> => {
    const predicates: Predicate[] = [];
    
    for (const instance of instances) {
      const filterDef = await getFilterDefinition(instance.filterId);
      const filterValue = state.activeFilters.get(instance.filterId);
      
      if (filterValue != null) {
        const singlePredicate = generatePredicate(filterDef.definition, filterValue);
        predicates.push(singlePredicate);
      }
    }

    // Combine with AND logic
    const combinedClientPredicate = predicates.length > 0
      ? (row: any) => predicates.every(p => p.clientPredicate ? p.clientPredicate(row) : true)
      : null;

    const combinedServerParams = predicates.reduce((acc, p) => ({ ...acc, ...p.serverParams }), {});

    return {
      clientPredicate: combinedClientPredicate,
      serverParams: combinedServerParams,
    };
  }, [state.activeFilters, getFilterDefinition]);

  const recomputePredicates = useCallback(async (targetRefs: Set<string>) => {
    for (const targetRef of targetRefs) {
      const instances = Array.from(state.registeredInstances.values())
        .filter(inst => inst.targetRef === targetRef && inst.isActive);
      
      const combinedPredicate = await buildCombinedPredicate(instances);
      dispatch({ type: 'UPDATE_PREDICATES', payload: { targetRef, predicate: combinedPredicate } });
    }
  }, [state.registeredInstances, buildCombinedPredicate]);

  const notifySubscribers = useCallback((targetRefs: Set<string>) => {
    targetRefs.forEach(targetRef => {
      const callbacks = subscribersRef.current.get(targetRef);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Error in subscriber callback:', error);
          }
        });
      }
    });
  }, []);

  const setValue = useCallback(async (filterId: string, newValue: any) => {
    const oldValue = state.activeFilters.get(filterId);
    if (oldValue === newValue) return;

    dispatch({ type: 'SET_VALUE', payload: { filterId, value: newValue } });
    
    const affectedTargets = findAffectedTargets(filterId);
    await recomputePredicates(affectedTargets);
    notifySubscribers(affectedTargets);
  }, [state.activeFilters, findAffectedTargets, recomputePredicates, notifySubscribers]);

  const subscribe = useCallback((targetRef: string, callback: () => void) => {
    if (!subscribersRef.current.has(targetRef)) {
      subscribersRef.current.set(targetRef, new Set());
    }
    subscribersRef.current.get(targetRef)!.add(callback);

    return () => {
      subscribersRef.current.get(targetRef)?.delete(callback);
    };
  }, []);

  const getPredicateForTarget = useCallback((targetRef: string): Predicate => {
    return state.predicateCache.get(targetRef) || { clientPredicate: null, serverParams: {} };
  }, [state.predicateCache]);

  const clearScope = useCallback(async (scopeId: string) => {
    const affectedTargets = new Set<string>();
    state.activeFilters.forEach((_, filterId) => {
      dispatch({ type: 'SET_VALUE', payload: { filterId, value: null } });
      findAffectedTargets(filterId).forEach(t => affectedTargets.add(t));
    });
    await recomputePredicates(affectedTargets);
    notifySubscribers(affectedTargets);
  }, [state.activeFilters, findAffectedTargets, recomputePredicates, notifySubscribers]);

  const value: FilterContextValue = {
    ...state,
    registerInstance,
    setValue,
    subscribe,
    getPredicateForTarget,
    clearScope,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within FilterProvider');
  }
  return context;
};