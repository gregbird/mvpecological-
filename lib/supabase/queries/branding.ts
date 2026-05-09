import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'

/**
 * Organization branding — stored as JSON inside `organizations.settings.branding`.
 * No new columns or tables needed; org admins can fully customise the visual
 * "look and feel" of generated reports without a migration.
 *
 * Logo is stored as a base64 data URL so it embeds directly in jsPDF/docx
 * without a separate storage round-trip. Cap is enforced at upload time
 * (~250KB) to keep the JSONB row payload reasonable.
 */

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const FONT_FAMILY_OPTIONS = [
  { value: 'helvetica', label: 'Helvetica (sans-serif)' },
  { value: 'times', label: 'Times (serif)' },
  { value: 'courier', label: 'Courier (monospace)' },
] as const

export const LOGO_POSITION_OPTIONS = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top centre' },
  { value: 'top-right', label: 'Top right' },
] as const

export const brandingSchema = z.object({
  logoDataUrl: z.string().nullable().optional(),
  primaryColor: z
    .string()
    .regex(HEX_COLOR_RE, 'Must be a hex colour like #10b981')
    .default('#10b981'),
  secondaryColor: z
    .string()
    .regex(HEX_COLOR_RE, 'Must be a hex colour like #1f2937')
    .default('#1f2937'),
  fontFamily: z.enum(['helvetica', 'times', 'courier']).default('helvetica'),
  coverPage: z
    .object({
      logoPosition: z.enum(['top-left', 'top-center', 'top-right']).default('top-center'),
      showLogo: z.boolean().default(true),
      subtitle: z.string().default(''),
    })
    .default({
      logoPosition: 'top-center',
      showLogo: true,
      subtitle: '',
    }),
  header: z
    .object({
      enabled: z.boolean().default(false),
      text: z.string().default(''),
    })
    .default({ enabled: false, text: '' }),
  footer: z
    .object({
      enabled: z.boolean().default(true),
      text: z.string().default('Confidential'),
      showPageNumbers: z.boolean().default(true),
    })
    .default({ enabled: true, text: 'Confidential', showPageNumbers: true }),
})

export type Branding = z.infer<typeof brandingSchema>

/** Default branding used when an organization has not configured anything. */
export const DEFAULT_BRANDING: Branding = brandingSchema.parse({})

const settingsSchema = z
  .object({
    branding: brandingSchema.optional(),
  })
  .passthrough()

export async function getBranding(organizationId: string): Promise<Branding> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .maybeSingle()

  if (error) throw error
  const parsed = settingsSchema.safeParse(data?.settings ?? {})
  if (!parsed.success) return DEFAULT_BRANDING
  // Re-parse via brandingSchema so missing nested defaults are filled in
  return brandingSchema.parse(parsed.data.branding ?? {})
}

export async function updateBranding(
  organizationId: string,
  branding: Branding
): Promise<Branding> {
  const supabase = createClient()
  // Read current settings so we don't clobber unrelated keys
  const { data: existing } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .maybeSingle()

  const currentSettings =
    existing?.settings && typeof existing.settings === 'object' && !Array.isArray(existing.settings)
      ? (existing.settings as Record<string, unknown>)
      : {}

  const merged = {
    ...currentSettings,
    branding: brandingSchema.parse(branding),
  }

  const { error } = await supabase
    .from('organizations')
    .update({ settings: merged as unknown as Json })
    .eq('id', organizationId)

  if (error) throw error
  return merged.branding
}
