import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded bg-slate-200 dark:bg-slate-700", className)}
    />
  );
}

export function BracketSkeleton() {
  return (
    <div className="flex gap-14 p-4">
      {[4, 2, 1].map((count, col) => (
        <div key={col} className="flex flex-col gap-6 justify-center" style={{ gap: col === 0 ? 24 : col === 1 ? 88 : 200 }}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="w-[220px] rounded-lg border-2 border-slate-200 dark:border-slate-700 p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="border-t border-slate-100 dark:border-slate-700/50 pt-2">
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
