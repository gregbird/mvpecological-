'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useRole } from '@/contexts/role-context'
import { createClient } from '@/lib/supabase/client'

const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  siteCode: z.string().optional(),
  surveyType: z.string().min(1, 'Please select a survey type'),
  clientId: z.string().optional(),
  expectedStartDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  budgetDays: z.string().optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

// Mock clients data
const mockClients = [
  { id: 'c1', name: 'Energia Renewables' },
  { id: 'c2', name: 'Dublin Port Company' },
  { id: 'c3', name: 'SSE Renewables' },
  { id: 'c4', name: 'Cork County Council' },
  { id: 'c5', name: 'Kerry County Council' },
]

import { SURVEY_TYPES as SURVEY_TYPE_DEFS } from '@/lib/config/template-types'

const surveyTypes = SURVEY_TYPE_DEFS.map((s) => ({ value: s.id, label: s.label }))

export default function NewProjectPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useRole()
  const [isLoading, setIsLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  })

  const onSubmit = async (data: ProjectFormData) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Please log in to create a project.',
      })
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()

      // Generate site code if not provided
      const siteCode = data.siteCode || generateSiteCode(data.name)

      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: data.name,
          site_code: siteCode,
          survey_type: data.surveyType,
          expected_start_date: data.expectedStartDate || null,
          expected_end_date: data.expectedEndDate || null,
          budget_days: data.budgetDays ? parseInt(data.budgetDays) : null,
          organization_id: user.organization_id,
          created_by: user.id,
          status: 'active',
        })
        .select()
        .single()

      if (projectError) {
        console.error('Project insert error:', JSON.stringify(projectError, null, 2))
        throw projectError
      }

      // Workflow steps are automatically created by database trigger

      router.push(`/projects/${project.id}`)
    } catch (err: unknown) {
      const errorObj = err as { message?: string; code?: string; details?: string }
      console.error('Error creating project:', JSON.stringify(err, null, 2))
      toast({
        variant: 'destructive',
        title: 'Failed to create project',
        description: errorObj?.message || errorObj?.details || 'Please try again later.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Generate site code based on project name
  const generateSiteCode = (name: string) => {
    const initials = name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3)
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    return `${initials}-${year}-${random}`
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Project</h1>
          <p className="text-muted-foreground">Create a new ecological project</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Basic information about the project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Ballymore Wind Farm EcIA"
                  {...register('name')}
                  disabled={isLoading}
                  onBlur={(e) => {
                    if (
                      e.target.value &&
                      !document.getElementById('siteCode')?.getAttribute('value')
                    ) {
                      setValue('siteCode', generateSiteCode(e.target.value))
                    }
                  }}
                />
                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteCode">Site Code</Label>
                <Input
                  id="siteCode"
                  placeholder="Auto-generated or custom"
                  {...register('siteCode')}
                  disabled={isLoading}
                />
                <p className="text-muted-foreground text-xs">Leave blank to auto-generate</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="surveyType">Survey Type *</Label>
                <Select
                  onValueChange={(value) => setValue('surveyType', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select survey type" />
                  </SelectTrigger>
                  <SelectContent>
                    {surveyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.surveyType && (
                  <p className="text-destructive text-sm">{errors.surveyType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">Client</Label>
                <Select onValueChange={(value) => setValue('clientId', value)} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Budget */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Budget</CardTitle>
              <CardDescription>Timeline and resource allocation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="expectedStartDate">Expected Start Date</Label>
                  <Input
                    id="expectedStartDate"
                    type="date"
                    {...register('expectedStartDate')}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedEndDate">Expected End Date</Label>
                  <Input
                    id="expectedEndDate"
                    type="date"
                    {...register('expectedEndDate')}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetDays">Budget (Days)</Label>
                <Input
                  id="budgetDays"
                  type="number"
                  placeholder="e.g., 20"
                  {...register('budgetDays')}
                  disabled={isLoading}
                />
                <p className="text-muted-foreground text-xs">
                  Estimated total person-days for the project
                </p>
              </div>

              {/* Info box */}
              <div className="bg-muted/50 mt-6 rounded-lg border p-4">
                <h4 className="mb-2 font-medium">What happens next?</h4>
                <ul className="text-muted-foreground space-y-1 text-sm">
                  <li>• 16 workflow steps will be created automatically</li>
                  <li>• You&apos;ll be assigned as the project lead</li>
                  <li>• You can define the site boundary in the map view</li>
                  <li>• Desk research can begin immediately</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button variant="outline" asChild disabled={isLoading}>
            <Link href="/projects">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </div>
      </form>
    </div>
  )
}
