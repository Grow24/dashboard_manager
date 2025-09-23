import React, { useState, useEffect } from 'react';

interface DashboardPage {
  id: string;
  page_id: string;
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface DashboardPane {
  id: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
}

interface Dashboard {
  id: string;
  name: string;
  pages: DashboardPage[];
  panes: DashboardPane[];
  createdAt: Date;
  updatedAt: Date;
}

interface Page {
  id: string;
  name: string;
  url: string;
  description?: string;
}

interface PageData {
  id: number;
  name: string;
  url: string;
  description: string;
  layout: string;
  theme: string;
  customCSS: string;
  tableStructure: string;
  components: string;
  settings: string;
  createdAt: string;
  updatedAt: string;
  analytics: string;
  panels: string;
  content: string;
  pagepath: string;
}

interface DashboardListProps {}

const DashboardList: React.FC<DashboardListProps> = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [pageData, setPageData] = useState<Record<string, PageData>>({});

  const API_BASE_URL = 'https://intelligentsalesman.com/ism1/API/dashboard';

  const saveDashboardToAPI = async (dashboard: Dashboard) => {
    try {
      const response = await fetch(`${API_BASE_URL}/create_dashboard.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dashboard),
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error saving dashboard:', error);
      return false;
    }
  };

  const loadDashboardsFromAPI = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_dashboards.php`);
      const data = await response.json();
      if (data.success) {
        return data.dashboards;
      }
      return [];
    } catch (error) {
      console.error('Error loading dashboards:', error);
      return [];
    }
  };

  const loadPageDataFromAPI = async (pageId: string) => {
    try {
      const id = parseInt(pageId);
      if (isNaN(id)) {
        throw new Error('Invalid page ID');
      }

      const response = await fetch(`${API_BASE_URL}/get_page_content.php?pageId=${id}`);
      const data = await response.json();

      if (data.success && data.content) {
        return data.content;
      }

      return null;
    } catch (error) {
      console.error(`Error loading page data for ID ${pageId}:`, error);
      return null;
    }
  };

  // Function to fetch the actual .tsx file content
  const fetchPageComponentContent = async (pagepath: string) => {
    try {
      // If pagepath is empty, return null
      if (!pagepath) return null;
      
      // Fetch the .tsx file content
      const response = await fetch(pagepath);
      if (!response.ok) {
        throw new Error(`Failed to fetch component: ${response.status}`);
      }
      
      const content = await response.text();
      return content;
    } catch (error) {
      console.error('Error fetching page component:', error);
      return null;
    }
  };

