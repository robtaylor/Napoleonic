import Phaser from "phaser";
import type { FactionId } from "../data/factions";
import { SCENARIOS } from "../data/scenarios";
import type { GameMode } from "../game/state/GameState";
import {
    drawRoughParchmentPage,
    drawHorizontalRule,
    drawDoubleRuleBox,
    drawCornerOrnaments,
    drawStarburst,
    drawFactionJack,
    INK,
    INK_LIGHT,
    INK_FAINT,
    FONT_TITLE,
    FONT_HEADING,
    FONT_BODY,
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
        const { width, height } = this.scale;
        const cx = width / 2;
        const gfx = this.add.graphics();

        // ===== Rough-edged parchment page =====
        drawRoughParchmentPage(gfx, width, height, 16, 5, 50);

        // ===== Outer page border =====
        drawCornerOrnaments(gfx, 30, 20, width - 60, height - 40, 16);

        // Vertical offset to center content block in the page
        // Content spans ~550px; (720-550)/2 ≈ 85, so start at 85 instead of 50
        const oy = 36;

        // ===== Title =====
        this.add
            .text(cx, 50 + oy, "NAPOLIONIC", {
                fontFamily: FONT_TITLE,
                fontSize: "52px",
                color: INK,
            })
            .setOrigin(0.5);

        // Double-rule box around the subtitle (like "CAVALERIE" in the ref)
        const subW = 280;
        const subH = 32;
        drawDoubleRuleBox(gfx, cx - subW / 2, 94 + oy, subW, subH);

        this.add
            .text(cx, 110 + oy, "The Peninsular War", {
                fontFamily: FONT_HEADING,
                fontSize: "16px",
                color: INK,
            })
            .setOrigin(0.5);

        this.add
            .text(cx, 137 + oy, "Iberia, 1808\u20131814", {
                fontFamily: FONT_BODY,
                fontSize: "11px",
                color: INK_FAINT,
            })
            .setOrigin(0.5);

        drawStarburst(gfx, cx - 72, 137 + oy, 4, 6);
        drawStarburst(gfx, cx + 72, 137 + oy, 4, 6);

        drawHorizontalRule(gfx, cx, 156 + oy, 460, true);

        // ===== Faction selection =====
        this.add
            .text(cx, 174 + oy, "Your Faction", {
                fontFamily: FONT_HEADING,
                fontSize: "13px",
                color: INK_LIGHT,
            })
            .setOrigin(0.5);

        const factions: { id: FactionId; label: string }[] = [
            { id: "british", label: "British-Portuguese" },
            { id: "french", label: "French Empire" },
            { id: "spanish", label: "Spanish Resistance" },
        ];

        const factionBtns: Phaser.GameObjects.Text[] = [];
        const factionSpacing = 200;
        const factionStartX = cx - factionSpacing;
        for (let i = 0; i < factions.length; i++) {
            const f = factions[i]!;
            const bx = factionStartX + i * factionSpacing;

            // Faction color jack (left of text)
            drawFactionJack(gfx, bx - 52, 199 + oy, f.id, 12, 10);

            const btn = this.add
                .text(bx, 204 + oy, f.label, {
                    fontFamily: FONT_BODY,
                    fontSize: "14px",
                    color: INK,
                    backgroundColor: f.id === this.selectedFaction ? "#c4b48a" : undefined,
                    padding: { x: 8, y: 4 },
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedFaction = f.id;
                this.refreshSelections(factionBtns, factions);
            });
            factionBtns.push(btn);
        }

        drawHorizontalRule(gfx, cx, 232 + oy, 400, false);

        // ===== AI Difficulty =====
        this.add
            .text(cx, 248 + oy, "Difficulty", {
                fontFamily: FONT_HEADING,
                fontSize: "13px",
                color: INK_LIGHT,
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
                .text(diffStartX + i * diffSpacing, 272 + oy, d.label, {
                    fontFamily: FONT_BODY,
                    fontSize: "14px",
                    color: INK,
                    backgroundColor: d.id === this.selectedDifficulty ? "#c4b48a" : undefined,
                    padding: { x: 12, y: 4 },
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedDifficulty = d.id;
                for (let j = 0; j < diffBtns.length; j++) {
                    diffBtns[j]!.setBackgroundColor(
                        difficulties[j]!.id === d.id ? "#c4b48a" : "",
                    );
                }
            });
            diffBtns.push(btn);
        }

        drawHorizontalRule(gfx, cx, 302 + oy, 400, false);

        // ===== Game Length =====
        this.add
            .text(cx, 318 + oy, "Game Length", {
                fontFamily: FONT_HEADING,
                fontSize: "13px",
                color: INK_LIGHT,
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
                .text(modeStartX + i * modeSpacing, 342 + oy, m.label, {
                    fontFamily: FONT_BODY,
                    fontSize: "14px",
                    color: INK,
                    backgroundColor: m.id === this.selectedMode ? "#c4b48a" : undefined,
                    padding: { x: 12, y: 4 },
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedMode = m.id;
                for (let j = 0; j < modeBtns.length; j++) {
                    modeBtns[j]!.setBackgroundColor(
                        modes[j]!.id === m.id ? "#c4b48a" : "",
                    );
                }
            });
            modeBtns.push(btn);
        }

        drawHorizontalRule(gfx, cx, 372 + oy, 400, false);

        // ===== Scenario =====
        this.add
            .text(cx, 388 + oy, "Scenario", {
                fontFamily: FONT_HEADING,
                fontSize: "13px",
                color: INK_LIGHT,
            })
            .setOrigin(0.5);

        const scenBtns: Phaser.GameObjects.Text[] = [];
        const scenCount = SCENARIOS.length;
        const scenSpacing = 220;
        const scenStartX = cx - ((scenCount - 1) * scenSpacing) / 2;
        for (let i = 0; i < scenCount; i++) {
            const s = SCENARIOS[i]!;
            const btn = this.add
                .text(scenStartX + i * scenSpacing, 412 + oy, `${s.year}: ${s.name}`, {
                    fontFamily: FONT_BODY,
                    fontSize: "13px",
                    color: INK,
                    backgroundColor: i === this.selectedScenario ? "#c4b48a" : undefined,
                    padding: { x: 8, y: 4 },
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedScenario = i;
                for (let j = 0; j < scenBtns.length; j++) {
                    scenBtns[j]!.setBackgroundColor(
                        j === i ? "#c4b48a" : "",
                    );
                }
            });
            scenBtns.push(btn);
        }

        // ===== Multiplayer toggle =====
        const mpBtn = this.add
            .text(cx, 452 + oy, "[ Local Multiplayer: OFF ]", {
                fontFamily: FONT_BODY,
                fontSize: "12px",
                color: INK_FAINT,
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        mpBtn.on("pointerdown", () => {
            this.isMultiplayer = !this.isMultiplayer;
            mpBtn.setText(
                `[ Local Multiplayer: ${this.isMultiplayer ? "ON \u2014 All Human" : "OFF"} ]`,
            );
            mpBtn.setColor(this.isMultiplayer ? INK : INK_FAINT);
        });

        // ===== Start button — double-rule boxed like "CAVALERIE" =====
        drawHorizontalRule(gfx, cx, 478 + oy, 460, true);

        const startBoxW = 200;
        const startBoxH = 48;
        drawDoubleRuleBox(gfx, cx - startBoxW / 2, 496 + oy, startBoxW, startBoxH);

        const startBtn = this.add
            .text(cx, 520 + oy, "START", {
                fontFamily: FONT_HEADING,
                fontSize: "30px",
                color: INK,
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        startBtn.on("pointerover", () => {
            startBtn.setColor(INK_LIGHT);
            this.tweens.add({
                targets: startBtn,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100,
                ease: "Sine.easeOut",
            });
        });
        startBtn.on("pointerout", () => {
            startBtn.setColor(INK);
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

        // ===== Controls =====
        drawHorizontalRule(gfx, cx, 558 + oy, 460, false);

        this.add
            .text(cx, 578 + oy, "Controls: Click node \u2192 select, click neighbor \u2192 dispatch troops", {
                fontFamily: FONT_BODY,
                fontSize: "11px",
                color: INK_FAINT,
            })
            .setOrigin(0.5);

        this.add
            .text(
                cx,
                596 + oy,
                "E = Fortify  |  R = Build road  |  Dbl-click = Scout  |  Right-drag = Pan  |  Wheel = Zoom",
                {
                    fontFamily: FONT_BODY,
                    fontSize: "11px",
                    color: INK_FAINT,
                },
            )
            .setOrigin(0.5);

        this.add
            .text(cx, height - 14, "ESC = Pause Menu", {
                fontFamily: FONT_BODY,
                fontSize: "10px",
                color: INK_FAINT,
            })
            .setOrigin(0.5);
    }

    private refreshSelections(
        btns: Phaser.GameObjects.Text[],
        factions: { id: FactionId; label: string }[],
    ): void {
        for (let i = 0; i < btns.length; i++) {
            btns[i]!.setBackgroundColor(
                factions[i]!.id === this.selectedFaction ? "#c4b48a" : "",
            );
        }
    }
}
