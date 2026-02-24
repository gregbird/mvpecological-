'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

import { SURVEY_TYPES as SURVEY_TYPE_DEFS } from '@/lib/config/template-types'

const SURVEY_TYPES = SURVEY_TYPE_DEFS.map((s) => ({ value: s.id, label: s.label }))

const quickCreateSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  surveyType: z.string().min(1, 'Please select a survey type'),
  location: z.string().optional(),
})

type QuickCreateFormData = z.infer<typeof quickCreateSchema>

interface QuickCreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  userId: string
}

export function QuickCreateProjectModal({
  open,
  onOpenChange,
  organizationId,
  userId,
}: QuickCreateProjectModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<QuickCreateFormData>({
    resolver: zodResolver(quickCreateSchema),
    defaultValues: {
      name: '',
      surveyType: '',
      location: '',
    },
  })

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

  const onSubmit = async (data: QuickCreateFormData) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const siteCode = generateSiteCode(data.name)

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name: data.name,
          site_code: siteCode,
          survey_type: data.surveyType,
          county: data.location || null,
          organization_id: organizationId,
          created_by: userId,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      onOpenChange(false)
      form.reset()
      router.push(`/projects/${project.id}`)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Failed to create project',
        description: errorObj?.message || 'Please try again later.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-xl font-bold">Quick Create Project</DialogTitle>
        <DialogDescription className="text-sm text-gray-500">
          Create a new project with minimal details. You can fill in the rest later.
        </DialogDescription>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Ballymore Wind Farm PEA"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="surveyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Survey Type *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select survey type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SURVEY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Co. Kerry" disabled={isLoading} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
