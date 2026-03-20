'use client'

import * as React from 'react'
import { CheckCircle2, ExternalLink, Loader2, Shield, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { DropboxIcon } from '@/components/icons/dropbox-icon'
import { useDisconnectDropbox } from '@/hooks/queries/use-document-hooks'

interface DropboxConnectionRow {
  id: string
  account_email: string
  status: string
  last_synced_at: string | null
  created_at: string
}

interface DropboxConnectionCardProps {
  organizationId: string
  connection: DropboxConnectionRow | null
}

export function DropboxConnectionCard({ connection }: DropboxConnectionCardProps) {
  const disconnectMutation = useDisconnectDropbox()

  const handleConnect = () => {
    window.location.href = '/api/auth/dropbox'
  }

  const handleDisconnect = () => {
    if (!connection) return
    disconnectMutation.mutate(connection.id)
  }

  if (!connection) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header band */}
          <div className="bg-[#0061FE] px-8 py-10 text-center text-white">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <DropboxIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold">Connect Your Dropbox</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-blue-100">
              Link your organisation&apos;s Dropbox to index ecological reports and make them
              searchable during desk research
            </p>
          </div>

          {/* Body */}
          <div className="space-y-6 px-8 py-8">
            {/* Features */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: 'Index Reports',
                  desc: 'PDF & DOCX files are extracted and indexed for full-text search',
                },
                {
                  title: 'Desk Research',
                  desc: "Search your firm's reports directly from the Data Gathering step",
                },
                {
                  title: 'Read-Only Access',
                  desc: 'Dulra only reads selected files — nothing is modified or deleted',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800"
                >
                  <h4 className="text-foreground text-sm font-semibold">{f.title}</h4>
                  <p className="mt-1 text-xs text-gray-500">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <Button
                onClick={handleConnect}
                size="lg"
                className="gap-2.5 bg-[#0061FE] px-8 text-base hover:bg-[#0050D4]"
              >
                <DropboxIcon className="h-5 w-5" />
                Connect Dropbox
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <Shield className="h-3.5 w-3.5" />
                Secure OAuth 2.0 — your password is never shared
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Connected header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-[#0061FE]/5 to-transparent px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0061FE]">
              <DropboxIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-foreground font-semibold">Dropbox</h3>
                <Badge
                  variant="outline"
                  className="gap-1 border-green-200 bg-green-50 text-green-700"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{connection.account_email}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleConnect} className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Reconnect
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Dropbox?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the Dropbox connection and delete all indexed documents. Saved
                    findings from previous searches will not be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="mr-2 h-4 w-4" />
                    )}
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4">
          <div className="flex gap-6 text-sm text-gray-500">
            <span>
              Connected:{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {new Date(connection.created_at).toLocaleDateString()}
              </span>
            </span>
            {connection.last_synced_at && (
              <span>
                Last synced:{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {new Date(connection.last_synced_at).toLocaleDateString()}
                </span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
