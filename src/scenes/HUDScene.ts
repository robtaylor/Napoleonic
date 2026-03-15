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
    drawActionButton,
    drawDPadArrow,
    INK,
    INK_LIGHT,
    INK_FAINT,
    FONT_HEADING,
    FONT_BODY,
} from "../ui/PeriodUI";
import { isTouchDevice } from "../utils/platform";

const FACTION_OBJECTIVES: Record<Exclude<FactionId, "neutral">, string> = {
    french: "Hold 20+ cities for 60s",
    british: "Reduce France to 5 or fewer cities",
    spanish: "After 3 min: match or exceed French cities",
};

/** Padding inside HUD panels */
const PAD = 8;

/** Collapsed header height */
const HEADER_H = 22;

/**
 * HUD overlay scene — parchment-styled panels with ink text
 * and faction color jacks for identification.
 *
 * On touch devices: panels are collapsible, desktop controls legend
 * is replaced with d-pad + tappable action buttons.
 */
export class HUDScene extends Phaser.Scene {
    private gameState!: GameState;
    private factionTexts: Map<FactionId, Phaser.GameObjects.Text> = new Map();
    private timerText!: Phaser.GameObjects.Text;
    private objectiveText!: Phaser.GameObjects.Text;
    private guerrillaText!: Phaser.GameObjects.Text;
    private humanFaction: FactionId = "british";

    // Collapsible panel state (mobile only)
    private isTouch = false;
    private collapsed: Map<string, boolean> = new Map();
    private panelContent: Map<string, Phaser.GameObjects.GameObject[]> = new Map();
    private panelGfx: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private panelHeaders: Map<string, Phaser.GameObjects.Text> = new Map();

    // Compact scoreboard texts shown when collapsed (mobile)
    private compactFactionTexts: Map<FactionId, Phaser.GameObjects.Text> = new Map();

    // Panel dimensions for repositioning
    private legendFullH = 140;
    private actionsFullH = 104;
    private scoreboardFullH = 0;

    constructor() {
        super({ key: "HUDScene" });
    }

    init(data: { gameState: GameState; humanFaction?: FactionId }): void {
        this.gameState = data.gameState;
        this.humanFaction = data.humanFaction ?? "british";
    }

    create(): void {
        this.isTouch = isTouchDevice();

        // Clear previous state
        this.collapsed.clear();
        this.panelContent.clear();
        this.panelGfx.clear();
        this.panelHeaders.clear();
        this.compactFactionTexts.clear();
        this.factionTexts.clear();

        // Default collapsed state on mobile
        if (this.isTouch) {
            this.collapsed.set("legend", true);
            this.collapsed.set("actions", true);
            this.collapsed.set("scoreboard", false);
        }

        this.createScoreboard();
        this.createTimer();

        if (this.isTouch) {
            this.createMobileControls();
        } else {
            this.createDesktopControls();
        }

        this.createBottomLeftPanels();
        this.createGuerrillaText();
    }

    // =========================================================
    // Scoreboard (top-left)
    // =========================================================
    private createScoreboard(): void {
        const jackW = 10;
        const jackGap = 6;
        const textX = PAD + jackW + jackGap;
        const factionIds: FactionId[] = ["french", "british", "spanish"];
        let sbMaxW = 0;
        let y = PAD;

        const content: Phaser.GameObjects.GameObject[] = [];

        for (const fid of factionIds) {
            const text = this.add
                .text(textX, y, "", {
                    fontFamily: FONT_BODY,
                    fontSize: "12px",
                    color: INK,
                })
                .setScrollFactor(0)
                .setDepth(100);

            text.setText("British-Portuguese: 25 cities, 999 troops");
            sbMaxW = Math.max(sbMaxW, text.width);
            text.setText("");

            this.factionTexts.set(fid, text);
            content.push(text);
            y += 20;
        }

        const sbW = textX + sbMaxW + PAD;
        const sbH = y + PAD - 4;
        this.scoreboardFullH = sbH;

        // Panel graphics
        const gfx = this.add.graphics().setScrollFactor(0).setDepth(99);
        drawHUDPanel(gfx, 4, 4, sbW, sbH, 0.88, 0, "horizontal");

        let jackY = PAD + 3;
        for (const fid of factionIds) {
            drawFactionJack(gfx, PAD, jackY, fid, jackW, 8);
            jackY += 20;
        }

        this.panelGfx.set("scoreboard", gfx);
        this.panelContent.set("scoreboard", content);

        // Mobile: compact texts + collapsible header
        if (this.isTouch) {
            // Compact faction texts (shown when collapsed): just jack + city count
            const compactY = PAD;
            for (const fid of factionIds) {
                const ct = this.add
                    .text(textX, compactY + factionIds.indexOf(fid) * 14, "", {
                        fontFamily: FONT_BODY,
                        fontSize: "10px",
                        color: INK,
                    })
                    .setScrollFactor(0)
                    .setDepth(100)
                    .setVisible(false);
                this.compactFactionTexts.set(fid, ct);
            }

            // Tap zone over the panel for toggling
            const compactH = PAD * 2 + factionIds.length * 14;
            const tapZone = this.add
                .rectangle(4, 4, sbW, sbH, 0x000000, 0)
                .setOrigin(0)
                .setScrollFactor(0)
                .setDepth(102)
                .setInteractive({ useHandCursor: true });
            tapZone.on("pointerdown", () => this.togglePanel("scoreboard", sbW, sbH, compactH));
        }
    }

