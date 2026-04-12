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
  updateReportVersionName,
} from '@/lib/supabase/queries'
import { getLatestReportByType, getReportsByType } from '@/lib/supabase/queries/reports'
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
        if (data.project_id) {
          queryClient.invalidateQueries({ queryKey: ['latest-report', data.project_id] })
          queryClient.invalidateQueries({ queryKey: ['reports', data.project_id] })
        } else {
          queryClient.invalidateQueries({ queryKey: ['latest-report'] })
          queryClient.invalidateQueries({ queryKey: ['reports'] })
        }
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
      versionName,
    }: {
      projectId: string
      content: ReportContent
      reportType: string
      generatedBy: string
      sourceVersion?: number
      versionName?: string
    }) =>
      createReportVersion(projectId, content, reportType, generatedBy, sourceVersion, versionName),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['latest-report', variables.projectId] })
    },
  })
}

export function useUpdateVersionName() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reportId, versionName }: { reportId: string; versionName: string }) =>
      updateReportVersionName(reportId, versionName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['latest-report'] })
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

// --- Multi-report hooks ---

export function useLatestReportByType(projectId: string, reportType: string) {
  return useQuery({
    queryKey: ['latest-report', projectId, reportType],
    queryFn: () => getLatestReportByType(projectId, reportType),
    enabled: !!projectId && !!reportType,
  })
}

export function useReportsByType(projectId: string, reportType: string) {
  return useQuery({
    queryKey: ['reports', projectId, reportType],
    queryFn: () => getReportsByType(projectId, reportType),
    enabled: !!projectId && !!reportType,
  })
}
