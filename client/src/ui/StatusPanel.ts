import Phaser from 'phaser';
import { BasePanel } from './BasePanel';

export class StatusPanel extends BasePanel {
    private cashText: Phaser.GameObjects.Text;
    private pnlText: Phaser.GameObjects.Text;
    private heatText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
        super(scene, x, y, w, h, 0x111111); // Фон темнее (почти черный)

        const pad = 20;
        const topOffset = 20; // Единый отступ сверху для выравнивания

        // --- СЕКЦИЯ 1: ФИНАНСЫ ---
        this.addLabel(pad, topOffset, 'TOTAL BALANCE');
        
        this.cashText = scene.add.text(pad, topOffset + 25, '$10000', { 
            fontSize: '42px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'monospace' 
        });
        this.cashText.setShadow(0, 0, '#ffffff', 4, true, true); // Легкое свечение
        this.add(this.cashText);

        // Разделитель
        this.addSeparator(90, w);

        // --- СЕКЦИЯ 2: ПРИБЫЛЬ ---
        this.addLabel(pad, 110, 'SESSION P&L');
        this.pnlText = scene.add.text(pad, 135, '$0.00', { 
            fontSize: '28px', color: '#fff', fontFamily: 'monospace' 
        });
        this.add(this.pnlText);

        this.addSeparator(180, w);

        // --- СЕКЦИЯ 3: СЛЕЖКА ---
        this.addLabel(pad, 200, 'SEC ATTENTION (HEAT)');
        this.heatText = scene.add.text(pad, 225, '0%', { 
            fontSize: '28px', color: '#0f0', fontFamily: 'monospace' 
        });
        this.add(this.heatText);

        this.addSeparator(270, w);

        // --- СЕКЦИЯ 4: РЕПУТАЦИЯ ---
        this.addLabel(pad, 290, 'REPUTATION');
        const repText = scene.add.text(pad, 315, 'ANONYMOUS', { 
            fontSize: '20px', color: '#ffffff', fontFamily: 'monospace' 
        });
        this.add(repText);

        // Кнопка ВЫХОД
        this.createExitBtn(w / 2, h - 40); 
    }

    public updateStats(cash: number, pnl: number, heat: number) {
        this.cashText.setText(`$${cash.toFixed(0)}`);
        
        const sign = pnl >= 0 ? '+' : '';
        const col = pnl >= 0 ? '#00ff00' : '#ff3333'; // Яркие цвета
        this.pnlText.setText(`${sign}$${pnl.toFixed(2)}`).setColor(col);
        // Добавляем свечение цвету PnL
        this.pnlText.setShadow(0, 0, col, 6, true, true);

        const heatCol = heat > 50 ? '#ff0000' : (heat > 20 ? '#ffff00' : '#00ff00');
        this.heatText.setText(`${heat}%`).setColor(heatCol);
    }

    // Хелпер для заголовков (осветленный серый)
    private addLabel(x: number, y: number, text: string) {
        this.add(this.scene.add.text(x, y, text, { 
            fontSize: '12px', color: '#cccccc', fontFamily: 'monospace', fontStyle: 'bold' 
        }));
    }

    // Хелпер для линий
    private addSeparator(y: number, w: number) {
        const line = this.scene.add.rectangle(0, y, w, 1, 0x333333).setOrigin(0);
        this.add(line);
    }

    private createExitBtn(x: number, y: number) {
        const btn = this.scene.add.rectangle(0, 0, 200, 40, 0x222222).setInteractive({useHandCursor:true});
        btn.setStrokeStyle(1, 0x555555);
        
        const txt = this.scene.add.text(0, 0, 'EXIT SYSTEM', { 
            fontSize: '16px', fontFamily: 'monospace', color: '#888' 
        }).setOrigin(0.5);
        
        const cont = this.scene.add.container(x, y, [btn, txt]);
        this.add(cont);

        btn.on('pointerdown', () => this.scene.scene.start('MainMenu'));
        
        // Hover эффект
        btn.on('pointerover', () => {
            btn.setFillStyle(0x333333);
            txt.setColor('#fff');
        });
        btn.on('pointerout', () => {
            btn.setFillStyle(0x222222);
            txt.setColor('#888');
        });
    }
}