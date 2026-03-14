/**
 * Generates terrain bitmap and edge waypoints for the Iberian Peninsula.
 *
 * Fetches real elevation data from AWS Terrain Tiles (Terrarium format),
 * renders a topographic PNG, and computes A* edge waypoints.
 *
 * Run with: npx tsx scripts/generate-terrain.ts
 *
 * Outputs:
 *   - public/assets/maps/iberia-terrain.png     (colored topographic bitmap)
 *   - public/assets/maps/iberia-elevation.json   (elevation grid for A* pathfinding)
 *   - src/data/edge-waypoints.ts                 (routed waypoints per edge)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

// ─── Constants ───

const IBERIA_BOUNDS = {
    minLng: -10.5,
    maxLng: 4.5,
    minLat: 35.5,
    maxLat: 44.0,
};

// AWS Terrain Tiles (Terrarium format, free, no auth)
const TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
const ZOOM = 7;
const TILE_SIZE = 256;

// Output elevation grid for A* (lower res than the bitmap)
const GRID_COLS = 300;
const GRID_ROWS = 170;

// Topographic color palette (green lowlands → yellow → brown peaks)
const PALETTE: { elevation: number; color: [number, number, number] }[] = [
    { elevation: 0, color: [90, 165, 40] },        // #5AA528
    { elevation: 150, color: [145, 185, 60] },      // #91B93C
    { elevation: 300, color: [175, 200, 80] },      // #AFC850
    { elevation: 500, color: [255, 215, 135] },     // #FFD787
    { elevation: 700, color: [245, 170, 90] },      // #F5AA5A
    { elevation: 1000, color: [175, 120, 70] },     // #AF7846
    { elevation: 1500, color: [125, 85, 40] },      // #7D5528
    { elevation: 2500, color: [110, 70, 25] },      // #6E4619
];

// ─── Edges & Nodes (mirrored from src/data/) ───

const EDGES: [string, string][] = [
    ["lisbon", "torres-vedras"], ["lisbon", "elvas"],
    ["torres-vedras", "coimbra"], ["torres-vedras", "figueira"],
    ["coimbra", "figueira"], ["coimbra", "porto"], ["coimbra", "almeida"],
    ["porto", "figueira"], ["elvas", "badajoz"],
    ["almeida", "ciudad-rodrigo"], ["porto", "vigo"], ["elvas", "lisbon"],
    ["san-sebastian", "pamplona"], ["san-sebastian", "bilbao"],
    ["pamplona", "vitoria"], ["pamplona", "zaragoza"],
    ["vitoria", "bilbao"], ["vitoria", "burgos"],
    ["burgos", "valladolid"], ["burgos", "madrid"],
    ["barcelona", "tarragona"], ["tarragona", "tortosa"],
    ["tortosa", "valencia"], ["zaragoza", "tarragona"],
    ["zaragoza", "tortosa"], ["barcelona", "zaragoza"],
    ["madrid", "valladolid"], ["madrid", "talavera"],
    ["madrid", "zaragoza"], ["madrid", "valencia"],
    ["talavera", "salamanca"], ["salamanca", "valladolid"],
    ["salamanca", "ciudad-rodrigo"], ["talavera", "cordoba"],
    ["cordoba", "seville"], ["cordoba", "bailen"], ["cordoba", "granada"],
    ["seville", "cadiz"], ["seville", "badajoz"],
    ["bailen", "granada"], ["bailen", "madrid"], ["granada", "valencia"],
    ["la-coruna", "vigo"], ["la-coruna", "porto"], ["vigo", "porto"],
    ["badajoz", "ciudad-rodrigo"], ["valencia", "tarragona"],
];

const NODES: Record<string, { lat: number; lng: number }> = {
    lisbon: { lat: 38.7223, lng: -9.1393 },
    porto: { lat: 41.1579, lng: -8.6291 },
    coimbra: { lat: 40.2033, lng: -8.4103 },
    "torres-vedras": { lat: 39.0918, lng: -9.2586 },
    almeida: { lat: 40.7264, lng: -6.9064 },
    elvas: { lat: 38.881, lng: -7.163 },
    figueira: { lat: 40.1508, lng: -8.8618 },
    madrid: { lat: 40.4168, lng: -3.7038 },
    barcelona: { lat: 41.3874, lng: 2.1686 },
    burgos: { lat: 42.344, lng: -3.6969 },
    pamplona: { lat: 42.8125, lng: -1.6458 },
    "san-sebastian": { lat: 43.3183, lng: -1.9812 },
    vitoria: { lat: 42.8467, lng: -2.6726 },
    valladolid: { lat: 41.6523, lng: -4.7245 },
    zaragoza: { lat: 41.6488, lng: -0.8891 },
    tarragona: { lat: 41.1189, lng: 1.2445 },
    tortosa: { lat: 40.8126, lng: 0.5216 },
    seville: { lat: 37.3891, lng: -5.9845 },
    cadiz: { lat: 36.5271, lng: -6.2886 },
    valencia: { lat: 39.4699, lng: -0.3763 },
    badajoz: { lat: 38.8794, lng: -6.9707 },
    "ciudad-rodrigo": { lat: 40.599, lng: -6.5316 },
    salamanca: { lat: 40.9701, lng: -5.6635 },
    talavera: { lat: 39.9635, lng: -4.8309 },
    cordoba: { lat: 37.8882, lng: -4.7794 },
    granada: { lat: 37.1773, lng: -3.5986 },
    "la-coruna": { lat: 43.3623, lng: -8.4115 },
    vigo: { lat: 42.2328, lng: -8.7226 },
    bailen: { lat: 38.0932, lng: -3.7754 },
    bilbao: { lat: 43.263, lng: -2.935 },
};

// ─── Tile math (Web Mercator) ───

function lngToTileX(lng: number, z: number): number {
    return Math.floor(((lng + 180) / 360) * (1 << z));
}

function latToTileY(lat: number, z: number): number {
    const latRad = (lat * Math.PI) / 180;
    return Math.floor(
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * (1 << z),
    );
}

/** Get the lng/lat bounds of a tile */
function tileBounds(x: number, y: number, z: number): { minLng: number; maxLng: number; minLat: number; maxLat: number } {
    const n = 1 << z;
    const minLng = (x / n) * 360 - 180;
    const maxLng = ((x + 1) / n) * 360 - 180;
    const maxLat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
    const minLat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
    return { minLng, maxLng, minLat, maxLat };
}

