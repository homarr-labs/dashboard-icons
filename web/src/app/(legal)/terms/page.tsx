import type { Metadata } from "next"
import Link from "next/link"
import { REPO_PATH } from "@/constants"

export const metadata: Metadata = {
	title: "Terms of Service",
	description: "Terms for using Dashboard Icons, downloading third-party logos, creating an account, and contributing icons.",
	alternates: { canonical: "/terms" },
}

export default function TermsPage() {
	return (
		<>
			<h1>Terms of Service</h1>
			<p>Last updated: September 19, 2026</p>
			<p>
				These terms govern your use of dashboardicons.com, maintained by Homarr Labs. By using the website, you agree to these terms. If you
				do not agree, please stop using it. These terms do not replace licenses that apply to individual assets or open-source code. Contact{" "}
				<a href="mailto:homarr-labs@proton.me">homarr-labs@proton.me</a> with questions.
			</p>

			<h2>The service</h2>
			<p>
				Dashboard Icons helps you discover and download icons and logos for applications, services, dashboards, and app directories. The
				catalog includes our repository, community submissions, and external collections. Listings may change or be removed, and we cannot
				guarantee that every asset, link, format, or description is accurate or always available.
			</p>

			<h2>Licenses, trademarks, and downloads</h2>
			<p>
				The project repository is published under the <a href={`${REPO_PATH}/blob/main/LICENSE`}>Apache License 2.0</a>. Third-party icons,
				logos, and external collections may have separate copyright, license, attribution, and brand-use requirements. The repository
				license does not grant ownership of third-party trademarks or override those requirements.
			</p>
			<p>
				Product names and marks belong to their respective owners. Their inclusion identifies products and does not imply endorsement or
				affiliation. Before using an asset, check its source and applicable license, including any limits on commercial use or modification.
				A free download is not a promise that every use is permitted.
			</p>

			<h2>Accounts and acceptable use</h2>
			<p>
				Keep account credentials secure, provide accurate information, and notify us if your account is compromised. You must be at least 13
				to create an account and meet any higher minimum age required where you live. If you are not legally able to agree to these terms
				independently, obtain permission from a parent or guardian.
			</p>
			<ul>
				<li>Do not upload malware, unlawful material, or content that infringes another person&apos;s rights.</li>
				<li>Do not impersonate others, submit deceptive attribution, spam the service, or harass contributors.</li>
				<li>Do not bypass access controls, access other users&apos; accounts, or disrupt the service with excessive requests.</li>
				<li>
					Use automated access responsibly and respect rate limits. For bulk assets, prefer the repository or published distribution
					sources.
				</li>
			</ul>

			<h2>Contributions and moderation</h2>
			<p>
				Only submit material you have the right to share, with accurate source and license information. You retain any rights you own. By
				submitting content, you authorize us to review, host, reproduce, convert formats, display, and distribute it as part of the project,
				subject to its applicable license. Contributions to the repository are also subject to its license and contribution requirements;
				you cannot grant rights belonging to someone else.
			</p>
			<p>
				We may reject, edit, or remove submissions and restrict accounts to enforce these terms or protect the service. Published
				contributions and attribution can be copied, cached, or retained in public repository history, so complete removal from all
				third-party copies cannot be guaranteed.
			</p>

			<h2>Rights complaints</h2>
			<p>
				If an asset infringes your rights, email <a href="mailto:homarr-labs@proton.me">homarr-labs@proton.me</a> with the affected URL, the
				work or mark involved, your relationship to the rights holder, and a way to contact you. We will review the request and may remove
				or correct the listing. Do not include sensitive personal information in public GitHub issues.
			</p>

			<h2>Third parties and privacy</h2>
			<p>
				External collections, advertisements, sign-in providers, and donation services have their own terms. We do not control their content
				or practices. Our <Link href="/privacy">Privacy Policy</Link> explains how information is handled on this website.
			</p>

			<h2>Availability and responsibility</h2>
			<p>
				To the extent permitted by law, the service and assets are provided “as is” and “as available,” without warranties of accuracy,
				fitness for a particular purpose, non-infringement, or uninterrupted availability. You are responsible for evaluating assets and
				keeping backups of anything you depend on.
			</p>
			<p>
				To the extent permitted by law, Homarr Labs and project contributors are not liable for indirect or consequential losses, including
				lost profits or data, arising from use of the service. Nothing here excludes liability that cannot lawfully be excluded or limits
				mandatory consumer rights.
			</p>

			<h2>Changes and ending use</h2>
			<p>
				You may stop using the service at any time and contact us to request account deletion. We may change or discontinue features or
				suspend access for misuse. We will update the date above when these terms change and provide additional notice of material changes
				where required. Changes do not revoke rights already granted under an asset&apos;s applicable license.
			</p>
		</>
	)
}
