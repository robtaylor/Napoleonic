import Phaser from "phaser";
import { STARTING_TROOPS } from "../config/constants";
import { NODES } from "../data/nodes";
import { EDGES } from "../data/edges";
import { MapProjection } from "../map/MapProjection";
import { MapRenderer } from "../map/MapRenderer";
import { projectNodes } from "../map/NodePlacement";
import { NodeSprite } from "../ui/NodeSprite";
import { EdgeLine } from "../ui/EdgeLine";

export class GameScene extends Phaser.Scene {
    private mapProjection!: MapProjection;
    private mapRenderer!: MapRenderer;
    private nodeSprites: Map<string, NodeSprite> = new Map();
    private edgeLines: EdgeLine[] = [];

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

        // Draw edges first (below nodes)
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
    }

    update(_time: number, _delta: number): void {
        // Game loop - will drive systems in Phase 2
    }
}
