import Phaser from "phaser";
import { drawCornerOrnaments, UI_COLORS } from "../ui/PeriodUI";

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
        const barHeight = 20;
        const x = (width - barWidth) / 2;
        const y = height / 2;

        // Title text above loading bar
        this.add
            .text(width / 2, y - 40, "NAPOLIONIC", {
                fontFamily: "Georgia, serif",
                fontSize: "32px",
                color: "#ddaa22",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(0.5);

        // Corner ornaments around loading area
        const gfx = this.add.graphics();
        const ornMargin = 20;
        drawCornerOrnaments(
            gfx,
            x - ornMargin,
            y - ornMargin,
            barWidth + ornMargin * 2,
            barHeight + ornMargin * 2,
            10,
        );

        // Loading bar background
        const bg = this.add.graphics();
        bg.fillStyle(UI_COLORS.darkBrown, 1);
        bg.fillRect(x, y, barWidth, barHeight);
        bg.lineStyle(1, UI_COLORS.panelBorder, 0.6);
        bg.strokeRect(x, y, barWidth, barHeight);

        const bar = this.add.graphics();
        this.load.on("progress", (value: number) => {
            bar.clear();
            bar.fillStyle(UI_COLORS.goldAccent, 1);
            bar.fillRect(x, y, barWidth * value, barHeight);
        });

        this.load.on("complete", () => {
            bar.destroy();
            bg.destroy();
        });
    }

    create(): void {
        this.scene.start("MenuScene");
    }
}
