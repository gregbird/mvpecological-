/**
 * NPWS (National Parks & Wildlife Service) API Client
 * Fetches designated sites data from ArcGIS REST services
 */

const NPWS_BASE_URL =
  "https://gis.npws.ie/arcgis/rest/services/NPWS/DesignatedAreas/MapServer";

// Layer IDs in NPWS MapServer
const LAYERS = {
  SAC: 0, // Special Areas of Conservation
  SPA: 1, // Special Protection Areas
  NHA: 2, // Natural Heritage Areas
  pNHA: 3, // Proposed Natural Heritage Areas
  RAMSAR: 4, // Ramsar Sites
  NATURE_RESERVE: 5, // Nature Reserves
  NATIONAL_PARK: 6, // National Parks
  WILDFOWL_SANCTUARY: 7, // Wildfowl Sanctuaries
};

export type DesignatedSiteType = keyof typeof LAYERS;

export interface NPWSDesignatedSite {
  OBJECTID: number;
  SITECODE: string;
  SITENAME: string;
  SITE_TYPE?: string;
  AREA_HA?: number;
  VERSION?: string;
  geometry?: GeoJSON.Geometry;
}

export interface NPWSQueryParams {
  bbox?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  geometry?: GeoJSON.Geometry;
  siteTypes?: DesignatedSiteType[];
  searchRadius?: number; // in meters
  centerPoint?: { lat: number; lng: number };
}

/**
 * Query NPWS for designated sites within a bounding box or buffer
 */
