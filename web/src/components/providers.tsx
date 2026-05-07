"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { useState } from "react"

const ReactQueryDevtools =
	process.env.NODE_ENV === "development"
		? dynamic(() => import("@tanstack/react-query-devtools").then((mod) => mod.ReactQueryDevtools), {
				ssr: false,
			})
		: () => null

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000, // 1 minute
						refetchOnWindowFocus: false,
					},
				},
			}),
	)

	return (
		<QueryClientProvider client={queryClient}>
			{process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
			{children}
		</QueryClientProvider>
	)
}
