import { Button } from "@/components/ui/button";
import { HiMenuAlt2 } from "react-icons/hi";

export function SidebarMenu({ collapsed, setCollapsed }) {
  return (
    <aside className={`${collapsed ? 'w-20' : 'w-60'} transition-all duration-300 bg-white border-r h-screen flex flex-col justify-between py-6`}>
      <div>
        <div className="flex items-center justify-between px-4 mb-6">
          <span className="text-xl font-bold">{collapsed ? 'I' : 'ISM1'}</span>
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
            <HiMenuAlt2 size={20} />
          </Button>
        </div>
        <nav className="space-y-1">
          {[
            { label: 'Dashboard', icon: '📊', href: '/dashboard' },
            { label: 'Endpoints', icon: '🧩', href: '/endpoints' },
            { label: 'Leads', icon: '👥', href: '/leads' },
            { label: 'Logs', icon: '📄', href: '/logs' },
            { label: 'Bar chart', icon: '📚', href: '/documentation' },
            { label: 'Support', icon: '🛠️', href: '/support' },
            { label: 'Context', icon: '🛠️', href: '/context' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-2 mx-2 rounded-lg hover:bg-gray-100 ${
                item.href === '/support' ? 'bg-gray-200 font-semibold' : ''
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </a>
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