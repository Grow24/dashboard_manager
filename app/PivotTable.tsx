import React, { useState, useMemo, useRef } from 'react';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import _ from 'lodash';

const rawData = [
  { Country: 'USA', Product: 'A', Year: 2023, Sales: 100, Quantity: 10 },
  { Country: 'USA', Product: 'B', Year: 2023, Sales: 150, Quantity: 15 },
  { Country: 'Canada', Product: 'A', Year: 2023, Sales: 200, Quantity: 20 },
  { Country: 'Canada', Product: 'B', Year: 2024, Sales: 250, Quantity: 25 },
  { Country: 'USA', Product: 'A', Year: 2024, Sales: 300, Quantity: 30 },
];

const aggFuncs = {
  sum: (items, field) => _.sumBy(items, field),
};

function pivotData(data, { rows, columns, values }) {
  if (rows.length === 0 && columns.length === 0) {
    const aggValues = {};
    values.forEach((field) => {
      aggValues[`${field}_sum`] = aggFuncs.sum(data, field);
    });
    return [aggValues];
  }

  const groupKeys = [...rows, ...columns];
  const grouped = _.groupBy(data, (item) =>
    groupKeys.map((key) => item[key]).join('||')
  );

  const result = [];

  Object.entries(grouped).forEach(([groupKey, items]) => {
    const keyParts = groupKey.split('||');
    const rowValues = keyParts.slice(0, rows.length);
    const colValues = keyParts.slice(rows.length);

    const aggValues = {};
    values.forEach((field) => {
      aggValues[`${field}_sum`] = aggFuncs.sum(items, field);
    });

    result.push({
      ...Object.fromEntries(rows.map((r, i) => [r, rowValues[i]])),
      ...Object.fromEntries(columns.map((c, i) => [c, colValues[i]])),
      ...aggValues,
    });
  });

  return result;
}

