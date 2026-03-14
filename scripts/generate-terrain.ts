/**
 * Generates elevation data and edge waypoints for the Iberian Peninsula map.
 *
 * Uses synthetic elevation based on known Iberian topography
 * (Pyrenees, Meseta Central, Sierra Nevada, etc.) to avoid API rate limits.
 *
 * Run with: npx tsx scripts/generate-terrain.ts
 *
 * Outputs:
 *   - public/assets/maps/iberia-elevation.json  (elevation grid)
 *   - src/data/edge-waypoints.ts                (A* routed waypoints per edge)
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─── Constants (mirrored from src/config/constants.ts) ───

const IBERIA_BOUNDS = {
    minLng: -10.5,
    maxLng: 4.5,
    minLat: 35.5,
    maxLat: 44.0,
};

const COLS = 450;
const ROWS = 360;

// ─── Edges (mirrored from src/data/edges.ts) ───

const EDGES: [string, string][] = [
    ["lisbon", "torres-vedras"],
    ["lisbon", "elvas"],
    ["torres-vedras", "coimbra"],
    ["torres-vedras", "figueira"],
    ["coimbra", "figueira"],
    ["coimbra", "porto"],
    ["coimbra", "almeida"],
    ["porto", "figueira"],
    ["elvas", "badajoz"],
    ["almeida", "ciudad-rodrigo"],
    ["porto", "vigo"],
    ["elvas", "lisbon"],
    ["san-sebastian", "pamplona"],
    ["san-sebastian", "bilbao"],
    ["pamplona", "vitoria"],
    ["pamplona", "zaragoza"],
    ["vitoria", "bilbao"],
    ["vitoria", "burgos"],
    ["burgos", "valladolid"],
    ["burgos", "madrid"],
    ["barcelona", "tarragona"],
    ["tarragona", "tortosa"],
    ["tortosa", "valencia"],
    ["zaragoza", "tarragona"],
    ["zaragoza", "tortosa"],
    ["barcelona", "zaragoza"],
    ["madrid", "valladolid"],
    ["madrid", "talavera"],
    ["madrid", "zaragoza"],
    ["madrid", "valencia"],
    ["talavera", "salamanca"],
    ["salamanca", "valladolid"],
    ["salamanca", "ciudad-rodrigo"],
    ["talavera", "cordoba"],
    ["cordoba", "seville"],
    ["cordoba", "bailen"],
    ["cordoba", "granada"],
    ["seville", "cadiz"],
    ["seville", "badajoz"],
    ["bailen", "granada"],
    ["bailen", "madrid"],
    ["granada", "valencia"],
    ["la-coruna", "vigo"],
    ["la-coruna", "porto"],
    ["vigo", "porto"],
    ["badajoz", "ciudad-rodrigo"],
    ["valencia", "tarragona"],
];

// ─── Nodes (mirrored from src/data/nodes.ts) ───

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

// ─── Synthetic elevation generation ───

/** Gaussian-like bell function */
function bell(x: number, center: number, sigma: number): number {
    const d = (x - center) / sigma;
    return Math.exp(-0.5 * d * d);
}

/** 2D Gaussian peak at (cLng, cLat) with given sigma and height */
function peak(lng: number, lat: number, cLng: number, cLat: number, sigmaLng: number, sigmaLat: number, height: number): number {
    return height * bell(lng, cLng, sigmaLng) * bell(lat, cLat, sigmaLat);
}

/** Ridge: elevation along a line segment with falloff perpendicular to it */
function ridge(lng: number, lat: number, lng1: number, lat1: number, lng2: number, lat2: number, width: number, height: number): number {
    const dx = lng2 - lng1;
    const dy = lat2 - lat1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return peak(lng, lat, lng1, lat1, width, width, height);
    const t = Math.max(0, Math.min(1, ((lng - lng1) * dx + (lat - lat1) * dy) / lenSq));
    const nearLng = lng1 + t * dx;
    const nearLat = lat1 + t * dy;
    const dist = Math.sqrt((lng - nearLng) ** 2 + (lat - nearLat) ** 2);
    return height * Math.exp(-0.5 * (dist / width) ** 2);
}

/**
 * Generate synthetic elevation for a point based on known Iberian topography.
 * Returns elevation in meters.
 */
