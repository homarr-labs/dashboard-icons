"use client"

import { usePathname, useSearchParams } from "next/navigation"
import posthog, { type CaptureResult } from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { Suspense, useEffect } from "react"
import { usePostHogAuth } from "@/hooks/use-posthog-auth"

// Drops opaque cross-origin "Script error." reports. The browser hands window.onerror a
// sanitized report for third-party scripts, so PostHog captures a synthetic, unhandled
// exception with no stack. These are undiagnosable, so they only add noise to error tracking.
function dropOpaqueScriptErrors(event: CaptureResult | null): CaptureResult | null {
	if (event?.event !== "$exception") return event
	const list = event.properties?.$exception_list
	if (!Array.isArray(list) || list.length !== 1) return event
	const [exception] = list
	const value = typeof exception?.value === "string" ? exception.value.trim() : ""
	const isScriptError = value === "Script error." || value === "Script error"
	const hasNoStack = !exception?.stacktrace?.frames?.length
	if (isScriptError && exception?.mechanism?.handled === false && exception?.mechanism?.synthetic === true && hasNoStack) {
		return null
	}
	return event
}

// Firefox raises this security error when React DOM reads one of its own properties (for
// example `correspondingUseElement` or `__reactFiber$<random>`) on a cross-origin object that
// a browser extension injects. No user flow breaks, so drop the event to stop the noise. The
// pattern stays scoped to React's property names, so a real cross-origin bug on another
// property still reports.
const REACT_DOM_CROSS_ORIGIN_ERROR = /Permission denied to access property "(?:correspondingUseElement|__react)/

function dropCrossOriginSecurityErrors(event: CaptureResult | null): CaptureResult | null {
	if (event?.event !== "$exception") return event
	const list = event.properties?.$exception_list
	if (Array.isArray(list) && list.some((exception) => REACT_DOM_CROSS_ORIGIN_ERROR.test(exception?.value ?? ""))) {
		return null
	}
	return event
}

// posthog-js's `before_send` accepts a single callback (it wraps it in an array internally and
// would treat a real array as one no-op callback). Compose both filters into one so they run in
// order and match the SDK contract.
function beforeSend(event: CaptureResult | null): CaptureResult | null {
	return dropCrossOriginSecurityErrors(dropOpaqueScriptErrors(event))
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if (process.env.NEXT_PUBLIC_DISABLE_POSTHOG === "true") return
		// biome-ignore lint/style/noNonNullAssertion: The NEXT_PUBLIC_POSTHOG_KEY environment variable is guaranteed to be set in production.
		posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
			ui_host: "https://eu.posthog.com",
			api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
			// Keep event volume low: disable automatic click/input/form capture and pageleave.
			// Pageviews are captured manually below, so we only pay for the events we actually use.
			autocapture: false,
			capture_pageview: false, // We capture pageviews manually
			capture_pageleave: false, // Disable pageleave to reduce event volume
			person_profiles: "identified_only",
			before_send: beforeSend,
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
