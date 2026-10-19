import Link from "next/link"
import { REPO_PATH } from "@/constants"
import { ThemeSwitcher } from "./theme-switcher"

const footerLinkClass =
	"inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-1 underline-offset-4 hover:text-foreground hover:underline outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"

export function Footer() {
	return (
		<footer className="border-t bg-background">
			<div className="container mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-1 text-xs text-muted-foreground md:px-6">
				<Link href="/" className={`${footerLinkClass} gap-1 font-medium text-foreground`}>
					Dashboard Icons <span className="font-normal text-muted-foreground">by Homarr Labs</span>
				</Link>
				<div className="flex items-center gap-3">
					<nav aria-label="Footer" className="flex items-center gap-2">
						<Link href="/privacy" className={footerLinkClass}>
							Privacy
						</Link>
						<Link href="/terms" className={footerLinkClass}>
							Terms
						</Link>
						<Link href="/license" className={footerLinkClass}>
							License
						</Link>
						<a href="mailto:homarr-labs@proton.me" className={footerLinkClass}>
							Contact
						</a>
						<a href={REPO_PATH} target="_blank" rel="noreferrer" className={footerLinkClass}>
							GitHub
						</a>
					</nav>
					<ThemeSwitcher />
				</div>
			</div>
		</footer>
	)
}
