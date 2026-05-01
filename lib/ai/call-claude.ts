import { createClient } from '@/lib/supabase/server'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CallClaudeOptions {
  model: string
  messages: ClaudeMessage[]
  system?: string
  maxTokens?: number
  temperature?: number
}

interface ClaudeResponse {
  content: Array<{ type: 'text'; text: string }>
  usage: { input_tokens: number; output_tokens: number }
}

export async function callClaude(opts: CallClaudeOptions): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.functions.invoke<ClaudeResponse>('claude-proxy', {
    body: {
      model: opts.model,
      messages: opts.messages,
      system: opts.system,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 1,
    },
  })

  if (error) throw new Error(`Claude proxy failed: ${error.message}`)
  if (!data?.content?.[0]?.text) throw new Error('Empty response from Claude')

  return data.content[0].text
}
