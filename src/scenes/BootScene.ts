import Phaser from "phaser";
import { drawCornerOrnaments, drawHorizontalRule, UI_COLORS, INK, FONT_TITLE } from "../ui/PeriodUI";

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: "BootScene" });
    }

    preload(): void {
        this.load.json("iberia-land", "assets/maps/iberia-land.json");
        this.load.json("iberia-borders", "assets/maps/iberia-borders.json");
        this.load.json("iberia-rivers", "assets/maps/iberia-rivers.json");
        this.load.json("iberia-elevation", "assets/maps/iberia-elevation.json");
        this.load.json("iberia-terrain-meta", "assets/maps/iberia-terrain-meta.json");
        this.load.image("iberia-terrain", "assets/maps/iberia-terrain.png");

        const { width, height } = this.scale;
        const barWidth = 320;
        const barHeight = 16;
        const x = (width - barWidth) / 2;
        const y = height / 2 + 10;

        // Title text
        this.add
            .text(width / 2, y - 36, "NAPOLIONIC", {
                fontFamily: FONT_TITLE,
                fontSize: "28px",
                color: INK,
            })
            .setOrigin(0.5);

        // Decorative corner ornaments
        const gfx = this.add.graphics();
        const m = 16;
        drawCornerOrnaments(gfx, x - m, y - m, barWidth + m * 2, barHeight + m * 2, 8);

        // Loading bar background
        const bg = this.add.graphics();
        bg.fillStyle(UI_COLORS.parchmentDark, 1);
        bg.fillRect(x, y, barWidth, barHeight);
        bg.lineStyle(1, UI_COLORS.ink, 0.3);
        bg.strokeRect(x, y, barWidth, barHeight);

        const bar = this.add.graphics();
        this.load.on("progress", (value: number) => {
            bar.clear();
            bar.fillStyle(UI_COLORS.ink, 0.6);
            bar.fillRect(x + 1, y + 1, (barWidth - 2) * value, barHeight - 2);
        });

        this.load.on("complete", () => {
            bar.destroy();
            bg.destroy();
        });

        // Thin rule below
        drawHorizontalRule(gfx, width / 2, y + barHeight + m, barWidth, false);
    }

    create(): void {
        this.scene.start("MenuScene");
    }
}
