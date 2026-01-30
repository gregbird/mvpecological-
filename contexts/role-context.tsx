'use client'

import * as React from 'react'
import Cookies from 'js-cookie'

export type UserRole = 'admin' | 'assessor'

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
]

interface MockUser {
  name: string
  email: string
  role: UserRole
}

export const MOCK_USERS: Record<UserRole, MockUser> = {
  admin: { name: 'Apro', email: 'admin@dulra.ie', role: 'admin' },
  assessor: { name: 'Sarah Murphy', email: 'sarah@dulra.ie', role: 'assessor' },
}

interface RoleContextType {
  currentRole: UserRole
  setCurrentRole: (role: UserRole) => void
  permissions: RolePermissions
  user: MockUser
  roleConfig: RoleConfig
}

const RoleContext = React.createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRoleState] = React.useState<UserRole>('assessor')

  React.useEffect(() => {
    const savedRole = Cookies.get('dev_role') as UserRole | undefined
    if (savedRole && MOCK_USERS[savedRole]) {
      setCurrentRoleState(savedRole)
    }
  }, [])

  const setCurrentRole = (role: UserRole) => {
    Cookies.set('dev_role', role, { expires: 7 })
    setCurrentRoleState(role)
  }

  const permissions = ROLE_PERMISSIONS[currentRole]
  const user = MOCK_USERS[currentRole]
  const roleConfig = ROLE_CONFIGS.find((r) => r.id === currentRole) || ROLE_CONFIGS[1]

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, permissions, user, roleConfig }}>
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
