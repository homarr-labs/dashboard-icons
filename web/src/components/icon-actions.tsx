import { Check, Copy, Download, Github, Link as LinkIcon } from "lucide-react"
import Link from "next/link"
import type React from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const ACTION_BUTTON_CLASS = "relative size-11 rounded-lg md:size-9 md:after:absolute md:after:-inset-1 md:after:content-['']"

export type IconActionsProps = {
	imageUrl: string
	githubUrl: string
	iconName: string
	label: string
	format: string
	variantKey: string
	copiedUrlKey: string | null
	copiedImageKey: string | null
	handleDownload: (event: React.MouseEvent, url: string, filename: string) => Promise<void>
	handleCopyUrl: (url: string, variantKey: string, event?: React.MouseEvent) => void
	handleCopyImage: (imageUrl: string, format: string, variantKey: string, event?: React.MouseEvent) => Promise<void>
}

export function IconActions({
	imageUrl,
	githubUrl,
	iconName,
	label,
	format,
	variantKey,
	copiedUrlKey,
	copiedImageKey,
	handleDownload,
	handleCopyUrl,
	handleCopyImage,
}: IconActionsProps) {
	const downloadFilename = `${iconName}.${format}`
	const isUrlCopied = copiedUrlKey === variantKey
	const isImageCopied = copiedImageKey === variantKey

	return (
		<TooltipProvider delayDuration={300}>
			<div className="flex gap-2 mt-3 w-full justify-center">
				{/* Download Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className={`${ACTION_BUTTON_CLASS} cursor-pointer`}
							onClick={(e) => handleDownload(e, imageUrl, downloadFilename)}
							aria-label={`Download ${label}`}
						>
							<Download className="w-4 h-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Download {format.toUpperCase()}</p>
					</TooltipContent>
				</Tooltip>

				{/* Copy Image Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className={`${ACTION_BUTTON_CLASS} cursor-pointer`}
							onClick={(e) => handleCopyImage(imageUrl, format, variantKey, e)}
							aria-label={`Copy image of ${label}`}
						>
							{isImageCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Copy image to clipboard</p>
					</TooltipContent>
				</Tooltip>

				{/* Copy URL Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className={`${ACTION_BUTTON_CLASS} cursor-pointer`}
							onClick={(e) => handleCopyUrl(imageUrl, variantKey, e)}
							aria-label={`Copy direct URL for ${label}`}
						>
							{isUrlCopied ? <Check className="w-4 h-4 text-green-500" /> : <LinkIcon className="w-4 h-4" />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Copy direct URL</p>
					</TooltipContent>
				</Tooltip>

				{/* View on GitHub Button */}
				{githubUrl && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="outline" size="icon" className={ACTION_BUTTON_CLASS} asChild>
								<Link href={githubUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${label} on GitHub`}>
									<Github className="w-4 h-4" />
								</Link>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>View on GitHub</p>
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</TooltipProvider>
	)
}
