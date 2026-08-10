import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Header skeleton */}
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-20">
        <Skeleton className="h-8 w-40 rounded-md" />
        <div className="hidden md:flex items-center gap-6">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-18 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full md:hidden" />
      </header>

      {/* Main content skeleton */}
      <main className="flex-1">
        {/* Hero skeleton */}
        <div className="flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32 lg:py-40 mx-auto max-w-4xl">
          <Skeleton className="h-4 w-32 rounded-full mb-6" />
          <Skeleton className="h-12 sm:h-16 w-full max-w-3xl rounded-lg mb-4" />
          <Skeleton className="h-12 sm:h-16 w-3/4 max-w-xl rounded-lg mb-4" />
          <Skeleton className="h-12 sm:h-14 w-1/2 max-w-md rounded-lg mb-8" />
          <Skeleton className="h-4 w-96 max-w-full rounded mb-10" />
          <div className="flex gap-4 justify-center">
            <Skeleton className="h-12 w-40 rounded-full" />
            <Skeleton className="h-12 w-44 rounded-full" />
          </div>
        </div>

        {/* Room cards skeleton grid */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
                <Skeleton className="w-full h-48 rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-28 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-6 w-20 rounded" />
                    <Skeleton className="h-9 w-28 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer skeleton */}
      <footer className="px-4 sm:px-6 lg:px-8 py-12 border-t" style={{ borderColor: "var(--color-border)" }}>
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <Skeleton className="h-6 w-36 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
      </footer>
    </div>
  );
}
