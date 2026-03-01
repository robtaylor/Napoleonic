import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: "MenuScene" });
    }

    create(): void {
        const { width, height } = this.scale;

        this.add
            .text(width / 2, height / 3, "NAPOLIONIC", {
                fontFamily: "Georgia, serif",
                fontSize: "64px",
                color: "#ddaa22",
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, height / 3 + 60, "The Peninsular War", {
                fontFamily: "Georgia, serif",
                fontSize: "24px",
                color: "#c4a86a",
            })
            .setOrigin(0.5);

        const startBtn = this.add
            .text(width / 2, height / 2 + 40, "[ Start Game ]", {
                fontFamily: "Georgia, serif",
                fontSize: "32px",
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        startBtn.on("pointerover", () => startBtn.setColor("#ddaa22"));
        startBtn.on("pointerout", () => startBtn.setColor("#ffffff"));
        startBtn.on("pointerdown", () => {
            this.scene.start("GameScene");
        });
    }
}
