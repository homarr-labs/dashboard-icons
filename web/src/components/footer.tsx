import Link from "next/link"
import { REPO_PATH } from "@/constants"
import { ThemeSwitcher } from "./theme-switcher"

export function Footer() {
	return (
		<footer className="border-t bg-background">
			<div className="container mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 text-xs text-muted-foreground md:px-6">
				<Link href="/" className="font-medium text-foreground hover:underline underline-offset-4">
					Dashboard Icons <span className="font-normal text-muted-foreground">by Homarr Labs</span>
				</Link>
				<div className="flex items-center gap-3">
					<nav aria-label="Footer" className="flex items-center gap-3">
						<Link href="/privacy" className="hover:text-foreground hover:underline underline-offset-4">
							Privacy
						</Link>
						<Link href="/terms" className="hover:text-foreground hover:underline underline-offset-4">
							Terms
						</Link>
						<a href="mailto:homarr-labs@proton.me" className="hover:text-foreground hover:underline underline-offset-4">
							Contact
						</a>
						<a href={REPO_PATH} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline underline-offset-4">
							GitHub
						</a>
					</nav>
					<ThemeSwitcher />
				</div>
			</div>
		</footer>
	)
}
