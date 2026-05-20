import { Endpoint } from "@/features/monitor/domain/monitor";

/**
 * API Endpoints for the KloudTrack Telemetry Monitor
 *
 * Base URL: https://api.kloudtechsea.com/api/v1
 * Auth: All endpoints require the `x-kloudtrack-key` header.
 *
 * --- Standard Response Envelope ---
 * All responses follow this shape:
 * {
 *   success: boolean;       // true on success, false on failure
 *   message: string;        // human-readable status message
 *   data: T | null;         // payload; null on error responses
 * }
 *
 * --- Access Control ---
 * - ADMIN / USER: Can only access stations within their own organization.
 *
 * --- Global Rate Limit ---
 * 20 requests per minute per account across all endpoints.
 * Exceeding this limit returns HTTP 429 Too Many Requests.
 *
 * --- Telemetry Field Reference ---
 * Each WeatherStationApiReading includes:
 *   id              (number)  — Unique record ID
 *   recordedAt      (string)  — ISO 8601 UTC timestamp of when data was recorded
 *   heatIndex       (number)  — Perceived temperature in °C combining heat & humidity
 *   temperature     (number)  — Ambient air temperature in °C
 *   humidity        (number)  — Relative humidity as a percentage (0–100)
 *   pressure        (number)  — Atmospheric pressure in hPa
 *   wind.direction  (number)  — Wind direction in degrees (0–360, meteorological convention)
 *   wind.speed      (number)  — Wind speed in m/s
 *   precipitation   (number)  — Instantaneous precipitation in mm
 *   hourlyPrecip    (number)  — Rolling hourly precipitation total in mm (dashboard only)
 *   uvIndex         (number)  — UV index (0–11+)
 *   distance        (number)  — Sensor-specific distance reading in cm (e.g., water level)
 *   lightIntensity  (number)  — Ambient light intensity in lux
 *
 * --- StationInfo Field Reference ---
 *   id              (string)  — Unique station hashid (e.g., "st_123abc")
 *   stationName     (string)  — Human-readable name of the station
 *   stationType     (string)  — e.g., "WEATHERSTATION"
 *   location        (object)  — { lat: number, lng: number }
 *   address         (string)  — Street address
 *   city            (string)  — City name
 *   state           (string)  — State or province
 *   country         (string)  — Country name
 *   elevation       (number)  — Elevation above sea level in meters
 *   isActive        (boolean) — Whether the station is currently operational
 *   activatedAt     (string)  — ISO 8601 UTC timestamp of station activation
 *   organizationId  (number)  — Owning organization's numeric ID
 *   organization    (object)  — { id: number, organizationName: string }
 *
 * --- Water level (RIVERLEVEL / modular river) — /water-level ---
 * Responses use { success, message?, data } where data is typically
 * { station: StationInfo, waterLevel: ... }. Station `id` is a hashid string.
 * `calculatedWaterLevel` combines raw sensor `rawMode` with per-station reference `value`
 * when both are present; units follow your deployment (often cm above reference).
 *
 * --- Rain gauge (RAINGAUGE / modular rain) — /rain-gauge ---
 * data shape: { station: StationInfo, rainGauge: ... }.
 * Each reading has `tips` (bucket tips in the interval) and `mmPerTip` from station
 * reference; `calculatedMm` = tips × mmPerTip when `mmPerTip` is configured.
 */
