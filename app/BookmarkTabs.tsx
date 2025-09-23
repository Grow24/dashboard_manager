import React, { useState } from 'react';

type Tab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type Page = {
  id: string;
  label: string;
  tabs: Tab[];
};

export default function MultiPageWithFooterTabs() {
  const [pages, setPages] = useState<Page[]>([
    {
      id: 'page1',
      label: 'Page 1',
      tabs: [
        { id: 'tab1', label: 'Tab 1', content: <p>Content for Page 1 - Tab 1</p> },
      ],
    },
  ]);
  const [activePageId, setActivePageId] = useState('page1');
  const [activeTabId, setActiveTabId] = useState('tab1');

  // Helper to generate unique IDs
  const generateId = (prefix: string) => prefix + Math.random().toString(36).substr(2, 9);

  // Get active page and tabs
  const activePage = pages.find((p) => p.id === activePageId)!;

  // Get active tab content
  const activeTab = activePage.tabs.find((t) => t.id === activeTabId);

  // When page changes, reset active tab to first tab of that page
  const handlePageChange = (pageId: string) => {
    setActivePageId(pageId);
    const page = pages.find((p) => p.id === pageId);
    if (page && page.tabs.length > 0) {
      setActiveTabId(page.tabs[0].id);
    } else {
      setActiveTabId('');
    }
  };

  // Add new page
  const addPage = () => {
    const newPageId = generateId('page');
    const newTabId = generateId('tab');
    const newPage: Page = {
      id: newPageId,
      label: `Page ${pages.length + 1}`,
      tabs: [
        { id: newTabId, label: 'Tab 1', content: <p>Content for {`Page ${pages.length + 1}`} - Tab 1</p> },
      ],
    };
    setPages([...pages, newPage]);
    setActivePageId(newPageId);
    setActiveTabId(newTabId);
  };

  // Add new tab to active page
  const addTab = () => {
    const newTabId = generateId('tab');
    const newTabLabel = `Tab ${activePage.tabs.length + 1}`;
    const newTab: Tab = {
      id: newTabId,
      label: newTabLabel,
      content: <p>Content for {activePage.label} - {newTabLabel}</p>,
    };
    const updatedPages = pages.map((p) =>
      p.id === activePageId ? { ...p, tabs: [...p.tabs, newTab] } : p
    );
    setPages(updatedPages);
    setActiveTabId(newTabId);
  };

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Tabs at top for active page */}
      <nav style={{ padding: 10, borderBottom: '1px solid #ccc', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', gap: 10 }}>
        {activePage.tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTabId === tab.id ? '#0078d4' : '#e1e1e1',
              color: activeTabId === tab.id ? 'white' : '#333',
              fontWeight: activeTabId === tab.id ? 'bold' : 'normal',
              boxShadow: activeTabId === tab.id ? '0 0 8px rgba(0,120,212,0.6)' : 'none',
              transition: 'background-color 0.3s, box-shadow 0.3s',
            }}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={addTab}
          style={{
            padding: '8px 12px',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: '#28a745',
            color: 'white',
            fontWeight: 'bold',
            fontSize: 18,
            lineHeight: 1,
            userSelect: 'none',
          }}
          title="Add Tab"
        >
          +
        </button>
      </nav>

      {/* Page Content */}
      <main style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
        <h1>{activePage.label}</h1>
        <div style={{ minHeight: 200, border: '1px solid #ccc', borderRadius: 6, padding: 20 }}>
          {activeTab ? activeTab.content : <p>No content</p>}
        </div>
      </main>

      {/* Footer with pages and add page button */}
      <footer style={{ borderTop: '1px solid #ccc', padding: 10, backgroundColor: '#f9f9f9', display: 'flex', justifyContent: 'center', gap: 10 }}>
        {pages.map((page, index) => (
          <button
            key={page.id}
            onClick={() => handlePageChange(page.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activePageId === page.id ? '#0078d4' : '#e1e1e1',
              color: activePageId === page.id ? 'white' : '#333',
              fontWeight: activePageId === page.id ? 'bold' : 'normal',
              boxShadow: activePageId === page.id ? '0 0 8px rgba(0,120,212,0.6)' : 'none',
              transition: 'background-color 0.3s, box-shadow 0.3s',
            }}
          >
            {page.label}
          </button>
        ))}
        <button
          onClick={addPage}
          style={{
            padding: '8px 12px',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: '#0078d4',
            color: 'white',
            fontWeight: 'bold',
            fontSize: 18,
            lineHeight: 1,
            userSelect: 'none',
          }}
          title="Add Page"
        >
          +
        </button>
      </footer>
    </div>
  );
}