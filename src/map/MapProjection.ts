import { geoConicConformal, type GeoProjection } from "d3-geo";
import { IBERIA_BOUNDS } from "../config/constants";

/**
 * Wraps a d3-geo conic conformal projection to convert lat/lng
 * coordinates to screen pixel positions for the Iberian Peninsula.
 *
 * Uses manual scale/translate computation because d3-geo's fitExtent
 * doesn't compute bounds correctly for conic conformal projections.
 */
export class MapProjection {
    private projection: GeoProjection;

    constructor(
        screenWidth: number,
        screenHeight: number,
        padding: number = 40,
    ) {
        const centerLng =
            (IBERIA_BOUNDS.minLng + IBERIA_BOUNDS.maxLng) / 2;
        const centerLat =
            (IBERIA_BOUNDS.minLat + IBERIA_BOUNDS.maxLat) / 2;

        // Standard parallels at 1/6 and 5/6 of latitude range
        const latRange = IBERIA_BOUNDS.maxLat - IBERIA_BOUNDS.minLat;
        const parallel1 = IBERIA_BOUNDS.minLat + latRange / 6;
        const parallel2 = IBERIA_BOUNDS.maxLat - latRange / 6;

        // Start with unit scale to measure raw projected bounds
        this.projection = geoConicConformal()
            .parallels([parallel1, parallel2])
            .rotate([-centerLng, 0])
            .center([0, centerLat])
            .scale(1)
            .translate([0, 0]);

        // Project all four corners to find raw bounds
        const corners: [number, number][] = [
            [IBERIA_BOUNDS.minLng, IBERIA_BOUNDS.minLat],
            [IBERIA_BOUNDS.maxLng, IBERIA_BOUNDS.minLat],
            [IBERIA_BOUNDS.maxLng, IBERIA_BOUNDS.maxLat],
            [IBERIA_BOUNDS.minLng, IBERIA_BOUNDS.maxLat],
        ];

        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        for (const c of corners) {
            const p = this.projection(c);
            if (!p) continue;
            minX = Math.min(minX, p[0]);
            maxX = Math.max(maxX, p[0]);
            minY = Math.min(minY, p[1]);
            maxY = Math.max(maxY, p[1]);
        }

        const rawW = maxX - minX;
        const rawH = maxY - minY;

        // Compute scale to fit within padded screen area
        const availW = screenWidth - padding * 2;
        const availH = screenHeight - padding * 2;
        const scale = Math.min(availW / rawW, availH / rawH);

        // Compute translate to center the map in the padded area
        const tx = padding + (availW - rawW * scale) / 2 - minX * scale;
        const ty = padding + (availH - rawH * scale) / 2 - minY * scale;

        this.projection.scale(scale).translate([tx, ty]);
    }

    /** Project [longitude, latitude] to [screenX, screenY] */
    project(lng: number, lat: number): [number, number] {
        const result = this.projection([lng, lat]);
        if (!result) {
            throw new Error(
                `Projection failed for coordinates: [${lng}, ${lat}]`,
            );
        }
        return [result[0], result[1]];
    }

    /** Inverse project [screenX, screenY] to [longitude, latitude] */
    unproject(x: number, y: number): [number, number] | null {
        const invert = this.projection.invert;
        if (!invert) return null;
        const result = invert([x, y]);
        return result ? [result[0], result[1]] : null;
    }

    /** Get the underlying d3 projection for advanced use */
    getProjection(): GeoProjection {
        return this.projection;
    }
}
