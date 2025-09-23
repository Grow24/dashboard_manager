import React, { useState, useEffect } from 'react';
import Select, { MultiValue, SingleValue } from 'react-select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';

// Types
interface FilterOption {
  value: string;
  label: string;
}

interface Filter {
  id: number;
  name: string;
  type: string;
  field: string;
  multiSelect: boolean;
  options: FilterOption[];
  placeholder: string;
}

interface DashboardData {
  data: any[];
  summary: any;
  filters_applied: number;
}

interface ChartData {
  name: string;
  value: number;
}

// Custom styles for React Select
const selectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: '38px',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    '&:hover': {
      border: '1px solid #d1d5db'
    }
  })
};

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const Dashboard: React.FC = () => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({});
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<Record<string, ChartData[]>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch filters on component mount
  useEffect(() => {
    fetchFilters();
    // Initial data fetch with no filters
    fetchDashboardData({});
    fetchChartData({});
  }, []);

  const fetchFilters = async () => {
    try {
      const response = await fetch('https://intelligentsalesman.com/ism1/API/api/filters.php');
      const result = await response.json();
      if (result.filters) {
        setFilters(result.filters);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchDashboardData = async (filters: Record<string, any> = appliedFilters) => {
    setLoading(true);
    try {
      const filtersParam = encodeURIComponent(JSON.stringify(
        Object.entries(filters).map(([field, value]) => ({
          field,
          value
        }))
      ));
      
      const response = await fetch(`https://intelligentsalesman.com/ism1/API/api/dashboard_data.php?filters=${filtersParam}`);
      const result = await response.json();
      setDashboardData(result);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async (filters: Record<string, any> = appliedFilters) => {
    const chartTypes = ['bar', 'pie', 'line'];
    const newChartData: Record<string, ChartData[]> = {};

    for (const type of chartTypes) {
      try {
        const filtersParam = encodeURIComponent(JSON.stringify(
          Object.entries(filters).map(([field, value]) => ({
            field,
            value
          }))
        ));
        
        const response = await fetch(`https://intelligentsalesman.com/ism1/API/api/chart_data.php?type=${type}&filters=${filtersParam}`);
        const result = await response.json();
        newChartData[type] = result.data || [];
      } catch (error) {
        console.error(`Error fetching ${type} chart data:`, error);
        newChartData[type] = [];
      }
    }

    setChartData(newChartData);
  };

  const handleFilterChange = (filterId: number, value: any) => {
    const filter = filters.find(f => f.id === filterId);
    if (filter) {
      setFilterValues(prev => ({
        ...prev,
        [filter.field]: value
      }));
    }
  };

  const handleApplyFilters = async () => {
    setAppliedFilters(filterValues);
    await Promise.all([
      fetchDashboardData(filterValues),
      fetchChartData(filterValues)
    ]);
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setAppliedFilters({});
    fetchDashboardData({});
    fetchChartData({});
  };

  const hasUnsavedChanges = JSON.stringify(filterValues) !== JSON.stringify(appliedFilters);
  const hasActiveFilters = Object.keys(filterValues).length > 0;

  const renderFilter = (filter: Filter) => {
    const currentValue = filterValues[filter.field] || (filter.multiSelect ? [] : '');

    if (filter.multiSelect) {
      const selectedOptions = filter.options.filter(opt => 
        Array.isArray(currentValue) && currentValue.includes(opt.value)
      );

      return (
        <div key={filter.id} className="mb-4">
          <label className="block font-semibold mb-1 text-sm">{filter.name}</label>
          <Select
            value={selectedOptions}
            onChange={(options: MultiValue<FilterOption>) =>
              handleFilterChange(filter.id, options ? options.map(opt => opt.value) : [])
            }
            options={filter.options}
            placeholder={filter.placeholder}
            isMulti
            isClearable
            isSearchable
            styles={selectStyles}
            className="text-sm"
          />
        </div>
      );
    } else {
      const selectedOption = filter.options.find(opt => opt.value === currentValue) || null;

      return (
        <div key={filter.id} className="mb-4">
          <label className="block font-semibold mb-1 text-sm">{filter.name}</label>
          <Select
            value={selectedOption}
            onChange={(option: SingleValue<FilterOption>) =>
              handleFilterChange(filter.id, option?.value || '')
            }
            options={filter.options}
            placeholder={filter.placeholder}
            isClearable
            isSearchable
            styles={selectStyles}
            className="text-sm"
          />
        </div>
      );
    }
  };

  const renderSummaryCards = () => {
    if (!dashboardData?.summary) return null;

    const { summary } = dashboardData;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_records || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(summary.total_sales_amount || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(summary.avg_sales_amount || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_quantity || 0}</div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCharts = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Country</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.bar || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Sales']} />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.pie || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(chartData.pie || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.line || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Sales']} />
                <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDataTable = () => {
    if (!dashboardData?.data) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(dashboardData.data[0] || {}).map((key) => (
                    <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.data.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value: any, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof value === 'number' && value > 1000 ? value.toLocaleString() : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-10" style={{ maxWidth: 'unset' }}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>
                  Filters {Object.keys(appliedFilters).length > 0 && (
                    <span className="ml-2 text-xs text-blue-500">
                      ({Object.keys(appliedFilters).length} applied)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
                {filters.length === 0 ? (
                  <div className="text-gray-400 text-sm">Loading filters...</div>
                ) : (
                  filters.map(renderFilter)
                )}
                
                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  <button
                    onClick={handleApplyFilters}
                    disabled={loading || !hasUnsavedChanges}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Applying...' : 'Apply Filters'}
                  </button>
                  
                  <button
                    onClick={handleClearFilters}
                    disabled={loading || !hasActiveFilters}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
                
                {/* Show pending changes indicator */}
                {hasUnsavedChanges && (
                  <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    You have unsaved filter changes. Click "Apply Filters" to update the dashboard.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Tab Navigation */}
            <div className="mb-6">
              <nav className="flex space-x-8">
                {['overview', 'charts', 'table'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            {loading && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
              </div>
            )}

            {!loading && (
              <>
                {activeTab === 'overview' && (
                  <>
                    {renderSummaryCards()}
                    {renderCharts()}
                  </>
                )}
                
                {activeTab === 'charts' && renderCharts()}
                
                {activeTab === 'table' && renderDataTable()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;