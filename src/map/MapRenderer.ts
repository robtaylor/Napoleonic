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

const MAP_COLORS = {
    land: 0xd4c5a0,
    landStroke: 0x8b7d5e,
    border: 0x6b5b3e,
    river: 0x6b8fad,
    sea: 0x2b1d0e,
} as const;

/**
 * Renders GeoJSON map data as Phaser Graphics objects.
 * Draws coastlines, country borders, and rivers.
 */
export class MapRenderer {
    private landGraphics: Phaser.GameObjects.Graphics;
    private borderGraphics: Phaser.GameObjects.Graphics;
    private riverGraphics: Phaser.GameObjects.Graphics;

    constructor(
        scene: Phaser.Scene,
        private projection: MapProjection,
    ) {
        this.landGraphics = scene.add.graphics();
        this.borderGraphics = scene.add.graphics();
        this.riverGraphics = scene.add.graphics();
    }

    /** Draw land polygons filled with parchment color */
    drawLand(geojson: GeoJSONFeatureCollection): void {
        const g = this.landGraphics;
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
        this.landGraphics.setDepth(landDepth);
        this.borderGraphics.setDepth(borderDepth);
        this.riverGraphics.setDepth(riverDepth);
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
