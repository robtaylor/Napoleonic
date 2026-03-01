import {
    FORTIFY_DEFENSE_MULTIPLIER,
    FORTIFY_BUILD_TIME_S,
    SCOUT_DURATION_S,
    SCOUT_ATTACK_BONUS,
} from "../../config/constants";
import type { GameState } from "../state/GameState";
import type { TroopDispatch } from "../state/TroopDispatch";

/**
 * Resolves troop arrivals at destination nodes.
 * - Same faction: troops add to garrison.
 * - Different faction: 1:1 combat, surplus captures the node.
 *
 * Modifiers:
 * - Fortified nodes: attackers deal reduced damage (FORTIFY_DEFENSE_MULTIPLIER)
 * - Scouted nodes: attacker gets bonus (SCOUT_ATTACK_BONUS)
 * - Scouts: don't fight, just mark the target as scouted
 * - Engineers: add to garrison and begin fortification
 */
export class CombatSystem {
    resolve(state: GameState, arrivals: TroopDispatch[]): void {
        for (const dispatch of arrivals) {
            const targetNode = state.nodes.get(dispatch.toNodeId);
            if (!targetNode) continue;

            // === Scout arrival: no combat, mark node as scouted ===
            if (dispatch.dispatchType === "scout") {
                if (!targetNode.scoutedBy) targetNode.scoutedBy = {};
                targetNode.scoutedBy[dispatch.owner] = state.elapsedTime + SCOUT_DURATION_S;
                // Scout troops are consumed (they don't fight or add to garrison)
                state.removeDispatch(dispatch.id);
                continue;
            }

            if (targetNode.owner === dispatch.owner) {
                // Reinforcement
                targetNode.troops += dispatch.troops;

                // === Engineer arrival: begin fortification ===
                if (dispatch.dispatchType === "engineer" && !targetNode.fortified) {
                    targetNode.fortifyProgress = FORTIFY_BUILD_TIME_S;
                }
            } else {
                // Combat: compute effective attacking troops
                let effectiveAttack = dispatch.troops;

                // Scout bonus: if attacker has scouted this node
                const scoutExpiry = targetNode.scoutedBy?.[dispatch.owner];
                if (scoutExpiry !== undefined && scoutExpiry > state.elapsedTime) {
                    effectiveAttack = Math.ceil(effectiveAttack * SCOUT_ATTACK_BONUS);
                }

                // Fortification defense: attackers deal less damage
                if (targetNode.fortified) {
                    effectiveAttack = Math.floor(effectiveAttack * FORTIFY_DEFENSE_MULTIPLIER);
                }

                targetNode.troops -= effectiveAttack;

                if (targetNode.troops < 0) {
                    // Node captured - surplus becomes new garrison
                    targetNode.troops = Math.abs(targetNode.troops);
                    targetNode.owner = dispatch.owner;
                    // Capturing removes fortification
                    targetNode.fortified = false;
                    targetNode.fortifyProgress = 0;
                } else if (targetNode.troops === 0) {
                    // Exact tie - attacker captures with 0 garrison
                    targetNode.owner = dispatch.owner;
                    targetNode.fortified = false;
                    targetNode.fortifyProgress = 0;
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

    /**
     * Update fortification progress (called each frame).
     * Nodes building fortifications count down to completion.
     */
    updateFortifications(state: GameState, deltaMs: number): void {
        const deltaSec = deltaMs / 1000;
        for (const node of state.nodes.values()) {
            if (node.fortifyProgress > 0 && !node.fortified) {
                node.fortifyProgress -= deltaSec;
                if (node.fortifyProgress <= 0) {
                    node.fortifyProgress = 0;
                    node.fortified = true;
                }
            }
        }
    }
}
