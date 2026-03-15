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
import { isPhone } from "../utils/platform";

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
        const mobile = isPhone();

        // Layout parameters — tighter on mobile
        const margin = mobile ? 8 : 16;
        const titleSize = mobile ? "28px" : "52px";
        const headingSize = mobile ? "11px" : "13px";
        const btnSize = mobile ? "12px" : "14px";
        const smallSize = mobile ? "10px" : "11px";
        const btnPadX = mobile ? 10 : 8;
        const btnPadY = mobile ? 6 : 4;

        // Compute vertical layout to fit everything in one screen
        const titleBlock = mobile ? 52 : 100;
        const topPad = mobile ? 30 : 36;
        const sectionGap = mobile ? 10 : 16;
        const sectionH = mobile ? 38 : 70;

        // ===== Rough-edged parchment page =====
        drawRoughParchmentPage(gfx, width, height, margin, mobile ? 3 : 5, 50);
        drawCornerOrnaments(gfx, margin + 14, margin + 4, width - (margin + 14) * 2, height - (margin + 4) * 2, mobile ? 10 : 16);

        let y = topPad;

        // ===== Title =====
        this.add
            .text(cx, y + (mobile ? 6 : 14), "NAPOLIONIC", {
                fontFamily: FONT_TITLE,
                fontSize: titleSize,
                color: INK,
            })
            .setOrigin(0.5);

        if (mobile) {
            // Compact: just a subtitle line, no box or date
            this.add
                .text(cx, y + 34, "The Peninsular War", {
                    fontFamily: FONT_HEADING,
                    fontSize: "10px",
                    color: INK_LIGHT,
                })
                .setOrigin(0.5);
        } else {
            const subW = 280;
            const subH = 32;
            const subY = y + 58;
            drawDoubleRuleBox(gfx, cx - subW / 2, subY, subW, subH);

            this.add
                .text(cx, subY + subH / 2, "The Peninsular War", {
                    fontFamily: FONT_HEADING,
                    fontSize: "16px",
                    color: INK,
                })
                .setOrigin(0.5);

            const dateY = subY + subH + 11;
            this.add
                .text(cx, dateY, "Iberia, 1808\u20131814", {
                    fontFamily: FONT_BODY,
                    fontSize: "11px",
                    color: INK_FAINT,
                })
                .setOrigin(0.5);

            drawStarburst(gfx, cx - 72, dateY, 4, 6);
            drawStarburst(gfx, cx + 72, dateY, 4, 6);
        }

        y += titleBlock;
        drawHorizontalRule(gfx, cx, y, mobile ? 300 : 460, true);
        y += sectionGap;

        // ===== Faction selection =====
        this.add
            .text(cx, y, "Your Faction", {
                fontFamily: FONT_HEADING,
                fontSize: headingSize,
                color: INK_LIGHT,
            })
            .setOrigin(0.5);
        y += mobile ? 16 : 24;

        const factions: { id: FactionId; label: string }[] = [
            { id: "british", label: mobile ? "British" : "British-Portuguese" },
            { id: "french", label: mobile ? "French" : "French Empire" },
            { id: "spanish", label: mobile ? "Spanish" : "Spanish Resistance" },
        ];

        const factionBtns: Phaser.GameObjects.Text[] = [];
        const factionSpacing = mobile ? 110 : 200;
        const factionStartX = cx - factionSpacing;
        for (let i = 0; i < factions.length; i++) {
            const f = factions[i]!;
            const bx = factionStartX + i * factionSpacing;

            if (!mobile) {
                drawFactionJack(gfx, bx - 52, y - 5, f.id, 12, 10);
            }

            const btn = this.add
                .text(bx, y, f.label, {
                    fontFamily: FONT_BODY,
                    fontSize: btnSize,
                    color: INK,
                    backgroundColor: f.id === this.selectedFaction ? "#c4b48a" : undefined,
                    padding: { x: btnPadX, y: btnPadY },
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            btn.on("pointerdown", () => {
                this.selectedFaction = f.id;
                this.refreshSelections(factionBtns, factions);
            });
            factionBtns.push(btn);
        }

        y += sectionH;
        drawHorizontalRule(gfx, cx, y, mobile ? 300 : 400, false);
        y += sectionGap;

        // ===== AI Difficulty =====
        this.add
            .text(cx, y, "Difficulty", {
                fontFamily: FONT_HEADING,
                fontSize: headingSize,
                color: INK_LIGHT,
            })
            .setOrigin(0.5);
        y += mobile ? 16 : 24;

        const difficulties: { id: AIDifficulty; label: string }[] = [
            { id: "easy", label: "Easy" },
            { id: "medium", label: "Medium" },
            { id: "hard", label: "Hard" },
        ];

        const diffBtns: Phaser.GameObjects.Text[] = [];
        const diffSpacing = mobile ? 90 : 110;
        const diffStartX = cx - diffSpacing;
        for (let i = 0; i < difficulties.length; i++) {
            const d = difficulties[i]!;
            const btn = this.add
                .text(diffStartX + i * diffSpacing, y, d.label, {
                    fontFamily: FONT_BODY,
                    fontSize: btnSize,
                    color: INK,
                    backgroundColor: d.id === this.selectedDifficulty ? "#c4b48a" : undefined,
                    padding: { x: btnPadX + 4, y: btnPadY },
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

        y += sectionH;
        drawHorizontalRule(gfx, cx, y, mobile ? 300 : 400, false);
        y += sectionGap;

        // ===== Game Length =====
        this.add
            .text(cx, y, "Game Length", {
                fontFamily: FONT_HEADING,
                fontSize: headingSize,
                color: INK_LIGHT,
            })
            .setOrigin(0.5);
        y += mobile ? 16 : 24;

        const modes: { id: GameMode; label: string }[] = [
            { id: "short", label: mobile ? "Short" : "Short (5 min)" },
            { id: "long", label: mobile ? "Long" : "Long (No limit)" },
        ];

        const modeBtns: Phaser.GameObjects.Text[] = [];
        const modeSpacing = mobile ? 120 : 180;
        const modeStartX = cx - modeSpacing / 2;
        for (let i = 0; i < modes.length; i++) {
            const m = modes[i]!;
            const btn = this.add
                .text(modeStartX + i * modeSpacing, y, m.label, {
                    fontFamily: FONT_BODY,
                    fontSize: btnSize,
                    color: INK,
                    backgroundColor: m.id === this.selectedMode ? "#c4b48a" : undefined,
                    padding: { x: btnPadX + 4, y: btnPadY },
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

        y += sectionH;
        drawHorizontalRule(gfx, cx, y, mobile ? 300 : 400, false);
        y += sectionGap;

        // ===== Scenario =====
        this.add
            .text(cx, y, "Scenario", {
                fontFamily: FONT_HEADING,
                fontSize: headingSize,
                color: INK_LIGHT,
            })
            .setOrigin(0.5);
        y += mobile ? 16 : 24;

        const scenBtns: Phaser.GameObjects.Text[] = [];
        const scenCount = SCENARIOS.length;
        const scenSpacing = mobile ? 120 : 220;
        const scenStartX = cx - ((scenCount - 1) * scenSpacing) / 2;
        for (let i = 0; i < scenCount; i++) {
            const s = SCENARIOS[i]!;
            const label = mobile ? `${s.year}` : `${s.year}: ${s.name}`;
            const btn = this.add
                .text(scenStartX + i * scenSpacing, y, label, {
                    fontFamily: FONT_BODY,
                    fontSize: mobile ? "12px" : "13px",
                    color: INK,
                    backgroundColor: i === this.selectedScenario ? "#c4b48a" : undefined,
                    padding: { x: btnPadX, y: btnPadY },
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
        y += mobile ? 20 : 30;
        const mpBtn = this.add
            .text(cx, y, "[ Local Multiplayer: OFF ]", {
                fontFamily: FONT_BODY,
                fontSize: mobile ? "10px" : "12px",
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

        // ===== Start button =====
        y += mobile ? 14 : 26;
        drawHorizontalRule(gfx, cx, y, mobile ? 300 : 460, true);
        y += mobile ? 10 : 18;

        const startBoxW = mobile ? 160 : 200;
        const startBoxH = mobile ? 36 : 48;
        drawDoubleRuleBox(gfx, cx - startBoxW / 2, y, startBoxW, startBoxH);

        const startBtn = this.add
            .text(cx, y + startBoxH / 2, "START", {
                fontFamily: FONT_HEADING,
                fontSize: mobile ? "24px" : "30px",
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

        // ===== Controls hint (desktop only) =====
        if (!mobile) {
            y += startBoxH + 14;
            drawHorizontalRule(gfx, cx, y, 460, false);

            this.add
                .text(cx, y + 20, "Controls: Click node \u2192 select, click neighbor \u2192 dispatch troops", {
                    fontFamily: FONT_BODY,
                    fontSize: smallSize,
                    color: INK_FAINT,
                })
                .setOrigin(0.5);

            this.add
                .text(
                    cx,
                    y + 38,
                    "E = Fortify  |  R = Build road  |  Dbl-click = Scout  |  Right-drag = Pan  |  Wheel = Zoom",
                    {
                        fontFamily: FONT_BODY,
                        fontSize: smallSize,
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
