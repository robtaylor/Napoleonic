import { AIController, type DispatchFn } from "./AIController";
import { DISPATCH_FRACTION, MIN_GARRISON } from "../../config/constants";
import type { FactionId } from "../../data/factions";
import type { GameState } from "../state/GameState";

/**
 * Easy AI: Greedy heuristic.
 * - Picks a random owned node with enough troops
 * - Attacks the weakest adjacent enemy node
 * - Reinforces friendly nodes that border enemies
 */
export class EasyAI extends AIController {
    constructor(factionId: FactionId) {
        super(factionId, 2500); // Evaluates every 2.5 seconds
    }

    protected evaluate(state: GameState, dispatch: DispatchFn, _roadBuild?: (fromId: string, targetId: string) => void): void {
        const owned = this.getOwnedNodes(state);
        if (owned.length === 0) return;

        // Shuffle owned nodes so AI doesn't always pick the same one
        this.shuffle(owned);

        for (const nodeId of owned) {
            const node = state.nodes.get(nodeId)!;
            const sendCount = Math.floor(node.troops * DISPATCH_FRACTION);
            if (sendCount < 1 || node.troops - sendCount < MIN_GARRISON) continue;

            const neighbors = this.getNeighborInfo(state, nodeId);

            // Priority 1: Attack weakest enemy neighbor we can beat
            const enemies = neighbors
                .filter((n) => this.isEnemy(n.owner))
                .sort((a, b) => a.troops - b.troops);

            for (const enemy of enemies) {
                if (sendCount > enemy.troops) {
                    dispatch(nodeId, enemy.id);
                    return; // One action per evaluation
                }
            }

            // Priority 2: Reinforce a friendly neighbor that borders an enemy
            const friendlies = neighbors.filter((n) => n.owner === this.factionId);
            for (const friendly of friendlies) {
                const theirNeighbors = this.getNeighborInfo(state, friendly.id);
                const hasThreat = theirNeighbors.some((n) => this.isEnemy(n.owner));
                if (hasThreat && friendly.troops < node.troops) {
                    dispatch(nodeId, friendly.id);
                    return;
                }
            }
        }
    }

    private shuffle(arr: string[]): void {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j]!, arr[i]!];
        }
    }
}
