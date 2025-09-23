import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DataItem = {
  Country: string;
  Product: string;
  SubProduct: string;
  Year: number;
  Quarter: string;
  Sales: number;
  Quantity: number;
};

const rawData: DataItem[] = [
  { Country: "USA", Product: "Mobile", SubProduct: "Oppo", Year: 2023, Quarter: "Q1", Sales: 100, Quantity: 10 },
  { Country: "USA", Product: "Mobile", SubProduct: "Oppo", Year: 2023, Quarter: "Q2", Sales: 120, Quantity: 12 },
  { Country: "USA", Product: "Mobile", SubProduct: "Oppo", Year: 2024, Quarter: "Q1", Sales: 175, Quantity: 11 },
  { Country: "USA", Product: "Mobile", SubProduct: "Oppo", Year: 2024, Quarter: "Q3", Sales: 190, Quantity: 13 },
  { Country: "USA", Product: "Mobile", SubProduct: "Apple", Year: 2023, Quarter: "Q1", Sales: 150, Quantity: 15 },
  { Country: "USA", Product: "Mobile", SubProduct: "Apple", Year: 2023, Quarter: "Q4", Sales: 180, Quantity: 18 },
  { Country: "USA", Product: "Mobile", SubProduct: "Apple", Year: 2024, Quarter: "Q2", Sales: 200, Quantity: 12 },
  { Country: "USA", Product: "Mobile", SubProduct: "Apple", Year: 2024, Quarter: "Q4", Sales: 220, Quantity: 14 },
  { Country: "Canada", Product: "Laptop", SubProduct: "Lenovo", Year: 2023, Quarter: "Q1", Sales: 200, Quantity: 20 },
  { Country: "Canada", Product: "Laptop", SubProduct: "Lenovo", Year: 2023, Quarter: "Q3", Sales: 230, Quantity: 22 },
  { Country: "Canada", Product: "Laptop", SubProduct: "Lenovo", Year: 2024, Quarter: "Q2", Sales: 280, Quantity: 25 },
  { Country: "Canada", Product: "Mobile", SubProduct: "Apple", Year: 2024, Quarter: "Q4", Sales: 220, Quantity: 14 },
  { Country: "Canada", Product: "Mobile", SubProduct: "Oppo", Year: 2024, Quarter: "Q4", Sales: 220, Quantity: 14 },
];

const quarterOrder: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
const formatPeriod = (year: number, quarter: string) => `${year} ${quarter}`;

function sortData(data: DataItem[], sortBy: keyof DataItem, ascending: boolean) {
  return [...data].sort((a, b) => {
    if (a[sortBy] < b[sortBy]) return ascending ? -1 : 1;
    if (a[sortBy] > b[sortBy]) return ascending ? 1 : -1;
    return 0;
  });
}

function windowCalculation(
  values: number[],
  currentIndex: number,
  startOffset: number,
  endOffset: number,
  metric: "sum" | "avg" | "min" | "max"
) {
  const start = Math.max(0, currentIndex + startOffset);
  const end = Math.min(values.length - 1, currentIndex + endOffset);
  const windowValues = values.slice(start, end + 1);
  if (windowValues.length === 0) return null;

  switch (metric) {
    case "sum":
      return windowValues.reduce((a, b) => a + b, 0);
    case "avg":
      return windowValues.reduce((a, b) => a + b, 0) / windowValues.length;
    case "min":
      return Math.min(...windowValues);
    case "max":
      return Math.max(...windowValues);
  }
}

function partitionData(data: DataItem[], partitionBy: keyof DataItem) {
  const map = new Map<string, DataItem[]>();
  data.forEach((d) => {
    const key = String(d[partitionBy]);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  });
  return map;
}

