import fs from 'fs'
import zlib from 'zlib'
import { PMTiles } from 'pmtiles'
import { VectorTile } from '@mapbox/vector-tile'
import Protobuf from 'pbf'

const FILE = process.argv[2] || '/Users/abdurrahimbalta/non-cloud/nlc-pipeline/nlc/nlc.pmtiles.v1'
const buf = fs.readFileSync(FILE)

class BufferSource {
  constructor(buf) {
    this.buf = buf
  }
  getKey() {
    return 'buffer'
  }
  async getBytes(offset, length) {
    return {
      data: this.buf.buffer.slice(
        this.buf.byteOffset + offset,
        this.buf.byteOffset + offset + length
      ),
    }
  }
}

const p = new PMTiles(new BufferSource(buf))
const meta = await p.getMetadata()
console.log('vector_layers:')
console.log(JSON.stringify(meta.vector_layers, null, 2))
console.log()

// Convert lat/lng to tile coords
function lngLatToTile(lng, lat, z) {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return [x, y]
}

// Ireland center: Dublin ~ (-6.26, 53.35)
const DUBLIN_LNG = -6.26
const DUBLIN_LAT = 53.35

for (const z of [6, 7, 8, 10, 12]) {
  const [x, y] = lngLatToTile(DUBLIN_LNG, DUBLIN_LAT, z)
  try {
    const res = await p.getZxy(z, x, y)
    if (!res) {
      console.log(`z${z}/${x}/${y}: no tile`)
      continue
    }
    const tileBuf = Buffer.from(res.data)
    let decompressed
    try {
      decompressed = zlib.gunzipSync(tileBuf)
    } catch {
      decompressed = tileBuf
    }
    const tile = new VectorTile(new Protobuf(decompressed))
    const layer = tile.layers['nlc']
    if (!layer) {
      console.log(`z${z}/${x}/${y}: no nlc layer (layers: ${Object.keys(tile.layers).join(',')})`)
      continue
    }
    console.log(
      `z${z}/${x}/${y}: ${layer.length} features (tile: ${tileBuf.length}B, decompressed: ${decompressed.length}B)`
    )
    const idCounts = {}
    for (let i = 0; i < layer.length; i++) {
      const pp = layer.feature(i).properties
      const id = pp.LEVEL_2_ID || 'N/A'
      idCounts[id] = (idCounts[id] || 0) + 1
    }
    const top10 = Object.entries(idCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    console.log(
      `  LEVEL_2_ID distribution (top 10):`,
      top10.map(([k, v]) => `${k}:${v}`).join(', ')
    )
    if (layer.length > 0) {
      const f = layer.feature(0)
      console.log(`  sample props:`, f.properties, `geomType=${f.type}`)
    }
  } catch (e) {
    console.log(`z${z}/${x}/${y}: ERROR ${e.message}`)
  }
}
