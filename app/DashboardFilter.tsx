import React, { useState, useRef } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';

const defaultPanelData = {
  id: 'default-panel',
  title: 'Default Panel',
  content: 'This is some dummy data for the default panel.',
  height: 150,
  width: 300,
  position: { x: 20, y: 20 },
  color: '#eee',
  size: '16px',
  text: 'Sample Text',
  detail: 'Some details',
  tooltip: 'Panel tooltip',
  boundVisuals: [],
};

const availableVisuals = [
  { id: 'pie1', name: 'Pie Chart', type: 'pie' },
  { id: 'bar1', name: 'Bar Chart', type: 'bar' },
  { id: 'line1', name: 'Line Chart', type: 'line' },
  { id: 'table1', name: 'Table View', type: 'table' },
];

interface Visual {
  id: string;
  name: string;
  type: string;
}

interface Panel {
  id: string;
  title: string;
  content: string;
  height: number;
  width: number;
  position: { x: number; y: number };
  color: string;
  size: string;
  text: string;
  detail: string;
  tooltip: string;
  boundVisuals: Visual[];
  linkedGroupId?: string; // For linking panels
}

interface Dashboard {
  id: string;
  title: string;
  panels: Panel[];
  config: {
    layoutColumns: number; // 1, 2, or 3 columns per row
  };
}

const ItemTypes = {
  VISUAL: 'visual',
  PANEL: 'panel',
};

const barData = [
  { name: 'Jan', uv: 4000 },
  { name: 'Feb', uv: 3000 },
  { name: 'Mar', uv: 2000 },
  { name: 'Apr', uv: 2780 },
  { name: 'May', uv: 1890 },
];

const pieData = [
  { name: 'Group A', value: 400 },
  { name: 'Group B', value: 300 },
  { name: 'Group C', value: 300 },
  { name: 'Group D', value: 200 },
];

