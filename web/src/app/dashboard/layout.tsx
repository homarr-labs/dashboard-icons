import type { Metadata } from "next"
export const metadata: Metadata = { title: "Workspace · Dashboard Icons", robots: { index: false, follow: false } }
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div
			data-dashboard-frame
			className="flex min-h-[calc(100dvh-126px)] w-full min-w-0 flex-col lg:h-[calc(100dvh-126px)] lg:min-h-[560px]"
		>
			{children}
		</div>
	)
}
