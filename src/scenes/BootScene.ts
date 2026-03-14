import Phaser from "phaser";

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

        const bg = this.add.graphics();
        bg.fillStyle(0x3d2b1f, 1);
        bg.fillRect(x, y, barWidth, barHeight);

        const bar = this.add.graphics();
        this.load.on("progress", (value: number) => {
            bar.clear();
            bar.fillStyle(0xddaa22, 1);
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
