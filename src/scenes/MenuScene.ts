import Phaser from "phaser";
import type { FactionId } from "../data/factions";
import { SCENARIOS } from "../data/scenarios";

export type AIDifficulty = "easy" | "medium" | "hard";

export interface GameConfig {
    humanFactions: FactionId[];
    scenarioIndex: number;
    aiDifficulty: AIDifficulty;
}

export class MenuScene extends Phaser.Scene {
    private selectedFaction: FactionId = "british";
    private selectedDifficulty: AIDifficulty = "easy";
    private selectedScenario = 0;
    private isMultiplayer = false;

    constructor() {
        super({ key: "MenuScene" });
    }

    create(): void {
        const { width, height } = this.scale;

        this.add
            .text(width / 2, 50, "NAPOLIONIC", {
                fontFamily: "Georgia, serif",
                fontSize: "56px",
                color: "#ddaa22",
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, 105, "The Peninsular War", {
                fontFamily: "Georgia, serif",
                fontSize: "22px",
                color: "#c4a86a",
            })
            .setOrigin(0.5);

        // === Faction selection ===
        this.add
            .text(width / 2, 165, "Your Faction:", {
                fontFamily: "Georgia, serif",
                fontSize: "16px",
                color: "#a0956a",
            })
            .setOrigin(0.5);

        const factions: { id: FactionId; label: string; color: string }[] = [
            { id: "british", label: "British-Portuguese", color: "#dd4444" },
            { id: "french", label: "French Empire", color: "#4488dd" },
            { id: "spanish", label: "Spanish Resistance", color: "#ddaa22" },
        ];

        const factionBtns: Phaser.GameObjects.Text[] = [];
        let fx = width / 2 - 220;
        for (const f of factions) {
            const btn = this.add
                .text(fx, 195, f.label, {
                    fontFamily: "Georgia, serif",
                    fontSize: "16px",
                    color: f.color,
                    backgroundColor: f.id === this.selectedFaction ? "#3d2b1f" : undefined,
                    padding: { x: 8, y: 4 },
                })
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedFaction = f.id;
                this.refreshSelections(factionBtns, factions);
            });
            factionBtns.push(btn);
            fx += 180;
        }

        // === AI Difficulty ===
        this.add
            .text(width / 2, 250, "AI Difficulty:", {
                fontFamily: "Georgia, serif",
                fontSize: "16px",
                color: "#a0956a",
            })
            .setOrigin(0.5);

        const difficulties: { id: AIDifficulty; label: string }[] = [
            { id: "easy", label: "Easy" },
            { id: "medium", label: "Medium" },
            { id: "hard", label: "Hard" },
        ];

        const diffBtns: Phaser.GameObjects.Text[] = [];
        let dx = width / 2 - 120;
        for (const d of difficulties) {
            const btn = this.add
                .text(dx, 278, d.label, {
                    fontFamily: "Georgia, serif",
                    fontSize: "16px",
                    color: "#ffffff",
                    backgroundColor: d.id === this.selectedDifficulty ? "#3d2b1f" : undefined,
                    padding: { x: 12, y: 4 },
                })
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedDifficulty = d.id;
                for (let i = 0; i < diffBtns.length; i++) {
                    diffBtns[i]!.setBackgroundColor(
                        difficulties[i]!.id === d.id ? "#3d2b1f" : "",
                    );
                }
            });
            diffBtns.push(btn);
            dx += 110;
        }

        // === Scenario ===
        this.add
            .text(width / 2, 330, "Scenario:", {
                fontFamily: "Georgia, serif",
                fontSize: "16px",
                color: "#a0956a",
            })
            .setOrigin(0.5);

        const scenBtns: Phaser.GameObjects.Text[] = [];
        let sx = width / 2 - 180;
        for (let i = 0; i < SCENARIOS.length; i++) {
            const s = SCENARIOS[i]!;
            const btn = this.add
                .text(sx, 358, `${s.year}: ${s.name}`, {
                    fontFamily: "Georgia, serif",
                    fontSize: "14px",
                    color: "#d4c5a0",
                    backgroundColor: i === this.selectedScenario ? "#3d2b1f" : undefined,
                    padding: { x: 8, y: 4 },
                })
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedScenario = i;
                for (let j = 0; j < scenBtns.length; j++) {
                    scenBtns[j]!.setBackgroundColor(
                        j === i ? "#3d2b1f" : "",
                    );
                }
            });
            scenBtns.push(btn);
            sx += 200;
        }

        // === Multiplayer toggle ===
        const mpBtn = this.add
            .text(width / 2, 420, "[ Local Multiplayer: OFF ]", {
                fontFamily: "Georgia, serif",
                fontSize: "16px",
                color: "#888888",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        mpBtn.on("pointerdown", () => {
            this.isMultiplayer = !this.isMultiplayer;
            mpBtn.setText(
                `[ Local Multiplayer: ${this.isMultiplayer ? "ON - All Human" : "OFF"} ]`,
            );
            mpBtn.setColor(this.isMultiplayer ? "#ddaa22" : "#888888");
        });

        // === Start button ===
        const startBtn = this.add
            .text(width / 2, 490, "[ START ]", {
                fontFamily: "Georgia, serif",
                fontSize: "36px",
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        startBtn.on("pointerover", () => startBtn.setColor("#ddaa22"));
        startBtn.on("pointerout", () => startBtn.setColor("#ffffff"));
        startBtn.on("pointerdown", () => {
            const config: GameConfig = {
                humanFactions: this.isMultiplayer
                    ? ["french", "british", "spanish"]
                    : [this.selectedFaction],
                scenarioIndex: this.selectedScenario,
                aiDifficulty: this.selectedDifficulty,
            };
            this.scene.start("GameScene", config);
        });

        // Controls help
        this.add
            .text(width / 2, height - 55, "Controls: Click node to select, click neighbor to dispatch troops", {
                fontFamily: "Georgia, serif",
                fontSize: "12px",
                color: "#6b5b3e",
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, height - 35, "Right-click drag to pan | Mouse wheel to zoom", {
                fontFamily: "Georgia, serif",
                fontSize: "12px",
                color: "#6b5b3e",
            })
            .setOrigin(0.5);
    }

    private refreshSelections(
        btns: Phaser.GameObjects.Text[],
        factions: { id: FactionId; label: string; color: string }[],
    ): void {
        for (let i = 0; i < btns.length; i++) {
            btns[i]!.setBackgroundColor(
                factions[i]!.id === this.selectedFaction ? "#3d2b1f" : "",
            );
        }
    }
}
