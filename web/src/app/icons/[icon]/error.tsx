"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

export default function IconError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container py-16 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold">Icon not found</h1>
        <p className="text-muted-foreground">
          The icon you are looking for could not be found or there was an error loading it.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
          <Button asChild>
            <Link href="/icons">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to all icons
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
} 