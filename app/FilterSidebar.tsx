import React, { useState, useEffect, useRef } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { FiRefreshCw } from 'react-icons/fi';
import { HiMenuAlt2 } from 'react-icons/hi';

export default function FilterSidebar({
  minUsers,
  maxUsers,
  setMinUsers,
  setMaxUsers,
  selectedMonths,
  setSelectedMonths,
  selectedPanels,
  setSelectedPanels,
  originalData,
}) {
  const [collapsedNew, setCollapsedNew] = useState(false);

  const handleMonthChange = (month) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const handlePanelChange = (panel) => {
    setSelectedPanels((prev) => ({
      ...prev,
      [panel]: !prev[panel],
    }));
  };

  const handleRefresh1 = () => {
    setSelectedMonths([]);
  };

  const handleRefresh2 = () => {
    setMinUsers('');
    setMaxUsers('');
    setSelectedMonths([]);
  };

  const handleRefresh3 = () => {
    // Implement individual filter reset if needed
  };

  const [filterHistory, setFilterHistory] = useState([]);

  const applyingFromHistoryRef = useRef(false);

  const addFilterToHistory = () => {
    if (applyingFromHistoryRef.current) {
      applyingFromHistoryRef.current = false;
      return;
    }
    const filterSnapshot = {
      id: Date.now(),
      minUsers,
      maxUsers,
      selectedMonths: [...selectedMonths].sort(),
    };
    const last = filterHistory[filterHistory.length - 1];
    if (
      last &&
      last.minUsers === filterSnapshot.minUsers &&
      last.maxUsers === filterSnapshot.maxUsers &&
      JSON.stringify(last.selectedMonths) === JSON.stringify(filterSnapshot.selectedMonths)
    ) {
      return;
    }
    setFilterHistory((prev) => [...prev, filterSnapshot]);
  };

  useEffect(() => {
    addFilterToHistory();
  }, [minUsers, maxUsers, selectedMonths]);

  const applyFilterFromHistory = (filter) => {
    applyingFromHistoryRef.current = true;
    setMinUsers(filter.minUsers);
    setMaxUsers(filter.maxUsers);
    setSelectedMonths(filter.selectedMonths);
  };

  const clearHistory = () => {
    setFilterHistory([]);
  };

  const HistoryTabContent = () => {
    if (filterHistory.length === 0) {
      return <div className="text-sm text-gray-500">No history available</div>;
    }
    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-lg">Filter History</h3>
          <Button size="sm" variant="outline" onClick={clearHistory}>Clear</Button>
        </div>
        <div className="overflow-auto flex-1 border rounded p-2 bg-white">
          <ul className="divide-y divide-gray-200">
            {filterHistory.map((item) => (
              <li
                key={item.id}
                className="cursor-pointer hover:bg-indigo-100 p-2 rounded"
                onClick={() => applyFilterFromHistory(item)}
                title={`Min Users: ${item.minUsers || 'None'}, Max Users: ${item.maxUsers || 'None'}, Months: ${item.selectedMonths.length > 0 ? item.selectedMonths.join(', ') : 'All'}`}
              >
                <div className="text-sm font-medium">
                  Min: {item.minUsers || 'None'}, Max: {item.maxUsers || 'None'}
                </div>
                <div className="text-xs text-gray-600">
                  Months: {item.selectedMonths.length > 0 ? item.selectedMonths.join(', ') : 'All'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`${collapsedNew ? 'w-20' : 'w-60'} transition-all duration-300 bg-white border-r h-screen flex flex-col py-6`}
    >
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 mb-6">
          <span className="text-xl font-bold">{collapsedNew ? 'I' : 'Filters 1'}</span>
          <Button variant="ghost" size="icon" onClick={() => setCollapsedNew(!collapsedNew)}>
            <HiMenuAlt2 size={20} />
          </Button>
        </div>

        {!collapsedNew && (
          <Tabs defaultValue="filter" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 mx-4">
              <TabsTrigger value="filter">Filter</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="generate">Generate</TabsTrigger>
            </TabsList>

            <TabsContent value="filter" className="flex-1 overflow-auto">
              <div className="flex justify-between px-4 py-2 border-b">
                <Button title='Cross Filter'
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh1}
                  className="hover:bg-gray-100 p-2"
                >
                  <FiRefreshCw className="h-4 w-4" />
                </Button>
                <Button title='Global Filter'
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh2}
                  className="hover:bg-gray-100 p-2"
                >
                  <FiRefreshCw className="h-4 w-4" />
                </Button>
                <Button title='Individual Filter'
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh3}
                  className="hover:bg-gray-100 p-2"
                >
                  <FiRefreshCw className="h-4 w-4" />
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
                  <div className="space-y-1 max-h-48 overflow-auto">
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
                    {['panel1', 'panel2', 'panel3', 'panel4', 'panel5', 'panel6'].map((panel) => (
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
            </TabsContent>

            <TabsContent value="history" className="flex-1 p-4">
              <HistoryTabContent />
            </TabsContent>

            <TabsContent value="generate" className="flex-1 p-4">
              <div className="text-sm text-gray-500">
                Generate content coming soon
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </aside>
  );
}