import { HOME_FAQS } from "@/lib/seo/faqs"

export function HomeFaq() {
	return (
		<section className="container mx-auto px-4 md:px-6 py-16 max-w-3xl">
			<h2 className="text-2xl font-bold mb-8">Frequently asked questions</h2>
			<div className="flex flex-col gap-8">
				{HOME_FAQS.map((faq) => (
					<div key={faq.question}>
						<h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
						<p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
					</div>
				))}
			</div>
		</section>
	)
}
