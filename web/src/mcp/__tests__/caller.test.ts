import { describe, expect, it } from "vitest"
import { getMcpCaller } from "@/mcp/caller"

describe("getMcpCaller", () => {
	it("reads the caller from auth info extras", () => {
		expect(getMcpCaller({ token: "t", extra: { userId: "user_1", username: "fan", admin: true } })).toEqual({
			userId: "user_1",
			username: "fan",
			admin: true,
		})
		expect(getMcpCaller({ extra: { userId: "user_1", username: "fan", admin: "yes" } })?.admin).toBe(false)
	})

	it("treats anything outside the contract as anonymous", () => {
		expect(getMcpCaller(undefined)).toBeNull()
		expect(getMcpCaller("token")).toBeNull()
		expect(getMcpCaller({ token: "t" })).toBeNull()
		expect(getMcpCaller({ extra: null })).toBeNull()
		expect(getMcpCaller({ extra: "user_1" })).toBeNull()
		expect(getMcpCaller({ extra: { userId: "", username: "fan" } })).toBeNull()
		expect(getMcpCaller({ extra: { userId: 1, username: "fan" } })).toBeNull()
		expect(getMcpCaller({ extra: { userId: "user_1" } })).toBeNull()
	})
})
