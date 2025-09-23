"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Base data
const data = [
  { name: "Jan", uv: 4000 },
  { name: "Feb", uv: 3000 },
  { name: "Mar", uv: 2000 },
  { name: "Apr", uv: 2780 },
  { name: "May", uv: 1890 },
  { name: "Jun", uv: 2390 },
  { name: "Jul", uv: 3490 },
];

// Product-level breakdown
const productData = {
  Jan: [
    { product: "Product A", value: 2500 },
    { product: "Product B", value: 1500 },
  ],
  Feb: [
    { product: "Product A", value: 1800 },
    { product: "Product B", value: 1200 },
  ],
  Mar: [
    { product: "Product A", value: 1200 },
    { product: "Product B", value: 800 },
  ],
  Apr: [
    { product: "Product A", value: 1600 },
    { product: "Product B", value: 1180 },
  ],
  May: [
    { product: "Product A", value: 1000 },
    { product: "Product B", value: 890 },
  ],
  Jun: [
    { product: "Product A", value: 1400 },
    { product: "Product B", value: 990 },
  ],
  Jul: [
    { product: "Product A", value: 1400 },
    { product: "Product B", value: 1000 },
    { product: "Product C", value: 1090 },
  ],
};

// State-level breakdown
const stateData = {
  Jan: [
    { state: "NY", value: 1500 },
    { state: "CA", value: 2500 },
  ],
  Feb: [
    { state: "NY", value: 1200 },
    { state: "CA", value: 1800 },
  ],
  Mar: [
    { state: "NY", value: 800 },
    { state: "CA", value: 1200 },
  ],
  Apr: [
    { state: "NY", value: 1180 },
    { state: "CA", value: 1600 },
  ],
  May: [
    { state: "NY", value: 890 },
    { state: "CA", value: 1000 },
  ],
  Jun: [
    { state: "NY", value: 990 },
    { state: "CA", value: 1400 },
  ],
  Jul: [
    { state: "NY", value: 1000 },
    { state: "CA", value: 1400 },
  ],
};

const productColors = {
  "Product A": "#6366F1",
  "Product B": "#F59E0B",
  "Product C": "#10B981",
};

const stateColors = {
  NY: "#EF4444",
  CA: "#3B82F6",
};

// Drill Across Data (example)
const drillAcrossData = {
  "by-product": {
    Jan: [
      { product: "Product A", sales: 2500, marketShare: "62.5%", growth: "+10%" },
      { product: "Product B", sales: 1500, marketShare: "37.5%", growth: "+5%" }
    ],
    Feb: [
      { product: "Product A", sales: 1800, marketShare: "60%", growth: "+8%" },
      { product: "Product B", sales: 1200, marketShare: "40%", growth: "+4%" }
    ],
    // ...add for other months as needed
  },
  "by-state": {
    Jan: [
      { state: "NY", sales: 1500, population: "1M", density: "High" },
      { state: "CA", sales: 2500, population: "2M", density: "Medium" }
    ],
    Feb: [
      { state: "NY", sales: 1200, population: "1M", density: "High" },
      { state: "CA", sales: 1800, population: "2M", density: "Medium" }
    ],
    // ...add for other months as needed
  }
};

