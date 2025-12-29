"use server"

import PocketBase from "pocketbase";

const GITHUB_OWNER = "homarr-labs";
const GITHUB_REPO = "dashboard-icons";
const WORKFLOW_FILE = "add-icon.yml";

interface TriggerWorkflowResult {
	success: boolean;
	error?: string;
	workflowUrl?: string;
}

/**
 * Verify the provided auth token belongs to an admin user
 * The token is passed from the client since auth is stored in localStorage
 */
async function verifyAdmin(
	authToken: string,
): Promise<{ isAdmin: boolean; error?: string }> {
	if (!authToken) {
		return { isAdmin: false, error: "Not authenticated" };
	}

	try {
		const pb = new PocketBase(
			process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090",
		);

		// Validate the token by refreshing auth
		// This will fail if the token is invalid/expired
		pb.authStore.save(authToken, null);

		const authData = await pb.collection("users").authRefresh();

		if (!authData?.record) {
			return { isAdmin: false, error: "Invalid authentication" };
		}

		// Check if user is admin
		if (!authData.record.admin) {
			return { isAdmin: false, error: "User is not an admin" };
		}

		return { isAdmin: true };
	} catch (error) {
		console.error("Error verifying admin:", error);
		return { isAdmin: false, error: "Failed to verify admin status" };
	}
}

/**
 * Trigger the "Add Icon to Collection" GitHub workflow for a submission
 * Only admins can trigger this action
 * @param authToken - The PocketBase auth token from the client
 * @param submissionId - The ID of the submission to add
 * @param dryRun - If true, skip actual writes (for testing)
 */
export async function triggerAddIconWorkflow(
	authToken: string,
	submissionId: string,
	dryRun = false,
): Promise<TriggerWorkflowResult> {
	// Verify admin status using the provided token
	const { isAdmin, error: authError } = await verifyAdmin(authToken);
	if (!isAdmin) {
		return { success: false, error: authError || "Unauthorized" };
	}

	// Check for GitHub token
	const githubToken = process.env.GITHUB_TOKEN;
	if (!githubToken) {
		return { success: false, error: "GitHub token not configured" };
	}

	try {
		// Trigger the workflow dispatch
		const response = await fetch(
			`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
			{
				method: "POST",
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${githubToken}`,
					"X-GitHub-Api-Version": "2022-11-28",
				},
				body: JSON.stringify({
					ref: "main",
					inputs: {
						submissionId: submissionId,
						dryRun: dryRun.toString(),
					},
				}),
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("GitHub API error:", response.status, errorText);
			return {
				success: false,
				error: `GitHub API error: ${response.status} - ${errorText}`,
			};
		}

		// The dispatch endpoint returns 204 No Content on success
		// Construct a URL to the workflow runs page
		const workflowUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}`;

		return {
			success: true,
			workflowUrl,
		};
	} catch (error) {
		console.error("Error triggering workflow:", error);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to trigger workflow",
		};
	}
}

interface BulkTriggerResult {
	submissionId: string;
	success: boolean;
	error?: string;
}

interface BulkTriggerWorkflowResult {
	success: boolean;
	results: BulkTriggerResult[];
	workflowUrl?: string;
}

/**
 * Trigger the "Add Icon to Collection" GitHub workflow for multiple submissions
 * Workflows are triggered sequentially with a small delay to avoid rate limiting
 * @param authToken - The PocketBase auth token from the client
 * @param submissionIds - Array of submission IDs to add
 * @param dryRun - If true, skip actual writes (for testing)
 */
export async function triggerBulkAddIconWorkflow(
	authToken: string,
	submissionIds: string[],
	dryRun = false,
): Promise<BulkTriggerWorkflowResult> {
	const { isAdmin, error: authError } = await verifyAdmin(authToken);
	if (!isAdmin) {
		return {
			success: false,
			results: submissionIds.map((id) => ({
				submissionId: id,
				success: false,
				error: authError || "Unauthorized",
			})),
		};
	}

	const githubToken = process.env.GITHUB_TOKEN;
	if (!githubToken) {
		return {
			success: false,
			results: submissionIds.map((id) => ({
				submissionId: id,
				success: false,
				error: "GitHub token not configured",
			})),
		};
	}

	const results: BulkTriggerResult[] = [];

	for (const submissionId of submissionIds) {
		try {
			const response = await fetch(
				`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
				{
					method: "POST",
					headers: {
						Accept: "application/vnd.github+json",
						Authorization: `Bearer ${githubToken}`,
						"X-GitHub-Api-Version": "2022-11-28",
					},
					body: JSON.stringify({
						ref: "main",
						inputs: {
							submissionId: submissionId,
							dryRun: dryRun.toString(),
						},
					}),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error(
					`GitHub API error for ${submissionId}:`,
					response.status,
					errorText,
				);
				results.push({
					submissionId,
					success: false,
					error: `GitHub API error: ${response.status}`,
				});
			} else {
				results.push({ submissionId, success: true });
			}

			// Small delay between requests to avoid rate limiting
			await new Promise((resolve) => setTimeout(resolve, 500));
		} catch (error) {
			console.error(`Error triggering workflow for ${submissionId}:`, error);
			results.push({
				submissionId,
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to trigger workflow",
			});
		}
	}

	const allSucceeded = results.every((r) => r.success);
	const workflowUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}`;

	return {
		success: allSucceeded,
		results,
		workflowUrl,
	};
}
