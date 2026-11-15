import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

/** Generic page placeholder shown instantly while a route loads. */
export function PageSkeleton({ header = true }: { header?: boolean }) {
  return (
    <div role="status" aria-label="Loading" className="animate-fade-in space-y-6">
      {header && (
        <div className="space-y-2.5">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
    </div>
  );
}
