import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div role="status" className="space-y-6 p-6">
      <span className="sr-only">Loading grade history…</span>
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
