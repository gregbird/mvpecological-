'use client'

import { jsPDF } from 'jspdf'
import type { SpeciesRecommendation } from '@/lib/data/habitat-species-mapping'

export interface FieldChecklistData {
  projectName: string
  projectCode: string
  siteName?: string
  gridReference?: string
  surveyDate?: string
  ecologist?: string
  species: SpeciesRecommendation[]
  habitatCodes: string[]
  notes?: string
}

interface GroupedSpecies {
  surveyType: string
  species: SpeciesRecommendation[]
}

export function generateFieldChecklistPDF(data: FieldChecklistData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let yPos = margin

  // Helper functions
  const addText = (
    text: string,
    x: number,
    y: number,
    options?: { fontSize?: number; fontStyle?: 'normal' | 'bold' | 'italic'; color?: string }
  ) => {
    doc.setFontSize(options?.fontSize || 10)
    doc.setFont('helvetica', options?.fontStyle || 'normal')
    if (options?.color) {
      const hex = options.color.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      doc.setTextColor(r, g, b)
    } else {
      doc.setTextColor(0, 0, 0)
    }
    doc.text(text, x, y)
  }

  const checkNewPage = (requiredHeight: number): boolean => {
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage()
      yPos = margin
      return true
    }
    return false
  }

  const drawCheckbox = (x: number, y: number, size: number = 4) => {
    doc.setDrawColor(100, 100, 100)
    doc.setLineWidth(0.3)
    doc.rect(x, y - size + 1, size, size)
  }

  // Header Section
  doc.setFillColor(88, 28, 135) // Purple-800
  doc.rect(0, 0, pageWidth, 35, 'F')

  addText('FIELD SURVEY CHECKLIST', margin, 15, {
    fontSize: 18,
    fontStyle: 'bold',
    color: '#ffffff',
  })
  addText('Target Species & Survey Protocols', margin, 23, {
    fontSize: 11,
    color: '#e9d5ff',
  })
  addText(`Generated: ${new Date().toLocaleDateString('en-IE')}`, pageWidth - margin - 35, 15, {
    fontSize: 8,
    color: '#c4b5fd',
  })

  yPos = 45

  // Project Info Box
  doc.setFillColor(250, 245, 255) // Purple-50
  doc.setDrawColor(216, 180, 254) // Purple-300
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, 'FD')

  addText('PROJECT INFORMATION', margin + 3, yPos + 6, {
    fontSize: 9,
    fontStyle: 'bold',
    color: '#581c87',
  })

  const infoStartY = yPos + 12
  const col1X = margin + 3
  const col2X = margin + contentWidth / 2

  addText(`Project: ${data.projectName}`, col1X, infoStartY, { fontSize: 9 })
  addText(`Code: ${data.projectCode}`, col2X, infoStartY, { fontSize: 9 })
  addText(`Site: ${data.siteName || 'Not specified'}`, col1X, infoStartY + 6, { fontSize: 9 })
  addText(`Grid Ref: ${data.gridReference || 'Not specified'}`, col2X, infoStartY + 6, {
    fontSize: 9,
  })
  addText(`Survey Date: ${data.surveyDate || '_______________'}`, col1X, infoStartY + 12, {
    fontSize: 9,
  })
  addText(`Ecologist: ${data.ecologist || '_______________'}`, col2X, infoStartY + 12, {
    fontSize: 9,
  })

  yPos += 35

  // Habitat Codes Section
  if (data.habitatCodes.length > 0) {
    doc.setFillColor(240, 253, 244) // Green-50
    doc.setDrawColor(134, 239, 172) // Green-300
    doc.roundedRect(margin, yPos, contentWidth, 14, 2, 2, 'FD')

    addText('TARGET HABITATS (FOSSITT):', margin + 3, yPos + 6, {
      fontSize: 9,
      fontStyle: 'bold',
      color: '#166534',
    })
    addText(data.habitatCodes.join(', '), margin + 55, yPos + 6, { fontSize: 9 })

    yPos += 20
  }

  // Group species by survey type
  const groupedSpecies: GroupedSpecies[] = []
  const surveyTypeMap = new Map<string, SpeciesRecommendation[]>()

  for (const species of data.species) {
    const existing = surveyTypeMap.get(species.surveyType)
    if (existing) {
      existing.push(species)
    } else {
      surveyTypeMap.set(species.surveyType, [species])
    }
  }

  surveyTypeMap.forEach((species, surveyType) => {
    groupedSpecies.push({ surveyType, species })
  })

  // Sort by survey type
  groupedSpecies.sort((a, b) => a.surveyType.localeCompare(b.surveyType))

  // Species Checklist Sections
  for (const group of groupedSpecies) {
    checkNewPage(30)

    // Survey Type Header
    doc.setFillColor(239, 246, 255) // Blue-50
    doc.setDrawColor(147, 197, 253) // Blue-300
    doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'FD')
    addText(group.surveyType.toUpperCase(), margin + 3, yPos + 7, {
      fontSize: 10,
      fontStyle: 'bold',
      color: '#1e40af',
    })
    addText(`(${group.species.length} species)`, margin + 70, yPos + 7, {
      fontSize: 9,
      color: '#3b82f6',
    })

    yPos += 14

    // Table Header
    const colWidths = {
      checkbox: 8,
      species: 55,
      scientific: 45,
      months: 35,
      status: contentWidth - 143,
    }

    let xPos = margin
    doc.setFillColor(243, 244, 246) // Gray-100
    doc.rect(margin, yPos, contentWidth, 7, 'F')

    xPos = margin + 2
    addText('', xPos, yPos + 5, { fontSize: 8, fontStyle: 'bold' })
    xPos += colWidths.checkbox
    addText('Species', xPos, yPos + 5, { fontSize: 8, fontStyle: 'bold' })
    xPos += colWidths.species
    addText('Scientific Name', xPos, yPos + 5, { fontSize: 8, fontStyle: 'bold' })
    xPos += colWidths.scientific
    addText('Optimal Months', xPos, yPos + 5, { fontSize: 8, fontStyle: 'bold' })
    xPos += colWidths.months
    addText('Protection', xPos, yPos + 5, { fontSize: 8, fontStyle: 'bold' })

    yPos += 9

    // Species Rows
    for (const species of group.species) {
      checkNewPage(12)

      // Alternating row background
      if (group.species.indexOf(species) % 2 === 0) {
        doc.setFillColor(249, 250, 251) // Gray-50
        doc.rect(margin, yPos - 2, contentWidth, 8, 'F')
      }

      xPos = margin + 2

      // Checkbox
      drawCheckbox(xPos + 1, yPos + 2)
      xPos += colWidths.checkbox

      // Species name
      const speciesName =
        species.species.length > 25 ? species.species.substring(0, 22) + '...' : species.species
      addText(speciesName, xPos, yPos + 4, { fontSize: 8 })
      xPos += colWidths.species

      // Scientific name
      const sciName =
        species.scientificName.length > 22
          ? species.scientificName.substring(0, 19) + '...'
          : species.scientificName
      addText(sciName, xPos, yPos + 4, { fontSize: 8, fontStyle: 'italic' })
      xPos += colWidths.scientific

      // Optimal months
      const months = species.optimalMonths.slice(0, 4).join(', ')
      addText(months, xPos, yPos + 4, { fontSize: 8 })
      xPos += colWidths.months

      // Protection status
      const protStatus = species.protectionStatus[0] || '-'
      const shortStatus = protStatus.length > 20 ? protStatus.substring(0, 17) + '...' : protStatus
      addText(shortStatus, xPos, yPos + 4, { fontSize: 7, color: '#dc2626' })

      yPos += 8
    }

    yPos += 8
  }

  // Field Notes Section
  checkNewPage(50)
  yPos += 5

  doc.setFillColor(254, 249, 195) // Yellow-100
  doc.setDrawColor(253, 224, 71) // Yellow-300
  doc.roundedRect(margin, yPos, contentWidth, 40, 2, 2, 'FD')

  addText('FIELD NOTES', margin + 3, yPos + 7, {
    fontSize: 10,
    fontStyle: 'bold',
    color: '#854d0e',
  })

  // Lines for notes
  for (let i = 0; i < 4; i++) {
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.line(margin + 3, yPos + 14 + i * 7, margin + contentWidth - 3, yPos + 14 + i * 7)
  }

  yPos += 48

  // Weather & Conditions Section
  checkNewPage(30)

  doc.setFillColor(240, 249, 255) // Cyan-50
  doc.setDrawColor(103, 232, 249) // Cyan-300
  doc.roundedRect(margin, yPos, contentWidth, 24, 2, 2, 'FD')

  addText('SURVEY CONDITIONS', margin + 3, yPos + 7, {
    fontSize: 10,
    fontStyle: 'bold',
    color: '#0e7490',
  })

  const conditionsY = yPos + 14
  addText('Weather: ________________', margin + 3, conditionsY, { fontSize: 9 })
  addText('Temp: ______°C', margin + 60, conditionsY, { fontSize: 9 })
  addText('Wind: ______', margin + 100, conditionsY, { fontSize: 9 })
  addText('Cloud: ______%', margin + 135, conditionsY, { fontSize: 9 })

  addText('Start Time: ________', margin + 3, conditionsY + 7, { fontSize: 9 })
  addText('End Time: ________', margin + 50, conditionsY + 7, { fontSize: 9 })
  addText('Effort (hrs): ________', margin + 100, conditionsY + 7, { fontSize: 9 })

  // Footer
  yPos = pageHeight - 15
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5)

  addText('Dulra Ecological Project Management Platform', margin, yPos, {
    fontSize: 7,
    color: '#6b7280',
  })
  addText(`Page 1 of ${doc.getNumberOfPages()}`, pageWidth - margin - 25, yPos, {
    fontSize: 7,
    color: '#6b7280',
  })

  // Save the PDF
  const fileName = `field-checklist-${data.projectCode}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
