"use client"
// PROTOTYPE: four radically different multi-icon /submit variants, mounted on /submit?variant=A..D outside production with a stub user and in-memory state.
import { useSearchParams } from "next/navigation"
import type { ReactNode } from "react"
import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher"
import { VariantA } from "./variant-a"
import { VariantB } from "./variant-b"
import { VariantC } from "./variant-c"
import { VariantD } from "./variant-d"

const VARIANTS = [
	{ key: "A", name: "Drop & sort", Component: VariantA },
	{ key: "B", name: "One icon at a time", Component: VariantB },
	{ key: "C", name: "Spreadsheet", Component: VariantC },
	{ key: "D", name: "Board of slot matrices", Component: VariantD },
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
