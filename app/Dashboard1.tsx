
import React, { useState, useEffect, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Combobox } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import "./css/tableu.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  CartesianGrid,
} from "recharts";

const ItemTypes = {
  FIELD: "field",
};

const icons = {
  Dimension: "📐",
  Measure: "📊",
  Metric: "📈",
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];
const slidingWindowAverage = (values, windowSize = 3) => {
  const result = Array(values.length).fill(null);
  for (let i = 0; i <= values.length - windowSize; i++) {
    const windowSlice = values.slice(i, i + windowSize);
    const sum = windowSlice.reduce((acc, val) => acc + (val || 0), 0);
    const avg = sum / windowSize;
    const middleIndex = i + Math.floor(windowSize / 2);
    result[middleIndex] = avg;
  }
  return result;
};
// Define measures and their units of measure
const measuresConfig = {
  weight: {
    units: ["kg", "gram", "pound", "ton"],
    defaultUnit: "kg"
  },
  volume: {
    units: ["liter", "cm.cube", "ml"],
    defaultUnit: "liter"
  },
  count: {
    units: ["cases", "pieces"],
    defaultUnit: "pieces"
  },
  value: {
    units: ["currency", "tokens", "points"],
    defaultUnit: "currency"
  }
};

// Currency sub-units
const currencyUnits = {
  currency: "IndianRupees"
};

// Helper: Frame boundary options
const frameBoundaryOptions = [
  { label: "UNBOUNDED PRECEDING", value: "UNBOUNDED PRECEDING", needsValue: false },
  { label: "N PRECEDING", value: "N PRECEDING", needsValue: true },
  { label: "CURRENT ROW", value: "CURRENT ROW", needsValue: false },
  { label: "N FOLLOWING", value: "N FOLLOWING", needsValue: true },
  { label: "UNBOUNDED FOLLOWING", value: "UNBOUNDED FOLLOWING", needsValue: false },
];

// Window function categories and functions
const windowFunctionCategories = {
  Aggregate: [
    "SUM",
    "AVG",
    "COUNT",
    "MAX",
    "MIN",
    "STDDEV_POP",
    "STDDEV_SAMP",
    "VAR_POP",
    "VAR_SAMP",
    "BIT_AND",
    "BIT_OR",
    "BIT_XOR",
    "JSON_ARRAYAGG",
    "JSON_OBJECTAGG",
  ],
  NonAggregate: [
    "ROW_NUMBER",
    "RANK",
    "DENSE_RANK",
    "NTILE",
    "PERCENT_RANK",
    "CUME_DIST",
    "LAG",
    "LEAD",
    "FIRST_VALUE",
    "LAST_VALUE",
    "NTH_VALUE",
  ],
};

// Popup to show generated window function query with full SQL clause
const WindowFunctionPopup = ({ visible, onClose, windowFunction, tableName = "sales_data", filters = [] }) => {
  if (!visible || !windowFunction) return null;

  const {
    category,
    functionType,
    partitionBy,
    orderBy,
    frameType,
    frameStart,
    frameStartValue,
    frameEnd,
    frameEndValue,
    namedWindow,
    lodScope,
    directionOfCalculation,
    targetMeasure
  } = windowFunction;

  // Helper to wrap identifiers in backticks
  const quote = (str) => `\`${str}\``;

  // Compose PARTITION BY clause using backticks
  const partitionClause = partitionBy && partitionBy.length > 0 
    ? `PARTITION BY ${partitionBy.map(f => quote(f)).join(", ")}` 
    : "";

  // Compose ORDER BY clause using backticks
  const orderClause = orderBy && orderBy.length > 0
    ? `ORDER BY ${orderBy.map(({ field, direction }) => `${quote(field)} ${direction}`).join(", ")}`
    : "";

  // Compose frame clause
  let frameClause = "";
  if (frameType && frameStart && frameEnd) {
    let startStr = frameStart;
    if (frameBoundaryOptions.find(o => o.value === frameStart)?.needsValue && frameStartValue) {
      startStr = `${frameStartValue} ${frameStart.split(' ')[1]}`;
    }
    
    let endStr = frameEnd;
    if (frameBoundaryOptions.find(o => o.value === frameEnd)?.needsValue && frameEndValue) {
      endStr = `${frameEndValue} ${frameEnd.split(' ')[1]}`;
    }
    
    frameClause = `${frameType} BETWEEN ${startStr} AND ${endStr}`;
  }

  // Compose OVER clause
  const overClauses = [partitionClause, orderClause, frameClause].filter(Boolean).join(" ");

  // Compose WINDOW clause if named window is defined
  let windowClause = "";
  if (namedWindow && overClauses) {
    windowClause = `WINDOW ${quote(namedWindow)} AS (${overClauses})`;
  }

  // Determine function parameter
  let functionParam = "*";
  if (targetMeasure) {
    functionParam = quote(targetMeasure);
  } else if (orderBy.length > 0) {
    functionParam = quote(orderBy[0].field);
  } else if (partitionBy.length > 0) {
    functionParam = quote(partitionBy[0]);
  }

  // Handle functions that don't take parameters
  const noParamFunctions = ["ROW_NUMBER", "CURRENT_ROW"];
  if (noParamFunctions.includes(functionType)) {
    functionParam = "";
  } else {
    functionParam = `(${functionParam})`;
  }

  // Compose full SQL using backticks for identifiers
  let sql = `
SELECT
  *,
  ${functionType}${functionParam} OVER (${
    namedWindow && windowClause ? quote(namedWindow) : overClauses
  }) AS window_value
FROM ${tableName}
${windowClause ? `\n${windowClause}` : ""}
  `.trim();

  // Handle nested queries for different scenarios
  if (lodScope && lodScope.length > 0) {
    // Example 4: Using Nested Queries to Limit Data Scope for Window Functions
    const lodConditions = lodScope.map(fieldName => {
    const filter = (filters || []).find(f => f.field === fieldName);
    const val = filter && filter.value ? `'${escapeSqlLiteral(filter.value)}'` : "<value>";
    return `${quote(fieldName)} = ${val}`;
  }).join(" AND ");
    // const lodConditions = lodScope.map(field => `${quote(field)} = ?`).join(" AND ");
    sql = `
SELECT employee_id, department, salary,
       ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num
FROM (
  SELECT * FROM ${tableName} WHERE ${lodConditions}
) AS filtered_data
    `.trim();
  } else if (directionOfCalculation && directionOfCalculation.includes("Pane")) {
    // Example 2: Using Window Functions in Nested Queries for Further Aggregation
    sql = `
SELECT employee_id, department, salary, salary_rank
FROM (
  SELECT employee_id, department, salary,
         RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank
  FROM ${tableName}
) AS ranked_employees
WHERE salary_rank = 1
    `.trim();
  } else if (partitionBy.length > 0 && orderBy.length > 0) {
    // Example 3: Combining Multiple Window Functions via Nested Queries
    sql = `
SELECT region, createdAt, salesAmount,
       running_total,
       moving_avg
FROM (
  SELECT region, createdAt, salesAmount,
         SUM(salesAmount) OVER (PARTITION BY region ORDER BY createdAt ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
         AVG(salesAmount) OVER (PARTITION BY region ORDER BY createdAt ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg
  FROM ${tableName}
) AS sales_with_windows
    `.trim();
  }

  return (
    <div className="popup-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '480px', maxWidth: '90%'
      }}>
        <h3>Window Function SQL Preview</h3>
        <pre style={{whiteSpace: 'pre-wrap', wordWrap: 'break-word', backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px', maxHeight: '300px', overflowY: 'auto'}}>
          {sql}
        </pre>
        <button onClick={onClose} style={{marginTop: '10px'}}>Close</button>
      </div>
    </div>
  );
};

