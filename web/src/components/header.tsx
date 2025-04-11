import { IconSubmissionForm } from "@/components/icon-submission-form"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { REPO_PATH } from "@/constants"
import { Github } from "lucide-react"
import Link from "next/link"
import { HeaderNav } from "./header-nav"

export async function Header() {
	return (
		<header className="border-b">
			<div className="px-4 md:px-12 flex items-center justify-between h-16">
				<div className="flex items-center gap-2 md:gap-6">
					<Link href="/" className="text-lg md:text-xl font-bold">
						Dashboard-icons
					</Link>
					<HeaderNav />
				</div>
				<div className="flex items-center gap-2 md:gap-4">
					<IconSubmissionForm />
					<Link href={REPO_PATH} target="_blank" className="text-sm font-medium transition-colors hover:text-primary">
						<Github className="h-5 w-5" />
					</Link>
					<ThemeSwitcher />
				</div>
			</div>
		</header>
	)
}
