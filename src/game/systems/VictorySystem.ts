import {
    GAME_DURATION_S,
    FRENCH_DOMINATION_NODES,
    FRENCH_HOLD_DURATION_S,
    BRITISH_FRENCH_MAX_NODES,
    BRITISH_ALLIED_MIN_NODES,
    SPANISH_VICTORY_DELAY_S,
    SPANISH_MIN_NODES,
} from "../../config/constants";
import type { FactionId } from "../../data/factions";
import type { GameState } from "../state/GameState";

export type VictoryReason =
    | "domination"       // Last faction standing / all nodes
    | "french_hold"      // French held 20+ nodes for 60s
    | "british_expel"    // British made French position untenable
    | "spanish_endure"   // Spanish survived and matched/exceeded French
    | "timeout"          // Timer expired, most nodes wins
    | "elimination";     // Only one faction remains

export interface VictoryResult {
    winner: FactionId;
    reason: VictoryReason;
}

/**
 * Asymmetric victory conditions per faction, with Short and Long game modes.
 *
 * Short mode (5 min): timer-based with faction-specific goals + timeout fallback.
 * Long mode: same faction-specific goals but no timeout. War continues until decisive outcome.
 *
 * | Faction  | Victory Condition                                              |
 * |----------|----------------------------------------------------------------|
 * | French   | Hold 20+ of 30 nodes for 60 continuous seconds                |
 * | British  | French ≤5 nodes while British+Spanish hold 20+               |
 * | Spanish  | After 3 min: Spanish nodes ≥ French nodes, Spanish holds 5+  |
 * | Fallback | Timeout (short only): most nodes wins                         |
 * | Elim     | Last faction standing                                         |
 */
export class VictorySystem {
    check(state: GameState, deltaMs: number = 0): VictoryResult | null {
        if (state.gameOver) return null;

        // Count active (non-eliminated) factions
        const activeFactions: { id: FactionId; nodeCount: number }[] = [];
        for (const faction of state.factions.values()) {
            if (!faction.eliminated) {
                activeFactions.push({
                    id: faction.id,
                    nodeCount: faction.nodeCount,
                });
            }
        }

        // Elimination: only one faction has nodes
        if (activeFactions.length === 1) {
            return { winner: activeFactions[0]!.id, reason: "elimination" };
        }

        // === French victory: hold 20+ nodes for 60 continuous seconds ===
        const frenchFaction = state.factions.get("french");
        if (frenchFaction && !frenchFaction.eliminated) {
            if (frenchFaction.nodeCount >= FRENCH_DOMINATION_NODES) {
                state.frenchDominanceTimer += deltaMs / 1000;
                if (state.frenchDominanceTimer >= FRENCH_HOLD_DURATION_S) {
                    return { winner: "french", reason: "french_hold" };
                }
            } else {
                state.frenchDominanceTimer = 0;
            }
        }

        // === British victory: French ≤5 nodes, British+Spanish hold 20+ ===
        const britishFaction = state.factions.get("british");
        if (britishFaction && !britishFaction.eliminated && frenchFaction) {
            const spanishFaction = state.factions.get("spanish");
            const alliedNodes = britishFaction.nodeCount + (spanishFaction?.nodeCount ?? 0);
            if (
                frenchFaction.nodeCount <= BRITISH_FRENCH_MAX_NODES &&
                alliedNodes >= BRITISH_ALLIED_MIN_NODES
            ) {
                return { winner: "british", reason: "british_expel" };
            }
        }

        // === Spanish victory: after 3 min, Spanish ≥ French and Spanish holds 5+ ===
        const spanishFaction = state.factions.get("spanish");
        if (
            spanishFaction &&
            !spanishFaction.eliminated &&
            frenchFaction &&
            state.elapsedTime >= SPANISH_VICTORY_DELAY_S
        ) {
            if (
                spanishFaction.nodeCount >= frenchFaction.nodeCount &&
                spanishFaction.nodeCount >= SPANISH_MIN_NODES
            ) {
                return { winner: "spanish", reason: "spanish_endure" };
            }
        }

        // === Timeout (short mode only) ===
        if (state.gameMode === "short" && GAME_DURATION_S > 0 && state.elapsedTime >= GAME_DURATION_S) {
            let best = activeFactions[0]!;
            for (let i = 1; i < activeFactions.length; i++) {
                const f = activeFactions[i]!;
                if (
                    f.nodeCount > best.nodeCount ||
                    (f.nodeCount === best.nodeCount &&
                        (state.factions.get(f.id)?.totalTroops ?? 0) >
                            (state.factions.get(best.id)?.totalTroops ?? 0))
                ) {
                    best = f;
                }
            }
            return { winner: best.id, reason: "timeout" };
        }

        return null;
    }
}
