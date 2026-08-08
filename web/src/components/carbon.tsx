// biome-ignore-all lint: reason: I don't want to fix this
"use client"

import { useEffect, useRef } from "react"

const isDev = process.env.NODE_ENV === "development"

export function Carbon() {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isDev) return
		const el = ref.current
		if (!el) return
		const serve = "CW7IKKQM"
		const placement = "dashboardiconscom"
		el.innerHTML = ""
		const s = document.createElement("script")
		s.id = "_carbonads_js"
		s.async = true
		s.src = `https://cdn.carbonads.com/carbon.js?serve=${serve}&placement=${placement}`
		el.appendChild(s)
	}, [])

	return (
		<>
			<style>
				{`
					#carbonads * { margin: initial; padding: initial; }
					#carbonads {
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
							Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', Helvetica, Arial,
							sans-serif;
						display: flex;
					}
					#carbonads a {
						text-decoration: none;
						color: inherit;
					}
					#carbonads span {
						position: relative;
						display: block;
						overflow: hidden;
						width: 100%;
					}
					#carbonads .carbon-wrap {
						display: flex;
						flex-direction: column;
					}
					#carbonads .carbon-img {
						display: block;
						margin: 0;
						line-height: 1;
					}
					#carbonads .carbon-img img {
						display: block;
						height: 100%;
						max-width: 100% !important;
						width: 100%;
						border-radius: 4px;
					}
					#carbonads .carbon-text {
						font-size: 11px;
						padding: 10px;
						margin-bottom: 16px;
						line-height: 1.5;
						text-align: left;
					}
					#carbonads .carbon-poweredby {
						display: block;
						padding: 6px 8px;
						text-align: center;
						text-transform: uppercase;
						letter-spacing: 0.5px;
						font-weight: 600;
						font-size: 8px;
						line-height: 1;
						border-top-left-radius: 3px;
						position: absolute;
						bottom: 0;
						right: 0;
						background: rgba(128, 128, 128, 0.1);
					}
				`}
			</style>
			<div className="m-4">
				{isDev ? (
					<div
						className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-6 text-center text-[11px] leading-snug text-muted-foreground"
						data-carbon-placeholder
					>
						Carbon ad (shown on production only — localhost is usually not filled by Carbon)
					</div>
				) : (
					<div ref={ref} className="carbon-outer" />
				)}
			</div>
		</>
	)
}
