'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Organization, UserRole } from '@/types/database'

export interface RolePermissions {
  // Project Management
  canCreateProject: boolean
  canDeleteProject: boolean
  canViewAllProjects: boolean
  // Team & System
  canManageTeam: boolean
  canManageSettings: boolean
  canViewAuditTrail: boolean
  canViewTimesheets: boolean
  // GIS & Mapping
  canDrawBoundary: boolean
  canUploadShapefiles: boolean
  // Data Gathering
  canSearchExternalData: boolean
  canSaveFindings: boolean
  // Field Surveys
  canCreateSurvey: boolean
  canMarkAsUncertain: boolean
  canEnterFieldData: boolean
  canEditHabitats: boolean
  // Reporting
  canWriteReports: boolean
  canSubmitForReview: boolean
  canApproveReport: boolean
  // Template Management
  canManageTemplates: boolean
  // Document Management
  canManageDocuments: boolean
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    // Project Management
    canCreateProject: true,
    canDeleteProject: true,
    canViewAllProjects: true,
    // Team & System
    canManageTeam: true,
    canManageSettings: true,
    canViewAuditTrail: true,
    canViewTimesheets: true,
    // GIS & Mapping
    canDrawBoundary: true,
    canUploadShapefiles: true,
    // Data Gathering
    canSearchExternalData: true,
    canSaveFindings: true,
    // Field Surveys
    canCreateSurvey: true,
    canMarkAsUncertain: true,
    canEnterFieldData: true,
    canEditHabitats: true,
    // Reporting
    canWriteReports: true,
    canSubmitForReview: true,
    canApproveReport: true,
    // Template Management
    canManageTemplates: true,
    // Document Management
    canManageDocuments: true,
  },
  project_manager: {
    // Project Management
    canCreateProject: true,
    canDeleteProject: false,
    canViewAllProjects: true,
    // Team & System
    canManageTeam: true,
    canManageSettings: false,
    canViewAuditTrail: true,
    canViewTimesheets: true,
    // GIS & Mapping
    canDrawBoundary: true,
    canUploadShapefiles: true,
    // Data Gathering
    canSearchExternalData: true,
    canSaveFindings: true,
    // Field Surveys
    canCreateSurvey: true,
    canMarkAsUncertain: true,
    canEnterFieldData: true,
    canEditHabitats: true,
    // Reporting
    canWriteReports: true,
    canSubmitForReview: true,
    canApproveReport: true,
    // Template Management
    canManageTemplates: true,
    // Document Management
    canManageDocuments: true,
  },
  ecologist: {
    // Project Management
    canCreateProject: false,
    canDeleteProject: false,
    canViewAllProjects: false,
    // Team & System
    canManageTeam: false,
    canManageSettings: false,
    canViewAuditTrail: false,
    canViewTimesheets: false,
    // GIS & Mapping
    canDrawBoundary: true,
    canUploadShapefiles: true,
    // Data Gathering
    canSearchExternalData: true,
    canSaveFindings: true,
    // Field Surveys
    canCreateSurvey: true,
    canMarkAsUncertain: true,
    canEnterFieldData: true,
    canEditHabitats: true,
    // Reporting
    canWriteReports: true,
    canSubmitForReview: true,
    canApproveReport: false,
    // Template Management
    canManageTemplates: false,
    // Document Management
    canManageDocuments: false,
  },
  // assessor is deprecated — maps to ecologist permissions
  get assessor() {
    return this.ecologist
  },
  junior: {
    // Project Management
    canCreateProject: false,
    canDeleteProject: false,
    canViewAllProjects: false,
    // Team & System
    canManageTeam: false,
    canManageSettings: false,
    canViewAuditTrail: false,
    canViewTimesheets: false,
    // GIS & Mapping
    canDrawBoundary: false,
    canUploadShapefiles: false,
    // Data Gathering
    canSearchExternalData: true,
    canSaveFindings: true,
    // Field Surveys
    canCreateSurvey: false,
    canMarkAsUncertain: true,
    canEnterFieldData: true,
    canEditHabitats: false,
    // Reporting
    canWriteReports: false,
    canSubmitForReview: false,
    canApproveReport: false,
    // Template Management
    canManageTemplates: false,
    // Document Management
    canManageDocuments: false,
  },
  third_party: {
    // Project Management
    canCreateProject: false,
    canDeleteProject: false,
    canViewAllProjects: false,
    // Team & System
    canManageTeam: false,
    canManageSettings: false,
    canViewAuditTrail: false,
    canViewTimesheets: false,
    // GIS & Mapping
    canDrawBoundary: false,
    canUploadShapefiles: false,
    // Data Gathering
    canSearchExternalData: false,
    canSaveFindings: false,
    // Field Surveys
    canCreateSurvey: false,
    canMarkAsUncertain: true,
    canEnterFieldData: true,
    canEditHabitats: false,
    // Reporting
    canWriteReports: false,
    canSubmitForReview: false,
    canApproveReport: false,
    // Template Management
    canManageTemplates: false,
    // Document Management
    canManageDocuments: false,
  },
  client: {
    // Project Management
    canCreateProject: false,
    canDeleteProject: false,
    canViewAllProjects: false,
    // Team & System
    canManageTeam: false,
    canManageSettings: false,
    canViewAuditTrail: false,
    canViewTimesheets: false,
    // GIS & Mapping
    canDrawBoundary: false,
    canUploadShapefiles: false,
    // Data Gathering
    canSearchExternalData: false,
    canSaveFindings: false,
    // Field Surveys
    canCreateSurvey: false,
    canMarkAsUncertain: false,
    canEnterFieldData: false,
    canEditHabitats: false,
    // Reporting
    canWriteReports: false,
    canSubmitForReview: false,
    canApproveReport: false,
    // Template Management
    canManageTemplates: false,
    // Document Management
    canManageDocuments: false,
  },
}

