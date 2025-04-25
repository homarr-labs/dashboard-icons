"use client"

import { REPO_PATH } from "@/constants"
import { motion } from "framer-motion"
import { ExternalLink, Heart } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

// Pre-define unique IDs for animations to avoid using array indices as keys
const HOVER_HEART_IDS = [
	"hover-heart-1",
	"hover-heart-2",
	"hover-heart-3",
	"hover-heart-4",
	"hover-heart-5",
	"hover-heart-6",
	"hover-heart-7",
	"hover-heart-8",
]
const BURST_HEART_IDS = ["burst-heart-1", "burst-heart-2", "burst-heart-3", "burst-heart-4", "burst-heart-5"]

export function Footer() {
	const [isHeartHovered, setIsHeartHovered] = useState(false)
	const [isHeartFilled, setIsHeartFilled] = useState(false)

	// Toggle heart fill state and add extra mini hearts on click
	const handleHeartClick = () => {
		setIsHeartFilled(!isHeartFilled)
	}

	return (
		<footer className="border-t py-4  relative overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-r from-rose-500/[0.03] via-transparent to-rose-500/[0.03]" />

			<div className="container mx-auto mb-2 px-4 md:px-6 relative z-10">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
					<div className="flex flex-col gap-3">
						<h3 className="font-bold text-lg text-foreground/90">Dashboard Icons</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							Collection of icons for applications, services, and tools - designed for dashboards and app directories.
						</p>
					</div>

					<div className="flex flex-col gap-3">
						<h3 className="font-bold text-lg text-foreground/90">Links</h3>
						<div className="flex flex-col gap-2">
							<Link href="/" className="text-sm text-muted-foreground hover: transition-colors duration-200 flex items-center w-fit">
								<span>Home</span>
							</Link>
							<Link href="/icons" className="text-sm text-muted-foreground hover: transition-colors duration-200 flex items-center w-fit">
								<span>Icons</span>
							</Link>
						</div>
					</div>

					<motion.div
						className="flex flex-col gap-3"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.2 }}
					>
						<h3 className="font-bold text-lg text-foreground/90">Community</h3>
						<div className="text-sm flex flex-wrap items-center gap-1.5 leading-relaxed">
							Made with{" "}
							<div className="relative inline-block">
								<motion.div
									className="cursor-pointer"
									onMouseEnter={() => setIsHeartHovered(true)}
									onMouseLeave={() => setIsHeartHovered(false)}
									onClick={handleHeartClick}
									whileTap={{ scale: 0.85 }}
								>
									<motion.div
										animate={{
											scale: isHeartFilled ? [1, 1.3, 1] : 1,
										}}
										transition={{
											duration: isHeartFilled ? 0.4 : 0,
											ease: "easeInOut",
										}}
									>
										<Heart
											className="h-3.5 w-3.5  flex-shrink-0 hover:scale-125 transition-all duration-200"
											fill={isHeartFilled ? "#f43f5e" : "none"}
											strokeWidth={isHeartFilled ? 1.5 : 2}
										/>
									</motion.div>
								</motion.div>

								{/* Easter egg mini hearts */}
								{isHeartHovered && (
									<>
										{HOVER_HEART_IDS.map((id, i) => (
											<motion.div
												key={id}
												initial={{ scale: 0, opacity: 0 }}
												animate={{
													scale: [0, 1, 0.8],
													opacity: [0, 1, 0],
													x: [0, (i % 2 === 0 ? 1 : -1) * Math.random() * 20],
													y: [0, -Math.random() * 30],
												}}
												transition={{
													duration: 0.8 + Math.random() * 0.5,
													ease: "easeOut",
													delay: Math.random() * 0.2,
												}}
												className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
											>
												<Heart className={`h-2 w-2 ${i < 3 ? "text-rose-300" : i < 6 ? "text-rose-400" : ""}`} />
											</motion.div>
										))}

										{/* Subtle particle glow */}
										<motion.div
											initial={{ scale: 0, opacity: 0 }}
											animate={{
												scale: [0, 3],
												opacity: [0, 0.3, 0],
											}}
											transition={{ duration: 0.6, ease: "easeOut" }}
											className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-rose-500/20 pointer-events-none"
										/>
									</>
								)}

								{/* Heart fill animation extras */}
								{isHeartFilled && (
									<>
										{/* Radiating circles on heart fill */}
										<motion.div
											initial={{ scale: 0.5, opacity: 0 }}
											animate={{
												scale: [0.5, 2.5],
												opacity: [0.5, 0],
											}}
											transition={{ duration: 0.6, ease: "easeOut" }}
											className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full bg-rose-500/30 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
										/>

										{/* Extra burst of mini hearts when filled */}
										{BURST_HEART_IDS.map((id, i) => (
											<motion.div
												key={id}
												initial={{ scale: 0, opacity: 0 }}
												animate={{
													scale: [0, 1, 0.8],
													opacity: [0, 1, 0],
													x: [0, Math.cos((i * Math.PI) / 2.5) * 25],
													y: [0, Math.sin((i * Math.PI) / 2.5) * 25],
												}}
												transition={{
													duration: 0.6,
													ease: "easeOut",
												}}
												className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
											>
												<Heart className="h-2 w-2 " fill="#f43f5e" />
											</motion.div>
										))}
									</>
								)}
							</div>{" "}
							by Homarr Labs and the open source community.
						</div>
						<Link
							href={REPO_PATH}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm   transition-colors duration-200 flex items-center gap-1.5 w-fit mt-1 group"
						>
							Contribute to this project
							<ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
						</Link>
					</motion.div>
				</div>
			</div>
		</footer>
	)
}
