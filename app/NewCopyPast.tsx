import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Sample data for bar chart
const barData = [
  { name: 'Jan', uv: 400 },
  { name: 'Feb', uv: 300 },
  { name: 'Mar', uv: 200 },
  { name: 'Apr', uv: 278 },
  { name: 'May', uv: 189 },
];

// Sample data for pie chart
const pieData = [
  { name: 'Group A', value: 400 },
  { name: 'Group B', value: 300 },
  { name: 'Group C', value: 300 },
  { name: 'Group D', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Table component
const TableView = () => {
  const rows = [
    { id: 1, name: 'Alice', age: 25 },
    { id: 2, name: 'Bob', age: 30 },
    { id: 3, name: 'Charlie', age: 35 },
  ];
  return (
    <table className="table-auto border-collapse border border-gray-300 w-full text-sm">
      <thead>
        <tr>
          <th className="border border-gray-300 px-2 py-1">ID</th>
          <th className="border border-gray-300 px-2 py-1">Name</th>
          <th className="border border-gray-300 px-2 py-1">Age</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ id, name, age }) => (
          <tr key={id}>
            <td className="border border-gray-300 px-2 py-1">{id}</td>
            <td className="border border-gray-300 px-2 py-1">{name}</td>
            <td className="border border-gray-300 px-2 py-1">{age}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Components map for rendering by type
const componentsMap = {
  barChart: () => (
    <ResponsiveContainer width={300} height={200}>
      <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <RechartsTooltip />
        <Bar dataKey="uv" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  ),
  pieChart: () => (
    <ResponsiveContainer width={300} height={200}>
      <PieChart>
        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8" label>
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip />
      </PieChart>
    </ResponsiveContainer>
  ),
  tableView: () => <TableView />,
};

export default function GlobalCopyPaste() {
  const [clipboard, setClipboard] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, action: null, content: null });
  const [pastedItems, setPastedItems] = useState([]);

  // Items to copy: store type and label
  const items = [
    { id: 1, type: 'barChart', label: 'Bar Chart' },
    { id: 2, type: 'pieChart', label: 'Pie Chart' },
    { id: 3, type: 'tableView', label: 'Table View' },
  ];

  // Show custom context menu for copy or paste
  const handleContextMenu = (event, action, content = null) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.pageX,
      y: event.pageY,
      action,
      content,
    });
  };

  // Copy action: store the component type
  const handleCopy = () => {
    setClipboard(contextMenu.content);
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Paste action: add pasted item at context menu position
  const handlePaste = () => {
    if (clipboard) {
      setPastedItems(prev => [
        ...prev,
        { id: Date.now(), type: clipboard.type, x: contextMenu.x, y: contextMenu.y },
      ]);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Hide context menu on click elsewhere
  const handleClick = () => {
    if (contextMenu.visible) {
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  // Hide context menu on Escape key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [contextMenu]);

  return (
    <div
      onClick={handleClick}
      onContextMenu={(e) => {
        // If right-click on empty space (not on copy items), show paste menu if clipboard has content
        if (!e.target.closest('.copy-item')) {
          if (clipboard) {
            handleContextMenu(e, 'paste');
          } else {
            e.preventDefault(); // prevent default menu if no clipboard
          }
        }
      }}
      className="relative min-h-screen p-6 select-none"
      style={{ userSelect: contextMenu.visible ? 'none' : 'auto' }}
    >
      <h2 className="text-xl font-bold mb-4">Global Copy-Paste with Charts and Table</h2>

      <div className="flex space-x-4 mb-8">
        {items.map(item => (
          <div
            key={item.id}
            className="copy-item p-4 border rounded cursor-context-menu hover:bg-gray-100"
            onContextMenu={(e) => handleContextMenu(e, 'copy', { type: item.type })}
            style={{ width: 320, height: 220 }}
          >
            {/* Render the actual component preview */}
            {componentsMap[item.type]()}
          </div>
        ))}
      </div>

      {/* Render pasted items absolutely at their positions */}
      {pastedItems.map(({ id, type, x, y }) => (
        <div
          key={id}
          className="absolute p-3 bg-yellow-100 border border-yellow-400 rounded shadow"
          style={{ top: y, left: x, transform: 'translate(-50%, -100%)', pointerEvents: 'auto', width: 320, height: 220 }}
        >
          {componentsMap[type]()}
        </div>
      ))}

      {/* Custom Context Menu */}
      {contextMenu.visible && (
        <div
          className="absolute bg-white border rounded shadow-md p-2 text-sm z-50"
          style={{ transform: 'translate(0, 0)' }}
        >
          {contextMenu.action === 'copy' && (
            <button onClick={handleCopy} className="px-2 py-1 hover:bg-gray-200 rounded">
              Copy
            </button>
          )}
          {contextMenu.action === 'paste' && (
            <button
              onClick={handlePaste}
              className="px-2 py-1 rounded hover:bg-gray-200"
            >
              Paste
            </button>
          )}
        </div>
      )}
    </div>
  );
}