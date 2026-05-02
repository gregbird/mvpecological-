declare module 'arcgis-pbf-parser' {
  interface DecodedFeatureCollection {
    featureCollection: GeoJSON.FeatureCollection
    exceededTransferLimit: boolean
  }

  function decode(data: Uint8Array): DecodedFeatureCollection

  export default decode
}
