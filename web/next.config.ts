import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	cacheComponents: false,
	images: {
		remotePatterns: [
			new URL(
				"https://pb.dashboardicons.com/**",
			),
			new URL(
				"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/**",
			),
		],
	},
};

export default nextConfig