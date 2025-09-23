'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import { FiRefreshCw } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  Cell,
} from 'recharts';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardContent
} from "@/components/ui/card";

const productColors = {
  "Product A": "#6366F1",
  "Product B": "#F59E0B",
  "Product C": "#10B981",
};

const stateColors = {
  NY: "#EF4444",
  CA: "#3B82F6",
  TX: "#3B82F6",
  MH: "#3B82F6",
  DL: "#3B82F6",
  LDN: "#3B82F6",
  KA: "#3B82F6",
};

const mergeUsers = (drillData, originalData) => {
  return drillData.map(d => {
    const orig = originalData.find(o => o.name === d.name);
    return {
      ...d,
      users: orig ? orig.users : 0,
    };
  });
};

function filterDataForPanel({ data, panelFilters }) {
  return data.filter(item => {
    const users = item.users;
    const name = item.name;

    if (panelFilters.minUsers !== '' && users < Number(panelFilters.minUsers)) return false;
    if (panelFilters.maxUsers !== '' && users > Number(panelFilters.maxUsers)) return false;
    if (panelFilters.selectedMonths.length > 0 && !panelFilters.selectedMonths.includes(name)) return false;

    return true;
  });
}

const DrillableBarChart = ({
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
}) => {
  const chartContainerRef = useRef(null);

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

  // Product-wise Drill Across handlers
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

  const handleCellContextMenu = (e, entry) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setContextMenu({
      show: true,
      x: e?.clientX || 0,
      y: e?.clientY || 0,
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
            userSelect: 'none',
          }}
          onContextMenu={e => e.preventDefault()}
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

          {/* Drill Across (Product-wise) */}
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
                  style={{ cursor: 'context-menu' }}
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>

      {contextMenuNode}
    </div>
  );
};

const Panel = ({
  title,
  panel1MinUsers,
  setPanel1MinUsers,
  panel1MaxUsers,
  setPanel1MaxUsers,
  panel1SelectedMonths,
  setPanel1SelectedMonths,
  filteredData,
  productData,   // Add here
  stateData,     // Add here
  menuOpen,
  setMenuOpenGlobal,
  showFilters,
  setShowFilters,
  onMaximize,
  setSelectedMonths,
  setOtherPanelsFilteredMonths
}) => {
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
  const [selectedMonths, setSelectedMonthsLocal] = useState([]);

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpenGlobal(null);
    } else {
      setMenuOpenGlobal('panel1');
    }
  };

  // Sync selectedMonths with parent
  useEffect(() => {
    setSelectedMonthsLocal(panel1SelectedMonths);
  }, [panel1SelectedMonths]);

  const setSelectedMonthsWrapper = (months) => {
    setSelectedMonthsLocal(months);
    setPanel1SelectedMonths(months);
  };

  return (
    <div className="h-full w-full overflow-y-auto panel-content flex flex-col" style={{ height: '400px', border: '2px solid red', backgroundColor: '#f0f0f0' }}>
      <Card className="relative h-full flex flex-col">
        <CardHeader className="flex justify-between items-center mb-2 panel-header cursor-move">
          <h2 className="font-medium text-sm mt-0 mb-1">{title}</h2>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPanel1MinUsers('');
                setPanel1MaxUsers('');
              }}
              className="mr-4"
              title="Reset Filters"
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
                      onMaximize && onMaximize('panel1');
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

        {showFilters && (
          <div className="px-4 pb-2">
            <div className="flex space-x-4 items-center">
              <div className="flex flex-col w-32">
                <Label>Min Users</Label>
                <Input
                  type="number"
                  value={panel1MinUsers}
                  onChange={(e) => setPanel1MinUsers(e.target.value)}
                />
              </div>
              <div className="flex flex-col w-32">
                <Label>Max Users</Label>
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
          <DrillableBarChart
  drillData={filteredData}
  productData={filteredData.length > 0 ? filteredData.reduce((acc, d) => {
    acc[d.name] = productData[d.name] || [];
    return acc;
  }, {}) : {}}
  stateData={filteredData.length > 0 ? filteredData.reduce((acc, d) => {
    acc[d.name] = stateData[d.name] || [];
    return acc;
  }, {}) : {}}
  stackingMode={stackingMode}
  setStackingMode={setStackingMode}
  drillAcross={drillAcross}
  setDrillAcross={setDrillAcross}
  contextMenu={contextMenu}
  setContextMenu={setContextMenu}
  submenuVisible={submenuVisible}
  setSubmenuVisible={setSubmenuVisible}
  setSelectedMonths={setSelectedMonthsWrapper}
  setOtherPanelsFilteredMonths={() => {}}
/>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Page() {
  const [panel1MinUsers, setPanel1MinUsers] = useState('');
  const [panel1MaxUsers, setPanel1MaxUsers] = useState('');
  const [panel1SelectedMonths, setPanel1SelectedMonths] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [maximizedPanel, setMaximizedPanel] = useState(null);
  const [drillData, setDrillData] = useState([]);
  const [productData, setProductData] = useState({});
  const [stateData, setStateData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const modalContainerRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('https://intelligentsalesman.com/ism1/API/api/sales_datanew.php');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDrillData(data.drillData || []);
        setProductData(data.productData || {});
        setStateData(data.stateData || {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredDrillDataPanel1 = filterDataForPanel({
    data: mergeUsers(drillData, drillData),
    panelFilters: { minUsers: panel1MinUsers, maxUsers: panel1MaxUsers, selectedMonths: panel1SelectedMonths },
  });

  const handleMaximize = (panelKey) => {
    if (panelKey === 'panel1') {
      setMaximizedPanel('panel1');
    }
  };

  const closeMaximize = () => {
    setMaximizedPanel(null);
  };

  if (loading) {
    return <div className="p-4">Loading sales data...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error loading sales data: {error}</div>;
  }

  return (
    <>
     <Panel
  title="Monthly Sales Overview (Drillable)"
  panel1MinUsers={panel1MinUsers}
  setPanel1MinUsers={setPanel1MinUsers}
  panel1MaxUsers={panel1MaxUsers}
  setPanel1MaxUsers={setPanel1MaxUsers}
  panel1SelectedMonths={panel1SelectedMonths}
  setPanel1SelectedMonths={setPanel1SelectedMonths}
  filteredData={filteredDrillDataPanel1}
  productData={productData}  // Pass here
  stateData={stateData}      // Pass here
  menuOpen={menuOpen}
  setMenuOpenGlobal={setMenuOpen}
  showFilters={showFilters}
  setShowFilters={setShowFilters}
  onMaximize={handleMaximize}
/>
    </>
  );
}