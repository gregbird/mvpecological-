'use client'

import { useQuery } from '@tanstack/react-query'
import { getAuditLogs, getAuditLogUsers } from '@/lib/supabase/queries/audit'
import type { AuditLogsFilter } from '@/lib/supabase/queries/audit'

export function useAuditLogs(filter: AuditLogsFilter = {}, page = 0, pageSize = 50) {
  return useQuery({
    queryKey: ['audit-logs', filter, page, pageSize],
    queryFn: () => getAuditLogs(filter, page, pageSize),
  })
}

export function useAuditLogUsers() {
  return useQuery({
    queryKey: ['audit-log-users'],
    queryFn: () => getAuditLogUsers(),
  })
}
