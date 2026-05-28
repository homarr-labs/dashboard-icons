import { getDescription, REPO_NAME, WEB_URL } from "@/constants"
import { HOME_FAQS, type FaqItem } from "@/lib/seo/faqs"

const SCHEMA_CONTEXT = "https://schema.org"

const LICENSE_URLS: Record<string, string> = {
	MIT: "https://opensource.org/licenses/MIT",
	"CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
}

export type SchemaCreator = {
	type: "Person" | "Organization"
	name: string
	url?: string
}

export type SchemaBreadcrumb = {
	name: string
	item: string
}

export type IconPageGraphInput = {
	pageUrl: string
	pageName: string
	pageDescription: string
	dateModified: string
	contentUrl: string
	licenseKey: keyof typeof LICENSE_URLS
	formattedName: string
	creator: SchemaCreator
	creditText?: string
	copyrightNotice?: string
	breadcrumbs: SchemaBreadcrumb[]
	encodingFormat?: string
}

function buildGraph(schemas: Record<string, unknown>[]) {
	return {
		"@context": SCHEMA_CONTEXT,
		"@graph": schemas,
	}
}

function buildListItems(breadcrumbs: SchemaBreadcrumb[]) {
	return breadcrumbs.map((crumb, index) => ({
		"@type": "ListItem",
		position: index + 1,
		name: crumb.name,
		item: crumb.item,
	}))
}

function buildCreatorSchema(creator: SchemaCreator) {
	const creatorSchema: Record<string, unknown> = {
		"@type": creator.type,
		name: creator.name,
	}

	const urlFields: Record<string, string> = creator.url ? { url: creator.url } : {}

	return { ...creatorSchema, ...urlFields }
}

function buildSearchAction() {
	return {
		"@type": "SearchAction",
		target: {
			"@type": "EntryPoint",
			urlTemplate: `${WEB_URL}/icons?q={search_term_string}`,
		},
		"query-input": "required name=search_term_string",
	}
}

export function buildOrganizationSchema() {
	return {
		"@type": "Organization",
		name: "Homarr Labs",
		url: WEB_URL,
		logo: {
			"@type": "ImageObject",
			url: `${WEB_URL}/og/default`,
			width: 1200,
			height: 630,
		},
		sameAs: [`https://github.com/${REPO_NAME}`],
	}
}

export function buildOrganizationGraph() {
	return buildGraph([buildOrganizationSchema()])
}

export function buildWebSiteSchema({ description }: { description: string }) {
	return {
		"@type": "WebSite",
		name: "Dashboard Icons",
		url: WEB_URL,
		description,
		inLanguage: "en",
		publisher: {
			"@type": "Organization",
			name: "Homarr Labs",
		},
		potentialAction: buildSearchAction(),
	}
}

export function buildWebApplicationSchema({ totalIcons }: { totalIcons: number }) {
	return {
		"@type": "WebApplication",
		name: "Dashboard Icons",
		url: WEB_URL,
		description: getDescription(totalIcons),
		applicationCategory: "UtilityApplication",
		operatingSystem: "Any",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
		featureList: [
			"Browse curated dashboard icons",
			"Download SVG, PNG, and WEBP formats",
			"Customize icon colors",
			"Search by service name or alias",
		],
	}
}

export function buildFaqSchema(faqs: FaqItem[]) {
	return {
		"@type": "FAQPage",
		mainEntity: faqs.map((faq) => ({
			"@type": "Question",
			name: faq.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: faq.answer,
			},
		})),
	}
}

export function buildHomePageGraph({ totalIcons, description }: { totalIcons: number; description: string }) {
	return buildGraph([buildWebSiteSchema({ description }), buildWebApplicationSchema({ totalIcons }), buildFaqSchema(HOME_FAQS)])
}

export function buildCollectionPageSchema({
	url,
	name,
	description,
	totalItems,
}: {
	url: string
	name: string
	description: string
	totalItems: number
}) {
	return {
		"@type": "CollectionPage",
		name,
		description,
		url,
		numberOfItems: totalItems,
		isPartOf: {
			"@type": "WebSite",
			name: "Dashboard Icons",
			url: WEB_URL,
		},
	}
}

export function buildIconsBrowseGraph({
	description,
	totalItems,
}: {
	description: string
	totalItems: number
}) {
	return buildGraph([
		buildCollectionPageSchema({
			url: `${WEB_URL}/icons`,
			name: "Browse Icons & Logos",
			description,
			totalItems,
		}),
		{
			"@type": "WebSite",
			name: "Dashboard Icons",
			url: WEB_URL,
			potentialAction: buildSearchAction(),
		},
	])
}

export function buildCommunityBrowseGraph({
	description,
	totalItems,
}: {
	description: string
	totalItems: number
}) {
	return buildGraph([
		buildCollectionPageSchema({
			url: `${WEB_URL}/community`,
			name: "Browse Community Icons & Logos",
			description,
			totalItems,
		}),
	])
}

export function buildIconPageGraph(input: IconPageGraphInput) {
	const licenseUrl = LICENSE_URLS[input.licenseKey]
	const imageObject: Record<string, unknown> = {
		"@type": "ImageObject",
		name: `${input.formattedName} Icon`,
		description: input.pageDescription,
		contentUrl: input.contentUrl,
		license: licenseUrl,
		acquireLicensePage: `${WEB_URL}/license`,
		dateModified: input.dateModified,
		creator: buildCreatorSchema(input.creator),
	}

	const optionalImageFields: Record<string, string> = {
		...(input.creditText ? { creditText: input.creditText } : {}),
		...(input.copyrightNotice ? { copyrightNotice: input.copyrightNotice } : {}),
		...(input.encodingFormat ? { encodingFormat: input.encodingFormat } : {}),
	}

	return buildGraph([
		{
			"@type": "WebPage",
			name: input.pageName,
			description: input.pageDescription,
			url: input.pageUrl,
			dateModified: input.dateModified,
			isPartOf: {
				"@type": "WebSite",
				name: "Dashboard Icons",
				url: WEB_URL,
			},
			mainEntity: {
				"@type": "ImageObject",
				contentUrl: input.contentUrl,
			},
		},
		{ ...imageObject, ...optionalImageFields },
		{
			"@type": "BreadcrumbList",
			itemListElement: buildListItems(input.breadcrumbs),
		},
	])
}

export function resolveLicenseKey(licenseLabel: string): keyof typeof LICENSE_URLS {
	const licenseKeys = Object.keys(LICENSE_URLS) as Array<keyof typeof LICENSE_URLS>
	const matchedKey = licenseKeys.find((key) => key === licenseLabel)
	return matchedKey ?? "CC BY 4.0"
}
