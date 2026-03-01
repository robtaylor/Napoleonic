import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "GameScene" });
    }

    create(): void {
        // Placeholder - will be built out in Phase 1.3+
        const { width, height } = this.scale;
        this.add
            .text(width / 2, height / 2, "Game Scene - Map coming soon", {
                fontFamily: "Georgia, serif",
                fontSize: "24px",
                color: "#c4a86a",
            })
            .setOrigin(0.5);
    }

    update(_time: number, _delta: number): void {
        // Game loop - will drive systems in Phase 2
    }
}
