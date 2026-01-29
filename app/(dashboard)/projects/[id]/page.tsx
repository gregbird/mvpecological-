'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Clock, Calendar, MapPin, Users, MoreVertical } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Mock project data
const mockProject = {
  id: '1',
  code: 'BWF-2024-001',
  name: 'Ecological Impact Assessment',
  client: 'Energia Renewables',
  status: 'active',
  currentPhase: 'desk research',
  progress: 35,
  startDate: '15 Jan 2024',
  dueDate: '30 Apr 2024',
  gridReference: 'N 23456 12345',
  budget: '25 days',
  team: [
    { id: '1', name: 'Eoin Murphy', role: 'Lead', initials: 'EM' },
    { id: '2', name: "Sarah O'Brien", role: 'Surveyor', initials: 'SO' },
    { id: '3', name: 'Michael Walsh', role: 'Analyst', initials: 'MW' },
  ],
  workflow: {
    deskResearch: { completed: 3, total: 5, percentage: 60 },
    fieldResearch: { completed: 0, total: 6, percentage: 0 },
    reporting: { completed: 0, total: 5, percentage: 0 },
  },
}

export default function ProjectDetailPage() {
  const params = useParams()

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Project Header */}
      <div className="bg-[#0f172a] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-gray-400">{mockProject.code}</span>
            <span className="text-gray-500">•</span>
            <span>{mockProject.name}</span>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500 text-emerald-400">
              {mockProject.currentPhase}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit Project</DropdownMenuItem>
                <DropdownMenuItem>Export Data</DropdownMenuItem>
                <DropdownMenuItem className="text-red-500">Archive Project</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-white/5 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Clock className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Progress</p>
              <div className="flex items-center gap-2">
                <Progress value={mockProject.progress} className="w-16 h-1.5" />
                <span className="text-sm font-semibold">{mockProject.progress}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Due Date</p>
              <p className="text-sm font-semibold">{mockProject.dueDate}</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <MapPin className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Grid Reference</p>
              <p className="text-sm font-semibold">{mockProject.gridReference}</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Team Members</p>
              <p className="text-sm font-semibold">{mockProject.team.length} members</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white dark:bg-gray-800 border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="desk-research">Desk Research</TabsTrigger>
            <TabsTrigger value="field-surveys">Field Surveys</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Project Information */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Client</p>
                      <p className="font-medium">{mockProject.client}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Active
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{mockProject.startDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p className="font-medium">{mockProject.budget}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team */}
              <Card>
                <CardHeader>
                  <CardTitle>Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockProject.team.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-2">
                    Manage Team
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Workflow Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Desk Research */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        desk research
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {mockProject.workflow.deskResearch.completed}/{mockProject.workflow.deskResearch.total} steps completed
                      </span>
                    </div>
                    <span className="text-sm font-medium">{mockProject.workflow.deskResearch.percentage}%</span>
                  </div>
                  <Progress value={mockProject.workflow.deskResearch.percentage} className="h-2" />
                </div>

                {/* Field Research */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        field research
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {mockProject.workflow.fieldResearch.completed}/{mockProject.workflow.fieldResearch.total} steps completed
                      </span>
                    </div>
                    <span className="text-sm font-medium">{mockProject.workflow.fieldResearch.percentage}%</span>
                  </div>
                  <Progress value={mockProject.workflow.fieldResearch.percentage} className="h-2" />
                </div>

                {/* Reporting */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        reporting
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {mockProject.workflow.reporting.completed}/{mockProject.workflow.reporting.total} steps completed
                      </span>
                    </div>
                    <span className="text-sm font-medium">{mockProject.workflow.reporting.percentage}%</span>
                  </div>
                  <Progress value={mockProject.workflow.reporting.percentage} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Workflow management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="desk-research">
            <Card>
              <CardHeader>
                <CardTitle>Desk Research</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Desk research data gathering coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="field-surveys">
            <Card>
              <CardHeader>
                <CardTitle>Field Surveys</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Field survey management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle>Project Map</CardTitle>
              </CardHeader>
              <CardContent className="h-96">
                <p className="text-muted-foreground">Map view coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Report generation coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
