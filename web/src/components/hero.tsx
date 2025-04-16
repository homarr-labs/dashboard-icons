"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Circle, Github, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface IconCardProps {
	name: string
	imageUrl: string
}

function IconCard({ name, imageUrl }: IconCardProps) {
	return (
		<Card className="p-4 hover:shadow-md transition-shadow duration-300 flex flex-col items-center gap-2 cursor-pointer group">
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
	gradient = "from-background/[0.1]",
}: {
	className?: string
	delay?: number
	width?: number
	height?: number
	rotate?: number
	gradient?: string
}) {
	return (
		<motion.div
			initial={{
				opacity: 0,
				y: -150,
				rotate: rotate - 15,
			}}
			animate={{
				opacity: 1,
				y: 0,
				rotate: rotate,
			}}
			transition={{
				duration: 2.4,
				delay,
				ease: [0.23, 0.86, 0.39, 0.96],
				opacity: { duration: 1.2 },
			}}
			className={cn("absolute", className)}
		>
			<motion.div
				animate={{
					y: [0, 15, 0],
				}}
				transition={{
					duration: 12,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
				style={{
					width,
					height,
				}}
				className="relative"
			>
				<div
					className={cn(
						"absolute inset-0 rounded-full",
						"bg-gradient-to-r to-transparent",
						gradient,
						"backdrop-blur-[2px] border-2 border-white/[0.15]",
						"shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
						"after:absolute after:inset-0 after:rounded-full",
						"after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]",
					)}
				/>
			</motion.div>
		</motion.div>
	)
}

export function HeroSection({ totalIcons }: { totalIcons: number }) {
	const [searchQuery, setSearchQuery] = useState("")

	const fadeUpVariants = {
		hidden: { opacity: 0, y: 30 },
		visible: (i: number) => ({
			opacity: 1,
			y: 0,
			transition: {
				duration: 1,
				delay: 0.5 + i * 0.2,
				ease: [0.25, 0.4, 0.25, 1],
			},
		}),
	}

	return (
		<div className="relative pt-40 w-full flex items-center justify-center overflow-hidden bg-background">
			<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />

			<div className="absolute inset-0 overflow-hidden">
				<ElegantShape
					delay={0.3}
					width={600}
					height={140}
					rotate={12}
					gradient="from-indigo-500/[0.15]"
					className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
				/>

				<ElegantShape
					delay={0.5}
					width={500}
					height={120}
					rotate={-15}
					gradient="from-rose-500/[0.15]"
					className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
				/>

				<ElegantShape
					delay={0.4}
					width={300}
					height={80}
					rotate={-8}
					gradient="from-violet-500/[0.15]"
					className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
				/>

				<ElegantShape
					delay={0.6}
					width={200}
					height={60}
					rotate={20}
					gradient="from-amber-500/[0.15]"
					className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
				/>

				<ElegantShape
					delay={0.7}
					width={150}
					height={40}
					rotate={-25}
					gradient="from-cyan-500/[0.15]"
					className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
				/>
			</div>

			<div className="relative z-10 container mx-auto px-4 md:px-6">
				<div className="max-w-4xl mx-auto text-center flex flex-col gap-4">
					<Link prefetch href="https://github.com/homarr-labs" target="_blank" rel="noopener noreferrer" className="mx-auto">
						<motion.div variants={fadeUpVariants} custom={0} initial="hidden" animate="visible">
							<Card className="p-2 flex flex-row items-center gap-2 hover:scale-105 transition-all duration-300">
								<Circle className="h-2 w-2 fill-rose-500/80" />
								<span className="text-sm text-foreground/60 tracking-wide">by homarr-labs</span>
							</Card>
						</motion.div>
					</Link>

					<motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
						<h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 md:mb-8 tracking-tight">
							<span className="bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/80">
								Your definitive source for
							</span>
							<br />
							<span className={cn("bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-foreground/90 to-rose-300")}>
								dashboard icons.
							</span>
						</h1>
					</motion.div>

					<motion.div custom={2} variants={fadeUpVariants} initial="hidden" animate="visible">
						<p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed font-light tracking-wide max-w-2xl mx-auto px-4">
							A collection of {totalIcons} beautiful, clean and consistent icons for your dashboard, application, or website.
						</p>
					</motion.div>

					<motion.div
						custom={3}
						variants={fadeUpVariants}
						initial="hidden"
						animate="visible"
						className="flex flex-col items-center gap-6 mb-12"
					>
						<form action="/icons" method="GET" className="relative w-full max-w-md">
							<Input
								name="q"
								type="search"
								placeholder={`Search ${totalIcons} icons...`}
								className="pl-10 h-12 rounded-lg"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
						</form>
						<div className="flex gap-4">
							<Button variant="default" className="rounded-lg" size="lg" asChild>
								<Link href="/icons" className="flex items-center">
									Browse all icons
								</Link>
							</Button>
							<Button variant="outline" size="lg" className="gap-2" asChild>
								<Link href="https://github.com/homarr-labs/dashboard-icons" target="_blank" rel="noopener noreferrer">
									GitHub
									<Github className="h-4 w-4" />
								</Link>
							</Button>
						</div>
					</motion.div>
				</div>
			</div>

			<div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80 pointer-events-none" />
		</div>
	)
}
