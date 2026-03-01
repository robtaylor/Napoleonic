import Phaser from "phaser";
import type { FactionId } from "../data/factions";

export interface GameConfig {
    humanFactions: FactionId[];
    scenarioIndex: number;
}

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: "MenuScene" });
    }

    create(): void {
        const { width, height } = this.scale;

        this.add
            .text(width / 2, 100, "NAPOLIONIC", {
                fontFamily: "Georgia, serif",
                fontSize: "64px",
                color: "#ddaa22",
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, 160, "The Peninsular War", {
                fontFamily: "Georgia, serif",
                fontSize: "24px",
                color: "#c4a86a",
            })
            .setOrigin(0.5);

        // Game mode buttons
        this.add
            .text(width / 2, 260, "Choose your mode:", {
                fontFamily: "Georgia, serif",
                fontSize: "18px",
                color: "#a0956a",
            })
            .setOrigin(0.5);

        const modes: { label: string; config: GameConfig }[] = [
            {
                label: "Single Player (British-Portuguese)",
                config: { humanFactions: ["british"], scenarioIndex: 0 },
            },
            {
                label: "Single Player (French)",
                config: { humanFactions: ["french"], scenarioIndex: 0 },
            },
            {
                label: "Single Player (Spanish)",
                config: { humanFactions: ["spanish"], scenarioIndex: 0 },
            },
            {
                label: "2-Player: British vs French",
                config: { humanFactions: ["british", "french"], scenarioIndex: 0 },
            },
            {
                label: "3-Player: All Factions",
                config: { humanFactions: ["british", "french", "spanish"], scenarioIndex: 0 },
            },
        ];

        let y = 310;
        for (const mode of modes) {
            const btn = this.add
                .text(width / 2, y, `[ ${mode.label} ]`, {
                    fontFamily: "Georgia, serif",
                    fontSize: "20px",
                    color: "#ffffff",
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            btn.on("pointerover", () => btn.setColor("#ddaa22"));
            btn.on("pointerout", () => btn.setColor("#ffffff"));
            btn.on("pointerdown", () => {
                this.scene.start("GameScene", mode.config);
            });

            y += 42;
        }

        // Controls help
        this.add
            .text(width / 2, height - 60, "Controls: Click node to select, click neighbor to dispatch troops", {
                fontFamily: "Georgia, serif",
                fontSize: "13px",
                color: "#6b5b3e",
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, height - 40, "Right-click drag to pan | Mouse wheel to zoom", {
                fontFamily: "Georgia, serif",
                fontSize: "13px",
                color: "#6b5b3e",
            })
            .setOrigin(0.5);
    }
}