    // =========================================================
    // Timer + Objective (top-right)
    // =========================================================
    private createTimer(): void {
        const { width } = this.scale;

        this.timerText = this.add
            .text(0, 0, "", { fontFamily: FONT_HEADING, fontSize: "15px", color: INK })
            .setScrollFactor(0)
            .setDepth(100);

        this.objectiveText = this.add
            .text(0, 0, "", { fontFamily: FONT_BODY, fontSize: "10px", color: INK_LIGHT })
            .setScrollFactor(0)
            .setDepth(100);

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

        this.timerText.setPosition(trX + PAD, 4 + PAD);
        this.objectiveText.setPosition(trX + PAD, 4 + PAD + 20);

        const gfx = this.add.graphics().setScrollFactor(0).setDepth(99);
        drawHUDPanel(gfx, trX, 4, trW, trH, 0.88, 0, "horizontal");
    }

    // =========================================================
    // Desktop Controls Legend (bottom-right)
    // =========================================================
    private createDesktopControls(): void {
        const { width } = this.scale;
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

        const gfx = this.add.graphics().setScrollFactor(0).setDepth(99);
        drawHUDPanel(gfx, clX, clY, clW, clH, 0.88, 0, "horizontal");
    }

    // =========================================================
    // Mobile Controls: D-Pad + Action Buttons (bottom-right)
    // =========================================================
    private createMobileControls(): void {
        const { width, height } = this.scale;
        const gameScene = this.scene.get("GameScene");

        // D-pad layout (bottom-right)
        const dpadR = 20; // button radius
        const dpadGap = 6;
        const dpadCX = width - 60;
        const dpadCY = height - 70;

        const dpadGfx = this.add.graphics().setScrollFactor(0).setDepth(100);

        // Directions: [dx, dy, direction_index]
        const dirs: [number, number, number, string][] = [
            [0, -(dpadR * 2 + dpadGap), 0, "up"],       // up
            [dpadR * 2 + dpadGap, 0, 1, "right"],        // right
            [0, dpadR * 2 + dpadGap, 2, "down"],         // down
            [-(dpadR * 2 + dpadGap), 0, 3, "left"],      // left
        ];

        for (const [dx, dy, dirIdx, _name] of dirs) {
            const bx = dpadCX + dx;
            const by = dpadCY + dy;
            drawDPadArrow(dpadGfx, bx, by, dirIdx, dpadR);

            // Interactive zone
            const zone = this.add
                .circle(bx, by, dpadR, 0x000000, 0)
                .setScrollFactor(0)
                .setDepth(101)
                .setInteractive({ useHandCursor: true });

            // Pan direction vectors
            const panDirs: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
            const [pdx, pdy] = panDirs[dirIdx]!;

            zone.on("pointerdown", () => {
                gameScene.events.emit("mobile:pan", pdx, pdy);
            });
            zone.on("pointerup", () => {
                gameScene.events.emit("mobile:pan", 0, 0);
            });
            zone.on("pointerout", () => {
                gameScene.events.emit("mobile:pan", 0, 0);
            });
        }

        // Action buttons (row above d-pad)
        const actionY = dpadCY - dpadR * 2 - dpadGap - 50;
        const actionR = 22;
        const actionGap = 12;
        const actions: [string, string][] = [
            ["E", "fortify"],
            ["G", "guerrilla"],
            ["R", "road"],
        ];
        const totalActionsW = actions.length * actionR * 2 + (actions.length - 1) * actionGap;
        const actionStartX = dpadCX - totalActionsW / 2 + actionR;

        const actionGfx = this.add.graphics().setScrollFactor(0).setDepth(100);

        // Icon graphics layer (drawn on top of buttons)
        const iconGfx = this.add.graphics().setScrollFactor(0).setDepth(101);

        for (let i = 0; i < actions.length; i++) {
            const [, action] = actions[i]!;
            const ax = actionStartX + i * (actionR * 2 + actionGap);

            drawActionButton(actionGfx, ax, actionY, actionR);

            // Draw contextual icon inside each button
            if (action === "fortify") {
                // Fortress icon (mini crenellated square)
                drawMiniNode(iconGfx, ax, actionY, "fortress", 8);
            } else if (action === "guerrilla") {
                // Guerrilla "G" in gold with dark stroke (matches in-game)
                this.add
                    .text(ax, actionY, "G", {
                        fontFamily: FONT_HEADING,
                        fontSize: "16px",
                        color: "#ddaa22",
                        stroke: "#000000",
                        strokeThickness: 2,
                    })
                    .setOrigin(0.5)
                    .setScrollFactor(0)
                    .setDepth(101);
            } else {
                // Road icon (mini edge line)
                drawMiniEdge(iconGfx, ax - 8, actionY, ax + 8, actionY, "solid");
            }

            // Small label below
            const labelText = action === "fortify" ? "Fortify" : action === "guerrilla" ? "Guerrilla" : "Road";
            this.add
                .text(ax, actionY + actionR + 6, labelText, {
                    fontFamily: FONT_BODY,
                    fontSize: "8px",
                    color: INK_FAINT,
                })
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(100);

            // Interactive zone
            const zone = this.add
                .circle(ax, actionY, actionR, 0x000000, 0)
                .setScrollFactor(0)
                .setDepth(102)
                .setInteractive({ useHandCursor: true });

            zone.on("pointerdown", () => {
                gameScene.events.emit("mobile:action", action);
            });
        }
    }

