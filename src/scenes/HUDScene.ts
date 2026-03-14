import Phaser from "phaser";
import { GAME_DURATION_S } from "../config/constants";
import { FACTIONS, type FactionId } from "../data/factions";
import type { GameState } from "../game/state/GameState";
import {
    drawHUDPanel,
    drawFactionJack,
    drawKeyBox,
    drawMiniNode,
    drawMiniDispatch,
    drawMiniEdge,
    drawMiniSupplyArc,
    INK,
    INK_LIGHT,
    INK_FAINT,
    FONT_HEADING,
    FONT_BODY,
} from "../ui/PeriodUI";

const FACTION_OBJECTIVES: Record<Exclude<FactionId, "neutral">, string> = {
    french: "Hold 20+ cities for 60s",
    british: "Reduce France to 5 or fewer cities",
    spanish: "After 3 min: match or exceed French cities",
};

/** Padding inside HUD panels */
const PAD = 8;

/**
 * HUD overlay scene — parchment-styled panels with ink text
 * and faction color jacks for identification.
 *
 * Panel sizes are computed from text content so nothing overflows.
 */
export class HUDScene extends Phaser.Scene {
    private gameState!: GameState;
    private factionTexts: Map<FactionId, Phaser.GameObjects.Text> = new Map();
    private timerText!: Phaser.GameObjects.Text;
    private objectiveText!: Phaser.GameObjects.Text;
    private guerrillaText!: Phaser.GameObjects.Text;
    private humanFaction: FactionId = "british";

    constructor() {
        super({ key: "HUDScene" });
    }

    init(data: { gameState: GameState; humanFaction?: FactionId }): void {
        this.gameState = data.gameState;
        this.humanFaction = data.humanFaction ?? "british";
    }

