import Phaser from "phaser";
import type { MapProjection } from "./MapProjection";

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

/** Metadata for positioning the terrain bitmap (Web Mercator tile bounds) */
export interface TerrainMeta {
    width: number;
    height: number;
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
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
 * Draws coastlines, country borders, rivers, and topographic terrain.
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

    /**
     * Draw terrain from a pre-rendered topographic PNG.
     * Re-projects from Web Mercator (tile source) to the game's conic conformal projection
     * by sampling the PNG at each screen pixel.
     */
    drawTerrain(scene: Phaser.Scene, meta: TerrainMeta): void {
        const { width, height } = scene.scale;

        // Get raw pixel data from the loaded terrain texture
        const source = scene.textures.get("iberia-terrain").getSourceImage() as HTMLImageElement;
        const srcCanvas = document.createElement("canvas");
        srcCanvas.width = meta.width;
        srcCanvas.height = meta.height;
        const srcCtx = srcCanvas.getContext("2d");
        if (!srcCtx) return;
        srcCtx.drawImage(source, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, meta.width, meta.height).data;

        // Build output canvas at screen resolution
        const outCanvas = document.createElement("canvas");
        outCanvas.width = width;
        outCanvas.height = height;
        const outCtx = outCanvas.getContext("2d");
        if (!outCtx) return;

        const outImage = outCtx.createImageData(width, height);
        const outPixels = outImage.data;

        // Pre-compute Web Mercator Y limits for the terrain bounds
        const mercYMax = this.latToMercY(meta.maxLat);
        const mercYMin = this.latToMercY(meta.minLat);

        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                const latlng = this.projection.unproject(px, py);
                if (!latlng) continue;

                const [lng, lat] = latlng;
                if (lng < meta.minLng || lng > meta.maxLng || lat < meta.minLat || lat > meta.maxLat) {
                    continue;
                }

                // Map to source pixel using Web Mercator (matches the tile layout)
                const srcX = ((lng - meta.minLng) / (meta.maxLng - meta.minLng)) * (meta.width - 1);
                const mercY = this.latToMercY(lat);
                const srcY = ((mercYMax - mercY) / (mercYMax - mercYMin)) * (meta.height - 1);

                // Bilinear sample from source
                const x0 = Math.floor(srcX);
                const y0 = Math.floor(srcY);
                const x1 = Math.min(x0 + 1, meta.width - 1);
                const y1 = Math.min(y0 + 1, meta.height - 1);
                const fx = srcX - x0;
                const fy = srcY - y0;

                const i00 = (y0 * meta.width + x0) * 4;
                const i10 = (y0 * meta.width + x1) * 4;
                const i01 = (y1 * meta.width + x0) * 4;
                const i11 = (y1 * meta.width + x1) * 4;

                const idx = (py * width + px) * 4;
                for (let c = 0; c < 3; c++) {
                    outPixels[idx + c] = Math.round(
                        srcData[i00 + c]! * (1 - fx) * (1 - fy) +
                        srcData[i10 + c]! * fx * (1 - fy) +
                        srcData[i01 + c]! * (1 - fx) * fy +
                        srcData[i11 + c]! * fx * fy,
                    );
                }
                outPixels[idx + 3] = 255;
            }
        }

        outCtx.putImageData(outImage, 0, 0);

        // Create Phaser texture from reprojected canvas
        if (scene.textures.exists("terrain-reprojected")) {
            scene.textures.remove("terrain-reprojected");
        }
        scene.textures.addCanvas("terrain-reprojected", outCanvas);
        this.terrainImage = scene.add.image(0, 0, "terrain-reprojected");
        this.terrainImage.setOrigin(0, 0);
        this.terrainImage.setDepth(0);

        // Apply geometry mask from land polygons
        const mask = this._landGraphics.createGeometryMask();
        this.terrainImage.setMask(mask);
    }

    /** Convert latitude to Web Mercator Y (normalized) */
    private latToMercY(lat: number): number {
        const latRad = (lat * Math.PI) / 180;
        return Math.log(Math.tan(latRad) + 1 / Math.cos(latRad));
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
