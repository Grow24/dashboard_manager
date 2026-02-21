import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Widget = { id: number; name: string };

type Scope =
  | { kind: "dashboard" }
  | { kind: "widget"; widgetId: number };

type Props = {
  widgets: Widget[];
  loading: boolean;
  value: Scope;
  disabled: boolean;
  onChange: (scope: Scope) => void;
};

export default function ScopeSelector({
  widgets,
  loading,
  value,
  disabled,
  onChange,
}: Props) {
  const selectValue =
    value.kind === "dashboard" ? "dashboard" : String(value.widgetId);

  return (
    <Card className="p-4 space-y-3">
      <label className="text-sm font-medium">Assign For</label>
      <Select
        value={selectValue}
        onValueChange={v =>
          v === "dashboard"
            ? onChange({ kind: "dashboard" })
            : onChange({ kind: "widget", widgetId: Number(v) })
        }
        disabled={disabled || loading}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select scope" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dashboard">Dashboard (All Widgets)</SelectItem>
          {widgets.map(w => (
            <SelectItem key={w.id} value={String(w.id)}>
              Widget: {w.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && <p className="text-xs text-muted-foreground">Loading widgets...</p>}
    </Card>
  );
}