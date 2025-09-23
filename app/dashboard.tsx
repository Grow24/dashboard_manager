import React, { useState, useEffect } from 'react';
import './css/Dashboard.css';

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

interface DashboardCreationPopupProps {
  open: boolean;
  onClose: () => void;
  pages: Page[];
  onDashboardCreated: (dashboard: Dashboard) => void;
}

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

// Function to render a simple visualization based on page data
const renderVisualization = (pageData: PageData) => {
  // If we have panels data, render a simple panel visualization
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
  
  // Default visualization
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%',
      color: '#666'
    }}>
      <div>Page Visualization Preview</div>
    </div>
  );
};

const DashboardCreationPopup: React.FC<DashboardCreationPopupProps> = ({
  open,
  onClose,
  pages,
  onDashboardCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'pages' | 'panes' | 'preview'>('details');
  const [dashboardName, setDashboardName] = useState('');
  const [selectedPages, setSelectedPages] = useState<DashboardPage[]>([]);
  const [pageContents, setPageContents] = useState<Record<string, string>>({});
  const [pageData, setPageData] = useState<Record<string, PageData>>({});
  const [panes, setPanes] = useState<DashboardPane[]>([]);
  const [newPane, setNewPane] = useState({
    title: '',
    content: '',
    x: 0,
    y: 0,
    width: 400,
    height: 300,
  });

  // Reset form when popup opens
  useEffect(() => {
    if (open) {
      setDashboardName('');
      setSelectedPages([]);
      setPageContents({});
      setPageData({});
      setPanes([]);
      setNewPane({
        title: '',
        content: '',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
      });
      setActiveTab('details');
    }
  }, [open]);

  // Fetch page content when selectedPages change
  useEffect(() => {
    async function fetchPageContents() {
      const contents: Record<string, string> = {};
      const data: Record<string, PageData> = {};
      
      for (const page of selectedPages) {
        try {
          // Try to load detailed page data from the database
          const pageDetails = await loadPageDataFromAPI(page.id);
          if (pageDetails) {
            data[page.id] = pageDetails;
            // Use the content from the database if available
            contents[page.id] = pageDetails.content || 'No content available';
          } else {
            // Fallback to the existing content loading method
            const response = await fetch(`${API_BASE_URL}/get_page_content.php?pageId=${page.id}`);
            const responseData = await response.json();
            if (responseData.success && responseData.content) {
              contents[page.id] = responseData.content;
            } else {
              contents[page.id] = 'No content available';
            }
          }
        } catch (error) {
          contents[page.id] = 'Error loading content';
        }
      }
      
      setPageContents(contents);
      setPageData(data);
    }
    
    if (selectedPages.length > 0 && activeTab === 'preview') {
      fetchPageContents();
    } else {
      setPageContents({});
      setPageData({});
    }
  }, [selectedPages, activeTab]);

  const createDashboard = async () => {
    if (!dashboardName.trim()) {
      alert('Please enter a dashboard name');
      return;
    }

    const dashboard: Dashboard = {
      id: `dashboard-${Date.now()}`,
      name: dashboardName,
      pages: selectedPages,
      panes: panes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const success = await saveDashboardToAPI(dashboard);
    if (success) {
      onDashboardCreated(dashboard);
      onClose();
    } else {
      alert('Failed to save dashboard. Please try again.');
    }
  };

  const addPageToDashboard = (page: Page) => {
    const existingPage = selectedPages.find((p) => p.id === page.id);
    if (!existingPage) {
      const newDashboardPage: DashboardPage = {
        id: page.id,
        name: page.name,
        position: { x: 0, y: 0 },
        size: { width: 600, height: 400 },
      };
      setSelectedPages([...selectedPages, newDashboardPage]);
    }
  };

  const removePageFromDashboard = (pageId: string) => {
    setSelectedPages(selectedPages.filter((p) => p.id !== pageId));
  };

  const addPane = () => {
    if (newPane.title.trim() === '') return;

    const pane: DashboardPane = {
      id: `pane-${Date.now()}`,
      title: newPane.title,
      content: newPane.content,
      position: { x: newPane.x, y: newPane.y },
      size: { width: newPane.width, height: newPane.height },
    };

    setPanes([...panes, pane]);
    setNewPane({
      title: '',
      content: '',
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
  };

  const removePane = (paneId: string) => {
    setPanes(panes.filter((p) => p.id !== paneId));
  };

  if (!open) return null;

  return (
    <div className="dashboard-popup-overlay">
      <div className="dashboard-popup">
        <div className="dashboard-popup-header">
          <h2>Create New Dashboard22</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dashboard-popup-tabs" style={{ border: '1px solid red' }}>
          <button
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Dashboard Details
          </button>
          <button
            className={`tab-button ${activeTab === 'pages' ? 'active' : ''}`}
            onClick={() => setActiveTab('pages')}
          >
            Link Pages ({selectedPages.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'panes' ? 'active' : ''}`}
            onClick={() => setActiveTab('panes')}
          >
            Create Panes ({panes.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        </div>

        <div className="dashboard-popup-content" style={{ height: '650px', overflowY: 'auto' }}>
          {activeTab === 'details' && (
            <div className="tab-content">
              <div className="form-group">
                <label>Dashboard Name *</label>
                <input
                  type="text"
                  value={dashboardName}
                  onChange={(e) => setDashboardName(e.target.value)}
                  placeholder="Enter dashboard name"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea placeholder="Enter dashboard description" className="form-textarea" rows={3} />
              </div>
            </div>
          )}

          {activeTab === 'pages' && (
            <div className="tab-content">
              <div className="pages-selection">
                {/* <h3>Available Pages</h3> */}
                <div className="pages-list">
                  {pages.map((page) => (
                    <div key={page.id} className="page-item">
                      <div className="page-info">
                        <h4>{page.name}</h4>
                        <p>{page.description || 'No description'}</p>
                      </div>
                      <div className="page-actions">
                        {selectedPages.some((p) => p.id === page.id) ? (
                          <button className="btn-remove" onClick={() => removePageFromDashboard(page.id)}>
                            Remove
                          </button>
                        ) : (
                          <button className="btn-add" onClick={() => addPageToDashboard(page)}>
                            Add to Dashboard
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedPages.length > 0 && (
                  <div className="selected-pages">
                    <h3>Selected Pages ({selectedPages.length})</h3>
                    <div className="pages-grid">
                      {selectedPages.map((page) => (
                        <div key={page.id} className="selected-page-card">
                          <div className="page-card-header">
                            <h4>{page.name}</h4>
                            <button className="remove-page-btn" onClick={() => removePageFromDashboard(page.id)}>
                              ×
                            </button>
                          </div>
                          <div className="page-card-content">
                            <div className="position-controls">
                              <div className="control-group">
                                <label>X Position</label>
                                <input
                                  type="number"
                                  value={page.position.x}
                                  onChange={(e) => {
                                    const updatedPages = selectedPages.map((p) =>
                                      p.id === page.id ? { ...p, position: { ...p.position, x: parseInt(e.target.value) || 0 } } : p
                                    );
                                    setSelectedPages(updatedPages);
                                  }}
                                  className="position-input"
                                />
                              </div>
                              <div className="control-group">
                                <label>Y Position</label>
                                <input
                                  type="number"
                                  value={page.position.y}
                                  onChange={(e) => {
                                    const updatedPages = selectedPages.map((p) =>
                                      p.id === page.id ? { ...p, position: { ...p.position, y: parseInt(e.target.value) || 0 } } : p
                                    );
                                    setSelectedPages(updatedPages);
                                  }}
                                  className="position-input"
                                />
                              </div>
                            </div>
                            <div className="size-controls">
                              <div className="control-group">
                                <label>Width</label>
                                <input
                                  type="number"
                                  value={page.size.width}
                                  onChange={(e) => {
                                    const updatedPages = selectedPages.map((p) =>
                                      p.id === page.id ? { ...p, size: { ...p.size, width: parseInt(e.target.value) || 300 } } : p
                                    );
                                    setSelectedPages(updatedPages);
                                  }}
                                  className="size-input"
                                />
                              </div>
                              <div className="control-group">
                                <label>Height</label>
                                <input
                                  type="number"
                                  value={page.size.height}
                                  onChange={(e) => {
                                    const updatedPages = selectedPages.map((p) =>
                                      p.id === page.id ? { ...p, size: { ...p.size, height: parseInt(e.target.value) || 200 } } : p
                                    );
                                    setSelectedPages(updatedPages);
                                  }}
                                  className="size-input"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'panes' && (
            <div className="tab-content">
              <div className="pane-creation">
                <h3>Create New Pane</h3>
                <div className="form-group">
                  <label>Pane Title *</label>
                  <input
                    type="text"
                    value={newPane.title}
                    onChange={(e) => setNewPane({ ...newPane, title: e.target.value })}
                    placeholder="Enter pane title"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Content</label>
                  <textarea
                    value={newPane.content}
                    onChange={(e) => setNewPane({ ...newPane, content: e.target.value })}
                    placeholder="Enter pane content or visualization details"
                    className="form-textarea"
                    rows={4}
                  />
                </div>
                <div className="pane-position-size">
                  <div className="form-row">
                    <div className="form-group">
                      <label>X Position</label>
                      <input
                        type="number"
                        value={newPane.x}
                        onChange={(e) => setNewPane({ ...newPane, x: parseInt(e.target.value) || 0 })}
                        className="form-input small"
                      />
                    </div>
                    <div className="form-group">
                      <label>Y Position</label>
                      <input
                        type="number"
                        value={newPane.y}
                        onChange={(e) => setNewPane({ ...newPane, y: parseInt(e.target.value) || 0 })}
                        className="form-input small"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Width</label>
                      <input
                        type="number"
                        value={newPane.width}
                        onChange={(e) => setNewPane({ ...newPane, width: parseInt(e.target.value) || 400 })}
                        className="form-input small"
                      />
                    </div>
                    <div className="form-group">
                      <label>Height</label>
                      <input
                        type="number"
                        value={newPane.height}
                        onChange={(e) => setNewPane({ ...newPane, height: parseInt(e.target.value) || 300 })}
                        className="form-input small"
                      />
                    </div>
                  </div>
                </div>
                <button className="btn-add-pane" onClick={addPane}>
                  Add Pane
                </button>
              </div>

              {panes.length > 0 && (
                <div className="created-panes">
                  <h3>Created Panes ({panes.length})</h3>
                  <div className="panes-list">
                    {panes.map((pane) => (
                      <div key={pane.id} className="pane-item">
                        <div className="pane-header">
                          <h4>{pane.title}</h4>
                          <button className="remove-pane-btn" onClick={() => removePane(pane.id)}>
                            ×
                          </button>
                        </div>
                        <div className="pane-content">
                          <p>{pane.content || 'No content'}</p>
                          <div className="pane-dimensions">
                            Position: ({pane.position.x}, {pane.position.y}) | Size: {pane.size.width} × {pane.size.height}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="tab-content preview-tab">
              <h3>Dashboard Preview: {dashboardName || 'Untitled'}</h3>
              <div
                className="dashboard-preview-canvas"
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '600px',
                  border: '1px solid #ccc',
                  background: '#f9f9f9',
                  overflow: 'auto',
                }}
              >
                {/* Render Pages */}
                {selectedPages.map((page) => (
                  <div
                    key={page.id}
                    className="preview-page"
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
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 14,
                        whiteSpace: 'pre-wrap',
                        overflowY: 'auto',
                        maxHeight: 'calc(100% - 30px)',
                      }}
                    >
                      {/* Render visualization based on page data */}
                      {pageData[page.id] ? (
                        renderVisualization(pageData[page.id])
                      ) : (
                        <div>Loading visualization...</div>
                      )}
                    </div>
                    
                    {/* Display additional page data if available */}
                    {pageData[page.id] && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #ccc' }}>
                        <small>
                          <strong>Layout:</strong> {pageData[page.id].layout} | 
                          <strong> Theme:</strong> {pageData[page.id].theme}
                        </small>
                      </div>
                    )}
                  </div>
                ))}

                {/* Render Panes */}
                {panes.map((pane) => (
                  <div
                    key={pane.id}
                    className="preview-pane"
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
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-popup-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-create" onClick={createDashboard}>
            Create Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};



export default DashboardCreationPopup;

