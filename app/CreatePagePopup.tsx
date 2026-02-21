import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';

// Types from your domain
type PageGrain = 'row' | 'salesrep' | 'account' | 'product' | 'region';

interface PageAnalytics {
  grain: PageGrain;
  metrics?: string[];
  dimensions?: string[];
  topN?: number;
  bottomN?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  additionalFilters?: Record<string, unknown>;
}

interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'image' | 'link';
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  position: number;
}

interface ContextMenuItem {
  label: string;
  onClick?: () => void;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position?: { x: number; y: number };
  onClose: () => void;
}

interface PageComponent {
  id: string;
  type: 'header' | 'table' | 'chart' | 'filter' | 'text' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: {
    dataSourceType?: 'api' | 'static';
    tableName?: string;
    query?: string;
    columns?: Array<{ key: string; header?: string }>;
    chartType?: 'pie' | 'bar' | 'line' | 'area';
    filters?: Record<string, unknown>;
    aggregation?: PanelAggregation;
    staticData?: Record<string, unknown>[];
    xKey?: string;
    yKey?: string;
  };
}

interface PageSettings {
  showHeader?: boolean;
  showFooter?: boolean;
  enableSearch?: boolean;
  enableExport?: boolean;
  pagination?: boolean;
  itemsPerPage?: number;
}

type PanelAggregation = 'sum' | 'avg' | 'count' | 'distinct_count';

interface PanelWindowOptions {
  partitionBy?: string[];
  orderBy?: string;
}

interface PagePanel {
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
  filters?: Record<string, unknown>;
  window?: PanelWindowOptions;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

interface Page {
  id: string;
  name: string;
  url: string;
  description?: string;
  layout?: 'grid' | 'list' | 'card';
  theme?: string;
  customCSS?: string;
  tableStructure?: TableColumn[];
  components?: PageComponent[];
  panels?: PagePanel[];
  settings?: PageSettings;
  analytics?: PageAnalytics;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CreatePagePopupProps {
  open: boolean;
  onClose: () => void;
  onPageCreated: () => void;
  editingPage: Page | null;
  API_BASE_URL: string;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuOpenIndex, setSubmenuOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: position ? 'fixed' : 'relative',
        top: position ? position.y : undefined,
        left: position ? position.x : undefined,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        zIndex: 10000,
        minWidth: 160,
        fontSize: 14,
        userSelect: 'none',
      }}
      onContextMenu={e => e.preventDefault()}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            position: 'relative',
            backgroundColor: submenuOpenIndex === idx ? '#f0f0f0' : 'transparent',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          onMouseEnter={() => setSubmenuOpenIndex(idx)}
          onMouseLeave={() => setSubmenuOpenIndex(null)}
          onClick={() => {
            if (item.onClick) {
              item.onClick();
              onClose();
            }
          }}
        >
          <span>{item.label}</span>
          {item.submenu && <span style={{ marginLeft: 8 }}>▶</span>}
          {item.submenu && submenuOpenIndex === idx && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '100%',
                backgroundColor: 'white',
                border: '1px solid #ccc',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                minWidth: 160,
                zIndex: 10000,
              }}
            >
              <ContextMenu
                items={item.submenu}
                onClose={onClose}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
