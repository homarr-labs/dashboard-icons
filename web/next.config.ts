import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	cacheComponents: false,
	images: {
		unoptimized: true,
	},
	output: "standalone",
};

export default nextConfig