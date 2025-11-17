"use client"

import { format, isToday, isYesterday } from "date-fns"
import { ArrowRight, Clock, ExternalLink } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Marquee } from "@/components/magicui/marquee"
import { BASE_URL } from "@/constants"
import { cn, formatIconName } from "@/lib/utils"
import type { Icon, IconWithName } from "@/types/icons"

function formatIconDate(timestamp: string): string {
	const date = new Date(timestamp)
	if (isToday(date)) {
		return "Today"
	}
	if (isYesterday(date)) {
		return "Yesterday"
	}
	return format(date, "MMM d, yyyy")
}

export function RecentlyAddedIcons({ icons }: { icons: IconWithName[] }) {
	// Split icons into two rows for the marquee
	const firstRow = icons.slice(0, Math.ceil(icons.length / 2))
	const secondRow = icons.slice(Math.ceil(icons.length / 2))

	return (
		<div className="relative isolate overflow-hidden my-8">
			{/* Background glow */}
			<div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true" />

			<div className="mx-auto px-6 lg:px-8">
				<div className="mx-auto max-w-2xl text-center my-4">
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary  motion-safe:motion-preset-fade-lg motion-duration-500">
						Recently Added Icons
					</h2>
				</div>

				<div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
					<Marquee pauseOnHover className="[--duration:60s] [--gap:1em] motion-safe:motion-preset-slide-left-sm motion-duration-1000">
						{firstRow.map(({ name, data }) => (
							<RecentIconCard key={name} name={name} data={data} />
						))}
					</Marquee>
					<Marquee
						reverse
						pauseOnHover
						className="[--duration:60s] [--gap:1rem] motion-safe:motion-preset-slide-right-sm motion-duration-1000"
					>
						{secondRow.map(({ name, data }) => (
							<RecentIconCard key={name} name={name} data={data} />
						))}
					</Marquee>
					<div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background" />
					<div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background" />
				</div>

				<div className="mt-12 text-center">
					<Link
						href="/icons"
						className="font-medium inline-flex items-center py-2 px-4 rounded-full border  transition-all duration-200 group hover-lift soft-shadow"
					>
						View all icons
						<ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" />
					</Link>
				</div>
			</div>
		</div>
	)
}

// Marquee-compatible icon card
function RecentIconCard({ name, data }: { name: string; data: Icon }) {
	const formattedIconName = formatIconName(name)
	return (
		<Link
			prefetch={false}
			href={`/icons/${name}`}
			className={cn(
				"flex flex-col items-center p-3 sm:p-4 rounded-xl border border-border",
				"transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 relative overflow-hidden hover-lift",
				"w-36 mx-2 group/item",
			)}
			aria-label={`View details for ${formattedIconName} icon`}
		>
			<div className="absolute inset-0 bg-gradient-to-b from-primary/15 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />

			<div className="relative h-12 w-12 sm:h-16 sm:w-16 mb-2">
				<Image
					src={`${BASE_URL}/${data.base}/${name}.${data.base}`}
					alt={`${name} icon`}
					fill
					className="object-contain p-1 hover:scale-110 transition-transform duration-300"
				/>
			</div>
			<span className="text-xs sm:text-sm text-center truncate w-full capitalize  dark:hover:text-primary transition-colors duration-200 font-medium">
				{formattedIconName}
			</span>
			<div className="flex items-center justify-center mt-2 w-full">
				<span className="text-[10px] sm:text-xs text-muted-foreground flex items-center whitespace-nowrap hover:/70 transition-colors duration-200">
					<Clock className="w-3 h-3 mr-1.5 shrink-0" />
					{formatIconDate(data.update.timestamp)}
				</span>
			</div>

			<div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
				<ExternalLink className="w-3 h-3 " />
			</div>
		</Link>
	)
}
