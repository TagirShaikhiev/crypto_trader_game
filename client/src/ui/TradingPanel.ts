import Phaser from 'phaser';
import { BasePanel } from './BasePanel';

export class TradingPanel extends BasePanel {
    private inputAmount = "100";
    private inputText: Phaser.GameObjects.Text;
    private onBuy: (amount: number) => void;
    private onSell: () => void;
    
    // Ссылки на контейнеры кнопок для управления их прозрачностью
    private btnBuyContainer: Phaser.GameObjects.Container;
    private btnSellContainer: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onBuy: (a: number)=>void, onSell: ()=>void) {
        super(scene, x, y, w, h, 0x1a1a1a);
        this.onBuy = onBuy;
        this.onSell = onSell;

        // ИСПРАВЛЕНИЕ: используем scene.add.text, затем this.add(...)
        const label = scene.add.text(20, 20, 'ORDER AMOUNT ($):', { 
            fontSize: '14px', color: '#aaa', fontFamily: 'monospace' 
        });
        this.add(label);

        // Поле ввода (Фон + Текст)
        const inputBg = scene.add.rectangle(20, 50, 200, 40, 0x000000)
            .setOrigin(0)
            .setStrokeStyle(1, 0x666666);
        
        this.inputText = scene.add.text(30, 70, this.inputAmount, { 
            fontSize: '24px', fontFamily: 'monospace', color: '#fff' 
        }).setOrigin(0, 0.5); // Центрируем текст по вертикали в поле

        this.add([inputBg, this.inputText]);

        // Кнопка MAX
        this.createSimpleBtn(250, 70, 50, 30, 'MAX', 0x444444, () => this.emit('max-clicked'));

        // Кнопки BUY / SELL (Большие)
        this.btnBuyContainer = this.createBigBtn(400, 70, 150, 60, 'BUY', 0x00aa00, () => {
            this.onBuy(parseInt(this.inputAmount));
        });
        
        this.btnSellContainer = this.createBigBtn(600, 70, 150, 60, 'SELL', 0xaa0000, () => {
            this.onSell();
        });
        this.btnSellContainer.setAlpha(0.5); // Сначала продавать нечего

        // Слушаем клавиатуру
        // Важно: удаляем старые слушатели, если сцена перезапускается, чтобы не дублировать ввод
        scene.input.keyboard?.off('keydown');
        // scene.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.handleInput(e));
    }

    public setInput(val: string) {
        this.inputAmount = val;
        this.inputText.setText(val);
    }

    public updateButtons(hasPosition: boolean) {
        this.btnBuyContainer.setAlpha(hasPosition ? 0.5 : 1);
        this.btnSellContainer.setAlpha(hasPosition ? 1 : 0.5);
    }

    public handleInput(e: KeyboardEvent) {
        // Убрали проверку if (!this.scene) - она не нужна, если управляем извне
        
        if (/^[0-9]$/.test(e.key)) {
            if (this.inputAmount === "0") this.inputAmount = e.key;
            else this.inputAmount += e.key;
        } else if (e.key === 'Backspace') {
            this.inputAmount = this.inputAmount.slice(0, -1) || "0";
        }
        this.inputText.setText(this.inputAmount);
    }

    // Хелпер для маленькой кнопки (MAX)
    private createSimpleBtn(x: number, y: number, w: number, h: number, text: string, color: number, cb: () => void) {
        // Создаем элементы через this.scene.add
        const btn = this.scene.add.rectangle(0, 0, w, h, color).setInteractive({useHandCursor:true});
        const lbl = this.scene.add.text(0, 0, text, { fontSize: '14px', fontFamily: 'monospace' }).setOrigin(0.5);
        
        // Создаем контейнер кнопки
        const cont = this.scene.add.container(x, y, [btn, lbl]);
        
        // Добавляем контейнер кнопки в ОСНОВНУЮ панель
        this.add(cont);

        btn.on('pointerdown', cb);
    }

    // Хелпер для больших кнопок (BUY/SELL)
    private createBigBtn(x: number, y: number, w: number, h: number, text: string, color: number, cb: () => void) {
        const btn = this.scene.add.rectangle(0, 0, w, h, color).setInteractive({useHandCursor:true});
        const lbl = this.scene.add.text(0, 0, text, { 
            fontSize: '24px', fontStyle: 'bold', fontFamily: 'monospace' 
        }).setOrigin(0.5);
        
        const cont = this.scene.add.container(x, y, [btn, lbl]);
        this.add(cont);
        
        btn.on('pointerdown', () => {
            if (cont.alpha < 1) return; // Неактивна
            
            this.scene.tweens.add({ 
                targets: cont, 
                scale: 0.95, 
                duration: 50, 
                yoyo: true 
            });
            cb();
        });
        return cont;
    }
}