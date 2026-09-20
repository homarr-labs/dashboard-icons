import { Suspense } from "react"
import { Loading } from "@/components/dashboard/primitives"
import { DashboardWorkspace } from "@/components/dashboard/workspace"
export default function DashboardPage() {
	return (
		<Suspense fallback={<Loading />}>
			<DashboardWorkspace />
		</Suspense>
	)
}
