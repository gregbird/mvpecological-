/**
 * Irish Grid Reference Utilities
 * Converts between WGS84 (lat/lng) and Irish Transverse Mercator (ITM) / Irish Grid
 */

// ITM (Irish Transverse Mercator) parameters
const ITM = {
  // Semi-major axis
  a: 6378137.0,
  // Semi-minor axis
  b: 6356752.314140,
  // Scale factor
  F0: 0.99982,
  // True origin latitude (53°30'N)
  lat0: (53.5 * Math.PI) / 180,
  // True origin longitude (8°W)
  lng0: (-8.0 * Math.PI) / 180,
  // False easting
  E0: 600000,
  // False northing
  N0: 750000,
};

// Grid letters for Irish Grid (excludes I)
const GRID_LETTERS = [
  ["V", "Q", "L", "F", "A"],
  ["W", "R", "M", "G", "B"],
  ["X", "S", "N", "H", "C"],
  ["Y", "T", "O", "J", "D"],
  ["Z", "U", "P", "K", "E"],
];

/**
 * Convert WGS84 coordinates to ITM (Irish Transverse Mercator)
 */
export function wgs84ToItm(
  lat: number,
  lng: number
): { easting: number; northing: number } {
  const { a, b, F0, lat0, lng0, E0, N0 } = ITM;

  // Convert to radians
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  // Eccentricity squared
  const e2 = (a * a - b * b) / (a * a);
  const n = (a - b) / (a + b);
  const n2 = n * n;
  const n3 = n * n * n;

  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);
  const nu = (a * F0) / Math.sqrt(1 - e2 * sinLat * sinLat);
  const rho =
    (a * F0 * (1 - e2)) / Math.pow(1 - e2 * sinLat * sinLat, 1.5);
  const eta2 = nu / rho - 1;

  const Ma =
    (1 + n + (5 / 4) * n2 + (5 / 4) * n3) * (latRad - lat0);
  const Mb =
    (3 * n + 3 * n2 + (21 / 8) * n3) *
    Math.sin(latRad - lat0) *
    Math.cos(latRad + lat0);
  const Mc =
    ((15 / 8) * n2 + (15 / 8) * n3) *
    Math.sin(2 * (latRad - lat0)) *
    Math.cos(2 * (latRad + lat0));
  const Md =
    (35 / 24) *
    n3 *
    Math.sin(3 * (latRad - lat0)) *
    Math.cos(3 * (latRad + lat0));
  const M = b * F0 * (Ma - Mb + Mc - Md);

  const cos3lat = cosLat * cosLat * cosLat;
  const cos5lat = cos3lat * cosLat * cosLat;
  const tan2lat = Math.tan(latRad) * Math.tan(latRad);
  const tan4lat = tan2lat * tan2lat;

  const I = M + N0;
  const II = (nu / 2) * sinLat * cosLat;
  const III =
    (nu / 24) * sinLat * cos3lat * (5 - tan2lat + 9 * eta2);
  const IIIA =
    (nu / 720) *
    sinLat *
    cos5lat *
    (61 - 58 * tan2lat + tan4lat);
  const IV = nu * cosLat;
  const V = (nu / 6) * cos3lat * (nu / rho - tan2lat);
  const VI =
    (nu / 120) *
    cos5lat *
    (5 - 18 * tan2lat + tan4lat + 14 * eta2 - 58 * tan2lat * eta2);

  const dLng = lngRad - lng0;
  const dLng2 = dLng * dLng;
  const dLng3 = dLng2 * dLng;
  const dLng4 = dLng3 * dLng;
  const dLng5 = dLng4 * dLng;
  const dLng6 = dLng5 * dLng;

  const northing = I + II * dLng2 + III * dLng4 + IIIA * dLng6;
  const easting = E0 + IV * dLng + V * dLng3 + VI * dLng5;

  return {
    easting: Math.round(easting),
    northing: Math.round(northing),
  };
}

/**
 * Convert ITM coordinates to WGS84
 */
