import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { CLAUDE_CHEAP_MODEL } from '@/lib/ai/anthropic-models'
import { callClaude } from '@/lib/ai/call-claude'
import { toIrishEnglish } from '@/lib/ai/irish-english'

/**
 * AI Site Summary API
 * Fetches an NPWS designated site page and uses Claude to generate
 * a 2-3 line summary of key habitats and species.
 */
export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const { siteUrl, siteName, siteCode, siteType } = await request.json()

    if (!siteUrl || !siteName) {
      return NextResponse.json({ error: 'siteUrl and siteName are required' }, { status: 400 })
    }

    // Fetch the NPWS site page
    let pageText = ''
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(siteUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DulraBot/1.0; Ecological Assessment Tool)',
        },
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        const html = await response.text()
        // Extract text content from HTML - strip tags and clean up
        pageText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()

        // Limit text to avoid token limits (approx first 4000 chars)
        if (pageText.length > 4000) {
          pageText = pageText.substring(0, 4000)
        }
      }
    } catch {
      // If page fetch fails, we'll generate a summary from available info only
      console.warn(`Failed to fetch NPWS page: ${siteUrl}`)
    }

    // Build prompt
    const prompt = pageText
      ? `You are an ecological consultant reviewing an Irish designated site. Based on the following web page content from the NPWS (National Parks & Wildlife Service) for "${siteName}" (${siteType} - Site Code: ${siteCode}), provide a concise 2-3 sentence summary focusing on:
1. The key habitats present at this site
2. Any notable protected species associated with this site
3. Why this site is designated (its conservation importance)

Web page content:
${pageText}

Respond with ONLY the 2-3 sentence summary, no headings or bullet points.`
      : `You are an ecological consultant. For the Irish designated site "${siteName}" (${siteType} - Site Code: ${siteCode}), provide a concise 2-3 sentence summary based on your knowledge of Irish designated sites. Focus on the likely key habitats and species given the site type (${siteType}) and location. Note if you are uncertain about specific details.

Respond with ONLY the 2-3 sentence summary, no headings or bullet points.`

    const raw = await callClaude({
      model: CLAUDE_CHEAP_MODEL,
      system:
        'You are an expert Irish ecological consultant with deep knowledge of NPWS designated sites, EU Habitats Directive, and EU Birds Directive. Provide concise, factual summaries. Use Irish English spelling (colour, behaviour, analyse, organisation, metre, favour).',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2000,
    })

    const summary = toIrishEnglish(raw.trim())

    return NextResponse.json({
      summary,
      siteCode,
      hadPageContent: !!pageText,
    })
  } catch (error) {
    console.error('Site summary error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
