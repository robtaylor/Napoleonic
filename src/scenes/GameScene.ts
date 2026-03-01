import Phaser from "phaser";
import { DISPATCH_FRACTION, MIN_GARRISON } from "../config/constants";
import { NODES } from "../data/nodes";
import { EDGES } from "../data/edges";
import { SCENARIOS } from "../data/scenarios";
import { MapProjection } from "../map/MapProjection";
import { MapRenderer } from "../map/MapRenderer";
import { projectNodes, type NodePosition } from "../map/NodePlacement";
import { GameState } from "../game/state/GameState";
import { TroopGenerationSystem } from "../game/systems/TroopGenerationSystem";
import { TroopMovementSystem } from "../game/systems/TroopMovementSystem";
import { CombatSystem } from "../game/systems/CombatSystem";
import { VictorySystem } from "../game/systems/VictorySystem";
import { NodeSprite } from "../ui/NodeSprite";
import { EdgeLine } from "../ui/EdgeLine";
import { TroopSprite } from "../ui/TroopSprite";
import { SelectionManager } from "../ui/SelectionManager";
import type { GameConfig } from "./MenuScene";
import type { AIController } from "../game/ai/AIController";
import { EasyAI } from "../game/ai/EasyAI";
import { MediumAI } from "../game/ai/MediumAI";
import { HardAI } from "../game/ai/HardAI";
import type { FactionId } from "../data/factions";

export class GameScene extends Phaser.Scene {
    private config: GameConfig = { humanFactions: ["british"], scenarioIndex: 0, aiDifficulty: "easy" };
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
    private aiControllers: AIController[] = [];

    // Screen positions for nodes
    private posMap: Map<string, NodePosition> = new Map();

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

        // Init projection and map
        this.mapProjection = new MapProjection(width, height);
        this.mapRenderer = new MapRenderer(this, this.mapProjection);

        const landData = this.cache.json.get("iberia-land");
        const borderData = this.cache.json.get("iberia-borders");
        const riverData = this.cache.json.get("iberia-rivers");

        if (landData) this.mapRenderer.drawLand(landData);
        if (borderData) this.mapRenderer.drawBorders(borderData);
        if (riverData) this.mapRenderer.drawRivers(riverData);
        this.mapRenderer.setDepths(0, 1, 2);

        // Project node positions
        const positions = projectNodes(NODES, this.mapProjection);
        this.posMap = new Map(positions.map((p) => [p.id, p]));

        // Init game state from menu config
        const scenario = SCENARIOS[this.config.scenarioIndex] ?? SCENARIOS[0]!;
        this.gameState = new GameState(scenario, this.config.humanFactions);

        // Init systems
        this.troopGenSystem = new TroopGenerationSystem();
        this.troopMoveSystem = new TroopMovementSystem();
        this.combatSystem = new CombatSystem();
        this.victorySystem = new VictorySystem();

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

        // Draw edges
        for (const [fromId, toId] of EDGES) {
            const from = this.posMap.get(fromId);
            const to = this.posMap.get(toId);
            if (!from || !to) continue;
            const edge = new EdgeLine(this, from.screenX, from.screenY, to.screenX, to.screenY);
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
        this.selectionManager.onDispatch = (fromId, toId) => {
            this.handleHumanDispatch(fromId, toId);
        };

        // Camera
        this.setupCamera();

        // Click empty space to deselect
        this.input.on("pointerdown", (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
            if (currentlyOver.length === 0) {
                this.selectionManager.deselect();
            }
        });

        // Launch HUD as overlay
        this.scene.launch("HUDScene", { gameState: this.gameState });
    }

    /** Human dispatch - checks isHuman before executing */
    private handleHumanDispatch(fromId: string, toId: string): void {
        const fromNode = this.gameState.nodes.get(fromId);
        if (!fromNode) return;

        const faction = this.gameState.factions.get(fromNode.owner);
        if (!faction || !faction.isHuman) return;

        this.executeDispatch(fromId, toId);
    }

    /** Core dispatch logic used by both human and AI */
    private executeDispatch(fromId: string, toId: string): void {
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
        );

        const sprite = new TroopSprite(
            this,
            dispatch.id,
            fromNode.owner,
            sendCount,
            fromPos.screenX,
            fromPos.screenY,
            toPos.screenX,
            toPos.screenY,
        );
        sprite.setDepth(5);
        this.troopSprites.set(dispatch.id, sprite);

        this.updateNodeSprite(fromId);
    }

    private updateNodeSprite(nodeId: string): void {
        const nodeState = this.gameState.nodes.get(nodeId);
        const sprite = this.nodeSprites.get(nodeId);
        if (!nodeState || !sprite) return;

        sprite.setTroops(nodeState.troops);
        if (sprite.factionId !== nodeState.owner) {
            sprite.setFaction(nodeState.owner);
        }
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

        // AI evaluation
        for (const ai of this.aiControllers) {
            const faction = this.gameState.factions.get(ai.factionId);
            if (faction && !faction.eliminated) {
                ai.update(this.gameState, delta, (fromId, toId) => {
                    this.executeDispatch(fromId, toId);
                });
            }
        }

        // Troop generation
        this.troopGenSystem.update(this.gameState, delta);

        // Troop movement
        const arrived = this.troopMoveSystem.update(this.gameState, delta);

        // Update troop sprite positions
        for (const dispatch of this.gameState.dispatches) {
            const sprite = this.troopSprites.get(dispatch.id);
            if (sprite) {
                sprite.updateProgress(dispatch.progress);
            }
        }

        // Resolve combat for arrived dispatches
        if (arrived.length > 0) {
            this.combatSystem.resolve(this.gameState, arrived);

            // Clean up arrived troop sprites
            for (const dispatch of arrived) {
                const sprite = this.troopSprites.get(dispatch.id);
                if (sprite) {
                    sprite.destroy();
                    this.troopSprites.delete(dispatch.id);
                }
            }
        }

        // Update all node sprites from game state
        for (const nodeState of this.gameState.nodes.values()) {
            this.updateNodeSprite(nodeState.id);
        }

        // Victory check
        const result = this.victorySystem.check(this.gameState);
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
