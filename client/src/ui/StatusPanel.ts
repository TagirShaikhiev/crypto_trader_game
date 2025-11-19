import Phaser from 'phaser';
import { BasePanel } from './BasePanel';

export class StatusPanel extends BasePanel {
    private cashText: Phaser.GameObjects.Text;
    private pnlText: Phaser.GameObjects.Text;
    private heatText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
        super(scene, x, y, w, h, 0x222222);

        const pad = 20;
        
        // 1. БАЛАНС
        this.add(scene.add.text(pad, 30, 'BALANCE:', { fontSize: '14px', color: '#aaa', fontFamily: 'monospace' }));
        
        this.cashText = scene.add.text(pad, 55, '$10000', { fontSize: '32px', color: '#fff', fontFamily: 'monospace' });
        this.add(this.cashText);

        // 2. PnL (Прибыль)
        this.add(scene.add.text(pad, 120, 'OPEN P&L:', { fontSize: '14px', color: '#aaa', fontFamily: 'monospace' }));
        
        this.pnlText = scene.add.text(pad, 145, '$0.00', { fontSize: '32px', color: '#fff', fontFamily: 'monospace' });
        this.add(this.pnlText);

        // Разделитель
        const line = scene.add.rectangle(0, 220, w, 2, 0x444444).setOrigin(0);
        this.add(line);

        // 3. HEAT (Слежка)
        this.add(scene.add.text(pad, 250, 'SEC MONITORING (HEAT):', { fontSize: '14px', color: '#aaa', fontFamily: 'monospace' }));
        
        this.heatText = scene.add.text(pad, 275, '0%', { fontSize: '32px', color: '#0f0', fontFamily: 'monospace' });
        this.add(this.heatText);

        // 4. Кнопка ВЫХОД (Прижата к низу)
        this.createExitBtn(w / 2, h - 50); 
    }

    public updateStats(cash: number, pnl: number, heat: number) {
        this.cashText.setText(`$${cash.toFixed(0)}`);
        
        const sign = pnl >= 0 ? '+' : '';
        const col = pnl >= 0 ? '#00ff00' : '#ff0000';
        this.pnlText.setText(`${sign}$${pnl.toFixed(2)}`).setColor(col);

        // Меняем цвет Heat от зеленого к красному
        const heatCol = heat > 50 ? '#ff0000' : (heat > 20 ? '#ffff00' : '#00ff00');
        this.heatText.setText(`${heat}%`).setColor(heatCol);
    }

    private createExitBtn(x: number, y: number) {
        // Создаем элементы сцены
        const btn = this.scene.add.rectangle(0, 0, 200, 50, 0x444444).setInteractive({useHandCursor:true});
        const txt = this.scene.add.text(0, 0, 'EXIT GAME', { fontSize: '20px', fontFamily: 'monospace' }).setOrigin(0.5);
        
        // Кладем в контейнер кнопки
        const cont = this.scene.add.container(x, y, [btn, txt]);
        
        // Кладем контейнер кнопки в ОСНОВНУЮ панель
        this.add(cont);

        btn.on('pointerdown', () => {
            this.scene.scene.start('MainMenu');
        });
        
        // Ховер эффект для кнопки
        btn.on('pointerover', () => btn.setFillStyle(0x555555));
        btn.on('pointerout', () => btn.setFillStyle(0x444444));
    }
}