import React, { useState, useMemo, useRef, useEffect } from 'react';
import _ from 'lodash';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { MdArrowDownward, MdArrowForward } from 'react-icons/md';

const rawData = [
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Oppo', Year: 2023, Quarter: 'Q1', Sales: 100, Quantity: 10 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Oppo', Year: 2023, Quarter: 'Q2', Sales: 120, Quantity: 12 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Oppo', Year: 2024, Quarter: 'Q1', Sales: 175, Quantity: 11 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Oppo', Year: 2024, Quarter: 'Q3', Sales: 190, Quantity: 13 },
  
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Apple', Year: 2023, Quarter: 'Q1', Sales: 150, Quantity: 15 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Apple', Year: 2023, Quarter: 'Q4', Sales: 180, Quantity: 18 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Apple', Year: 2024, Quarter: 'Q2', Sales: 200, Quantity: 12 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Apple', Year: 2024, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Lenovo', Year: 2024, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Lenovo', Year: 2024, Quarter: 'Q4', Sales: 120, Quantity: 11 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Lenovo', Year: 2023, Quarter: 'Q4', Sales: 120, Quantity: 11 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Dell', Year: 2024, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Dell', Year: 2024, Quarter: 'Q4', Sales: 120, Quantity: 11 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Dell', Year: 2023, Quarter: 'Q4', Sales: 120, Quantity: 11 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'HP', Year: 2024, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'HP', Year: 2023, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Samsung', Year: 2024, Quarter: 'Q4', Sales: 120, Quantity: 11 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Samsung', Year: 2023, Quarter: 'Q4', Sales: 120, Quantity: 11 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Asus', Year: 2024, Quarter: 'Q4', Sales: 120, Quantity: 11 },
  { Country: 'USA', Product: 'Mobile', SubProduct: 'Asus', Year: 2023, Quarter: 'Q4', Sales: 120, Quantity: 11 },
  
  { Country: 'Canada', Product: 'Laptop', SubProduct: 'Lenovo', Year: 2023, Quarter: 'Q1', Sales: 200, Quantity: 20 },
  { Country: 'Canada', Product: 'Laptop', SubProduct: 'Lenovo', Year: 2023, Quarter: 'Q3', Sales: 230, Quantity: 22 },
  { Country: 'Canada', Product: 'Laptop', SubProduct: 'Lenovo', Year: 2024, Quarter: 'Q2', Sales: 280, Quantity: 25 },
  { Country: 'Canada', Product: 'Mobile', SubProduct: 'Apple', Year: 2024, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  { Country: 'Canada', Product: 'Mobile', SubProduct: 'Oppo', Year: 2024, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  { Country: 'Canada', Product: 'Mobile', SubProduct: 'Lenovo', Year: 2024, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  { Country: 'Canada', Product: 'Mobile', SubProduct: 'Dell', Year: 2024, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  { Country: 'Canada', Product: 'Mobile', SubProduct: 'HP', Year: 2024, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  { Country: 'Canada', Product: 'Mobile', SubProduct: 'Samsung', Year: 2024, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  { Country: 'Canada', Product: 'Mobile', SubProduct: 'Asus', Year: 2024, Quarter: 'Q4', Sales: 220, Quantity: 14 },
  
  { Country: 'Canada', Product: 'Laptop', SubProduct: 'Dell', Year: 2023, Quarter: 'Q2', Sales: 180, Quantity: 18 },
  { Country: 'Canada', Product: 'Laptop', SubProduct: 'Dell', Year: 2024, Quarter: 'Q1', Sales: 250, Quantity: 25 },
  { Country: 'Canada', Product: 'Laptop', SubProduct: 'Dell', Year: 2024, Quarter: 'Q4', Sales: 270, Quantity: 27 },
  { Country: 'Canada', Product: 'Laptop', SubProduct: 'Asus', Year: 2024, Quarter: 'Q4', Sales: 270, Quantity: 27 },
  { Country: 'Canada', Product: 'Laptop', SubProduct: 'Samsung', Year: 2024, Quarter: 'Q4', Sales: 270, Quantity: 27 },
  { Country: 'Canada', Product: 'Laptop', SubProduct: 'HP', Year: 2024, Quarter: 'Q4', Sales: 270, Quantity: 27 },
  { Country: 'Canada', Product: 'Laptop', SubProduct: 'Apple', Year: 2024, Quarter: 'Q4', Sales: 270, Quantity: 27 },
  { Country: 'Canada', Product: 'Laptop', SubProduct: 'Oppo', Year: 2024, Quarter: 'Q4', Sales: 270, Quantity: 27 },
  
  { Country: 'USA', Product: 'Laptop', SubProduct: 'HP', Year: 2023, Quarter: 'Q3', Sales: 220, Quantity: 22 },
  { Country: 'USA', Product: 'Laptop', SubProduct: 'HP', Year: 2024, Quarter: 'Q1', Sales: 300, Quantity: 30 },
  { Country: 'USA', Product: 'Laptop', SubProduct: 'HP', Year: 2024, Quarter: 'Q2', Sales: 320, Quantity: 32 },
  { Country: 'USA', Product: 'Laptop', SubProduct: 'Lenovo', Year: 2023, Quarter: 'Q1', Sales: 200, Quantity: 20 },
  { Country: 'USA', Product: 'Laptop', SubProduct: 'Oppo', Year: 2023, Quarter: 'Q1', Sales: 200, Quantity: 20 },
  { Country: 'USA', Product: 'Laptop', SubProduct: 'Oppo', Year: 2024, Quarter: 'Q1', Sales: 200, Quantity: 20 },
  { Country: 'USA', Product: 'Laptop', SubProduct: 'Apple', Year: 2023, Quarter: 'Q1', Sales: 200, Quantity: 20 },
  { Country: 'USA', Product: 'Laptop', SubProduct: 'Dell', Year: 2023, Quarter: 'Q1', Sales: 200, Quantity: 20 },
  { Country: 'USA', Product: 'Laptop', SubProduct: 'Samsung', Year: 2023, Quarter: 'Q1', Sales: 200, Quantity: 20 },
  { Country: 'USA', Product: 'Laptop', SubProduct: 'Asus', Year: 2023, Quarter: 'Q1', Sales: 200, Quantity: 20 },
];

// fieldTypes unchanged
let fieldTypes = {
  Country: 'dimension',
  Product: 'dimension',
  SubProduct: 'dimension',
  Year: 'dimension',
  Quarter: 'dimension',
  Sales: 'measure',
  Quantity: 'measure'
};

const aggFuncs = {
  sum: (items, field) => _.sumBy(items, field),
  avg: (items, field) => _.meanBy(items, field),
  count: (items) => items.length,
  min: (items, field) => _.minBy(items, field)?.[field],
  max: (items, field) => _.maxBy(items, field)?.[field],
};

function createPivotData(data, { rows, columns }, sortConfig) {
  if (rows.length === 0 && columns.length === 0) return [];

  // Separate dimensions and measures from rows and columns
  const rowDimensions = rows.filter(item => typeof item === 'string');
  const rowMeasures = rows.filter(item => typeof item === 'object');
  const columnDimensions = columns.filter(item => typeof item === 'string');
  const columnMeasures = columns.filter(item => typeof item === 'object');

  // Combine all measures
  const allMeasures = [...rowMeasures, ...columnMeasures];
  const effectiveMeasures = allMeasures.length > 0 ? allMeasures : [];

  // Apply sorting before grouping
  let sortedData = [...data];
  if (sortConfig && sortConfig.field && sortConfig.direction) {
    sortedData = _.orderBy(sortedData, [sortConfig.field], [sortConfig.direction]);
  }

  // Group by row dimensions using sorted data
  const rowGroups = rowDimensions.length > 0 ?
    _.groupBy(sortedData, (item) => rowDimensions.map(field => item[field]).join('|')) :
    { 'All': sortedData };

  // Create column combinations for multi-level headers
  const columnCombinations = [];
  if (columnDimensions.length > 0) {
    function generateCombinations(fields, currentCombo = []) {
      if (currentCombo.length === fields.length) {
        columnCombinations.push([...currentCombo]);
        return;
      }
    
      const currentField = fields[currentCombo.length];
      const uniqueValues = [...new Set(data.map(item => item[currentField]))];
    
      uniqueValues.forEach(value => {
        generateCombinations(fields, [...currentCombo, value]);
      });
    }
  
    generateCombinations(columnDimensions);
  } else {
    columnCombinations.push(['All']);
  }

  const result = [];

  // Get unique row dimension values in sorted order
  const uniqueRowKeys = rowDimensions.length > 0 ? 
    [...new Set(sortedData.map(item => rowDimensions.map(field => item[field]).join('|')))] :
    ['All'];

  // Process rows in the order they appear in sorted data
  uniqueRowKeys.forEach(rowKey => {
    if (!rowGroups[rowKey]) return;
  
    const rowData = rowGroups[rowKey];
    const rowValues = rowKey === 'All' ? [] : rowKey.split('|');
    const rowObj = { id: rowKey, isGroup: rowDimensions.length > 0 };

    // Add row dimension values
    rowDimensions.forEach((field, index) => {
      rowObj[field] = rowValues[index] || '';
    });

    // Add row measures as separate rows if any
    if (rowMeasures.length > 0) {
      rowMeasures.forEach(measure => {
        rowObj[`measure_${measure.field}`] = measure.field;
      });
    }

    // Calculate measures for each column combination
    columnCombinations.forEach(combo => {
      const colKey = combo.join('_');
    
      // Filter data for this column combination
      const colData = columnDimensions.length > 0 ? 
        data.filter(item => columnDimensions.every((field, idx) => item[field] === combo[idx])) :
        data;
    
      const intersection = rowData.filter(item => colData.includes(item));

      effectiveMeasures.forEach(measure => {
        const measureKey = colKey === 'All' ? measure.field : colKey + '_' + measure.field;

        if (measure.field === 'count') {
          rowObj[measureKey] = intersection.length > 0 ? intersection.length : '';
        } else {
          rowObj[measureKey] = intersection.length > 0 ? aggFuncs[measure.aggFunc](intersection, measure.field) || '' : '';
        }
      });
    });

    result.push(rowObj);
  });

  return result;
}

// Generate dynamic columns for TanStack Table with hierarchical structure and arrows
function generateTableColumns(rows, columns, data) {
  const columnHelper = createColumnHelper();
  const tableColumns = [];

  // Separate dimensions and measures
  const rowDimensions = rows.filter(item => typeof item === 'string');
  const rowMeasures = rows.filter(item => typeof item === 'object');
  const columnDimensions = columns.filter(item => typeof item === 'string');
  const columnMeasures = columns.filter(item => typeof item === 'object');

  // Helper to render header with arrow and dimension/measure icon
  const renderHeader = (field, area, isMeasure = false, aggFunc = '') => {
    const arrowIcon = area === 'rows' ? 
      <MdArrowForward style={{ marginLeft: 4, color: '#888', fontSize: 14 }} /> : 
      <MdArrowDownward style={{ marginLeft: 4, color: '#888', fontSize: 14 }} />;
    const icon = isMeasure ? '📈' : '📊';
  
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span>{icon} {field}{aggFunc ? ` (${aggFunc})` : ''}</span>
        {arrowIcon}
      </div>
    );
  };

  // Row dimension columns
  rowDimensions.forEach(field => {
    tableColumns.push(
      columnHelper.accessor(field, {
        id: `row_${field}`,
        header: () => renderHeader(field, 'rows', false),
        cell: info => info.getValue(),
        tooltip: `Dimension: ${field}`,
      })
    );
  });

  // Row measure columns (if measures are in rows)
  rowMeasures.forEach(measure => {
    tableColumns.push(
      columnHelper.accessor(`measure_${measure.field}`, {
        id: `row_measure_${measure.field}`,
        header: () => renderHeader('Measure', 'rows', true),
        cell: info => info.getValue(),
        tooltip: `Measure: ${measure.field}`,
      })
    );
  });

  // Combine all measures for column generation
  const allMeasures = [...rowMeasures, ...columnMeasures];
  const effectiveMeasures = allMeasures.length > 0 ? allMeasures : [];

  // If no column dimensions specified, create simple measure columns
  if (columnDimensions.length === 0) {
    effectiveMeasures.forEach(measure => {
      tableColumns.push(
        columnHelper.accessor(measure.field, {
          id: `measure_${measure.field}`,
          header: () => renderHeader(measure.field, 'columns', true, measure.aggFunc),
          cell: info => typeof info.getValue() === 'number' ? info.getValue().toLocaleString() : '',
          tooltip: `Measure: ${measure.field} (${measure.aggFunc})`,
        })
      );
    });
  } else {
    // Generate all unique combinations for column dimensions
    const columnCombinations = [];
  
    function generateCombinations(fields, currentCombo = []) {
      if (currentCombo.length === fields.length) {
        columnCombinations.push([...currentCombo]);
        return;
      }
    
      const currentField = fields[currentCombo.length];
      const uniqueValues = [...new Set(rawData.map(item => item[currentField]))];
    
      uniqueValues.forEach(value => {
        generateCombinations(fields, [...currentCombo, value]);
      });
    }
  
    generateCombinations(columnDimensions);

    // Build hierarchical column structure
    function buildColumnHierarchy(level = 0) {
      if (level >= columnDimensions.length) {
        return effectiveMeasures.map(measure => ({
          type: 'measure',
          measure: measure
        }));
      }

      const currentField = columnDimensions[level];
      const uniqueValues = [...new Set(rawData.map(item => item[currentField]))];
    
      return uniqueValues.map(value => ({
        type: 'group',
        field: currentField,
        value: value,
        children: buildColumnHierarchy(level + 1)
      }));
    }

    // Create nested column structure with arrows
    function createNestedColumns(hierarchy, pathSoFar = [], idPrefix = '') {
      return hierarchy.map((node, index) => {
        if (node.type === 'measure') {
          const measureKey = pathSoFar.join('_') + (pathSoFar.length > 0 ? '_' : '') + node.measure.field;
          const columnId = `${idPrefix}_measure_${index}_${node.measure.field}`;
        
          return columnHelper.accessor(measureKey, {
            id: columnId,
            header: () => renderHeader(node.measure.field, 'columns', true, node.measure.aggFunc),
            cell: info => typeof info.getValue() === 'number' ? info.getValue().toLocaleString() : '',
            tooltip: `Measure: ${node.measure.field} (${node.measure.aggFunc})`,
          });
        } else {
          const newPath = [...pathSoFar, node.value];
          const newIdPrefix = `${idPrefix}_group_${index}_${node.field}_${node.value}`;
          const subColumns = createNestedColumns(node.children, newPath, newIdPrefix);
        
          if (subColumns.length === 1 && effectiveMeasures.length === 1) {
            const singleColumn = subColumns[0];
            return columnHelper.accessor(singleColumn.accessorKey || singleColumn.accessorFn, {
              id: `${newIdPrefix}_single`,
              header: () => (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>📊 {node.value}</span>
                  <MdArrowDownward style={{ marginLeft: 4, color: '#888', fontSize: 14 }} />
                </div>
              ),
              cell: singleColumn.cell,
              tooltip: node.value,
            });
          } else {
            return columnHelper.group({
              id: newIdPrefix,
              header: () => (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>📊 {node.value}</span>
                  <MdArrowDownward style={{ marginLeft: 4, color: '#888', fontSize: 14 }} />
                </div>
              ),
              columns: subColumns,
              tooltip: node.value,
            });
          }
        }
      });
    }

    const hierarchy = buildColumnHierarchy();
    const nestedColumns = createNestedColumns(hierarchy, [], 'col');
    tableColumns.push(...nestedColumns);
  }

  return tableColumns;
}

export default function PivotTableDragDrop() {
  const [dynamicFieldTypes, setDynamicFieldTypes] = useState(fieldTypes);
  const dimensions = Object.keys(dynamicFieldTypes).filter(field => dynamicFieldTypes[field] === 'dimension');
  const measureFields = Object.keys(dynamicFieldTypes).filter(field => dynamicFieldTypes[field] === 'measure');

  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);

  // New state for hierarchies on left panel
  // Each hierarchy: { id: string, name: string, children: string[] }
  const [hierarchies, setHierarchies] = useState([]);

  // For reordering drag state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // For editing and context menu
  const [editingField, setEditingField] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, area: null, index: null, type: null, hierarchyId: null });
  const [sortConfig, setSortConfig] = useState({ area: null, field: null, direction: null });
  const [showSortingSubmenu, setShowSortingSubmenu] = useState(false);
  const [showEditSubmenu, setShowEditSubmenu] = useState(false);

  const dimensionColor = '#e3f2fd';
  const measureColor = '#f3e5f5';

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ ...contextMenu, visible: false });
      setShowSortingSubmenu(false);
      setShowEditSubmenu(false);
    };
    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.visible]);

  // Drag start for adding new field or hierarchy
  const onDragStart = (e, item, type = 'dimension', hierarchyId = null) => {
    // type: 'dimension' or 'hierarchy'
    e.dataTransfer.setData('item', item);
    e.dataTransfer.setData('type', type);
    if (hierarchyId) {
      e.dataTransfer.setData('hierarchyId', hierarchyId);
    }
  };

  // Drop for adding new field or hierarchy to area
  const onDrop = (e, area) => {
    e.preventDefault();
    const item = e.dataTransfer.getData('item');
    const type = e.dataTransfer.getData('type');
    const hierarchyId = e.dataTransfer.getData('hierarchyId');

    if (!item) return;

    const getList = area === 'rows' ? rows : columns;
    const setList = area === 'rows' ? setRows : setColumns;

    if (type === 'measure') {
      // Measures are always objects with aggFunc
      const alreadyInRows = rows.some(i => typeof i === 'object' && i.field === item);
      const alreadyInColumns = columns.some(i => typeof i === 'object' && i.field === item);
      if (alreadyInRows || alreadyInColumns) return;
      setList([...getList, { field: item, aggFunc: 'sum' }]);
    } else if (type === 'dimension') {
      // Add dimension if not already present
      if (getList.some(i => i === item)) return;
      // Insert before first measure if any
      const firstMeasureIdx = getList.findIndex(i => typeof i === 'object');
      if (firstMeasureIdx === -1) {
        setList([...getList, item]);
      } else {
        setList([
          ...getList.slice(0, firstMeasureIdx),
          item,
          ...getList.slice(firstMeasureIdx),
        ]);
      }
    } else if (type === 'hierarchy') {
      // Dragging hierarchy to rows/columns: add all children flattened
      const hierarchy = hierarchies.find(h => h.id === hierarchyId);
      if (!hierarchy) return;

      // Flatten children, exclude those already in rows or columns
      const childrenToAdd = hierarchy.children.filter(child => !rows.includes(child) && !columns.includes(child));

      // Add children to target area
      const newList = [...getList];
      childrenToAdd.forEach(child => {
        if (!newList.includes(child)) {
          // Insert before first measure if any
          const firstMeasureIdx = newList.findIndex(i => typeof i === 'object');
          if (firstMeasureIdx === -1) {
            newList.push(child);
          } else {
            newList.splice(firstMeasureIdx, 0, child);
          }
        }
      });
      setList(newList);
    }
  };

  const onDragOver = (e) => e.preventDefault();

  const handleFieldClick = (area, index) => {
    setEditingField({ area, index });
  };

  // For context menu
  const handleContextMenu = (e, area, index) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, area, index });
    setShowSortingSubmenu(false);
    setShowEditSubmenu(false);
  };

  const handleRemove = () => {
    const { area, index } = contextMenu;
    if (area === 'rows') {
      setRows(rows.filter((_, i) => i !== index));
    } else {
      setColumns(columns.filter((_, i) => i !== index));
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Enhanced edit handlers for the three options
  const handleEditGlobal = () => {
    // Option 1: Edit globally - updates everywhere the field is used
    const { area, index } = contextMenu;
    const list = area === 'rows' ? rows : columns;
    const item = list[index];
    const currentFieldName = typeof item === 'object' ? item.field : item;
  
    const newName = prompt(`Enter new name for "${currentFieldName}" (will update everywhere):`, currentFieldName);
    if (newName && newName !== currentFieldName && !dynamicFieldTypes[newName]) {
      // Update field types
      const newFieldTypes = { ...dynamicFieldTypes };
      newFieldTypes[newName] = newFieldTypes[currentFieldName];
      delete newFieldTypes[currentFieldName];
      setDynamicFieldTypes(newFieldTypes);
    
      // Update in rows
      setRows(rows.map(rowItem => 
        typeof rowItem === 'object' 
          ? (rowItem.field === currentFieldName ? { ...rowItem, field: newName } : rowItem)
          : (rowItem === currentFieldName ? newName : rowItem)
      ));
    
      // Update in columns
      setColumns(columns.map(colItem => 
        typeof colItem === 'object' 
          ? (colItem.field === currentFieldName ? { ...colItem, field: newName } : colItem)
          : (colItem === currentFieldName ? newName : colItem)
      ));
    }
    setContextMenu({ ...contextMenu, visible: false });
    setShowEditSubmenu(false);
  };

  const handleCreateCopy = () => {
    // Option 2: Create a copy in the main dimension/measure list
    const { area, index } = contextMenu;
    const list = area === 'rows' ? rows : columns;
    const item = list[index];
    const currentFieldName = typeof item === 'object' ? item.field : item;
  
    const newName = prompt(`Enter name for copy of "${currentFieldName}":`, `${currentFieldName}_Copy`);
    if (newName && !dynamicFieldTypes[newName]) {
      // Add to field types
      const newFieldTypes = { ...dynamicFieldTypes };
      newFieldTypes[newName] = dynamicFieldTypes[currentFieldName];
      setDynamicFieldTypes(newFieldTypes);
    }
    setContextMenu({ ...contextMenu, visible: false });
    setShowEditSubmenu(false);
  };

  const handleEditLocal = () => {
    // Option 3: Edit locally (current functionality)
    setEditingField({ area: contextMenu.area, index: contextMenu.index });
    setContextMenu({ ...contextMenu, visible: false });
    setShowEditSubmenu(false);
  };

  const handleSort = (direction) => {
    const { area, index } = contextMenu;
    const list = area === 'rows' ? rows : columns;
    const item = list[index];
    if (typeof item === 'string') {
      setSortConfig({ area, field: item, direction });
    }
    setContextMenu({ ...contextMenu, visible: false });
    setShowSortingSubmenu(false);
  };

  const handleEditChange = (e, area, index) => {
    const value = e.target.value;
    if (area === 'rows') {
      setRows(rows.map((item, i) => (i === index ? (typeof item === 'object' ? { ...item, field: value } : value) : item)));
    } else {
      setColumns(columns.map((item, i) => (i === index ? (typeof item === 'object' ? { ...item, field: value } : value) : item)));
    }
  };

  const handleEditBlur = () => setEditingField(null);

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleEditBlur();
    }
    if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  // Update measure aggregation function
  const updateMeasureAggFunc = (area, field, aggFunc) => {
    if (area === 'rows') {
      setRows(rows.map(item => 
        typeof item === 'object' && item.field === field ? { ...item, aggFunc } : item
      ));
    } else if (area === 'columns') {
      setColumns(columns.map(item => 
        typeof item === 'object' && item.field === field ? { ...item, aggFunc } : item
      ));
    }
  };
  // Drag start for reorder inside area
  const onDragStartReorder = (e, area, index) => {
    dragItem.current = { area, index };
  };

  // Drag enter for reorder inside area
  const onDragEnterReorder = (e, area, index) => {
    dragOverItem.current = { area, index };
  };

  // Drop for reorder inside area
  const onDropReorder = (e, area) => {
    e.preventDefault();
    const drag = dragItem.current;
    const over = dragOverItem.current;
    if (!drag || !over) return;
    if (drag.area !== area || over.area !== area) return;

    if (area === 'rows') {
      const list = [...rows];
      const draggedItem = list[drag.index];
      list.splice(drag.index, 1);
      list.splice(over.index, 0, draggedItem);
      setRows(list);
    } else if (area === 'columns') {
      const list = [...columns];
      const draggedItem = list[drag.index];
      list.splice(drag.index, 1);
      list.splice(over.index, 0, draggedItem);
      setColumns(list);
    }

    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Context menu for left panel dimensions and hierarchies
  const handleContextMenuLeft = (e, item, type, hierarchyId = null) => {
    e.preventDefault();
    e.stopPropagation();
    // type: 'dimension' or 'hierarchy'
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, area: 'left', index: null, type, item, hierarchyId });
    setShowSortingSubmenu(false);
    setShowEditSubmenu(false);
  };

  // Handle "Create Hierarchy" from context menu on dimension
  const handleCreateHierarchy = () => {
    if (contextMenu.type !== 'dimension') return;
    const dimName = contextMenu.item;

    // Check if hierarchy already exists for this dimension
    if (hierarchies.some(h => h.name === `${dimName} Hierarchy`)) {
      alert('Hierarchy already exists for this dimension.');
      setContextMenu({ ...contextMenu, visible: false });
      return;
    }

    const newHierarchy = {
      id: `hier_${Date.now()}`,
      name: `${dimName} Hierarchy`,
      children: [],
    };

    // Dimensions not in any hierarchy
    const dimensionsNotInHierarchy = dimensions.filter(dim => !hierarchies.some(h => h.children.includes(dim)));

    // Build combined list as rendered in left panel: hierarchies + their children + dimensionsNotInHierarchy
    const combinedList = [];

    hierarchies.forEach(h => {
      combinedList.push({ type: 'hierarchy', name: h.name, id: h.id });
      h.children.forEach(child => combinedList.push({ type: 'dimension', name: child }));
    });

    dimensionsNotInHierarchy.forEach(dim => combinedList.push({ type: 'dimension', name: dim }));

    // Find index of the dimension in combinedList
    const dimIndexInCombined = combinedList.findIndex(item => item.type === 'dimension' && item.name === dimName);

    if (dimIndexInCombined === -1) {
      // Fallback: prepend if dimension not found
      setHierarchies([newHierarchy, ...hierarchies]);
    } else {
      // Find the hierarchy index that contains the dimension (if any)
      let insertIndex = hierarchies.length; // default to end
      for (let i = 0; i < hierarchies.length; i++) {
        if (hierarchies[i].children.includes(dimName)) {
          insertIndex = i + 1; // insert after this hierarchy
          break;
        }
      }

      // If dimension is not in any hierarchy, find the last hierarchy before the dimension in combinedList
      if (insertIndex === hierarchies.length) {
        // Find all hierarchy names in combinedList before dimIndexInCombined
        const hierarchyNamesBefore = combinedList
          .slice(0, dimIndexInCombined)
          .filter(item => item.type === 'hierarchy')
          .map(item => item.name);

        if (hierarchyNamesBefore.length > 0) {
          // Find last hierarchy in hierarchies array that matches
          for (let i = hierarchies.length - 1; i >= 0; i--) {
            if (hierarchyNamesBefore.includes(hierarchies[i].name)) {
              insertIndex = i + 1;
              break;
            }
          }
        } else {
          insertIndex = 0; // no hierarchy before, insert at start
        }
      }

      // Insert newHierarchy at insertIndex
      const newHierarchies = [...hierarchies];
      newHierarchies.splice(insertIndex, 0, newHierarchy);
      setHierarchies(newHierarchies);
    }

    setContextMenu({ ...contextMenu, visible: false });
  };

  // Handle dropping a dimension onto a hierarchy to add as child
  const onDropOnHierarchy = (e, hierarchyId) => {
    e.preventDefault();
    const item = e.dataTransfer.getData('item');
    const type = e.dataTransfer.getData('type');
    if (type !== 'dimension') return; // Only dimensions can be added as children
    if (!item) return;

    // Prevent adding hierarchy as child of itself or duplicates
    const hierarchy = hierarchies.find(h => h.id === hierarchyId);
    if (!hierarchy) return;
    if (hierarchy.children.includes(item)) return;

    // Remove from rows and columns if present (to avoid duplicates)
    setRows(rows.filter(i => i !== item));
    setColumns(columns.filter(i => i !== item));

    // Add child to hierarchy
    const newHierarchies = hierarchies.map(h => {
      if (h.id === hierarchyId) {
        return { ...h, children: [...h.children, item] };
      }
      return h;
    });
    setHierarchies(newHierarchies);
  };

  // Handle removing hierarchy
  const handleRemoveHierarchy = () => {
    if (contextMenu.type !== 'hierarchy') return;
    const id = contextMenu.hierarchyId;
    setHierarchies(hierarchies.filter(h => h.id !== id));
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Helper to get style for left panel items
  const getLeftItemStyle = (type) => {
    if (type === 'dimension') {
      return {
        backgroundColor: dimensionColor,
        border: '1px solid #2196f3',
        padding: '6px 10px',
        margin: '4px 0',
        borderRadius: 4,
        cursor: 'grab',
        userSelect: 'none',
      };
    } else if (type === 'hierarchy') {
      return {
        backgroundColor: '#c8e6c9',
        border: '1px solid #388e3c',
        padding: '6px 10px',
        margin: '8px 0 4px 0',
        borderRadius: 6,
        fontWeight: 'bold',
        cursor: 'grab',
        userSelect: 'none',
      };
    }
    return {};
  };

  // Flatten rows and columns for pivot calculation, expanding hierarchies
  const flattenAreaItems = (list) => {
    const result = [];
    list.forEach(item => {
      if (typeof item === 'string') {
        // Check if item is a hierarchy label (we won't add hierarchies directly here)
        // So just add dimension string
        result.push(item);
      } else if (typeof item === 'object') {
        // Measures
        result.push(item);
      }
    });
    return result;
  };

  // For pivot, rows and columns are flattened dimensions and measures
  // Hierarchies are not added directly to rows/columns, only their children are added on drag
  // So rows and columns remain arrays of strings (dimensions) and objects (measures)

  // Generate pivot data with sorting
  const pivotData = useMemo(() => {
    return createPivotData(rawData, { rows, columns }, sortConfig);
  }, [rows, columns, sortConfig]);

  // Generate table columns
  const tableColumns = useMemo(() => {
    return generateTableColumns(rows, columns, pivotData);
  }, [rows, columns, pivotData]);
 const table = useReactTable({
    data: pivotData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  // Helper function to get field style based on type
  const getFieldStyle = (field) => {
    if (typeof field === 'string' && dimensions.includes(field)) {
      return {
        backgroundColor: dimensionColor,
        border: '1px solid #2196f3',
      };
    } else if (typeof field === 'object' && measureFields.includes(field.field)) {
      return {
        backgroundColor: measureColor,
        border: '1px solid #9c27b0',
      };
    }
    return {};
  };
  // Render left panel: hierarchies + dimensions
  const renderLeftPanel = () => (
    <div>
      {/* Render hierarchies */}
      {hierarchies.map(hierarchy => (
        <div
          key={hierarchy.id}
          draggable
          onDragStart={(e) => onDragStart(e, hierarchy.name, 'hierarchy', hierarchy.id)}
          onDrop={(e) => onDropOnHierarchy(e, hierarchy.id)}
          onDragOver={onDragOver}
          onContextMenu={(e) => handleContextMenuLeft(e, hierarchy.name, 'hierarchy', hierarchy.id)}
          style={getLeftItemStyle('hierarchy')}
          title="Drag hierarchy to Rows or Columns"
        >
          📂 {hierarchy.name}
          {/* Render children under hierarchy */}
          <div style={{ marginLeft: 20, marginTop: 4 }}>
            {hierarchy.children.map(child => (
              <div
                key={child}
                draggable
                onDragStart={(e) => onDragStart(e, child, 'dimension')}
                onContextMenu={(e) => handleContextMenuLeft(e, child, 'dimension')}
                style={getLeftItemStyle('dimension')}
                title="Drag dimension"
              >
                📊 {child}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Render dimensions not in any hierarchy */}
      {dimensions.filter(dim => !hierarchies.some(h => h.children.includes(dim))).map(field => (
        <div
          key={field}
          draggable
          onDragStart={(e) => onDragStart(e, field, 'dimension')}
          onContextMenu={(e) => handleContextMenuLeft(e, field, 'dimension')}
          style={getLeftItemStyle('dimension')}
          title="Drag dimension"
        >
          📊 {field}
        </div>
      ))}
    </div>
  );

  // Render draggable fields inside each area with editing and context menu (unchanged)
  const renderAreaFields = (area, list) => (
    <div
      onDrop={(e) => onDropReorder(e, area)}
      onDragOver={onDragOver}
      style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, minHeight: 30 }}
    >
      {list.map((item, index) => {
        const isObject = typeof item === 'object';
        const displayName = isObject ? item.field : item;
        const fieldName = isObject ? item.field : item;
        const style = getFieldStyle(item);

        // Editing
        if (editingField && editingField.area === area && editingField.index === index) {
          return (
            <input
              key={`${fieldName}_${index}_edit`}
              type="text"
              value={displayName}
              autoFocus
              onChange={e => handleEditChange(e, area, index)}
              onBlur={handleEditBlur}
              onKeyDown={handleEditKeyDown}
              style={{ 
                ...style, 
                padding: '4px 8px', 
                borderRadius: 4, 
                minWidth: 60,
                fontSize: '12px',
                outline: 'none'
              }}
            />
          );
        }

        return (
          <div key={`${fieldName}_${index}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              draggable
              onDragStart={(e) => onDragStartReorder(e, area, index)}
              onDragEnter={(e) => onDragEnterReorder(e, area, index)}
              onClick={() => handleFieldClick(area, index)}
              onContextMenu={e => handleContextMenu(e, area, index)}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                userSelect: 'none',
                ...style,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isObject ? '📈' : '📊'} {displayName}
              <span style={{ marginLeft: 4, color: '#888', fontSize: 16, display: 'flex', alignItems: 'center' }}>
                {area === 'rows' ? <MdArrowForward /> : <MdArrowDownward />}
              </span>
            </div>
            {isObject && (
              <select
                value={item.aggFunc}
                onChange={(e) => updateMeasureAggFunc(area, fieldName, e.target.value)}
                style={{ fontSize: '12px', padding: '2px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="sum">Sum</option>
                <option value="avg">Avg</option>
                <option value="count">Count</option>
                <option value="min">Min</option>
                <option value="max">Max</option>
              </select>
            )}
          </div>
        );
      })}
    </div>
  );

  // Context menu for left panel includes "Create Hierarchy" for dimensions
  const renderContextMenu = () => {
    if (!contextMenu.visible) return null;

    if (contextMenu.area === 'left') {
      if (contextMenu.type === 'dimension') {
        return (
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: 4,
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              minWidth: 140,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
              onClick={handleCreateHierarchy}
            >
              Create Hierarchy
            </div>
          </div>
        );
      } else if (contextMenu.type === 'hierarchy') {
        return (
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: 4,
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              minWidth: 140,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
              onClick={handleRemoveHierarchy}
            >
              Remove Hierarchy
            </div>
          </div>
        );
      }
    }

    // Existing context menu for rows/columns unchanged
    return (
      <div
        style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: 4,
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          minWidth: 120,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }} 
          onClick={handleRemove}
        >
          Remove
        </div>
        <div 
          style={{ padding: '8px 12px', cursor: 'pointer', position: 'relative', borderBottom: '1px solid #eee' }}
          onMouseEnter={() => setShowSortingSubmenu(true)}
          onMouseLeave={() => setShowSortingSubmenu(false)}
        >
          Sorting ▶
          {showSortingSubmenu && (
            <div style={{
              position: 'absolute', 
              left: '100%', 
              top: 0, 
              background: '#fff', 
              border: '1px solid #ccc', 
              borderRadius: 4, 
              minWidth: 100,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 1001
            }}>
              <div 
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }} 
                onClick={() => handleSort('asc')}
              >
                Ascending
              </div>
              <div 
                style={{ padding: '8px 12px', cursor: 'pointer' }} 
                onClick={() => handleSort('desc')}
              >
                Descending
              </div>
            </div>
          )}
        </div>
        <div 
          style={{ padding: '8px 12px', cursor: 'pointer', position: 'relative' }}
          onMouseEnter={() => setShowEditSubmenu(true)}
          onMouseLeave={() => setShowEditSubmenu(false)}
        >
          Edit ▶
          {showEditSubmenu && (
            <div style={{
              position: 'absolute', 
              left: '100%', 
              top: 0, 
              background: '#fff', 
              border: '1px solid #ccc', 
              borderRadius: 4, 
              minWidth: 150,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 1001
            }}>
              <div 
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }} 
                onClick={handleEditGlobal}
              >
                Edit Globally
              </div>
              <div 
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }} 
                onClick={handleCreateCopy}
              >
                Create Copy
              </div>
              <div 
                style={{ padding: '8px 12px', cursor: 'pointer' }} 
                onClick={handleEditLocal}
              >
                Edit Locally
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1400, margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>New Pivot Table</h2>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Fields to drag */}
        <div style={{ flex: 1, border: '1px solid #ccc', padding: 10 }}>
          <h3>Dimensions & Hierarchies</h3>
          {renderLeftPanel()}

          <h3 style={{ marginTop: 20 }}>Measures</h3>
          {measureFields.map((field) => {
            const isUsed = rows.concat(columns).some(
              item => typeof item === 'object' && item.field === field
            );
            return (
              <div
                key={field}
                draggable={!isUsed}
                onDragStart={isUsed ? undefined : (e) => onDragStart(e, field, 'measure')}
                style={{
                  padding: '6px 10px',
                  margin: '4px 0',
                  backgroundColor: measureColor,
                  border: '1px solid #9c27b0',
                  cursor: isUsed ? 'not-allowed' : 'grab',
                  userSelect: 'none',
                  borderRadius: 4,
                  opacity: isUsed ? 0.5 : 1,
                }}
                title={isUsed ? 'Already added to rows or columns' : ''}
              >
                📈 {field}
              </div>
            );
          })}
        </div>

        {/* Pivot areas */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 15 }}>
          {/* Columns area */}
          <div
            onDrop={(e) => onDrop(e, 'columns')}
            onDragOver={onDragOver}
            style={{ minHeight: 60, border: '2px dashed #888', padding: 10, backgroundColor: '#fafafa' }}
          >
            <strong>Columns (Dimensions & Measures):</strong>
            {renderAreaFields('columns', columns)}
          </div>

          {/* Rows area */}
          <div
            onDrop={(e) => onDrop(e, 'rows')}
            onDragOver={onDragOver}
            style={{ minHeight: 60, border: '2px dashed #888', padding: 10, backgroundColor: '#fafafa' }}
          >
            <strong>Rows (Dimensions & Measures):</strong>
            {renderAreaFields('rows', rows)}
          </div>
        </div>
      </div>

      {renderContextMenu()}

      {/* TanStack Pivot Table */}
      <div style={{ marginTop: 40 }}>
        <h2>Pivot Table Result</h2>
        {pivotData.length === 0 ? (
          <p style={{ fontStyle: 'italic' }}>Drag dimensions and measures to Rows/Columns to see pivot table</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #ccc' }}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} style={{ backgroundColor: '#f0f0f0' }}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{
                          border: '1px solid #ccc',
                          padding: '8px',
                          textAlign: 'left',
                          fontWeight: 'bold',
                        }}
                        data-tooltip-id="my-tooltip"
                        data-tooltip-content={header.column.columnDef.tooltip}
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
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} style={{ backgroundColor: row.index % 2 === 0 ? 'white' : '#f9f9f9' }}>
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        style={{
                          border: '1px solid #ccc',
                          padding: '8px',
                        }}
                        data-tooltip-id="my-tooltip"
                        data-tooltip-content={`Value: ${cell.getValue()}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <Tooltip id="my-tooltip" />
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ marginTop: 30, fontSize: 14, color: '#555', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 8 }}>
        <h4>Configuration:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <strong>Rows:</strong> {rows.length > 0 ? rows.map((item, idx) => (
              <span key={idx} style={{ marginRight: 8, display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>
                  {typeof item === 'object' ? `${item.field}(${item.aggFunc})` : item}
                </span>
                <MdArrowForward style={{ marginLeft: 4, color: '#888', fontSize: 16 }} />
              </span>
            )) : 'None'}
          </div>
          <div>
            <strong>Columns:</strong> {columns.length > 0 ? columns.map((item, idx) => (
              <span key={idx} style={{ marginRight: 8, display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>
                  {typeof item === 'object' ? `${item.field}(${item.aggFunc})` : item}
                </span>
                <MdArrowDownward style={{ marginLeft: 4, color: '#888', fontSize: 16 }} />
              </span>
            )) : 'None'}
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <strong>Data Points:</strong> {pivotData.length}
          {sortConfig.field && (
            <span style={{ marginLeft: 10 }}>
              | <strong>Sorted by:</strong> {sortConfig.field} ({sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}