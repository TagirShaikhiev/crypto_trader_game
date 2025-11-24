import Phaser from 'phaser';
import { BasePanel } from './BasePanel';

export class TradingPanel extends BasePanel {
    private onTrade: (percent: number, isLong: boolean) => void;
    
    private selectedPercent = 0.5; // По умолчанию 50%
    private percentBtns: Phaser.GameObjects.Text[] = [];
    private inputAmount = "100";
    private inputText: Phaser.GameObjects.Text;
    // Ссылки на кнопки для управления их активностью
    private btnBuyContainer: Phaser.GameObjects.Container;
    private btnSellContainer: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onTrade: (pct: number, long: boolean)=>void) {
        super(scene, x, y, w, h, 0x111111);
        const inputW = 250;
        const inputBg = scene.add.rectangle(20, 45, inputW, 50, 0x000000)
            .setOrigin(0)
            .setStrokeStyle(2, 0x00ff00); // <-- Ярко-зеленая рамка (2px)
        this.onTrade = onTrade;

        this.add(scene.add.text(20, 20, 'BET SIZE:', { fontSize: '14px', color: '#aaa', fontFamily: 'monospace' }));

        this.inputText = scene.add.text(35, 70, this.inputAmount, { 
            fontSize: '28px', fontFamily: 'monospace', color: '#00ff00' 
        }).setOrigin(0, 0.5);
        this.add([inputBg, this.inputText]);

        // КНОПКИ ПРОЦЕНТОВ
        this.createPercentBtn(20, 50, '25%', 0.25);
        this.createPercentBtn(100, 50, '50%', 0.50);
        this.createPercentBtn(180, 50, 'MAX', 1.00);
        
        this.highlightPercent(1); // 50% активно

        // КНОПКИ LONG / SHORT (Сохраняем их в переменные класса)
        this.btnBuyContainer = this.createBigBtn(400, 50, 140, 60, 'UP (LONG)', 0x00aa00, () => this.onTrade(this.selectedPercent, true));
        this.btnSellContainer = this.createBigBtn(560, 50, 140, 60, 'DOWN (SHORT)', 0xaa0000, () => this.onTrade(this.selectedPercent, false));
        
        // Сразу выключаем кнопку закрытия
        this.btnSellContainer.setAlpha(0.5);
    }

    // --- ВОТ ЭТОГО МЕТОДА НЕ ХВАТАЛО ---
    public updateButtons(hasPosition: boolean) {
        // Если мы в позиции (hasPosition = true):
        // BUY (UP) становится прозрачным (неактивным)
        // SELL (DOWN/CLOSE) становится ярким (активным)
        this.btnBuyContainer.setAlpha(hasPosition ? 0.5 : 1);
        this.btnSellContainer.setAlpha(hasPosition ? 1 : 0.5);
        
        // Меняем текст второй кнопки в зависимости от состояния
        const sellText = this.btnSellContainer.getAt(1) as Phaser.GameObjects.Text;
        if (sellText) {
            sellText.setText(hasPosition ? 'CLOSE' : 'DOWN (SHORT)');
        }
    }

    private createPercentBtn(x: number, y: number, text: string, value: number) {
        const bg = this.scene.add.rectangle(0, 0, 70, 40, 0x222222).setInteractive({useHandCursor:true});
        bg.setStrokeStyle(1, 0x666666);
        const txt = this.scene.add.text(0, 0, text, { fontSize: '16px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);
        const cont = this.scene.add.container(x + 35, y + 20, [bg, txt]);
        this.add(cont);

        bg.on('pointerdown', () => {
            this.selectedPercent = value;
            this.updateHighlights(text);
        });
        
        txt.setData('val', value);
        this.percentBtns.push(txt);
    }

    private updateHighlights(selectedText: string) {
        this.percentBtns.forEach(btn => {
            if (btn.text === selectedText) btn.setColor('#00ff00');
            else btn.setColor('#ffffff');
        });
    }
    
    private highlightPercent(index: number) {
        this.percentBtns.forEach((btn, i) => btn.setColor(i === index ? '#00ff00' : '#ffffff'));
    }

    private createBigBtn(x: number, y: number, w: number, h: number, text: string, color: number, cb: () => void) {
        const btn = this.scene.add.rectangle(0, 0, w, h, color).setInteractive({useHandCursor:true});
        btn.setStrokeStyle(2, 0x000000); 
        
        const lbl = this.scene.add.text(0, 0, text, { 
            fontSize: '18px', fontStyle: 'bold', fontFamily: 'monospace', color: '#000' 
        }).setOrigin(0.5);
        
        const cont = this.scene.add.container(x, y, [btn, lbl]);
        this.add(cont);
        
        btn.on('pointerdown', () => {
            if (cont.alpha < 1) return; // Если прозрачная - не нажимается
            this.scene.tweens.add({ targets: cont, scale: 0.95, duration: 50, yoyo: true });
            cb();
        });
        
        btn.on('pointerover', () => { if(cont.alpha === 1) btn.setAlpha(0.9); });
        btn.on('pointerout', () => { if(cont.alpha === 1) btn.setAlpha(1); });

        return cont;
    }

    public handleInput(e: KeyboardEvent) {
        if (!this.scene) return;
        
        // Логика ввода цифр
        if (/^[0-9]$/.test(e.key)) {
            if (this.inputAmount === "0") this.inputAmount = e.key;
            else this.inputAmount += e.key;
        } else if (e.key === 'Backspace') {
            this.inputAmount = this.inputAmount.slice(0, -1) || "0";
        }
        this.inputText.setText(this.inputAmount);
    }
}