const ShowMePanel = ({ onSelectChart, selectedChart }) => {
  const charts = [
    { id: "bar", label: "Bar Chart" },
    { id: "line", label: "Line Chart" },
    { id: "pie", label: "Pie Chart" },
    { id: "map", label: "Map" },
    { id: "scatter", label: "Scatter Plot" },
    { id: "table", label: "Table" },
    { id: "subgraph", label: "Subgraphs" },
  ];

  return (
    <div className="showme-panel">
      <div className="showme-title">Show Me</div>
      <div className="chart-options">
        {charts.map((chart) => (
          <button
            key={chart.id}
            className={`chart-option ${selectedChart === chart.id ? "selected" : ""}`}
            onClick={() => onSelectChart(chart.id)}
          >
            {chart.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const ContextMenu = ({ position, options, onClose }) => {
  if (!position) return null;

  return (
    <ul
      className="context-menu"
      style={{ top: position.y, left: position.x }}
      onMouseLeave={onClose}
    >
      {options.map((opt, idx) => (
        <li
          key={idx}
          onClick={() => {
            opt.action();
            onClose();
          }}
        >
          {opt.label}
        </li>
      ))}
    </ul>
  );
};

const Field = ({ field }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.FIELD,
    item: { field },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`field ${isDragging ? "dragging" : ""}`}
      title={`${field.name} (${field.type})`}
    >
      <span className="icon">{icons[field.type]}</span> {field.name}
      {field.measureType && (
        <span className="measure-info"> ({field.measureType})</span>
      )}
    </div>
  );
};

const Slot = ({
  title,
  items,
  onDropField,
  className,
  onFieldClick,
  onRemoveField,
  onContextMenuField,
}) => {
  const [, drop] = useDrop({
    accept: ItemTypes.FIELD,
    drop: (item) => {
      if (!items.find(f => f.name === item.field.name)) {
        onDropField(item.field, items.length);
      }
    },
  });

  return (
    <div
      ref={drop}
      className={`slot ${className}`}
      title={`Drop fields here for ${title}`}
    >
      <div className="slot-title">{title}</div>
      {items.length === 0 ? (
        <div className="slot-placeholder">Drop field here</div>
      ) : (
        items.map((field, idx) => (
  <SortableItem
    key={`${field.name}-${idx}`}  // <-- changed here
    index={idx}
    field={field}
    moveItem={(dragIndex, hoverIndex) => {
      if (dragIndex === hoverIndex) return;
      const newItems = [...items];
      const [removed] = newItems.splice(dragIndex, 1);
      newItems.splice(hoverIndex, 0, removed);
      onDropField(null, newItems);
    }}
    onRemoveField={onRemoveField}
    onFieldClick={onFieldClick}
    onContextMenuField={onContextMenuField}
  />
))
      )}
    </div>
  );
};

const SortableItem = ({
  field,
  index,
  moveItem,
  onRemoveField,
  onFieldClick,
  onContextMenuField,
}) => {
  const ref = useRef(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.FIELD,
    item: { field, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemTypes.FIELD,
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveItem(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`slot-item ${isDragging ? "dragging" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: onFieldClick ? "pointer" : "default",
        userSelect: "none",
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={() => onFieldClick && onFieldClick(field)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenuField && onContextMenuField(e, field);
      }}
    >
      <span>
        {icons[field.type]} {field.name}
        {field.measureType && (
          <span className="measure-info"> ({field.measureType})</span>
        )}
        {field.unit && (
          <span className="unit-info"> [{field.unit}]</span>
        )}
        {field.axisRole && (
          <span className="axis-role"> ({field.axisRole})</span>
        )}
      </span>
      {onRemoveField && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveField(field);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "red",
            fontWeight: "bold",
            cursor: "pointer",
            marginLeft: "8px",
          }}
          title={`Remove ${field.name}`}
        >
          ×
        </button>
      )}
    </div>
  );
};

// MultiSelectCombobox component for multi-select dropdowns
const MultiSelectCombobox = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  loading = false,
}) => {
  const [query, setQuery] = useState("");
  const filteredOptions =
    query === ""
      ? options
      : options.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <Combobox value={value} onChange={onChange} multiple>
      <div className="relative">
        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-400">
          <Combobox.Input
            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
            displayValue={(selected) =>
              selected
                .map(
                  (val) =>
                    options.find((option) => option.value === val)?.label || val
                )
                .join(", ")
            }
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </Combobox.Button>
        </div>
        <Combobox.Options className="combobox-options absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {loading ? (
            <div className="px-4 py-2 text-gray-500">Loading...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-4 py-2 text-gray-500">No options found.</div>
          ) : (
            filteredOptions.map((option) => (
              <Combobox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  `combobox-option relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-blue-600 text-white" : "text-gray-900"
                  }`
                }
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-semibold" : "font-normal"
                      }`}
                    >
                      {option.label}
                    </span>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? "text-white" : "text-blue-600"
                        }`}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};

// Function to mark primary and secondary variables
const markPrimarySecondary = (fields) => {
  return fields.map((field, idx) => ({
    ...field,
    axisRole: idx === 0 ? "Primary" : "Secondary",
  }));
};

// Function to group data by axes to create panes
const groupByAxes = (data, xFields, yFields) => {
  const groupKey = (row, fields) => fields.map(f => row[f.name]).join("||");

  const panes = {};

  data.forEach(row => {
    const xKey = groupKey(row, xFields);
    const yKey = groupKey(row, yFields);
    const paneKey = `${xKey}||${yKey}`;

    if (!panes[paneKey]) panes[paneKey] = [];
    panes[paneKey].push(row);
  });

  return panes;
};

// Metric calculation functions
const calculateMetricA = (data) => {
  return data.reduce((sum, row) => sum + (Number(row.Sales) || 0), 0);
};

const calculateMetricB = (data) => {
  // Group by Invoice
  const invoiceGroups = data.reduce((acc, row) => {
    if (!acc[row.Invoice]) acc[row.Invoice] = 0;
    acc[row.Invoice] += Number(row.Sales) || 0;
    return acc;
  }, {});

  const invoiceTotals = Object.values(invoiceGroups);
  if (invoiceTotals.length === 0) return 0;

  const avg = invoiceTotals.reduce((sum, val) => sum + val, 0) / invoiceTotals.length;
  return avg;
};

const TableRenderer = ({ data, columns, rows }) => {
  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No data to display</div>;
  }
  if (!columns || columns.length === 0 || !rows || rows.length === 0) {
    return <div className="chart-placeholder">Please drag fields to Columns and Rows to display data</div>;
  }

  const columnFields = columns.map(c => c.name);
  const rowFields = rows.map(r => r.name);

  // Get unique column keys (combinations of column field values)
  const columnKeys = Array.from(
    new Set(
      data.map(row => columnFields.map(f => row[f]).join("||"))
    )
  );

  // Parse keys back to arrays for display
  const parseKey = (key) => key.split("||");

  // Aggregate data into a map: { rowKey: { colKey: aggregatedValue } }
  const dataMap = {};
  data.forEach(row => {
    const rKey = rowFields.map(f => row[f]).join("||");
    const cKey = columnFields.map(f => row[f]).join("||");
    if (!dataMap[rKey]) dataMap[rKey] = {};
    // Aggregate Sales as before
    dataMap[rKey][cKey] = (dataMap[rKey][cKey] || 0) + Number(row.Sales || 0);

    // Store all window function columns dynamically
    Object.keys(row).forEach(key => {
      if (key !== "window_value" && (key === "running_total" || key === "moving_avg" || key.startsWith("window_"))) {
        dataMap[rKey][key] = row[key];
      }
    });

    // Also keep window_value if present
    if (row.window_value !== undefined) {
      dataMap[rKey].window_value = row.window_value;
    }
  });

  // Detect all window function columns present in data
  const windowColumns = [];
  data.forEach(row => {
    Object.keys(row).forEach(key => {
      if (key !== "window_value" && (key === "running_total" || key === "moving_avg" || key.startsWith("window_"))) {
        if (!windowColumns.includes(key)) {
          windowColumns.push(key);
        }
      }
    });
  });

  // Check if window_value exists in any row
  const hasWindowValue = data.some(row => row.window_value !== undefined);

  // Group data by first row field (e.g., quarter)
  const groupByFirstRowField = {};
  data.forEach(row => {
    const groupKey = row[rowFields[0]];
    if (!groupByFirstRowField[groupKey]) groupByFirstRowField[groupKey] = [];
    groupByFirstRowField[groupKey].push(row);
  });

  // For each group, get unique combinations of remaining row fields (e.g., month_name)
  const getUniqueRowCombinations = (rows, fields) => {
    const uniqueKeys = new Set();
    const uniqueRows = [];
    rows.forEach(row => {
      const key = fields.map(f => row[f]).join("||");
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        uniqueRows.push(row);
      }
    });
    return uniqueRows;
  };

  return (
    <table className="data-table" style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          {/* Row headers */}
          {rowFields.map(field => (
            <th key={field} style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
              {field}
              {columns.find(c => c.name === field)?.unit && 
                ` (${columns.find(c => c.name === field)?.unit})`}
              {field.axisRole && ` (${field.axisRole})`}
            </th>
          ))}
          {/* Column headers */}
          {columnKeys.map(colKey => (
            <th key={colKey} style={{ borderBottom: "2px solid #ccc", textAlign: "right" }}>
              {parseKey(colKey).join(" | ")}
            </th>
          ))}
          {/* Window function columns headers */}
          {windowColumns.map(col => (
            <th key={col} style={{ borderBottom: "2px solid #ccc", textAlign: "right" }}>
              {col.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </th>
          ))}
          {/* Window Value header */}
          {hasWindowValue && (
            <th style={{ borderBottom: "2px solid #ccc", textAlign: "right" }}>
              Window Value
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {Object.entries(groupByFirstRowField).map(([groupKey, groupRows]) => {
          // Unique rows for remaining row fields (excluding first)
          const remainingRowFields = rowFields.slice(1);
          const uniqueRows = getUniqueRowCombinations(groupRows, remainingRowFields);

          return uniqueRows.map((row, idx) => {
            const rKey = rowFields.map(f => row[f]).join("||");
            const rowData = dataMap[rKey] || {};

            return (
              <tr key={rKey}>
                {/* Render first row field with rowspan only on first row of group */}
                {idx === 0 && (
                  <td rowSpan={uniqueRows.length} style={{ fontWeight: "600", verticalAlign: "top", paddingRight: "8px" }}>
                    {groupKey}
                  </td>
                )}
                {/* Render remaining row fields */}
                {remainingRowFields.map((field) => (
                  <td key={field}>
                    {row[field]}
                    {field.axisRole && ` (${field.axisRole})`}
                  </td>
                ))}
                {/* Render data cells */}
                {columnKeys.map(colKey => (
                  <td key={colKey} style={{ textAlign: "right" }}>
                    {rowData[colKey] !== undefined ? rowData[colKey].toLocaleString() : ""}
                  </td>
                ))}
                {/* Render window function columns */}
                {windowColumns.map(col => (
                  <td key={col} style={{ textAlign: "right" }}>
                    {rowData[col] !== undefined ? Number(rowData[col]).toLocaleString(undefined, { maximumFractionDigits: 2 }) : ""}
                  </td>
                ))}
                {/* Render window_value cell */}
                {hasWindowValue && (
                  <td style={{ textAlign: "right" }}>
                    {rowData.window_value !== undefined ? Number(rowData.window_value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : ""}
                  </td>
                )}
              </tr>
            );
          });
        })}
      </tbody>
    </table>
  );
};

const ChartRenderer = ({ chartType, data, xKey, yKey, columns, rows, windowFunction }) => {
  if (!xKey || !yKey) {
    return <div className="chart-placeholder">Please drag fields to Columns and Rows to display data</div>;
  }
  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No data to display</div>;
  }

  const aggregateData = () => {
    const map = new Map();
    data.forEach((item) => {
      const key = item[xKey];
      const val = Number(item[yKey]) || 0;
      map.set(key, (map.get(key) || 0) + val);
    });
    return Array.from(map.entries()).map(([key, value]) => ({
      [xKey]: key,
      [yKey]: value,
    }));
  };

  // Use updated applyWindowFunction with full support
  const applyWindowFunction = (data, windowFunction) => {
    if (!windowFunction || !windowFunction.functionType) return data;
if (!windowFunction.targetMeasure) return data;
    const {
      functionType,
      partitionBy,
      orderBy,
      frameType,
      frameStart,
      frameStartValue,
      frameEnd,
      frameEndValue,
      lodScope,
      directionOfCalculation,
      targetMeasure,
    } = windowFunction;

    // Helper: group data by keys
    const groupBy = (array, keys) => {
      return array.reduce((acc, item) => {
        const key = keys.map(k => item[k]).join("||") || "__NO_PARTITION__";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});
    };

    // Apply LOD scope grouping if defined
    let dataToProcess = data;
    if (lodScope && lodScope.length > 0) {
      const lodGroups = groupBy(data, lodScope);
      dataToProcess = Object.values(lodGroups).map(group => group[0]);
    }

    // Determine grouping keys based on directionOfCalculation
    let groupingKeys = [];
    switch (directionOfCalculation) {
      case "Window Across":
      case "Pane Across":
        groupingKeys = partitionBy;
        break;
      case "Window Down":
      case "Pane Down":
        groupingKeys = orderBy.map(o => o.field);
        break;
      case "Down Then Across":
        groupingKeys = partitionBy.concat(orderBy.map(o => o.field));
        break;
      case "Across Then Down":
        groupingKeys = orderBy.map(o => o.field).concat(partitionBy);
        break;
      default:
        groupingKeys = partitionBy;
    }

    // Group data by groupingKeys
    const groups = groupBy(dataToProcess, groupingKeys);

    // Helper: parse frame boundary value
    const parseFrameBoundary = (boundary, value) => {
      if (boundary === "UNBOUNDED PRECEDING") return -Infinity;
      if (boundary === "UNBOUNDED FOLLOWING") return Infinity;
      if (boundary === "CURRENT ROW") return 0;
      if (boundary === "N PRECEDING" && value != null) return -value;
      if (boundary === "N FOLLOWING" && value != null) return value;
      return 0;
    };

    const frameStartOffset = parseFrameBoundary(frameStart, frameStartValue);
    const frameEndOffset = parseFrameBoundary(frameEnd, frameEndValue);

    // For each group, sort by orderBy fields
    Object.values(groups).forEach(group => {
      group.sort((a, b) => {
        for (const { field, direction } of orderBy) {
          if (a[field] < b[field]) return direction === "ASC" ? -1 : 1;
          if (a[field] > b[field]) return direction === "ASC" ? 1 : -1;
        }
        return 0;
      });

      // For each row, calculate window frame slice and apply function
      group.forEach((row, idx) => {
row.running_total = group.slice(0, idx + 1).reduce((sum, r) => sum + Number(r[targetMeasure] || 0), 0);

  // moving_avg: average of last 3 rows including current
  const windowSize = 3;
  const start = Math.max(0, idx - windowSize + 1);
  const windowSlice = group.slice(start, idx + 1);
  row.moving_avg = windowSlice.reduce((sum, r) => sum + Number(r[targetMeasure] || 0), 0) / windowSlice.length;

        let startIdx = idx + frameStartOffset;
        let endIdx = idx + frameEndOffset;

        if (startIdx < 0) startIdx = 0;
        if (endIdx >= group.length) endIdx = group.length - 1;

        const frameRows = group.slice(startIdx, endIdx + 1);

        // const orderField = orderBy[0]?.field;
        const orderField = orderBy && orderBy.length > 0 ? orderBy[0].field : null;
        // const values = frameRows.map(r => Number(r[orderField]) || 0);
        const values = frameRows.map(r => Number(r[targetMeasure]) || 0);

        let windowValue = null;
        switch (functionType) {
          case "SUM":
            windowValue = values.reduce((a, b) => a + b, 0);
            break;
          case "AVG":
            windowValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
            break;
          case "COUNT":
            windowValue = values.length;
            break;
          case "MAX":
            windowValue = Math.max(...values);
            break;
          case "MIN":
            windowValue = Math.min(...values);
            break;
          case "SLIDING_AVG":
            const windowSize = 3;
            const halfWindow = Math.floor(windowSize / 2);
            const start = Math.max(0, idx - halfWindow);
            const end = Math.min(group.length - 1, idx + halfWindow);
            const windowSlice = group.slice(start, end + 1);
            const windowValues = windowSlice.map(r => Number(r[orderField]) || 0);
            windowValue = windowValues.reduce((a, b) => a + b, 0) / windowValues.length;
            break;
          case "ROW_NUMBER":
            windowValue = idx + 1;
            break;
          case "RANK":
            let rank = 1;
            for (let i = 0; i < idx; i++) {
              if (group[i][orderField] !== row[orderField]) rank++;
            }
            windowValue = rank;
            break;
          case "DENSE_RANK":
            let denseRank = 1;
            for (let i = 0; i < idx; i++) {
              if (group[i][orderField] !== row[orderField]) {
                if (group[i][orderField] !== group[i - 1]?.[orderField]) denseRank++;
              }
            }
            windowValue = denseRank;
            break;
          default:
            windowValue = row[orderField];
        }

        row.window_value = windowValue;
      });
    });

    return Object.values(groups).flat();
  };

  const dataWithWindow = applyWindowFunction(data, windowFunction);

  switch (chartType) {
    case "bar":
      return (
        <BarChart
          width={700}
          height={350}
          data={dataWithWindow}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <XAxis
            dataKey={xKey}
            type="category"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={80}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={yKey} fill="#8884d8" barSize={40} />
        </BarChart>
      );
    case "line":
      return (
        <LineChart width={600} height={300} data={dataWithWindow}>
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={yKey} stroke="#8884d8" />
        </LineChart>
      );
    case "pie":
      const pieData = aggregateData();
      return (
        <PieChart width={400} height={300}>
          <Pie
            data={pieData}
            dataKey={yKey}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            label
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      );
    case "scatter":
      return (
        <ScatterChart width={600} height={300}>
          <CartesianGrid />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={dataWithWindow} fill="#8884d8" />
        </ScatterChart>
      );
    case "map":
      return <div className="chart-placeholder">Map visualization not implemented</div>;
    case "table":
      return <TableRenderer data={dataWithWindow} columns={columns} rows={rows} />;
    case "subgraph":
      if (!windowFunction || !windowFunction.partitionBy || !windowFunction.orderBy) {
        return <div>Please configure window function partition and order fields</div>;
      }

      const rankedData = dataWithWindow;

      const partitions = [...new Set(rankedData.map((d) => d[windowFunction.partitionBy]))];

      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
          {partitions.map((partition, index) => {
            const partitionData = rankedData.filter((d) => d[windowFunction.partitionBy] === partition);
            return (
              <div key={`${partition || 'partition'}_${index}`} style={{ border: "1px solid #ccc", padding: "10px" }}>
                <h4 style={{ textAlign: "center" }}>{partition}</h4>
                <BarChart
                  width={300}
                  height={200}
                  data={partitionData}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
                  <XAxis dataKey="window_value" label={{ value: "Window Value", position: "insideBottom", offset: -5 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey={yKey} fill="#8884d8" />
                </BarChart>
              </div>
            );
          })}
        </div>
      );
    default:
      return <div className="chart-placeholder">Select a chart type</div>;
  }
};

const FilterPopup = ({ visible, filterField, onSave, onCancel }) => {
  const [filterSettings, setFilterSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [value, setValue] = useState("");

  useEffect(() => {
    const fetchFilterConfig = async () => {
      if (!visible || !filterField) {
        setFilterSettings(null);
        setOptions([]);
        setValue("");
        return;
      }

      setLoading(true);
      setFilterSettings(null);
      setOptions([]);
      setValue("");

      try {
        const filterMasterRes = await fetch("https://intelligentsalesman.com/ism1/API/tableu/filter_master.php");
        const response = await filterMasterRes.json();
        const filters = response.filters || [];
        const config = filters.find((f) => f.field === filterField.field);

        if (config) {
          const multiSelectFlag = config.multiSelect === 1 || config.multiSelect === true;
          const initialValue = config.defaultValue || (multiSelectFlag ? [] : "");
          setFilterSettings({ ...config, value: initialValue });
          setValue(initialValue);

          if (config.type === "select") {
            if (config.webapitype === "dynamic" && config.webapi) {
              const optionsRes = await fetch(config.webapi);
              const data = await optionsRes.json();
              let optionsArray = [];
              if (Array.isArray(data)) {
                optionsArray = data;
              } else if (data.data && Array.isArray(data.data)) {
                optionsArray = data.data;
              }
              const opts = optionsArray.map((item) =>
                typeof item === "string"
                  ? { value: item, label: item }
                  : {
                      value: item.value || item.id || item.label,
                      label: item.label || item.value || item.id,
                    }
              );
              setOptions(opts);
            } else if (config.webapitype === "static" && config.staticoption) {
              if (typeof config.staticoption === 'string') {
                const staticOpts = config.staticoption
                  .split(',')
                  .map(item => item.trim())
                  .map(item => {
                    let val = item;
                    if (val.includes(',')) {
                      val = val.split(',').pop().trim();
                    }
                    return { value: val, label: val };
                  });
                setOptions(staticOpts);
              } else {
                setOptions([]);
              }
            } else if (!config.webapitype && config.query_preview) {
              const queryRes = await fetch("https://intelligentsalesman.com/ism1/API/tableu/execute_query.php", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ query: config.query_preview }),
              });
              const queryData = await queryRes.json();
              if (Array.isArray(queryData)) {
                const opts = queryData.map((item) =>
                  typeof item === "string"
                    ? { value: item, label: item }
                    : {
                        value: item.value || item.id || item.label,
                        label: item.label || item.value || item.id,
                      }
                );
                setOptions(opts);
              } else {
                setOptions([]);
              }
            } else {
              setOptions([]);
            }
          } else {
            setOptions([]); // No options for textbox type
          }
        } else {
          setFilterSettings({ field: filterField.field, value: "" });
          setOptions([]);
        }
      } catch (error) {
        console.error("Failed to load filter config or options:", error);
        setFilterSettings({ field: filterField.field, value: "" });
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterConfig();
  }, [visible, filterField]);

  if (!visible) return null;

  const handleChange = (val) => {
    setValue(val);
  };
  const handleSave = () => {
    let cleanValue = value;
    if (typeof cleanValue === 'string' && cleanValue.includes(',')) {
      cleanValue = cleanValue.split(',').pop().trim();
    }
    onSave({ ...filterSettings, field: filterField?.field, value: cleanValue });
  };

  return (
    <div className="filter-popup-overlay">
      <div className="filter-popup">
        <h3>Filter Settings for {filterField?.field}</h3>
        {loading ? (
          <div>Loading...</div>
        ) : filterSettings?.type === "select" ? (
          filterSettings?.multiSelect ? (
            <MultiSelectCombobox
              options={options}
              value={Array.isArray(value) ? value : value ? [value] : []}
              onChange={handleChange}
              placeholder={filterSettings?.placeholder || `Select ${filterField?.field}`}
              loading={loading}
            />
          ) : (
            <div className="relative">
              <select
                value={value || ""}
                onChange={(e) => handleChange(e.target.value)}
                style={{ width: "100%", height: "30px" }}
              >
                <option value="">-- Select --</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )
        ) : (
          <div>
            <label>
              Value:
              <input
                type="text"
                value={value || ""}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={filterSettings?.placeholder || "Enter value"}
                style={{ width: "100%", padding: "6px", marginTop: "4px" }}
              />
            </label>
          </div>
        )}
        <div className="filter-popup-buttons" style={{ marginTop: "12px" }}>
          <button onClick={handleSave} style={{ marginRight: "8px" }}>
            Apply
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [fields, setFields] = useState([]);
  const [data, setData] = useState([]);

  const [sheets, setSheets] = useState([
    {
      id: 1,
      name: "Sheet 1",
      filters: [],
      pages: [],
      marks: [],
      columns: [],
      rows: [],
      selectedChart: null,
      windowFunction: {
  category: "Aggregate",
  functionType: "SUM",
  partitionBy: ["Category"], // default partition
  orderBy: [{ field: "Date", direction: "ASC" }], // default order
  targetMeasure: "Sales", // default measure
  frameType: "ROWS",
  frameStart: "UNBOUNDED PRECEDING",
  frameStartValue: null,
  frameEnd: "CURRENT ROW",
  frameEndValue: null,
  namedWindow: "",
  lodScope: [],
  directionOfCalculation: "Window Across",
},
    },
  ]);

  const [activeSheetId, setActiveSheetId] = useState(1);

  const [contextMenu, setContextMenu] = useState(null);

  const [filterPopupVisible, setFilterPopupVisible] = useState(false);
  const [filterPopupField, setFilterPopupField] = useState(null);

  const [windowFunctionPopupVisible, setWindowFunctionPopupVisible] = useState(false);

//   useEffect(() => {
//     const mockFields = [
//   { name: "Product", type: "Dimension" },
//   { name: "Region", type: "Dimension" },
//   { name: "Sales", type: "Measure", measureType: "value", unit: "currency" },
//   { name: "Quantity", type: "Measure", measureType: "count", unit: "pieces" },
//   { name: "Weight", type: "Measure", measureType: "weight", unit: "kg" },
//   { name: "Volume", type: "Measure", measureType: "volume", unit: "liter" },
//   { name: "Date", type: "Dimension" },
//   { name: "Invoice", type: "Dimension" },
//   { name: "Category", type: "Dimension" },       // Added for richer partitioning
//   { name: "Subcategory", type: "Dimension" },    // Added for multi-level grouping
// ];
// setFields(mockFields);

// const mockData = [
//   { Product: "A", Region: "North", Category: "Electronics", Subcategory: "Mobile", Sales: 1000, Quantity: 50, Weight: 200, Volume: 50, Date: "2023-01-01", Invoice: "INV001" },
//   { Product: "A", Region: "North", Category: "Electronics", Subcategory: "Mobile", Sales: 1100, Quantity: 55, Weight: 210, Volume: 52, Date: "2023-01-02", Invoice: "INV002" },
//   { Product: "A", Region: "North", Category: "Electronics", Subcategory: "Laptop", Sales: 1500, Quantity: 30, Weight: 500, Volume: 70, Date: "2023-01-03", Invoice: "INV003" },
//   { Product: "B", Region: "South", Category: "Electronics", Subcategory: "Mobile", Sales: 1200, Quantity: 60, Weight: 220, Volume: 55, Date: "2023-01-01", Invoice: "INV004" },
//   { Product: "B", Region: "South", Category: "Electronics", Subcategory: "Laptop", Sales: 1300, Quantity: 40, Weight: 480, Volume: 68, Date: "2023-01-02", Invoice: "INV005" },
//   { Product: "C", Region: "East", Category: "Furniture", Subcategory: "Chair", Sales: 800, Quantity: 20, Weight: 150, Volume: 30, Date: "2023-01-01", Invoice: "INV006" },
//   { Product: "C", Region: "East", Category: "Furniture", Subcategory: "Table", Sales: 900, Quantity: 15, Weight: 300, Volume: 60, Date: "2023-01-03", Invoice: "INV007" },
//   { Product: "D", Region: "West", Category: "Furniture", Subcategory: "Chair", Sales: 700, Quantity: 25, Weight: 140, Volume: 28, Date: "2023-01-02", Invoice: "INV008" },
//   { Product: "D", Region: "West", Category: "Furniture", Subcategory: "Table", Sales: 950, Quantity: 18, Weight: 310, Volume: 62, Date: "2023-01-04", Invoice: "INV009" },
//   { Product: "A", Region: "North", Category: "Electronics", Subcategory: "Mobile", Sales: 1050, Quantity: 53, Weight: 205, Volume: 51, Date: "2023-01-04", Invoice: "INV010" },
//   { Product: "B", Region: "South", Category: "Electronics", Subcategory: "Mobile", Sales: 1250, Quantity: 65, Weight: 225, Volume: 57, Date: "2023-01-05", Invoice: "INV011" },
//   { Product: "C", Region: "East", Category: "Furniture", Subcategory: "Chair", Sales: 850, Quantity: 22, Weight: 155, Volume: 32, Date: "2023-01-05", Invoice: "INV012" },
// ];
//     setData(mockData);
//   }, []);

 useEffect(() => {
    fetch("https://intelligentsalesman.com/ism1/API/tableu/fields.php")
      .then((res) => res.json())
      .then(setFields)
      .catch(() => alert("Failed to load fields"));

    fetch("https://intelligentsalesman.com/ism1/API/tableu/data.php")
      .then((res) => res.json())
      .then(setData)
      .catch(() => alert("Failed to load data"));
  }, []);

  const activeSheet = sheets.find((s) => s.id === activeSheetId);

  const updateSheet = (id, newSheet) => {
    setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, ...newSheet } : s)));
  };

  // Handlers for drop, remove, edit filters, etc. remain same as your code

  const handleDrop = (field) => {
    if (activeSheet.filters.find((f) => f.field === field.name)) return;
    const newFilter = { field: field.name, value: "" };
    updateSheet(activeSheetId, { filters: [...activeSheet.filters, newFilter] });
  };

  // For Columns
  const handleDropColumn = (field, indexOrList) => {
    if (Array.isArray(indexOrList)) {
      // Reordered list
      updateSheet(activeSheetId, { columns: indexOrList });
    } else {
      // New field dropped at index
      if (activeSheet.columns.find(f => f.name === field.name)) return;
      const newColumns = [...activeSheet.columns];
      newColumns.splice(indexOrList, 0, field);
      updateSheet(activeSheetId, { columns: newColumns });
    }
  };

  // For Rows
  const handleDropRow = (field, indexOrList) => {
    if (Array.isArray(indexOrList)) {
      updateSheet(activeSheetId, { rows: indexOrList });
    } else {
      if (activeSheet.rows.find(f => f.name === field.name)) return;
      const newRows = [...activeSheet.rows];
      newRows.splice(indexOrList, 0, field);
      updateSheet(activeSheetId, { rows: newRows });
    }
  };

  const handleRemoveFilter = (fieldToRemove) => {
    const newFilters = activeSheet.filters.filter((f) => f.field !== fieldToRemove.field);
    updateSheet(activeSheetId, { filters: newFilters });
    setContextMenu(null);
  };

  const handleEditFilter = (field) => {
    setFilterPopupField(field);
    setFilterPopupVisible(true);
    setContextMenu(null);
  };



  const handleFilterSave = (filterSettings) => {
    const existingIndex = activeSheet.filters.findIndex(f => f.field === filterSettings.field);
    let newFilters;
    if (existingIndex >= 0) {
      newFilters = [...activeSheet.filters];
      newFilters[existingIndex] = filterSettings;
    } else {
      newFilters = [...activeSheet.filters, filterSettings];
    }
    updateSheet(activeSheetId, { filters: newFilters });
    setFilterPopupVisible(false);
    setFilterPopupField(null);
  };

  const enrichedFilters = activeSheet.filters.map((filter) => {
    const originalField = fields.find((f) => f.name === filter.field);
    return {
      ...filter,
      name: originalField?.name || filter.field,
      type: originalField?.type || "Dimension",
    };
  });

  const handleFilterCancel = () => {
    setFilterPopupVisible(false);
    setFilterPopupField(null);
  };

  const handleContextMenuField = (e, field) => {
    e.preventDefault();
    setContextMenu({
      position: { x: e.pageX, y: e.pageY },
      field,
      options: [
        { label: "Edit", action: () => handleEditFilter(field) },
        { label: "Delete", action: () => handleRemoveFilter(field) },
      ],
    });
  };

  const handleDropToOtherSlots = (setter, items, field) => {
    if (items.find((f) => f.name === field.name)) return;
    setter([...items, field]);
  };

  const handleChartSelect = (chartId) => {
    updateSheet(activeSheetId, { selectedChart: chartId });
  };

  // Window function customization handlers
  const handleWindowFunctionChange = (key, value) => {
    const newWindowFunction = { ...activeSheet.windowFunction, [key]: value };
    updateSheet(activeSheetId, { windowFunction: newWindowFunction });
  };

  const handleWindowFunctionOrderChange = (fieldOrDirection, value) => {
    const newOrderBy = { ...activeSheet.windowFunction.orderBy, [fieldOrDirection]: value };
    const newWindowFunction = { ...activeSheet.windowFunction, orderBy: newOrderBy };
    updateSheet(activeSheetId, { windowFunction: newWindowFunction });
  };

  // Filter handlers, context menu, drop handlers, chart select remain same as before...

  // Window function handlers for new UI
  const handleWindowFunctionCategoryChange = (category) => {
    const newWindowFunction = {
      ...activeSheet.windowFunction,
      category,
      functionType: windowFunctionCategories[category][0],
    };
    updateSheet(activeSheetId, { windowFunction: newWindowFunction });
  };

  const handleWindowFunctionTypeChange = (functionType) => {
    updateSheet(activeSheetId, {
      windowFunction: { ...activeSheet.windowFunction, functionType },
    });
  };

  const handlePartitionByChange = (partitionBy) => {
    updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, partitionBy } });
  };

  const handleOrderByChange = (orderBy) => {
    updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, orderBy } });
  };

  const handleFrameTypeChange = (frameType) => {
    updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, frameType } });
  };

  const handleFrameBoundaryChange = (boundaryType, value) => {
    updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, [boundaryType]: value } });
  };

  const handleFrameBoundaryValueChange = (boundaryTypeValue, value) => {
    updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, [boundaryTypeValue]: value } });
  };

  const handleNamedWindowChange = (namedWindow) => {
    updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, namedWindow } });
  };

  const handleLodScopeChange = (lodScope) => {
    updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, lodScope } });
  };

  // Apply window function logic (simplified for demo)
  // For brevity, this example applies only basic partition/order and ignores frame and LOD in JS simulation

  const applyWindowFunction = (data, windowFunction) => {
    if (!windowFunction || !windowFunction.functionType) return data;
  if (!windowFunction.targetMeasure) return data;
console.log("Window Function Params:", windowFunction);
  console.log("Data sample:", data.slice(0, 3));
    const { functionType, partitionBy, orderBy,targetMeasure, directionOfCalculation } = windowFunction;

    // Helper to group data by keys
    const groupBy = (array, keys) => {
      return array.reduce((acc, item) => {
        const key = keys.map(k => item[k]).join("||") || "__NO_PARTITION__";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});
    };

    // Depending on directionOfCalculation, group and order data differently
    let groups = {};

    if (directionOfCalculation === "Window Across" || directionOfCalculation === "Pane Across") {
      // Group by partitionBy fields
      groups = groupBy(data, partitionBy);
      // Sort each group by orderBy fields
      Object.values(groups).forEach(group => {
        group.sort((a, b) => {
          for (const { field, direction } of orderBy) {
            if (a[field] < b[field]) return direction === "ASC" ? -1 : 1;
            if (a[field] > b[field]) return direction === "ASC" ? 1 : -1;
          }
          return 0;
        });
      });
    } else if (directionOfCalculation === "Window Down" || directionOfCalculation === "Pane Down") {
      // Group by orderBy fields (vertical direction)
      groups = groupBy(data, orderBy.map(o => o.field));
      // Sort each group by partitionBy fields
      Object.values(groups).forEach(group => {
        group.sort((a, b) => {
          for (const field of partitionBy) {
            if (a[field] < b[field]) return -1;
            if (a[field] > b[field]) return 1;
          }
          return 0;
        });
      });
    } else if (directionOfCalculation === "Down Then Across") {
      // Group by partitionBy then orderBy
      groups = groupBy(data, partitionBy.concat(orderBy.map(o => o.field)));
    } else if (directionOfCalculation === "Across Then Down") {
      // Group by orderBy then partitionBy
      groups = groupBy(data, orderBy.map(o => o.field).concat(partitionBy));
    } else {
      // Default grouping
      groups = groupBy(data, partitionBy);
    }

    // Apply window function per group
    Object.values(groups).forEach(group => {
      if (functionType === "ROW_NUMBER") {
        group.forEach((item, index) => {
          item.window_value = index + 1;
        });
      } else if (functionType === "RANK") {
        let rank = 1;
        group.forEach((item, index) => {
          if (index > 0) {
            const prev = group[index - 1];
            const isTie = orderBy.every(({ field }) => item[field] === prev[field]);
            if (!isTie) rank = index + 1;
          }
          item.window_value = rank;
        });
      } else if (functionType === "DENSE_RANK") {
        let rank = 1;
        group.forEach((item, index) => {
          if (index > 0) {
            const prev = group[index - 1];
            const isTie = orderBy.every(({ field }) => item[field] === prev[field]);
            if (!isTie) rank++;
          }
          item.window_value = rank;
        });
      } else if (functionType === "SUM") {
  let runningSum = 0;
  group.forEach((item, idx) => {
    const val = Number(item[targetMeasure] || 0);
    runningSum += val;
    item.running_total = runningSum;

    // Example moving average of last 3 rows
    const windowSize = 3;
    const start = Math.max(0, idx - windowSize + 1);
    const windowSlice = group.slice(start, idx + 1);
    const movingAvg = windowSlice.reduce((sum, r) => sum + Number(r[targetMeasure] || 0), 0) / windowSlice.length;
    item.moving_avg = movingAvg;

    item.window_value = runningSum; // keep window_value for backward compatibility
  });
} else if (functionType === "AVG") {
        let runningSum = 0;
        // group.forEach((item, index) => {
        //   runningSum += Number(item[orderBy[0]?.field] || 0);
        //   item.window_value = runningSum / (index + 1);
        // });
        group.forEach((item, index) => {
  runningSum += Number(item[targetMeasure] || 0);
  item.window_value = runningSum / (index + 1);
});
      } else {
        // Default: no window function applied
        group.forEach(item => {
          item.window_value = item[orderBy[0]?.field] || null;
        });
      }
    });
console.log("Data with window values:", Object.values(groups).flat());
    return Object.values(groups).flat();
  };
  // Window function UI handlers fixed for orderBy array
const handleOrderByFieldChange = (field) => {
  const newOrderBy = [...activeSheet.windowFunction.orderBy];
  if (newOrderBy.length === 0) newOrderBy.push({ field: "", direction: "ASC" });
  newOrderBy[0].field = field;
  updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, orderBy: newOrderBy } });
};

const handleOrderByDirectionChange = (direction) => {
  const newOrderBy = [...activeSheet.windowFunction.orderBy];
  if (newOrderBy.length === 0) newOrderBy.push({ field: "", direction: "ASC" });
  newOrderBy[0].direction = direction;
  updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, orderBy: newOrderBy } });
};

  // Other window function handlers remain same as your code

  // Apply filters and window function
  const applyFilters = (data, filters) => {
    if (!filters || filters.length === 0) return data;

    const activeFilters = filters.filter(f => f.value && f.value.length > 0);

    if (activeFilters.length === 0) return data;

    return data.filter((row) => {
      return activeFilters.every((filter) => {
        const fieldValue = row[filter.field];
        const filterValue = filter.value;
        if (!filterValue) return true;
        if (Array.isArray(filterValue)) {
          return filterValue.includes(String(fieldValue));
        }
        return String(fieldValue).toLowerCase().trim() === String(filterValue).toLowerCase().trim();
      });
    });
  };

  const filteredData = applyFilters(data, activeSheet.filters);

  // Mark primary and secondary variables
  const columnsWithRoles = markPrimarySecondary(activeSheet.columns);
  const rowsWithRoles = markPrimarySecondary(activeSheet.rows);

  // Group data into panes
  const panes = groupByAxes(filteredData, columnsWithRoles, rowsWithRoles);

  // Calculate metrics
  const metricA = calculateMetricA(filteredData);
  const metricB = calculateMetricB(filteredData);

  // Prepare keys for chart
const xKey =
  activeSheet.columns?.filter(Boolean).find((f) => f.type === "Dimension")?.name ||
  activeSheet.rows?.filter(Boolean).find((f) => f.type === "Dimension")?.name ||
  null;

const yKey =
  activeSheet.columns?.filter(Boolean).find((f) => f.type === "Measure" || f.type === "Metric")?.name ||
  activeSheet.rows?.filter(Boolean).find((f) => f.type === "Measure" || f.type === "Metric")?.name ||
  null;

  // Options for selects
  const functionTypes = windowFunctionCategories[activeSheet.windowFunction.category] || [];
  const dimensionFields = fields.filter(f => f.type === "Dimension").map(f => f.name);
  const measureFields = fields.filter(f => f.type === "Measure" || f.type === "Metric").map(f => f.name);
  const orderDirections = ["ASC", "DESC"];
const orderByFields = fields.map(f => f.name); // all fields (dimensions + measures)
  const [units, setUnits] = React.useState({});

  const getUnitForField = (fieldName) => {
    return units[fieldName] || null;
  };

  const getMeasureType = (fieldName) => {
    const field = fields.find(f => f.name === fieldName);
    return field?.measureType || null;
  };

  const getUnitsForMeasureType = (measureType) => {
    if (!measureType) return [];
    return measuresConfig[measureType]?.units || [];
  };

  const handleUnitChange = (field, unit) => {
    const updateFieldUnit = (items) => {
      return items.map(item => 
        item.name === field.name ? { ...item, unit } : item
      );
    };

    if (activeSheet.columns.find(f => f.name === field.name)) {
      updateSheet(activeSheetId, { columns: updateFieldUnit(activeSheet.columns) });
    }
    
    if (activeSheet.rows.find(f => f.name === field.name)) {
      updateSheet(activeSheetId, { rows: updateFieldUnit(activeSheet.rows) });
    }
  };
  
console.log("Active Sheet Columns:", activeSheet.columns);
console.log("Active Sheet Rows:", activeSheet.rows);
console.log("xKey:", xKey);
console.log("yKey:", yKey);
console.log("Filtered Data Sample:", filteredData.slice(0, 5));
console.log("Selected Chart:", activeSheet.selectedChart);
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app" onClick={() => setContextMenu(null)}>
        {/* Left Sidebar: Fields */}
        <div className="sidebar left-sidebar">
          <h3>Tables</h3>
          <div className="fields-list">
            {fields.map((field, idx) => (
              <Field key={idx} field={field} />
            ))}
          </div>
          
          {/* Measures and Units Information */}
          <div className="measures-info" style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}>
            <h4>Measures & Units</h4>
            {Object.entries(measuresConfig).map(([measureType, config]) => (
              <div key={measureType} style={{ marginBottom: "8px" }}>
                <strong>{measureType}:</strong> {config.units.join(", ")}
                {measureType === "value" && (
                  <div style={{ fontSize: "0.9em", color: "#666" }}>
                    Currency: {currencyUnits.currency}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Metrics Display */}
          <div className="metrics-info" style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}>
            <h4>Metrics</h4>
            <div style={{ marginBottom: "8px" }}>
              <strong>Metric A (Total Value in Indian Rupees):</strong> ₹{metricA.toLocaleString()}
            </div>
            <div style={{ marginBottom: "8px" }}>
              <strong>Metric B (Average of Total of Selected Invoices):</strong> ₹{metricB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Center-left Panel: Filters, Pages, Marks, Window Function Config */}
        <div className="center-left-panel">
          {/* Slots for Filters, Pages, Marks */}
          {/* ... your existing Slot components for Filters, Pages, Marks ... */}
<Slot
            title="Filters"
            items={activeSheet.filters.map(f => {
              const orig = fields.find(field => field.name === f.field);
              return { ...f, type: orig?.type || "Dimension" };
            })}
            onDropField={(field) => {
              if (!field) return;
              if (activeSheet.filters.find(f => f.field === field.name)) return;
              updateSheet(activeSheetId, { filters: [...activeSheet.filters, { field: field.name, value: "" }] });
            }}
            className="filters-slot"
            onFieldClick={(field) => {
              setFilterPopupField(field);
              setFilterPopupVisible(true);
            }}
            onRemoveField={(field) => {
              updateSheet(activeSheetId, { filters: activeSheet.filters.filter(f => f.field !== field.field) });
            }}
            onContextMenuField={(e, field) => {
              e.preventDefault();
              setContextMenu({
                position: { x: e.pageX, y: e.pageY },
                field,
                options: [
                  { label: "Edit", action: () => { setFilterPopupField(field); setFilterPopupVisible(true); } },
                  { label: "Delete", action: () => { updateSheet(activeSheetId, { filters: activeSheet.filters.filter(f => f.field !== field.field) }); } },
                ],
              });
            }}
          />
          <Slot
            title="Pages"
            items={activeSheet.pages}
            onDropField={(field) => {
              if (activeSheet.pages.find(f => f.name === field.name)) return;
              updateSheet(activeSheetId, { pages: [...activeSheet.pages, field] });
            }}
            className="pages-slot"
          />
          <Slot
            title="Marks"
            items={activeSheet.marks}
            onDropField={(field) => {
              if (activeSheet.marks.find(f => f.name === field.name)) return;
              updateSheet(activeSheetId, { marks: [...activeSheet.marks, field] });
            }}
            className="marks-slot"
          />

          {/* Window Function Configuration UI */}
            {/* 8) Direction of Calculation */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600" }}>Direction of Calculation:</label>
              <select
                value={activeSheet.windowFunction.directionOfCalculation || "Window Across"}
                onChange={(e) => handleWindowFunctionChange("directionOfCalculation", e.target.value)}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
              >
                <option value="Window Across">Window Across</option>
                <option value="Window Down">Window Down</option>
                <option value="Pane Across">Pane Across</option>
                <option value="Pane Down">Pane Down</option>
                <option value="Down Then Across">Down Then Across</option>
                <option value="Across Then Down">Across Then Down</option>
              </select>
            </div>
            {/* Target Measure */}
<div style={{ marginBottom: "10px" }}>
  <label style={{ fontWeight: "600" }}>Target Measure:</label>
  <select
    value={activeSheet.windowFunction.targetMeasure || ""}
    onChange={(e) => handleWindowFunctionChange("targetMeasure", e.target.value)}
    style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
  >
    <option value="">-- Select measure --</option>
    {measureFields.map(f => (
      <option key={f} value={f}>{f}</option>
    ))}
  </select>
</div>
          {/* Window Function Configuration UI */}
          <div className="window-function-config" style={{ marginTop: "20px", padding: "12px", border: "1px solid #ccc", borderRadius: "8px" }}>
            <h4>Window Function Configuration</h4>

            {/* 1) Function Category */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600" }}>Function Category:</label>
              <select
                value={activeSheet.windowFunction.category}
                onChange={(e) => {
                  const category = e.target.value;
                  const newWindowFunction = {
                    ...activeSheet.windowFunction,
                    category,
                    functionType: windowFunctionCategories[category][0],
                  };
                  updateSheet(activeSheetId, { windowFunction: newWindowFunction });
                }}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
              >
                {Object.keys(windowFunctionCategories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 2) Function Type */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600" }}>Function:</label>
              <select
                value={activeSheet.windowFunction.functionType}
                onChange={(e) => updateSheet(activeSheetId, {
                  windowFunction: { ...activeSheet.windowFunction, functionType: e.target.value },
                })}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
              >
                {functionTypes.map(fn => (
                  <option key={fn} value={fn}>{fn}</option>
                ))}
              </select>
            </div>

            {/* 3) Partition By (multi-select) */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600" }}>Partition By:</label>
              <MultiSelectCombobox
                options={dimensionFields.map(f => ({ value: f, label: f }))}
                value={activeSheet.windowFunction.partitionBy}
                onChange={(val) => updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, partitionBy: val } })}
                placeholder="Select partition fields"
              />
            </div>

            {/* 4) Order By (single field + direction) */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600" }}>Order By:</label>
              <select
  value={activeSheet.windowFunction.orderBy[0]?.field || ""}
  onChange={(e) => handleOrderByFieldChange(e.target.value)}
  style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
>
  <option value="">-- Select field --</option>
  {orderByFields.map(f => (
    <option key={f} value={f}>{f}</option>
  ))}
</select>
              <select
                value={activeSheet.windowFunction.orderBy[0]?.direction || "ASC"}
                onChange={(e) => handleOrderByDirectionChange(e.target.value)}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
              >
                {orderDirections.map(dir => (
                  <option key={dir} value={dir}>{dir}</option>
                ))}
              </select>
            </div>

            {/* 5) Frame Specification */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600" }}>Frame Type:</label>
              <select
                value={activeSheet.windowFunction.frameType}
                onChange={(e) => updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, frameType: e.target.value } })}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
              >
                <option value="ROWS">ROWS</option>
                <option value="RANGE">RANGE</option>
              </select>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600" }}>Frame Start:</label>
              <select
                value={activeSheet.windowFunction.frameStart}
                onChange={(e) => updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, frameStart: e.target.value } })}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
              >
                {frameBoundaryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select
              >
              {frameBoundaryOptions.find(opt => opt.value === activeSheet.windowFunction.frameStart)?.needsValue && (
                <input
                  type="number"
                  min="0"
                  value={activeSheet.windowFunction.frameStartValue || ""}
                  onChange={(e) => updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, frameStartValue: e.target.value } })}
                  placeholder="Enter N"
                  style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
                />
              )}
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600" }}>Frame End:</label>
              <select
                value={activeSheet.windowFunction.frameEnd}
                onChange={(e) => updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, frameEnd: e.target.value } })}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
              >
                {frameBoundaryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {frameBoundaryOptions.find(opt => opt.value === activeSheet.windowFunction.frameEnd)?.needsValue && (
                <input
                  type="number"
                  min="0"
                  value={activeSheet.windowFunction.frameEndValue || ""}
                  onChange={(e) => updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, frameEndValue: e.target.value } })}
                  placeholder="Enter N"
                  style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
                />
              )}
            </div>

            {/* 6) Named Window */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600" }}>Named Window (optional):</label>
              <input
                type="text"
                value={activeSheet.windowFunction.namedWindow}
                onChange={(e) => updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, namedWindow: e.target.value } })}
                placeholder="Enter window name"
                style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
              />
            </div>

            {/* 7) LOD Scope (optional) */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600" }}>LOD Scope (optional):</label>
              <MultiSelectCombobox
                options={dimensionFields.map(f => ({ value: f, label: f }))}
                value={activeSheet.windowFunction.lodScope}
                onChange={(val) => updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, lodScope: val } })}
                placeholder="Select LOD fields"
              />
            </div>

            {/* 8) Direction of Calculation */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "600" }}>Direction of Calculation:</label>
              <select
                value={activeSheet.windowFunction.directionOfCalculation || "Window Across"}
                onChange={(e) => updateSheet(activeSheetId, { windowFunction: { ...activeSheet.windowFunction, directionOfCalculation: e.target.value } })}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
              >
                <option value="Window Across">Window Across</option>
                <option value="Window Down">Window Down</option>
                <option value="Pane Across">Pane Across</option>
                <option value="Pane Down">Pane Down</option>
                <option value="Down Then Across">Down Then Across</option>
                <option value="Across Then Down">Across Then Down</option>
              </select>
            </div>

            <button
              onClick={() => setWindowFunctionPopupVisible(true)}
              style={{
                marginTop: "12px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
                width: "100%",
                fontSize: "1rem",
              }}
            >
              Show Window Function SQL
            </button>
          </div>
        </div>

        {/* Center-right Panel */}
        <div className="center-right-panel">
          <div className="columns-rows-container">
            <Slot
              title="Columns (X-Axis)"
              items={columnsWithRoles}
              onDropField={(field, indexOrList) => {
                if (Array.isArray(indexOrList)) {
                  updateSheet(activeSheetId, { columns: indexOrList });
                } else {
                  if (activeSheet.columns.find(f => f.name === field.name)) return;
                  const newColumns = [...activeSheet.columns];
                  newColumns.splice(indexOrList, 0, field);
                  updateSheet(activeSheetId, { columns: newColumns });
                }
              }}
              onRemoveField={(fieldToRemove) => {
                const newColumns = activeSheet.columns.filter(f => f.name !== fieldToRemove.name);
                updateSheet(activeSheetId, { columns: newColumns });
              }}
              className="columns-slot"
              onFieldClick={(field) => {
                if (field.type === "Measure" || field.type === "Metric") {
                  const measureType = getMeasureType(field.name);
                  const units = getUnitsForMeasureType(measureType);
                  if (units.length > 0) {
                    console.log(`Select unit for ${field.name}:`, units);
                  }
                }
              }}
            />

            <Slot
              title="Rows (Y-Axis)"
              items={rowsWithRoles}
              onDropField={(field, indexOrList) => {
                if (Array.isArray(indexOrList)) {
                  updateSheet(activeSheetId, { rows: indexOrList });
                } else {
                  if (activeSheet.rows.find(f => f.name === field.name)) return;
                  const newRows = [...activeSheet.rows];
                  newRows.splice(indexOrList, 0, field);
                  updateSheet(activeSheetId, { rows: newRows });
                }
              }}
              onRemoveField={(fieldToRemove) => {
                const newRows = activeSheet.rows.filter(f => f.name !== fieldToRemove.name);
                updateSheet(activeSheetId, { rows: newRows });
              }}
              className="rows-slot"
              onFieldClick={(field) => {
                if (field.type === "Measure" || field.type === "Metric") {
                  const measureType = getMeasureType(field.name);
                  const units = getUnitsForMeasureType(measureType);
                  if (units.length > 0) {
                    console.log(`Select unit for ${field.name}:`, units);
                  }
                }
              }}
            />
          </div>

         {(activeSheet.columns.some(f => f && (f.type === "Measure" || f.type === "Metric")) || 
  activeSheet.rows.some(f => f && (f.type === "Measure" || f.type === "Metric"))) && (
  <div className="unit-selection" style={{ marginTop: "20px", padding: "12px", border: "1px solid #ccc", borderRadius: "8px" }}>
    <h4>Unit Selection</h4>
    {activeSheet.columns
      .filter(f => f && (f.type === "Measure" || f.type === "Metric"))
      .map(field => {
        const measureType = getMeasureType(field.name);
        const units = getUnitsForMeasureType(measureType);
        const unit = getUnitForField(field.name);
        return units.length > 0 ? (
          <div key={`col-${field.name}`} style={{ marginBottom: "10px" }}>
            <label>{field.name} Unit:</label>
            <select
              value={unit || measuresConfig[measureType]?.defaultUnit || ""}
              onChange={(e) => handleUnitChange(field, e.target.value)}
              style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
            >
              {units.map(unitOption => (
                <option key={unitOption} value={unitOption}>{unitOption}</option>
              ))}
            </select>
            {measureType === "value" && unit === "currency" && (
              <div style={{ fontSize: "0.9em", color: "#666", marginTop: "4px" }}>
                Currency: {currencyUnits.currency}
              </div>
            )}
          </div>
        ) : null;
      })}
    {activeSheet.rows
      .filter(f => f && (f.type === "Measure" || f.type === "Metric"))
      .map(field => {
        const measureType = getMeasureType(field.name);
        const units = getUnitsForMeasureType(measureType);
        const unit = getUnitForField(field.name);
        return units.length > 0 ? (
          <div key={`row-${field.name}`} style={{ marginBottom: "10px" }}>
            <label>{field.name} Unit:</label>
            <select
              value={field.unit || measuresConfig[measureType]?.defaultUnit || ""}
              onChange={(e) => handleUnitChange(field, e.target.value)}
              style={{ width: "100%", padding: "6px", borderRadius: "4px", marginTop: "4px" }}
            >
              {units.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
            {measureType === "value" && unit === "currency" && (
              <div style={{ fontSize: "0.9em", color: "#666", marginTop: "4px" }}>
                Currency: {currencyUnits.currency}
              </div>
            )}
          </div>
        ) : null;
      })}
  </div>
)}

          <div className="pane-info" style={{ marginTop: "20px", padding: "12px", border: "1px solid #ccc", borderRadius: "8px" }}>
            <h4>Panes Information</h4>
            <div>Number of Panes: {Object.keys(panes).length}</div>
            <div>Cell-level Object: Invoice</div>
            <div>X-Axis: {columnsWithRoles.map(f => f.name).join(", ")}</div>
            <div>Y-Axis: {rowsWithRoles.map(f => f.name).join(", ")}</div>
          </div>

          <div className="sheet-visualization">
            <div className="sheet-title">{activeSheet.name}</div>
            <div className="sheet-chart-area">
             {activeSheet.selectedChart ? (
  (!xKey || !yKey) ? (
    <div className="sheet-placeholder">
      Please drag at least one Dimension field to Columns or Rows for X-Axis, and one Measure/Metric field for Y-Axis.
    </div>
  ) : (
    <ChartRenderer
      chartType={activeSheet.selectedChart}
      data={filteredData}
      xKey={xKey}
      yKey={yKey}
      columns={columnsWithRoles}
      rows={rowsWithRoles}
      windowFunction={activeSheet.windowFunction}
    />
  )
) : (
  <div className="sheet-placeholder">
    Select a chart from Show Me panel
  </div>
)}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Show Me Panel */}
        <div className="sidebar right-sidebar">
          <ShowMePanel
            selectedChart={activeSheet.selectedChart}
            onSelectChart={(chartId) => updateSheet(activeSheetId, { selectedChart: chartId })}
          />
        </div>

        {/* Footer Tabs for Sheets */}
        <div className="footer-tabs">
          {sheets.map((sheet) => (
            <button
              key={sheet.id}
              className={`footer-tab ${sheet.id === activeSheetId ? "active" : ""}`}
              onClick={() => setActiveSheetId(sheet.id)}
            >
              {sheet.name}
            </button>
          ))}
        </div>

        {/* Context Menu */}
        <ContextMenu
          position={contextMenu?.position}
          options={contextMenu?.options || []}
          onClose={() => setContextMenu(null)}
        />

        {/* Filter Popup Modal */}
        <FilterPopup
          visible={filterPopupVisible}
          filterField={filterPopupField}
          onSave={(filterSettings) => {
            const existingIndex = activeSheet.filters.findIndex(f => f.field === filterSettings.field);
            let newFilters;
            if (existingIndex >= 0) {
              newFilters = [...activeSheet.filters];
              newFilters[existingIndex] = filterSettings;
            } else {
              newFilters = [...activeSheet.filters, filterSettings];
            }
            updateSheet(activeSheetId, { filters: newFilters });
            setFilterPopupVisible(false);
            setFilterPopupField(null);
          }}
          onCancel={() => {
            setFilterPopupVisible(false);
            setFilterPopupField(null);
          }}
        />

        {/* Window Function SQL Popup */}
        
        <WindowFunctionPopup
  visible={windowFunctionPopupVisible}
  onClose={() => setWindowFunctionPopupVisible(false)}
  windowFunction={activeSheet.windowFunction}
  filters={activeSheet.filters}
/>
      </div>
    </DndProvider>
  );
};

export default App;