function syntheticElevation(lng: number, lat: number): number {
    let elev = 0;

    // === Meseta Central (broad central plateau ~650m) ===
    elev += peak(lng, lat, -3.5, 40.0, 4.0, 2.0, 650);

    // === Pyrenees (east-west ridge along French border ~2500m) ===
    elev += ridge(lng, lat, -1.8, 42.9, 3.0, 42.6, 0.3, 2500);
    // Western Pyrenees (lower)
    elev += ridge(lng, lat, -2.0, 43.1, -0.5, 43.0, 0.25, 1500);

    // === Cantabrian Mountains (northern coast range ~1800m) ===
    elev += ridge(lng, lat, -8.0, 43.0, -3.5, 43.0, 0.3, 1800);
    // Picos de Europa
    elev += peak(lng, lat, -4.8, 43.2, 0.5, 0.2, 2000);

    // === Sistema Central (Guadarrama/Gredos, north of Madrid ~2000m) ===
    elev += ridge(lng, lat, -6.0, 40.3, -3.5, 40.8, 0.25, 1800);
    // Sierra de Gredos peak
    elev += peak(lng, lat, -5.3, 40.3, 0.4, 0.2, 2200);

    // === Sierra Morena (separating Meseta from Andalusia ~1000m) ===
    elev += ridge(lng, lat, -6.5, 38.4, -2.5, 38.4, 0.3, 900);

    // === Sierra Nevada (near Granada ~3000m) ===
    elev += peak(lng, lat, -3.4, 37.0, 0.5, 0.2, 3000);

    // === Betic Cordillera (southern coast range ~1500m) ===
    elev += ridge(lng, lat, -5.5, 36.8, -2.0, 37.2, 0.35, 1200);

    // === Sistema Ibérico (eastern range ~1800m) ===
    elev += ridge(lng, lat, -2.5, 42.0, -1.0, 40.0, 0.4, 1400);
    // Sierra de la Demanda
    elev += peak(lng, lat, -3.0, 42.1, 0.3, 0.3, 1600);

    // === Sierra de Guadarrama (between Madrid and Segovia) ===
    elev += peak(lng, lat, -3.9, 40.8, 0.3, 0.15, 1800);

    // === Galician highlands ===
    elev += peak(lng, lat, -8.0, 42.5, 1.0, 0.5, 600);

    // === Portuguese Serra da Estrela ===
    elev += peak(lng, lat, -7.6, 40.3, 0.3, 0.2, 1500);

    // === River valleys & depressions (subtract to create passes) ===

    // Ebro depression (broad valley ~300m)
    const ebroDepression = -400 * bell(lng, -0.5, 1.5) * bell(lat, 41.7, 0.5);
    elev += ebroDepression;

    // Henares/Jalón corridor (Madrid → Zaragoza via river valleys)
    elev -= ridge(lng, lat, -3.3, 40.5, -1.0, 41.5, 0.3, 800);

    // Somosierra pass (Madrid → Burgos through Sistema Central)
    elev -= peak(lng, lat, -3.6, 41.1, 0.2, 0.3, 700);

    // Despeñaperros pass (through Sierra Morena, Madrid → Andalusia)
    elev -= peak(lng, lat, -3.5, 38.4, 0.3, 0.2, 600);

    // Tagus valley (east-west through central Portugal/Spain)
    elev -= ridge(lng, lat, -9.0, 39.0, -4.0, 39.5, 0.3, 300);

    // Guadiana valley (Badajoz → Ciudad Rodrigo corridor)
    elev -= ridge(lng, lat, -7.0, 38.9, -6.5, 40.5, 0.25, 400);

    // Guadalquivir valley (low ~50m)
    const guadalquivirDepression = -500 * bell(lng, -5.0, 1.5) * bell(lat, 37.5, 0.4);
    elev += guadalquivirDepression;

    // Portuguese coastal lowlands
    const ptCoast = -300 * bell(lng, -9.0, 0.5) * bell(lat, 39.5, 2.0);
    elev += ptCoast;

    // Mediterranean coastal strip (low)
    const medCoast = -200 * bell(lng, 0.5, 1.0) * bell(lat, 40.5, 2.0);
    elev += medCoast;

    // Valencia coastal lowland
    elev -= peak(lng, lat, -0.3, 39.5, 0.5, 0.5, 300);

    // Clamp to reasonable range
    return Math.max(0, Math.round(elev));
}

