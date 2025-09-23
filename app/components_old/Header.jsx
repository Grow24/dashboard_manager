'use client';

import { FaCog } from 'react-icons/fa';

export default function Header() {
  return (
    <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
      <div className="text-sm text-gray-500">
        Home &gt; <span className="text-black font-medium">Support</span>
      </div>
      <FaCog className="text-xl text-gray-600 cursor-pointer" />
    </header>
  );
}
