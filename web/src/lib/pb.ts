import PocketBase, { type RecordService } from "pocketbase"
import type { ExternalIcon } from "@/types/icons"

// Public URLs must remain browser-reachable when records are rendered on the server.
const PUBLIC_PB_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090"
function serverUrl(): string {
	return process.env.PB_URL || PUBLIC_PB_URL
}
function clientUrl(): string {
	if (typeof window === "undefined") return serverUrl()
	return PUBLIC_PB_URL
}

export interface User {
	id: string
	username: string
	email: string
	github_id?: string
	admin?: boolean
	avatar?: string
	created: string
	updated: string
}

export interface Submission {
	id: string
	name: string
	assets: string[]
	created_by: string
	status: "approved" | "rejected" | "pending" | "added_to_collection"
	approved_by: string
	expand: {
		created_by: User
		approved_by: User
	}
	extras: {
		aliases: string[]
		categories: string[]
		base?: string
		colors?: {
			dark?: string
			light?: string
		}
		wordmark?: {
			dark?: string
			light?: string
		}
	}
	created: string
	updated: string
	admin_comment: string
	description: string
}

export interface CommunityGallery {
	id: string
	name: string
	created_by: string
	approved_by?: string
	description?: string
	created_by_github_id?: string
	status: "approved" | "rejected" | "pending" | "added_to_collection"
	assets: string[]
	admin_comment?: string
	created: string
	updated: string
	extras: {
		aliases: string[]
		categories: string[]
		base?: string
		colors?: {
			dark?: string
			light?: string
		}
		wordmark?: {
			dark?: string
			light?: string
		}
	}
}

interface TypedPocketBase extends PocketBase {
	collection(idOrName: string): RecordService
	collection(idOrName: "users"): RecordService<User>
	collection(idOrName: "submissions"): RecordService<Submission>
	collection(idOrName: "community_gallery"): RecordService<CommunityGallery>
	collection(idOrName: "external_icons"): RecordService<ExternalIcon>
}

export const pb = new PocketBase(clientUrl()) as TypedPocketBase

export function createServerPB(): TypedPocketBase {
	return new PocketBase(serverUrl()) as TypedPocketBase
}

export function getPocketBaseUrl(): string {
	return PUBLIC_PB_URL
}
