'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Project Error]', error)
  }, [error])

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="mx-auto max-w-md text-center">
        <div className="bg-destructive/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <AlertCircle className="text-destructive h-6 w-6" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">Project could not be loaded</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          There was a problem loading this project. The project may have been deleted or you may not
          have access.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
