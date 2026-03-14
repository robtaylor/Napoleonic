import Phaser from "phaser";
import {
    EDGE_COLOR,
    EDGE_ALPHA,
    EDGE_WIDTH,
    EDGE_HIGHLIGHT_COLOR,
    EDGE_HIGHLIGHT_ALPHA,
    EDGE_HIGHLIGHT_WIDTH,
    EDGE_CONSTRUCTION_COLOR,
    EDGE_CONSTRUCTION_ALPHA,
    EDGE_CONSTRUCTION_WIDTH,
    FOG_EDGE_ALPHA,
    SUPPLY_ROUTE_COLOR,
    SUPPLY_ROUTE_ALPHA,
    SUPPLY_ROUTE_WIDTH,
} from "../config/constants";

/**
 * Draws a connection line between two node positions.
 */
export class EdgeLine {
    private graphics: Phaser.GameObjects.Graphics;
    private _isConstructing = false;
    private _isFogged = false;
    private _isSupplyRoute = false;

    constructor(
        scene: Phaser.Scene,
        public readonly fromX: number,
        public readonly fromY: number,
        public readonly toX: number,
        public readonly toY: number,
        constructing = false,
        public readonly fromId: string = "",
        public readonly toId: string = "",
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

    /** Set fog state (both endpoints unscouted) */
    setFogged(fogged: boolean): void {
        if (this._isFogged === fogged) return;
        this._isFogged = fogged;
        this.draw();
    }

    /** Set supply route glow state */
    setSupplyRoute(isRoute: boolean): void {
        if (this._isSupplyRoute === isRoute) return;
        this._isSupplyRoute = isRoute;
        this.draw();
    }

    draw(): void {
        this.graphics.clear();
        if (this._isConstructing) {
            this.drawDashed(EDGE_CONSTRUCTION_COLOR, EDGE_CONSTRUCTION_ALPHA, EDGE_CONSTRUCTION_WIDTH);
        } else if (this._isSupplyRoute) {
            this.graphics.lineStyle(SUPPLY_ROUTE_WIDTH, SUPPLY_ROUTE_COLOR, SUPPLY_ROUTE_ALPHA);
            this.graphics.beginPath();
            this.graphics.moveTo(this.fromX, this.fromY);
            this.graphics.lineTo(this.toX, this.toY);
            this.graphics.strokePath();
        } else {
            const alpha = this._isFogged ? FOG_EDGE_ALPHA : EDGE_ALPHA;
            this.graphics.lineStyle(EDGE_WIDTH, EDGE_COLOR, alpha);
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
            this.graphics.lineStyle(EDGE_HIGHLIGHT_WIDTH, EDGE_HIGHLIGHT_COLOR, EDGE_HIGHLIGHT_ALPHA);
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
