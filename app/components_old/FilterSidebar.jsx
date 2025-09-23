'use client';

import { HiMenuAlt2 } from 'react-icons/hi';

export default function FilterSidebar({
  collapsedNew,
  setCollapsedNew,
  minUsers,
  setMinUsers,
  maxUsers,
  setMaxUsers,
  selectedMonths,
  handleMonthChange,
  originalData
}) {
  return (
    <aside className={`${collapsedNew ? 'w-20' : 'w-60'} transition-all duration-300 bg-white border-r h-screen flex flex-col justify-between py-6`}>
      <div>
        <div className="flex items-center justify-between px-4 mb-6">
          <span className="text-xl font-bold">{collapsedNew ? 'I' : 'Filters'}</span>
          <button onClick={() => setCollapsedNew(!collapsedNew)} className="text-gray-500 cursor-pointer">
            <HiMenuAlt2 size={20} />
          </button>
        </div>

        <nav className="space-y-4 px-4 text-sm">
          <div>
            <label className="block mb-1 font-medium">Min Users</label>
            <input
              type="number"
              className="w-full border px-2 py-1 rounded"
              value={minUsers}
              onChange={(e) => setMinUsers(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Max Users</label>
            <input
              type="number"
              className="w-full border px-2 py-1 rounded"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Select Months</label>
            <div className="space-y-1">
              {originalData.map((item) => (
                <label key={item.name} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedMonths.includes(item.name)}
                    onChange={() => handleMonthChange(item.name)}
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
}
