import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				hostname: "cdn.jsdelivr.net",
			},
		],
	},
}

export default nextConfig
