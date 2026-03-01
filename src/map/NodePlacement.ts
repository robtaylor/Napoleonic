import type { MapProjection } from "./MapProjection";

export interface NodePosition {
    id: string;
    screenX: number;
    screenY: number;
}

/**
 * Projects node lat/lng positions to screen coordinates using the map projection.
 */
export function projectNodes(
    nodes: ReadonlyArray<{ id: string; lat: number; lng: number }>,
    projection: MapProjection,
): NodePosition[] {
    return nodes.map((node) => {
        const [screenX, screenY] = projection.project(node.lng, node.lat);
        return { id: node.id, screenX, screenY };
    });
}
