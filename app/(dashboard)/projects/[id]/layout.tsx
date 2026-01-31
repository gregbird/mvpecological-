'use client'

import { ProjectProvider } from '@/contexts/project-context'
import { ProjectWorkflowSidebar } from '@/components/project/project-workflow-sidebar'

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <div className="flex h-full">
        {/* Project Workflow Sidebar */}
        <ProjectWorkflowSidebar />

        {/* Main Content Area */}
        <main className="bg-background flex-1 overflow-auto">{children}</main>
      </div>
    </ProjectProvider>
  )
}