const generatePageTSXContent = (page: Partial<Page>): string => {
  // Existing imports for charts
  const usesPie = page.components?.some(c => c.type === 'chart' && c.config.chartType === 'pie');
  const usesBar = page.components?.some(c => c.type === 'chart' && c.config.chartType === 'bar');

  const imports = [
    "import React, { useState, useEffect } from 'react';",
    usesPie ? "import { PieChart, Pie } from 'recharts';" : '',
    usesBar ? "import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';" : '',
  ].filter(Boolean).join('\n');

  // ContextMenu component code as string
  const contextMenuComponent = `
const ContextMenu = ({ items, position, onClose }) => {
  if (!position) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        zIndex: 10000,
        minWidth: 160,
        fontSize: 14,
        userSelect: 'none',
      }}
      onContextMenu={e => e.preventDefault()}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{ padding: '6px 12px', cursor: 'pointer' }}
          onClick={() => {
            if (item.onClick) item.onClick();
            onClose();
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
};
`;

  // Data fetching hooks for components with dynamic POST body
  const componentHooks = (page.components || []).map(c => {
    const stateName = `data${c.id}`;
    if (c.config.dataSourceType === 'static') {
      return `const [${stateName}, set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}] = useState(${JSON.stringify(c.config.staticData || [])});`;
    } else {
      // Prepare JSON body string with dynamic values escaped properly
      const tableName = c.config.tableName || '';
      const columns = c.config.columns ? c.config.columns.map(col => col.key) : [];
      const filters = JSON.stringify(c.config.filters || {});
      const aggregation = c.config.aggregation ? `'${c.config.aggregation}'` : 'null';
      const query = c.config.query ? `'${c.config.query}'` : 'null';

      return `const [${stateName}, set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}] = useState([]);
useEffect(() => {
  let canceled = false;
  fetch('https://intelligentsalesman.com/ism1/API/component_data.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableName: '${tableName}',
      columns: ${JSON.stringify(columns)},
      filters: ${filters},
      aggregation: ${aggregation},
      query: ${query}
    })
  })
    .then(res => res.json())
    .then(json => { if (!canceled) set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}(json.rows || []); })
    .catch(() => { if (!canceled) set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}([]); });
  return () => { canceled = true; };
}, []);`;
    }
  }).join('\n');

  // Data fetching hooks for panels remain unchanged
  const panelHooks = (page.panels || []).map(p => {
    const stateName = `panelValue${p.id}`;
    if (p.dataSourceType === 'static') {
      return `const [${stateName}, set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}] = useState(${JSON.stringify(p.staticValue ?? 0)});`;
    } else {
      return `const [${stateName}, set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}] = useState(null);
useEffect(() => {
  let canceled = false;
  fetch('https://intelligentsalesman.com/ism1/API/panels_value.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableName: '${p.tableName || ''}',
      columnName: '${p.columnName || ''}',
      aggregation: '${p.aggregation || 'sum'}',
      distinctOn: '${p.distinctOn || ''}',
      filters: ${JSON.stringify(p.filters || {})},
      window: ${JSON.stringify(p.window || {})}
    })
  })
    .then(res => res.json())
    .then(json => { if (!canceled && json.success) set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}(json.value); })
    .catch(() => { if (!canceled) set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}(null); });
  return () => { canceled = true; };
}, []);`;
    }
  }).join('\n');

  // JSX for components (charts, tables)
  const componentsJSX = (page.components || []).map(c => {
    const stateName = `data${c.id}`;
    const width = c.size?.width || 800;
    const height = c.size?.height || 400;
    if (c.type === 'chart') {
      const chartType = c.config.chartType || 'pie';
      const xKey = c.config.xKey || (c.config.columns && c.config.columns[0]?.key) || 'x';
      const yKey = c.config.yKey || (c.config.columns && c.config.columns[1]?.key) || 'y';

      if (chartType === 'pie') {
        return `<PieChart width={${width}} height={${height}} data={${stateName}}>
  <Pie dataKey="${yKey}" nameKey="${xKey}" outerRadius={80} fill="#8884d8" label />
</PieChart>`;
      }
      if (chartType === 'bar') {
        return `<BarChart width={${width}} height={${height}} data={${stateName}}>
  <XAxis dataKey="${xKey}" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="${yKey}" fill="#8884d8">
    {${stateName}.map((entry, index) => (
      <Cell
        key={\`cell-\${index}\`}
        onContextMenu={(e) => handleBarContextMenu(entry, index, e)}
        style={{ cursor: 'context-menu' }}
      />
    ))}
  </Bar>
</BarChart>`;
      }
      return `<div>Unsupported chart type: ${chartType}</div>`;
    }

    if (c.type === 'table') {
      const columns = c.config.columns || [];
      return `<table style={{ width: '100%', borderCollapse: 'collapse' }}>
  <thead>
    <tr>
      ${columns.map(col => `<th style={{ border: '1px solid #ccc', padding: 4 }}>${col.header || col.key}</th>`).join('\n')}
    </tr>
  </thead>
  <tbody>
    {${stateName}.map((row, idx) => (
      <tr key={idx}>
        ${columns.map(col => `<td style={{ border: '1px solid #ccc', padding: 4 }}>{row['${col.key}']}</td>`).join('\n')}
      </tr>
    ))}
  </tbody>
</table>`;
    }

    return `<div>Component type "${c.type}" not supported in generated code.</div>`;
  }).join('\n');

  // JSX for panels
  const panelsJSX = (page.panels || []).map(p => {
    const stateName = `panelValue${p.id}`;
    const decimals = typeof p.decimals === 'number' ? p.decimals : 0;
    const prefix = p.prefix || '';
    const suffix = p.suffix || '';
    return `<div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12, margin: 8, backgroundColor: '#f9f9f9', width: 280 }}>
  <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>${p.title || 'Panel'}</div>
  <div style={{ fontSize: 24, fontWeight: 'bold' }}>
   {${stateName} !== null && !isNaN(Number(${stateName}))
  ? \`${prefix}\${Number(${stateName}).toFixed(${decimals})}${suffix}\`
  : 'Loading...'}
  </div>
  ${p.subtitle ? `<div style={{ fontSize: 12, color: '#666' }}>${p.subtitle}</div>` : ''}
</div>`;
  }).join('\n');

  return `
${imports}

${contextMenuComponent}

const ${page.name?.replace(/[^a-zA-Z0-9]/g, '') || 'Page'} = () => {
  ${componentHooks}
  ${panelHooks}

  const [contextMenuPos, setContextMenuPos] = useState(null);
  const [contextMenuItems, setContextMenuItems] = useState([]);
  const [contextMenuTargetData, setContextMenuTargetData] = useState(null);

  const [stackingMode, setStackingMode] = useState('none');
  const [drillAcross, setDrillAcross] = useState(null);
  const [productDrillAcross, setProductDrillAcross] = useState(null);

  const resetViews = () => {
    setStackingMode('none');
    setDrillAcross(null);
    setProductDrillAcross(null);
  };

  const handleBarContextMenu = (data, index, event) => {
    event.preventDefault();
    setContextMenuPos({ x: event.clientX, y: event.clientY });
    const items = [
      {
        label: 'Stack Bar',
        items: [
          { label: 'None', onClick: () => setStackingMode('none') },
          { label: 'Stack', onClick: () => setStackingMode('stack') },
          { label: 'Stack 100%', onClick: () => setStackingMode('stack100') },
        ],
      },
      {
        label: 'Drill Across',
        items: [
          { label: 'None', onClick: () => setDrillAcross(null) },
          { label: 'Product', onClick: () => setDrillAcross('product') },
          { label: 'Customer', onClick: () => setDrillAcross('customer') },
          { label: 'Region', onClick: () => setDrillAcross('region') },
          { label: 'Salesperson', onClick: () => setDrillAcross('salesperson') },
          { label: 'Date', onClick: () => setDrillAcross('date') },
        ],
      },
      {
        label: 'Product Drill Across',
        items: [
          { label: 'None', onClick: () => setProductDrillAcross(null) },
          { label: 'Product Category', onClick: () => setProductDrillAcross('productCategory') },
          { label: 'Product Subcategory', onClick: () => setProductDrillAcross('productSubcategory') },
          { label: 'Product Name', onClick: () => setProductDrillAcross('productName') },
        ],
      },
      {
        label: 'Reset View',
        onClick: resetViews,
      },
    ];
    setContextMenuItems(items);
    setContextMenuTargetData(data);
  };

  const closeContextMenu = () => {
    setContextMenuPos(null);
    setContextMenuItems([]);
    setContextMenuTargetData(null);
  };

  return (
    <div>
      <h1>${page.name || 'Untitled Page'}</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        ${panelsJSX}
      </div>
      <div>
        ${componentsJSX}
      </div>
      {contextMenuPos && contextMenuItems.length > 0 && (
        <ContextMenu items={contextMenuItems} position={contextMenuPos} onClose={closeContextMenu} />
      )}
    </div>
  );
};

export default ${page.name?.replace(/[^a-zA-Z0-9]/g, '') || 'Page'};
`;
};
// Updated ChartComponent with context menu on bars
const ChartComponent: React.FC<{ component: PageComponent; API_BASE_URL: string }> = ({ component, API_BASE_URL }) => {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuItems, setContextMenuItems] = useState<ContextMenuItem[]>([]);
  const [contextMenuTargetData, setContextMenuTargetData] = useState<Record<string, unknown> | null>(null);
  const [stackingMode, setStackingMode] = useState<{ type: string; scope: string; month?: string } | null>(null);
  const [drillAcross, setDrillAcross] = useState<{ type: string; scope: string; month?: string } | null>(null);
  const [productDrillAcross, setProductDrillAcross] = useState<{ type: string; scope: string; month?: string } | null>(null);

  useEffect(() => {
    let canceled = false;
    fetchComponentData(component, API_BASE_URL)
      .then(rows => { if (!canceled) setData(rows); })
      .catch(err => { if (!canceled) setError(err.message); });
    return () => { canceled = true; };
  }, [component, API_BASE_URL]);

  if (error) return <div>Error: {error}</div>;
  if (!data.length) return <div>Loading...</div>;

  const xKey = component.config.xKey || component.config.columns?.[0]?.key;
  const yKey = component.config.yKey || component.config.columns?.[1]?.key;

  // Handler for right-click on a bar
  const handleBarContextMenu = (data: Record<string, unknown>, index: number, event: React.MouseEvent) => {
    event.preventDefault();
    const clickX = event.clientX;
    const clickY = event.clientY;

    // Define the context menu structure as per your requirement
    const menuItems: ContextMenuItem[] = [
      {
        label: 'Drill Across',
        submenu: [
          {
            label: 'By Product',
            submenu: [
              {
                label: 'Individual',
                onClick: () => {
                  setDrillAcross({ type: 'by-product', scope: 'individual', month: data[xKey] });
                  closeContextMenu();
                }
              },
              {
                label: 'All',
                onClick: () => {
                  setDrillAcross({ type: 'by-product', scope: 'all' });
                  closeContextMenu();
                }
              }
            ]
          },
          {
            label: 'By State',
            submenu: [
              {
                label: 'Individual',
                onClick: () => {
                  setDrillAcross({ type: 'by-state', scope: 'individual', month: data[xKey] });
                  closeContextMenu();
                }
              },
              {
                label: 'All',
                onClick: () => {
                  setDrillAcross({ type: 'by-state', scope: 'all' });
                  closeContextMenu();
                }
              }
            ]
          }
        ]
      },
      {
        label: 'Stack Bar',
        submenu: [
          {
            label: 'By Product',
            submenu: [
              {
                label: 'Individual',
                onClick: () => {
                  setStackingMode({ type: 'product', scope: 'individual', month: data[xKey] });
                  closeContextMenu();
                }
              },
              {
                label: 'All',
                onClick: () => {
                  setStackingMode({ type: 'product', scope: 'all' });
                  closeContextMenu();
                }
              }
            ]
          },
          {
            label: 'By State',
            submenu: [
              {
                label: 'Individual',
                onClick: () => {
                  setStackingMode({ type: 'state', scope: 'individual', month: data[xKey] });
                  closeContextMenu();
                }
              },
              {
                label: 'All',
                onClick: () => {
                  setStackingMode({ type: 'state', scope: 'all' });
                  closeContextMenu();
                }
              }
            ]
          }
        ]
      },
      {
        label: 'Drill Across (Product-wise)',
        submenu: [
          {
            label: 'By Product',
            submenu: [
              {
                label: 'Individual',
                onClick: () => {
                  setProductDrillAcross({ type: 'by-product', scope: 'individual', month: data[xKey] });
                  closeContextMenu();
                }
              },
              {
                label: 'All',
                onClick: () => {
                  setProductDrillAcross({ type: 'by-product', scope: 'all' });
                  closeContextMenu();
                }
              }
            ]
          },
          {
            label: 'By State',
            submenu: [
              {
                label: 'Individual',
                onClick: () => {
                  setProductDrillAcross({ type: 'by-state', scope: 'individual', month: data[xKey] });
                  closeContextMenu();
                }
              },
              {
                label: 'All',
                onClick: () => {
                  setProductDrillAcross({ type: 'by-state', scope: 'all' });
                  closeContextMenu();
                }
              }
            ]
          }
        ]
      }
    ];

    setContextMenuItems(menuItems);
    setContextMenuPos({ x: clickX, y: clickY });
    setContextMenuTargetData(data);
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenuPos(null);
    setContextMenuItems([]);
    setContextMenuTargetData(null);
  };

  // Reset all views
  const resetViews = () => {
    setStackingMode(null);
    setDrillAcross(null);
    setProductDrillAcross(null);
  };

  // Check if reset button should be shown
  const showReset = stackingMode !== null || drillAcross !== null || productDrillAcross !== null;

  if (component.config.chartType === 'pie') {
    return (
      <div style={{ position: 'relative' }}>
        <PieChart width={component.size.width} height={component.size.height}>
          <Pie data={data} dataKey={yKey} nameKey={xKey} outerRadius={80} fill="#8884d8" label />
        </PieChart>
        {contextMenuPos && contextMenuItems.length > 0 && (
          <ContextMenu items={contextMenuItems} position={contextMenuPos} onClose={closeContextMenu} />
        )}
      </div>
    );
  }

  if (component.config.chartType === 'bar') {
    // Process data based on current view modes
    const processedData = data.map(d => {
      // If stacking by product
      if (stackingMode?.type === 'product' && 
          (stackingMode.scope === 'all' || stackingMode.scope === 'individual' && stackingMode.month === d[xKey])) {
        // In a real implementation, you would have product breakdown data here
        // For demo, we'll just show a split
        return {
          ...d,
          ProductA: d[yKey] * 0.6,
          ProductB: d[yKey] * 0.4
        };
      }
      // If stacking by state
      else if (stackingMode?.type === 'state' && 
               (stackingMode.scope === 'all' || stackingMode.scope === 'individual' && stackingMode.month === d[xKey])) {
        // In a real implementation, you would have state breakdown data here
        // For demo, we'll just show a split
        return {
          ...d,
          NY: d[yKey] * 0.7,
          CA: d[yKey] * 0.3
        };
      }
      return d;
    });

    return (
      <div style={{ position: 'relative' }}>
        {showReset && (
          <div style={{ marginBottom: '10px', textAlign: 'right' }}>
            <button 
              onClick={resetViews}
              style={{
                padding: '5px 10px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reset View
            </button>
          </div>
        )}
        <BarChart width={component.size.width} height={component.size.height} data={processedData}>
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {stackingMode ? (
            // Render stacked bars when in stacking mode
            stackingMode.type === 'product' ? (
              <>
                <Bar dataKey="ProductA" stackId="a" fill="#6366F1" />
                <Bar dataKey="ProductB" stackId="a" fill="#F59E0B" />
              </>
            ) : (
              <>
                <Bar dataKey="NY" stackId="a" fill="#EF4444" />
                <Bar dataKey="CA" stackId="a" fill="#3B82F6" />
              </>
            )
          ) : (
            // Render normal bars
            <Bar
              dataKey={yKey}
              fill="#8884d8"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  onContextMenu={(e) => handleBarContextMenu(entry, index, e)}
                  style={{ cursor: 'context-menu' }}
                />
              ))}
            </Bar>
          )}
        </BarChart>
        {contextMenuPos && contextMenuItems.length > 0 && (
          <ContextMenu items={contextMenuItems} position={contextMenuPos} onClose={closeContextMenu} />
        )}
      </div>
    );
  }
  return <div>Unsupported chart type</div>;
};

