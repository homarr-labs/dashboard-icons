import Image from "next/image"
import type { CSSProperties } from "react"

type UnoptimizedImageProps = {
	src: string
	alt: string
	width?: number
	height?: number
	className?: string
	style?: CSSProperties
	priority?: boolean
}

function usesFlexibleSizing(className?: string): boolean {
	if (!className) return false

	return /\b(max-[wh][\w-]*|w-full|h-full)\b/.test(className)
}

export function UnoptimizedImage({ src, alt, width = 64, height = 64, className, style, priority }: UnoptimizedImageProps) {
	const sizeStyle: CSSProperties = usesFlexibleSizing(className) ? { width: "auto", height: "auto" } : { width, height }

	return (
		<Image
			src={src}
			alt={alt}
			width={width}
			height={height}
			className={className}
			style={{ ...sizeStyle, ...style }}
			unoptimized
			priority={priority}
		/>
	)
}
