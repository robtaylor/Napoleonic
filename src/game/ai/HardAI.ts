import { AIController, type DispatchFn, type RoadBuildFn } from "./AIController";
import {
    DISPATCH_FRACTION,
    MIN_GARRISON,
    TROOP_GEN_RATE,
    FORTIFY_COST,
    FORTIFY_BUILD_TIME_S,
    ROAD_BUILD_COST,
} from "../../config/constants";
import type { FactionId } from "../../data/factions";
import type { GameState } from "../state/GameState";
import type { NodeState } from "../state/NodeState";

/**
 * Hard AI: Utility-based lookahead with economy focus.
 * - Values high-production nodes (capitals, fortresses)
 * - Computes expected outcome of each possible attack
 * - Manages economy: avoids sending all troops, keeps reserves
 * - Multiple dispatches per evaluation when advantageous
 * - Supply-aware: avoids overextending, fortifies frontier
 */
export class HardAI extends AIController {
    private actionsThisTurn = 0;
    private readonly maxActionsPerTurn = 2;
    private fortifyCooldown = 0;
    private roadBuildCooldown = 0;

    constructor(factionId: FactionId) {
        super(factionId, 1500); // Faster evaluation: every 1.5 seconds
    }

    protected evaluate(state: GameState, dispatch: DispatchFn, roadBuild?: RoadBuildFn): void {
        this.actionsThisTurn = 0;
        const owned = this.getOwnedNodes(state);
        if (owned.length === 0) return;

        // Fortification: Hard AI fortifies frontier nodes
        this.fortifyCooldown -= this.evaluationIntervalMs;
        if (this.fortifyCooldown <= 0) {
            this.tryFortify(state, owned);
            this.fortifyCooldown = 10000; // Check every 10 seconds
        }

        // Road building: Hard AI builds roads to create shortcuts
        this.roadBuildCooldown -= this.evaluationIntervalMs;
        if (this.roadBuildCooldown <= 0 && roadBuild) {
            this.tryBuildRoad(state, owned, roadBuild);
            this.roadBuildCooldown = 20000; // Check every 20 seconds
        }

        // Score all possible attacks
        const candidates: {
            fromId: string;
            toId: string;
            utility: number;
            sendCount: number;
        }[] = [];

        for (const nodeId of owned) {
            const node = state.nodes.get(nodeId)!;
            const sendCount = Math.floor(node.troops * DISPATCH_FRACTION);
            if (sendCount < 1 || node.troops - sendCount < MIN_GARRISON) continue;

            const neighbors = this.getNeighborInfo(state, nodeId);

            for (const neighbor of neighbors) {
                if (neighbor.owner === this.factionId) {
                    // Reinforce: only if neighbor is on frontline and weak
                    const neighborNeighbors = this.getNeighborInfo(state, neighbor.id);
                    const hasEnemyNeighbor = neighborNeighbors.some(
                        (n) => n.owner !== this.factionId,
                    );
                    if (hasEnemyNeighbor && neighbor.troops < sendCount) {
                        candidates.push({
                            fromId: nodeId,
                            toId: neighbor.id,
                            utility: this.reinforceUtility(state, node, neighbor.id),
                            sendCount,
                        });
                    }
                } else {
                    // Attack
                    const targetNode = state.nodes.get(neighbor.id);
                    if (!targetNode) continue;
                    const utility = this.attackUtility(
                        sendCount,
                        targetNode,
                        node,
                    );
                    if (utility > 0) {
                        candidates.push({
                            fromId: nodeId,
                            toId: neighbor.id,
                            utility,
                            sendCount,
                        });
                    }
                }
            }
        }

        // Sort by utility descending and execute top actions
        candidates.sort((a, b) => b.utility - a.utility);

        const usedSources = new Set<string>();
        for (const candidate of candidates) {
            if (this.actionsThisTurn >= this.maxActionsPerTurn) break;
            if (usedSources.has(candidate.fromId)) continue;

            dispatch(candidate.fromId, candidate.toId);
            usedSources.add(candidate.fromId);
            this.actionsThisTurn++;
        }
    }

