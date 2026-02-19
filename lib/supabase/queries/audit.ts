import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

export type AuditLogRow = Database['public']['Tables']['audit_log']['Row']

export interface AuditLogWithProfile extends AuditLogRow {
  profile: { full_name: string; email: string } | null
}

export interface AuditLogsFilter {
  action?: 'INSERT' | 'UPDATE' | 'DELETE'
  tableName?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
}

export interface AuditLogsResult {
  data: AuditLogWithProfile[]
  count: number
}

export async function getAuditLogs(
  filter: AuditLogsFilter = {},
  page = 0,
  pageSize = 50
): Promise<AuditLogsResult> {
  const supabase = createClient()

  let query = supabase
    .from('audit_log')
    .select(
      `
      id,
      table_name,
      record_id,
      action,
      user_id,
      old_data,
      new_data,
      created_at,
      ip_address,
      profile:profiles!audit_log_user_id_fkey(full_name, email)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  if (filter.action) {
    query = query.eq('action', filter.action)
  }
  if (filter.tableName) {
    query = query.eq('table_name', filter.tableName)
  }
  if (filter.userId) {
    query = query.eq('user_id', filter.userId)
  }
  if (filter.dateFrom) {
    query = query.gte('created_at', filter.dateFrom)
  }
  if (filter.dateTo) {
    query = query.lte('created_at', filter.dateTo)
  }

  const { data, error, count } = await query

  if (error) throw error

  return {
    data: (data ?? []) as AuditLogWithProfile[],
    count: count ?? 0,
  }
}

export async function getAuditLogUsers(): Promise<{ id: string; full_name: string }[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('audit_log')
    .select('user_id, profile:profiles!audit_log_user_id_fkey(full_name)')
    .not('user_id', 'is', null)

  if (error) throw error

  const seen = new Set<string>()
  const users: { id: string; full_name: string }[] = []

  for (const row of data ?? []) {
    const uid = row.user_id
    if (!uid || seen.has(uid)) continue
    seen.add(uid)
    const profile = row.profile as { full_name: string } | null
    users.push({ id: uid, full_name: profile?.full_name ?? 'Unknown' })
  }

  return users.sort((a, b) => a.full_name.localeCompare(b.full_name))
}
