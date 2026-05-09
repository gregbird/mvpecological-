// Per-section/general review notes attached by reviewers during Step 7.
// Persisted into `reports.content.reviewNotes` JSONB so they round-trip with
// the report and survive version restores.

export interface ReviewNote {
  id: string
  text: string
  author: string
  createdAt: string
}

export type ReviewNotesMap = Record<string, ReviewNote[]>

export interface ReviewSignature {
  reviewerId: string
  reviewerName: string
  decision: 'approved' | 'rejected'
  signedAt: string
}
