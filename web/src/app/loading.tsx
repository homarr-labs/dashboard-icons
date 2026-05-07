import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
	return (
		<div className="isolate overflow-hidden p-2 mx-auto max-w-7xl">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
				<div className="space-y-3">
					<Skeleton className="h-9 w-48" />
					<Skeleton className="h-5 w-96" />
				</div>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
				{Array.from({ length: 24 }).map((_, i) => (
					<div key={i} className="flex flex-col items-center gap-3 p-4 rounded-lg border">
						<Skeleton className="h-16 w-16 rounded-lg" />
						<Skeleton className="h-4 w-20" />
					</div>
				))}
			</div>
		</div>
	)
}
