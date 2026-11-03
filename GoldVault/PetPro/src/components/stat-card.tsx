import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label, value, sub, icon, tone,
}: { label: string; value: string; sub?: string; icon?: React.ReactNode; tone?: "positive" | "negative" }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        {icon && <span className="text-gold">{icon}</span>}
      </div>
      <p className={cn("mt-1 font-serif text-2xl font-semibold tabular-nums", tone === "positive" && "text-success", tone === "negative" && "text-destructive")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}
