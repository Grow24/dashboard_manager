/*****************************************************
 COMPLETE FILTER PIPELINE IMPLEMENTATION
 -----------------------------------------------------
 Real data from `sales_data` via PHP API, with server-side
 filtering and summary stats.
*****************************************************/

import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Filter, BarChart3, AlertCircle, CheckCircle, Download } from "lucide-react";

// Use your external PHP API base to avoid CORS
const API_BASE = (typeof window !== 'undefined' && window.FILTERS_API)
  || process.env.NEXT_PUBLIC_FILTERS_API
  || "https://intelligentsalesman.com/ism1/API/api/filters.php";

class FilterAPI {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE}?action=${endpoint}`;
    const config = {
      ...options,
      headers: { 
        "Content-Type": "application/json", 
        ...(options.headers || {}) 
      },
      cache: "no-store",
    };

    const res = await fetch(url, config);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data?.success === false) throw new Error(data?.error || data?.message || "Request failed");
    return data;
  }

  static async saveFilterExample(type, example) {
    return this.request('save_example', {
      method: "POST",
      body: JSON.stringify({ type, example }),
    });
  }

  static async createFilter(type, filterData, metadata = {}) {
    return this.request('create_filter', {
      method: "POST",
      body: JSON.stringify({ 
        type, 
        filterData, 
        metadata: {
          name: metadata.name || `${type} Filter`,
          description: metadata.description || '',
          tags: metadata.tags || [],
          ...metadata
        }
      }),
    });
  }

  static async listFilters(filters = {}) {
    const params = new URLSearchParams(filters);
    const endpoint = `list_filters${params.toString() ? `&${params.toString()}` : ''}`;
    return this.request(endpoint, { method: "GET" });
  }

  static async getFilter(id) {
    return this.request(`get_filter&id=${id}`, { method: "GET" });
  }

  static async updateFilter(id, updates) {
    return this.request('update_filter', {
      method: "POST",
      body: JSON.stringify({ id, ...updates }),
    });
  }

  static async deleteFilter(id) {
    return this.request('delete_filter', {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  }

  // Now returns live rows and server-computed summary from sales_data
  static async previewFilteredData(filterRecord) {
    return this.request('apply_preview', {
      method: "POST",
      body: JSON.stringify({ filter: filterRecord }),
    });
  }

  static async exportFilters(filterIds = []) {
    return this.request('export_filters', {
      method: "POST",
      body: JSON.stringify({ filterIds }),
    });
  }

  static async importFilters(filtersData) {
    return this.request('import_filters', {
      method: "POST",
      body: JSON.stringify({ filters: filtersData }),
    });
  }

  static async validateFilter(type, filterData) {
    return this.request('validate_filter', {
      method: "POST",
      body: JSON.stringify({ type, filterData }),
    });
  }
}

// Filter types updated to reference your sales_data schema
const FILTER_TYPES = [
  {
    key: "extract",
    label: "Extract Filters",
    icon: Database,
    category: "Data Source",
    description: "Limit the dataset early using date or categorical conditions on createdAt, country, or status.",
    example: {
      field: "createdAt",
      condition: "Year >= 2023",
      effect: "Only loads rows from 2023 onwards",
      performance: "High impact on load and query time"
    },
    form: [
      {
        name: "field",
        label: "Field Name",
        type: "text",
        placeholder: "e.g. createdAt, country, status",
        required: true,
        validation: "required|string|min:1"
      },
      {
        name: "condition",
        label: "Extract Condition",
        type: "text",
        placeholder: "e.g. Year >= 2023, country IN ('US','IN')",
        required: true,
        validation: "required|string|min:1"
      },
      {
        name: "dataType",
        label: "Field Data Type",
        type: "select",
        required: true,
        options: [
          { value: "date", label: "Date/DateTime" },
          { value: "string", label: "String/Text" },
          { value: "number", label: "Number" },
          { value: "boolean", label: "Boolean" }
        ]
      }
    ],
    validationRules: {
      field: "required|string|min:1|max:100",
      condition: "required|string|min:1|max:500",
      dataType: "required|in:date,string,number,boolean"
    }
  },
  {
    key: "datasource",
    label: "Data Source Filters",
    icon: Database,
    category: "Data Source",
    description: "Global conditions like excluding inactive rows or restricting to specific countries.",
    example: {
      field: "status",
      condition: "!= 'inactive'",
      effect: "Excludes inactive records",
      scope: "Global - affects all visualizations"
    },
    form: [
      {
        name: "field",
        label: "Field Name",
        type: "text",
        placeholder: "e.g. country, status, state",
        required: true
      },
      {
        name: "condition",
        label: "Filter Condition",
        type: "text",
        placeholder: "e.g. != 'inactive', IN ('US','IN')",
        required: true
      },
      {
        name: "operator",
        label: "Operator",
        type: "select",
        required: true,
        options: [
          { value: "equals", label: "Equals (=)" },
          { value: "not_equals", label: "Not Equals (!=)" },
          { value: "in", label: "In List (IN)" },
          { value: "not_in", label: "Not In List (NOT IN)" },
          { value: "contains", label: "Contains" },
          { value: "starts_with", label: "Starts With" }
        ]
      }
    ]
  },
  {
    key: "context",
    label: "Context Filters",
    icon: Filter,
    category: "Performance",
    description: "Subset the data first, e.g., top N names by salesQuantity.",
    example: {
      field: "name",
      condition: "Top 10 by salesQuantity",
      effect: "All other filters operate on those top names",
      performance: "Improves performance for subsequent filters"
    },
    form: [
      { name: "field", label: "Field Name", type: "text", placeholder: "e.g. name, country", required: true },
      { name: "condition", label: "Context Condition", type: "text", placeholder: "e.g. Top 10 by salesQuantity", required: true },
      {
        name: "contextType",
        label: "Context Type",
        type: "select",
        required: true,
        options: [
          { value: "top_n", label: "Top N" },
          { value: "bottom_n", label: "Bottom N" },
          { value: "top_percent", label: "Top Percentage" },
          { value: "bottom_percent", label: "Bottom Percentage" },
          { value: "custom", label: "Custom Condition" }
        ]
      },
      {
        name: "measureField",
        label: "Measure Field (for Top/Bottom)",
        type: "text",
        placeholder: "e.g. salesQuantity, salary, salesAmount",
        required: false
      }
    ]
  },
  {
    key: "dimension",
    label: "Dimension Filters",
    icon: Filter,
    category: "Standard",
    description: "Filter categorical fields like country, status, state, or name.",
    example: {
      field: "country",
      condition: "US, IN",
      effect: "Shows only US and IN records",
      filterType: "Include values"
    },
    form: [
      { name: "field", label: "Dimension Field", type: "text", placeholder: "e.g. country, status, state, name", required: true },
      { name: "condition", label: "Filter Values", type: "textarea", placeholder: "e.g. US, IN (comma-separated)", required: true },
      {
        name: "filterType",
        label: "Filter Type",
        type: "select",
        required: true,
        options: [
          { value: "include", label: "Include Values" },
          { value: "exclude", label: "Exclude Values" },
          { value: "wildcard", label: "Wildcard Match" },
          { value: "condition", label: "Conditional" }
        ]
      },
      {
        name: "subtype",
        label: "Advanced Options",
        type: "select",
        required: false,
        options: [
          { value: "set", label: "Use Set" },
          { value: "topn", label: "Top N" },
          { value: "lod", label: "Fixed LOD" },
          { value: "parameter", label: "Parameter-driven" }
        ]
      }
    ]
  },
  {
    key: "measure",
    label: "Measure Filters",
    icon: BarChart3,
    category: "Standard",
    description: "Filter numeric fields like salesQuantity, salary, age, or salesAmount.",
    example: {
      field: "salesAmount",
      condition: "> 10000",
      effect: "Shows only rows with salesAmount > 10,000",
      aggregation: "SUM"
    },
    form: [
      { name: "field", label: "Measure Field", type: "text", placeholder: "e.g. salesQuantity, salary, age, salesAmount", required: true },
      { name: "condition", label: "Condition", type: "text", placeholder: "e.g. > 1000, BETWEEN 500 AND 2000", required: true },
      {
        name: "aggregation",
        label: "Aggregation",
        type: "select",
        required: true,
        options: [
          { value: "sum", label: "SUM" },
          { value: "avg", label: "AVG" },
          { value: "min", label: "MIN" },
          { value: "max", label: "MAX" },
          { value: "count", label: "COUNT" },
          { value: "countd", label: "COUNT DISTINCT" }
        ]
      },
      {
        name: "subtype",
        label: "Advanced Type",
        type: "select",
        required: false,
        options: [
          { value: "include_lod", label: "Include/Exclude LOD" },
          { value: "blending", label: "Data Blending" },
          { value: "parameter", label: "Parameter-driven" }
        ]
      }
    ]
  },
  {
    key: "tablecalc",
    label: "Table Calculation Filters",
    icon: BarChart3,
    category: "Advanced",
    description: "Post-aggregation filters (conceptual). Preview limits result set.",
    example: {
      calculation: "RUNNING_SUM(SUM(salesQuantity))",
      condition: "> 50000",
      effect: "Rows where running sum exceeds 50,000",
      orderOfOps: "Applied after other filters"
    },
    form: [
      { name: "calculation", label: "Table Calculation", type: "text", placeholder: "e.g. RUNNING_SUM(SUM(salesQuantity))", required: true },
      { name: "condition", label: "Filter Condition", type: "text", placeholder: "e.g. > 50000", required: true },
      {
        name: "calcType",
        label: "Calculation Type",
        type: "select",
        required: true,
        options: [
          { value: "running_total", label: "Running Total" },
          { value: "moving_average", label: "Moving Average" },
          { value: "percent_total", label: "Percent of Total" },
          { value: "rank", label: "Rank" },
          { value: "percentile", label: "Percentile" },
          { value: "custom", label: "Custom Formula" }
        ]
      }
    ]
  },
  {
    key: "visual",
    label: "Visual Analytics",
    icon: BarChart3,
    category: "Analytics",
    description: "Guidance: use trend/forecast on createdAt vs salesAmount/salesQuantity/salary.",
    example: {
      feature: "Trend",
      field: "createdAt vs salesQuantity",
      effect: "Displays trend over time",
      analyticsType: "Linear regression"
    },
    form: [
      {
        name: "feature",
        label: "Analytics Feature",
        type: "select",
        required: true,
        options: [
          { value: "trend", label: "Trend Line" },
          { value: "reference", label: "Reference Line" },
          { value: "forecast", label: "Forecast" },
          { value: "cluster", label: "Clustering" },
          { value: "outlier", label: "Outlier Detection" }
        ]
      },
      { name: "field", label: "Target Field", type: "text", placeholder: "e.g. salesAmount, salesQuantity, salary", required: true },
      {
        name: "trendType",
        label: "Trend Type",
        type: "select",
        required: false,
        options: [
          { value: "linear", label: "Linear" },
          { value: "logarithmic", label: "Logarithmic" },
          { value: "exponential", label: "Exponential" },
          { value: "polynomial", label: "Polynomial" }
        ]
      }
    ]
  }
];

class FilterValidator {
  static validate(filterType, formData) {
    const errors = {};
    const filter = FILTER_TYPES.find(f => f.key === filterType);
    if (!filter) {
      errors.general = "Invalid filter type";
      return { isValid: false, errors };
    }
    filter.form.forEach(field => {
      const value = formData[field.name];
      const rules = field.validation || '';
      if (field.required && (!value || String(value).trim() === '')) {
        errors[field.name] = `${field.label} is required`;
        return;
      }
      if (value && rules.includes('min:')) {
        const min = parseInt(rules.match(/min:(\d+)/)?.[1] || '0');
        if (String(value).length < min) errors[field.name] = `${field.label} must be at least ${min} characters`;
      }
      if (value && rules.includes('max:')) {
        const max = parseInt(rules.match(/max:(\d+)/)?.[1] || '1000');
        if (String(value).length > max) errors[field.name] = `${field.label} must be less than ${max} characters`;
      }
    });
    return { isValid: Object.keys(errors).length === 0, errors };
  }
}

function FilterTab({ filter, onSaved }) {
  const [form, setForm] = useState(() => filter.form.reduce((acc, f) => ({ ...acc, [f.name]: "" }), {}));
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState({});
  const [metadata, setMetadata] = useState({ name: "", description: "", tags: [] });

  const handleChange = (e, name) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };
  const handleSelect = (value, name) => {
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = async () => {
    setValidating(true);
    try {
      const validation = FilterValidator.validate(filter.key, form);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return false;
      }
      const serverValidation = await FilterAPI.validateFilter(filter.key, form);
      if (serverValidation?.isValid === false) {
        setErrors(serverValidation.errors || {});
        return false;
      }
      setErrors({});
      return true;
    } catch (_e) {
      setErrors({ general: "Validation failed. Please check your inputs." });
      return false;
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isValid = await validateForm();
    if (!isValid) return;
    setSaving(true);
    try {
      await FilterAPI.saveFilterExample(filter.key, form);
      await FilterAPI.createFilter(filter.key, form, {
        name: metadata.name || `${filter.label} - ${new Date().toLocaleDateString()}`,
        description: metadata.description,
        tags: metadata.tags
      });
      setForm(filter.form.reduce((acc, f) => ({ ...acc, [f.name]: "" }), {}));
      setMetadata({ name: "", description: "", tags: [] });
      onSaved?.();
      alert("Filter saved successfully!");
    } catch (error) {
      setErrors({ general: error.message || "Failed to save filter" });
    } finally {
      setSaving(false);
    }
  };

  const IconComponent = filter.icon;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <Card className="flex-1 shadow-lg border border-gray-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center gap-3">
            <IconComponent className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">{filter.label}</h2>
              <Badge variant="secondary" className="mt-1">{filter.category}</Badge>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mt-2">{filter.description}</p>
        </CardHeader>

        <CardContent className="p-6">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{errors.general}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Filter Name</label>
                  <Input type="text" placeholder="e.g. Q4 Sales Filter" value={metadata.name}
                    onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Input type="text" placeholder="Brief description of this filter" value={metadata.description}
                    onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))} className="mt-1" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Filter Configuration</h3>
              {filter.form.map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    {field.label}{field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === "select" ? (
                    <Select value={form[field.name]} onValueChange={(v) => handleSelect(v, field.name)}>
                      <SelectTrigger className={`w-full ${errors[field.name] ? 'border-red-300' : ''}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "textarea" ? (
                    <textarea placeholder={field.placeholder} value={form[field.name]} onChange={(e) => handleChange(e, field.name)}
                      className={`w-full px-3 py-2 border rounded-md resize-none h-20 ${errors[field.name] ? 'border-red-300' : 'border-gray-300'}`} />
                  ) : (
                    <Input type="text" placeholder={field.placeholder} value={form[field.name]}
                      onChange={(e) => handleChange(e, field.name)} className={`w-full ${errors[field.name] ? 'border-red-300' : ''}`} />
                  )}
                  {errors[field.name] && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{errors[field.name]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Button type="submit" disabled={saving || validating} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              {saving ? "Saving..." : validating ? "Validating..." : (<><CheckCircle className="h-4 w-4 mr-2" />Save Filter & Create Example</>)}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:w-80 bg-gray-50 border border-gray-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Example Usage</h3>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            {Object.entries(filter.example).map(([key, value]) => (
              <div key={key} className="border-l-4 border-blue-400 pl-3">
                <span className="text-sm font-semibold text-gray-700 capitalize block">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-sm text-gray-600">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SavedFiltersPanel({ selected, setSelected, refreshSignal }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");

  const filteredFilters = useMemo(() => {
    let result = filters;
    if (searchTerm) {
      result = result.filter(f =>
        f.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.metadata?.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterType !== "all") {
      result = result.filter(f => f.type === filterType);
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "name": return (a.metadata?.name || a.type).localeCompare(b.metadata?.name || b.type);
        case "type": return a.type.localeCompare(b.type);
        case "created_at":
        default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });
    return result;
  }, [filters, searchTerm, filterType, sortBy]);

  const loadFilters = async () => {
    setLoading(true); setError("");
    try {
      const response = await FilterAPI.listFilters();
      const data = Array.isArray(response?.data) ? response.data : [];
      const processedData = data.map(filter => ({
        ...filter,
        metadata: typeof filter.metadata === 'string' ? JSON.parse(filter.metadata || '{}') : (filter.metadata || {}),
        config: typeof filter.config === 'string' ? JSON.parse(filter.config || '{}') : (filter.config || {})
      }));
      setFilters(processedData);
      if (processedData.length && !selected) setSelected(processedData[0]);
    } catch (error) {
      setError(error.message || "Failed to load filters");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filterId) => {
    if (!confirm("Are you sure you want to delete this filter?")) return;
    try {
      await FilterAPI.deleteFilter(filterId);
      setFilters(prev => prev.filter(f => f.id !== filterId));
      if (selected?.id === filterId) setSelected(null);
    } catch (error) {
      alert("Failed to delete filter: " + error.message);
    }
  };

  const handleExport = async () => {
    try {
      const selectedIds = filters.map(f => f.id);
      const exportData = await FilterAPI.exportFilters(selectedIds);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tableau-filters-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Export failed: " + error.message);
    }
  };

  useEffect(() => { loadFilters(); }, [refreshSignal]);

  return (
    <Card className="border border-gray-200">
      <CardHeader className="bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Filter Library</h3>
            <p className="text-sm text-gray-600">Manage and preview your saved filters</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!filters.length}>
              <Download className="h-4 w-4 mr-1" />Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-3 mb-4">
          <Input type="text" placeholder="Search filters..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full" />
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {FILTER_TYPES.map(type => (<SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && (<div className="text-center py-4"><div className="text-sm text-gray-500">Loading filters...</div></div>)}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}
        {!loading && !filteredFilters.length && (
          <div className="text-center py-8">
            <Filter className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <div className="text-sm text-gray-600">
              {searchTerm || filterType !== "all" ? "No filters match your criteria" : "No saved filters yet. Create one from the tabs above."}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {filteredFilters.map((filter) => {
            const filterConfig = FILTER_TYPES.find(f => f.key === filter.type);
            const IconComponent = filterConfig?.icon || Filter;
            return (
              <div key={filter.id}
                className={`p-3 rounded border transition cursor-pointer ${selected?.id === filter.id ? "bg-blue-50 border-blue-300" : "bg-white hover:bg-gray-50 border-gray-200"}`}
                onClick={() => setSelected(filter)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <IconComponent className="h-4 w-4 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">{filter.metadata?.name || `${filter.type} Filter`}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{filterConfig?.label || filter.type}</Badge>
                        {filter.created_at && <span>{new Date(filter.created_at).toLocaleDateString()}</span>}
                      </div>
                      {filter.metadata?.description && (<div className="text-xs text-gray-600 mt-1 truncate">{filter.metadata.description}</div>)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(filter.id); }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50">×</Button>
                </div>
                <div className="mt-2 text-xs bg-gray-50 p-2 rounded border">
                  <pre className="whitespace-pre-wrap text-gray-700">{JSON.stringify(filter.config || {}, null, 2)}</pre>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function MockVisual({ data, summary, appliedFilter, loading }) {
  const [viewMode, setViewMode] = useState("summary");

  // Dynamic values from backend summary with graceful fallback
  const totalRows = typeof summary?.totalRows === 'number'
    ? summary.totalRows
    : (Array.isArray(data) ? data.length : 0);

  const fields = (Array.isArray(summary?.fields) && summary.fields.length)
    ? summary.fields
    : (Array.isArray(data) && data[0] ? Object.keys(data[0]) : []);

  const stats = summary?.stats || {};
  const sample = Array.isArray(summary?.sample)
    ? summary.sample
    : (Array.isArray(data) ? data.slice(0, 10) : []);

  const filterConfig = appliedFilter ? FILTER_TYPES.find(f => f.key === appliedFilter.type) : null;
  const IconComponent = filterConfig?.icon || BarChart3;

  return (
    <Card className="shadow border border-gray-200">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-800">Data Preview</h3>
          </div>
          <div className="flex gap-1">
            <Button variant={viewMode === "summary" ? "default" : "outline"} size="sm" onClick={() => setViewMode("summary")}>Summary</Button>
            <Button variant={viewMode === "data" ? "default" : "outline"} size="sm" onClick={() => setViewMode("data")}>Raw Data</Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">Live preview from sales_data with applied filter</p>
      </CardHeader>

      <CardContent className="p-4">
        {loading && (<div className="text-center py-8"><div className="text-sm text-gray-500">Generating preview...</div></div>)}
        {!loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <div className="text-sm font-medium text-blue-900">Applied Filter: {appliedFilter?.metadata?.name || appliedFilter?.type || "None"}</div>
                {appliedFilter?.metadata?.description && (<div className="text-xs text-blue-700 mt-1">{appliedFilter.metadata.description}</div>)}
              </div>
              <Badge variant="secondary">{filterConfig?.category || "Standard"}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded border">
                <div className="text-sm font-medium text-gray-700">Total Rows</div>
                <div className="text-2xl font-bold text-gray-900">{Number(totalRows || 0).toLocaleString()}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded border">
                <div className="text-sm font-medium text-gray-700">Fields</div>
                <div className="text-2xl font-bold text-gray-900">{fields.length}</div>
              </div>
            </div>

            {viewMode === "summary" && stats && Object.keys(stats).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Field Statistics</h4>
                <div className="space-y-2">
                  {Object.entries(stats).map(([field, s]) => (
                    <div key={field} className="p-2 bg-gray-50 rounded border">
                      <div className="text-sm font-medium text-gray-700">{field}</div>
                      <div className="text-xs text-gray-600 grid grid-cols-2 gap-2 mt-1">
                        <span>Min: {Number(s.min ?? 0).toLocaleString()}</span>
                        <span>Max: {Number(s.max ?? 0).toLocaleString()}</span>
                        <span>Avg: {Number(s.avg ?? 0).toFixed(2)}</span>
                        <span>Sum: {Number(s.sum ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === "data" && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Sample Data (First 10 rows)</h4>
                <div className="overflow-auto max-h-64 border rounded">
                  <pre className="text-xs p-3 bg-gray-50">
                    {JSON.stringify(sample, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {(totalRows || 0) === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <div className="text-sm text-gray-600">No data available or filter excludes all records</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function usePreviewData(selectedFilter) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedFilter) { setRows([]); setSummary(null); return; }
      setLoading(true); setError("");
      try {
        const res = await FilterAPI.previewFilteredData(selectedFilter);
        if (cancelled) return;
        setRows(Array.isArray(res?.data) ? res.data : []);
        setSummary(res?.summary || null);
      } catch (serverError) {
        console.log("Server preview failed, falling back to mock:", serverError.message);
        // Fallback – remove if you want to strictly require backend
        const mockData = generateMockData(1000);
        const filteredData = applyMockFilter(mockData, selectedFilter);
        if (!cancelled) {
          setRows(filteredData);
          setSummary({
            totalRows: filteredData.length,
            fields: filteredData[0] ? Object.keys(filteredData[0]) : [],
            stats: {}
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [selectedFilter]);

  return { rows, summary, loading, error };
}

// Mock data helpers retained as a fallback only (same as before)...
function generateMockData(count = 1000) {
  const categories = ["Furniture", "Office Supplies", "Technology"];
  const regions = ["Europe", "APAC", "US", "Canada", "LATAM"];
  const customers = Array.from({ length: 50 }, (_, i) => `Customer ${i + 1}`);
  const products = Array.from({ length: 100 }, (_, i) => `Product ${i + 1}`);
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    Category: categories[i % categories.length],
    Region: regions[i % regions.length],
    Customer: customers[i % customers.length],
    Product: products[i % products.length],
    Sales: Math.round((100 + (i % 50) * 100 + Math.random() * 500) * 100) / 100,
    Profit: Math.round((10 + (i % 20) * 20 + Math.random() * 100) * 100) / 100,
    Quantity: Math.floor(1 + Math.random() * 20),
    Discount: Math.round(Math.random() * 30 * 100) / 100,
    "Order Date": new Date(2018 + (i % 7), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    "Ship Date": new Date(2018 + (i % 7), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    "Order Priority": ["Low", "Medium", "High", "Critical"][i % 4],
    "Ship Mode": ["Standard", "Express", "Overnight"][i % 3]
  }));
}
function applyMockFilter(data, filter) {
  if (!filter || !filter.config) return data;
  const config = filter.config, type = filter.type;
  let filtered = [...data];
  try {
    switch (type) {
      case "extract": if (config.field && config.condition) filtered = applyExtractFilter(filtered, config); break;
      case "datasource": if (config.field && config.condition) filtered = applyDataSourceFilter(filtered, config); break;
      case "dimension": if (config.field && config.condition) filtered = applyDimensionFilter(filtered, config); break;
      case "measure": if (config.field && config.condition) filtered = applyMeasureFilter(filtered, config); break;
      case "context": if (config.field && config.condition) filtered = applyContextFilter(filtered, config); break;
      default: filtered = filtered.slice(0, Math.floor(filtered.length * 0.7));
    }
  } catch (_e) { return data; }
  return filtered;
}
function applyExtractFilter(data, config) {
  const { field, condition } = config;
  if (field.toLowerCase().includes('date') && condition.includes('Year')) {
    const m = condition.match(/Year\s*([><=!]+)\s*(\d{4})/);
    if (m) {
      const op = m[1], year = parseInt(m[2]);
      return data.filter(row => {
        const y = new Date(row[field]).getFullYear();
        switch (op) {
          case '>=': return y >= year; case '>': return y > year; case '<=': return y <= year; case '<': return y < year;
          case '=': case '==': return y === year; case '!=': return y !== year; default: return true;
        }
      });
    }
  }
  return data;
}
function applyDataSourceFilter(data, config) {
  const { field, condition, operator } = config;
  if (operator === 'not_equals' || condition.startsWith('!=')) {
    const value = condition.replace('!=', '').trim().replace(/['"]/g, '');
    return data.filter(row => String(row[field]) !== value);
  }
  if (operator === 'in' || condition.includes('IN')) {
    const values = condition.match(/\((.*?)\)/)?.[1]?.split(',')?.map(v => v.trim().replace(/['"]/g, '')) || [];
    return data.filter(row => values.includes(String(row[field])));
  }
  return data;
}
function applyDimensionFilter(data, config) {
  const { field, condition, filterType } = config;
  const values = condition.split(',').map(v => v.trim());
  if (filterType === 'exclude') return data.filter(row => !values.includes(String(row[field])));
  return data.filter(row => values.includes(String(row[field])));
}
function applyMeasureFilter(data, config) {
  const { field, condition } = config;
  const match = condition.match(/([><=!]+)\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const operator = match[1], value = parseFloat(match[2]);
    return data.filter(row => {
      const fieldValue = Number(row[field]); if (isNaN(fieldValue)) return false;
      switch (operator) {
        case '>': return fieldValue > value; case '>=': return fieldValue >= value; case '<': return fieldValue < value; case '<=': return fieldValue <= value;
        case '=': case '==': return fieldValue === value; case '!=': return fieldValue !== value; default: return true;
      }
    });
  }
  return data;
}
function applyContextFilter(data, config) {
  const { field, condition, contextType, measureField } = config;
  if (contextType === 'top_n' && measureField) {
    const nMatch = condition.match(/Top\s+(\d+)/i);
    if (nMatch) {
      const n = parseInt(nMatch[1]);
      const grouped = data.reduce((acc, row) => {
        const key = row[field]; if (!acc[key]) acc[key] = { key, total: 0, rows: [] };
        acc[key].total += Number(row[measureField]) || 0; acc[key].rows.push(row); return acc;
      }, {});
      const topGroups = Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, n);
      return topGroups.flatMap(group => group.rows);
    }
  }
  return data;
}

export default function App() {
  const [activeTab, setActiveTab] = useState(FILTER_TYPES[0]?.key || "");
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const { rows, summary, loading: previewLoading, error: previewError } = usePreviewData(selectedFilter);
  const handleFilterSaved = () => setRefreshSignal(prev => prev + 1);

  if (!FILTER_TYPES.length) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <div className="text-red-600">No filter types configured.</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Tableau Filter Management System</h1>
        <p className="text-lg text-gray-600">Complete pipeline for authoring, storing, and applying filters on sales_data</p>
        <div className="flex justify-center gap-4 mt-4">
          <Badge variant="outline" className="flex items-center gap-1"><Database className="h-3 w-3" /> MySQL Integration</Badge>
          <Badge variant="outline" className="flex items-center gap-1"><Filter className="h-3 w-3" /> 7 Filter Types</Badge>
          <Badge variant="outline" className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Live Preview</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-8">
          <TabsList className="flex overflow-x-auto gap-2 bg-gray-100 p-1 rounded-lg">
            {FILTER_TYPES.map((filter) => {
              const IconComponent = filter.icon;
              return (
                <TabsTrigger key={filter.key} value={filter.key}
                  className="flex-shrink-0 min-w-[140px] text-xs sm:text-sm font-medium px-3 py-2 rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm hover:bg-gray-200 flex items-center gap-2">
                  <IconComponent className="h-4 w-4" />
                  {filter.label.replace(" Filters", "")}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="min-h-[600px] grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {FILTER_TYPES.map((filter) => (
              <TabsContent key={filter.key} value={filter.key} className="mt-0">
                <FilterTab filter={filter} onSaved={handleFilterSaved} />
              </TabsContent>
            ))}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <SavedFiltersPanel selected={selectedFilter} setSelected={setSelectedFilter} refreshSignal={refreshSignal} />
            <MockVisual data={rows} summary={summary} appliedFilter={selectedFilter} loading={previewLoading} />
            {previewError && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">Preview Error: {previewError}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}