import { describe, it, expect } from "vitest";
import { VictorySystem } from "./VictorySystem";
import { GameState } from "../state/GameState";
import { SCENARIOS } from "../../data/scenarios";
import { GAME_DURATION_S } from "../../config/constants";

function makeState(): GameState {
    return new GameState(SCENARIOS[0]!, ["british"]);
}

describe("VictorySystem", () => {
    const system = new VictorySystem();

    it("returns null when game is contested", () => {
        const state = makeState();
        expect(system.check(state)).toBeNull();
    });

    it("detects domination when one faction owns all", () => {
        const state = makeState();

        // Give all nodes to british
        for (const node of state.nodes.values()) {
            node.owner = "british";
        }
        state.recalcFactionStats();

        const result = system.check(state);
        expect(result).not.toBeNull();
        expect(result!.winner).toBe("british");
        expect(result!.reason).toBe("domination");
    });

    it("detects timeout winner by node count", () => {
        const state = makeState();
        state.elapsedTime = GAME_DURATION_S + 1;

        const result = system.check(state);
        expect(result).not.toBeNull();
        expect(result!.reason).toBe("timeout");
        // Spanish have most cities in 1808 scenario
        expect(result!.winner).toBe("spanish");
    });

    it("does not trigger after gameOver", () => {
        const state = makeState();
        state.gameOver = true;
        // Even with all nodes owned by one faction
        for (const node of state.nodes.values()) {
            node.owner = "british";
        }
        state.recalcFactionStats();

        expect(system.check(state)).toBeNull();
    });
});
