import { GAME_DURATION_S } from "../../config/constants";
import type { FactionId } from "../../data/factions";
import type { GameState } from "../state/GameState";

export interface VictoryResult {
    winner: FactionId;
    reason: "domination" | "majority" | "timeout";
}

/**
 * Checks win conditions:
 * - Domination: one faction owns all nodes
 * - Elimination: only one faction remains (all others have 0 nodes)
 * - Timeout: when timer expires, faction with most nodes wins
 */
export class VictorySystem {
    check(state: GameState): VictoryResult | null {
        if (state.gameOver) return null;

        const activeFactions: { id: FactionId; nodeCount: number }[] = [];
        for (const faction of state.factions.values()) {
            if (!faction.eliminated) {
                activeFactions.push({
                    id: faction.id,
                    nodeCount: faction.nodeCount,
                });
            }
        }

        // Domination / elimination: only one faction has nodes
        if (activeFactions.length === 1) {
            const winner = activeFactions[0]!;
            return { winner: winner.id, reason: "domination" };
        }

        // Timeout check
        if (GAME_DURATION_S > 0 && state.elapsedTime >= GAME_DURATION_S) {
            // Most nodes wins; tiebreak by total troops
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
