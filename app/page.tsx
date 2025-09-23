"use client";

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
// import { FaCog } from 'react-icons/fa';
import { HiMenuAlt2 } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiRefreshCw } from 'react-icons/fi';
import LeftSliders from './LeftSliders';



// import React, { useState } from 'react';
import { MdKeyboardArrowLeft, MdKeyboardArrowRight, MdExpandLess, MdExpandMore } from 'react-icons/md';
import { FaCog, FaTachometerAlt, FaProjectDiagram, FaUsers, FaFileAlt, FaFile, FaStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FiMoreVertical, FiTrash2, FiEdit, FiScissors, FiMove } from 'react-icons/fi';
import OldThemePage from './OldThemePage'; // Adjust path as needed NewDashboard
import NewCustomPage from './NewCustomPage'; // Adjust path as needed NewDashboard
import NewDashboard from './NewDashboard'; // Adjust path as neededMapsAndTable  MapsAndTable
import NewCopyPast from './NewCopyPast'; // Adjust path as needed PivotTable
import MapsAndTable from './MapsAndTable'; // Adjust path as needed Animated Charts 
import PivotTable from './PivotTable'; // Adjust path as needed
import AnimatedCharts from './AnimatedCharts'; // Adjust path as needed
import NewPivotTable from './NewPivotTable'; // Adjust path as needed
import HierarchyTable from './HierarchyTable'; // Adjust path as needed
import DashboardCreate from './DashboardCreate'; // Adjust path as needed
import DashboardCreateNew from './DashboardCreateNew'; // Adjust path as needed GroupsVsSets
import DashboardFilter from './DashboardFilternew'; // Adjust path as needed
import ParameterPanel from './ParameterPanel'; // Adjust path as needed
import Dashboard1 from './Dashboard1'; // Adjust path as needed Build
import Dashboard2 from './Dashboard2'; // Adjust path as needed
import Build from './Build'; 
import GroupsVsSets from './GroupsVsSets'; // Adjust path as needed
// import ContactContent from './ContactContent'; // Adjust path as needed BookmarkTabs
import { ContactContent } from './ContactContent';
// import { BookmarkTabs } from './BookmarkTabs';
import MapsContent from './MapsContent';
import BookmarkTabs from './BookmarkTabs';
import Pane from './Pane';
import Pane1 from './Pane1';
import Pane2 from './Pane2';
import GlobleFilter from './GlobleFilter';
import TestPageCreation from './TestPageCreation';
import DashboardList from './DashboardList';
import FilterTablePage from './FilterTablePage';
import FilterDashboard from './FilterDashboard';
import FilterDashboard1 from './FilterDashboard1';
import Dashboard3 from './Dashboard3';
import Dashboard4 from './Dashboard4';
import Dashboard5 from './Dashboard5';
import Dashboard6 from './Dashboard6';
import Layoutchart from './Layoutchart';
// import Maps from './Maps';
import { Bar, Line, Pie } from 'react-chartjs-2';
import Link from 'next/link';
import { usePathname } from 'next/navigation';



import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  PieChart,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
   Tooltip, 
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

import {
  Tooltip as UITooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardContent
} from "@/components/ui/card";

const sampleData = [
  { customerName: 'Alice', orderDate: '2025-05-01', product: 'Widget', quantity: 10, price: 25, status: 'Active' },
  { customerName: 'Bob', orderDate: '2025-05-05', product: 'Gadget', quantity: 5, price: 40, status: 'Completed' },
  { customerName: 'Charlie', orderDate: '2025-05-10', product: 'Widget', quantity: 7, price: 25, status: 'Pending' },
  { customerName: 'Diana', orderDate: '2025-05-15', product: 'Thingamajig', quantity: 3, price: 60, status: 'Active' },
];

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

// ... (Keep all your existing static data and components unchanged) ...

// Your DrillableBarChart, DrillAcrossTable, Modal, Panel components remain unchanged
// except for filtering logic usage which will be updated below

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
const mergeUsers = (drillData) => {
  return drillData.map(d => {
    const orig = originalData.find(o => o.name === d.name);
    return {
      ...d,
      users: orig ? orig.users : 0,
    };
  });
};
function filterDataForPanel({
  data,
  globalFilters,
  pageFilters,
  panelFilters,
  crossFilterMonths,
  panelKey,
  crossFilterSourcePanelKey,
  panelOnCurrentPage,
}) {
  return data.filter(item => {
    const users = item.users;
    const name = item.name;

    // 1. Global filters
    if (globalFilters.minUsers !== '' && users < Number(globalFilters.minUsers)) return false;
    if (globalFilters.maxUsers !== '' && users > Number(globalFilters.maxUsers)) return false;
    if (globalFilters.selectedMonths.length > 0 && !globalFilters.selectedMonths.includes(name)) return false;

    // 2. Page-level filters (only if panel is on current page)
    if (panelOnCurrentPage) {
      if (pageFilters.minUsers !== '' && users < Number(pageFilters.minUsers)) return false;
      if (pageFilters.maxUsers !== '' && users > Number(pageFilters.maxUsers)) return false;
      if (pageFilters.selectedMonths.length > 0 && !pageFilters.selectedMonths.includes(name)) return false;
    }

    // 3. Panel-wise filters (only if set)
    if (panelFilters.minUsers !== '' && users < Number(panelFilters.minUsers)) return false;
    if (panelFilters.maxUsers !== '' && users > Number(panelFilters.maxUsers)) return false;
    if (panelFilters.selectedMonths.length > 0 && !panelFilters.selectedMonths.includes(name)) return false;

    // 4. Cross-filtering: if cross-filter active and this panel is NOT the source panel
    if (crossFilterMonths.length > 0 && panelKey !== crossFilterSourcePanelKey) {
      if (!crossFilterMonths.includes(name)) return false;
    }

    return true;
  });
}
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
//   const handleBarClick = (entry) => {
//   const month = entry.name;
//   setOtherPanelsFilteredMonths(prev => {
//     if (prev.includes(month)) {
//       return [];
//     }
//     return [month];
//   });
// };
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
const [filterHistory, setFilterHistory] = useState([]);
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
// Updated Modal component with drag and resize functionality
const Modal = forwardRef(({ children, onClose }, ref) => {
  const modalRef = useRef(null);
  const headerRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: '90vw', height: '90vh' });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeDir, setResizeDir] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useImperativeHandle(ref, () => modalRef.current);

  // Handle mouse down on header for dragging
  const handleHeaderMouseDown = (e) => {
    if (e.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  // Handle mouse down on resize handles
  const handleResizeMouseDown = (dir) => (e) => {
    if (e.button !== 0) return;
    setResizeDir(dir);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: parseInt(size.width),
      height: parseInt(size.height)
    });
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle mouse move for both dragging and resizing
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else if (resizeDir) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = position.x;
      let newY = position.y;

      // Handle resizing from different directions
      if (resizeDir.includes('e')) newWidth = Math.max(300, resizeStart.width + deltaX);
      if (resizeDir.includes('w')) {
        newWidth = Math.max(300, resizeStart.width - deltaX);
        newX = position.x + deltaX;
      }
      if (resizeDir.includes('s')) newHeight = Math.max(300, resizeStart.height + deltaY);
      if (resizeDir.includes('n')) {
        newHeight = Math.max(300, resizeStart.height - deltaY);
        newY = position.y + deltaY;
      }

      setSize({
        width: `${newWidth}px`,
        height: `${newHeight}px`
      });
      setPosition({ x: newX, y: newY });
    }
  };

  // Handle mouse up to stop dragging/resizing
  const handleMouseUp = () => {
    setIsDragging(false);
    setResizeDir(null);
  };

  // Add event listeners when dragging or resizing
  useEffect(() => {
    if (isDragging || resizeDir) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, resizeDir, dragStart, resizeStart]);

  // Resize handles component
  const ResizeHandle = ({ direction }) => (
    <div
      className={`absolute bg-gray-400 opacity-0 hover:opacity-100 transition-opacity ${
        direction.includes('n') ? 'top-0 h-2 cursor-ns-resize' : 'bottom-0 h-2 cursor-ns-resize'
      } ${
        direction.includes('w') ? 'left-0 w-2 cursor-ew-resize' : 'right-0 w-2 cursor-ew-resize'
      } ${
        direction === 'nw' || direction === 'se' ? 'cursor-nwse-resize' : 
        direction === 'ne' || direction === 'sw' ? 'cursor-nesw-resize' : ''
      }`}
      onMouseDown={handleResizeMouseDown(direction)}
    />
  );

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg flex flex-col"
        style={{
          width: size.width,
          height: size.height,
          transform: `translate(${position.x}px, ${position.y}px)`,
          minWidth: '300px',
          minHeight: '300px'
        }}
      >
        {/* Resize handles */}
        <ResizeHandle direction="n" />
        <ResizeHandle direction="s" />
        <ResizeHandle direction="e" />
        <ResizeHandle direction="w" />
        <ResizeHandle direction="nw" />
        <ResizeHandle direction="ne" />
        <ResizeHandle direction="sw" />
        <ResizeHandle direction="se" />

        {/* Header with drag handle */}
        <div
          ref={headerRef}
          className="flex justify-end p-2 border-b cursor-move"
          onMouseDown={handleHeaderMouseDown}
        >
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-xl font-bold"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
});

