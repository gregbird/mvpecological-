'use client'

import * as React from 'react'
import { History, ChevronLeft, ChevronRight, Loader2, Download, Eye } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuditLogs, useAuditLogUsers } from '@/hooks/queries/use-audit-hooks'
import type { AuditLogsFilter, AuditLogWithProfile } from '@/lib/supabase/queries/audit'

// Action type badge styles
const ACTION_STYLES = {
  INSERT: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    label: 'Created',
  },
  UPDATE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Updated' },
  DELETE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Deleted' },
} as const

// Human-readable table names
const TABLE_LABELS: Record<string, string> = {
  projects: 'Project',
  desk_research_findings: 'Finding',
  surveys: 'Survey',
  species_observations: 'Species Observation',
  habitat_polygons: 'Habitat',
  target_notes: 'Target Note',
  reports: 'Report',
  workflow_steps: 'Workflow Step',
  deep_research_results: 'Deep Research',
  aquatic_research_results: 'Aquatic Research',
  map_screenshots: 'Map Screenshot',
  project_members: 'Project Member',
}

// Fields to skip in diff view (noise)
const SKIP_FIELDS = new Set(['updated_at', 'created_at', 'id'])

// Avatar color palette
const AVATAR_COLORS = [
  { bg: 'bg-purple-500', text: 'text-white' },
  { bg: 'bg-blue-500', text: 'text-white' },
  { bg: 'bg-green-500', text: 'text-white' },
  { bg: 'bg-pink-500', text: 'text-white' },
  { bg: 'bg-orange-500', text: 'text-white' },
  { bg: 'bg-red-500', text: 'text-white' },
  { bg: 'bg-teal-500', text: 'text-white' },
  { bg: 'bg-indigo-500', text: 'text-white' },
  { bg: 'bg-amber-500', text: 'text-white' },
  { bg: 'bg-cyan-500', text: 'text-white' },
]

const colorCache = new Map<string, number>()
let colorCounter = 0

function getAvatarColor(userId: string) {
  if (!colorCache.has(userId)) {
    colorCache.set(userId, colorCounter % AVATAR_COLORS.length)
    colorCounter++
  }
  return AVATAR_COLORS[colorCache.get(userId)!]
}

function getInitials(name: string) {
  return name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  return { date, time }
}

function buildDetails(
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  tableName: string,
  newData: Record<string, unknown> | null,
  oldData: Record<string, unknown> | null
): string {
  const label = TABLE_LABELS[tableName] ?? tableName

  if (action === 'INSERT') {
    const title = (newData?.title ?? newData?.name ?? newData?.full_name ?? '') as string
    return title ? `${label} created: ${title}` : `${label} created`
  }
  if (action === 'DELETE') {
    const title = (oldData?.title ?? oldData?.name ?? oldData?.full_name ?? '') as string
    return title ? `${label} deleted: ${title}` : `${label} deleted`
  }
  if (oldData && newData) {
    const changed = Object.keys(newData).filter(
      (k) => !SKIP_FIELDS.has(k) && JSON.stringify(newData[k]) !== JSON.stringify(oldData[k])
    )
    if (changed.length > 0) {
      return `${label} updated: ${changed.slice(0, 3).join(', ')}${changed.length > 3 ? ` +${changed.length - 3} more` : ''}`
    }
  }
  return `${label} updated`
}

const TRUNCATE_LIMIT = 120

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  return String(val)
}

function isLargeValue(val: unknown): boolean {
  return formatValue(val).length > TRUNCATE_LIMIT
}

