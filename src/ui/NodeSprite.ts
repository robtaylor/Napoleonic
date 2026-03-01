import Phaser from "phaser";
import { NODE_RADIUS, SUPPLY_MAX } from "../config/constants";
import { FACTIONS, type FactionId } from "../data/factions";
import type { NodeDef } from "../data/nodes";
import type { NodeState } from "../game/state/NodeState";

/**
 * Visual representation of a city node on the map.
 * Displays as a colored circle with a troop count and city name label.
 *
 * Visual indicators:
 * - Pulsing red outline when unsupplied
 * - Thin supply ring showing supply level (green to red)
 * - Wall/castle icon when fortified
 * - "?" when enemy node is unscouted
 * - Build progress indicator when fortifying
 * - Brief flash on guerrilla raid
 */
export class NodeSprite extends Phaser.GameObjects.Container {
    private circle: Phaser.GameObjects.Graphics;
    private troopText: Phaser.GameObjects.Text;
    private nameLabel: Phaser.GameObjects.Text;
    private _factionId: FactionId;
    private supplyRing: Phaser.GameObjects.Graphics;
    private fortIcon: Phaser.GameObjects.Text;
    private raidFlashTimer = 0;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        public readonly nodeDef: NodeDef,
        factionId: FactionId,
        troops: number = 0,
    ) {
        super(scene, x, y);
        this._factionId = factionId;

        // Supply ring (drawn behind circle)
        this.supplyRing = scene.add.graphics();
        this.add(this.supplyRing);

        // Circle
        this.circle = scene.add.graphics();
        this.drawCircle();
        this.add(this.circle);

        // Fortification icon
        this.fortIcon = scene.add
            .text(NODE_RADIUS - 2, -(NODE_RADIUS - 2), "", {
                fontFamily: "Georgia, serif",
                fontSize: "10px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setVisible(false);
        this.add(this.fortIcon);

        // Troop count text
        this.troopText = scene.add
            .text(0, 0, String(troops), {
                fontFamily: "Georgia, serif",
                fontSize: "12px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(0.5);
        this.add(this.troopText);

        // City name label below the circle
        this.nameLabel = scene.add
            .text(0, NODE_RADIUS + 6, nodeDef.name, {
                fontFamily: "Georgia, serif",
                fontSize: "9px",
                color: "#d4c5a0",
                stroke: "#1a1209",
                strokeThickness: 2,
            })
            .setOrigin(0.5, 0);
        this.add(this.nameLabel);

        // Make the node interactive
        this.setSize(NODE_RADIUS * 2 + 4, NODE_RADIUS * 2 + 4);
        this.setInteractive({ useHandCursor: true });

        scene.add.existing(this);
    }

    get factionId(): FactionId {
        return this._factionId;
    }

    /** Update faction ownership visual */
    setFaction(factionId: FactionId): void {
        this._factionId = factionId;
        this.drawCircle();
    }

    /** Update displayed troop count (or "?" for unscouted enemies) */
    setTroops(count: number): void {
        this.troopText.setText(String(count));
    }

    /** Show "?" for unscouted enemy nodes */
    setTroopDisplay(count: number, scouted: boolean): void {
        this.troopText.setText(scouted ? String(count) : "?");
    }

    /** Highlight the node when selected */
    setSelected(selected: boolean): void {
        this.circle.clear();
        this.drawCircle();
        if (selected) {
            this.circle.lineStyle(3, 0xffffff, 1);
            this.circle.strokeCircle(0, 0, NODE_RADIUS + 3);
        }
    }

    /** Highlight as a valid dispatch target */
    setHighlightTarget(highlighted: boolean): void {
        if (highlighted) {
            this.circle.lineStyle(2, 0x88ff88, 0.8);
            this.circle.strokeCircle(0, 0, NODE_RADIUS + 2);
        }
    }

    /** Update supply visual indicators */
    updateSupply(nodeState: NodeState): void {
        this.supplyRing.clear();

        if (nodeState.owner === "neutral") return;

        const supplyPct = nodeState.supply / SUPPLY_MAX;

        if (!nodeState.supplied) {
            // Pulsing red outline for unsupplied nodes
            const pulse = 0.4 + 0.4 * Math.sin(Date.now() / 300);
            this.supplyRing.lineStyle(2, 0xff3333, pulse);
            this.supplyRing.strokeCircle(0, 0, NODE_RADIUS + 5);
        }

        // Supply ring (thin arc showing supply level)
        if (supplyPct < 1) {
            // Color interpolation: green (100%) -> yellow (50%) -> red (0%)
            const r = supplyPct < 0.5 ? 255 : Math.floor(255 * (1 - supplyPct) * 2);
            const g = supplyPct > 0.5 ? 255 : Math.floor(255 * supplyPct * 2);
            const color = (r << 16) | (g << 8) | 0;

            this.supplyRing.lineStyle(1.5, color, 0.7);

            // Draw arc proportional to supply level
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (2 * Math.PI * supplyPct);
            this.supplyRing.beginPath();
            this.supplyRing.arc(0, 0, NODE_RADIUS + 4, startAngle, endAngle, false);
            this.supplyRing.strokePath();
        }
    }

    /** Update fortification visual */
    updateFortification(nodeState: NodeState): void {
        if (nodeState.fortified) {
            this.fortIcon.setText("W"); // Wall symbol
            this.fortIcon.setVisible(true);
        } else if (nodeState.fortifyProgress > 0) {
            this.fortIcon.setText("B"); // Building
            this.fortIcon.setVisible(true);
        } else {
            this.fortIcon.setVisible(false);
        }
    }

    /** Flash the node briefly (guerrilla raid feedback) */
    triggerRaidFlash(): void {
        this.raidFlashTimer = 500; // 500ms flash
    }

    /** Call each frame to update flash timer */
    updateRaidFlash(deltaMs: number): void {
        if (this.raidFlashTimer > 0) {
            this.raidFlashTimer -= deltaMs;
            const alpha = Math.max(0, this.raidFlashTimer / 500);
            this.circle.lineStyle(3, 0xffaa00, alpha);
            this.circle.strokeCircle(0, 0, NODE_RADIUS + 4);
        }
    }

    private drawCircle(): void {
        const faction = FACTIONS[this._factionId];
        this.circle.clear();

        // Type indicator: slightly different radius for fortresses/capitals
        const r = this.nodeDef.type === "capital" ? NODE_RADIUS + 2 :
                  this.nodeDef.type === "fortress" ? NODE_RADIUS + 1 :
                  NODE_RADIUS;

        this.circle.fillStyle(faction.color, 0.9);
        this.circle.lineStyle(2, 0x000000, 0.6);
        this.circle.fillCircle(0, 0, r);
        this.circle.strokeCircle(0, 0, r);

        // Capital gets a star-like inner mark
        if (this.nodeDef.type === "capital") {
            this.circle.fillStyle(0xffffff, 0.3);
            this.circle.fillCircle(0, 0, 4);
        }
        // Fortress gets a square inner mark
        if (this.nodeDef.type === "fortress") {
            this.circle.lineStyle(1, 0xffffff, 0.4);
            this.circle.strokeRect(-3, -3, 6, 6);
        }
    }
}
