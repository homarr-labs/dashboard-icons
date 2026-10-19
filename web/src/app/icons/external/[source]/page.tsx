import { notFound, permanentRedirect } from "next/navigation"
import { getExternalIconPagePath } from "@/lib/external-icon-urls"
import { getSlugOwner } from "@/lib/external-icons"

export const revalidate = 900

export default async function LegacyExternalIconPage({ params }: { params: Promise<{ source: string }> }) {
	const { source: legacySlug } = await params
	const icon = await getSlugOwner(legacySlug)
	if (!icon) {
		notFound()
	}
	permanentRedirect(getExternalIconPagePath(icon))
}
