import React from "react";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";

// ArrowToggle button
function ArrowToggle({ collapsed, setCollapsed }) {
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

export default function LeftSliders({
  collapsed, setCollapsed,
  collapsedNew, setCollapsedNew,
  collapsedSubFilters, setCollapsedSubFilters,
  menuItems, selectedMenu, setSelectedMenu, renderMenuItem,
  minUsers, setMinUsers, maxUsers, setMaxUsers, selectedMonths, handleMonthChange,
  selectedPanels, handlePanelChange, originalData,
  showFilters, setShowFilters,
  HistoryTabContent,
  position, // "left" or "right"
  setPosition, // function to change position
}) {
  // Default to left if not provided
  const sliderPosition = position || "left";

  // Container flex order and border logic
  const containerClass = sliderPosition === "left"
    ? "flex flex-row h-screen"
    : "flex flex-row-reverse h-screen";

  const borderClass = sliderPosition === "left"
    ? "border-r"
    : "border-l";

  return (
    <div className={containerClass}>
      {/* Dropdown to select position */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <select
          value={sliderPosition}
          onChange={e => setPosition(e.target.value)}
          className="border rounded px-2 py-1 bg-white shadow"
        >
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>

      {/* Menu slider */}
      <aside className={`${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-white ${borderClass} flex flex-col py-6`}>
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

      {/* Filters slider */}
      <aside className={`${collapsedNew ? 'w-20' : 'w-64'} transition-all duration-300 bg-white ${borderClass} flex flex-col py-6`}>
        <div className="flex items-center justify-between px-4 mb-6">
          <ArrowToggle collapsed={collapsedNew} setCollapsed={setCollapsedNew} />
          {!collapsedNew && <span className="font-semibold text-lg">Filters</span>}
        </div>
        <div className="flex flex-col space-y-4 px-4">
          {/* ...your filter content here, using props */}
        </div>
      </aside>

      {/* Sub Filters slider */}
      <aside className={`${collapsedSubFilters ? 'w-20' : 'w-64'} transition-all duration-300 bg-white ${borderClass} flex flex-col py-6`}>
        <div className="flex items-center justify-between px-4 mb-6">
          <ArrowToggle collapsed={collapsedSubFilters} setCollapsed={setCollapsedSubFilters} />
          {!collapsedSubFilters && <span className="font-semibold text-lg">Sub Filters</span>}
        </div>
        {/* ...your sub filter content here */}
      </aside>
    </div>
  );
}