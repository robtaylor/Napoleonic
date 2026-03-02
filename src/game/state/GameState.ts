import { STARTING_TROOPS, SUPPLY_MAX } from "../../config/constants";
import type { FactionId } from "../../data/factions";
import { NODES, type NodeDef } from "../../data/nodes";
import { EDGES, type EdgeDef } from "../../data/edges";
import type { ScenarioDef } from "../../data/scenarios";
import type { NodeState } from "./NodeState";
import type { FactionState } from "./FactionState";
import type { TroopDispatch, DispatchType } from "./TroopDispatch";

/** A road currently being built by engineers */
export interface RoadConstruction {
    fromNodeId: string;
    toNodeId: string;
    owner: FactionId;
    /** Seconds remaining until construction completes */
    remainingTime: number;
}

export type GameMode = "short" | "long";

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

    /** Game mode: short (5 min timer) or long (no timer) */
    gameMode: GameMode = "short";

    /** Continuous seconds French has held 20+ nodes (for French victory condition) */
    frenchDominanceTimer = 0;

    /** Recent guerrilla raid events for UI feedback */
    guerrillaRaids: { nodeId: string; troopsLost: number; timestamp: number; type: "ambush" | "drain" }[] = [];

    /** Roads currently under construction */
    roadsUnderConstruction: RoadConstruction[] = [];

    constructor(
        scenario: ScenarioDef,
        humanFactions: FactionId[],
        gameMode: GameMode = "short",
    ) {
        this.edges = EDGES;
        this.gameMode = gameMode;

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
                supply: SUPPLY_MAX,
                supplied: true,
                fortified: false,
                fortifyProgress: 0,
                scoutedBy: {},
                guerrillaTroops: 0,
                guerrillaCooldown: 0,
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
        dispatchType: DispatchType = "troops",
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
            dispatchType,
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

    /** Get all nodes owned by a given faction */
    getNodesOwnedBy(factionId: FactionId): NodeState[] {
        const result: NodeState[] = [];
        for (const node of this.nodes.values()) {
            if (node.owner === factionId) result.push(node);
        }
        return result;
    }

    /**
     * Find valid road-build targets from a node: nodes exactly 2 hops away
     * that are not already directly connected, reachable through a friendly
     * intermediate node. Returns pairs of [targetId, intermediateId].
     */
    getRoadBuildTargets(nodeId: string, factionId: FactionId): { targetId: string; viaId: string }[] {
        const directNeighbors = this.adjacency.get(nodeId);
        if (!directNeighbors) return [];

        const results: { targetId: string; viaId: string }[] = [];
        const seen = new Set<string>();

        for (const midId of directNeighbors) {
            const midNode = this.nodes.get(midId);
            // Intermediate node must be friendly
            if (!midNode || midNode.owner !== factionId) continue;

            const midNeighbors = this.adjacency.get(midId);
            if (!midNeighbors) continue;

            for (const targetId of midNeighbors) {
                // Skip self, direct neighbors, and already-seen targets
                if (targetId === nodeId) continue;
                if (directNeighbors.has(targetId)) continue;
                if (seen.has(targetId)) continue;

                // Skip if road already under construction between these nodes
                const alreadyBuilding = this.roadsUnderConstruction.some(
                    (r) =>
                        (r.fromNodeId === nodeId && r.toNodeId === targetId) ||
                        (r.fromNodeId === targetId && r.toNodeId === nodeId),
                );
                if (alreadyBuilding) continue;

                seen.add(targetId);
                results.push({ targetId, viaId: midId });
            }
        }

        return results;
    }

    /** Add a new dynamic edge to the game graph */
    addEdge(fromId: string, toId: string): void {
        const edge: EdgeDef = [fromId, toId];
        this.edges.push(edge);

        if (!this.adjacency.has(fromId)) this.adjacency.set(fromId, new Set());
        if (!this.adjacency.has(toId)) this.adjacency.set(toId, new Set());
        this.adjacency.get(fromId)!.add(toId);
        this.adjacency.get(toId)!.add(fromId);
    }
}
