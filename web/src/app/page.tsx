import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BASE_URL } from "@/constants"
import { ArrowRight, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { promises as fs } from "node:fs"

async function getFeaturedIcons() {
	const file = await fs.readFile(`${process.cwd()}/../metadata.json`, "utf8")
	const data = JSON.parse(file)

	const featuredIcons = ["homarr", "sonarr", "radarr", "lidarr", "qbittorrent"].map((iconName) => ({
		name: iconName,
		data: data[iconName],
	}))

	return { featuredIcons, totalIcons: Object.keys(data).length }
}

export default async function Home() {
	const { featuredIcons, totalIcons } = await getFeaturedIcons()

	return (
		<div className="flex flex-col min-h-screen">
			{/* Hero Section */}
			<section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
				<div className="container px-4 md:px-6 mx-auto space-y-10 text-center">
					<div className="space-y-4">
						<h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">Beautiful & consistent icons</h1>
						<p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
							A collection of {totalIcons} beautiful, clean and consistent icons for your dashboard
						</p>
					</div>

					<div className="mx-auto w-full max-w-md flex items-center gap-2">
						<form action="/icons" method="GET" className="w-full flex items-center gap-2">
							<div className="relative w-full">
								<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									name="q"
									type="search"
									placeholder="Search for icons..."
									className="w-full pl-8 pr-4 py-2 rounded-l-md border border-input bg-background"
								/>
							</div>
							<Button type="submit" className="rounded-l-none">
								Search
							</Button>
						</form>
					</div>

					<div className="flex flex-wrap gap-4 justify-center">
						{featuredIcons.map((icon) => (
							<Link
								key={icon.name}
								href={`/icons/${icon.name}`}
								className="relative h-12 w-12 rounded-md hover:scale-110 transition-transform"
							>
								<Image
									src={`${BASE_URL}/${icon.data.base}/${icon.name}.${icon.data.base}`}
									alt={icon.name}
									fill
									className="object-contain p-1"
								/>
							</Link>
						))}
					</div>
					<Link href="/icons">
						<p className="text-xs font-medium">and {totalIcons} more</p>
					</Link>

					<Button asChild size="lg" className="mt-6">
						<Link href="/icons">
							Browse all icons
							<ArrowRight className="ml-2 h-4 w-4" />
						</Link>
					</Button>
				</div>
			</section>
		</div>
	)
}
