import { describe, it, expect } from "vitest";
import { TroopGenerationSystem } from "./TroopGenerationSystem";
import { GameState } from "../state/GameState";
import { SCENARIOS } from "../../data/scenarios";
import { TROOP_GEN_INTERVAL_MS, TROOP_GEN_RATE } from "../../config/constants";

function makeState(): GameState {
    return new GameState(SCENARIOS[0]!, ["british"]);
}

describe("TroopGenerationSystem", () => {
    it("generates troops after one tick interval", () => {
        const state = makeState();
        const system = new TroopGenerationSystem();

        const lisbon = state.nodes.get("lisbon")!;
        const before = lisbon.troops;
        expect(lisbon.type).toBe("capital");

        system.update(state, TROOP_GEN_INTERVAL_MS);

        expect(lisbon.troops).toBe(before + TROOP_GEN_RATE.capital);
    });

    it("does not generate before interval is reached", () => {
        const state = makeState();
        const system = new TroopGenerationSystem();

        const lisbon = state.nodes.get("lisbon")!;
        const before = lisbon.troops;

        system.update(state, TROOP_GEN_INTERVAL_MS - 1);

        expect(lisbon.troops).toBe(before);
    });

    it("accumulates and generates for multiple ticks", () => {
        const state = makeState();
        const system = new TroopGenerationSystem();

        const lisbon = state.nodes.get("lisbon")!;
        const before = lisbon.troops;

        // 2.5 ticks worth of time -> 2 generations
        system.update(state, TROOP_GEN_INTERVAL_MS * 2.5);

        expect(lisbon.troops).toBe(before + TROOP_GEN_RATE.capital * 2);
    });
});
