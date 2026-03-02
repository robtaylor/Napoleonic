import Phaser from "phaser";
import { FACTIONS, type FactionId } from "../data/factions";
import { lerp } from "../utils/math";

/**
 * Visual representation of a troop dispatch moving along an edge.
 * Renders as a small colored dot with a troop count.
 */
export class TroopSprite extends Phaser.GameObjects.Container {
    private dot: Phaser.GameObjects.Graphics;
    private countText: Phaser.GameObjects.Text;
    private ambushFlashTimer = 0;

    constructor(
        scene: Phaser.Scene,
        public readonly dispatchId: number,
        private owner: FactionId,
        troops: number,
        private fromX: number,
        private fromY: number,
        private toX: number,
        private toY: number,
    ) {
        super(scene, fromX, fromY);

        const color = FACTIONS[owner].color;

        this.dot = scene.add.graphics();
        this.dot.fillStyle(color, 1);
        this.dot.lineStyle(1, 0x000000, 0.8);
        this.dot.fillCircle(0, 0, 6);
        this.dot.strokeCircle(0, 0, 6);
        this.add(this.dot);

        this.countText = scene.add
            .text(0, 0, String(troops), {
                fontFamily: "Georgia, serif",
                fontSize: "10px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(0.5);
        this.add(this.countText);

        scene.add.existing(this);
    }

    /** Update position based on progress (0..1) along the edge */
    updateProgress(progress: number): void {
        this.x = lerp(this.fromX, this.toX, progress);
        this.y = lerp(this.fromY, this.toY, progress);
    }

    getOwner(): FactionId {
        return this.owner;
    }

    /** Update displayed troop count (e.g. after ambush damage) */
    updateTroopCount(troops: number): void {
        this.countText.setText(String(troops));
    }

    /** Trigger a brief orange flash (guerrilla ambush feedback) */
    triggerAmbushFlash(): void {
        this.ambushFlashTimer = 400; // 400ms flash
    }

    /** Call each frame to update ambush flash */
    updateAmbushFlash(deltaMs: number): void {
        if (this.ambushFlashTimer > 0) {
            this.ambushFlashTimer -= deltaMs;
            const alpha = Math.max(0, this.ambushFlashTimer / 400);
            this.dot.clear();

            // Flash orange
            this.dot.fillStyle(0xffaa00, alpha * 0.8 + 0.2);
            this.dot.lineStyle(1, 0x000000, 0.8);
            this.dot.fillCircle(0, 0, 6);
            this.dot.strokeCircle(0, 0, 6);

            if (this.ambushFlashTimer <= 0) {
                // Restore normal color
                const color = FACTIONS[this.owner].color;
                this.dot.clear();
                this.dot.fillStyle(color, 1);
                this.dot.lineStyle(1, 0x000000, 0.8);
                this.dot.fillCircle(0, 0, 6);
                this.dot.strokeCircle(0, 0, 6);
            }
        }
    }
}
