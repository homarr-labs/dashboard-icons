type JsonLdProps = {
	data: Record<string, unknown>
}

export function JsonLd({ data }: JsonLdProps) {
	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(data).replace(/</g, "\\u003c"),
			}}
		/>
	)
}
