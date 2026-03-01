import { describe, it, expect } from "vitest";
import { GuerrillaSystem } from "./GuerrillaSystem";
import { GameState } from "../state/GameState";
import { SCENARIOS } from "../../data/scenarios";
import {
    GUERRILLA_INTERVAL_S,
    GUERRILLA_SUPPLY_DRAIN,
} from "../../config/constants";

function makeState(): GameState {
    return new GameState(SCENARIOS[0]!, ["british"]);
}

describe("GuerrillaSystem", () => {
    it("raids French nodes adjacent to Spanish territory", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        // In 1808 scenario, Madrid is French and borders talavera (Spanish)
        // via bailen-madrid edge. Let's verify there's adjacency.
        const madridNeighbors = state.adjacency.get("madrid")!;
        // talavera is Spanish in 1808 and adjacent to madrid
        expect(madridNeighbors.has("talavera")).toBe(true);
        expect(state.nodes.get("talavera")!.owner).toBe("spanish");
        expect(state.nodes.get("madrid")!.owner).toBe("french");

        const madridBefore = state.nodes.get("madrid")!.troops;

        // RNG always returns 0 (below any chance threshold = always raid)
        const events = system.update(state, GUERRILLA_INTERVAL_S * 1000, () => 0);

        expect(events.length).toBeGreaterThan(0);
        // Madrid should have been raided (it borders Spanish talavera)
        const madridRaid = events.find((e) => e.nodeId === "madrid");
        expect(madridRaid).toBeDefined();
        expect(state.nodes.get("madrid")!.troops).toBeLessThan(madridBefore);
    });

    it("does not raid non-French nodes", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        // British lisbon should never be raided
        const lisbonBefore = state.nodes.get("lisbon")!.troops;

        const events = system.update(state, GUERRILLA_INTERVAL_S * 1000, () => 0);

        const lisbonRaid = events.find((e) => e.nodeId === "lisbon");
        expect(lisbonRaid).toBeUndefined();
        expect(state.nodes.get("lisbon")!.troops).toBe(lisbonBefore);
    });

    it("does not raid when Spanish is eliminated", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        // Eliminate Spanish
        for (const node of state.nodes.values()) {
            if (node.owner === "spanish") {
                node.owner = "french";
            }
        }
        state.recalcFactionStats();

        const events = system.update(state, GUERRILLA_INTERVAL_S * 1000, () => 0);
        expect(events.length).toBe(0);
    });

    it("does not fire before interval", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        const events = system.update(state, (GUERRILLA_INTERVAL_S * 1000) - 1, () => 0);
        expect(events.length).toBe(0);
    });

    it("drains supply on raided nodes", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        const madrid = state.nodes.get("madrid")!;
        const supplyBefore = madrid.supply;

        system.update(state, GUERRILLA_INTERVAL_S * 1000, () => 0);

        expect(madrid.supply).toBe(supplyBefore - GUERRILLA_SUPPLY_DRAIN);
    });

    it("no raid when RNG is above threshold", () => {
        const state = makeState();
        const system = new GuerrillaSystem();

        // RNG always returns 1.0 (above any chance) — no raids
        const events = system.update(state, GUERRILLA_INTERVAL_S * 1000, () => 1.0);
        expect(events.length).toBe(0);
    });

    it("records raids in gameState for UI feedback", () => {
        const state = makeState();
        const system = new GuerrillaSystem();
        state.elapsedTime = 10;

        system.update(state, GUERRILLA_INTERVAL_S * 1000, () => 0);

        expect(state.guerrillaRaids.length).toBeGreaterThan(0);
        expect(state.guerrillaRaids[0]!.timestamp).toBe(10);
    });
});
