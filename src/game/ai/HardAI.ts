import { AIController, type DispatchFn } from "./AIController";
import { DISPATCH_FRACTION, MIN_GARRISON, TROOP_GEN_RATE } from "../../config/constants";
import type { FactionId } from "../../data/factions";
import type { GameState } from "../state/GameState";
import type { NodeState } from "../state/NodeState";

/**
 * Hard AI: Utility-based lookahead with economy focus.
 * - Values high-production nodes (capitals, fortresses)
 * - Computes expected outcome of each possible attack
 * - Manages economy: avoids sending all troops, keeps reserves
 * - Multiple dispatches per evaluation when advantageous
 */
export class HardAI extends AIController {
    private actionsThisTurn = 0;
    private readonly maxActionsPerTurn = 2;

    constructor(factionId: FactionId) {
        super(factionId, 1500); // Faster evaluation: every 1.5 seconds
    }

    protected evaluate(state: GameState, dispatch: DispatchFn): void {
        this.actionsThisTurn = 0;
        const owned = this.getOwnedNodes(state);
        if (owned.length === 0) return;

        // Score all possible attacks
        const candidates: {
            fromId: string;
            toId: string;
            utility: number;
            sendCount: number;
        }[] = [];

        for (const nodeId of owned) {
            const node = state.nodes.get(nodeId)!;
            const sendCount = Math.floor(node.troops * DISPATCH_FRACTION);
            if (sendCount < 1 || node.troops - sendCount < MIN_GARRISON) continue;

            const neighbors = this.getNeighborInfo(state, nodeId);

            for (const neighbor of neighbors) {
                if (neighbor.owner === this.factionId) {
                    // Reinforce: only if neighbor is on frontline and weak
                    const neighborNeighbors = this.getNeighborInfo(state, neighbor.id);
                    const hasEnemyNeighbor = neighborNeighbors.some(
                        (n) => n.owner !== this.factionId,
                    );
                    if (hasEnemyNeighbor && neighbor.troops < sendCount) {
                        candidates.push({
                            fromId: nodeId,
                            toId: neighbor.id,
                            utility: this.reinforceUtility(node, neighbor.troops),
                            sendCount,
                        });
                    }
                } else {
                    // Attack
                    const targetNode = state.nodes.get(neighbor.id);
                    if (!targetNode) continue;
                    const utility = this.attackUtility(
                        sendCount,
                        targetNode,
                        node,
                    );
                    if (utility > 0) {
                        candidates.push({
                            fromId: nodeId,
                            toId: neighbor.id,
                            utility,
                            sendCount,
                        });
                    }
                }
            }
        }

        // Sort by utility descending and execute top actions
        candidates.sort((a, b) => b.utility - a.utility);

        const usedSources = new Set<string>();
        for (const candidate of candidates) {
            if (this.actionsThisTurn >= this.maxActionsPerTurn) break;
            if (usedSources.has(candidate.fromId)) continue;

            dispatch(candidate.fromId, candidate.toId);
            usedSources.add(candidate.fromId);
            this.actionsThisTurn++;
        }
    }

    /** Utility of attacking a target node */
    private attackUtility(
        sendCount: number,
        target: NodeState,
        source: NodeState,
    ): number {
        const surplus = sendCount - target.troops;
        if (surplus <= 0) return -1; // Can't win

        // Value of capturing the node (production potential)
        const captureValue = TROOP_GEN_RATE[target.type] * 10;

        // Penalty for leaving source weak
        const remainingAtSource = source.troops - sendCount;
        const sourceSafetyPenalty = remainingAtSource < 3 ? -5 : 0;

        // Bonus for overwhelming victory (more surplus = safer)
        const surplusBonus = Math.min(surplus, 10);

        return captureValue + surplusBonus + sourceSafetyPenalty;
    }

    /** Utility of reinforcing a friendly node */
    private reinforceUtility(source: NodeState, targetTroops: number): number {
        // Higher utility when target is much weaker than source
        const diff = source.troops - targetTroops;
        return Math.max(0, diff * 0.5 - 2);
    }
}
