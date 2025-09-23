import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

// Sample data
const rawData = [
  { category: 'ABC', sales: 4000, quantity: 4 },
  { category: 'PQR', sales: 3000, quantity: 5 },
  { category: 'XYZ', sales: 2000, quantity: 6 },
  { category: 'LMN', sales: 2780, quantity: 7 },
  { category: 'RR', sales: 1000, quantity: 8 },
  { category: 'BB', sales: 2500, quantity: 9 },
  { category: 'HH', sales: 3500, quantity: 10 },
  { category: 'WW', sales: 4500, quantity: 11 },
  { category: 'SS', sales: 2100, quantity: 12 },
  { category: 'OO', sales: 1200, quantity: 13 },
  { category: 'PP', sales: 1900, quantity: 14 },
  { category: 'QQ', sales: 2800, quantity: 15 },
];

// Parameter types supported
const PARAM_TYPES = ['number', 'string', 'boolean'];

// Allowable values options
const ALLOWABLE_VALUES = ['All', 'List', 'Range'];

export default function App() {
  // Parameters state: array of { id, name, type, value, allowableType, allowableValues }
  const [parameters, setParameters] = useState([]);

  // Modal state for creating/editing parameter
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParam, setEditingParam] = useState(null);

  // Applied filters state - supports multiple filters
  const [appliedFilters, setAppliedFilters] = useState([]);

  // Open modal to create new parameter
  const openCreateModal = () => {
    setEditingParam({
      id: null,
      name: '',
      type: 'number',
      value: '',
      allowableType: 'All',
      allowableValues: null,
    });
    setModalOpen(true);
  };

  // Open modal to edit existing parameter
  const openEditModal = (param) => {
    setEditingParam({ ...param });
    setModalOpen(true);
  };

  // Validate parameter value against allowable values
  const isValueAllowed = (param, val) => {
    if (param.allowableType === 'All') return true;
    if (param.allowableType === 'List') {
      return param.allowableValues?.includes(val.toString());
    }
    if (param.allowableType === 'Range') {
      const numVal = Number(val);
      if (isNaN(numVal)) return false;
      return numVal >= param.allowableValues.min && numVal <= param.allowableValues.max;
    }
    return true;
  };

  // Save parameter (create or update)
  const saveParameter = () => {
    if (!editingParam.name.trim()) {
      alert('Parameter name is required');
      return;
    }
    if (parameters.some(p => p.name === editingParam.name && p.id !== editingParam.id)) {
      alert('Parameter name must be unique');
      return;
    }
    if (!isValueAllowed(editingParam, editingParam.value)) {
      alert('Parameter value is not within allowable values');
      return;
    }
    if (editingParam.id === null) {
      // Create new
      setParameters([...parameters, { ...editingParam, id: Date.now() }]);
    } else {
      // Update existing
      setParameters(parameters.map(p => (p.id === editingParam.id ? editingParam : p)));
    }
    setModalOpen(false);
  };

  // Delete parameter
  const deleteParameter = (id) => {
    if (window.confirm('Delete this parameter?')) {
      setParameters(parameters.filter(p => p.id !== id));
      // Remove any applied filters for this parameter
      setAppliedFilters(appliedFilters.filter(f => f.paramId !== id));
    }
  };

  // Handle drag start for parameter
  const onDragStartParam = (e, param) => {
    e.dataTransfer.setData('paramId', param.id);
  };

  // Handle drop on visual area
  const onDropOnVisual = (e) => {
    e.preventDefault();
    const paramId = e.dataTransfer.getData('paramId');
    if (!paramId) return;
    const param = parameters.find(p => p.id.toString() === paramId);
    if (!param) return;

    // Handle different parameter types and names
    if (param.type === 'number' && param.name.toLowerCase().includes('sales')) {
      // Remove existing filter for this parameter if it exists
      const newFilters = appliedFilters.filter(f => f.paramId !== param.id);
      
      // Determine filter type based on parameter name
      let filterType = 'gte'; // default: greater than or equal
      let description = '>=';
      
      if (param.name.toLowerCase().includes('max sales')) {
        filterType = 'lt'; // less than
        description = '<';
      } else if (param.name.toLowerCase().includes('min sales')) {
        filterType = 'gte'; // greater than or equal
        description = '>=';
      }
      
      // Add new filter
      newFilters.push({
        paramId: param.id,
        name: param.name,
        field: 'sales',
        operator: filterType,
        value: Number(param.value),
        description: `${param.name} ${description} ${param.value}`
      });
      
      setAppliedFilters(newFilters);
      alert(`Parameter "${param.name}" applied as sales filter (${description} ${param.value})`);
    } else if (param.type === 'boolean' && param.name.toLowerCase().includes('show quantity')) {
      // Handle boolean parameter for showing/hiding quantity bars
      alert(`Parameter "${param.name}" would toggle quantity display (feature not implemented in this demo)`);
    } else if (param.type === 'string' && param.name.toLowerCase().includes('category')) {
      // Handle category filter
      const newFilters = appliedFilters.filter(f => f.paramId !== param.id);
      
      if (param.value && param.value.toLowerCase() !== 'all') {
        newFilters.push({
          paramId: param.id,
          name: param.name,
          field: 'category',
          operator: 'eq',
          value: param.value,
          description: `${param.name} = ${param.value}`
        });
      }
      
      setAppliedFilters(newFilters);
      alert(`Parameter "${param.name}" applied as category filter`);
    } else {
      alert(`Parameter "${param.name}" dropped on visual (no specific action defined for this parameter type/name)`);
    }
  };

  const onDragOverVisual = (e) => e.preventDefault();

  // Generic filtering function
  const applyFilters = (data, filters) => {
    return data.filter(row => {
      return filters.every(filter => {
        const fieldValue = row[filter.field];
        switch (filter.operator) {
          case 'gte': return fieldValue >= filter.value;
          case 'lt': return fieldValue < filter.value;
          case 'eq': return fieldValue.toString().toLowerCase() === filter.value.toString().toLowerCase();
          case 'lte': return fieldValue <= filter.value;
          case 'gt': return fieldValue > filter.value;
          default: return true;
        }
      });
    });
  };

  // Apply all filters to get filtered data
  const filteredData = applyFilters(rawData, appliedFilters);

  // Get filter description for display
  const getFilterDescription = () => {
    if (appliedFilters.length === 0) return '';
    const descriptions = appliedFilters.map(f => f.description);
    return `(Filtered by: ${descriptions.join(', ')})`;
  };

  // Clear all filters
  const clearAllFilters = () => {
    setAppliedFilters([]);
  };

  // Handlers for allowable values input changes
  const handleAllowableTypeChange = (val) => {
    let newAllowableValues = null;
    if (val === 'List') newAllowableValues = [];
    else if (val === 'Range') newAllowableValues = { min: '', max: '' };
    setEditingParam({ ...editingParam, allowableType: val, allowableValues: newAllowableValues, value: '' });
  };

  const handleAllowableListChange = (val) => {
    // Split by comma, trim spaces
    const list = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
    setEditingParam({ ...editingParam, allowableValues: list });
  };

  const handleAllowableRangeChange = (field, val) => {
    const newRange = { ...editingParam.allowableValues, [field]: val };
    setEditingParam({ ...editingParam, allowableValues: newRange });
  };

  // Render input for parameter value based on allowable values and type
  const renderValueInput = () => {
    if (editingParam.allowableType === 'All') {
      if (editingParam.type === 'boolean') {
        return (
          <select
            value={editingParam.value === '' ? 'false' : editingParam.value.toString()}
            onChange={e => setEditingParam({ ...editingParam, value: e.target.value === 'true' })}
            style={{ width: '100%', padding: 6 }}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );
      }
      return (
        <input
          type={editingParam.type === 'number' ? 'number' : 'text'}
          value={editingParam.value}
          onChange={e => setEditingParam({ ...editingParam, value: e.target.value })}
          style={{ width: '100%', padding: 6 }}
        />
      );
    }
    if (editingParam.allowableType === 'List') {
      return (
        <>
          <textarea
            rows={3}
            placeholder="Enter allowed values, comma separated"
            value={editingParam.allowableValues?.join(', ') || ''}
            onChange={e => handleAllowableListChange(e.target.value)}
            style={{ width: '100%', padding: 6, marginBottom: 8 }}
          />
          <label>
            Select Value:<br />
            <select
              value={editingParam.value}
              onChange={e => setEditingParam({ ...editingParam, value: e.target.value })}
              style={{ width: '100%', padding: 6 }}
            >
              <option value="">-- Select --</option>
              {editingParam.allowableValues?.map((v, i) => (
                <option key={i} value={v}>{v}</option>
              ))}
            </select>
          </label>
        </>
      );
    }
    if (editingParam.allowableType === 'Range') {
      return (
        <>
          <label>
            Min:<br />
            <input
              type="number"
              value={editingParam.allowableValues?.min}
              onChange={e => handleAllowableRangeChange('min', e.target.value)}
              style={{ width: '100%', padding: 6, marginBottom: 8 }}
            />
          </label>
          <label>
            Max:<br />
            <input
              type="number"
              value={editingParam.allowableValues?.max}
              onChange={e => handleAllowableRangeChange('max', e.target.value)}
              style={{ width: '100%', padding: 6, marginBottom: 8 }}
            />
          </label>
          <label>
            Select Value:<br />
            <input
              type="number"
              value={editingParam.value}
              min={editingParam.allowableValues?.min}
              max={editingParam.allowableValues?.max}
              onChange={e => setEditingParam({ ...editingParam, value: e.target.value })}
              style={{ width: '100%', padding: 6 }}
            />
          </label>
        </>
      );
    }
    return null;
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 20, maxWidth: 1200, margin: 'auto' }}>
      <h1>React Parameter Designer (Tableau-like with Min/Max Sales Support)</h1>

      {/* Parameters Panel */}
      <div style={{ marginBottom: 20, border: '1px solid #ccc', padding: 10, borderRadius: 6 }}>
        <h2>Parameters</h2>
        <button onClick={openCreateModal} style={{ marginBottom: 10 }}>+ Create Parameter</button>
        {parameters.length === 0 && <p>No parameters created yet.</p>}
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {parameters.map(param => (
            <li
              key={param.id}
              draggable
              onDragStart={(e) => onDragStartParam(e, param)}
              style={{
                border: '1px solid #888',
                borderRadius: 4,
                padding: '6px 10px',
                marginBottom: 6,
                cursor: 'grab',
                backgroundColor: appliedFilters.some(f => f.paramId === param.id) ? '#d0f0d0' : '#f9f9f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              title="Drag parameter onto a visual"
            >
              <div>
                <strong>{param.name}</strong> ({param.type}) = <em>{param.value.toString()}</em><br />
                <small>Allowable: {param.allowableType}{param.allowableType === 'List' ? ` [${param.allowableValues?.join(', ')}]` : ''}{param.allowableType === 'Range' ? ` [${param.allowableValues?.min} - ${param.allowableValues?.max}]` : ''}</small>
              </div>
              <div>
                <button onClick={() => openEditModal(param)} style={{ marginRight: 6 }}>Edit</button>
                <button onClick={() => deleteParameter(param.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Applied Filters Panel */}
      {appliedFilters.length > 0 && (
        <div style={{ marginBottom: 20, border: '1px solid #4CAF50', padding: 10, borderRadius: 6, backgroundColor: '#f0f8f0' }}>
          <h3>Applied Filters</h3>
          <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
            {appliedFilters.map((filter, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                <strong>{filter.description}</strong>
                <button 
                  onClick={() => setAppliedFilters(appliedFilters.filter((_, i) => i !== idx))}
                  style={{ marginLeft: 10, fontSize: '12px' }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button onClick={clearAllFilters} style={{ marginTop: 10 }}>Clear All Filters</button>
        </div>
      )}

      {/* Visuals Area */}
      <div style={{ display: 'flex', gap: 40 }}>
        {/* Bar Chart */}
        <div
          onDrop={onDropOnVisual}
          onDragOver={onDragOverVisual}
          style={{
            flex: 1,
            border: '2px dashed #888',
            borderRadius: 6,
            padding: 10,
            minHeight: 300,
            userSelect: 'none',
          }}
          title="Drop parameter here to apply filter"
        >
          <h2>Sales Bar Chart {getFilterDescription()}</h2>
          <p>Showing {filteredData.length} of {rawData.length} records</p>
          <BarChart width={400} height={250} data={filteredData}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="sales" fill="#8884d8" />
            <Bar dataKey="quantity" fill="#82ca9d" />
          </BarChart>
        </div>

        {/* Table View */}
        <div
          onDrop={onDropOnVisual}
          onDragOver={onDragOverVisual}
          style={{
            flex: 1,
            border: '2px dashed #888',
            borderRadius: 6,
            padding: 10,
            minHeight: 300,
            overflowY: 'auto',
            userSelect: 'none',
          }}
          title="Drop parameter here to apply filter"
        >
          <h2>Data Table {getFilterDescription()}</h2>
          <p>Showing {filteredData.length} of {rawData.length} records</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: 6 }}>Category</th>
                <th style={{ border: '1px solid #ccc', padding: 6 }}>Sales</th>
                <th style={{ border: '1px solid #ccc', padding: 6 }}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>{row.category}</td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>{row.sales}</td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>{row.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parameter Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 8,
              width: 360,
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}
          >
            <h3>{editingParam.id === null ? 'Create Parameter' : 'Edit Parameter'}</h3>
            <div style={{ marginBottom: 10 }}>
              <label>
                Name:<br />
                <input
                  type="text"
                  value={editingParam.name}
                  onChange={e => setEditingParam({ ...editingParam, name: e.target.value })}
                  style={{ width: '100%', padding: 6 }}
                  placeholder="e.g., Min Sales, Max Sales, Category Filter"
                />
              </label>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>
                Type:<br />
                <select
                  value={editingParam.type}
                  onChange={e => setEditingParam({ ...editingParam, type: e.target.value, value: '', allowableType: 'All', allowableValues: null })}
                  style={{ width: '100%', padding: 6 }}
                >
                  {PARAM_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>
                Allowable Values:<br />
                <select
                  value={editingParam.allowableType}
                  onChange={e => handleAllowableTypeChange(e.target.value)}
                  style={{ width: '100%', padding: 6 }}
                >
                  {ALLOWABLE_VALUES.map(av => (
                    <option key={av} value={av}>{av}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>
                Value:<br />
                {renderValueInput()}
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModalOpen(false)}>Cancel</button>
              <button onClick={saveParameter}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}