export default function WindowFunctionDashboard() {
  const [partitionBy, setPartitionBy] = useState<keyof DataItem>("Country");
  const [sortBy, setSortBy] = useState<keyof DataItem>("Year");
  const [ascending, setAscending] = useState(true);
  const [metric, setMetric] = useState<"sum" | "avg" | "min" | "max">("avg");
  const [startOffset, setStartOffset] = useState(-2);
  const [endOffset, setEndOffset] = useState(0);

  const sortedData = useMemo(() => sortData(rawData, sortBy, ascending), [sortBy, ascending]);

  const panes = useMemo(() => partitionData(sortedData, partitionBy), [sortedData, partitionBy]);

  const panesWithWindowCalc = useMemo(() => {
    const result = new Map<string, (DataItem & { windowValue: number | null })[]>();

    panes.forEach((items, key) => {
      const sortedItems = [...items].sort(
        (a, b) => a.Year - b.Year || quarterOrder[a.Quarter] - quarterOrder[b.Quarter]
      );

      const values = sortedItems.map((d) => d.Sales);

      const withWindow = sortedItems.map((d, i) => ({
        ...d,
        windowValue: windowCalculation(values, i, startOffset, endOffset, metric),
      }));

      result.set(key, withWindow);
    });

    return result;
  }, [panes, startOffset, endOffset, metric]);

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h2>Window Function Dashboard</h2>

      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        <label>
          Partition By:
          <select value={partitionBy} onChange={(e) => setPartitionBy(e.target.value as keyof DataItem)}>
            {["Country", "Product", "SubProduct", "Year", "Quarter"].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label>
          Sort By:
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as keyof DataItem)}>
            {["Country", "Product", "SubProduct", "Year", "Quarter", "Sales", "Quantity"].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ascending:
          <input type="checkbox" checked={ascending} onChange={() => setAscending((v) => !v)} />
        </label>

        <label>
          Metric:
          <select value={metric} onChange={(e) => setMetric(e.target.value as any)}>
            <option value="sum">Sum</option>
            <option value="avg">Average</option>
            <option value="min">Min</option>
            <option value="max">Max</option>
          </select>
        </label>

        <label>
          Window Start Offset:
          <input
            type="number"
            value={startOffset}
            onChange={(e) => setStartOffset(parseInt(e.target.value, 10))}
            style={{ width: 60 }}
          />
        </label>

        <label>
          Window End Offset:
          <input
            type="number"
            value={endOffset}
            onChange={(e) => setEndOffset(parseInt(e.target.value, 10))}
            style={{ width: 60 }}
          />
        </label>
      </div>

      <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 20, border: "1px solid #ccc" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Country", "Product", "SubProduct", "Year", "Quarter", "Sales", "Quantity"].map((col) => (
                <th
                  key={col}
                  style={{ border: "1px solid #ddd", padding: 6, backgroundColor: "#f0f0f0", textAlign: "left" }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rawData.map((row, i) => (
              <tr key={i}>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.Country}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.Product}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.SubProduct}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.Year}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.Quarter}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.Sales}</td>
                <td style={{ border: "1px solid #ddd", padding: 6 }}>{row.Quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Panes container with wrapping */}
      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "flex-start",
        }}
      >
        {[...panesWithWindowCalc.entries()].map(([paneKey, items]) => (
          <div
            key={paneKey}
            style={{
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: 12,
              backgroundColor: "white",
              width: 350,
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h3>Pane: {paneKey}</h3>

            {/* Sub-panes container with wrapping */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "center",
              }}
            >
              {/* Sub-pane 1: Window Value Chart */}
              <div
                style={{
                  flex: "1 1 300px",
                  minWidth: 300,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  padding: 8,
                  backgroundColor: "#fafafa",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <h4 style={{ marginBottom: 8 }}>Window Metric Chart</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={items.map((d) => ({
                      name: formatPeriod(d.Year, d.Quarter),
                      windowValue: d.windowValue,
                    }))}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="windowValue" fill="#8884d8" name={`${metric.toUpperCase()} over window`} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Sub-pane 2: Sales Chart */}
              <div
                style={{
                  flex: "1 1 300px",
                  minWidth: 300,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  padding: 8,
                  backgroundColor: "#fafafa",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <h4 style={{ marginBottom: 8 }}>Sales Chart</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={items.map((d) => ({
                      name: formatPeriod(d.Year, d.Quarter),
                      Sales: d.Sales,
                    }))}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="Sales" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table subset for this pane */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: 4 }}>Year</th>
                  <th style={{ border: "1px solid #ddd", padding: 4 }}>Quarter</th>
                  <th style={{ border: "1px solid #ddd", padding: 4 }}>Sales</th>
                  <th style={{ border: "1px solid #ddd", padding: 4 }}>Window Value</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d, i) => (
                  <tr key={i}>
                    <td style={{ border: "1px solid #ddd", padding: 4 }}>{d.Year}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4 }}>{d.Quarter}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4 }}>{d.Sales}</td>
                    <td style={{ border: "1px solid #ddd", padding: 4 }}>
                      {d.windowValue !== null ? d.windowValue.toFixed(2) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}