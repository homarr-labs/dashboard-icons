export const ICON_NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const MAX_QUERY_LENGTH = 100
export const MAX_NAME_LENGTH = 80
export const MAX_CATEGORY_LENGTH = 50
export const MAX_REQUEST_BODY_BYTES = 64 * 1024

export class ValidationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "ValidationError"
	}
}

export function assertIconName(name: string): string {
	const trimmed = name.trim()
	if (!trimmed || trimmed.length > MAX_NAME_LENGTH) {
		throw new ValidationError(`Invalid icon name: must be 1-${MAX_NAME_LENGTH} characters`)
	}
	if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("\0")) {
		throw new ValidationError("Invalid icon name: forbidden characters")
	}
	if (!ICON_NAME_REGEX.test(trimmed)) {
		throw new ValidationError("Invalid icon name format: expected kebab-case slug")
	}
	return trimmed
}
