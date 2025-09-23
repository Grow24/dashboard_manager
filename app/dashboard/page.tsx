'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaCog } from 'react-icons/fa';
import { HiMenuAlt2 } from 'react-icons/hi';

export default function SupportPage() {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { label: 'Dashboard', icon: '📊', href: '/dashboard' },
    { label: 'Endpoints', icon: '🧩', href: '/endpoints' },
    { label: 'Leads', icon: '👥', href: '/leads' },
    { label: 'Logs', icon: '📄', href: '/logs' },
    { label: 'Bar chart', icon: '📚', href: '/documentation' },
    { label: 'Support', icon: '🛠️', href: '/support' },
  ];

    return (
        <div className="min-h-screen grid grid-cols-[250px_1fr] bg-gray-50">
    
          {/* Sidebar */}
          <aside
        className={`${
          collapsed ? 'w-20' : 'w-60'
        } transition-all duration-300 bg-white border-r h-screen flex flex-col justify-between py-6`}
      >
        <div>
          {/* Top toggle + Logo */}
          <div className="flex items-center justify-between px-4 mb-6">
            <span className="text-xl font-bold">
              {collapsed ? 'I' : 'ISM1'}
            </span>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-500"
            >
              <HiMenuAlt2 size={20} />
            </button>
          </div>

          {/* Nav */}
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 p-2 mx-2 rounded-lg hover:bg-gray-100 ${
                  item.href === '/endpoints' ? 'bg-gray-200 font-semibold' : ''
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="px-4 text-sm text-gray-400">
          {!collapsed && <p className="mb-2 font-medium">Account Information</p>}
          <p>© 2025</p>
        </div>
      </aside>
    
          {/* Main Area */}
          <div className="flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Home &gt; <span className="text-black font-medium">Dashboard</span>
              </div>
              <FaCog className="text-xl text-gray-600 cursor-pointer" />
            </header>
    
            {/* Main content */}
            <main className="flex-1 overflow-auto p-10 bg-gray-50">
              <h1 className="text-xl font-semibold mb-6">
              Dashboard: <span className="text-gray-600">Get help with Dashboard</span>
              </h1>
    
              <form className="space-y-6 max-w-2xl">
                <div>
                  <label className="block font-medium mb-1">Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="Your email"
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">How can we help?</label>
                  <textarea
                    rows={4}
                    placeholder="Please describe in detail how we can help."
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
                <button type="submit" className="bg-black text-white px-6 py-2 rounded-md">
                  Submit
                </button>
              </form>
            </main>
    
            {/* Footer */}
            <footer className="bg-white border-t px-6 py-3 text-sm text-gray-500">
              © intelligentsalesman.com, 2025 — All rights reserved.
            </footer>
          </div>
        </div>
      );
}