export default function PivotTableDragDrop() {
  const fields = ['Country', 'Product', 'Year', 'Sales', 'Quantity'];

  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [values, setValues] = useState([]);

  // For reordering drag state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Drag start for adding new field
  const onDragStart = (e, field) => {
    e.dataTransfer.setData('field', field);
  };

  // Drop for adding new field to area
  const onDrop = (e, area) => {
    e.preventDefault();
    const field = e.dataTransfer.getData('field');
    if (!field) return;

    // Prevent duplicates
    if (area === 'rows' && !rows.includes(field)) setRows([...rows, field]);
    else if (area === 'columns' && !columns.includes(field)) setColumns([...columns, field]);
    else if (area === 'values' && !values.includes(field)) setValues([...values, field]);
  };

  const onDragOver = (e) => e.preventDefault();

  // Remove field from area
  const removeField = (area, field) => {
    if (area === 'rows') setRows(rows.filter((f) => f !== field));
    else if (area === 'columns') setColumns(columns.filter((f) => f !== field));
    else if (area === 'values') setValues(values.filter((f) => f !== field));
  };

  // Swap rows and columns on pivot button click
  const onPivotClick = () => {
    setRows(columns);
    setColumns(rows);
  };

  // Handle drag start for reordering inside area
  const onDragStartReorder = (e, area, index) => {
    dragItem.current = { area, index };
  };

  // Handle drag enter for reordering inside area
  const onDragEnterReorder = (e, area, index) => {
    dragOverItem.current = { area, index };
  };

  // Handle drop for reordering inside area
  const onDropReorder = (e, area) => {
    e.preventDefault();
    const drag = dragItem.current;
    const over = dragOverItem.current;
    if (!drag || !over) return;
    if (drag.area !== area || over.area !== area) return;

    let list, setList;
    if (area === 'rows') {
      list = [...rows];
      setList = setRows;
    } else if (area === 'columns') {
      list = [...columns];
      setList = setColumns;
    } else if (area === 'values') {
      list = [...values];
      setList = setValues;
    } else {
      return;
    }

    const draggedField = list[drag.index];
    list.splice(drag.index, 1);
    list.splice(over.index, 0, draggedField);
    setList(list);

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const pivotedData = useMemo(() => {
    if (values.length === 0) return [];
    return pivotData(rawData, { rows, columns, values });
  }, [rows, columns, values]);

  const tableColumns = useMemo(() => {
    const cols = [];
    rows.forEach((rowField) => cols.push({ accessorKey: rowField, header: rowField }));
    columns.forEach((colField) => cols.push({ accessorKey: colField, header: colField }));
    values.forEach((valField) => cols.push({ accessorKey: `${valField}_sum`, header: `${valField} (sum)` }));
    return cols;
  }, [rows, columns, values]);

  const table = useReactTable({
    data: pivotedData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Render draggable fields inside each area with reorder support
  const renderAreaFields = (area, list, bgColor) => (
    <div
      onDrop={(e) => onDropReorder(e, area)}
      onDragOver={onDragOver}
      style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, minHeight: 30 }}
    >
      {list.map((field, index) => (
        <div
          key={field}
          draggable
          onDragStart={(e) => onDragStartReorder(e, area, index)}
          onDragEnter={(e) => onDragEnterReorder(e, area, index)}
          onClick={() => removeField(area, field)}
          title="Click to remove"
          style={{
            backgroundColor: bgColor,
            padding: '4px 8px',
            borderRadius: 4,
            cursor: 'grab',
            userSelect: 'none',
            border: '1px solid #aaa',
          }}
        >
          {field} &times;
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Pivot Table Configuration</h2>
        <button onClick={onPivotClick} style={{ padding: '6px 12px', cursor: 'pointer' }}>
          Switch
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Fields to drag */}
        <div style={{ flex: 1, border: '1px solid #ccc', padding: 10 }}>
          <h3>Fields</h3>
          {fields.map((field) => (
            <div
              key={field}
              draggable
              onDragStart={(e) => onDragStart(e, field)}
              style={{
                padding: '6px 10px',
                margin: '4px 0',
                backgroundColor: '#f9f9f9',
                border: '1px solid #ddd',
                cursor: 'grab',
                userSelect: 'none',
              }}
            >
              {field}
            </div>
          ))}
        </div>

        {/* Pivot areas */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Rows area */}
          <div
            onDrop={(e) => onDrop(e, 'rows')}
            onDragOver={onDragOver}
            style={{ minHeight: 60, border: '2px dashed #888', padding: 10 }}
          >
            <strong>Rows:</strong>
            {renderAreaFields('rows', rows, '#d0eaff')}
          </div>

          {/* Columns area */}
          <div
            onDrop={(e) => onDrop(e, 'columns')}
            onDragOver={onDragOver}
            style={{ minHeight: 60, border: '2px dashed #888', padding: 10 }}
          >
            <strong>Columns:</strong>
            {renderAreaFields('columns', columns, '#d0ffd6')}
          </div>

          {/* Values area */}
          <div
            onDrop={(e) => onDrop(e, 'values')}
            onDragOver={onDragOver}
            style={{ minHeight: 60, border: '2px dashed #888', padding: 10 }}
          >
            <strong>Values:</strong>
            {renderAreaFields('values', values, '#ffe0d0')}
          </div>
        </div>
      </div>

      {/* Debug output */}
      <div style={{ marginTop: 30, fontSize: 14, color: '#555' }}>
        <h4>Current Pivot Configuration:</h4>
        <pre>{JSON.stringify({ rows, columns, values }, null, 2)}</pre>
      </div>

      {/* Pivot table */}
      <div style={{ marginTop: 40 }}>
        <h2>Pivot Table Result</h2>
        {pivotedData.length === 0 ? (
          <p style={{ fontStyle: 'italic' }}>Drag fields into Values to see pivot table</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{
                        border: '1px solid #ccc',
                        padding: '8px',
                        backgroundColor: '#f0f0f0',
                        textAlign: 'left',
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{ border: '1px solid #ccc', padding: '8px' }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}