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
 * Draws a connection line between two node positions,
 * optionally routed through intermediate waypoints.
 */
export class EdgeLine {
    private graphics: Phaser.GameObjects.Graphics;
    private _isConstructing = false;
    private _isFogged = false;
    private _isSupplyRoute = false;
    private waypoints: [number, number][];

    constructor(
        scene: Phaser.Scene,
        public readonly fromX: number,
        public readonly fromY: number,
        public readonly toX: number,
        public readonly toY: number,
        constructing = false,
        public readonly fromId: string = "",
        public readonly toId: string = "",
        waypoints: [number, number][] = [],
    ) {
        this.graphics = scene.add.graphics();
        this._isConstructing = constructing;
        this.waypoints = waypoints;
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
            this.strokePath();
        } else {
            const alpha = this._isFogged ? FOG_EDGE_ALPHA : EDGE_ALPHA;
            this.graphics.lineStyle(EDGE_WIDTH, EDGE_COLOR, alpha);
            this.strokePath();
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
            this.strokePath();
        } else {
            this.draw();
        }
    }

    destroy(): void {
        this.graphics.destroy();
    }

    /** Stroke a path through all waypoints between from and to */
    private strokePath(): void {
        this.graphics.beginPath();
        this.graphics.moveTo(this.fromX, this.fromY);
        for (const [wx, wy] of this.waypoints) {
            this.graphics.lineTo(wx, wy);
        }
        this.graphics.lineTo(this.toX, this.toY);
        this.graphics.strokePath();
    }

    /** Draw a dashed line through all waypoints */
    private drawDashed(color: number, alpha: number, width: number): void {
        this.graphics.lineStyle(width, color, alpha);

        // Build full point sequence
        const points: [number, number][] = [
            [this.fromX, this.fromY],
            ...this.waypoints,
            [this.toX, this.toY],
        ];

        const dashLen = 6;
        const gapLen = 4;
        const segLen = dashLen + gapLen;

        // Walk the polyline drawing dashes
        let accumulated = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const [x0, y0] = points[i]!;
            const [x1, y1] = points[i + 1]!;
            const dx = x1 - x0;
            const dy = y1 - y0;
            const segmentLen = Math.sqrt(dx * dx + dy * dy);
            if (segmentLen === 0) continue;

            const nx = dx / segmentLen;
            const ny = dy / segmentLen;

            let pos = 0;
            while (pos < segmentLen) {
                const cyclePos = (accumulated + pos) % segLen;
                const isDash = cyclePos < dashLen;

                if (isDash) {
                    const dashRemaining = dashLen - cyclePos;
                    const segRemaining = segmentLen - pos;
                    const drawLen = Math.min(dashRemaining, segRemaining);

                    this.graphics.beginPath();
                    this.graphics.moveTo(x0 + nx * pos, y0 + ny * pos);
                    this.graphics.lineTo(x0 + nx * (pos + drawLen), y0 + ny * (pos + drawLen));
                    this.graphics.strokePath();

                    pos += drawLen;
                } else {
                    const gapRemaining = segLen - cyclePos;
                    const segRemaining = segmentLen - pos;
                    pos += Math.min(gapRemaining, segRemaining);
                }
            }
            accumulated += segmentLen;
        }
    }
}
