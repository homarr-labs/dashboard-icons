"use client"

import { motion } from "framer-motion"
import { Heart } from "lucide-react"
import { useState } from "react"

export function HeartEasterEgg() {
	const [isHeartHovered, setIsHeartHovered] = useState(false)
	const [isHeartFilled, setIsHeartFilled] = useState(false)

	const handleHeartClick = () => {
		setIsHeartFilled(!isHeartFilled)
	}

	return (
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
						{[...Array(8)].map((_, i) => (
							<motion.div
								key={i}
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
						{[...Array(8)].map((_, i) => (
							<motion.div
								key={i}
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
	)
}