// Drill Across Table
function DrillAcrossTable({ data }) {
  if (!data || !data.length) return <div className="text-gray-500 p-4">No data available.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Object.keys(data[0]).map((header) => (
              <th
                key={header}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, idx) => (
            <tr key={idx}>
              {Object.values(row).map((value, cellIdx) => (
                <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BarChartPage() {
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, data: null });
  const [submenuVisible, setSubmenuVisible] = useState({
    stackBar: false,
    drillAcross: false,
    stackBarProduct: false,
    stackBarState: false,
    drillAcrossProduct: false,
    drillAcrossState: false,
  });

  // stackingMode: null or { type: 'product'|'state', scope: 'individual'|'all', month?: string }
  const [stackingMode, setStackingMode] = useState(null);

  // Drill Across state
  // { type: 'by-product'|'by-state', scope: 'individual'|'all', month: string }
  const [drillAcross, setDrillAcross] = useState(null);

  const handleContextMenu = (e, entry) => {
    e.preventDefault();
    setContextMenu({ show: true, x: e.clientX, y: e.clientY, data: entry });
    setSubmenuVisible({
      stackBar: false,
      drillAcross: false,
      stackBarProduct: false,
      stackBarState: false,
      drillAcrossProduct: false,
      drillAcrossState: false,
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        contextMenu.show &&
        !e.target.closest(".context-menu") &&
        !e.target.closest(".submenu")
      ) {
        setContextMenu({ ...contextMenu, show: false });
        setSubmenuVisible({
          stackBar: false,
          drillAcross: false,
          stackBarProduct: false,
          stackBarState: false,
          drillAcrossProduct: false,
          drillAcrossState: false,
        });
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu]);

  // Stack Bar handlers
  const handleStackBarByProductIndividual = () => {
    setStackingMode({ type: "product", scope: "individual", month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };

  const handleStackBarByProductAll = () => {
    setStackingMode({ type: "product", scope: "all" });
    setContextMenu({ ...contextMenu, show: false });
  };

  const handleStackBarByStateIndividual = () => {
    setStackingMode({ type: "state", scope: "individual", month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };

  const handleStackBarByStateAll = () => {
    setStackingMode({ type: "state", scope: "all" });
    setContextMenu({ ...contextMenu, show: false });
  };

  // Drill Across handlers
  const handleDrillAcrossByProductIndividual = () => {
    setDrillAcross({ type: "by-product", scope: "individual", month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };

  const handleDrillAcrossByProductAll = () => {
    setDrillAcross({ type: "by-product", scope: "all" });
    setContextMenu({ ...contextMenu, show: false });
  };

  const handleDrillAcrossByStateIndividual = () => {
    setDrillAcross({ type: "by-state", scope: "individual", month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };

  const handleDrillAcrossByStateAll = () => {
    setDrillAcross({ type: "by-state", scope: "all" });
    setContextMenu({ ...contextMenu, show: false });
  };

  const resetStackedView = () => setStackingMode(null);

  // Get keys and colors for current stacking mode
  const getKeysAndColors = () => {
    if (stackingMode?.type === "state") {
      const allStates = new Set();
      Object.values(stateData).forEach((sList) =>
        sList.forEach((s) => allStates.add(s.state))
      );
      return {
        keys: Array.from(allStates),
        colors: stateColors,
      };
    }

    const allProducts = new Set();
    Object.values(productData).forEach((pList) =>
      pList.forEach((p) => allProducts.add(p.product))
    );
    return {
      keys: Array.from(allProducts),
      colors: productColors,
    };
  };

  const isMonthStacked = (month) => {
    if (!stackingMode) return false;
    if (stackingMode.scope === "all") return true;
    return stackingMode.month === month;
  };

  // Build chart data with all keys present and uv zeroed for stacked months
  const chartData = data.map((d) => {
    const base = { name: d.name };
    const { keys } = getKeysAndColors();

    // Initialize all keys with 0 to keep data shape consistent
    keys.forEach((key) => {
      base[key] = 0;
    });
    base.uv = 0;

    if (isMonthStacked(d.name)) {
      const sourceData = stackingMode?.type === "product" ? productData : stateData;
      const breakdown = sourceData[d.name] || [];
      breakdown.forEach((item) => {
        const key = stackingMode?.type === "product" ? item.product : item.state;
        base[key] = item.value;
      });
    } else {
      base.uv = d.uv;
    }

    return base;
  });

  const { keys, colors } = getKeysAndColors();

  // Drill Across panel
  const renderDrillAcrossPanel = () => {
    if (!drillAcross) return null;
    let rows = [];
    if (drillAcross.scope === "individual") {
      rows = (drillAcrossData[drillAcross.type][drillAcross.month] || []);
    } else if (drillAcross.scope === "all") {
      // Flatten all months for the selected type
      rows = Object.entries(drillAcrossData[drillAcross.type] || {}).flatMap(
        ([month, arr]) => arr.map(row => ({ Month: month, ...row }))
      );
    }
    return (
      <div className="w-full max-w-3xl bg-white rounded shadow-lg mt-6 p-4 border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold text-lg">
            Drill Across: {drillAcross.type === "by-product" ? "By Product" : "By State"} {drillAcross.scope === "individual" ? `- ${drillAcross.month}` : "(All Months)"}
          </div>
          <button
            className="text-sm text-indigo-600 hover:underline"
            onClick={() => setDrillAcross(null)}
          >
            Close
          </button>
        </div>
        <DrillAcrossTable data={rows} />
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center space-y-6">
      <Card className="w-full max-w-3xl shadow-2xl">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-xl">Monthly Sales Overview</CardTitle>
          {stackingMode && (
            <button
              onClick={resetStackedView}
              className="text-sm text-indigo-600 hover:underline"
            >
              Reset View
            </button>
          )}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              barCategoryGap="20%"
              barGap={4}
              margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} />
              <YAxis />
              <Tooltip />

              {keys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="stack"
                  fill={colors[key] || "#999"}
                  isAnimationActive={false}
                  maxBarSize={40}
                />
              ))}

              <Bar
                dataKey="uv"
                maxBarSize={40}
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill="#6366F1"
                    onContextMenu={(e) => handleContextMenu(e, entry)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drill Across Panel */}
      {renderDrillAcrossPanel()}

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="context-menu absolute z-50 bg-white border shadow-md rounded w-48"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {/* Stack Bar */}
          <div
            className="relative group"
            onMouseEnter={() => setSubmenuVisible((s) => ({ ...s, stackBar: true }))}
            onMouseLeave={() =>
              setSubmenuVisible((s) => ({
                ...s,
                stackBar: false,
                stackBarProduct: false,
                stackBarState: false,
              }))
            }
          >
            <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
              <span>Stack Bar</span>
              <span className="ml-2">▶</span>
            </div>
            {submenuVisible.stackBar && (
              <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                {/* By Product */}
                <div
                  className="relative group"
                  onMouseEnter={() =>
                    setSubmenuVisible((s) => ({ ...s, stackBarProduct: true }))
                  }
                  onMouseLeave={() =>
                    setSubmenuVisible((s) => ({ ...s, stackBarProduct: false }))
                  }
                >
                  <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                    <span>By Product</span>
                    <span className="ml-2">▶</span>
                  </div>
                  {submenuVisible.stackBarProduct && (
                    <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleStackBarByProductIndividual}
                      >
                        Individual
                      </div>
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleStackBarByProductAll}
                      >
                        All
                      </div>
                    </div>
                  )}
                </div>

                {/* By State */}
                <div
                  className="relative group"
                  onMouseEnter={() =>
                    setSubmenuVisible((s) => ({ ...s, stackBarState: true }))
                  }
                  onMouseLeave={() =>
                    setSubmenuVisible((s) => ({ ...s, stackBarState: false }))
                  }
                >
                  <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                    <span>By State</span>
                    <span className="ml-2">▶</span>
                  </div>
                  {submenuVisible.stackBarState && (
                    <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleStackBarByStateIndividual}
                      >
                        Individual
                      </div>
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleStackBarByStateAll}
                      >
                        All
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Drill Across */}
          <div
            className="relative group"
            onMouseEnter={() => setSubmenuVisible((s) => ({ ...s, drillAcross: true }))}
            onMouseLeave={() =>
              setSubmenuVisible((s) => ({
                ...s,
                drillAcross: false,
                drillAcrossProduct: false,
                drillAcrossState: false,
              }))
            }
          >
            <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
              <span>Drill Across</span>
              <span className="ml-2">▶</span>
            </div>
            {submenuVisible.drillAcross && (
              <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                {/* By Product */}
                <div
                  className="relative group"
                  onMouseEnter={() =>
                    setSubmenuVisible((s) => ({ ...s, drillAcrossProduct: true }))
                  }
                  onMouseLeave={() =>
                    setSubmenuVisible((s) => ({ ...s, drillAcrossProduct: false }))
                  }
                >
                  <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                    <span>By Product</span>
                    <span className="ml-2">▶</span>
                  </div>
                  {submenuVisible.drillAcrossProduct && (
                    <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleDrillAcrossByProductIndividual}
                      >
                        Individual
                      </div>
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleDrillAcrossByProductAll}
                      >
                        All
                      </div>
                    </div>
                  )}
                </div>

                {/* By State */}
                <div
                  className="relative group"
                  onMouseEnter={() =>
                    setSubmenuVisible((s) => ({ ...s, drillAcrossState: true }))
                  }
                  onMouseLeave={() =>
                    setSubmenuVisible((s) => ({ ...s, drillAcrossState: false }))
                  }
                >
                  <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                    <span>By State</span>
                    <span className="ml-2">▶</span>
                  </div>
                  {submenuVisible.drillAcrossState && (
                    <div className="submenu absolute top-0 left-full ml-1 w-40 bg-white border shadow-md rounded z-50">
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleDrillAcrossByStateIndividual}
                      >
                        Individual
                      </div>
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={handleDrillAcrossByStateAll}
                      >
                        All
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}