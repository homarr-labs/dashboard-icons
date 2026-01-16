// biome-ignore-all lint: reason: I don't want to fix this
import { useEffect, useRef, useState } from "react"

export function Carbon() {
	const [isBlocked, setIsBlocked] = useState(false)
	const [isDismissed, setIsDismissed] = useState(false)
	const ref = useRef<HTMLDivElement>(null!)

	// if (process.env.NODE_ENV === "development") {
	// 	return null
	// }

	useEffect(() => {
		// Check for cookie
		const isDismissedCookie = document.cookie
			.split("; ")
			.find((row) => row.startsWith("carbon-ads-dismissed="))
			?.split("=")[1]

		if (isDismissedCookie === "true") {
			setIsDismissed(true)
		}

		const serve = "CW7IKKQM"
		const placement = "dashboardiconscom"

		if (ref.current) {
			ref.current.innerHTML = ""
			const s = document.createElement("script")
			s.id = "_carbonads_js"
			s.src = `//cdn.carbonads.com/carbon.js?serve=${serve}&placement=${placement}`
			s.onerror = () => {
				setIsBlocked(true)
			}
			ref.current.appendChild(s)

			const timeout = setTimeout(() => {
				const ads = ref.current?.querySelector("#carbonads")
				if (!ads) {
					setIsBlocked(true)
				}
			}, 3000)

			return () => clearTimeout(timeout)
		}
	}, [])

	const handleDismiss = () => {
		setIsDismissed(true)
		// Set cookie for 7 days
		const date = new Date()
		date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000)
		document.cookie = `carbon-ads-dismissed=true; expires=${date.toUTCString()}; path=/`
	}

	if (isBlocked && !isDismissed) {
		return (
			<div className="flex flex-col items-center justify-center gap-2">
				<img loading="lazy" src="/ad-blocker.webp" height={500} width={300} alt="Anti ad-blocker ad" />
				<button
					type="button"
					onClick={handleDismiss}
					className="text-xs text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer"
				>
					Dismiss this message
				</button>
			</div>
		)
	}

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
				<div ref={ref} className="carbon-outer" />
			</div>
		</>
	)
}
