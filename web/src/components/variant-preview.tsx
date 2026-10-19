import { UnoptimizedImage } from "@/components/unoptimized-image"
import type { VariantBackground } from "@/lib/submission-variants"
import { cn } from "@/lib/utils"

const BACKDROPS = {
	light: "bg-white",
	dark: "bg-zinc-950",
} as const

function backdrops(background: VariantBackground): (keyof typeof BACKDROPS)[] {
	if (background === "any") return ["light", "dark"]
	return [background]
}

export function VariantPreview({
	src,
	alt,
	background,
	className,
}: {
	src: string
	alt: string
	background: VariantBackground
	className?: string
}) {
	return (
		<div className={cn("flex overflow-hidden rounded-md ring-1 ring-border", className)}>
			{backdrops(background).map((backdrop) => (
				<div key={backdrop} className={cn("flex h-full min-w-0 flex-1 items-center justify-center p-2", BACKDROPS[backdrop])}>
					<UnoptimizedImage src={src} alt={`${alt} on a ${backdrop} background`} className="h-full max-h-full w-full object-contain" />
				</div>
			))}
		</div>
	)
}
