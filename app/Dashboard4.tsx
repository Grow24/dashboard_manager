import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Button, Typography, Grid, TextField, Select, MenuItem, Paper,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2', '#f57c00'];

const Dashboard: React.FC = () => {
  const [filterMeta, setFilterMeta] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch filter metadata on mount
  useEffect(() => {
    axios.get('https://intelligentsalesman.com/ism1/API/getFilter.php')
      .then(res => {
        setFilterMeta(res.data);
        // Initialize filter values
        const initialValues = {};
        res.data.forEach((f: any) => {
          initialValues[f.id] = '';
        });
        setFilterValues(initialValues);
      })
      .catch(() => setError('Failed to load filters'));
  }, []);

  // Fetch filtered data from backend
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      filterMeta.forEach((filter: any) => {
        const val = filterValues[filter.id];
        if (val !== '' && val !== null && val !== undefined) {
          if (filter.type === 'text' || filter.type === 'select') {
            params[filter.field || filter.name] = val;
          } else if (filter.type === 'numberRange') {
            if (val.min !== undefined) params[`${filter.field || filter.name}_min`] = val.min;
            if (val.max !== undefined) params[`${filter.field || filter.name}_max`] = val.max;
          }
        }
      });
      const res = await axios.get('https://intelligentsalesman.com/ism1/API/sales_data.php', { params });
      setData(res.data);
    } catch {
      setError('Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter input changes
  const handleFilterChange = (id: string, type: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [id]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    const cleared = {};
    filterMeta.forEach((f: any) => {
      cleared[f.id] = '';
    });
    setFilterValues(cleared);
    setData([]);
  };

  // Fetch data when filters change
  useEffect(() => {
    if (filterMeta.length > 0) {
      fetchData();
    }
  }, [filterValues, filterMeta]);

  // Prepare chart data
  const salesByCountry = data.reduce((acc: any, item: any) => {
    acc[item.country] = (acc[item.country] || 0) + Number(item.salesAmount || 0);
    return acc;
  }, {});
  const salesByCountryData = Object.entries(salesByCountry).map(([country, amount]) => ({ country, amount }));

  const salesByAge = data.reduce((acc: any, item: any) => {
    const age = Number(item.age) || 0;
    acc[age] = (acc[age] || 0) + Number(item.salesAmount || 0);
    return acc;
  }, {});
  const salesByAgeData = Object.entries(salesByAge).map(([age, amount]) => ({ age: Number(age), amount }));

  const statusCounts = data.reduce((acc: any, item: any) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Dashboard with Filters</Typography>
      {error && <Typography color="error">{error}</Typography>}

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6">Filters</Typography>
        <Grid container spacing={2}>
          {filterMeta.map((filter: any) => {
            const value = filterValues[filter.id] || '';
            if (filter.type === 'text') {
              return (
                <Grid item xs={12} sm={6} md={4} key={filter.id}>
                  <TextField
                    label={filter.name}
                    value={value}
                    onChange={e => handleFilterChange(filter.id, 'text', e.target.value)}
                    fullWidth size="small"
                  />
                </Grid>
              );
            }
            if (filter.type === 'numberRange') {
              const val = value || {};
              return (
                <Grid item xs={12} sm={6} md={4} key={filter.id}>
                  <TextField
                    label={`${filter.name} Min`}
                    type="number"
                    value={val.min || ''}
                    onChange={e => handleFilterChange(filter.id, 'numberRange', { ...val, min: e.target.value ? Number(e.target.value) : undefined })}
                    fullWidth size="small"
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    label={`${filter.name} Max`}
                    type="number"
                    value={val.max || ''}
                    onChange={e => handleFilterChange(filter.id, 'numberRange', { ...val, max: e.target.value ? Number(e.target.value) : undefined })}
                    fullWidth size="small"
                  />
                </Grid>
              );
            }
           if (filter.type === 'select') {
  const options = Array.isArray(filter.options) ? filter.options : [];
  const optionItems = options.map((opt: string) => ({ value: opt, label: opt }));
  return (
    <Grid item xs={12} sm={6} md={4} key={filter.id}>
      <Select
        value={value}
        onChange={e => handleFilterChange(filter.id, 'select', e.target.value)}
        fullWidth size="small" displayEmpty
      >
        <MenuItem value="">All {filter.name}</MenuItem>
        {optionItems.map((opt: any) => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </Select>
    </Grid>
  );
}
            return null;
          })}
          <Grid item xs={12}>
            <Button variant="outlined" onClick={clearFilters}>Clear Filters</Button>
          </Grid>
        </Grid>
      </Box>

      {loading ? (
        <Typography>Loading data...</Typography>
      ) : (
        <>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6">Sales Amount by Country</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByCountryData}>
                <XAxis dataKey="country" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6">Sales Amount by Age</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesByAgeData}>
                <XAxis dataKey="age" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#388e3c" />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6">Status Distribution</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#1976d2"
                  label
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Box>
            <Typography variant="h6">Raw Data (First 10 Rows)</Typography>
            <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#eee' }}>
                  <tr>
                    {data.length > 0 && Object.keys(data[0]).map(key => (
                      <th key={key} style={{ border: '1px solid #ccc', padding: 4 }}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #ccc' }}>
                      {Object.values(row).map((val, i) => (
                        <td key={i} style={{ border: '1px solid #ccc', padding: 4 }}>{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Paper>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Dashboard;