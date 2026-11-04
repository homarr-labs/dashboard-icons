"use client"

import { motion, useAnimation, useInView } from "framer-motion"
import { Command, DollarSign, ExternalLink, Search, Sparkles, Star } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DASHBOARD_ICONS_ICON, EXTERNAL_SOURCE_IDS, EXTERNAL_SOURCES, type ExternalSourceId, REPO_NAME } from "@/constants"
import { cn } from "@/lib/utils"
import { AddMcpButton } from "./add-mcp-button"
import { AddToSearchBarButton } from "./add-to-search-bar-button"
import { AuroraText } from "./magicui/aurora-text"
import { NumberTicker } from "./magicui/number-ticker"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card"
import { UnoptimizedImage } from "./unoptimized-image"

function ElegantShape({
	className,
	delay = 0,
	width = 400,
	height = 100,
	rotate = 0,
	gradient = "from-primary/[0.5]",
	mobileWidth,
	mobileHeight,
}: {
	className?: string
	delay?: number
	width?: number
	height?: number
	rotate?: number
	gradient?: string
	mobileWidth?: number
	mobileHeight?: number
}) {
	const controls = useAnimation()
	const [isMobile, setIsMobile] = useState(false)
	const ref = useRef(null)
	const isInView = useInView(ref, { once: true, amount: 0.1 })

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768)
		}
		checkMobile()
		window.addEventListener("resize", checkMobile)
		return () => window.removeEventListener("resize", checkMobile)
	}, [])

	useEffect(() => {
		if (isInView) {
			controls.start({
				opacity: 1,
				y: 0,
				rotate: rotate,
				transition: {
					type: "spring",
					stiffness: 50,
					damping: 20,
					duration: 1.8,
					delay,
					ease: [0.23, 0.86, 0.39, 0.96],
					opacity: { duration: 1.2 },
				},
			})
		}
	}, [controls, delay, isInView, rotate])

	return (
		<motion.div
			ref={ref}
			initial={{
				opacity: 0,
				y: -150,
				rotate: rotate - 15,
			}}
			animate={controls}
			className={cn("absolute will-change-transform", className)}
		>
			<motion.div
				animate={{
					y: [0, 15, 0],
				}}
				transition={{
					duration: 8,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
					repeatType: "reverse",
				}}
				style={{
					width: isMobile && mobileWidth ? mobileWidth : width,
					height: isMobile && mobileHeight ? mobileHeight : height,
				}}
				className="relative will-change-transform"
			>
				<div
					className={cn(
						"absolute inset-0 rounded-full",
						// Use primary
						"bg-gradient-to-r from-primary/[0.6] via-primary/[0.4] to-primary/[0.1]",
						gradient,
						"backdrop-blur-[3px]",
						"shadow-primary/35",
						"inset-shadow-2xs",
						"inset-shadow-primary/20",
						"after:absolute after:inset-0 after:rounded-full",
						"after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.4),transparent_70%)]",
					)}
				/>
			</motion.div>
		</motion.div>
	)
}

