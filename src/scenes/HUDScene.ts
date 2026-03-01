import Phaser from "phaser";
import { GAME_DURATION_S } from "../config/constants";
import { FACTIONS, type FactionId } from "../data/factions";
import type { GameState } from "../game/state/GameState";

/**
 * HUD overlay scene - displays faction scores and game timer.
 * Runs on top of GameScene.
 */
export class HUDScene extends Phaser.Scene {
    private gameState!: GameState;
    private factionTexts: Map<FactionId, Phaser.GameObjects.Text> = new Map();
    private timerText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: "HUDScene" });
    }

    init(data: { gameState: GameState }): void {
        this.gameState = data.gameState;
    }

    create(): void {
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
            .text(this.scale.width - 12, 12, "", {
                fontFamily: "Georgia, serif",
                fontSize: "16px",
                color: "#d4c5a0",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(1, 0)
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

        // Update timer
        if (GAME_DURATION_S > 0) {
            const remaining = Math.max(
                0,
                GAME_DURATION_S - this.gameState.elapsedTime,
            );
            const min = Math.floor(remaining / 60);
            const sec = Math.floor(remaining % 60);
            this.timerText.setText(
                `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`,
            );
        }
    }
}
