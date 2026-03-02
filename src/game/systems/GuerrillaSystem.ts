import {
    GUERRILLA_TICK_INTERVAL_S,
    GUERRILLA_SUPPLY_DRAIN,
    GUERRILLA_AMBUSH_COOLDOWN_S,
    GUERRILLA_AMBUSH_DAMAGE_MIN,
    GUERRILLA_AMBUSH_DAMAGE_MAX,
    SUPPLY_ALLIES,
} from "../../config/constants";
import type { FactionId } from "../../data/factions";
import type { GameState } from "../state/GameState";

export interface GuerrillaAmbushEvent {
    nodeId: string;
    dispatchId: number;
    troopsKilled: number;
}

export interface GuerrillaDrainEvent {
    nodeId: string;
    supplyDrained: number;
}

export interface GuerrillaEvents {
    ambushes: GuerrillaAmbushEvent[];
    drains: GuerrillaDrainEvent[];
}

/** Check if faction `a` considers faction `b` an enemy */
function isEnemyFaction(a: FactionId, b: FactionId): boolean {
    if (a === b || a === "neutral" || b === "neutral") return false;
    const allies = SUPPLY_ALLIES[a] ?? [];
    return !allies.includes(b);
}

/**
 * Guerrilla Battalion System.
 *
 * Player (or AI) deploys battalions on owned Spanish nodes adjacent to
 * enemy territory. Battalions:
 * - Ambush enemy dispatches traveling along edges adjacent to the battalion node
 * - Drain supply from adjacent enemy nodes each tick
 * - Lose 1 troop per ambush (attrition); dissolve at 0
 * - Have a cooldown between ambushes
 */
export class GuerrillaSystem {
    private drainAccumulator = 0;

    /**
     * Update guerrilla battalions. Returns events for UI feedback.
     * @param rng Injectable RNG for testability (defaults to Math.random)
     */
    update(
        state: GameState,
        deltaMs: number,
        rng: () => number = Math.random,
    ): GuerrillaEvents {
        const deltaSec = deltaMs / 1000;
        const events: GuerrillaEvents = { ambushes: [], drains: [] };

        // 1. Decrement cooldowns on all battalions
        for (const node of state.nodes.values()) {
            if (node.guerrillaTroops > 0 && node.guerrillaCooldown > 0) {
                node.guerrillaCooldown = Math.max(0, node.guerrillaCooldown - deltaSec);
            }
        }

        // 2. Ambush enemy dispatches
        // Build coverage map: guerrilla node -> set of adjacent node IDs (ambush zone)
        const ambushZones = new Map<string, { owner: FactionId; neighbors: Set<string> }>();
        for (const node of state.nodes.values()) {
            if (node.guerrillaTroops <= 0 || node.guerrillaCooldown > 0) continue;
            const adj = state.adjacency.get(node.id);
            if (!adj) continue;
            ambushZones.set(node.id, { owner: node.owner, neighbors: adj });
        }

        // Track dispatches already ambushed this frame (one ambush per dispatch)
        const ambushedDispatches = new Set<number>();
        // Track dispatches to remove (destroyed)
        const destroyedDispatchIds: number[] = [];

        for (const [guerrillaNodeId, zone] of ambushZones) {
            const guerrillaNode = state.nodes.get(guerrillaNodeId);
            if (!guerrillaNode || guerrillaNode.guerrillaTroops <= 0) continue;

            for (const dispatch of state.dispatches) {
                if (ambushedDispatches.has(dispatch.id)) continue;
                if (dispatch.dispatchType === "scout") continue; // Scouts avoid ambush

                // Dispatch must be an enemy of the guerrilla's owner
                if (!isEnemyFaction(guerrillaNode.owner, dispatch.owner)) continue;

                // Dispatch is in the ambush zone if fromNodeId or toNodeId is adjacent
                const fromInZone = zone.neighbors.has(dispatch.fromNodeId);
                const toInZone = zone.neighbors.has(dispatch.toNodeId);
                if (!fromInZone && !toInZone) continue;

                // Ambush! Roll damage
                const maxDamage = GUERRILLA_AMBUSH_DAMAGE_MIN +
                    Math.floor(rng() * (GUERRILLA_AMBUSH_DAMAGE_MAX - GUERRILLA_AMBUSH_DAMAGE_MIN + 1));
                const damage = Math.min(guerrillaNode.guerrillaTroops, maxDamage, dispatch.troops);

                dispatch.troops -= damage;
                guerrillaNode.guerrillaTroops -= 1; // Attrition: lose 1 per ambush
                guerrillaNode.guerrillaCooldown = GUERRILLA_AMBUSH_COOLDOWN_S;
                ambushedDispatches.add(dispatch.id);

                events.ambushes.push({
                    nodeId: guerrillaNodeId,
                    dispatchId: dispatch.id,
                    troopsKilled: damage,
                });

                // Record for HUD
                state.guerrillaRaids.push({
                    nodeId: guerrillaNodeId,
                    troopsLost: damage,
                    timestamp: state.elapsedTime,
                    type: "ambush",
                });

                // Dispatch destroyed?
                if (dispatch.troops <= 0) {
                    destroyedDispatchIds.push(dispatch.id);
                }

                // Battalion dissolved?
                if (guerrillaNode.guerrillaTroops <= 0) {
                    guerrillaNode.guerrillaTroops = 0;
                    guerrillaNode.guerrillaCooldown = 0;
                    break; // This battalion is gone
                }
            }
        }

        // Remove destroyed dispatches
        for (const id of destroyedDispatchIds) {
            state.removeDispatch(id);
        }

        // 3. Supply drain (tick-gated)
        this.drainAccumulator += deltaMs;
        const drainIntervalMs = GUERRILLA_TICK_INTERVAL_S * 1000;

        while (this.drainAccumulator >= drainIntervalMs) {
            this.drainAccumulator -= drainIntervalMs;

            for (const node of state.nodes.values()) {
                if (node.guerrillaTroops <= 0) continue;

                const adj = state.adjacency.get(node.id);
                if (!adj) continue;

                for (const neighborId of adj) {
                    const neighbor = state.nodes.get(neighborId);
                    if (!neighbor) continue;
                    if (!isEnemyFaction(node.owner, neighbor.owner)) continue;

                    const drained = Math.min(neighbor.supply, GUERRILLA_SUPPLY_DRAIN);
                    neighbor.supply -= drained;

                    if (drained > 0) {
                        events.drains.push({
                            nodeId: neighborId,
                            supplyDrained: drained,
                        });

                        state.guerrillaRaids.push({
                            nodeId: neighborId,
                            troopsLost: 0,
                            timestamp: state.elapsedTime,
                            type: "drain",
                        });
                    }
                }
            }
        }

        return events;
    }
}
