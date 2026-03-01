import { describe, it, expect } from "vitest";
import { CombatSystem } from "./CombatSystem";
import { GameState } from "../state/GameState";
import { SCENARIOS } from "../../data/scenarios";
import type { TroopDispatch, DispatchType } from "../state/TroopDispatch";
import { FORTIFY_BUILD_TIME_S, SCOUT_DURATION_S } from "../../config/constants";

function makeState(): GameState {
    return new GameState(SCENARIOS[0]!, ["british"]);
}

function makeArrival(
    _state: GameState,
    toNodeId: string,
    owner: "french" | "british" | "spanish",
    troops: number,
    dispatchType: DispatchType = "troops",
): TroopDispatch {
    return {
        id: 999,
        fromNodeId: "test",
        toNodeId,
        owner,
        troops,
        progress: 1,
        fromX: 0,
        fromY: 0,
        toX: 100,
        toY: 100,
        dispatchType,
    };
}

describe("CombatSystem", () => {
    const system = new CombatSystem();

    it("reinforces friendly node", () => {
        const state = makeState();
        const node = state.nodes.get("lisbon")!;
        const before = node.troops;
        const arrival = makeArrival(state, "lisbon", "british", 5);
        state.dispatches.push(arrival);

        system.resolve(state, [arrival]);

        expect(node.troops).toBe(before + 5);
        expect(node.owner).toBe("british");
    });

    it("attacker wins when troops exceed defender", () => {
        const state = makeState();
        const node = state.nodes.get("madrid")!;
        expect(node.owner).toBe("french");
        node.troops = 3;

        const arrival = makeArrival(state, "madrid", "british", 7);
        state.dispatches.push(arrival);
        system.resolve(state, [arrival]);

        expect(node.owner).toBe("british");
        expect(node.troops).toBe(4); // 7 - 3 = 4 surplus
    });

    it("defender holds when troops exceed attacker", () => {
        const state = makeState();
        const node = state.nodes.get("madrid")!;
        node.troops = 10;

        const arrival = makeArrival(state, "madrid", "british", 3);
        state.dispatches.push(arrival);
        system.resolve(state, [arrival]);

        expect(node.owner).toBe("french");
        expect(node.troops).toBe(7); // 10 - 3
    });

    it("exact tie gives node to attacker with 0 garrison", () => {
        const state = makeState();
        const node = state.nodes.get("madrid")!;
        node.troops = 5;

        const arrival = makeArrival(state, "madrid", "british", 5);
        state.dispatches.push(arrival);
        system.resolve(state, [arrival]);

        expect(node.owner).toBe("british");
        expect(node.troops).toBe(0);
    });

    describe("fortification", () => {
        it("fortified node reduces attacker damage", () => {
            const state = makeState();
            const node = state.nodes.get("madrid")!;
            node.troops = 10;
            node.fortified = true;

            // Attack with 10 troops: effective attack = floor(10 * 0.7) = 7
            const arrival = makeArrival(state, "madrid", "british", 10);
            state.dispatches.push(arrival);
            system.resolve(state, [arrival]);

            // Defender should survive: 10 - 7 = 3
            expect(node.owner).toBe("french");
            expect(node.troops).toBe(3);
        });

        it("capturing a fortified node removes fortification", () => {
            const state = makeState();
            const node = state.nodes.get("madrid")!;
            node.troops = 3;
            node.fortified = true;

            // Overwhelming force: effective = floor(20 * 0.7) = 14, surplus = 14 - 3 = 11
            const arrival = makeArrival(state, "madrid", "british", 20);
            state.dispatches.push(arrival);
            system.resolve(state, [arrival]);

            expect(node.owner).toBe("british");
            expect(node.fortified).toBe(false);
        });

        it("engineer arrival at friendly node starts fortification", () => {
            const state = makeState();
            const node = state.nodes.get("lisbon")!;
            expect(node.fortified).toBe(false);

            const arrival = makeArrival(state, "lisbon", "british", 8, "engineer");
            state.dispatches.push(arrival);
            system.resolve(state, [arrival]);

            expect(node.fortifyProgress).toBe(FORTIFY_BUILD_TIME_S);
        });

        it("updateFortifications completes fortification over time", () => {
            const state = makeState();
            const node = state.nodes.get("lisbon")!;
            node.fortifyProgress = FORTIFY_BUILD_TIME_S;

            system.updateFortifications(state, FORTIFY_BUILD_TIME_S * 1000);

            expect(node.fortified).toBe(true);
            expect(node.fortifyProgress).toBe(0);
        });
    });

    describe("scouting", () => {
        it("scout arrival marks node as scouted without combat", () => {
            const state = makeState();
            state.elapsedTime = 100;
            const node = state.nodes.get("madrid")!;
            const troopsBefore = node.troops;

            const arrival = makeArrival(state, "madrid", "british", 3, "scout");
            state.dispatches.push(arrival);
            system.resolve(state, [arrival]);

            // No combat damage
            expect(node.troops).toBe(troopsBefore);
            expect(node.owner).toBe("french");

            // Node is scouted by british
            expect(node.scoutedBy.british).toBe(100 + SCOUT_DURATION_S);
        });

        it("scouted node gives attack bonus", () => {
            const state = makeState();
            state.elapsedTime = 50;
            const node = state.nodes.get("madrid")!;
            node.troops = 10;
            // Mark as scouted by british (expires in future)
            node.scoutedBy = { british: 100 };

            // Attack with 10: effective = ceil(10 * 1.15) = 12
            // 10 - 12 = -2, captured with 2 garrison
            const arrival = makeArrival(state, "madrid", "british", 10);
            state.dispatches.push(arrival);
            system.resolve(state, [arrival]);

            expect(node.owner).toBe("british");
            expect(node.troops).toBe(2);
        });

        it("expired scout gives no bonus", () => {
            const state = makeState();
            state.elapsedTime = 200;
            const node = state.nodes.get("madrid")!;
            node.troops = 10;
            // Scouted status expired
            node.scoutedBy = { british: 100 };

            const arrival = makeArrival(state, "madrid", "british", 10);
            state.dispatches.push(arrival);
            system.resolve(state, [arrival]);

            // No bonus: 10 - 10 = 0, exact tie
            expect(node.owner).toBe("british");
            expect(node.troops).toBe(0);
        });
    });
});
