// FilterDemo.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FilterDisplay from './FilterManager';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://intelligentsalesman.com/ism1/API/dashboard/filtermanagement.php';

// Sample data to filter
const SAMPLE_PRODUCTS = [
  { id: 1, name: 'Laptop', category: 'electronics', price: 999, inStock: true, date: '2024-01-15' },
  { id: 2, name: 'Phone', category: 'electronics', price: 699, inStock: true, date: '2024-02-20' },
  { id: 3, name: 'Desk', category: 'furniture', price: 299, inStock: false, date: '2024-01-10' },
  { id: 4, name: 'Chair', category: 'furniture', price: 199, inStock: true, date: '2024-03-05' },
  { id: 5, name: 'Monitor', category: 'electronics', price: 399, inStock: true, date: '2024-02-28' },
  { id: 6, name: 'Keyboard', category: 'electronics', price: 79, inStock: true, date: '2024-03-15' },
  { id: 7, name: 'Bookshelf', category: 'furniture', price: 149, inStock: false, date: '2024-01-25' },
  { id: 8, name: 'Lamp', category: 'furniture', price: 49, inStock: true, date: '2024-02-10' },
];

export const FilterDemo: React.FC = () => {
  const [filters, setFilters] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [filteredData, setFilteredData] = useState(SAMPLE_PRODUCTS);
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({});
  const userId = 'demo-user-123'; // In real app, get from auth

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=list`);
      if (response.data?.success) {
        setFilters(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedFilter(response.data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const handleFilterChange = (values: Record<string, any>) => {
    setCurrentFilters(values);
  };

  const handleFilterApply = (values: Record<string, any>) => {
    console.log('Applying filters:', values);
    
    // Filter the sample data based on filter values
    let filtered = [...SAMPLE_PRODUCTS];

    Object.entries(values).forEach(([fieldId, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return;

      // Example filtering logic - customize based on your field IDs
      if (fieldId === 'category' && value) {
        filtered = filtered.filter((item) => item.category === value);
      }
      if (fieldId === 'inStock' && Array.isArray(value) && value.includes('true')) {
        filtered = filtered.filter((item) => item.inStock);
      }
      if (fieldId === 'minPrice' && value) {
        filtered = filtered.filter((item) => item.price >= Number(value));
      }
      if (fieldId === 'maxPrice' && value) {
        filtered = filtered.filter((item) => item.price <= Number(value));
      }
      if (fieldId === 'search' && value) {
        filtered = filtered.filter((item) =>
          item.name.toLowerCase().includes(value.toLowerCase())
        );
      }
      if (fieldId === 'dateFrom' && value) {
        filtered = filtered.filter((item) => item.date >= value);
      }
      if (fieldId === 'dateTo' && value) {
        filtered = filtered.filter((item) => item.date <= value);
      }
    });

    setFilteredData(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Filter Demo</h1>

        {/* Filter Selector */}
        {filters.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Filter to Test:
            </label>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filter Display */}
        {selectedFilter && (
          <div className="mb-6">
            <FilterDisplay
              filterId={selectedFilter}
              userId={userId}
              onChange={handleFilterChange}
              onApply={handleFilterApply}
            />
          </div>
        )}

        {/* Current Filter Values */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Current Filter Values:
          </h3>
          <pre className="text-xs text-blue-800 overflow-auto">
            {JSON.stringify(currentFilters, null, 2)}
          </pre>
        </div>

        {/* Filtered Results */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Filtered Results ({filteredData.length} items)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    In Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${item.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          item.inStock
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.inStock ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterDemo;