import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HiMenuAlt2 } from "react-icons/hi";

export function FilterSidebar({
  collapsedNew,
  setCollapsedNew,
  minUsers,
  setMinUsers,
  maxUsers,
  setMaxUsers,
  selectedMonths,
  handleMonthChange,
  selectedPanels,
  handlePanelChange,
  originalData
}) {
  return (
    <aside className={`${collapsedNew ? 'w-20' : 'w-60'} transition-all duration-300 bg-white border-r h-screen flex flex-col justify-between py-6`}>
      <div>
        <div className="flex items-center justify-between px-4 mb-6">
          <span className="text-xl font-bold">{collapsedNew ? 'I' : 'Filters'}</span>
          <Button variant="ghost" size="icon" onClick={() => setCollapsedNew(!collapsedNew)}>
            <HiMenuAlt2 size={20} />
          </Button>
        </div>
        <nav className="space-y-4 px-4 text-sm">
          <div>
            <Label htmlFor="min-users">Min Users (Global)</Label>
            <Input
              type="number"
              value={minUsers}
              onChange={(e) => setMinUsers(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="max-users">Max Users (Global)</Label>
            <Input
              type="number"
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
          <div className="mt-4">
            <label className="block mb-1 font-medium">Select Panels</label>
            <div className="space-y-1">
              {['panel1', 'panel2', 'panel3', 'panel4', 'panel5'].map((panel) => (
                <label key={panel} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedPanels[panel]}
                    onChange={() => handlePanelChange(panel)}
                  />
                  <span>{`Panel ${panel.slice(-1)}`}</span>
                </label>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
}