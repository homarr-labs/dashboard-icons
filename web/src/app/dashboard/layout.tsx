import type { Metadata } from "next"
export const metadata: Metadata = { title: "Workspace · Dashboard Icons", robots: { index: false, follow: false } }
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-[calc(100dvh-108px)] max-lg:[&:has([data-review-bench])]:h-auto min-h-[480px] w-full min-w-0 flex-col bg-muted/10">
			{children}
		</div>
	)
}
