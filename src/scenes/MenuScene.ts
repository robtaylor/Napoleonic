import Phaser from "phaser";
import type { FactionId } from "../data/factions";
import { SCENARIOS } from "../data/scenarios";
import type { GameMode } from "../game/state/GameState";
import {
    drawParchmentPanel,
    drawHorizontalRule,
    drawCornerOrnaments,
} from "../ui/PeriodUI";

export type AIDifficulty = "easy" | "medium" | "hard";

export interface GameConfig {
    humanFactions: FactionId[];
    scenarioIndex: number;
    aiDifficulty: AIDifficulty;
    gameMode: GameMode;
}

export class MenuScene extends Phaser.Scene {
    private selectedFaction: FactionId = "british";
    private selectedDifficulty: AIDifficulty = "easy";
    private selectedScenario = 0;
    private selectedMode: GameMode = "short";
    private isMultiplayer = false;

    constructor() {
        super({ key: "MenuScene" });
    }

    create(): void {
        const { width } = this.scale;
        const cx = width / 2;
        const gfx = this.add.graphics();

        // ===== Title section parchment panel =====
        const titlePanelW = 420;
        const titlePanelH = 120;
        drawParchmentPanel(gfx, cx - titlePanelW / 2, 20, titlePanelW, titlePanelH, 0.15);
        drawCornerOrnaments(gfx, cx - titlePanelW / 2, 20, titlePanelW, titlePanelH, 12);

        // Title
        this.add
            .text(cx, 48, "NAPOLIONIC", {
                fontFamily: "Georgia, serif",
                fontSize: "64px",
                color: "#ddaa22",
                stroke: "#000000",
                strokeThickness: 3,
                letterSpacing: 6,
            })
            .setOrigin(0.5);

        // Subtitle
        this.add
            .text(cx, 108, "The Peninsular War", {
                fontFamily: "Georgia, serif",
                fontSize: "24px",
                color: "#c4a86a",
            })
            .setOrigin(0.5);

        // Tagline
        this.add
            .text(cx, 132, "Iberia, 1808\u20131814", {
                fontFamily: "Georgia, serif",
                fontSize: "13px",
                color: "#8b7d5e",
            })
            .setOrigin(0.5);

        // Horizontal rule with diamond below title block
        drawHorizontalRule(gfx, cx, 152, 350, true);

        // ===== Options panel =====
        const optPanelW = 520;
        const optPanelH = 320;
        const optPanelX = cx - optPanelW / 2;
        const optPanelY = 162;
        drawParchmentPanel(gfx, optPanelX, optPanelY, optPanelW, optPanelH, 0.12);

        // === Faction selection ===
        this.add
            .text(cx, 178, "Your Faction:", {
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
        let fx = cx - 220;
        for (const f of factions) {
            const btn = this.add
                .text(fx, 200, f.label, {
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

        // Thin rule between sections
        drawHorizontalRule(gfx, cx, 237, 280, false);

        // === AI Difficulty ===
        this.add
            .text(cx, 250, "AI Difficulty:", {
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
        let dx = cx - 120;
        for (const d of difficulties) {
            const btn = this.add
                .text(dx, 272, d.label, {
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

        // Thin rule
        drawHorizontalRule(gfx, cx, 310, 280, false);

        // === Game Mode ===
        this.add
            .text(cx, 323, "Game Mode:", {
                fontFamily: "Georgia, serif",
                fontSize: "16px",
                color: "#a0956a",
            })
            .setOrigin(0.5);

        const modes: { id: GameMode; label: string; desc: string }[] = [
            { id: "short", label: "Short (5 min)", desc: "Quick decisive battle with timer" },
            { id: "long", label: "Long (No limit)", desc: "War continues until decisive outcome" },
        ];

        const modeBtns: Phaser.GameObjects.Text[] = [];
        let mx = cx - 140;
        for (const m of modes) {
            const btn = this.add
                .text(mx, 345, m.label, {
                    fontFamily: "Georgia, serif",
                    fontSize: "16px",
                    color: "#d4c5a0",
                    backgroundColor: m.id === this.selectedMode ? "#3d2b1f" : undefined,
                    padding: { x: 12, y: 4 },
                })
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedMode = m.id;
                for (let i = 0; i < modeBtns.length; i++) {
                    modeBtns[i]!.setBackgroundColor(
                        modes[i]!.id === m.id ? "#3d2b1f" : "",
                    );
                }
            });
            modeBtns.push(btn);
            mx += 180;
        }

        // Thin rule
        drawHorizontalRule(gfx, cx, 382, 280, false);

        // === Scenario ===
        this.add
            .text(cx, 395, "Scenario:", {
                fontFamily: "Georgia, serif",
                fontSize: "16px",
                color: "#a0956a",
            })
            .setOrigin(0.5);

        const scenBtns: Phaser.GameObjects.Text[] = [];
        let sx = cx - 180;
        for (let i = 0; i < SCENARIOS.length; i++) {
            const s = SCENARIOS[i]!;
            const btn = this.add
                .text(sx, 417, `${s.year}: ${s.name}`, {
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
            .text(cx, 465, "[ Local Multiplayer: OFF ]", {
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

        // ===== Start button with ornamental panel =====
        const startPanelW = 260;
        const startPanelH = 60;
        drawParchmentPanel(gfx, cx - startPanelW / 2, 500, startPanelW, startPanelH, 0.2);
        drawCornerOrnaments(gfx, cx - startPanelW / 2, 500, startPanelW, startPanelH, 10);

        const startBtn = this.add
            .text(cx, 530, "START", {
                fontFamily: "Georgia, serif",
                fontSize: "40px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        startBtn.on("pointerover", () => {
            startBtn.setColor("#ddaa22");
            this.tweens.add({
                targets: startBtn,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 120,
                ease: "Sine.easeOut",
            });
        });
        startBtn.on("pointerout", () => {
            startBtn.setColor("#ffffff");
            this.tweens.add({
                targets: startBtn,
                scaleX: 1,
                scaleY: 1,
                duration: 120,
                ease: "Sine.easeOut",
            });
        });
        startBtn.on("pointerdown", () => {
            const config: GameConfig = {
                humanFactions: this.isMultiplayer
                    ? ["french", "british", "spanish"]
                    : [this.selectedFaction],
                scenarioIndex: this.selectedScenario,
                aiDifficulty: this.selectedDifficulty,
                gameMode: this.selectedMode,
            };
            this.scene.start("GameScene", config);
        });

        // ===== Controls help with subtle panel =====
        drawHorizontalRule(gfx, cx, 575, 300, false);

        const ctrlPanelW = 540;
        const ctrlPanelH = 55;
        drawParchmentPanel(gfx, cx - ctrlPanelW / 2, 585, ctrlPanelW, ctrlPanelH, 0.1);

        this.add
            .text(cx, 597, "Controls: Click node to select, click neighbor to dispatch troops", {
                fontFamily: "Georgia, serif",
                fontSize: "12px",
                color: "#8b7d5e",
            })
            .setOrigin(0.5);

        this.add
            .text(cx, 617, "E = Fortify | R = Build road | Double-click = Scout | Right-drag = Pan | Wheel = Zoom", {
                fontFamily: "Georgia, serif",
                fontSize: "12px",
                color: "#8b7d5e",
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
