import React from "react";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";

export function ArrowToggle({ collapsed, setCollapsed }) {
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