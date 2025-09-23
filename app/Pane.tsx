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

// Full dataset (shortened here, replace with your full data)
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
  { Country: "Canada", Product: "Mobile", SubProduct: "Lenovo", Year: 2024, Quarter: "Q4", Sales: 220, Quantity: 14 },
  { Country: "Canada", Product: "Mobile", SubProduct: "Dell", Year: 2024, Quarter: "Q4", Sales: 220, Quantity: 14 },
  { Country: "Canada", Product: "Mobile", SubProduct: "HP", Year: 2024, Quarter: "Q4", Sales: 220, Quantity: 14 },
  { Country: "Canada", Product: "Mobile", SubProduct: "Samsung", Year: 2024, Quarter: "Q4", Sales: 220, Quantity: 14 },
  { Country: "Canada", Product: "Mobile", SubProduct: "Asus", Year: 2024, Quarter: "Q4", Sales: 220, Quantity: 14 },
];

// Utility to order quarters for sorting
const quarterOrder: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
const formatPeriod = (year: number, quarter: string) => `${year} ${quarter}`;

// Window function frame 1: Running Total Sales for a product
function getRunningTotalData(data: DataItem[], product: string) {
  const filtered = data
    .filter((d) => d.Product === product)
    .sort((a, b) => a.Year - b.Year || quarterOrder[a.Quarter] - quarterOrder[b.Quarter]);

  let runningTotal = 0;
  return filtered.map((d) => {
    runningTotal += d.Sales;
    return {
      name: formatPeriod(d.Year, d.Quarter),
      Sales: d.Sales,
      RunningTotal: runningTotal,
    };
  });
}

// Window function frame 2: Moving Average Quantity for a country
function getMovingAverageData(data: DataItem[], country: string, windowSize = 3) {
  const filtered = data
    .filter((d) => d.Country === country)
    .sort((a, b) => a.Year - b.Year || quarterOrder[a.Quarter] - quarterOrder[b.Quarter]);

  return filtered.map((d, i, arr) => {
    const start = Math.max(0, i - windowSize + 1);
    const windowSlice = arr.slice(start, i + 1);
    const avgQuantity = windowSlice.reduce((sum, item) => sum + item.Quantity, 0) / windowSlice.length;
    return {
      name: formatPeriod(d.Year, d.Quarter),
      Quantity: d.Quantity,
      MovingAvgQuantity: avgQuantity,
    };
  });
}

// Pivot Table component with filtering
function PivotTable({ data }: { data: DataItem[] }) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 6,
        backgroundColor: "white",
        padding: 12,
        height: "100%",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        // overflowY: "auto",
      }}
    >
      
    </div>
  );
}

// UI Controls with interactive filters
function UIControls({
  filterCountry,
  setFilterCountry,
  filterProduct,
  setFilterProduct,
  filterYear,
  setFilterYear,
}: {
  filterCountry: string;
  setFilterCountry: (val: string) => void;
  filterProduct: string;
  setFilterProduct: (val: string) => void;
  filterYear: string;
  setFilterYear: (val: string) => void;
}) {
  // Get unique values for dropdowns
  const countries = Array.from(new Set(rawData.map((d) => d.Country))).sort();
  const products = Array.from(new Set(rawData.map((d) => d.Product))).sort();
  const years = Array.from(new Set(rawData.map((d) => d.Year.toString()))).sort();

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 6,
        backgroundColor: "white",
        padding: 12,
        height: "100%",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <h3>Filters & Controls</h3>

      <label>
        Country:
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          style={{ marginLeft: 8, padding: 4 }}
        >
          <option value="">All</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Product:
        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          style={{ marginLeft: 8, padding: 4 }}
        >
          <option value="">All</option>
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <label>
        Year:
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          style={{ marginLeft: 8, padding: 4 }}
        >
          <option value="">All</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default function WindowFunctionDashboard() {
  // Filters state
  const [filterCountry, setFilterCountry] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Filter rawData based on filters
  const filteredData = useMemo(() => {
    return rawData.filter((d) => {
      return (
        (filterCountry === "" || d.Country === filterCountry) &&
        (filterProduct === "" || d.Product === filterProduct) &&
        (filterYear === "" || d.Year.toString() === filterYear)
      );
    });
  }, [filterCountry, filterProduct, filterYear]);

  // Prepare data for graphs based on filters
  const runningTotalData = useMemo(() => getRunningTotalData(filteredData, filterProduct || "Oppo"), [
    filteredData,
    filterProduct,
  ]);
  const movingAvgData = useMemo(() => getMovingAverageData(filteredData, filterCountry || "USA"), [
    filteredData,
    filterCountry,
  ]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "320px 1fr",
        gap: 20,
        height: "100vh",
        padding: 20,
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f9f9f9",
      }}
    >
      {/* Left Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Graph 1 Pane with BarChart */}
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 6,
            backgroundColor: "white",
            padding: 12,
            height: 320,
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ marginBottom: 12 }}>Running Total Sales for {filterProduct || "Oppo"}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={runningTotalData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="Sales" fill="#8884d8" />
              <Bar dataKey="RunningTotal" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pivot Table Pane */}
        <PivotTable data={filteredData} />
      </div>

      {/* Right Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Graph 2 Pane with BarChart */}
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 6,
            backgroundColor: "white",
            padding: 12,
            height: 320,
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ marginBottom: 12 }}>Moving Average Quantity for {filterCountry || "USA"}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={movingAvgData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="Quantity" fill="#ff7300" />
              <Bar dataKey="MovingAvgQuantity" fill="#387908" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* UI Controls Pane */}
        <UIControls
          filterCountry={filterCountry}
          setFilterCountry={setFilterCountry}
          filterProduct={filterProduct}
          setFilterProduct={setFilterProduct}
          filterYear={filterYear}
          setFilterYear={setFilterYear}
        />
      </div>
    </div>
  );
}