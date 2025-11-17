"use client"

import { usePostHog } from "posthog-js/react"
import { useEffect, useRef } from "react"
import { pb } from "@/lib/pb"
import { identifyUserInPostHog, resetPostHogIdentity } from "@/lib/posthog-utils"

export function usePostHogAuth() {
	const posthog = usePostHog()
	const hasIdentified = useRef(false)

	useEffect(() => {
		const checkAuthAndIdentify = () => {
			if (pb.authStore.isValid && pb.authStore.model) {
				// User is logged in, identify them in PostHog
				// Only call identify once per session to avoid unnecessary calls
				if (!hasIdentified.current) {
					identifyUserInPostHog(posthog)
					hasIdentified.current = true
				}
			} else {
				// User is not logged in, reset PostHog identity
				// This unlinks future events from the user (important for shared computers)
				resetPostHogIdentity(posthog)
				hasIdentified.current = false
			}
		}

		// Check auth state on mount
		checkAuthAndIdentify()

		// Listen for auth changes
		const unsubscribe = pb.authStore.onChange(() => {
			checkAuthAndIdentify()
		})

		// Cleanup listener on unmount
		return () => {
			unsubscribe()
		}
	}, [posthog])
}
