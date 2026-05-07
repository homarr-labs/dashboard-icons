import Link from "next/link"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { WEB_URL } from "@/constants"

interface BreadcrumbItemData {
	label: string
	href: string
}

export function PageBreadcrumbs({ items }: { items: BreadcrumbItemData[] }) {
	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Needs to be done
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "BreadcrumbList",
						itemListElement: items.map((item, index) => ({
							"@type": "ListItem",
							position: index + 1,
							name: item.label,
							item: `${WEB_URL}${item.href}`,
						})),
					}),
				}}
			/>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					{items.map((item, index) => {
						const isLast = index === items.length - 1
						return (
							<BreadcrumbItem key={item.href}>
								{isLast ? (
									<BreadcrumbPage>{item.label}</BreadcrumbPage>
								) : (
									<>
										<BreadcrumbLink asChild>
											<Link href={item.href}>{item.label}</Link>
										</BreadcrumbLink>
										<BreadcrumbSeparator />
									</>
								)}
							</BreadcrumbItem>
						)
					})}
				</BreadcrumbList>
			</Breadcrumb>
		</>
	)
}
