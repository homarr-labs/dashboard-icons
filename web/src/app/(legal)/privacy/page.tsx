import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
	title: "Privacy Policy",
	description: "How Dashboard Icons handles website and MCP information, analytics, advertising, and your privacy choices.",
	alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
	return (
		<>
			<h1>Privacy Policy</h1>
			<p>Last updated: October 23, 2026</p>
			<p>
				Dashboard Icons is an open-source project maintained by Homarr Labs. This policy explains how we handle information on
				dashboardicons.com and its MCP endpoints. It does not cover independently hosted copies or third-party sites linked from our
				catalog. For privacy questions or requests, contact <a href="mailto:homarr-labs@proton.me">homarr-labs@proton.me</a>.
			</p>

			<h2>Information we handle</h2>
			<ul>
				<li>
					You can browse and download icons without an account. Requests may expose your IP address, browser, requested URL, and device
					information to our hosting and content-delivery services.
				</li>
				<li>
					If you create an account, we store your email address, username, authentication information, and account timestamps in PocketBase.
					GitHub sign-in also provides profile information authorized by you, such as your GitHub identifier and avatar.
				</li>
				<li>
					Icon submissions include uploaded files, descriptions, aliases, categories, attribution, and moderation history. Accepted
					contributions and contributor attribution may be published on the site and in our public GitHub repository.
				</li>
				<li>If you contact us, we receive your message, contact details, and information you choose to include.</li>
			</ul>

			<h2>Website analytics and browser storage</h2>
			<p>
				We use PostHog to understand usage and diagnose problems. It receives page views, including page URLs and query strings, selected
				interactions such as searches, downloads and sign-ins, and technical diagnostics. When you sign in, analytics can be associated with
				your account ID, email address, username, and profile details. Do not put sensitive information in searches or URLs. Automatic click
				and form capture is disabled in our application configuration.
			</p>
			<p>
				Authentication, appearance preferences, and dismissed notices use browser storage. PostHog may also use cookies or local storage for
				analytics identifiers. These analytics functions are separate from storage needed to sign in. You can manage or clear cookies and
				site storage in your browser and use content-blocking tools; doing so may sign you out or affect site features. Read{" "}
				<a href="https://posthog.com/privacy">PostHog&apos;s privacy policy</a> for its processing practices.
			</p>

			<h2 id="mcp">MCP clients and tool calls</h2>
			<p>
				The public icon endpoint at <code>/api/mcp/public</code> processes the tool arguments your client sends, such as search terms,
				service names, categories, and theme preferences, to return icon results. It does not require an account or accept account
				credentials. It does not request conversation context or model information and does not use PostHog analytics. Send only the icon
				information needed for the request; do not include secrets or sensitive personal information.
			</p>
			<p>
				Public tool calls are not saved in an application history. The application temporarily holds IP-based counters in server memory to
				enforce rate limits. Our hosting and network providers receive request information, such as IP addresses, request URLs, and client
				headers, and may keep operational and security logs. This policy does not promise a fixed deletion period for those providers&apos;
				logs; contact us with retention questions.
			</p>
			<p>
				The separate endpoint at <code>/api/mcp</code> supports account features and uses server-side PostHog analytics when enabled. Its
				analytics configuration includes tool-call information, client and session identifiers, conversation identifiers, supplied context
				and model information, and the caller&apos;s IP address. Signed-in calls can be linked to your account ID, username, and administrator
				status. Request authentication context is removed before analytics events are sent. Browser cookie settings do not disable this
				server-side analytics; use the public endpoint for icon lookups without it.
			</p>
			<p>
				Your MCP client or AI provider also processes the conversation and tool results under its own policies. Loading an icon URL returned
				by a tool contacts the relevant content provider, which receives request information. You can stop future MCP requests by
				disconnecting the server in your client. For information already handled by Dashboard Icons, use the contact and rights process below.
			</p>

			<h2>Advertising and external services</h2>
			<p>
				We display Carbon Ads on icon detail pages to support the project. Loading or interacting with an ad sends information such as your
				IP address, browser details, and referring page to the advertising service. Its use of cookies and other identifiers is governed by{" "}
				<a href="https://www.carbonads.net/privacy.php">Carbon Ads&apos; privacy policy</a>.
			</p>
			<p>
				Icons and other resources may load from GitHub, jsDelivr, selfh.st, LobeHub, and Simple Icons. Those services receive request
				information when your browser contacts them. GitHub sign-in and external donation links are also subject to their providers&apos;
				policies. We do not receive payment-card details entered on donation platforms.
			</p>

			<h2>Why we use and share information</h2>
			<p>
				We use information to provide accounts and the icon catalog, review contributions, answer requests, protect the service, understand
				usage, and support the project through advertising. We share information with service providers as needed for those purposes,
				publish contributions as described above, and may disclose information when legally required or necessary to protect users and the
				project. We do not sell account information.
			</p>
			<p>
				Where data-protection law applies, the relevant legal grounds may include providing a service you request, our legitimate interests
				in operating and securing the project, legal obligations, and consent where required. This policy is not a request for consent and
				does not replace any consent required by law.
			</p>

			<h2>Retention and security</h2>
			<p>
				We retain information for as long as needed for the purposes described here, including account administration, moderation, security,
				and legal obligations. Retention varies by data type and provider. Deleting an account does not automatically remove public
				contributions, repository history, cached files, or copies distributed to others. Contact us to discuss removal of personal
				attribution. No online service can guarantee absolute security.
			</p>
			<p>
				Our providers may process information outside your country. Their locations and applicable transfer safeguards depend on the service
				used.
			</p>

			<h2>Your rights and choices</h2>
			<p>
				Depending on your location, you may have rights to access, correct, delete, or obtain a copy of personal information, object to or
				restrict processing, and withdraw consent where processing relies on it. You may also complain to your local data-protection
				authority. Send requests to <a href="mailto:homarr-labs@proton.me">homarr-labs@proton.me</a>; we may need to verify account
				ownership before acting. Please do not send passwords or identity documents in an initial request.
			</p>

			<h2>Children and policy updates</h2>
			<p>
				The service is not directed at children under 13. If you believe a child has supplied personal information, contact us. We may
				update this policy as the service changes and will revise the date above. Material changes will be highlighted on the site or
				communicated to affected account holders where required.
			</p>
			<p>
				See also our <Link href="/terms">Terms of Service</Link>.
			</p>
		</>
	)
}
