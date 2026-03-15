import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { MenuScene } from "../scenes/MenuScene";
import { GameScene } from "../scenes/GameScene";
import { HUDScene } from "../scenes/HUDScene";
import { VictoryScene } from "../scenes/VictoryScene";
import { isTouchDevice } from "../utils/platform";

// Lower resolution on mobile so text/UI elements are physically larger
const mobile = isTouchDevice();
const GAME_W = mobile ? 854 : 1280;
const GAME_H = mobile ? 480 : 720;

export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: GAME_W,
    height: GAME_H,
    backgroundColor: "#2b1d0e",
    scene: [BootScene, MenuScene, GameScene, HUDScene, VictoryScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
};
