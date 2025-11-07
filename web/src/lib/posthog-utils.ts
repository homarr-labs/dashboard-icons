import { pb } from "./pb"

/**
 * Identifies a user in PostHog with their PocketBase user data
 * Follows PostHog best practices for user identification
 *
 * @param posthog - PostHog instance
 * @param user - PocketBase user model (optional, will use current auth if not provided)
 */
export function identifyUserInPostHog(posthog: any, user?: any) {
	if (!posthog) return

	const userData = user || pb.authStore.model

	if (!userData) return

	// Use PocketBase user ID as distinct_id (unique string)
	// Pass all available person properties for complete profile
	posthog.identify(userData.id, {
		email: userData.email,
		username: userData.username,
		name: userData.username, // Use username as name if no separate name field
		created: userData.created,
		updated: userData.updated,
		admin: userData.admin || false,
		avatar: userData.avatar || null,
		// Add any other relevant user properties
		user_id: userData.id,
		email_verified: userData.emailVisibility || false,
	})
}

/**
 * Resets PostHog identity (should be called on logout)
 * This unlinks future events from the user
 *
 * @param posthog - PostHog instance
 */
export function resetPostHogIdentity(posthog: any) {
	if (!posthog) return

	// Reset PostHog identity to unlink future events from this user
	// This is important for shared computers and follows PostHog best practices
	posthog.reset()
}
