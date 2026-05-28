import type { Metadata } from "next"
import Link from "next/link"
import { REPO_PATH, WEB_URL } from "@/constants"

export const metadata: Metadata = {
	title: "License & Trademark Policy",
	description:
		"License terms for Dashboard Icons native collection (CC BY 4.0), trademark disclaimer, and attribution requirements.",
	alternates: {
		canonical: `${WEB_URL}/license`,
	},
	openGraph: {
		title: "License & Trademark Policy",
		description: "License terms and trademark disclaimer for Dashboard Icons.",
		url: `${WEB_URL}/license`,
		type: "website",
	},
}

export default function LicensePage() {
	return (
		<div className="container mx-auto px-4 md:px-6 py-12 max-w-3xl">
			<h1 className="text-3xl font-bold mb-6">License & trademark policy</h1>

			<section className="flex flex-col gap-4 text-muted-foreground leading-relaxed">
				<h2 className="text-xl font-semibold text-foreground">Native Dashboard Icons license</h2>
				<p>
					Icons in the native Dashboard Icons collection are licensed under{" "}
					<Link href="https://creativecommons.org/licenses/by/4.0/" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
						Creative Commons Attribution 4.0 International (CC BY 4.0)
					</Link>
					. You may download, share, and adapt these icons for free with appropriate attribution.
				</p>
				<p>
					View the full project license on GitHub:{" "}
					<Link href={`${REPO_PATH}/blob/main/LICENSE`} className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
						{REPO_PATH}/blob/main/LICENSE
					</Link>
				</p>

				<h2 className="text-xl font-semibold text-foreground mt-4">External icon sources</h2>
				<p>
					Some icons are sourced from third-party collections such as selfh.st and LobeHub. Those icons retain their original licenses (CC BY 4.0 or MIT). Check each icon detail page for the applicable license.
				</p>

				<h2 className="text-xl font-semibold text-foreground mt-4">Trademark disclaimer</h2>
				<p>
					All product names, trademarks, and registered trademarks are the property of their respective owners. Icons are used for identification purposes only and do not imply endorsement by the trademark holder.
				</p>

				<h2 className="text-xl font-semibold text-foreground mt-4">Contact</h2>
				<p>
					Questions about licensing:{" "}
					<Link href="mailto:homarr-labs@proton.me" className="underline hover:text-foreground">
						homarr-labs@proton.me
					</Link>
				</p>
			</section>
		</div>
	)
}
