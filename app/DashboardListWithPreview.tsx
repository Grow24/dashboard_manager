import React, { useState, useEffect } from 'react';
import './css/DashboardListWithPreview.css';

interface DashboardPage {
  id: string;
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

const API_BASE_URL = 'https://intelligentsalesman.com/ism1/API/dashboard';

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

const DashboardListWithPreview: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        setLoading(true);
        const data = await loadDashboardsFromAPI();
        setDashboards(data);
        if (data.length > 0) {
          setSelectedDashboard(data[0]);
        }
      } catch (err) {
        setError('Failed to load dashboards');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboards();
  }, []);

  const handleDashboardSelect = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
  };

  if (loading) {
    return <div className="dashboard-list-container">Loading dashboards...</div>;
  }

  if (error) {
    return <div className="dashboard-list-container">Error: {error}</div>;
  }

  return (
    <div className="dashboard-list-container">
      <div className="dashboard-list-sidebar">
        <h2>My Dashboards</h2>
        {dashboards.length === 0 ? (
          <p className="no-dashboards">No dashboards created yet</p>
        ) : (
          <ul className="dashboard-list">
            {dashboards.map((dashboard) => (
              <li
                key={dashboard.id}
                className={`dashboard-item ${
                  selectedDashboard?.id === dashboard.id ? 'selected' : ''
                }`}
                onClick={() => handleDashboardSelect(dashboard)}
              >
                <div className="dashboard-name">{dashboard.name}</div>
                <div className="dashboard-meta">
                  <span>{dashboard.pages.length} pages</span>
                  <span>{dashboard.panes.length} panes</span>
                </div>
                <div className="dashboard-date">
                  Created: {new Date(dashboard.createdAt).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dashboard-preview-area">
        {selectedDashboard ? (
          <div className="dashboard-preview">
            <div className="dashboard-header">
              <h1>{selectedDashboard.name}</h1>
              <div className="dashboard-info">
                <span>{selectedDashboard.pages.length} pages</span>
                <span>{selectedDashboard.panes.length} panes</span>
                <span>
                  Last updated: {new Date(selectedDashboard.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="dashboard-content">
              <div className="dashboard-pages-section">
                <h2>Linked Pages ({selectedDashboard.pages.length})</h2>
                {selectedDashboard.pages.length === 0 ? (
                  <p className="no-content">No pages linked to this dashboard</p>
                ) : (
                  <div className="pages-grid" style={{ position: 'relative', height: 600, border: '1px solid #ccc', marginBottom: 20 }}>
                    {selectedDashboard.pages.map((page) => (
                      <div
                        key={page.id}
                        className="page-preview-card"
                        style={{
                          position: 'absolute',
                          left: `${page.position.x}px`,
                          top: `${page.position.y}px`,
                          width: `${page.size.width}px`,
                          height: `${page.size.height}px`,
                          border: '1px solid #007bff',
                          borderRadius: 4,
                          padding: 8,
                          backgroundColor: '#e9f5ff',
                          boxSizing: 'border-box',
                          overflow: 'auto'
                        }}
                      >
                        <div className="page-card-header">
                          <h3>{page.name}</h3>
                        </div>
                        <div className="page-card-content">
                          <p>Page ID: {page.id}</p>
                          <p>Position: ({page.position.x}, {page.position.y})</p>
                          <p>Size: {page.size.width} × {page.size.height}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="dashboard-panes-section">
                <h2>Panes ({selectedDashboard.panes.length})</h2>
                {selectedDashboard.panes.length === 0 ? (
                  <p className="no-content">No panes created for this dashboard</p>
                ) : (
                  <div className="panes-container" style={{ position: 'relative', height: 600, border: '1px solid #ccc' }}>
                    {selectedDashboard.panes.map((pane) => (
                      <div
                        key={pane.id}
                        className="pane-preview-card"
                        style={{
                          position: 'absolute',
                          left: `${pane.position.x}px`,
                          top: `${pane.position.y}px`,
                          width: `${pane.size.width}px`,
                          height: `${pane.size.height}px`,
                          border: '1px solid #28a745',
                          borderRadius: 4,
                          padding: 8,
                          backgroundColor: '#e6ffed',
                          boxSizing: 'border-box',
                          overflow: 'auto'
                        }}
                      >
                        <div className="pane-card-header">
                          <h3>{pane.title}</h3>
                        </div>
                        <div className="pane-card-content">
                          <p>{pane.content || 'No content'}</p>
                          <div className="pane-dimensions">
                            Position: ({pane.position.x}, {pane.position.y}) | 
                            Size: {pane.size.width} × {pane.size.height}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="no-dashboard-selected">
            <h2>No Dashboard Selected</h2>
            <p>Please select a dashboard from the list to preview its content</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardListWithPreview;