// FilterComponent.tsx
import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { ChevronDown, ChevronUp, X, Filter as FilterIcon } from 'lucide-react';

// Types
export interface FilterFieldConfig {
  id: string;
  label: string;
  type: 'dropdown' | 'text' | 'date' | 'checkbox' | 'radio' | 'custom';
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  validation?: (value: any) => boolean | string;
  customComponent?: React.ComponentType<any>;
  multiple?: boolean;
  disabled?: boolean;
}

export interface FilterConfig {
  fields: FilterFieldConfig[];
  position?: 'header' | 'sidebar' | 'mainPanel' | 'modal';
  theme?: string;
  collapsible?: boolean;
  debounceTime?: number;
  applyMode?: 'live' | 'manual';
  persistPreferences?: boolean;
}

export interface FilterProps {
  config: FilterConfig;
  initialValues?: Record<string, any>;
  onChange?: (values: Record<string, any>) => void;
  onApply?: (values: Record<string, any>) => void;
  onReset?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface FilterRef {
  getValues: () => Record<string, any>;
  setValues: (values: Record<string, any>) => void;
  reset: () => void;
  apply: () => void;
  validate: () => boolean;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Filter Component
export const FilterComponent = forwardRef<FilterRef, FilterProps>(
  (
    {
      config,
      initialValues = {},
      onChange,
      onApply,
      onReset,
      className = '',
      style = {},
    },
    ref
  ) => {
    const [values, setValues] = useState<Record<string, any>>(() => {
      const initial: Record<string, any> = {};
      config.fields.forEach((field) => {
        initial[field.id] = initialValues[field.id] ?? field.defaultValue ?? '';
      });
      return initial;
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isCollapsed, setIsCollapsed] = useState(false);
    const debouncedValues = useDebounce(values, config.debounceTime || 300);
    const isFirstRender = useRef(true);

    // Handle debounced changes
    useEffect(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      onChange?.(debouncedValues);

      if (config.applyMode === 'live') {
        onApply?.(debouncedValues);
      }
    }, [debouncedValues]);

    // Validate all fields
    const validate = useCallback((): boolean => {
      const newErrors: Record<string, string> = {};
      let isValid = true;

      config.fields.forEach((field) => {
        if (field.validation) {
          const result = field.validation(values[field.id]);
          if (result !== true) {
            newErrors[field.id] = typeof result === 'string' ? result : 'Invalid value';
            isValid = false;
          }
        }
      });

      setErrors(newErrors);
      return isValid;
    }, [config.fields, values]);

    // Imperative methods
    useImperativeHandle(ref, () => ({
      getValues: () => values,
      setValues: (newValues: Record<string, any>) => {
        setValues((prev) => ({ ...prev, ...newValues }));
      },
      reset: () => {
        const resetValues: Record<string, any> = {};
        config.fields.forEach((field) => {
          resetValues[field.id] = field.defaultValue ?? '';
        });
        setValues(resetValues);
        setErrors({});
        onReset?.();
      },
      apply: () => {
        if (validate()) {
          onApply?.(values);
        }
      },
      validate,
    }));

    // Handle field change
    const handleFieldChange = (fieldId: string, value: any) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    };

    // Handle apply
    const handleApply = () => {
      if (validate()) {
        onApply?.(values);
      }
    };

    // Handle reset
    const handleReset = () => {
      const resetValues: Record<string, any> = {};
      config.fields.forEach((field) => {
        resetValues[field.id] = field.defaultValue ?? '';
      });
      setValues(resetValues);
      setErrors({});
      onReset?.();
    };

    // Render field based on type
    const renderField = (field: FilterFieldConfig) => {
      const value = values[field.id];
      const error = errors[field.id];

      switch (field.type) {
        case 'text':
          return (
            <div key={field.id} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
              </label>
              <input
                type="text"
                value={value || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          );

        case 'dropdown':
          return (
            <div key={field.id} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
              </label>
              {field.multiple ? (
                <select
                  multiple
                  value={Array.isArray(value) ? value : []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                    handleFieldChange(field.id, selected);
                  }}
                  disabled={field.disabled}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  size={4}
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={value || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  disabled={field.disabled}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">{field.placeholder || 'Select...'}</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          );

        case 'date':
          return (
            <div key={field.id} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
              </label>
              <input
                type="date"
                value={value || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                disabled={field.disabled}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          );

        case 'checkbox':
          return (
            <div key={field.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
              </label>
              <div className="space-y-2">
                {field.options?.map((option) => (
                  <label key={option.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={Array.isArray(value) && value.includes(option.value)}
                      onChange={(e) => {
                        const currentValues = Array.isArray(value) ? value : [];
                        const newValues = e.target.checked
                          ? [...currentValues, option.value]
                          : currentValues.filter((v) => v !== option.value);
                        handleFieldChange(field.id, newValues);
                      }}
                      disabled={field.disabled}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          );

        case 'radio':
          return (
            <div key={field.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
              </label>
              <div className="space-y-2">
                {field.options?.map((option) => (
                  <label key={option.value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name={field.id}
                      checked={value === option.value}
                      onChange={() => handleFieldChange(field.id, option.value)}
                      disabled={field.disabled}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          );

        case 'custom':
          if (field.customComponent) {
            const CustomComponent = field.customComponent;
            return (
              <div key={field.id} className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                <CustomComponent
                  value={value}
                  onChange={(newValue: any) => handleFieldChange(field.id, newValue)}
                  disabled={field.disabled}
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
              </div>
            );
          }
          return null;

        default:
          return null;
      }
    };

    // Position-based styling
    const getPositionClasses = () => {
      switch (config.position) {
        case 'header':
          return 'bg-white border-b shadow-sm';
        case 'sidebar':
          return 'bg-white border-r shadow-sm h-full';
        case 'modal':
          return 'bg-white rounded-lg shadow-xl';
        case 'mainPanel':
        default:
          return 'bg-white border rounded-lg shadow-sm';
      }
    };

    return (
      <div
        className={`${getPositionClasses()} ${className}`}
        style={style}
      >
        {/* Header */}
        {config.collapsible && (
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <div className="flex items-center space-x-2">
              <FilterIcon className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
            </div>
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            )}
          </div>
        )}

        {/* Filter Fields */}
        {(!config.collapsible || !isCollapsed) && (
          <div className="p-4 space-y-4">
            {config.fields.map((field) => renderField(field))}

            {/* Action Buttons */}
            {config.applyMode === 'manual' && (
              <div className="flex items-center space-x-3 pt-4 border-t">
                <button
                  onClick={handleApply}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

FilterComponent.displayName = 'FilterComponent';

export default FilterComponent;