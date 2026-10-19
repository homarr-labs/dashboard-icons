"use client"
// PROTOTYPE pass 2: three structurally different /submit variants (each with Submit one / Modify one / Submit many), on /submit?variant=A..C outside production with a stub user and in-memory state.
import { useSearchParams } from "next/navigation"
import type { ReactNode } from "react"
import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher"
import { VariantA } from "./variant-a"
import { VariantB } from "./variant-b"
import { VariantC } from "./variant-c"

const VARIANTS = [
	{ key: "A", name: "Mode cards", Component: VariantA },
	{ key: "B", name: "Adaptive page + sheet", Component: VariantB },
	{ key: "C", name: "Card stack + preview", Component: VariantC },
]

export function SubmitPrototypeGate({ children }: { children: ReactNode }) {
	const params = useSearchParams()
	const key = params.get("variant")?.toUpperCase()
	if (process.env.NODE_ENV === "production" || !key) return children
	const current = VARIANTS.find((v) => v.key === key) ?? VARIANTS[0]
	return (
		<div className="pb-20">
			<current.Component key={current.key} />
			<PrototypeSwitcher variants={VARIANTS.map(({ key, name }) => ({ key, name }))} current={current.key} />
		</div>
	)
}
