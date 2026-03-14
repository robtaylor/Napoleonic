import Phaser from "phaser";
import type { MapProjection } from "./MapProjection";
import { TERRAIN_PALETTE } from "../config/constants";

/** GeoJSON types we handle */
interface GeoJSONFeatureCollection {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
}

interface GeoJSONFeature {
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: GeoJSONGeometry;
}

type GeoJSONGeometry =
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] }
    | { type: "LineString"; coordinates: number[][] }
    | { type: "MultiLineString"; coordinates: number[][][] };

/** Elevation grid data loaded from iberia-elevation.json */
export interface ElevationData {
    cols: number;
    rows: number;
    bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number };
    data: number[];
}

const MAP_COLORS = {
    land: 0xd4c5a0,
    landStroke: 0x8b7d5e,
    border: 0x6b5b3e,
    river: 0x6b8fad,
    sea: 0x2b1d0e,
} as const;

/**
 * Renders GeoJSON map data as Phaser Graphics objects.
 * Draws coastlines, country borders, rivers, and hypsometric terrain.
 */
export class MapRenderer {
    private _landGraphics: Phaser.GameObjects.Graphics;
    private borderGraphics: Phaser.GameObjects.Graphics;
    private riverGraphics: Phaser.GameObjects.Graphics;
    private terrainImage: Phaser.GameObjects.Image | null = null;

    constructor(
        scene: Phaser.Scene,
        private projection: MapProjection,
    ) {
        this._landGraphics = scene.add.graphics();
        this.borderGraphics = scene.add.graphics();
        this.riverGraphics = scene.add.graphics();
    }

    /** Access the land graphics for use as a geometry mask */
    get landGraphics(): Phaser.GameObjects.Graphics {
        return this._landGraphics;
    }

    /** Draw land polygons filled with parchment color (also serves as geometry mask source for terrain) */
    drawLand(geojson: GeoJSONFeatureCollection): void {
        const g = this._landGraphics;
        g.clear();

        for (const feature of geojson.features) {
            const rings = this.extractPolygonRings(feature.geometry);
            for (const ring of rings) {
                const projected = this.projectRing(ring);
                if (projected.length < 3) continue;

                g.fillStyle(MAP_COLORS.land, 1);
                g.lineStyle(1.5, MAP_COLORS.landStroke, 0.8);

                g.beginPath();
                const first = projected[0]!;
                g.moveTo(first[0], first[1]);
                for (let i = 1; i < projected.length; i++) {
                    const pt = projected[i]!;
                    g.lineTo(pt[0], pt[1]);
                }
                g.closePath();
                g.fillPath();
                g.strokePath();
            }
        }
    }

