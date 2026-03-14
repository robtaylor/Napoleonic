import Phaser from "phaser";
import { GAME_DURATION_S } from "../config/constants";
import { FACTIONS, type FactionId } from "../data/factions";
import type { GameState } from "../game/state/GameState";
import {
    drawHUDPanel,
    drawFactionJack,
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

        // --- Guerrilla text (bottom-left, no panel — transient) ---
        this.guerrillaText = this.add
            .text(12, this.scale.height - 24, "", {
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
