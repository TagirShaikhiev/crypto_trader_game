import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
    private gameData: any;

    constructor() { super('ResultScene'); }

    init(data: any) {
        this.gameData = data;
    }

    create() {
        const { width, height } = this.scale;
        
        // --- 1. ПРОВЕРКА УСЛОВИЙ ---
        let status = 'CONTINUE';
        
        // Проверяем именно итоговый баланс
        if (this.gameData.cash < 0) status = 'BANKRUPT';
        if (this.gameData.heat >= 100) status = 'ARRESTED';
        if (this.gameData.dayNumber >= 5 && status === 'CONTINUE') status = 'VICTORY';

        // --- 2. НАСТРОЙКИ ВИЗУАЛА ---
        let bgColor = 0x000000;
        let titleText = `DAY ${this.gameData.dayNumber} REPORT`;
        let titleColor = '#ffffff';
        let btnText = 'GO TO BLACK MARKET >';
        let nextScene = 'ShopScene';

        if (status === 'BANKRUPT') {
            bgColor = 0x330000;
            titleText = 'DEBT COLLECTORS ARRIVED'; // Коллекторы пришли
            titleColor = '#ff0000';
            btnText = 'GAME OVER (RESTART)';
            nextScene = 'MainMenu';
        } else if (status === 'ARRESTED') {
            bgColor = 0x000033;
            titleText = 'BUSTED BY SEC';
            titleColor = '#3333ff';
            btnText = 'SERVE TIME (RESTART)';
            nextScene = 'MainMenu';
        } else if (status === 'VICTORY') {
            bgColor = 0x003300;
            titleText = 'RETIRED YOUNG';
            titleColor = '#00ff00';
            btnText = 'NEW GAME';
            nextScene = 'MainMenu';
        }

        // --- 3. ОТРИСОВКА ---
        this.add.rectangle(0, 0, width, height, bgColor).setOrigin(0);

        this.add.text(width/2, 100, titleText, {
            fontSize: '54px', color: titleColor, fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0,0, titleColor, 10);

        // --- БУХГАЛТЕРИЯ (Показываем вычисления) ---
        const startY = 220;
        const style = { fontSize: '32px', color: '#ccc', fontFamily: 'monospace' };
        const valueStyle = { fontSize: '32px', color: '#fff', fontFamily: 'monospace', fontStyle: 'bold' };

        // 1. Gross Balance (До вычета)
        this.add.text(width/2 - 150, startY, 'Gross Balance:', style).setOrigin(1, 0.5);
        this.add.text(width/2 + 150, startY, `$${this.gameData.cashBefore?.toFixed(0) || 0}`, valueStyle).setOrigin(1, 0.5);

        // 2. Expenses (Расходы)
        this.add.text(width/2 - 150, startY + 50, 'Operating Costs:', { ...style, color: '#ff5555' }).setOrigin(1, 0.5);
        this.add.text(width/2 + 150, startY + 50, `-$${this.gameData.expenses || 0}`, { ...valueStyle, color: '#ff5555' }).setOrigin(1, 0.5);

        // Черта
        this.add.rectangle(width/2, startY + 85, 400, 2, 0x666666).setOrigin(0.5);

        // 3. Net Balance (Итого)
        this.add.text(width/2 - 150, startY + 120, 'NET BALANCE:', style).setOrigin(1, 0.5);
        const finalColor = this.gameData.cash >= 0 ? '#00ff00' : '#ff0000';
        this.add.text(width/2 + 150, startY + 120, `$${this.gameData.cash.toFixed(0)}`, { ...valueStyle, color: finalColor, fontSize: '48px' }).setOrigin(1, 0.5);

        // Heat
        this.add.text(width/2, startY + 200, `HEAT LEVEL: ${this.gameData.heat}%`, {
            fontSize: '28px', color: this.gameData.heat > 50 ? '#f00' : '#888', fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Кнопка
        const btn = this.add.rectangle(width/2, height - 120, 400, 80, 0x222222).setInteractive({useHandCursor:true});
        btn.setStrokeStyle(2, 0xffffff);
        
        this.add.text(width/2, height - 120, btnText, { 
            fontSize: '32px', fontFamily: 'monospace', fontStyle: 'bold' 
        }).setOrigin(0.5);

        btn.on('pointerdown', () => {
            if (nextScene === 'MainMenu') {
                this.scene.start('MainMenu');
            } else {
                // Go to the ShopScene first
                this.scene.start('ShopScene');
            }
        });
        
        btn.on('pointerover', () => btn.setFillStyle(0x444444));
        btn.on('pointerout', () => btn.setFillStyle(0x222222));
    }
}