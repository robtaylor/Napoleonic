import Phaser from "phaser";
import { MapProjection } from "../map/MapProjection";
import { MapRenderer } from "../map/MapRenderer";

export class GameScene extends Phaser.Scene {
    private mapProjection!: MapProjection;
    private mapRenderer!: MapRenderer;

    constructor() {
        super({ key: "GameScene" });
    }

    create(): void {
        const { width, height } = this.scale;

        this.mapProjection = new MapProjection(width, height);
        this.mapRenderer = new MapRenderer(this, this.mapProjection);

        // Draw map layers in order: land, borders, rivers
        const landData = this.cache.json.get("iberia-land");
        const borderData = this.cache.json.get("iberia-borders");
        const riverData = this.cache.json.get("iberia-rivers");

        if (landData) {
            this.mapRenderer.drawLand(landData);
        }
        if (borderData) {
            this.mapRenderer.drawBorders(borderData);
        }
        if (riverData) {
            this.mapRenderer.drawRivers(riverData);
        }

        this.mapRenderer.setDepths(0, 1, 2);
    }

    update(_time: number, _delta: number): void {
        // Game loop - will drive systems in Phase 2
    }
}
