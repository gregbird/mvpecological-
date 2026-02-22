'use client'

import { Bot, User, ClipboardCopy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  onInsertIntoDraft?: (content: string) => void
}

export function ChatMessage({ role, content, onInsertIntoDraft }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn('flex max-w-[80%] flex-col gap-1', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted prose prose-sm dark:prose-invert max-w-none'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
            />
          )}
        </div>
        {!isUser && onInsertIntoDraft && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7 text-xs"
            onClick={() => onInsertIntoDraft(content)}
          >
            <ClipboardCopy className="mr-1 h-3 w-3" />
            Insert into Draft
          </Button>
        )}
      </div>
    </div>
  )
}

/** Simple markdown-to-HTML for bold, bullet points, and line breaks */
function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc pl-4 my-1">$&</ul>')
    .replace(/\n/g, '<br />')
}