/** Convert grid row/col to lat/lng */
function gridToLatLng(row: number, col: number): [number, number] {
    const lng = IBERIA_BOUNDS.minLng + (col / (COLS - 1)) * (IBERIA_BOUNDS.maxLng - IBERIA_BOUNDS.minLng);
    // Row 0 = maxLat (top), last row = minLat (bottom)
    const lat = IBERIA_BOUNDS.maxLat - (row / (ROWS - 1)) * (IBERIA_BOUNDS.maxLat - IBERIA_BOUNDS.minLat);
    return [lat, lng];
}

/** Generate the full elevation grid */
function generateElevationGrid(): number[] {
    const data = new Array<number>(COLS * ROWS);
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const [lat, lng] = gridToLatLng(row, col);
            data[row * COLS + col] = syntheticElevation(lng, lat);
        }
    }
    return data;
}

// ─── A* pathfinding on elevation grid ───

/** Convert lat/lng to fractional grid position */
function latLngToGrid(lat: number, lng: number): [number, number] {
    const col = ((lng - IBERIA_BOUNDS.minLng) / (IBERIA_BOUNDS.maxLng - IBERIA_BOUNDS.minLng)) * (COLS - 1);
    const row = ((IBERIA_BOUNDS.maxLat - lat) / (IBERIA_BOUNDS.maxLat - IBERIA_BOUNDS.minLat)) * (ROWS - 1);
    return [row, col];
}

/** A* pathfinding on the elevation grid */
function astarPath(data: number[], startRow: number, startCol: number, endRow: number, endCol: number): [number, number][] {
    // Quantize to grid cells
    const sr = Math.round(startRow);
    const sc = Math.round(startCol);
    const er = Math.round(endRow);
    const ec = Math.round(endCol);

    interface Node {
        r: number;
        c: number;
        g: number;
        f: number;
    }

    const key = (r: number, c: number) => r * COLS + c;
    const cameFrom = new Map<number, number>();
    const gScore = new Map<number, number>();

    const heuristic = (r: number, c: number) => {
        const dr = r - er;
        const dc = c - ec;
        return Math.sqrt(dr * dr + dc * dc);
    };

    const startKey = key(sr, sc);
    gScore.set(startKey, 0);

    const openSet: Node[] = [{ r: sr, c: sc, g: 0, f: heuristic(sr, sc) }];
    const closedSet = new Set<number>();

    // 8-directional neighbors
    const dirs = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
    ];

    while (openSet.length > 0) {
        // Find min f
        let minIdx = 0;
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i]!.f < openSet[minIdx]!.f) minIdx = i;
        }
        const current = openSet[minIdx]!;
        openSet.splice(minIdx, 1);

        const ck = key(current.r, current.c);
        if (current.r === er && current.c === ec) {
            // Reconstruct path
            const pathResult: [number, number][] = [];
            let k = ck;
            while (k !== undefined) {
                const r = Math.floor(k / COLS);
                const c = k % COLS;
                pathResult.unshift([r, c]);
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
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;

            const nk = key(nr, nc);
            if (closedSet.has(nk)) continue;

            const dist = dr !== 0 && dc !== 0 ? 1.414 : 1.0;
            const elev1 = data[ck] ?? 0;
            const elev2 = data[nk] ?? 0;
            const elevChange = Math.abs(elev2 - elev1);

            // Cost: distance * (1 + slope_penalty)
            const cost = dist * (1 + 3.0 * elevChange / 100);
            const tentativeG = current.g + cost;

            const prevG = gScore.get(nk);
            if (prevG !== undefined && tentativeG >= prevG) continue;

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

    // No path found — return straight line
    return [[sr, sc], [er, ec]];
}

// ─── Douglas-Peucker simplification ───

function perpendicularDistance(
    point: [number, number],
    lineStart: [number, number],
    lineEnd: [number, number],
): number {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
        const ddx = point[0] - lineStart[0];
        const ddy = point[1] - lineStart[1];
        return Math.sqrt(ddx * ddx + ddy * ddy);
    }
    const t = Math.max(0, Math.min(1, ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / lenSq));
    const projX = lineStart[0] + t * dx;
    const projY = lineStart[1] + t * dy;
    const ddx = point[0] - projX;
    const ddy = point[1] - projY;
    return Math.sqrt(ddx * ddx + ddy * ddy);
}

