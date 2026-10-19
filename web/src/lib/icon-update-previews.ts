import "server-only"

import { BASE_URL } from "@/constants"
import type { UpdateTarget, UpdateTargetResponse } from "@/lib/icon-update"
import { getPocketBaseUrl } from "@/lib/pb"

export function iconUpdatePreviews(target: UpdateTarget): UpdateTargetResponse {
	const previews: UpdateTargetResponse["previews"] = {}
	for (const [key, file] of Object.entries(target.files)) {
		if (!file) continue
		if (target.kind === "published") {
			const source = target.source
			if (!source || !/^[a-f0-9]{40}$/.test(source.commit)) continue
			const formats = ["svg", "png", "webp"].filter((format) => Object.hasOwn(source.blobs, `${format}/${file}.${format}`))
			if (formats.length)
				previews[key as keyof typeof previews] = {
					url: `${BASE_URL}@${source.commit}/${formats[0]}/${file}.${formats[0]}`,
					formats,
					filename: `${file}.${formats[0]}`,
				}
		} else
			previews[key as keyof typeof previews] = {
				url: `${getPocketBaseUrl()}/api/files/submissions/${target.id}/${encodeURIComponent(file)}`,
				formats: [file.split(".").pop() ?? ""],
				filename: file,
			}
	}
	return { target, previews }
}
