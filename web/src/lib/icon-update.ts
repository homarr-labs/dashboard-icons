import type { Submission } from "@/lib/pb"
import type { UpdateTarget, UpdateVariantKey } from "../../backend/pb_hooks/icon-update-policy"

export type {
	IconUpdate,
	ListDelta,
	RemovableVariantKey,
	RemoveVariantInput,
	UpdateTarget,
	UpdateVariantKey,
} from "../../backend/pb_hooks/icon-update-policy"
export { applyList, FIXUP_RENAME_ERROR, fixUpdate, listDelta } from "../../backend/pb_hooks/icon-update-policy.js"

export interface UpdatePreview {
	url: string
	formats: string[]
	filename: string
}
export interface UpdateTargetResponse {
	target: UpdateTarget
	previews: Partial<Record<UpdateVariantKey, UpdatePreview>>
}
export interface OwnedSubmissionResponse {
	record: Submission
	baseline?: UpdateTargetResponse
}