// ─── Fetch terrain tiles ───

interface ElevationGrid {
    width: number;
    height: number;
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
    data: Float32Array;
}

async function fetchTerrainTiles(): Promise<ElevationGrid> {
    const xMin = lngToTileX(IBERIA_BOUNDS.minLng, ZOOM);
    const xMax = lngToTileX(IBERIA_BOUNDS.maxLng, ZOOM);
    const yMin = latToTileY(IBERIA_BOUNDS.maxLat, ZOOM); // Note: y is inverted
    const yMax = latToTileY(IBERIA_BOUNDS.minLat, ZOOM);

    const tilesX = xMax - xMin + 1;
    const tilesY = yMax - yMin + 1;
    const totalWidth = tilesX * TILE_SIZE;
    const totalHeight = tilesY * TILE_SIZE;

    console.log(`Fetching ${tilesX}×${tilesY} = ${tilesX * tilesY} terrain tiles at zoom ${ZOOM}...`);

    // The stitched grid bounds (in tile coordinates)
    const gridBounds = {
        minLng: tileBounds(xMin, yMin, ZOOM).minLng,
        maxLng: tileBounds(xMax, yMin, ZOOM).maxLng,
        maxLat: tileBounds(xMin, yMin, ZOOM).maxLat,
        minLat: tileBounds(xMin, yMax, ZOOM).minLat,
    };

    const elevData = new Float32Array(totalWidth * totalHeight);

    for (let ty = yMin; ty <= yMax; ty++) {
        for (let tx = xMin; tx <= xMax; tx++) {
            const url = `${TILE_URL}/${ZOOM}/${tx}/${ty}.png`;
            let buffer: Buffer;

            let retries = 3;
            while (retries > 0) {
                try {
                    const resp = await fetch(url);
                    if (!resp.ok) throw new Error(`HTTP ${resp.status} for tile ${tx},${ty}`);
                    buffer = Buffer.from(await resp.arrayBuffer());
                    break;
                } catch (err) {
                    retries--;
                    if (retries === 0) throw err;
                    console.log(`  Retry tile ${tx},${ty}: ${err}`);
                    await new Promise((r) => setTimeout(r, 1000));
                }
            }

            // Decode PNG to raw RGBA pixels
            const { data: pixels, info } = await sharp(buffer!)
                .raw()
                .toBuffer({ resolveWithObject: true });

            const channels = info.channels;
            const offsetX = (tx - xMin) * TILE_SIZE;
            const offsetY = (ty - yMin) * TILE_SIZE;

            for (let py = 0; py < TILE_SIZE; py++) {
                for (let px = 0; px < TILE_SIZE; px++) {
                    const srcIdx = (py * TILE_SIZE + px) * channels;
                    const r = pixels[srcIdx]!;
                    const g = pixels[srcIdx + 1]!;
                    const b = pixels[srcIdx + 2]!;

                    // Terrarium format: elevation = (R * 256 + G + B / 256) - 32768
                    const elevation = r * 256 + g + b / 256 - 32768;

                    const dstIdx = (offsetY + py) * totalWidth + (offsetX + px);
                    elevData[dstIdx] = elevation; // Keep raw (negative = ocean)
                }
            }
        }
    }

    console.log(`  Stitched ${totalWidth}×${totalHeight} elevation grid`);

    return {
        width: totalWidth,
        height: totalHeight,
        ...gridBounds,
        data: elevData,
    };
}