export function HeroSection({
	totalIcons,
	nativeCount,
	sourceCounts,
}: {
	totalIcons: number
	nativeCount: number
	sourceCounts: Record<string, number>
}) {
	const [searchQuery, setSearchQuery] = useState("")

	return (
		<div className="relative w-full flex items-center justify-center overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-br from-primary/[0.1] via-transparent to-primary/[0.1] blur-3xl" />

			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<ElegantShape
					delay={0.3}
					width={600}
					height={140}
					mobileWidth={300}
					mobileHeight={80}
					rotate={12}
					gradient="from-primary/[0.6]"
					className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
				/>

				<ElegantShape
					delay={0.5}
					width={500}
					height={120}
					mobileWidth={250}
					mobileHeight={70}
					rotate={-15}
					gradient="from-primary/[0.55]"
					className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
				/>

				<ElegantShape
					delay={0.4}
					width={300}
					height={80}
					mobileWidth={150}
					mobileHeight={50}
					rotate={-8}
					gradient="from-primary/[0.65]"
					className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
				/>

				<ElegantShape
					delay={0.6}
					width={200}
					height={60}
					mobileWidth={100}
					mobileHeight={40}
					rotate={20}
					gradient="from-primary/[0.58]"
					className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
				/>

				<ElegantShape
					delay={0.7}
					width={150}
					height={40}
					mobileWidth={80}
					mobileHeight={30}
					rotate={-25}
					gradient="from-primary/[0.62]"
					className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
				/>
			</div>

			<div className="relative z-10 container mx-auto px-4 md:px-6 mt-4 py-20">
				<div className="max-w-4xl mx-auto text-center flex flex-col gap-4 ">
					<h1 className="relative text-3xl sm:text-5xl md:text-7xl font-bold mb-4 md:mb-8 tracking-tight motion-preset-slide-up motion-duration-500 ">
						Your definitive source for
						<Sparkles className="absolute -right-1 -bottom-3 text-primary h-8 w-8 sm:h-12 sm:w-12 md:h-16 md:w-12 motion-delay-300 motion-preset-seesaw-lg motion-scale-in-[0.5] motion-translate-x-in-[-120%] motion-translate-y-in-[-60%] motion-opacity-in-[33%] motion-rotate-in-[-1080deg] motion-blur-in-[10px] motion-duration-500 motion-delay-[0.13s]/scale motion-duration-[0.13s]/opacity motion-duration-[0.40s]/rotate motion-duration-[0.05s]/blur motion-delay-[0.20s]/blur motion-ease-spring-bouncier" />
						<br />
						<Sparkles className="absolute -left-1 -top-3 text-primary h-5 w-5 sm:h-8 sm:w-8 md:h-12 md:w-12 motion-delay-300 motion-preset-seesaw-lg motion-scale-in-[0.5] motion-translate-x-in-[159%] motion-translate-y-in-[-60%] motion-opacity-in-[33%] motion-rotate-in-[-1080deg] motion-blur-in-[10px] motion-duration-500 motion-delay-[0.13s]/scale motion-duration-[0.13s]/opacity motion-duration-[0.40s]/rotate motion-duration-[0.05s]/blur motion-delay-[0.20s]/blur motion-ease-spring-bouncier" />
						<AuroraText colors={["#FA5352", "#FA5352", "orange"]}>dashboard icons</AuroraText>
					</h1>

					<p className="text-sm sm:text-base md:text-xl text-muted-foreground leading-relaxed mb-8 font-medium tracking-wide max-w-2xl mx-auto px-4 motion-preset-slide-down motion-duration-500">
						A collection of{" "}
						<HoverCard openDelay={100} closeDelay={200}>
							<HoverCardTrigger asChild>
								<button
									type="button"
									aria-label="Icon counts by collection"
									className="cursor-help underline decoration-dotted underline-offset-4 decoration-muted-foreground/40 hover:decoration-primary transition-colors"
								>
									<NumberTicker value={totalIcons} startValue={1000} className="font-bold tracking-tighter text-muted-foreground" /> curated
									icons & logos
								</button>
							</HoverCardTrigger>
							<HoverCardContent className="w-56 p-3" side="bottom">
								<div className="flex flex-col gap-2">
									<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sources</p>
									<div className="flex items-center gap-2 text-sm">
										<UnoptimizedImage src={DASHBOARD_ICONS_ICON} alt="" width={16} height={16} className="shrink-0" />
										<span className="flex-1">Dashboard Icons</span>
										<span className="font-semibold tabular-nums">{nativeCount.toLocaleString()}</span>
									</div>
									{Object.entries(sourceCounts).map(([sourceId, count]) => {
										const config = EXTERNAL_SOURCES[sourceId as ExternalSourceId]
										if (!config) return null
										return (
											<div key={sourceId} className="flex items-center gap-2 text-sm">
												<UnoptimizedImage src={config.icon} alt="" width={16} height={16} className="shrink-0" />
												<Link href={config.website} target="_blank" rel="noopener noreferrer" className="flex-1 hover:underline">
													{config.label}
												</Link>
												<span className="font-semibold tabular-nums">{count.toLocaleString()}</span>
											</div>
										)
									})}
									<div className="border-t border-border pt-1.5 flex items-center gap-2 text-sm font-semibold">
										<span className="flex-1">Total</span>
										<span className="tabular-nums">{totalIcons.toLocaleString()}</span>
									</div>
								</div>
							</HoverCardContent>
						</HoverCard>{" "}
						for services, applications and tools, designed specifically for dashboards and app directories. Includes icons from{" "}
						{EXTERNAL_SOURCE_IDS.map((id, index) => (
							<span key={id}>
								{index > 0 && ", "}
								<Link
									href={EXTERNAL_SOURCES[id].website}
									target="_blank"
									rel="noopener noreferrer"
									className="underline underline-offset-4"
								>
									{EXTERNAL_SOURCES[id].label}
								</Link>
							</span>
						))}
						.
					</p>
					<div className="flex w-full flex-col gap-4 max-w-3xl mx-auto">
						<SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} totalIcons={totalIcons} />
						<div className="flex flex-wrap justify-center gap-3 md:gap-4">
							<Button asChild variant="outline">
								<Link href="/icons">
									<span className="size-2 rounded-full bg-primary" />
									Browse icons & logos
								</Link>
							</Button>
							<GiveUsAStarButton />
							<SupportCollectionsButton />
							<Button asChild variant="outline" className="h-9 md:h-10 px-4">
								<Link href="https://www.raycast.com/macx/dashboard-icons" target="_blank" rel="noopener noreferrer">
									<Command data-icon="inline-start" />Raycast extension
								</Link>
							</Button>
						</div>
						<div className="flex flex-col sm:flex-row justify-center gap-3">
							<AddToSearchBarButton size="lg" />
							<AddMcpButton size="lg" source="hero" />
						</div>
					</div>
				</div>
			</div>

			<div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80 pointer-events-none" />
		</div>
	)
}

