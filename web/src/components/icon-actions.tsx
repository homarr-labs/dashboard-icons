import { Check, Copy, Download, Github, Link as LinkIcon } from "lucide-react"
import Link from "next/link"
import { type MouseEvent, type ReactNode, useId, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type CopyIconUrlProps = {
	imageUrl: string
	assetLabel: string
	children: ReactNode
	onCopy: (event: MouseEvent<HTMLButtonElement>) => void
}

export function CopyIconUrl({ imageUrl, assetLabel, children, onCopy }: CopyIconUrlProps) {
	const fieldId = useId()
	const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)

	const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
		let url = imageUrl
		if (url.startsWith("/")) url = new URL(url, window.location.origin).href

		try {
			await navigator.clipboard.writeText(url)
		} catch {
			setFallbackUrl(url)
			toast.error("Could not copy URL", {
				description: `Select and copy the direct URL for ${assetLabel} in the field below the button.`,
			})
			return
		}

		toast.success(`Copied URL for ${assetLabel}`)
		onCopy(event)
	}

	return (
		<>
			<Button
				type="button"
				variant={null}
				size={null}
				aria-label={`Copy URL for ${assetLabel}`}
				onClick={handleCopy}
				className="group/copy flex min-h-11 min-w-11 flex-col p-1 transition-none hover:scale-none focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground"
			>
				{children}
				<span className="flex items-center justify-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-sm font-medium group-hover/copy:bg-muted">
					<LinkIcon aria-hidden="true" className="size-4" />
					Copy URL
				</span>
			</Button>
			{fallbackUrl && (
				<div className="mt-3 w-full min-w-0 space-y-1">
					<label htmlFor={fieldId} className="block text-sm font-medium">
						Direct URL <span className="sr-only">for {assetLabel}</span>
					</label>
					<p id={`${fieldId}-hint`} className="text-xs text-muted-foreground">
						Select and copy the URL.
					</p>
					<Textarea
						id={fieldId}
						aria-describedby={`${fieldId}-hint`}
						value={fallbackUrl}
						readOnly
						rows={3}
						onFocus={(event) => event.currentTarget.select()}
						className="w-full min-w-0 resize-y font-mono focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
					/>
				</div>
			)}
		</>
	)
}

export type IconActionsProps = {
	imageUrl: string
	githubUrl: string
	iconName: string
	format: string
	variantKey: string
	copiedImageKey: string | null
	handleDownload: (event: MouseEvent, url: string, filename: string) => Promise<void>
	handleCopyImage: (imageUrl: string, format: string, variantKey: string, event?: MouseEvent) => Promise<void>
}

export function IconActions({
	imageUrl,
	githubUrl,
	iconName,
	format,
	variantKey,
	copiedImageKey,
	handleDownload,
	handleCopyImage,
}: IconActionsProps) {
	const downloadFilename = `${iconName}.${format}`
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
							className="h-8 w-8 rounded-lg cursor-pointer"
							onClick={(e) => handleDownload(e, imageUrl, downloadFilename)}
							aria-label={`Download ${iconName} as ${format.toUpperCase()}`}
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
							className="h-8 w-8 rounded-lg cursor-pointer"
							onClick={(e) => handleCopyImage(imageUrl, format, variantKey, e)}
							aria-label={`Copy ${iconName} image as ${format.toUpperCase()}`}
						>
							{isImageCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Copy image to clipboard</p>
					</TooltipContent>
				</Tooltip>

				{/* View on GitHub Button */}
				{githubUrl && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" asChild>
								<Link href={githubUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${iconName} ${format} file on GitHub`}>
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
