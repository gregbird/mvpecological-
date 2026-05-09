import {
  PEA_REPORT_SECTIONS,
  type ReportContent,
  type ReportSection,
} from '@/lib/supabase/queries/reports'

/**
 * Detect a legacy 11-section PEA report (`results_sites`, `evaluation`, …) and
 * fold it into the current 6-section structure. Run once on load so the editor
 * always sees the canonical shape; the merged content is then resaved on the
 * next autosave.
 */
export function isLegacyPeaContent(content: ReportContent): boolean {
  const ids = content.sections.map((s) => s.id)
  return ids.includes('results_sites') || ids.includes('evaluation')
}

export function migrateLegacyPeaContent(content: ReportContent): ReportSection[] {
  const findOld = (id: string) => content.sections.find((s) => s.id === id)
  const mergeContent = (...ids: string[]) =>
    ids
      .map((id) => findOld(id)?.content)
      .filter(Boolean)
      .join('\n\n')

  return PEA_REPORT_SECTIONS.map((tmpl) => {
    switch (tmpl.id) {
      case 'introduction':
      case 'methodology':
      case 'appendices': {
        const old = findOld(tmpl.id)
        return {
          id: tmpl.id,
          title: tmpl.title,
          content: old?.content || '',
          isEdited: old?.isEdited || false,
          aiGenerated: old?.aiGenerated || false,
          ecologistOpinion: old?.ecologistOpinion,
        }
      }
      case 'results':
        return {
          id: 'results',
          title: tmpl.title,
          content: mergeContent(
            'results_sites',
            'results_habitats',
            'results_flora',
            'results_invasive',
            'results_fauna'
          ),
          isEdited: true,
          aiGenerated: true,
        }
      case 'constraints': {
        const old = findOld('evaluation')
        return {
          id: 'constraints',
          title: tmpl.title,
          content: old?.content || '',
          isEdited: old?.isEdited || false,
          aiGenerated: old?.aiGenerated || false,
          ecologistOpinion: old?.ecologistOpinion,
        }
      }
      case 'discussion':
        return {
          id: 'discussion',
          title: tmpl.title,
          content: mergeContent('discussion', 'recommendations'),
          isEdited: true,
          aiGenerated: true,
        }
      default:
        return {
          id: tmpl.id,
          title: tmpl.title,
          content: '',
          isEdited: false,
          aiGenerated: false,
        }
    }
  })
}
