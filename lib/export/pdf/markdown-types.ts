// Markdown block + inline types shared by the parser and the renderer.

export interface MdParagraph {
  type: 'paragraph'
  segments: TextSegment[]
}

export interface MdHeading {
  type: 'heading'
  level: number
  text: string
}

export interface MdBullet {
  type: 'bullet'
  segments: TextSegment[]
  indent: number
}

export interface MdTable {
  type: 'table'
  headers: string[]
  rows: string[][]
}

export interface MdImage {
  type: 'image'
  src: string
  alt: string
}

export type MdBlock = MdParagraph | MdHeading | MdBullet | MdTable | MdImage

export interface TextSegment {
  text: string
  bold: boolean
  italic: boolean
}

export interface StyledWord {
  text: string
  bold: boolean
  italic: boolean
  trailingSpace: boolean
}
