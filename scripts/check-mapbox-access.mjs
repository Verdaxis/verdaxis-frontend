// Light/Dark v11 share this Mapbox composite source. Style JSON alone does not prove tile access.
const source = 'mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2,mapbox.mapbox-bathymetry-v2';
const token = process.env.VITE_MAPBOX_PUBLIC_TOKEN;
if (!token?.startsWith('pk.')) throw new Error('A public VITE_MAPBOX_PUBLIC_TOKEN is required');

for (const origin of ['https://staging.verdaxis.exchange/', 'https://app.verdaxis.exchange/']) {
  for (const resource of [`${source}.json?secure&`, `${source}/2/2/1.vector.pbf?`]) {
    const response = await fetch(`https://api.mapbox.com/v4/${resource}access_token=${encodeURIComponent(token)}`, {
      headers: { Referer: origin },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Mapbox tile access failed for ${origin}: HTTP ${response.status}`);
    if (!(await response.arrayBuffer()).byteLength) throw new Error(`Mapbox returned an empty tile response for ${origin}`);
  }
  console.log(`Mapbox TileJSON and vector tile access passed: ${origin}`);
}
