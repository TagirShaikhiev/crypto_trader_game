import Phaser from 'phaser';

export class BriefingScene extends Phaser.Scene {
    private dayNumber: number = 1;
    private cash: number = 10000;
    private gameData: any;

    constructor() {
        super('BriefingScene');
    }

    init(data: any) {
        this.dayNumber = data.dayNumber || 1;
        this.cash = data.cash || 10000;
        // Тут потом будем принимать параметры сложности и задания
    }

    create() {
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0);

        this.add.text(width/2, height/2 - 50, `DAY ${this.dayNumber}`, {
            fontSize: '64px', color: '#fff', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width/2, height/2 + 20, `TARGET: SURVIVE`, {
            fontSize: '24px', color: '#0f0', fontFamily: 'monospace'
        }).setOrigin(0.5);

        const btn = this.add.rectangle(width/2, height/2 + 150, 300, 60, 0x00aa00).setInteractive({useHandCursor:true});
        this.add.text(width/2, height/2 + 150, 'BUILD DECK >', { fontSize: '24px', fontFamily: 'monospace' }).setOrigin(0.5);

        btn.on('pointerdown', () => {
            // Переходим к фазе планирования
            this.scene.start('DeckScene', { dayNumber: this.dayNumber, cash: this.cash });
        });

        btn.on('pointerdown', () => {
            // Передаем данные дальше
            this.scene.start('DeckScene', { 
                dayNumber: this.dayNumber, 
                cash: this.cash,
                lastPrice: this.gameData?.lastPrice, // Если есть
                history: this.gameData?.history      // Если есть
            });
        });
    }
}