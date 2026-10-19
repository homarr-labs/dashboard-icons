import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { getIconDirectoryPath, type IconDirectoryPage } from "@/lib/icon-directory"

function getPageHref(page: number): string {
	const path = getIconDirectoryPath(page)
	if (page === 1) return `${path}#icon-directory`
	return path
}

export function IconDirectory({ directory, headingLevel: Heading = "h2" }: { directory: IconDirectoryPage; headingLevel?: "h1" | "h2" }) {
	const { items, page, totalPages, totalItems, start, end } = directory

	return (
		<section id="icon-directory" aria-labelledby="icon-directory-heading" className="scroll-mt-24 space-y-6 py-8">
			<div className="space-y-2">
				<Heading id="icon-directory-heading" className="text-2xl font-bold text-balance">
					Icon directory
				</Heading>
				<p className="max-w-prose text-muted-foreground">
					Browse every icon from Dashboard Icons, selfh.st, LobeHub and Simple Icons, A to Z.
				</p>
				<p className="text-sm text-muted-foreground tabular-nums">
					{totalItems === 0
						? "No icons available."
						: `Showing ${start.toLocaleString("en")} to ${end.toLocaleString("en")} of ${totalItems.toLocaleString("en")} icons`}
				</p>
			</div>
			<ul className="grid grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-3 lg:grid-cols-4">
				{items.map((icon) => (
					<li key={icon.href} className="min-w-0">
						<a
							href={icon.href}
							className="flex min-h-16 flex-col justify-center rounded-md px-2 py-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
						>
							<span className="font-medium wrap-anywhere">{icon.name}</span>
							<span className="text-sm text-muted-foreground">{icon.source}</span>
						</a>
					</li>
				))}
			</ul>
			{totalPages > 1 && (
				<div className="space-y-4">
					<Pagination aria-label="Icon directory pagination">
						<PaginationContent className="w-full justify-between sm:w-auto sm:gap-6">
							<PaginationItem>
								{page > 1 && <PaginationPrevious href={getPageHref(page - 1)} rel="prev" className="h-11 min-w-11" />}
							</PaginationItem>
							<PaginationItem className="text-sm text-muted-foreground tabular-nums">
								Page {page} of {totalPages}
							</PaginationItem>
							<PaginationItem>
								{page < totalPages && <PaginationNext href={getPageHref(page + 1)} rel="next" className="h-11 min-w-11" />}
							</PaginationItem>
						</PaginationContent>
					</Pagination>
					<details>
						<summary className="w-fit min-h-11 cursor-pointer content-center rounded-md px-2 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
							Choose a directory page
						</summary>
						<nav aria-label="All icon directory pages" className="pt-3">
							<ul className="flex flex-wrap gap-2">
								{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
									<li key={number}>
										<a
											href={getPageHref(number)}
											aria-label={`View directory page ${number}`}
											aria-current={number === page ? "page" : undefined}
											className="flex size-11 items-center justify-center rounded-md text-sm tabular-nums hover:bg-accent aria-[current=page]:bg-accent aria-[current=page]:font-semibold focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
										>
											{number}
										</a>
									</li>
								))}
							</ul>
						</nav>
					</details>
				</div>
			)}
		</section>
	)
}
