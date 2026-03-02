import Phaser from "phaser";
import { GAME_DURATION_S } from "../config/constants";
import { FACTIONS, type FactionId } from "../data/factions";
import type { GameState } from "../game/state/GameState";

const FACTION_OBJECTIVES: Record<Exclude<FactionId, "neutral">, string> = {
    french: "Hold 20+ cities for 60s",
    british: "Reduce France to 5 or fewer cities",
    spanish: "After 3 min: match or exceed French cities",
};

/**
 * HUD overlay scene - displays faction scores, game timer, objectives,
 * and guerrilla activity.
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

        // Faction scoreboard at top-left
        const factionIds: FactionId[] = ["french", "british", "spanish"];
        let y = 12;
        for (const fid of factionIds) {
            const faction = FACTIONS[fid];
            const text = this.add
                .text(12, y, "", {
                    fontFamily: "Georgia, serif",
                    fontSize: "14px",
                    color: faction.textColor,
                    stroke: "#000000",
                    strokeThickness: 2,
                })
                .setScrollFactor(0)
                .setDepth(100);
            this.factionTexts.set(fid, text);
            y += 22;
        }

        // Timer at top-right
        this.timerText = this.add
            .text(width - 12, 12, "", {
                fontFamily: "Georgia, serif",
                fontSize: "16px",
                color: "#d4c5a0",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(100);

        // Objective text below timer
        this.objectiveText = this.add
            .text(width - 12, 34, "", {
                fontFamily: "Georgia, serif",
                fontSize: "11px",
                color: "#a0956a",
                stroke: "#000000",
                strokeThickness: 1,
            })
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(100);

        // Guerrilla activity indicator at bottom-left
        this.guerrillaText = this.add
            .text(12, this.scale.height - 24, "", {
                fontFamily: "Georgia, serif",
                fontSize: "12px",
                color: "#ddaa22",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setScrollFactor(0)
            .setDepth(100);

        // Key guide at bottom-right
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
                fontFamily: "Georgia, serif",
                fontSize: "13px",
                color: "#a0956a",
                stroke: "#000000",
                strokeThickness: 2,
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
            // Long mode: show elapsed time (up-counter)
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
