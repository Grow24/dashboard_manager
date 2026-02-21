// FilterManagement.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://intelligentsalesman.com/ism1/API/dashboard/filtermanagement.php';

interface FilterFieldConfig {
  fieldId: string;
  label: string;
  type: 'dropdown' | 'text' | 'date' | 'checkbox' | 'radio' | 'custom';
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: string }>;
  multiple?: boolean;
  disabled?: boolean;
  // optional: sortOrder?: number;
}

interface FilterConfig {
  id?: string;
  name: string;
  description?: string;
  position?: 'header' | 'sidebar' | 'mainPanel' | 'modal';
  theme?: string;
  collapsible?: boolean;
  debounceTime?: number;
  applyMode?: 'live' | 'manual';
  persistPreferences?: boolean;
  fields: FilterFieldConfig[];
}

function normalizeField(field: Partial<FilterFieldConfig>): FilterFieldConfig {
  return {
    fieldId: field.fieldId ?? `field_${Date.now()}`,
    label: field.label ?? '',
    type: (field.type as FilterFieldConfig['type']) ?? 'text',
    placeholder: field.placeholder ?? '',
    defaultValue: field.defaultValue ?? null,
    options: Array.isArray(field.options)
      ? field.options.map((o) => ({
          label: o?.label ?? '',
          value: o?.value ?? '',
        }))
      : [],
    multiple: !!field.multiple,
    disabled: !!field.disabled,
  };
}

function normalizeFilter(f: Partial<FilterConfig>): FilterConfig {
  return {
    id: f.id,
    name: f.name ?? '',
    description: f.description ?? '',
    position: (f.position as FilterConfig['position']) ?? 'mainPanel',
    theme: f.theme ?? 'light',
    collapsible: !!f.collapsible,
    debounceTime: typeof f.debounceTime === 'number' ? f.debounceTime : 300,
    applyMode: (f.applyMode as FilterConfig['applyMode']) ?? 'manual',
    persistPreferences: !!f.persistPreferences,
    fields: Array.isArray(f.fields) ? f.fields.map(normalizeField) : [],
  };
}

