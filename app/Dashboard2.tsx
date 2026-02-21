import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Combobox } from "@headlessui/react";
import { ResponsiveContainer } from "recharts";
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
} from "recharts";

const ItemTypes = { FIELD: "field" };

const icons = {
  Dimension: "📐",
  Measure: "📊",
  Metric: "📈",
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

/* ----------------- Window Function Configuration Constants ----------------- */
const WINDOW_DIRECTIONS = {
  "Table (across)": "TABLE_ACROSS",
  "Table (down then across)": "TABLE_DOWN_THEN_ACROSS",
  "Pane (down)": "PANE_DOWN",
  "Cell": "CELL",
  "Specific Dimensions": "SPECIFIC_DIMENSIONS",
  "Window Across": "WINDOW_ACROSS",
  "Window Down": "WINDOW_DOWN",
  "Pane Across": "PANE_ACROSS",
  "Pane Down": "PANE_DOWN",
  "Down Then Across": "DOWN_THEN_ACROSS",
  "Across Then Down": "ACROSS_THEN_DOWN",
};


const FUNCTION_CATEGORIES = {
  Aggregate: ["SUM", "AVG", "COUNT", "MAX", "MIN", "STDDEV", "VARIANCE"],
  "Non-aggregate": [
    "ROW_NUMBER",
    "RANK",
    "DENSE_RANK",
    "NTILE",
    "LAG",
    "LEAD",
    "FIRST_VALUE",
    "LAST_VALUE",
    "PERCENT_RANK",
    "CUME_DIST",
  ],
};

const FRAME_TYPES = ["ROWS", "RANGE"];

const FRAME_BOUNDARIES = {
  "UNBOUNDED PRECEDING": "UNBOUNDED PRECEDING",
  "CURRENT ROW": "CURRENT ROW",
  "UNBOUNDED FOLLOWING": "UNBOUNDED FOLLOWING",
  "N PRECEDING": "N PRECEDING",
  "N FOLLOWING": "N FOLLOWING",
};

const LOD_SCOPES = ["INCLUDE", "EXCLUDE", "FIXED"];

/* ----------------- Generic Modal ----------------- */
const Modal = ({ visible, title, onClose, maxWidth = "900px", children, footer }) => {
  if (!visible) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 10,
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 0, background: "transparent", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: 16, overflow: "auto" }}>{children}</div>
        {footer && (
          <div style={{ padding: 12, borderTop: "1px solid #eee", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* ----------------- Single Select Combobox ----------------- */
const SingleSelectCombobox = ({ options, value, onChange, placeholder = "Select..." }) => {
  const [query, setQuery] = React.useState("");

  const normalized = React.useMemo(() => {
    if (!options) return [];
    if (typeof options[0] === "string") {
      return options.map((t) => ({ label: t, value: t }));
    }
    return options;
  }, [options]);

  const filtered = query === ""
    ? normalized
    : normalized.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  const selectedOption = normalized.find((o) => o.value === value) || null;

  return (
    <Combobox value={selectedOption} onChange={(opt) => onChange(opt?.value || "")}>
      <div style={{ position: "relative" }}>
        <Combobox.Input
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          displayValue={(opt) => opt?.label || ""}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
        />
        <Combobox.Options
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: 4,
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 20,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: 8, color: "#888" }}>No results</div>
          ) : (
            filtered.map((option) => (
              <Combobox.Option
                key={option.value}
                value={option}
                style={{ padding: 8, cursor: "pointer" }}
              >
                {({ selected, active }) => (
                  <div
                    style={{
                      fontWeight: selected ? "600" : "400",
                      backgroundColor: active ? "#f3f4f6" : "transparent",
                      borderRadius: 4,
                    }}
                  >
                    {option.label}
                  </div>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};

/* ----------------- Multi-select Combobox ----------------- */
const MultiSelectCombobox = ({ options, value, onChange, placeholder = "Select..." }) => {
  const [query, setQuery] = useState("");
  const normalized = React.useMemo(() => {
    if (!options) return [];
    if (typeof options[0] === "string") {
      return options.map((t) => ({ label: t, value: t }));
    }
    return options;
  }, [options]);

  const filtered = query === ""
    ? normalized
    : normalized.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  const display = (selectedValues) =>
    (selectedValues || [])
      .map((val) => normalized.find((o) => o.value === val)?.label || val)
      .join(", ");

  return (
    <Combobox value={value} onChange={onChange} multiple>
      <div style={{ position: "relative" }}>
        <Combobox.Input
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
          displayValue={display}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
        />
        <Combobox.Options
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: 4,
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 20,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: 8, color: "#888" }}>No results</div>
          ) : (
            filtered.map((option) => (
              <Combobox.Option
                key={option.value}
                value={option.value}
                style={{ padding: 8, cursor: "pointer" }}
              >
                {({ selected, active }) => (
                  <div
                    style={{
                      fontWeight: selected ? "600" : "400",
                      backgroundColor: active ? "#f3f4f6" : "transparent",
                      borderRadius: 4,
                    }}
                  >
                    {option.label}
                  </div>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};

/* ----------------- Advanced Window Function Builder ----------------- */
const AdvancedWindowFunctionBuilder = ({ windowConfig, onChange, allFields, dimensionFields, measureFields }) => {
  const updateWindow = (patch) => {
    onChange({ ...windowConfig, ...patch });
  };

  const getAvailableFunctions = () => {
    const category = windowConfig.functionCategory || "Aggregate";
    return FUNCTION_CATEGORIES[category] || [];
  };

  const isAggregateFunction = () => {
    return FUNCTION_CATEGORIES["Aggregate"].includes(windowConfig.fn);
  };

  const needsTargetField = () => {
    return ["SUM", "AVG", "COUNT", "MAX", "MIN", "STDDEV", "VARIANCE"].includes(windowConfig.fn);
  };

  const needsOffsetValue = () => {
    return ["LAG", "LEAD", "NTILE"].includes(windowConfig.fn);
  };

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, backgroundColor: "#f9f9f9" }}>
      <h4 style={{ margin: "0 0 16px 0", color: "#333" }}>Advanced Window Function Configuration</h4>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Direction of Calculation:</label>
        <select
          value={windowConfig.direction || "Table (down then across)"}
          onChange={(e) => onChange({ ...windowConfig, direction: e.target.value })}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
        >
          {Object.keys(WINDOW_DIRECTIONS).map(dir => (
            <option key={dir} value={dir}>{dir}</option>
          ))}
        </select>
        <small style={{ color: "#666", fontSize: 12 }}>
          Controls how the window function processes data across rows and columns
        </small>
      </div>

      {/* Function Category */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Function Category:</label>
        <select
          value={windowConfig.functionCategory || "Aggregate"}
          onChange={(e) => updateWindow({
            functionCategory: e.target.value,
            fn: FUNCTION_CATEGORIES[e.target.value][0]
          })}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
        >
          {Object.keys(FUNCTION_CATEGORIES).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Function Selection */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Function:</label>
        <select
          value={windowConfig.fn || getAvailableFunctions()[0]}
          onChange={(e) => updateWindow({ fn: e.target.value })}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
        >
          {getAvailableFunctions().map(fn => (
            <option key={fn} value={fn}>{fn}</option>
          ))}
        </select>
      </div>

      {/* Target Field (for aggregate functions) */}
      {needsTargetField() && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Target Field:</label>
          <select
            value={windowConfig.targetField || ""}
            onChange={(e) => updateWindow({ targetField: e.target.value })}
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
          >
            <option value="">Select field...</option>
            {(isAggregateFunction() ? measureFields : allFields).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      )}

      {/* Offset Value (for LAG, LEAD, NTILE) */}
      {needsOffsetValue() && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            {windowConfig.fn === "NTILE" ? "Number of Buckets:" : "Offset:"}
          </label>
          <input
            type="number"
            min="1"
            value={windowConfig.offsetValue || 1}
            onChange={(e) => updateWindow({ offsetValue: parseInt(e.target.value) || 1 })}
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
          />
        </div>
      )}

      {/* LOD Scope */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>LOD (Level of Detail) Scope:</label>
        <select
          value={windowConfig.lodScope || "INCLUDE"}
          onChange={(e) => updateWindow({ lodScope: e.target.value })}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
        >
          {LOD_SCOPES.map(scope => (
            <option key={scope} value={scope}>{scope}</option>
          ))}
        </select>
        <small style={{ color: "#666", fontSize: 12 }}>
          INCLUDE: Include specified dimensions, EXCLUDE: Exclude specified dimensions, FIXED: Use only specified dimensions
        </small>
      </div>

      {/* LOD Fields */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>LOD Fields:</label>
        <MultiSelectCombobox
          options={dimensionFields.map(f => ({ label: f, value: f }))}
          value={windowConfig.lodFields || []}
          onChange={(vals) => updateWindow({ lodFields: vals })}
          placeholder="Select dimensions for LOD..."
        />
      </div>

      {/* Partition By */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Partition By:</label>
        <MultiSelectCombobox
          options={dimensionFields.map(f => ({ label: f, value: f }))}
          value={windowConfig.partitionBy || []}
          onChange={(vals) => updateWindow({ partitionBy: vals })}
          placeholder="Select fields to partition by..."
        />
        <small style={{ color: "#666", fontSize: 12 }}>
          Groups rows into partitions for separate window calculations
        </small>
      </div>

      {/* Order By */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Order By:</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select
            value={windowConfig.orderBy?.[0]?.field || ""}
            onChange={(e) => {
              const field = e.target.value;
              const direction = windowConfig.orderBy?.[0]?.direction || "ASC";
              updateWindow({
                orderBy: field ? [{ field, direction }] : []
              });
            }}
            style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
          >
            <option value="">Select field...</option>
            {allFields.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select
            value={windowConfig.orderBy?.[0]?.direction || "ASC"}
            onChange={(e) => {
              const field = windowConfig.orderBy?.[0]?.field || "";
              const direction = e.target.value;
              updateWindow({
                orderBy: field ? [{ field, direction }] : []
              });
            }}
            style={{ width: 100, padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
          >
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
        </div>
        <small style={{ color: "#666", fontSize: 12 }}>
          Defines the order of rows within each partition
        </small>
      </div>

      {/* Frame Type */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Frame Type:</label>
        <select
          value={windowConfig.frameType || "ROWS"}
          onChange={(e) => updateWindow({ frameType: e.target.value })}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
        >
          {FRAME_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <small style={{ color: "#666", fontSize: 12 }}>
          ROWS: Physical row boundaries, RANGE: Logical value boundaries
        </small>
      </div>

      {/* Frame Start */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Frame Start:</label>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={windowConfig.frameStart || "UNBOUNDED PRECEDING"}
            onChange={(e) => updateWindow({ frameStart: e.target.value })}
            style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
          >
            {Object.keys(FRAME_BOUNDARIES).map(boundary => (
              <option key={boundary} value={boundary}>{boundary}</option>
            ))}
          </select>
          {(windowConfig.frameStart === "N PRECEDING" || windowConfig.frameStart === "N FOLLOWING") && (
            <input
              type="number"
              min="1"
              value={windowConfig.frameStartValue || 1}
              onChange={(e) => updateWindow({ frameStartValue: parseInt(e.target.value) || 1 })}
              style={{ width: 80, padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
              placeholder="N"
            />
          )}
        </div>
      </div>

      {/* Frame End */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Frame End:</label>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={windowConfig.frameEnd || "CURRENT ROW"}
            onChange={(e) => updateWindow({ frameEnd: e.target.value })}
            style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
          >
            {Object.keys(FRAME_BOUNDARIES).map(boundary => (
              <option key={boundary} value={boundary}>{boundary}</option>
            ))}
          </select>
          {(windowConfig.frameEnd === "N PRECEDING" || windowConfig.frameEnd === "N FOLLOWING") && (
            <input
              type="number"
              min="1"
              value={windowConfig.frameEndValue || 1}
              onChange={(e) => updateWindow({ frameEndValue: parseInt(e.target.value) || 1 })}
              style={{ width: 80, padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
              placeholder="N"
            />
          )}
        </div>
      </div>

      {/* Alias */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Alias:</label>
        <input
          type="text"
          value={windowConfig.alias || ""}
          onChange={(e) => updateWindow({ alias: e.target.value })}
          placeholder="e.g. running_total, row_rank"
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
        />
      </div>

      {/* Preview */}
      <div style={{ marginTop: 16, padding: 12, backgroundColor: "#f0f0f0", borderRadius: 4 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>SQL Preview:</label>
        <code style={{ fontSize: 12, color: "#333" }}>
          {generateWindowFunctionPreview(windowConfig, dimensionFields, [], [])}
        </code>
      </div>
    </div>
  );
};

/* ----------------- Window Function Preview Generator ----------------- */
const generateWindowFunctionPreview = (w, _dimensionFields = [], _columnsSlot = [], _rows = []) => {
  if (!w.fn) return "SELECT ... -- Configure function first";

  let expr = w.fn;

  // Add target field for aggregate functions
  if (["SUM", "AVG", "COUNT", "MAX", "MIN", "STDDEV", "VARIANCE"].includes(w.fn) && w.targetField) {
    expr += `(${w.targetField})`;
  } else if (["LAG", "LEAD"].includes(w.fn)) {
    expr += `(${w.targetField || "field"}, ${w.offsetValue || 1})`;
  } else if (w.fn === "NTILE") {
    expr += `(${w.offsetValue || 4})`;
  } else if (!["SUM", "AVG", "COUNT", "MAX", "MIN", "STDDEV", "VARIANCE"].includes(w.fn)) {
    expr += "()";
  }

  // Add direction comment
  if (w.direction) {
    expr = `/* ${w.direction} */ ` + expr;
  }

  expr += " OVER (";

  const parts = [];

  // Use manual partition if specified, otherwise none (preview simplified)
  const partitionFields = (w.partitionBy && w.partitionBy.length > 0) ? w.partitionBy : [];

  if (partitionFields.length > 0) {
    parts.push(`PARTITION BY ${partitionFields.join(", ")}`);
  }

  // Order By
  if (w.orderBy && w.orderBy.length > 0) {
    const orderClauses = w.orderBy.map(o => `${o.field} ${o.direction || "ASC"}`);
    parts.push(`ORDER BY ${orderClauses.join(", ")}`);
  }

  expr += parts.join(" ");

  // Frame specification with proper handling - only add frame if ORDER BY exists
  const hasOrder = w.orderBy && w.orderBy.length > 0;

  if (hasOrder && w.frameType && w.frameStart && w.frameEnd) {
    let frameSpec = ` ${w.frameType} BETWEEN `;

    if (w.frameStart === "N PRECEDING") {
      frameSpec += `${w.frameStartValue || 1} PRECEDING`;
    } else if (w.frameStart === "N FOLLOWING") {
      frameSpec += `${w.frameStartValue || 1} FOLLOWING`;
    } else {
      frameSpec += w.frameStart;
    }

    frameSpec += " AND ";

    if (w.frameEnd === "N PRECEDING") {
      frameSpec += `${w.frameEndValue || 1} PRECEDING`;
    } else if (w.frameEnd === "N FOLLOWING") {
      frameSpec += `${w.frameEndValue || 1} FOLLOWING`;
    } else {
      frameSpec += w.frameEnd;
    }

    expr += frameSpec;
  }

  expr += ")";

  if (w.alias) {
    expr += ` AS ${w.alias}`;
  }

  return expr;
};

/* ----------------- Join Builder ----------------- */
const JoinBuilder = ({ selectedTables, tableColumnsMap, joins, setJoins, baseTable, setBaseTable }) => {
  const tableOptions = selectedTables.map((t) => ({ label: t, value: t }));
  const joinTypes = ["INNER", "LEFT", "RIGHT", "FULL"];

  const addJoin = () => {
    const candidates = selectedTables.filter((t) => t !== baseTable);
    const rightTable = candidates[candidates.length - 1] || selectedTables[1] || "";
    setJoins((prev) => [
      ...prev,
      {
        type: "INNER",
        leftTable: baseTable || selectedTables[0] || "",
        leftColumn: "",
        rightTable: rightTable || "",
        rightColumn: "",
      },
    ]);
  };

  const updateJoin = (idx, patch) => {
    setJoins((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], ...patch };
      if (patch.leftTable) arr[idx].leftColumn = "";
      if (patch.rightTable) arr[idx].rightColumn = "";
      return arr;
    });
  };

  const removeJoin = (idx) => setJoins((prev) => prev.filter((_, i) => i !== idx));

  const columnsFor = (table) => tableColumnsMap[table] || [];

  return (
    <div style={{ padding: 15, border: "1px solid #ddd", borderRadius: 8 }}>
      <h4>Tables & Joins</h4>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
        <div>
          <label style={{ fontWeight: 600 }}>Selected Tables</label>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            {selectedTables.length ? selectedTables.join(", ") : "None"}
          </div>
        </div>
        <div>
          <label style={{ fontWeight: 600 }}>Base Table</label>
          <SingleSelectCombobox
            options={tableOptions}
            value={baseTable}
            onChange={setBaseTable}
            placeholder="Pick base table"
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontWeight: 600 }}>Joins</label>
          <button
            onClick={addJoin}
            disabled={!baseTable || selectedTables.length < 2}
            style={{
              padding: "6px 12px",
              backgroundColor: !baseTable || selectedTables.length < 2 ? "#6c757d" : "#28a745",
              color: "#fff",
              border: 0,
              borderRadius: 4,
              cursor: !baseTable || selectedTables.length < 2 ? "not-allowed" : "pointer",
            }}
          >
            + Add Join
          </button>
        </div>

        {joins.length === 0 ? (
          <div style={{ marginTop: 8, color: "#666", fontStyle: "italic" }}>
            No joins added. If you select multiple tables, add at least one join.
          </div>
        ) : (
          joins.map((j, idx) => (
            <div
              key={`join-${idx}`}
              style={{
                marginTop: 10,
                padding: 10,
                border: "1px solid #eee",
                borderRadius: 6,
                background: "#fafafa",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                <select
                  value={j.type}
                  onChange={(e) => updateJoin(idx, { type: e.target.value })}
                  style={{ padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
                >
                  {joinTypes.map((t) => (
                    <option key={t} value={t}>{t} JOIN</option>
                  ))}
                </select>

                <SingleSelectCombobox
                  options={tableOptions}
                  value={j.leftTable}
                  onChange={(v) => updateJoin(idx, { leftTable: v })}
                  placeholder="Left table"
                />
                <SingleSelectCombobox
                  options={(columnsFor(j.leftTable) || []).map((c) => ({ label: c, value: c }))}
                  value={j.leftColumn}
                  onChange={(v) => updateJoin(idx, { leftColumn: v })}
                  placeholder="Left column"
                />

                <SingleSelectCombobox
                  options={tableOptions}
                  value={j.rightTable}
                  onChange={(v) => updateJoin(idx, { rightTable: v })}
                  placeholder="Right table"
                />
                <SingleSelectCombobox
                  options={(columnsFor(j.rightTable) || []).map((c) => ({ label: c, value: c }))}
                  value={j.rightColumn}
                  onChange={(v) => updateJoin(idx, { rightColumn: v })}
                  placeholder="Right column"
                />

                <button
                  onClick={() => removeJoin(idx)}
                  style={{ marginLeft: 8, color: "#fff", background: "#dc3545", border: 0, borderRadius: 4, padding: "6px 10px" }}
                >
                  Remove
                </button>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
                ON {j.leftTable && j.leftColumn ? `\`${j.leftTable}\`.\`${j.leftColumn}\`` : "(left)"} = {j.rightTable && j.rightColumn ? `\`${j.rightTable}\`.\`${j.rightColumn}\`` : "(right)"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* ----------------- Multi-Level Nested Query Builder ----------------- */
const MultiLevelNestedQueryBuilder = ({ queryConfig, onChange, dimensionFields, measureFields, _selectedTables, baseTable }) => {
  const defaultCfg = {
    levels: [
      {
        id: 1,
        name: "Base Query",
        select: [],
        from: "",
        where: [],
        groupBy: [],
        having: [],
        orderBy: [],
        limit: 100,
        isSubquery: false,
        windows: [],
      }
    ],
    activeLevel: 1,
  };

  const [cfg, setCfg] = useState(queryConfig || defaultCfg);

  useEffect(() => onChange(cfg), [cfg, onChange]);

  // Clean invalid references when fields change
  useEffect(() => {
    const allFields = [...new Set([...dimensionFields, ...measureFields])];
    setCfg(prev => ({
      ...prev,
      levels: prev.levels.map(level => ({
        ...level,
        select: level.select.filter(field => allFields.includes(field)),
        groupBy: level.groupBy.filter(field => dimensionFields.includes(field)),
        orderBy: level.orderBy.filter(order => allFields.includes(order.field)),
        windows: (level.windows || []).filter(w => {
          const targetOk = !w.targetField || allFields.includes(w.targetField);
          const partsOk = (w.partitionBy || []).every(f => allFields.includes(f));
          const ordersOk = (w.orderBy || []).every(o => allFields.includes(o.field));
          const lodOk = (w.lodFields || []).every(f => dimensionFields.includes(f));
          return targetOk && partsOk && ordersOk && lodOk;
        })
      }))
    }));
  }, [dimensionFields, measureFields]);

  const set = (patch) => setCfg((prev) => ({ ...prev, ...patch }));
  const allFields = [...new Set([...dimensionFields, ...measureFields])];

  const updateLevel = (levelId, patch) => {
    setCfg(prev => ({
      ...prev,
      levels: prev.levels.map(level =>
        level.id === levelId ? { ...level, ...patch } : level
      )
    }));
  };

  const addLevel = () => {
    const newId = Math.max(...cfg.levels.map(l => l.id)) + 1;
    setCfg(prev => ({
      ...prev,
      levels: [...prev.levels, {
        id: newId,
        name: `Level ${newId}`,
        select: [],
        from: `(SELECT * FROM level_${newId - 1})`,
        where: [],
        groupBy: [],
        having: [],
        orderBy: [],
        limit: 100,
        isSubquery: true,
        windows: [],
      }],
      activeLevel: newId,
    }));
  };

  const removeLevel = (levelId) => {
    if (cfg.levels.length <= 1) return;
    setCfg(prev => ({
      ...prev,
      levels: prev.levels.filter(l => l.id !== levelId),
      activeLevel: prev.activeLevel === levelId ? prev.levels[0].id : prev.activeLevel,
    }));
  };

  const toggleInArray = (levelId, key, value) => {
    const level = cfg.levels.find(l => l.id === levelId);
    if (!level) return;
    const newArray = level[key].includes(value)
      ? level[key].filter(v => v !== value)
      : [...level[key], value];
    updateLevel(levelId, { [key]: newArray });
  };

  const addCondition = (levelId, key) => {
    const level = cfg.levels.find(l => l.id === levelId);
    if (!level) return;
    updateLevel(levelId, { [key]: [...level[key], ""] });
  };

  const updateCondition = (levelId, key, idx, val) => {
    const level = cfg.levels.find(l => l.id === levelId);
    if (!level) return;
    const arr = [...level[key]];
    arr[idx] = val;
    updateLevel(levelId, { [key]: arr });
  };

  const removeCondition = (levelId, key, idx) => {
    const level = cfg.levels.find(l => l.id === levelId);
    if (!level) return;
    const arr = [...level[key]];
    arr.splice(idx, 1);
    updateLevel(levelId, { [key]: arr });
  };

  const addOrderBy = (levelId) => {
    const level = cfg.levels.find(l => l.id === levelId);
    if (!level) return;
    updateLevel(levelId, {
      orderBy: [...level.orderBy, { field: "", direction: "ASC" }]
    });
  };

  const updateOrderBy = (levelId, idx, patch) => {
    const level = cfg.levels.find(l => l.id === levelId);
    if (!level) return;
    const arr = [...level.orderBy];
    arr[idx] = { ...arr[idx], ...patch };
    updateLevel(levelId, { orderBy: arr });
  };

  const removeOrderBy = (levelId, idx) => {
    const level = cfg.levels.find(l => l.id === levelId);
    if (!level) return;
    const arr = [...level.orderBy];
    arr.splice(idx, 1);
    updateLevel(levelId, { orderBy: arr });
  };

  const addWindow = (levelId) => {
    const level = cfg.levels.find(l => l.id === levelId);
    if (!level) return;
    updateLevel(levelId, {
      windows: [...(level.windows || []), {
        direction: "Window Down",
        functionCategory: "Aggregate",
        fn: "SUM",
        targetField: "",
        partitionBy: [],
        orderBy: [],
        frameType: "ROWS",
        frameStart: "UNBOUNDED PRECEDING",
        frameEnd: "CURRENT ROW",
        lodScope: "INCLUDE",
        lodFields: [],
        alias: ""
      }]
    });
  };

  const updateWindow = (levelId, windowIdx, patch) => {
    const level = cfg.levels.find(l => l.id === levelId);
    if (!level) return;
    const windows = [...(level.windows || [])];
    windows[windowIdx] = { ...windows[windowIdx], ...patch };
    updateLevel(levelId, { windows });
  };

  const removeWindow = (levelId, windowIdx) => {
    const level = cfg.levels.find(l => l.id === levelId);
    if (!level) return;
    const windows = [...(level.windows || [])];
    windows.splice(windowIdx, 1);
    updateLevel(levelId, { windows });
  };

  const _activeLevel = cfg.levels.find(l => l.id === cfg.activeLevel) || cfg.levels[0];

  const resetBuilder = () => {
    setCfg(defaultCfg);
  };

  const renderLevelBuilder = (level) => (
    <div key={level.id} style={{
      marginTop: 15,
      padding: 15,
      border: level.id === cfg.activeLevel ? "2px solid #007bff" : "1px solid #ddd",
      borderRadius: 8,
      backgroundColor: level.id === cfg.activeLevel ? "#f8f9ff" : "#fff"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h5 style={{ margin: 0 }}>
          {level.name} {level.isSubquery && "(Subquery)"}
        </h5>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => set({ activeLevel: level.id })}
            style={{
              padding: "4px 8px",
              backgroundColor: level.id === cfg.activeLevel ? "#007bff" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            {level.id === cfg.activeLevel ? "Active" : "Select"}
          </button>
          {cfg.levels.length > 1 && (
            <button
              onClick={() => removeLevel(level.id)}
              style={{
                padding: "4px 8px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {level.id === cfg.activeLevel && (
        <>
          {level.isSubquery && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontWeight: 600 }}>FROM (Subquery Reference):</label>
              <input
                value={level.from}
                onChange={(e) => updateLevel(level.id, { from: e.target.value })}
                placeholder="(SELECT * FROM previous_level)"
                style={{ width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 6, marginTop: 4 }}
              />
            </div>
          )}

          {/* SELECT */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontWeight: 600 }}>Select columns:</label>
            {allFields.length === 0 ? (
              <div style={{ color: "#999", fontStyle: "italic", marginTop: 6 }}>
                No fields available. Please select tables and joins first.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {allFields.map((f) => {
                  const selected = level.select.includes(f);
                  return (
                    <button
                      key={`sel-${level.id}-${f}`}
                      onClick={() => toggleInArray(level.id, "select", f)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: selected ? "1px solid #007bff" : "1px solid #ddd",
                        background: selected ? "#e6f0ff" : "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ADVANCED WINDOW FUNCTIONS */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontWeight: 600 }}>Advanced Window Functions:</label>
              <button
                onClick={() => addWindow(level.id)}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                + Add Window Function
              </button>
            </div>

            {(level.windows || []).map((w, i) => (
              <div key={`win-${level.id}-${i}`} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <h6 style={{ margin: 0 }}>Window Function #{i + 1}</h6>
                  <button
                    onClick={() => removeWindow(level.id, i)}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    Remove
                  </button>
                </div>
                <AdvancedWindowFunctionBuilder
                  windowConfig={w}
                  onChange={(newConfig) => updateWindow(level.id, i, newConfig)}
                  allFields={allFields}
                  dimensionFields={dimensionFields}
                  measureFields={measureFields}
                />
              </div>
            ))}
          </div>

          {/* WHERE */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontWeight: 600 }}>WHERE conditions:</label>
            {level.where.map((c, i) => (
              <div key={`w-${level.id}-${i}`} style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  value={c}
                  onChange={(e) => updateCondition(level.id, "where", i, e.target.value)}
                  placeholder={`e.g. \`${(baseTable || "table")}\`.\`id\` = 1`}
                  style={{ flex: 1, padding: 6, border: "1px solid #ddd", borderRadius: 6, fontSize: 12 }}
                />
                <button
                  onClick={() => removeCondition(level.id, "where", i)}
                  style={{ color: "red", fontSize: 12, padding: "4px 8px" }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => addCondition(level.id, "where")}
              style={{ marginTop: 6, fontSize: 12, padding: "4px 8px" }}
            >
              + Add WHERE
            </button>
          </div>

          {/* GROUP BY */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontWeight: 600 }}>Group by:</label>
            {dimensionFields.length === 0 ? (
              <div style={{ color: "#999", fontStyle: "italic", marginTop: 6 }}>
                No dimension fields available.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {dimensionFields.map((f) => {
                  const selected = level.groupBy.includes(f);
                  return (
                    <button
                      key={`gb-${level.id}-${f}`}
                      onClick={() => toggleInArray(level.id, "groupBy", f)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: selected ? "1px solid #007bff" : "1px solid #ddd",
                        background: selected ? "#e6f0ff" : "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* HAVING */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontWeight: 600 }}>HAVING conditions:</label>
            {level.having.map((c, i) => (
              <div key={`h-${level.id}-${i}`} style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  value={c}
                  onChange={(e) => updateCondition(level.id, "having", i, e.target.value)}
                  placeholder={`e.g. SUM(\`orders\`.\`total\`) > 1000`}
                  style={{ flex: 1, padding: 6, border: "1px solid #ddd", borderRadius: 6, fontSize: 12 }}
                />
                <button
                  onClick={() => removeCondition(level.id, "having", i)}
                  style={{ color: "red", fontSize: 12, padding: "4px 8px" }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => addCondition(level.id, "having")}
              style={{ marginTop: 6, fontSize: 12, padding: "4px 8px" }}
            >
              + Add HAVING
            </button>
          </div>

          {/* ORDER BY */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontWeight: 600 }}>ORDER BY:</label>
            {level.orderBy.map((o, i) => (
              <div key={`ob-${level.id}-${i}`} style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <select
                  value={o.field}
                  onChange={(e) => updateOrderBy(level.id, i, { field: e.target.value })}
                  style={{ padding: 6, borderRadius: 6, border: "1px solid #ddd", fontSize: 12 }}
                >
                  <option value="">Select field</option>
                  {allFields.map((f) => (
                    <option key={`obf-${level.id}-${f}`} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <select
                  value={o.direction || "ASC"}
                  onChange={(e) => updateOrderBy(level.id, i, { direction: e.target.value })}
                  style={{ width: 120, padding: 6, borderRadius: 6, border: "1px solid #ddd", fontSize: 12 }}
                >
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </select>
                <button
                  onClick={() => removeOrderBy(level.id, i)}
                  style={{ color: "red", fontSize: 12, padding: "4px 8px" }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => addOrderBy(level.id)}
              style={{ marginTop: 6, fontSize: 12, padding: "4px 8px" }}
            >
              + Add ORDER BY
            </button>
          </div>

          {/* LIMIT */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontWeight: 600 }}>LIMIT:</label>
            <input
              type="number"
              min={0}
              value={level.limit ?? 100}
              onChange={(e) => updateLevel(level.id, { limit: Number(e.target.value) })}
              style={{ marginLeft: 8, padding: 6, borderRadius: 6, border: "1px solid #ddd", width: 120, fontSize: 12 }}
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ fontWeight: 600 }}>Query Levels ({cfg.levels.length}):</label>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={resetBuilder}
            style={{
              padding: "6px 12px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "1px solid #ddd",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
            }}
            title="Reset builder to default"
          >
            Clear Builder
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {cfg.levels.map(level => (
          <button
            key={level.id}
            onClick={() => set({ activeLevel: level.id })}
            style={{
              padding: "6px 12px",
              backgroundColor: level.id === cfg.activeLevel ? "#007bff" : "#f8f9fa",
              color: level.id === cfg.activeLevel ? "white" : "black",
              border: "1px solid #ddd",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {level.name}
          </button>
        ))}
      </div>

      <div style={{ maxHeight: 600, overflowY: "auto" }}>
        {cfg.levels.map(renderLevelBuilder)}
      </div>

      <div style={{ marginTop: 12, padding: 10, backgroundColor: "#f8f9fa", borderRadius: 6 }}>
        <small style={{ color: "#666" }}>
          <strong>Structure:</strong> {cfg.levels.length} level(s) — Base + {Math.max(0, cfg.levels.length - 1)} nested
        </small>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
        <button
          onClick={addLevel}
          disabled={allFields.length === 0 || !baseTable}
          style={{
            padding: "8px 16px",
            backgroundColor: (allFields.length === 0 || !baseTable) ? "#6c757d" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: (allFields.length === 0 || !baseTable) ? "not-allowed" : "pointer",
          }}
        >
          + Add Level
        </button>
      </div>
    </div>
  );
};

/* ----------------- SQL Popup ----------------- */
const SqlPopup = ({ visible, sql, onClose, onExecute }) => {
  if (!visible) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", padding: 20, borderRadius: 8, width: "800px", maxWidth: "90%", maxHeight: "80vh", overflow: "auto" }}
      >
        <h3>Generated Multi-Level Nested SQL</h3>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#f6f6f6",
            padding: 12,
            borderRadius: 6,
            maxHeight: 500,
            overflow: "auto",
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
{sql}
        </pre>
        <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
          <button
            onClick={() => navigator.clipboard.writeText(sql)}
            style={{ padding: "8px 16px", background: "#28a745", color: "#fff", borderRadius: 6, border: 0 }}
          >
            Copy SQL
          </button>
          <button
            onClick={onExecute}
            style={{ padding: "8px 16px", background: "#007bff", color: "#fff", borderRadius: 6, border: 0 }}
          >
            Execute & Show Results
          </button>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "#6c757d", color: "#fff", borderRadius: 6, border: 0 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ----------------- Utility ----------------- */
const qid = (id) => `\`${id}\``;
const qtc = (table, col) => `${qid(table)}.${qid(col)}`;

/* ----------------- DnD Field ----------------- */
const Field = ({ field }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.FIELD,
    item: { field },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [field]);

  return (
    <div
      ref={drag}
      style={{
        padding: 8,
        margin: 4,
        backgroundColor: isDragging ? "#e3f2fd" : "#f5f5f5",
        border: "1px solid #ddd",
        borderRadius: 4,
        cursor: "move",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
      title={field.source ? `Source: ${field.source}` : ""}
    >
      <span style={{ display: "flex", alignItems: "center" }}>
        <span style={{ marginRight: 8 }}>{icons[field.type] || "🔹"}</span>
        <span>{field.name}</span>
        {field.measureType && (
          <span style={{ fontSize: "0.8em", color: "#666", marginLeft: 8 }}>({field.measureType})</span>
        )}
      </span>
      {field.source && <span style={{ fontSize: "0.75em", color: "#888" }}>{field.source}</span>}
    </div>
  );
};

/* ----------------- DnD Slot ----------------- */
const Slot = ({ title, items, onDropField, className, onRemoveField }) => {
  const [, drop] = useDrop({
    accept: ItemTypes.FIELD,
    drop: (item) => {
      if (!items.find((f) => f.name === item.field.name)) onDropField(item.field);
    },
  }, [items, onDropField]);

  return (
    <div
      ref={drop}
      className={className || ""}
      style={{
        minHeight: 90,
        padding: 10,
        margin: 10,
        border: "2px dashed #ddd",
        borderRadius: 8,
        backgroundColor: "#fafafa",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 10 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ color: "#999", fontStyle: "italic" }}>Drop fields here</div>
      ) : (
        items.map((field, idx) => (
          <div
            key={`${field.name}-${field.source || "local"}-${idx}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 6,
              margin: "4px 0",
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: 4,
            }}
          >
            <span>{icons[field.type]} {field.name}</span>
            {onRemoveField && (
              <button
                onClick={() => onRemoveField(field)}
                style={{ background: "transparent", border: "none", color: "red", cursor: "pointer", fontSize: 16 }}
              >
                ×
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

/* ----------------- Helper: Quarter extraction ----------------- */
const extractQuarterLabel = (value) => {
  if (!value && value !== 0) return "";
  const s = String(value);
  if (/Q[1-4]/i.test(s)) {
    const matchYear = s.match(/(20\d{2})/);
    const matchQ = s.match(/(Q[1-4])/i);
    return `${matchQ ? matchQ[0].toUpperCase() : "Q1"}${matchYear ? ` ${matchYear[0]}` : ""}`.trim();
  }
  const d = new Date(s);
  if (!isNaN(d)) {
    const month = d.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const year = d.getFullYear();
    return `Q${quarter} ${year}`;
  }
  return s;
};

/* ----------------- Graphlet Collection (Small Multiples) ----------------- */
const GraphletCollection = ({ chartType, data, partitionKey, xKey, yKey, apiData = [], calcConfig }) => {
  const chartData = apiData.length > 0 ? apiData : data;

  // Helper: resolve an actual key that exists on rows given a selected field name
  const resolveDataKey = (sampleRow, selectedFieldName) => {
    if (!sampleRow || !selectedFieldName) return selectedFieldName;
    // If exact match present
    if (Object.prototype.hasOwnProperty.call(sampleRow, selectedFieldName)) return selectedFieldName;
    // If dotted name, try last segment
    if (selectedFieldName.includes(".")) {
      const last = selectedFieldName.split(".").slice(-1)[0];
      if (Object.prototype.hasOwnProperty.call(sampleRow, last)) return last;
    }
    // Try any key that contains the last segment
    const seg = selectedFieldName.includes(".") ? selectedFieldName.split(".").slice(-1)[0] : selectedFieldName;
    const keys = Object.keys(sampleRow || {});
    const found = keys.find(k => k === seg || k.endsWith(`.${seg}`) || k.includes(seg));
    return found || selectedFieldName;
  };

  const groupBy = (array, keyFn) => {
    return array.reduce((groups, item) => {
      const key = typeof keyFn === "function" ? keyFn(item) : item[keyFn];
      const k = (key === undefined || key === null) ? "__undefined__" : String(key);
      if (!groups[k]) {
        groups[k] = [];
      }
      groups[k].push(item);
      return groups;
    }, {});
  };

  // If no partitionKey specified, render single chart
  if (!partitionKey || !chartData || chartData.length === 0) {
    return (
      <div style={{ padding: 10 }}>
        <ChartRenderer chartType={chartType} data={chartData} xKey={xKey} yKey={yKey} apiData={apiData} calcConfig={calcConfig} />
      </div>
    );
  }

  const sample = chartData[0] || {};
  const resolvedPartitionKey = resolveDataKey(sample, partitionKey);

  const groups = groupBy(chartData, (row) => {
    // use resolved key for grouping, fall back to empty string
    return row[resolvedPartitionKey] ?? row[partitionKey] ?? "";
  });

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: 20,
      padding: 10
    }}>
      {Object.entries(groups).map(([val, subset]) => (
        <div key={val} style={{
          border: "1px solid #ddd",
          padding: 10,
          borderRadius: 8,
          backgroundColor: "#fff"
        }}>
          <h4 style={{
            margin: "0 0 10px 0",
            fontSize: 14,
            fontWeight: 600,
            color: "#333",
            textAlign: "center",
            borderBottom: "1px solid #eee",
            paddingBottom: 8
          }}>
            {partitionKey}: {val === "__undefined__" ? "(null)" : val}
          </h4>
          <ChartRenderer
            chartType={chartType}
            data={subset}
            xKey={xKey}
            yKey={yKey}
            apiData={[]}
            calcConfig={calcConfig}
          />
        </div>
      ))}
    </div>
  );
};

/* ----------------- Chart Renderer ----------------- */
const ChartRenderer = ({ chartType, data, xKey, yKey, apiData = [], calcConfig = {} }) => {
  const chartData = apiData.length > 0 ? apiData : data || [];

  // Utility: find actual key in a sample row for a selected field name (handles table.col)
  const findKeyFor = (sampleRow, selectedName) => {
    if (!sampleRow || !selectedName) return selectedName;
    if (Object.prototype.hasOwnProperty.call(sampleRow, selectedName)) return selectedName;
    if (selectedName.includes(".")) {
      const last = selectedName.split(".").slice(-1)[0];
      if (Object.prototype.hasOwnProperty.call(sampleRow, last)) return last;
    }
    // try fuzzy matches
    const seg = selectedName.includes(".") ? selectedName.split(".").slice(-1)[0] : selectedName;
    const keys = Object.keys(sampleRow || {});
    const found = keys.find(k => k === seg || k.endsWith(`.${seg}`) || k.includes(seg));
    return found || selectedName;
  };

  // Safely get value from row for a selected field name
  const getValue = (row, selectedName, sampleRow) => {
    const key = findKeyFor(sampleRow || row, selectedName);
    // If key is dotted but not in row, attempt last segment
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
    if (key.includes(".")) {
      const last = key.split(".").slice(-1)[0];
      if (Object.prototype.hasOwnProperty.call(row, last)) return row[last];
    }
    // fallback to direct lookup
    return row[selectedName] ?? row[key] ?? undefined;
  };

  // TABLE view (unchanged behavior, but safer value access)
  if (chartType === "table") {
    if (!chartData || chartData.length === 0) {
      return (
        <div style={{ padding: 40, textAlign: "center", color: "#666", border: "2px dashed #ddd", borderRadius: 8 }}>
          No data to display
        </div>
      );
    }

    const headers = Object.keys(chartData[0] || {});
    return (
      <div style={{ width: "100%", overflowX: "auto" }}>
        <table style={{ minWidth: "100%", backgroundColor: "white", border: "1px solid #ddd", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f8f9fa" }}>
            <tr>
              {headers.map((key) => (
                <th key={key} style={{ padding: 12, borderBottom: "1px solid #ddd", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#374151" }}>
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.slice(0, 1000).map((row, index) => (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#f8f9fa" : "white" }}>
                {headers.map((key, cellIndex) => (
                  <td key={cellIndex} style={{ padding: 12, borderBottom: "1px solid #ddd", fontSize: 14, color: "#1f2937" }}>
                    {String(getValue(row, key, chartData[0]) ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // For charts, require xKey and yKey (selected field names)
  if (!xKey || !yKey || !chartData || chartData.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666", border: "2px dashed #ddd", borderRadius: 8 }}>
        Please drag fields to Columns and Rows to display data
      </div>
    );
  }

  const sample = chartData[0] || {};
  const _xDataKey = findKeyFor(sample, xKey);
  const _yDataKey = findKeyFor(sample, yKey);

  // Process data: aggregate by xKey (Quarter), then apply running total if requested.
  const processDataForChart = () => {
    const {
      calculation = "SUM",
      cumulative = false,
      frameType = "EXPANDING", // EXPANDING or FIXED
      frameSize = 0,
      direction = "FORWARD",
      lodScope = "INCLUDE",
      _lodFields = [],
      originalData = [],
    } = calcConfig || {};

    const sourceData = (lodScope === "FIXED" && originalData && originalData.length > 0) ? originalData : chartData;

    // Step 1: transform xKey to Quarter label
    const transformed = sourceData.map((r) => {
      const rawX = getValue(r, xKey, sample);
      const rawY = Number(getValue(r, yKey, sample)) || 0;
      return {
        __quarter__: extractQuarterLabel(rawX),
        __xRaw__: rawX,
        __yRaw__: rawY,
      };
    }).filter(r => r.__quarter__ !== "");

    // Step 2: aggregate by Quarter label (apply selected calculation)
    const mapAgg = new Map();
    transformed.forEach((row) => {
      const key = row.__quarter__;
      if (!mapAgg.has(key)) mapAgg.set(key, []);
      mapAgg.get(key).push(row.__yRaw__);
    });

    const arr = Array.from(mapAgg.entries()).map(([k, arrVals]) => {
      let val = 0;
      switch ((calculation || "SUM").toUpperCase()) {
        case "SUM":
          val = arrVals.reduce((s, v) => s + v, 0);
          break;
        case "AVG":
          val = arrVals.length ? arrVals.reduce((s, v) => s + v, 0) / arrVals.length : 0;
          break;
        case "COUNT":
          val = arrVals.length;
          break;
        case "MAX":
          val = arrVals.length ? Math.max(...arrVals) : 0;
          break;
        case "MIN":
          val = arrVals.length ? Math.min(...arrVals) : 0;
          break;
        case "STDDEV":
        case "VARIANCE":
          // approximate variance/stddev
          if (arrVals.length === 0) { val = 0; break; }
          const mean = arrVals.reduce((s, v) => s + v, 0) / arrVals.length;
          const variance = arrVals.reduce((s, v) => s + (v - mean) ** 2, 0) / arrVals.length;
          val = (calculation === "STDDEV") ? Math.sqrt(variance) : variance;
          break;
        default:
          val = arrVals.reduce((s, v) => s + v, 0);
      }
      return ({ [xKey]: k, [yKey]: val });
    });

    // Helper: sort quarter strings like "Q1 2023"
    const quarterSortKey = (qLabel) => {
      if (!qLabel) return 0;
      const m = qLabel.match(/Q([1-4])\s*(20\d{2})?/i);
      if (m) {
        const q = Number(m[1]);
        const y = Number(m[2] || 0);
        return y * 10 + q;
      }
      return qLabel;
    };

    arr.sort((a, b) => {
      const ka = quarterSortKey(a[xKey]);
      const kb = quarterSortKey(b[xKey]);
      if (typeof ka === "number" && typeof kb === "number") return ka - kb;
      return String(ka).localeCompare(String(kb));
    });

    if (!cumulative) return arr.map(d => ({ ...d }));

    const result = [];
    for (let i = 0; i < arr.length; i++) {
      let sum = 0;
      if (frameType === "EXPANDING" || frameSize <= 0) {
        if (direction === "FORWARD") {
          for (let j = 0; j <= i; j++) sum += arr[j][yKey];
        } else {
          for (let j = i; j < arr.length; j++) sum += arr[j][yKey];
        }
      } else {
        if (direction === "FORWARD") {
          const start = Math.max(0, i - (frameSize - 1));
          for (let j = start; j <= i; j++) sum += arr[j][yKey];
        } else {
          const end = Math.min(arr.length - 1, i + (frameSize - 1));
          for (let j = i; j <= end; j++) sum += arr[j][yKey];
        }
      }
      result.push({ [xKey]: arr[i][xKey], [yKey]: sum });
    }
    return result;
  };

  const processedData = processDataForChart();

  switch (chartType) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={processedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
          >
            <XAxis 
              dataKey={xKey} 
              angle={-45} 
              textAnchor="end" 
              interval={0} 
              height={60} 
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={yKey} fill="#8884d8" maxBarSize={50} />
          </BarChart>
        </ResponsiveContainer>
      );
    case "line":
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={yKey} stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      );
    case "pie":
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={processedData} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    default:
      return <div>Select a chart type</div>;
  }
};

/* ----------------- API Integration (Popup content) ----------------- */
const APIIntegration = ({
  selectedTables,
  setSelectedTables,
  baseTable,
  setBaseTable,
  joinGraph,
  setJoinGraph,
  onDataLoad,
  onTablesLoad,
  onColumnsMapLoad,
  apiBase = "https://intelligentsalesman.com/ism1/API/tableu"
}) => {
  const [tables, setTables] = useState([]);
  const [columnsMap, setColumnsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("");

  useEffect(() => { 
    fetchTables(); 
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const run = async () => {
      const map = {};
      for (const t of selectedTables) {
        map[t] = await fetchColumns(t);
      }
      setColumnsMap(map);
      onColumnsMapLoad(map);
    };
    if (selectedTables && selectedTables.length) run();
    else {
      setColumnsMap({});
      onColumnsMapLoad({});
    }
    // eslint-disable-next-line
  }, [JSON.stringify(selectedTables)]);

  const fetchTables = async () => {
    try {
      const res = await fetch(`${apiBase}/tables.php`);
      const data = await res.json();
      const list = data.tables || [];
      setTables(list);
      onTablesLoad(list);
    } catch {
      const mockTables = ["users", "orders", "products", "categories"];
      setTables(mockTables);
      onTablesLoad(mockTables);
    }
  };

  const fetchColumns = async (tableName) => {
    try {
      const res = await fetch(`${apiBase}/columns.php?table=${encodeURIComponent(tableName)}`);
      const data = await res.json();
      return data.columns || [];
    } catch {
      const mock = {
        users: ["id", "name", "email", "created_at", "status"],
        orders: ["id", "user_id", "total", "status", "created_at"],
        products: ["id", "name", "price", "category_id", "stock"],
        categories: ["id", "name", "description"],
      };
      return mock[tableName] || [];
    }
  };

  const executeQuery = async () => {
    const query = (sqlQuery || "").replace(/;+\s*$/g, "");
    if (!query.trim()) {
      alert("Please enter a SQL query");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/execute_query.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.success) onDataLoad(data.data || []);
      else alert("Query execution failed: " + data.error);
    } catch {
      alert("Error executing query. Check console for details.");
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontWeight: 600 }}>Select Tables:</label>
        <div style={{ marginTop: 4 }}>
          <MultiSelectCombobox
            options={tables}
            value={selectedTables}
            onChange={(vals) => {
              setSelectedTables(vals);
              if (vals.length === 1) setBaseTable(vals[0]);
              if (vals.length === 0) setBaseTable("");
              setJoinGraph([]);
            }}
            placeholder="Choose one or more tables..."
          />
        </div>
      </div>

      {selectedTables.length > 0 && (
        <>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontWeight: 600 }}>Available Columns:</label>
            <div style={{ fontSize: 12, color: "#444", marginTop: 6 }}>
              {selectedTables.map((t) => (
                <div key={`cols-${t}`} style={{ marginTop: 4 }}>
                  <strong>{t}:</strong> {(columnsMap[t] || []).join(", ")}
                </div>
              ))}
            </div>
          </div>

          <JoinBuilder
            selectedTables={selectedTables}
            tableColumnsMap={columnsMap}
            joins={joinGraph}
            setJoins={setJoinGraph}
            baseTable={baseTable}
            setBaseTable={setBaseTable}
          />
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <label style={{ fontWeight: 600 }}>Custom SQL (optional quick run):</label>
        <textarea
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          placeholder={
            selectedTables.length
              ? `SELECT * FROM \`${baseTable || selectedTables[0]}\` LIMIT 100`
              : "SELECT * FROM table_name LIMIT 100"
          }
          style={{ width: "100%", height: 80, padding: 6, borderRadius: 4, marginTop: 4 }}
        />
        <button
          onClick={executeQuery}
          disabled={loading}
          style={{
            marginTop: 8,
            padding: "8px 12px",
            backgroundColor: loading ? "#6c757d" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Executing..." : "Execute Custom SQL"}
        </button>
      </div>
    </div>
  );
};

/* ----------------- Main App ----------------- */
const App = () => {
  const [fields, setFields] = useState([]);
  const [data, setData] = useState([]);
  const [apiData, setApiData] = useState([]);
  const [filters, setFilters] = useState([]);
  const [columnsSlot, setColumnsSlot] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedChart, setSelectedChart] = useState("table");
  const [partitionKey, setPartitionKey] = useState("");
  const [pendingConfig, setPendingConfig] = useState(null);

  const [_availableTables, setAvailableTables] = useState([]);
  const [tableColumnsMap, setTableColumnsMap] = useState({});
  const [selectedTables, setSelectedTables] = useState([]);
  const [baseTable, setBaseTable] = useState("");
  const [joinGraph, setJoinGraph] = useState([]);

  const [queryConfig, setQueryConfig] = useState(null);
  const [sqlPopupVisible, setSqlPopupVisible] = useState(false);
  const [generatedSql, setGeneratedSql] = useState("");

  const [showTablesPopup, setShowTablesPopup] = useState(false);
  const [showQueryPopup, setShowQueryPopup] = useState(false);

  const [calcConfig, setCalcConfig] = useState({
    calculation: "SUM",
    cumulative: true,
    frameType: "EXPANDING",
    frameSize: 0,
    direction: "FORWARD",
    lodScope: "INCLUDE",
    lodFields: [],
  });

  const [xField, setXField] = useState("");
  const [yField, setYField] = useState("");

  // Load initial mock fields/data
  useEffect(() => {
    const mockFields = [
      { name: "Product", type: "Dimension", source: "mock" },
      { name: "Region", type: "Dimension", source: "mock" },
      { name: "Sales", type: "Measure", measureType: "value", source: "mock" },
      { name: "Quantity", type: "Measure", measureType: "count", source: "mock" },
      { name: "Date", type: "Dimension", source: "mock" },
      { name: "Category", type: "Dimension", source: "mock" },
    ];
    setFields(mockFields);

    const mockData = [
      { Product: "A", Region: "North", Category: "Electronics", Sales: 1000, Quantity: 50, Date: "2023-01-01" },
      { Product: "B", Region: "South", Category: "Electronics", Sales: 1200, Quantity: 60, Date: "2023-04-01" },
      { Product: "C", Region: "East", Category: "Furniture", Sales: 800, Quantity: 20, Date: "2023-07-01" },
      { Product: "D", Region: "West", Category: "Furniture", Sales: 950, Quantity: 25, Date: "2023-10-01" },
      { Product: "A", Region: "North", Category: "Electronics", Sales: 1100, Quantity: 55, Date: "2024-01-01" },
      { Product: "B", Region: "South", Category: "Electronics", Sales: 1300, Quantity: 62, Date: "2024-04-01" },
    ];
    setData(mockData);
    setApiData(mockData);
  }, []);

  // Replace fields when selected tables/columns change
  useEffect(() => {
    if (selectedTables.length > 0 && Object.keys(tableColumnsMap).length > 0) {
      const apiFields = selectedTables.flatMap((table) =>
        (tableColumnsMap[table] || []).map((col) => ({
          name: `${table}.${col}`,
          type: isNumericColumn(col) ? "Measure" : "Dimension",
          measureType: isNumericColumn(col) ? "value" : undefined,
          source: table,
        }))
      );

      setFields(apiFields);

      const newNames = apiFields.map(f => f.name);
      setFilters(prev => prev.filter(f => newNames.includes(f.name)));
      setColumnsSlot(prev => prev.filter(f => newNames.includes(f.name)));
      setRows(prev => prev.filter(f => newNames.includes(f.name)));

      const measures = apiFields.filter(f => f.type === "Measure").map(f => f.name);
      if (!yField && measures.length > 0) setYField(measures[0]);
      const dims = apiFields.filter(f => f.type === "Dimension").map(f => f.name);
      if (!xField && dims.length > 0) setXField(dims[0]);

    } else if (selectedTables.length === 0) {
      const mockFields = [
        { name: "Product", type: "Dimension", source: "mock" },
        { name: "Region", type: "Dimension", source: "mock" },
        { name: "Sales", type: "Measure", measureType: "value", source: "mock" },
        { name: "Quantity", type: "Measure", measureType: "count", source: "mock" },
        { name: "Date", type: "Dimension", source: "mock" },
        { name: "Category", type: "Dimension", source: "mock" },
      ];
      setFields(mockFields);

      const mockNames = mockFields.map(f => f.name);
      setFilters(prev => prev.filter(f => mockNames.includes(f.name)));
      setColumnsSlot(prev => prev.filter(f => mockNames.includes(f.name)));
      setRows(prev => prev.filter(f => mockNames.includes(f.name)));

      if (!yField) setYField("Sales");
      if (!xField) setXField("Date");
    }
    // eslint-disable-next-line
  }, [JSON.stringify(selectedTables), JSON.stringify(tableColumnsMap)]);

  // ✅ Phase 2: apply visual state AFTER fields are ready
  useEffect(() => {
    if (!pendingConfig) return;
    if (fields.length === 0) return;

    const fieldNames = fields.map(f => f.name);

    const safe = (arr = []) =>
      arr.filter(f => fieldNames.includes(f.name));

    setFilters(safe(pendingConfig.filters));
    setColumnsSlot(safe(pendingConfig.columnsSlot));
    setRows(safe(pendingConfig.rows));

    setXField(pendingConfig.xField || "");
    setYField(pendingConfig.yField || "");
    setSelectedChart(pendingConfig.selectedChart || "table");
    setPartitionKey(pendingConfig.partitionKey || "");

    if (pendingConfig.calcConfig) {
      setCalcConfig(pendingConfig.calcConfig);
    }

    setPendingConfig(null);
  }, [fields, pendingConfig]);

  const isNumericColumn = (columnName) => {
    const numericKeywords = ["id", "price", "total", "amount", "quantity", "count", "sales", "revenue", "stock"];
    return numericKeywords.some((k) => columnName.toLowerCase().includes(k));
  };

  const handleDataLoad = (newData) => {
    setApiData(Array.isArray(newData) ? newData : []);
    setData(Array.isArray(newData) ? newData : []);
  };
  const handleTablesLoad = (tables) => setAvailableTables(tables);
  const handleColumnsMapLoad = (map) => setTableColumnsMap(map);

  const dimensionFields = React.useMemo(
    () => Array.from(new Set(fields.filter((f) => f.type === "Dimension").map((f) => f.name))),
    [fields]
  );
  const measureFields = React.useMemo(
    () => Array.from(new Set(fields.filter((f) => f.type === "Measure").map((f) => f.name))),
    [fields]
  );
  const _allFieldNames = React.useMemo(() => Array.from(new Set(fields.map((f) => f.name))), [fields]);

  const xKey = xField || (columnsSlot.find((f) => f.type === "Dimension")?.name) || (rows.find((f) => f.type === "Dimension")?.name) || "";
  const yKey = yField || (columnsSlot.find((f) => f.type === "Measure")?.name) || (rows.find((f) => f.type === "Measure")?.name) || "";

  const buildFromWithJoins = () => {
    if (!baseTable) return "";
    let sql = `FROM ${qid(baseTable)}`;
    for (const j of joinGraph) {
      if (!j.type || !j.leftTable || !j.leftColumn || !j.rightTable || !j.rightColumn) continue;
      sql += `\n${j.type} JOIN ${qid(j.rightTable)} ON ${qtc(j.leftTable, j.leftColumn)} = ${qtc(j.rightTable, j.rightColumn)}`;
    }
    return sql;
  };

  const buildMultiLevelSQL = (columnsSlot, rows) => {
    if (!baseTable) {
      alert("Please select at least one table and set a base table");
      return "";
    }

    const cfg = queryConfig || { levels: [] };
    if (!cfg.levels || cfg.levels.length === 0) {
      return `SELECT *\n${buildFromWithJoins()}\nLIMIT 100`;
    }

    const quoteField = (f) => {
      if (f.includes(".")) {
        const [t, c] = f.split(".");
        return qtc(t, c);
      }
      return qid(f);
    };

    const makeWindowExpr = (
      w,
      quoteField,
      dimensionFields = [],
      columnsSlot = [],
      rows = []
    ) => {
      const fn = (w.fn || "").toUpperCase();
      const needsTarget = ["SUM", "AVG", "MIN", "MAX", "COUNT"];

      let expr = fn;
      if (needsTarget.includes(fn) && w.targetField) {
        expr += `(${quoteField(w.targetField)})`;
      } else if (!needsTarget.includes(fn)) {
        expr += "()";
      }

      if (w.direction) {
        expr = `/* ${w.direction} */ ` + expr;
      }

      expr += " OVER (";

      const parts = [];

      let partitionFields = [];
      let orderFields = [];

      if (w.partitionBy && w.partitionBy.length > 0) {
        partitionFields = w.partitionBy;
      }
      if (w.orderBy && w.orderBy.length > 0) {
        orderFields = w.orderBy;
      }

      if (partitionFields.length === 0 && orderFields.length === 0) {
        switch (w.direction) {
          case "Table (across)":
            partitionFields = rows
              .filter((f) => dimensionFields.includes(f.name))
              .map((f) => f.name);
            orderFields = columnsSlot
              .filter((f) => dimensionFields.includes(f.name))
              .map((f) => ({ field: f.name, direction: "ASC" }));
            break;

          case "Table (down then across)":
            partitionFields = columnsSlot
              .filter((f) => dimensionFields.includes(f.name))
              .map((f) => f.name);
            orderFields = [
              ...rows
                .filter((f) => dimensionFields.includes(f.name))
                .map((f) => ({ field: f.name, direction: "ASC" })),
              ...columnsSlot
                .filter((f) => dimensionFields.includes(f.name))
                .map((f) => ({ field: f.name, direction: "ASC" })),
            ];
            break;

          case "Pane (down)":
            partitionFields = [
              ...new Set(
                [...rows, ...columnsSlot]
                  .filter((f) => dimensionFields.includes(f.name))
                  .map((f) => f.name)
              ),
            ];
            orderFields = rows
              .filter((f) => dimensionFields.includes(f.name))
              .map((f) => ({ field: f.name, direction: "ASC" }));
            break;

          case "Cell":
            partitionFields = [
              ...new Set(
                [...rows, ...columnsSlot]
                  .filter((f) => dimensionFields.includes(f.name))
                  .map((f) => f.name)
              ),
            ];
            orderFields = [];
            break;

          case "Specific Dimensions":
            partitionFields = [];
            orderFields = [];
            break;

          case "Window Down":
            partitionFields = columnsSlot.filter(f => dimensionFields.includes(f.name)).map(f => f.name);
            orderFields = rows.filter(f => dimensionFields.includes(f.name)).map(f => ({ field: f.name, direction: "ASC" }));
            break;

          case "Window Across":
            partitionFields = rows.filter(f => dimensionFields.includes(f.name)).map(f => f.name);
            orderFields = columnsSlot.filter(f => dimensionFields.includes(f.name)).map(f => ({ field: f.name, direction: "ASC" }));
            break;

          case "Pane Across":
            partitionFields = [
              ...new Set(
                [...rows, ...columnsSlot]
                  .filter((f) => dimensionFields.includes(f.name))
                  .map((f) => f.name)
              ),
            ];
            orderFields = columnsSlot
              .filter((f) => dimensionFields.includes(f.name))
              .map((f) => ({ field: f.name, direction: "ASC" }));
            break;

          case "Pane Down":
            partitionFields = [
              ...new Set(
                [...rows, ...columnsSlot]
                  .filter((f) => dimensionFields.includes(f.name))
                  .map((f) => f.name)
              ),
            ];
            orderFields = rows
              .filter((f) => dimensionFields.includes(f.name))
              .map((f) => ({ field: f.name, direction: "ASC" }));
            break;

          case "Down Then Across":
            partitionFields = columnsSlot
              .filter((f) => dimensionFields.includes(f.name))
              .map((f) => f.name);
            orderFields = [
              ...rows
                .filter((f) => dimensionFields.includes(f.name))
                .map((f) => ({ field: f.name, direction: "ASC" })),
              ...columnsSlot
                .filter((f) => dimensionFields.includes(f.name))
                .map((f) => ({ field: f.name, direction: "ASC" })),
            ];
            break;

          case "Across Then Down":
            partitionFields = rows
              .filter((f) => dimensionFields.includes(f.name))
              .map((f) => f.name);
            orderFields = [
              ...columnsSlot
                .filter((f) => dimensionFields.includes(f.name))
                .map((f) => ({ field: f.name, direction: "ASC" })),
              ...rows
                .filter((f) => dimensionFields.includes(f.name))
                .map((f) => ({ field: f.name, direction: "ASC" })),
            ];
            break;

          default:
            partitionFields = [];
            orderFields = [];
        }
      }

      if (partitionFields.length > 0) {
        parts.push(`PARTITION BY ${partitionFields.map(quoteField).join(", ")}`);
      }

      if (orderFields.length > 0) {
        const orderClauses = orderFields.map(
          (o) => `${quoteField(o.field)} ${o.direction || "ASC"}`
        );
        parts.push(`ORDER BY ${orderClauses.join(", ")}`);
      }

      expr += parts.join(" ");

      const hasOrder = orderFields.length > 0;

      if (hasOrder && w.frameType && w.frameStart && w.frameEnd) {
        let frameSpec = ` ${w.frameType} BETWEEN `;

        if (w.frameStart === "N PRECEDING") {
          frameSpec += `${w.frameStartValue || 1} PRECEDING`;
        } else if (w.frameStart === "N FOLLOWING") {
          frameSpec += `${w.frameStartValue || 1} FOLLOWING`;
        } else {
          frameSpec += w.frameStart;
        }

        frameSpec += " AND ";

        if (w.frameEnd === "N PRECEDING") {
          frameSpec += `${w.frameEndValue || 1} PRECEDING`;
        } else if (w.frameEnd === "N FOLLOWING") {
          frameSpec += `${w.frameEndValue || 1} FOLLOWING`;
        } else {
          frameSpec += w.frameEnd;
        }

        expr += frameSpec;
      }

      expr += ")";

      if (w.alias) {
        expr += ` AS ${qid(w.alias)}`;
      }

      return expr;
    };

    const buildLevelSQL = (level, _isOutermost = false) => {
      const selectFields = [];

      if (level.select && level.select.length > 0) {
        selectFields.push(...level.select.map(quoteField));
      }

      if (level.windows && level.windows.length > 0) {
        selectFields.push(
          ...level.windows.map((w) =>
            makeWindowExpr(w, quoteField, dimensionFields, columnsSlot, rows)
          )
        );
      }

      if (selectFields.length === 0) {
        selectFields.push("*");
      }

      let sql = `SELECT ${selectFields.join(",\n       ")}`;

      if (level.isSubquery && level.from) {
        sql += `\n${level.from}`;
      } else if (!level.isSubquery) {
        sql += `\n${buildFromWithJoins()}`;
      }

      if (level.where && level.where.length > 0) {
        const conditions = level.where.filter((c) => c.trim());
        if (conditions.length > 0) {
          sql += `\nWHERE ${conditions.join(" AND ")}`;
        }
      }

      if (level.groupBy && level.groupBy.length > 0) {
        sql += `\nGROUP BY ${level.groupBy.map(quoteField).join(", ")}`;
      }

      if (level.having && level.having.length > 0) {
        const conditions = level.having.filter((c) => c.trim());
        if (conditions.length > 0) {
          sql += `\nHAVING ${conditions.join(" AND ")}`;
        }
      }

      if (level.orderBy && level.orderBy.length > 0) {
        const orderClauses = level.orderBy
          .filter((o) => o.field)
          .map((o) => `${quoteField(o.field)} ${o.direction || "ASC"}`);
        if (orderClauses.length > 0) {
          sql += `\nORDER BY ${orderClauses.join(", ")}`;
        }
      }

      if (level.limit && level.limit > 0) {
        sql += `\nLIMIT ${level.limit}`;
      }

      return sql;
    };

    const levels = [...cfg.levels].sort((a, b) => a.id - b.id);

    if (levels.length === 1) {
      return buildLevelSQL(levels[0], true);
    }

    let sql = "";
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const isOutermost = i === 0;
      const _isInnermost = i === levels.length - 1;

      if (isOutermost) {
        sql = buildLevelSQL(level, true);
      } else {
        const prevSQL = sql;
        const currentLevelSQL = buildLevelSQL(level);

        if (currentLevelSQL.match(/FROM\s+\(/i)) {
          sql = currentLevelSQL.replace(
            /FROM\s+\([^)]*\)/i,
            `FROM (\n${prevSQL
              .split("\n")
              .map((line) => "  " + line)
              .join("\n")}\n) AS level_${level.id - 1}`
          );
        } else {
          sql = `${currentLevelSQL}\nFROM (\n${prevSQL
            .split("\n")
            .map((line) => "  " + line)
            .join("\n")}\n) AS level_${level.id - 1}`;
        }
      }
    }

    return sql;
  };

  const generateAndShowSQL = () => {
    const sql = buildMultiLevelSQL(columnsSlot, rows);
    setGeneratedSql(sql);
    setSqlPopupVisible(true);
  };

  const executeGeneratedSQL = async () => {
    setSqlPopupVisible(false);

    try {
      const apiBase = "https://intelligentsalesman.com/ism1/API/tableu";
      const cleanQuery = generatedSql.replace(/;+\s*$/g, "");

      const res = await fetch(`${apiBase}/execute_query.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanQuery }),
      });

      const data = await res.json();
      console.log('data-------------');
      console.log(data);
      if (data.success) {
        handleDataLoad(data.data || []);
        alert(`Query executed successfully! Retrieved ${(data.data || []).length} rows.`);
      } else {
        alert("Query execution failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error executing query:", error);
      alert("Error executing query. Check console for details.");
    }
  };

  const _addField = (field: { name: string }) => {
    if (!fields.find((f) => f.name === field.name)) {
      setFields((prev) => [...prev, field]);
    }
  };

  const _removeField = (field: { name: string }) => {
    setFields((prev) => prev.filter((f) => f.name !== field.name));
    setFilters((prev) => prev.filter((f) => f.name !== field.name));
    setColumnsSlot((prev) => prev.filter((f) => f.name !== field.name));
    setRows((prev) => prev.filter((f) => f.name !== field.name));
  };

  const addFilter = (field) => {
    if (!filters.find((f) => f.name === field.name)) {
      setFilters((prev) => [...prev, field]);
    }
  };

  const removeFilter = (field) => {
    setFilters((prev) => prev.filter((f) => f.name !== field.name));
  };

  const addToColumns = (field) => {
    if (!columnsSlot.find((f) => f.name === field.name)) {
      setColumnsSlot((prev) => [...prev, field]);
    }
  };

  const removeFromColumns = (field) => {
    setColumnsSlot((prev) => prev.filter((f) => f.name !== field.name));
  };

  const addToRows = (field) => {
    if (!rows.find((f) => f.name === field.name)) {
      setRows((prev) => [...prev, field]);
    }
  };

  const removeFromRows = (field) => {
    setRows((prev) => prev.filter((f) => f.name !== field.name));
  };

  const clearAllSelections = () => {
    if (!window.confirm("Clear all visual and query-builder selections? This cannot be undone.")) return;
    setFilters([]);
    setColumnsSlot([]);
    setRows([]);
    setPartitionKey("");
    setQueryConfig(null);
    setCalcConfig({
      calculation: "SUM",
      cumulative: true,
      frameType: "EXPANDING",
      frameSize: 0,
      direction: "FORWARD",
      lodScope: "INCLUDE",
      lodFields: [],
    });
    setXField("");
    setYField("");
  };

  const saveConfiguration = async () => {
    if (!window.confirm("Save current configuration? This will store all your settings.")) return;

    const configName = prompt("Enter a name for this configuration:");
    if (!configName || !configName.trim()) {
      alert("Configuration name is required");
      return;
    }

    const configData = {
      name: configName.trim(),
      selectedTables: selectedTables,
      baseTable: baseTable,
      joinGraph: joinGraph,
      filters: filters,
      columnsSlot: columnsSlot,
      rows: rows,
      selectedChart: selectedChart,
      partitionKey: partitionKey,
      xField: xField,
      yField: yField,
      calcConfig: calcConfig,
      queryConfig: queryConfig,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('https://intelligentsalesman.com/ism1/API/tableu/save_config.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Configuration "${configName}" saved successfully! ID: ${result.id}`);
      } else {
        alert('Failed to save configuration: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration. Check console for details.');
    }
  };

  const loadConfiguration = async () => {
    const configId = prompt("Enter configuration ID to load:");
    if (!configId) return;

    try {
      const response = await fetch(
        `https://intelligentsalesman.com/ism1/API/tableu/load_config.php?id=${configId}`
      );
      const result = await response.json();

      if (!result.success || !result.data) {
        alert("Failed to load configuration");
        return;
      }

      const cfg = result.data;

      // ✅ Phase 1: schema-level restore
      setSelectedTables(cfg.selectedTables || []);
      setBaseTable(cfg.baseTable || "");
      setJoinGraph(cfg.joinGraph || []);
      setQueryConfig(cfg.queryConfig || null);

      // ✅ Hold visual state until fields are rebuilt
      setPendingConfig({
        filters: cfg.filters || [],
        columnsSlot: cfg.columnsSlot || [],
        rows: cfg.rows || [],
        xField: cfg.xField || "",
        yField: cfg.yField || "",
        selectedChart: cfg.selectedChart || "table",
        partitionKey: cfg.partitionKey || "",
        calcConfig: cfg.calcConfig || null,
      });

      alert(`Configuration "${cfg.name}" loaded. Restoring visuals…`);
    } catch (err) {
      console.error(err);
      alert("Error loading configuration");
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: "flex", height: "100vh", fontFamily: "Arial, sans-serif" }}>
        {/* Left Sidebar */}
        <div style={{ width: 320, backgroundColor: "#f8f9fa", padding: 15, borderRight: "1px solid #ddd", overflowY: "auto" }}>
          <h3 style={{ marginTop: 0 }}>Fields</h3>

          {/* Action Buttons */}
          <div style={{ marginBottom: 15, display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => setShowTablesPopup(true)}
              style={{
                padding: "8px 12px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              📊 Manage Tables & Data
            </button>

            <button
              onClick={() => setShowQueryPopup(true)}
              disabled={!baseTable}
              style={{
                padding: "8px 12px",
                backgroundColor: !baseTable ? "#6c757d" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: !baseTable ? "not-allowed" : "pointer",
                fontSize: 12,
              }}
            >
              🔧 Multi-Level Query Builder
            </button>

            <button
              onClick={generateAndShowSQL}
              disabled={!baseTable}
              style={{
                padding: "8px 12px",
                backgroundColor: !baseTable ? "#6c757d" : "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: !baseTable ? "not-allowed" : "pointer",
                fontSize: 12,
              }}
            >
              📝 Generate & View SQL
            </button>

            <button
              onClick={clearAllSelections}
              style={{
                padding: "8px 12px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              ♻️ Clear All Selections
            </button>

            <button
              onClick={saveConfiguration}
              style={{
                padding: "8px 12px",
                backgroundColor: "#6f42c1",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              💾 Save Configuration
            </button>

            <button
              onClick={loadConfiguration}
              style={{
                padding: "8px 12px",
                backgroundColor: "#fd7e14",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              📂 Load Configuration
            </button>
          </div>

          {/* Status Info */}
          <div style={{ marginBottom: 15, padding: 10, backgroundColor: "#e9ecef", borderRadius: 6, fontSize: 12 }}>
            <div><strong>Tables:</strong> {selectedTables.length ? selectedTables.join(", ") : "None"}</div>
            <div><strong>Base:</strong> {baseTable || "Not set"}</div>
            <div><strong>Joins:</strong> {joinGraph.length}</div>
            <div><strong>Fields:</strong> {fields.length}</div>
          </div>

          {/* Field list and quick add */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Available Fields</strong>
              <small style={{ color: "#666" }}>{fields.length}</small>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto", marginTop: 8 }}>
              {fields.length === 0 ? (
                <div style={{ color: "#666", fontStyle: "italic", textAlign: "center", padding: 20 }}>
                  No fields available.<br />
                  Please select tables first.
                </div>
              ) : (
                fields.map((field, idx) => (
                  <Field key={`field-${field.name}-${field.source || "local"}-${idx}`} field={field} />
                ))
              )}
            </div>
          </div>

          {/* Quick X/Y selection */}
          <div style={{ padding: 10, background: "#fff", borderRadius: 6, border: "1px solid #eee" }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontWeight: 600 }}>X (Quarter / Time dimension)</label>
              <select
                value={xField}
                onChange={(e) => setXField(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", marginTop: 6 }}
              >
                <option value="">Select X (Date / Quarter)</option>
                {dimensionFields.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <small style={{ color: "#666" }}>Date-like fields will be converted to Quarter labels (Q1 2023)</small>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontWeight: 600 }}>Y (Measure)</label>
              <select
                value={yField}
                onChange={(e) => setYField(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", marginTop: 6 }}
              >
                <option value="">Select measure (e.g. Sales)</option>
                {measureFields.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Top Bar */}
          <div style={{ padding: 15, borderBottom: "1px solid #ddd", backgroundColor: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Data Visualization Dashboard</h2>
              <div style={{ display: "flex", gap: 15, alignItems: "center" }}>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ fontWeight: 600 }}>Chart Type:</label>
                  <select
                    value={selectedChart}
                    onChange={(e) => setSelectedChart(e.target.value)}
                    style={{ padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
                  >
                    <option value="table">Table</option>
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="pie">Pie Chart</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ fontWeight: 600 }}>Facet (Graphlet):</label>
                  <select
                    value={partitionKey}
                    onChange={(e) => setPartitionKey(e.target.value)}
                    style={{ padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
                  >
                    <option value="">None (Single Chart)</option>
                    {dimensionFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>

                {/* Calculation UI */}
                <div style={{ padding: 10, borderRadius: 6, background: "#f8f9fa", display: "flex", gap: 12, alignItems: "center" }}>
                  <div>
                    <label style={{ fontWeight: 600 }}>Calculation:</label>
                    <select
                      value={calcConfig.calculation}
                      onChange={(e) => setCalcConfig(c => ({ ...c, calculation: e.target.value }))}
                      style={{ padding: 6, borderRadius: 4, border: "1px solid #ddd", marginLeft: 6 }}
                    >
                      {FUNCTION_CATEGORIES.Aggregate.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600 }}>Cumulative:</label>
                    <select
                      value={String(!!calcConfig.cumulative)}
                      onChange={(e) => setCalcConfig(c => ({ ...c, cumulative: e.target.value === "true" }))}
                      style={{ padding: 6, borderRadius: 4, border: "1px solid #ddd", marginLeft: 6 }}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600 }}>Direction:</label>
                    <select
                      value={calcConfig.direction}
                      onChange={(e) => setCalcConfig(c => ({ ...c, direction: e.target.value }))}
                      style={{ padding: 6, borderRadius: 4, border: "1px solid #ddd", marginLeft: 6 }}
                    >
                      <option value="FORWARD">Forward (build up)</option>
                      <option value="BACKWARD">Backward (deduct)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600 }}>Frame:</label>
                    <select
                      value={calcConfig.frameType}
                      onChange={(e) => setCalcConfig(c => ({ ...c, frameType: e.target.value }))}
                      style={{ padding: 6, borderRadius: 4, border: "1px solid #ddd", marginLeft: 6 }}
                    >
                      <option value="EXPANDING">Expanding (cumulative)</option>
                      <option value="FIXED">Fixed-size window</option>
                    </select>
                  </div>

                  {calcConfig.frameType === "FIXED" && (
                    <div>
                      <label style={{ fontWeight: 600 }}>Size:</label>
                      <input
                        type="number"
                        min={1}
                        value={calcConfig.frameSize || 1}
                        onChange={(e) => setCalcConfig(c => ({ ...c, frameSize: Math.max(1, Number(e.target.value)) }))}
                        style={{ width: 80, padding: 6, borderRadius: 4, border: "1px solid #ddd", marginLeft: 6 }}
                      />
                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>

          {/* Drag & Drop Areas */}
          <div style={{ display: "flex", padding: 15, backgroundColor: "#f8f9fa", borderBottom: "1px solid #ddd" }}>
            <Slot title="🔍 Filters" items={filters} onDropField={addFilter} onRemoveField={removeFilter} />
            <Slot title="📊 Columns" items={columnsSlot} onDropField={addToColumns} onRemoveField={removeFromColumns} />
            <Slot title="📈 Rows" items={rows} onDropField={addToRows} onRemoveField={removeFromRows} />
          </div>

          {/* Chart Area */}
          <div style={{ flex: 1, padding: 20, backgroundColor: "#fff", overflow: "auto" }}>
            <GraphletCollection
              chartType={selectedChart}
              data={data}
              partitionKey={partitionKey}
              xKey={xKey}
              yKey={yKey}
              apiData={apiData}
              calcConfig={{ ...calcConfig, originalData: apiData }}
            />
          </div>
        </div>
      </div>

      {/* Tables & Data Management Popup */}
      <Modal
        visible={showTablesPopup}
        title="Tables & Data Management"
        onClose={() => setShowTablesPopup(false)}
        maxWidth="1000px"
      >
        <APIIntegration
          selectedTables={selectedTables}
          setSelectedTables={setSelectedTables}
          baseTable={baseTable}
          setBaseTable={setBaseTable}
          joinGraph={joinGraph}
          setJoinGraph={setJoinGraph}
          onDataLoad={handleDataLoad}
          onTablesLoad={handleTablesLoad}
          onColumnsMapLoad={handleColumnsMapLoad}
        />
      </Modal>

      {/* Multi-Level Query Builder Popup */}
      <Modal
        visible={showQueryPopup}
        title="Multi-Level Nested Query Builder"
        onClose={() => setShowQueryPopup(false)}
        maxWidth="1200px"
      >
        <MultiLevelNestedQueryBuilder
          queryConfig={queryConfig}
          onChange={setQueryConfig}
          dimensionFields={dimensionFields}
          measureFields={measureFields}
          selectedTables={selectedTables}
          baseTable={baseTable}
        />
      </Modal>

      {/* SQL Preview & Execute Popup */}
      <SqlPopup
        visible={sqlPopupVisible}
        sql={generatedSql}
        onClose={() => setSqlPopupVisible(false)}
        onExecute={executeGeneratedSQL}
      />
    </DndProvider>
  );
};



export default App;