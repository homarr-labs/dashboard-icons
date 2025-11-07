/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
	status: number

	constructor(message: string, status = 500) {
		super(message)
		this.name = "ApiError"
		this.status = status
	}
}
