import Phaser from "phaser";
import { FACTIONS, type FactionId } from "../data/factions";
import type { DispatchType } from "../game/state/TroopDispatch";
import { lerp } from "../utils/math";

/**
 * Visual representation of a troop dispatch moving along an edge.
 * Shape varies by dispatch type:
 * - troops: circle
 * - scout: diamond (rotated square), slightly smaller
 * - engineer: square
 */
export class TroopSprite extends Phaser.GameObjects.Container {
    private dot: Phaser.GameObjects.Graphics;
    private countText: Phaser.GameObjects.Text;
    private ambushFlashTimer = 0;
    private dispatchType: DispatchType;

    constructor(
        scene: Phaser.Scene,
        public readonly dispatchId: number,
        private owner: FactionId,
        troops: number,
        private fromX: number,
        private fromY: number,
        private toX: number,
        private toY: number,
        dispatchType: DispatchType = "troops",
    ) {
        super(scene, fromX, fromY);
        this.dispatchType = dispatchType;

        this.dot = scene.add.graphics();
        this.drawDot(FACTIONS[owner].color, 1);
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

    /** Draw the dispatch shape based on type */
    private drawDot(color: number, fillAlpha: number): void {
        this.dot.clear();
        this.dot.fillStyle(color, fillAlpha);
        this.dot.lineStyle(1, 0x000000, 0.8);

        switch (this.dispatchType) {
            case "scout": {
                // Diamond (rotated square), slightly smaller
                const s = 5;
                this.dot.beginPath();
                this.dot.moveTo(0, -s);
                this.dot.lineTo(s, 0);
                this.dot.lineTo(0, s);
                this.dot.lineTo(-s, 0);
                this.dot.closePath();
                this.dot.fillPath();
                this.dot.strokePath();
                break;
            }
            case "engineer": {
                // Square
                const h = 5;
                this.dot.fillRect(-h, -h, h * 2, h * 2);
                this.dot.strokeRect(-h, -h, h * 2, h * 2);
                break;
            }
            default: {
                // Circle (troops)
                this.dot.fillCircle(0, 0, 6);
                this.dot.strokeCircle(0, 0, 6);
                break;
            }
        }
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

            // Flash orange
            this.drawDot(0xffaa00, alpha * 0.8 + 0.2);

            if (this.ambushFlashTimer <= 0) {
                // Restore normal color
                this.drawDot(FACTIONS[this.owner].color, 1);
            }
        }
    }
}
