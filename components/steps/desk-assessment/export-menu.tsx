'use client'

import { Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExportMenuProps {
  isExporting: boolean
  onExport: (format: 'html' | 'pdf' | 'docx') => void
}

export function ExportMenu({ isExporting, onExport }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport('html')}>Export as HTML</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('pdf')}>Export as PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('docx')}>Export as Word</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
