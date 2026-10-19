import { notFound, permanentRedirect } from "next/navigation"
import { getExternalIconOgPath } from "@/lib/external-icon-urls"
import { getSlugOwner } from "@/lib/external-icons"

export async function GET(_req: Request, { params }: { params: Promise<{ source: string }> }) {
	const { source: legacySlug } = await params
	const icon = await getSlugOwner(legacySlug.replace(/\.png$/, ""))
	if (!icon) {
		notFound()
	}
	permanentRedirect(getExternalIconOgPath(icon))
}