// Panel component with controlled menu open state setMenuOpenGlobal
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
const panelRef = useRef(null);
  const [height, setHeight] = useState(400); // initial height in px
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const resizablePanels = ['panel1', 'panel2', 'panel3'];

  // Mouse event handlers for resizing
  const onMouseDown = (e) => {
  if (!resizablePanels.includes(panelKey)) return; // allow panel1, panel2, panel3
  isResizing.current = true;
  startY.current = e.clientY;
  startHeight.current = height;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  e.preventDefault();
};

  const onMouseMove = (e) => {
    if (!isResizing.current) return;
    const dy = e.clientY - startY.current;
    const newHeight = Math.max(200, startHeight.current + dy); // minimum height 200px
    setHeight(newHeight);
  };

  const onMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
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
    // <div className={`h-full w-full overflow-y-auto panel-content`}>
     <div
  className={`h-full w-full overflow-y-auto panel-content flex flex-col`}
  style={resizablePanels.includes(panelKey) ? { height: height + 'px', border: '2px solid red', backgroundColor: '#f0f0f0' } : undefined}
  ref={panelRef}
>
      <Card className="relative h-full flex flex-col">
        <CardHeader className="flex justify-between items-center mb-2 panel-header cursor-move">
          <h2
            className={`font-medium ${
              panelKey === 'panel1' ? 'text-sm mt-0 mb-1' : 'text-lg'
            }`}
          >
            {title}
          </h2>
          <div className="relative">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
          setPanel1MinUsers('');
          setPanel1MaxUsers('');
        }}
                className="mr-4"
                title="Reset Page 1 Filters"
              >
                <FiRefreshCw className="h-5 w-5" />
              </Button>
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
                  <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => {
                  setShowFilters(!showFilters);
                  setMenuOpenGlobal(null);
                }}>
                    
                    
                    {showFilters ? 'Hide Filter' : 'Show Filter'}
                    </Button>
                  
             
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardHeader>
        {filterBox && showFilters && (
          <div className="px-4 pb-2">
            {/* Panel 1 Min and Max Users in same row with reduced label width */}
            <div className="flex space-x-4 items-center">
              <div className="flex flex-col w-32">
                <Label className="whitespace-nowrap">Panel 1 Min Users</Label>
                <Input
                  type="number"
                  value={panel1MinUsers}
                  onChange={(e) => setPanel1MinUsers(e.target.value)}
                />
              </div>
              <div className="flex flex-col w-32">
                <Label className="whitespace-nowrap">Panel 1 Max Users</Label>
                <Input
                  type="number"
                  value={panel1MaxUsers}
                  onChange={(e) => setPanel1MaxUsers(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
       <CardContent className="flex-1 flex flex-col min-h-0 relative">
          {isVisible && children(localFilteredData)}

          {/* Resizer handle for panel1, panel2, panel3 */}
          {resizablePanels.includes(panelKey) && (
            <div
              onMouseDown={onMouseDown}
              className="absolute bottom-0 left-0 right-0 h-4 cursor-row-resize bg-gray-200 hover:bg-gray-400 flex justify-center items-center"
              style={{ userSelect: 'none' }}
              title="Drag to resize vertically"
            >
              {/* Resize icon: simple horizontal bars */}
              <div className="w-8 h-1 bg-gray-500 rounded"></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const allFields = ['customerName', 'orderDate', 'product', 'quantity', 'price', 'status'];

const fieldLabels: Record<string, string> = {
  customerName: 'Customer Name',
  orderDate: 'Order Date',
  product: 'Product',
  quantity: 'Quantity',
  price: 'Price',
  status: 'Status',
};

function ArrowToggle({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (val: boolean) => void }) {
  return (
    <button
      onClick={() => setCollapsed(!collapsed)}
      className="p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
      type="button"
    >
      {collapsed ? (
        <MdKeyboardArrowRight size={30} className="text-gray-700" />
      ) : (
        <MdKeyboardArrowLeft size={30} className="text-gray-700" />
      )}
    </button>
  );
}

interface HoverCardProps {
  title: string;
  value: string;
  width: number;
  height: number;
  onResize: (newWidth: number, newHeight: number) => void;
  selected: boolean;
  onSelect: () => void;
}

const HoverCard: React.FC<HoverCardProps> = ({
  title,
  value,
  width,
  height,
  onResize,
  selected,
  onSelect,
}) => {
  const [hovered, setHovered] = useState(false);
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0 });
  const sizeStart = useRef({ width, height });
  const onResizeRef = useRef(onResize);

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizing.current) return;
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const newWidth = Math.max(150, sizeStart.current.width + dx);
      const newHeight = Math.max(100, sizeStart.current.height + dy);
      onResizeRef.current(newWidth, newHeight);
    }
    function onMouseUp() {
      resizing.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    if (resizing.current) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizing.current]);

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY };
    sizeStart.current = { width, height };

    function onMouseMove(e: MouseEvent) {
      if (!resizing.current) return;
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const newWidth = Math.max(150, sizeStart.current.width + dx);
      const newHeight = Math.max(100, sizeStart.current.height + dy);
      onResizeRef.current(newWidth, newHeight);
    }
    function onMouseUp() {
      resizing.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Show hover effects only if no card is selected
  const showHoverEffects = !selected && hovered;

  return (
    <div 
      className={`relative bg-white rounded-lg shadow p-6 cursor-default select-none border-2 ${
        selected
          ? 'border-solid border-indigo-700'
          : showHoverEffects
          ? 'border-dotted border-indigo-500'
          : 'border-transparent'
      }`}
      style={{ width, height, flexShrink: 0, margin: 8, userSelect: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={e => {
        e.stopPropagation(); // Prevent event bubbling to document
        onSelect();
      }}
    >
      {/* Drag icon top-left */}
      {(selected || showHoverEffects) && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 cursor-move text-indigo-600" title="Drag to move">
  <FiMove size={20} />
</div>
      )}

      {/* Icons top-right in a row */}
      {(selected || showHoverEffects) && (
        <div className="absolute top-2 right-2 flex space-x-2">
  <button
    className="p-1 rounded hover:bg-red-100 text-red-600"
    aria-label="Delete"
    type="button"
    onClick={() => alert("Delete button clicked")}
  >
    <FiTrash2 size={18} />
  </button>
  <button
    className="p-1 rounded hover:bg-blue-100 text-blue-600"
    aria-label="Edit"
    type="button"
    onClick={() => alert("Edit button clicked")}
  >
    <FiEdit size={18} />
  </button>
  <button
    className="p-1 rounded hover:bg-yellow-100 text-yellow-600"
    aria-label="Cut/Paste"
    type="button"
    onClick={() => alert("Cut/Paste button clicked")}
  >
    <FiScissors size={18} />
  </button>
  <button
    className="p-1 rounded hover:bg-gray-200"
    aria-label="More options"
    type="button"
    onClick={() => alert("More options button clicked")}
  >
    <FiMoreVertical size={20} />
  </button>
</div>
      )}

      {/* Content */}
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>

      {/* Resize handle bottom-right */}
      {(selected || showHoverEffects) && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-500 rounded cursor-nwse-resize"
          onMouseDown={onResizeMouseDown}
        />
      )}
    </div>
  );
};

const NewPageSliders = () => {
  const [collapsedFields, setCollapsedFields] = useState(false);
  const [collapsedVisualizations, setCollapsedVisualizations] = useState(false);
  const [collapsedFilter, setCollapsedFilter] = useState(false);

  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedVisualization, setSelectedVisualization] = useState<'Bar Chart' | 'Line Chart' | 'Pie Chart' | 'Table'>('Bar Chart');

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const filteredData = sampleData.filter(item => {
    const date = new Date(item.orderDate);
    if (filterDateFrom && date < new Date(filterDateFrom)) return false;
    if (filterDateTo && date > new Date(filterDateTo)) return false;
    if (filterStatus !== 'All' && item.status !== filterStatus) return false;
    return true;
  });

  const chartData = React.useMemo(() => {
    if (!selectedField) return null;

    const groups: Record<string, number> = {};
    filteredData.forEach(item => {
      const key = String(item[selectedField as keyof typeof item]);
      if (selectedField === 'quantity' || selectedField === 'price') {
        groups[key] = (groups[key] || 0) + Number(item[selectedField as keyof typeof item]);
      } else {
        groups[key] = (groups[key] || 0) + 1;
      }
    });

    const labels = Object.keys(groups);
    const values = Object.values(groups);

    return {
      labels,
      datasets: [
        {
          label: fieldLabels[selectedField],
          data: values,
          backgroundColor: 'rgba(99, 102, 241, 0.6)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [selectedField, filteredData]);

  const renderVisualization = () => {
    if (!selectedField) return <p>Please select a field in the Fields slider.</p>;
    if (!chartData) return <p>No data available for the selected filters.</p>;

    switch (selectedVisualization) {
      case 'Bar Chart':
        return <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />;
      case 'Line Chart':
        return <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />;
      case 'Pie Chart':
        return <Pie data={chartData} options={{ responsive: true, plugins: { legend: { position: 'right' } } }} />;
      case 'Table':
        return (
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{fieldLabels[selectedField]}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chartData.labels.map((label, idx) => (
                <tr key={label}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{label}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{chartData.datasets[0].data[idx]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen">
      {/* Fields Slider */}
      <aside className={`${collapsedFields ? 'w-20' : 'w-64'} transition-all duration-300 bg-white border-r flex flex-col py-6`}>
        <div className="flex items-center justify-between px-4 mb-6">
          <ArrowToggle collapsed={collapsedFields} setCollapsed={setCollapsedFields} />
          {!collapsedFields && <span className="font-semibold text-lg">Fields</span>}
        </div>
        {!collapsedFields && (
          <div className="flex flex-col space-y-3 px-4 overflow-auto">
            {allFields.map(field => (
              <label key={field} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox accent-indigo-600"
                  checked={selectedField === field}
                  onChange={() => setSelectedField(selectedField === field ? null : field)}
                />
                <span>{fieldLabels[field]}</span>
              </label>
            ))}
          </div>
        )}
      </aside>

      {/* Visualizations Slider */}
      <aside className={`${collapsedVisualizations ? 'w-20' : 'w-64'} transition-all duration-300 bg-white border-r flex flex-col py-6`}>
        <div className="flex items-center justify-between px-4 mb-6">
          <ArrowToggle collapsed={collapsedVisualizations} setCollapsed={setCollapsedVisualizations} />
          {!collapsedVisualizations && <span className="font-semibold text-lg">Visualizations</span>}
        </div>
        {!collapsedVisualizations && (
          <div className="flex flex-col space-y-3 px-4 overflow-auto">
            {['Bar Chart', 'Line Chart', 'Pie Chart', 'Table'].map(vis => (
              <label key={vis} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="visualization"
                  className="form-radio accent-indigo-600"
                  checked={selectedVisualization === vis}
                  onChange={() => setSelectedVisualization(vis as any)}
                  disabled={!selectedField}
                />
                <span>{vis}</span>
              </label>
            ))}
          </div>
        )}
      </aside>

      {/* Filter Slider */}
      <aside className={`${collapsedFilter ? 'w-20' : 'w-64'} transition-all duration-300 bg-white flex flex-col py-6`}>
        <div className="flex items-center justify-between px-4 mb-6">
          <ArrowToggle collapsed={collapsedFilter} setCollapsed={setCollapsedFilter} />
          {!collapsedFilter && <span className="font-semibold text-lg">Filter</span>}
        </div>
        {!collapsedFilter && (
          <div className="flex flex-col space-y-4 px-4 overflow-auto">
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                id="dateFrom"
                className="border rounded p-2 w-full"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                id="dateTo"
                className="border rounded p-2 w-full"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="status"
                className="border rounded p-2 w-full"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option>All</option>
                <option>Active</option>
                <option>Completed</option>
                <option>Pending</option>
              </select>
            </div>
          </div>
        )}
      </aside>

      {/* Content area */}
      <main className="flex-1 p-10 bg-gray-50 overflow-auto">{renderVisualization()}</main>
    </div>
  );
};

export default function Page() {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedNew, setCollapsedNew] = useState(false);
  const [collapsedSubFilters, setCollapsedSubFilters] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('Dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [minUsers, setMinUsers] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [selectedMonths, setSelectedMonths] = useState([]);
const [sidePosition, setSidePosition] = useState<'left' | 'right'>('left');
const [page1MinUsers, setPage1MinUsers] = useState('');
  const [page1MaxUsers, setPage1MaxUsers] = useState('');
  const [page1SelectedMonths, setPage1SelectedMonths] = useState([]);
  // const [maxUsers, setMaxUsers] = useState('');

const [panel1MinUsers, setPanel1MinUsers] = useState('');
const [panel1MaxUsers, setPanel1MaxUsers] = useState('');
const [panel1SelectedMonths, setPanel1SelectedMonths] = useState([]);

  // const [panel1MinUsers, setPanel1MinUsers] = useState('');
  // const [panel1MaxUsers, setPanel1MaxUsers] = useState('');
  // const [selectedMonths, setSelectedMonths] = useState([]);
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
    const filteredDrillData = drillDataStatic.filter(d => {
      const orig = originalData.find(o => o.name === d.name);
      const usersCount = orig ? orig.users : 0;
      const aboveMin = panel1MinUsers === '' || usersCount >= Number(panel1MinUsers);
      const belowMax = panel1MaxUsers === '' || usersCount <= Number(panel1MaxUsers);
      return aboveMin && belowMax;
    });
  //   const filteredDrillDataPanel1 = drillDataStatic.filter(d => {
  //   const orig = originalData.find(o => o.name === d.name);
  //   const usersCount = orig ? orig.users : 0;
  //   const aboveMin = panel1MinUsers === '' || usersCount >= Number(panel1MinUsers);
  //   const belowMax = panel1MaxUsers === '' || usersCount <= Number(panel1MaxUsers);
  //   const inSelectedMonths = panel1SelectedMonths.length === 0 || panel1SelectedMonths.includes(d.name);
  //   return aboveMin && belowMax && inSelectedMonths;
  // });
  // const filteredDrillDataPanel1 = drillDataStatic.filter(d => {
  //   const orig = originalData.find(o => o.name === d.name);
  //   const usersCount = orig ? orig.users : 0;
  //   const aboveMin = panel1MinUsers === '' || usersCount >= Number(panel1MinUsers);
  //   const belowMax = panel1MaxUsers === '' || usersCount <= Number(panel1MaxUsers);
  //   const inSelectedMonths = panel1SelectedMonths.length === 0 || panel1SelectedMonths.includes(d.name);
  //   return aboveMin && belowMax && inSelectedMonths;
  // });
  
  const filteredDrillDataPanel1 = filterDataForPanel({
    data: mergeUsers(drillDataStatic),
    globalFilters: { minUsers, maxUsers, selectedMonths },
    pageFilters: { minUsers: page1MinUsers, maxUsers: page1MaxUsers, selectedMonths: page1SelectedMonths },
    panelFilters: { minUsers: panel1MinUsers, maxUsers: panel1MaxUsers, selectedMonths: panel1SelectedMonths },
    crossFilterMonths: [], // Panel 1 does NOT apply cross-filter to itself
    panelKey: 'panel1',
    crossFilterSourcePanelKey: 'panel1',
    panelOnCurrentPage: true,
  });
  
  const filteredDrillDataOtherPanels = filterDataForPanel({
    data: mergeUsers(drillDataStatic),
    globalFilters: { minUsers, maxUsers, selectedMonths },
    pageFilters: { minUsers: page1MinUsers, maxUsers: page1MaxUsers, selectedMonths: page1SelectedMonths },
    panelFilters: { minUsers: '', maxUsers: '', selectedMonths: [] }, // no panel-wise filters for other panels here
    crossFilterMonths: otherPanelsFilteredMonths, // cross-filter months from Panel 1
    panelKey: 'panel2', // example for panel2
    crossFilterSourcePanelKey: 'panel1',
    panelOnCurrentPage: true,
  });
  
  const filteredProductDataPanel1 = {};
  const filteredStateDataPanel1 = {};
  filteredDrillDataPanel1.forEach(d => {
    filteredProductDataPanel1[d.name] = productDataStatic[d.name] || [];
    filteredStateDataPanel1[d.name] = stateDataStatic[d.name] || [];
  });
    // Filtered data for Page 1 panels using Page 1 filters
  // Use global filters for Page 1 panels
  // Replace these lines:
  const filteredDrillDataWithMonths = drillDataStatic.filter(d => {
    const orig = originalData.find(o => o.name === d.name);
    const usersCount = orig ? orig.users : 0;
    const aboveMin = page1MinUsers === '' || usersCount >= Number(page1MinUsers);
    const belowMax = page1MaxUsers === '' || usersCount <= Number(page1MaxUsers);
    const inSelectedMonths = page1SelectedMonths.length === 0 || page1SelectedMonths.includes(d.name);
    return aboveMin && belowMax && inSelectedMonths;
  });
  
  // With this unified filtering approach:
  const applyGlobalFilters = (data) => {
    return data.filter(item => {
      const aboveMin = minUsers === '' || item.users >= Number(minUsers);
      const belowMax = maxUsers === '' || item.users <= Number(maxUsers);
      const inSelectedMonths = selectedMonths.length === 0 || 
                             (item.name && selectedMonths.includes(item.name));
      return aboveMin && belowMax && inSelectedMonths;
    });
  };
  
  // const filteredDrillData = applyGlobalFilters(mergeUsers(drillDataStatic));
  const filteredOriginalData = applyGlobalFilters(originalData);
  const [page2MinUsers, setPage2MinUsers] = useState('');
    const [page2MaxUsers, setPage2MaxUsers] = useState('');
    const [page2SelectedMonths, setPage2SelectedMonths] = useState([]);
    // Filtered product and state data for Page 1 panels
    const filteredProductDataWithMonths = {};
    const filteredStateDataWithMonths = {};
    filteredDrillDataWithMonths.forEach(d => {
      filteredProductDataWithMonths[d.name] = productDataStatic[d.name] || [];
      filteredStateDataWithMonths[d.name] = stateDataStatic[d.name] || [];
    });
  
    // Filtered data for other panels (all pages except Page 1) using global filters
   const filteredOtherPanelsData = originalData.filter((item) => {
    const aboveMin = minUsers === '' || item.users >= Number(minUsers);
    const belowMax = maxUsers === '' || item.users <= Number(maxUsers);
    const inSelectedMonths = selectedMonths.length === 0 || selectedMonths.includes(item.name);
    return aboveMin && belowMax && inSelectedMonths;
  });

  const filteredData = filteredOtherPanelsData;
  
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
  
  //  const filteredOtherPanelsData = originalData.filter((item) => {
  //      const aboveMin = minUsers === '' || item.users >= Number(minUsers);
  //      const belowMax = maxUsers === '' || item.users <= Number(maxUsers);
   
  //      if (otherPanelsFilteredMonths.length > 0) {
  //        return aboveMin && belowMax && otherPanelsFilteredMonths.includes(item.name);
  //      }
  //      return aboveMin && belowMax && (selectedMonths.length === 0 || selectedMonths.includes(item.name));
  //    });
  
   
   
   
     const filteredProductData = {};
     const filteredStateData = {};
     filteredDrillData.forEach(d => {
       filteredProductData[d.name] = productDataStatic[d.name] || [];
       filteredStateData[d.name] = stateDataStatic[d.name] || [];
     });
   
    //  const filteredData = originalData.filter((item) => {
    //    const aboveMin = minUsers === '' || item.users >= Number(minUsers);
    //    const belowMax = maxUsers === '' || item.users <= Number(maxUsers);
    //    const inSelectedMonths = selectedMonths.length === 0 || selectedMonths.includes(item.name);
    //    return aboveMin && belowMax && inSelectedMonths;
    //  });
   
     const handleMonthChange = (month) => {
       setSelectedMonths((prev) =>
         prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
       );
     };
   
     const handlePanelChange = (panel) => {
       setSelectedPanels((prev) => ({
         ...prev,
         [panel]: !prev[panel],
       }));
     };
   
     const [panelOrder, setPanelOrder] = useState(() => {
       const visiblePanels = Object.entries(selectedPanels)
         .filter(([_, visible]) => visible)
         .map(([key]) => key);
       return visiblePanels;
     });
   
     useEffect(() => {
       setPanelOrder(prevOrder => {
         const visiblePanels = Object.entries(selectedPanels)
           .filter(([_, visible]) => visible)
           .map(([key]) => key);
   
         const newOrder = prevOrder.filter(panel => selectedPanels[panel]);
   
         visiblePanels.forEach(panel => {
           if (!newOrder.includes(panel)) {
             newOrder.push(panel);
           }
         });
   
         return newOrder;
       });
     }, [selectedPanels]);
   
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
 const [filterHistory, setFilterHistory] = useState([]);
   // History tab content component
   const HistoryTabContent = () => {
     if (filterHistory.length === 0) {
       return <div className="text-sm text-gray-500">No history available11</div>;
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

   


  const toggleSubMenu = (menuName: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };

  const menuItems = [
    { name: 'Dashboard', icon: <FaTachometerAlt /> },
    {
      name: 'Projects',
      icon: <FaProjectDiagram />,
      subMenu: [
        { name: 'Active Projects' },
        { name: 'Archived Projects' },
      ],
    },
    {
      name: 'Teams',
      icon: <FaUsers />,
      subMenu: [
        { name: 'Engineering' },
        { name: 'Design' },
        { name: 'Marketing' },
      ],
    },
    { name: 'Form Workflow', icon: <FaFileAlt /> },
     { name: 'Old Theme', icon: <FaFileAlt /> },
    { name: 'Reports', icon: <FaFileAlt /> },
    { name: 'New Page', icon: <FaFile /> }, 
    { name: 'Custom Page', icon: <FaFile /> },
    { name: 'Theme', icon: <FaStar /> },
    { name: 'New Dashbaord', icon: <FaStar /> },
    { name: 'NewCopyPast', icon: <FaStar /> },
    { name: 'MapsAndTable', icon: <FaStar /> },
    { name: 'PivotTable', icon: <FaStar /> },
    { name: 'AnimatedCharts', icon: <FaStar /> },
     { name: 'NewPivotTable', icon: <FaStar /> },
     { name: 'Hierarchy Table', icon: <FaFileAlt /> },
      { name: 'DashboardCreate', icon: <FaFileAlt /> },
      { name: 'DashboardCreateNew', icon: <FaFileAlt /> },
      { name: 'DashboardFilter', icon: <FaFile /> },
      { name: 'ParameterPanel', icon: <FaFile /> }, 
      { name: 'GroupsVsSets', icon: <FaFile /> }, 
     
  ];
const [themeOpen, setThemeOpen] = useState(false);
  
const pathname = usePathname();



const renderMenuItem = (item: any) => {
  const isExpanded = expandedMenus.includes(item.name);
  const hasSubMenu = Array.isArray(item.subMenu) && item.subMenu.length > 0;

  if (item.name === 'Theme') {
    return (
      <div key={item.name}>
        <Link
          href="/theme"
          className={`flex items-center justify-between w-full py-2 px-3 rounded hover:bg-gray-100 text-gray-700 ${
            pathname === '/theme' ? 'bg-indigo-100 font-semibold' : ''
          }`}
          aria-current={pathname === '/theme' ? 'page' : undefined}
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg">{item.icon}</span>
            {!collapsed && <span>{item.name}</span>}
          </div>
        </Link>
      </div>
    );
  }

  // For other menu items, keep your existing logic
  const onClick = () => {
    if (hasSubMenu) {
      toggleSubMenu(item.name);
    } else {
      setSelectedMenu(item.name);
    }
  };

  return (
    <div key={item.name}>
      <button
        onClick={onClick}
        className={`flex items-center justify-between w-full py-2 px-3 rounded hover:bg-gray-100 text-gray-700 ${
          selectedMenu === item.name ? 'bg-indigo-100 font-semibold' : ''
        }`}
        aria-current={selectedMenu === item.name ? 'page' : undefined}
        type="button"
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">{item.icon}</span>
          {!collapsed && <span>{item.name}</span>}
        </div>
        {!collapsed && hasSubMenu && (
          <span className="text-gray-500">
            {isExpanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
          </span>
        )}
      </button>

      {!collapsed && hasSubMenu && isExpanded && (
        <div className="ml-8 flex flex-col space-y-1 mt-1">
          {item.subMenu.map((sub: any) => (
            <button
              key={sub.name}
              onClick={() => setSelectedMenu(sub.name)}
              className={`text-gray-600 hover:text-gray-900 text-sm py-1 rounded pl-2 text-left ${
                selectedMenu === sub.name ? 'font-semibold text-indigo-600' : ''
              }`}
              type="button"
              aria-current={selectedMenu === sub.name ? 'page' : undefined}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// const OldThemeContent = () => {
   

//     return (
//       <div className="container">
//         <div className="header">Theme</div>
// hfghfg
       
//       </div>
//     );
//   };
const FormWorkflowContent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });

  const data = [
    { id: '#1001', name: 'Form A', created: '2025-05-01', status: 'Active', owner: 'Alice' },
    { id: '#1002', name: 'Form B', created: '2025-05-05', status: 'Inactive', owner: 'Bob' },
    { id: '#1003', name: 'Form C', created: '2025-05-10', status: 'Active', owner: 'Charlie' },
    { id: '#1004', name: 'Form D', created: '2025-05-15', status: 'Pending', owner: 'Diana' },
  ];

  const filteredData = data.filter(item =>
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showTooltip = (event, content) => {
    const container = event.currentTarget.closest('.relative');
    const containerRect = container.getBoundingClientRect();
    const targetRect = event.target.getBoundingClientRect();

    setTooltip({
      visible: true,
      content,
      x: targetRect.left - containerRect.left + targetRect.width / 2,
      y: targetRect.top - containerRect.top - 8,
    });
  };

  const hideTooltip = () => {
    setTooltip({ ...tooltip, visible: false });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="header text-2xl font-semibold mb-4">Form Workflow</div>

      <div className="mb-6 max-w-md">
        <input
          type="text"
          placeholder="Search forms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto relative">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length > 0 ? (
              filteredData.map(({ id, name, created, status, owner }) => (
                <tr key={id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{created}</td>
                  <td
                    className="px-6 py-4 whitespace-nowrap"
                    onMouseEnter={(e) => showTooltip(e, `Status is ${status}`)}
                    onMouseLeave={hideTooltip}
                  >
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        status === 'Active' ? 'bg-green-100 text-green-800' :
                        status === 'Inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{owner}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No forms found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {tooltip.visible && (
          <div
            className="absolute z-50 px-3 py-1 text-xs text-white bg-black rounded shadow-lg pointer-events-none"
            style={{
              top: tooltip.y,
              left: tooltip.x,
              transform: 'translate(-50%, -100%)',
              whiteSpace: 'nowrap',
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};
 const ProjectsContent = () => (
    <>
      <div className="header">Security Control</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2>Channels</h2>
          <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry...</p>
        </div>
        <div className="card">
          <h2>Customization</h2>
          <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry...</p>
        </div>
        <div className="card">
          <h2>Automation</h2>
          <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry...</p>
        </div>
        <div className="card">
          <h2>Environment</h2>
          <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry...</p>
        </div>
      </div>
    </>
  );
  const TeamsContent = () => (
    <div className="container">
      <div className="header">Teams</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h2>John Doe</h2>
          <p>Role: Project Manager</p>
          <p>Email: john.doe@example.com</p>
          <p>Phone: +1 234 567 8901</p>
        </div>
        <div className="card">
          <h2>Jane Smith</h2>
          <p>Role: Lead Developer</p>
          <p>Email: jane.smith@example.com</p>
          <p>Phone: +1 234 567 8902</p>
        </div>
        <div className="card">
          <h2>Michael Brown</h2>
          <p>Role: UX Designer</p>
          <p>Email: michael.brown@example.com</p>
          <p>Phone: +1 234 567 8903</p>
        </div>
      </div>
    </div>
  );
  // DashboardContent with free draggable and resizable HoverCards inside container div only
  const DashboardContent = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Store size and position for each card
    const [cards, setCards] = useState({
      totalSales: { width: 250, height: 140, top: 0, left: 0 },
      newCustomers: { width: 250, height: 140, top: 0, left: 270 },
      openTickets: { width: 250, height: 140, top: 160, left: 0 },
      pendingOrders: { width: 250, height: 140, top: 160, left: 270 },
    });

    const [selectedCard, setSelectedCard] = useState<string | null>(null);
    const draggingCard = useRef<string | null>(null);
    const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const cardStartPos = useRef<{ top: number; left: number }>({ top: 0, left: 0 });

    const handleResize = (key: keyof typeof cards, newWidth: number, newHeight: number) => {
      setCards(prev => ({
        ...prev,
        [key]: { ...prev[key], width: newWidth, height: newHeight },
      }));
    };

    const onMouseDown = (key: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      draggingCard.current = key;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      cardStartPos.current = { top: cards[key].top, left: cards[key].left };
      setSelectedCard(key);

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
  if (!draggingCard.current) return;

  const dx = e.clientX - dragStartPos.current.x;
  const dy = e.clientY - dragStartPos.current.y;

  setCards(prev => {
    const card = prev[draggingCard.current!];
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect || !card) {
      return prev; // Return previous state if container or card is undefined
    }

    let newLeft = cardStartPos.current.left + dx;
    let newTop = cardStartPos.current.top + dy;

    // Constrain within container bounds
    newLeft = Math.min(
      Math.max(0, newLeft),
      containerRect.width - card.width
    );
    newTop = Math.min(
      Math.max(0, newTop),
      containerRect.height - card.height
    );

    return {
      ...prev,
      [draggingCard.current!]: {
        ...card,
        left: newLeft,
        top: newTop,
      },
    };
  });
};

    const onMouseUp = () => {
      draggingCard.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    // Clear selection if click outside cards
    const onContainerClickCapture = (e: React.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelectedCard(null);
      }
    };

    return (
      <div
        ref={containerRef}
        onClickCapture={onContainerClickCapture}
        style={{ userSelect: 'none', position: 'relative', height: '500px' }} // Added position: relative and fixed height
        className="border bg-white"
      >
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h2>
          <p className="text-gray-600">Welcome back, User!</p>
        </div>

        <div className="mb-8 max-w-md">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {Object.entries(cards).map(([key, { width, height, top, left }]) => (
          <div
            key={key}
            onMouseDown={onMouseDown(key)}
            style={{
              position: 'absolute',
              top,
              left,
              width,
              height,
              cursor: selectedCard === key ? 'grabbing' : 'grab',
              zIndex: selectedCard === key ? 1000 : 1,
            }}
          >
            <HoverCard
              title={{
                totalSales: 'Total Sales',
                newCustomers: 'New Customers',
                openTickets: 'Open Tickets',
                pendingOrders: 'Pending Orders',
              }[key]}
              value={{
                totalSales: '$25,000',
                newCustomers: '1,200',
                openTickets: '35',
                pendingOrders: '12',
              }[key]}
              width={width}
              height={height}
              onResize={(w, h) => handleResize(key as keyof typeof cards, w, h)}
              selected={selectedCard === key}
              onSelect={() => setSelectedCard(key)}
            />
          </div>
        ))}
      </div>
    );
  };

  const SubFiltersContent = () => (
    <div className="flex flex-col space-y-4 px-4">
      {!collapsedSubFilters && (
        <>
          <label className="block text-sm font-medium text-gray-700">Sub Category</label>
          <select className="border rounded p-2">
            <option>All</option>
            <option>Sub Design</option>
            <option>Sub Development</option>
            <option>Sub Marketing</option>
          </select>

          <label className="block text-sm font-medium text-gray-700">Sub Status</label>
          <select className="border rounded p-2">
            <option>Active</option>
            <option>Completed</option>
            <option>Pending</option>
          </select>
        </>
      )}
    </div>
  );

  const [aboutSubMenuOpen, setAboutSubMenuOpen] = useState(false);

  // Close submenu if user clicks outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.about-menu-container')) {
        setAboutSubMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const starsCountMap: Record<string, number> = {
  Home: 3,
  About: 5,
  Contact: 8,
  Dashboard: 4, // example default for Dashboard or any other menu
  // Add other menu keys if needed
};
  return (
    <>
      <style>{`
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
          padding: 30px 40px;
        }
        .header {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 30px;
          color: #222;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 30px 40px;
        }
        .card {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 25px 20px;
          box-shadow: 0 1px 4px rgb(0 0 0 / 0.05);
          display: flex;
          flex-direction: column;
        }
        .card h2 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #333;
        }
        .card p {
          font-size: 14px;
          color: #555;
          line-height: 1.5;
          flex-grow: 1;
        }
        input[type="checkbox"], input[type="radio"] {
          accent-color: #6366f1;
        }
        .favorite-bar {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
          z-index: 50;
        }
        .right-panel {
          background: white;
          border-left: 1px solid #ddd;
          width: 280px;
          height: 100vh;
          position: fixed;
          top: 0;
          right: 0;
          padding: 20px;
          box-shadow: -2px 0 8px rgb(0 0 0 / 0.1);
          transition: transform 0.3s ease;
          transform: translateX(100%);
          z-index: 100;
          display: flex;
          flex-direction: column;
        }
        .right-panel.open {
          transform: translateX(0);
        }
        .right-panel-toggle {
          position: fixed;
          top: 60px;
          right: 280px;
          background: #6366f1;
          color: white;
          border-radius: 4px 0 0 4px;
          padding: 8px;
          cursor: pointer;
          z-index: 110;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 4px rgb(0 0 0 / 0.2);
          transition: right 0.3s ease;
        }
        .right-panel-toggle.closed {
          right: 0;
          border-radius: 0 4px 4px 0;
        }
      `}</style>

      <div className="min-h-screen flex flex-col bg-gray-100">
        {/* Favorite icons bar */}
      

        {/* Top bar */}
        <div className="flex items-center space-x-8 px-6 py-3 bg-white border-b shadow-sm">
          <div
            className="text-xl font-bold text-gray-800 cursor-pointer"
            onClick={() => setSelectedMenu('Dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') setSelectedMenu('Dashboard');
            }}
          >
            MyLogo
          </div>

          {/* Updated nav with submenu */}
          <nav className="flex space-x-6 relative items-center">
            <button
              onClick={() => {
                setSelectedMenu('Home');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Home' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Home
            </button>

            <div
              className="relative about-menu-container"
              onMouseEnter={() => setAboutSubMenuOpen(true)}
              onMouseLeave={() => setAboutSubMenuOpen(false)}
            >
              <button
                onClick={() => {
                  setSelectedMenu('About');
                  setAboutSubMenuOpen(!aboutSubMenuOpen);
                }}
                className={`font-medium ${
                  selectedMenu === 'About' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
                }`}
                type="button"
                aria-haspopup="true"
                aria-expanded={aboutSubMenuOpen}
              >
                About
              </button>

              {aboutSubMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
                  <button
                    onClick={() => {
                      setSelectedMenu('Team');
                      setAboutSubMenuOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-gray-700 hover:bg-indigo-100 ${
                      selectedMenu === 'Team' ? 'font-semibold text-indigo-600' : ''
                    }`}
                    type="button"
                  >
                    Team
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMenu('Company');
                      setAboutSubMenuOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-gray-700 hover:bg-indigo-100 ${
                      selectedMenu === 'Company' ? 'font-semibold text-indigo-600' : ''
                    }`}
                    type="button"
                  >
                    Company
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedMenu('Contact');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Contact' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Contact
            </button>
             <button
              onClick={() => {
                setSelectedMenu('Maps');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Maps' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Maps
            </button>
            <button
              onClick={() => {
                setSelectedMenu('Dashboard1');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Dashboard1' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Dashboard1
            </button>
            <button
              onClick={() => {
                setSelectedMenu('Dashboard2');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Dashboard2' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Dashboard2
            </button>
            <button
              onClick={() => {
                setSelectedMenu('Build');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Build' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Build
            </button>
            <button
              onClick={() => {
                setSelectedMenu('BookmarkTabs');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'BookmarkTabs' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              BookmarkTabs
            </button>
            <button
              onClick={() => {
                setSelectedMenu('Pane');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Pane' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Pane
            </button>
             <button
              onClick={() => {
                setSelectedMenu('Pane1');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Pane1' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Pane1
            </button>
            <button
              onClick={() => {
                setSelectedMenu('Pane2');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Pane2' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Pane2
            </button>
             <button
              onClick={() => {
                setSelectedMenu('GlobleFilter');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'GlobleFilter' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              GlobleFilter
            </button>
            <button
              onClick={() => {
                setSelectedMenu('TestPageCreation');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'TestPageCreation' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              TestPageCreation
            </button>
            <button
              onClick={() => {
                setSelectedMenu('DashboardList');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'DashboardList' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              DashboardList
            </button>
              <button
              onClick={() => {
                setSelectedMenu('FilterTablePage');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'FilterTablePage' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              FilterTablePage
            </button>
            <button
              onClick={() => {
                setSelectedMenu('FilterDashboard');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'FilterDashboard' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              FilterDashboard
            </button>
            <button
              onClick={() => {
                setSelectedMenu('FilterDashboard1');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'FilterDashboard1' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              FilterDashboard1
            </button>
            <button
              onClick={() => {
                setSelectedMenu('Dashboard3');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Dashboard3' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Dashboard3
            </button>
            <button
              onClick={() => {
                setSelectedMenu('Dashboard4');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Dashboard4' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Dashboard4
            </button>
            <button
              onClick={() => {
                setSelectedMenu('Dashboard5');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Dashboard5' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Dashboard5
            </button>
            <button
              onClick={() => {
                setSelectedMenu('Dashboard6');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Dashboard6' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Dashboard6
            </button>
            <button
              onClick={() => {
                setSelectedMenu('Layoutchart');
                setAboutSubMenuOpen(false);
              }}
              className={`font-medium ${
                selectedMenu === 'Layoutchart' ? 'text-indigo-600' : 'text-gray-700 hover:text-gray-900'
              }`}
              type="button"
            >
              Layoutchart
            </button>

            {/* Radio buttons for Left/Right */}
            <div className="ml-6 flex items-center space-x-4">
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="sidePosition"
                  value="left"
                  checked={sidePosition === 'left'}
                  onChange={() => setSidePosition('left')}
                  className="accent-indigo-600"
                />
                <span>Left</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="sidePosition"
                  value="right"
                  checked={sidePosition === 'right'}
                  onChange={() => setSidePosition('right')}
                  className="accent-indigo-600"
                />
                <span>Right</span>
              </label>
            </div>
          </nav>
        </div>
          <div className="favorite-bar" role="region" aria-label="Favorite items">
      {[...Array(starsCountMap[selectedMenu] || 0)].map((_, i) => (
        <FaStar
          key={i}
          className="text-yellow-400"
          size={20}
          title={`Favorite ${i + 1}`}
          aria-hidden="true"
        />
      ))}
    </div>

        {/* Main layout */}
       <div className={`flex flex-1 overflow-hidden ${sidePosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
         <div className={`flex flex-col ${sidePosition === 'right' ? 'order-2' : 'order-1'}`}></div>
          {/* Menu slider */}
          <aside className={`${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-white border-r h-screen flex flex-col py-6`}>
                       <div className="flex items-center justify-between px-4 mb-6">
                         <ArrowToggle collapsed={collapsed} setCollapsed={setCollapsed} />
                         {!collapsed && <span className="font-semibold text-lg">Menu</span>}
                       </div>
                       <nav className="flex flex-col space-y-2 px-4">
                         {menuItems.map(item => (
                           <React.Fragment key={item.name}>{renderMenuItem(item)}</React.Fragment>
                         ))}
                       </nav>
                     </aside>

          {/* Sliders or NewPageSliders */}
          {selectedMenu === 'New Page' ? (
            <NewPageSliders />
          ) : (
            <>
              {/* Filter Sidebar */}
               <aside className={`${collapsedNew ? 'w-20' : 'w-64'} transition-all duration-300 bg-white border-r h-screen flex flex-col py-6`}>
              <div className="flex items-center justify-between px-4 mb-6">
                <ArrowToggle collapsed={collapsedNew} setCollapsed={setCollapsedNew} />
                {!collapsedNew && <span className="font-semibold text-lg">Filters</span>}
              </div>
                <div className="flex flex-col space-y-4 px-4">
                  {!collapsedNew && (
                    <>
                      <aside
        className={`${collapsedNew ? 'w-20' : 'w-60'} transition-all duration-300 bg-white border-r h-screen flex flex-col py-6`}
      >
        <div className="flex-1 flex flex-col">
        

          {!collapsedNew && (
            <Tabs defaultValue="filter" className="flex-1 flex flex-col">
              <TabsList className="grid-cols-3 mx-4">
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
                    </>
                  )}
                </div>
              </aside>

              {/* Sub Filters Sidebar */}
                <aside className={`${collapsedSubFilters ? 'w-20' : 'w-64'} transition-all duration-300 bg-white border-r h-screen flex flex-col py-6`}>
              <div className="flex items-center justify-between px-4 mb-6">
                <ArrowToggle collapsed={collapsedSubFilters} setCollapsed={setCollapsedSubFilters} />
                {!collapsedSubFilters && <span className="font-semibold text-lg">Sub Filters</span>}
              </div>
              <SubFiltersContent />
            </aside>
            </>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Header */}
             {/* <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm"></header> */}
            <header className="bg-white border-b px-6 flex justify-between items-center shadow-sm">
              <div className="flex items-center space-x-4">
                {selectedMenu !== 'New Page' && <ArrowToggle collapsed={collapsed} setCollapsed={setCollapsed} />}
                <h1 className="text-xl font-semibold">{selectedMenu}</h1>
              </div>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button className="variant-ghost size-icon" type="button">
                    <FaCog className="text-xl text-gray-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </UITooltip>
            </header>

            {/* Header Filters (empty for now) */}
            {/* <div className="bg-white border-b px-6 py-3 flex items-center space-x-6"></div>  */}

            {/* Main Dashboard Content */}
            {/* <main className="flex-1 overflow-auto bg-gray-50"></main> */}
            <main className="flex-1 overflow-auto bg-gray-50">
              {selectedMenu === 'Form Workflow' ? (
                <FormWorkflowContent />
              ) : selectedMenu === 'Old Theme' ? (
                <OldThemePage />
              ) : selectedMenu === 'Teams' ? (
                <TeamsContent />
              )  : selectedMenu === 'Projects' ? (
                <ProjectsContent />
              ) : selectedMenu === 'New Page' ? (
                <NewPageSliders />
              ): selectedMenu === 'Custom Page' ? (  // <-- New condition
    <NewCustomPage />
  ) : selectedMenu === 'New Dashbaord' ? (  // <-- New condition NewCopyPast 
    <NewDashboard />
  )  : selectedMenu === 'NewCopyPast' ? (  // <-- New condition NewCopyPast
    <NewCopyPast />
  )   : selectedMenu === 'MapsAndTable' ? (  // <-- New condition NewCopyPast PivotTable 
    <MapsAndTable />
  )   : selectedMenu === 'PivotTable' ? (  // <-- New condition NewCopyPast PivotTable NewPivotTable HierarchyTable
    <PivotTable />
  )  : selectedMenu === 'AnimatedCharts' ? (  // <-- New condition NewCopyPast PivotTable
    <AnimatedCharts />
  )  : selectedMenu === 'NewPivotTable' ? (  // <-- New condition NewCopyPast PivotTable DashboardCreate DashboardFilter 
    <NewPivotTable />
  )  : selectedMenu === 'Hierarchy Table' ? (  // <-- New condition NewCopyPast PivotTable
    <HierarchyTable />
  )  : selectedMenu === 'DashboardCreate' ? (  // <-- New condition NewCopyPast PivotTable
    <DashboardCreate />
  )  : selectedMenu === 'DashboardCreateNew' ? (  // <-- New condition NewCopyPast PivotTable GroupsVsSets
    <DashboardCreateNew />
  )  : selectedMenu === 'DashboardFilter' ? (  // <-- New condition NewCopyPast PivotTable
    <DashboardFilter />
  ) : selectedMenu === 'ParameterPanel' ? (  // <-- New condition NewCopyPast PivotTable
    <ParameterPanel />
  ) : selectedMenu === 'GroupsVsSets' ? (  // <-- New condition NewCopyPast PivotTable Mapsxxxxxxxxx
    <GroupsVsSets />
  ) : selectedMenu === 'Contact' ? (  // <-- New condition NewCopyPast PivotTable BookmarkTabs
    <ContactContent />
  ) : selectedMenu === 'Maps' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <MapsContent />
  ) : selectedMenu === 'Dashboard1' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1 Pane
    <Dashboard1 />
  ) : selectedMenu === 'BookmarkTabs' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <BookmarkTabs />
  ) : selectedMenu === 'Dashboard2' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <Dashboard2 />
  ) : selectedMenu === 'Build' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <Build />
  ) : selectedMenu === 'Pane' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <Pane />
  ) : selectedMenu === 'Pane1' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1 GlobleFilter DashboardList
    <Pane1 />
  ) : selectedMenu === 'Pane2' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <Pane2 />
  ) : selectedMenu === 'GlobleFilter' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1 Dashboard3 FilterDashboard
    <GlobleFilter />
  ) : selectedMenu === 'TestPageCreation' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1 Dashboard3 FilterDashboard
    <TestPageCreation />
  ) : selectedMenu === 'DashboardList' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1 Dashboard3 FilterDashboard
    <DashboardList />
  ) : selectedMenu === 'FilterTablePage' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <FilterTablePage />
  ) : selectedMenu === 'FilterDashboard' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <FilterDashboard />
  ) : selectedMenu === 'FilterDashboard1' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <FilterDashboard1 />
  ) : selectedMenu === 'Dashboard3' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <Dashboard3 />
  ) : selectedMenu === 'Layoutchart' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <Layoutchart />
  ) : selectedMenu === 'Dashboard4' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <Dashboard4 />
  ) : selectedMenu === 'Dashboard5' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <Dashboard5 />
  ) : selectedMenu === 'Dashboard6' ? (  // <-- New condition NewCopyPast PivotTable Dashboard1
    <Dashboard6 />
  ) : selectedMenu === 'Dashboard' ? (
                <DashboardContent />
              ) : (
                <div></div>
              )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t px-6 py-2 text-sm text-gray-500"></footer>
          </div>

          {/* Right sliding panel */}
          <div className={`right-panel ${rightPanelOpen ? 'open' : ''} ${sidePosition === 'right' ? 'order-1 left-panel' : 'order-2'}`} style={sidePosition === 'right' ? { left: 0, right: 'auto' } : {}}>
            <h2 className="text-lg font-semibold mb-4">Right Panel</h2>
            <p>This is a sliding panel on the right side.</p>
          </div>

          {/* Toggle button for right panel */}
          <button
  className={`right-panel-toggle ${rightPanelOpen ? '' : 'closed'} ${sidePosition === 'right' ? 'left-toggle' : ''}`}
  onClick={() => setRightPanelOpen(!rightPanelOpen)}
  aria-label={rightPanelOpen ? 'Close right panel' : 'Open right panel'}
  type="button"
  style={
    sidePosition === 'right'
      ? {
          left: rightPanelOpen ? 280 : 0,
          right: 'auto',
        }
      : {}
  }
>
  {rightPanelOpen ? <FaChevronRight /> : <FaChevronLeft />}
</button>
        </div>
      </div>
       <style jsx>{`
        .right-panel.left-panel {
          border-left: none;
          border-right: 1px solid #ddd;
          box-shadow: 2px 0 8px rgb(0 0 0 / 0.1);
          right: auto !important;
          left: 0 !important;
          transition: transform 0.3s ease;
        }
        .right-panel.left-panel.open {
          transform: translateX(0);
        }
        .right-panel.left-panel:not(.open) {
          transform: translateX(-100%);
        }
        .right-panel {
          transition: transform 0.3s ease;
        }
        .right-panel.open {
          transform: translateX(0);
        }
        .right-panel:not(.open) {
          transform: translateX(100%);
        }
        .right-panel-toggle.left-toggle {
          right: auto !important;
          left: 280px !important;
          border-radius: 4px 0 0 4px !important;
        }
          .right-panel-toggle.left-toggle.closed {
  left: 0 !important;
}
      `}</style>
    </>
  );
}