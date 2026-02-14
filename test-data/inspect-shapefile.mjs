/* eslint-env node */
/**
 * Inspect any Shapefile ZIP contents
 * Run: node test-data/inspect-shapefile.mjs <path-to-zip>
 */

import shp from 'shpjs'
import fs from 'fs'

const filePath =
  process.argv[2] ||
  '/Users/abdurrahimbalta/non-cloud/Upwork/mvpecological-/Pine_marten_NPWS_data_1.zip'

async function inspectShapefile() {
  try {
    console.log(`Reading: ${filePath}\n`)

    const buffer = fs.readFileSync(filePath)
    const geojson = await shp(buffer)

    // Handle array or single FeatureCollection
    const fc = Array.isArray(geojson) ? geojson[0] : geojson

    console.log('=== SHAPEFILE CONTENTS ===\n')
    console.log(`Total features: ${fc.features?.length || 0}`)

    if (fc.features && fc.features.length > 0) {
      // Show first feature's properties (column names)
      const firstFeature = fc.features[0]
      console.log('\n--- COLUMNS (Attribute Fields) ---')
      const columns = Object.keys(firstFeature.properties || {})
      console.log(columns)

      // Show first 5 records
      console.log('\n--- FIRST 5 RECORDS ---')
      fc.features.slice(0, 5).forEach((f, i) => {
        console.log(`\nRecord ${i + 1}:`)
        console.log(JSON.stringify(f.properties, null, 2))
        console.log(`Geometry: ${f.geometry?.type}`)
      })

      // Show unique values for key fields
      console.log('\n--- UNIQUE VALUES ---')

      const interestingFields = columns.filter(
        (c) =>
          c.toLowerCase().includes('species') ||
          c.toLowerCase().includes('name') ||
          c.toLowerCase().includes('grid') ||
          c.toLowerCase().includes('county') ||
          c.toLowerCase().includes('year') ||
          c.toLowerCase().includes('taxon') ||
          c.toLowerCase().includes('type')
      )

      interestingFields.forEach((field) => {
        const uniqueVals = [...new Set(fc.features.map((f) => f.properties[field]).filter(Boolean))]
        console.log(`\n${field} (${uniqueVals.length} unique):`)
        console.log(uniqueVals.slice(0, 15).join(', '))
        if (uniqueVals.length > 15) console.log(`  ... and ${uniqueVals.length - 15} more`)
      })

      // Show geometry bounds
      console.log('\n--- GEOMETRY BOUNDS ---')
      let minLat = Infinity,
        maxLat = -Infinity,
        minLng = Infinity,
        maxLng = -Infinity
      fc.features.forEach((f) => {
        if (f.geometry?.coordinates) {
          const coords =
            f.geometry.type === 'Point' ? [f.geometry.coordinates] : f.geometry.coordinates.flat(3)

          for (let i = 0; i < coords.length; i += 2) {
            if (typeof coords[i] === 'number') {
              minLng = Math.min(minLng, coords[i])
              maxLng = Math.max(maxLng, coords[i])
            }
            if (typeof coords[i + 1] === 'number') {
              minLat = Math.min(minLat, coords[i + 1])
              maxLat = Math.max(maxLat, coords[i + 1])
            }
          }
        }
      })
      console.log(`Longitude: ${minLng.toFixed(4)} to ${maxLng.toFixed(4)}`)
      console.log(`Latitude: ${minLat.toFixed(4)} to ${maxLat.toFixed(4)}`)
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

inspectShapefile()
