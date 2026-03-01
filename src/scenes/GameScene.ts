import Phaser from "phaser";
import { STARTING_TROOPS } from "../config/constants";
import { NODES } from "../data/nodes";
import { EDGES } from "../data/edges";
import { MapProjection } from "../map/MapProjection";
import { MapRenderer } from "../map/MapRenderer";
import { projectNodes } from "../map/NodePlacement";
import { NodeSprite } from "../ui/NodeSprite";
import { EdgeLine } from "../ui/EdgeLine";
import { SelectionManager } from "../ui/SelectionManager";

export class GameScene extends Phaser.Scene {
    private mapProjection!: MapProjection;
    private mapRenderer!: MapRenderer;
    private nodeSprites: Map<string, NodeSprite> = new Map();
    private edgeLines: EdgeLine[] = [];
    private selectionManager!: SelectionManager;

    /** Camera drag state */
    private isDragging = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private camStartX = 0;
    private camStartY = 0;

    constructor() {
        super({ key: "GameScene" });
    }

    create(): void {
        const { width, height } = this.scale;

        this.mapProjection = new MapProjection(width, height);
        this.mapRenderer = new MapRenderer(this, this.mapProjection);

        // Draw map layers
        const landData = this.cache.json.get("iberia-land");
        const borderData = this.cache.json.get("iberia-borders");
        const riverData = this.cache.json.get("iberia-rivers");

        if (landData) this.mapRenderer.drawLand(landData);
        if (borderData) this.mapRenderer.drawBorders(borderData);
        if (riverData) this.mapRenderer.drawRivers(riverData);

        this.mapRenderer.setDepths(0, 1, 2);

        // Project node positions
        const positions = projectNodes(NODES, this.mapProjection);
        const posMap = new Map(positions.map((p) => [p.id, p]));

        // Draw edges (below nodes)
        for (const [fromId, toId] of EDGES) {
            const from = posMap.get(fromId);
            const to = posMap.get(toId);
            if (!from || !to) continue;
            const edge = new EdgeLine(
                this,
                from.screenX,
                from.screenY,
                to.screenX,
                to.screenY,
            );
            edge.setDepth(3);
            this.edgeLines.push(edge);
        }

        // Draw nodes
        for (const nodeDef of NODES) {
            const pos = posMap.get(nodeDef.id);
            if (!pos) continue;
            const troops = STARTING_TROOPS[nodeDef.type];
            const sprite = new NodeSprite(
                this,
                pos.screenX,
                pos.screenY,
                nodeDef,
                nodeDef.startingFaction,
                troops,
            );
            sprite.setDepth(4);
            this.nodeSprites.set(nodeDef.id, sprite);
        }

        // Selection manager
        this.selectionManager = new SelectionManager(
            this.nodeSprites,
            this.edgeLines,
        );
        this.selectionManager.onDispatch = (fromId, toId) => {
            // Phase 2 will implement actual dispatch
            console.log(`Dispatch: ${fromId} -> ${toId}`);
        };

        // Camera pan/zoom setup
        this.setupCamera();

        // Click on empty space to deselect
        this.input.on("pointerdown", (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
            if (currentlyOver.length === 0) {
                this.selectionManager.deselect();
            }
        });
    }

    private setupCamera(): void {
        const cam = this.cameras.main;

        // Set camera bounds slightly larger than game area for panning room
        const boundsMargin = 200;
        cam.setBounds(
            -boundsMargin,
            -boundsMargin,
            this.scale.width + boundsMargin * 2,
            this.scale.height + boundsMargin * 2,
        );

        // Mouse wheel zoom
        this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
            const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Phaser.Math.Clamp(
                cam.zoom + zoomDelta,
                0.5,
                2.5,
            );
            cam.setZoom(newZoom);
        });

        // Pan with middle mouse button or right click drag
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
                const dx = this.dragStartX - pointer.x;
                const dy = this.dragStartY - pointer.y;
                cam.scrollX = this.camStartX + dx / cam.zoom;
                cam.scrollY = this.camStartY + dy / cam.zoom;
            }
        });

        this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
            if (!pointer.rightButtonDown() && !pointer.middleButtonDown()) {
                this.isDragging = false;
            }
        });

        // Disable right-click context menu on the game canvas
        this.game.canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });
    }

    update(_time: number, _delta: number): void {
        // Game loop - will drive systems in Phase 2
    }
}