export default function GiveUsAStarButton() {
	const [stars, setStars] = useState<number | null>(null)

	useEffect(() => {
		async function fetchStars() {
			try {
				const response = await fetch(`https://api.github.com/repos/${REPO_NAME}`)
				if (!response.ok) return

				const data: unknown = await response.json()
				if (typeof data !== "object" || data === null || !("stargazers_count" in data)) return
				if (typeof data.stargazers_count !== "number") return

				setStars(data.stargazers_count)
			} catch (error) {
				console.error("Failed to fetch stars:", error)
			}
		}

		fetchStars()
	}, [])

	return (
		<Button asChild variant="outline" className="h-9 md:h-10 px-4">
			<Link href="https://github.com/homarr-labs/dashboard-icons" target="_blank" rel="noopener noreferrer">
				<Star data-icon="inline-start" className="text-yellow-500 fill-yellow-500" />
				Give us a star
				{stars !== null && <span className="text-muted-foreground">{stars.toLocaleString("en-US")}</span>}
			</Link>
		</Button>
	)
}

function SupportCollectionsButton() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" className="h-9 md:h-10 px-4">
					<DollarSign data-icon="inline-start" className="text-yellow-500" />
					Donate
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Support the people behind the icons</DialogTitle>
					<DialogDescription>
						Dashboard Icons brings independent collections together. Choose which project to support; each link goes directly to its own
						funding page.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<Button asChild variant="outline" size="lg">
						<Link href="https://opencollective.com/homarr" target="_blank" rel="noopener noreferrer">
							<UnoptimizedImage src={DASHBOARD_ICONS_ICON} alt="" width={20} height={20} />
							Support Dashboard Icons / Homarr
							<ExternalLink data-icon="inline-end" />
						</Link>
					</Button>
					{EXTERNAL_SOURCE_IDS.map((id) => {
						const source = EXTERNAL_SOURCES[id]
						return (
							<Button key={id} asChild variant="outline" size="lg">
								<Link href={source.supportUrl} target="_blank" rel="noopener noreferrer">
									<UnoptimizedImage src={source.icon} alt="" width={20} height={20} />
									Support {source.label}
									<ExternalLink data-icon="inline-end" />
								</Link>
							</Button>
						)
					})}
				</div>
			</DialogContent>
		</Dialog>
	)
}

interface SearchInputProps {
	searchQuery: string
	setSearchQuery: React.Dispatch<React.SetStateAction<string>>
	totalIcons: number
}

function SearchInput({ searchQuery, setSearchQuery, totalIcons }: SearchInputProps) {
	return (
		<form action="/icons" method="GET" className="relative group">
			<Input
				name="q"
				aria-label="Search icons across all collections"
				type="search"
				placeholder={`Search ${totalIcons.toLocaleString()} icons across all collections...`}
				className="pl-10 h-10 md:h-12 rounded-lg w-full border-border focus:border-primary/20 text-sm md:text-base"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
			/>
			<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 md:h-5 w-4 md:w-5 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
		</form>
	)
}