    create(): void {
        const { width } = this.scale;

        // =========================================================
        // 1. Create text objects FIRST so we can measure them
        // =========================================================

        // --- Scoreboard texts (top-left) ---
        const jackW = 10;
        const jackGap = 6;
        const textX = PAD + jackW + jackGap;
        const factionIds: FactionId[] = ["french", "british", "spanish"];
        let sbMaxW = 0;
        let y = PAD;
        for (const fid of factionIds) {
            const text = this.add
                .text(textX, y, "", {
                    fontFamily: FONT_BODY,
                    fontSize: "12px",
                    color: INK,
                })
                .setScrollFactor(0)
                .setDepth(100);

            // Measure with worst-case content
            text.setText("British-Portuguese: 25 cities, 999 troops");
            sbMaxW = Math.max(sbMaxW, text.width);
            text.setText("");

            this.factionTexts.set(fid, text);
            y += 20;
        }

        const sbW = textX + sbMaxW + PAD;
        const sbH = y + PAD - 4; // 3 rows + padding

        // --- Timer + objective (top-right) ---
        this.timerText = this.add
            .text(0, 0, "", {
                fontFamily: FONT_HEADING,
                fontSize: "15px",
                color: INK,
            })
            .setScrollFactor(0)
            .setDepth(100);

        this.objectiveText = this.add
            .text(0, 0, "", {
                fontFamily: FONT_BODY,
                fontSize: "10px",
                color: INK_LIGHT,
            })
            .setScrollFactor(0)
            .setDepth(100);

        // Measure worst-case objective
        this.objectiveText.setText("Objective: After 3 min: match or exceed French cities");
        const objW = this.objectiveText.width;
        this.objectiveText.setText("");

        this.timerText.setText("05:00");
        const timerW = this.timerText.width;
        this.timerText.setText("");

        const trContentW = Math.max(objW, timerW);
        const trW = trContentW + PAD * 2;
        const trH = 44;
        const trX = width - trW - 4;

        // Position timer + objective inside panel
        this.timerText.setPosition(trX + PAD, 4 + PAD);
        this.objectiveText.setPosition(trX + PAD, 4 + PAD + 20);

        // --- Controls legend (bottom-right) ---
        const keyLines = [
            "Click: Select / Dispatch",
            "Drag: Gather & dispatch",
            "Dbl-click: Send scout",
            "E: Fortify  G: Guerrilla",
            "R: Build road (shortcut)",
            "Right-drag: Pan",
            "Wheel: Zoom",
        ];
        const ctrlHeader = this.add
            .text(0, 0, "CONTROLS", {
                fontFamily: FONT_HEADING,
                fontSize: "9px",
                color: INK_FAINT,
                letterSpacing: 3,
            })
            .setScrollFactor(0)
            .setDepth(100);

        const ctrlText = this.add
            .text(0, 0, keyLines.join("\n"), {
                fontFamily: FONT_BODY,
                fontSize: "11px",
                color: INK_LIGHT,
                lineSpacing: 2,
            })
            .setScrollFactor(0)
            .setDepth(100);

        const clW = Math.max(ctrlHeader.width, ctrlText.width) + PAD * 2;
        const clH = ctrlHeader.height + ctrlText.height + PAD * 2 + 6;
        const clX = width - clW - 4;
        const clY = this.scale.height - clH - 4;

        ctrlHeader.setPosition(clX + PAD, clY + PAD);
        ctrlText.setPosition(clX + PAD, clY + PAD + ctrlHeader.height + 4);

        // =========================================================
        // 2. Draw panels sized to fit the measured text
        // =========================================================
        const panels = this.add.graphics();
        panels.setScrollFactor(0);
        panels.setDepth(99);

        // Scoreboard panel
        drawHUDPanel(panels, 4, 4, sbW, sbH);

        // Draw faction jacks on the panels graphics
        let jackY = PAD + 3;
        for (const fid of factionIds) {
            drawFactionJack(panels, PAD, jackY, fid, jackW, 8);
            jackY += 20;
        }

        // Timer / objective panel
        drawHUDPanel(panels, trX, 4, trW, trH);

        // Controls panel
        drawHUDPanel(panels, clX, clY, clW, clH);

        // =========================================================
        // 3. Bottom-left panels: Map Legend + Actions
        // =========================================================
        const blX = 4;
        const blW = 190;
        const blPad = 8;
        const legendH = 140;
        const actionsH = 104;
        const blGap = 4;

        const legendY = this.scale.height - legendH - blGap - actionsH - 4;
        const actionsY = legendY + legendH + blGap;

        // --- Map Legend panel ---
        drawHUDPanel(panels, blX, legendY, blW, legendH, 0.88, 777);

        // Legend header
        this.add
            .text(blX + blPad, legendY + blPad - 2, "MAP KEY", {
                fontFamily: FONT_HEADING,
                fontSize: "9px",
                color: INK_FAINT,
                letterSpacing: 3,
            })
            .setScrollFactor(0)
            .setDepth(100);

        const legendGfx = this.add.graphics();
        legendGfx.setScrollFactor(0);
        legendGfx.setDepth(100);

        // Row 1: Node types (2 columns)
        const row1Y = legendY + blPad + 14;
        const col1X = blX + blPad;
        const col2X = blX + blPad + 95;
        const rowH = 16;

        // Capital + Fortress
        drawMiniNode(legendGfx, col1X + 5, row1Y + 5, "capital", 5);
        this.add
            .text(col1X + 14, row1Y, "Capital", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        drawMiniNode(legendGfx, col2X + 5, row1Y + 5, "fortress", 5);
        this.add
            .text(col2X + 14, row1Y, "Fortress", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        // Port + City
        const row2Y = row1Y + rowH;
        drawMiniNode(legendGfx, col1X + 5, row2Y + 5, "port", 5);
        this.add
            .text(col1X + 14, row2Y, "Port", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        drawMiniNode(legendGfx, col2X + 5, row2Y + 5, "city", 5);
        this.add
            .text(col2X + 14, row2Y, "City", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        // Divider
        const div1Y = row2Y + rowH + 2;
        legendGfx.lineStyle(0.5, 0x8b7d5e, 0.3);
        legendGfx.beginPath();
        legendGfx.moveTo(col1X, div1Y);
        legendGfx.lineTo(blX + blW - blPad, div1Y);
        legendGfx.strokePath();

        // Row 3: Dispatch types (3 across)
        const row3Y = div1Y + 5;
        const dCol1 = col1X;
        const dCol2 = col1X + 58;
        const dCol3 = col1X + 116;

        drawMiniDispatch(legendGfx, dCol1 + 4, row3Y + 5, "troops", 4);
        this.add
            .text(dCol1 + 12, row3Y, "Troop", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        drawMiniDispatch(legendGfx, dCol2 + 4, row3Y + 5, "scout", 4);
        this.add
            .text(dCol2 + 12, row3Y, "Scout", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        drawMiniDispatch(legendGfx, dCol3 + 4, row3Y + 5, "engineer", 3);
        this.add
            .text(dCol3 + 11, row3Y, "Engr", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        // Divider
        const div2Y = row3Y + rowH + 2;
        legendGfx.lineStyle(0.5, 0x8b7d5e, 0.3);
        legendGfx.beginPath();
        legendGfx.moveTo(col1X, div2Y);
        legendGfx.lineTo(blX + blW - blPad, div2Y);
        legendGfx.strokePath();

        // Row 4: Edge styles + overlays
        const row4Y = div2Y + 5;
        drawMiniEdge(legendGfx, col1X, row4Y + 5, col1X + 22, row4Y + 5, "solid");
        this.add
            .text(col1X + 26, row4Y, "Road", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        drawMiniEdge(legendGfx, col2X, row4Y + 5, col2X + 22, row4Y + 5, "dashed");
        this.add
            .text(col2X + 26, row4Y, "Building", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        // Divider
        const div3Y = row4Y + rowH + 2;
        legendGfx.lineStyle(0.5, 0x8b7d5e, 0.3);
        legendGfx.beginPath();
        legendGfx.moveTo(col1X, div3Y);
        legendGfx.lineTo(blX + blW - blPad, div3Y);
        legendGfx.strokePath();

        // Row 5: Overlays + supply arc
        const row5Y = div3Y + 5;
        // Overlay letters
        this.add
            .text(col1X, row5Y, "W", {
                fontFamily: FONT_BODY, fontSize: "9px", color: "#ffffff",
                stroke: "#000000", strokeThickness: 2,
            })
            .setScrollFactor(0).setDepth(100);
        this.add
            .text(col1X + 12, row5Y, "Fort", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        this.add
            .text(col1X + 44, row5Y, "G", {
                fontFamily: FONT_BODY, fontSize: "9px", color: "#ddaa22",
                stroke: "#000000", strokeThickness: 2,
            })
            .setScrollFactor(0).setDepth(100);
        this.add
            .text(col1X + 56, row5Y, "Guerr", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        // Supply arc
        drawMiniSupplyArc(legendGfx, col2X + 6, row5Y + 5, 5);
        this.add
            .text(col2X + 16, row5Y, "Supply", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        // --- Actions panel ---
        drawHUDPanel(panels, blX, actionsY, blW, actionsH, 0.88, 888);

        this.add
            .text(blX + blPad, actionsY + blPad - 2, "ACTIONS", {
                fontFamily: FONT_HEADING,
                fontSize: "9px",
                color: INK_FAINT,
                letterSpacing: 3,
            })
            .setScrollFactor(0)
            .setDepth(100);

        const actGfx = this.add.graphics();
        actGfx.setScrollFactor(0);
        actGfx.setDepth(100);

        const actRow1Y = actionsY + blPad + 14;
        const actCol1 = blX + blPad;
        const actCol2 = blX + blPad + 95;

        // [E] Fortify
        drawKeyBox(actGfx, actCol1, actRow1Y, 14, 14);
        this.add
            .text(actCol1 + 7, actRow1Y + 7, "E", {
                fontFamily: FONT_BODY, fontSize: "8px", color: INK,
            })
            .setOrigin(0.5).setScrollFactor(0).setDepth(101);
        this.add
            .text(actCol1 + 18, actRow1Y + 1, "Fortify", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        // [G] Guerrilla
        drawKeyBox(actGfx, actCol2, actRow1Y, 14, 14);
        this.add
            .text(actCol2 + 7, actRow1Y + 7, "G", {
                fontFamily: FONT_BODY, fontSize: "8px", color: INK,
            })
            .setOrigin(0.5).setScrollFactor(0).setDepth(101);
        this.add
            .text(actCol2 + 18, actRow1Y + 1, "Guerrilla", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        // [R] Build Road
        const actRow2Y = actRow1Y + 20;
        drawKeyBox(actGfx, actCol1, actRow2Y, 14, 14);
        this.add
            .text(actCol1 + 7, actRow2Y + 7, "R", {
                fontFamily: FONT_BODY, fontSize: "8px", color: INK,
            })
            .setOrigin(0.5).setScrollFactor(0).setDepth(101);
        this.add
            .text(actCol1 + 18, actRow2Y + 1, "Build Road", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        // Dbl-click: Scout
        const actRow3Y = actRow2Y + 20;
        this.add
            .text(actCol1, actRow3Y + 1, "Dbl-click:", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_FAINT,
            })
            .setScrollFactor(0).setDepth(100);
        drawMiniDispatch(actGfx, actCol1 + 60, actRow3Y + 6, "scout", 3);
        this.add
            .text(actCol1 + 68, actRow3Y + 1, "Scout", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        // Drag: Gather
        const actRow4Y = actRow3Y + 16;
        this.add
            .text(actCol1, actRow4Y + 1, "Drag:", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_FAINT,
            })
            .setScrollFactor(0).setDepth(100);
        this.add
            .text(actCol1 + 34, actRow4Y + 1, "Gather & dispatch", {
                fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT,
            })
            .setScrollFactor(0).setDepth(100);

        // --- Guerrilla text (above legend panel — transient) ---
        this.guerrillaText = this.add
            .text(12, legendY - 20, "", {
                fontFamily: FONT_BODY,
                fontSize: "12px",
                color: INK,
                stroke: "#e8daba",
                strokeThickness: 2,
            })
            .setScrollFactor(0)
            .setDepth(100);
    }

    update(): void {
        if (!this.gameState) return;

        for (const [fid, text] of this.factionTexts) {
            const state = this.gameState.factions.get(fid);
            if (!state) continue;
            const faction = FACTIONS[fid];
            const status = state.eliminated ? " [ELIM]" : "";
            text.setText(
                `${faction.name}: ${state.nodeCount} cities, ${state.totalTroops} troops${status}`,
            );
        }

        if (this.gameState.gameMode === "short" && GAME_DURATION_S > 0) {
            const remaining = Math.max(0, GAME_DURATION_S - this.gameState.elapsedTime);
            const min = Math.floor(remaining / 60);
            const sec = Math.floor(remaining % 60);
            this.timerText.setText(
                `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`,
            );
        } else {
            const elapsed = this.gameState.elapsedTime;
            const min = Math.floor(elapsed / 60);
            const sec = Math.floor(elapsed % 60);
            this.timerText.setText(
                `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`,
            );
        }

        if (this.humanFaction !== "neutral") {
            const obj = FACTION_OBJECTIVES[this.humanFaction];
            if (obj) {
                this.objectiveText.setText(`Objective: ${obj}`);
            }
        }

        const recentRaids = this.gameState.guerrillaRaids.filter(
            (r) => this.gameState.elapsedTime - r.timestamp < 3,
        );
        if (recentRaids.length > 0) {
            const ambushes = recentRaids.filter(r => r.type === "ambush");
            const drains = recentRaids.filter(r => r.type === "drain");
            const parts: string[] = [];
            if (ambushes.length > 0) {
                const totalKilled = ambushes.reduce((sum, r) => sum + r.troopsLost, 0);
                parts.push(`${totalKilled} ambushed`);
            }
            if (drains.length > 0) {
                parts.push(`${drains.length} drained`);
            }
            this.guerrillaText.setText(`Guerrilla: ${parts.join(", ")}`);
            this.guerrillaText.setAlpha(1);
        } else {
            this.guerrillaText.setAlpha(0);
        }
    }
}
