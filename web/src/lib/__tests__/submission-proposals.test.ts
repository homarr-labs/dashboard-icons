import { act, createElement, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { IconNameCombobox } from "@/components/icon-name-combobox"
import { useIconSubmissionForm } from "@/hooks/use-icon-submission-form"

const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	update: vi.fn(),
	getFirstListItem: vi.fn(),
	push: vi.fn(),
}))

vi.mock("@/lib/pb", () => ({
	pb: {
		authStore: { isValid: true, record: { id: "proposer" } },
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
	mocks.create.mockResolvedValue({ id: "new-proposal", name: "pdf", assets: [] })
})

afterEach(async () => {
	await act(async () => root.unmount())
	container.remove()
	HTMLElement.prototype.scrollIntoView = originalScrollIntoView
	vi.unstubAllGlobals()
})

it("selects the exact same-name submission and creates a new proposal without updating or looking up by name", async () => {
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
	await act(async () => submissionForm.form.handleSubmit())
	expect(mocks.create).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ name: "pdf", target_submission: "second", created_by: "proposer", status: "pending", assets: [file] }),
		{ requestKey: null },
	)
	expect(mocks.update).not.toHaveBeenCalled()
	expect(mocks.getFirstListItem).not.toHaveBeenCalled()
	expect(mocks.push).toHaveBeenCalledWith("/community/submissions/new-proposal")
})
