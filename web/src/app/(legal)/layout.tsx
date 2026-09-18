import type { ReactNode } from "react"

export default function LegalLayout({ children }: { children: ReactNode }) {
	return (
		<article className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-20 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight md:[&_h1]:text-5xl [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:my-4 [&_p]:leading-7 [&_p]:text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:break-words [&_a]:hover:text-primary [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_li]:leading-7 [&_li]:text-muted-foreground">
			{children}
		</article>
	)
}
