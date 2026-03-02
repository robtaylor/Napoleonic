import { describe, it, expect } from "vitest";
import { GuerrillaSystem } from "./GuerrillaSystem";
import { GameState } from "../state/GameState";
import { SCENARIOS } from "../../data/scenarios";
import {
    GUERRILLA_TICK_INTERVAL_S,
    GUERRILLA_SUPPLY_DRAIN,
    GUERRILLA_AMBUSH_COOLDOWN_S,
    GUERRILLA_AMBUSH_DAMAGE_MIN,
    GUERRILLA_AMBUSH_DAMAGE_MAX,
} from "../../config/constants";

function makeState(): GameState {
    return new GameState(SCENARIOS[0]!, ["british"]);
}

/** Place a guerrilla battalion on a Spanish node */
function deployBattalion(state: GameState, nodeId: string, troops = 5): void {
    const node = state.nodes.get(nodeId)!;
    expect(node.owner).toBe("spanish"); // Sanity check
    node.guerrillaTroops = troops;
    node.guerrillaCooldown = 0;
}

/** Create a fake enemy dispatch traveling between two nodes */
function createEnemyDispatch(
    state: GameState,
    fromId: string,
    toId: string,
    owner: "french" | "british" = "french",
    troops = 10,
) {
    return state.createDispatch(fromId, toId, owner, troops, 0, 0, 100, 100, "troops");
}

