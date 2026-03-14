import Phaser from "phaser";
import {
    DISPATCH_FRACTION,
    MIN_GARRISON,
    FORTIFY_COST,
    FORTIFY_BUILD_TIME_S,
    SCOUT_COST,
    ROAD_BUILD_COST,
    ROAD_BUILD_TIME_S,
    GUERRILLA_DEPLOY_COST,
    SUPPLY_ALLIES,
    CAMERA_SHAKE_DURATION_MS,
    CAMERA_SHAKE_INTENSITY,
    SUPPLY_ROUTE_UPDATE_MS,
    THREAT_PROGRESS_THRESHOLD,
    ALLIED_TRANSIT_SUPPLY_COST,
} from "../config/constants";
import { NODES } from "../data/nodes";
import { EDGES } from "../data/edges";
import { SCENARIOS } from "../data/scenarios";
import { MapProjection } from "../map/MapProjection";
import { MapRenderer, type TerrainMeta } from "../map/MapRenderer";
import { projectNodes, type NodePosition } from "../map/NodePlacement";
import { GameState } from "../game/state/GameState";
import { TroopGenerationSystem } from "../game/systems/TroopGenerationSystem";
import { TroopMovementSystem } from "../game/systems/TroopMovementSystem";
import { CombatSystem } from "../game/systems/CombatSystem";
import { VictorySystem } from "../game/systems/VictorySystem";
import { SupplySystem } from "../game/systems/SupplySystem";
import { GuerrillaSystem } from "../game/systems/GuerrillaSystem";
import { NodeSprite } from "../ui/NodeSprite";
import { EdgeLine } from "../ui/EdgeLine";
import { TroopSprite } from "../ui/TroopSprite";
import { SelectionManager, type DispatchMode } from "../ui/SelectionManager";
import type { GameConfig } from "./MenuScene";
import type { AIController } from "../game/ai/AIController";
import { EasyAI } from "../game/ai/EasyAI";
import { MediumAI } from "../game/ai/MediumAI";
import { HardAI } from "../game/ai/HardAI";
import type { FactionId } from "../data/factions";
import type { DispatchType } from "../game/state/TroopDispatch";
import { EDGE_WAYPOINTS } from "../data/edge-waypoints";

export class GameScene extends Phaser.Scene {
    private config: GameConfig = {
        humanFactions: ["british"],
        scenarioIndex: 0,
        aiDifficulty: "easy",
        gameMode: "short",
    };
    private mapProjection!: MapProjection;
    private mapRenderer!: MapRenderer;
    private nodeSprites: Map<string, NodeSprite> = new Map();
    private edgeLines: EdgeLine[] = [];
    private troopSprites: Map<number, TroopSprite> = new Map();
    private selectionManager!: SelectionManager;

    // Game state & systems
    private gameState!: GameState;
    private troopGenSystem!: TroopGenerationSystem;
    private troopMoveSystem!: TroopMovementSystem;
    private combatSystem!: CombatSystem;
    private victorySystem!: VictorySystem;
    private supplySystem!: SupplySystem;
    private guerrillaSystem!: GuerrillaSystem;
    private aiControllers: AIController[] = [];

    // Screen positions for nodes
    private posMap: Map<string, NodePosition> = new Map();

    // Map from "fromId-toId" to the EdgeLine for roads under construction / newly built
    private constructionEdgeLines: Map<string, EdgeLine> = new Map();

    // Supply route update throttle
    private supplyRouteTimer = 0;

    // Camera drag state
    private isDragging = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private camStartX = 0;
    private camStartY = 0;

    constructor() {
        super({ key: "GameScene" });
    }

    init(data?: GameConfig): void {
        if (data && data.humanFactions) {
            this.config = data;
        }
    }