function douglasPeucker(points: [number, number][], epsilon: number): [number, number][] {
    if (points.length <= 2) return points;

    let maxDist = 0;
    let maxIdx = 0;
    const first = points[0]!;
    const last = points[points.length - 1]!;

    for (let i = 1; i < points.length - 1; i++) {
        const d = perpendicularDistance(points[i]!, first, last);
        if (d > maxDist) {
            maxDist = d;
            maxIdx = i;
        }
    }

    if (maxDist > epsilon) {
        const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
        const right = douglasPeucker(points.slice(maxIdx), epsilon);
        return [...left.slice(0, -1), ...right];
    }

    return [first, last];
}

// ─── Edge waypoint computation ───

function computeEdgeWaypoints(data: number[]): Record<string, [number, number][]> {
    const result: Record<string, [number, number][]> = {};

    for (const [fromId, toId] of EDGES) {
        const fromNode = NODES[fromId];
        const toNode = NODES[toId];
        if (!fromNode || !toNode) continue;

        const [startRow, startCol] = latLngToGrid(fromNode.lat, fromNode.lng);
        const [endRow, endCol] = latLngToGrid(toNode.lat, toNode.lng);

        // Run A* pathfinding
        const gridPath = astarPath(data, startRow, startCol, endRow, endCol);

        // Convert grid coords back to lat/lng
        const latlngPath: [number, number][] = gridPath.map(([r, c]) => {
            const [lat, lng] = gridToLatLng(r, c);
            return [lng, lat]; // store as [lng, lat] for projection
        });

        // Simplify with Douglas-Peucker (epsilon in degrees, ~0.1° = 1 grid cell)
        const simplified = douglasPeucker(latlngPath, 0.08);

        // Remove first and last points (they're the node positions)
        const waypoints = simplified.slice(1, -1);

        const edgeKey = `${fromId}|${toId}`;
        result[edgeKey] = waypoints;
    }

    return result;
}

// ─── Main ───

function main() {
    const projectRoot = path.resolve(import.meta.dirname ?? ".", "..");
    const elevationOutPath = path.join(projectRoot, "public/assets/maps/iberia-elevation.json");
    const waypointsOutPath = path.join(projectRoot, "src/data/edge-waypoints.ts");

    // Generate synthetic elevation grid
    console.log(`Generating ${COLS}×${ROWS} elevation grid...`);
    const data = generateElevationGrid();

    // Print some stats
    let maxElev = 0;
    let sumElev = 0;
    for (const v of data) { maxElev = Math.max(maxElev, v); sumElev += v; }
    const avgElev = Math.round(sumElev / data.length);
    console.log(`  Max elevation: ${maxElev}m, Average: ${avgElev}m`);

    // Write elevation JSON
    const elevationJson = {
        cols: COLS,
        rows: ROWS,
        bounds: IBERIA_BOUNDS,
        data,
    };

    fs.mkdirSync(path.dirname(elevationOutPath), { recursive: true });
    fs.writeFileSync(elevationOutPath, JSON.stringify(elevationJson));
    console.log(`Wrote elevation data to ${elevationOutPath} (${(fs.statSync(elevationOutPath).size / 1024).toFixed(0)} KB)`);

    // Compute edge waypoints
    console.log("Computing edge waypoints with A* pathfinding...");
    const waypoints = computeEdgeWaypoints(data);

    // Count how many edges have waypoints
    const withWaypoints = Object.values(waypoints).filter((w) => w.length > 0).length;
    console.log(`${withWaypoints}/${EDGES.length} edges have intermediate waypoints`);

    // Write edge waypoints TypeScript file
    const lines: string[] = [
        "// Auto-generated by scripts/generate-terrain.ts — do not edit",
        "// Each key is \"fromId|toId\", values are intermediate [lng, lat] waypoints",
        "",
        "export const EDGE_WAYPOINTS: Record<string, [number, number][]> = {",
    ];

    for (const [key, wps] of Object.entries(waypoints)) {
        if (wps.length === 0) continue;
        const wpStr = wps
            .map(([lng, lat]) => `[${lng.toFixed(4)}, ${lat.toFixed(4)}]`)
            .join(", ");
        lines.push(`    "${key}": [${wpStr}],`);
    }

    lines.push("};");
    lines.push("");

    fs.writeFileSync(waypointsOutPath, lines.join("\n"));
    console.log(`Wrote edge waypoints to ${waypointsOutPath}`);
    console.log("Done!");
}

main();
