'use client'

import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-white dark:bg-amber-600">
      <WifiOff className="h-3.5 w-3.5" />
      You are offline — changes cannot be saved until connection is restored
    </div>
  )
}
