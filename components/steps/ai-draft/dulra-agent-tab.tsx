'use client'

import * as React from 'react'
import { Send, Loader2, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ChatMessage } from './chat-message'

interface ChatMessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface DulraAgentTabProps {
  projectId: string
  onInsertIntoDraft?: (content: string) => void
}

const SUGGESTED_QUESTIONS = [
  'What designated sites are within 2km of this project?',
  'Summarise the habitat types found on site',
  'What protected species were recorded?',
  'What are the key ecological constraints?',
]

export function DulraAgentTab({ projectId, onInsertIntoDraft }: DulraAgentTabProps) {
  const { toast } = useToast()
  const [messages, setMessages] = React.useState<ChatMessageData[]>([])
  const [inputValue, setInputValue] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessageData = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const chatHistory = messages.map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/ai/dulra-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: text.trim(),
          chatHistory,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()

      const agentMsg: ChatMessageData = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, agentMsg])
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Agent error',
        description: error instanceof Error ? error.message : 'Failed to get response from agent.',
      })
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6">
            <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
              <Bot className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Dulra Agent</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Ask questions about your project&apos;s ecological data
              </p>
            </div>
            <div className="grid max-w-lg grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <Card
                  key={q}
                  className="hover:bg-accent cursor-pointer p-3 text-sm transition-colors"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                onInsertIntoDraft={msg.role === 'assistant' ? onInsertIntoDraft : undefined}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted flex items-center gap-1 rounded-lg px-3 py-2">
                  <span className="bg-foreground/40 h-2 w-2 animate-bounce rounded-full [animation-delay:0ms]" />
                  <span className="bg-foreground/40 h-2 w-2 animate-bounce rounded-full [animation-delay:150ms]" />
                  <span className="bg-foreground/40 h-2 w-2 animate-bounce rounded-full [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Ask about your project data..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="min-h-[40px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