// ─── Color mapping ───

// Ocean color palette (deeper = darker blue)
const OCEAN_COLOR_SHALLOW: [number, number, number] = [90, 130, 170];  // coastal shelf
const OCEAN_COLOR_DEEP: [number, number, number] = [50, 85, 130];      // deep ocean

function elevationToColor(elevation: number): [number, number, number] {
    // Ocean: elevation <= 0
    if (elevation <= 0) {
        // Interpolate between shallow and deep based on depth
        const depth = Math.min(Math.abs(elevation), 4000);
        const t = Math.min(depth / 2000, 1); // normalize to 0-1
        return [
            Math.round(OCEAN_COLOR_SHALLOW[0] + t * (OCEAN_COLOR_DEEP[0] - OCEAN_COLOR_SHALLOW[0])),
            Math.round(OCEAN_COLOR_SHALLOW[1] + t * (OCEAN_COLOR_DEEP[1] - OCEAN_COLOR_SHALLOW[1])),
            Math.round(OCEAN_COLOR_SHALLOW[2] + t * (OCEAN_COLOR_DEEP[2] - OCEAN_COLOR_SHALLOW[2])),
        ];
    }
    if (elevation <= PALETTE[0]!.elevation) return PALETTE[0]!.color;
    const last = PALETTE[PALETTE.length - 1]!;
    if (elevation >= last.elevation) return last.color;

    for (let i = 0; i < PALETTE.length - 1; i++) {
        const lo = PALETTE[i]!;
        const hi = PALETTE[i + 1]!;
        if (elevation >= lo.elevation && elevation <= hi.elevation) {
            const t = (elevation - lo.elevation) / (hi.elevation - lo.elevation);
            return [
                Math.round(lo.color[0] + t * (hi.color[0] - lo.color[0])),
                Math.round(lo.color[1] + t * (hi.color[1] - lo.color[1])),
                Math.round(lo.color[2] + t * (hi.color[2] - lo.color[2])),
            ];
        }
    }
    return PALETTE[0]!.color;
}

// ─── Render terrain PNG ───

async function renderTerrainPNG(grid: ElevationGrid, outPath: string): Promise<void> {
    const { width, height, data } = grid;
    const pixels = Buffer.alloc(width * height * 3);

    for (let i = 0; i < width * height; i++) {
        const elev = data[i]!;
        const [r, g, b] = elevationToColor(elev);
        pixels[i * 3] = r;
        pixels[i * 3 + 1] = g;
        pixels[i * 3 + 2] = b;
    }

    await sharp(pixels, { raw: { width, height, channels: 3 } })
        .png()
        .toFile(outPath);

    const size = fs.statSync(outPath).size;
    console.log(`Wrote terrain PNG: ${outPath} (${(size / 1024).toFixed(0)} KB)`);
}

// ─── Downsample elevation for A* grid ───

function downsampleGrid(grid: ElevationGrid): number[] {
    const result = new Array<number>(GRID_COLS * GRID_ROWS);

    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            // Map grid cell to lat/lng
            const lng = IBERIA_BOUNDS.minLng + (col / (GRID_COLS - 1)) * (IBERIA_BOUNDS.maxLng - IBERIA_BOUNDS.minLng);
            const lat = IBERIA_BOUNDS.maxLat - (row / (GRID_ROWS - 1)) * (IBERIA_BOUNDS.maxLat - IBERIA_BOUNDS.minLat);

            // Map lat/lng to pixel in the stitched grid
            const px = ((lng - grid.minLng) / (grid.maxLng - grid.minLng)) * (grid.width - 1);
            const py = ((grid.maxLat - lat) / (grid.maxLat - grid.minLat)) * (grid.height - 1);

            // Bilinear sample
            const x0 = Math.floor(px);
            const y0 = Math.floor(py);
            const x1 = Math.min(x0 + 1, grid.width - 1);
            const y1 = Math.min(y0 + 1, grid.height - 1);
            const fx = px - x0;
            const fy = py - y0;

            const v00 = grid.data[y0 * grid.width + x0]!;
            const v10 = grid.data[y1 * grid.width + x0]!;
            const v01 = grid.data[y0 * grid.width + x1]!;
            const v11 = grid.data[y1 * grid.width + x1]!;

            const sampled = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
            result[row * GRID_COLS + col] = Math.round(Math.max(0, sampled));
        }
    }

    return result;
}

