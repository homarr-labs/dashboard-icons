import { MagicCard } from "@/components/magicui/magic-card"
import { BASE_URL } from "@/constants"
import type { Icon } from "@/types/icons"
import Image from "next/image"
import Link from "next/link"

export function IconCard({
	name,
	data: iconData,
	matchedAlias,
}: {
	name: string
	data: Icon
	matchedAlias?: string | null
}) {
	return (
		<MagicCard className="rounded-md shadow-md">
			<Link prefetch={false} href={`/icons/${name}`} className="group flex flex-col items-center p-3 sm:p-4 cursor-pointer">
				<div className="relative h-12 w-12 sm:h-16 sm:w-16 mb-2">
					<Image
						src={`${BASE_URL}/${iconData.base}/${name}.${iconData.base}`}
						alt={`${name} icon`}
						fill
						className="object-contain p-1 group-hover:scale-110 transition-transform duration-300"
					/>
				</div>
				<span className="text-xs sm:text-sm text-center truncate w-full capitalize group- dark:group-hover:text-primary transition-colors duration-200 font-medium">
					{name.replace(/-/g, " ")}
				</span>

				{matchedAlias && <span className="text-[10px] text-center truncate w-full mt-1">Alias: {matchedAlias}</span>}
			</Link>
		</MagicCard>
	)
}
