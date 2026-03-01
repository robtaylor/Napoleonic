import Phaser from "phaser";

/**
 * Draws a connection line between two node positions.
 */
export class EdgeLine {
    private graphics: Phaser.GameObjects.Graphics;

    constructor(
        scene: Phaser.Scene,
        public readonly fromX: number,
        public readonly fromY: number,
        public readonly toX: number,
        public readonly toY: number,
    ) {
        this.graphics = scene.add.graphics();
        this.draw();
    }

    draw(): void {
        this.graphics.clear();
        this.graphics.lineStyle(1.5, 0x6b5b3e, 0.35);
        this.graphics.beginPath();
        this.graphics.moveTo(this.fromX, this.fromY);
        this.graphics.lineTo(this.toX, this.toY);
        this.graphics.strokePath();
    }

    setDepth(depth: number): void {
        this.graphics.setDepth(depth);
    }

    /** Highlight the edge (e.g., when showing valid dispatch targets) */
    setHighlight(highlighted: boolean): void {
        this.graphics.clear();
        if (highlighted) {
            this.graphics.lineStyle(2.5, 0x88ff88, 0.6);
        } else {
            this.graphics.lineStyle(1.5, 0x6b5b3e, 0.35);
        }
        this.graphics.beginPath();
        this.graphics.moveTo(this.fromX, this.fromY);
        this.graphics.lineTo(this.toX, this.toY);
        this.graphics.strokePath();
    }
}
