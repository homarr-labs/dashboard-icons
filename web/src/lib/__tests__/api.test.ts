import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/errors"
import type { IconFile } from "@/types/icons"

const MOCK_METADATA: IconFile = {
	plex: {
		base: "svg",
		aliases: [],
		categories: ["Media"],
		update: { timestamp: "2025-01-02T00:00:00Z", author: { id: 1, name: "a" } },
	},
	docker: {
		base: "svg",
		aliases: [],
		categories: ["Media", "Dev"],
		update: { timestamp: "2024-01-01T00:00:00Z", author: { id: 2, name: "b" } },
	},
	nginx: {
		base: "svg",
		aliases: [],
		categories: [],
		update: { timestamp: "2023-01-01T00:00:00Z", author: { id: 3, name: "c" } },
	},
}

vi.mock("next/cache", () => ({
	unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

const getAllIconsMock = vi.fn(async () => MOCK_METADATA)

vi.mock("@/lib/icons/service", () => ({
	getAllIcons: () => getAllIconsMock(),
}))

vi.mock("@/lib/external-icons", () => ({
	getExternalIcons: vi.fn().mockResolvedValue([{ source: "selfhst" }, { source: "selfhst" }, { source: "lobehub" }]),
}))

describe("api", () => {
	beforeEach(() => {
		getAllIconsMock.mockResolvedValue(MOCK_METADATA)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	async function loadApi() {
		return import("@/lib/api")
	}

	describe("getAllIcons", () => {
		it("returns metadata from service", async () => {
			const { getAllIcons } = await loadApi()
			await expect(getAllIcons()).resolves.toEqual(MOCK_METADATA)
		})

		it("rethrows ApiError", async () => {
			getAllIconsMock.mockRejectedValueOnce(new ApiError("fail", 500))
			const { getAllIcons } = await loadApi()
			await expect(getAllIcons()).rejects.toMatchObject({ message: "fail", status: 500 })
		})

		it("wraps unknown errors", async () => {
			getAllIconsMock.mockRejectedValueOnce(new Error("network"))
			const { getAllIcons } = await loadApi()
			await expect(getAllIcons()).rejects.toMatchObject({ message: "Failed to fetch icons data. Please try again later." })
		})
	})

	describe("getIconNames", () => {
		it("returns icon keys", async () => {
			const { getIconNames } = await loadApi()
			const names = await getIconNames()
			expect(names).toContain("plex")
			expect(names).toContain("docker")
		})
	})

	describe("getIconsArray", () => {
		it("returns sorted native records", async () => {
			const { getIconsArray } = await loadApi()
			const icons = await getIconsArray()
			expect(icons[0]?.name).toBe("docker")
			expect(icons[0]?.source).toBe("native")
		})
	})

	describe("getIconData", () => {
		it("returns icon when found", async () => {
			const { getIconData } = await loadApi()
			const icon = await getIconData("plex")
			expect(icon?.name).toBe("plex")
		})

		it("returns null when missing", async () => {
			const { getIconData } = await loadApi()
			expect(await getIconData("missing-icon")).toBeNull()
		})

		it("returns null for invalid names", async () => {
			const { getIconData } = await loadApi()
			expect(await getIconData("../bad")).toBeNull()
		})

		it("rethrows non-validation errors", async () => {
			getAllIconsMock.mockRejectedValueOnce(new Error("boom"))
			const { getIconData } = await loadApi()
			await expect(getIconData("plex")).rejects.toMatchObject({
				message: "Failed to fetch icons data. Please try again later.",
			})
		})
	})

	describe("getAuthorData", () => {
		it("omits authorization without a GitHub token and sets a timeout", async () => {
			vi.stubEnv("GITHUB_TOKEN", "")
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ id: 98, login: "public-user", avatar_url: "", html_url: "", name: "Public" }),
			})
			vi.stubGlobal("fetch", fetchMock)
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()

			await getAuthorData(98)
			const options = fetchMock.mock.calls[0]?.[1] as RequestInit
			expect(options.headers).toEqual({})
			expect(options.signal).toBeInstanceOf(AbortSignal)
		})

		it("sends authorization when a GitHub token exists", async () => {
			vi.stubEnv("GITHUB_TOKEN", "test-token")
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ id: 97, login: "private-user", avatar_url: "", html_url: "", name: "Private" }),
			})
			vi.stubGlobal("fetch", fetchMock)
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()

			await getAuthorData(97)
			const options = fetchMock.mock.calls[0]?.[1] as RequestInit
			expect(options.headers).toEqual({ Authorization: "Bearer test-token" })
		})

		it("returns cached author on second call", async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					id: 99,
					login: "cached-user",
					avatar_url: "https://github.com/cached-user.png",
					html_url: "https://github.com/cached-user",
					name: "Cached",
				}),
			})
			vi.stubGlobal("fetch", fetchMock)

			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()

			await getAuthorData(99)
			await getAuthorData(99)
			expect(fetchMock).toHaveBeenCalledTimes(1)
		})

		it("builds internal author for pocketbase ids", async () => {
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData("pb-user", { name: "Pat", login: "pat" })
			expect(author.login).toBe("pat")
			expect(author.html_url).toBe("")
		})

		it("fetches github user for numeric string ids", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					ok: true,
					status: 200,
					json: async () => ({
						id: 42,
						login: "gh-user",
						avatar_url: "https://github.com/gh-user.png",
						html_url: "https://github.com/gh-user",
						name: "GH",
					}),
				}),
			)
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData("42")
			expect(author.login).toBe("gh-user")
		})

		it("returns unknown author on github auth errors", async () => {
			const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: "Forbidden" })
			vi.stubGlobal("fetch", fetchMock)
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData(1)
			await getAuthorData(1)
			expect(author.login).toBe("unknown")
			expect(fetchMock).toHaveBeenCalledTimes(2)
		})

		it("returns unknown author on github unauthorized responses", async () => {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: "Unauthorized" }))
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData(11)
			expect(author.login).toBe("unknown")
		})

		it("returns unknown author when the github account no longer exists", async () => {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" }))
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData(31266841)
			expect(author.login).toBe("unknown")
		})

		it("returns unknown author when github rate limits requests", async () => {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, statusText: "Too Many Requests" }))
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData(12)
			expect(author.login).toBe("unknown")
		})

		it("builds internal author without optional fields", async () => {
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData("contributor-id")
			expect(author.name).toBe("Community Contributor")
			expect(author.login).toBe("contributor")
		})

		it("applies author meta fallback when github returns unknown", async () => {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: "Forbidden" }))
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData(7, { login: "meta-user", name: "Meta" })
			expect(author.html_url).toBe("https://github.com/meta-user")
		})

		it("fills missing author name from login meta", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					ok: true,
					status: 200,
					json: async () => ({
						id: 22,
						login: "unknown",
						avatar_url: "",
						html_url: "",
						name: "",
					}),
				}),
			)
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData(22, { login: "login-only" })
			expect(author.name).toBe("login-only")
		})

		it("fills missing author fields from meta fallback", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					ok: true,
					status: 200,
					json: async () => ({
						id: 20,
						login: "unknown",
						avatar_url: "",
						html_url: "",
						name: "",
					}),
				}),
			)
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData(20, { login: "meta-only", name: "Meta Name" })
			expect(author.name).toBe("Meta Name")
			expect(author.avatar_url).toBe("https://github.com/meta-only.png")
		})

		it("skips meta fallback when author meta has no login", async () => {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: "Forbidden" }))
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData(21, { name: "No Login" })
			expect(author.login).toBe("unknown")
		})

		it("throws ApiError for non-auth github failures", async () => {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Server Error" }))
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			await expect(getAuthorData(8)).rejects.toMatchObject({
				message: "Failed to fetch author data: Server Error",
				status: 500,
			})
		})

		it("returns unknown author when fetch throws", async () => {
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData(9)
			expect(author.login).toBe("unknown")
		})

		it("logs author fetch failure only once across multiple failures", async () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue("offline"))

			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()

			await getAuthorData(12)
			await getAuthorData(13)

			expect(warnSpy).toHaveBeenCalledTimes(1)
			expect(warnSpy).toHaveBeenCalledWith("Author data unavailable (offline); using fallback author metadata.")
		})

		it("skips meta fallback when github data is valid", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					ok: true,
					status: 200,
					json: async () => ({
						id: 10,
						login: "real-user",
						avatar_url: "https://github.com/real-user.png",
						html_url: "https://github.com/real-user",
						name: "Real",
					}),
				}),
			)
			const { getAuthorData, clearAuthorDataCacheForTests } = await loadApi()
			clearAuthorDataCacheForTests()
			const author = await getAuthorData(10, { login: "ignored" })
			expect(author.login).toBe("real-user")
		})
	})

	describe("computeRelatedIcons", () => {
		it("returns empty when no categories", async () => {
			const { computeRelatedIcons } = await loadApi()
			expect(computeRelatedIcons("plex", [], MOCK_METADATA)).toEqual([])
		})

		it("scores icons sharing categories", async () => {
			const { computeRelatedIcons } = await loadApi()
			const related = computeRelatedIcons("plex", ["Media"], MOCK_METADATA)
			expect(related.some((icon) => icon.name === "docker")).toBe(true)
			expect(related.some((icon) => icon.name === "plex")).toBe(false)
		})

		it("skips icons without categories", async () => {
			const { computeRelatedIcons } = await loadApi()
			const related = computeRelatedIcons("plex", ["Media"], MOCK_METADATA)
			expect(related.some((icon) => icon.name === "nginx")).toBe(false)
		})

		it("sorts related icons by shared category count", async () => {
			const { computeRelatedIcons } = await loadApi()
			const metadata: IconFile = {
				current: {
					base: "svg",
					aliases: [],
					categories: ["A", "B", "C"],
					update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } },
				},
				...Object.fromEntries(
					Array.from({ length: 20 }, (_, index) => [
						`icon-${index}`,
						{
							base: "svg",
							aliases: [],
							categories: index % 2 === 0 ? ["A", "B"] : ["A"],
							update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } },
						},
					]),
				),
			}
			const related = computeRelatedIcons("current", ["A", "B", "C"], metadata)
			expect(related[0]?.name).toBe("icon-0")
			expect(related.length).toBeLessThanOrEqual(16)
		})

		it("skips related icons with non-overlapping categories", async () => {
			const { computeRelatedIcons } = await loadApi()
			const metadata: IconFile = {
				current: {
					base: "svg",
					aliases: [],
					categories: ["Shared"],
					update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } },
				},
				unrelated: {
					base: "svg",
					aliases: [],
					categories: ["Other"],
					update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } },
				},
			}
			expect(computeRelatedIcons("current", ["Shared"], metadata)).toEqual([])
		})

		it("maps related icons without optional fields", async () => {
			const { computeRelatedIcons } = await loadApi()
			const metadata: IconFile = {
				current: {
					base: "svg",
					aliases: [],
					categories: ["Shared"],
					update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } },
				},
				related: {
					base: "svg",
					aliases: [],
					categories: ["Shared"],
					update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } },
				},
			}
			const related = computeRelatedIcons("current", ["Shared"], metadata)
			expect(related[0]).toEqual({
				name: "related",
				data: {
					base: "svg",
					aliases: [],
					categories: ["Shared"],
					update: metadata.related?.update,
					colors: undefined,
				},
			})
		})

		it("includes colors on related icons when present", async () => {
			const { computeRelatedIcons } = await loadApi()
			const metadata: IconFile = {
				current: {
					base: "svg",
					aliases: [],
					categories: ["Shared"],
					update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } },
				},
				related: {
					base: "svg",
					aliases: [],
					categories: ["Shared"],
					colors: { light: "related-light", dark: "related-dark" },
					update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } },
				},
			}
			const related = computeRelatedIcons("current", ["Shared"], metadata)
			expect(related[0]?.data.colors).toEqual({ light: "related-light", dark: "related-dark" })
		})

		it("defaults missing aliases on related icons", async () => {
			const { computeRelatedIcons } = await loadApi()
			const metadata = {
				current: {
					base: "svg",
					aliases: [],
					categories: ["Shared"],
					update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } },
				},
				related: {
					base: "svg",
					categories: ["Shared"],
					update: { timestamp: "2020-01-01T00:00:00Z", author: { id: 1 } },
				},
			} as unknown as IconFile

			const related = computeRelatedIcons("current", ["Shared"], metadata)
			expect(related[0]?.data.aliases).toEqual([])
		})
	})

	describe("getTotalIcons", () => {
		it("aggregates native and external counts", async () => {
			const { getTotalIcons } = await loadApi()
			const totals = await getTotalIcons()
			expect(totals.nativeCount).toBe(3)
			expect(totals.externalCount).toBe(3)
			expect(totals.totalIcons).toBe(6)
			expect(totals.sourceCounts.selfhst).toBe(2)
			expect(totals.sourceCounts.lobehub).toBe(1)
		})
	})

	describe("getRecentlyAddedIcons", () => {
		it("returns newest icons first", async () => {
			const { getRecentlyAddedIcons } = await loadApi()
			const icons = await getRecentlyAddedIcons(2)
			expect(icons[0]?.name).toBe("plex")
			expect(icons).toHaveLength(2)
		})

		it("uses default limit when omitted", async () => {
			const { getRecentlyAddedIcons } = await loadApi()
			const icons = await getRecentlyAddedIcons()
			expect(icons).toHaveLength(3)
		})
	})
})