export function itmToWgs84(
  easting: number,
  northing: number
): { lat: number; lng: number } {
  const { a, b, F0, lat0, lng0, E0, N0 } = ITM;

  const e2 = (a * a - b * b) / (a * a);
  const n = (a - b) / (a + b);
  const n2 = n * n;
  const n3 = n * n * n;

  let lat = lat0;
  let M = 0;

  // Iterate to find latitude
  do {
    lat = ((northing - N0 - M) / (a * F0)) + lat;

    const Ma = (1 + n + (5 / 4) * n2 + (5 / 4) * n3) * (lat - lat0);
    const Mb =
      (3 * n + 3 * n2 + (21 / 8) * n3) *
      Math.sin(lat - lat0) *
      Math.cos(lat + lat0);
    const Mc =
      ((15 / 8) * n2 + (15 / 8) * n3) *
      Math.sin(2 * (lat - lat0)) *
      Math.cos(2 * (lat + lat0));
    const Md =
      (35 / 24) * n3 * Math.sin(3 * (lat - lat0)) * Math.cos(3 * (lat + lat0));

    M = b * F0 * (Ma - Mb + Mc - Md);
  } while (northing - N0 - M >= 0.00001);

  const cosLat = Math.cos(lat);
  const sinLat = Math.sin(lat);
  const nu = (a * F0) / Math.sqrt(1 - e2 * sinLat * sinLat);
  const rho = (a * F0 * (1 - e2)) / Math.pow(1 - e2 * sinLat * sinLat, 1.5);
  const eta2 = nu / rho - 1;

  const tanLat = Math.tan(lat);
  const tan2lat = tanLat * tanLat;
  const tan4lat = tan2lat * tan2lat;
  const tan6lat = tan4lat * tan2lat;
  const secLat = 1 / cosLat;

  const VII = tanLat / (2 * rho * nu);
  const VIII =
    (tanLat / (24 * rho * nu * nu * nu)) *
    (5 + 3 * tan2lat + eta2 - 9 * tan2lat * eta2);
  const IX =
    (tanLat / (720 * rho * Math.pow(nu, 5))) *
    (61 + 90 * tan2lat + 45 * tan4lat);
  const X = secLat / nu;
  const XI = (secLat / (6 * nu * nu * nu)) * (nu / rho + 2 * tan2lat);
  const XII =
    (secLat / (120 * Math.pow(nu, 5))) *
    (5 + 28 * tan2lat + 24 * tan4lat);
  const XIIA =
    (secLat / (5040 * Math.pow(nu, 7))) *
    (61 + 662 * tan2lat + 1320 * tan4lat + 720 * tan6lat);

  const dE = easting - E0;
  const dE2 = dE * dE;
  const dE3 = dE2 * dE;
  const dE4 = dE3 * dE;
  const dE5 = dE4 * dE;
  const dE6 = dE5 * dE;
  const dE7 = dE6 * dE;

  lat = lat - VII * dE2 + VIII * dE4 - IX * dE6;
  const lng = lng0 + X * dE - XI * dE3 + XII * dE5 - XIIA * dE7;

  return {
    lat: (lat * 180) / Math.PI,
    lng: (lng * 180) / Math.PI,
  };
}

/**
 * Convert ITM coordinates to Irish Grid Reference
 * Returns format like "N 12345 67890" or "N1234567890"
 */
export function itmToGridRef(
  easting: number,
  northing: number,
  precision: 1 | 2 | 3 | 4 | 5 = 5
): string {
  // Get 100km grid square letter
  const e100k = Math.floor(easting / 100000);
  const n100k = Math.floor(northing / 100000);

  if (e100k < 0 || e100k > 4 || n100k < 0 || n100k > 4) {
    throw new Error("Coordinates outside Irish Grid");
  }

  const letter = GRID_LETTERS[e100k][n100k];

  // Get remaining digits
  const e = Math.floor((easting % 100000) / Math.pow(10, 5 - precision));
  const n = Math.floor((northing % 100000) / Math.pow(10, 5 - precision));

  const eStr = e.toString().padStart(precision, "0");
  const nStr = n.toString().padStart(precision, "0");

  return `${letter} ${eStr} ${nStr}`;
}

/**
 * Convert Irish Grid Reference to ITM coordinates
 */
export function gridRefToItm(gridRef: string): { easting: number; northing: number } {
  // Remove spaces and convert to uppercase
  const ref = gridRef.replace(/\s/g, "").toUpperCase();

  // Extract letter and digits
  const letter = ref[0];
  const digits = ref.slice(1);

  if (digits.length % 2 !== 0) {
    throw new Error("Invalid grid reference format");
  }

  const precision = digits.length / 2;
  const eDigits = digits.slice(0, precision);
  const nDigits = digits.slice(precision);

  // Find grid square from letter
  let e100k = -1;
  let n100k = -1;

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (GRID_LETTERS[i][j] === letter) {
        e100k = i;
        n100k = j;
        break;
      }
    }
    if (e100k >= 0) break;
  }

  if (e100k < 0) {
    throw new Error("Invalid grid reference letter");
  }

  // Calculate coordinates
  const multiplier = Math.pow(10, 5 - precision);
  const easting = e100k * 100000 + parseInt(eDigits) * multiplier;
  const northing = n100k * 100000 + parseInt(nDigits) * multiplier;

  return { easting, northing };
}

/**
 * Convert WGS84 coordinates to Irish Grid Reference
 */
export function wgs84ToGridRef(
  lat: number,
  lng: number,
  precision: 1 | 2 | 3 | 4 | 5 = 5
): string {
  const itm = wgs84ToItm(lat, lng);
  return itmToGridRef(itm.easting, itm.northing, precision);
}

/**
 * Convert Irish Grid Reference to WGS84 coordinates
 */
export function gridRefToWgs84(gridRef: string): { lat: number; lng: number } {
  const itm = gridRefToItm(gridRef);
  return itmToWgs84(itm.easting, itm.northing);
}

/**
 * Calculate the center point of a polygon and return its grid reference
 */
export function getPolygonGridRef(
  coordinates: [number, number][],
  precision: 1 | 2 | 3 | 4 | 5 = 5
): string {
  // Calculate centroid
  let sumLng = 0;
  let sumLat = 0;

  for (const coord of coordinates) {
    sumLng += coord[0];
    sumLat += coord[1];
  }

  const centerLng = sumLng / coordinates.length;
  const centerLat = sumLat / coordinates.length;

  return wgs84ToGridRef(centerLat, centerLng, precision);
}

/**
 * Format ITM coordinates for display
 */
export function formatItmCoords(easting: number, northing: number): string {
  return `E ${easting.toLocaleString()} / N ${northing.toLocaleString()}`;
}

/**
 * Validate if coordinates are within Ireland
 */
export function isWithinIreland(lat: number, lng: number): boolean {
  // Approximate bounding box for Ireland
  const bounds = {
    minLat: 51.3,
    maxLat: 55.5,
    minLng: -10.7,
    maxLng: -5.3,
  };

  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}
