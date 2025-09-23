
import React, { useState, useRef, useEffect } from 'react';

const DashboardLayout = () => {
  const [panels, setPanels] = useState([
    { id: 1, title: 'Active Visitors', content: 'Real-time visitor statistics' },
    { id: 2, title: 'Traffic History', content: 'Website traffic trends over time' },
    { id: 3, title: 'Usage Statistics', content: 'Resource utilization metrics' }
  ]);
  
  const [draggedPanel, setDraggedPanel] = useState(null);
  const [resizingPanel, setResizingPanel] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [panelSizes, setPanelSizes] = useState({});
  const panelRefs = useRef({});

  const addPanel = () => {
    const newId = panels.length > 0 ? Math.max(...panels.map(p => p.id)) + 1 : 1;
    setPanels([
      ...panels,
      { 
        id: newId, 
        title: `New Panel ${newId}`, 
        content: `Content for panel ${newId}` 
      }
    ]);
  };

  const removePanel = () => {
    if (panels.length > 0) {
      const updatedPanels = [...panels];
      updatedPanels.pop();
      setPanels(updatedPanels);
    }
  };

  const handleDragStart = (e, panel) => {
    setDraggedPanel(panel);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetPanel) => {
    e.preventDefault();
    if (draggedPanel && draggedPanel.id !== targetPanel.id) {
      const draggedIndex = panels.findIndex(p => p.id === draggedPanel.id);
      const targetIndex = panels.findIndex(p => p.id === targetPanel.id);
      
      const newPanels = [...panels];
      const [removed] = newPanels.splice(draggedIndex, 1);
      newPanels.splice(targetIndex, 0, removed);
      
      setPanels(newPanels);
    }
    setDraggedPanel(null);
  };

  const handleResizeMouseDown = (e, panelId) => {
    e.stopPropagation();
    setResizingPanel(panelId);
  };

  const handleMouseMove = (e) => {
    if (resizingPanel) {
      // In a real implementation, this would adjust panel dimensions
      // For this demo, we'll just show the resizing effect
    }
  };

  const handleMouseUp = () => {
    setResizingPanel(null);
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingPanel]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">React Dashboard Layout</h1>
          <p className="text-gray-600">Build responsive dashboards with ease</p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
          <div className="flex flex-wrap gap-3 md:gap-4 mb-6">
            <button 
              onClick={addPanel}
              className="px-3 py-2 md:px-4 md:py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm md:text-base"
            >
              Add Panel
            </button>
            <button 
              onClick={removePanel}
              className="px-3 py-2 md:px-4 md:py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition text-sm md:text-base"
            >
              Remove Panel
            </button>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-2 md:px-4 md:py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition text-sm md:text-base"
            >
              {isEditing ? 'Save Layout' : 'Edit Layout'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {panels.map((panel) => (
              <div
                key={panel.id}
                ref={el => panelRefs.current[panel.id] = el}
                draggable={isEditing}
                onDragStart={(e) => handleDragStart(e, panel)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, panel)}
                className={`bg-white border rounded-lg shadow-sm overflow-hidden transition-all duration-200 ${
                  draggedPanel?.id === panel.id ? 'opacity-50 ring-2 ring-blue-400' : ''
                } ${isEditing ? 'cursor-move hover:shadow-md' : ''}`}
              >
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b flex justify-between items-center">
                  <h3 className="font-semibold text-gray-700">{panel.title}</h3>
                  <div 
                    className="w-3 h-3 cursor-se-resize bg-gray-400 hover:bg-gray-600 rounded-full"
                    onMouseDown={(e) => handleResizeMouseDown(e, panel.id)}
                  ></div>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 mb-3">{panel.content}</p>
                  <div className="h-32 bg-gradient-to-r from-blue-50 to-indigo-50 rounded flex items-center justify-center border border-gray-200">
                    <div className="text-center">
                      <div className="inline-block bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                      <p className="mt-2 text-gray-500 text-sm">Chart Area</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Dashboard Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r">
              <h3 className="font-semibold text-blue-700">Drag & Drop</h3>
              <p className="text-gray-600 text-sm">Easily rearrange panels with intuitive drag-and-drop</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 rounded-r">
              <h3 className="font-semibold text-green-700">Resizable Panels</h3>
              <p className="text-gray-600 text-sm">Adjust panel sizes to fit your content needs</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50 rounded-r">
              <h3 className="font-semibold text-purple-700">Dynamic Management</h3>
              <p className="text-gray-600 text-sm">Add or remove panels on the fly</p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50 rounded-r">
              <h3 className="font-semibold text-yellow-700">Responsive Design</h3>
              <p className="text-gray-600 text-sm">Adapts to all screen sizes automatically</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 rounded-r">
              <h3 className="font-semibold text-red-700">Editable Layout</h3>
              <p className="text-gray-600 text-sm">Toggle edit mode to customize your dashboard</p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50 rounded-r">
              <h3 className="font-semibold text-indigo-700">Predefined Templates</h3>
              <p className="text-gray-600 text-sm">Choose from various layout templates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;