describe("GuerrillaSystem", () => {
    it("ambushes adjacent enemy dispatch (troops reduced, cooldown set)", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        // talavera is Spanish and adjacent to madrid (French)
        expect(state.nodes.get("talavera")!.owner).toBe("spanish");
        expect(state.adjacency.get("talavera")!.has("madrid")).toBe(true);

        deployBattalion(state, "talavera");

        // French dispatch from madrid toward some node — it passes through
        // an edge adjacent to talavera's ambush zone
        // madrid is adjacent to talavera, so fromNodeId is in the ambush zone
        const dispatch = createEnemyDispatch(state, "madrid", "burgos");
        const troopsBefore = dispatch.troops;

        const events = system.update(state, 16, () => 0); // rng=0 → min damage

        expect(events.ambushes.length).toBe(1);
        expect(events.ambushes[0]!.dispatchId).toBe(dispatch.id);
        expect(events.ambushes[0]!.troopsKilled).toBeGreaterThanOrEqual(GUERRILLA_AMBUSH_DAMAGE_MIN);
        expect(dispatch.troops).toBeLessThan(troopsBefore);
    });

    it("ambush costs 1 guerrilla troop (attrition)", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        deployBattalion(state, "talavera", 5);
        createEnemyDispatch(state, "madrid", "burgos");

        system.update(state, 16, () => 0);

        expect(state.nodes.get("talavera")!.guerrillaTroops).toBe(4);
    });

    it("cooldown prevents consecutive ambushes", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        deployBattalion(state, "talavera");
        createEnemyDispatch(state, "madrid", "burgos", "french", 20);

        // First ambush
        system.update(state, 16, () => 0);
        expect(state.nodes.get("talavera")!.guerrillaCooldown).toBe(GUERRILLA_AMBUSH_COOLDOWN_S);

        // Create another dispatch — should NOT be ambushed (cooldown active)
        createEnemyDispatch(state, "madrid", "burgos");
        const events2 = system.update(state, 16, () => 0);
        expect(events2.ambushes.length).toBe(0);
    });

    it("battalion dissolves at 0 troops", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        // Battalion with 1 troop — will dissolve after one ambush
        deployBattalion(state, "talavera", 1);
        createEnemyDispatch(state, "madrid", "burgos");

        system.update(state, 16, () => 0);

        expect(state.nodes.get("talavera")!.guerrillaTroops).toBe(0);
        expect(state.nodes.get("talavera")!.guerrillaCooldown).toBe(0);
    });

    it("destroyed dispatch removed from state", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        deployBattalion(state, "talavera", 5);
        // Dispatch with just 1 troop — will be destroyed
        const dispatch = createEnemyDispatch(state, "madrid", "burgos", "french", 1);
        const dispatchId = dispatch.id;

        system.update(state, 16, () => 0);

        // Dispatch should be removed
        const remaining = state.dispatches.find(d => d.id === dispatchId);
        expect(remaining).toBeUndefined();
    });

    it("supply drain hits adjacent enemy nodes each tick", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        deployBattalion(state, "talavera");

        const madrid = state.nodes.get("madrid")!;
        expect(madrid.owner).toBe("french");
        const supplyBefore = madrid.supply;

        // Advance one full tick interval
        const events = system.update(state, GUERRILLA_TICK_INTERVAL_S * 1000, () => 1);

        expect(events.drains.length).toBeGreaterThan(0);
        expect(madrid.supply).toBe(supplyBefore - GUERRILLA_SUPPLY_DRAIN);
    });

    it("does not drain allied or neutral nodes", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        // Find a Spanish node adjacent to a British node (ally)
        // talavera is adjacent to badajoz (British in some setups)
        // Let's check adjacency and find one
        deployBattalion(state, "talavera");

        // Make sure British node supply is tracked
        // Find all talavera neighbors
        const neighbors = state.adjacency.get("talavera")!;
        for (const nid of neighbors) {
            const n = state.nodes.get(nid)!;
            if (n.owner === "british" || n.owner === "neutral") {
                const supplyBefore = n.supply;
                system.update(state, GUERRILLA_TICK_INTERVAL_S * 1000, () => 1);
                // Allied/neutral supply should not have changed
                expect(n.supply).toBe(supplyBefore);
                return; // Test passes
            }
        }
        // If no allied/neutral neighbors found, just verify no drain events for allies
        const events = system.update(state, GUERRILLA_TICK_INTERVAL_S * 1000, () => 1);
        for (const drain of events.drains) {
            const node = state.nodes.get(drain.nodeId)!;
            expect(node.owner).not.toBe("spanish");
            expect(node.owner).not.toBe("british"); // ally
            expect(node.owner).not.toBe("neutral");
        }
    });

    it("no ambush when no battalions exist", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        createEnemyDispatch(state, "madrid", "burgos");

        const events = system.update(state, 16, () => 0);

        expect(events.ambushes.length).toBe(0);
    });

    it("cooldown decreases over time", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        deployBattalion(state, "talavera");
        createEnemyDispatch(state, "madrid", "burgos", "french", 20);

        // Trigger ambush to set cooldown
        system.update(state, 16, () => 0);
        expect(state.nodes.get("talavera")!.guerrillaCooldown).toBe(GUERRILLA_AMBUSH_COOLDOWN_S);

        // Advance 5 seconds
        system.update(state, 5000, () => 1);
        expect(state.nodes.get("talavera")!.guerrillaCooldown).toBeCloseTo(
            GUERRILLA_AMBUSH_COOLDOWN_S - 5,
            1,
        );
    });

    it("multiple battalions near same edge — only one ambushes per dispatch per frame", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        // Find two Spanish nodes adjacent to the same French node
        // talavera is adjacent to madrid. Let's also check other Spanish nodes adjacent to madrid.
        const madridNeighbors = state.adjacency.get("madrid")!;
        const spanishNeighbors: string[] = [];
        for (const nid of madridNeighbors) {
            const n = state.nodes.get(nid)!;
            if (n.owner === "spanish") {
                spanishNeighbors.push(nid);
            }
        }

        if (spanishNeighbors.length < 2) {
            // If we don't have 2 Spanish nodes adjacent to madrid, create the scenario:
            // Set a second node adjacent to madrid as Spanish
            for (const nid of madridNeighbors) {
                const n = state.nodes.get(nid)!;
                if (n.owner !== "spanish" && n.owner !== "french") {
                    n.owner = "spanish";
                    spanishNeighbors.push(nid);
                    if (spanishNeighbors.length >= 2) break;
                }
            }
        }

        expect(spanishNeighbors.length).toBeGreaterThanOrEqual(2);

        // Deploy battalions on both
        deployBattalion(state, spanishNeighbors[0]!);
        deployBattalion(state, spanishNeighbors[1]!);

        // One dispatch from madrid
        const dispatch = createEnemyDispatch(state, "madrid", "burgos");

        const events = system.update(state, 16, () => 0);

        // Only one ambush per dispatch
        const ambushesForDispatch = events.ambushes.filter(a => a.dispatchId === dispatch.id);
        expect(ambushesForDispatch.length).toBe(1);
    });

    it("does not ambush scout dispatches", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        deployBattalion(state, "talavera");

        // Create a scout dispatch from French
        state.createDispatch("madrid", "burgos", "french", 3, 0, 0, 100, 100, "scout");

        const events = system.update(state, 16, () => 0);
        expect(events.ambushes.length).toBe(0);
    });

    it("ambush damage is bounded by min/max constants", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        deployBattalion(state, "talavera", 10);

        // rng=0 should give min damage
        createEnemyDispatch(state, "madrid", "burgos", "french", 20);
        const events1 = system.update(state, 16, () => 0);
        expect(events1.ambushes[0]!.troopsKilled).toBe(GUERRILLA_AMBUSH_DAMAGE_MIN);

        // Reset cooldown for next test
        state.nodes.get("talavera")!.guerrillaCooldown = 0;

        // rng close to 1 should give max damage
        createEnemyDispatch(state, "madrid", "burgos", "french", 20);
        const events2 = system.update(state, 16, () => 0.99);
        expect(events2.ambushes[0]!.troopsKilled).toBe(GUERRILLA_AMBUSH_DAMAGE_MAX);
    });
});
