import Phaser from "phaser";
import { FACTIONS, type FactionId } from "../data/factions";
import type { VictoryReason } from "../game/systems/VictorySystem";
import {
    drawParchmentPanel,
    drawHorizontalRule,
    drawCornerOrnaments,
} from "../ui/PeriodUI";

const FONT_TITLE = "'Cinzel Decorative', Georgia, serif";
const FONT_HEADING = "'Cinzel', Georgia, serif";
const FONT_BODY = "'Cinzel', Georgia, serif";

interface VictoryData {
    winner: FactionId;
    reason: VictoryReason;
}

const VICTORY_TEXT: Record<VictoryReason, Record<FactionId, string>> = {
    elimination: {
        french: "The Grand Arm\u00e9e has swept all opposition from Iberia!",
        british: "Wellington's forces stand alone \u2014 all enemies vanquished!",
        spanish: "Viva Espa\u00f1a! The invaders have been driven from our soil!",
        neutral: "",
    },
    domination: {
        french: "France dominates the peninsula \u2014 resistance is futile.",
        british: "Britannia rules \u2014 the peninsula is liberated!",
        spanish: "Spain is free! Every city flies our banner!",
        neutral: "",
    },
    french_hold: {
        french: "Napoleon's grip on Iberia is absolute. 20 cities held for a full minute \u2014 unshakeable!",
        british: "",
        spanish: "",
        neutral: "",
    },
    british_expel: {
        french: "",
        british: "The French position has become untenable. Wellington's strategy of attrition succeeds!",
        spanish: "",
        neutral: "",
    },
    spanish_endure: {
        french: "",
        british: "",
        spanish: "Three years of guerrilla warfare pay off. Spain endures \u2014 the French cannot!",
        neutral: "",
    },
    timeout: {
        french: "Time expired \u2014 France holds the most territory on the peninsula.",
        british: "Time expired \u2014 the British-Portuguese alliance controls the most cities.",
        spanish: "Time expired \u2014 Spanish resilience holds the most ground.",
        neutral: "",
    },
};

export class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: "VictoryScene" });
    }

    create(data: VictoryData): void {
        const { width, height } = this.scale;
        const cx = width / 2;
        const faction = FACTIONS[data.winner];

        // Semi-transparent backdrop
        this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.7);

        // Decorative graphics (drawn once)
        const gfx = this.add.graphics();

        // Central parchment panel
        const panelW = 520;
        const panelH = 280;
        const panelX = cx - panelW / 2;
        const panelY = height / 2 - panelH / 2 - 20;
        drawParchmentPanel(gfx, panelX, panelY, panelW, panelH, 0.9);
        drawCornerOrnaments(gfx, panelX, panelY, panelW, panelH, 16);

        // Horizontal rule above VICTORY text
        drawHorizontalRule(gfx, cx, panelY + 30, panelW - 80, true);

        this.add
            .text(cx, panelY + 60, "VICTORY", {
                fontFamily: FONT_TITLE,
                fontSize: "56px",
                color: faction.textColor,
                stroke: "#3d2b1f",
                strokeThickness: 3,
            })
            .setOrigin(0.5);

        // Horizontal rule below VICTORY text
        drawHorizontalRule(gfx, cx, panelY + 100, panelW - 80, true);

        this.add
            .text(cx, panelY + 130, `${faction.name} wins!`, {
                fontFamily: FONT_HEADING,
                fontSize: "28px",
                color: "#5a4a32",
            })
            .setOrigin(0.5);

        const reasonText = VICTORY_TEXT[data.reason]?.[data.winner] || "Victory achieved!";

        this.add
            .text(cx, panelY + 170, reasonText, {
                fontFamily: FONT_BODY,
                fontSize: "16px",
                color: "#5a4a32",
                wordWrap: { width: panelW - 60 },
                align: "center",
            })
            .setOrigin(0.5);

        // Play again button with parchment panel
        const btnY = panelY + panelH + 20;
        const btnPanelW = 240;
        const btnPanelH = 50;
        drawParchmentPanel(gfx, cx - btnPanelW / 2, btnY, btnPanelW, btnPanelH, 0.85);
        drawCornerOrnaments(gfx, cx - btnPanelW / 2, btnY, btnPanelW, btnPanelH, 10);

        const btn = this.add
            .text(cx, btnY + btnPanelH / 2, "Play Again", {
                fontFamily: FONT_HEADING,
                fontSize: "28px",
                color: "#3d2b1f",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        btn.on("pointerover", () => {
            btn.setColor("#ddaa22");
            this.tweens.add({
                targets: btn,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 120,
                ease: "Sine.easeOut",
            });
        });
        btn.on("pointerout", () => {
            btn.setColor("#3d2b1f");
            this.tweens.add({
                targets: btn,
                scaleX: 1,
                scaleY: 1,
                duration: 120,
                ease: "Sine.easeOut",
            });
        });
        btn.on("pointerdown", () => {
            this.scene.start("MenuScene");
        });
    }
}