// ─── A* pathfinding ───

function astarPath(data: number[], cols: number, rows: number, startRow: number, startCol: number, endRow: number, endCol: number): [number, number][] {
    const sr = Math.round(startRow);
    const sc = Math.round(startCol);
    const er = Math.round(endRow);
    const ec = Math.round(endCol);

    interface Node { r: number; c: number; g: number; f: number }

    const key = (r: number, c: number) => r * cols + c;
    const cameFrom = new Map<number, number>();
    const gScore = new Map<number, number>();

    const heuristic = (r: number, c: number) => Math.sqrt((r - er) ** 2 + (c - ec) ** 2);

    gScore.set(key(sr, sc), 0);
    const openSet: Node[] = [{ r: sr, c: sc, g: 0, f: heuristic(sr, sc) }];
    const closedSet = new Set<number>();

    const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

    while (openSet.length > 0) {
        let minIdx = 0;
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i]!.f < openSet[minIdx]!.f) minIdx = i;
        }
        const current = openSet[minIdx]!;
        openSet.splice(minIdx, 1);

        const ck = key(current.r, current.c);
        if (current.r === er && current.c === ec) {
            const pathResult: [number, number][] = [];
            let k = ck;
            while (k !== undefined) {
                pathResult.unshift([Math.floor(k / cols), k % cols]);
                const prev = cameFrom.get(k);
                if (prev === undefined) break;
                k = prev;
            }
            return pathResult;
        }

        closedSet.add(ck);

        for (const [dr, dc] of dirs) {
            const nr = current.r + dr!;
            const nc = current.c + dc!;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

            const nk = key(nr, nc);
            if (closedSet.has(nk)) continue;

            const dist = dr !== 0 && dc !== 0 ? 1.414 : 1.0;
            const elevChange = Math.abs((data[nk] ?? 0) - (data[ck] ?? 0));
            const cost = dist * (1 + 3.0 * elevChange / 100);
            const tentativeG = current.g + cost;

            if ((gScore.get(nk) ?? Infinity) <= tentativeG) continue;

            gScore.set(nk, tentativeG);
            cameFrom.set(nk, ck);

            const f = tentativeG + heuristic(nr, nc);
            const existing = openSet.findIndex((n) => n.r === nr && n.c === nc);
            if (existing >= 0) {
                openSet[existing] = { r: nr, c: nc, g: tentativeG, f };
            } else {
                openSet.push({ r: nr, c: nc, g: tentativeG, f });
            }
        }
    }

    return [[sr, sc], [er, ec]];
}

// ─── Douglas-Peucker simplification ───

function perpDist(p: [number, number], a: [number, number], b: [number, number]): number {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
    return Math.sqrt((p[0] - (a[0] + t * dx)) ** 2 + (p[1] - (a[1] + t * dy)) ** 2);
}

function douglasPeucker(points: [number, number][], epsilon: number): [number, number][] {
    if (points.length <= 2) return points;
    let maxDist = 0, maxIdx = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const d = perpDist(points[i]!, points[0]!, points[points.length - 1]!);
        if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > epsilon) {
        const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
        const right = douglasPeucker(points.slice(maxIdx), epsilon);
        return [...left.slice(0, -1), ...right];
    }
    return [points[0]!, points[points.length - 1]!];
}

// ─── Edge waypoint computation ───

function gridToLatLng(row: number, col: number): [number, number] {
    const lng = IBERIA_BOUNDS.minLng + (col / (GRID_COLS - 1)) * (IBERIA_BOUNDS.maxLng - IBERIA_BOUNDS.minLng);
    const lat = IBERIA_BOUNDS.maxLat - (row / (GRID_ROWS - 1)) * (IBERIA_BOUNDS.maxLat - IBERIA_BOUNDS.minLat);
    return [lat, lng];
}

