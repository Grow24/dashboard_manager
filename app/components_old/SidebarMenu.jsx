'use client';

import Link from 'next/link';
import { HiMenuAlt2 } from 'react-icons/hi';

export default function SidebarMenu({ collapsed, setCollapsed }) {
  const menuItems = [
    { label: 'Dashboard', icon: '📊', href: '/dashboard' },
    { label: 'Endpoints', icon: '🧩', href: '/endpoints' },
    { label: 'Leads', icon: '👥', href: '/leads' },
    { label: 'Logs', icon: '📄', href: '/logs' },
    { label: 'Bar chart', icon: '📚', href: '/documentation' },
    { label: 'Support', icon: '🛠️', href: '/support' },
  ];

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-60'} transition-all duration-300 bg-white border-r h-screen flex flex-col justify-between py-6`}>
      <div>
        <div className="flex items-center justify-between px-4 mb-6">
          <span className="text-xl font-bold">{collapsed ? 'I' : 'ISM1'}</span>
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 cursor-pointer">
            <HiMenuAlt2 size={20} />
          </button>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-2 mx-2 rounded-lg hover:bg-gray-100 ${
                item.href === '/support' ? 'bg-gray-200 font-semibold' : ''
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>

      <div className="px-4 text-sm text-gray-400">
        {!collapsed && <p className="mb-2 font-medium">Account Information</p>}
        <p>© 2025</p>
      </div>
    </aside>
  );
}