// Single cell with expand/collapse for long values
function ValueCell({
  value,
  colorClass,
  bgClass,
}: {
  value: unknown
  colorClass: string
  bgClass: string
}) {
  const [expanded, setExpanded] = React.useState(false)
  const formatted = formatValue(value)
  const large = formatted.length > TRUNCATE_LIMIT

  return (
    <div className={`rounded px-2 py-1 ${bgClass}`}>
      <span
        className={`text-xs break-all ${colorClass} ${!expanded && large ? 'line-clamp-3' : 'whitespace-pre-wrap'}`}
      >
        {formatted}
      </span>
      {large && (
        <button
          className={`mt-1 block text-[11px] font-medium underline ${colorClass} opacity-70 hover:opacity-100`}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

// ── Detay Modal ──────────────────────────────────────────────────────────────
function AuditDetailModal({
  entry,
  onClose,
}: {
  entry: AuditLogWithProfile | null
  onClose: () => void
}) {
  if (!entry) return null

  const newData = entry.new_data as Record<string, unknown> | null
  const oldData = entry.old_data as Record<string, unknown> | null
  const actionStyle = ACTION_STYLES[entry.action]
  const userName = entry.profile?.full_name ?? 'System'
  const tableLabel = TABLE_LABELS[entry.table_name] ?? entry.table_name
  const { date, time } = formatDateTime(entry.created_at)

  // For UPDATE: find changed fields
  const changedFields =
    entry.action === 'UPDATE' && oldData && newData
      ? Object.keys(newData).filter(
          (k) => !SKIP_FIELDS.has(k) && JSON.stringify(newData[k]) !== JSON.stringify(oldData[k])
        )
      : []

  // For INSERT: show new_data fields; for DELETE: show old_data fields
  const displayData = entry.action === 'DELETE' ? oldData : newData
  const displayFields = displayData
    ? Object.keys(displayData).filter((k) => !SKIP_FIELDS.has(k))
    : []

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Audit Entry Detail</span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${actionStyle.bg} ${actionStyle.text} ${actionStyle.border}`}
            >
              {actionStyle.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Meta info */}
        <div className="bg-muted/30 grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              User
            </p>
            <p className="mt-0.5 font-medium">{userName}</p>
            {entry.profile?.email && (
              <p className="text-muted-foreground text-xs">{entry.profile.email}</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Date & Time
            </p>
            <p className="mt-0.5 font-medium">{date}</p>
            <p className="text-muted-foreground text-xs">{time}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Table
            </p>
            <p className="mt-0.5 font-medium">{tableLabel}</p>
            <p className="text-muted-foreground font-mono text-xs">{entry.table_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Record ID
            </p>
            <p className="mt-0.5 font-mono text-xs break-all">{entry.record_id}</p>
          </div>
        </div>

        {/* UPDATE: diff view */}
        {entry.action === 'UPDATE' && changedFields.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Changed Fields</p>
            <div className="overflow-hidden rounded-lg border">
              <div className="bg-muted/50 text-muted-foreground grid grid-cols-[1fr_2fr_2fr] gap-0 border-b px-3 py-2 text-xs font-semibold tracking-wide uppercase">
                <span>Field</span>
                <span className="pl-2 text-red-600">Before</span>
                <span className="pl-2 text-green-600">After</span>
              </div>
              {changedFields.map((field) => {
                const large = isLargeValue(oldData?.[field]) || isLargeValue(newData?.[field])
                return large ? (
                  // Large value: show field name full-width, then before/after stacked below
                  <div key={field} className="border-b px-3 py-2 last:border-0">
                    <p className="text-muted-foreground mb-2 font-mono text-xs font-medium">
                      {field}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <ValueCell
                        value={oldData?.[field]}
                        colorClass="text-red-700"
                        bgClass="bg-red-50"
                      />
                      <ValueCell
                        value={newData?.[field]}
                        colorClass="text-green-700"
                        bgClass="bg-green-50"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    key={field}
                    className="grid grid-cols-[1fr_2fr_2fr] gap-0 border-b px-3 py-2 text-xs last:border-0"
                  >
                    <span className="text-muted-foreground pr-2 font-mono font-medium">
                      {field}
                    </span>
                    <span className="rounded bg-red-50 px-2 py-1 pr-2 text-xs text-red-700">
                      {formatValue(oldData?.[field])}
                    </span>
                    <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">
                      {formatValue(newData?.[field])}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* INSERT / DELETE: show all fields */}
        {entry.action !== 'UPDATE' && displayFields.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">
              {entry.action === 'INSERT' ? 'Created Data' : 'Deleted Data'}
            </p>
            <div className="overflow-hidden rounded-lg border">
              <div className="bg-muted/50 text-muted-foreground grid grid-cols-[1fr_2fr] gap-0 border-b px-3 py-2 text-xs font-semibold tracking-wide uppercase">
                <span>Field</span>
                <span className="pl-2">Value</span>
              </div>
              {displayFields.map((field) => {
                const val = displayData?.[field]
                const large = isLargeValue(val)
                return large ? (
                  <div key={field} className="border-b px-3 py-2 last:border-0">
                    <p className="text-muted-foreground mb-1 font-mono text-xs font-medium">
                      {field}
                    </p>
                    <ValueCell value={val} colorClass="text-foreground" bgClass="bg-muted/30" />
                  </div>
                ) : (
                  <div
                    key={field}
                    className="grid grid-cols-[1fr_2fr] gap-0 border-b px-3 py-2 text-xs last:border-0"
                  >
                    <span className="text-muted-foreground pr-2 font-mono font-medium">
                      {field}
                    </span>
                    <span className="break-all">{formatValue(val)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── CSV Export ───────────────────────────────────────────────────────────────
function exportToCsv(entries: AuditLogWithProfile[]) {
  const headers = ['Date', 'Time', 'User', 'Email', 'Action', 'Table', 'Record ID', 'Details']

  const rows = entries.map((entry) => {
    const { date, time } = formatDateTime(entry.created_at)
    const newData = entry.new_data as Record<string, unknown> | null
    const oldData = entry.old_data as Record<string, unknown> | null
    const details = buildDetails(entry.action, entry.table_name, newData, oldData)
    return [
      date,
      time,
      entry.profile?.full_name ?? 'System',
      entry.profile?.email ?? '',
      ACTION_STYLES[entry.action].label,
      TABLE_LABELS[entry.table_name] ?? entry.table_name,
      entry.record_id,
      details,
    ]
  })

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ── Page ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50

export default function AuditPage() {
  const [actionFilter, setActionFilter] = React.useState<string>('all')
  const [tableFilter, setTableFilter] = React.useState<string>('all')
  const [userFilter, setUserFilter] = React.useState<string>('all')
  const [page, setPage] = React.useState(0)
  const [selectedEntry, setSelectedEntry] = React.useState<AuditLogWithProfile | null>(null)

  const filter: AuditLogsFilter = {
    ...(actionFilter !== 'all' && { action: actionFilter as 'INSERT' | 'UPDATE' | 'DELETE' }),
    ...(tableFilter !== 'all' && { tableName: tableFilter }),
    ...(userFilter !== 'all' && { userId: userFilter }),
  }

  const { data: result, isLoading, isError } = useAuditLogs(filter, page, PAGE_SIZE)
  const { data: users = [] } = useAuditLogUsers()

  const entries = result?.data ?? []
  const totalCount = result?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  React.useEffect(() => {
    setPage(0)
  }, [actionFilter, tableFilter, userFilter])

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="h-8 w-8 text-gray-700 dark:text-gray-300" />
          <div>
            <h1 className="text-foreground text-2xl font-bold">Audit Trail</h1>
            <p className="text-gray-600">Track all changes and activities across the platform</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCsv(entries)}
          disabled={entries.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="border-border bg-card mb-6 rounded-xl border p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Action
            </label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Created</SelectItem>
                <SelectItem value="UPDATE">Updated</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Table
            </label>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by User
            </label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading audit logs...</span>
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-sm text-red-500">
            Failed to load audit logs. Please try again.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    Date & Time
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    Table
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    Details
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => {
                  const actionStyle = ACTION_STYLES[entry.action]
                  const userName = entry.profile?.full_name ?? 'System'
                  const userId = entry.user_id ?? 'system'
                  const color = getAvatarColor(userId)
                  const { date, time } = formatDateTime(entry.created_at)
                  const newData = entry.new_data as Record<string, unknown> | null
                  const oldData = entry.old_data as Record<string, unknown> | null
                  const details = buildDetails(entry.action, entry.table_name, newData, oldData)
                  const tableLabel = TABLE_LABELS[entry.table_name] ?? entry.table_name

                  return (
                    <tr
                      key={entry.id}
                      className="cursor-pointer transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <td className="px-5 py-4 text-sm whitespace-nowrap text-gray-600">
                        <div>{date}</div>
                        <div className="text-gray-400">{time}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback
                              className={`${color.bg} ${color.text} text-xs font-medium`}
                            >
                              {getInitials(userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-foreground text-sm font-medium">{userName}</div>
                            {entry.profile?.email && (
                              <div className="text-xs text-gray-400">{entry.profile.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant="outline"
                          className={`${actionStyle.bg} ${actionStyle.text} ${actionStyle.border}`}
                        >
                          {actionStyle.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {tableLabel}
                      </td>
                      <td className="max-w-xs px-5 py-4 text-sm text-gray-600">{details}</td>
                      <td className="px-5 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedEntry(entry)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}

                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                      No audit entries match the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer with pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/50">
          <p className="text-sm text-gray-500">
            {totalCount > 0
              ? `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} of ${totalCount.toLocaleString()} entries`
              : 'No entries'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AuditDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  )
}
