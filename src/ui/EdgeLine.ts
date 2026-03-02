import Phaser from "phaser";

/**
 * Draws a connection line between two node positions.
 */
export class EdgeLine {
    private graphics: Phaser.GameObjects.Graphics;
    private _isConstructing = false;

    constructor(
        scene: Phaser.Scene,
        public readonly fromX: number,
        public readonly fromY: number,
        public readonly toX: number,
        public readonly toY: number,
        constructing = false,
    ) {
        this.graphics = scene.add.graphics();
        this._isConstructing = constructing;
        this.draw();
    }

    get isConstructing(): boolean {
        return this._isConstructing;
    }

    /** Mark the edge as completed (no longer under construction) */
    setCompleted(): void {
        this._isConstructing = false;
        this.draw();
    }

    draw(): void {
        this.graphics.clear();
        if (this._isConstructing) {
            this.drawDashed(0xffaa44, 0.5, 1.5);
        } else {
            this.graphics.lineStyle(1.5, 0x6b5b3e, 0.35);
            this.graphics.beginPath();
            this.graphics.moveTo(this.fromX, this.fromY);
            this.graphics.lineTo(this.toX, this.toY);
            this.graphics.strokePath();
        }
    }

    setDepth(depth: number): void {
        this.graphics.setDepth(depth);
    }

    /** Highlight the edge (e.g., when showing valid dispatch targets) */
    setHighlight(highlighted: boolean): void {
        this.graphics.clear();
        if (highlighted) {
            this.graphics.lineStyle(2.5, 0x88ff88, 0.6);
            this.graphics.beginPath();
            this.graphics.moveTo(this.fromX, this.fromY);
            this.graphics.lineTo(this.toX, this.toY);
            this.graphics.strokePath();
        } else {
            this.draw();
        }
    }

    destroy(): void {
        this.graphics.destroy();
    }

    /** Draw a dashed line between from and to */
    private drawDashed(color: number, alpha: number, width: number): void {
        this.graphics.lineStyle(width, color, alpha);
        const dx = this.toX - this.fromX;
        const dy = this.toY - this.fromY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const dashLen = 6;
        const gapLen = 4;
        const segLen = dashLen + gapLen;
        const numSegs = Math.floor(len / segLen);

        const nx = dx / len;
        const ny = dy / len;

        for (let i = 0; i < numSegs; i++) {
            const startDist = i * segLen;
            const endDist = Math.min(startDist + dashLen, len);
            this.graphics.beginPath();
            this.graphics.moveTo(
                this.fromX + nx * startDist,
                this.fromY + ny * startDist,
            );
            this.graphics.lineTo(
                this.fromX + nx * endDist,
                this.fromY + ny * endDist,
            );
            this.graphics.strokePath();
        }
    }
}
