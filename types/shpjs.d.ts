declare module 'shpjs' {
  interface GeoJSONFeature {
    type: 'Feature'
    geometry: GeoJSON.Geometry
    properties: Record<string, unknown>
  }

  interface GeoJSONFeatureCollection {
    type: 'FeatureCollection'
    features: GeoJSONFeature[]
  }

  function shp(
    input: ArrayBuffer | string
  ): Promise<GeoJSONFeatureCollection | GeoJSONFeatureCollection[]>

  export default shp
}