  const loadPagesForDashboard = async (dashboardId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_dashboard_pages.php?dashboardId=${dashboardId}`);
      const data = await response.json();
      return data.pages || [];
    } catch (error) {
      console.error(`Error loading pages for dashboard ${dashboardId}:`, error);
      return [];
    }
  };

  const loadPanesForDashboard = async (dashboardId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_dashboard_panes.php?dashboardId=${dashboardId}`);
      const data = await response.json();
      return data.panes || [];
    } catch (error) {
      console.error(`Error loading panes for dashboard ${dashboardId}:`, error);
      return [];
    }
  };

  const renderVisualization = (pageData: PageData) => {
    // Example: render panels if available
    if (pageData.panels && pageData.panels !== '[]') {
      try {
        const panels = JSON.parse(pageData.panels);
        if (panels.length > 0) {
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
              {panels.map((panel: any, index: number) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    minWidth: '150px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '5px' }}>{panel.icon || '📊'}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', color: panel.color || '#000' }}>
                    {panel.staticValue || '0'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{panel.title || 'Panel'}</div>
                </div>
              ))}
            </div>
          );
        }
      } catch (e) {
        console.error('Error parsing panels data:', e);
      }
    }

    // If we have components data, render a simple component visualization
    if (pageData.components && pageData.components !== '[]') {
      try {
        const components = JSON.parse(pageData.components);
        if (components.length > 0) {
          return (
            <div style={{ marginTop: '10px' }}>
              {components.map((component: any, index: number) => {
                if (component.type === 'chart') {
                  return (
                    <div
                      key={index}
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        height: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '10px 0'
                      }}
                    >
                      <div>
                        <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
                          {component.config?.chartType?.toUpperCase() || 'CHART'} VISUALIZATION
                        </div>
                        <div>X-Axis: {component.config?.xKey || 'N/A'}</div>
                        <div>Y-Axis: {component.config?.yKey || 'N/A'}</div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          );
        }
      } catch (e) {
        console.error('Error parsing components data:', e);
      }
    }

    // Default fallback visualization
    return <div style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>Page Visualization Preview</div>;
  };

  useEffect(() => {
    async function fetchDashboards() {
      const loadedDashboards = await loadDashboardsFromAPI();
      setDashboards(loadedDashboards);
      if (loadedDashboards.length > 0) {
        setSelectedDashboard(loadedDashboards[0]);
      }
    }
    fetchDashboards();
  }, []);

  useEffect(() => {
    async function fetchDashboardDetails() {
      if (!selectedDashboard) return;

      // Fetch pages and panes for the selected dashboard
      const pages = await loadPagesForDashboard(selectedDashboard.id);
      const panes = await loadPanesForDashboard(selectedDashboard.id);

      // Update selected dashboard with pages and panes
      setSelectedDashboard({
        ...selectedDashboard,
        pages,
        panes,
      });
    }

    fetchDashboardDetails();
  }, [selectedDashboard?.id]);

  useEffect(() => {
    async function fetchPageData() {
      if (!selectedDashboard?.pages) return;
      const data: Record<string, PageData> = {};
      for (const page of selectedDashboard.pages) {
        const pageDetails = await loadPageDataFromAPI(page.page_id); // use page.page_id here
        if (pageDetails) {
          data[page.id] = pageDetails; // you can keep this key as dashboard_pages.id or page.page_id depending on your usage
        }
      }
      setPageData(data);
    }
    fetchPageData();
  }, [selectedDashboard?.pages]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left sidebar with dashboards list */}
      <div style={{ width: '250px', borderRight: '1px solid #ccc', overflowY: 'auto' }}>
        <h3 style={{ padding: '10px' }}>Dashboards</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {dashboards.map((dashboard) => (
            <li
              key={dashboard.id}
              onClick={() => setSelectedDashboard(dashboard)}
              style={{
                padding: '10px',
                cursor: 'pointer',
                backgroundColor: selectedDashboard?.id === dashboard.id ? '#007bff' : 'transparent',
                color: selectedDashboard?.id === dashboard.id ? '#fff' : '#000',
              }}
            >
              {dashboard.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Right side: dashboard visual */}
      <div style={{ flex: 1, position: 'relative', overflow: 'auto', background: '#f9f9f9' }}>
        {selectedDashboard && selectedDashboard.pages ? (
          <>
            {/* Render Pages */}
            {selectedDashboard.pages.map((page) => (
              <div
                key={page.id}
                style={{
                  position: 'absolute',
                  left: page.position.x,
                  top: page.position.y,
                  width: page.size.width,
                  height: page.size.height,
                  border: '2px solid #007bff',
                  borderRadius: 4,
                  backgroundColor: '#e6f0ff',
                  padding: 8,
                  boxSizing: 'border-box',
                  overflow: 'auto',
                }}
                title={`Page: ${page.name}`}
              >
                <strong>{page.name}</strong>
                <div style={{ marginTop: 6, fontSize: 14, whiteSpace: 'pre-wrap', overflowY: 'auto', maxHeight: 'calc(100% - 30px)' }}>
                  {pageData[page.id] ? renderVisualization(pageData[page.id]) : <div>Loading visualization...</div>}
                </div>
              </div>
            ))}

            {/* Render Panes */}
            {selectedDashboard.panes?.map((pane) => (
              <div
                key={pane.id}
                style={{
                  position: 'absolute',
                  left: pane.position.x,
                  top: pane.position.y,
                  width: pane.size.width,
                  height: pane.size.height,
                  border: '2px solid #28a745',
                  borderRadius: 4,
                  backgroundColor: '#dff0d8',
                  padding: 8,
                  boxSizing: 'border-box',
                  overflow: 'auto',
                }}
                title={`Pane: ${pane.title}`}
              >
                <strong>{pane.title}</strong>
                <div style={{ marginTop: 6, fontSize: 14, whiteSpace: 'pre-wrap' }}>{pane.content || 'No content'}</div>
              </div>
            ))}
          </>
        ) : (
          <div style={{ padding: 20 }}>Select a dashboard to view</div>
        )}
      </div>
    </div>
  );
};

export default DashboardList;