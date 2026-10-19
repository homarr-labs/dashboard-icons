"use client"
// PROTOTYPE: mounts the reference submit form on /submit?variant=C (any ?variant or ?prototype value) outside production, with a stub user and in-memory state.
import { useSearchParams } from "next/navigation"
import type { ReactNode } from "react"
import { SubmitFormPrototype } from "./submit-form"

export function SubmitPrototypeGate({ children }: { children: ReactNode }) {
	const params = useSearchParams()
	const enabled = params.has("variant") || params.has("prototype")
	if (process.env.NODE_ENV === "production" || !enabled) return children
	return <SubmitFormPrototype />
}
