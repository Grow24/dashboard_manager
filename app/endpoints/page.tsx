'use client';

import { useState } from 'react';
import { FaCog } from 'react-icons/fa';
import { HiMenuAlt2 } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardContent
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip";

const ResponsiveGridLayout = WidthProvider(Responsive);
const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

const originalData = [
  { name: 'Jan', users: 10 },
  { name: 'Feb', users: 20 },
  { name: 'Mar', users: 30 },
  { name: 'Apr', users: 40 },
  { name: 'May', users: 50 },
  { name: 'Jun', users: 60 },
  { name: 'Jul', users: 70 },
  { name: 'Aug', users: 80 },
  { name: 'Sep', users: 90 },
  { name: 'Oct', users: 100 },
];

export default function Page() {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedNew, setCollapsedNew] = useState(false);
  const [selectedPanels, setSelectedPanels] = useState({
    panel1: true,
    panel2: true,
    panel3: true,
    panel4: true,
    panel5: true,
  });

  const handlePanelChange = (panel) => {
    setSelectedPanels((prev) => ({
      ...prev,
      [panel]: !prev[panel],
    }));
  };

  const generateLayouts = () => {
    const baseLayouts = [];
    const panelWidth = 2;
    const gridCols = 6;
    let currentX = 0;
    let currentY = 0;
    let maxHeightInRow = 0;

    Object.entries(selectedPanels).forEach(([key, visible]) => {
      if (!visible) return;

      const panelId = `panel-${key.slice(-1)}`;
      const panelHeight = key === 'panel4' || key === 'panel5' ? 4 : 3;

      if (currentX + panelWidth > gridCols) {
        currentX = 0;
        currentY += maxHeightInRow;
        maxHeightInRow = 0;
      }

      baseLayouts.push({
        i: panelId,
        x: currentX,
        y: currentY,
        w: panelWidth,
        h: panelHeight,
      });

      currentX += panelWidth;
      maxHeightInRow = Math.max(maxHeightInRow, panelHeight);
    });

    return { lg: baseLayouts };
  };

  const Panel = ({ title, children, panelKey }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
      <Card className="relative">
        <CardHeader className="flex justify-between items-center mb-2 panel-header cursor-move">
          <h2 className="text-lg font-medium">{title}</h2>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-600 hover:text-black"
            >
              &#8942;
            </Button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-50 py-1"
                >
                  <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => alert('hiiii')}>Edit</Button>
                  <Button variant="ghost" className="w-full justify-start text-sm">Delete</Button>
                  <Button variant="ghost" className="w-full justify-start text-sm">Details</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Home &gt; <span className="text-black font-medium">Support</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <FaCog className="text-xl text-gray-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </header>

        <main className="flex-1 overflow-auto p-10 bg-gray-50">
          <ResponsiveGridLayout
            className="layout mb-10"
            layouts={generateLayouts()}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
            cols={{ lg: 6, md: 4, sm: 2, xs: 1 }}
            rowHeight={80}
            draggableHandle=".panel-header"
            compactType="vertical"
            preventCollision={true}
          >
            {selectedPanels.panel1 && (
              <div key="panel-1">
                <Panel title="Monthly Active Users" panelKey="panel1">
                  <Panel1 />
                </Panel>
              </div>
            )}
            {/* Other panels can be rendered similarly */}
          </ResponsiveGridLayout>
        </main>
      </div>
    </div>
  );
}

function Panel1() {
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  const filtered = originalData.filter((d) => {
    const aboveMin = min === '' || d.users >= Number(min);
    const belowMax = max === '' || d.users <= Number(max);
    return aboveMin && belowMax;
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <Label htmlFor="min">Min Users</Label>
          <Input type="number" id="min" value={min} onChange={(e) => setMin(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label htmlFor="max">Max Users</Label>
          <Input type="number" id="max" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
      </div>
      <div style={{ height: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip />
            <Legend />
            <Bar dataKey="users" fill="#6366F1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
