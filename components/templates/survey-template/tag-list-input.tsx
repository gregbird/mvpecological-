'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface TagListInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagListInput({ value, onChange, placeholder }: TagListInputProps) {
  const [input, setInput] = React.useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      const newTag = input.trim()
      if (!value.includes(newTag)) {
        onChange([...value, newTag])
      }
      setInput('')
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleRemove = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 text-xs">
            {tag}
            <button type="button" onClick={() => handleRemove(tag)} className="hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Type and press Enter to add...'}
        className="h-8 text-sm"
      />
    </div>
  )
}
