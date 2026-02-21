import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Dashboard = { id: number; name: string };

type Props = {
  dashboards: Dashboard[];
  loading: boolean;
  value: number | "";
  onChange: (id: number | "") => void;
};

export default function DashboardSelector({
  dashboards,
  loading,
  value,
  onChange,
}: Props) {
  return (
    <Card className="p-4 space-y-3">
      <label className="text-sm font-medium">Dashboard</label>
      <Select
        value={value === "" ? "" : String(value)}
        onValueChange={v => onChange(v === "" ? "" : Number(v))}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select dashboard" />
        </SelectTrigger>
        <SelectContent>
          {dashboards.map(d => (
            <SelectItem key={d.id} value={String(d.id)}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
    </Card>
  );
}