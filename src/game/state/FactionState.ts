import type { FactionId } from "../../data/factions";

export interface FactionState {
    id: FactionId;
    /** Whether this faction is controlled by a human player */
    isHuman: boolean;
    /** Number of nodes currently owned */
    nodeCount: number;
    /** Total troops across all owned nodes */
    totalTroops: number;
    /** Whether this faction has been eliminated */
    eliminated: boolean;
}
