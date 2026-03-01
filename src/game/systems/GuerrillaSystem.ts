import {
    GUERRILLA_INTERVAL_S,
    GUERRILLA_BASE_CHANCE,
    GUERRILLA_TROOP_DAMAGE_MIN,
    GUERRILLA_TROOP_DAMAGE_MAX,
    GUERRILLA_SUPPLY_DRAIN,
    GUERRILLA_LOW_THRESHOLD,
    GUERRILLA_HIGH_THRESHOLD,
} from "../../config/constants";
import type { GameState } from "../state/GameState";

export interface GuerrillaRaidEvent {
    nodeId: string;
    troopsLost: number;
    supplyDrained: number;
}

/**
 * Spanish guerrillas automatically raid French-held nodes adjacent to Spanish territory.
 * Not player-controlled — fires periodically based on Spanish territorial strength.
 *
 * - Every GUERRILLA_INTERVAL_S seconds, each French node adjacent to a Spanish node
 *   has a base chance of guerrilla raid
 * - Raid: kills 1-3 troops + drains supply
 * - Intensity scales with Spanish node count
 * - Only targets French (historically accurate)
 */
export class GuerrillaSystem {
    private accumulator = 0;

    /**
     * Update guerrilla timer; returns raid events that occurred this frame.
     * Accepts an optional RNG for testability (defaults to Math.random).
     */
    update(
        state: GameState,
        deltaMs: number,
        rng: () => number = Math.random,
    ): GuerrillaRaidEvent[] {
        this.accumulator += deltaMs;
        const intervalMs = GUERRILLA_INTERVAL_S * 1000;
        const events: GuerrillaRaidEvent[] = [];

        while (this.accumulator >= intervalMs) {
            this.accumulator -= intervalMs;
            events.push(...this.tick(state, rng));
        }

        return events;
    }

    private tick(state: GameState, rng: () => number): GuerrillaRaidEvent[] {
        const events: GuerrillaRaidEvent[] = [];

        // Count Spanish nodes for intensity scaling
        const spanishFaction = state.factions.get("spanish");
        if (!spanishFaction || spanishFaction.eliminated) return events;
        const spanishNodeCount = spanishFaction.nodeCount;
        if (spanishNodeCount === 0) return events;

        // Intensity multiplier based on Spanish territorial strength
        let intensityMultiplier = 1.0;
        if (spanishNodeCount < GUERRILLA_LOW_THRESHOLD) {
            intensityMultiplier = 0.5;
        } else if (spanishNodeCount >= GUERRILLA_HIGH_THRESHOLD) {
            intensityMultiplier = 1.5;
        }

        const raidChance = GUERRILLA_BASE_CHANCE * intensityMultiplier;

        // Find all French nodes adjacent to Spanish territory
        for (const node of state.nodes.values()) {
            if (node.owner !== "french") continue;

            const neighbors = state.adjacency.get(node.id);
            if (!neighbors) continue;

            let adjacentToSpanish = false;
            for (const neighborId of neighbors) {
                const neighbor = state.nodes.get(neighborId);
                if (neighbor && neighbor.owner === "spanish") {
                    adjacentToSpanish = true;
                    break;
                }
            }

            if (!adjacentToSpanish) continue;

            // Roll for raid
            if (rng() < raidChance) {
                const troopDamage = GUERRILLA_TROOP_DAMAGE_MIN +
                    Math.floor(rng() * (GUERRILLA_TROOP_DAMAGE_MAX - GUERRILLA_TROOP_DAMAGE_MIN + 1));

                node.troops = Math.max(0, node.troops - troopDamage);
                node.supply = Math.max(0, node.supply - GUERRILLA_SUPPLY_DRAIN);

                const event: GuerrillaRaidEvent = {
                    nodeId: node.id,
                    troopsLost: troopDamage,
                    supplyDrained: GUERRILLA_SUPPLY_DRAIN,
                };
                events.push(event);

                // Record for UI feedback
                state.guerrillaRaids.push({
                    nodeId: node.id,
                    troopsLost: troopDamage,
                    timestamp: state.elapsedTime,
                });

                // Node reverts to neutral at 0 troops
                if (node.troops === 0) {
                    node.owner = "neutral";
                    node.fortified = false;
                    node.fortifyProgress = 0;
                }
            }
        }

        return events;
    }
}
