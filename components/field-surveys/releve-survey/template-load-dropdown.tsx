'use client'

import { type UseFormReturn } from 'react-hook-form'
import { FileDown, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { useReleveTemplates, useDeleteReleveTemplate } from '@/hooks/queries/use-releve-hooks'
import type { ReleveFormValues, CustomFieldDefinition } from './types'

interface TemplateLoadDropdownProps {
  form: UseFormReturn<ReleveFormValues>
}

export function TemplateLoadDropdown({ form }: TemplateLoadDropdownProps) {
  const { data: templates, isLoading } = useReleveTemplates()
  const deleteTemplate = useDeleteReleveTemplate()
  const { toast } = useToast()

  const handleLoad = (definitions: CustomFieldDefinition[]) => {
    // Reset existing custom fields and values
    const values: Record<string, string | number | null> = {}
    definitions.forEach((d) => {
      values[d.id] = d.type === 'number' ? 0 : ''
    })

    form.setValue('custom_field_definitions', definitions)
    form.setValue('custom_field_values', values)
    toast({ title: 'Template loaded' })
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteTemplate.mutateAsync(id)
      toast({ title: 'Template deleted' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        Templates
      </Button>
    )
  }

  if (!templates || templates.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FileDown className="mr-1.5 h-3.5 w-3.5" />
          Load Template
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs">Saved Templates</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.map((t) => {
          const defs = (t.custom_fields ?? []) as CustomFieldDefinition[]
          return (
            <DropdownMenuItem
              key={t.id}
              className="flex items-center justify-between"
              onClick={() => handleLoad(defs)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.name}</p>
                {t.description && (
                  <p className="text-muted-foreground truncate text-xs">{t.description}</p>
                )}
                <Badge variant="secondary" className="mt-0.5 text-[10px]">
                  {defs.length} fields
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-2 h-6 w-6 shrink-0"
                onClick={(e) => handleDelete(t.id, e)}
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
