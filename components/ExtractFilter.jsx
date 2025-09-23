// components/ExtractFilter.jsx
import React from 'react';

const containerStyle = {
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const labelStyle = {
  minWidth: '180px',
  fontWeight: '600',
};

const inputStyle = {
  padding: '6px 8px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  flex: '1',
};

export function ExtractFilter({ field, value, onChange }) {
  return (
    <div style={containerStyle}>
      <label style={labelStyle}>Extract Filter - {field}:</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange({ field, value: e.target.value })}
        placeholder={`Filter ${field}`}
        style={inputStyle}
      />
    </div>
  );
}