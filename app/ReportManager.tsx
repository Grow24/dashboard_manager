import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Type definitions
interface ReportColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date';
}

interface ReportMetadata {
  id: string;
  name: string;
  columns: ReportColumn[];
  defaultView: 'table' | 'bar' | 'pie';
  clientSide: boolean;
}

interface ReportDataItem {
  id: number;
  date: string;
  product: string;
  category: string;
  sales: number;
  region: string;
  [key: string]: string | number;
}

interface DateRange {
  from: string;
  to: string;
}

interface Filters {
  dateRange: DateRange;
  dimensions: Record<string, string[]>;
  numericRanges: Record<string, { min?: number; max?: number }>;
  search: string;
}

interface Pagination {
  pageSize: number;
  currentPage: number;
  total: number;
}

interface SortBy {
  key: string | null;
  order: 'asc' | 'desc';
}

interface ChartOptions {
  groupBy: string;
  metric: string;
}

// Mock API functions
const fetchReportMetadata = async (reportId: string): Promise<ReportMetadata> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock metadata
  return {
    id: reportId,
    name: `${reportId} Report`,
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'product', label: 'Product', type: 'string' },
      { key: 'category', label: 'Category', type: 'string' },
      { key: 'sales', label: 'Sales', type: 'number' },
      { key: 'region', label: 'Region', type: 'string' }
    ],
    defaultView: 'table',
    clientSide: true
  };
};

const fetchReportData = async (reportId: string, filters: Filters = { 
  dateRange: { from: '', to: '' },
  dimensions: {},
  numericRanges: {},
  search: ''
}): Promise<ReportDataItem[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Generate mock data
  const products = ['Widget A', 'Gadget B', 'Tool C', 'Device D'];
  const categories = ['Electronics', 'Home Goods', 'Toys', 'Clothing'];
  const regions = ['North', 'South', 'East', 'West'];
  
  const data: ReportDataItem[] = [];
  for (let i = 0; i < 100; i++) {
    data.push({
      id: i + 1,
      date: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      product: products[Math.floor(Math.random() * products.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      sales: Math.floor(Math.random() * 10000) + 100,
      region: regions[Math.floor(Math.random() * regions.length)]
    });
  }
  
  // Apply filters
  let filteredData = [...data];
  
  // Date range filter
  if (filters.dateRange.from && filters.dateRange.to) {
    filteredData = filteredData.filter(item => 
      item.date >= filters.dateRange.from && item.date <= filters.dateRange.to
    );
  }
  
  // Dimension filters
  Object.keys(filters.dimensions).forEach(key => {
    const allowedValues = filters.dimensions[key];
    if (allowedValues.length > 0) {
      filteredData = filteredData.filter(item => allowedValues.includes(item[key] as string));
    }
  });
  
  // Numeric range filters
  Object.keys(filters.numericRanges).forEach(key => {
    const range = filters.numericRanges[key];
    if (range.min !== undefined || range.max !== undefined) {
      filteredData = filteredData.filter(item => {
        const value = item[key] as number;
        return (
          (range.min === undefined || value >= range.min) &&
          (range.max === undefined || value <= range.max)
        );
      });
    }
  });
  
  // Search filter
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filteredData = filteredData.filter(item => 
      Object.values(item).some(val => 
        val.toString().toLowerCase().includes(searchTerm)
      )
    );
  }
  
  return filteredData;
};

// Utility functions
const aggregateForChart = (data: ReportDataItem[], groupByKey: string, metricKey: string) => {
  const bucketMap: Record<string, number> = {};
  data.forEach(row => {
    const bucketKey = (row[groupByKey] as string) || 'Unknown';
    if (!bucketMap[bucketKey]) {
      bucketMap[bucketKey] = 0;
    }
    bucketMap[bucketKey] += row[metricKey] as number;
  });
  
  return Object.entries(bucketMap).map(([name, value]) => ({ name, value }));
};

const convertToCSV = (data: ReportDataItem[]) => {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => 
    Object.values(obj).map(val => 
      typeof val === 'string' ? `\"${val.replace(/\"/g, '\"\"')}\"` : val
    ).join(',')
  ).join('\n');
  
  return `${headers}\n${rows}`;
};