    create(): void {
        const { width, height } = this.scale;

        // Clear any previous state
        this.nodeSprites.clear();
        this.edgeLines = [];
        this.troopSprites.clear();
        this.constructionEdgeLines.clear();

        // Init projection and map
        this.mapProjection = new MapProjection(width, height);
        this.mapRenderer = new MapRenderer(this, this.mapProjection);

        const landData = this.cache.json.get("iberia-land");
        const borderData = this.cache.json.get("iberia-borders");
        const riverData = this.cache.json.get("iberia-rivers");

        const terrainMeta = this.cache.json.get("iberia-terrain-meta") as TerrainMeta | undefined;

        if (landData) {
            // Always fill land — serves as mask source for terrain + fallback if no elevation data
            this.mapRenderer.drawLand(landData);
        }
        if (terrainMeta) {
            this.mapRenderer.drawTerrain(this, terrainMeta);
        }
        if (borderData) this.mapRenderer.drawBorders(borderData);
        if (riverData) this.mapRenderer.drawRivers(riverData);
        this.mapRenderer.setDepths(0, 1, 2);
        this.mapRenderer.drawVignette(this);

        // Project node positions
        const positions = projectNodes(NODES, this.mapProjection);
        this.posMap = new Map(positions.map((p) => [p.id, p]));

        // Init game state from menu config
        const scenario = SCENARIOS[this.config.scenarioIndex] ?? SCENARIOS[0]!;
        this.gameState = new GameState(
            scenario,
            this.config.humanFactions,
            this.config.gameMode,
        );

        // Init systems
        this.troopGenSystem = new TroopGenerationSystem();
        this.troopMoveSystem = new TroopMovementSystem();
        this.combatSystem = new CombatSystem();
        this.victorySystem = new VictorySystem();
        this.supplySystem = new SupplySystem();
        this.guerrillaSystem = new GuerrillaSystem();

        // Init AI for non-human factions
        this.aiControllers = [];
        const allFactions: FactionId[] = ["french", "british", "spanish"];
        for (const fid of allFactions) {
            if (!this.config.humanFactions.includes(fid)) {
                switch (this.config.aiDifficulty) {
                    case "medium":
                        this.aiControllers.push(new MediumAI(fid));
                        break;
                    case "hard":
                        this.aiControllers.push(new HardAI(fid));
                        break;
                    default:
                        this.aiControllers.push(new EasyAI(fid));
                }
            }
        }

        // Draw edges (with elevation-aware waypoints if available)
        for (const [fromId, toId] of EDGES) {
            const from = this.posMap.get(fromId);
            const to = this.posMap.get(toId);
            if (!from || !to) continue;

            // Look up waypoints and project to screen coords
            const waypointKey = `${fromId}|${toId}`;
            const reverseKey = `${toId}|${fromId}`;
            const rawWaypoints = EDGE_WAYPOINTS[waypointKey] ?? EDGE_WAYPOINTS[reverseKey];
            let screenWaypoints: [number, number][] = [];
            if (rawWaypoints && rawWaypoints.length > 0) {
                // Waypoints stored as [lng, lat], project to screen
                screenWaypoints = rawWaypoints.map(([lng, lat]) => {
                    try {
                        return this.mapProjection.project(lng, lat);
                    } catch {
                        return null;
                    }
                }).filter((p): p is [number, number] => p !== null);
                // If reverse key was used, reverse the waypoints
                if (!EDGE_WAYPOINTS[waypointKey] && EDGE_WAYPOINTS[reverseKey]) {
                    screenWaypoints.reverse();
                }
            }

            const edge = new EdgeLine(this, from.screenX, from.screenY, to.screenX, to.screenY, false, fromId, toId, screenWaypoints);
            edge.setDepth(3);
            this.edgeLines.push(edge);
        }

        // Draw nodes from game state
        for (const nodeState of this.gameState.nodes.values()) {
            const pos = this.posMap.get(nodeState.id);
            const nodeDef = this.gameState.getNodeDef(nodeState.id);
            if (!pos || !nodeDef) continue;
            const sprite = new NodeSprite(
                this,
                pos.screenX,
                pos.screenY,
                nodeDef,
                nodeState.owner,
                nodeState.troops,
            );
            sprite.setDepth(4);
            this.nodeSprites.set(nodeState.id, sprite);
        }

        // Selection manager
        this.selectionManager = new SelectionManager(this.nodeSprites, this.edgeLines);
        this.selectionManager.onDispatch = (fromId, toId, mode) => {
            this.handleHumanDispatch(fromId, toId, mode);
        };
        this.selectionManager.onFortify = (nodeId) => {
            this.handleFortify(nodeId);
        };
        this.selectionManager.onRoadBuild = (fromId, targetId) => {
            this.handleRoadBuild(fromId, targetId);
        };
        this.selectionManager.getRoadTargets = (nodeId) => {
            return this.getRoadBuildTargets(nodeId);
        };
        this.selectionManager.onDeployGuerrilla = (nodeId) => {
            this.handleDeployGuerrilla(nodeId);
        };
        this.selectionManager.onGatherDispatch = (sources, dest) => {
            this.handleGatherDispatch(sources, dest);
        };
        this.selectionManager.getNodeOwner = (id) => {
            return this.gameState.nodes.get(id)?.owner ?? null;
        };
        this.selectionManager.isFactionFriendly = (fid) => {
            return this.isFriendlyFaction(fid as FactionId);
        };

        // Keyboard input for fortification and road building
        this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
            this.selectionManager.handleKeyPress(event.key);
        });

        // Camera
        this.setupCamera();

        // Click empty space to deselect
        this.input.on("pointerdown", (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
            if (currentlyOver.length === 0) {
                this.selectionManager.deselect();
            }
        });

        // Scene-level pointerup for gather cancel (when released on empty space)
        this.input.on("pointerup", (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
            if (!pointer.rightButtonReleased() && !pointer.middleButtonReleased() && currentlyOver.length === 0) {
                this.selectionManager.onScenePointerUp();
            }
        });

        // Launch HUD as overlay
        const humanFaction = this.config.humanFactions[0] ?? "british";
        this.scene.launch("HUDScene", {
            gameState: this.gameState,
            humanFaction,
        });
    }

    /** Human dispatch - checks isHuman before executing */
    private handleHumanDispatch(fromId: string, toId: string, mode: DispatchMode): void {
        const fromNode = this.gameState.nodes.get(fromId);
        if (!fromNode) return;

        const faction = this.gameState.factions.get(fromNode.owner);
        if (!faction || !faction.isHuman) return;

        if (mode === "scout") {
            this.executeScoutDispatch(fromId, toId);
        } else {
            this.executeDispatch(fromId, toId);
        }
    }

    /** Handle gather-drag chain dispatch: each node dispatches to the next toward destination */
    private handleGatherDispatch(sources: string[], destination: string): void {
        const fullChain = [...sources, destination];

        // Verify the chain start is owned by a human faction
        const firstNode = this.gameState.nodes.get(fullChain[0]!);
        if (!firstNode) return;
        const faction = this.gameState.factions.get(firstNode.owner);
        if (!faction || !faction.isHuman) return;

        const playerFaction = firstNode.owner;

        // Count allied transit hops (not own faction, not the enemy destination)
        // and deduct supply cost from origin
        let alliedHops = 0;
        for (const nodeId of fullChain) {
            const node = this.gameState.nodes.get(nodeId);
            if (node && node.owner !== playerFaction && this.isFriendlyFaction(node.owner)) {
                alliedHops++;
            }
        }
        if (alliedHops > 0) {
            firstNode.supply = Math.max(0, firstNode.supply - alliedHops * ALLIED_TRANSIT_SUPPLY_COST);
        }

        // Dispatch each hop — allied nodes cascade troops through to destination
        for (let i = 0; i < fullChain.length - 1; i++) {
            this.executeDispatch(fullChain[i]!, fullChain[i + 1]!);
        }
    }

    /** Handle fortify request from SelectionManager */
    private handleFortify(nodeId: string): void {
        const node = this.gameState.nodes.get(nodeId);
        if (!node) return;

        const faction = this.gameState.factions.get(node.owner);
        if (!faction || !faction.isHuman) return;

        if (node.fortified || node.fortifyProgress > 0) return;
        if (node.troops < FORTIFY_COST + MIN_GARRISON) return;

        // Send engineer to self (costs troops, starts fortification)
        node.troops -= FORTIFY_COST;
        // Directly start building (no need to move since it's on the same node)
        node.fortifyProgress = FORTIFY_BUILD_TIME_S;

        this.updateNodeSprite(nodeId);
    }

    /** Get valid road-build targets for a node (for SelectionManager) */
    private getRoadBuildTargets(nodeId: string): string[] {
        const node = this.gameState.nodes.get(nodeId);
        if (!node) return [];
        if (node.troops < ROAD_BUILD_COST + MIN_GARRISON) return [];

        const targets = this.gameState.getRoadBuildTargets(nodeId, node.owner);
        return targets.map((t) => t.targetId);
    }

    /** Handle road build request from SelectionManager */
    private handleRoadBuild(fromId: string, targetId: string): void {
        const fromNode = this.gameState.nodes.get(fromId);
        if (!fromNode) return;

        const faction = this.gameState.factions.get(fromNode.owner);
        if (!faction || !faction.isHuman) return;

        if (fromNode.troops < ROAD_BUILD_COST + MIN_GARRISON) return;

        // Verify still a valid target
        const targets = this.gameState.getRoadBuildTargets(fromId, fromNode.owner);
        if (!targets.some((t) => t.targetId === targetId)) return;

        // Deduct cost
        fromNode.troops -= ROAD_BUILD_COST;

        // Start construction
        this.startRoadConstruction(fromId, targetId, fromNode.owner);
        this.updateNodeSprite(fromId);
    }

    /** Handle guerrilla deployment from SelectionManager (G key) */
    private handleDeployGuerrilla(nodeId: string): void {
        const node = this.gameState.nodes.get(nodeId);
        if (!node) return;

        // Must be Spanish-owned
        if (node.owner !== "spanish") return;

        // Must be human-controlled
        const faction = this.gameState.factions.get(node.owner);
        if (!faction || !faction.isHuman) return;

        // Must have enough troops
        if (node.troops < GUERRILLA_DEPLOY_COST + MIN_GARRISON) return;

        // No existing battalion
        if (node.guerrillaTroops > 0) return;

        // Must be adjacent to enemy territory
        const neighbors = this.gameState.adjacency.get(nodeId);
        if (!neighbors) return;
        const allies = SUPPLY_ALLIES["spanish"] ?? [];
        let adjacentToEnemy = false;
        for (const nid of neighbors) {
            const neighbor = this.gameState.nodes.get(nid);
            if (neighbor && neighbor.owner !== "spanish" && neighbor.owner !== "neutral" && !allies.includes(neighbor.owner)) {
                adjacentToEnemy = true;
                break;
            }
        }
        if (!adjacentToEnemy) return;

        // Deploy
        node.troops -= GUERRILLA_DEPLOY_COST;
        node.guerrillaTroops = GUERRILLA_DEPLOY_COST;
        node.guerrillaCooldown = 0;

        this.updateNodeSprite(nodeId);
    }

    /** Start road construction (used by both human and AI) */
    private startRoadConstruction(fromId: string, toId: string, owner: FactionId): void {
        this.gameState.roadsUnderConstruction.push({
            fromNodeId: fromId,
            toNodeId: toId,
            owner,
            remainingTime: ROAD_BUILD_TIME_S,
        });

        // Create dashed construction line visual
        const fromPos = this.posMap.get(fromId);
        const toPos = this.posMap.get(toId);
        if (fromPos && toPos) {
            const edgeLine = new EdgeLine(
                this,
                fromPos.screenX,
                fromPos.screenY,
                toPos.screenX,
                toPos.screenY,
                true, // constructing
            );
            edgeLine.setDepth(3);
            const key = `${fromId}-${toId}`;
            this.constructionEdgeLines.set(key, edgeLine);
        }
    }

    /** Complete a road construction: add permanent edge */
    private completeRoadConstruction(fromId: string, toId: string): void {
        // Add to game state graph
        this.gameState.addEdge(fromId, toId);

        // Update selection manager's adjacency
        this.selectionManager.addEdge(fromId, toId);

        // Replace construction line with permanent line
        const key = `${fromId}-${toId}`;
        const constructionLine = this.constructionEdgeLines.get(key);
        if (constructionLine) {
            constructionLine.setCompleted();
            this.edgeLines.push(constructionLine);
            this.constructionEdgeLines.delete(key);
        }
    }

    /** Get screen-projected waypoints for an edge between two nodes */
    private getEdgeWaypoints(fromId: string, toId: string): [number, number][] {
        const forwardKey = `${fromId}|${toId}`;
        const reverseKey = `${toId}|${fromId}`;
        const rawWaypoints = EDGE_WAYPOINTS[forwardKey] ?? EDGE_WAYPOINTS[reverseKey];
        if (!rawWaypoints || rawWaypoints.length === 0) return [];

        const screenWps = rawWaypoints.map(([lng, lat]) => {
            try {
                return this.mapProjection.project(lng, lat);
            } catch {
                return null;
            }
        }).filter((p): p is [number, number] => p !== null);

        // Reverse if we matched the reverse key
        if (!EDGE_WAYPOINTS[forwardKey] && EDGE_WAYPOINTS[reverseKey]) {
            screenWps.reverse();
        }
        return screenWps;
    }

    /** Core dispatch logic used by both human and AI */
    private executeDispatch(fromId: string, toId: string, dispatchType: DispatchType = "troops"): void {
        const fromNode = this.gameState.nodes.get(fromId);
        if (!fromNode) return;

        const sendCount = Math.floor(fromNode.troops * DISPATCH_FRACTION);
        if (sendCount < 1) return;
        if (fromNode.troops - sendCount < MIN_GARRISON) return;
        if (!this.gameState.areConnected(fromId, toId)) return;

        fromNode.troops -= sendCount;

        const fromPos = this.posMap.get(fromId);
        const toPos = this.posMap.get(toId);
        if (!fromPos || !toPos) return;

        const dispatch = this.gameState.createDispatch(
            fromId,
            toId,
            fromNode.owner,
            sendCount,
            fromPos.screenX,
            fromPos.screenY,
            toPos.screenX,
            toPos.screenY,
            dispatchType,
        );

        const waypoints = this.getEdgeWaypoints(fromId, toId);
        const sprite = new TroopSprite(
            this,
            dispatch.id,
            fromNode.owner,
            sendCount,
            fromPos.screenX,
            fromPos.screenY,
            toPos.screenX,
            toPos.screenY,
            dispatchType,
            waypoints,
        );
        sprite.setDepth(5);
        this.troopSprites.set(dispatch.id, sprite);

        this.updateNodeSprite(fromId);
    }

    /** Scout dispatch: sends a lightweight unit */
    private executeScoutDispatch(fromId: string, toId: string): void {
        const fromNode = this.gameState.nodes.get(fromId);
        if (!fromNode) return;

        if (fromNode.troops < SCOUT_COST + MIN_GARRISON) return;
        if (!this.gameState.areConnected(fromId, toId)) return;

        fromNode.troops -= SCOUT_COST;

        const fromPos = this.posMap.get(fromId);
        const toPos = this.posMap.get(toId);
        if (!fromPos || !toPos) return;

        const dispatch = this.gameState.createDispatch(
            fromId,
            toId,
            fromNode.owner,
            SCOUT_COST,
            fromPos.screenX,
            fromPos.screenY,
            toPos.screenX,
            toPos.screenY,
            "scout",
        );

        const waypoints = this.getEdgeWaypoints(fromId, toId);
        const sprite = new TroopSprite(
            this,
            dispatch.id,
            fromNode.owner,
            SCOUT_COST,
            fromPos.screenX,
            fromPos.screenY,
            toPos.screenX,
            toPos.screenY,
            "scout",
            waypoints,
        );
        sprite.setDepth(5);
        this.troopSprites.set(dispatch.id, sprite);

        this.updateNodeSprite(fromId);
    }

    /** Check if a faction is friendly to the human player (own faction or ally) */
    private isFriendlyFaction(factionId: FactionId): boolean {
        const humanFactions = this.config.humanFactions;
        if (humanFactions.includes(factionId)) return true;
        for (const hFaction of humanFactions) {
            const allies = SUPPLY_ALLIES[hFaction] ?? [];
            if (allies.includes(factionId)) return true;
        }
        return false;
    }

    /** Check if a node is visible (scouted) to the human player */
    private isNodeScouted(nodeId: string): boolean {
        const nodeState = this.gameState.nodes.get(nodeId);
        if (!nodeState) return false;

        // Own faction, allied faction, or neutral — always visible
        if (this.isFriendlyFaction(nodeState.owner) || nodeState.owner === "neutral") {
            return true;
        }

        const humanFactions = this.config.humanFactions;
        for (const hFaction of humanFactions) {
            const scoutExpiry = nodeState.scoutedBy[hFaction];
            if (scoutExpiry !== undefined && scoutExpiry > this.gameState.elapsedTime) {
                return true;
            }
            const neighbors = this.gameState.adjacency.get(nodeId);
            if (neighbors) {
                for (const nid of neighbors) {
                    const neighbor = this.gameState.nodes.get(nid);
                    if (neighbor && (neighbor.owner === hFaction || this.isFriendlyFaction(neighbor.owner))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private updateNodeSprite(nodeId: string): void {
        const nodeState = this.gameState.nodes.get(nodeId);
        const sprite = this.nodeSprites.get(nodeId);
        if (!nodeState || !sprite) return;

        if (sprite.factionId !== nodeState.owner) {
            sprite.setFaction(nodeState.owner);
        }

        const scouted = this.isNodeScouted(nodeId);

        sprite.setTroopDisplay(nodeState.troops, scouted);
        sprite.setFogged(!scouted);
        sprite.updateSupply(nodeState);
        sprite.updateFortification(nodeState);
        sprite.updateGuerrilla(nodeState);
    }

    private setupCamera(): void {
        const cam = this.cameras.main;
        const boundsMargin = 200;
        cam.setBounds(
            -boundsMargin,
            -boundsMargin,
            this.scale.width + boundsMargin * 2,
            this.scale.height + boundsMargin * 2,
        );

        this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
            const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
            cam.setZoom(Phaser.Math.Clamp(cam.zoom + zoomDelta, 0.5, 2.5));
        });

        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
                this.isDragging = true;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.camStartX = cam.scrollX;
                this.camStartY = cam.scrollY;
            }
        });

        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (this.isDragging) {
                cam.scrollX = this.camStartX + (this.dragStartX - pointer.x) / cam.zoom;
                cam.scrollY = this.camStartY + (this.dragStartY - pointer.y) / cam.zoom;
            }
        });

        this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
            if (!pointer.rightButtonDown() && !pointer.middleButtonDown()) {
                this.isDragging = false;
            }
        });

        this.game.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    update(_time: number, delta: number): void {
        if (this.gameState.gameOver) return;

        // Update elapsed time
        this.gameState.elapsedTime += delta / 1000;

        // 1. AI evaluation
        for (const ai of this.aiControllers) {
            const faction = this.gameState.factions.get(ai.factionId);
            if (faction && !faction.eliminated) {
                ai.update(
                    this.gameState,
                    delta,
                    (fromId, toId) => {
                        this.executeDispatch(fromId, toId);
                    },
                    (fromId, targetId) => {
                        this.startRoadConstruction(fromId, targetId, ai.factionId);
                    },
                );
            }
        }

        // 2. Troop generation (supply-aware)
        this.troopGenSystem.update(this.gameState, delta);

        // 3. Supply system (BFS + drain/restore)
        this.supplySystem.update(this.gameState, delta);

        // 4. Guerrilla system (battalion ambushes + supply drain)
        const guerrillaEvents = this.guerrillaSystem.update(this.gameState, delta);
        for (const ambush of guerrillaEvents.ambushes) {
            // Flash the guerrilla node
            const nodeSprite = this.nodeSprites.get(ambush.nodeId);
            if (nodeSprite) nodeSprite.triggerRaidFlash();

            // Flash and update the troop sprite
            const troopSprite = this.troopSprites.get(ambush.dispatchId);
            if (troopSprite) {
                troopSprite.triggerAmbushFlash();
                // Find dispatch to get current troop count
                const dispatch = this.gameState.dispatches.find(d => d.id === ambush.dispatchId);
                if (dispatch) {
                    troopSprite.updateTroopCount(dispatch.troops);
                } else {
                    // Dispatch was destroyed — remove sprite
                    troopSprite.destroy();
                    this.troopSprites.delete(ambush.dispatchId);
                }
            }
        }
        for (const drain of guerrillaEvents.drains) {
            const nodeSprite = this.nodeSprites.get(drain.nodeId);
            if (nodeSprite) nodeSprite.triggerRaidFlash();
        }

        // 5. Troop movement (speed multipliers for scouts)
        const arrived = this.troopMoveSystem.update(this.gameState, delta);

        // Update troop sprite positions and ambush flash
        for (const dispatch of this.gameState.dispatches) {
            const sprite = this.troopSprites.get(dispatch.id);
            if (sprite) {
                sprite.updateProgress(dispatch.progress);
                sprite.updateAmbushFlash(delta);
            }
        }

        // 6. Combat resolution (fortification bonus, scout bonus)
        if (arrived.length > 0) {
            // Snapshot owners before combat for feedback detection
            const ownersBefore = new Map<string, FactionId>();
            for (const dispatch of arrived) {
                const node = this.gameState.nodes.get(dispatch.toNodeId);
                if (node) ownersBefore.set(dispatch.toNodeId, node.owner);
            }

            this.combatSystem.resolve(this.gameState, arrived);

            // Detect combat events and trigger feedback
            for (const dispatch of arrived) {
                const nodeId = dispatch.toNodeId;
                const nodeSprite = this.nodeSprites.get(nodeId);
                if (!nodeSprite) continue;

                const prevOwner = ownersBefore.get(nodeId);
                const nodeState = this.gameState.nodes.get(nodeId);
                if (!prevOwner || !nodeState) continue;

                if (prevOwner !== nodeState.owner) {
                    // Capture: node changed hands
                    nodeSprite.triggerCaptureBounce();

                    // Major capture: capital or fortress
                    const nodeDef = this.gameState.getNodeDef(nodeId);
                    if (nodeDef && (nodeDef.type === "capital" || nodeDef.type === "fortress")) {
                        this.cameras.main.shake(CAMERA_SHAKE_DURATION_MS, CAMERA_SHAKE_INTENSITY);
                    }
                } else if (dispatch.owner === prevOwner || (SUPPLY_ALLIES[dispatch.owner] ?? []).includes(prevOwner)) {
                    // Reinforcement: friendly or allied troops arrived
                    nodeSprite.triggerReinforcementPulse();
                } else {
                    // Defense: attack was repelled
                    nodeSprite.triggerCombatFlash();
                }
            }

            // Clean up arrived troop sprites
            for (const dispatch of arrived) {
                const sprite = this.troopSprites.get(dispatch.id);
                if (sprite) {
                    sprite.destroy();
                    this.troopSprites.delete(dispatch.id);
                }
            }
        }

        // Update fortification progress
        this.combatSystem.updateFortifications(this.gameState, delta);

        // Update road construction progress
        const deltaSec = delta / 1000;
        const completedRoads: { fromId: string; toId: string }[] = [];
        for (const road of this.gameState.roadsUnderConstruction) {
            road.remainingTime -= deltaSec;
            if (road.remainingTime <= 0) {
                completedRoads.push({ fromId: road.fromNodeId, toId: road.toNodeId });
            }
        }
        for (const { fromId, toId } of completedRoads) {
            this.completeRoadConstruction(fromId, toId);
        }
        this.gameState.roadsUnderConstruction = this.gameState.roadsUnderConstruction.filter(
            (r) => r.remainingTime > 0,
        );

        // 7. Update all node sprites (supply indicators, "?" for unscouted)
        for (const nodeState of this.gameState.nodes.values()) {
            const sprite = this.nodeSprites.get(nodeState.id);
            if (sprite) {
                this.updateNodeSprite(nodeState.id);
                sprite.updateRaidFlash(delta);
            }
        }

        // Update threat indicators: scan dispatches heading toward human/allied nodes
        const incomingThreats = new Map<string, number>();
        for (const dispatch of this.gameState.dispatches) {
            if (dispatch.progress >= THREAT_PROGRESS_THRESHOLD) {
                const targetNode = this.gameState.nodes.get(dispatch.toNodeId);
                if (targetNode && this.isFriendlyFaction(targetNode.owner) && !this.isFriendlyFaction(dispatch.owner)) {
                    incomingThreats.set(dispatch.toNodeId, (incomingThreats.get(dispatch.toNodeId) ?? 0) + dispatch.troops);
                }
            }
        }
        for (const [nodeId, sprite] of this.nodeSprites) {
            sprite.updateThreat(incomingThreats.get(nodeId) ?? 0);
        }

        // Update edge fog and supply routes (throttled)
        this.supplyRouteTimer += delta;
        const updateEdgeVisuals = this.supplyRouteTimer >= SUPPLY_ROUTE_UPDATE_MS;
        if (updateEdgeVisuals) this.supplyRouteTimer = 0;

        for (const edge of this.edgeLines) {
            if (!edge.fromId || !edge.toId) continue;

            // Fog: dim edges between two unscouted nodes
            const fromScouted = this.isNodeScouted(edge.fromId);
            const toScouted = this.isNodeScouted(edge.toId);
            edge.setFogged(!fromScouted && !toScouted);

            // Supply route glow (throttled)
            if (updateEdgeVisuals) {
                const fromNode = this.gameState.nodes.get(edge.fromId);
                const toNode = this.gameState.nodes.get(edge.toId);
                const isSupplyRoute = fromNode && toNode
                    && this.isFriendlyFaction(fromNode.owner)
                    && this.isFriendlyFaction(toNode.owner)
                    && fromNode.supplied && toNode.supplied;
                edge.setSupplyRoute(!!isSupplyRoute);
            }
        }

        // Clean old guerrilla raid records (keep last 5 seconds)
        this.gameState.guerrillaRaids = this.gameState.guerrillaRaids.filter(
            (r) => this.gameState.elapsedTime - r.timestamp < 5,
        );

        // 8. Victory check (asymmetric per faction)
        const result = this.victorySystem.check(this.gameState, delta);
        if (result) {
            this.gameState.gameOver = true;
            this.gameState.winner = result.winner;
            this.scene.stop("HUDScene");
            this.scene.start("VictoryScene", {
                winner: result.winner,
                reason: result.reason,
            });
        }
    }
}
