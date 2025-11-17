"use client"

import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { REPO_PATH } from "@/constants"

const LOCAL_STORAGE_KEY = "licenseNoticeDismissed"

export function LicenseNotice() {
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		// Check local storage only on the client side
		const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY)
		if (!dismissed) {
			setIsVisible(true)
		}
	}, [])

	const handleDismiss = () => {
		localStorage.setItem(LOCAL_STORAGE_KEY, "true")
		setIsVisible(false)
	}

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.3 }}
					className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border bg-card p-4 text-card-foreground shadow-lg"
				>
					<div className="flex items-start justify-between">
						<div className="text-xs text-muted-foreground space-y-1">
							<p>
								All product names, trademarks, and registered trademarks are the property of their respective owners. Icons are used for
								identification purposes only and do not imply endorsement.
							</p>
							<p>
								View our{" "}
								<Link
									href={`${REPO_PATH}/blob/main/LICENSE`}
									className="underline hover:text-foreground"
									target="_blank"
									rel="noopener noreferrer"
								>
									LICENSE
								</Link>{" "}
								or{" "}
								<a href="mailto:homarr-labs@proton.me" className="underline hover:text-foreground">
									contact us
								</a>
								.
							</p>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="-mr-2 -mt-2 h-6 w-6 p-0"
							onClick={handleDismiss}
							aria-label="Dismiss license notice"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
