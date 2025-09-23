import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
// Types
export type PanelAggregation = 'sum' | 'avg' | 'count' | 'distinct_count';

export interface PanelWindowOptions {
  partitionBy?: string[];
  orderBy?: string;
}

export interface PagePanel {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  dataSourceType: 'api' | 'static';
  staticValue?: number | string;
  tableName?: string;
  columnName?: string;
  aggregation?: PanelAggregation;
  distinctOn?: string;
  filters?: Record<string, any>;
  window?: PanelWindowOptions;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  type?: string;
  config?: any;
}

// Panel value fetcher for previews and testing
const formatPanelValue = (panel: PagePanel, raw: any) => {
  const decimals = typeof panel.decimals === 'number' ? panel.decimals : 0;
  const n = typeof raw === 'number' ? raw : Number(raw);
  const numStr = Number.isFinite(n) ? n.toFixed(decimals) : String(raw);
  return `${panel.prefix || ''}${numStr}${panel.suffix || ''}`;
};

const fetchPanelValue = async (panel: PagePanel, API_BASE_URL: string): Promise<any> => {
  if (panel.dataSourceType === 'static') {
    return panel.staticValue ?? 0;
  }
  const body = {
    tableName: panel.tableName,
    columnName: panel.columnName,
    aggregation: panel.aggregation || 'sum',
    distinctOn: panel.distinctOn,
    filters: panel.filters || {},
    window: panel.window || {}
  };
  const res = await fetch(`${API_BASE_URL}/panels_value.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.success) return data.value;
  throw new Error(data.error || 'Failed to fetch panel value');
};

// Panel Card Preview Component
export const PanelCardPreview: React.FC<{ panel: PagePanel; API_BASE_URL: string }> = ({ panel, API_BASE_URL }) => {
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (panel.dataSourceType === 'static') {
      setValue(panel.staticValue ?? 0);
      setLoading(false);
      return;
    }

    let canceled = false;
    fetchPanelValue(panel, API_BASE_URL)
      .then(val => {
        if (!canceled) {
          setValue(val);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!canceled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [panel, API_BASE_URL]);

  return (
    <div className="border border-gray-200 rounded p-3 bg-white shadow-sm">
      <div className="text-sm text-gray-600 flex items-center gap-2 mb-1">
        <span className="text-lg">{panel.icon || '📊'}</span>
        <span className="font-semibold text-gray-800">{panel.title || 'Untitled Panel'}</span>
      </div>
      {panel.subtitle ? <div className="text-xs text-gray-500 mb-2">{panel.subtitle}</div> : null}
      <div className="text-2xl font-bold text-gray-900">
        {loading ? 'Loading...' : error ? `Error: ${error}` : formatPanelValue(panel, value)}
      </div>
    </div>
  );
};

// Enhanced BarChartWithContextMenu Component with advanced context menu
const BarChartWithContextMenu = ({ config, panel }) => {
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    data: null
  });

  const [submenuVisible, setSubmenuVisible] = useState({
    stackBar: false,
    drillAcross: false,
    stackBarProduct: false,
    stackBarState: false,
    drillAcrossProduct: false,
    drillAcrossState: false,
    productDrillAcross: false,
  });

  const [stackingMode, setStackingMode] = useState(null);
  const [drillAcross, setDrillAcross] = useState(null);
  const [productDrillAcross, setProductDrillAcross] = useState(null);
  const contextMenuContainerRef = useRef(null);

  // Sample data for demonstration
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
      Object.values(stateDataStatic).forEach((sList) =>
        sList.forEach((s) => allStates.add(s.state))
      );
      return {
        keys: Array.from(allStates),
        colors: stateColors,
      };
    }
    const allProducts = new Set();
    Object.values(productDataStatic).forEach((pList) =>
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

  const chartData = drillDataStatic.map((d) => {
    const base = { name: d.name };
    const { keys } = getKeysAndColors();

    keys.forEach((key) => { base[key] = 0; });

    if (isMonthStacked(d.name)) {
      const sourceData = stackingMode?.type === "product" ? productDataStatic : stateDataStatic;
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

  const handleCellContextMenu = (e, entry) => {
    e.preventDefault();
    console.log('Right click on bar:', entry);
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

  // Render chart placeholder with context menu
  return (
    <div ref={contextMenuContainerRef} style={{ position: 'relative' }}>
      {showReset && (
        <div style={{ marginBottom: '10px', textAlign: 'right' }}>
          <button
            onClick={() => {
              resetStackedView();
              resetProductDrillAcross();
            }}
            style={{
              padding: '5px 10px',
              backgroundColor: '#e0e0e0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reset View
          </button>
        </div>
      )}

      {/* Render your bar chart here */}
      <div style={{ width: '100%', height: 300, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span>Bar Chart Visualization Area</span>
        {/* Simulated bars for context menu demo */}
        <div style={{ position: 'absolute', top: 50, left: 50, width: 40, height: 200, backgroundColor: '#4f46e5', cursor: 'context-menu' }}
             onContextMenu={(e) => handleCellContextMenu(e, { name: 'Jan', uv: 4000 })}></div>
        <div style={{ position: 'absolute', top: 80, left: 120, width: 40, height: 170, backgroundColor: '#4f46e5', cursor: 'context-menu' }}
             onContextMenu={(e) => handleCellContextMenu(e, { name: 'Feb', uv: 3000 })}></div>
        <div style={{ position: 'absolute', top: 120, left: 190, width: 40, height: 130, backgroundColor: '#4f46e5', cursor: 'context-menu' }}
             onContextMenu={(e) => handleCellContextMenu(e, { name: 'Mar', uv: 2000 })}></div>
      </div>

      {/* Context Menu Portal */}
      {contextMenu.show && ReactDOM.createPortal(
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 9999,
            width: '200px',
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
            <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                 className="hover:bg-gray-100">
              <span>Stack Bar</span>
              <span>▶</span>
            </div>
            {submenuVisible.stackBar && (
              <div className="submenu"
                   style={{
                     position: 'absolute',
                     top: 0,
                     left: '100%',
                     marginLeft: '2px',
                     width: '160px',
                     backgroundColor: 'white',
                     border: '1px solid #ccc',
                     borderRadius: '4px',
                     boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                     zIndex: 10000
                   }}>
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
                  <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                       className="hover:bg-gray-100">
                    <span>By Product</span>
                    <span>▶</span>
                  </div>
                  {submenuVisible.stackBarProduct && (
                    <div className="submenu"
                         style={{
                           position: 'absolute',
                           top: 0,
                           left: '100%',
                           marginLeft: '2px',
                           width: '120px',
                           backgroundColor: 'white',
                           border: '1px solid #ccc',
                           borderRadius: '4px',
                           boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                           zIndex: 10001
                         }}>
                      <div
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        className="hover:bg-gray-100"
                        onClick={handleStackBarByProductIndividual}
                      >
                        Individual
                      </div>
                      <div
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        className="hover:bg-gray-100"
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
                  <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                       className="hover:bg-gray-100">
                    <span>By State</span>
                    <span>▶</span>
                  </div>
                  {submenuVisible.stackBarState && (
                    <div className="submenu"
                         style={{
                           position: 'absolute',
                           top: 0,
                           left: '100%',
                           marginLeft: '2px',
                           width: '120px',
                           backgroundColor: 'white',
                           border: '1px solid #ccc',
                           borderRadius: '4px',
                           boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                           zIndex: 10001
                         }}>
                      <div
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        className="hover:bg-gray-100"
                        onClick={handleStackBarByStateIndividual}
                      >
                        Individual
                      </div>
                      <div
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        className="hover:bg-gray-100"
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
            <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                 className="hover:bg-gray-100">
              <span>Drill Across</span>
              <span>▶</span>
            </div>
            {submenuVisible.drillAcross && (
              <div className="submenu"
                   style={{
                     position: 'absolute',
                     top: 0,
                     left: '100%',
                     marginLeft: '2px',
                     width: '160px',
                     backgroundColor: 'white',
                     border: '1px solid #ccc',
                     borderRadius: '4px',
                     boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                     zIndex: 10000
                   }}>
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
                  <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                       className="hover:bg-gray-100">
                    <span>By Product</span>
                    <span>▶</span>
                  </div>
                  {submenuVisible.drillAcrossProduct && (
                    <div className="submenu"
                         style={{
                           position: 'absolute',
                           top: 0,
                           left: '100%',
                           marginLeft: '2px',
                           width: '120px',
                           backgroundColor: 'white',
                           border: '1px solid #ccc',
                           borderRadius: '4px',
                           boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                           zIndex: 10001
                         }}>
                      <div
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        className="hover:bg-gray-100"
                        onClick={handleDrillAcrossByProductIndividual}
                      >
                        Individual
                      </div>
                      <div
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        className="hover:bg-gray-100"
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
                  <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                       className="hover:bg-gray-100">
                    <span>By State</span>
                    <span>▶</span>
                  </div>
                  {submenuVisible.drillAcrossState && (
                    <div className="submenu"
                         style={{
                           position: 'absolute',
                           top: 0,
                           left: '100%',
                           marginLeft: '2px',
                           width: '120px',
                           backgroundColor: 'white',
                           border: '1px solid #ccc',
                           borderRadius: '4px',
                           boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                           zIndex: 10001
                         }}>
                      <div
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        className="hover:bg-gray-100"
                        onClick={handleDrillAcrossByStateIndividual}
                      >
                        Individual
                      </div>
                      <div
                        style={{ padding: '8px 12px', cursor: 'pointer' }}
                        className="hover:bg-gray-100"
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
            <div style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                 className="hover:bg-gray-100">
              <span>Drill Across (Product-wise)</span>
              <span>▶</span>
            </div>
            {submenuVisible.productDrillAcross && (
              <div className="submenu"
                   style={{
                     position: 'absolute',
                     top: 0,
                     left: '100%',
                     marginLeft: '2px',
                     width: '200px',
                     backgroundColor: 'white',
                     border: '1px solid #ccc',
                     borderRadius: '4px',
                     boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                     zIndex: 10000
                   }}>
                <div
                  style={{ padding: '8px 12px', cursor: 'pointer' }}
                  className="hover:bg-gray-100"
                  onClick={handleProductDrillAcrossByProductIndividual}
                >
                  By Product (Individual)
                </div>
                <div
                  style={{ padding: '8px 12px', cursor: 'pointer' }}
                  className="hover:bg-gray-100"
                  onClick={handleProductDrillAcrossByProductAll}
                >
                  By Product (All)
                </div>
                <div
                  style={{ padding: '8px 12px', cursor: 'pointer' }}
                  className="hover:bg-gray-100"
                  onClick={handleProductDrillAcrossByStateIndividual}
                >
                  By State (Individual)
                </div>
                <div
                  style={{ padding: '8px 12px', cursor: 'pointer' }}
                  className="hover:bg-gray-100"
                  onClick={handleProductDrillAcrossByStateAll}
                >
                  By State (All)
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Panels Tab Component with full + Add New Component functionality and bar chart context menu integration
const PanelsTab: React.FC<{
  page: any;
  updatePanel: (id: string, updates: Partial<PagePanel>) => void;
  addPanel: () => void;
  removePanel: (id: string) => void;
  API_BASE_URL: string;
  setTabError: (error: string | null) => void;
}> = ({ page, updatePanel, addPanel, removePanel, API_BASE_URL, setTabError }) => {
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null);

  // State for Add New Component form
  const [showAddComponentForm, setShowAddComponentForm] = useState(false);
  const [newComponentType, setNewComponentType] = useState<'chart' | 'table' | 'header' | 'filter' | 'text' | 'image'>('chart');
  const [newComponentConfig, setNewComponentConfig] = useState<any>({});

  // State for bar chart context menus
  const [barChartContextMenus, setBarChartContextMenus] = useState<any[]>([]);

  // Sync context menus into newComponentConfig when bar chart is selected
  useEffect(() => {
    if (newComponentType === 'chart' && newComponentConfig.chartType === 'bar') {
      setNewComponentConfig(cfg => ({ ...cfg, contextMenus: barChartContextMenus }));
    }
  }, [barChartContextMenus, newComponentType, newComponentConfig.chartType]);

  const toggleExpand = (id: string) => {
    setExpandedPanelId(expandedPanelId === id ? null : id);
  };

  const addContextMenuItem = () => {
    setBarChartContextMenus([...barChartContextMenus, { label: '', submenu: [] }]);
  };

  const updateContextMenuLabel = (index: number, label: string) => {
    const updated = [...barChartContextMenus];
    updated[index].label = label;
    setBarChartContextMenus(updated);
  };

  const removeContextMenuItem = (index: number) => {
    const updated = [...barChartContextMenus];
    updated.splice(index, 1);
    setBarChartContextMenus(updated);
  };

  const handleAddNewComponent = () => {
    if (!newComponentType) {
      setTabError('Please select a component type.');
      return;
    }
    const newComp = {
      id: Date.now().toString(),
      type: newComponentType,
      position: { x: 10, y: 10 },
      size: { width: 800, height: 400 },
      config: newComponentConfig
    };
    page.components = [...(page.components || []), newComp];
    setShowAddComponentForm(false);
    setNewComponentConfig({});
    setNewComponentType('chart');
    setBarChartContextMenus([]); // reset context menus
    setTabError(null);
    // Notify parent to update state
    addPanel();
  };

  return (
    <div className="tab-panel space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold">Page Panels</h4>
        <div className="flex gap-2">
          <button
            onClick={addPanel}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            + Add Panel
          </button>
          <button
            onClick={() => setShowAddComponentForm(!showAddComponentForm)}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            + Add New Component
          </button>
        </div>
      </div>

      {showAddComponentForm && (
        <div className="border border-green-600 rounded p-4 mb-4 bg-green-50">
          <h5 className="font-semibold mb-2">Add New Component</h5>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Component Type</label>
              <select
                value={newComponentType}
                onChange={(e) => setNewComponentType(e.target.value as any)}
                className="w-full border border-gray-300 rounded px-2 py-1"
              >
                <option value="chart">Chart</option>
                <option value="table">Table</option>
                <option value="header">Header</option>
                <option value="filter">Filter</option>
                <option value="text">Text</option>
                <option value="image">Image</option>
              </select>
            </div>

            {newComponentType === 'chart' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Chart Type</label>
                  <select
                    value={newComponentConfig.chartType || 'pie'}
                    onChange={(e) => setNewComponentConfig({ ...newComponentConfig, chartType: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="pie">Pie</option>
                    <option value="bar">Bar</option>
                    <option value="line">Line</option>
                    <option value="area">Area</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Data Source Type</label>
                  <select
                    value={newComponentConfig.dataSourceType || 'api'}
                    onChange={(e) => setNewComponentConfig({ ...newComponentConfig, dataSourceType: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="api">From Table (API)</option>
                    <option value="static">Static</option>
                  </select>
                </div>

                {newComponentConfig.dataSourceType === 'static' ? (
                  <textarea
                    rows={4}
                    value={JSON.stringify(newComponentConfig.staticData || [], null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setNewComponentConfig({ ...newComponentConfig, staticData: parsed });
                        setTabError(null);
                      } catch {
                        setTabError('Static data must be valid JSON array.');
                      }
                    }}
                    className="w-full border border-gray-300 rounded font-mono text-sm px-2 py-1"
                  />
                ) : (
                  <>
                    <label className="block text-sm font-medium mb-1">Table Name</label>
                    <input
                      type="text"
                      value={newComponentConfig.tableName || ''}
                      onChange={(e) => setNewComponentConfig({ ...newComponentConfig, tableName: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />

                    <label className="block text-sm font-medium mb-1">Columns (comma separated keys)</label>
                    <input
                      type="text"
                      value={(newComponentConfig.columns || []).map((c: any) => c.key).join(', ')}
                      onChange={(e) => {
                        const keys = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        // Map keys to objects with key and header same as key initially
                        const cols = keys.map(k => ({ key: k, header: k }));
                        setNewComponentConfig({ ...newComponentConfig, columns: cols });
                      }}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />

                    <label className="block text-sm font-medium mb-1">X Axis Key</label>
                    <input
                      type="text"
                      value={newComponentConfig.xKey || ''}
                      onChange={(e) => setNewComponentConfig({ ...newComponentConfig, xKey: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                      placeholder="e.g., category"
                    />

                    <label className="block text-sm font-medium mb-1">Y Axis Key</label>
                    <input
                      type="text"
                      value={newComponentConfig.yKey || ''}
                      onChange={(e) => setNewComponentConfig({ ...newComponentConfig, yKey: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                      placeholder="e.g., value"
                    />

                    <label className="block text-sm font-medium mb-1">Filters (JSON)</label>
                    <input
                      type="text"
                      value={JSON.stringify(newComponentConfig.filters || {})}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value || '{}');
                          setNewComponentConfig({ ...newComponentConfig, filters: parsed });
                          setTabError(null);
                        } catch {
                          setTabError('Filters must be valid JSON.');
                        }
                      }}
                      className="w-full border border-gray-300 rounded font-mono text-sm px-2 py-1"
                    />
                  </>
                )}

                {/* Context Menu UI for Bar Chart */}
                {newComponentConfig.chartType === 'bar' && (
                  <div className="col-span-2 border border-gray-300 rounded p-3 mt-4">
                    <h6 className="font-semibold mb-2">Context Menu Items</h6>
                    {barChartContextMenus.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          placeholder="Menu Label"
                          value={item.label}
                          onChange={(e) => updateContextMenuLabel(idx, e.target.value)}
                          className="flex-grow border border-gray-300 rounded px-2 py-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeContextMenuItem(idx)}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          title="Remove Menu Item"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addContextMenuItem}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      + Add Context Menu Item
                    </button>
                  </div>
                )}
              </>
            )}

            {newComponentType === 'table' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Data Source Type</label>
                  <select
                    value={newComponentConfig.dataSourceType || 'api'}
                    onChange={(e) => setNewComponentConfig({ ...newComponentConfig, dataSourceType: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="api">From Table (API)</option>
                    <option value="static">Static</option>
                  </select>
                </div>

                {newComponentConfig.dataSourceType === 'static' ? (
                  <textarea
                    rows={4}
                    value={JSON.stringify(newComponentConfig.staticData || [], null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setNewComponentConfig({ ...newComponentConfig, staticData: parsed });
                        setTabError(null);
                      } catch {
                        setTabError('Static data must be valid JSON array.');
                      }
                    }}
                    className="w-full border border-gray-300 rounded font-mono text-sm px-2 py-1"
                  />
                ) : (
                  <>
                    <label className="block text-sm font-medium mb-1">Table Name</label>
                    <input
                      type="text"
                      value={newComponentConfig.tableName || ''}
                      onChange={(e) => setNewComponentConfig({ ...newComponentConfig, tableName: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />

                    <label className="block text-sm font-medium mb-1">Columns (comma separated keys)</label>
                    <input
                      type="text"
                      value={(newComponentConfig.columns || []).map((c: any) => c.key).join(', ')}
                      onChange={(e) => {
                        const keys = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        // Map keys to objects with key and header same as key initially
                        const cols = keys.map(k => ({ key: k, header: k }));
                        setNewComponentConfig({ ...newComponentConfig, columns: cols });
                      }}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />

                    {/* For table, allow editing headers for each column */}
                    {newComponentConfig.columns && newComponentConfig.columns.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <label className="block font-medium mb-1">Column Headers</label>
                        {newComponentConfig.columns.map((col: any, idx: number) => (
                          <input
                            key={col.key}
                            type="text"
                            value={col.header || col.key}
                            onChange={(e) => {
                              const updatedCols = [...newComponentConfig.columns];
                              updatedCols[idx] = { ...updatedCols[idx], header: e.target.value };
                              setNewComponentConfig({ ...newComponentConfig, columns: updatedCols });
                            }}
                            className="w-full border border-gray-300 rounded px-2 py-1"
                            placeholder={`Header for ${col.key}`}
                          />
                        ))}
                      </div>
                    )}

                    <label className="block font-medium mb-1 mt-4">Filters (JSON)</label>
                    <input
                      type="text"
                      value={JSON.stringify(newComponentConfig.filters || {})}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value || '{}');
                          setNewComponentConfig({ ...newComponentConfig, filters: parsed });
                          setTabError(null);
                        } catch {
                          setTabError('Filters must be valid JSON.');
                        }
                      }}
                      className="w-full border border-gray-300 rounded font-mono text-sm px-2 py-1"
                    />
                  </>
                )}
              </>
            )}

            <div className="col-span-2 flex justify-end space-x-4 mt-4">
              <button
                onClick={handleAddNewComponent}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Add Component
              </button>

              <button
                onClick={() => {
                  setShowAddComponentForm(false);
                  setNewComponentConfig({});
                  setNewComponentType('chart');
                  setBarChartContextMenus([]);
                  setTabError(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 max-h-[50vh] overflow-auto">
        {(page.panels || []).map((panel: PagePanel) => (
          <div key={panel.id} className="border border-gray-300 rounded p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">{panel.title || 'Untitled Panel'}</span>
              <div>
                <button
                  onClick={() => toggleExpand(panel.id)}
                  className="mr-2 text-blue-600 hover:text-blue-800"
                >
                  {expandedPanelId === panel.id ? 'Collapse' : 'Expand'}
                </button>
                <button
                  onClick={() => removePanel(panel.id)}
                  className="text-red-600 hover:text-red-800 font-bold"
                  title="Remove Panel"
                >
                  ×
                </button>
              </div>
            </div>

            {expandedPanelId === panel.id && (
              <div className="space-y-3 mt-3 p-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                      type="text"
                      value={panel.title || ''}
                      onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={panel.subtitle || ''}
                      onChange={(e) => updatePanel(panel.id, { subtitle: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Icon</label>
                    <input
                      type="text"
                      value={panel.icon || ''}
                      onChange={(e) => updatePanel(panel.id, { icon: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                      placeholder="e.g., 📊"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Color</label>
                    <select
                      value={panel.color || 'indigo'}
                      onChange={(e) => updatePanel(panel.id, { color: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="indigo">Indigo</option>
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="yellow">Yellow</option>
                      <option value="red">Red</option>
                      <option value="purple">Purple</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Data Source Type</label>
                    <select
                      value={panel.dataSourceType}
                      onChange={(e) => updatePanel(panel.id, { dataSourceType: e.target.value as 'api' | 'static' })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="api">From Table (API)</option>
                      <option value="static">Static Value</option>
                    </select>
                  </div>

                  {panel.dataSourceType === 'static' ? (
                    <div>
                      <label className="block text-sm font-medium mb-1">Static Value</label>
                      <input
                        type="text"
                        value={panel.staticValue ?? ''}
                        onChange={(e) => updatePanel(panel.id, { staticValue: isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded px-2 py-1"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Table Name</label>
                        <input
                          type="text"
                          value={panel.tableName || ''}
                          onChange={(e) => updatePanel(panel.id, { tableName: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Column Name</label>
                        <input
                          type="text"
                          value={panel.columnName || ''}
                          onChange={(e) => updatePanel(panel.id, { columnName: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Aggregation</label>
                        <select
                          value={panel.aggregation || 'sum'}
                          onChange={(e) => updatePanel(panel.id, { aggregation: e.target.value as PanelAggregation })}
                          className="w-full border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="sum">Sum</option>
                          <option value="avg">Average</option>
                          <option value="count">Count</option>
                          <option value="distinct_count">Distinct Count</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Distinct On</label>
                        <input
                          type="text"
                          value={panel.distinctOn || ''}
                          onChange={(e) => updatePanel(panel.id, { distinctOn: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1"
                          placeholder="e.g., user_id"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Filters (JSON)</label>
                        <textarea
                          value={JSON.stringify(panel.filters || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value || '{}');
                              updatePanel(panel.id, { filters: parsed });
                              setTabError(null);
                            } catch {
                              setTabError('Filters must be valid JSON.');
                            }
                          }}
                          rows={3}
                          className="w-full border border-gray-300 rounded font-mono text-sm px-2 py-1"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Window Options (JSON)</label>
                        <textarea
                          value={JSON.stringify(panel.window || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value || '{}');
                              updatePanel(panel.id, { window: parsed });
                              setTabError(null);
                            } catch {
                              setTabError('Window options must be valid JSON.');
                            }
                          }}
                          rows={3}
                          className="w-full border border-gray-300 rounded font-mono text-sm px-2 py-1"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Prefix</label>
                    <input
                      type="text"
                      value={panel.prefix || ''}
                      onChange={(e) => updatePanel(panel.id, { prefix: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Suffix</label>
                    <input
                      type="text"
                      value={panel.suffix || ''}
                      onChange={(e) => updatePanel(panel.id, { suffix: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Decimals</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={panel.decimals ?? 0}
                      onChange={(e) => updatePanel(panel.id, { decimals: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="mt-3 p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500 mb-1">Preview:</div>
              {/* Render bar chart with context menu if chartType is bar */}
              {panel.type === 'chart' && panel.config?.chartType === 'bar' ? (
                <BarChartWithContextMenu config={panel.config} panel={panel} />
              ) : (
                <PanelCardPreview panel={panel} API_BASE_URL={API_BASE_URL} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PanelsTab;