interface RoleConfig {
  id: UserRole
  label: string
  description: string
  color: string
  bgColor: string
}

export const ROLE_CONFIGS: RoleConfig[] = [
  {
    id: 'admin',
    label: 'Admin',
    description: 'Full system access',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-600',
  },
  {
    id: 'project_manager',
    label: 'Project Manager',
    description: 'Create/manage projects, assign team',
    color: 'text-purple-600',
    bgColor: 'bg-purple-600',
  },
  {
    id: 'ecologist',
    label: 'Ecologist',
    description: 'End-to-end project management',
    color: 'text-blue-600',
    bgColor: 'bg-blue-600',
  },
  {
    id: 'junior',
    label: 'Junior',
    description: 'Data gathering + field research',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-600',
  },
  {
    id: 'third_party',
    label: '3rd Party',
    description: 'Field research only',
    color: 'text-orange-600',
    bgColor: 'bg-orange-600',
  },
  {
    id: 'client',
    label: 'Client',
    description: 'Read-only access',
    color: 'text-gray-600',
    bgColor: 'bg-gray-600',
  },
]

export interface UserWithOrganization extends Profile {
  organization: Organization | null
}

interface RoleContextType {
  user: UserWithOrganization | null
  isLoading: boolean
  error: string | null
  permissions: RolePermissions
  roleConfig: RoleConfig
  refetch: () => Promise<void>
}

const RoleContext = React.createContext<RoleContextType | undefined>(undefined)

// Default permissions for unauthenticated users
const DEFAULT_PERMISSIONS: RolePermissions = {
  // Project Management
  canCreateProject: false,
  canDeleteProject: false,
  canViewAllProjects: false,
  // Team & System
  canManageTeam: false,
  canManageSettings: false,
  canViewAuditTrail: false,
  canViewTimesheets: false,
  // GIS & Mapping
  canDrawBoundary: false,
  canUploadShapefiles: false,
  // Data Gathering
  canSearchExternalData: false,
  canSaveFindings: false,
  // Field Surveys
  canCreateSurvey: false,
  canMarkAsUncertain: false,
  canEnterFieldData: false,
  canEditHabitats: false,
  // Reporting
  canWriteReports: false,
  canSubmitForReview: false,
  canApproveReport: false,
  // Template Management
  canManageTemplates: false,
  // Documents
  canManageDocuments: false,
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserWithOrganization | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const isInitialLoad = React.useRef(true)

  const fetchUser = React.useCallback(async (retryCount = 0, showLoading = true) => {
    try {
      // Only show loading on initial load, not on token refresh
      if (showLoading && isInitialLoad.current) {
        setIsLoading(true)
      }
      setError(null)

      const supabase = createClient()

      // Get the authenticated user
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      // Handle auth errors gracefully - "Auth session missing" is expected when not logged in
      if (authError) {
        // These are expected errors when user is not authenticated
        if (
          authError.message?.includes('Auth session missing') ||
          authError.name === 'AuthSessionMissingError'
        ) {
          setUser(null)
          return
        }
        throw authError
      }

      if (!authUser) {
        setUser(null)
        return
      }

      // Get the user's profile with organization. The FK hint is required
      // because organizations now has TWO relationships to profiles:
      //   - profiles.organization_id → organizations.id  (which org I belong to)
      //   - organizations.owner_id   → profiles.id       (who owns the org)
      // Without `!profiles_organization_id_fkey`, PostgREST cannot pick a
      // side and rejects the embed, the error is swallowed below, and the UI
      // silently falls back to the "ecologist" default role.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(
          `
          *,
          organization:organizations!profiles_organization_id_fkey(*)
        `
        )
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        // Profile might not exist yet (e.g., during registration)
        // PGRST116 = no rows returned
        if (profileError.code === 'PGRST116') {
          // Retry a few times as trigger might still be running
          if (retryCount < 3) {
            await new Promise((resolve) => setTimeout(resolve, 500))
            return fetchUser(retryCount + 1)
          }
          setUser(null)
          return
        }
        throw profileError
      }

      setUser(profile as UserWithOrganization)
    } catch {
      // Silently handle errors - user will be treated as unauthenticated
      setUser(null)
    } finally {
      if (isInitialLoad.current) {
        setIsLoading(false)
        isInitialLoad.current = false
      }
    }
  }, [])

  // Initial fetch
  React.useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Listen for auth state changes
  React.useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Full fetch on sign in
        fetchUser(0, true)
      } else if (event === 'TOKEN_REFRESHED') {
        // Silent fetch on token refresh - don't show loading
        fetchUser(0, false)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUser])

  const permissions = user ? ROLE_PERMISSIONS[user.role] : DEFAULT_PERMISSIONS
  const roleConfig = ROLE_CONFIGS.find((r) => r.id === user?.role) || ROLE_CONFIGS[0]

  return (
    <RoleContext.Provider
      value={{
        user,
        isLoading,
        error,
        permissions,
        roleConfig,
        refetch: fetchUser,
      }}
    >
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = React.useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

// Helper hook for checking specific permissions
export function usePermission(permission: keyof RolePermissions): boolean {
  const { permissions } = useRole()
  return permissions[permission]
}

// Helper hook for checking if user is admin
export function useIsAdmin(): boolean {
  const { user } = useRole()
  return user?.role === 'admin'
}
