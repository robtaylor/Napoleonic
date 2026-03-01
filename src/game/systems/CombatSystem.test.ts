import { describe, it, expect } from "vitest";
import { CombatSystem } from "./CombatSystem";
import { GameState } from "../state/GameState";
import { SCENARIOS } from "../../data/scenarios";
import type { TroopDispatch } from "../state/TroopDispatch";

function makeState(): GameState {
    return new GameState(SCENARIOS[0]!, ["british"]);
}

function makeArrival(
    state: GameState,
    toNodeId: string,
    owner: "french" | "british" | "spanish",
    troops: number,
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
});