export const FilterManagement: React.FC = () => {
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [editingFilter, setEditingFilter] = useState<FilterConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}?action=list`);
      if (response.data?.success) {
        // If list endpoint returns filters without fields count, keep UI resilient
        const list: any[] = response.data.data || [];
        setFilters(
          list.map((f) =>
            normalizeFilter({
              ...f,
              // Some backends return null for fields or omit it; normalizeFilter handles that.
            })
          )
        );
      } else {
        setError(response.data?.error || 'Failed to load filters');
      }
    } catch (err: any) {
      console.error('Error loading filters:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFilter = () => {
    setEditingFilter(
      normalizeFilter({
        name: '',
        description: '',
        position: 'mainPanel',
        theme: 'light',
        collapsible: false,
        debounceTime: 300,
        applyMode: 'manual',
        persistPreferences: false,
        fields: [],
      })
    );
    setIsCreating(true);
  };

  const handleSaveFilter = async () => {
    if (!editingFilter) return;
    if (!editingFilter.name.trim()) {
      alert('Please enter a filter name');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = normalizeFilter(editingFilter);
      if (isCreating) {
        await axios.post(`${API_BASE_URL}?action=create`, payload);
      } else {
        await axios.post(`${API_BASE_URL}?action=update&id=${editingFilter.id}`, payload);
      }
      await loadFilters();
      setEditingFilter(null);
      setIsCreating(false);
    } catch (err: any) {
      console.error('Error saving filter:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save filter');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFilter = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this filter?')) return;

    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE_URL}?action=delete&id=${id}`);
      await loadFilters();
    } catch (err: any) {
      console.error('Error deleting filter:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete filter');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    if (!editingFilter) return;
    const newField = normalizeField({
      fieldId: `field_${Date.now()}`,
      label: '',
      type: 'text',
      placeholder: '',
      options: [],
      multiple: false,
      disabled: false,
    });

    setEditingFilter({
      ...editingFilter,
      fields: [...editingFilter.fields, newField],
    });
  };

  const handleUpdateField = (index: number, updates: Partial<FilterFieldConfig>) => {
    if (!editingFilter) return;

    const newFields = [...editingFilter.fields];
    const merged = { ...newFields[index], ...updates };

    // Re-normalize to enforce defined values
    newFields[index] = normalizeField(merged);

    setEditingFilter({ ...editingFilter, fields: newFields });
  };

  const handleRemoveField = (index: number) => {
    if (!editingFilter) return;

    const newFields = editingFilter.fields.filter((_, i) => i !== index);
    setEditingFilter({ ...editingFilter, fields: newFields });
  };

  const handleAddOption = (fieldIndex: number) => {
    if (!editingFilter) return;

    const newFields = [...editingFilter.fields];
    const field = newFields[fieldIndex];
    const options = Array.isArray(field.options) ? field.options : [];
    field.options = [...options, { label: '', value: '' }];
    newFields[fieldIndex] = normalizeField(field);
    setEditingFilter({ ...editingFilter, fields: newFields });
  };

  const handleUpdateOption = (
    fieldIndex: number,
    optionIndex: number,
    updates: Partial<{ label: string; value: string }>
  ) => {
    if (!editingFilter) return;

    const newFields = [...editingFilter.fields];
    const field = newFields[fieldIndex];
    const options = Array.isArray(field.options) ? [...field.options] : [];
    const current = options[optionIndex] ?? { label: '', value: '' };
    options[optionIndex] = {
      label: updates.label ?? current.label ?? '',
      value: updates.value ?? current.value ?? '',
    };
    field.options = options;
    newFields[fieldIndex] = normalizeField(field);
    setEditingFilter({ ...editingFilter, fields: newFields });
  };

  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    if (!editingFilter) return;

    const newFields = [...editingFilter.fields];
    const field = newFields[fieldIndex];
    field.options = (field.options ?? []).filter((_, i) => i !== optionIndex);
    newFields[fieldIndex] = normalizeField(field);
    setEditingFilter({ ...editingFilter, fields: newFields });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Filter Management</h1>
          <button
            onClick={handleCreateFilter}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            <span>Create Filter</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading && !editingFilter && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!editingFilter && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                No filters found. Create your first filter to get started.
              </div>
            ) : (
              filters.map((filter) => (
                <div
                  key={filter.id}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {filter.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {filter.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{filter.fields?.length || 0} fields</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      {filter.position}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingFilter(normalizeFilter(filter));
                        setIsCreating(false);
                      }}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => filter.id && handleDeleteFilter(filter.id)}
                      className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {editingFilter && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {isCreating ? 'Create Filter' : 'Edit Filter'}
              </h2>
              <button
                onClick={() => {
                  setEditingFilter(null);
                  setIsCreating(false);
                  setError(null);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter Name *
                </label>
                <input
                  type="text"
                  value={editingFilter.name ?? ''}
                  onChange={(e) =>
                    setEditingFilter({ ...editingFilter, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter filter name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingFilter.description ?? ''}
                  onChange={(e) =>
                    setEditingFilter({
                      ...editingFilter,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select
                    value={editingFilter.position ?? 'mainPanel'}
                    onChange={(e) =>
                      setEditingFilter({
                        ...editingFilter,
                        position: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="header">Header</option>
                    <option value="sidebar">Sidebar</option>
                    <option value="mainPanel">Main Panel</option>
                    <option value="modal">Modal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apply Mode
                  </label>
                  <select
                    value={editingFilter.applyMode ?? 'manual'}
                    onChange={(e) =>
                      setEditingFilter({
                        ...editingFilter,
                        applyMode: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="manual">Manual</option>
                    <option value="live">Live</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!!editingFilter.collapsible}
                    onChange={(e) =>
                      setEditingFilter({
                        ...editingFilter,
                        collapsible: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Collapsible</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!!editingFilter.persistPreferences}
                    onChange={(e) =>
                      setEditingFilter({
                        ...editingFilter,
                        persistPreferences: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Persist Preferences</span>
                </label>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filter Fields</h3>
                <button
                  onClick={handleAddField}
                  className="flex items-center space-x-1 px-3 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Field</span>
                </button>
              </div>

              <div className="space-y-4">
                {editingFilter.fields.map((field, fieldIndex) => (
                  <div
                    key={fieldIndex}
                    className="border rounded-lg p-4 bg-gray-50 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium text-gray-700">
                        Field {fieldIndex + 1}
                      </h4>
                      <button
                        onClick={() => handleRemoveField(fieldIndex)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Field ID *
                        </label>
                        <input
                          type="text"
                          value={field.fieldId ?? ''}
                          onChange={(e) =>
                            handleUpdateField(fieldIndex, { fieldId: e.target.value })
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="field_id"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Label *
                        </label>
                        <input
                          type="text"
                          value={field.label ?? ''}
                          onChange={(e) =>
                            handleUpdateField(fieldIndex, { label: e.target.value })
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Field Label"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Type *
                        </label>
                        <select
                          value={field.type ?? 'text'}
                          onChange={(e) =>
                            handleUpdateField(fieldIndex, {
                              type: e.target.value as any,
                            })
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="text">Text</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="date">Date</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="radio">Radio</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={field.placeholder ?? ''}
                          onChange={(e) =>
                            handleUpdateField(fieldIndex, { placeholder: e.target.value })
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Placeholder text"
                        />
                      </div>
                    </div>

                    {['dropdown', 'checkbox', 'radio'].includes(field.type) && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-gray-600">
                            Options
                          </label>
                          <button
                            onClick={() => handleAddOption(fieldIndex)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            + Add Option
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(field.options ?? []).map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={option?.label ?? ''}
                                onChange={(e) =>
                                  handleUpdateOption(fieldIndex, optionIndex, {
                                    label: e.target.value,
                                  })
                                }
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Label"
                              />
                              <input
                                type="text"
                                value={option?.value ?? ''}
                                onChange={(e) =>
                                  handleUpdateOption(fieldIndex, optionIndex, {
                                    value: e.target.value,
                                  })
                                }
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Value"
                              />
                              <button
                                onClick={() => handleRemoveOption(fieldIndex, optionIndex)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-4">
                      {field.type === 'dropdown' && (
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={!!field.multiple}
                            onChange={(e) =>
                              handleUpdateField(fieldIndex, {
                                multiple: e.target.checked,
                              })
                            }
                            className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-700">Multiple</span>
                        </label>
                      )}
                      <label className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={!!field.disabled}
                          onChange={(e) =>
                            handleUpdateField(fieldIndex, {
                              disabled: e.target.checked,
                            })
                          }
                          className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-700">Disabled</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t">
              <button
                onClick={() => {
                  setEditingFilter(null);
                  setIsCreating(false);
                  setError(null);
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Filter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterManagement;