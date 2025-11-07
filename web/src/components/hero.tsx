"use client"

import { Separator } from "@radix-ui/react-dropdown-menu"
import { motion, useAnimation, useInView } from "framer-motion"
import {
	Car,
	Code,
	Coffee,
	DollarSign,
	ExternalLink,
	Eye,
	GitFork,
	Heart,
	Plus,
	Search,
	Server,
	Share2,
	Sparkles,
	Star,
	TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { AuroraText } from "./magicui/aurora-text"
import { InteractiveHoverButton } from "./magicui/interactive-hover-button"
import { NumberTicker } from "./magicui/number-ticker"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card"

interface IconCardProps {
	name: string
	imageUrl: string
}

function _IconCard({ name, imageUrl }: IconCardProps) {
	return (
		<Card className="p-4 flex flex-col items-center gap-2 cursor-pointer group hover-lift card-hover">
			<div className="w-16 h-16 flex items-center justify-center">
				<img src={imageUrl} alt={name} className="max-w-full max-h-full" />
			</div>
			<p className="text-sm text-center text-muted-foreground group-hover:text-foreground transition-colors">{name}</p>
		</Card>
	)
}

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

export function HeroSection({ totalIcons, stars }: { totalIcons: number; stars: number }) {
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
						<NumberTicker value={totalIcons} startValue={1000} className="font-bold tracking-tighter text-muted-foreground" /> curated icons
						for services, applications and tools, designed specifically for dashboards and app directories.
					</p>
					<div className="flex flex-col gap-4 max-w-3xl mx-auto">
						<SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} totalIcons={totalIcons} />
						<div className="w-full flex gap-3 md:gap-4 flex-wrap justify-center motion-preset-slide-down motion-duration-500">
							<Link href="/icons">
								<InteractiveHoverButton className="rounded-md bg-input/30">Browse icons</InteractiveHoverButton>
							</Link>
							<GiveUsAStarButton stars={stars} />
							<GiveUsMoneyButton />
							<GiveUsLoveButton />
						</div>
					</div>
				</div>
			</div>

			<div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80 pointer-events-none" />
		</div>
	)
}

export default function GiveUsAStarButton({ stars }: { stars: string | number }) {
	return (
		<HoverCard openDelay={200} closeDelay={200}>
			<HoverCardTrigger asChild>
				<Link
					href="https://github.com/homarr-labs/dashboard-icons"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center text-sm md:text-base"
				>
					<Button variant="outline" className="h-9 md:h-10 px-4" asChild>
						<div>
							<p>Give us a star</p>
							<Star className="h-4 w-4 ml-1 text-yellow-500 fill-yellow-500" />
							<span className="text-xs text-muted-foreground">{stars}</span>
						</div>
					</Button>
				</Link>
			</HoverCardTrigger>
			<HoverCardContent className="w-96">
				<div className="grid gap-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none flex items-center gap-2">
							<Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
							What is Starring?
						</h4>
						<p className="text-sm text-muted-foreground">
							Starring a repository on GitHub is like bookmarking it.
							<br /> It helps you keep track of projects you find interesting and shows appreciation to the project maintainers.
							<br /> You can star a repository by clicking the 'Star' button, usually found in the top-right corner of the repository's page
							on GitHub.
						</p>
					</div>

					<div className="space-y-2">
						<h5 className="text-sm font-medium text-muted-foreground">How your star helps us:</h5>
						<ul className="text-xs text-muted-foreground/80 space-y-1.5">
							<li className="flex items-start gap-2">
								<TrendingUp className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
								<span>Increases our visibility in GitHub search results</span>
							</li>
							<li className="flex items-start gap-2">
								<Eye className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
								<span>Attracts more contributors to improve the project</span>
							</li>
							<li className="flex items-start gap-2">
								<GitFork className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
								<span>Encourages more forks and community involvement</span>
							</li>
							<li className="flex items-start gap-2">
								<Plus className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
								<span>Grow the library with more icons</span>
							</li>
						</ul>
					</div>

					<div className="flex justify-between items-center pt-2">
						<Button
							variant="default"
							size="sm"
							className="bg-primary hover:bg-primary/90"
							onClick={() => window.open("https://github.com/homarr-labs/dashboard-icons", "_blank")}
						>
							Star
						</Button>
						<Button
							variant="link"
							size="sm"
							className="flex items-center gap-1 text-xs text-muted-foreground"
							onClick={() =>
								window.open("https://docs.github.com/get-started/exploring-projects-on-github/saving-repositories-with-stars", "_blank")
							}
						>
							Learn More
							<ExternalLink className="h-3 w-3" />
						</Button>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	)
}

export function GiveUsLoveButton() {
	return (
		<HoverCard openDelay={200} closeDelay={200}>
			<HoverCardTrigger asChild>
				<Button variant="outline" className="h-9 md:h-10 px-4 cursor-pointer">
					<div className="flex items-center gap-2">
						<p>Give us love</p>
						<Heart className="h-4 w-4 ml-1 fill-primary text-primary" />
					</div>
				</Button>
			</HoverCardTrigger>
			<HoverCardContent className="w-96">
				<div className="grid gap-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none flex items-center gap-2">
							<Heart className="h-4 w-4 fill-primary text-primary" />
							Support us without spending
						</h4>
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
						<h5 className="text-sm font-medium text-muted-foreground">Our Privacy Promise:</h5>
						<ul className="text-xs text-muted-foreground/80 space-y-1.5">
							<li className="flex items-start gap-2">
								<span className="text-primary font-bold">✓</span>
								<span>We don't track your browsing habits</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary font-bold">✓</span>
								<span>We don't sell your personal data</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary font-bold">✓</span>
								<span>We only use essential cookies</span>
							</li>
						</ul>
					</div>

					<Separator className="bg-secondary/20" />

					<div className="space-y-2">
						<h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
							<Share2 className="h-4 w-4 text-primary" />
							Spread the word
						</h5>
						<p className="text-xs text-muted-foreground/80">
							Don't want to disable your ad blocker? You can still help us by sharing our website with others who might find it useful.
						</p>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	)
}

export function GiveUsMoneyButton() {
	const openCollectiveUrl = "https://opencollective.com/homarr"

	return (
		<HoverCard openDelay={200} closeDelay={200}>
			<HoverCardTrigger asChild>
				<Link target="_blank" rel="noopener noreferrer" href={openCollectiveUrl}>
					<Button variant="outline" className="h-9 md:h-10 px-4" asChild>
						<div className="flex items-center gap-2">
							<p>Give us money</p>
							<DollarSign className="h-4 w-4 ml-1 text-yellow-500" />
						</div>
					</Button>
				</Link>
			</HoverCardTrigger>
			<HoverCardContent className="w-96">
				<div className="grid gap-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none flex items-center gap-2">
							<DollarSign className="h-4 w-4 text-yellow-500" />
							Support our open source work
						</h4>
						<p className="text-sm text-muted-foreground">Your donations help us maintain and improve our free, open-source project.</p>
					</div>

					<div className="space-y-1">
						<p className="text-sm font-medium text-primary">What is OpenCollective?</p>
						<p className="text-xs text-primary/80">
							OpenCollective is a transparent funding platform for open source projects. All donations and expenses are publicly visible,
							ensuring complete transparency in how funds are used.
						</p>
					</div>

					<div className="space-y-2">
						<h5 className="text-sm font-medium text-muted-foreground">Where your money goes:</h5>
						<ul className="text-xs text-muted-foreground/80 space-y-1.5">
							<li className="flex items-start gap-2">
								<Server className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
								<span>Hosting and infrastructure costs</span>
							</li>
							<li className="flex items-start gap-2">
								<Code className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
								<span>Development time for new features</span>
							</li>
							<li className="flex items-start gap-2">
								<Coffee className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
								<span>Coffee to fuel late-night coding sessions</span>
							</li>
							<li className="flex items-start gap-2 line-through opacity-70">
								<Car className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
								<span>A new Lamborghini (although we'd love to)</span>
							</li>
						</ul>
					</div>

					<div className="flex justify-between items-center pt-2">
						<Link href={openCollectiveUrl} target="_blank" rel="noopener noreferrer">
							<Button variant="default" size="sm" className="bg-primary hover:bg-primary/90">
								Support
							</Button>
						</Link>
						<Link href={`${openCollectiveUrl}/transactions`} target="_blank" rel="noopener noreferrer">
							<Button variant="link" size="sm" className="flex items-center gap-1 text-xs text-muted-foreground">
								View transactions
								<ExternalLink className="h-3 w-3" />
							</Button>
						</Link>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
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
				autoFocus
				type="search"
				placeholder={`Search our collection of ${totalIcons} icons by name or category...`}
				className="pl-10 h-10 md:h-12 rounded-lg w-full border-border focus:border-primary/20 text-sm md:text-base"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
			/>
			<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 md:h-5 w-4 md:w-5 text-muted-foreground group-focus-within: transition-all duration-300" />
		</form>
	)
}
