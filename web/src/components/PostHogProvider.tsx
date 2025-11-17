"use client"

import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { Suspense, useEffect } from "react"
import { usePostHogAuth } from "@/hooks/use-posthog-auth"

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if (process.env.NEXT_PUBLIC_DISABLE_POSTHOG === "true") return
		// biome-ignore lint/style/noNonNullAssertion: The NEXT_PUBLIC_POSTHOG_KEY environment variable is guaranteed to be set in production.
		posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
			ui_host: "https://eu.posthog.com",
			api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
			capture_pageview: false, // We capture pageviews manually
			capture_pageleave: true, // Enable pageleave capture
			person_profiles: "identified_only",
			loaded(posthogInstance) {
				// @ts-expect-error
				window.posthog = posthogInstance
			},
		})
	}, [])

	return (
		<PHProvider client={posthog}>
			<PostHogAuthHandler />
			<SuspendedPostHogPageView />
			{children}
		</PHProvider>
	)
}

function PostHogAuthHandler() {
	usePostHogAuth()
	return null
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
