import { AIController, type DispatchFn } from "./AIController";
import {
    DISPATCH_FRACTION,
    MIN_GARRISON,
    FORTIFY_COST,
    FORTIFY_BUILD_TIME_S,
    GUERRILLA_DEPLOY_COST,
} from "../../config/constants";
import type { FactionId } from "../../data/factions";
import type { GameState } from "../state/GameState";

/**
 * Medium AI: Influence-map based with coordinated attacks.
 * - Computes a "threat" score for each owned node
 * - Prioritizes defending threatened nodes
 * - Coordinates multi-node attacks on high-value targets
 * - Fortifies capitals when possible
 */
export class MediumAI extends AIController {
    private fortifyCooldown = 0;

    constructor(factionId: FactionId) {
        super(factionId, 2000); // Evaluates every 2 seconds
    }

    protected evaluate(state: GameState, dispatch: DispatchFn, _roadBuild?: (fromId: string, targetId: string) => void): void {
        const owned = this.getOwnedNodes(state);
        if (owned.length === 0) return;

        // Medium AI fortifies capitals
        this.fortifyCooldown -= this.evaluationIntervalMs;
        if (this.fortifyCooldown <= 0) {
            this.tryFortifyCapital(state, owned);
            this.fortifyCooldown = 15000;
        }

        // Spanish AI deploys guerrilla battalions
        if (this.factionId === "spanish") {
            this.tryDeployGuerrilla(state, owned);
        }

        // Build influence map: for each node, compute threat level
        const threats = new Map<string, number>();
        const opportunities = new Map<string, { target: string; deficit: number }>();

        for (const nodeId of owned) {
            const node = state.nodes.get(nodeId)!;
            const neighbors = this.getNeighborInfo(state, nodeId);

            // Threat = sum of nearby enemy troops minus our troops
            let enemyPower = 0;
            let weakestEnemy: { id: string; troops: number } | null = null;

            for (const n of neighbors) {
                if (this.isEnemy(n.owner)) {
                    enemyPower += n.troops;
                    if (!weakestEnemy || n.troops < weakestEnemy.troops) {
                        weakestEnemy = { id: n.id, troops: n.troops };
                    }
                }
            }

            threats.set(nodeId, enemyPower - node.troops);

            if (weakestEnemy) {
                opportunities.set(nodeId, {
                    target: weakestEnemy.id,
                    deficit: weakestEnemy.troops - Math.floor(node.troops * DISPATCH_FRACTION),
                });
            }
        }

        // Priority 1: Defend - reinforce nodes under heavy threat
        const threatened = owned
            .filter((id) => (threats.get(id) ?? 0) > 0)
            .sort((a, b) => (threats.get(b) ?? 0) - (threats.get(a) ?? 0));

        for (const nodeId of threatened) {
            // Find a safe neighbor to pull reinforcements from
            const neighbors = this.getNeighborInfo(state, nodeId);
            const safeFriendly = neighbors
                .filter((n) => n.owner === this.factionId && (threats.get(n.id) ?? 0) < 0)
                .sort((a, b) => b.troops - a.troops);

            if (safeFriendly.length > 0) {
                const source = safeFriendly[0]!;
                const sourceNode = state.nodes.get(source.id)!;
                const sendCount = Math.floor(sourceNode.troops * DISPATCH_FRACTION);
                if (sendCount >= 1 && sourceNode.troops - sendCount >= MIN_GARRISON) {
                    dispatch(source.id, nodeId);
                    return;
                }
            }
        }

        // Priority 2: Attack - find best opportunity where we can win
        const attacks = [...opportunities.entries()]
            .filter(([, opp]) => opp.deficit < 0) // We have enough to win
            .sort(([, a], [, b]) => a.deficit - b.deficit); // Most surplus first

        if (attacks.length > 0) {
            const [fromId, opp] = attacks[0]!;
            const node = state.nodes.get(fromId)!;
            const sendCount = Math.floor(node.troops * DISPATCH_FRACTION);
            if (sendCount >= 1 && node.troops - sendCount >= MIN_GARRISON) {
                dispatch(fromId, opp.target);
                return;
            }
        }

        // Priority 3: Expand - send troops toward enemy territory
        const frontline = owned.filter((id) => {
            const neighbors = this.getNeighborInfo(state, id);
            return neighbors.some((n) => this.isEnemy(n.owner));
        });

        const interior = owned.filter((id) => !frontline.includes(id));

        for (const nodeId of interior) {
            const node = state.nodes.get(nodeId)!;
            const sendCount = Math.floor(node.troops * DISPATCH_FRACTION);
            if (sendCount < 2 || node.troops - sendCount < MIN_GARRISON) continue;

            // Send toward frontline
            const neighbors = this.getNeighborInfo(state, nodeId);
            const towardFront = neighbors.filter((n) =>
                n.owner === this.factionId && frontline.includes(n.id),
            );

            if (towardFront.length > 0) {
                // Pick the one with fewest troops (needs reinforcement most)
                towardFront.sort((a, b) => a.troops - b.troops);
                dispatch(nodeId, towardFront[0]!.id);
                return;
            }
        }
    }

    /** Deploy a guerrilla battalion on a frontier node (Spanish only) */
    private tryDeployGuerrilla(state: GameState, owned: string[]): void {
        for (const nodeId of owned) {
            const node = state.nodes.get(nodeId)!;
            if (node.guerrillaTroops > 0) continue;
            if (node.troops < GUERRILLA_DEPLOY_COST + MIN_GARRISON + 3) continue;

            // Must be adjacent to enemy
            const neighbors = this.getNeighborInfo(state, nodeId);
            const hasEnemy = neighbors.some((n) => this.isEnemy(n.owner));
            if (!hasEnemy) continue;

            node.troops -= GUERRILLA_DEPLOY_COST;
            node.guerrillaTroops = GUERRILLA_DEPLOY_COST;
            node.guerrillaCooldown = 0;
            return; // One deployment per evaluation
        }
    }

    /** Medium AI only fortifies capitals */
    private tryFortifyCapital(state: GameState, owned: string[]): void {
        for (const nodeId of owned) {
            const node = state.nodes.get(nodeId)!;
            if (node.type !== "capital") continue;
            if (node.fortified || node.fortifyProgress > 0) continue;
            if (node.troops < FORTIFY_COST + MIN_GARRISON + 3) continue;

            node.troops -= FORTIFY_COST;
            node.fortifyProgress = FORTIFY_BUILD_TIME_S;
            return;
        }
    }
}
