import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	cacheComponents: false,
	images: {
		unoptimized: true,
	},
};

export default nextConfig