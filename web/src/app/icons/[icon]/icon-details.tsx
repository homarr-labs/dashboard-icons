"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BASE_URL, REPO_PATH } from "@/constants"
import type { Icon } from "@/types/icons"
import { Copy, Download, Github } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"

type IconDetailsProps = {
	icon: string
	iconData: Icon
	authorData: {
		name?: string
		login: string
		avatar_url: string
		html_url: string
	}
}

export function IconDetails({ icon, iconData, authorData }: IconDetailsProps) {
	// Use the author login if they don't have a name
	const authorName = authorData.name || authorData.login
	const iconColorVariants = iconData.colors
	return (
		<div className="p-8">
			<div className="max-w-4xl mx-auto">
				<div className="flex items-center gap-4 mb-8">
					<Image src={`${BASE_URL}/${iconData.base}/${icon}.${iconData.base}`} width={64} height={64} alt={icon} className="w-16 h-16" />
					<div>
						<h1 className="text-3xl font-bold capitalize">{icon}</h1>
						<p className="text-gray-600">Updated {new Date(iconData.update.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (3 months ago)</p>
					</div>
				</div>

				<div className="grid gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Author Information</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-4">
								<Avatar>
									<AvatarImage src={authorData.avatar_url} alt={authorData.name} />
									<AvatarFallback>{authorName.slice(0, 2)}</AvatarFallback>
								</Avatar>
								<div>
									<Link href={authorData.html_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
										{authorName}
									</Link>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Icon Details</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-muted-foreground">Format</p>
									<p className="font-medium">{iconData.base.toUpperCase()}</p>
								</div>
								<div>
									<p className="text-muted-foreground">Categories</p>
									<p className="font-medium">{iconData.categories.length > 0 ? iconData.categories.join(", ") : "No categories"}</p>
								</div>
								<div>
									<p className="text-muted-foreground">Aliases</p>
									<p className="font-medium">{iconData.aliases.length > 0 ? iconData.aliases.join(", ") : "No aliases"}</p>
								</div>
								{iconData.colors && (
									<div>
										<p className="text-muted-foreground">Color Variants</p>
										<p className="font-medium">
											{Object.entries(iconData.colors).map(([theme, variant]) => (
												<span key={theme} className="mr-2">
													{theme}: {variant}
												</span>
											))}
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Icon Variants</CardTitle>
							<CardDescription>Click on an icon to copy its URL to your clipboard</CardDescription>
						</CardHeader>
						<CardContent>
							{(() => {
								// Determine available formats based on base format
								const availableFormats = (() => {
									switch (iconData.base) {
										case "svg":
											return ["svg", "png", "webp"]
										case "png":
											return ["png", "webp"]
										default:
											return [iconData.base]
									}
								})()

								const renderVariant = (format: string, icon: string, theme: "light" | "dark") => {
									const url = `${BASE_URL}/${format}/${iconColorVariants?.[theme] || icon}.${format}`
									const githubUrl = `${REPO_PATH}/tree/main/${format}/${icon}.${format}`
									return (
										<div key={`${format}-${icon}`} className="flex flex-col items-center">
											<Button
												variant="ghost"
												className="relative w-24 h-24 mb-2 p-0"
												onClick={() => {
													navigator.clipboard.writeText(url)
													toast.success("URL copied", {
														description: `The icon URL for ${icon} in ${format} format has been copied to your clipboard`,
													})
												}}
											>
												<Image src={url} alt={`${icon} in ${format} format`} fill className="object-contain" />
											</Button>
											<p className="text-sm text-muted-foreground">{format.toUpperCase()}</p>
											<div className="flex gap-2 mt-2">
												<Button variant="outline" size="sm" asChild>
													<Link href={url} download>
														<Download className="w-4 h-4 mr-2" />
													</Link>
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														navigator.clipboard.writeText(url)
														toast.success("URL copied", {
															description: "The icon URL has been copied to your clipboard",
														})
													}}
												>
													<Copy className="w-4 h-4 mr-2" />
												</Button>
												<Button variant="outline" size="sm" asChild>
													<Link href={githubUrl} target="_blank" rel="noopener noreferrer">
														<Github className="w-4 h-4" />
													</Link>
												</Button>
											</div>
										</div>
									)
								}

								return (
									<div className="space-y-8">
										{!iconData.colors ? (
											<div className="grid grid-cols-3 gap-4">{availableFormats.map((format) => renderVariant(format, icon))}</div>
										) : (
											<>
												<div>
													<h3 className="text-lg font-semibold mb-4">Light Theme</h3>
													<div className="grid grid-cols-3 gap-4 uppercase">{availableFormats.map((format) => renderVariant(format, icon, "light"))}</div>
												</div>
												<div>
													<h3 className="text-lg font-semibold mb-4">Dark Theme</h3>
													<div className="grid grid-cols-3 gap-4 uppercase">{availableFormats.map((format) => renderVariant(format, icon, "dark"))}</div>
												</div>
											</>
										)}
									</div>
								)
							})()}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
