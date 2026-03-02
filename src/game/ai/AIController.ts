import type { FactionId } from "../../data/factions";
import type { GameState } from "../state/GameState";
import { SUPPLY_ALLIES } from "../../config/constants";

/** Callback to create a troop dispatch (wired by GameScene) */
export type DispatchFn = (fromId: string, toId: string) => void;

/** Callback to start road construction (wired by GameScene) */
export type RoadBuildFn = (fromId: string, targetId: string) => void;

/**
 * Base class for AI controllers.
 * Subclasses implement `evaluate()` to decide which dispatches to make.
 * The AI evaluates on a timer to avoid spamming dispatches every frame.
 */
export abstract class AIController {
    protected accumulator = 0;

    constructor(
        public readonly factionId: FactionId,
        /** Milliseconds between AI evaluations */
        protected evaluationIntervalMs: number,
    ) {}

    update(
        state: GameState,
        deltaMs: number,
        dispatch: DispatchFn,
        roadBuild?: RoadBuildFn,
    ): void {
        this.accumulator += deltaMs;
        if (this.accumulator >= this.evaluationIntervalMs) {
            this.accumulator -= this.evaluationIntervalMs;
            this.evaluate(state, dispatch, roadBuild);
        }
    }

    protected abstract evaluate(
        state: GameState,
        dispatch: DispatchFn,
        roadBuild?: RoadBuildFn,
    ): void;

    /** Check if a faction owner is an enemy (not self, not ally, not neutral counts as enemy) */
    protected isEnemy(owner: FactionId): boolean {
        if (owner === this.factionId) return false;
        if (owner === "neutral") return true;
        const allies = SUPPLY_ALLIES[this.factionId] ?? [];
        return !allies.includes(owner);
    }

    /** Get all nodes owned by this faction */
    protected getOwnedNodes(state: GameState): string[] {
        const result: string[] = [];
        for (const node of state.nodes.values()) {
            if (node.owner === this.factionId) {
                result.push(node.id);
            }
        }
        return result;
    }

    /** Get neighbor nodes with their state */
    protected getNeighborInfo(state: GameState, nodeId: string) {
        const neighbors: { id: string; owner: FactionId; troops: number }[] = [];
        const adj = state.adjacency.get(nodeId);
        if (!adj) return neighbors;
        for (const nid of adj) {
            const node = state.nodes.get(nid);
            if (node) {
                neighbors.push({ id: nid, owner: node.owner, troops: node.troops });
            }
        }
        return neighbors;
    }
}
