import { notFound, permanentRedirect } from "next/navigation"
import { getAllIcons } from "@/lib/api"
import { getCommunityGalleryRecordByName } from "@/lib/community"

export const revalidate = 900

export default async function LegacyCommunityIconPage({ params }: { params: Promise<{ icon: string }> }) {
	const { icon } = await params
	const record = await getCommunityGalleryRecordByName(icon)
	if (!record) notFound()
	if (record.status === "added_to_collection" && Object.hasOwn(await getAllIcons(), icon)) permanentRedirect(`/icons/${icon}`)
	permanentRedirect(`/community/submissions/${record.id}`)
}
