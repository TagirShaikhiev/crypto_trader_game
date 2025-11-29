import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
    private gameData: any;

    constructor() { super('ResultScene'); }

    init(data: any) {
        this.gameData = data;
    }

    create() {
        const { width, height } = this.scale;
        
        this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0);

        this.add.text(width/2, 100, `DAY ${this.gameData.dayNumber} COMPLETE`, {
            fontSize: '48px', color: '#fff', fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.add.text(width/2, 200, `BALANCE: $${this.gameData.cash.toFixed(0)}`, {
            fontSize: '64px', color: '#0f0', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width/2, 300, `HEAT LEVEL: ${this.gameData.heat}%`, {
            fontSize: '32px', color: this.gameData.heat > 50 ? '#f00' : '#aaa', fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Кнопка NEXT DAY
        const btn = this.add.rectangle(width/2, 500, 300, 80, 0x00aa00).setInteractive({useHandCursor:true});
        this.add.text(width/2, 500, 'START NEXT DAY', { fontSize: '32px', fontFamily: 'monospace' }).setOrigin(0.5);

        btn.on('pointerdown', () => {
            // Возвращаемся в брифинг следующего дня
            this.scene.start('BriefingScene', {
                ...this.gameData,
                dayNumber: this.gameData.dayNumber + 1 // +1 День
            });
        });
    }
}