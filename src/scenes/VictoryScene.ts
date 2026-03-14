import Phaser from "phaser";
import { FACTIONS, type FactionId } from "../data/factions";
import type { VictoryReason } from "../game/systems/VictorySystem";
import {
    drawParchmentPanel,
    drawHorizontalRule,
    drawDoubleRuleBox,
    drawCornerOrnaments,
    drawFactionJack,
    INK,
    INK_LIGHT,
    INK_FAINT,
    FONT_TITLE,
    FONT_HEADING,
    FONT_BODY,
} from "../ui/PeriodUI";

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

        // Semi-transparent dark backdrop to dim the map
        this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.5);

        const gfx = this.add.graphics();

        // Central parchment panel
        const panelW = 500;
        const panelH = 270;
        const panelX = cx - panelW / 2;
        const panelY = height / 2 - panelH / 2 - 20;
        drawParchmentPanel(gfx, panelX, panelY, panelW, panelH, 0.95);
        drawCornerOrnaments(gfx, panelX + 6, panelY + 6, panelW - 12, panelH - 12, 14);

        drawHorizontalRule(gfx, cx, panelY + 28, panelW - 60, true);

        // VICTORY title
        this.add
            .text(cx, panelY + 58, "VICTORY", {
                fontFamily: FONT_TITLE,
                fontSize: "48px",
                color: INK,
            })
            .setOrigin(0.5);

        drawHorizontalRule(gfx, cx, panelY + 92, panelW - 60, true);

        // Faction jack + "X wins!"
        const winY = panelY + 120;
        drawFactionJack(gfx, cx - 80, winY - 6, data.winner, 16, 12);

        this.add
            .text(cx, winY, `${faction.name} wins!`, {
                fontFamily: FONT_HEADING,
                fontSize: "22px",
                color: INK,
            })
            .setOrigin(0.5);

        // Reason text
        const reasonText = VICTORY_TEXT[data.reason]?.[data.winner] || "Victory achieved!";
        this.add
            .text(cx, panelY + 165, reasonText, {
                fontFamily: FONT_BODY,
                fontSize: "14px",
                color: INK_LIGHT,
                wordWrap: { width: panelW - 60 },
                align: "center",
            })
            .setOrigin(0.5);

        // Play again button — double-rule box
        const btnY = panelY + panelH + 16;
        const btnBoxW = 180;
        const btnBoxH = 40;
        drawParchmentPanel(gfx, cx - btnBoxW / 2, btnY, btnBoxW, btnBoxH, 0.9);
        drawDoubleRuleBox(gfx, cx - btnBoxW / 2 + 4, btnY + 4, btnBoxW - 8, btnBoxH - 8);

        const btn = this.add
            .text(cx, btnY + btnBoxH / 2, "Play Again", {
                fontFamily: FONT_HEADING,
                fontSize: "22px",
                color: INK,
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        btn.on("pointerover", () => {
            btn.setColor(INK_FAINT);
            this.tweens.add({
                targets: btn,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100,
                ease: "Sine.easeOut",
            });
        });
        btn.on("pointerout", () => {
            btn.setColor(INK);
            this.tweens.add({
                targets: btn,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
                ease: "Sine.easeOut",
            });
        });
        btn.on("pointerdown", () => {
            this.scene.start("MenuScene");
        });
    }
}
