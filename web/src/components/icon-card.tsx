import Image from "next/image"
import Link from "next/link"
import { MagicCard } from "@/components/magicui/magic-card"
import { BASE_URL } from "@/constants"
import { formatIconName } from "@/lib/utils"
import type { Icon } from "@/types/icons"

export function IconCard({ name, data: iconData, matchedAlias }: { name: string; data: Icon; matchedAlias?: string }) {
	const formatedIconName = formatIconName(name)

	const isCommunityIcon = iconData.base.startsWith("http")
	const imageUrl = isCommunityIcon ? iconData.base : `${BASE_URL}/${iconData.base}/${name}.${iconData.base}`

	const linkHref = isCommunityIcon ? `/community/${name}` : `/icons/${name}`
	return (
		<MagicCard className="rounded-md shadow-md">
			<Link prefetch={false} href={linkHref} className="group flex flex-col items-center p-3 sm:p-4 cursor-pointer">
				<div className="relative h-16 w-16 mb-2 rounded-lg ring-1 ring-white/5 dark:ring-white/10 bg-primary/15 dark:bg-secondary/10">
					<Image
						src={imageUrl}
						alt={`${name} icon`}
						fill
						sizes="32px 32px"
						className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
					/>
				</div>
				<span className="text-xs sm:text-sm text-center truncate w-full capitalize group- dark:group-hover:text-primary transition-colors duration-200 font-medium">
					{formatedIconName}
				</span>
			</Link>
		</MagicCard>
	)
}

export function IconPreviewCard({ preview, label, name }: { preview: string; label: string; name: string }) {
	return (
		<MagicCard className="rounded-md shadow-md">
			<div className="flex flex-col items-center p-3 sm:p-4">
				<div className="relative h-16 w-16 mb-2 rounded-lg ring-1 ring-white/5 dark:ring-white/10 bg-primary/15 dark:bg-secondary/10 overflow-hidden">
					<img
						src={preview}
						alt={`${name} - ${label}`}
						className="absolute inset-0 w-full h-full object-contain p-2"
					/>
				</div>
				<span className="text-xs sm:text-sm text-center truncate w-full capitalize font-medium">
					{name || "icon-name"}
				</span>
				<span className="text-[10px] text-muted-foreground">{label}</span>
			</div>
		</MagicCard>
	)
}
