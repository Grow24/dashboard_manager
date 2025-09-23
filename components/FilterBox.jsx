'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import { FaCog } from 'react-icons/fa';
import { HiMenuAlt2 } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiRefreshCw } from 'react-icons/fi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardContent
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip";

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

const originalData = [
  { name: 'Jan', users: 10 },
  { name: 'Feb', users: 20 },
  { name: 'Mar', users: 30 },
  { name: 'Apr', users: 40 },
  { name: 'May', users: 50 },
  { name: 'Jun', users: 60 },
  { name: 'Jul', users: 70 },
  { name: 'Aug', users: 80 },
  { name: 'Sep', users: 90 },
  { name: 'Oct', users: 100 },
];

const drillDataStatic = [
  { name: "Jan", uv: 4000 },
  { name: "Feb", uv: 3000 },
  { name: "Mar", uv: 2000 },
  { name: "Apr", uv: 2780 },
  { name: "May", uv: 1890 },
  { name: "Jun", uv: 2390 },
  { name: "Jul", uv: 3490 },
];

const productDataStatic = {
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

const stateDataStatic = {
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
  }
};

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

// Custom tooltip for stacked bar chart showing product/state values
function CustomStackedTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white p-2 border rounded shadow text-sm">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between">
          <span style={{ color: entry.color }}>{entry.dataKey}</span>
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function DrillableBarChart({
  drillData,
  productData,
  stateData,
  stackingMode,
  setStackingMode,
  drillAcross,
  setDrillAcross,
  contextMenu,
  setContextMenu,
  submenuVisible,
  setSubmenuVisible,
  contextMenuContainer,
  setSelectedMonths,
  setOtherPanelsFilteredMonths
}) {
  const chartContainerRef = useRef(null);

  // New state for product-wise drill across
  const [productDrillAcross, setProductDrillAcross] = useState(null);

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
          productDrillAcross: false,
        });
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu, setContextMenu, setSubmenuVisible]);

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
  const handleBarClick = (entry) => {
    setOtherPanelsFilteredMonths([entry.name]);
    setSelectedMonths(prev => {
      if (prev.includes(entry.name)) {
        setOtherPanelsFilteredMonths([]);
        return prev.filter(month => month !== entry.name);
      }
      setOtherPanelsFilteredMonths([entry.name]);
      return [entry.name];
    });
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

  // New product-wise Drill Across handlers
  const handleProductDrillAcrossByProductIndividual = () => {
    setProductDrillAcross({ type: 'by-product', scope: 'individual', month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleProductDrillAcrossByProductAll = () => {
    setProductDrillAcross({ type: 'by-product', scope: 'all' });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleProductDrillAcrossByStateIndividual = () => {
    setProductDrillAcross({ type: 'by-state', scope: 'individual', month: contextMenu.data.name });
    setContextMenu({ ...contextMenu, show: false });
  };
  const handleProductDrillAcrossByStateAll = () => {
    setProductDrillAcross({ type: 'by-state', scope: 'all' });
    setContextMenu({ ...contextMenu, show: false });
  };

  const resetStackedView = () => {
    setStackingMode(null);
    setDrillAcross(null);
  };

  const resetProductDrillAcross = () => {
    setProductDrillAcross(null);
  };

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
    return stackingMode.scope === "individual" && stackingMode.month === month;
  };

  const chartData = drillData.map((d) => {
    const base = { name: d.name };
    const { keys } = getKeysAndColors();

    keys.forEach((key) => { base[key] = 0; });

    if (isMonthStacked(d.name)) {
      const sourceData = stackingMode?.type === "product" ? productData : stateData;
      const breakdown = sourceData[d.name] || [];
      breakdown.forEach((item) => {
        const key = stackingMode?.type === "product" ? item.product : item.state;
        base[key] = item.value;
      });
      base.uv = 0;
    } else {
      base.uv = d.uv;
    }

    return base;
  });

  const { keys, colors } = getKeysAndColors();

  const renderDrillAcrossPanel = () => {
    if (!drillAcross) return null;
    let rows = [];
    if (drillAcross.scope === "individual") {
      rows = (drillAcrossData[drillAcross.type][drillAcross.month] || []);
    } else if (drillAcross.scope === "all") {
      rows = Object.entries(drillAcrossData[drillAcross.type] || {}).flatMap(
        ([month, arr]) => arr.map(row => ({ Month: month, ...row }))
      );
    }
    return (
      <div className="w-full bg-white rounded shadow-lg mt-6 p-4 border border-gray-200">
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

  const renderProductDrillAcrossChart = () => {
    if (!productDrillAcross) return null;

    let data = [];
    let keys = [];
    let colors = {};

    if (productDrillAcross.scope === 'individual') {
      const month = productDrillAcross.month;
      if (productDrillAcross.type === 'by-product') {
        const prodData = productData[month] || [];
        data = prodData.map(({ product, value }) => ({ name: product, value }));
        keys = ['value'];
        colors = { value: productColors[prodData[0]?.product] || '#8884d8' };
      } else {
        const stateDataMonth = stateData[month] || [];
        data = stateDataMonth.map(({ state, value }) => ({ name: state, value }));
        keys = ['value'];
        colors = { value: stateColors[stateDataMonth[0]?.state] || '#82ca9d' };
      }
    } else if (productDrillAcross.scope === 'all') {
      if (productDrillAcross.type === 'by-product') {
        const allProducts = new Set();
        Object.values(productData).forEach(list => list.forEach(p => allProducts.add(p.product)));
        keys = Array.from(allProducts);
        data = Object.entries(productData).map(([month, prodList]) => {
          const entry = { name: month };
          keys.forEach(k => {
            const prod = prodList.find(p => p.product === k);
            entry[k] = prod ? prod.value : 0;
          });
          return entry;
        });
        colors = productColors;
      } else {
        const allStates = new Set();
        Object.values(stateData).forEach(list => list.forEach(s => allStates.add(s.state)));
        keys = Array.from(allStates);
        data = Object.entries(stateData).map(([month, stateList]) => {
          const entry = { name: month };
          keys.forEach(k => {
            const st = stateList.find(s => s.state === k);
            entry[k] = st ? st.value : 0;
          });
          return entry;
        });
        colors = stateColors;
      }
    }

    return (
      <div className="mt-6 bg-white p-4 rounded shadow border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-lg">
            Product-wise Drill Across: {productDrillAcross.type === 'by-product' ? 'By Product' : 'By State'} {productDrillAcross.scope === 'individual' ? `- ${productDrillAcross.month}` : '(All Months)'}
          </h3>
          <button
            className="text-indigo-600 hover:underline text-sm"
            onClick={resetProductDrillAcross}
          >
            Close
          </button>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            barCategoryGap="20%"
            barGap={4}
            margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip content={<CustomStackedTooltip />} />
            <Legend />
            <Bar
              dataKey="uv"
              maxBarSize={40}
              isAnimationActive={false}
              fill="#6366F1"
              onClick={handleBarClick}
              onContextMenu={handleCellContextMenu}
            />
            {keys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={colors[key]}
                onContextMenu={handleCellContextMenu}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const handleCellContextMenu = (e, entry) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      data: entry
    });
    setSubmenuVisible({
      stackBar: false,
      drillAcross: false,
      stackBarProduct: false,
      stackBarState: false,
      drillAcrossProduct: false,
      drillAcrossState: false,
      productDrillAcross: false,
    });
  };

  const showReset = stackingMode !== null || drillAcross !== null || productDrillAcross !== null;

  const contextMenuNode = contextMenu.show
    ? ReactDOM.createPortal(
        <div
          className="context-menu fixed z-[9999] bg-white border shadow-md rounded w-56"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
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

          {/* New Drill Across (Product-wise) */}
          <div
            className="relative group"
            onMouseEnter={() => setSubmenuVisible((s) => ({ ...s, productDrillAcross: true }))}
            onMouseLeave={() => setSubmenuVisible((s) => ({ ...s, productDrillAcross: false }))}
          >
            <div className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
              <span>Drill Across (Product-wise)</span>
              <span className="ml-2">▶</span>
            </div>
            {submenuVisible.productDrillAcross && (
              <div className="submenu absolute top-0 left-full ml-1 w-48 bg-white border shadow-md rounded z-50">
                {/* By Product */}
                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={handleProductDrillAcrossByProductIndividual}
                >
                  By Product (Individual)
                </div>
                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={handleProductDrillAcrossByProductAll}
                >
                  By Product (All)
                </div>
                {/* By State */}
                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={handleProductDrillAcrossByStateIndividual}
                >
                  By State (Individual)
                </div>
                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={handleProductDrillAcrossByStateAll}
                >
                  By State (All)
                </div>
              </div>
            )}
          </div>
        </div>,
        contextMenuContainer || document.body
      )
    : null;

  return (
    <div ref={chartContainerRef} className="relative">
      {showReset && (
        <div className="mb-2 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetStackedView();
              resetProductDrillAcross();
            }}
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          >
            Reset View
          </Button>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          barCategoryGap="20%"
          barGap={4}
          margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <ChartTooltip />
          <Legend />
          {stackingMode ? (
            keys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={colors[key]}
                onContextMenu={(e) => handleCellContextMenu(e, { name: key })}
              />
            ))
          ) : (
            <Bar
              dataKey="uv"
              maxBarSize={40}
              isAnimationActive={false}
            >
              {drillData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="#6366F1"
                  onClick={() => handleBarClick(entry)}
                  onContextMenu={(e) => handleCellContextMenu(e, entry)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>

      {renderDrillAcrossPanel()}

      {renderProductDrillAcrossChart()}

      {contextMenuNode}
    </div>
  );
}

// Modal component for maximize popup with forwarded ref
const Modal = forwardRef(({ children, onClose }, ref) => {
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => containerRef.current);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={containerRef}
        className="bg-white rounded-lg shadow-lg w-[90vw] h-[90vh] flex flex-col"
      >
        <div className="flex justify-end p-2 border-b">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-xl font-bold"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
});

// Panel component with controlled menu open state
const Panel = ({
  title,
  children,
  panelKey,
  filterBox = false,
  showFilters,
  setShowFilters,
  panel1MinUsers,
  setPanel1MinUsers,
  panel1MaxUsers,
  setPanel1MaxUsers,
  filteredData,
  selectedPanels,
  onMaximize,
  menuOpen,
  setMenuOpenGlobal,
  setSelectedMonths,
  setOtherPanelsFilteredMonths
}) => {
  const isVisible = selectedPanels[panelKey];
  const localFilteredData = isVisible ? filteredData : [];

  const handleRefresh1 = () => {
    setSelectedMonths([]);
    setOtherPanelsFilteredMonths([]);
    alert('Cross Filter cleared');
  };

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpenGlobal(null);
    } else {
      setMenuOpenGlobal(panelKey);
    }
  };

  return (
    <div className={`h-full w-full overflow-y-auto panel-content`}>
      <Card className="relative h-full flex flex-col">
        <CardHeader className="flex justify-between items-center mb-2 panel-header cursor-move">
          <h2 className="text-lg font-medium">{title}</h2>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              className="text-gray-600 hover:text-black"
              aria-label="Open panel menu"
            >
              &#8942;
            </Button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-50 py-1"
                >
                  <Button variant="ghost" className="w-full justify-start text-sm">Edit</Button>
                  <Button variant="ghost" className="w-full justify-start text-sm">Delete</Button>
                  <Button variant="ghost" className="w-full justify-start text-sm">Details</Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={() => {
                      setMenuOpenGlobal(null);
                      onMaximize && onMaximize(panelKey);
                    }}
                  >
                    Maximize
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardHeader>
        {filterBox && (
          <div className="px-4 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((prev) => !prev)}
              className="mb-2"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 mt-2">
                    <div>
                      <Label>Panel 1 Min Users</Label>
                      <Input
                        type="number"
                        value={panel1MinUsers}
                        onChange={(e) => setPanel1MinUsers(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Panel 1 Max Users</Label>
                      <Input
                        type="number"
                        value={panel1MaxUsers}
                        onChange={(e) => setPanel1MaxUsers(e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <CardContent className="flex-1 flex flex-col min-h-0">
          {isVisible && children(localFilteredData)}
        </CardContent>
      </Card>
    </div>
  );
};
// --- DrillableBarChart and DrillAcrossTable ---
// (Assuming these components and static data remain unchanged from your original code)
// Please keep your existing DrillableBarChart, DrillAcrossTable, Modal, Panel components here unchanged.

export default function Page() {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedNew, setCollapsedNew] = useState(false);

  // === GLOBAL FILTERS (for all pages except Page 1) ===
  const [minUsers, setMinUsers] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [selectedMonths, setSelectedMonths] = useState([]);

  // === PAGE 1 FILTERS (independent from global filters) ===
  const [page1MinUsers, setPage1MinUsers] = useState('');
  const [page1MaxUsers, setPage1MaxUsers] = useState('');
  const [page1SelectedMonths, setPage1SelectedMonths] = useState([]);

  // Other states remain unchanged
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("page1");
  const [otherPanelsFilteredMonths, setOtherPanelsFilteredMonths] = useState([]);
  const [selectedPanels, setSelectedPanels] = useState({
    panel1: true,
    panel2: true,
    panel3: true,
    panel4: true,
    panel5: true,
    panel6: true,
  });
  const [maximizedPanel, setMaximizedPanel] = useState(null);
  const [stackingMode, setStackingMode] = useState(null);
  const [drillAcross, setDrillAcross] = useState(null);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, data: null });
  const [submenuVisible, setSubmenuVisible] = useState({
    stackBar: false,
    drillAcross: false,
    stackBarProduct: false,
    stackBarState: false,
    drillAcrossProduct: false,
    drillAcrossState: false,
    productDrillAcross: false,
  });
  const modalContainerRef = useRef(null);
  const [openMenuPanel, setOpenMenuPanel] = useState(null);

  // === FILTERING LOGIC ===

  // Filtered data for Page 1 panels using Page 1 filters
  const filteredDrillDataWithMonths = originalData.filter(d => {
    const aboveMin = page1MinUsers === '' || d.users >= Number(page1MinUsers);
    const belowMax = page1MaxUsers === '' || d.users <= Number(page1MaxUsers);
    const inSelectedMonths = page1SelectedMonths.length === 0 || page1SelectedMonths.includes(d.name);
    return aboveMin && belowMax && inSelectedMonths;
  });

  // Filtered data for other panels (all pages except Page 1) using global filters
  const filteredOtherPanelsData = originalData.filter((item) => {
    const aboveMin = minUsers === '' || item.users >= Number(minUsers);
    const belowMax = maxUsers === '' || item.users <= Number(maxUsers);
    const inSelectedMonths = selectedMonths.length === 0 || selectedMonths.includes(item.name);
    return aboveMin && belowMax && inSelectedMonths;
  });

  // === HANDLERS FOR PAGE 1 FILTERS ===
  const handlePage1MinUsersChange = (e) => setPage1MinUsers(e.target.value);
  const handlePage1MaxUsersChange = (e) => setPage1MaxUsers(e.target.value);
  const handlePage1MonthToggle = (month) => {
    setPage1SelectedMonths((prev) =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };
  const resetPage1Filters = () => {
    setPage1MinUsers('');
    setPage1MaxUsers('');
    setPage1SelectedMonths([]);
  };

  // === HANDLERS FOR GLOBAL FILTERS ===
  const handleMinUsersChange = (e) => setMinUsers(e.target.value);
  const handleMaxUsersChange = (e) => setMaxUsers(e.target.value);
  const handleMonthToggle = (month) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };
  const resetGlobalFilters = () => {
    setMinUsers('');
    setMaxUsers('');
    setSelectedMonths([]);
  };

  // === UI ===

  // Panels order and drag-drop logic remain unchanged
  // (Keep your existing drag and drop handlers and panel order logic here)

  const dragItemIndex = useRef(null);
  const [draggedPanel, setDraggedPanel] = useState(null);

  const onDragStart = (e, index, panelKey) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedPanel({ index, key: panelKey });
    e.target.classList.add('dragging');
  };
  const canDropPanel = (dragIndex, dropIndex) => {
    const dragRow = dragIndex < 3 ? 0 : 1;
    const dropRow = dropIndex < 3 ? 0 : 1;
    if (dragRow === dropRow) return true;
    const targetRow = dropRow === 0 ? firstRowPanels : secondRowPanels;
    return targetRow.length < (dropRow === 0 ? 3 : 2);
  };
  const onDragOver = (e, index, panelKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (draggedPanel && draggedPanel.key !== panelKey && canDropPanel(draggedPanel.index, index)) {
      e.currentTarget.classList.add('drop-target');
    }
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-target');
  };
  const handleRefresh1 = () => {
    setSelectedMonths([]);
    setOtherPanelsFilteredMonths([]);
  };

  const handleRefresh2 = () => {
    setMinUsers('');
    setMaxUsers('');
    setSelectedMonths([]);
  };
  const TableComponent = ({ data }) => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.users}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {Math.round((item.users / (data[index - 1]?.users || item.users) - 1) * 100)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    item.users > 50 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.users > 50 ? 'Active' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  const handleRefresh3 = () => {
    setPanel1MinUsers('');
    setPanel1MaxUsers('');
  };
  const onDrop = (e, dropIndex, dropPanelKey) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-target');

    if (!draggedPanel || draggedPanel.key === dropPanelKey) return;

    setPanelOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const dragIndex = draggedPanel.index;

      const [movedPanel] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, movedPanel);

      return newOrder;
    });

    setDraggedPanel(null);
  };
  const onDragEnd = (e) => {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drop-target').forEach(el => {
      el.classList.remove('drop-target');
    });
    setDraggedPanel(null);
  };

  const firstRowPanels = panelOrder.slice(0, 3);
  const secondRowPanels = panelOrder.slice(3);

  const handleMaximize = (panelKey) => {
    setMaximizedPanel(panelKey);
    setOpenMenuPanel(null);
  };

  const closeMaximize = () => {
    setMaximizedPanel(null);
  };

  // History tab content component
  const HistoryTabContent = () => {
    if (filterHistory.length === 0) {
      return <div className="text-sm text-gray-500">No history available</div>;
    }
    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-lg">Filter History</h3>
          <Button size="sm" variant="outline" onClick={clearHistory}>Clear</Button>
        </div>
        <div className="overflow-auto flex-1 border rounded p-2 bg-white">
          <ul className="divide-y divide-gray-200">
            {filterHistory.map((item) => (
              <li
                key={item.id}
                className="cursor-pointer hover:bg-indigo-100 p-2 rounded"
                onClick={() => applyFilterFromHistory(item)}
                title={`Min Users: ${item.minUsers || 'None'}, Max Users: ${item.maxUsers || 'None'}, Months: ${item.selectedMonths.length > 0 ? item.selectedMonths.join(', ') : 'All'}`}
              >
                <div className="text-sm font-medium">
                  Min: {item.minUsers || 'None'}, Max: {item.maxUsers || 'None'}
                </div>
                <div className="text-xs text-gray-600">
                  Months: {item.selectedMonths.length > 0 ? item.selectedMonths.join(', ') : 'All'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };
  // Example panel order (adjust as per your original code)
  const firstRowPanels = ['panel1', 'panel2', 'panel3'];
  const secondRowPanels = ['panel4', 'panel5', 'panel6'];

  // Drag and drop handlers (onDragStart, onDragOver, onDrop, onDragEnd) remain unchanged

  // Maximize handlers remain unchanged

  // TableComponent remains unchanged

  return (
    <div className="min-h-screen flex bg-background">
      {/* SidebarMenu and FilterSidebar remain unchanged */}
<aside className={`${collapsed ? 'w-20' : 'w-60'} transition-all duration-300 bg-white border-r h-screen flex flex-col justify-between py-6`}>
        <div>
          <div className="flex items-center justify-between px-4 mb-6">
            <span className="text-xl font-bold">{collapsed ? 'I' : 'ISM1'}</span>
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
              <HiMenuAlt2 size={20} />
            </Button>
          </div>
          <nav className="space-y-1">
            {[
              { label: 'Dashboard', icon: '📊', href: '/dashboard' },
              { label: 'Endpoints', icon: '🧩', href: '/endpoints' },
              { label: 'Leads', icon: '👥', href: '/leads' },
              { label: 'Logs', icon: '📄', href: '/logs' },
              { label: 'Bar chart', icon: '📚', href: '/documentation' },
              { label: 'Support', icon: '🛠️', href: '/support' },
              { label: 'Context', icon: '🛠️', href: '/context' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 p-2 mx-2 rounded-lg hover:bg-gray-100 ${
                  item.href === '/support' ? 'bg-gray-200 font-semibold' : ''
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </a>
            ))}
          </nav>
        </div>
        <div className="px-4 text-sm text-gray-400">
          {!collapsed && <p className="mb-2 font-medium">Account Information</p>}
          <p>© 2025</p>
        </div>
      </aside>

      {/* FilterSidebar */}
      <aside
        className={`${collapsedNew ? 'w-20' : 'w-60'} transition-all duration-300 bg-white border-r h-screen flex flex-col py-6`}
      >
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 mb-6">
            <span className="text-xl font-bold">{collapsedNew ? 'I' : 'Filters 1'}</span>
            <Button variant="ghost" size="icon" onClick={() => setCollapsedNew(!collapsedNew)}>
              <HiMenuAlt2 size={20} />
            </Button>
          </div>

          {!collapsedNew && (
            <Tabs defaultValue="filter" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3 mx-4">
                <TabsTrigger value="filter">Filter</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="generate">Generate</TabsTrigger>
              </TabsList>

              <TabsContent value="filter" className="flex-1 overflow-auto">
                <div className="flex justify-between px-4 py-2 border-b">
                  <Button title='Cross Filter'
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh1}
                    className="hover:bg-gray-100 p-2"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                  </Button>
                  <Button title='Global Filter'
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh2}
                    className="hover:bg-gray-100 p-2"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                  </Button>
                  <Button title='Individual Filter'
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh3}
                    className="hover:bg-gray-100 p-2"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <nav className="space-y-4 px-4 text-sm">
                  <div>
                    <Label htmlFor="min-users">Min Users (Global)</Label>
                    <Input
                      type="number"
                      value={minUsers}
                      onChange={(e) => setMinUsers(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-users">Max Users (Global)</Label>
                    <Input
                      type="number"
                      value={maxUsers}
                      onChange={(e) => setMaxUsers(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Select Months</label>
                    <div className="space-y-1 max-h-48 overflow-auto">
                      {originalData.map((item) => (
                        <label key={item.name} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedMonths.includes(item.name)}
                            onChange={() => handleMonthChange(item.name)}
                          />
                          <span>{item.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block mb-1 font-medium">Select Panels</label>
                    <div className="space-y-1">
                      {['panel1', 'panel2', 'panel3', 'panel4', 'panel5', 'panel6'].map((panel) => (
                        <label key={panel} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedPanels[panel]}
                            onChange={() => handlePanelChange(panel)}
                          />
                          <span>{`Panel ${panel.slice(-1)}`}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </nav>
              </TabsContent>

              <TabsContent value="history" className="flex-1 p-4">
                <HistoryTabContent />
              </TabsContent>

              <TabsContent value="generate" className="flex-1 p-4">
                <div className="text-sm text-gray-500">
                  Generate content coming soon
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </aside>
      {/* Main Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Home &gt; <span className="text-black font-medium">Support</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <FaCog className="text-xl text-gray-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </header>

        {/* Page 1 Header Filters */}
        <div className="bg-white border-b px-6 py-3 flex items-center space-x-6">
          {activeTab === "page1" && (
            <>
              {/* Refresh icon on far left */}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetPage1Filters}
                className="mr-4"
                title="Reset Page 1 Filters"
              >
                <FiRefreshCw className="h-5 w-5" />
              </Button>

              <div className="flex flex-col">
                <Label htmlFor="header-min-users">Min Users (Page 1)</Label>
                <Input
                  id="header-min-users"
                  type="number"
                  value={page1MinUsers}
                  onChange={handlePage1MinUsersChange}
                  className="w-24"
                />
              </div>
              <div className="flex flex-col">
                <Label htmlFor="header-max-users">Max Users (Page 1)</Label>
                <Input
                  id="header-max-users"
                  type="number"
                  value={page1MaxUsers}
                  onChange={handlePage1MaxUsersChange}
                  className="w-24"
                />
              </div>
              <div>
                <Label>Months (Page 1)</Label>
                <div className="flex space-x-2 max-w-xs overflow-x-auto">
                  {originalData.map((item) => (
                    <label
                      key={item.name}
                      className="flex items-center space-x-1 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={page1SelectedMonths.includes(item.name)}
                        onChange={() => handlePage1MonthToggle(item.name)}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Page 2 header filters remain unchanged */}
         {activeTab === "page2" && (
                     <>
                       <div className="flex flex-col">
                         <Label htmlFor="header-min-users-page2">Min Users (Page 2)</Label>
                         <Input
                           id="header-min-users-page2"
                           type="number"
                           value={page2MinUsers}
                           onChange={(e) => setPage2MinUsers(e.target.value)}
                           className="w-24"
                         />
                       </div>
                       <div className="flex flex-col">
                         <Label htmlFor="header-max-users-page2">Max Users (Page 2)</Label>
                         <Input
                           id="header-max-users-page2"
                           type="number"
                           value={page2MaxUsers}
                           onChange={(e) => setPage2MaxUsers(e.target.value)}
                           className="w-24"
                         />
                       </div>
                       <div>
                         <Label>Months (Page 2)</Label>
                         <div className="flex space-x-2 max-w-xs overflow-x-auto">
                           {originalData.map((item) => (
                             <label key={item.name} className="flex items-center space-x-1 cursor-pointer select-none">
                               <input
                                 type="checkbox"
                                 checked={page2SelectedMonths.includes(item.name)}
                                 onChange={() => {
                                   const newMonths = page2SelectedMonths.includes(item.name)
                                     ? page2SelectedMonths.filter(m => m !== item.name)
                                     : [...page2SelectedMonths, item.name];
                                   setPage2SelectedMonths(newMonths);
                                 }}
                               />
                               <span>{item.name}</span>
                             </label>
                           ))}
                         </div>
                       </div>
                       <Button variant="outline" size="sm" onClick={() => {
                         setPage2MinUsers('');
                         setPage2MaxUsers('');
                         setPage2SelectedMonths([]);
                       }}>
                         <FiRefreshCw className="h-4 w-4 mr-1" /> Reset Filters
                       </Button>
                     </>
                   )}
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-10 bg-gray-50">
          <h1 className="text-xl font-semibold mb-6">
            Charts: <span className="text-gray-600">Bar, Pie, and Area Visualizations</span>
          </h1>

          {activeTab === "page1" ? (
            <>
              {/* First row panels */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${firstRowPanels.length}, 1fr)`,
                  gridAutoRows: '400px',
                  gap: '24px',
                  marginBottom: '24px',
                }}
              >
                {firstRowPanels.map((panelKey, index) => (
                  <div
                    key={panelKey}
                    style={{ minWidth: 0, minHeight: 0 }}
                    draggable
                    onDragStart={(e) => onDragStart(e, index, panelKey)}
                    onDragOver={(e) => onDragOver(e, index, panelKey)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, index, panelKey)}
                    onDragEnd={onDragEnd}
                    className="panel-container"
                    data-panel-key={panelKey}
                  >
                    {panelKey === 'panel1' && (
                      <Panel
                        title="Monthly Sales Overview (Drillable)"
                        panelKey="panel1"
                        filterBox
                        showFilters={showFilters}
                        setShowFilters={setShowFilters}
                        panel1MinUsers={page1MinUsers}  // Use Page 1 filters here
                        setPanel1MinUsers={setPage1MinUsers}
                        panel1MaxUsers={page1MaxUsers}
                        setPanel1MaxUsers={setPage1MaxUsers}
                        filteredData={filteredDrillDataWithMonths}
                        selectedPanels={selectedPanels}
                        onMaximize={handleMaximize}
                        menuOpen={openMenuPanel === 'panel1'}
                        setMenuOpenGlobal={setOpenMenuPanel}
                        setSelectedMonths={setPage1SelectedMonths}
                        setOtherPanelsFilteredMonths={setOtherPanelsFilteredMonths}
                      >
                        {() => (
                          <DrillableBarChart
                            drillData={filteredDrillDataWithMonths}
                            productData={filteredProductDataWithMonths}
                            stateData={filteredStateDataWithMonths}
                            stackingMode={stackingMode}
                            setStackingMode={setStackingMode}
                            drillAcross={drillAcross}
                            setDrillAcross={setDrillAcross}
                            contextMenu={contextMenu}
                            setContextMenu={setContextMenu}
                            submenuVisible={submenuVisible}
                            setSubmenuVisible={setSubmenuVisible}
                            setSelectedMonths={setPage1SelectedMonths}
                            setOtherPanelsFilteredMonths={setOtherPanelsFilteredMonths}
                          />
                        )}
                      </Panel>
                    )}
                    {panelKey === 'panel2' && (
                      <Panel
                        title="User Distribution"
                        panelKey="panel2"
                        filteredData={filteredDrillDataWithMonths} // Use Page 1 filtered data
                        selectedPanels={selectedPanels}
                        onMaximize={handleMaximize}
                        menuOpen={openMenuPanel === 'panel2'}
                        setMenuOpenGlobal={setOpenMenuPanel}
                      >
                        {(data) => (
                          <div style={{ width: '100%', height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={data}
                                  dataKey="users"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label
                                >
                                  {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                      </Panel>
                    )}
                    {panelKey === 'panel3' && (
                      <Panel
                        title="User Growth Trend"
                        panelKey="panel3"
                        filteredData={filteredDrillDataWithMonths} // Use Page 1 filtered data
                        selectedPanels={selectedPanels}
                        onMaximize={handleMaximize}
                        menuOpen={openMenuPanel === 'panel3'}
                        setMenuOpenGlobal={setOpenMenuPanel}
                      >
                        {(data) => (
                          <div style={{ width: '100%', height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={data}>
                                <defs>
                                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" />
                                <ChartTooltip />
                                <Area type="monotone" dataKey="users" stroke="#6366F1" fill="url(#colorUsers)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </Panel>
                    )}
                  </div>
                ))}
              </div>

              {/* Second row panels (Page 1) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${secondRowPanels.length}, 1fr)`,
                  gridAutoRows: '400px',
                  gap: '24px',
                }}
              >
                {secondRowPanels.map((panelKey, index) => (
                  <div
                    key={panelKey}
                    style={{ minWidth: 0, minHeight: 0 }}
                    draggable
                    onDragStart={(e) => onDragStart(e, index + firstRowPanels.length, panelKey)}
                    onDragOver={(e) => onDragOver(e, index + firstRowPanels.length, panelKey)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, index + firstRowPanels.length, panelKey)}
                    onDragEnd={onDragEnd}
                    className="panel-container"
                    data-panel-key={panelKey}
                  >
                    {/* Panels 4,5,6 are on other pages, so use global filters */}
                    {panelKey === 'panel4' && (
                      <Panel
                        title="User Breakdown (ECharts)"
                        panelKey="panel4"
                        filteredData={filteredOtherPanelsData}
                        selectedPanels={selectedPanels}
                        onMaximize={handleMaximize}
                        menuOpen={openMenuPanel === 'panel4'}
                        setMenuOpenGlobal={setOpenMenuPanel}
                      >
                        {(data) => {
                          const option = {
                            tooltip: { trigger: 'item' },
                            legend: { top: '5%', left: 'center' },
                            series: [
                              {
                                name: 'Users',
                                type: 'pie',
                                radius: ['40%', '70%'],
                                avoidLabelOverlap: false,
                                itemStyle: {
                                  borderRadius: 10,
                                  borderColor: '#fff',
                                  borderWidth: 2
                                },
                                label: { show: false, position: 'center' },
                                emphasis: {
                                  label: {
                                    show: true,
                                    fontSize: '18',
                                    fontWeight: 'bold'
                                  }
                                },
                                labelLine: { show: false },
                                data: data.map((item) => ({ value: item.users, name: item.name }))
                              }
                            ]
                          };
                          return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
                        }}
                      </Panel>
                    )}
                    {panelKey === 'panel5' && (
                      <Panel
                        title="User Comparison (Recharts) 11"
                        panelKey="panel5"
                        filteredData={filteredOtherPanelsData}
                        selectedPanels={selectedPanels}
                        onMaximize={handleMaximize}
                        menuOpen={openMenuPanel === 'panel5'}
                        setMenuOpenGlobal={setOpenMenuPanel}
                      >
                        {(data) => (
                          <div style={{ width: '100%', height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <ChartTooltip />
                                <Legend />
                                <Bar dataKey="users" fill="#10B981" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </Panel>
                    )}
                    {panelKey === 'panel6' && (
                      <Panel
                        title="Detailed Data View"
                        panelKey="panel6"
                        filteredData={filteredOtherPanelsData}
                        selectedPanels={selectedPanels}
                        onMaximize={handleMaximize}
                        menuOpen={openMenuPanel === 'panel6'}
                        setMenuOpenGlobal={setOpenMenuPanel}
                      >
                        {(data) => (
                          <div className="h-full overflow-auto">
                            <TableComponent data={data} />
                          </div>
                        )}
                      </Panel>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Card className="mt-6">
              <CardHeader>
                <h3 className="text-lg font-medium">Detailed Data View</h3>
              </CardHeader>
              <CardContent>
                <TableComponent data={filteredOtherPanelsData} />
              </CardContent>
            </Card>
          )}
        </main>
  <footer className="bg-white border-t">
          <div className="px-6 py-2">
            <Tabs defaultValue="page1" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="page1">Page 1</TabsTrigger>
                <TabsTrigger value="page2">Page 2</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="px-6 py-2 text-sm text-gray-500">
            © intelligentsalesman.com, 2025 — All rights reserved.
          </div>
        </footer>
        {/* Footer and maximize modal remain unchanged */}
        {/* ... */}
      </div>
       {maximizedPanel && (
              <Modal ref={modalContainerRef} onClose={closeMaximize}>
                {maximizedPanel === 'panel1' && (
                  <Panel
                    title="Monthly Sales Overview (Drillable)"
                    panelKey="panel1"
                    filterBox
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    panel1MinUsers={panel1MinUsers}
                    setPanel1MinUsers={setPanel1MinUsers}
                    panel1MaxUsers={panel1MaxUsers}
                    setPanel1MaxUsers={setPanel1MaxUsers}
                    filteredData={filteredDrillDataWithMonths}
                    selectedPanels={{ panel1: true }}
                    onMaximize={() => { }}
                    menuOpen={false}
                    setMenuOpenGlobal={() => { }}
                    setSelectedMonths={setSelectedMonths}
                    setOtherPanelsFilteredMonths={setOtherPanelsFilteredMonths}
                  >
                    {() => (
                      <DrillableBarChart
                        drillData={filteredDrillDataWithMonths}
                        productData={filteredProductDataWithMonths}
                        stateData={filteredStateDataWithMonths}
                        stackingMode={stackingMode}
                        setStackingMode={setStackingMode}
                        drillAcross={drillAcross}
                        setDrillAcross={setDrillAcross}
                        contextMenu={contextMenu}
                        setContextMenu={setContextMenu}
                        submenuVisible={submenuVisible}
                        setSubmenuVisible={setSubmenuVisible}
                        contextMenuContainer={modalContainerRef.current}
                        setSelectedMonths={setSelectedMonths}
                        setOtherPanelsFilteredMonths={setOtherPanelsFilteredMonths}
                      />
                    )}
                  </Panel>
                )}
                {maximizedPanel === 'panel2' && (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={filteredData}
                        dataKey="users"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={150}
                        label
                      >
                        {filteredData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {maximizedPanel === 'panel3' && (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={filteredData}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <ChartTooltip />
                      <Area type="monotone" dataKey="users" stroke="#6366F1" fill="url(#colorUsers)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                {maximizedPanel === 'panel4' && (
                  <ReactECharts
                    option={{
                      tooltip: { trigger: 'item' },
                      legend: { top: '5%', left: 'center' },
                      series: [
                        {
                          name: 'Users',
                          type: 'pie',
                          radius: ['40%', '70%'],
                          avoidLabelOverlap: false,
                          itemStyle: {
                            borderRadius: 10,
                            borderColor: '#fff',
                            borderWidth: 2
                          },
                          label: { show: false, position: 'center' },
                          emphasis: {
                            label: {
                              show: true,
                              fontSize: '18',
                              fontWeight: 'bold'
                            }
                          },
                          labelLine: { show: false },
                          data: filteredData.map((item) => ({ value: item.users, name: item.name }))
                        }
                      ]
                    }}
                    style={{ height: '400px', width: '100%' }}
                  />
                )}
                {maximizedPanel === 'panel5' && (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={filteredData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip />
                      <Legend />
                      <Bar dataKey="users" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {maximizedPanel === 'panel6' && (
                  <div className="h-full overflow-auto">
                    <TableComponent data={filteredData} />
                  </div>
                )}
              </Modal>
            )}
    </div>
  );
}