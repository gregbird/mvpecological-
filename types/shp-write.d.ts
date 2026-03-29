declare module 'shp-write' {
  interface ShpWriteOptions {
    folder?: string
    filename?: string
    outputType?: 'blob' | 'base64' | 'hex' | 'array'
    compression?: 'DEFLATE' | 'STORE'
  }

  function zip(geojson: GeoJSON.FeatureCollection, options?: ShpWriteOptions): Promise<Blob>

  export { zip }
  export default { zip }
}