const lineData = [
  { name: 'Page A', uv: 400, pv: 2400, amt: 2400 },
  { name: 'Page B', uv: 300, pv: 1398, amt: 2210 },
  { name: 'Page C', uv: 200, pv: 9800, amt: 2290 },
  { name: 'Page D', uv: 278, pv: 3908, amt: 2000 },
  { name: 'Page E', uv: 189, pv: 4800, amt: 2181 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Sample data for filtering
const sampleData = [
  { id: 1, category: "Electronics", region: "North", sales: 1000, quantity: 5, date: "2024-01-01" },
  { id: 2, category: "Clothing", region: "South", sales: 1500, quantity: 10, date: "2024-01-02" },
  { id: 3, category: "Electronics", region: "East", sales: 2000, quantity: 7, date: "2024-01-03" },
  { id: 4, category: "Furniture", region: "West", sales: 500, quantity: 2, date: "2024-01-04" },
  { id: 5, category: "Clothing", region: "North", sales: 700, quantity: 3, date: "2024-01-05" }
];

const DashboardFilter: React.FC = () => {
  // Dashboards state with panels and config
  const [dashboards, setDashboards] = useState<Dashboard[]>([
    {
      id: 'dashboard1',
      title: 'Dashboard1',
      panels: [{ ...defaultPanelData, id: 'panel1' }],
      config: { layoutColumns: 3 },
    },
  ]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>('dashboard1');
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedVisual, setSelectedVisual] = useState<Visual | null>(null);
  const [visuals, setVisuals] = useState<Visual[]>(availableVisuals);
  const [rowFields, setRowFields] = useState<string[]>([]);
  const [columnFields, setColumnFields] = useState<string[]>([]);
  const [panelConfig, setPanelConfig] = useState<Panel>({ ...defaultPanelData });
  const [showPanelMenu, setShowPanelMenu] = useState<boolean>(false);
  const [showLinkingPanelMenu, setShowLinkingPanelMenu] = useState<boolean>(false);
  const [showVisualizer, setShowVisualizer] = useState<boolean>(false);

  // Filter states
  const [extractIds, setExtractIds] = useState<number[]>([]);
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string]>(['2024-01-01', '2024-12-31']);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [salesRange, setSalesRange] = useState<[number, number]>([0, 10000]);
  const [salesPerQuantityRange, setSalesPerQuantityRange] = useState<[number, number]>([0, 1000]);

  const selectedDashboard = dashboards.find((d) => d.id === selectedDashboardId);

  // Add new dashboard
  const addNewDashboard = () => {
    const newDashboardId = `dashboard${dashboards.length + 1}`;
    const newDashboard: Dashboard = {
      id: newDashboardId,
      title: `Dashboard${dashboards.length + 1}`,
      panels: [{ ...defaultPanelData, id: `panel-${newDashboardId}` }],
      config: { layoutColumns: 3 },
    };
    setDashboards([...dashboards, newDashboard]);
    setSelectedDashboardId(newDashboardId);
    setSelectedPanelId(null);
  };

  // Add new panel to selected dashboard
  const addNewPanel = () => {
    if (!selectedDashboard) return;
    const newPanelId = `panel${Date.now()}`;
    const newPanel: Panel = {
      id: newPanelId,
      title: `Panel ${Date.now()}`,
      content: 'New Panel Content',
      height: 150,
      width: 300,
      position: { x: 50, y: 50 },
      color: '#f9f9f9',
      size: '16px',
      text: 'New Panel',
      detail: 'Panel details',
      tooltip: 'New panel tooltip',
      boundVisuals: [],
    };
    setDashboards((prev) =>
      prev.map((d) =>
        d.id === selectedDashboardId ? { ...d, panels: [...d.panels, newPanel] } : d
      )
    );
    setSelectedPanelId(newPanelId);
    setPanelConfig(newPanel);
  };

  // Select panel and load config
  const selectPanel = (panelId: string) => {
    if (!selectedDashboard) return;
    const panel = selectedDashboard.panels.find((p) => p.id === panelId);
    if (panel) {
      setSelectedPanelId(panelId);
      setPanelConfig(panel);
    }
  };

  // Update panel config and sync to dashboard state
  const updatePanelConfig = (field: string, value: any) => {
    if (!selectedDashboard) return;
    const updatedConfig = field === 'position'
      ? { ...panelConfig, position: value }
      : { ...panelConfig, [field]: value };
    setPanelConfig(updatedConfig);

    setDashboards((prev) =>
      prev.map((d) => {
        if (d.id === selectedDashboardId) {
          return {
            ...d,
            panels: d.panels.map((p) => (p.id === updatedConfig.id ? updatedConfig : p)),
          };
        }
        return d;
      })
    );
  };

  // Update dashboard config (e.g. layoutColumns)
  const updateDashboardConfig = (field: string, value: any) => {
    setDashboards((prev) =>
      prev.map((d) =>
        d.id === selectedDashboardId ? { ...d, config: { ...d.config, [field]: value } } : d
      )
    );
  };

  // Visual drag and drop handlers (simplified)
  const VisualItem = ({ visual }: { visual: Visual }) => {
    const [{ isDragging }, drag] = useDrag({
      type: ItemTypes.VISUAL,
      item: { id: visual.id, name: visual.name, type: visual.type },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    });
    return (
      <div
        ref={drag}
        style={{
          opacity: isDragging ? 0.5 : 1,
          fontWeight: 'bold',
          cursor: 'move',
          padding: 5,
          border: '1px solid #ccc',
          margin: 2,
          backgroundColor: '#fff',
          borderRadius: 4,
          userSelect: 'none',
        }}
      >
        {visual.name}
      </div>
    );
  };

  const DropZone = ({
    type,
    onDrop,
    children,
  }: {
    type: string;
    onDrop: (item: any) => void;
    children: React.ReactNode;
  }) => {
    const [{ isOver }, drop] = useDrop({
      accept: type,
      drop: (item: any) => onDrop(item.name || item.id),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    });
    return (
      <div
        ref={drop}
        style={{
          padding: 10,
          border: '1px dashed #aaa',
          backgroundColor: isOver ? 'lightgreen' : '#eee',
          textAlign: 'center',
          minHeight: 40,
          marginBottom: 10,
          borderRadius: 4,
          userSelect: 'none',
        }}
      >
        {children}
      </div>
    );
  };

  // Bind visual to selected panel
  const handleVisualDropToPanel = (visualName: string) => {
    if (!selectedPanelId || !selectedDashboard) {
      alert('Please select a panel first to bind visuals.');
      return;
    }
    const visual = visuals.find((v) => v.name === visualName);
    if (!visual) return;

    setDashboards((prev) =>
      prev.map((d) => {
        if (d.id === selectedDashboardId) {
          return {
            ...d,
            panels: d.panels.map((panel) => {
              if (panel.id === selectedPanelId) {
                const existing = panel.boundVisuals || [];
                if (!existing.find((v) => v.id === visual.id)) {
                  return { ...panel, boundVisuals: [...existing, visual] };
                }
              }
              return panel;
            }),
          };
        }
        return d;
      })
    );
    setSelectedVisual(visual);
  };

  const handleRowDrop = (field: string) => {
    if (!rowFields.includes(field)) setRowFields([...rowFields, field]);
    handleVisualDropToPanel(field);
  };

  const handleColumnDrop = (field: string) => {
    if (!columnFields.includes(field)) setColumnFields([...columnFields, field]);
    handleVisualDropToPanel(field);
  };

  // Panel rendering with flexible layout and linking support
  const PanelCard = ({ panel }: { panel: Panel }) => {
    return (
      <div
        key={panel.id}
        style={{
          border: '1px solid #ccc',
          borderRadius: 4,
          padding: 10,
          backgroundColor: panel.color,
          boxSizing: 'border-box',
          userSelect: 'none',
          cursor: 'pointer',
        }}
        onClick={() => selectPanel(panel.id)}
        title={panel.tooltip}
      >
        <strong style={{ fontSize: panel.size }}>{panel.title}</strong>
        <p>{panel.text}</p>
        <small>{panel.detail}</small>
        <div style={{ marginTop: 10 }}>
          {(panel.boundVisuals || []).map((visual) => (
            <VisualRenderer key={visual.id} visual={visual} />
          ))}
        </div>
      </div>
    );
  };

  // Visual rendering
  const VisualRenderer = ({ visual }: { visual: Visual }) => {
    switch (visual.type) {
      case 'pie':
        return (
          <PieChart width={250} height={150}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={50}
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
      case 'bar':
        return (
          <BarChart width={300} height={150} data={barData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="uv" fill="#8884d8" />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart width={300} height={150} data={lineData}>
            <XAxis dataKey="name" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="uv" stroke="#8884d8" />
            <Line type="monotone" dataKey="pv" stroke="#82ca9d" />
          </LineChart>
        );
      case 'table':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>ID</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Category</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Region</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Date</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Sales</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Quantity</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Sales per Quantity</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center' }}>
                    No data found
                  </td>
                </tr>
              )}
              {filteredData.map((row) => (
                <tr key={row.id}>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{row.id}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{row.category}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{row.region}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{row.date}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{row.sales}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{row.quantity}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>
                    {(row.sales / row.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  // Visualizer popup handlers
  const handleVisualizerClick = () => setShowVisualizer(true);
  const closeVisualizer = () => setShowVisualizer(false);

  // Filter the sample data based on filters
  const filteredData = React.useMemo(() => {
    return sampleData
      .filter(d => extractIds.length ? extractIds.includes(d.id) : true)
      .filter(d => regionFilter ? d.region === regionFilter : true)
      .filter(d => {
        const date = new Date(d.date);
        const start = new Date(dateRange[0]);
        const end = new Date(dateRange[1]);
        return date >= start && date <= end;
      })
      .filter(d => categoryFilter ? d.category === categoryFilter : true)
      .filter(d => d.sales >= salesRange[0] && d.sales <= salesRange[1])
      .filter(d => {
        const ratio = d.sales / d.quantity;
        return ratio >= salesPerQuantityRange[0] && ratio <= salesPerQuantityRange[1];
      });
  }, [extractIds, regionFilter, dateRange, categoryFilter, salesRange, salesPerQuantityRange]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 20px',
            backgroundColor: '#282c34',
            color: 'white',
            fontWeight: 'bold',
            position: 'relative',
            zIndex: 100,
          }}
        >
          {/* Left menu items */}
          <nav style={{ display: 'flex', gap: '20px', position: 'relative' }}>
            <div style={{ cursor: 'pointer' }}>Home</div>
            <div style={{ cursor: 'pointer' }}>About Us</div>
            <div style={{ cursor: 'pointer' }}>Contact</div>

            {/* Panel Menu Toggle */}
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <div onClick={() => setShowPanelMenu(!showPanelMenu)}>Panel {showPanelMenu ? '▲' : '▼'}</div>
              {showPanelMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: '#444',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    zIndex: 1000,
                    minWidth: '150px',
                  }}
                >
                  <div
                    onClick={addNewPanel}
                    style={{ cursor: 'pointer', padding: '5px', color: '#61dafb' }}
                    title="Create New Panel"
                  >
                    + New Panel
                  </div>
                  {selectedDashboard?.panels.map((panel) => (
                    <div
                      key={panel.id}
                      onClick={() => selectPanel(panel.id)}
                      style={{
                        cursor: 'pointer',
                        padding: '5px',
                        backgroundColor: panel.id === selectedPanelId ? '#61dafb' : 'transparent',
                        color: panel.id === selectedPanelId ? '#282c34' : 'white',
                        borderRadius: '4px',
                      }}
                      title={`Edit ${panel.title}`}
                    >
                      {panel.title}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linking Panel Menu Toggle */}
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <div onClick={() => setShowLinkingPanelMenu(!showLinkingPanelMenu)}>
                Linking Panel {showLinkingPanelMenu ? '▲' : '▼'}
              </div>
              {showLinkingPanelMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: '#444',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    zIndex: 1000,
                    minWidth: '150px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {selectedDashboard?.panels.map((panel) => (
                    <div
                      key={panel.id}
                      style={{
                        cursor: 'move',
                        padding: '5px',
                        backgroundColor: '#666',
                        color: 'white',
                        borderRadius: '4px',
                        userSelect: 'none',
                      }}
                      title={`Drag to link: ${panel.title}`}
                    >
                      {panel.title}
                    </div>
                  ))}
                  <small style={{ color: '#ccc', marginTop: '10px' }}>
                    (Drag & drop and resize functionality to be implemented)
                  </small>
                </div>
              )}
            </div>
          </nav>

          {/* Center Visualizer button */}
          <button
            onClick={handleVisualizerClick}
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#61dafb',
              color: '#282c34',
              zIndex: 101,
            }}
            title="Save and Visualize Dashboard"
          >
            Visualizer
          </button>

          {/* Right empty space for symmetry */}
          <div style={{ width: '120px' }}></div>
        </header>

        {/* Main Content Area */}
        <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          {/* First Slider - Object List View (Visuals) */}
          <div
            style={{
              width: '200px',
              backgroundColor: '#f0f0f0',
              padding: '10px',
              borderRight: '1px solid #ccc',
              overflowY: 'auto',
            }}
          >
            <h4>Available Visuals</h4>
            {visuals.map((visual) => (
              <VisualItem key={visual.id} visual={visual} />
            ))}
          </div>

          {/* Dashboard panels area */}
          <main
            style={{
              flexGrow: 1,
              padding: '20px',
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              margin: '0',
              borderRadius: '0',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            {selectedDashboard ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${selectedDashboard.config.layoutColumns}, 1fr)`,
                  gap: '16px',
                }}
              >
                {selectedDashboard.panels.map((panel) => (
                  <PanelCard key={panel.id} panel={panel} />
                ))}
              </div>
            ) : (
              <p>Please select a dashboard.</p>
            )}
          </main>

          {/* Right Slider - Filters + Dashboard Configuration */}
          <div
            style={{
              width: '300px',
              backgroundColor: '#f9f9f9',
              padding: '10px',
              borderLeft: '1px solid #ccc',
              overflowY: 'auto',
            }}
          >
            {/* Filters Panel */}
            <div
              style={{
                marginBottom: '20px',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                backgroundColor: '#fff',
              }}
            >
              <h4>Filters</h4>

              {/* Extract Filter */}
              <div style={{ marginBottom: 8 }}>
                <label>Extract Filter (IDs comma separated): </label>
                <input
                  type="text"
                  onChange={(e) => {
                    const ids = e.target.value
                      .split(',')
                      .map((s) => parseInt(s.trim()))
                      .filter((n) => !isNaN(n));
                    setExtractIds(ids);
                  }}
                  placeholder="e.g. 1,3,5"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Data Source Filter */}
              <div style={{ marginBottom: 8 }}>
                <label>Data Source Filter (Region): </label>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">All</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                </select>
              </div>

              {/* Context Filter */}
              <div style={{ marginBottom: 8 }}>
                <label>Context Filter (Date Range): </label>
                <br />
                <input
                  type="date"
                  value={dateRange[0]}
                  onChange={(e) => setDateRange([e.target.value, dateRange[1]])}
                />
                <input
                  type="date"
                  value={dateRange[1]}
                  onChange={(e) => setDateRange([dateRange[0], e.target.value])}
                />
              </div>

              {/* Dimension Filter */}
              <div style={{ marginBottom: 8 }}>
                <label>Dimension Filter (Category): </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">All</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Furniture">Furniture</option>
                </select>
              </div>

              {/* Measure Filter */}
              <div style={{ marginBottom: 8 }}>
                <label>Measure Filter (Sales Range): </label>
                <br />
                <input
                  type="number"
                  value={salesRange[0]}
                  onChange={(e) => setSalesRange([Number(e.target.value), salesRange[1]])}
                  placeholder="Min"
                  style={{ width: '48%', marginRight: '4%' }}
                />
                <input
                  type="number"
                  value={salesRange[1]}
                  onChange={(e) => setSalesRange([salesRange[0], Number(e.target.value)])}
                  placeholder="Max"
                  style={{ width: '48%' }}
                />
              </div>

              {/* Table Calculation Filter */}
              <div>
                <label>Table Calculation Filter (Sales per Quantity): </label>
                <br />
                <input
                  type="number"
                  value={salesPerQuantityRange[0]}
                  onChange={(e) =>
                    setSalesPerQuantityRange([Number(e.target.value), salesPerQuantityRange[1]])
                  }
                  placeholder="Min"
                  step="0.1"
                  style={{ width: '48%', marginRight: '4%' }}
                />
                <input
                  type="number"
                  value={salesPerQuantityRange[1]}
                  onChange={(e) =>
                    setSalesPerQuantityRange([salesPerQuantityRange[0], Number(e.target.value)])
                  }
                  placeholder="Max"
                  step="0.1"
                  style={{ width: '48%' }}
                />
              </div>
            </div>

            {/* Dashboard Configuration */}
            <h4>Dashboard Configuration</h4>
            {selectedDashboard ? (
              <>
                <div style={{ marginBottom: '8px' }}>
                  <label htmlFor="layout-columns">Columns per row:</label>
                  <select
                    id="layout-columns"
                    value={selectedDashboard.config.layoutColumns}
                    onChange={(e) => updateDashboardConfig('layoutColumns', Number(e.target.value))}
                    style={{ width: '100%', padding: '4px' }}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
                {/* Add more dashboard-specific config inputs here */}
              </>
            ) : (
              <p>Select a dashboard to configure</p>
            )}
          </div>
        </div>

        {/* Footer with dashboard tabs */}
        <footer
          style={{
            backgroundColor: '#282c34',
            color: 'white',
            padding: '6px 20px',
            display: 'flex',
            flexDirection: 'row',
            gap: '16px',
            height: '60px',
            overflowX: 'auto',
            overflowY: 'hidden',
            whiteSpace: 'nowrap',
            alignItems: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {dashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              onClick={() => {
                setSelectedDashboardId(dashboard.id);
                setSelectedPanelId(null);
              }}
              style={{
                cursor: 'pointer',
                padding: '6px 12px',
                backgroundColor: dashboard.id === selectedDashboardId ? '#61dafb' : 'transparent',
                color: dashboard.id === selectedDashboardId ? '#282c34' : 'white',
                borderRadius: '4px',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                flexShrink: 0,
                fontSize: '14px',
              }}
              title={`Switch to ${dashboard.title}`}
            >
              {dashboard.title}
            </div>
          ))}

          <button
            onClick={addNewDashboard}
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: '#61dafb',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#282c34',
              userSelect: 'none',
              flexShrink: 0,
              lineHeight: 0,
              padding: 0,
            }}
            aria-label="Add new dashboard"
            title="Add new dashboard"
          >
            +
          </button>
        </footer>

        {/* Visualizer popup */}
        {showVisualizer && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10000,
            }}
            onClick={closeVisualizer}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                minWidth: '300px',
                maxWidth: '80vw',
                maxHeight: '80vh',
                overflowY: 'auto',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Visualizer</h3>

              {/* Panels of selected dashboard */}
              <div>
                {selectedDashboard?.panels.map((panel) => (
                  <div
                    key={panel.id}
                    style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}
                  >
                    <h4>{panel.title}</h4>
                    <p>{panel.content}</p>
                    <div>
                      {(panel.boundVisuals || []).map((visual) => (
                        <VisualRenderer key={visual.id} visual={visual} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={closeVisualizer}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  cursor: 'pointer',
                  backgroundColor: '#61dafb',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontWeight: 'bold',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default DashboardFilter;