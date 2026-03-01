import { describe, it, expect } from "vitest";
import { VictorySystem } from "./VictorySystem";
import { GameState } from "../state/GameState";
import { SCENARIOS } from "../../data/scenarios";
import {
    GAME_DURATION_S,
    FRENCH_DOMINATION_NODES,
    FRENCH_HOLD_DURATION_S,
    BRITISH_FRENCH_MAX_NODES,
    BRITISH_ALLIED_MIN_NODES,
    SPANISH_VICTORY_DELAY_S,
    SPANISH_MIN_NODES,
} from "../../config/constants";

function makeState(mode: "short" | "long" = "short"): GameState {
    return new GameState(SCENARIOS[0]!, ["british"], mode);
}

describe("VictorySystem", () => {
    const system = new VictorySystem();

    it("returns null when game is contested", () => {
        const state = makeState();
        expect(system.check(state)).toBeNull();
    });

    it("does not trigger after gameOver", () => {
        const state = makeState();
        state.gameOver = true;
        for (const node of state.nodes.values()) {
            node.owner = "british";
        }
        state.recalcFactionStats();
        expect(system.check(state)).toBeNull();
    });

    describe("elimination", () => {
        it("detects when one faction owns all nodes", () => {
            const state = makeState();
            for (const node of state.nodes.values()) {
                node.owner = "british";
            }
            state.recalcFactionStats();

            const result = system.check(state);
            expect(result).not.toBeNull();
            expect(result!.winner).toBe("british");
            expect(result!.reason).toBe("elimination");
        });
    });

    describe("French victory: hold 20+ nodes for 60s", () => {
        it("does not trigger before hold duration", () => {
            const state = makeState();

            // Give French 20+ nodes
            let count = 0;
            for (const node of state.nodes.values()) {
                if (count < FRENCH_DOMINATION_NODES) {
                    node.owner = "french";
                    count++;
                }
            }
            state.recalcFactionStats();

            // Simulate 59 seconds of holding (not enough)
            const freshSystem = new VictorySystem();
            for (let i = 0; i < 59; i++) {
                const result = freshSystem.check(state, 1000);
                if (result && result.reason === "french_hold") {
                    throw new Error("Should not trigger yet");
                }
            }
        });

        it("triggers after holding for 60s", () => {
            const state = makeState();
            const freshSystem = new VictorySystem();

            let count = 0;
            for (const node of state.nodes.values()) {
                if (count < FRENCH_DOMINATION_NODES) {
                    node.owner = "french";
                    count++;
                }
            }
            state.recalcFactionStats();

            // Simulate enough time
            let result = null;
            for (let i = 0; i < FRENCH_HOLD_DURATION_S + 1; i++) {
                result = freshSystem.check(state, 1000);
                if (result) break;
            }

            expect(result).not.toBeNull();
            expect(result!.winner).toBe("french");
            expect(result!.reason).toBe("french_hold");
        });

        it("resets timer when French drops below threshold", () => {
            const state = makeState();
            const freshSystem = new VictorySystem();

            // Give French 20+ nodes
            let count = 0;
            for (const node of state.nodes.values()) {
                if (count < FRENCH_DOMINATION_NODES) {
                    node.owner = "french";
                    count++;
                }
            }
            state.recalcFactionStats();

            // Hold for 30 seconds
            for (let i = 0; i < 30; i++) {
                freshSystem.check(state, 1000);
            }
            expect(state.frenchDominanceTimer).toBeGreaterThan(0);

            // Drop below threshold
            let dropped = 0;
            for (const node of state.nodes.values()) {
                if (node.owner === "french" && dropped < 5) {
                    node.owner = "spanish";
                    dropped++;
                }
            }
            state.recalcFactionStats();

            freshSystem.check(state, 1000);
            expect(state.frenchDominanceTimer).toBe(0);
        });
    });

    describe("British victory: French expelled", () => {
        it("triggers when French ≤5 nodes and allied hold 20+", () => {
            const state = makeState();
            const nodes = [...state.nodes.values()];

            // Give British many nodes, Spanish some, French few
            let britishCount = 0;
            let spanishCount = 0;
            let frenchCount = 0;
            for (const node of nodes) {
                if (frenchCount < BRITISH_FRENCH_MAX_NODES) {
                    node.owner = "french";
                    frenchCount++;
                } else if (britishCount < 15) {
                    node.owner = "british";
                    britishCount++;
                } else {
                    node.owner = "spanish";
                    spanishCount++;
                }
            }
            state.recalcFactionStats();

            const allied = state.factions.get("british")!.nodeCount +
                state.factions.get("spanish")!.nodeCount;
            expect(allied).toBeGreaterThanOrEqual(BRITISH_ALLIED_MIN_NODES);

            const result = system.check(state);
            expect(result).not.toBeNull();
            expect(result!.winner).toBe("british");
            expect(result!.reason).toBe("british_expel");
        });

        it("does not trigger when French has too many nodes", () => {
            const state = makeState();
            const result = system.check(state);
            expect(result).toBeNull();
        });
    });

    describe("Spanish victory: endure and match", () => {
        it("triggers after 3 min when Spanish ≥ French with 5+ nodes", () => {
            const state = makeState();
            state.elapsedTime = SPANISH_VICTORY_DELAY_S + 1;

            // Set up: Spanish has more nodes than French
            // British has enough that British expel does NOT trigger
            // (French must have > BRITISH_FRENCH_MAX_NODES OR allied < BRITISH_ALLIED_MIN_NODES)
            let sCount = 0;
            let fCount = 0;
            let bCount = 0;
            for (const node of state.nodes.values()) {
                if (sCount < 10) {
                    node.owner = "spanish";
                    sCount++;
                } else if (fCount < 8) {
                    // French > 5 so British expel doesn't trigger
                    node.owner = "french";
                    fCount++;
                } else {
                    node.owner = "british";
                    bCount++;
                }
            }
            state.recalcFactionStats();

            // Verify preconditions
            expect(state.factions.get("spanish")!.nodeCount).toBeGreaterThanOrEqual(
                state.factions.get("french")!.nodeCount,
            );
            expect(state.factions.get("spanish")!.nodeCount).toBeGreaterThanOrEqual(SPANISH_MIN_NODES);
            // French > 5 so British expel won't trigger
            expect(state.factions.get("french")!.nodeCount).toBeGreaterThan(BRITISH_FRENCH_MAX_NODES);

            const result = system.check(state);
            expect(result).not.toBeNull();
            expect(result!.winner).toBe("spanish");
            expect(result!.reason).toBe("spanish_endure");
        });

        it("does not trigger before 3 min", () => {
            const state = makeState();
            state.elapsedTime = SPANISH_VICTORY_DELAY_S - 1;

            // Even with favorable conditions for Spanish
            for (const node of state.nodes.values()) {
                node.owner = "spanish";
            }
            // Keep some for other factions to avoid elimination
            state.nodes.get("madrid")!.owner = "french";
            state.nodes.get("lisbon")!.owner = "british";
            state.recalcFactionStats();

            const result = system.check(state);
            // Should not be spanish_endure
            if (result) {
                expect(result.reason).not.toBe("spanish_endure");
            }
        });
    });

    describe("timeout (short mode only)", () => {
        it("triggers in short mode when timer expires and no faction condition met", () => {
            const state = makeState("short");
            state.elapsedTime = GAME_DURATION_S + 1;

            // Set up a state where no asymmetric condition fires:
            // French has many nodes (>5), Spanish has few (<5), so no spanish_endure or british_expel
            const nodes = [...state.nodes.values()];
            let fCount = 0;
            let bCount = 0;
            for (const node of nodes) {
                if (fCount < 15) {
                    node.owner = "french";
                    fCount++;
                } else if (bCount < 12) {
                    node.owner = "british";
                    bCount++;
                } else {
                    node.owner = "spanish";
                }
            }
            state.recalcFactionStats();

            // French has most nodes but not 20+ for hold condition
            // Spanish has < 5 so spanish_endure won't fire
            // French > 5 so british_expel won't fire
            expect(state.factions.get("french")!.nodeCount).toBeLessThan(FRENCH_DOMINATION_NODES);
            expect(state.factions.get("spanish")!.nodeCount).toBeLessThan(SPANISH_MIN_NODES);

            const result = system.check(state);
            expect(result).not.toBeNull();
            expect(result!.reason).toBe("timeout");
            expect(result!.winner).toBe("french");
        });

        it("does not trigger in long mode", () => {
            const state = makeState("long");
            state.elapsedTime = GAME_DURATION_S + 1000;

            // Set up so no faction condition fires either
            // French has many but not 20+, Spanish < 5
            const nodes = [...state.nodes.values()];
            let fCount = 0;
            let bCount = 0;
            for (const node of nodes) {
                if (fCount < 15) {
                    node.owner = "french";
                    fCount++;
                } else if (bCount < 14) {
                    node.owner = "british";
                    bCount++;
                } else {
                    node.owner = "spanish";
                }
            }
            state.recalcFactionStats();

            expect(state.factions.get("spanish")!.nodeCount).toBeLessThan(SPANISH_MIN_NODES);

            const result = system.check(state);
            expect(result).toBeNull();
        });
    });
});
