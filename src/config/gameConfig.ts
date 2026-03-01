import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { MenuScene } from "../scenes/MenuScene";
import { GameScene } from "../scenes/GameScene";
import { HUDScene } from "../scenes/HUDScene";
import { VictoryScene } from "../scenes/VictoryScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: 1280,
    height: 720,
    backgroundColor: "#2b1d0e",
    scene: [BootScene, MenuScene, GameScene, HUDScene, VictoryScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
};
