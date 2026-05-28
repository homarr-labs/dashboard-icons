export type FaqItem = {
	question: string
	answer: string
}

export const HOME_FAQS: FaqItem[] = [
	{
		question: "What is Dashboard Icons?",
		answer:
			"Dashboard Icons is a free collection of curated icons and logos for self-hosted services, applications, and tools. It is designed for dashboards, app directories, and homelab setups.",
	},
	{
		question: "What formats are available?",
		answer:
			"Each icon is available in SVG, PNG, and WEBP formats. SVG files are ideal for scaling, while PNG and WEBP work well in dashboards and app launchers.",
	},
	{
		question: "Are icons free to use?",
		answer:
			"Native Dashboard Icons are licensed under Creative Commons Attribution 4.0 (CC BY 4.0). You can download and use them for free with attribution. External icon sets may use different licenses.",
	},
	{
		question: "How do I search for an icon?",
		answer:
			"Use the search bar on the homepage or browse page at /icons. Search by service name or alias, then filter by source or sort results.",
	},
	{
		question: "How can I contribute?",
		answer:
			"You can submit new icons through the submit page or contribute directly on GitHub at github.com/homarr-labs/dashboard-icons.",
	},
	{
		question: "Who maintains Dashboard Icons?",
		answer:
			"Dashboard Icons is maintained by Homarr Labs. The project is open source and community contributions are welcome.",
	},
]
