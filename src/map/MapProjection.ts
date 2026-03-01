import { geoConicConformal, type GeoProjection } from "d3-geo";
import { IBERIA_BOUNDS } from "../config/constants";

/**
 * Wraps a d3-geo conic conformal projection to convert lat/lng
 * coordinates to screen pixel positions for the Iberian Peninsula.
 */
export class MapProjection {
    private projection: GeoProjection;

    constructor(
        screenWidth: number,
        screenHeight: number,
        private padding: number = 40,
    ) {
        const centerLng =
            (IBERIA_BOUNDS.minLng + IBERIA_BOUNDS.maxLng) / 2;
        const centerLat =
            (IBERIA_BOUNDS.minLat + IBERIA_BOUNDS.maxLat) / 2;

        // Standard parallels at 1/6 and 5/6 of latitude range
        const latRange = IBERIA_BOUNDS.maxLat - IBERIA_BOUNDS.minLat;
        const parallel1 = IBERIA_BOUNDS.minLat + latRange / 6;
        const parallel2 = IBERIA_BOUNDS.maxLat - latRange / 6;

        this.projection = geoConicConformal()
            .parallels([parallel1, parallel2])
            .center([centerLng, centerLat])
            .fitSize(
                [
                    screenWidth - padding * 2,
                    screenHeight - padding * 2,
                ],
                {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "Polygon",
                        coordinates: [
                            [
                                [IBERIA_BOUNDS.minLng, IBERIA_BOUNDS.minLat],
                                [IBERIA_BOUNDS.maxLng, IBERIA_BOUNDS.minLat],
                                [IBERIA_BOUNDS.maxLng, IBERIA_BOUNDS.maxLat],
                                [IBERIA_BOUNDS.minLng, IBERIA_BOUNDS.maxLat],
                                [IBERIA_BOUNDS.minLng, IBERIA_BOUNDS.minLat],
                            ],
                        ],
                    },
                },
            );
    }

    /** Project [longitude, latitude] to [screenX, screenY] */
    project(lng: number, lat: number): [number, number] {
        const result = this.projection([lng, lat]);
        if (!result) {
            throw new Error(
                `Projection failed for coordinates: [${lng}, ${lat}]`,
            );
        }
        return [result[0] + this.padding, result[1] + this.padding];
    }

    /** Inverse project [screenX, screenY] to [longitude, latitude] */
    unproject(x: number, y: number): [number, number] | null {
        const invert = this.projection.invert;
        if (!invert) return null;
        const result = invert([x - this.padding, y - this.padding]);
        return result ? [result[0], result[1]] : null;
    }

    /** Get the underlying d3 projection for advanced use */
    getProjection(): GeoProjection {
        return this.projection;
    }
}
