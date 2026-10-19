"use client"

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
		<section className="min-w-0 space-y-3 rounded-lg bg-muted/40 p-4">
			<p className="break-all font-mono text-sm font-medium">{asset.file.name}</p>
			<AssetPreview asset={{ ...asset, variant: "base" }} alt={`Unassigned original file ${asset.file.name}`} className="h-24 w-full" />
			{asset.references.map(({ variant, reference }) => (
				<p key={`${variant}-${reference}`} className="break-words text-sm text-muted-foreground">
					Original {variantKind(variant).label} reference: <span className="break-all font-mono">{reference}</span>
				</p>
			))}
			<div className="space-y-2">
				<label htmlFor={`assign-${asset.id}`} className="break-all text-sm font-medium">
					Variant for {asset.file.name}
				</label>
				<select
					id={`assign-${asset.id}`}
					value={slot}
					onChange={(event) => {
						setSlot(event.target.value)
						setError("")
					}}
					className="min-h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
			</div>
			{slot === "custom" && (
				<div className="space-y-2">
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
					/>
				</div>
			)}
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<Button variant="outline" className="min-h-11" onClick={assign}>
				Assign Variant
			</Button>
		</section>
	)
}
