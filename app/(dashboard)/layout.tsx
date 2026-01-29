'use client'

import * as React from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { RoleProvider } from '@/contexts/role-context'

function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <DashboardContent>{children}</DashboardContent>
    </RoleProvider>
  )
}
