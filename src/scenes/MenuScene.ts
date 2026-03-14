import Phaser from "phaser";
import type { FactionId } from "../data/factions";
import { SCENARIOS } from "../data/scenarios";
import type { GameMode } from "../game/state/GameState";
import {
    drawParchmentPanel,
    drawHorizontalRule,
    drawCornerOrnaments,
    drawStarburst,
} from "../ui/PeriodUI";

export type AIDifficulty = "easy" | "medium" | "hard";

export interface GameConfig {
    humanFactions: FactionId[];
    scenarioIndex: number;
    aiDifficulty: AIDifficulty;
    gameMode: GameMode;
}

/** Font families — Cinzel loaded via Google Fonts in index.html */
const FONT_TITLE = "'Cinzel Decorative', Georgia, serif";
const FONT_HEADING = "'Cinzel', Georgia, serif";
const FONT_BODY = "'Cinzel', Georgia, serif";

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
        const { width, height } = this.scale;
        const cx = width / 2;
        const gfx = this.add.graphics();

        // ===== Title — no panel, just the text with breathing room =====
        this.add
            .text(cx, 52, "NAPOLIONIC", {
                fontFamily: FONT_TITLE,
                fontSize: "58px",
                color: "#ddaa22",
                stroke: "#1a1208",
                strokeThickness: 4,
            })
            .setOrigin(0.5);

        this.add
            .text(cx, 112, "The Peninsular War", {
                fontFamily: FONT_HEADING,
                fontSize: "20px",
                color: "#c4a86a",
            })
            .setOrigin(0.5);

        this.add
            .text(cx, 137, "Iberia, 1808\u20131814", {
                fontFamily: FONT_BODY,
                fontSize: "12px",
                color: "#8b7d5e",
            })
            .setOrigin(0.5);

        // Starburst dividers flanking the tagline
        drawStarburst(gfx, cx - 80, 137, 5, 6);
        drawStarburst(gfx, cx + 80, 137, 5, 6);

        // Diamond rule below title block
        drawHorizontalRule(gfx, cx, 158, 400, true);

        // ===== Options panel — wide enough for 3 scenarios =====
        const optPanelW = 700;
        const optPanelH = 290;
        const optPanelX = cx - optPanelW / 2;
        const optPanelY = 172;
        drawParchmentPanel(gfx, optPanelX, optPanelY, optPanelW, optPanelH, 0.15);

        // === Faction selection ===
        this.add
            .text(cx, 188, "Your Faction", {
                fontFamily: FONT_HEADING,
                fontSize: "14px",
                color: "#a0956a",
            })
            .setOrigin(0.5);

        const factions: { id: FactionId; label: string; color: string }[] = [
            { id: "british", label: "British-Portuguese", color: "#dd4444" },
            { id: "french", label: "French Empire", color: "#4488dd" },
            { id: "spanish", label: "Spanish Resistance", color: "#ddaa22" },
        ];

        const factionBtns: Phaser.GameObjects.Text[] = [];
        const factionSpacing = 200;
        const factionStartX = cx - factionSpacing;
        for (let i = 0; i < factions.length; i++) {
            const f = factions[i]!;
            const btn = this.add
                .text(factionStartX + i * factionSpacing, 212, f.label, {
                    fontFamily: FONT_BODY,
                    fontSize: "15px",
                    color: f.color,
                    backgroundColor: f.id === this.selectedFaction ? "#3d2b1f" : undefined,
                    padding: { x: 10, y: 5 },
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedFaction = f.id;
                this.refreshSelections(factionBtns, factions);
            });
            factionBtns.push(btn);
        }

        drawHorizontalRule(gfx, cx, 242, 350, false);

        // === AI Difficulty ===
        this.add
            .text(cx, 258, "Difficulty", {
                fontFamily: FONT_HEADING,
                fontSize: "14px",
                color: "#a0956a",
            })
            .setOrigin(0.5);

        const difficulties: { id: AIDifficulty; label: string }[] = [
            { id: "easy", label: "Easy" },
            { id: "medium", label: "Medium" },
            { id: "hard", label: "Hard" },
        ];

        const diffBtns: Phaser.GameObjects.Text[] = [];
        const diffSpacing = 110;
        const diffStartX = cx - diffSpacing;
        for (let i = 0; i < difficulties.length; i++) {
            const d = difficulties[i]!;
            const btn = this.add
                .text(diffStartX + i * diffSpacing, 282, d.label, {
                    fontFamily: FONT_BODY,
                    fontSize: "15px",
                    color: "#d4c5a0",
                    backgroundColor: d.id === this.selectedDifficulty ? "#3d2b1f" : undefined,
                    padding: { x: 12, y: 5 },
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedDifficulty = d.id;
                for (let j = 0; j < diffBtns.length; j++) {
                    diffBtns[j]!.setBackgroundColor(
                        difficulties[j]!.id === d.id ? "#3d2b1f" : "",
                    );
                }
            });
            diffBtns.push(btn);
        }

        drawHorizontalRule(gfx, cx, 312, 350, false);

        // === Game Mode ===
        this.add
            .text(cx, 328, "Game Length", {
                fontFamily: FONT_HEADING,
                fontSize: "14px",
                color: "#a0956a",
            })
            .setOrigin(0.5);

        const modes: { id: GameMode; label: string }[] = [
            { id: "short", label: "Short (5 min)" },
            { id: "long", label: "Long (No limit)" },
        ];

        const modeBtns: Phaser.GameObjects.Text[] = [];
        const modeSpacing = 180;
        const modeStartX = cx - modeSpacing / 2;
        for (let i = 0; i < modes.length; i++) {
            const m = modes[i]!;
            const btn = this.add
                .text(modeStartX + i * modeSpacing, 352, m.label, {
                    fontFamily: FONT_BODY,
                    fontSize: "15px",
                    color: "#d4c5a0",
                    backgroundColor: m.id === this.selectedMode ? "#3d2b1f" : undefined,
                    padding: { x: 12, y: 5 },
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedMode = m.id;
                for (let j = 0; j < modeBtns.length; j++) {
                    modeBtns[j]!.setBackgroundColor(
                        modes[j]!.id === m.id ? "#3d2b1f" : "",
                    );
                }
            });
            modeBtns.push(btn);
        }

        drawHorizontalRule(gfx, cx, 382, 350, false);

        // === Scenario ===
        this.add
            .text(cx, 398, "Scenario", {
                fontFamily: FONT_HEADING,
                fontSize: "14px",
                color: "#a0956a",
            })
            .setOrigin(0.5);

        const scenBtns: Phaser.GameObjects.Text[] = [];
        const scenCount = SCENARIOS.length;
        const scenSpacing = 220;
        const scenStartX = cx - ((scenCount - 1) * scenSpacing) / 2;
        for (let i = 0; i < scenCount; i++) {
            const s = SCENARIOS[i]!;
            const btn = this.add
                .text(scenStartX + i * scenSpacing, 422, `${s.year}: ${s.name}`, {
                    fontFamily: FONT_BODY,
                    fontSize: "13px",
                    color: "#d4c5a0",
                    backgroundColor: i === this.selectedScenario ? "#3d2b1f" : undefined,
                    padding: { x: 8, y: 4 },
                })
                .setOrigin(0.5)
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
        }

        // === Multiplayer toggle ===
        const mpBtn = this.add
            .text(cx, 455, "[ Local Multiplayer: OFF ]", {
                fontFamily: FONT_BODY,
                fontSize: "13px",
                color: "#666666",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        mpBtn.on("pointerdown", () => {
            this.isMultiplayer = !this.isMultiplayer;
            mpBtn.setText(
                `[ Local Multiplayer: ${this.isMultiplayer ? "ON \u2014 All Human" : "OFF"} ]`,
            );
            mpBtn.setColor(this.isMultiplayer ? "#ddaa22" : "#666666");
        });

        // ===== Start button =====
        const startPanelW = 240;
        const startPanelH = 56;
        const startY = 490;
        drawParchmentPanel(gfx, cx - startPanelW / 2, startY, startPanelW, startPanelH, 0.22);
        drawCornerOrnaments(gfx, cx - startPanelW / 2, startY, startPanelW, startPanelH, 10);

        const startBtn = this.add
            .text(cx, startY + startPanelH / 2, "START", {
                fontFamily: FONT_HEADING,
                fontSize: "36px",
                color: "#ddaa22",
                stroke: "#1a1208",
                strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        startBtn.on("pointerover", () => {
            startBtn.setColor("#ffffff");
            this.tweens.add({
                targets: startBtn,
                scaleX: 1.06,
                scaleY: 1.06,
                duration: 100,
                ease: "Sine.easeOut",
            });
        });
        startBtn.on("pointerout", () => {
            startBtn.setColor("#ddaa22");
            this.tweens.add({
                targets: startBtn,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
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

        // ===== Controls help =====
        drawHorizontalRule(gfx, cx, 565, 360, false);

        this.add
            .text(cx, 585, "Controls: Click node \u2192 select, click neighbor \u2192 dispatch troops", {
                fontFamily: FONT_BODY,
                fontSize: "11px",
                color: "#7a6c50",
            })
            .setOrigin(0.5);

        this.add
            .text(
                cx,
                603,
                "E = Fortify  |  R = Build road  |  Dbl-click = Scout  |  Right-drag = Pan  |  Wheel = Zoom",
                {
                    fontFamily: FONT_BODY,
                    fontSize: "11px",
                    color: "#7a6c50",
                },
            )
            .setOrigin(0.5);

        // Subtle version / ESC hint at very bottom
        this.add
            .text(cx, height - 12, "ESC = Pause Menu", {
                fontFamily: FONT_BODY,
                fontSize: "10px",
                color: "#5a4a32",
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
