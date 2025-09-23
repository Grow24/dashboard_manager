import React, { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { CustomStackedTooltip } from "./CustomStackedTooltip";
import { DrillAcrossTable } from "./DrillAcrossTable";
import { productColors, stateColors } from "@/constants/colors";

export default function DrillableBarChart({
  drillData,
  productData,
  stateData,
  stackingMode,
  setStackingMode,
  drillAcross,
  setDrillAcross,
  contextMenu,
  setContextMenu,
  submenuVisible,
  setSubmenuVisible,
  contextMenuContainer,
}) {
  const chartContainerRef = useRef(null);
  const [productDrillAcross, setProductDrillAcross] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        contextMenu.show &&
        !e.target.closest(".context-menu") &&
        !e.target.closest(".submenu")
      ) {
        setContextMenu({ ...contextMenu, show: false });
        setSubmenuVisible({
          stackBar: false,
          drillAcross: false,
          stackBarProduct: false,
          stackBarState: false,
          drillAcrossProduct: false,
          drillAcrossState: false,
          productDrillAcross: false,
        });
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu, setContextMenu, setSubmenuVisible]);

  // ... (handlers for context menu, stacking, drill across, etc. -- copy from your code)

  // Get keys and colors for current stacking mode
  const getKeysAndColors = () => {
    if (stackingMode?.type === "state") {
      const allStates = new Set();
      Object.values(stateData).forEach((sList) =>
        sList.forEach((s) => allStates.add(s.state))
      );
      return {
        keys: Array.from(allStates),
        colors: stateColors,
      };
    }
    const allProducts = new Set();
    Object.values(productData).forEach((pList) =>
      pList.forEach((p) => allProducts.add(p.product))
    );
    return {
      keys: Array.from(allProducts),
      colors: productColors,
    };
  };

  const isMonthStacked = (month) => {
    if (!stackingMode) return false;
    if (stackingMode.scope === "all") return true;
    return stackingMode.month === month;
  };

  // Build chart data with all keys present and uv zeroed for stacked months
  const chartData = drillData.map((d) => {
    const base = { name: d.name };
    const { keys } = getKeysAndColors();
    keys.forEach((key) => { base[key] = 0; });
    base.uv = 0;
    if (isMonthStacked(d.name)) {
      const sourceData = stackingMode?.type === "product" ? productData : stateData;
      const breakdown = sourceData[d.name] || [];
      breakdown.forEach((item) => {
        const key = stackingMode?.type === "product" ? item.product : item.state;
        base[key] = item.value;
      });
    } else {
      base.uv = d.uv;
    }
    return base;
  });

  const { keys, colors } = getKeysAndColors();

  // ... (context menu rendering, drill across rendering, etc. -- copy from your code)

  // On right-click, get mouse position relative to viewport (not chart container)
  const handleCellContextMenu = (e, entry) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      data: entry
    });
    setSubmenuVisible({
      stackBar: false,
      drillAcross: false,
      stackBarProduct: false,
      stackBarState: false,
      drillAcrossProduct: false,
      drillAcrossState: false,
      productDrillAcross: false,
    });
  };

  // ... (contextMenuNode, renderDrillAcrossPanel, renderProductDrillAcrossChart, etc.)

  return (
    <div ref={chartContainerRef} className="relative">
      {/* ... Reset button, context menu, etc. */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          barCategoryGap="20%"
          barGap={4}
          margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" interval={0} />
          <YAxis />
          <ChartTooltip content={<CustomStackedTooltip />} />
          {keys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="stack"
              fill={colors[key] || "#999"}
              isAnimationActive={false}
              maxBarSize={40}
            />
          ))}
          <Bar
            dataKey="uv"
            maxBarSize={40}
            isAnimationActive={false}
          >
            {drillData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill="#6366F1"
                onContextMenu={(e) => handleCellContextMenu(e, entry)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* ... DrillAcrossTable, product-wise chart, contextMenuNode */}
    </div>
  );
}