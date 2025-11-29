import Phaser from 'phaser';
import { MainMenu } from './scenes/MainMenu';
import { MainGame } from './scenes/MainGame';
import { BriefingScene } from './scenes/BriefingScene'; // <-- Импорт
import { DeckScene } from './scenes/DeckScene';         // <-- Импорт
import { ResultScene } from './scenes/ResultScene';     // <-- Импорт (создай пустой файл пока) 

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1280, // HD разрешение
    height: 720,
    backgroundColor: '#000000', // Черный фон терминала
    parent: 'app',
    scene: [MainMenu, BriefingScene, DeckScene, MainGame, ResultScene],
    scale: {
        mode: Phaser.Scale.FIT, // Вписываем в окно браузера
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

new Phaser.Game(config);