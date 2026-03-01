import type { FactionId } from "../../data/factions";

export type DispatchType = "troops" | "engineer" | "scout";

/** A group of troops moving along an edge between two nodes */
export interface TroopDispatch {
    id: number;
    fromNodeId: string;
    toNodeId: string;
    owner: FactionId;
    troops: number;
    /** Progress along the edge, 0 = at source, 1 = arrived at destination */
    progress: number;
    /** Screen coordinates of source node */
    fromX: number;
    fromY: number;
    /** Screen coordinates of destination node */
    toX: number;
    toY: number;
    /** Type of dispatch */
    dispatchType: DispatchType;
}
