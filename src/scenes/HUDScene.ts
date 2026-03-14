import Phaser from "phaser";
import { GAME_DURATION_S } from "../config/constants";
import { FACTIONS, type FactionId } from "../data/factions";
import type { GameState } from "../game/state/GameState";
import {
    UI_COLORS,
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

/**
 * HUD overlay scene — parchment-styled panels with ink text
 * and faction color jacks for identification.
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

        // === Backing panels (single Graphics, drawn once) ===
        const panels = this.add.graphics();
        panels.setScrollFactor(0);
        panels.setDepth(99);

        // Scoreboard panel — top-left
        const sbW = 280;
        const sbH = 82;
        panels.fillStyle(UI_COLORS.parchmentDark, 0.88);
        panels.fillRoundedRect(4, 4, sbW, sbH, 4);
        panels.lineStyle(1, UI_COLORS.ink, 0.3);
        panels.strokeRoundedRect(4, 4, sbW, sbH, 4);
        panels.lineStyle(0.5, UI_COLORS.ink, 0.15);
        panels.strokeRoundedRect(7, 7, sbW - 6, sbH - 6, 3);

        // Timer / objective panel — top-right
        const trW = 200;
        const trH = 50;
        const trX = width - trW - 4;
        panels.fillStyle(UI_COLORS.parchmentDark, 0.88);
        panels.fillRoundedRect(trX, 4, trW, trH, 4);
        panels.lineStyle(1, UI_COLORS.ink, 0.3);
        panels.strokeRoundedRect(trX, 4, trW, trH, 4);
        panels.lineStyle(0.5, UI_COLORS.ink, 0.15);
        panels.strokeRoundedRect(trX + 3, 7, trW - 6, trH - 6, 3);

        // Controls legend panel — bottom-right
        const clW = 290;
        const clH = 150;
        const clX = width - clW - 4;
        const clY = this.scale.height - clH - 4;
        panels.fillStyle(UI_COLORS.parchmentDark, 0.88);
        panels.fillRoundedRect(clX, clY, clW, clH, 4);
        panels.lineStyle(1, UI_COLORS.ink, 0.3);
        panels.strokeRoundedRect(clX, clY, clW, clH, 4);
        panels.lineStyle(0.5, UI_COLORS.ink, 0.15);
        panels.strokeRoundedRect(clX + 3, clY + 3, clW - 6, clH - 6, 3);

        // "CONTROLS" header
        this.add
            .text(width - clW / 2 - 4, clY + 6, "CONTROLS", {
                fontFamily: FONT_HEADING,
                fontSize: "9px",
                color: INK_FAINT,
                letterSpacing: 3,
            })
            .setOrigin(0.5, 0)
            .setScrollFactor(0)
            .setDepth(100);

        // Faction scoreboard with jacks
        const factionIds: FactionId[] = ["french", "british", "spanish"];
        let y = 14;
        for (const fid of factionIds) {
            // Draw faction jack
            drawFactionJack(panels, 12, y + 2, fid, 10, 10);

            const text = this.add
                .text(28, y, "", {
                    fontFamily: FONT_BODY,
                    fontSize: "13px",
                    color: INK,
                })
                .setScrollFactor(0)
                .setDepth(100);
            this.factionTexts.set(fid, text);
            y += 22;
        }

        // Timer at top-right
        this.timerText = this.add
            .text(width - 12, 12, "", {
                fontFamily: FONT_HEADING,
                fontSize: "16px",
                color: INK,
            })
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(100);

        // Objective text below timer
        this.objectiveText = this.add
            .text(width - 12, 32, "", {
                fontFamily: FONT_BODY,
                fontSize: "10px",
                color: INK_LIGHT,
            })
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(100);

        // Guerrilla activity indicator at bottom-left
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

        // Key guide at bottom-right (inside controls panel)
        const keyLines = [
            "Click: Select / Dispatch troops",
            "Drag through nodes: Gather & dispatch",
            "Dbl-click neighbor: Send scout",
            "E: Fortify selected node",
            "G: Deploy guerrilla (Spanish)",
            "R: Build road (2-hop shortcut)",
            "Right-drag: Pan  |  Wheel: Zoom",
        ];
        this.add
            .text(width - 12, this.scale.height - 12, keyLines.join("\n"), {
                fontFamily: FONT_BODY,
                fontSize: "12px",
                color: INK_LIGHT,
                lineSpacing: 3,
                align: "right",
            })
            .setOrigin(1, 1)
            .setScrollFactor(0)
            .setDepth(100);
    }

    update(): void {
        if (!this.gameState) return;

        // Update faction stats
        for (const [fid, text] of this.factionTexts) {
            const state = this.gameState.factions.get(fid);
            if (!state) continue;
            const faction = FACTIONS[fid];
            const status = state.eliminated ? " [ELIMINATED]" : "";
            text.setText(
                `${faction.name}: ${state.nodeCount} cities, ${state.totalTroops} troops${status}`,
            );
        }

        // Update timer based on game mode
        if (this.gameState.gameMode === "short" && GAME_DURATION_S > 0) {
            const remaining = Math.max(
                0,
                GAME_DURATION_S - this.gameState.elapsedTime,
            );
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

        // Update objective text for human faction
        if (this.humanFaction !== "neutral") {
            const obj = FACTION_OBJECTIVES[this.humanFaction];
            if (obj) {
                this.objectiveText.setText(`Objective: ${obj}`);
            }
        }

        // Update guerrilla activity
        const recentRaids = this.gameState.guerrillaRaids.filter(
            (r) => this.gameState.elapsedTime - r.timestamp < 3,
        );
        if (recentRaids.length > 0) {
            const ambushes = recentRaids.filter(r => r.type === "ambush");
            const drains = recentRaids.filter(r => r.type === "drain");
            const parts: string[] = [];
            if (ambushes.length > 0) {
                const totalKilled = ambushes.reduce((sum, r) => sum + r.troopsLost, 0);
                parts.push(`${totalKilled} troops ambushed`);
            }
            if (drains.length > 0) {
                parts.push(`${drains.length} nodes drained`);
            }
            this.guerrillaText.setText(`Guerrilla: ${parts.join(", ")}`);
            this.guerrillaText.setAlpha(1);
        } else {
            this.guerrillaText.setAlpha(0);
        }
    }
}
