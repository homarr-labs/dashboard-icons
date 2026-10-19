import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { cache } from "react"
import { IconDirectory } from "@/components/icon-directory"
import { Button } from "@/components/ui/button"
import { WEB_URL } from "@/constants"
import { getIconDirectoryPage, getIconDirectoryPath } from "@/lib/icon-directory"

export const revalidate = 900
export const dynamicParams = true

export function generateStaticParams() {
	return []
}

const getDirectory = cache(async (value: string) => {
	if (!/^[1-9]\d*$/.test(value)) notFound()
	const page = Number(value)
	if (!Number.isSafeInteger(page)) notFound()
	if (page === 1) permanentRedirect("/icons")
	const directory = await getIconDirectoryPage(page)
	if (page > directory.totalPages) notFound()
	return directory
})

export async function generateMetadata({ params }: PageProps<"/icons/directory/[page]">): Promise<Metadata> {
	const directory = await getDirectory((await params).page)
	const title = `Icon directory, page ${directory.page}`
	const description = `Browse icons ${directory.start} to ${directory.end} of ${directory.totalItems} from Dashboard Icons, selfh.st, LobeHub and Simple Icons, A to Z.`
	const url = `${WEB_URL}${getIconDirectoryPath(directory.page)}`

	return {
		title,
		description,
		alternates: { canonical: url },
		openGraph: { title, description, type: "website", url },
	}
}

export default async function IconDirectoryPage({ params }: PageProps<"/icons/directory/[page]">) {
	const directory = await getDirectory((await params).page)

	return (
		<div className="mx-auto max-w-7xl p-2">
			<Button asChild variant="ghost" className="h-11">
				<a href="/icons">Search all icons</a>
			</Button>
			<IconDirectory directory={directory} headingLevel="h1" />
		</div>
	)
}
