import type { GameState } from "../state/GameState";
import type { TroopDispatch } from "../state/TroopDispatch";

/**
 * Resolves troop arrivals at destination nodes.
 * - Same faction: troops add to garrison.
 * - Different faction: 1:1 combat, surplus captures the node.
 */
export class CombatSystem {
    resolve(state: GameState, arrivals: TroopDispatch[]): void {
        for (const dispatch of arrivals) {
            const targetNode = state.nodes.get(dispatch.toNodeId);
            if (!targetNode) continue;

            if (targetNode.owner === dispatch.owner) {
                // Reinforcement
                targetNode.troops += dispatch.troops;
            } else {
                // Combat: 1:1 attrition
                targetNode.troops -= dispatch.troops;

                if (targetNode.troops < 0) {
                    // Node captured - surplus becomes new garrison
                    targetNode.troops = Math.abs(targetNode.troops);
                    targetNode.owner = dispatch.owner;
                } else if (targetNode.troops === 0) {
                    // Exact tie - attacker captures with 0 garrison
                    targetNode.owner = dispatch.owner;
                }
            }

            // Remove this dispatch
            state.removeDispatch(dispatch.id);
        }

        // Recalculate faction stats after all combat
        if (arrivals.length > 0) {
            state.recalcFactionStats();
        }
    }
}
