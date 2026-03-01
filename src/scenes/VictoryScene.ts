import Phaser from "phaser";

export class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: "VictoryScene" });
    }

    create(): void {
        // Placeholder - built in Phase 2
        const { width, height } = this.scale;
        this.add
            .text(width / 2, height / 2, "Victory!", {
                fontFamily: "Georgia, serif",
                fontSize: "48px",
                color: "#ddaa22",
            })
            .setOrigin(0.5);
    }
}
