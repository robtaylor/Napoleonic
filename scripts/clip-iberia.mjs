/**
 * clip-iberia.mjs
 *
 * Clips Natural Earth 1:50m GeoJSON datasets to the Iberian Peninsula
 * bounding box and writes minimal output files for the Phaser game.
 *
 * Usage: node scripts/clip-iberia.mjs
 *
 * Input:  /tmp/claude/ne_50m_*.geojson
 * Output: public/assets/maps/iberia-{land,borders,rivers}.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as turf from "@turf/turf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const TMP_DIR = "/tmp/claude";
const OUT_DIR = resolve(PROJECT_ROOT, "public/assets/maps");

// Iberian Peninsula bounding box: [west, south, east, north]
const IBERIA_BBOX = [-10.5, 35.5, 4.5, 44.0];

// Create the clipping polygon from the bounding box
const clipPoly = turf.bboxPolygon(IBERIA_BBOX);

mkdirSync(OUT_DIR, { recursive: true });

/**
 * Load a GeoJSON FeatureCollection from disk.
 */
function loadGeoJSON(filename) {
  const path = resolve(TMP_DIR, filename);
  console.log(`  Loading ${path}...`);
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

/**
 * Clip polygon/multipolygon features using turf.intersect so we get
 * actual geometry trimmed to the bounding box, not just features that
 * overlap.
 */
function clipPolygonFeatures(fc) {
  const clipped = [];
  for (const feature of fc.features) {
    const geomType = feature.geometry?.type;
    if (!geomType) continue;

    try {
      if (geomType === "Polygon") {
        const intersection = turf.intersect(
          turf.featureCollection([feature, clipPoly])
        );
        if (intersection) {
          intersection.properties = feature.properties;
          clipped.push(intersection);
        }
      } else if (geomType === "MultiPolygon") {
        // Process each polygon in the multi individually, then merge
        const parts = [];
        for (const coords of feature.geometry.coordinates) {
          const poly = turf.polygon(coords);
          const intersection = turf.intersect(
            turf.featureCollection([poly, clipPoly])
          );
          if (intersection) {
            parts.push(intersection);
          }
        }
        if (parts.length > 0) {
          // Combine all parts into a single feature
          if (parts.length === 1) {
            parts[0].properties = feature.properties;
            clipped.push(parts[0]);
          } else {
            // Merge into a MultiPolygon
            const coords = [];
            for (const p of parts) {
              if (p.geometry.type === "Polygon") {
                coords.push(p.geometry.coordinates);
              } else if (p.geometry.type === "MultiPolygon") {
                coords.push(...p.geometry.coordinates);
              }
            }
            clipped.push(turf.multiPolygon(coords, feature.properties));
          }
        }
      }
    } catch (err) {
      // Some features may fail clipping due to topology issues; skip them
      console.warn(`  Warning: skipping feature (${err.message})`);
    }
  }
  return turf.featureCollection(clipped);
}

/**
 * Clip line features (LineString/MultiLineString) using turf.bboxClip
 * which works well for line geometries.
 */
function clipLineFeatures(fc) {
  const clipped = [];
  for (const feature of fc.features) {
    const geomType = feature.geometry?.type;
    if (!geomType) continue;

    try {
      const clippedFeature = turf.bboxClip(feature, IBERIA_BBOX);
      // bboxClip returns the feature even if empty; check for coordinates
      const coords = clippedFeature.geometry?.coordinates;
      if (!coords || coords.length === 0) continue;

      // For MultiLineString, filter out empty sub-lines
      if (clippedFeature.geometry.type === "MultiLineString") {
        const nonEmpty = coords.filter((line) => line.length >= 2);
        if (nonEmpty.length === 0) continue;
        clippedFeature.geometry.coordinates = nonEmpty;
      } else if (
        clippedFeature.geometry.type === "LineString" &&
        coords.length < 2
      ) {
        continue;
      }

      clippedFeature.properties = feature.properties;
      clipped.push(clippedFeature);
    } catch (err) {
      console.warn(`  Warning: skipping line feature (${err.message})`);
    }
  }
  return turf.featureCollection(clipped);
}

/**
 * Strip unnecessary properties to keep output files small.
 * Keep only a minimal set of identifying properties.
 */
function stripProperties(fc, keepKeys) {
  for (const feature of fc.features) {
    if (!feature.properties) continue;
    const stripped = {};
    for (const key of keepKeys) {
      if (feature.properties[key] !== undefined) {
        stripped[key] = feature.properties[key];
      }
    }
    feature.properties = stripped;
  }
  return fc;
}

/**
 * Round all coordinates to the given number of decimal places
 * to reduce file size. 4 decimals gives ~11m precision, plenty
 * for a game map.
 */
function roundCoordinates(fc, decimals = 4) {
  const factor = 10 ** decimals;
  function roundCoord(coord) {
    if (typeof coord[0] === "number") {
      return coord.map((v) => Math.round(v * factor) / factor);
    }
    return coord.map(roundCoord);
  }
  for (const feature of fc.features) {
    feature.geometry.coordinates = roundCoord(feature.geometry.coordinates);
  }
  return fc;
}

function saveGeoJSON(fc, filename) {
  const outPath = resolve(OUT_DIR, filename);
  const json = JSON.stringify(fc);
  writeFileSync(outPath, json, "utf-8");
  const sizeKB = (Buffer.byteLength(json, "utf-8") / 1024).toFixed(1);
  console.log(`  Saved ${outPath} (${sizeKB} KB, ${fc.features.length} features)`);
}

// ── Land / Coastline ────────────────────────────────────────────────
console.log("\n[1/3] Clipping land polygons...");
const land = loadGeoJSON("ne_50m_land.geojson");
let ibLand = clipPolygonFeatures(land);
ibLand = stripProperties(ibLand, []);
ibLand = roundCoordinates(ibLand);
saveGeoJSON(ibLand, "iberia-land.json");

// ── Country borders ─────────────────────────────────────────────────
console.log("\n[2/3] Clipping country borders...");
const countries = loadGeoJSON("ne_50m_admin_0_countries.geojson");

// First filter to only countries that overlap the Iberian Peninsula
// to speed up clipping (avoid clipping all 242 countries)
const ibCountries = {
  type: "FeatureCollection",
  features: countries.features.filter((f) => {
    try {
      const bbox = turf.bbox(f);
      // Quick AABB overlap check
      return !(
        bbox[2] < IBERIA_BBOX[0] ||
        bbox[0] > IBERIA_BBOX[2] ||
        bbox[3] < IBERIA_BBOX[1] ||
        bbox[1] > IBERIA_BBOX[3]
      );
    } catch {
      return false;
    }
  }),
};

console.log(
  `  Pre-filtered to ${ibCountries.features.length} candidate countries`
);
let ibBorders = clipPolygonFeatures(ibCountries);
ibBorders = stripProperties(ibBorders, [
  "NAME",
  "NAME_LONG",
  "ISO_A2",
  "ISO_A3",
  "SOVEREIGNT",
]);
ibBorders = roundCoordinates(ibBorders);
saveGeoJSON(ibBorders, "iberia-borders.json");

// ── Rivers ──────────────────────────────────────────────────────────
console.log("\n[3/3] Clipping rivers...");
const rivers = loadGeoJSON("ne_50m_rivers_lake_centerlines.geojson");
let ibRivers = clipLineFeatures(rivers);
ibRivers = stripProperties(ibRivers, ["name", "name_en", "scalerank", "strokeweig"]);
ibRivers = roundCoordinates(ibRivers);
saveGeoJSON(ibRivers, "iberia-rivers.json");

console.log("\nDone! All files written to:", OUT_DIR);
