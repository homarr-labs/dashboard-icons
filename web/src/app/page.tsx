import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BASE_URL } from "@/constants"
import { ArrowRight, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { promises as fs } from "node:fs"

async function getFeaturedIcons() {
	const file = await fs.readFile(`${process.cwd()}/../metadata.json`, "utf8")
	const data = JSON.parse(file)

	// Get 6 random icons
	const icons = Object.keys(data)
	const featuredIcons = []

	for (let i = 0; i < 6; i++) {
		const randomIndex = Math.floor(Math.random() * icons.length)
		const iconName = icons[randomIndex]
		featuredIcons.push({
			name: iconName,
			data: data[iconName],
		})
		icons.splice(randomIndex, 1)
	}

	return featuredIcons
}

export default async function Home() {
	const featuredIcons = await getFeaturedIcons()

	return (
		<div className="flex flex-col min-h-screen">
			{/* Hero Section */}
			<section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
				<div className="container px-4 md:px-6 mx-auto space-y-10 text-center">
					<div className="space-y-4">
						<h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">Beautiful & consistent icons</h1>
						<p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
							A collection of over 1500 beautiful, clean and consistent icons for your dashboard
						</p>
					</div>

					<div className="mx-auto w-full max-w-md flex items-center gap-2">
						<div className="relative w-full">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Search for icons..."
								className="w-full pl-8 pr-4 py-2 rounded-l-md border border-input bg-background"
							/>
						</div>
						<Button asChild className="rounded-l-none">
							<Link href="/icons">
								Search
							</Link>
						</Button>
					</div>

					<div className="flex flex-wrap gap-4 justify-center">
						{featuredIcons.map((icon) => (
							<Link
								key={icon.name}
								href={`/icon/${icon.name}`}
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

					<Button asChild size="lg" className="mt-6">
						<Link href="/icons">
							Browse all icons
							<ArrowRight className="ml-2 h-4 w-4" />
						</Link>
					</Button>
				</div>
			</section>

			{/* Features Section */}
			<section className="w-full py-12 md:py-24 lg:py-32">
				<div className="container px-4 md:px-6 mx-auto">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<Card>
							<CardContent className="pt-6">
								<div className="mb-4 text-primary">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="h-10 w-10"
										aria-hidden="true"
									>
										<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
										<path d="M3 3v5h5" />
										<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
										<path d="M16 16h5v5" />
									</svg>
								</div>
								<h3 className="text-xl font-bold">Lightweight & Scalable</h3>
								<p className="text-muted-foreground mt-2">Icons are lightweight, highly optimized scalable vector graphics (SVG).</p>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="pt-6">
								<div className="mb-4 text-primary">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="h-10 w-10"
										aria-hidden="true"
									>
										<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
										<path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
									</svg>
								</div>
								<h3 className="text-xl font-bold">Clean & consistent</h3>
								<p className="text-muted-foreground mt-2">
									Designed with a strict set of design rules for consistency in style and readability.
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="pt-6">
								<div className="mb-4 text-primary">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="h-10 w-10"
										aria-hidden="true"
									>
										<path d="M7 7h10v10" />
										<path d="M7 17 17 7" />
									</svg>
								</div>
								<h3 className="text-xl font-bold">Customizable</h3>
								<p className="text-muted-foreground mt-2">Customize the color, size, stroke width, and more to match your design system.</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>
		</div>
	)
}
