'use client';

import { Responsive, WidthProvider } from 'react-grid-layout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { useState } from 'react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Panel = ({ title, children }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white p-4 rounded-xl shadow-md relative">
      <div className="flex justify-between items-center mb-2 panel-header cursor-move">
        <h2 className="text-lg font-medium">{title}</h2>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-gray-600 hover:text-black focus:outline-none"
          >
            &#8942; 
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-50 py-1">
              <button
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => alert('hiiii')}
              >
                Edit
              </button>
              <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                Delete
              </button>
              <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                Details
              </button>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

export default function MainContent({ filteredData }) {
  const [layouts, setLayouts] = useState({
    lg: [
      { i: 'panel-1', x: 0, y: 0, w: 2, h: 4 },
      { i: 'panel-2', x: 2, y: 0, w: 2, h: 4 },
      { i: 'panel-3', x: 4, y: 0, w: 2, h: 4 },
    ]
  });

  return (
    <main className="flex-1 overflow-auto p-10 bg-gray-50">
      <h1 className="text-xl font-semibold mb-6">
        Charts: <span className="text-gray-600">Bar, Pie, and Area Visualizations</span>
      </h1>

      <style jsx global>{`
        .react-grid-placeholder {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 6, md: 4, sm: 2, xs: 1 }}
        rowHeight={80}
        onLayoutChange={(layout, allLayouts) => setLayouts(allLayouts)}
        draggableHandle=".panel-header"
        compactType={null}
        preventCollision={true}
      >
        <div key="panel-1">
          <Panel title="Monthly Active Users">
            <div style={{ width: '100%', height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="users" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div key="panel-2">
          <Panel title="User Distribution">
            <div style={{ width: '100%', height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filteredData}
                    dataKey="users"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {filteredData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div key="panel-3">
          <Panel title="User Growth Trend">
            <div style={{ width: '100%', height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" stroke="#6366F1" fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </ResponsiveGridLayout>
    </main>
  );
}
