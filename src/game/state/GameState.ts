import { STARTING_TROOPS } from "../../config/constants";
import type { FactionId } from "../../data/factions";
import { NODES, type NodeDef } from "../../data/nodes";
import { EDGES, type EdgeDef } from "../../data/edges";
import type { ScenarioDef } from "../../data/scenarios";
import type { NodeState } from "./NodeState";
import type { FactionState } from "./FactionState";
import type { TroopDispatch } from "./TroopDispatch";

/**
 * Central game state container.
 * All mutable game data lives here; systems read/write this state.
 */
export class GameState {
    nodes: Map<string, NodeState> = new Map();
    factions: Map<FactionId, FactionState> = new Map();
    dispatches: TroopDispatch[] = [];
    edges: EdgeDef[];
    adjacency: Map<string, Set<string>> = new Map();

    /** Monotonically increasing dispatch ID counter */
    private nextDispatchId = 1;

    /** Elapsed game time in seconds */
    elapsedTime = 0;

    /** Whether the game has ended */
    gameOver = false;
    winner: FactionId | null = null;

    constructor(
        scenario: ScenarioDef,
        humanFactions: FactionId[],
    ) {
        this.edges = EDGES;

        // Build adjacency map
        for (const [from, to] of EDGES) {
            if (!this.adjacency.has(from)) this.adjacency.set(from, new Set());
            if (!this.adjacency.has(to)) this.adjacency.set(to, new Set());
            this.adjacency.get(from)!.add(to);
            this.adjacency.get(to)!.add(from);
        }

        // Initialize nodes with scenario overrides
        for (const nodeDef of NODES) {
            const owner = scenario.overrides[nodeDef.id] ?? nodeDef.startingFaction;
            this.nodes.set(nodeDef.id, {
                id: nodeDef.id,
                owner,
                troops: STARTING_TROOPS[nodeDef.type],
                type: nodeDef.type,
            });
        }

        // Initialize factions
        const activeFactions: FactionId[] = ["french", "british", "spanish"];
        for (const factionId of activeFactions) {
            this.factions.set(factionId, {
                id: factionId,
                isHuman: humanFactions.includes(factionId),
                nodeCount: 0,
                totalTroops: 0,
                eliminated: false,
            });
        }

        this.recalcFactionStats();
    }

    /** Create a new troop dispatch and return it */
    createDispatch(
        fromNodeId: string,
        toNodeId: string,
        owner: FactionId,
        troops: number,
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
    ): TroopDispatch {
        const dispatch: TroopDispatch = {
            id: this.nextDispatchId++,
            fromNodeId,
            toNodeId,
            owner,
            troops,
            progress: 0,
            fromX,
            fromY,
            toX,
            toY,
        };
        this.dispatches.push(dispatch);
        return dispatch;
    }

    /** Remove completed dispatches */
    removeDispatch(id: number): void {
        this.dispatches = this.dispatches.filter((d) => d.id !== id);
    }

    /** Recalculate faction stats from node ownership */
    recalcFactionStats(): void {
        for (const faction of this.factions.values()) {
            faction.nodeCount = 0;
            faction.totalTroops = 0;
        }

        for (const node of this.nodes.values()) {
            const faction = this.factions.get(node.owner);
            if (faction) {
                faction.nodeCount++;
                faction.totalTroops += node.troops;
            }
        }

        // Check elimination
        for (const faction of this.factions.values()) {
            if (faction.nodeCount === 0 && !faction.eliminated) {
                faction.eliminated = true;
            }
        }
    }

    /** Get all node definitions (for UI lookups) */
    getNodeDef(nodeId: string): NodeDef | undefined {
        return NODES.find((n) => n.id === nodeId);
    }

    /** Check if two nodes are connected */
    areConnected(nodeA: string, nodeB: string): boolean {
        return this.adjacency.get(nodeA)?.has(nodeB) ?? false;
    }
}
