import { TROOP_GEN_RATE, TROOP_GEN_INTERVAL_MS } from "../../config/constants";
import type { GameState } from "../state/GameState";

/**
 * Periodically adds troops to all owned (non-neutral) nodes
 * based on the node's type. Unsupplied nodes generate at half rate.
 */
export class TroopGenerationSystem {
    private accumulator = 0;

    update(state: GameState, deltaMs: number): void {
        this.accumulator += deltaMs;

        while (this.accumulator >= TROOP_GEN_INTERVAL_MS) {
            this.accumulator -= TROOP_GEN_INTERVAL_MS;
            this.tick(state);
        }
    }

    private tick(state: GameState): void {
        for (const node of state.nodes.values()) {
            if (node.owner === "neutral") continue;
            const rate = TROOP_GEN_RATE[node.type];
            if (node.supplied) {
                node.troops += rate;
            } else {
                // Unsupplied: half generation rate (floor to avoid fractional troops)
                node.troops += Math.floor(rate / 2);
            }
        }
    }
}
