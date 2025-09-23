import React, { useState, useRef } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import OldThemePage from './OldThemePage'; // Adjust the path if needed
import { BarChartComponent } from './barchart';
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
  detail: 'Some details11',
  tooltip: 'Panel tooltip',
  boundVisuals: [],
};

interface DropZoneProps {
  type: string;
  onDrop: (item: any) => void;
  children: React.ReactNode;
}

const DropZone: React.FC<DropZoneProps> = ({ type, onDrop, children }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: type,
    drop: (item) => {
      onDrop(item.field || item.pageId || item.id || item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive = isOver && canDrop;

  return (
    <div
      ref={drop}
      style={{
        minHeight: '40px',
        padding: '8px',
        border: '2px dashed #ccc',
        backgroundColor: isActive ? '#e6f7ff' : '#fafafa',
        borderRadius: '4px',
        marginBottom: '8px',
        color: '#333',
      }}
    >
      {children}
    </div>
  );
};

interface Visual {
  id: string;
  name: string;
  type: string;
}

interface Panel {
  id: string;
  title: string;
  content?: string; // optional text content
  component?: React.ComponentType; // React component to render
  height: number;
  width: number;
  position: { x: number; y: number };
  color: string;
  size: string;
  text: string;
  detail: string;
  tooltip: string;
  boundVisuals: Visual[];
}

interface Page {
  id: string;
  title: string;
  panels: Panel[];
}

const ItemTypes = {
  VISUAL: 'visual',
  PANEL: 'panel',
  PAGE: 'page',
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

const createdPages = [
  {
    id: 'barchart',
    title: 'barchart.tsx',
    component: BarChartComponent,
  },
  
];

type SelectedTab = { type: 'page' | 'dashboard'; id: string } | null;

const DashboardCreation: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([
    {
      id: 'page1',
      title: 'Page1',
      panels: [{ ...defaultPanelData }],
    },
  ]);
  const [selectedTab, setSelectedTab] = useState<SelectedTab>({ type: 'page', id: pages[0].id });
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string>('None');
  const [showVisualizer, setShowVisualizer] = useState<boolean>(false);
  const [selectedVisual, setSelectedVisual] = useState<Visual | null>(null);
  const [rowFields, setRowFields] = useState<string[]>([]);
  const [columnFields, setColumnFields] = useState<string[]>([]);
  const [panelConfig, setPanelConfig] = useState<Panel>({ ...defaultPanelData });
  const [showPanelMenu, setShowPanelMenu] = useState<boolean>(false);
  const [showLinkingPanelMenu, setShowLinkingPanelMenu] = useState<boolean>(false);

  const [dashboards, setDashboards] = useState<{ id: string; title: string }[]>([
    { id: 'dashboard1', title: 'Dashboard1' },
  ]);

  const selectedPage = selectedTab?.type === 'page' ? pages.find((p) => p.id === selectedTab.id) : undefined;

  const [visualizerPageId, setVisualizerPageId] = useState<string>(selectedPage?.id || '');

  React.useEffect(() => {
    if (selectedTab?.type === 'page') {
      setVisualizerPageId(selectedTab.id);
    }
  }, [selectedTab]);

  const addNewPage = () => {
    const newPageId = `page${pages.length + 1}`;
    const newPage: Page = {
      id: newPageId,
      title: `Page${pages.length + 1}`,
      panels: [{ ...defaultPanelData, id: `panel-${newPageId}`, boundVisuals: [] }],
    };
    setPages([...pages, newPage]);
    setSelectedTab({ type: 'page', id: newPageId });
  };

  const addNewDashboard = () => {
    const newDashboardId = `dashboard${dashboards.length + 1}`;
    const newDashboard = { id: newDashboardId, title: `Dashboard${dashboards.length + 1}` };
    setDashboards([...dashboards, newDashboard]);
    setSelectedTab({ type: 'dashboard', id: newDashboardId });
  };

  const addNewPanel = () => {
    if (selectedTab?.type !== 'page') return;
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

    setPages((prevPages) =>
  prevPages.map((page) => {
    if (page.id === selectedTab.id) {
      return {
        ...page,
        panels: page.panels.map((p) =>
          p.id === panel.id
            ? {
                ...p,
                title: droppedPage.title,
                component: droppedPage.component,
                content: undefined, // clear text content if any
                color: '#f0f8ff',
                boundVisuals: [],
              }
            : p
        ),
      };
    }
    return page;
  })
);
    setSelectedPanelId(newPanelId);
    setPanelConfig({ ...newPanel });
  };

  const selectPanel = (panelId: string) => {
    setSelectedPanelId(panelId);
    if (selectedTab?.type !== 'page') return;
    const page = pages.find((p) => p.id === selectedTab.id);
    const panel = page?.panels.find((p) => p.id === panelId);
    if (panel) setPanelConfig({ ...panel });
  };

  const updatePanelConfig = (field: string, value: any) => {
    const updatedConfig = field === 'position'
      ? { ...panelConfig, position: value }
      : { ...panelConfig, [field]: value };

    setPanelConfig(updatedConfig);

    if (selectedTab?.type !== 'page') return;

    setPages((prevPages) =>
      prevPages.map((page) => {
        if (page.id === selectedTab.id) {
          return {
            ...page,
            panels: page.panels.map((p) =>
              p.id === updatedConfig.id ? updatedConfig : p
            ),
          };
        }
        return page;
      })
    );
  };

  const handleVisualizerClick = () => setShowVisualizer(true);
  const closeVisualizer = () => setShowVisualizer(false);

  const PageItem = ({ page }: { page: { id: string; title: string } }) => {
    const [{ isDragging }, drag] = useDrag({
      type: ItemTypes.PAGE,
      item: { pageId: page.id },
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
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={page.title}
      >
        {page.title}
      </div>
    );
  };

  const DraggablePanel = ({ panel }: { panel: Panel }) => {
    const ref = useRef<HTMLDivElement>(null);

    const [, drag] = useDrag({
      type: ItemTypes.PANEL,
      item: { id: panel.id, type: ItemTypes.PANEL },
    });

    const [, drop] = useDrop({
      accept: ItemTypes.PAGE,
      drop: (item: { pageId: string }) => {
        const droppedPage = createdPages.find((p) => p.id === item.pageId);
        if (!droppedPage) return;

        if (selectedTab?.type !== 'page') return;

        setPages((prevPages) =>
          prevPages.map((page) => {
            if (page.id === selectedTab.id) {
              return {
                ...page,
                panels: page.panels.map((p) =>
                  p.id === panel.id
                    ? {
                        ...p,
                        title: droppedPage.title,
                        content: droppedPage.content,
                        color: '#f0f8ff',
                        boundVisuals: [],
                      }
                    : p
                ),
              };
            }
            return page;
          })
        );
      },
    });

    drag(drop(ref));

    // Resize state
    const resizing = useRef(false);
    const lastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Move state
    const moving = useRef(false);
    const moveStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const panelStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Resize handlers
    const onResizeMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      resizing.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      document.addEventListener('mousemove', onResizeMouseMove);
      document.addEventListener('mouseup', onResizeMouseUp);
    };

    const onResizeMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };

      if (selectedTab?.type !== 'page') return;

      setPages((prevPages) =>
        prevPages.map((page) => {
          if (page.id === selectedTab.id) {
            return {
              ...page,
              panels: page.panels.map((p) => {
                if (p.id === panel.id) {
                  const container = ref.current?.parentElement;
                  if (!container) return p;
                  const containerRect = container.getBoundingClientRect();

                  const maxWidth = containerRect.width - p.position.x;
                  const maxHeight = containerRect.height - p.position.y;

                  const newWidth = Math.min(Math.max(50, p.width + dx), maxWidth);
                  const newHeight = Math.min(Math.max(50, p.height + dy), maxHeight);

                  if (selectedPanelId === p.id) {
                    setPanelConfig((cfg) => ({ ...cfg, width: newWidth, height: newHeight }));
                  }
                  return { ...p, width: newWidth, height: newHeight };
                }
                return p;
              }),
            };
          }
          return page;
        })
      );
    };

    const onResizeMouseUp = () => {
      resizing.current = false;
      document.removeEventListener('mousemove', onResizeMouseMove);
      document.removeEventListener('mouseup', onResizeMouseUp);
    };

    // Move handlers
    const onPanelMouseDown = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).getAttribute('data-resize-handle') === 'true') return;

      e.stopPropagation();
      moving.current = true;
      moveStartPos.current = { x: e.clientX, y: e.clientY };
      panelStartPos.current = { x: panel.position.x, y: panel.position.y };

      document.addEventListener('mousemove', onPanelMouseMove);
      document.addEventListener('mouseup', onPanelMouseUp);
    };

    const onPanelMouseMove = (e: MouseEvent) => {
      if (!moving.current) return;

      const dx = e.clientX - moveStartPos.current.x;
      const dy = e.clientY - moveStartPos.current.y;

      const newX = panelStartPos.current.x + dx;
      const newY = panelStartPos.current.y + dy;

      if (selectedTab?.type !== 'page') return;

      setPages((prevPages) =>
        prevPages.map((page) => {
          if (page.id === selectedTab.id) {
            return {
              ...page,
              panels: page.panels.map((p) =>
                p.id === panel.id
                  ? {
                      ...p,
                      position: {
                        x: Math.max(0, newX),
                        y: Math.max(0, newY),
                      },
                    }
                  : p
              ),
            };
          }
          return page;
        })
      );

      if (selectedPanelId === panel.id) {
        setPanelConfig((cfg) => ({
          ...cfg,
          position: {
            x: Math.max(0, newX),
            y: Math.max(0, newY),
          },
        }));
      }
    };

    const onPanelMouseUp = () => {
      moving.current = false;
      document.removeEventListener('mousemove', onPanelMouseMove);
      document.removeEventListener('mouseup', onPanelMouseUp);
    };

    return (
      <div
        ref={ref}
    style={{
      position: 'absolute',
      left: panel.position.x,
      top: panel.position.y,
      width: panel.width,
      height: panel.height,
      backgroundColor: panel.color,
      border: '1px solid #ccc',
      padding: 10,
      cursor: 'move',
      boxSizing: 'border-box',
      borderRadius: 4,
      userSelect: 'none',
      opacity: selectedPanelId === panel.id ? 1 : 0.8,
      overflow: 'auto',
    }}
    title={panel.tooltip}
    onClick={() => selectPanel(panel.id)}
    onMouseDown={onPanelMouseDown}
  >
    <strong style={{ fontSize: panel.size }}>{panel.title}</strong>
    {panel.component ? (
      <panel.component />
    ) : (
      <p>{panel.content}</p>
    )}
    <small>{panel.detail}</small>
        <div style={{ marginTop: 10 }}>
          {(panel.boundVisuals || []).map((visual) => (
            <VisualRenderer key={visual.id} visual={visual} />
          ))}
        </div>
        <div
          onMouseDown={onResizeMouseDown}
          data-resize-handle="true"
          style={{
            position: 'absolute',
            width: 12,
            height: 12,
            right: 0,
            bottom: 0,
            cursor: 'nwse-resize',
            backgroundColor: '#61dafb',
            borderRadius: 2,
          }}
          title="Resize panel"
        />
      </div>
    );
  };

  const VisualRenderer = ({ visual }: { visual: Visual }) => {
    switch (visual.type) {
      case 'pie':
        return (
          <div
            style={{
              padding: 10,
              border: '1px solid #ccc',
              marginBottom: 8,
              borderRadius: 4,
              backgroundColor: '#fce4ec',
            }}
          >
            <strong>Pie Chart</strong>
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
          </div>
        );
      case 'bar':
        return (
          <div
            style={{
              padding: 10,
              border: '1px solid #ccc',
              marginBottom: 8,
              borderRadius: 4,
              backgroundColor: '#e3f2fd',
            }}
          >
            <strong>Bar Chart</strong>
            <BarChart width={300} height={150} data={barData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="uv" fill="#8884d8" />
            </BarChart>
          </div>
        );
      case 'line':
        return (
          <div
            style={{
              padding: 10,
              border: '1px solid #ccc',
              marginBottom: 8,
              borderRadius: 4,
              backgroundColor: '#e8f5e9',
            }}
          >
            <strong>Line Chart</strong>
            <LineChart width={300} height={150} data={lineData}>
              <XAxis dataKey="name" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="uv" stroke="#8884d8" />
              <Line type="monotone" dataKey="pv" stroke="#82ca9d" />
            </LineChart>
          </div>
        );
      case 'table':
        return (
          <div
            style={{
              padding: 10,
              border: '1px solid #ccc',
              marginBottom: 8,
              borderRadius: 4,
              backgroundColor: '#fff3e0',
              overflowX: 'auto',
            }}
          >
            <strong>Table View</strong>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: 4 }}>Name</th>
                  <th style={{ border: '1px solid #ccc', padding: 4 }}>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>Item 1</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>100</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>Item 2</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>200</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  const onPageTabClick = (pageId: string) => {
    setSelectedTab({ type: 'page', id: pageId });
    setSelectedPanelId(null);
  };

  const onDashboardTabClick = (dashboardId: string) => {
    setSelectedTab({ type: 'dashboard', id: dashboardId });
    setSelectedPanelId(null);
  };

  const handleRowDrop = (field: string) => {
    if (!rowFields.includes(field)) setRowFields([...rowFields, field]);
  };

  const handleColumnDrop = (field: string) => {
    if (!columnFields.includes(field)) setColumnFields([...columnFields, field]);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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
          <nav style={{ display: 'flex', gap: '20px', position: 'relative' }}>
            <div style={{ cursor: 'pointer' }}>Home</div>
            <div style={{ cursor: 'pointer' }}>About Us</div>
            <div style={{ cursor: 'pointer' }}>Contact</div>

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
                  {selectedTab?.type === 'page' &&
                    selectedPage?.panels.map((panel) => (
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
                  {selectedTab?.type === 'page' &&
                    selectedPage?.panels.map((panel) => (
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

          <div style={{ width: '120px' }}></div>
        </header>

        <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          <div
            style={{
              width: '200px',
              backgroundColor: '#f0f0f0',
              padding: '10px',
              borderRight: '1px solid #ccc',
              overflowY: 'auto',
            }}
          >
            <h4>Pages</h4>
            {createdPages.map((page) => (
              <PageItem key={page.id} page={page} />
            ))}
          </div>

          <main
            style={{
              flexGrow: 1,
              padding: '20px',
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              margin: '0',
              borderRadius: '0',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {selectedTab?.type === 'page' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  <DropZone type={ItemTypes.VISUAL} onDrop={handleRowDrop}>
                    <strong>Row Fields:</strong> {rowFields.join(', ') || 'Drop visuals here'}
                  </DropZone>
                  <DropZone type={ItemTypes.VISUAL} onDrop={handleColumnDrop}>
                    <strong>Column Fields:</strong> {columnFields.join(', ') || 'Drop visuals here'}
                  </DropZone>
                </div>

                {selectedPage?.panels.map((panel) => (
                  <DraggablePanel key={panel.id} panel={panel} />
                ))}

                {selectedVisual && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>Selected Visual: {selectedVisual.name}</h4>
                    <div
                      style={{
                        border: '1px solid #ccc',
                        padding: '10px',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                      }}
                    >
                      Visual Component Here
                    </div>
                  </div>
                )}
              </>
            ) : selectedTab?.type === 'dashboard' ? (
              selectedTab.id === 'dashboard1' ? (
                <OldThemePage />
              ) : (
                <div>
                  <p>{`Content for ${dashboards.find((d) => d.id === selectedTab.id)?.title}`}</p>
                </div>
              )
            ) : (
              <p>Please select a page or dashboard tab.</p>
            )}
          </main>

          <div
            style={{
              width: '300px',
              backgroundColor: '#f9f9f9',
              padding: '10px',
              borderLeft: '1px solid #ccc',
              overflowY: 'auto',
            }}
          >
            <h4>Panel Configuration</h4>
            {selectedPanelId ? (
              <>
                <div style={{ marginBottom: '8px' }}>
                  <label htmlFor="panel-title">Title:</label>
                  <input
                    type="text"
                    id="panel-title"
                    value={panelConfig.title}
                    onChange={(e) => updatePanelConfig('title', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label htmlFor="panel-height">Height:</label>
                  <input
                    type="number"
                    id="panel-height"
                    value={panelConfig.height}
                    onChange={(e) => updatePanelConfig('height', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label htmlFor="panel-width">Width:</label>
                  <input
                    type="number"
                    id="panel-width"
                    value={panelConfig.width}
                    onChange={(e) => updatePanelConfig('width', Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label htmlFor="panel-x">Position X:</label>
                  <input
                    type="number"
                    id="panel-x"
                    value={panelConfig.position.x}
                    onChange={(e) =>
                      updatePanelConfig('position', { ...panelConfig.position, x: Number(e.target.value) })
                    }
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label htmlFor="panel-y">Position Y:</label>
                  <input
                    type="number"
                    id="panel-y"
                    value={panelConfig.position.y}
                    onChange={(e) =>
                      updatePanelConfig('position', { ...panelConfig.position, y: Number(e.target.value) })
                    }
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label htmlFor="panel-color">Color:</label>
                  <input
                    type="color"
                    id="panel-color"
                    value={panelConfig.color}
                    onChange={(e) => updatePanelConfig('color', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label htmlFor="panel-size">Size:</label>
                  <input
                    type="text"
                    id="panel-size"
                    value={panelConfig.size}
                    onChange={(e) => updatePanelConfig('size', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label htmlFor="panel-text">Text:</label>
                  <input
                    type="text"
                    id="panel-text"
                    value={panelConfig.text}
                    onChange={(e) => updatePanelConfig('text', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label htmlFor="panel-detail">Detail:</label>
                  <input
                    type="text"
                    id="panel-detail"
                    value={panelConfig.detail}
                    onChange={(e) => updatePanelConfig('detail', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label htmlFor="panel-tooltip">Tooltip:</label>
                  <input
                    type="text"
                    id="panel-tooltip"
                    value={panelConfig.tooltip}
                    onChange={(e) => updatePanelConfig('tooltip', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            ) : (
              <p>Select a panel to configure</p>
            )}
          </div>
        </div>

        <footer
          style={{
            backgroundColor: '#282c34',
            color: 'white',
            padding: '6px 20px',
            display: 'flex',
            flexDirection: 'row',
            gap: '24px',
            height: '60px',
            overflowX: 'auto',
            overflowY: 'hidden',
            whiteSpace: 'nowrap',
            alignItems: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div title="Pages" style={{ display: 'flex', alignItems: 'center', color: '#61dafb' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="20"
                width="20"
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ marginRight: 4 }}
              >
                <path d="M3 4v16h18V4H3zm16 14H5V6h14v12z" />
              </svg>
            </div>

            {pages.map((page) => (
              <div
                key={page.id}
                onClick={() => onPageTabClick(page.id)}
                style={{
                  cursor: 'pointer',
                  padding: '6px 12px',
                  backgroundColor:
                    selectedTab?.type === 'page' && selectedTab.id === page.id ? '#61dafb' : 'transparent',
                  color:
                    selectedTab?.type === 'page' && selectedTab.id === page.id ? '#282c34' : 'white',
                  borderRadius: '4px',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  flexShrink: 0,
                  fontSize: '14px',
                }}
                title={`Switch to ${page.title}`}
              >
                {page.title}
              </div>
            ))}

            <button
              onClick={addNewPage}
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
              aria-label="Add new page"
              title="Add new page"
            >
              +
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div title="Dashboards" style={{ display: 'flex', alignItems: 'center', color: '#61dafb' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="20"
                width="20"
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ marginRight: 4 }}
              >
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" />
              </svg>
            </div>

            {dashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                onClick={() => onDashboardTabClick(dashboard.id)}
                style={{
                  cursor: 'pointer',
                  padding: '6px 12px',
                  backgroundColor:
                    selectedTab?.type === 'dashboard' && selectedTab.id === dashboard.id
                      ? '#61dafb'
                      : 'transparent',
                  color:
                    selectedTab?.type === 'dashboard' && selectedTab.id === dashboard.id
                      ? '#282c34'
                      : 'white',
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
          </div>
        </footer>

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

              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                {pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setVisualizerPageId(page.id)}
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      backgroundColor: page.id === visualizerPageId ? '#61dafb' : '#eee',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: page.id === visualizerPageId ? 'bold' : 'normal',
                    }}
                  >
                    {page.title}
                  </button>
                ))}
              </div>

              <div>
                {(pages.find((p) => p.id === visualizerPageId)?.panels || []).map((panel) => (
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

export default DashboardCreation;