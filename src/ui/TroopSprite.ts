import Phaser from "phaser";
import { FACTIONS, type FactionId } from "../data/factions";
import type { DispatchType } from "../game/state/TroopDispatch";

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
    /** Full polyline: [from, ...waypoints, to] as screen coords */
    private pathPoints: [number, number][];
    /** Cumulative distances along the polyline, normalized to [0..1] */
    private pathDistances: number[];

    constructor(
        scene: Phaser.Scene,
        public readonly dispatchId: number,
        private owner: FactionId,
        troops: number,
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        dispatchType: DispatchType = "troops",
        waypoints: [number, number][] = [],
    ) {
        super(scene, fromX, fromY);
        this.dispatchType = dispatchType;

        // Build full path polyline
        this.pathPoints = [[fromX, fromY], ...waypoints, [toX, toY]];
        this.pathDistances = this.computePathDistances();

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

    /** Compute cumulative normalized distances along the polyline */
    private computePathDistances(): number[] {
        const pts = this.pathPoints;
        const dists = [0];
        let total = 0;
        for (let i = 1; i < pts.length; i++) {
            const dx = pts[i]![0] - pts[i - 1]![0];
            const dy = pts[i]![1] - pts[i - 1]![1];
            total += Math.sqrt(dx * dx + dy * dy);
            dists.push(total);
        }
        // Normalize to [0..1]
        if (total > 0) {
            for (let i = 0; i < dists.length; i++) {
                dists[i] = dists[i]! / total;
            }
        }
        return dists;
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

    /** Update position based on progress (0..1) along the polyline path */
    updateProgress(progress: number): void {
        const t = Math.max(0, Math.min(1, progress));

        // Find which segment we're on
        const dists = this.pathDistances;
        const pts = this.pathPoints;

        // Binary-ish search for the segment
        let segIdx = 0;
        for (let i = 1; i < dists.length; i++) {
            if (dists[i]! >= t) {
                segIdx = i - 1;
                break;
            }
        }

        const segStart = dists[segIdx]!;
        const segEnd = dists[segIdx + 1] ?? 1;
        const segLen = segEnd - segStart;
        const localT = segLen > 0 ? (t - segStart) / segLen : 0;

        const p0 = pts[segIdx]!;
        const p1 = pts[segIdx + 1] ?? p0;

        this.x = p0[0] + localT * (p1[0] - p0[0]);
        this.y = p0[1] + localT * (p1[1] - p0[1]);
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
