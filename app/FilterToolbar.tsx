import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  query: string;
  onQueryChange: (v: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  selectedCount: number;
  totalCount: number;
};

export default function FilterToolbar({
  query,
  onQueryChange,
  onSelectAll,
  onClearAll,
  selectedCount,
  totalCount,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-between">
      <Input
        placeholder="Search filters..."
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        className="sm:max-w-xs"
      />

      <div className="flex gap-2">
        <Button variant="outline" onClick={onSelectAll}>
          Select All
        </Button>
        <Button variant="outline" onClick={onClearAll}>
          Clear All
        </Button>
        <span className="text-sm text-muted-foreground self-center">
          {selectedCount}/{totalCount}
        </span>
      </div>
    </div>
  );
}