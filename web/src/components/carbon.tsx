// biome-ignore-all lint: reason: I don't want to fix this
import { useEffect, useRef, useState } from "react"
import { usePostHog } from "posthog-js/react"

export function Carbon() {
	const [isBlocked, setIsBlocked] = useState(false)
	const [isDismissed, setIsDismissed] = useState(false)
	const [showSurvey, setShowSurvey] = useState(false)
	const ref = useRef<HTMLDivElement>(null!)
	const posthog = usePostHog()

	if (process.env.NODE_ENV === "development") {
		return null
	}

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
		setShowSurvey(true)
	}

	const handleSurveyResponse = (response: string) => {
		// Capture the survey response to PostHog
		posthog?.capture("survey sent", {
			$survey_id: "019bf9d4-0a9b-0000-2c54-e10ca4ecb9d9",
			$survey_questions: [
				{
					id: "7e3edab2-57b5-436f-86e2-969ab5b66523",
					question: "Did you like this ad within the website or was it annoying?",
				},
			],
			$survey_response_7e3edab2_57b5_436f_86e2_969ab5b66523: response,
		})

		// Set dismissed state and cookie
		setIsDismissed(true)
		const date = new Date()
		date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000)
		document.cookie = `carbon-ads-dismissed=true; expires=${date.toUTCString()}; path=/; SameSite=Lax`
	}

	if (isBlocked && !isDismissed) {
		return (
			<div className="flex flex-col items-center justify-center gap-2">
				<img loading="lazy" src="/ad-blocker.webp" height={500} width={300} alt="Anti ad-blocker ad" />
				{!showSurvey ? (
					<button
						type="button"
						onClick={handleDismiss}
						className="text-xs text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer"
					>
						Dismiss this message
					</button>
				) : (
					<div className="flex flex-col items-center gap-2">
						<p className="text-xs text-muted-foreground">
							Did you think this ad for ad-blocker was funny or annoying?
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => handleSurveyResponse("Like it (it's funny)")}
								className="text-xs px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white transition-colors cursor-pointer"
							>
								Like it (it's funny)
							</button>
							<button
								type="button"
								onClick={() => handleSurveyResponse("Hate it (I want absolutely NO ADS)")}
								className="text-xs px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
							>
								Hate it (I want absolutely NO ADS)
							</button>
						</div>
					</div>
				)}
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
