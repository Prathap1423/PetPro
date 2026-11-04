import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
    </div>
  );
}
