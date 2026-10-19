import { act, createElement, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { IconNameCombobox } from "@/components/icon-name-combobox"
import { useIconSubmissionForm } from "@/hooks/use-icon-submission-form"

const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	update: vi.fn(),
	getFirstListItem: vi.fn(),
	fetch: vi.fn(),
	push: vi.fn(),
}))

vi.mock("@/lib/pb", () => ({
	pb: {
		authStore: { isValid: true, token: "user-token", record: { id: "proposer" } },
		collection: () => mocks,
	},
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock("@/app/actions/submissions", () => ({ revalidateAllSubmissions: vi.fn() }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/hooks/use-submissions", () => ({
	useExistingIconNames: () => ({
		data: [
			{ label: "pdf", value: "pdf", source: "collection" },
			{ label: "pdf", value: "pdf", source: "community", status: "pending", submissionId: "first" },
			{ label: "pdf", value: "pdf", source: "community", status: "rejected", submissionId: "second" },
		],
		isLoading: false,
	}),
}))

let root: Root
let container: HTMLDivElement
let submissionForm: ReturnType<typeof useIconSubmissionForm>
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView

function FormHarness() {
	const [name, setName] = useState("pdf")
	submissionForm = useIconSubmissionForm()
	return createElement(IconNameCombobox, {
		value: name,
		onValueChange: (value) => {
			setName(value)
			submissionForm.form.setFieldValue("iconName", value)
		},
		onIconSelected: submissionForm.setSelectedIcon,
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
	HTMLElement.prototype.scrollIntoView = vi.fn()
	container = document.createElement("div")
	document.body.appendChild(container)
	root = createRoot(container)
	vi.stubGlobal("fetch", mocks.fetch)
	mocks.fetch.mockResolvedValue(Response.json({ id: "new-proposal" }, { status: 201 }))
})

afterEach(async () => {
	await act(async () => root.unmount())
	container.remove()
	HTMLElement.prototype.scrollIntoView = originalScrollIntoView
	vi.unstubAllGlobals()
})

it("selects the exact same-name submission and sends a new proposal to the submission service in one request", async () => {
	await act(async () => root.render(createElement(FormHarness)))
	await act(async () => container.querySelector("input")?.focus())
	const options = container.querySelectorAll<HTMLElement>('[role="option"]')
	expect(Array.from(options, (item) => item.dataset.value)).toEqual(["pdf collection", "pdf first", "pdf second"])
	const selected = Array.from(options).find((item) => item.dataset.value === "pdf second")
	expect(selected).toBeDefined()
	await act(async () => selected?.click())
	expect(container.textContent).toContain("Target submission: second")
	const file = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], "pdf.svg", { type: "image/svg+xml" })
	await act(async () => submissionForm.form.setFieldValue("files", { base: [file] }))
	await act(async () => submissionForm.addCustomVariant("animated-dark"))
	await act(async () => submissionForm.form.setFieldValue("files", { base: [file], "custom:animated-dark": [file] }))
	await act(async () => submissionForm.form.handleSubmit())
	expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith("/api/submissions", {
		method: "POST",
		headers: { Authorization: "user-token" },
		body: expect.any(FormData),
	})
	const body = mocks.fetch.mock.calls[0]?.[1].body as FormData
	expect(body.get("name")).toBe("pdf")
	expect(body.get("target_submission")).toBe("second")
	expect((body.get("base") as File).name).toBe("pdf.svg")
	expect((body.get("custom:animated-dark") as File).name).toBe("pdf.svg")
	expect(mocks.create).not.toHaveBeenCalled()
	expect(mocks.update).not.toHaveBeenCalled()
	expect(mocks.getFirstListItem).not.toHaveBeenCalled()
	expect(mocks.push).toHaveBeenCalledWith("/community/submissions/new-proposal")
})
