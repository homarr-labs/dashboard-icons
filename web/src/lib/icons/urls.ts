import { BASE_URL } from "@/constants"

export type IconFormat = "svg" | "png" | "webp"
export type IconTheme = "default" | "light" | "dark"

function resolveFileName(name: string, theme: IconTheme): string {
	if (theme === "light") return `${name}-light`
	if (theme === "dark") return `${name}-dark`
	return name
}

export function buildIconUrl(name: string, format: IconFormat = "svg", theme: IconTheme = "default"): string {
	const fileName = resolveFileName(name, theme)
	return `${BASE_URL}/${format}/${fileName}.${format}`
}