// Fetch data for components
const fetchComponentData = async (component: PageComponent, API_BASE_URL: string): Promise<Record<string, unknown>[]> => {
  if (component.config.dataSourceType === 'static') {
    return component.config.staticData || [];
  }
  const res = await fetch(API_BASE_URL + '/component_data.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableName: component.config.tableName,
      columns: component.config.columns?.map(c => c.key),
      filters: component.config.filters,
      aggregation: component.config.aggregation,
      query: component.config.query
    })
  });
  const data = await res.json();
  if (data.success) return data.rows;
  throw new Error(data.error || 'Failed to fetch component data');
};

// Fetch filters from filter_master table API
const fetchAvailableFilters = async (API_BASE_URL: string): Promise<Record<string, unknown>[]> => {
  try {
    const res = await fetch(API_BASE_URL + '/filter_master.php');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.success) return data.filters || [];
  } catch (e) {
    console.error('Error fetching filters:', e);
  }
  return [];
};

const TableComponent: React.FC<{ component: PageComponent; API_BASE_URL: string }> = ({ component, API_BASE_URL }) => {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    fetchComponentData(component, API_BASE_URL)
      .then(rows => { if (!canceled) setData(rows); })
      .catch(err => { if (!canceled) setError(err.message); });
    return () => { canceled = true; };
  }, [component, API_BASE_URL]);

  if (error) return <div>Error: {error}</div>;
  if (!data.length) return <div>Loading...</div>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {component.config.columns?.map((col) => (
            <th key={col.key} style={{ border: '1px solid #ccc', padding: '4px' }}>{col.header || col.key}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            {component.config.columns?.map((col) => (
              <td key={col.key} style={{ border: '1px solid #ccc', padding: '4px' }}>{row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const FiltersComponent: React.FC<{
  API_BASE_URL: string;
  onFiltersChange: (filters: Record<string, unknown>) => void;
}> = ({ API_BASE_URL, onFiltersChange }) => {
  const [availableFilters, setAvailableFilters] = useState<Record<string, unknown>[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let canceled = false;
    fetchAvailableFilters(API_BASE_URL).then(filters => {
      if (!canceled) setAvailableFilters(filters);
    });
    return () => { canceled = true; };
  }, [API_BASE_URL]);

  const handleFilterChange = (key: string, value: unknown) => {
    const updated = { ...selectedFilters, [key]: value };
    setSelectedFilters(updated);
    onFiltersChange(updated);
  };

  if (!availableFilters.length) return <div>No filters available</div>;

  return <div>Filters Component</div>;
};

const PageRenderer: React.FC<{ components: PageComponent[]; API_BASE_URL: string }> = ({ components, API_BASE_URL }) => {
  const [globalFilters, setGlobalFilters] = useState<Record<string, unknown>>({});

  const componentsWithFilters = components.map(c => {
    if (c.type === 'chart') {
      return {
        ...c,
        config: {
          ...c.config,
          filters: { ...c.config.filters, ...globalFilters }
        }
      };
    }
    return c;
  });

  return (
    <div>
      <FiltersComponent API_BASE_URL={API_BASE_URL} onFiltersChange={setGlobalFilters} />
      {componentsWithFilters.map(c => {
        if (c.type === 'chart') return <ChartComponent key={c.id} component={c} API_BASE_URL={API_BASE_URL} />;
        if (c.type === 'table') return <TableComponent key={c.id} component={c} API_BASE_URL={API_BASE_URL} />;
        return <div key={c.id}>Unsupported component type</div>;
      })}
    </div>
  );
};

// Main CreatePagePopup component with integrated data binding for components
const CreatePagePopup: React.FC<CreatePagePopupProps> = ({
  open,
  onClose,
  onPageCreated,
  editingPage,
  API_BASE_URL
}) => {

   const [activeTab, setActiveTab] = useState<'basic' | 'layout' | 'table' | 'components' | 'panels' | 'analytics' | 'settings' | 'preview'>('basic');
    const [tabError, setTabError] = useState<string | null>(null);
    const [draggedComponent, setDraggedComponent] = useState<string | null>(null);
    const [showAddComponentForm, setShowAddComponentForm] = useState(false);
    const [newComponentType, setNewComponentType] = useState<'chart' | 'table' | 'header' | 'filter' | 'text' | 'image'>('chart');
    const [newComponentConfig, setNewComponentConfig] = useState<Record<string, unknown>>({});
    const [page, setPage] = useState<Partial<Page>>(
      editingPage || {
        name: '',
        url: '',
        description: '',
        layout: 'grid',
        theme: 'default',
        customCSS: '',
        tableStructure: [],
        components: [],
        panels: [],
        settings: {
          showHeader: true,
          showFooter: true,
          enableSearch: true,
          enableExport: false,
          pagination: true,
          itemsPerPage: 10
        },
        analytics: {
          grain: 'row',
          metrics: [],
          dimensions: [],
          additionalFilters: {}
        }
      }
    );
  
    useEffect(() => {
      if (editingPage) {
        setPage({
          ...editingPage,
          panels: typeof editingPage.panels === 'string' ? JSON.parse(editingPage.panels) : (editingPage.panels || []),
          analytics: typeof editingPage.analytics === 'string' ? JSON.parse(editingPage.analytics) : (editingPage.analytics || {}),
          tableStructure: typeof editingPage.tableStructure === 'string' ? JSON.parse(editingPage.tableStructure) : (editingPage.tableStructure || []),
          components: typeof editingPage.components === 'string' ? JSON.parse(editingPage.components) : (editingPage.components || []),
          settings: typeof editingPage.settings === 'string' ? JSON.parse(editingPage.settings) : (editingPage.settings || {})
        });
      } else {
        setPage({
          name: '',
          url: '',
          description: '',
          layout: 'grid',
          theme: 'default',
          customCSS: '',
          tableStructure: [],
          components: [],
          panels: [],
          settings: {
            showHeader: true,
            showFooter: true,
            enableSearch: true,
            enableExport: false,
            pagination: true,
            itemsPerPage: 10
          },
          analytics: {
            grain: 'row',
            metrics: [],
            dimensions: [],
            additionalFilters: {}
          }
        });
      }
      setActiveTab('basic');
      setTabError(null);
    }, [editingPage, open]);
  
    const validateBasic = (p: Partial<Page>) => {
      if (!p.name || p.name.trim() === '') return false;
      if (!p.url || p.url.trim() === '') return false;
      return true;
    };
  
    const handleTabClick = (tab: typeof activeTab) => {
      if (tab === 'basic') {
        setActiveTab('basic');
        setTabError(null);
        return;
      }
      if (!validateBasic(page)) {
        setTabError('You have not yet completed the required fields in the Basic Info section.');
        setActiveTab('basic');
        return;
      }
      setTabError(null);
      setActiveTab(tab);
    };
  
    const savePage = async (pageData: Partial<Page>, isEditing: boolean = false) => {
      try {
        const endpoint = isEditing ? 'update_page.php' : 'create_page.php';
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pageData)
        });
        const data = await response.json();
        if (data.success) {
          return true;
        } else {
          setTabError(data.error || 'Failed to save page');
          return false;
        }
      } catch (err) {
        setTabError('Network error: Unable to save page');
        console.error('Error saving page:', err);
        return false;
      }
    };
  
    const handleSave = async () => {
  if (!validateBasic(page)) {
    setTabError('Please complete the required fields in the Basic Info section before saving.');
    setActiveTab('basic');
    return;
  }
  setTabError(null);
  const success = await savePage(page, !!editingPage);
  if (success) {
    if (page.name && !editingPage) {
      const safeName = page.name.trim().replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = safeName ? safeName + '.tsx' : 'page.tsx';
      const content = generatePageTSXContent(page);

      // Create blob and trigger download to specified URL path location
      const blob = new Blob([content], { type: 'text/typescript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Use the URL Path field value for the download location
      const urlPath = page.url?.trim() || '';
      // Convert URL path to a valid filename (remove leading slash and replace slashes with underscores)
      const pathAsFilename = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;
      const finalFileName = pathAsFilename ? pathAsFilename.replace(/\//g, '_') + '.tsx' : fileName;
      
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
    onPageCreated();
    onClose();
  } else {
    setTabError('Failed to save page. Please try again.');
  }
};
  
    // DnD for components
    const handleComponentDragStart = (e: React.DragEvent, componentType: string) => {
      setDraggedComponent(componentType);
      e.dataTransfer.effectAllowed = 'copy';
    };
  
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };
  
    const handleComponentDrop = (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggedComponent) return;
  
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
  
      const newComponent: PageComponent = {
        id: Date.now().toString(),
        type: draggedComponent as 'header' | 'table' | 'chart' | 'filter' | 'text' | 'image',
        position: { x, y },
        size: { width: 800, height: 400 },
        config: {}
      };
  
      setPage((prev) => ({
        ...prev,
        components: [...(prev.components || []), newComponent]
      }));
      setDraggedComponent(null);
    };
  
    // Table columns
    const addTableColumn = () => {
      const newColumn: TableColumn = {
        id: Date.now().toString(),
        name: 'New Column',
        type: 'text',
        width: '100px',
        sortable: true,
        filterable: true,
        visible: true,
        position: (page.tableStructure?.length || 0) + 1
      };
      setPage({
        ...page,
        tableStructure: [...(page.tableStructure || []), newColumn]
      });
    };
  
    const removeTableColumn = (columnId: string) => {
      setPage({
        ...page,
        tableStructure: page.tableStructure?.filter(col => col.id !== columnId) || []
      });
    };
  
    const updateTableColumn = (columnId: string, updates: Partial<TableColumn>) => {
      setPage({
        ...page,
        tableStructure:
          page.tableStructure?.map(col => (col.id === columnId ? { ...col, ...updates } : col)) || []
      });
    };
  
    // Panels editor
    const addPanel = () => {
      const newPanel: PagePanel = {
        id: Date.now().toString(),
        title: 'New Panel',
        subtitle: '',
        icon: '📊',
        color: 'indigo',
        dataSourceType: 'static',
        staticValue: 0,
        prefix: '',
        suffix: '',
        decimals: 0,
        aggregation: 'sum',
        filters: {},
        window: {}
      };
      setPage(prev => ({ ...prev, panels: [...(prev.panels || []), newPanel] }));
    };
  
    const updatePanel = (id: string, updates: Partial<PagePanel>) => {
      setPage(prev => ({
        ...prev,
        panels: (prev.panels || []).map(p => (p.id === id ? { ...p, ...updates } : p))
      }));
    };
  
    const removePanel = (id: string) => {
      setPage(prev => ({ ...prev, panels: (prev.panels || []).filter(p => p.id !== id) }));
    };
  
    // Panel value fetcher for previews and testing
    const formatPanelValue = (panel: PagePanel, raw: unknown) => {
      const decimals = typeof panel.decimals === 'number' ? panel.decimals : 0;
      const n = typeof raw === 'number' ? raw : Number(raw);
      const numStr = Number.isFinite(n) ? n.toFixed(decimals) : String(raw);
      return `${panel.prefix || ''}${numStr}${panel.suffix || ''}`;
    };
  
    const fetchPanelValue = async (panel: PagePanel): Promise<unknown> => {
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
      if (data && data.success) return data.value;
      throw new Error(data?.error || 'Failed to fetch');
    };
  
    const PanelCardPreview: React.FC<{ panel: PagePanel }> = ({ panel }) => {
      const [value, setValue] = useState<string>('...');
      const [error, setError] = useState<string | null>(null);
  
      useEffect(() => {
        let canceled = false;
        (async () => {
          try {
            const raw = await fetchPanelValue(panel);
            if (canceled) return;
            setValue(formatPanelValue(panel, raw));
            setError(null);
          } catch (e: unknown) {
            if (canceled) return;
            setError(e?.message || 'Error');
          }
        })();
        return () => { canceled = true; };
      }, [JSON.stringify(panel)]);
  
      return (
        <div className="border border-gray-200 rounded p-3 bg-white shadow-sm">
          <div className="text-sm text-gray-600 flex items-center gap-2 mb-1">
            <span className="text-lg">{panel.icon || '📊'}</span>
            <span className="font-semibold text-gray-800">{panel.title || 'Untitled Panel'}</span>
          </div>
          {panel.subtitle ? <div className="text-xs text-gray-500 mb-2">{panel.subtitle}</div> : null}
          <div className="text-2xl font-bold text-gray-900">{error ? (`Error: ${error}`) : value}</div>
        </div>
      );
    };
  
    // Analytics tab UI
    const renderAnalyticsTab = () => {
      const analytics = page.analytics || {
        grain: 'row',
        metrics: [],
        dimensions: [],
        topN: undefined,
        bottomN: undefined,
        sortBy: undefined,
        sortDir: undefined,
        additionalFilters: {}
      };
  
      const updateAnalytics = (updates: Partial<PageAnalytics>) => {
        const merged = { ...analytics, ...updates };
        setPage({ ...page, analytics: merged });
      };
  
      return (
        <div className="tab-panel space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Aggregation Grain</label>
              <select
                value={analytics.grain}
                onChange={(e) => updateAnalytics({ grain: e.target.value as PageGrain })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="row">Row (no aggregation)</option>
                <option value="salesrep">Salesrep</option>
                <option value="account">Account</option>
                <option value="product">Product</option>
                <option value="region">Region</option>
              </select>
              <small className="text-gray-500">
                Defines the Page’s aggregation level. Dashboards cannot access lower-grain rows than this.
              </small>
            </div>
  
            <div>
              <label className="block font-semibold mb-1">Page Sort By</label>
              <input
                type="text"
                value={analytics.sortBy || ''}
                onChange={(e) => updateAnalytics({ sortBy: e.target.value || undefined })}
                placeholder="e.g., revenue"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <div className="mt-2">
                <select
                  value={analytics.sortDir || 'desc'}
                  onChange={(e) => updateAnalytics({ sortDir: e.target.value as 'asc' | 'desc' })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
              <small className="text-gray-500">Page sort is applied BEFORE any Dashboard local sort.</small>
            </div>
  
            <div>
              <label className="block font-semibold mb-1">Top N</label>
              <input
                type="number"
                min={1}
                value={analytics.topN || ''}
                onChange={(e) => updateAnalytics({ topN: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g., 20"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <small className="text-gray-500">Apply analytical Top-N at the Page level.</small>
            </div>
  
            <div>
              <label className="block font-semibold mb-1">Bottom N</label>
              <input
                type="number"
                min={1}
                value={analytics.bottomN || ''}
                onChange={(e) => updateAnalytics({ bottomN: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g., 10"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <small className="text-gray-500">Apply analytical Bottom-N at the Page level.</small>
            </div>
          </div>
  
          <div>
            <label className="block font-semibold mb-1">Additional Analytical Filters (JSON)</label>
            <textarea
              value={JSON.stringify(analytics.additionalFilters || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value || '{}');
                  updateAnalytics({ additionalFilters: parsed });
                  setTabError(null);
                } catch {
                  setTabError('Additional Analytical Filters must be valid JSON.');
                }
              }}
              rows={6}
              className="w-full border border-gray-300 rounded font-mono text-sm px-3 py-2"
              placeholder='{"metric":"revenue","min":1000}'
            />
            <small className="text-gray-500">
              Page-level analytical filters sent with Page query. Dashboard cannot broaden these.
            </small>
          </div>
        </div>
      );
    };
  
    if (!open) return null;
  
    return (
      <div className="page-form-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="page-form-modal bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-auto p-6 relative">
          <div className="page-form-header flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">{editingPage ? 'Edit Page' : 'Create New Page'}</h2>
            <button
              onClick={onClose}
              className="text-3xl font-bold leading-none hover:text-gray-700"
              aria-label="Close"
            >
              ×
            </button>
          </div>
  
          <div className="tab-nav flex flex-wrap gap-4 border-b border-gray-300 mb-4">
            <button className={`tab-btn pb-2 ${activeTab === 'basic' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`} onClick={() => handleTabClick('basic')}>Basic Info</button>
            <button className={`tab-btn pb-2 ${activeTab === 'layout' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`} onClick={() => handleTabClick('layout')}>Layout & Design</button>
            <button className={`tab-btn pb-2 ${activeTab === 'table' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`} onClick={() => handleTabClick('table')}>Table Structure</button>
            <button className={`tab-btn pb-2 ${activeTab === 'components' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`} onClick={() => handleTabClick('components')}>Components</button>
            <button className={`tab-btn pb-2 ${activeTab === 'panels' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`} onClick={() => handleTabClick('panels')}>Panels</button>
            <button className={`tab-btn pb-2 ${activeTab === 'analytics' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`} onClick={() => handleTabClick('analytics')}>Analytics</button>
            <button className={`tab-btn pb-2 ${activeTab === 'settings' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`} onClick={() => handleTabClick('settings')}>Settings</button>
            <button className={`tab-btn pb-2 ${activeTab === 'preview' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`} onClick={() => handleTabClick('preview')}>Page Preview</button>
          </div>
  
          {tabError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{tabError}</div>}
  
          <div className="tab-content">
            {activeTab === 'basic' && (
              <div className="tab-panel space-y-4">
                <div className="form-group">
                  <label className="block font-semibold mb-1">Page Name *</label>
                  <input
                    type="text"
                    value={page.name || ''}
                    onChange={(e) => setPage({ ...page, name: e.target.value })}
                    placeholder="Enter page name"
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
  
                <div className="form-group">
                  <label className="block font-semibold mb-1">URL Path *</label>
                  <input
                    type="text"
                    value={page.url || ''}
                    onChange={(e) => setPage({ ...page, url: e.target.value })}
                    placeholder="/page-url"
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
  
                <div className="form-group">
                  <label className="block font-semibold mb-1">Description</label>
                  <textarea
                    value={page.description || ''}
                    onChange={(e) => setPage({ ...page, description: e.target.value })}
                    placeholder="Page description"
                    rows={3}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
  
            {activeTab === 'layout' && (
              <div className="tab-panel space-y-4">
                <div className="form-group">
                  <label className="block font-semibold mb-1">Layout Type</label>
                  <select
                    value={page.layout || 'grid'}
                    onChange={(e) => setPage({ ...page, layout: e.target.value as any })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="grid">Grid Layout</option>
                    <option value="list">List Layout</option>
                    <option value="card">Card Layout</option>
                  </select>
                </div>
  
                <div className="form-group">
                  <label className="block font-semibold mb-1">Theme</label>
                  <select
                    value={page.theme || 'default'}
                    onChange={(e) => setPage({ ...page, theme: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="default">Default</option>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                  </select>
                </div>
  
                <div className="form-group">
                  <label className="block font-semibold mb-1">Custom CSS</label>
                  <textarea
                    value={page.customCSS || ''}
                    onChange={(e) => setPage({ ...page, customCSS: e.target.value })}
                    placeholder="/* Custom CSS styles */"
                    rows={6}
                    className="w-full border border-gray-300 rounded font-mono text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
  
            {activeTab === 'table' && (
              <div className="tab-panel space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-semibold">Table Columns</h4>
                  <button onClick={addTableColumn} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">+ Add Column</button>
                </div>
  
                <div className="space-y-4 max-h-64 overflow-auto">
                  {(page.tableStructure || []).map((column, index) => (
                    <div key={column.id} className="border border-gray-300 rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">#{index + 1}</span>
                        <button onClick={() => removeTableColumn(column.id)} className="text-red-600 hover:text-red-800 font-bold" title="Remove Column">×</button>
                      </div>
  
                      <input
                        type="text"
                        value={column.name}
                        onChange={(e) => updateTableColumn(column.id, { name: e.target.value })}
                        placeholder="Column name"
                        className="w-full border border-gray-300 rounded px-2 py-1 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
  
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <select
                            value={column.type}
                            onChange={(e) => updateTableColumn(column.id, { type: e.target.value as any })}
                            className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="boolean">Boolean</option>
                            <option value="image">Image</option>
                            <option value="link">Link</option>
                          </select>
                        </div>
  
                        <div>
                          <label className="block text-sm font-medium mb-1">Width</label>
                          <input
                            type="text"
                            value={column.width || ''}
                            onChange={(e) => updateTableColumn(column.id, { width: e.target.value })}
                            placeholder="100px"
                            className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
  
                        <div className="flex flex-col space-y-1 mt-6">
                          <label className="inline-flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={column.sortable || false}
                              onChange={(e) => updateTableColumn(column.id, { sortable: e.target.checked })}
                              className="form-checkbox"
                            />
                            <span className="text-sm">Sortable</span>
                          </label>
                          <label className="inline-flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={column.filterable || false}
                              onChange={(e) => updateTableColumn(column.id, { filterable: e.target.checked })}
                              className="form-checkbox"
                            />
                            <span className="text-sm">Filterable</span>
                          </label>
                          <label className="inline-flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={column.visible !== false}
                              onChange={(e) => updateTableColumn(column.id, { visible: e.target.checked })}
                              className="form-checkbox"
                            />
                            <span className="text-sm">Visible</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
  
            <button
              onClick={() => setShowAddComponentForm(true)}
              className="mb-4 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              + Add New Component
            </button>
  
            {showAddComponentForm && (
              <div className="border border-gray-300 rounded p-4 mb-4 bg-gray-50">
                <h5 className="font-semibold mb-2">Add New Component</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Component Type</label>
                    <select
                      value={newComponentType}
                      onChange={(e) => setNewComponentType(e.target.value as 'header' | 'table' | 'chart' | 'filter' | 'text' | 'image')}
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
                        <label className="block font-medium mb-1">Chart Type</label>
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
                        <label className="block font-medium mb-1">Data Source Type</label>
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
                          <label className="block font-medium mb-1">Table Name</label>
                          <input
                            type="text"
                            value={newComponentConfig.tableName || ''}
                            onChange={(e) => setNewComponentConfig({ ...newComponentConfig, tableName: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1"
                          />
  
                          <label className="block font-medium mb-1">Columns (comma separated keys)</label>
                          <input
                            type="text"
                            value={(newComponentConfig.columns || []).map((c: { key: string }) => c.key).join(', ')}
                            onChange={(e) => {
                              const keys = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              // Map keys to objects with key and header same as key initially
                              const cols = keys.map(k => ({ key: k, header: k }));
                              setNewComponentConfig({ ...newComponentConfig, columns: cols });
                            }}
                            className="w-full border border-gray-300 rounded px-2 py-1"
                          />
  
                          <label className="block font-medium mb-1">X Axis Key</label>
                          <input
                            type="text"
                            value={newComponentConfig.xKey || ''}
                            onChange={(e) => setNewComponentConfig({ ...newComponentConfig, xKey: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1"
                            placeholder="e.g., category"
                          />
  
                          <label className="block font-medium mb-1">Y Axis Key</label>
                          <input
                            type="text"
                            value={newComponentConfig.yKey || ''}
                            onChange={(e) => setNewComponentConfig({ ...newComponentConfig, yKey: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1"
                            placeholder="e.g., value"
                          />
  
                          <label className="block font-medium mb-1">Filters (JSON)</label>
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
  
                  {newComponentType === 'table' && (
                    <>
                      <div>
                        <label className="block font-medium mb-1">Data Source Type</label>
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
                          <label className="block font-medium mb-1">Table Name</label>
                          <input
                            type="text"
                            value={newComponentConfig.tableName || ''}
                            onChange={(e) => setNewComponentConfig({ ...newComponentConfig, tableName: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1"
                          />
  
                          <label className="block font-medium mb-1">Columns (comma separated keys)</label>
                          <input
                            type="text"
                            value={(newComponentConfig.columns || []).map((c: { key: string }) => c.key).join(', ')}
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
                              {newComponentConfig.columns.map((col: { key: string; header?: string }, idx: number) => (
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
                      onClick={() => {
                        if (!newComponentType) {
                          setTabError('Please select a component type.');
                          return;
                        }
                        const newComp: PageComponent = {
                          id: Date.now().toString(),
                          type: newComponentType,
                          position: { x: 10, y: 10 },
                          size: { width: 800, height: 400 },
                          config: newComponentConfig
                        };
                        setPage(prev => ({ ...prev, components: [...(prev.components || []), newComp] }));
                        setShowAddComponentForm(false);
                        setNewComponentConfig({});
                        setNewComponentType('chart');
                        setTabError(null);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Add Component
                    </button>
  
                    <button
                      onClick={() => {
                        setShowAddComponentForm(false);
                        setNewComponentConfig({});
                        setNewComponentType('chart');
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
  
            {activeTab === 'components' && (
              <div className="tab-panel space-y-4">
                <div className="flex space-x-6">
                  <div className="w-1/3 border border-gray-300 rounded p-3">
                    <h4 className="font-semibold mb-2">Available Components</h4>
                    <div className="space-y-2">
                      {['header', 'table', 'chart', 'filter', 'text', 'image'].map(type => (
                        <div
                          key={type}
                          className="cursor-move flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-100"
                          draggable
                          onDragStart={(e) => handleComponentDragStart(e, type)}
                        >
                          <span>📦</span>
                          <span>{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
  
                  <div className="w-2/3 border border-gray-300 rounded p-3">
                    <h4 className="font-semibold mb-2">Page Layout</h4>
                    <div
                      className="canvas-area relative h-64 border border-dashed border-gray-400 rounded bg-gray-50"
                      onDragOver={handleDragOver}
                      onDrop={handleComponentDrop}
                    >
                      {(page.components || []).map(component => (
                        <div
                          key={component.id}
                          className="canvas-component absolute border border-gray-400 rounded bg-white shadow p-1"
                          style={{
                            left: component.position.x,
                            top: component.position.y,
                            width: component.size.width,
                            height: component.size.height
                          }}
                        >
                          <div className="flex justify-between items-center text-xs font-semibold mb-1">
                            <span>{component.type}</span>
                            <button
                              onClick={() =>
                                setPage({
                                  ...page,
                                  components: page.components?.filter(c => c.id !== component.id) || []
                                })
                              }
                              className="text-red-600 hover:text-red-800 font-bold"
                              title="Remove Component"
                            >
                              ×
                            </button>
                          </div>
  
                          {/* Component config editor */}
                          {(component.type === 'chart' || component.type === 'table') && (
                            <div className="space-y-2">
                              {component.type === 'chart' && (
                                <>
                                  <label className="block text-sm font-medium">Chart Type</label>
                                  <select
                                    value={component.config.chartType || 'pie'}
                                    onChange={(e) => {
                                      const updated = { ...component.config, chartType: e.target.value };
                                      setPage(prev => ({
                                        ...prev,
                                        components: prev.components?.map(c => c.id === component.id ? { ...c, config: updated } : c) || []
                                      }));
                                    }}
                                    className="w-full border border-gray-300 rounded px-2 py-1"
                                  >
                                    <option value="pie">Pie</option>
                                    <option value="bar">Bar</option>
                                    <option value="line">Line</option>
                                    <option value="area">Area</option>
                                  </select>
  
                                  <label className="block text-sm font-medium mt-2">X Axis Key</label>
                                  <input
                                    type="text"
                                    value={component.config.xKey || ''}
                                    onChange={(e) => {
                                      const updated = { ...component.config, xKey: e.target.value };
                                      setPage(prev => ({
                                        ...prev,
                                        components: prev.components?.map(c => c.id === component.id ? { ...c, config: updated } : c) || []
                                      }));
                                    }}
                                    className="w-full border border-gray-300 rounded px-2 py-1"
                                    placeholder="e.g., category"
                                  />
  
                                  <label className="block text-sm font-medium mt-2">Y Axis Key</label>
                                  <input
                                    type="text"
                                    value={component.config.yKey || ''}
                                    onChange={(e) => {
                                      const updated = { ...component.config, yKey: e.target.value };
                                      setPage(prev => ({
                                        ...prev,
                                        components: prev.components?.map(c => c.id === component.id ? { ...c, config: updated } : c) || []
                                      }));
                                    }}
                                    className="w-full border border-gray-300 rounded px-2 py-1"
                                    placeholder="e.g., value"
                                  />
                                </>
                              )}
  
                              <label className="block text-sm font-medium">Data Source Type</label>
                              <select
                                value={component.config.dataSourceType || 'api'}
                                onChange={(e) => {
                                  const updated = { ...component.config, dataSourceType: e.target.value };
                                  setPage(prev => ({
                                    ...prev,
                                    components: prev.components?.map(c => c.id === component.id ? { ...c, config: updated } : c) || []
                                  }));
                                }}
                                className="w-full border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="api">From Table (API)</option>
                                <option value="static">Static</option>
                              </select>
  
                              {component.config.dataSourceType === 'static' ? (
                                <textarea
                                  rows={4}
                                  value={JSON.stringify(component.config.staticData || [], null, 2)}
                                  onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      const updated = { ...component.config, staticData: parsed };
                                      setPage(prev => ({
                                        ...prev,
                                        components: prev.components?.map(c => c.id === component.id ? { ...c, config: updated } : c) || []
                                      }));
                                      setTabError(null);
                                    } catch {
                                      setTabError('Static data must be valid JSON array.');
                                    }
                                  }}
                                  className="w-full border border-gray-300 rounded font-mono text-sm px-2 py-1"
                                />
                              ) : (
                                <>
                                  <label className="block text-sm font-medium">Table Name</label>
                                  <input
                                    type="text"
                                    value={component.config.tableName || ''}
                                    onChange={(e) => {
                                      const updated = { ...component.config, tableName: e.target.value };
                                      setPage(prev => ({
                                        ...prev,
                                        components: prev.components?.map(c => c.id === component.id ? { ...c, config: updated } : c) || []
                                      }));
                                    }}
                                    className="w-full border border-gray-300 rounded px-2 py-1"
                                  />
  
                                  <label className="block text-sm font-medium">Columns (comma separated keys)</label>
                                  <input
                                    type="text"
                                    value={(component.config.columns || []).map((c: { key: string }) => c.key).join(', ')}
                                    onChange={(e) => {
                                      const keys = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                      const cols = keys.map(k => ({ key: k, header: k }));
                                      const updated = { ...component.config, columns: cols };
                                      setPage(prev => ({
                                        ...prev,
                                        components: prev.components?.map(c => c.id === component.id ? { ...c, config: updated } : c) || []
                                      }));
                                    }}
                                    className="w-full border border-gray-300 rounded px-2 py-1"
                                  />
  
                                  {/* For table/chart columns, allow editing headers */}
                                  {(component.config.columns && component.config.columns.length > 0) && (
                                    <div className="mt-2 space-y-2">
                                      <label className="block font-medium mb-1">Column Headers</label>
                                      {component.config.columns.map((col: { key: string; header?: string }, idx: number) => (
                                        <input
                                          key={col.key}
                                          type="text"
                                          value={col.header || col.key}
                                          onChange={(e) => {
                                            const updatedCols = [...component.config.columns];
                                            updatedCols[idx] = { ...updatedCols[idx], header: e.target.value };
                                            const updated = { ...component.config, columns: updatedCols };
                                            setPage(prev => ({
                                              ...prev,
                                              components: prev.components?.map(c => c.id === component.id ? { ...c, config: updated } : c) || []
                                            }));
                                          }}
                                          className="w-full border border-gray-300 rounded px-2 py-1"
                                          placeholder={`Header for ${col.key}`}
                                        />
                                      ))}
                                    </div>
                                  )}
  
                                  <label className="block text-sm font-medium mt-2">Filters (JSON)</label>
                                  <input
                                    type="text"
                                    value={JSON.stringify(component.config.filters || {})}
                                    onChange={(e) => {
                                      try {
                                        const parsed = JSON.parse(e.target.value || '{}');
                                        const updated = { ...component.config, filters: parsed };
                                        setPage(prev => ({
                                          ...prev,
                                          components: prev.components?.map(c => c.id === component.id ? { ...c, config: updated } : c) || []
                                        }));
                                        setTabError(null);
                                      } catch {
                                        setTabError('Filters must be valid JSON.');
                                      }
                                    }}
                                    className="w-full border border-gray-300 rounded font-mono text-sm px-2 py-1"
                                  />
                                </>
                              )}
                            </div>
                          )}
  
                          {/* TODO: Add config UI for other component types if needed */}
                        </div>
                      ))}
                      {(page.components || []).length === 0 && (
                        <div className="text-center text-gray-400 mt-20">Drag components here to build your page layout</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
  
            {activeTab === 'panels' && (
              <div className="tab-panel space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-semibold">Panels (KPI cards)</h4>
                  <button onClick={addPanel} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">+ Add Panel</button>
                </div>
  
                {(page.panels || []).length === 0 && (
                  <div className="text-gray-500">No panels yet. Click &quot;+ Add Panel&quot;.</div>
                )}
  
                <div className="grid grid-cols-1 gap-4">
                  {(page.panels || []).map((panel) => (
                    <div key={panel.id} className="border border-gray-300 rounded p-3">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{panel.icon || '📊'}</span>
                          <input
                            type="text"
                            className="border rounded px-2 py-1 w-64"
                            value={panel.title}
                            onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
                            placeholder="Panel title (e.g., Total Sales Amount)"
                          />
                        </div>
                        <button className="text-red-600 font-bold text-xl" title="Remove panel" onClick={() => removePanel(panel.id)}>×</button>
                      </div>
  
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Subtitle</label>
                          <input
                            type="text"
                            className="border rounded px-2 py-1 w-full"
                            value={panel.subtitle || ''}
                            onChange={(e) => updatePanel(panel.id, { subtitle: e.target.value })}
                            placeholder="e.g., Sum of salesAmount"
                          />
                        </div>
  
                        <div>
                          <label className="block text-sm font-medium mb-1">Icon</label>
                          <input
                            type="text"
                            className="border rounded px-2 py-1 w-full"
                            value={panel.icon || ''}
                            onChange={(e) => updatePanel(panel.id, { icon: e.target.value })}
                            placeholder="Emoji or CSS class"
                          />
                        </div>
  
                        <div>
                          <label className="block text-sm font-medium mb-1">Color</label>
                          <input
                            type="text"
                            className="border rounded px-2 py-1 w-full"
                            value={panel.color || ''}
                            onChange={(e) => updatePanel(panel.id, { color: e.target.value })}
                            placeholder="e.g., indigo, emerald"
                          />
                        </div>
  
                        <div>
                          <label className="block text-sm font-medium mb-1">Data Source</label>
                          <select
                            className="border rounded px-2 py-1 w-full"
                            value={panel.dataSourceType}
                            onChange={(e) => updatePanel(panel.id, { dataSourceType: e.target.value as 'api' | 'static' })}
                          >
                            <option value="api">From Table (API)</option>
                            <option value="static">Static</option>
                          </select>
                        </div>
                      </div>
  
                      {panel.dataSourceType === 'static' ? (
                        <div className="grid grid-cols-4 gap-4 mt-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Static Value</label>
                            <input
                              type="text"
                              className="border rounded px-2 py-1 w-full"
                              value={panel.staticValue ?? ''}
                              onChange={(e) => updatePanel(panel.id, { staticValue: e.target.value })}
                              placeholder="e.g., 1044300"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Prefix</label>
                            <input
                              type="text"
                              className="border rounded px-2 py-1 w-full"
                              value={panel.prefix || ''}
                              onChange={(e) => updatePanel(panel.id, { prefix: e.target.value })}
                              placeholder="$"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Suffix</label>
                            <input
                              type="text"
                              className="border rounded px-2 py-1 w-full"
                              value={panel.suffix || ''}
                              onChange={(e) => updatePanel(panel.id, { suffix: e.target.value })}
                              placeholder=".00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Decimals</label>
                            <input
                              type="number"
                              className="border rounded px-2 py-1 w-full"
                              value={panel.decimals ?? 0}
                              min={0}
                              max={6}
                              onChange={(e) => updatePanel(panel.id, { decimals: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-4 mt-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Table Name</label>
                            <input
                              type="text"
                              className="border rounded px-2 py-1 w-full"
                              value={panel.tableName || ''}
                              onChange={(e) => updatePanel(panel.id, { tableName: e.target.value })}
                              placeholder="e.g., sales"
                            />
                          </div>
  
                          <div>
                            <label className="block text-sm font-medium mb-1">Aggregation</label>
                            <select
                              className="border rounded px-2 py-1 w-full"
                              value={panel.aggregation || 'sum'}
                              onChange={(e) => updatePanel(panel.id, { aggregation: e.target.value as PanelAggregation })}
                            >
                              <option value="sum">Sum</option>
                              <option value="avg">Average</option>
                              <option value="count">Count</option>
                              <option value="distinct_count">Distinct Count</option>
                            </select>
                          </div>
  
                          {/* Live visual preview for this panel */}
                          <div className="mt-4 col-span-4">
                            <PanelCardPreview panel={panel} />
                          </div>
  
                          <div>
                            <label className="block text-sm font-medium mb-1">{panel.aggregation === 'distinct_count' ? 'Distinct On (column)' : 'Column Name'}</label>
                            <input
                              type="text"
                              className="border rounded px-2 py-1 w-full"
                              value={panel.aggregation === 'distinct_count' ? (panel.distinctOn || '') : (panel.columnName || '')}
                              onChange={(e) => {
                                if (panel.aggregation === 'distinct_count') {
                                  updatePanel(panel.id, { distinctOn: e.target.value });
                                } else {
                                  updatePanel(panel.id, { columnName: e.target.value });
                                }
                              }}
                              placeholder={panel.aggregation === 'distinct_count' ? 'e.g., salesperson' : 'e.g., salesAmount'}
                            />
                          </div>
  
                          <div>
                            <label className="block text-sm font-medium mb-1">Filters (JSON)</label>
                            <input
                              type="text"
                              className="border rounded px-2 py-1 w-full font-mono"
                              value={JSON.stringify(panel.filters || {})}
                              onChange={(e) => {
                                try {
                                  const parsed = JSON.parse(e.target.value || '{}');
                                  updatePanel(panel.id, { filters: parsed });
                                  setTabError(null);
                                } catch {
                                  setTabError('Panel filters must be valid JSON.');
                                }
                              }}
                              placeholder='{"region":"West"}'
                            />
                          </div>
  
                          <div>
                            <label className="block text-sm font-medium mb-1">Window: Partition By (comma sep)</label>
                            <input
                              type="text"
                              className="border rounded px-2 py-1 w-full"
                              value={(panel.window?.partitionBy || []).join(',')}
                              onChange={(e) => updatePanel(panel.id, { window: { ...(panel.window || {}), partitionBy: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                              placeholder="e.g., region"
                            />
                          </div>
  
                          <div>
                            <label className="block text-sm font-medium mb-1">Window: Order By</label>
                            <input
                              type="text"
                              className="border rounded px-2 py-1 w-full"
                              value={panel.window?.orderBy || ''}
                              onChange={(e) => updatePanel(panel.id, { window: { ...(panel.window || {}), orderBy: e.target.value } })}
                              placeholder="e.g., date"
                            />
                          </div>
  
                          <div>
                            <label className="block text-sm font-medium mb-1">Prefix</label>
                            <input
                              type="text"
                              className="border rounded px-2 py-1 w-full"
                              value={panel.prefix || ''}
                              onChange={(e) => updatePanel(panel.id, { prefix: e.target.value })}
                              placeholder="$"
                            />
                          </div>
  
                          <div>
                            <label className="block text sm font-medium mb-1">Suffix</label>
                            <input
                              type="text"
                              className="border rounded px-2 py-1 w-full"
                              value={panel.suffix || ''}
                              onChange={(e) => updatePanel(panel.id, { suffix: e.target.value })}
                              placeholder=".00"
                            />
                          </div>
  
                          <div>
                            <label className="block text-sm font-medium mb-1">Decimals</label>
                            <input
                              type="number"
                              className="border rounded px-2 py-1 w-full"
                              value={panel.decimals ?? 0}
                              min={0}
                              max={6}
                              onChange={(e) => updatePanel(panel.id, { decimals: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
  
            {activeTab === 'analytics' && renderAnalyticsTab()}
  
            {activeTab === 'settings' && (
              <div className="tab-panel space-y-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={page.settings?.showHeader !== false}
                      onChange={(e) => setPage({ ...page, settings: { ...(page.settings || {}), showHeader: e.target.checked } })}
                      className="form-checkbox"
                    />
                    <span>Show Header</span>
                  </label>
                </div>
  
                <div>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={page.settings?.showFooter !== false}
                      onChange={(e) => setPage({ ...page, settings: { ...(page.settings || {}), showFooter: e.target.checked } })}
                      className="form-checkbox"
                    />
                    <span>Show Footer</span>
                  </label>
                </div>
  
                <div>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={page.settings?.enableSearch !== false}
                      onChange={(e) => setPage({ ...page, settings: { ...(page.settings || {}), enableSearch: e.target.checked } })}
                      className="form-checkbox"
                    />
                    <span>Enable Search</span>
                  </label>
                </div>
  
                <div>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={page.settings?.enableExport || false}
                      onChange={(e) => setPage({ ...page, settings: { ...(page.settings || {}), enableExport: e.target.checked } })}
                      className="form-checkbox"
                    />
                    <span>Enable Export</span>
                  </label>
                </div>
  
                <div>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={page.settings?.pagination !== false}
                      onChange={(e) => setPage({ ...page, settings: { ...(page.settings || {}), pagination: e.target.checked } })}
                      className="form-checkbox"
                    />
                    <span>Enable Pagination</span>
                  </label>
                </div>
  
                <div>
                  <label className="block font-semibold mb-1">Items Per Page</label>
                  <input
                    type="number"
                    value={page.settings?.itemsPerPage || 10}
                    onChange={(e) => setPage({ ...page, settings: { ...(page.settings || {}), itemsPerPage: parseInt(e.target.value) } })}
                    min={1}
                    max={100}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
  
            {activeTab === 'preview' && (
              <div className="tab-panel space-y-4">
                <h4 className="text-lg font-semibold">Page Preview</h4>
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {(page.panels || []).length === 0 ? (
                    <div className="text-gray-500">No panels configured yet.</div>
                  ) : (
                    (page.panels || []).map(p => (
                      <PanelCardPreview key={p.id} panel={p} />
                    ))
                  )}
                </div>
  
                <div className="components-preview mt-8">
                  <h5 className="font-semibold mb-2">Components Preview</h5>
                  <PageRenderer components={page.components || []} API_BASE_URL={API_BASE_URL} />
                </div>
              </div>
            )}
          </div>
  
          <div className="page-form-footer flex justify-end space-x-4 mt-6">
            <button
              onClick={handleSave}
              className="btn-save-page bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
            >
              {editingPage ? 'Update Page' : 'Create Page'}
            </button>
            <button
              onClick={onClose}
              className="btn-cancel-page bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  // ... rest of your existing CreatePagePopup component code remains unchanged
  // (I'm omitting it for brevity since you only asked for the context menu integration)
};

export default CreatePagePopup;