const downloadFile = (content: string, fileName: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Main component
const ReportManager: React.FC = () => {
  // State declarations
  const [reportId] = useState<string>('sales-report');
  const [reportMeta, setReportMeta] = useState<ReportMetadata | null>(null);
  const [reportData, setReportData] = useState<ReportDataItem[]>([]);
  const [filteredData, setFilteredData] = useState<ReportDataItem[]>([]);
  const [selectedViewType, setSelectedViewType] = useState<'table' | 'bar' | 'pie'>('table');
  const [filters, setFilters] = useState<Filters>({
    dateRange: { from: '', to: '' },
    dimensions: {},
    numericRanges: {},
    search: ''
  });
  const [downloadFormat, setDownloadFormat] = useState<'csv' | 'json'>('csv');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ pageSize: 10, currentPage: 1, total: 0 });
  const [sortBy, setSortBy] = useState<SortBy>({ key: null, order: 'asc' });
  const [chartOptions, setChartOptions] = useState<ChartOptions>({ groupBy: 'product', metric: 'sales' });

  // Initialize report
  useEffect(() => {
    const initializeReport = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const meta = await fetchReportMetadata(reportId);
        setReportMeta(meta);
        setSelectedViewType(meta.defaultView);
        
        // Initialize dimension filters
        const initialDimensions: Record<string, string[]> = {};
        meta.columns
          .filter(col => col.type === 'string')
          .forEach(col => {
            initialDimensions[col.key] = [];
          });
        
        setFilters(prev => ({
          ...prev,
          dimensions: initialDimensions
        }));
        
        const data = await fetchReportData(reportId);
        setReportData(data);
        setFilteredData(data);
        setPagination(prev => ({ ...prev, total: data.length }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeReport();
  }, [reportId]);

  // Apply filters
  const applyFilters = async () => {
    if (!reportMeta) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchReportData(reportId, filters);
      setFilteredData(data);
      setPagination(prev => ({ ...prev, total: data.length, currentPage: 1 }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle filter changes
  const handleDateChange = (field: keyof DateRange, value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { ...prev.dateRange, [field]: value }
    }));
  };

  const handleDimensionChange = (key: string, value: string) => {
    setFilters(prev => {
      const current = [...(prev.dimensions[key] || [])];
      const index = current.indexOf(value);
      
      if (index >= 0) {
        current.splice(index, 1);
      } else {
        current.push(value);
      }
      
      return {
        ...prev,
        dimensions: {
          ...prev.dimensions,
          [key]: current
        }
      };
    });
  };

  const handleNumericRangeChange = (key: string, min: number | undefined, max: number | undefined) => {
    setFilters(prev => ({
      ...prev,
      numericRanges: {
        ...prev.numericRanges,
        [key]: { min, max }
      }
    }));
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  // Handle sorting
  const handleSort = (key: string) => {
    setSortBy(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  // Handle chart options
  const handleChartOptionChange = (option: keyof ChartOptions, value: string) => {
    setChartOptions(prev => ({ ...prev, [option]: value }));
  };

  // Handle select changes
  const handleSelectChange = (setter: React.Dispatch<React.SetStateAction<any>>) => 
    (event: SelectChangeEvent<string>) => {
      setter(event.target.value as string);
    };

  // Export data
  const handleExport = () => {
    if (downloadFormat === 'csv') {
      const csv = convertToCSV(filteredData);
      downloadFile(csv, 'report.csv', 'text/csv');
    } else if (downloadFormat === 'json') {
      const json = JSON.stringify(filteredData, null, 2);
      downloadFile(json, 'report.json', 'application/json');
    }
    // In a real app, you would implement PDF and Excel exports
  };

  // Get sorted and paginated data
  const getProcessedData = (): ReportDataItem[] => {
    if (!filteredData.length) return [];
    
    // Apply sorting
    const sortedData = [...filteredData];
    if (sortBy.key) {
      sortedData.sort((a, b) => {
        const aVal = a[sortBy.key!];
        const bVal = b[sortBy.key!];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortBy.order === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        }
        
        return sortBy.order === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      });
    }
    
    // Apply pagination
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    
    return sortedData.slice(startIndex, endIndex);
  };

  // Render table view
  const renderTableView = () => {
    const data = getProcessedData();
    
    if (!reportMeta) return null;
    
    return (
      <Box>
        <Table>
          <TableHead>
            <TableRow>
              {reportMeta.columns.map(column => (
                <TableCell 
                  key={column.key} 
                  onClick={() => handleSort(column.key)}
                  style={{ cursor: 'pointer' }}
                >
                  {column.label}
                  {sortBy.key === column.key && (
                    <span>{sortBy.order === 'asc' ? ' \u2191' : ' \u2193'}</span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(row => (
              <TableRow key={row.id}>
                {reportMeta.columns.map(column => (
                  <TableCell key={`${row.id}-${column.key}`}>
                    {row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        <Box mt={2} display="flex" justifyContent="center" alignItems="center">
          <Button 
            disabled={pagination.currentPage <= 1}
            onClick={() => handlePageChange(pagination.currentPage - 1)}
          >
            Previous
          </Button>
          
          <Typography mx={2}>
            Page {pagination.currentPage} of {Math.ceil(pagination.total / pagination.pageSize)}
          </Typography>
          
          <Button 
            disabled={pagination.currentPage >= Math.ceil(pagination.total / pagination.pageSize)}
            onClick={() => handlePageChange(pagination.currentPage + 1)}
          >
            Next
          </Button>
        </Box>
      </Box>
    );
  };

  // Render chart view
  const renderChartView = () => {
    if (!reportMeta) return null;
    
    const chartData = aggregateForChart(
      filteredData, 
      chartOptions.groupBy, 
      chartOptions.metric
    );
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
    
    if (selectedViewType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    
    if (selectedViewType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={true}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    
    return null;
  };

  // Render filter panel
  const renderFilterPanel = () => {
    if (!reportMeta) return null;
    
    // Get unique values for dimension filters
    const getUniqueValues = (key: string): string[] => {
      const values = [...new Set(reportData.map(item => item[key]))];
      return values.filter(v => v != null) as string[];
    };
    
    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filters</Typography>
          
          {/* Date Range */}
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="From Date"
              type="date"
              value={filters.dateRange.from}
              onChange={(e) => handleDateChange('from', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="To Date"
              type="date"
              value={filters.dateRange.to}
              onChange={(e) => handleDateChange('to', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          
          {/* Dimension Filters */}
          {Object.keys(filters.dimensions).map(key => {
            const column = reportMeta.columns.find(c => c.key === key);
            if (!column) return null;
            
            const uniqueValues = getUniqueValues(key);
            
            return (
              <Box key={key} mb={2}>
                <Typography variant="subtitle1">{column.label}</Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {uniqueValues.map(value => (
                    <Chip
                      key={value}
                      label={value}
                      clickable
                      onClick={() => handleDimensionChange(key, value)}
                      variant={filters.dimensions[key].includes(value) ? "filled" : "outlined"}
                    />
                  ))}
                </Box>
              </Box>
            );
          })}
          
          {/* Numeric Range Filters */}
          {reportMeta.columns
            .filter(col => col.type === 'number')
            .map(column => {
              const range = filters.numericRanges[column.key] || { min: 0, max: 10000 };
              
              return (
                <Box key={column.key} mb={2}>
                  <Typography variant="subtitle1">{column.label} Range</Typography>
                  <Slider
                    min={0}
                    max={10000}
                    value={[range.min || 0, range.max || 10000]}
                    onChange={(e, newValue) => {
                      const [min, max] = newValue as number[];
                      handleNumericRangeChange(column.key, min, max);
                    }}
                    valueLabelDisplay="auto"
                  />
                  <Box display="flex" justifyContent="space-between">
                    <TextField
                      label="Min"
                      type="number"
                      value={range.min || 0}
                      onChange={(e) => 
                        handleNumericRangeChange(column.key, Number(e.target.value), range.max)
                      }
                      size="small"
                    />
                    <TextField
                      label="Max"
                      type="number"
                      value={range.max || 10000}
                      onChange={(e) => 
                        handleNumericRangeChange(column.key, range.min, Number(e.target.value))
                      }
                      size="small"
                    />
                  </Box>
                </Box>
              );
            })}
          
          {/* Search */}
          <TextField
            label="Search"
            fullWidth
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          {/* Apply Button */}
          <Button 
            variant="contained" 
            onClick={applyFilters}
            disabled={isLoading}
          >
            Apply Filters
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Render chart options
  const renderChartOptions = () => {
    if (!reportMeta || !['bar', 'pie'].includes(selectedViewType)) return null;
    
    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Chart Options</Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Group By</InputLabel>
            <Select
              value={chartOptions.groupBy}
              onChange={(e) => handleChartOptionChange('groupBy', e.target.value as string)}
            >
              {reportMeta.columns
                .filter(col => col.type === 'string')
                .map(col => (
                  <MenuItem key={col.key} value={col.key}>{col.label}</MenuItem>
                ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Metric</InputLabel>
            <Select
              value={chartOptions.metric}
              onChange={(e) => handleChartOptionChange('metric', e.target.value as string)}
            >
              {reportMeta.columns
                .filter(col => col.type === 'number')
                .map(col => (
                  <MenuItem key={col.key} value={col.key}>{col.label}</MenuItem>
                ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>
    );
  };

  // Render download options
  const renderDownloadOptions = () => {
    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Download Options</Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={downloadFormat}
              onChange={handleSelectChange(setDownloadFormat)}
            >
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            variant="contained" 
            onClick={handleExport}
            disabled={isLoading || filteredData.length === 0}
          >
            Download Report
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Render view selector
  const renderViewSelector = () => {
    return (
      <Box display="flex" justifyContent="center" mb={3}>
        <Button 
          variant={selectedViewType === 'table' ? 'contained' : 'outlined'}
          onClick={() => setSelectedViewType('table')}
          sx={{ mr: 1 }}
        >
          Table View
        </Button>
        <Button 
          variant={selectedViewType === 'bar' ? 'contained' : 'outlined'}
          onClick={() => setSelectedViewType('bar')}
          sx={{ mr: 1 }}
        >
          Bar Chart
        </Button>
        <Button 
          variant={selectedViewType === 'pie' ? 'contained' : 'outlined'}
          onClick={() => setSelectedViewType('pie')}
        >
          Pie Chart
        </Button>
      </Box>
    );
  };

  // Main render
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Report Manager
      </Typography>
      
      {isLoading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Box my={3}>
          <Typography color="error">Error: {error}</Typography>
        </Box>
      )}
      
      {renderFilterPanel()}
      {renderChartOptions()}
      {renderViewSelector()}
      {renderDownloadOptions()}
      
      {selectedViewType === 'table' ? renderTableView() : renderChartView()}
    </Box>
  );
};

export default ReportManager;