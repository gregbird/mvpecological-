'use client'

import * as React from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

// Mock user - will be replaced with actual auth
const mockUser = {
  name: 'Eoin Murphy',
  email: 'eoin@ecology.ie',
  role: 'senior_ecologist',
  avatar: undefined,
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={mockUser} />
        <main className="bg-muted/30 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
