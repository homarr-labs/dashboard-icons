import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const allowedDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean)

const securityHeaders = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "X-XSS-Protection", value: "1; mode=block" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
	...(allowedDevOrigins?.length ? { allowedDevOrigins } : {}),
	turbopack: {
		root: projectRoot,
	},
	cacheComponents: false,
	images: {
		unoptimized: true,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "cdn.simpleicons.org",
				port: "",
				pathname: "/**",
				search: "",
			},
			{
				protocol: "https",
				hostname: "cdn.jsdelivr.net",
				port: "",
				pathname: "/gh/homarr-labs/dashboard-icons/**",
				search: "",
			},
			{
				protocol: "https",
				hostname: "cdn.jsdelivr.net",
				port: "",
				pathname: "/npm/@lobehub/**",
				search: "",
			},
			{
				protocol: "https",
				hostname: "raw.githubusercontent.com",
				port: "",
				pathname: "/lobehub/lobe-icons/**",
				search: "",
			},
			{
				protocol: "http",
				hostname: "127.0.0.1",
				port: "8090",
				pathname: "/api/files/**",
			},
			{
				protocol: "http",
				hostname: "localhost",
				port: "8090",
				pathname: "/api/files/**",
			},
		],
	},
	output: "standalone",
	outputFileTracingExcludes: {
		"*": [
			"./scripts/**",
			"./docs/**",
			"./e2e/**",
			"./playwright.config.ts",
			"./.cursor/**",
			"./node_modules/@biomejs/**",
			"./node_modules/@playwright/**",
			"./node_modules/playwright/**",
			"./node_modules/playwright-core/**",
			"./node_modules/typescript/**",
			"./node_modules/@swc/helpers/**",
		],
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: securityHeaders,
			},
			{
				source: "/api/mcp/:path*",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "Cache-Control", value: "no-store" },
					{ key: "X-Frame-Options", value: "DENY" },
				],
			},
			{
				source: "/:path*.png",
				headers: [
					{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
				],
			},
			{
				source: "/:path*.svg",
				headers: [
					{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
				],
			},
			{
				source: "/:path*.webp",
				headers: [
					{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
				],
			},
		];
	},
};

export default nextConfig;

// export default withPostHogConfig(nextConfig, {
//   personalApiKey: process.env.POSTHOG_API_KEY!, // Personal API Key
//   envId: process.env.POSTHOG_ENV_ID!, // Environment ID
//   host: process.env.NEXT_PUBLIC_POSTHOG_HOST, // (optional), defaults to https://us.posthog.com
//   sourcemaps: { // (optional)
//       enabled: true, // (optional) Enable sourcemaps generation and upload, default to true on production builds
//       project: "dashboardicons", // (optional) Project name, defaults to repository name
//       deleteAfterUpload: true, // (optional) Delete sourcemaps after upload, defaults to true
//   },
// });
