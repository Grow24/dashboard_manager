import React, { useEffect, useMemo, useRef, useState } from 'react';
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

// API helper
const API_BASE = 'https://intelligentsalesman.com/ism1/API/dashboard_manager/api.php'; // Update this URL accordingly

async function callApi(action: string, method = 'GET', body?: any) {
  const url = new URL(API_BASE);
  url.searchParams.set('action', action);
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url.toString(), opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
}

const api = {
  getFields: () => callApi('get_fields'),
  createField: (body: any) => callApi('create_field', 'POST', body),
  updateField: (body: any) => callApi('update_field', 'POST', body),
  deleteField: (body: any) => callApi('delete_field', 'POST', body),

  getHierarchies: () => callApi('get_hierarchies'),
  createHierarchy: (body: any) => callApi('create_hierarchy', 'POST', body),
  addHierarchyChild: (body: any) => callApi('add_hierarchy_child', 'POST', body),
  removeHierarchyChild: (body: any) => callApi('remove_hierarchy_child', 'POST', body),
  deleteHierarchy: (body: any) => callApi('delete_hierarchy', 'POST', body),

  getRawData: () => callApi('get_raw_data'),
  getConfigs: () => callApi('get_configs'),
  saveConfig: (body: any) => callApi('save_config', 'POST', body),
};

// Aggregation functions
const aggFuncs: Record<string, (items: any[], field: string) => number> = {
  sum: (items, field) => _.sumBy(items, field),
  avg: (items, field) => _.meanBy(items, field),
  count: (items) => items.length,
  min: (items, field) => _.minBy(items, field)?.[field],
  max: (items, field) => _.maxBy(items, field)?.[field],
};

