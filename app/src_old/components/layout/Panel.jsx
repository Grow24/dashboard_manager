import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardContent
} from "@/components/ui/card";

export function Panel({
  title,
  children,
  panelKey,
  filterBox = false,
  showFilters,
  setShowFilters,
  panel1MinUsers,
  setPanel1MinUsers,
  panel1MaxUsers,
  setPanel1MaxUsers,
  filteredData,
  selectedPanels,
  onMaximize,
  menuOpen,
  setMenuOpenGlobal,
}) {
  const isVisible = selectedPanels[panelKey];
  const localFilteredData = isVisible ? filteredData : [];

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpenGlobal(null);
    } else {
      setMenuOpenGlobal(panelKey);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <Card className="relative h-full flex flex-col">
        <CardHeader className="flex justify-between items-center mb-2 panel-header cursor-move">
          <h2 className="text-lg font-medium">{title}</h2>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              className="text-gray-600 hover:text-black"
              aria-label="Open panel menu"
            >
              &#8942;
            </Button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-50 py-1"
                >
                  <Button variant="ghost" className="w-full justify-start text-sm">Edit</Button>
                  <Button variant="ghost" className="w-full justify-start text-sm">Delete</Button>
                  <Button variant="ghost" className="w-full justify-start text-sm">Details</Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={() => {
                      setMenuOpenGlobal(null);
                      onMaximize && onMaximize(panelKey);
                    }}
                  >
                    Maximize
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardHeader>
        {filterBox && (
          <div className="px-4 pb-2 min-h-[120px]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((prev) => !prev)}
              className="mb-2"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 mt-2">
                    <div>
                      <Label>Panel 1 Min Users</Label>
                      <Input
                        type="number"
                        value={panel1MinUsers}
                        onChange={(e) => setPanel1MinUsers(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Panel 1 Max Users</Label>
                      <Input
                        type="number"
                        value={panel1MaxUsers}
                        onChange={(e) => setPanel1MaxUsers(e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <CardContent className="flex-1 flex flex-col min-h-0">
          {isVisible && children(localFilteredData)}
        </CardContent>
      </Card>
    </div>
  );
}