const endpoints: Endpoint[] = [
  // ─────────────────────────────────────────────────────────────
  // ENDPOINT 1 — GET /telemetry/dashboard
  // ─────────────────────────────────────────────────────────────
  {
    id: 1,
    title: "Get Weather Station Dashboard Stations",
    description:
      "Returns all stations accessible to the authenticated user, each paired with their most recent telemetry snapshot. Designed for lightweight dashboard rendering — only the latest reading is included per station, not full history.",
    purpose:
      "Use to populate dashboards, maps, or overview lists that need to show current conditions across multiple stations at a glance. Not intended for historical or charting use cases.",
    method: "GET",
    path: "/telemetry/dashboard",
    version: "v1",
    lastUpdated: "November 19, 2025",
    headers: [
      {
        key: "x-kloudtrack-key",
        required: true,
        description:
          "Your unique API key for authentication. Must be included in every request. Obtain this from your KloudTrack account settings.",
      },
    ],
    parameters: [],
    pathParams: [],
    statusCodes: [
      {
        code: 200,
        label: "OK",
        description:
          "Successfully retrieved all accessible dashboard stations with their latest telemetry. `data` is an array of WeatherStationDashboardEntry objects.",
      },
      {
        code: 401,
        label: "Unauthorized",
        description:
          "The `x-kloudtrack-key` header is missing or contains an invalid/expired API key.",
      },
      {
        code: 403,
        label: "Forbidden",
        description:
          "The API key is valid but the user account does not have permission to access the requested station data (organization access control).",
      },
      {
        code: 429,
        label: "Too Many Requests",
        description:
          "Rate limit exceeded. Wait before retrying. Limit is 100 requests/minute per API key.",
      },
      {
        code: 500,
        label: "Internal Server Error",
        description:
          "An unexpected server-side error occurred. Retry after a short delay. If the issue persists, contact support.",
      },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "The telemetry snapshot for each station may lag behind real-time by a few seconds depending on ingestion pipeline timing.",
      "Response shape: { success: boolean, message: string, data: WeatherStationDashboardEntry[] }",
      "Each WeatherStationDashboardEntry contains: { station: StationInfo, telemetry: WeatherStationApiReading | null }",
      "If a station has never reported telemetry, `telemetry` will be null. Always guard against null before accessing telemetry fields.",
      "Stations returned are scoped by organization. You will only see stations belonging to your own organization.",
      "For real-time use cases, consider polling this endpoint at a reasonable interval (e.g., every 60 seconds) rather than every few seconds to stay within rate limits.",
    ],
    successExample: {
      title: "200 OK — Dashboard stations with latest telemetry",
      language: "json",
      code: `{
  "success": true,
  "message": "Dashboard stations loaded.",
  "data": [
    {
      "station": {
        "id": "st_123abc",
        "stationName": "Coastal Station A",
        "stationType": "WEATHERSTATION",
        "location": { "lat": 24.0, "lng": 120.0 },
        "address": "123 Beach Road",
        "city": "Coastal City",
        "state": "State",
        "country": "Country",
        "elevation": 5.0,
        "isActive": true,
        "activatedAt": "2025-10-01T00:00:00.000Z",
        "organizationId": 10,
        "organization": {
          "id": 10,
          "organizationName": "Marine Research Institute"
        }
      },
      "telemetry": {
        "id": 98765,
        "recordedAt": "2025-11-19T10:23:00.000Z",
        "heatIndex": 24.5,       // Feels-like temperature (°C)
        "temperature": 22.3,     // Ambient air temp (°C)
        "humidity": 68,          // Relative humidity (%)
        "pressure": 1013.25,     // Atmospheric pressure (hPa)
        "wind": {
          "direction": 180,      // Wind from south (degrees, 0–360)
          "speed": 3.4           // Wind speed (m/s)
        },
        "precipitation": 0.0,   // Instantaneous precipitation (mm)
        "uvIndex": 5.2,          // UV index (0–11+)
        "distance": 100.5,       // Sensor distance reading (cm)
        "lightIntensity": 45000, // Ambient light (lux)
        "hourlyPrecip": 0.0      // Rolling hourly rainfall (mm)
      }
    },
    {
      "station": {
        "id": "st_456def",
        "stationName": "Inland Station B",
        "stationType": "WEATHERSTATION",
        "location": { "lat": 25.1, "lng": 121.5 },
        "address": "456 Mountain Ave",
        "city": "Hill Town",
        "state": "State",
        "country": "Country",
        "elevation": 250.0,
        "isActive": true,
        "activatedAt": "2025-09-15T00:00:00.000Z",
        "organizationId": 10,
        "organization": {
          "id": 10,
          "organizationName": "Marine Research Institute"
        }
      },
      "telemetry": null  // Station is active but has not yet reported any data
    }
  ]
}`,
    },
    errorExamples: [
      {
        title: "401 Unauthorized — Missing or invalid API key",
        language: "json",
        code: `{
  "status": "error",
  "error": {
    "code": 401,
    "message": "Unauthorized",
    "details": "Missing or invalid x-kloudtrack-key header."
  }
}`,
      },
      {
        title: "429 Too Many Requests — Rate limit exceeded",
        language: "json",
        code: `{
  "status": "error",
  "error": {
    "code": 429,
    "message": "Too Many Requests",
    "details": "Rate limit of 100 requests/minute exceeded. Retry after 60 seconds."
  }
}`,
      },
    ],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `const fetchDashboard = async () => {
  const response = await fetch(
    'https://api.kloudtechsea.com/api/v1/telemetry/dashboard',
    {
      method: 'GET',
      headers: {
        'x-kloudtrack-key': 'YOUR_API_KEY_HERE',
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`API error \${response.status}: \${error?.error?.details ?? response.statusText}\`);
  }

  const { data } = await response.json();

  // Guard: a station may have null telemetry if it hasn't reported yet
  const active = data.filter((entry) => entry.telemetry !== null);
  console.log(\`\${active.length} stations with live data\`, active);
};

fetchDashboard().catch(console.error);`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -X GET "https://api.kloudtechsea.com/api/v1/telemetry/dashboard" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE" 
  -H "Content-Type: application/json"`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // ENDPOINT 2 — GET /telemetry/record/{id}
  // ─────────────────────────────────────────────────────────────
  {
    id: 2,
    title: "Get Weather Station Telemetry By ID",
    description:
      "Retrieves a single, complete telemetry record identified by its unique numeric ID. Returns the full weather reading along with the station metadata it belongs to.",
    purpose:
      "Use when you already know the specific record ID — for example, when deep-linking to a record from a table, performing audits, or resolving a previously stored reference.",
    method: "GET",
    path: "/telemetry/record/{id}",
    version: "v1",
    lastUpdated: "November 19, 2025",
    headers: [
      {
        key: "x-kloudtrack-key",
        required: true,
        description:
          "Your unique API key for authentication. Must be included in every request.",
      },
    ],
    parameters: [],
    pathParams: [
      {
        param: "id",
        description:
          "id (number, required) — The unique numeric ID of the telemetry record. This is the `id` field found inside any WeatherStationApiReading object (e.g., 98765). Do not use the station ID here.",
      },
    ],
    statusCodes: [
      {
        code: 200,
        label: "OK",
        description:
          "Telemetry record found and returned. `data` is a TelemetryResponse<WeatherStationApiReading>.",
      },
      {
        code: 401,
        label: "Unauthorized",
        description: "Missing or invalid `x-kloudtrack-key` header.",
      },
      {
        code: 403,
        label: "Forbidden",
        description:
          "The record exists but belongs to a station the authenticated user does not have access to.",
      },
      {
        code: 404,
        label: "Not Found",
        description:
          "No telemetry record exists with the given ID. Double-check the numeric ID is correct.",
      },
      {
        code: 429,
        label: "Too Many Requests",
        description: "Rate limit exceeded (100 requests/minute per API key).",
      },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "Response `data` is a TelemetryResponse<WeatherStationApiReading>: { station: StationInfo, telemetry: WeatherStationApiReading }",
      "The `id` path parameter refers to the telemetry record ID (numeric), NOT the station ID (hashid string).",
      "Access control applies: you can only retrieve records belonging to stations within your own organization.",
      "This endpoint is ideal for loading a specific reading when navigating from a list/table that already stores record IDs.",
    ],
    successExample: {
      title: "200 OK — Single telemetry record with station info",
      language: "json",
      code: `{
  "success": true,
  "message": "Telemetry record loaded.",
  "data": {
    "station": {
      "id": "st_123abc",
      "stationName": "Coastal Station A",
      "stationType": "WEATHERSTATION",
      "location": { "lat": 24.0, "lng": 120.0 },
      "address": "123 Beach Road",
      "city": "Coastal City",
      "state": "State",
      "country": "Country",
      "elevation": 5.0,
      "isActive": true,
      "activatedAt": "2025-10-01T00:00:00.000Z",
      "organizationId": 10,
      "organization": {
        "id": 10,
        "organizationName": "Marine Research Institute"
      }
    },
    "telemetry": {
      "id": 98765,
      "recordedAt": "2025-11-19T10:35:12.000Z",
      "heatIndex": 24.5,
      "temperature": 22.9,
      "humidity": 66,
      "pressure": 1013.25,
      "wind": {
        "direction": 180,
        "speed": 3.4
      },
      "precipitation": 0.0,
      "uvIndex": 5.2,
      "distance": 100.5,
      "lightIntensity": 45000
    }
  }
}`,
    },
    errorExamples: [
      {
        title: "404 Not Found — Record ID does not exist",
        language: "json",
        code: `{
  "status": "error",
  "error": {
    "code": 404,
    "message": "Not Found",
    "details": "No telemetry record found with id 99999."
  }
}`,
      },
      {
        title: "403 Forbidden — Record belongs to another organization",
        language: "json",
        code: `{
  "status": "error",
  "error": {
    "code": 403,
    "message": "Forbidden",
    "details": "You do not have permission to view this telemetry record."
  }
}`,
      },
    ],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `const fetchTelemetryById = async (recordId: number) => {
  const response = await fetch(
    \`https://api.kloudtechsea.com/api/v1/telemetry/record/\${recordId}\`,
    {
      method: 'GET',
      headers: {
        'x-kloudtrack-key': 'YOUR_API_KEY_HERE',
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 404) {
    console.warn(\`Telemetry record \${recordId} not found.\`);
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`API error \${response.status}: \${error?.error?.details}\`);
  }

  const { data } = await response.json();
  console.log('Station:', data.station.stationName);
  console.log('Reading:', data.telemetry);
  return data;
};

fetchTelemetryById(98765).catch(console.error);`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -X GET "https://api.kloudtechsea.com/api/v1/telemetry/record/98765" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE" 
  -H "Content-Type: application/json"`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // ENDPOINT 3 — GET /telemetry/station/{stationId}/current
  // ─────────────────────────────────────────────────────────────
  {
    id: 3,
    title: "Get Latest Telemetry for a Weather Station",
    description:
      "Retrieves the single most recent telemetry reading for a specific station, identified by its station hashid. The response contains both the full station metadata and the latest weather reading.",
    purpose:
      "Use when you need the live conditions for a known station without fetching historical data. Ideal for station detail pages, widgets, or alert checks.",
    method: "GET",
    path: "/telemetry/station/{stationId}/current",
    version: "v1",
    lastUpdated: "December 29, 2025",
    headers: [
      {
        key: "x-kloudtrack-key",
        required: true,
        description:
          "Your unique API key for authentication. Must be included in every request.",
      },
    ],
    parameters: [],
    pathParams: [
      {
        param: "stationId",
        description:
          "stationId (string, required) — The station's unique hashid (e.g., 'st_123abc' or the numeric form '123'). This is found in the `id` field of any StationInfo object. Do not use a telemetry record ID here.",
      },
    ],
    statusCodes: [
      {
        code: 200,
        label: "OK",
        description:
          "Latest telemetry returned successfully. `data` is a TelemetryResponse<WeatherStationApiReading>.",
      },
      {
        code: 401,
        label: "Unauthorized",
        description: "Missing or invalid `x-kloudtrack-key` header.",
      },
      {
        code: 403,
        label: "Forbidden",
        description:
          "Station exists but the authenticated user's organization does not have access to it.",
      },
      {
        code: 404,
        label: "Not Found",
        description:
          "Station exists but has no telemetry records yet, or the stationId itself is invalid.",
      },
      {
        code: 429,
        label: "Too Many Requests",
        description: "Rate limit exceeded (100 requests/minute per API key).",
      },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "Returns the record with the most recent `recordedAt` timestamp for the given station.",
      "Response `data` shape: { station: StationInfo, telemetry: WeatherStationApiReading }",
      "Access control: you can only query stations that belong to your organization.",
      "If the station has never reported data, this endpoint returns 404 — not a 200 with null telemetry. Handle this case explicitly.",
      "To compare with historical readings, combine this with endpoint 4 (Get Station Telemetry History).",
      "Use the full URL pattern: /telemetry/station/{stationId}/current (note the trailing /current — omitting it hits a different route).",
    ],
    successExample: {
      title: "200 OK — Most recent reading for the station",
      language: "json",
      code: `{
  "success": true,
  "message": "Current telemetry loaded.",
  "data": {
    "station": {
      "id": "st_123abc",
      "stationName": "Coastal Station A",
      "stationType": "WEATHERSTATION",
      "location": { "lat": 24.0, "lng": 120.0 },
      "address": "123 Beach Road",
      "city": "Coastal City",
      "state": "State",
      "country": "Country",
      "elevation": 5.0,
      "isActive": true,
      "activatedAt": "2025-10-01T00:00:00.000Z",
      "organizationId": 10,
      "organization": {
        "id": 10,
        "organizationName": "Marine Research Institute"
      }
    },
    "telemetry": {
      "id": 98765,
      "recordedAt": "2025-12-29T10:35:12.000Z",
      "heatIndex": 24.5,
      "temperature": 22.9,
      "humidity": 66,
      "pressure": 1013.25,
      "wind": {
        "direction": 180,   // 180° = wind from the south
        "speed": 3.4        // m/s ≈ 12.2 km/h (light breeze)
      },
      "precipitation": 0.0,
      "uvIndex": 5.2,
      "distance": 100.5,
      "lightIntensity": 45000
    }
  }
}`,
    },
    errorExamples: [
      {
        title: "404 Not Found — Station has no telemetry data",
        language: "json",
        code: `{
  "status": "error",
  "error": {
    "code": 404,
    "message": "Not Found",
    "details": "The station exists but has no telemetry records."
  }
}`,
      },
      {
        title: "403 Forbidden — Station belongs to a different organization",
        language: "json",
        code: `{
  "status": "error",
  "error": {
    "code": 403,
    "message": "Forbidden",
    "details": "You do not have permission to access this station."
  }
}`,
      },
    ],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `const fetchCurrentTelemetry = async (stationId: string) => {
  const response = await fetch(
    \`https://api.kloudtechsea.com/api/v1/telemetry/station/\${stationId}/current\`,
    {
      method: 'GET',
      headers: {
        'x-kloudtrack-key': 'YOUR_API_KEY_HERE',
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 404) {
    // Station exists but hasn't reported data yet — handle gracefully
    console.warn(\`Station \${stationId} has no telemetry data yet.\`);
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`API error \${response.status}: \${error?.error?.details}\`);
  }

  const { data } = await response.json();
  console.log(\`Latest reading at \${data.telemetry.recordedAt}:\`, data.telemetry);
  return data;
};

fetchCurrentTelemetry('st_123abc').catch(console.error);`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -X GET "https://api.kloudtechsea.com/api/v1/telemetry/station/st_123abc/current" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE" 
  -H "Content-Type: application/json"`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // ENDPOINT 4 — GET /telemetry/station/{stationId}/history
  // ─────────────────────────────────────────────────────────────
  {
    id: 4,
    title: "Get Weather Station Telemetry History",
    description:
      "Retrieves a paginated list of historical telemetry readings for a specific station. Supports time-range filtering, minute-bucket aggregation (downsampling), and optional outlier removal. Returns the full weather reading shape for each record.",
    purpose:
      "Use for rendering historical charts, data tables, CSV exports, or any feature requiring a series of readings over time. Aggregation (`interval`) is especially useful for charts — it reduces point density without losing trend fidelity.",
    method: "GET",
    path: "/telemetry/station/{stationId}/history",
    version: "v1",
    lastUpdated: "November 19, 2025",
    headers: [
      {
        key: "x-kloudtrack-key",
        required: true,
        description:
          "Your unique API key for authentication. Must be included in every request.",
      },
    ],
    parameters: [
      {
        name: "skip",
        type: "number",
        required: false,
        description:
          "Number of records to skip for pagination. Use with `take` to implement offset-based pagination. Default: 0.",
      },
      {
        name: "take",
        type: "number",
        required: false,
        description:
          "Maximum number of records to return (page size). Omitting this defaults the server to 10. Set higher (e.g., 100) for charts; keep low for tables.",
      },
      {
        name: "interval",
        type: "number",
        required: false,
        description:
          "Aggregation bucket size in minutes. When set, readings are averaged into time buckets of this size, reducing response volume. Common values: 1, 15, 30, 60, 180, 360, 720, 1440. Omit for raw (un-aggregated) data.",
      },
      {
        name: "startDate",
        type: "string",
        required: false,
        description:
          "ISO 8601 date string marking the inclusive start of the time range filter (e.g., '2025-11-01' or '2025-11-01T00:00:00.000Z'). Must be used with `endDate` for range filtering.",
      },
      {
        name: "endDate",
        type: "string",
        required: false,
        description:
          "ISO 8601 date string marking the inclusive end of the time range filter. Omitting this with a `startDate` may return all records from `startDate` onwards.",
      },
      {
        name: "filterOutliers",
        type: "string",
        required: false,
        description:
          "Whether to strip statistical outliers from the result set before returning. Accepted values: 'true' or 'false'. Defaults to 'true'. Set to 'false' only when you need raw unfiltered sensor data for diagnostics.",
      },
    ],
    pathParams: [
      {
        param: "stationId",
        description:
          "stationId (string, required) — The station's hashid (e.g., 'st_123abc' or its numeric short form '123'). Found in the `id` field of any StationInfo object.",
      },
    ],
    statusCodes: [
      {
        code: 200,
        label: "OK",
        description:
          "History returned. `data` is a TelemetryResponse<WeatherStationApiReading[]> where `telemetry` is an array of readings sorted descending by `recordedAt`.",
      },
      {
        code: 400,
        label: "Bad Request",
        description:
          "One or more query parameters are malformed — e.g., invalid date format, non-numeric interval, or unsupported interval value.",
      },
      {
        code: 401,
        label: "Unauthorized",
        description: "Missing or invalid `x-kloudtrack-key` header.",
      },
      {
        code: 403,
        label: "Forbidden",
        description:
          "Station exists but the authenticated user does not have access to it.",
      },
      {
        code: 429,
        label: "Too Many Requests",
        description: "Rate limit exceeded (100 requests/minute per API key).",
      },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "Records are returned in descending order by `recordedAt` (most recent first). Reverse the array client-side if you need ascending order for charting.",
      "Use `interval` to downsample data for charts. For a 24-hour chart with hourly resolution, use interval=60. For a 7-day chart with 6-hour resolution, use interval=360.",
      "When using pagination, always provide both `skip` and `take` together. Example: skip=0&take=50 (page 1), skip=50&take=50 (page 2).",
      "`startDate` and `endDate` accept both date-only strings ('2025-11-01') and full ISO timestamps ('2025-11-01T00:00:00.000Z').",
      "Outlier filtering (default: on) removes readings that deviate significantly from expected sensor ranges. Disable with filterOutliers=false for diagnostic/raw data views.",
      "Response shape: { success: boolean, message: string, data: { station: StationInfo, telemetry: WeatherStationApiReading[] } }",
      "A 200 response with an empty `telemetry` array (not a 404) indicates the station exists but has no data matching the query parameters.",
    ],
    successExample: {
      title: "200 OK — Paginated history with 15-minute aggregation",
      language: "json",
      code: `{
  "success": true,
  "message": "Telemetry history loaded.",
  "data": {
    "station": {
      "id": "st_123abc",
      "stationName": "Coastal Station A",
      "stationType": "WEATHERSTATION",
      "location": { "lat": 24.0, "lng": 120.0 },
      "address": "123 Beach Road",
      "city": "Coastal City",
      "state": "State",
      "country": "Country",
      "elevation": 5.0,
      "isActive": true,
      "activatedAt": "2025-10-01T00:00:00.000Z",
      "organizationId": 10,
      "organization": {
        "id": 10,
        "organizationName": "Marine Research Institute"
      }
    },
    "telemetry": [
      {
        "id": 101,
        "recordedAt": "2025-11-19T10:00:00.000Z",  // Most recent first
        "heatIndex": 24.0,
        "temperature": 22.1,
        "humidity": 68,
        "pressure": 1013.25,
        "wind": { "direction": 180, "speed": 3.4 },
        "precipitation": 0.0,
        "uvIndex": 5.2,
        "distance": 100.5,
        "lightIntensity": 45000
      },
      {
        "id": 100,
        "recordedAt": "2025-11-19T09:45:00.000Z",  // Older record
        "heatIndex": 23.8,
        "temperature": 21.8,
        "humidity": 70,
        "pressure": 1013.1,
        "wind": { "direction": 190, "speed": 3.1 },
        "precipitation": 0.0,
        "uvIndex": 5.0,
        "distance": 100.0,
        "lightIntensity": 44000
      }
    ]
  }
}`,
    },
    errorExamples: [
      {
        title: "400 Bad Request — Invalid date format",
        language: "json",
        code: `{
  "status": "error",
  "error": {
    "code": 400,
    "message": "Bad Request",
    "details": "Invalid startDate format. Expected ISO 8601 (e.g., 2025-11-01 or 2025-11-01T00:00:00.000Z)."
  }
}`,
      },
    ],
    jsRequest: {
      title: "JavaScript (fetch) — With date range and aggregation",
      code: `const fetchTelemetryHistory = async (stationId: string) => {
  const params = new URLSearchParams({
    skip: '0',
    take: '96',           // 96 × 15-min intervals = 24 hours
    interval: '15',       // Aggregate into 15-minute buckets
    startDate: '2025-11-01',
    endDate: '2025-11-19',
    filterOutliers: 'true',
  });

  const response = await fetch(
    \`https://api.kloudtechsea.com/api/v1/telemetry/station/\${stationId}/history?\${params}\`,
    {
      method: 'GET',
      headers: {
        'x-kloudtrack-key': 'YOUR_API_KEY_HERE',
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`API error \${response.status}: \${error?.error?.details}\`);
  }

  const { data } = await response.json();

  // Reverse for ascending time order (suitable for charting)
  const chartData = [...data.telemetry].reverse();
  console.log(\`Fetched \${chartData.length} readings for \${data.station.stationName}\`);
  return chartData;
};

fetchTelemetryHistory('st_123abc').catch(console.error);`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -X GET "https://api.kloudtechsea.com/api/v1/telemetry/station/st_123abc/history?skip=0&take=96&interval=15&startDate=2025-11-01&endDate=2025-11-19&filterOutliers=true" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE" 
  -H "Content-Type: application/json"`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // ENDPOINT 5 — GET /telemetry/station/{stationId}/history/{variable}
  // ─────────────────────────────────────────────────────────────
  {
    id: 5,
    title: "Get Weather Variable History (Single Metric)",
    description:
      "Retrieves the time-series history for a single telemetry variable (e.g., temperature, humidity) for a specific station. Each item in the response contains only the timestamp and the value for that variable — not the full weather reading. Supports the same aggregation and filtering options as the full history endpoint.",
    purpose:
      "Use when you only need one metric — for example, rendering a temperature chart, analyzing pressure trends, or computing statistics on a single sensor channel. This endpoint is more efficient than fetching full readings and extracting one field client-side.",
    method: "GET",
    path: "/telemetry/station/{stationId}/history/{variable}",
    version: "v1",
    lastUpdated: "November 19, 2025",
    headers: [
      {
        key: "x-kloudtrack-key",
        required: true,
        description:
          "Your unique API key for authentication. Must be included in every request.",
      },
    ],
    parameters: [
      {
        name: "skip",
        type: "number",
        required: false,
        description: "Pagination offset. Default: 0.",
      },
      {
        name: "take",
        type: "number",
        required: false,
        description:
          "Maximum number of variable readings to return. Defaults to 10 when omitted. Increase for charting (e.g., 100–1000).",
      },
      {
        name: "interval",
        type: "number",
        required: false,
        description:
          "Aggregation bucket size in minutes. Values are averaged within each bucket. Useful for reducing chart density. Common values: 1, 15, 30, 60, 180, 360, 720, 1440.",
      },
      {
        name: "startDate",
        type: "string",
        required: false,
        description:
          "ISO 8601 date/timestamp marking the inclusive start of the query window (e.g., '2025-11-01').",
      },
      {
        name: "filterOutliers",
        type: "string",
        required: false,
        description:
          "Whether to remove outlier values. Accepted: 'true' or 'false'. Defaults to 'true'. Set to 'false' to include all raw sensor data.",
      },
    ],
    pathParams: [
      {
        param: "stationId",
        description:
          "stationId (string, required) — The station's hashid (e.g., 'st_123abc'). Found in the `id` field of any StationInfo object.",
      },
      {
        param: "variable",
        description: `variable (string, required) — The metric to retrieve. Must be one of the following exact strings:
  • temperature      — Ambient air temperature (°C)
  • humidity         — Relative humidity (%)
  • pressure         — Atmospheric pressure (hPa)
  • heatIndex        — Feels-like temperature (°C)
  • windDirection    — Wind direction (degrees, 0–360)
  • windSpeed        — Wind speed (m/s)
  • precipitation    — Instantaneous precipitation (mm)
  • uvIndex          — UV index (0–11+)
  • distance         — Sensor distance reading (cm)
  • lightIntensity   — Ambient light intensity (lux)
Any other value will return a 400 Bad Request.`,
      },
    ],
    statusCodes: [
      {
        code: 200,
        label: "OK",
        description:
          "Variable history returned. `data` is a TelemetryResponse<VariableReading[]> where each VariableReading is { id, recordedAt, createdAt, value }.",
      },
      {
        code: 400,
        label: "Bad Request",
        description:
          "The `variable` path parameter is not one of the supported metric names, or a query parameter is malformed.",
      },
      {
        code: 401,
        label: "Unauthorized",
        description: "Missing or invalid `x-kloudtrack-key` header.",
      },
      {
        code: 403,
        label: "Forbidden",
        description:
          "Station exists but the authenticated user does not have access to it.",
      },
      {
        code: 404,
        label: "Not Found",
        description: "Station not found or no data available for the query.",
      },
      {
        code: 429,
        label: "Too Many Requests",
        description: "Rate limit exceeded (100 requests/minute per API key).",
      },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "Each VariableReading in the response contains: { id: number, recordedAt: string, createdAt: string, value: number }",
      "Response shape: { success: boolean, message: string, data: { station: StationInfo, telemetry: VariableReading[] } }",
      "`variable` is case-sensitive. Use camelCase exactly as listed (e.g., 'heatIndex', not 'heat_index' or 'HeatIndex').",
      "Records are returned descending by `recordedAt`. Reverse the array client-side if you need ascending order for charting.",
      "Use `interval` to create chart-friendly aggregated series. Example: interval=60 gives one averaged reading per hour.",
      "For multi-variable charts, make parallel requests to this endpoint for each variable rather than using the full history endpoint.",
      "The `createdAt` field reflects when the record was ingested by the server, which may differ slightly from `recordedAt` (the sensor's reported time).",
    ],
    successExample: {
      title: "200 OK — Temperature variable history with 15-minute aggregation",
      language: "json",
      code: `{
  "success": true,
  "message": "Variable history loaded.",
  "data": {
    "station": {
      "id": "st_123abc",
      "stationName": "Coastal Station A",
      "stationType": "WEATHERSTATION",
      "location": { "lat": 24.0, "lng": 120.0 },
      "address": "123 Beach Road",
      "city": "Coastal City",
      "state": "State",
      "country": "Country",
      "elevation": 5.0,
      "isActive": true,
      "activatedAt": "2025-10-01T00:00:00.000Z",
      "organizationId": 10,
      "organization": {
        "id": 10,
        "organizationName": "Marine Research Institute"
      }
    },
    "telemetry": [
      {
        "id": 201,
        "recordedAt": "2025-11-19T10:00:00Z",   // Sensor timestamp
        "createdAt": "2025-11-19T10:01:00Z",     // Server ingestion timestamp
        "value": 22.1                            // Temperature in °C
      },
      {
        "id": 200,
        "recordedAt": "2025-11-19T09:45:00Z",
        "createdAt": "2025-11-19T09:46:00Z",
        "value": 21.8
      }
    ]
  }
}`,
    },
    errorExamples: [
      {
        title: "400 Bad Request — Invalid variable name",
        language: "json",
        code: `{
  "status": "error",
  "error": {
    "code": 400,
    "message": "Bad Request",
    "details": "Invalid variable 'temp'. Must be one of: temperature, humidity, pressure, heatIndex, windDirection, windSpeed, precipitation, uvIndex, distance, lightIntensity."
  }
}`,
      },
    ],
    jsRequest: {
      title: "JavaScript (fetch) — Plot temperature for the last 24 hours",
      code: `type Variable =
  | 'temperature' | 'humidity' | 'pressure' | 'heatIndex'
  | 'windDirection' | 'windSpeed' | 'precipitation'
  | 'uvIndex' | 'distance' | 'lightIntensity';

const fetchVariableHistory = async (stationId: string, variable: Variable) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const params = new URLSearchParams({
    skip: '0',
    take: '96',                                  // 96 × 15-min = 24 hours
    interval: '15',
    startDate: yesterday.toISOString().split('T')[0],
    filterOutliers: 'true',
  });

  const response = await fetch(
    \`https://api.kloudtechsea.com/api/v1/telemetry/station/\${stationId}/history/\${variable}?\${params}\`,
    {
      method: 'GET',
      headers: {
        'x-kloudtrack-key': 'YOUR_API_KEY_HERE',
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`API error \${response.status}: \${error?.error?.details}\`);
  }

  const { data } = await response.json();

  // Format for a charting library (e.g., Recharts, Chart.js)
  const chartPoints = [...data.telemetry]
    .reverse()                                  // Ascending time order
    .map((r) => ({ x: r.recordedAt, y: r.value }));

  console.log(\`\${variable} over last 24h (\${chartPoints.length} points):\`, chartPoints);
  return chartPoints;
};

fetchVariableHistory('st_123abc', 'temperature').catch(console.error);`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -X GET "https://api.kloudtechsea.com/api/v1/telemetry/station/st_123abc/history/temperature?skip=0&take=96&interval=15&startDate=2025-11-01&filterOutliers=true" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE" 
  -H "Content-Type: application/json"`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // WATER LEVEL — GET /water-level/dashboard
  // ─────────────────────────────────────────────────────────────
  {
    id: 6,
    title: "Get Water Level Dashboard Stations",
    description:
      "Returns every station your account can read that participates in water level data, each with the latest WaterLevelReading (or null if the station has no readings yet). Station types are typically RIVERLEVEL or modular configurations with a water-level module.",
    purpose:
      "Use for overview maps, alert tiles, or landing pages that need the current river / water-level snapshot across many sites without per-station requests.",
    method: "GET",
    path: "/water-level/dashboard",
    version: "v1",
    lastUpdated: "May 4, 2026",
    headers: [
      {
        key: "x-kloudtrack-key",
        required: true,
        description:
          "API key authentication. The resolved user must have read access to each station; results are filtered by organization and permissions.",
      },
    ],
    parameters: [],
    pathParams: [],
    statusCodes: [
      { code: 200, label: "OK", description: "Array of { station, waterLevel } entries." },
      { code: 401, label: "Unauthorized", description: "Missing or invalid API key." },
      { code: 403, label: "Forbidden", description: "Authenticated but cannot read water level data." },
      { code: 429, label: "Too Many Requests", description: "Rate limit exceeded." },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "`data` is an array of objects: { station: StationInfo, waterLevel: WaterLevelReading | null }.",
      "`waterLevel` is null when the station is eligible but has never ingested a reading.",
      "Prefer this endpoint over many `/current` calls when refreshing a fleet dashboard.",
      "Timestamps in JSON are ISO 8601 strings.",
    ],
    successExample: {
      title: "200 OK",
      language: "json",
      code: `{
  "success": true,
  "message": "Water level dashboard data retrieved successfully",
  "data": [
    {
      "station": {
        "id": "st_abc123",
        "stationName": "River gauge 01",
        "stationType": "RIVERLEVEL",
        "location": { "lat": 23.5, "lng": 120.2 },
        "address": "1 River Rd",
        "city": "Taichung",
        "state": "",
        "country": "TW",
        "elevation": 42,
        "isActive": true,
        "activatedAt": "2026-01-10T00:00:00.000Z",
        "organizationId": 10,
        "organization": { "id": 10, "organizationName": "Demo Org" }
      },
      "waterLevel": {
        "id": 5001,
        "recordedAt": "2026-05-04T08:00:00.000Z",
        "startTimestamp": null,
        "endTimestamp": null,
        "sampleInterval": 60,
        "sampleCount": 120,
        "filteredSampleCount": 118,
        "spikeCount": 2,
        "minimum": 95.2,
        "maximum": 98.1,
        "rawMode": 96.4,
        "calculatedWaterLevel": 101.2,
        "median": 96.5,
        "frequentRangeLow": 95.8,
        "frequentRangeHigh": 97.2,
        "estimatedMovAvg": 96.6
      }
    }
  ]
}`,
    },
    errorExamples: [
      {
        title: "401 Unauthorized",
        language: "json",
        code: `{
  "status": "error",
  "error": { "code": 401, "message": "Unauthorized", "details": "Missing or invalid x-kloudtrack-key header." }
}`,
      },
    ],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `const r = await fetch('https://api.kloudtechsea.com/api/v1/water-level/dashboard', {
  headers: { 'x-kloudtrack-key': 'YOUR_API_KEY_HERE' },
});
const json = await r.json();
if (!r.ok) throw new Error(JSON.stringify(json));
console.log(json.data);`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -s "https://api.kloudtechsea.com/api/v1/water-level/dashboard" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE"`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // WATER LEVEL — GET /water-level/record/{id}
  // ─────────────────────────────────────────────────────────────
  {
    id: 7,
    title: "Get Water Level Record by ID",
    description:
      "Fetches a single stored water level aggregate row by its numeric primary key (`waterLevel.id` from dashboard, history, or device pipeline). Includes parent station metadata.",
    purpose:
      "Use when you store reading IDs from webhooks or batch exports and need to re-fetch one row with full station context.",
    method: "GET",
    path: "/water-level/record/{id}",
    version: "v1",
    lastUpdated: "May 4, 2026",
    headers: [
      {
        key: "x-kloudtrack-key",
        required: true,
        description: "API key for the user that has read access to the station owning this record.",
      },
    ],
    parameters: [],
    pathParams: [
      {
        param: "id",
        description:
          "Numeric water_level reading ID (integer), not the station hashid. Example: 5001.",
      },
    ],
    statusCodes: [
      { code: 200, label: "OK", description: "{ station, waterLevel } payload." },
      { code: 404, label: "Not Found", description: "No row with that id." },
      { code: 403, label: "Forbidden", description: "Row belongs to a station you cannot read." },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "Response `data`: { station: StationInfo, waterLevel: WaterLevelReading }.",
      "`calculatedWaterLevel` may be null if reference or raw data is missing.",
    ],
    successExample: {
      title: "200 OK",
      language: "json",
      code: `{
  "success": true,
  "message": "Water level data retrieved successfully",
  "data": {
    "station": {
      "id": "st_abc123",
      "stationName": "River gauge 01",
      "stationType": "RIVERLEVEL",
      "location": { "lat": 23.5, "lng": 120.2 },
      "address": "1 River Rd",
      "city": "Taichung",
      "state": "",
      "country": "TW",
      "elevation": 42,
      "isActive": true,
      "activatedAt": "2026-01-10T00:00:00.000Z",
      "organizationId": 10,
      "organization": { "id": 10, "organizationName": "Demo Org" }
    },
    "waterLevel": {
      "id": 5001,
      "recordedAt": "2026-05-04T08:00:00.000Z",
      "calculatedWaterLevel": 101.2,
      "rawMode": 96.4,
      "median": 96.5,
      "minimum": 95.2,
      "maximum": 98.1,
      "sampleInterval": 60,
      "sampleCount": 120,
      "filteredSampleCount": 118,
      "spikeCount": 2,
      "frequentRangeLow": 95.8,
      "frequentRangeHigh": 97.2,
      "estimatedMovAvg": 96.6,
      "startTimestamp": null,
      "endTimestamp": null
    }
  }
}`,
    },
    errorExamples: [
      {
        title: "404 Not Found",
        language: "json",
        code: `{
  "status": "error",
  "error": { "code": 404, "message": "Not Found", "details": "Water level data not found" }
}`,
      },
    ],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `const id = 5001;
const r = await fetch(\`https://api.kloudtechsea.com/api/v1/water-level/record/\${id}\`, {
  headers: { 'x-kloudtrack-key': 'YOUR_API_KEY_HERE' },
});
const json = await r.json();`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -s "https://api.kloudtechsea.com/api/v1/water-level/record/5001" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE"`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // WATER LEVEL — GET /water-level/station/{stationId}/current
  // ─────────────────────────────────────────────────────────────
  {
    id: 8,
    title: "Get Latest Water Level Reading for a Station",
    description:
      "Returns the most recent water level aggregate for the given station hashid. Fails with 404 when the station has no water level rows yet.",
    purpose:
      "Widgets, detail pages, and alerting on a single site where you already know the station id from the dashboard or station directory.",
    method: "GET",
    path: "/water-level/station/{stationId}/current",
    version: "v1",
    lastUpdated: "May 4, 2026",
    headers: [
      {
        key: "x-kloudtrack-key",
        required: true,
        description: "API key; user must have canReadData on the station.",
      },
    ],
    parameters: [],
    pathParams: [
      {
        param: "stationId",
        description:
          "Station hashid (e.g. st_abc123) or encoded numeric form accepted by the server — same as other /station/{stationId} routes.",
      },
    ],
    statusCodes: [
      { code: 200, label: "OK", description: "{ station, waterLevel }." },
      { code: 404, label: "Not Found", description: "No water level data for this station." },
      { code: 400, label: "Bad Request", description: "Invalid station id encoding." },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "Latest is determined server-side (most recent recordedAt / id ordering in repository).",
    ],
    successExample: {
      title: "200 OK",
      language: "json",
      code: `{
  "success": true,
  "message": "Current water level data retrieved successfully",
  "data": {
    "station": { "id": "st_abc123", "stationName": "River gauge 01", "stationType": "RIVERLEVEL" },
    "waterLevel": {
      "id": 5001,
      "recordedAt": "2026-05-04T08:00:00.000Z",
      "calculatedWaterLevel": 101.2,
      "rawMode": 96.4
    }
  }
}`,
    },
    errorExamples: [],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `const stationId = 'st_abc123';
await fetch(\`https://api.kloudtechsea.com/api/v1/water-level/station/\${stationId}/current\`, {
  headers: { 'x-kloudtrack-key': 'YOUR_API_KEY_HERE' },
}).then((r) => r.json());`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -s "https://api.kloudtechsea.com/api/v1/water-level/station/st_abc123/current" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE"`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // WATER LEVEL — GET /water-level/station/{stationId}/history
  // ─────────────────────────────────────────────────────────────
  {
    id: 9,
    title: "Get Water Level History for a Station",
    description:
      "Returns a time series of water level aggregate rows for one station. Supports optional minute-based aggregation buckets and optional start/end filters. Records are ordered by time descending (newest first).",
    purpose:
      "Charts, CSV exports, and analytics for river stage or distance-derived level over hours or months.",
    method: "GET",
    path: "/water-level/station/{stationId}/history",
    version: "v1",
    lastUpdated: "May 4, 2026",
    headers: [
      {
        key: "x-kloudtrack-key",
        required: true,
        description: "API key with read access to the station.",
      },
    ],
    parameters: [
      {
        name: "skip",
        type: "number",
        required: false,
        description: "SQL OFFSET for pagination. Default 0.",
      },
      {
        name: "take",
        type: "number",
        required: false,
        description:
          "Accepted for API symmetry; always combine with a tight startDate/endDate window for large histories so responses stay bounded.",
      },
      {
        name: "interval",
        type: "number",
        required: false,
        description:
          "Aggregation bucket size in minutes. Allowed: 1, 15, 30, 60, 180, 360, 720, 1440. Omits raw per-row data and returns one averaged bucket per interval.",
      },
      {
        name: "startDate",
        type: "string",
        required: false,
        description: "Inclusive lower bound on recordedAt (ISO 8601). Recommended for all non-trivial queries.",
      },
      {
        name: "endDate",
        type: "string",
        required: false,
        description: "Inclusive upper bound on recordedAt (ISO 8601). Defaults to now when omitted.",
      },
    ],
    pathParams: [
      {
        param: "stationId",
        description: "Station hashid for the water level station.",
      },
    ],
    statusCodes: [
      { code: 200, label: "OK", description: "{ station, waterLevel: WaterLevelReading[] }." },
      { code: 400, label: "Bad Request", description: "Invalid interval or date format." },
      { code: 404, label: "Not Found", description: "Station not found." },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "`data.waterLevel` is an array (possibly empty if no rows match the window).",
      "Reverse client-side for ascending charts.",
      "For a single metric time series, consider the `/history/{variable}` endpoint to reduce payload size.",
    ],
    successExample: {
      title: "200 OK (truncated)",
      language: "json",
      code: `{
  "success": true,
  "message": "Water level history retrieved successfully",
  "data": {
    "station": { "id": "st_abc123", "stationName": "River gauge 01", "stationType": "RIVERLEVEL" },
    "waterLevel": [
      {
        "id": 5002,
        "recordedAt": "2026-05-04T09:00:00.000Z",
        "calculatedWaterLevel": 101.5,
        "rawMode": 96.6,
        "median": 96.7,
        "minimum": 95.4,
        "maximum": 98.0,
        "sampleInterval": 60,
        "sampleCount": 120,
        "filteredSampleCount": 118,
        "spikeCount": 2,
        "frequentRangeLow": 95.9,
        "frequentRangeHigh": 97.3,
        "estimatedMovAvg": 96.7,
        "startTimestamp": null,
        "endTimestamp": null
      }
    ]
  }
}`,
    },
    errorExamples: [],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `const q = new URLSearchParams({
  skip: '0',
  interval: '60',
  startDate: '2026-05-01T00:00:00.000Z',
  endDate: '2026-05-04T23:59:59.999Z',
});
const stationId = 'st_abc123';
await fetch(\`https://api.kloudtechsea.com/api/v1/water-level/station/\${stationId}/history?\${q}\`, {
  headers: { 'x-kloudtrack-key': 'YOUR_API_KEY_HERE' },
}).then((r) => r.json());`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -sG "https://api.kloudtechsea.com/api/v1/water-level/station/st_abc123/history" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE" 
  --data-urlencode "interval=60" 
  --data-urlencode "startDate=2026-05-01" 
  --data-urlencode "endDate=2026-05-04"`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // WATER LEVEL — GET /water-level/station/{stationId}/history/{variable}
  // ─────────────────────────────────────────────────────────────
  {
    id: 10,
    title: "Get Water Level History for a Station (Single Variable)",
    description:
      "Returns `{ station, waterLevel }` where `waterLevel` is an array of VariableReading objects `{ id, recordedAt, createdAt, value }` for one derived column (e.g. calculatedWaterLevel). Supports the same interval and date filters as full history.",
    purpose:
      "Efficient plotting of one series (stage, median, raw mode, etc.) without transferring every column per timestamp.",
    method: "GET",
    path: "/water-level/station/{stationId}/history/{variable}",
    version: "v1",
    lastUpdated: "May 4, 2026",
    headers: [
      {
        key: "x-kloudtrack-key",
        required: true,
        description: "API key with read access to the station.",
      },
    ],
    parameters: [
      { name: "skip", type: "number", required: false, description: "OFFSET. Default 0." },
      {
        name: "take",
        type: "number",
        required: false,
        description: "Default 10 when omitted in controller; use with date range for charts.",
      },
      {
        name: "interval",
        type: "number",
        required: false,
        description: "Minutes: 1, 15, 30, 60, 180, 360, 720, 1440.",
      },
      {
        name: "startDate",
        type: "string",
        required: false,
        description: "ISO start of window (defaults to epoch if omitted).",
      },
      {
        name: "endDate",
        type: "string",
        required: false,
        description: "ISO end of window (defaults to now).",
      },
    ],
    pathParams: [
      { param: "stationId", description: "Station hashid." },
      {
        param: "variable",
        description: `Case-sensitive camelCase metric name. Allowed:
sampleInterval, sampleCount, filteredSampleCount, spikeCount, minimum, maximum, rawMode,
calculatedWaterLevel, median, frequentRangeLow, frequentRangeHigh, estimatedMovAvg, distance
(distance is an alias for calculatedWaterLevel in queries).`,
      },
    ],
    statusCodes: [
      { code: 200, label: "OK", description: "{ station, waterLevel: VariableReading[] }." },
      { code: 400, label: "Bad Request", description: "Invalid variable or interval." },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "Response key is `waterLevel` (not `telemetry`). Each point: { id, recordedAt, createdAt, value }.",
      "Values are ordered descending by time.",
    ],
    successExample: {
      title: "200 OK",
      language: "json",
      code: `{
  "success": true,
  "message": "Water level history retrieved successfully",
  "data": {
    "station": { "id": "st_abc123", "stationName": "River gauge 01", "stationType": "RIVERLEVEL" },
    "waterLevel": [
      { "id": 5002, "recordedAt": "2026-05-04T09:00:00.000Z", "createdAt": "2026-05-04T09:00:05.000Z", "value": 101.5 }
    ]
  }
}`,
    },
    errorExamples: [],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `const stationId = 'st_abc123';
const variable = 'calculatedWaterLevel';
const params = new URLSearchParams({ skip: '0', take: '500', startDate: '2026-05-01', endDate: '2026-05-04' });
await fetch(\`https://api.kloudtechsea.com/api/v1/water-level/station/\${stationId}/history/\${variable}?\${params}\`, {
  headers: { 'x-kloudtrack-key': 'YOUR_API_KEY_HERE' },
}).then((r) => r.json());`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -sG "https://api.kloudtechsea.com/api/v1/water-level/station/st_abc123/history/calculatedWaterLevel" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE" 
  --data-urlencode "take=100" 
  --data-urlencode "startDate=2026-05-01" 
  --data-urlencode "endDate=2026-05-04"`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // RAIN GAUGE — GET /rain-gauge/dashboard
  // ─────────────────────────────────────────────────────────────
  {
    id: 11,
    title: "Get Rain Gauge Dashboard Stations",
    description:
      "Returns stations your user can read that participate in rain gauge data, each paired with the latest RainGaugeReading or null when no tips have been recorded yet.",
    purpose:
      "Rainfall overview widgets and alerting across many sites in one round trip.",
    method: "GET",
    path: "/rain-gauge/dashboard",
    version: "v1",
    lastUpdated: "May 4, 2026",
    headers: [
      {
        key: "x-kloudtrack-key",
        required: true,
        description: "API key; organization-scoped station list.",
      },
    ],
    parameters: [],
    pathParams: [],
    statusCodes: [{ code: 200, label: "OK", description: "Array of { station, rainGauge }." }],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "`rainGauge` contains: id, recordedAt, tips, mmPerTip, calculatedMm (mm in the bucket when mmPerTip is known).",
      "Station type is commonly RAINGAUGE or null for modular gauges.",
    ],
    successExample: {
      title: "200 OK",
      language: "json",
      code: `{
  "success": true,
  "message": "Rain gauge dashboard data retrieved successfully",
  "data": [
    {
      "station": {
        "id": "st_rain01",
        "stationName": "Rain site A",
        "stationType": "RAINGAUGE",
        "location": { "lat": 24.1, "lng": 120.6 },
        "address": "",
        "city": "Miaoli",
        "state": "",
        "country": "TW",
        "elevation": 120,
        "isActive": true,
        "activatedAt": "2026-02-01T00:00:00.000Z",
        "organizationId": 10,
        "organization": { "id": 10, "organizationName": "Demo Org" }
      },
      "rainGauge": {
        "id": 9001,
        "recordedAt": "2026-05-04T07:00:00.000Z",
        "tips": 3,
        "mmPerTip": 0.2,
        "calculatedMm": 0.6
      }
    }
  ]
}`,
    },
    errorExamples: [],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `await fetch('https://api.kloudtechsea.com/api/v1/rain-gauge/dashboard', {
  headers: { 'x-kloudtrack-key': 'YOUR_API_KEY_HERE' },
}).then((r) => r.json());`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -s "https://api.kloudtechsea.com/api/v1/rain-gauge/dashboard" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE"`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // RAIN GAUGE — GET /rain-gauge/record/{id}
  // ─────────────────────────────────────────────────────────────
  {
    id: 12,
    title: "Get Rain Gauge Record by ID",
    description:
      "Loads one rain gauge reading by numeric id (rain_gauge_reading_id). Includes station metadata.",
    purpose:
      "Deep links, audits, or reconciliation when you only store reading ids.",
    method: "GET",
    path: "/rain-gauge/record/{id}",
    version: "v1",
    lastUpdated: "May 4, 2026",
    headers: [{ key: "x-kloudtrack-key", required: true, description: "API key with read access." }],
    parameters: [],
    pathParams: [{ param: "id", description: "Numeric reading id (e.g. 9001)." }],
    statusCodes: [
      { code: 200, label: "OK", description: "{ station, rainGauge }." },
      { code: 404, label: "Not Found", description: "Unknown id or no access." },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "If the server returns extra fields on `rainGauge` (e.g. createdAt) treat them as additive; always read tips/mmPerTip/calculatedMm as primary.",
    ],
    successExample: {
      title: "200 OK",
      language: "json",
      code: `{
  "success": true,
  "message": "Rain gauge reading retrieved successfully",
  "data": {
    "station": { "id": "st_rain01", "stationName": "Rain site A", "stationType": "RAINGAUGE" },
    "rainGauge": {
      "id": 9001,
      "recordedAt": "2026-05-04T07:00:00.000Z",
      "tips": 3,
      "mmPerTip": 0.2,
      "calculatedMm": 0.6
    }
  }
}`,
    },
    errorExamples: [],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `await fetch('https://api.kloudtechsea.com/api/v1/rain-gauge/record/9001', {
  headers: { 'x-kloudtrack-key': 'YOUR_API_KEY_HERE' },
}).then((r) => r.json());`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -s "https://api.kloudtechsea.com/api/v1/rain-gauge/record/9001" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE"`,
    },
  },

  // ──────────────────────────────────────────────────────────────
  // RAIN GAUGE — GET /rain-gauge/station/{stationId}/current
  // ─────────────────────────────────────────────────────────────
  {
    id: 13,
    title: "Get Latest Rain Gauge Reading for a Station",
    description: "Most recent rain gauge row for the station hashid. 404 if no readings exist.",
    purpose: "Single-site rainfall widgets and current intensity checks.",
    method: "GET",
    path: "/rain-gauge/station/{stationId}/current",
    version: "v1",
    lastUpdated: "May 4, 2026",
    headers: [{ key: "x-kloudtrack-key", required: true, description: "API key with read access." }],
    parameters: [],
    pathParams: [{ param: "stationId", description: "Station hashid." }],
    statusCodes: [
      { code: 200, label: "OK", description: "{ station, rainGauge }." },
      { code: 404, label: "Not Found", description: "No rain gauge data for this station." },
    ],
    rateLimit: "20 requests per minute per account",
    usageNotes: ["`calculatedMm` is null when `mmPerTip` is not configured for the station."],
    successExample: {
      title: "200 OK",
      language: "json",
      code: `{
  "success": true,
  "message": "Current rain gauge data retrieved successfully",
  "data": {
    "station": { "id": "st_rain01", "stationName": "Rain site A" },
    "rainGauge": { "id": 9001, "recordedAt": "2026-05-04T07:00:00.000Z", "tips": 3, "mmPerTip": 0.2, "calculatedMm": 0.6 }
  }
}`,
    },
    errorExamples: [],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `await fetch('https://api.kloudtechsea.com/api/v1/rain-gauge/station/st_rain01/current', {
  headers: { 'x-kloudtrack-key': 'YOUR_API_KEY_HERE' },
}).then((r) => r.json());`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -s "https://api.kloudtechsea.com/api/v1/rain-gauge/station/st_rain01/current" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE"`,
    },
  },

  // ──────────────────────────────────────────────────────────────
  // RAIN GAUGE — GET /rain-gauge/station/{stationId}/history
  // ─────────────────────────────────────────────────────────────
  {
    id: 14,
    title: "Get Rain Gauge History for a Station",
    description:
      "Time series of rain gauge readings (tips per interval) with optional aggregation and date window. Newest first.",
    purpose: "Charts and CSV exports of rainfall totals per reporting interval.",
    method: "GET",
    path: "/rain-gauge/station/{stationId}/history",
    version: "v1",
    lastUpdated: "May 4, 2026",
    headers: [{ key: "x-kloudtrack-key", required: true, description: "API key with read access." }],
    parameters: [
      { name: "skip", type: "number", required: false, description: "OFFSET. Default 0." },
      {
        name: "take",
        type: "number",
        required: false,
        description: "Use together with startDate/endDate to keep responses small.",
      },
      {
        name: "interval",
        type: "number",
        required: false,
        description: "Minutes: 1, 15, 30, 60, 180, 360, 720, 1440 — buckets sum tips per window.",
      },
      {
        name: "startDate",
        type: "string",
        required: false,
        description: "ISO inclusive start (recommended).",
      },
      { name: "endDate", type: "string", required: false, description: "ISO inclusive end (defaults to now)." },
    ],
    pathParams: [{ param: "stationId", description: "Station hashid." }],
    statusCodes: [{ code: 200, label: "OK", description: "{ station, rainGauge: RainGaugeReading[] }." }],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "With aggregation, each row represents summed tips (and derived mm using reference mmPerTip) inside the bucket.",
    ],
    successExample: {
      title: "200 OK",
      language: "json",
      code: `{
  "success": true,
  "message": "Rain gauge history retrieved successfully",
  "data": {
    "station": { "id": "st_rain01", "stationName": "Rain site A" },
    "rainGauge": [
      { "id": 9002, "recordedAt": "2026-05-04T08:00:00.000Z", "tips": 5, "mmPerTip": 0.2, "calculatedMm": 1.0 }
    ]
  }
}`,
    },
    errorExamples: [],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `const q = new URLSearchParams({ skip: '0', interval: '60', startDate: '2026-05-01', endDate: '2026-05-04' });
await fetch(\`https://api.kloudtechsea.com/api/v1/rain-gauge/station/st_rain01/history?\${q}\`, {
  headers: { 'x-kloudtrack-key': 'YOUR_API_KEY_HERE' },
}).then((r) => r.json());`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -sG "https://api.kloudtechsea.com/api/v1/rain-gauge/station/st_rain01/history" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE" 
  --data-urlencode "interval=60" 
  --data-urlencode "startDate=2026-05-01" 
  --data-urlencode "endDate=2026-05-04"`,
    },
  },

  // ──────────────────────────────────────────────────────────────
  // RAIN GAUGE — GET /rain-gauge/station/{stationId}/history/{variable}
  // ──────────────────────────────────────────────────────────────
  {
    id: 15,
    title: "Get Rain Gauge History for a Station (Single Variable)",
    description:
      "Returns `{ station, rainGauge }` where `rainGauge` is VariableReading[] for one metric. Allowed variables control whether you get raw tip counts or millimetres.",
    purpose: "Plot cumulative mm or tip rate without full reading objects.",
    method: "GET",
    path: "/rain-gauge/station/{stationId}/history/{variable}",
    version: "v1",
    lastUpdated: "May 4, 2026",
    headers: [{ key: "x-kloudtrack-key", required: true, description: "API key with read access." }],
    parameters: [
      { name: "skip", type: "number", required: false, description: "OFFSET. Default 0." },
      { name: "take", type: "number", required: false, description: "Default 10 when omitted." },
      { name: "interval", type: "number", required: false, description: "Allowed minute buckets same as full history." },
      { name: "startDate", type: "string", required: false, description: "ISO start." },
      { name: "endDate", type: "string", required: false, description: "ISO end." },
    ],
    pathParams: [
      { param: "stationId", description: "Station hashid." },
      {
        param: "variable",
        description:
          "One of: tips (raw tip count per row or SUM in bucket), mm (mm = tips × mmPerTip per row), calculatedMm (alias, aggregated mm in bucket), precipitation (same as mm in aggregated path).",
      },
    ],
    statusCodes: [{ code: 200, label: "OK", description: "{ station, rainGauge: VariableReading[] }." }],
    rateLimit: "20 requests per minute per account",
    usageNotes: [
      "Response key is `rainGauge` (parallel naming to water level's `waterLevel`).",
      "For variable `tips` without interval, value is the stored tip count for that row.",
    ],
    successExample: {
      title: "200 OK",
      language: "json",
      code: `{
  "success": true,
  "message": "Rain gauge history retrieved successfully",
  "data": {
    "station": { "id": "st_rain01", "stationName": "Rain site A" },
    "rainGauge": [
      { "id": 9002, "recordedAt": "2026-05-04T08:00:00.000Z", "createdAt": "2026-05-04T08:00:02.000Z", "value": 1.0 }
    ]
  }
}`,
    },
    errorExamples: [],
    jsRequest: {
      title: "JavaScript (fetch)",
      code: `const params = new URLSearchParams({ take: '200', startDate: '2026-05-01', endDate: '2026-05-04' });
await fetch(\`https://api.kloudtechsea.com/api/v1/rain-gauge/station/st_rain01/history/mm?\${params}\`, {
  headers: { 'x-kloudtrack-key': 'YOUR_API_KEY_HERE' },
}).then((r) => r.json());`,
    },
    curlRequest: {
      title: "cURL",
      code: `curl -sG "https://api.kloudtechsea.com/api/v1/rain-gauge/station/st_rain01/history/mm" 
  -H "x-kloudtrack-key: YOUR_API_KEY_HERE" 
  --data-urlencode "take=100"`,
    },
  },

];

export { endpoints };