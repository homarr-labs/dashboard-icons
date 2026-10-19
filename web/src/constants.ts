export const BASE_URL = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons"
export const DASHBOARD_ICONS_ICON = `${BASE_URL}/svg/dashboard-icons.svg`
export const REPO_PATH = "https://github.com/homarr-labs/dashboard-icons"
export const METADATA_URL = "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/refs/heads/main/metadata.json"
export const WEB_URL = "https://dashboardicons.com"
export const REPO_NAME = "homarr-labs/dashboard-icons"
export const APACHE_LICENSE_URL = "https://www.apache.org/licenses/LICENSE-2.0"
export const SIMPLE_ICONS_DISCLAIMER_URL = "https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md"

export const getDescription = (totalIcons: number) =>
	`A collection of ${totalIcons} curated icons and logos for services, applications and tools, designed specifically for dashboards and app directories.`

export const websiteTitle = "Free Dashboard Icons & Logos - Download High-Quality Service Icons"

export type ExternalSourceId = "selfhst" | "lobehub" | "simpleicons"

export type ExternalToneKey = "light" | "dark"

export interface ExternalSourceConfig {
	id: ExternalSourceId
	label: string
	icon: string
	cdnBase: string
	website: string
	authorName: string
	authorLogin: string
	authorUrl: string
	license: string
	licenseUrl: string
	pbFilter: string
	toneKeys: Record<ExternalToneKey, ExternalToneKey>
	monochromeTones: boolean
}

export const EXTERNAL_SOURCES: Record<ExternalSourceId, ExternalSourceConfig> = {
	selfhst: {
		id: "selfhst",
		label: "selfh.st",
		cdnBase: "https://cdn.jsdelivr.net/gh/selfhst/icons",
		website: "https://selfh.st/icons/",
		icon: "https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/selfh-st.svg",
		authorName: "selfh.st/icons",
		authorLogin: "selfhst",
		authorUrl: "https://selfh.st/icons/",
		license: "CC BY 4.0",
		licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
		pbFilter: "selfhst",
		toneKeys: { light: "light", dark: "dark" },
		monochromeTones: false,
	},
	lobehub: {
		id: "lobehub",
		label: "LobeHub",
		icon: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/lobehub-color.png",
		cdnBase: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@latest",
		website: "https://lobehub.com/icons",
		authorName: "LobeHub Icons",
		authorLogin: "lobehub",
		authorUrl: "https://github.com/lobehub/lobe-icons",
		license: "MIT",
		licenseUrl: "https://github.com/lobehub/lobe-icons/blob/master/LICENSE",
		pbFilter: "lobehub",
		toneKeys: { light: "dark", dark: "light" },
		monochromeTones: false,
	},
	simpleicons: {
		id: "simpleicons",
		label: "Simple Icons",
		icon: "https://cdn.simpleicons.org/simpleicons/111111/FFFFFF",
		cdnBase: "https://cdn.simpleicons.org",
		website: "https://simpleicons.org/",
		authorName: "Simple Icons",
		authorLogin: "simple-icons",
		authorUrl: "https://github.com/simple-icons/simple-icons",
		license: "CC0-1.0",
		licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
		pbFilter: "simpleicons",
		toneKeys: { light: "dark", dark: "light" },
		monochromeTones: true,
	},
}

export const EXTERNAL_SOURCE_IDS = Object.keys(EXTERNAL_SOURCES) as ExternalSourceId[]

export function isExternalSourceId(value: string): value is ExternalSourceId {
	return Object.hasOwn(EXTERNAL_SOURCES, value)
}

export function getExternalSource(id: ExternalSourceId): ExternalSourceConfig {
	return EXTERNAL_SOURCES[id]
}
