export const BASE_URL = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons"
export const REPO_PATH = "https://github.com/homarr-labs/dashboard-icons"
export const METADATA_URL = "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/refs/heads/main/metadata.json"
export const WEB_URL = "https://dashboardicons.com"
export const REPO_NAME = "homarr-labs/dashboard-icons"

// Site-wide metadata constants
export const SITE_NAME = "Dashboard Icons"
export const TITLE_SEPARATOR = " | "
export const SITE_TAGLINE = "Your definitive source for dashboard icons"
export const ORGANIZATION_NAME = "Homarr Labs"

export const getDescription = (totalIcons: number) =>
	`A curated collection of ${totalIcons} free icons for dashboards and app directories. Available in SVG, PNG, and WEBP formats. ${SITE_TAGLINE}.`

export const getHomeDescription = (totalIcons: number) =>
	`Discover our curated collection of ${totalIcons} icons designed specifically for dashboards and app directories. ${SITE_TAGLINE}.`

export const getBrowseDescription = (totalIcons: number) =>
	`Browse, search and download from our collection of ${totalIcons} curated icons. All icons available in SVG, PNG, and WEBP formats. ${SITE_TAGLINE}.`

export const getIconDescription = (iconName: string, totalIcons: number) =>
	`Download the ${iconName} icon in SVG, PNG, and WEBP formats. Part of our curated collection of ${totalIcons} free icons for dashboards. ${SITE_TAGLINE}.`

export const websiteTitle = `${SITE_NAME} ${TITLE_SEPARATOR} Free, Curated Icons for Apps & Services`
export const websiteFullTitle = `${SITE_NAME} ${TITLE_SEPARATOR} Free, Curated Icons for Apps & Services ${TITLE_SEPARATOR} ${SITE_TAGLINE}`

// Various keyword sets for different pages
export const DEFAULT_KEYWORDS = [
	"dashboard icons",
	"app icons",
	"service icons",
	"curated icons",
	"free icons",
	"SVG icons",
	"web dashboard",
	"app directory"
]

export const BROWSE_KEYWORDS = [
	"browse icons",
	"search icons",
	"download icons",
	"minimal icons",
	"dashboard design",
	"UI icons",
	...DEFAULT_KEYWORDS
]

export const ICON_DETAIL_KEYWORDS = (iconName: string) => [
	`${iconName} icon`,
	`${iconName} logo`,
	`${iconName} svg`,
	`${iconName} download`,
	`${iconName} dashboard icon`,
	...DEFAULT_KEYWORDS
]

// Core structured data for the website (JSON-LD)
export const getWebsiteSchema = (totalIcons: number) => ({
	"@context": "https://schema.org",
	"@type": "WebSite",
	"name": SITE_NAME,
	"url": WEB_URL,
	"description": getDescription(totalIcons),
	"potentialAction": {
		"@type": "SearchAction",
		"target": {
			"@type": "EntryPoint",
			"urlTemplate": `${WEB_URL}/icons?q={search_term_string}`
		},
		"query-input": "required name=search_term_string"
	},
	"slogan": SITE_TAGLINE
})

// Organization schema
export const ORGANIZATION_SCHEMA = {
	"@context": "https://schema.org",
	"@type": "Organization",
	"name": ORGANIZATION_NAME,
	"url": `https://github.com/${REPO_NAME}`,
	"logo": `${WEB_URL}/og-image.png`,
	"sameAs": [
		`https://github.com/${REPO_NAME}`,
		"https://homarr.dev"
	],
	"slogan": SITE_TAGLINE
}

// Social media
export const GITHUB_URL = `https://github.com/${REPO_NAME}`

// Image schemas
export const getIconSchema = (iconName: string, iconId: string, authorName: string, authorUrl: string, updateDate: string, totalIcons: number) => ({
	"@context": "https://schema.org",
	"@type": "ImageObject",
	"name": `${iconName} Icon`,
	"description": getIconDescription(iconName, totalIcons),
	"contentUrl": `${BASE_URL}/png/${iconId}.png`,
	"thumbnailUrl": `${BASE_URL}/png/${iconId}.png`,
	"uploadDate": updateDate,
	"author": {
		"@type": "Person",
		"name": authorName,
		"url": authorUrl
	},
	"encodingFormat": ["image/png", "image/svg+xml", "image/webp"],
	"contentSize": "Variable",
	"representativeOfPage": true,
	"creditText": `Icon contributed by ${authorName} to the ${SITE_NAME} collection by ${ORGANIZATION_NAME}`,
	"embedUrl": `${WEB_URL}/icons/${iconId}`
})

// OpenGraph defaults
export const DEFAULT_OG_IMAGE = {
	url: "/og-image.png",
	width: 1200,
	height: 630,
	alt: `${SITE_NAME} - ${SITE_TAGLINE}`,
	type: "image/png"
}