export async function queryDesignatedSites(
  params: NPWSQueryParams
): Promise<NPWSDesignatedSite[]> {
  const { bbox, geometry, siteTypes = ["SAC", "SPA", "NHA", "pNHA"], searchRadius, centerPoint } = params;

  const results: NPWSDesignatedSite[] = [];

  // Build geometry filter
  let geometryParam = "";
  let geometryType = "";
  let spatialRel = "esriSpatialRelIntersects";

  if (bbox) {
    geometryParam = `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`;
    geometryType = "esriGeometryEnvelope";
  } else if (centerPoint && searchRadius) {
    // Buffer query around a point
    geometryParam = JSON.stringify({
      x: centerPoint.lng,
      y: centerPoint.lat,
      spatialReference: { wkid: 4326 },
    });
    geometryType = "esriGeometryPoint";
    spatialRel = "esriSpatialRelIntersects";
  } else if (geometry) {
    geometryParam = JSON.stringify(geometry);
    geometryType =
      geometry.type === "Polygon"
        ? "esriGeometryPolygon"
        : geometry.type === "Point"
        ? "esriGeometryPoint"
        : "esriGeometryEnvelope";
  }

  // Query each layer
  for (const siteType of siteTypes) {
    const layerId = LAYERS[siteType];

    try {
      const url = new URL(`${NPWS_BASE_URL}/${layerId}/query`);

      const queryParams = new URLSearchParams({
        where: "1=1",
        outFields: "OBJECTID,SITECODE,SITENAME,AREA_HA,VERSION",
        returnGeometry: "true",
        outSR: "4326",
        f: "geojson",
      });

      if (geometryParam) {
        queryParams.set("geometry", geometryParam);
        queryParams.set("geometryType", geometryType);
        queryParams.set("spatialRel", spatialRel);
        queryParams.set("inSR", "4326");
      }

      if (searchRadius) {
        queryParams.set("distance", searchRadius.toString());
        queryParams.set("units", "esriSRUnit_Meter");
      }

      url.search = queryParams.toString();

      const response = await fetch(url.toString());

      if (!response.ok) {
        console.error(`NPWS query failed for ${siteType}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();

      if (data.features) {
        for (const feature of data.features) {
          results.push({
            OBJECTID: feature.properties.OBJECTID,
            SITECODE: feature.properties.SITECODE,
            SITENAME: feature.properties.SITENAME,
            SITE_TYPE: siteType,
            AREA_HA: feature.properties.AREA_HA,
            VERSION: feature.properties.VERSION,
            geometry: feature.geometry,
          });
        }
      }
    } catch (error) {
      console.error(`Error querying NPWS ${siteType}:`, error);
    }
  }

  return results;
}

/**
 * Get details for a specific designated site by code
 */
export async function getDesignatedSiteByCode(
  siteCode: string,
  siteType: DesignatedSiteType
): Promise<NPWSDesignatedSite | null> {
  const layerId = LAYERS[siteType];

  try {
    const url = new URL(`${NPWS_BASE_URL}/${layerId}/query`);

    const queryParams = new URLSearchParams({
      where: `SITECODE = '${siteCode}'`,
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson",
    });

    url.search = queryParams.toString();

    const response = await fetch(url.toString());

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        OBJECTID: feature.properties.OBJECTID,
        SITECODE: feature.properties.SITECODE,
        SITENAME: feature.properties.SITENAME,
        SITE_TYPE: siteType,
        AREA_HA: feature.properties.AREA_HA,
        VERSION: feature.properties.VERSION,
        geometry: feature.geometry,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching site ${siteCode}:`, error);
    return null;
  }
}

/**
 * Search designated sites by name
 */
export async function searchDesignatedSitesByName(
  searchTerm: string,
  siteTypes: DesignatedSiteType[] = ["SAC", "SPA", "NHA", "pNHA"]
): Promise<NPWSDesignatedSite[]> {
  const results: NPWSDesignatedSite[] = [];

  for (const siteType of siteTypes) {
    const layerId = LAYERS[siteType];

    try {
      const url = new URL(`${NPWS_BASE_URL}/${layerId}/query`);

      const queryParams = new URLSearchParams({
        where: `UPPER(SITENAME) LIKE '%${searchTerm.toUpperCase()}%'`,
        outFields: "OBJECTID,SITECODE,SITENAME,AREA_HA",
        returnGeometry: "false",
        f: "json",
      });

      url.search = queryParams.toString();

      const response = await fetch(url.toString());

      if (!response.ok) continue;

      const data = await response.json();

      if (data.features) {
        for (const feature of data.features) {
          results.push({
            OBJECTID: feature.attributes.OBJECTID,
            SITECODE: feature.attributes.SITECODE,
            SITENAME: feature.attributes.SITENAME,
            SITE_TYPE: siteType,
            AREA_HA: feature.attributes.AREA_HA,
          });
        }
      }
    } catch (error) {
      console.error(`Error searching NPWS ${siteType}:`, error);
    }
  }

  return results;
}

/**
 * Get site type display name
 */
export function getSiteTypeDisplayName(siteType: DesignatedSiteType): string {
  const names: Record<DesignatedSiteType, string> = {
    SAC: "Special Area of Conservation",
    SPA: "Special Protection Area",
    NHA: "Natural Heritage Area",
    pNHA: "Proposed Natural Heritage Area",
    RAMSAR: "Ramsar Site",
    NATURE_RESERVE: "Nature Reserve",
    NATIONAL_PARK: "National Park",
    WILDFOWL_SANCTUARY: "Wildfowl Sanctuary",
  };
  return names[siteType];
}

/**
 * Get site type color for map display
 */
export function getSiteTypeColor(siteType: DesignatedSiteType): string {
  const colors: Record<DesignatedSiteType, string> = {
    SAC: "#22c55e", // Green
    SPA: "#3b82f6", // Blue
    NHA: "#f59e0b", // Amber
    pNHA: "#fbbf24", // Yellow
    RAMSAR: "#06b6d4", // Cyan
    NATURE_RESERVE: "#10b981", // Emerald
    NATIONAL_PARK: "#14532d", // Dark green
    WILDFOWL_SANCTUARY: "#6366f1", // Indigo
  };
  return colors[siteType];
}
