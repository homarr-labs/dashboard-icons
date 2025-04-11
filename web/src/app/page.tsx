import { HeroSection } from "@/components/hero"
import { getTotalIcons } from "@/lib/api"

export default async function Home() {
	const { totalIcons } = await getTotalIcons()

	return (
		<div className="flex flex-col min-h-screen">
			<HeroSection totalIcons={totalIcons} />
		</div>
	)
}
