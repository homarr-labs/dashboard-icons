import { describe, expect, it } from "vitest"
import { buildIconsForDashboardPrompt, completeDashboard, parseServices } from "@/mcp/prompts"

function textOf(result: ReturnType<typeof buildIconsForDashboardPrompt>): string {
	const content = result.messages[0]?.content
	if (content?.type !== "text") throw new Error("expected text")
	return content.text
}

describe("icons_for_dashboard prompt", () => {
	it("parses comma and newline separated services, deduped and capped", () => {
		expect(parseServices(" Plex, Sonarr\nHome Assistant,,Plex\n ")).toEqual(["Plex", "Sonarr", "Home Assistant"])
		expect(parseServices(Array.from({ length: 60 }, (_, index) => `svc${index}`).join(","))).toHaveLength(50)
	})

	it("tells the model to batch through match_icons and write the dashboard's format", () => {
		const text = textOf(buildIconsForDashboardPrompt(["Plex", "Pi-hole"], "homepage"))
		expect(text).toContain('match_icons tool once with services ["Plex","Pi-hole"]')
		expect(text).toContain("services.yaml")
		expect(textOf(buildIconsForDashboardPrompt(["Plex"], "dashy"))).toContain("conf.yml")
		expect(textOf(buildIconsForDashboardPrompt(["Plex"], "homarr"))).toContain("Homarr")
		expect(textOf(buildIconsForDashboardPrompt(["Plex"], "generic"))).toContain("JSON object")
	})

	it("asks for the services when none were given", () => {
		expect(textOf(buildIconsForDashboardPrompt([], "generic"))).toContain("Ask me which services")
	})

	it("completes dashboard names", () => {
		expect(completeDashboard("ho")).toEqual(["homarr", "homepage"])
		expect(completeDashboard(undefined)).toEqual(["homarr", "homepage", "dashy", "generic"])
	})
})
