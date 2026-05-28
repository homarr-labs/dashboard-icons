import { describe, expect, it } from "vitest"
import { HOME_FAQS } from "@/lib/seo/faqs"
import {
	buildFaqSchema,
	buildHomePageGraph,
	buildIconPageGraph,
	buildIconsBrowseGraph,
	buildOrganizationGraph,
	buildWebSiteSchema,
	resolveLicenseKey,
} from "@/lib/seo/schemas"

describe("seo schemas", () => {
	it("buildOrganizationGraph includes Organization type", () => {
		const schema = buildOrganizationGraph()
		expect(schema["@context"]).toBe("https://schema.org")
		expect(schema["@graph"]).toHaveLength(1)
		expect((schema["@graph"] as Record<string, unknown>[])[0]["@type"]).toBe("Organization")
	})

	it("buildWebSiteSchema uses q search param", () => {
		const schema = buildWebSiteSchema({ description: "test" }) as Record<string, unknown>
		const action = schema.potentialAction as Record<string, unknown>
		const target = action.target as Record<string, unknown>
		expect(target.urlTemplate).toBe("https://dashboardicons.com/icons?q={search_term_string}")
	})

	it("buildHomePageGraph combines website, webapp, and faq schemas", () => {
		const schema = buildHomePageGraph({ totalIcons: 100, description: "test description" })
		const graph = schema["@graph"] as Record<string, unknown>[]
		const types = graph.map((entry) => entry["@type"])
		expect(types).toEqual(["WebSite", "WebApplication", "FAQPage"])
	})

	it("buildFaqSchema mirrors visible FAQ content", () => {
		const schema = buildFaqSchema(HOME_FAQS) as Record<string, unknown>
		const entities = schema.mainEntity as Record<string, unknown>[]
		expect(entities).toHaveLength(HOME_FAQS.length)
		expect(entities[0].name).toBe(HOME_FAQS[0].question)
	})

	it("buildIconsBrowseGraph includes CollectionPage and SearchAction", () => {
		const schema = buildIconsBrowseGraph({ description: "browse", totalItems: 50 })
		const graph = schema["@graph"] as Record<string, unknown>[]
		const types = graph.map((entry) => entry["@type"])
		expect(types).toContain("CollectionPage")
		expect(types).toContain("WebSite")
	})

	it("buildIconPageGraph includes WebPage, ImageObject, and BreadcrumbList", () => {
		const schema = buildIconPageGraph({
			pageUrl: "https://dashboardicons.com/icons/grafana",
			pageName: "Grafana Icon & Logo",
			pageDescription: "Download Grafana icon",
			dateModified: "2024-01-01T00:00:00.000Z",
			contentUrl: "https://cdn.example.com/grafana.png",
			licenseKey: "CC BY 4.0",
			formattedName: "Grafana",
			creator: { type: "Person", name: "Contributor", url: "https://github.com/contributor" },
			breadcrumbs: [
				{ name: "Home", item: "https://dashboardicons.com" },
				{ name: "Browse Icons", item: "https://dashboardicons.com/icons" },
				{ name: "Grafana Icon", item: "https://dashboardicons.com/icons/grafana" },
			],
		})
		const graph = schema["@graph"] as Record<string, unknown>[]
		const types = graph.map((entry) => entry["@type"])
		expect(types).toEqual(["WebPage", "ImageObject", "BreadcrumbList"])
	})

	it("resolveLicenseKey maps known licenses", () => {
		expect(resolveLicenseKey("MIT")).toBe("MIT")
		expect(resolveLicenseKey("CC BY 4.0")).toBe("CC BY 4.0")
		expect(resolveLicenseKey("unknown")).toBe("CC BY 4.0")
	})
})
