import type { FactionId } from "../../data/factions";
import type { NodeType } from "../../data/nodes";

export interface NodeState {
    id: string;
    owner: FactionId;
    troops: number;
    type: NodeType;
}
