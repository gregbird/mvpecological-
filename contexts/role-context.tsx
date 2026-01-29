'use client'

import * as React from 'react'
import Cookies from 'js-cookie'

export type UserRole = 'admin' | 'senior_ecologist' | 'field_ecologist' | 'gis_specialist' | 'junior_ecologist' | 'client'

interface RolePermissions {
  canCreateProject: boolean
  canEditProject: boolean
  canDeleteProject: boolean
  canApproveWorkflow: boolean
  canAssignTeam: boolean
  canViewAllProjects: boolean
  canExportData: boolean
  canManageTeam: boolean
  canManageSettings: boolean
  canAddObservations: boolean
  canEditObservations: boolean
  canViewReports: boolean
  canEditReports: boolean
  canApproveReports: boolean
  isReadOnly: boolean
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: true,
    canApproveWorkflow: true,
    canAssignTeam: true,
    canViewAllProjects: true,
    canExportData: true,
    canManageTeam: true,
    canManageSettings: true,
    canAddObservations: true,
    canEditObservations: true,
    canViewReports: true,
    canEditReports: true,
    canApproveReports: true,
    isReadOnly: false,
  },
  senior_ecologist: {
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: false,
    canApproveWorkflow: true,
    canAssignTeam: true,
    canViewAllProjects: true,
    canExportData: true,
    canManageTeam: true,
    canManageSettings: false,
    canAddObservations: true,
    canEditObservations: true,
    canViewReports: true,
    canEditReports: true,
    canApproveReports: true,
    isReadOnly: false,
  },
  field_ecologist: {
    canCreateProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canApproveWorkflow: false,
    canAssignTeam: false,
    canViewAllProjects: false,
    canExportData: false,
    canManageTeam: false,
    canManageSettings: false,
    canAddObservations: true,
    canEditObservations: true,
    canViewReports: true,
    canEditReports: false,
    canApproveReports: false,
    isReadOnly: false,
  },
  gis_specialist: {
    canCreateProject: false,
    canEditProject: true,
    canDeleteProject: false,
    canApproveWorkflow: false,
    canAssignTeam: false,
    canViewAllProjects: false,
    canExportData: true,
    canManageTeam: false,
    canManageSettings: false,
    canAddObservations: true,
    canEditObservations: true,
    canViewReports: true,
    canEditReports: true,
    canApproveReports: false,
    isReadOnly: false,
  },
  junior_ecologist: {
    canCreateProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canApproveWorkflow: false,
    canAssignTeam: false,
    canViewAllProjects: false,
    canExportData: false,
    canManageTeam: false,
    canManageSettings: false,
    canAddObservations: true,
    canEditObservations: false,
    canViewReports: true,
    canEditReports: false,
    canApproveReports: false,
    isReadOnly: false,
  },
  client: {
    canCreateProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canApproveWorkflow: false,
    canAssignTeam: false,
    canViewAllProjects: false,
    canExportData: false,
    canManageTeam: false,
    canManageSettings: false,
    canAddObservations: false,
    canEditObservations: false,
    canViewReports: true,
    canEditReports: false,
    canApproveReports: false,
    isReadOnly: true,
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
    color: 'text-red-500',
    bgColor: 'bg-red-500',
  },
  {
    id: 'senior_ecologist',
    label: 'Senior Ecologist',
    description: 'Project lead, can approve',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
  },
  {
    id: 'field_ecologist',
    label: 'Field Ecologist',
    description: 'Field surveys, data entry',
    color: 'text-green-500',
    bgColor: 'bg-green-500',
  },
  {
    id: 'gis_specialist',
    label: 'GIS Specialist',
    description: 'Maps and spatial data',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
  },
  {
    id: 'junior_ecologist',
    label: 'Junior Ecologist',
    description: 'Limited access, learning',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
  },
  {
    id: 'client',
    label: 'Client',
    description: 'Read-only project view',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500',
  },
]

interface MockUser {
  name: string
  email: string
  role: UserRole
}

export const MOCK_USERS: Record<UserRole, MockUser> = {
  admin: { name: 'System Admin', email: 'admin@dulra.ie', role: 'admin' },
  senior_ecologist: { name: "Dr. Sarah O'Brien", email: 'sarah@ecology.ie', role: 'senior_ecologist' },
  field_ecologist: { name: 'Michael Murphy', email: 'michael@ecology.ie', role: 'field_ecologist' },
  gis_specialist: { name: 'Emma Kelly', email: 'emma@ecology.ie', role: 'gis_specialist' },
  junior_ecologist: { name: 'Cian Byrne', email: 'cian@ecology.ie', role: 'junior_ecologist' },
  client: { name: 'John Client', email: 'john@clientcorp.ie', role: 'client' },
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
  const [currentRole, setCurrentRoleState] = React.useState<UserRole>('senior_ecologist')

  // Read role from cookie on mount
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
