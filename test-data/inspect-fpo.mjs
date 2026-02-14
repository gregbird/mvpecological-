/* eslint-env node */
/**
 * Inspect FPO Shapefile contents
 * Run: node test-data/inspect-fpo.mjs
 */

import shp from 'shpjs'
import fs from 'fs'

const filePath =
  '/Users/abdurrahimbalta/non-cloud/Upwork/mvpecological-/FPO 2022 records v 1.0 2023.shp'

async function inspectShapefile() {
  try {
    console.log('Reading shapefile...\n')

    const buffer = fs.readFileSync(filePath)
    const geojson = await shp(buffer)

    // Handle array or single FeatureCollection
    const fc = Array.isArray(geojson) ? geojson[0] : geojson

    console.log('=== FPO SHAPEFILE CONTENTS ===\n')
    console.log(`Total features: ${fc.features?.length || 0}`)

    if (fc.features && fc.features.length > 0) {
      // Show first feature's properties (column names)
      const firstFeature = fc.features[0]
      console.log('\n--- COLUMNS (Attribute Fields) ---')
      console.log(Object.keys(firstFeature.properties || {}))

      // Show first 5 records
      console.log('\n--- FIRST 5 RECORDS ---')
      fc.features.slice(0, 5).forEach((f, i) => {
        console.log(`\nRecord ${i + 1}:`)
        console.log(JSON.stringify(f.properties, null, 2))
        console.log(`Geometry type: ${f.geometry?.type}`)
        if (f.geometry?.coordinates) {
          const coords = f.geometry.coordinates
          console.log(`Coordinates: ${JSON.stringify(coords).slice(0, 100)}...`)
        }
      })

      // Show unique species if available
      const speciesField = Object.keys(firstFeature.properties || {}).find(
        (k) =>
          k.toLowerCase().includes('species') ||
          k.toLowerCase().includes('name') ||
          k.toLowerCase() === 'taxon'
      )

      if (speciesField) {
        const uniqueSpecies = [...new Set(fc.features.map((f) => f.properties[speciesField]))]
        console.log(`\n--- UNIQUE SPECIES (${uniqueSpecies.length} total) ---`)
        console.log(uniqueSpecies.slice(0, 20))
        if (uniqueSpecies.length > 20) {
          console.log(`... and ${uniqueSpecies.length - 20} more`)
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message)

    // If shpjs fails, try to read raw binary header
    console.log('\n--- Attempting raw file inspection ---')
    const buffer = fs.readFileSync(filePath)
    console.log(`File size: ${buffer.length} bytes`)
    console.log(`First 100 bytes (hex): ${buffer.slice(0, 100).toString('hex')}`)
  }
}

inspectShapefile()
