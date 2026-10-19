"use client"

import { Check, ChevronDown } from "lucide-react"
import { useState } from "react"
import { AssetPreview } from "@/components/submission/submission-preview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { customVariantNameError, SUBMISSION_VARIANTS, type SubmissionVariant, variantKind } from "@/lib/submission-variants"

export interface UnassignedAsset {
	id: string
	file: File
	references: { variant: SubmissionVariant; reference: string }[]
}

export function LegacyAssetAssignment({
	asset,
	occupied,
	onAssign,
}: {
	asset: UnassignedAsset
	occupied: SubmissionVariant[]
	onAssign: (variant: SubmissionVariant) => void
}) {
	const [slot, setSlot] = useState("")
	const [customName, setCustomName] = useState("")
	const [error, setError] = useState("")
	const variants = [...new Set([...SUBMISSION_VARIANTS, ...asset.references.map((reference) => reference.variant)])]
	const assign = () => {
		if (!slot) {
			setError("Choose a Variant for this file.")
			return
		}
		if (slot === "custom") {
			const error = customVariantNameError(customName)
			if (error) {
				setError(error)
				return
			}
		}
		let variant: SubmissionVariant
		if (slot === "custom") variant = `custom:${customName}`
		else {
			const selected = variants.find((variant) => variant === slot)
			if (!selected) {
				setError("Choose a recognised Variant.")
				return
			}
			variant = selected
		}
		if (occupied.includes(variant)) {
			setError("That Variant already has a file. Choose an empty slot or a distinct Custom name.")
			return
		}
		onAssign(variant)
	}
	return (
		<section className="flex min-w-0 flex-col gap-3 rounded-md border bg-background p-3">
			<AssetPreview asset={{ ...asset, variant: "base" }} alt={`Unassigned original file ${asset.file.name}`} className="h-24 w-full" />
			<p className="break-all font-mono text-sm font-medium">{asset.file.name}</p>
			{asset.references.map(({ variant, reference }) => (
				<p key={`${variant}-${reference}`} className="break-words text-xs text-muted-foreground">
					Original {variantKind(variant).label} reference: <span className="break-all font-mono">{reference}</span>
				</p>
			))}
			<div className="flex flex-col gap-2">
				<label htmlFor={`assign-${asset.id}`} className="break-all text-sm font-medium">
					Variant for {asset.file.name}
				</label>
				<div className="relative">
					<select
						id={`assign-${asset.id}`}
						value={slot}
						onChange={(event) => {
							setSlot(event.target.value)
							setError("")
						}}
						className="h-10 w-full min-w-0 appearance-none rounded-md border bg-background pr-9 pl-3 text-sm shadow-xs transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
					>
						<option value="">Choose a Variant</option>
						{variants.map((variant) => (
							<option key={variant} value={variant} disabled={occupied.includes(variant)}>
								{variantKind(variant).label}
								{occupied.includes(variant) && " (already assigned)"}
							</option>
						))}
						<option value="custom">Another Custom variant</option>
					</select>
					<ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
				</div>
			</div>
			{slot === "custom" && (
				<div className="flex flex-col gap-2">
					<label htmlFor={`assign-custom-${asset.id}`} className="text-sm font-medium">
						Custom variant name
					</label>
					<Input
						id={`assign-custom-${asset.id}`}
						value={customName}
						onChange={(event) => {
							setCustomName(event.target.value)
							setError("")
						}}
						placeholder="For example alternate"
						className="font-mono"
					/>
				</div>
			)}
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<Button variant="outline" onClick={assign}>
				<Check aria-hidden />
				Assign Variant
			</Button>
		</section>
	)
}
