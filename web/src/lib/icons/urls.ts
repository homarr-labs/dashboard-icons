import { BASE_URL } from "@/constants"
import type { Icon } from "@/types/icons"

export type IconFormat = "svg" | "png" | "webp"
export type IconTheme = "default" | "light" | "dark"

function resolveFileName(name: string, theme: IconTheme): string {
	if (theme === "light") return `${name}-light`
	if (theme === "dark") return `${name}-dark`
	return name
}

export function buildIconUrl(
	name: string,
	format: IconFormat = "svg",
	theme: IconTheme = "default",
): string {
	const fileName = resolveFileName(name, theme)
	return `${BASE_URL}/${format}/${fileName}.${format}`
}

export function buildIconUrls(name: string, icon: Icon) {
	const base = typeof icon.base === "string" && !icon.base.startsWith("http") ? icon.base : "svg"
	const urls: { svg: string; png: string; webp: string; light?: string; dark?: string } = {
		svg: buildIconUrl(name, "svg", "default"),
		png: buildIconUrl(name, "png", "default"),
		webp: buildIconUrl(name, "webp", "default"),
	}

	if (icon.colors?.light) {
		urls.light = `${BASE_URL}/${base}/${icon.colors.light}.${base}`
	}
	if (icon.colors?.dark) {
		urls.dark = `${BASE_URL}/${base}/${icon.colors.dark}.${base}`
	}
	return urls
}
