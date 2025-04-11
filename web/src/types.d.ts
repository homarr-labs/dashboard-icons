type IconAuthor = {
	id: number
	name: string
}

type IconUpdate = {
	timestamp: string
	author: IconAuthor
}

type IconColors = {
	dark: string
	light: string
}

type Icon = {
	base: "svg" | "png" | "webp"
	aliases: string[]
	categories: string[]
	update: IconUpdate
	colors?: IconColors
}

type IconFile = {
	[key: string]: Icon
}
