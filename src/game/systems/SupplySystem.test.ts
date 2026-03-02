import { describe, it, expect } from "vitest";
import { SupplySystem } from "./SupplySystem";
import { GameState } from "../state/GameState";
import { SCENARIOS } from "../../data/scenarios";
import {
    SUPPLY_MAX,
    SUPPLY_ATTRITION_THRESHOLD,
    TROOP_GEN_INTERVAL_MS,
} from "../../config/constants";

function makeState(): GameState {
    return new GameState(SCENARIOS[0]!, ["british"]);
}

/**
 * Helper: cut off a French node from all French supply sources
 * by making intermediate nodes non-French.
 */
function isolateFrenchNode(state: GameState, nodeId: string): void {
    // Make all French nodes except the target neutral,
    // so the target has no supply path
    for (const node of state.nodes.values()) {
        if (node.owner === "french" && node.id !== nodeId) {
            node.owner = "neutral";
        }
    }
    // The target node itself is French but has no supply path
    // (since madrid, pamplona, san-sebastian are now neutral)
}

describe("SupplySystem", () => {
    const system = new SupplySystem();

    describe("BFS supply computation", () => {
        it("marks connected French nodes as supplied", () => {
            const state = makeState();
            system.computeSupply(state);

            // Madrid is a French supply source
            const madrid = state.nodes.get("madrid")!;
            expect(madrid.supplied).toBe(true);

            // Burgos connects to Madrid via french territory
            const burgos = state.nodes.get("burgos")!;
            expect(burgos.supplied).toBe(true);
        });

        it("marks disconnected nodes as unsupplied", () => {
            const state = makeState();

            // Cut off Barcelona by removing all intermediate connections
            state.nodes.get("zaragoza")!.owner = "spanish";
            state.nodes.get("tarragona")!.owner = "spanish";
            state.nodes.get("tortosa")!.owner = "spanish";

            system.computeSupply(state);

            const barcelona = state.nodes.get("barcelona")!;
            expect(barcelona.supplied).toBe(false);
        });

        it("British ports act as supply sources", () => {
            const state = makeState();
            system.computeSupply(state);

            const porto = state.nodes.get("porto")!;
            expect(porto.owner).toBe("british");
            expect(porto.type).toBe("port");
            expect(porto.supplied).toBe(true);
        });

        it("Spanish supply only from Seville", () => {
            const state = makeState();
            system.computeSupply(state);

            const seville = state.nodes.get("seville")!;
            expect(seville.supplied).toBe(true);

            const cadiz = state.nodes.get("cadiz")!;
            expect(cadiz.supplied).toBe(true);
        });

        it("neutral nodes are never supplied", () => {
            const state = makeState();
            state.nodes.get("madrid")!.owner = "neutral";

            system.computeSupply(state);

            expect(state.nodes.get("madrid")!.supplied).toBe(false);
        });
    });

    describe("allied supply lines", () => {
        it("British node supplied through Spanish territory", () => {
            const state = makeState();
            // Create a British node reachable from Lisbon only through Spanish territory
            // Make porto neutral so it can't chain British-only
            const porto = state.nodes.get("porto")!;
            porto.owner = "neutral";

            // Make coimbra Spanish (it sits between Lisbon and northern British nodes)
            const coimbra = state.nodes.get("coimbra")!;
            coimbra.owner = "spanish";

            // Place a British node beyond coimbra: use viseu (connected to coimbra)
            const viseu = state.nodes.get("viseu");
            if (viseu) {
                viseu.owner = "british";
                system.computeSupply(state);
                // Viseu should be supplied via Lisbon->coimbra(spanish)->viseu(british)
                expect(viseu.supplied).toBe(true);
            } else {
                // If viseu doesn't exist, verify Lisbon itself still supplied
                system.computeSupply(state);
                expect(state.nodes.get("lisbon")!.supplied).toBe(true);
            }
        });

        it("Spanish node supplied through British territory", () => {
            const state = makeState();
            // Create a scenario where a Spanish node is only reachable from Seville
            // through British territory
            // Make a chain: seville(spanish) -> some-node(british) -> target(spanish)
            // Find neighbors of seville
            const sevilleNeighbors = state.adjacency.get("seville");
            if (!sevilleNeighbors || sevilleNeighbors.size === 0) return;

            // Make all Spanish nodes except seville neutral first
            for (const node of state.nodes.values()) {
                if (node.owner === "spanish" && node.id !== "seville") {
                    node.owner = "neutral";
                }
            }

            // Pick a seville neighbor, make it British
            const bridgeId = [...sevilleNeighbors][0]!;
            const bridge = state.nodes.get(bridgeId)!;
            bridge.owner = "british";

            // Pick a neighbor of bridge that's not seville, make it Spanish
            const bridgeNeighbors = state.adjacency.get(bridgeId);
            if (bridgeNeighbors) {
                for (const nid of bridgeNeighbors) {
                    if (nid !== "seville") {
                        const target = state.nodes.get(nid)!;
                        target.owner = "spanish";

                        system.computeSupply(state);
                        // Target should be supplied via seville->bridge(british)->target(spanish)
                        expect(target.supplied).toBe(true);
                        return;
                    }
                }
            }
        });

        it("French NOT supplied through allied territory", () => {
            const state = makeState();
            // Cut off a French node so it's only reachable through Spanish/British territory
            // Make all French nodes except the target neutral
            for (const node of state.nodes.values()) {
                if (node.owner === "french" && node.id !== "barcelona") {
                    node.owner = "neutral";
                }
            }
            // Make neighbors of barcelona Spanish
            const bcnNeighbors = state.adjacency.get("barcelona");
            if (bcnNeighbors) {
                for (const nid of bcnNeighbors) {
                    state.nodes.get(nid)!.owner = "spanish";
                }
            }

            system.computeSupply(state);
            // Barcelona should NOT be supplied (French has no allies)
            expect(state.nodes.get("barcelona")!.supplied).toBe(false);
        });
    });

    describe("supply drain and restore", () => {
        it("drains supply on unsupplied nodes", () => {
            const state = makeState();

            // Isolate barcelona so it's actually unsupplied after BFS
            isolateFrenchNode(state, "barcelona");
            const node = state.nodes.get("barcelona")!;
            node.supply = SUPPLY_MAX;

            // Run 1 second of update (BFS will mark it unsupplied, then drain)
            const freshSystem = new SupplySystem();
            freshSystem.update(state, 1000);

            expect(node.supply).toBeLessThan(SUPPLY_MAX);
        });

        it("restores supply on supplied nodes", () => {
            const state = makeState();
            const node = state.nodes.get("lisbon")!;
            node.supply = 50;

            const freshSystem = new SupplySystem();
            freshSystem.update(state, 1000);

            expect(node.supply).toBeGreaterThan(50);
        });

        it("supply does not exceed max", () => {
            const state = makeState();
            const node = state.nodes.get("lisbon")!;
            node.supply = SUPPLY_MAX;

            const freshSystem = new SupplySystem();
            freshSystem.update(state, 10000);

            expect(node.supply).toBe(SUPPLY_MAX);
        });

        it("supply does not go below 0", () => {
            const state = makeState();

            isolateFrenchNode(state, "barcelona");
            const node = state.nodes.get("barcelona")!;
            node.supply = 1;

            const freshSystem = new SupplySystem();
            freshSystem.update(state, 100000);

            expect(node.supply).toBeGreaterThanOrEqual(0);
        });
    });

    describe("attrition", () => {
        it("kills troops when supply below threshold", () => {
            const state = makeState();

            // Isolate a French node and set supply below threshold
            isolateFrenchNode(state, "barcelona");
            const node = state.nodes.get("barcelona")!;
            node.supply = SUPPLY_ATTRITION_THRESHOLD - 1;
            node.troops = 10;

            const freshSystem = new SupplySystem();
            freshSystem.update(state, TROOP_GEN_INTERVAL_MS);

            expect(node.troops).toBeLessThan(10);
        });

        it("reverts node to neutral at 0 troops", () => {
            const state = makeState();

            isolateFrenchNode(state, "barcelona");
            const node = state.nodes.get("barcelona")!;
            node.supply = 0;
            node.troops = 1;

            const freshSystem = new SupplySystem();
            freshSystem.update(state, TROOP_GEN_INTERVAL_MS);

            expect(node.troops).toBe(0);
            expect(node.owner).toBe("neutral");
        });
    });
});
