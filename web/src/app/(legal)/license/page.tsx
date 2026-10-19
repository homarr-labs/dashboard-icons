import type { Metadata } from "next"
import Link from "next/link"
import { APACHE_LICENSE_URL, REPO_PATH } from "@/constants"

export const metadata: Metadata = {
	title: "License",
	description: "The Dashboard Icons icon files are Apache License 2.0. Logos and brand marks belong to their owners.",
	alternates: { canonical: "/license" },
}

export default function LicensePage() {
	return (
		<>
			<h1>License</h1>
			<p>Last updated: October 19, 2026</p>
			<p>
				The icon files in the Dashboard Icons repository are published under the <a href={APACHE_LICENSE_URL}>Apache License 2.0</a>. The
				full text is in the repository&apos;s <a href={`${REPO_PATH}/blob/main/LICENSE`}>LICENSE</a> file. Icons from external collections
				keep their own licenses, shown on their pages.
			</p>

			<h2>Logos and brand marks</h2>
			<p>
				Logos, product names, and brand marks belong to their respective owners. The Apache License 2.0 covers the icon files, not the marks
				they depict, and it grants no trademark rights. Showing an icon here does not imply endorsement by, or affiliation with, its owner.
			</p>

			<h2>Request removal</h2>
			<p>
				If you own a logo or mark and want an icon changed or removed, follow the{" "}
				<Link href="/terms#rights-complaints">rights complaint process</Link> in our Terms of Service, or email{" "}
				<a href="mailto:homarr-labs@proton.me">homarr-labs@proton.me</a> with the affected icon page and your relationship to the rights
				holder.
			</p>
		</>
	)
}
