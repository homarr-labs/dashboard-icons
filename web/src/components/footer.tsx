import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { REPO_PATH } from "@/constants"
import { HeartEasterEgg } from "./heart"

export function Footer() {
	return (
		<footer className="border-t py-4  relative overflow-hidden">
			<div className="absolute inset-0 bg-background bg-gradient-to-r from-primary/[0.03] via-transparent to-primary/[0.03]" />

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

					<div className="flex flex-col gap-3">
						<h3 className="font-bold text-lg text-foreground/90">Community</h3>
						<HeartEasterEgg />
						<Link
							href={REPO_PATH}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm   transition-colors duration-200 flex items-center gap-1.5 w-fit mt-1 group"
						>
							Contribute to this project
							<ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
						</Link>
					</div>
				</div>
			</div>
		</footer>
	)
}