function latLngToGrid(lat: number, lng: number): [number, number] {
    const col = ((lng - IBERIA_BOUNDS.minLng) / (IBERIA_BOUNDS.maxLng - IBERIA_BOUNDS.minLng)) * (GRID_COLS - 1);
    const row = ((IBERIA_BOUNDS.maxLat - lat) / (IBERIA_BOUNDS.maxLat - IBERIA_BOUNDS.minLat)) * (GRID_ROWS - 1);
    return [row, col];
}

function computeEdgeWaypoints(data: number[]): Record<string, [number, number][]> {
    const result: Record<string, [number, number][]> = {};

    for (const [fromId, toId] of EDGES) {
        const fromNode = NODES[fromId];
        const toNode = NODES[toId];
        if (!fromNode || !toNode) continue;

        const [startRow, startCol] = latLngToGrid(fromNode.lat, fromNode.lng);
        const [endRow, endCol] = latLngToGrid(toNode.lat, toNode.lng);

        const gridPath = astarPath(data, GRID_COLS, GRID_ROWS, startRow, startCol, endRow, endCol);

        const latlngPath: [number, number][] = gridPath.map(([r, c]) => {
            const [lat, lng] = gridToLatLng(r, c);
            return [lng, lat];
        });

        const simplified = douglasPeucker(latlngPath, 0.08);
        const waypoints = simplified.slice(1, -1);
        result[`${fromId}|${toId}`] = waypoints;
    }

    return result;
}

// ─── Main ───

async function main() {
    const projectRoot = path.resolve(import.meta.dirname ?? ".", "..");
    const terrainPngPath = path.join(projectRoot, "public/assets/maps/iberia-terrain.png");
    const elevationJsonPath = path.join(projectRoot, "public/assets/maps/iberia-elevation.json");
    const waypointsPath = path.join(projectRoot, "src/data/edge-waypoints.ts");

    // 1. Fetch real elevation data from terrain tiles
    const grid = await fetchTerrainTiles();

    let maxElev = 0;
    for (let i = 0; i < grid.data.length; i++) maxElev = Math.max(maxElev, grid.data[i]!);
    console.log(`  Max elevation: ${maxElev.toFixed(0)}m`);

    // 2. Render colored terrain PNG and save metadata
    await renderTerrainPNG(grid, terrainPngPath);

    // Save terrain metadata for reprojection in the game
    const terrainMetaPath = path.join(projectRoot, "public/assets/maps/iberia-terrain-meta.json");
    fs.writeFileSync(terrainMetaPath, JSON.stringify({
        width: grid.width,
        height: grid.height,
        minLng: grid.minLng,
        maxLng: grid.maxLng,
        minLat: grid.minLat,
        maxLat: grid.maxLat,
    }));
    console.log(`Wrote terrain metadata: ${terrainMetaPath}`);

    // 3. Downsample to A* grid and save elevation JSON
    console.log(`Downsampling to ${GRID_COLS}×${GRID_ROWS} A* grid...`);
    const astarGrid = downsampleGrid(grid);

    const elevationJson = {
        cols: GRID_COLS,
        rows: GRID_ROWS,
        bounds: IBERIA_BOUNDS,
        data: astarGrid,
    };
    fs.writeFileSync(elevationJsonPath, JSON.stringify(elevationJson));
    console.log(`Wrote elevation JSON: ${elevationJsonPath} (${(fs.statSync(elevationJsonPath).size / 1024).toFixed(0)} KB)`);

    // 4. Compute edge waypoints using A* on the elevation grid
    console.log("Computing edge waypoints with A* pathfinding...");
    const waypoints = computeEdgeWaypoints(astarGrid);

    const withWaypoints = Object.values(waypoints).filter((w) => w.length > 0).length;
    console.log(`${withWaypoints}/${EDGES.length} edges have intermediate waypoints`);

    const lines = [
        "// Auto-generated by scripts/generate-terrain.ts — do not edit",
        "// Each key is \"fromId|toId\", values are intermediate [lng, lat] waypoints",
        "",
        "export const EDGE_WAYPOINTS: Record<string, [number, number][]> = {",
    ];
    for (const [key, wps] of Object.entries(waypoints)) {
        if (wps.length === 0) continue;
        const wpStr = wps.map(([lng, lat]) => `[${lng.toFixed(4)}, ${lat.toFixed(4)}]`).join(", ");
        lines.push(`    "${key}": [${wpStr}],`);
    }
    lines.push("};");
    lines.push("");
    fs.writeFileSync(waypointsPath, lines.join("\n"));
    console.log(`Wrote edge waypoints: ${waypointsPath}`);
    console.log("Done!");
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
