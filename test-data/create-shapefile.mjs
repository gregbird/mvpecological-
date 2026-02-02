/**
 * Script to create test shapefile
 * Run: node test-data/create-shapefile.mjs
 */

import shpwrite from 'shp-write'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Sample GeoJSON for Dublin area
const geojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Test Site Dublin',
        site_code: 'TEST-001',
        area_ha: 25.5,
        county: 'Dublin',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-6.33, 53.356],
            [-6.32, 53.356],
            [-6.32, 53.364],
            [-6.33, 53.364],
            [-6.33, 53.356],
          ],
        ],
      },
    },
  ],
}

// Generate shapefile as zip
const options = {
  folder: 'test-boundary',
  filename: 'boundary',
  outputType: 'blob',
  compression: 'DEFLATE',
}

async function createShapefile() {
  try {
    const zipContent = await shpwrite.zip(geojson, options)

    // Convert to buffer and save
    const buffer = Buffer.from(await zipContent.arrayBuffer())
    const outputPath = path.join(__dirname, 'sample-shapefile-dublin.zip')

    fs.writeFileSync(outputPath, buffer)
    console.log(`✅ Shapefile created: ${outputPath}`)
    console.log(`   Size: ${buffer.length} bytes`)
  } catch (error) {
    console.error('❌ Error creating shapefile:', error)
  }
}

createShapefile()
