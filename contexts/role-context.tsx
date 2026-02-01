'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Organization, UserRole } from '@/types/database'

export interface RolePermissions {
  canCreateProject: boolean
  canDeleteProject: boolean
  canManageTeam: boolean
  canManageSettings: boolean
  canViewAuditTrail: boolean
  canViewTimesheets: boolean
  // Assessor permissions
  canEnterFieldData: boolean
  canEditHabitats: boolean
  canWriteReports: boolean
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canCreateProject: true,
    canDeleteProject: true,
    canManageTeam: true,
    canManageSettings: true,
    canViewAuditTrail: true,
    canViewTimesheets: true,
    canEnterFieldData: true,
    canEditHabitats: true,
    canWriteReports: true,
  },
  assessor: {
    canCreateProject: true,
    canDeleteProject: false,
    canManageTeam: false,
    canManageSettings: false,
    canViewAuditTrail: false,
    canViewTimesheets: false,
    canEnterFieldData: true,
    canEditHabitats: true,
    canWriteReports: true,
  },
  client: {
    canCreateProject: false,
    canDeleteProject: false,
    canManageTeam: false,
    canManageSettings: false,
    canViewAuditTrail: false,
    canViewTimesheets: false,
    canEnterFieldData: false,
    canEditHabitats: false,
    canWriteReports: false,
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
    id: 'assessor',
    label: 'Assessor',
    description: 'Field work & data entry',
    color: 'text-blue-600',
    bgColor: 'bg-blue-600',
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
  canCreateProject: false,
  canDeleteProject: false,
  canManageTeam: false,
  canManageSettings: false,
  canViewAuditTrail: false,
  canViewTimesheets: false,
  canEnterFieldData: false,
  canEditHabitats: false,
  canWriteReports: false,
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

      // Get the user's profile with organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(
          `
          *,
          organization:organizations(*)
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
  const roleConfig = ROLE_CONFIGS.find((r) => r.id === user?.role) || ROLE_CONFIGS[1] // Default to assessor config

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