    /** Draw hypsometric terrain coloring from elevation data */
    drawTerrain(elevationData: ElevationData, scene: Phaser.Scene): void {
        const { width, height } = scene.scale;
        // Render at half resolution for performance
        const canvasW = Math.ceil(width / 2);
        const canvasH = Math.ceil(height / 2);

        const canvas = document.createElement("canvas");
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const imageData = ctx.createImageData(canvasW, canvasH);
        const pixels = imageData.data;

        const { cols, rows, bounds, data } = elevationData;

        for (let py = 0; py < canvasH; py++) {
            for (let px = 0; px < canvasW; px++) {
                // Map canvas pixel to screen coords (2x scale)
                const screenX = px * 2;
                const screenY = py * 2;

                // Unproject to lat/lng
                const latlng = this.projection.unproject(screenX, screenY);
                if (!latlng) continue;

                const [lng, lat] = latlng;

                // Skip if outside elevation bounds
                if (lng < bounds.minLng || lng > bounds.maxLng || lat < bounds.minLat || lat > bounds.maxLat) {
                    continue;
                }

                // Sample elevation with bilinear interpolation
                const gridCol = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (cols - 1);
                const gridRow = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * (rows - 1);

                const elevation = this.sampleElevation(data, cols, rows, gridRow, gridCol);

                // Map elevation to color
                const [r, g, b] = this.elevationToColor(elevation);

                const idx = (py * canvasW + px) * 4;
                pixels[idx] = r;
                pixels[idx + 1] = g;
                pixels[idx + 2] = b;
                pixels[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Remove existing terrain texture if re-drawing
        if (scene.textures.exists("terrain")) {
            scene.textures.remove("terrain");
        }

        // Create Phaser texture from canvas
        scene.textures.addCanvas("terrain", canvas);
        this.terrainImage = scene.add.image(0, 0, "terrain");
        this.terrainImage.setOrigin(0, 0);
        this.terrainImage.setScale(2);
        this.terrainImage.setDepth(0);

        // Apply geometry mask from land polygons — terrain only visible on land
        const mask = this._landGraphics.createGeometryMask();
        this.terrainImage.setMask(mask);
    }

    /** Bilinear interpolation sampling of the elevation grid */
    private sampleElevation(data: number[], cols: number, rows: number, row: number, col: number): number {
        const r0 = Math.floor(row);
        const c0 = Math.floor(col);
        const r1 = Math.min(r0 + 1, rows - 1);
        const c1 = Math.min(c0 + 1, cols - 1);
        const fr = row - r0;
        const fc = col - c0;

        const v00 = data[r0 * cols + c0] ?? 0;
        const v10 = data[r1 * cols + c0] ?? 0;
        const v01 = data[r0 * cols + c1] ?? 0;
        const v11 = data[r1 * cols + c1] ?? 0;

        return v00 * (1 - fr) * (1 - fc) + v10 * fr * (1 - fc) + v01 * (1 - fr) * fc + v11 * fr * fc;
    }

    /** Map elevation (meters) to RGB using hypsometric palette */
    private elevationToColor(elevation: number): [number, number, number] {
        const palette = TERRAIN_PALETTE;

        // Clamp to palette range
        if (elevation <= palette[0]!.elevation) {
            return palette[0]!.color;
        }
        const last = palette[palette.length - 1]!;
        if (elevation >= last.elevation) {
            return last.color;
        }

        // Find bracketing stops and interpolate
        for (let i = 0; i < palette.length - 1; i++) {
            const lo = palette[i]!;
            const hi = palette[i + 1]!;
            if (elevation >= lo.elevation && elevation <= hi.elevation) {
                const t = (elevation - lo.elevation) / (hi.elevation - lo.elevation);
                return [
                    Math.round(lo.color[0] + t * (hi.color[0] - lo.color[0])),
                    Math.round(lo.color[1] + t * (hi.color[1] - lo.color[1])),
                    Math.round(lo.color[2] + t * (hi.color[2] - lo.color[2])),
                ];
            }
        }

        return palette[0]!.color;
    }

    /** Draw country borders as dashed-style lines */
    drawBorders(geojson: GeoJSONFeatureCollection): void {
        const g = this.borderGraphics;
        g.clear();
        g.lineStyle(1, MAP_COLORS.border, 0.5);

        for (const feature of geojson.features) {
            const rings = this.extractPolygonRings(feature.geometry);
            for (const ring of rings) {
                const projected = this.projectRing(ring);
                if (projected.length < 2) continue;

                g.beginPath();
                const first = projected[0]!;
                g.moveTo(first[0], first[1]);
                for (let i = 1; i < projected.length; i++) {
                    const pt = projected[i]!;
                    g.lineTo(pt[0], pt[1]);
                }
                g.strokePath();
            }
        }
    }

    /** Draw rivers as blue lines */
    drawRivers(geojson: GeoJSONFeatureCollection): void {
        const g = this.riverGraphics;
        g.clear();
        g.lineStyle(1.5, MAP_COLORS.river, 0.6);

        for (const feature of geojson.features) {
            const lines = this.extractLineStrings(feature.geometry);
            for (const line of lines) {
                const projected = this.projectRing(line);
                if (projected.length < 2) continue;

                g.beginPath();
                const first = projected[0]!;
                g.moveTo(first[0], first[1]);
                for (let i = 1; i < projected.length; i++) {
                    const pt = projected[i]!;
                    g.lineTo(pt[0], pt[1]);
                }
                g.strokePath();
            }
        }
    }

    /** Set depth ordering so land is behind borders and rivers */
    setDepths(landDepth: number, borderDepth: number, riverDepth: number): void {
        this._landGraphics.setDepth(landDepth);
        this.borderGraphics.setDepth(borderDepth);
        this.riverGraphics.setDepth(riverDepth);
        if (this.terrainImage) {
            this.terrainImage.setDepth(landDepth);
        }
    }

    /** Extract outer rings from Polygon/MultiPolygon geometries */
    private extractPolygonRings(geometry: GeoJSONGeometry): number[][][] {
        switch (geometry.type) {
            case "Polygon":
                return geometry.coordinates;
            case "MultiPolygon":
                return geometry.coordinates.flat();
            default:
                return [];
        }
    }

    /** Extract line coordinate arrays from LineString/MultiLineString */
    private extractLineStrings(geometry: GeoJSONGeometry): number[][][] {
        switch (geometry.type) {
            case "LineString":
                return [geometry.coordinates];
            case "MultiLineString":
                return geometry.coordinates;
            default:
                return [];
        }
    }

    /** Project an array of [lng, lat] pairs to [screenX, screenY] */
    private projectRing(ring: number[][]): [number, number][] {
        const result: [number, number][] = [];
        for (const coord of ring) {
            const lng = coord[0];
            const lat = coord[1];
            if (lng === undefined || lat === undefined) continue;
            try {
                result.push(this.projection.project(lng, lat));
            } catch {
                // Skip points that can't be projected
            }
        }
        return result;
    }
}
