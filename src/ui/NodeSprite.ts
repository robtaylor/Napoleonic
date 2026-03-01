import Phaser from "phaser";
import { NODE_RADIUS } from "../config/constants";
import { FACTIONS, type FactionId } from "../data/factions";
import type { NodeDef } from "../data/nodes";

/**
 * Visual representation of a city node on the map.
 * Displays as a colored circle with a troop count and city name label.
 */
export class NodeSprite extends Phaser.GameObjects.Container {
    private circle: Phaser.GameObjects.Graphics;
    private troopText: Phaser.GameObjects.Text;
    private nameLabel: Phaser.GameObjects.Text;
    private _factionId: FactionId;

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

        // Circle
        this.circle = scene.add.graphics();
        this.drawCircle();
        this.add(this.circle);

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

    /** Update displayed troop count */
    setTroops(count: number): void {
        this.troopText.setText(String(count));
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