// createPivotData function (same logic as original, adapted for TS)
function createPivotData(data: any[], { rows, columns }: { rows: any[]; columns: any[] }, sortConfig: any) {
  if (rows.length === 0 && columns.length === 0) return [];

  const rowDimensions = rows.filter((item) => typeof item === 'string');
  const rowMeasures = rows.filter((item) => typeof item === 'object');
  const columnDimensions = columns.filter((item) => typeof item === 'string');
  const columnMeasures = columns.filter((item) => typeof item === 'object');

  const allMeasures = [...rowMeasures, ...columnMeasures];
  const effectiveMeasures = allMeasures.length > 0 ? allMeasures : [];

  let sortedData = [...data];
  if (sortConfig && sortConfig.field && sortConfig.direction) {
    sortedData = _.orderBy(sortedData, [sortConfig.field], [sortConfig.direction]);
  }

  const rowGroups = rowDimensions.length > 0 ? _.groupBy(sortedData, (item) => rowDimensions.map((field) => item[field]).join('|')) : { All: sortedData };

  const columnCombinations: any[] = [];
  if (columnDimensions.length > 0) {
    function generateCombinations(fields: string[], currentCombo: any[] = []) {
      if (currentCombo.length === fields.length) {
        columnCombinations.push([...currentCombo]);
        return;
      }
      const currentField = fields[currentCombo.length];
      const uniqueValues = [...new Set(data.map((item) => item[currentField]))];
      uniqueValues.forEach((value) => {
        generateCombinations(fields, [...currentCombo, value]);
      });
    }
    generateCombinations(columnDimensions);
  } else {
    columnCombinations.push(['All']);
  }

  const result: any[] = [];
  const uniqueRowKeys = rowDimensions.length > 0 ? [...new Set(sortedData.map((item) => rowDimensions.map((field) => item[field]).join('|')))] : ['All'];

  uniqueRowKeys.forEach((rowKey) => {
    if (!rowGroups[rowKey]) return;
    const rowData = rowGroups[rowKey];
    const rowValues = rowKey === 'All' ? [] : rowKey.split('|');
    const rowObj: any = { id: rowKey, isGroup: rowDimensions.length > 0 };

    rowDimensions.forEach((field, index) => {
      rowObj[field] = rowValues[index] || '';
    });

    if (rowMeasures.length > 0) {
      rowMeasures.forEach((measure) => {
        rowObj[`measure_${measure.field}`] = measure.field;
      });
    }

    columnCombinations.forEach((combo) => {
      const colKey = combo.join('_');
      const colData = columnDimensions.length > 0 ? data.filter((item) => columnDimensions.every((field, idx) => item[field] === combo[idx])) : data;
      const intersection = rowData.filter((item) => colData.includes(item));
      effectiveMeasures.forEach((measure) => {
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

// generateTableColumns function (adapted for TS and dynamic rawData)
function generateTableColumns(rows: any[], columns: any[], data: any[], rawData: any[]) {
  const columnHelper = createColumnHelper();
  const tableColumns: any[] = [];

  const rowDimensions = rows.filter((item) => typeof item === 'string');
  const rowMeasures = rows.filter((item) => typeof item === 'object');
  const columnDimensions = columns.filter((item) => typeof item === 'string');
  const columnMeasures = columns.filter((item) => typeof item === 'object');

  const renderHeader = (field: string, area: string, isMeasure = false, aggFunc = '') => {
    const arrowIcon = area === 'rows' ? <MdArrowForward style={{ marginLeft: 4, color: '#888', fontSize: 14 }} /> : <MdArrowDownward style={{ marginLeft: 4, color: '#888', fontSize: 14 }} />;
    const icon = isMeasure ? '📈' : '📊';
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span>{icon} {field}{aggFunc ? ` (${aggFunc})` : ''}</span>
        {arrowIcon}
      </div>
    );
  };

  rowDimensions.forEach((field) => {
    tableColumns.push(
      columnHelper.accessor(field, {
        id: `row_${field}`,
        header: () => renderHeader(field, 'rows', false),
        cell: (info: any) => info.getValue(),
        tooltip: `Dimension: ${field}`,
      })
    );
  });

  rowMeasures.forEach((measure) => {
    tableColumns.push(
      columnHelper.accessor(`measure_${measure.field}`, {
        id: `row_measure_${measure.field}`,
        header: () => renderHeader('Measure', 'rows', true),
        cell: (info: any) => info.getValue(),
        tooltip: `Measure: ${measure.field}`,
      })
    );
  });

  const allMeasures = [...rowMeasures, ...columnMeasures];
  const effectiveMeasures = allMeasures.length > 0 ? allMeasures : [];

  if (columnDimensions.length === 0) {
    effectiveMeasures.forEach((measure) => {
      tableColumns.push(
        columnHelper.accessor(measure.field, {
          id: `measure_${measure.field}`,
          header: () => renderHeader(measure.field, 'columns', true, measure.aggFunc),
          cell: (info: any) => typeof info.getValue() === 'number' ? info.getValue().toLocaleString() : '',
          tooltip: `Measure: ${measure.field} (${measure.aggFunc})`,
        })
      );
    });
  } else {
    const columnCombinations: any[] = [];
    function generateCombinations(fields: string[], currentCombo: any[] = []) {
      if (currentCombo.length === fields.length) {
        columnCombinations.push([...currentCombo]);
        return;
      }
      const currentField = fields[currentCombo.length];
      const uniqueValues = [...new Set(rawData.map((item) => item[currentField]))];
      uniqueValues.forEach((value) => {
        generateCombinations(fields, [...currentCombo, value]);
      });
    }
    generateCombinations(columnDimensions);

    function buildColumnHierarchy(level = 0): any[] {
      if (level >= columnDimensions.length) {
        return effectiveMeasures.map((measure) => ({ type: 'measure', measure }));
      }
      const currentField = columnDimensions[level];
      const uniqueValues = [...new Set(rawData.map((item) => item[currentField]))];
      return uniqueValues.map((value) => ({ type: 'group', field: currentField, value, children: buildColumnHierarchy(level + 1) }));
    }

    function createNestedColumns(hierarchy: any[], pathSoFar: any[] = [], idPrefix = ''): any[] {
      return hierarchy.map((node, index) => {
        if (node.type === 'measure') {
          const measureKey = pathSoFar.join('_') + (pathSoFar.length > 0 ? '_' : '') + node.measure.field;
          const columnId = `${idPrefix}_measure_${index}_${node.measure.field}`;
          return columnHelper.accessor(measureKey, {
            id: columnId,
            header: () => renderHeader(node.measure.field, 'columns', true, node.measure.aggFunc),
            cell: (info: any) => typeof info.getValue() === 'number' ? info.getValue().toLocaleString() : '',
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

export default function PivotTableDragDropDynamic() {
  const [fields, setFields] = useState<any[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [hierarchies, setHierarchies] = useState<any[]>([]);

  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  const dragItem = useRef<any>(null);
  const dragOverItem = useRef<any>(null);

  const [editingField, setEditingField] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<any>({ visible: false, x: 0, y: 0, area: null, index: null, type: null, hierarchyId: null });
  const [sortConfig, setSortConfig] = useState<any>({ area: null, field: null, direction: null });
  const [showSortingSubmenu, setShowSortingSubmenu] = useState(false);
  const [showEditSubmenu, setShowEditSubmenu] = useState(false);

  useEffect(() => {
    async function loadAll() {
      try {
        const [f, h, rd] = await Promise.all([api.getFields(), api.getHierarchies(), api.getRawData()]);
        setFields(f);
        setHierarchies(h);
        setRawData(rd);
      } catch (err) {
        console.error('Load error', err);
      }
    }
    loadAll();
  }, []);

  const dimensions = fields.filter((f) => f.type === 'dimension').map((f) => f.name);
  const measureFields = fields.filter((f) => f.type === 'measure').map((f) => f.name);
  const fieldByName = (name: string) => fields.find((f) => f.name === name);

  const onDragStart = (e: React.DragEvent, item: string, type = 'dimension', hierarchyId: string | null = null) => {
    e.dataTransfer.setData('item', item);
    e.dataTransfer.setData('type', type);
    if (hierarchyId) e.dataTransfer.setData('hierarchyId', hierarchyId);
  };

  const onDrop = (e: React.DragEvent, area: string) => {
    e.preventDefault();
    const item = e.dataTransfer.getData('item');
    const type = e.dataTransfer.getData('type');
    const hierarchyId = e.dataTransfer.getData('hierarchyId');
    if (!item) return;
    const getList = area === 'rows' ? rows : columns;
    const setList = area === 'rows' ? setRows : setColumns;

    if (type === 'measure') {
      const already = rows.some((i) => typeof i === 'object' && i.field === item) || columns.some((i) => typeof i === 'object' && i.field === item);
      if (already) return;
      setList([...getList, { field: item, aggFunc: fieldByName(item)?.agg_default || 'sum' }]);
      return;
    }

    if (type === 'dimension') {
      if (getList.some((i) => i === item)) return;
      const firstMeasureIdx = getList.findIndex((i) => typeof i === 'object');
      if (firstMeasureIdx === -1) setList([...getList, item]);
      else {
        setList([...getList.slice(0, firstMeasureIdx), item, ...getList.slice(firstMeasureIdx)]);
      }
      return;
    }

    if (type === 'hierarchy') {
      const hierarchy = hierarchies.find((h) => h.id === Number(hierarchyId) || h.id === hierarchyId);
      if (!hierarchy) return;
      const childrenToAdd = hierarchy.children.filter((child: string) => !rows.includes(child) && !columns.includes(child));
      const newList = [...getList];
      childrenToAdd.forEach((child: string) => {
        const firstMeasureIdx = newList.findIndex((i) => typeof i === 'object');
        if (firstMeasureIdx === -1) newList.push(child);
        else newList.splice(firstMeasureIdx, 0, child);
      });
      setList(newList);
    }
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleContextMenuLeft = (e: React.MouseEvent, item: string, type: string, hierarchyId: string | null = null) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, area: 'left', index: null, type, item, hierarchyId });
    setShowSortingSubmenu(false);
    setShowEditSubmenu(false);
  };

  const handleCreateHierarchy = async () => {
    if (contextMenu.type !== 'dimension') return;
    const dimName = contextMenu.item;
    try {
      const resp = await api.createHierarchy({ name: `${dimName} Hierarchy` });
      const newHierId = resp.id;
      await api.addHierarchyChild({ hierarchy_id: newHierId, field_name: dimName, sort_index: 0 });
      const h = await api.getHierarchies();
      setHierarchies(h);
    } catch (err) {
      console.error(err);
      alert('Failed creating hierarchy: ' + err);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  const onDropOnHierarchy = async (e: React.DragEvent, hierarchyId: string | number) => {
    e.preventDefault();
    const item = e.dataTransfer.getData('item');
    const type = e.dataTransfer.getData('type');
    if (type !== 'dimension') return;
    if (!item) return;
    try {
      const hierarchy = hierarchies.find((h) => h.id === Number(hierarchyId) || h.id === hierarchyId);
      const sortIndex = hierarchy?.children?.length || 0;
      await api.addHierarchyChild({ hierarchy_id: hierarchyId, field_name: item, sort_index: sortIndex });
      setRows(rows.filter((i) => i !== item));
      setColumns(columns.filter((i) => i !== item));
      const h = await api.getHierarchies();
      setHierarchies(h);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditGlobal = async () => {
    const { area, index } = contextMenu;
    const list = area === 'rows' ? rows : columns;
    const item = list[index];
    const currentFieldName = typeof item === 'object' ? item.field : item;
    const newName = prompt(`Enter new name for "${currentFieldName}" (will update everywhere):`, currentFieldName);
    if (newName && newName !== currentFieldName && !fields.some((f) => f.name === newName)) {
      const fld = fields.find((f) => f.name === currentFieldName);
      try {
        await api.updateField({ id: fld.id, name: newName, agg_default: fld.agg_default, meta: fld.meta });
        const f = await api.getFields();
        setFields(f);
        const h = await api.getHierarchies();
        setHierarchies(h);
        setRows(rows.map((rowItem) => (typeof rowItem === 'object' ? (rowItem.field === currentFieldName ? { ...rowItem, field: newName } : rowItem) : rowItem === currentFieldName ? newName : rowItem)));
        setColumns(columns.map((colItem) => (typeof colItem === 'object' ? (colItem.field === currentFieldName ? { ...colItem, field: newName } : colItem) : colItem === currentFieldName ? newName : colItem)));
      } catch (err) {
        console.error(err);
        alert('Failed to rename field globally');
      }
    }
    setContextMenu({ ...contextMenu, visible: false });
    setShowEditSubmenu(false);
  };

  const handleCreateCopy = async () => {
    const { area, index } = contextMenu;
    const list = area === 'rows' ? rows : columns;
    const item = list[index];
    const currentFieldName = typeof item === 'object' ? item.field : item;
    const newName = prompt(`Enter name for copy of "${currentFieldName}":`, `${currentFieldName}_Copy`);
    if (newName && !fields.some((f) => f.name === newName)) {
      const fld = fields.find((f) => f.name === currentFieldName);
      try {
        await api.createField({ name: newName, type: fld.type, agg_default: fld.agg_default, meta: fld.meta });
        const f = await api.getFields();
        setFields(f);
      } catch (err) {
        console.error(err);
      }
    }
    setContextMenu({ ...contextMenu, visible: false });
    setShowEditSubmenu(false);
  };

  const handleEditLocal = () => {
    setEditingField({ area: contextMenu.area, index: contextMenu.index });
    setContextMenu({ ...contextMenu, visible: false });
    setShowEditSubmenu(false);
  };

  const handleRemove = () => {
    const { area, index } = contextMenu;
    if (area === 'rows') setRows(rows.filter((_, i) => i !== index));
    else setColumns(columns.filter((_, i) => i !== index));
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleSort = (direction: string) => {
    const { area, index } = contextMenu;
    const list = area === 'rows' ? rows : columns;
    const item = list[index];
    if (typeof item === 'string') {
      setSortConfig({ area, field: item, direction });
    }
    setContextMenu({ ...contextMenu, visible: false });
    setShowSortingSubmenu(false);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>, area: string, index: number) => {
    const value = e.target.value;
    if (area === 'rows') {
      setRows(rows.map((item, i) => (i === index ? (typeof item === 'object' ? { ...item, field: value } : value) : item)));
    } else {
      setColumns(columns.map((item, i) => (i === index ? (typeof item === 'object' ? { ...item, field: value } : value) : item)));
    }
  };

  const handleEditBlur = () => setEditingField(null);
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditBlur();
    if (e.key === 'Escape') setEditingField(null);
  };

  const updateMeasureAggFunc = (area: string, field: string, aggFunc: string) => {
    if (area === 'rows') setRows(rows.map((item) => (typeof item === 'object' && item.field === field ? { ...item, aggFunc } : item)));
    else setColumns(columns.map((item) => (typeof item === 'object' && item.field === field ? { ...item, aggFunc } : item)));
  };

  const onDragStartReorder = (e: React.DragEvent, area: string, index: number) => {
    dragItem.current = { area, index };
  };

  const onDragEnterReorder = (e: React.DragEvent, area: string, index: number) => {
    dragOverItem.current = { area, index };
  };

  const onDropReorder = (e: React.DragEvent, area: string) => {
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
    } else {
      const list = [...columns];
      const draggedItem = list[drag.index];
      list.splice(drag.index, 1);
      list.splice(over.index, 0, draggedItem);
      setColumns(list);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const getLeftItemStyle = (type: string) => {
    const dimensionColor = '#e3f2fd';
    const measureColor = '#f3e5f5';
    if (type === 'dimension') return { backgroundColor: dimensionColor, border: '1px solid #2196f3', padding: '6px 10px', margin: '4px 0', borderRadius: 4, cursor: 'grab', userSelect: 'none' };
    if (type === 'hierarchy') return { backgroundColor: '#c8e6c9', border: '1px solid #388e3c', padding: '6px 10px', margin: '8px 0 4px 0', borderRadius: 6, fontWeight: 'bold', cursor: 'grab', userSelect: 'none' };
    if (type === 'measure') return { backgroundColor: measureColor, border: '1px solid #9c27b0', padding: '6px 10px', margin: '4px 0', borderRadius: 4, userSelect: 'none' };
    return {};
  };

  const renderLeftPanel = () => (
    <div>
      {hierarchies.map((h) => (
        <div key={h.id}
          draggable
          onDragStart={(e) => onDragStart(e, h.name, 'hierarchy', h.id)}
          onDrop={(e) => onDropOnHierarchy(e, h.id)}
          onDragOver={onDragOver}
          onContextMenu={(e) => handleContextMenuLeft(e, h.name, 'hierarchy', h.id)}
          style={getLeftItemStyle('hierarchy')}
        >
          4C2 {h.name}
          <div style={{ marginLeft: 20, marginTop: 4 }}>
            {h.children.map((child: string) => (
              <div key={child}
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

      {dimensions.filter((dim) => !hierarchies.some((h) => h.children.includes(dim))).map((field) => (
        <div key={field}
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

  const getFieldStyle = (field: any) => {
    const dimensionColor = '#e3f2fd';
    const measureColor = '#f3e5f5';
    if (typeof field === 'string' && dimensions.includes(field)) return { backgroundColor: dimensionColor, border: '1px solid #2196f3' };
    if (typeof field === 'object' && measureFields.includes(field.field)) return { backgroundColor: measureColor, border: '1px solid #9c27b0' };
    return {};
  };

  const renderAreaFields = (area: string, list: any[]) => (
    <div onDrop={(e) => onDropReorder(e, area)} onDragOver={onDragOver} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, minHeight: 30 }}>
      {list.map((item, index) => {
        const isObject = typeof item === 'object';
        const displayName = isObject ? item.field : item;
        const fieldName = isObject ? item.field : item;
        const style = getFieldStyle(item);
        if (editingField && editingField.area === area && editingField.index === index) {
          return (
            <input key={`${fieldName}_${index}_edit`} type="text" value={displayName} autoFocus onChange={(e) => handleEditChange(e, area, index)} onBlur={handleEditBlur} onKeyDown={handleEditKeyDown} style={{ ...style, padding: '4px 8px', borderRadius: 4, minWidth: 60, fontSize: '12px', outline: 'none' }} />
          );
        }
        return (
          <div key={`${fieldName}_${index}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div draggable onDragStart={(e) => onDragStartReorder(e, area, index)} onDragEnter={(e) => onDragEnterReorder(e, area, index)} onClick={() => setEditingField({ area, index })} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, area, index }); }} style={{ padding: '4px 8px', borderRadius: 4, cursor: 'pointer', userSelect: 'none', ...style, display: 'flex', alignItems: 'center' }}>
              {isObject ? '📈 ' : '📊 '} {displayName}
              <span style={{ marginLeft: 4, color: '#888', fontSize: 16, display: 'flex', alignItems: 'center' }}>
                {area === 'rows' ? <MdArrowForward /> : <MdArrowDownward />}
              </span>
            </div>
            {isObject && (
              <select value={item.aggFunc} onChange={(e) => updateMeasureAggFunc(area, fieldName, e.target.value)} style={{ fontSize: '12px', padding: '2px' }} onClick={(e) => e.stopPropagation()}>
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

  const renderContextMenu = () => {
    if (!contextMenu.visible) return null;
    if (contextMenu.area === 'left') {
      if (contextMenu.type === 'dimension') {
        return (
          <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: '#fff', border: '1px solid #ccc', borderRadius: 4, zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', minWidth: 140 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={handleCreateHierarchy}>Create Hierarchy</div>
          </div>
        );
      } else if (contextMenu.type === 'hierarchy') {
        return (
          <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: '#fff', border: '1px solid #ccc', borderRadius: 4, zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', minWidth: 140 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={async () => { await api.deleteHierarchy({ hierarchy_id: contextMenu.hierarchyId }); const h = await api.getHierarchies(); setHierarchies(h); setContextMenu({ ...contextMenu, visible: false }); }}>Remove Hierarchy</div>
          </div>
        );
      }
    }

    return (
      <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: '#fff', border: '1px solid #ccc', borderRadius: 4, zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', minWidth: 120 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={handleRemove}>Remove</div>

        <div style={{ padding: '8px 12px', cursor: 'pointer', position: 'relative', borderBottom: '1px solid #eee' }} onMouseEnter={() => setShowSortingSubmenu(true)} onMouseLeave={() => setShowSortingSubmenu(false)}>Sorting ▶ 
          {showSortingSubmenu && <div style={{ position: 'absolute', left: '100%', top: 0, background: '#fff', border: '1px solid #ccc', borderRadius: 4, minWidth: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 1001 }}>
            <div style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={() => handleSort('asc')}>Ascending</div>
            <div style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => handleSort('desc')}>Descending</div>
          </div>}
        </div>

        <div style={{ padding: '8px 12px', cursor: 'pointer', position: 'relative' }} onMouseEnter={() => setShowEditSubmenu(true)} onMouseLeave={() => setShowEditSubmenu(false)}>Edit ▶
          {showEditSubmenu && <div style={{ position: 'absolute', left: '100%', top: 0, background: '#fff', border: '1px solid #ccc', borderRadius: 4, minWidth: 150, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 1001 }}>
            <div style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={handleEditGlobal}>Edit Globally</div>
            <div style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={handleCreateCopy}>Create Copy</div>
            <div style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={handleEditLocal}>Edit Locally</div>
          </div>}
        </div>
      </div>
    );
  };

  const pivotData = useMemo(() => createPivotData(rawData, { rows, columns }, sortConfig), [rows, columns, sortConfig, rawData]);
  const tableColumns = useMemo(() => generateTableColumns(rows, columns, pivotData, rawData), [rows, columns, pivotData, rawData]);

  const table = useReactTable({
    data: pivotData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div style={{ maxWidth: 1400, margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>New Pivot Table (Dynamic)</h2>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1, border: '1px solid #ccc', padding: 10 }}>
          <h3>Dimensions & Hierarchies</h3>
          {renderLeftPanel()}
          <h3 style={{ marginTop: 20 }}>Measures</h3>
          {measureFields.map((field) => {
            const isUsed = rows.concat(columns).some((item) => typeof item === 'object' && item.field === field);
            return (
              <div key={field} draggable={!isUsed} onDragStart={isUsed ? undefined : (e) => onDragStart(e, field, 'measure')} style={{ padding: '6px 10px', margin: '4px 0', backgroundColor: '#f3e5f5', border: '1px solid #9c27b0', cursor: isUsed ? 'not-allowed' : 'grab', userSelect: 'none', borderRadius: 4, opacity: isUsed ? 0.5 : 1 }} title={isUsed ? 'Already added' : ''}>
                📈 {field}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div onDrop={(e) => onDrop(e, 'columns')} onDragOver={onDragOver} style={{ minHeight: 60, border: '2px dashed #888', padding: 10, backgroundColor: '#fafafa' }}>
            <strong>Columns (Dimensions & Measures):</strong>
            {renderAreaFields('columns', columns)}
          </div>

          <div onDrop={(e) => onDrop(e, 'rows')} onDragOver={onDragOver} style={{ minHeight: 60, border: '2px dashed #888', padding: 10, backgroundColor: '#fafafa' }}>
            <strong>Rows (Dimensions & Measures):</strong>
            {renderAreaFields('rows', rows)}
          </div>
        </div>
      </div>

      {renderContextMenu()}

      <div style={{ marginTop: 40 }}>
        <h2>Pivot Table Result</h2>
        {pivotData.length === 0 ? (
          <p style={{ fontStyle: 'italic' }}>Drag dimensions and measures to Rows/Columns to see pivot table</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #ccc' }}>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} style={{ backgroundColor: '#f0f0f0' }}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} colSpan={header.colSpan} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', fontWeight: 'bold' }} data-tooltip-id="my-tooltip" data-tooltip-content={header.column.columnDef.tooltip}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} style={{ backgroundColor: row.index % 2 === 0 ? 'white' : '#f9f9f9' }}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} style={{ border: '1px solid #ccc', padding: '8px' }} data-tooltip-id="my-tooltip" data-tooltip-content={`Value: ${cell.getValue()}`}>
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
    </div>
  );
}