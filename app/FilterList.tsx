import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

type FilterItem = { id: number; name: string };

type Props = {
  filters: FilterItem[];
  selected: Set<number>;
  loading: boolean;
  onToggle: (id: number) => void;
};

export default function FilterList({
  filters,
  selected,
  loading,
  onToggle,
}: Props) {
  return (
    <ScrollArea className="h-[420px]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filters.map(f => {
          const active = selected.has(f.id);
          return (
            <div
              key={f.id}
              onClick={() => onToggle(f.id)}
              className={`cursor-pointer border rounded p-3 flex items-center justify-between
                ${active ? "bg-blue-50 border-blue-500" : "hover:bg-muted"}`}
            >
              <span>{f.name}</span>
              <Checkbox checked={active} />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}