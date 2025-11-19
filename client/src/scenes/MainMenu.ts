import Phaser from 'phaser';
import { MatrixEffect } from './MatrixEffect';
import { AudioManager } from './AudioManager';

export class MainMenu extends Phaser.Scene {
    private matrixEffect!: MatrixEffect;

    constructor() {
        super('MainMenu');
    }

    preload() {
        // 1. Загружаем музыку МЕНЮ
        AudioManager.preload(this);
    }

    create() {

        AudioManager.init(this); // Настройки звука
        AudioManager.playMenu(this); // Включаем тему меню
        const { width, height } = this.scale;

        // 1. ЗАПУСКАЕМ МАТРИЦУ (она сама создастся на фоне)
        this.matrixEffect = new MatrixEffect(this, 20); // 20 - размер шрифта

        // 2. ИНТЕРФЕЙС
        this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.7);

        // Если играет игровая музыка (мы вернулись из игры) — выключаем её
        // this.game.sound.stopAll();

        // // Запускаем тему меню, если она еще не играет
        // if (!this.sound.get('menu_theme')) {
        //     this.sound.play('menu_theme', {
        //         loop: true,
        //         volume: 0.5
        //     });
        // }
        this.sound.pauseOnBlur = false;
        this.add.text(width / 2, height / 2 - 100, 'MARKET MANIPULATOR', {
            fontSize: '64px', color: '#fff', fontStyle: 'bold', fontFamily: 'monospace'
        }).setOrigin(0.5);

        const startBtn = this.add.rectangle(width / 2, height / 2 + 100, 300, 80, 0x00aa00)
            .setInteractive({useHandCursor: true});
        
        const btnText = this.add.text(width / 2, height / 2 + 100, 'START TRADING', { 
            fontSize: '32px', fontFamily: 'monospace' 
        }).setOrigin(0.5);

        startBtn.on('pointerdown', () => {
            this.scene.start('MainGame');
        });
    }

    update(time: number, delta: number) {
        // Проверяем, активна ли сцена, чтобы избежать ошибки null
        if (this.sys.settings.active && this.matrixEffect) {
            this.matrixEffect.update(time, delta);
        }
    }
}