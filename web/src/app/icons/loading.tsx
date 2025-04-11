import { Skeleton } from "@/components/ui/skeleton"

export default function IconsLoading() {
  return (
    <div className="container py-8">
      <div className="space-y-4 mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full max-w-md" />
        
        <div className="relative w-full max-w-md">
          <Skeleton className="h-10 w-full" />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mt-8">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center p-4 rounded-lg border border-border">
              <Skeleton className="h-16 w-16 mb-2" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}