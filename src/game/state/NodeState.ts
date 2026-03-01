import type { FactionId } from "../../data/factions";
import type { NodeType } from "../../data/nodes";

export interface NodeState {
    id: string;
    owner: FactionId;
    troops: number;
    type: NodeType;

    // Supply system
    /** Current supply level (0-100) */
    supply: number;
    /** Whether this node is connected to a supply source */
    supplied: boolean;

    // Fortification
    /** Whether this node is fully fortified */
    fortified: boolean;
    /** Seconds remaining until fortification completes (0 = not building) */
    fortifyProgress: number;

    // Scouting: faction -> timestamp when scouted status expires (elapsedTime)
    scoutedBy: Partial<Record<FactionId, number>>;
}
