import {
    SUPPLY_MAX,
    SUPPLY_DRAIN_PER_SEC,
    SUPPLY_RESTORE_PER_SEC,
    SUPPLY_ATTRITION_THRESHOLD,
    SUPPLY_ATTRITION_TROOPS,
    SUPPLY_SOURCES,
    SUPPLY_ALLIES,
    TROOP_GEN_INTERVAL_MS,
} from "../../config/constants";
import type { FactionId } from "../../data/factions";
import type { GameState } from "../state/GameState";

/**
 * Computes supply connectivity via BFS from supply sources,
 * then drains/restores supply and applies attrition.
 *
 * Supply sources per faction:
 *   French: Madrid, Pamplona, San Sebastián (land border)
 *   British: Lisbon + any owned port (naval superiority)
 *   Spanish: Seville only
 */
export class SupplySystem {
    private attritionAccumulator = 0;

    update(state: GameState, deltaMs: number): void {
        // Recompute supply connectivity for all factions
        this.computeSupply(state);

        // Drain/restore supply levels
        const deltaSec = deltaMs / 1000;
        for (const node of state.nodes.values()) {
            if (node.owner === "neutral") continue;

            if (node.supplied) {
                node.supply = Math.min(SUPPLY_MAX, node.supply + SUPPLY_RESTORE_PER_SEC * deltaSec);
            } else {
                node.supply = Math.max(0, node.supply - SUPPLY_DRAIN_PER_SEC * deltaSec);
            }
        }

        // Attrition: lose troops when below threshold (on troop gen tick)
        this.attritionAccumulator += deltaMs;
        while (this.attritionAccumulator >= TROOP_GEN_INTERVAL_MS) {
            this.attritionAccumulator -= TROOP_GEN_INTERVAL_MS;
            this.applyAttrition(state);
        }
    }

    /**
     * BFS from supply sources through friendly-owned nodes.
     * A node is "supplied" if reachable from any supply source of its owning faction.
     */
    computeSupply(state: GameState): void {
        // First mark all non-neutral nodes as unsupplied
        for (const node of state.nodes.values()) {
            if (node.owner === "neutral") {
                node.supplied = false;
                continue;
            }
            node.supplied = false;
        }

        // BFS per faction
        const factions: FactionId[] = ["french", "british", "spanish"];
        for (const factionId of factions) {
            const sources = this.getSupplySources(state, factionId);
            const visited = new Set<string>();
            const queue: string[] = [];

            // Factions whose territory this faction can traverse for supply
            const traversable = new Set([factionId, ...(SUPPLY_ALLIES[factionId] ?? [])]);

            // Seed BFS with supply sources that this faction owns
            for (const sourceId of sources) {
                const node = state.nodes.get(sourceId);
                if (node && node.owner === factionId) {
                    queue.push(sourceId);
                    visited.add(sourceId);
                }
            }

            // BFS through friendly + allied territory
            while (queue.length > 0) {
                const current = queue.shift()!;
                const node = state.nodes.get(current);
                if (node && node.owner === factionId) {
                    // Only mark nodes owned by this faction as supplied
                    node.supplied = true;
                }

                const neighbors = state.adjacency.get(current);
                if (!neighbors) continue;
                for (const neighborId of neighbors) {
                    if (visited.has(neighborId)) continue;
                    const neighborNode = state.nodes.get(neighborId);
                    if (neighborNode && traversable.has(neighborNode.owner)) {
                        visited.add(neighborId);
                        queue.push(neighborId);
                    }
                }
            }
        }
    }

    /** Get supply source node IDs for a faction */
    private getSupplySources(state: GameState, factionId: FactionId): string[] {
        const staticSources = SUPPLY_SOURCES[factionId] ?? [];

        if (factionId === "british") {
            // British get any owned port as supply source (naval superiority)
            const ports: string[] = [];
            for (const node of state.nodes.values()) {
                if (node.owner === "british" && node.type === "port") {
                    ports.push(node.id);
                }
            }
            // Merge static sources + ports, deduplicate
            const all = new Set([...staticSources, ...ports]);
            return [...all];
        }

        return [...staticSources];
    }

    /** Apply troop attrition to unsupplied nodes below threshold */
    private applyAttrition(state: GameState): void {
        for (const node of state.nodes.values()) {
            if (node.owner === "neutral") continue;
            if (node.supplied) continue;
            if (node.supply >= SUPPLY_ATTRITION_THRESHOLD) continue;

            node.troops = Math.max(0, node.troops - SUPPLY_ATTRITION_TROOPS);

            // Node reverts to neutral at 0 troops
            if (node.troops === 0) {
                node.owner = "neutral";
                node.fortified = false;
                node.fortifyProgress = 0;
            }
        }
    }
}
