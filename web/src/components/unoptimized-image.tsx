import Image from "next/image"

type UnoptimizedImageProps = {
	src: string
	alt: string
	width?: number
	height?: number
	className?: string
}

export function UnoptimizedImage({ src, alt, width = 64, height = 64, className }: UnoptimizedImageProps) {
	return <Image src={src} alt={alt} width={width} height={height} className={className} unoptimized />
}
