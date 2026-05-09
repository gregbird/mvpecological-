'use client'

import * as React from 'react'
import { Loader2, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useBranding, useUpdateBranding } from '@/hooks/queries/use-branding'
import {
  DEFAULT_BRANDING,
  FONT_FAMILY_OPTIONS,
  LOGO_POSITION_OPTIONS,
  type Branding,
} from '@/lib/supabase/queries/branding'

const MAX_LOGO_BYTES = 250 * 1024 // 250 KB

interface BrandingTabProps {
  organizationId: string
}

export function BrandingTab({ organizationId }: BrandingTabProps) {
  const { toast } = useToast()
  const { data: branding, isLoading } = useBranding(organizationId)
  const updateMutation = useUpdateBranding(organizationId)

  // Local form state — initialised once branding loads, kept in sync via key
  const [draft, setDraft] = React.useState<Branding>(DEFAULT_BRANDING)
  const initialisedRef = React.useRef(false)

  React.useEffect(() => {
    if (branding && !initialisedRef.current) {
      setDraft(branding)
      initialisedRef.current = true
    }
  }, [branding])

  const handleLogoChange = async (file: File | null) => {
    if (!file) {
      setDraft((d) => ({ ...d, logoDataUrl: null }))
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({
        variant: 'destructive',
        title: 'Logo too large',
        description: `Logo must be under ${Math.round(MAX_LOGO_BYTES / 1024)} KB. Compress or use SVG.`,
      })
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setDraft((d) => ({ ...d, logoDataUrl: dataUrl }))
  }

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(draft)
      toast({ title: 'Branding saved', description: 'Your report look & feel has been updated.' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error saving branding',
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  const handleResetDefaults = () => {
    setDraft(DEFAULT_BRANDING)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Report Branding</h2>
          <p className="text-muted-foreground text-sm">
            Customise the look and feel applied to PDF and DOCX exports for every project in this
            organisation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefaults}>
            Reset
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Branding
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logo</CardTitle>
            <CardDescription>Embedded on the cover page. PNG/JPG/SVG, max 250 KB.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 flex h-32 items-center justify-center rounded-lg border">
              {draft.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.logoDataUrl}
                  alt="Organization logo"
                  className="max-h-28 max-w-full object-contain"
                />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-1 text-xs">
                  <ImageIcon className="h-8 w-8 opacity-40" />
                  No logo uploaded
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Label
                htmlFor="logo-upload"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-3 text-sm font-medium"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {draft.logoDataUrl ? 'Replace' : 'Upload logo'}
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
              />
              {draft.logoDataUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => handleLogoChange(null)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Colours + font */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Colours &amp; Typography</CardTitle>
            <CardDescription>Applied to headings, accents, and body text.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField
                label="Primary (headings)"
                value={draft.primaryColor}
                onChange={(value) => setDraft((d) => ({ ...d, primaryColor: value }))}
              />
              <ColorField
                label="Secondary (accents)"
                value={draft.secondaryColor}
                onChange={(value) => setDraft((d) => ({ ...d, secondaryColor: value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Body font</Label>
              <Select
                value={draft.fontFamily}
                onValueChange={(value) =>
                  setDraft((d) => ({ ...d, fontFamily: value as Branding['fontFamily'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Limited to fonts bundled with PDF/DOCX engines so reports render identically on any
                machine.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cover page */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cover Page</CardTitle>
            <CardDescription>How the title page appears on every export.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Show logo on cover</p>
                <p className="text-muted-foreground text-xs">Disable for unbranded exports.</p>
              </div>
              <Switch
                checked={draft.coverPage.showLogo}
                onCheckedChange={(checked) =>
                  setDraft((d) => ({
                    ...d,
                    coverPage: { ...d.coverPage, showLogo: checked },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Logo position</Label>
              <Select
                value={draft.coverPage.logoPosition}
                onValueChange={(value) =>
                  setDraft((d) => ({
                    ...d,
                    coverPage: {
                      ...d.coverPage,
                      logoPosition: value as Branding['coverPage']['logoPosition'],
                    },
                  }))
                }
                disabled={!draft.coverPage.showLogo}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOGO_POSITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover-subtitle">Cover subtitle</Label>
              <Input
                id="cover-subtitle"
                value={draft.coverPage.subtitle}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    coverPage: { ...d.coverPage, subtitle: e.target.value },
                  }))
                }
                placeholder="e.g. Ecological Consultancy Services"
              />
            </div>
          </CardContent>
        </Card>

        {/* Header / Footer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Page Header &amp; Footer</CardTitle>
            <CardDescription>Repeating text on every page of the document.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Header</p>
                <Switch
                  checked={draft.header.enabled}
                  onCheckedChange={(checked) =>
                    setDraft((d) => ({
                      ...d,
                      header: { ...d.header, enabled: checked },
                    }))
                  }
                />
              </div>
              <Textarea
                rows={2}
                value={draft.header.text}
                disabled={!draft.header.enabled}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, header: { ...d.header, text: e.target.value } }))
                }
                placeholder="e.g. {{project_name}} — Preliminary Ecological Appraisal"
              />
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Footer</p>
                <Switch
                  checked={draft.footer.enabled}
                  onCheckedChange={(checked) =>
                    setDraft((d) => ({
                      ...d,
                      footer: { ...d.footer, enabled: checked },
                    }))
                  }
                />
              </div>
              <Textarea
                rows={2}
                value={draft.footer.text}
                disabled={!draft.footer.enabled}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, footer: { ...d.footer, text: e.target.value } }))
                }
                placeholder="e.g. Confidential — © Acme Ecology Ltd"
              />
              <div className="flex items-center justify-between pt-1">
                <p className="text-muted-foreground text-xs">Show page numbers in footer</p>
                <Switch
                  checked={draft.footer.showPageNumbers}
                  onCheckedChange={(checked) =>
                    setDraft((d) => ({
                      ...d,
                      footer: { ...d.footer, showPageNumbers: checked },
                    }))
                  }
                  disabled={!draft.footer.enabled}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              <strong>{'{{project_name}}'}</strong> and <strong>{'{{site_code}}'}</strong>{' '}
              placeholders are replaced at export time.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded border bg-transparent p-0.5"
          aria-label={`${label} colour picker`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-xs uppercase"
        />
      </div>
    </div>
  )
}
