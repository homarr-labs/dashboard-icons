"use client"

import { motion, useAnimation, useInView } from "framer-motion"
import { ExternalLink, Heart, Search, Share2, Sparkles, Star } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DASHBOARD_ICONS_ICON, EXTERNAL_SOURCE_IDS, EXTERNAL_SOURCES, REPO_NAME } from "@/constants"
import { cn } from "@/lib/utils"
import { AddMcpButton } from "./add-mcp-button"
import { AddToSearchBarButton } from "./add-to-search-bar-button"
import { AuroraText } from "./magicui/aurora-text"
import { NumberTicker } from "./magicui/number-ticker"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card"
import { Separator } from "./ui/separator"
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

					<p className="text-sm sm:text-base md:text-xl text-muted-foreground leading-relaxed font-medium max-w-2xl mx-auto">
						Search <NumberTicker value={totalIcons} startValue={1000} className="font-bold text-muted-foreground" /> icons and logos for
						your dashboards, app directories and docs.
					</p>
					<div className="flex flex-col gap-3 text-sm text-muted-foreground mb-4">
						<p>{nativeCount.toLocaleString()} icons maintained by Dashboard Icons, alongside these independent collections:</p>
						<div className="flex flex-wrap justify-center gap-x-5 gap-y-3">
							{EXTERNAL_SOURCE_IDS.map((id) => {
								const source = EXTERNAL_SOURCES[id]
								return (
									<Link
										key={id}
										href={source.website}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 underline underline-offset-4"
									>
										<UnoptimizedImage src={source.icon} alt="" width={20} height={20} className="shrink-0" />
										{source.label}
										{typeof sourceCounts[id] === "number" && <span>({sourceCounts[id].toLocaleString()})</span>}
									</Link>
								)
							})}
						</div>
					</div>
					<div className="flex w-full flex-col gap-5 max-w-4xl mx-auto">
						<SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} totalIcons={totalIcons} />
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
							<Button asChild variant="outline" size="lg" className="h-14 w-full">
								<Link href="/icons">
									<Search data-icon="inline-start" />
									Browse icons & logos
								</Link>
							</Button>
							<AddMcpButton size="lg" source="hero" className="h-14 w-full" />

							<AddToSearchBarButton size="lg" className="h-14 w-full" />
							<GiveUsAStarButton />
							<SupportCollectionsButton />
							<GiveUsLoveButton />
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
		<Button asChild variant="outline" size="lg" className="h-14 w-full">
			<Link href="https://github.com/homarr-labs/dashboard-icons" target="_blank" rel="noopener noreferrer">
				<Star data-icon="inline-start" />
				Give us a star
				{stars !== null && <span className="text-muted-foreground">{stars.toLocaleString("en-US")}</span>}
			</Link>
		</Button>
	)
}

export function GiveUsLoveButton() {
	return (
		<HoverCard openDelay={200} closeDelay={200}>
			<HoverCardTrigger asChild>
				<Button variant="outline" size="lg" className="h-14 w-full">
					<div className="flex items-center gap-2">
						<p>Give us love</p>
						<Heart className="h-4 w-4 ml-1 fill-primary text-primary" />
					</div>
				</Button>
			</HoverCardTrigger>
			<HoverCardContent className="w-96 max-w-[calc(100vw-2rem)]">
				<div className="grid gap-4">
					<div className="space-y-2">
						<p className="font-medium leading-none flex items-center gap-2">
							<Heart className="h-4 w-4 fill-primary text-primary" />
							Support us without spending
						</p>
						<p className="text-sm text-muted-foreground">We keep our service free through minimal, non-intrusive ads.</p>
					</div>

					<div className="flex gap-2 items-start">
						<div className="space-y-1">
							<p className="text-sm font-medium text-primary">Please consider disabling your ad-blocker</p>
							<p className="text-xs text-primary/80">
								We only show ads on the icon detail pages (/icons/{"{id}"}) and never on the main site.
							</p>
							<p className="text-xs text-primary/80 mt-2 italic">
								Note: If you use a network-wide ad blocker (like Pi-hole or AdGuard Home), you may need to whitelist "carbonads.net"
								specifically.
							</p>
						</div>
					</div>

					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground">Privacy and analytics:</p>
						<ul className="text-xs text-muted-foreground/80 space-y-1.5">
							<li className="flex items-start gap-2">
								<span className="text-primary font-bold">✓</span>
								<span>We use analytics to understand site usage</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary font-bold">✓</span>
								<span>We don't sell account information</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary font-bold">✓</span>
								<span>Browser storage supports sign-in, preferences, and analytics</span>
							</li>
						</ul>
					</div>

					<Link href="/privacy" className="text-xs underline underline-offset-4 hover:text-primary">
						Read our Privacy Policy
					</Link>

					<Separator className="bg-secondary/20" />

					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
							<Share2 className="h-4 w-4 text-primary" />
							Spread the word
						</p>
						<p className="text-xs text-muted-foreground/80">
							Don't want to disable your ad blocker? You can still help us by sharing our website with others who might find it useful.
						</p>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	)
}

function SupportCollectionsButton() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="lg" className="h-14 w-full">
					<Heart data-icon="inline-start" />
					Support icon collections
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
