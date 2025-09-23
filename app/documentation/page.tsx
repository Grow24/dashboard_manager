"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MdKeyboardArrowLeft, MdKeyboardArrowRight, MdExpandLess, MdExpandMore } from 'react-icons/md';
import { FaCog, FaTachometerAlt, FaProjectDiagram, FaUsers, FaFileAlt, FaFile, FaStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FiMoreVertical, FiTrash2, FiEdit, FiScissors, FiMove } from 'react-icons/fi';

import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

import {
  Tooltip as UITooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

const sampleData = [
  { customerName: 'Alice', orderDate: '2025-05-01', product: 'Widget', quantity: 10, price: 25, status: 'Active' },
  { customerName: 'Bob', orderDate: '2025-05-05', product: 'Gadget', quantity: 5, price: 40, status: 'Completed' },
  { customerName: 'Charlie', orderDate: '2025-05-10', product: 'Widget', quantity: 7, price: 25, status: 'Pending' },
  { customerName: 'Diana', orderDate: '2025-05-15', product: 'Thingamajig', quantity: 3, price: 60, status: 'Active' },
];

const allFields = ['customerName', 'orderDate', 'product', 'quantity', 'price', 'status'];

const fieldLabels: Record<string, string> = {
  customerName: 'Customer Name',
  orderDate: 'Order Date',
  product: 'Product',
  quantity: 'Quantity',
  price: 'Price',
  status: 'Status',
};

function ArrowToggle({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (val: boolean) => void }) {
  return (
    <button
      onClick={() => setCollapsed(!collapsed)}
      className="p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
      type="button"
    >
      {collapsed ? (
        <MdKeyboardArrowRight size={30} className="text-gray-700" />
      ) : (
        <MdKeyboardArrowLeft size={30} className="text-gray-700" />
      )}
    </button>
  );
}

interface HoverCardProps {
  title: string;
  value: string;
  width: number;
  height: number;
  onResize: (newWidth: number, newHeight: number, newTop?: number, newLeft?: number) => void;
  selected: boolean;
  onSelect: () => void;
}

const HoverCard: React.FC<HoverCardProps> = ({
  title,
  value,
  width,
  height,
  onResize,
  selected,
  onSelect,
}) => {
  const [hovered, setHovered] = useState(false);
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0 });
  const sizeStart = useRef({ width, height });
  const onResizeRef = useRef(onResize);

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizing.current) return;
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const newWidth = Math.max(150, sizeStart.current.width + dx);
      const newHeight = Math.max(100, sizeStart.current.height + dy);
      onResizeRef.current(newWidth, newHeight);
    }
    function onMouseUp() {
      resizing.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    if (resizing.current) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizing.current]);

  const onResizeMouseDown = (e: React.MouseEvent, corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
  e.preventDefault();
  e.stopPropagation();
  resizing.current = true;
  resizeStart.current = { x: e.clientX, y: e.clientY };
  sizeStart.current = { width, height };
  positionStart.current = { top: cardTop, left: cardLeft }; // You need to track card's current top and left

  function onMouseMove(e: MouseEvent) {
    if (!resizing.current) return;
    const dx = e.clientX - resizeStart.current.x;
    const dy = e.clientY - resizeStart.current.y;

    let newWidth = sizeStart.current.width;
    let newHeight = sizeStart.current.height;
    let newTop = positionStart.current.top;
    let newLeft = positionStart.current.left;

    switch (corner) {
      case 'bottom-right':
        newWidth = Math.max(150, sizeStart.current.width + dx);
        newHeight = Math.max(100, sizeStart.current.height + dy);
        break;
      case 'bottom-left':
        newWidth = Math.max(150, sizeStart.current.width - dx);
        newHeight = Math.max(100, sizeStart.current.height + dy);
        newLeft = positionStart.current.left + dx;
        break;
      case 'top-right':
        newWidth = Math.max(150, sizeStart.current.width + dx);
        newHeight = Math.max(100, sizeStart.current.height - dy);
        newTop = positionStart.current.top + dy;
        break;
      case 'top-left':
        newWidth = Math.max(150, sizeStart.current.width - dx);
        newHeight = Math.max(100, sizeStart.current.height - dy);
        newLeft = positionStart.current.left + dx;
        newTop = positionStart.current.top + dy;
        break;
    }

    // Update position and size
    onResizeRef.current(newWidth, newHeight, newTop, newLeft);
  }

  function onMouseUp() {
    resizing.current = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

  // Show hover effects only if no card is selected
  const showHoverEffects = !selected && hovered;

  return (
    <div 
      className={`relative bg-white rounded-lg shadow p-6 cursor-default select-none border-2 ${
        selected
          ? 'border-solid border-indigo-700'
          : showHoverEffects
          ? 'border-dotted border-indigo-500'
          : 'border-transparent'
      }`}
      style={{ width, height, flexShrink: 0, margin: 8, userSelect: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={e => {
        e.stopPropagation(); // Prevent event bubbling to document
        onSelect();
      }}
    >
      {/* Drag icon top-left */}
      {(selected || showHoverEffects) && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 cursor-move text-indigo-600" title="Drag to move">
  <FiMove size={20} />
</div>
      )}

      {/* Icons top-right in a row */}
      {(selected || showHoverEffects) && (
        <div className="absolute top-2 right-2 flex space-x-2">
  <button
    className="p-1 rounded hover:bg-red-100 text-red-600"
    aria-label="Delete"
    type="button"
    onClick={() => alert("Delete button clicked")}
  >
    <FiTrash2 size={18} />
  </button>
  <button
    className="p-1 rounded hover:bg-blue-100 text-blue-600"
    aria-label="Edit"
    type="button"
    onClick={() => alert("Edit button clicked")}
  >
    <FiEdit size={18} />
  </button>
  <button
    className="p-1 rounded hover:bg-yellow-100 text-yellow-600"
    aria-label="Cut/Paste"
    type="button"
    onClick={() => alert("Cut/Paste button clicked")}
  >
    <FiScissors size={18} />
  </button>
  <button
    className="p-1 rounded hover:bg-gray-200"
    aria-label="More options"
    type="button"
    onClick={() => alert("More options button clicked")}
  >
    <FiMoreVertical size={20} />
  </button>
</div>
      )}

      {/* Content */}
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>

      {/* Resize handle bottom-right */}
      {(selected || showHoverEffects) && (
        <div
      className="absolute top-0 left-0 w-4 h-4 bg-indigo-500 rounded cursor-nwse-resize"
      onMouseDown={e => onResizeMouseDown(e, 'top-left')}
    />
    {/* Top-right */}
    <div
      className="absolute top-0 right-0 w-4 h-4 bg-indigo-500 rounded cursor-nesw-resize"
      onMouseDown={e => onResizeMouseDown(e, 'top-right')}
    />
    {/* Bottom-left */}
    <div
      className="absolute bottom-0 left-0 w-4 h-4 bg-indigo-500 rounded cursor-nesw-resize"
      onMouseDown={e => onResizeMouseDown(e, 'bottom-left')}
    />
    {/* Bottom-right */}
    <div
      className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-500 rounded cursor-nwse-resize"
      onMouseDown={e => onResizeMouseDown(e, 'bottom-right')}
    />
      )}
    </div>
  );
};

const NewPageSliders = () => {
  const [collapsedFields, setCollapsedFields] = useState(false);
  const [collapsedVisualizations, setCollapsedVisualizations] = useState(false);
  const [collapsedFilter, setCollapsedFilter] = useState(false);

  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedVisualization, setSelectedVisualization] = useState<'Bar Chart' | 'Line Chart' | 'Pie Chart' | 'Table'>('Bar Chart');

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const filteredData = sampleData.filter(item => {
    const date = new Date(item.orderDate);
    if (filterDateFrom && date < new Date(filterDateFrom)) return false;
    if (filterDateTo && date > new Date(filterDateTo)) return false;
    if (filterStatus !== 'All' && item.status !== filterStatus) return false;
    return true;
  });

  const chartData = React.useMemo(() => {
    if (!selectedField) return null;

    const groups: Record<string, number> = {};
    filteredData.forEach(item => {
      const key = String(item[selectedField as keyof typeof item]);
      if (selectedField === 'quantity' || selectedField === 'price') {
        groups[key] = (groups[key] || 0) + Number(item[selectedField as keyof typeof item]);
      } else {
        groups[key] = (groups[key] || 0) + 1;
      }
    });

    const labels = Object.keys(groups);
    const values = Object.values(groups);

    return {
      labels,
      datasets: [
        {
          label: fieldLabels[selectedField],
          data: values,
          backgroundColor: 'rgba(99, 102, 241, 0.6)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [selectedField, filteredData]);

  const renderVisualization = () => {
    if (!selectedField) return <p>Please select a field in the Fields slider.</p>;
    if (!chartData) return <p>No data available for the selected filters.</p>;

    switch (selectedVisualization) {
      case 'Bar Chart':
        return <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />;
      case 'Line Chart':
        return <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />;
      case 'Pie Chart':
        return <Pie data={chartData} options={{ responsive: true, plugins: { legend: { position: 'right' } } }} />;
      case 'Table':
        return (
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{fieldLabels[selectedField]}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chartData.labels.map((label, idx) => (
                <tr key={label}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{label}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{chartData.datasets[0].data[idx]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen">
      {/* Fields Slider */}
      <aside className={`${collapsedFields ? 'w-20' : 'w-64'} transition-all duration-300 bg-white border-r flex flex-col py-6`}>
        <div className="flex items-center justify-between px-4 mb-6">
          <ArrowToggle collapsed={collapsedFields} setCollapsed={setCollapsedFields} />
          {!collapsedFields && <span className="font-semibold text-lg">Fields11</span>}
        </div>
        {!collapsedFields && (
          <div className="flex flex-col space-y-3 px-4 overflow-auto">
            {allFields.map(field => (
              <label key={field} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox accent-indigo-600"
                  checked={selectedField === field}
                  onChange={() => setSelectedField(selectedField === field ? null : field)}
                />
                <span>{fieldLabels[field]}</span>
              </label>
            ))}
          </div>
        )}
      </aside>

      {/* Visualizations Slider */}
      <aside className={`${collapsedVisualizations ? 'w-20' : 'w-64'} transition-all duration-300 bg-white border-r flex flex-col py-6`}>
        <div className="flex items-center justify-between px-4 mb-6">
          <ArrowToggle collapsed={collapsedVisualizations} setCollapsed={setCollapsedVisualizations} />
          {!collapsedVisualizations && <span className="font-semibold text-lg">Visualizations</span>}
        </div>
        {!collapsedVisualizations && (
          <div className="flex flex-col space-y-3 px-4 overflow-auto">
            {['Bar Chart', 'Line Chart', 'Pie Chart', 'Table'].map(vis => (
              <label key={vis} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="visualization"
                  className="form-radio accent-indigo-600"
                  checked={selectedVisualization === vis}
                  onChange={() => setSelectedVisualization(vis as any)}
                  disabled={!selectedField}
                />
                <span>{vis}</span>
              </label>
            ))}
          </div>
        )}
      </aside>

      {/* Filter Slider */}
      <aside className={`${collapsedFilter ? 'w-20' : 'w-64'} transition-all duration-300 bg-white flex flex-col py-6`}>
        <div className="flex items-center justify-between px-4 mb-6">
          <ArrowToggle collapsed={collapsedFilter} setCollapsed={setCollapsedFilter} />
          {!collapsedFilter && <span className="font-semibold text-lg">Filter</span>}
        </div>
        {!collapsedFilter && (
          <div className="flex flex-col space-y-4 px-4 overflow-auto">
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                id="dateFrom"
                className="border rounded p-2 w-full"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                id="dateTo"
                className="border rounded p-2 w-full"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="status"
                className="border rounded p-2 w-full"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option>All</option>
                <option>Active</option>
                <option>Completed</option>
                <option>Pending</option>
              </select>
            </div>
          </div>
        )}
      </aside>

      {/* Content area */}
      <main className="flex-1 p-10 bg-gray-50 overflow-auto">{renderVisualization()}</main>
    </div>
  );
};

export default function Page() {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedNew, setCollapsedNew] = useState(false);
  const [collapsedSubFilters, setCollapsedSubFilters] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('Dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const toggleSubMenu = (menuName: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };

  const menuItems = [
    { name: 'Dashboard', icon: <FaTachometerAlt /> },
    {
      name: 'Projects',
      icon: <FaProjectDiagram />,
      subMenu: [
        { name: 'Active Projects' },
        { name: 'Archived Projects' },
      ],
    },
    {
      name: 'Teams',
      icon: <FaUsers />,
      subMenu: [
        { name: 'Engineering' },
        { name: 'Design' },
        { name: 'Marketing' },
      ],
    },
    { name: 'Form Workflow', icon: <FaFileAlt /> },
    { name: 'Reports', icon: <FaFileAlt /> },
    { name: 'New Page', icon: <FaFile /> },
  ];

  const renderMenuItem = (item: any) => {
    const isExpanded = expandedMenus.includes(item.name);
    const hasSubMenu = Array.isArray(item.subMenu) && item.subMenu.length > 0;

    return (
      <div key={item.name}>
        <button
          onClick={() => {
            if (hasSubMenu) {
              toggleSubMenu(item.name);
            } else {
              setSelectedMenu(item.name);
            }
          }}
          className={`flex items-center justify-between w-full py-2 px-3 rounded hover:bg-gray-100 text-gray-700 ${
            selectedMenu === item.name ? 'bg-indigo-100 font-semibold' : ''
          }`}
          aria-current={selectedMenu === item.name ? 'page' : undefined}
          type="button"
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg">{item.icon}</span>
            {!collapsed && <span>{item.name}</span>}
          </div>
          {!collapsed && hasSubMenu && (
            <span className="text-gray-500">
              {isExpanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
            </span>
          )}
        </button>

        {!collapsed && hasSubMenu && isExpanded && (
          <div className="ml-8 flex flex-col space-y-1 mt-1">
            {item.subMenu.map((sub: any) => (
              <button
                key={sub.name}
                onClick={() => setSelectedMenu(sub.name)}
                className={`text-gray-600 hover:text-gray-900 text-sm py-1 rounded pl-2 text-left ${
                  selectedMenu === sub.name ? 'font-semibold text-indigo-600' : ''
                }`}
                type="button"
                aria-current={selectedMenu === sub.name ? 'page' : undefined}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
const FormWorkflowContent = () => {
    const data = [
      { id: '#1001', name: 'Form A', created: '2025-05-01', status: 'Active', owner: 'Alice' },
      { id: '#1002', name: 'Form B', created: '2025-05-05', status: 'Inactive', owner: 'Bob' },
      { id: '#1003', name: 'Form C', created: '2025-05-10', status: 'Active', owner: 'Charlie' },
      { id: '#1004', name: 'Form D', created: '2025-05-15', status: 'Pending', owner: 'Diana' },
    ];

    const filteredData = data.filter(item =>
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.owner.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="container">
        <div className="header">Form Workflow</div>

        <div className="mb-6 max-w-md">
          <input
            type="text"
            placeholder="Search forms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length > 0 ? (
                filteredData.map(({ id, name, created, status, owner }) => (
                  <tr key={id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{created}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          status === 'Active' ? 'bg-green-100 text-green-800' :
                          status === 'Inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{owner}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No forms found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
 const ProjectsContent = () => (
    <>
      <div className="header">Security Control</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2>Channels</h2>
          <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry...</p>
        </div>
        <div className="card">
          <h2>Customization</h2>
          <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry...</p>
        </div>
        <div className="card">
          <h2>Automation</h2>
          <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry...</p>
        </div>
        <div className="card">
          <h2>Environment</h2>
          <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry...</p>
        </div>
      </div>
    </>
  );
  const TeamsContent = () => (
    <div className="container">
      <div className="header">Teams</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h2>John Doe</h2>
          <p>Role: Project Manager</p>
          <p>Email: john.doe@example.com</p>
          <p>Phone: +1 234 567 8901</p>
        </div>
        <div className="card">
          <h2>Jane Smith</h2>
          <p>Role: Lead Developer</p>
          <p>Email: jane.smith@example.com</p>
          <p>Phone: +1 234 567 8902</p>
        </div>
        <div className="card">
          <h2>Michael Brown</h2>
          <p>Role: UX Designer</p>
          <p>Email: michael.brown@example.com</p>
          <p>Phone: +1 234 567 8903</p>
        </div>
      </div>
    </div>
  );
  // DashboardContent with free draggable and resizable HoverCards inside container div only
  const DashboardContent = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Store size and position for each card
    const [cards, setCards] = useState({
      totalSales: { width: 250, height: 140, top: 0, left: 0 },
      newCustomers: { width: 250, height: 140, top: 0, left: 270 },
      openTickets: { width: 250, height: 140, top: 160, left: 0 },
      pendingOrders: { width: 250, height: 140, top: 160, left: 270 },
    });

    const [selectedCard, setSelectedCard] = useState<string | null>(null);
    const draggingCard = useRef<string | null>(null);
    const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const cardStartPos = useRef<{ top: number; left: number }>({ top: 0, left: 0 });

    const handleResize = (key: keyof typeof cards, newWidth: number, newHeight: number, newTop?: number, newLeft?: number) => {
  setCards(prev => ({
    ...prev,
    [key]: {
      width: newWidth,
      height: newHeight,
      top: newTop !== undefined ? newTop : prev[key].top,
      left: newLeft !== undefined ? newLeft : prev[key].left,
    },
  }));
};

    const onMouseDown = (key: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      draggingCard.current = key;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      cardStartPos.current = { top: cards[key].top, left: cards[key].left };
      setSelectedCard(key);

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
  if (!draggingCard.current) return;

  const dx = e.clientX - dragStartPos.current.x;
  const dy = e.clientY - dragStartPos.current.y;

  setCards(prev => {
    const card = prev[draggingCard.current!];
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect || !card) {
      return prev; // Return previous state if container or card is undefined
    }

    let newLeft = cardStartPos.current.left + dx;
    let newTop = cardStartPos.current.top + dy;

    // Constrain within container bounds
    newLeft = Math.min(
      Math.max(0, newLeft),
      containerRect.width - card.width
    );
    newTop = Math.min(
      Math.max(0, newTop),
      containerRect.height - card.height
    );

    return {
      ...prev,
      [draggingCard.current!]: {
        ...card,
        left: newLeft,
        top: newTop,
      },
    };
  });
};

    const onMouseUp = () => {
      draggingCard.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    // Clear selection if click outside cards
    const onContainerClickCapture = (e: React.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelectedCard(null);
      }
    };

    return (
      <div
        ref={containerRef}
        onClickCapture={onContainerClickCapture}
        style={{ userSelect: 'none', position: 'relative', height: '500px' }} // Added position: relative and fixed height
        className="border bg-white"
      >
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h2>
          <p className="text-gray-600">Welcome back, User!</p>
        </div>

        <div className="mb-8 max-w-md">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {Object.entries(cards).map(([key, { width, height, top, left }]) => (
          <div
            key={key}
            onMouseDown={onMouseDown(key)}
            style={{
              position: 'absolute',
              top,
              left,
              width,
              height,
              cursor: selectedCard === key ? 'grabbing' : 'grab',
              zIndex: selectedCard === key ? 1000 : 1,
            }}
          >
            <HoverCard
              title={{
                totalSales: 'Total Sales',
                newCustomers: 'New Customers',
                openTickets: 'Open Tickets',
                pendingOrders: 'Pending Orders',
              }[key]}
              value={{
                totalSales: '$25,000',
                newCustomers: '1,200',
                openTickets: '35',
                pendingOrders: '12',
              }[key]}
              width={width}
              height={height}
              onResize={(w, h) => handleResize(key as keyof typeof cards, w, h)}
              selected={selectedCard === key}
              onSelect={() => setSelectedCard(key)}
            />
          </div>
        ))}
      </div>
    );
  };

  const SubFiltersContent = () => (
    <div className="flex flex-col space-y-4 px-4">
      {!collapsedSubFilters && (
        <>
          <label className="block text-sm font-medium text-gray-700">Sub Category</label>
          <select className="border rounded p-2">
            <option>All</option>
            <option>Sub Design</option>
            <option>Sub Development</option>
            <option>Sub Marketing</option>
          </select>

          <label className="block text-sm font-medium text-gray-700">Sub Status</label>
          <select className="border rounded p-2">
            <option>Active</option>
            <option>Completed</option>
            <option>Pending</option>
          </select>
        </>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
          padding: 30px 40px;
        }
        .header {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 30px;
          color: #222;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 30px 40px;
        }
        .card {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 25px 20px;
          box-shadow: 0 1px 4px rgb(0 0 0 / 0.05);
          display: flex;
          flex-direction: column;
        }
        .card h2 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #333;
        }
        .card p {
          font-size: 14px;
          color: #555;
          line-height: 1.5;
          flex-grow: 1;
        }
        input[type="checkbox"], input[type="radio"] {
          accent-color: #6366f1;
        }
        .favorite-bar {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
          z-index: 50;
        }
        .right-panel {
          background: white;
          border-left: 1px solid #ddd;
          width: 280px;
          height: 100vh;
          position: fixed;
          top: 0;
          right: 0;
          padding: 20px;
          box-shadow: -2px 0 8px rgb(0 0 0 / 0.1);
          transition: transform 0.3s ease;
          transform: translateX(100%);
          z-index: 100;
          display: flex;
          flex-direction: column;
        }
        .right-panel.open {
          transform: translateX(0);
        }
        .right-panel-toggle {
          position: fixed;
          top: 60px;
          right: 280px;
          background: #6366f1;
          color: white;
          border-radius: 4px 0 0 4px;
          padding: 8px;
          cursor: pointer;
          z-index: 110;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 4px rgb(0 0 0 / 0.2);
          transition: right 0.3s ease;
        }
        .right-panel-toggle.closed {
          right: 0;
          border-radius: 0 4px 4px 0;
        }
      `}</style>

      <div className="min-h-screen flex flex-col bg-gray-100">
        {/* Favorite icons bar */}
        <div className="favorite-bar">
          <FaStar className="text-yellow-400" size={20} title="Favorite 1" />
          <FaStar className="text-yellow-400" size={20} title="Favorite 2" />
          <FaStar className="text-yellow-400" size={20} title="Favorite 3" />
        </div>

        {/* Top bar */}
        <div className="flex items-center space-x-8 px-6 py-3 bg-white border-b shadow-sm">
          <div
            className="text-xl font-bold text-gray-800 cursor-pointer"
            onClick={() => setSelectedMenu('Dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') setSelectedMenu('Dashboard');
            }}
          >
            MyLogo
          </div>
          <nav className="flex space-x-6 relative">
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
              Home
            </a>
            <div className="relative group">
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium cursor-pointer">
                About
              </a>
              <div className="absolute left-0 mt-2 w-40 bg-white border rounded shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-opacity duration-200 z-10">
                <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                  Our Team
                </a>
                <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                  Our Story
                </a>
                <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                  Careers
                </a>
              </div>
            </div>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
              Contact
            </a>
          </nav>
        </div>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Menu slider */}
          <aside className={`${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-white border-r h-screen flex flex-col py-6`}>
            <div className="flex items-center justify-between px-4 mb-6">
              <ArrowToggle collapsed={collapsed} setCollapsed={setCollapsed} />
              {!collapsed && <span className="font-semibold text-lg">Menu</span>}
            </div>
            <nav className="flex flex-col space-y-2 px-4">
              {menuItems.map(item => (
                <React.Fragment key={item.name}>{renderMenuItem(item)}</React.Fragment>
              ))}
            </nav>
          </aside>

          {/* Sliders or NewPageSliders */}
          {selectedMenu === 'New Page' ? (
            <NewPageSliders />
          ) : (
            <>
              {/* Filter Sidebar */}
              <aside className={`${collapsedNew ? 'w-20' : 'w-64'} transition-all duration-300 bg-white border-r h-screen flex flex-col py-6`}>
                <div className="flex items-center justify-between px-4 mb-6">
                  <ArrowToggle collapsed={collapsedNew} setCollapsed={setCollapsedNew} />
                  {!collapsedNew && <span className="font-semibold text-lg">Filters</span>}
                </div>
                <div className="flex flex-col space-y-4 px-4">
                  {!collapsedNew && (
                    <>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <select className="border rounded p-2">
                        <option>All</option>
                        <option>Design</option>
                        <option>Development</option>
                        <option>Marketing</option>
                      </select>

                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select className="border rounded p-2">
                        <option>Active</option>
                        <option>Completed</option>
                        <option>Pending</option>
                      </select>
                    </>
                  )}
                </div>
              </aside>

              {/* Sub Filters Sidebar */}
              <aside className={`${collapsedSubFilters ? 'w-20' : 'w-64'} transition-all duration-300 bg-white border-r h-screen flex flex-col py-6`}>
                <div className="flex items-center justify-between px-4 mb-6">
                  <ArrowToggle collapsed={collapsedSubFilters} setCollapsed={setCollapsedSubFilters} />
                  {!collapsedSubFilters && <span className="font-semibold text-lg">Sub Filters</span>}
                </div>
                <SubFiltersContent />
              </aside>
            </>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center space-x-4">
                {selectedMenu !== 'New Page' && <ArrowToggle collapsed={collapsed} setCollapsed={setCollapsed} />}
                <h1 className="text-xl font-semibold">{selectedMenu}</h1>
              </div>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button className="variant-ghost size-icon" type="button">
                    <FaCog className="text-xl text-gray-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </UITooltip>
            </header>

            {/* Header Filters (empty for now) */}
            <div className="bg-white border-b px-6 py-3 flex items-center space-x-6"></div>

            {/* Main Dashboard Content */}
            <main className="flex-1 overflow-auto p-10 bg-gray-50">
              {selectedMenu === 'Form Workflow' ? (
                <FormWorkflowContent />
              ) : selectedMenu === 'Teams' ? (
                <TeamsContent />
              ) : selectedMenu === 'Projects' ? (
                <ProjectsContent />
              ) : selectedMenu === 'New Page' ? (
                <NewPageSliders />
              ) : selectedMenu === 'Dashboard' ? (
                <DashboardContent />
              ) : (
                <div></div>
              )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t px-6 py-2 text-sm text-gray-500"></footer>
          </div>

          {/* Right sliding panel */}
          <div className={`right-panel ${rightPanelOpen ? 'open' : ''}`}>
            <h2 className="text-lg font-semibold mb-4">Right Panel</h2>
            <p>This is a sliding panel on the right side.</p>
          </div>

          {/* Toggle button for right panel */}
          <button
            className={`right-panel-toggle ${rightPanelOpen ? '' : 'closed'}`}
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            aria-label={rightPanelOpen ? 'Close right panel' : 'Open right panel'}
            type="button"
          >
            {rightPanelOpen ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>
      </div>
    </>
  );
}