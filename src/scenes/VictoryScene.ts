import Phaser from "phaser";
import { FACTIONS, type FactionId } from "../data/factions";
import type { VictoryReason } from "../game/systems/VictorySystem";

interface VictoryData {
    winner: FactionId;
    reason: VictoryReason;
}

const VICTORY_TEXT: Record<VictoryReason, Record<FactionId, string>> = {
    elimination: {
        french: "The Grand Armée has swept all opposition from Iberia!",
        british: "Wellington's forces stand alone — all enemies vanquished!",
        spanish: "Viva España! The invaders have been driven from our soil!",
        neutral: "",
    },
    domination: {
        french: "France dominates the peninsula — resistance is futile.",
        british: "Britannia rules — the peninsula is liberated!",
        spanish: "Spain is free! Every city flies our banner!",
        neutral: "",
    },
    french_hold: {
        french: "Napoleon's grip on Iberia is absolute. 20 cities held for a full minute — unshakeable!",
        british: "",
        spanish: "",
        neutral: "",
    },
    british_expel: {
        french: "",
        british: "The French position has become untenable. Wellington's strategy of attrition succeeds!",
        spanish: "",
        neutral: "",
    },
    spanish_endure: {
        french: "",
        british: "",
        spanish: "Three years of guerrilla warfare pay off. Spain endures — the French cannot!",
        neutral: "",
    },
    timeout: {
        french: "Time expired — France holds the most territory on the peninsula.",
        british: "Time expired — the British-Portuguese alliance controls the most cities.",
        spanish: "Time expired — Spanish resilience holds the most ground.",
        neutral: "",
    },
};

export class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: "VictoryScene" });
    }

    create(data: VictoryData): void {
        const { width, height } = this.scale;
        const faction = FACTIONS[data.winner];

        // Semi-transparent backdrop
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

        this.add
            .text(width / 2, height / 3 - 20, "VICTORY", {
                fontFamily: "Georgia, serif",
                fontSize: "56px",
                color: faction.textColor,
                stroke: "#000000",
                strokeThickness: 4,
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, height / 3 + 50, `${faction.name} wins!`, {
                fontFamily: "Georgia, serif",
                fontSize: "28px",
                color: "#d4c5a0",
            })
            .setOrigin(0.5);

        const reasonText = VICTORY_TEXT[data.reason]?.[data.winner] || "Victory achieved!";

        this.add
            .text(width / 2, height / 3 + 90, reasonText, {
                fontFamily: "Georgia, serif",
                fontSize: "16px",
                color: "#a0956a",
                wordWrap: { width: width * 0.7 },
                align: "center",
            })
            .setOrigin(0.5);

        // Play again button
        const btn = this.add
            .text(width / 2, height / 2 + 80, "[ Play Again ]", {
                fontFamily: "Georgia, serif",
                fontSize: "28px",
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        btn.on("pointerover", () => btn.setColor("#ddaa22"));
        btn.on("pointerout", () => btn.setColor("#ffffff"));
        btn.on("pointerdown", () => {
            this.scene.start("MenuScene");
        });
    }
}
