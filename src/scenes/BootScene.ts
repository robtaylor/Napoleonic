import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: "BootScene" });
    }

    preload(): void {
        // TODO: Load GeoJSON map data, sprites, fonts
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
