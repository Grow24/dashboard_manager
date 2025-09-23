'use client';

import Link from 'next/link';
import { FaCog } from 'react-icons/fa'; // For settings icon (optional)

export default function SupportPage() {
    return (
        <div className="min-h-screen grid grid-cols-[250px_1fr] bg-gray-50">
    
          {/* Sidebar */}
          <aside className="bg-white border-r p-6 flex flex-col justify-between">
            <div>
              <div className="text-2xl font-bold mb-6">ISM1</div>
              <nav className="space-y-1 text-sm">
      <Link href="/dashboard" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 text-gray-700">
        <span className="text-lg">📊</span>
        <span>Dashboard</span>
      </Link>
      <Link href="/endpoints" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 text-gray-700">
        <span className="text-lg">🧩</span>
        <span>Endpoints</span>
      </Link>
      <Link href="/leads" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 text-gray-700">
        <span className="text-lg">👥</span>
        <span>Leads</span>
      </Link>
      <Link href="/logs" className="flex items-center gap-3 p-2 rounded-lg bg-gray-200 text-black font-medium">
        <span className="text-lg">📄</span>
        <span>Logs</span>
      </Link>
      <Link href="/documentation" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 text-gray-700">
        <span className="text-lg">📚</span>
        <span>Bar chart</span>
      </Link>
      <Link href="/support" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 text-gray-700">
        <span className="text-lg bg-white p-1 rounded-full">🛠️</span>
        <span>Support</span>
      </Link>
    </nav>
    
            </div>
            <div className="text-sm text-gray-500">
              <p>Account Information</p>
              <p className="text-xs mt-2">© ISM1, 2025</p>
            </div>
          </aside>
    
          {/* Main Area */}
          <div className="flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Home &gt; <span className="text-black font-medium">Logs</span>
              </div>
              <FaCog className="text-xl text-gray-600 cursor-pointer" />
            </header>
    
            {/* Main content */}
            <main className="flex-1 overflow-auto p-10 bg-gray-50">
              <h1 className="text-xl font-semibold mb-6">
              Logs: <span className="text-gray-600">Get help with Logs</span>
              </h1>
    
              
            </main>
    
            {/* Footer */}
            <footer className="bg-white border-t px-6 py-3 text-sm text-gray-500">
              © intelligentsalesman.com, 2025 — All rights reserved.
            </footer>
          </div>
        </div>
      );
}