    // =========================================================
    // Bottom-Left Panels: Map Legend + Actions
    // =========================================================
    private createBottomLeftPanels(): void {
        const blX = 4;
        const blW = 190;
        const blPad = 8;
        const legendH = this.legendFullH;
        const actionsH = this.actionsFullH;
        const blGap = 4;

        const legendY = this.scale.height - legendH - blGap - actionsH - 4;
        const actionsY = legendY + legendH + blGap;

        this.createLegendPanel(blX, legendY, blW, legendH, blPad);
        this.createActionsPanel(blX, actionsY, blW, actionsH, blPad);
    }

    private createLegendPanel(
        blX: number, legendY: number, blW: number, legendH: number, blPad: number,
    ): void {
        const isCollapsed = this.collapsed.get("legend") ?? false;
        const displayH = isCollapsed ? HEADER_H : legendH;

        // Panel background
        const panelGfx = this.add.graphics().setScrollFactor(0).setDepth(99);
        drawHUDPanel(panelGfx, blX, legendY, blW, displayH, 0.88, 777, "horizontal");
        this.panelGfx.set("legend", panelGfx);

        // Header with chevron
        const chevron = isCollapsed ? "\u25B8" : "\u25BE";
        const header = this.add
            .text(blX + blPad, legendY + blPad - 2, `MAP KEY ${chevron}`, {
                fontFamily: FONT_HEADING,
                fontSize: "9px",
                color: INK_FAINT,
                letterSpacing: 3,
            })
            .setScrollFactor(0)
            .setDepth(100);
        this.panelHeaders.set("legend", header);

        // Content objects
        const content: Phaser.GameObjects.GameObject[] = [];
        const legendGfx = this.add.graphics().setScrollFactor(0).setDepth(100);
        content.push(legendGfx);

        const row1Y = legendY + blPad + 14;
        const col1X = blX + blPad;
        const col2X = blX + blPad + 95;
        const rowH = 16;

        // Capital + Fortress
        drawMiniNode(legendGfx, col1X + 5, row1Y + 5, "capital", 5);
        content.push(this.add
            .text(col1X + 14, row1Y, "Capital", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        drawMiniNode(legendGfx, col2X + 5, row1Y + 5, "fortress", 5);
        content.push(this.add
            .text(col2X + 14, row1Y, "Fortress", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        // Port + City
        const row2Y = row1Y + rowH;
        drawMiniNode(legendGfx, col1X + 5, row2Y + 5, "port", 5);
        content.push(this.add
            .text(col1X + 14, row2Y, "Port", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        drawMiniNode(legendGfx, col2X + 5, row2Y + 5, "city", 5);
        content.push(this.add
            .text(col2X + 14, row2Y, "City", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        // Divider 1
        const div1Y = row2Y + rowH + 2;
        legendGfx.lineStyle(0.5, 0x8b7d5e, 0.3);
        legendGfx.beginPath();
        legendGfx.moveTo(col1X, div1Y);
        legendGfx.lineTo(blX + blW - blPad, div1Y);
        legendGfx.strokePath();

        // Row 3: Dispatch types
        const row3Y = div1Y + 5;
        const dCol1 = col1X;
        const dCol2 = col1X + 58;
        const dCol3 = col1X + 116;

        drawMiniDispatch(legendGfx, dCol1 + 4, row3Y + 5, "troops", 4);
        content.push(this.add
            .text(dCol1 + 12, row3Y, "Troop", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        drawMiniDispatch(legendGfx, dCol2 + 4, row3Y + 5, "scout", 4);
        content.push(this.add
            .text(dCol2 + 12, row3Y, "Scout", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        drawMiniDispatch(legendGfx, dCol3 + 4, row3Y + 5, "engineer", 3);
        content.push(this.add
            .text(dCol3 + 11, row3Y, "Engr", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        // Divider 2
        const div2Y = row3Y + rowH + 2;
        legendGfx.lineStyle(0.5, 0x8b7d5e, 0.3);
        legendGfx.beginPath();
        legendGfx.moveTo(col1X, div2Y);
        legendGfx.lineTo(blX + blW - blPad, div2Y);
        legendGfx.strokePath();

        // Row 4: Edge styles
        const row4Y = div2Y + 5;
        drawMiniEdge(legendGfx, col1X, row4Y + 5, col1X + 22, row4Y + 5, "solid");
        content.push(this.add
            .text(col1X + 26, row4Y, "Road", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        drawMiniEdge(legendGfx, col2X, row4Y + 5, col2X + 22, row4Y + 5, "dashed");
        content.push(this.add
            .text(col2X + 26, row4Y, "Building", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        // Divider 3
        const div3Y = row4Y + rowH + 2;
        legendGfx.lineStyle(0.5, 0x8b7d5e, 0.3);
        legendGfx.beginPath();
        legendGfx.moveTo(col1X, div3Y);
        legendGfx.lineTo(blX + blW - blPad, div3Y);
        legendGfx.strokePath();

        // Row 5: Overlays + supply
        const row5Y = div3Y + 5;
        content.push(this.add
            .text(col1X, row5Y, "W", {
                fontFamily: FONT_BODY, fontSize: "9px", color: "#ffffff",
                stroke: "#000000", strokeThickness: 2,
            })
            .setScrollFactor(0).setDepth(100));
        content.push(this.add
            .text(col1X + 12, row5Y, "Fort", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        content.push(this.add
            .text(col1X + 44, row5Y, "G", {
                fontFamily: FONT_BODY, fontSize: "9px", color: "#ddaa22",
                stroke: "#000000", strokeThickness: 2,
            })
            .setScrollFactor(0).setDepth(100));
        content.push(this.add
            .text(col1X + 56, row5Y, "Guerr", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        drawMiniSupplyArc(legendGfx, col2X + 6, row5Y + 5, 5);
        content.push(this.add
            .text(col2X + 16, row5Y, "Supply", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        this.panelContent.set("legend", content);

        // Apply initial collapsed state
        if (isCollapsed) {
            for (const obj of content) {
                if (obj instanceof Phaser.GameObjects.Text) obj.setVisible(false);
                else if (obj instanceof Phaser.GameObjects.Graphics) obj.setVisible(false);
            }
        }

        // Mobile tap zone for collapsing
        if (this.isTouch) {
            const tapZone = this.add
                .rectangle(blX, legendY, blW, HEADER_H, 0x000000, 0)
                .setOrigin(0)
                .setScrollFactor(0)
                .setDepth(102)
                .setInteractive({ useHandCursor: true });
            tapZone.on("pointerdown", () => this.togglePanel("legend", blW, legendH, HEADER_H, blX, legendY, 777));
        }
    }

    private createActionsPanel(
        blX: number, actionsY: number, blW: number, actionsH: number, blPad: number,
    ): void {
        const isCollapsed = this.collapsed.get("actions") ?? false;
        const displayH = isCollapsed ? HEADER_H : actionsH;

        const panelGfx = this.add.graphics().setScrollFactor(0).setDepth(99);
        drawHUDPanel(panelGfx, blX, actionsY, blW, displayH, 0.88, 888, "horizontal");
        this.panelGfx.set("actions", panelGfx);

        const chevron = isCollapsed ? "\u25B8" : "\u25BE";
        const header = this.add
            .text(blX + blPad, actionsY + blPad - 2, `ACTIONS ${chevron}`, {
                fontFamily: FONT_HEADING,
                fontSize: "9px",
                color: INK_FAINT,
                letterSpacing: 3,
            })
            .setScrollFactor(0)
            .setDepth(100);
        this.panelHeaders.set("actions", header);

        const content: Phaser.GameObjects.GameObject[] = [];
        const actGfx = this.add.graphics().setScrollFactor(0).setDepth(100);
        content.push(actGfx);

        const actRow1Y = actionsY + blPad + 14;
        const actCol1 = blX + blPad;
        const actCol2 = blX + blPad + 95;

        // [E] Fortify
        drawKeyBox(actGfx, actCol1, actRow1Y, 14, 14);
        content.push(this.add
            .text(actCol1 + 7, actRow1Y + 7, "E", { fontFamily: FONT_BODY, fontSize: "8px", color: INK })
            .setOrigin(0.5).setScrollFactor(0).setDepth(101));
        content.push(this.add
            .text(actCol1 + 18, actRow1Y + 1, "Fortify", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        // [G] Guerrilla
        drawKeyBox(actGfx, actCol2, actRow1Y, 14, 14);
        content.push(this.add
            .text(actCol2 + 7, actRow1Y + 7, "G", { fontFamily: FONT_BODY, fontSize: "8px", color: INK })
            .setOrigin(0.5).setScrollFactor(0).setDepth(101));
        content.push(this.add
            .text(actCol2 + 18, actRow1Y + 1, "Guerrilla", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        // [R] Build Road
        const actRow2Y = actRow1Y + 20;
        drawKeyBox(actGfx, actCol1, actRow2Y, 14, 14);
        content.push(this.add
            .text(actCol1 + 7, actRow2Y + 7, "R", { fontFamily: FONT_BODY, fontSize: "8px", color: INK })
            .setOrigin(0.5).setScrollFactor(0).setDepth(101));
        content.push(this.add
            .text(actCol1 + 18, actRow2Y + 1, "Build Road", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        // Dbl-click: Scout
        const actRow3Y = actRow2Y + 20;
        content.push(this.add
            .text(actCol1, actRow3Y + 1, "Dbl-click:", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_FAINT })
            .setScrollFactor(0).setDepth(100));
        drawMiniDispatch(actGfx, actCol1 + 60, actRow3Y + 6, "scout", 3);
        content.push(this.add
            .text(actCol1 + 68, actRow3Y + 1, "Scout", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        // Drag: Gather
        const actRow4Y = actRow3Y + 16;
        content.push(this.add
            .text(actCol1, actRow4Y + 1, "Drag:", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_FAINT })
            .setScrollFactor(0).setDepth(100));
        content.push(this.add
            .text(actCol1 + 34, actRow4Y + 1, "Gather & dispatch", { fontFamily: FONT_BODY, fontSize: "9px", color: INK_LIGHT })
            .setScrollFactor(0).setDepth(100));

        this.panelContent.set("actions", content);

        // Apply initial collapsed state
        if (isCollapsed) {
            for (const obj of content) {
                if (obj instanceof Phaser.GameObjects.Text) obj.setVisible(false);
                else if (obj instanceof Phaser.GameObjects.Graphics) obj.setVisible(false);
            }
        }

        // Mobile tap zone
        if (this.isTouch) {
            const tapZone = this.add
                .rectangle(blX, actionsY, blW, HEADER_H, 0x000000, 0)
                .setOrigin(0)
                .setScrollFactor(0)
                .setDepth(102)
                .setInteractive({ useHandCursor: true });
            tapZone.on("pointerdown", () => this.togglePanel("actions", blW, actionsH, HEADER_H, blX, actionsY, 888));
        }
    }

    // =========================================================
    // Guerrilla Text (above legend panel)
    // =========================================================
    private createGuerrillaText(): void {
        const legendH = this.legendFullH;
        const actionsH = this.actionsFullH;
        const blGap = 4;
        const legendY = this.scale.height - legendH - blGap - actionsH - 4;

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

    // =========================================================
    // Toggle collapsible panel (mobile)
    // =========================================================
    private togglePanel(
        name: string,
        panelW: number,
        fullH: number,
        collapsedH: number,
        panelX?: number,
        panelY?: number,
        seed?: number,
    ): void {
        const isCollapsed = this.collapsed.get(name) ?? false;
        const newCollapsed = !isCollapsed;
        this.collapsed.set(name, newCollapsed);

        const content = this.panelContent.get(name);
        if (content) {
            for (const obj of content) {
                if (obj instanceof Phaser.GameObjects.Text) obj.setVisible(!newCollapsed);
                else if (obj instanceof Phaser.GameObjects.Graphics) obj.setVisible(!newCollapsed);
            }
        }

        // Redraw panel background at new size
        const gfx = this.panelGfx.get(name);
        if (gfx && panelX !== undefined && panelY !== undefined) {
            gfx.clear();
            const h = newCollapsed ? collapsedH : fullH;
            drawHUDPanel(gfx, panelX, panelY, panelW, h, 0.88, seed ?? 0, "horizontal");
        }

        // Scoreboard special case: show/hide compact texts
        if (name === "scoreboard") {
            const sbGfx = this.panelGfx.get("scoreboard");
            if (sbGfx) {
                sbGfx.clear();
                const jackW = 10;
                const textX = PAD + jackW + 6;
                const sbW = textX + 200 + PAD; // approximation
                const factionIds: FactionId[] = ["french", "british", "spanish"];
                const compactH = PAD * 2 + factionIds.length * 14;
                const h = newCollapsed ? compactH : this.scoreboardFullH;
                drawHUDPanel(sbGfx, 4, 4, sbW, h, 0.88, 0, "horizontal");

                // Jacks — draw for both states
                let jackY = newCollapsed ? PAD + 2 : PAD + 3;
                const jackRowH = newCollapsed ? 14 : 20;
                for (const fid of factionIds) {
                    drawFactionJack(sbGfx, PAD, jackY, fid, jackW, newCollapsed ? 6 : 8);
                    jackY += jackRowH;
                }
            }

            // Toggle full vs compact texts
            for (const [, text] of this.factionTexts) {
                text.setVisible(!newCollapsed);
            }
            for (const [, text] of this.compactFactionTexts) {
                text.setVisible(newCollapsed);
            }
        }

        // Update header chevron
        const header = this.panelHeaders.get(name);
        if (header) {
            const chevron = newCollapsed ? "\u25B8" : "\u25BE";
            const baseName = name === "legend" ? "MAP KEY" : name === "actions" ? "ACTIONS" : "";
            if (baseName) {
                header.setText(`${baseName} ${chevron}`);
            }
        }
    }

    // =========================================================
    // Update loop
    // =========================================================
    update(): void {
        if (!this.gameState) return;

        const sbCollapsed = this.collapsed.get("scoreboard") ?? false;

        for (const [fid, text] of this.factionTexts) {
            const state = this.gameState.factions.get(fid);
            if (!state) continue;
            const faction = FACTIONS[fid];
            const status = state.eliminated ? " [ELIM]" : "";
            text.setText(
                `${faction.name}: ${state.nodeCount} cities, ${state.totalTroops} troops${status}`,
            );
        }

        // Compact scoreboard texts (mobile collapsed)
        if (this.isTouch) {
            for (const [fid, text] of this.compactFactionTexts) {
                const state = this.gameState.factions.get(fid);
                if (!state) continue;
                text.setText(`${state.nodeCount}`);
                text.setVisible(sbCollapsed);
            }
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
