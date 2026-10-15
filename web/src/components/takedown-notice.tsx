import { Ban } from "lucide-react"
import Link from "next/link"
import type { PublicTakedown } from "@/lib/takedowns"
import { formatIconName } from "@/lib/utils"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Icon removed">
	<rect width="512" height="512" rx="96" fill="#f3f4f6" />
	<g fill="none" stroke="#9ca3af" stroke-width="56" stroke-linecap="round">
		<line x1="150" y1="150" x2="362" y2="362" />
		<line x1="362" y1="150" x2="150" y2="362" />
	</g>
</svg>`

export function TakedownNotice({ icon, takedown }: { icon: string; takedown: PublicTakedown }) {
	const name = formatIconName(icon)
	const requestedAt = takedown.date
		? new Date(takedown.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
		: null

	return (
		<div className="container mx-auto pt-12 pb-14 px-4 sm:px-6 lg:px-8">
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<div className="lg:col-span-4">
					<Breadcrumb className="justify-end">
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="/">Home</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="/icons">Browse Icons</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>{name}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>
				<div className="lg:col-span-2 lg:mx-auto lg:max-w-xl">
					<Card className="h-full bg-background/50 border shadow-lg">
						<CardHeader className="items-center text-center">
							<div
								className="relative mx-auto flex aspect-square w-40 items-center justify-center rounded-xl ring-1 ring-white/5 dark:ring-white/10 bg-muted/30 overflow-hidden p-3"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: static placeholder SVG, no user input
								dangerouslySetInnerHTML={{ __html: PLACEHOLDER_SVG }}
							/>
							<CardTitle className="text-3xl font-bold capitalize tracking-wide text-center">
								<h1>{name}</h1>
							</CardTitle>
							<CardDescription className="flex items-center gap-2">
								<Ban className="size-4 text-destructive" />
								This icon was removed from the collection following a takedown request.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed">
								<p className="font-medium text-foreground">Why was it removed?</p>
								<p className="mt-2 text-muted-foreground">
									{takedown.reason || "A takedown request was received for this icon."}
									{takedown.requester_name && <> Requested by {takedown.requester_name}.</>}
								</p>
								{requestedAt && <p className="mt-2 text-xs text-muted-foreground">Removed on {requestedAt}.</p>}
								{takedown.description && <p className="mt-2 whitespace-pre-line text-muted-foreground">{takedown.description}</p>}
							</div>
							<p className="mt-4 text-xs leading-5 text-muted-foreground">
								The icon no longer appears in search results or downloads. Existing direct links to this icon remain valid but now serve a
								placeholder image instead of the original material. If you believe this decision is in error, please contact{" "}
								<a className="text-primary hover:underline" href="mailto:homarr-labs@proton.me">
									homarr-labs@proton.me
								</a>{" "}
								or review our{" "}
								<Link className="text-primary hover:underline" href="/terms">
									Terms of Service
								</Link>
								.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
