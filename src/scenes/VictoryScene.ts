import Phaser from "phaser";
import { FACTIONS, type FactionId } from "../data/factions";

interface VictoryData {
    winner: FactionId;
    reason: "domination" | "majority" | "timeout";
}

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

        const reasonText =
            data.reason === "domination"
                ? "All enemy cities captured"
                : data.reason === "timeout"
                  ? "Most cities held when time expired"
                  : "Majority control achieved";

        this.add
            .text(width / 2, height / 3 + 90, reasonText, {
                fontFamily: "Georgia, serif",
                fontSize: "18px",
                color: "#a0956a",
            })
            .setOrigin(0.5);

        // Play again button
        const btn = this.add
            .text(width / 2, height / 2 + 60, "[ Play Again ]", {
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
