"use client"

import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { Suspense, useEffect } from "react"

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com"

if (typeof window !== "undefined" && posthogKey) {
	posthog.init(posthogKey, {
		ui_host: "https://eu.posthog.com",
		api_host: posthogHost,
		capture_pageview: false, // We capture pageviews manually
		capture_pageleave: true, // Enable pageleave capture
		loaded(posthogInstance) {
			// @ts-expect-error
			window.posthog = posthogInstance
		},
	})
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	// Render children without PostHog if the key is missing
	if (!posthogKey) {
		return <>{children}</>
	}

	return (
		<PHProvider client={posthog}>
			<SuspendedPostHogPageView />
			{children}
		</PHProvider>
	)
}

function PostHogPageView() {
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const posthogClient = usePostHog()

	useEffect(() => {
		if (pathname && posthogClient) {
			let url = window.origin + pathname
			const search = searchParams.toString()
			if (search) {
				url += `?${search}`
			}
			posthogClient.capture("$pageview", { $current_url: url })
		}
	}, [pathname, searchParams, posthogClient])

	return null
}

function SuspendedPostHogPageView() {
	return (
		<Suspense fallback={null}>
			<PostHogPageView />
		</Suspense>
	)
}