    /** Utility of attacking a target node */
    private attackUtility(
        sendCount: number,
        target: NodeState,
        source: NodeState,
    ): number {
        // Account for fortification
        let effectiveSend = sendCount;
        if (target.fortified) {
            effectiveSend = Math.floor(sendCount * 0.7);
        }

        const surplus = effectiveSend - target.troops;
        if (surplus <= 0) return -1; // Can't win

        // Value of capturing the node (production potential)
        const captureValue = TROOP_GEN_RATE[target.type] * 10;

        // Penalty for leaving source weak
        const remainingAtSource = source.troops - sendCount;
        const sourceSafetyPenalty = remainingAtSource < 3 ? -5 : 0;

        // Bonus for overwhelming victory (more surplus = safer)
        const surplusBonus = Math.min(surplus, 10);

        // Supply bonus: prefer attacking nodes that improve supply chain
        const supplyBonus = source.supplied ? 0 : -3;

        return captureValue + surplusBonus + sourceSafetyPenalty + supplyBonus;
    }

    /** Utility of reinforcing a friendly node */
    private reinforceUtility(_state: GameState, source: NodeState, targetId: string): number {
        const targetNode = _state.nodes.get(targetId);
        if (!targetNode) return 0;

        const diff = source.troops - targetNode.troops;
        let utility = Math.max(0, diff * 0.5 - 2);

        // Bonus for reinforcing unsupplied nodes (they need it more)
        if (!targetNode.supplied) {
            utility += 3;
        }

        return utility;
    }

    /** Try to build a road to create a shortcut between owned nodes */
    private tryBuildRoad(state: GameState, owned: string[], roadBuild: RoadBuildFn): void {
        for (const nodeId of owned) {
            const node = state.nodes.get(nodeId)!;
            if (node.troops < ROAD_BUILD_COST + MIN_GARRISON + 5) continue;

            const targets = state.getRoadBuildTargets(nodeId, this.factionId);
            if (targets.length === 0) continue;

            // Prefer building roads toward frontier nodes or high-value targets
            let bestTarget: { targetId: string; viaId: string } | null = null;
            let bestScore = -Infinity;

            for (const target of targets) {
                const targetNode = state.nodes.get(target.targetId);
                if (!targetNode) continue;

                let score = 0;
                // Prefer connecting to own nodes (supply route shortcuts)
                if (targetNode.owner === this.factionId) {
                    score += 5;
                    // Bonus for connecting to unsupplied nodes
                    if (!targetNode.supplied) score += 10;
                }
                // Prefer connecting to enemy frontier (attack routes)
                if (targetNode.owner !== this.factionId && targetNode.owner !== "neutral") {
                    score += 3;
                }
                // Prefer high-value nodes
                score += TROOP_GEN_RATE[targetNode.type] * 2;

                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = target;
                }
            }

            if (bestTarget && bestScore > 3) {
                node.troops -= ROAD_BUILD_COST;
                roadBuild(nodeId, bestTarget.targetId);
                return; // One road per check
            }
        }
    }

    /** Try to fortify frontier nodes */
    private tryFortify(state: GameState, owned: string[]): void {
        for (const nodeId of owned) {
            const node = state.nodes.get(nodeId)!;
            if (node.fortified || node.fortifyProgress > 0) continue;
            if (node.troops < FORTIFY_COST + MIN_GARRISON + 5) continue; // Keep some troops

            // Only fortify frontier nodes (adjacent to enemy)
            const neighbors = this.getNeighborInfo(state, nodeId);
            const isFrontier = neighbors.some((n) => n.owner !== this.factionId);
            const isCapital = node.type === "capital";

            if (isFrontier || isCapital) {
                node.troops -= FORTIFY_COST;
                node.fortifyProgress = FORTIFY_BUILD_TIME_S;
                return; // One fortify per check
            }
        }
    }
}
