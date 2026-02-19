'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjectReports,
  getLatestReport,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  createReportVersion,
  getReportByVersion,
} from '@/lib/supabase/queries'
import type { ReportContent } from '@/lib/supabase/queries/reports'
import type { InsertTables, UpdateTables } from '@/types/database'

export function useReports(projectId: string) {
  return useQuery({
    queryKey: ['reports', projectId],
    queryFn: () => getProjectReports(projectId),
    enabled: !!projectId,
  })
}

export function useLatestReport(projectId: string) {
  return useQuery({
    queryKey: ['latest-report', projectId],
    queryFn: () => getLatestReport(projectId),
    enabled: !!projectId,
  })
}

export function useReport(reportId: string) {
  return useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId),
    enabled: !!reportId,
  })
}

export function useCreateReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (report: InsertTables<'reports'>) => createReport(report),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['reports'] })
        queryClient.invalidateQueries({ queryKey: ['latest-report'] })
      }
    },
  })
}

export function useUpdateReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reportId, updates }: { reportId: string; updates: UpdateTables<'reports'> }) =>
      updateReport(reportId, updates),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['report', variables.reportId] })
        queryClient.invalidateQueries({ queryKey: ['reports'] })
        queryClient.invalidateQueries({ queryKey: ['latest-report'] })
      }
    },
  })
}

export function useDeleteReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reportId: string) => deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['latest-report'] })
    },
  })
}

export function useCreateReportVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      content,
      reportType,
      generatedBy,
      sourceVersion,
    }: {
      projectId: string
      content: ReportContent
      reportType: string
      generatedBy: string
      sourceVersion?: number
    }) => createReportVersion(projectId, content, reportType, generatedBy, sourceVersion),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['latest-report', variables.projectId] })
    },
  })
}

export function useReportByVersion(projectId: string, version: number | null) {
  return useQuery({
    queryKey: ['report-version', projectId, version],
    queryFn: () => getReportByVersion(projectId, version!),
    enabled: !!projectId && version !== null,
  })
}
