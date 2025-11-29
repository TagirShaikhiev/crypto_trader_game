import Phaser from 'phaser';
import { BasePanel } from './BasePanel';
import { getItemById } from '../data/ShopData';

export class StatusPanel extends BasePanel {
    private cashText: Phaser.GameObjects.Text;
    private pnlText: Phaser.GameObjects.Text;
    private heatText: Phaser.GameObjects.Text;
    private buffsContainer: Phaser.GameObjects.Container;

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

        const buffY = h - 160;
        // this.addSeparator(buffY, w);
        
        // this.add(scene.add.text(20, buffY + 10, 'ACTIVE BUFFS:', { 
        //     fontSize: '12px', color: '#cccccc', fontFamily: 'monospace', fontStyle: 'bold' 
        // }));

        this.buffsContainer = scene.add.container(20, buffY + 35);
        // this.add(this.buffsContainer);
        this.buffsContainer.setDepth(9999);
        const buffHeaderY = h - 200; 
        this.addSeparator(buffHeaderY, w);
        this.add(scene.add.text(20, buffHeaderY + 10, 'ACTIVE BUFFS:', { 
            fontSize: '12px', color: '#cccccc', fontFamily: 'monospace', fontStyle: 'bold' 
        }));

        // Сам контейнер иконок чуть ниже заголовка
        this.buffsContainer = scene.add.container(20, buffHeaderY + 35);
        this.add(this.buffsContainer);

        // Кнопка ВЫХОД остается в самом низу
        this.createExitBtn(w / 2, h - 40);
    }

    private logPosition() {
        console.clear();
        console.log(`🎯 BUFFS CONTAINER:
        X: ${this.buffsContainer.x}
        Y: ${this.buffsContainer.y}
        Scale: ${this.buffsContainer.scaleX.toFixed(2)}`);
    }

    public setBuffs(inventory: string[]) {
        // 1. Чистим
        this.buffsContainer.removeAll(true);

        if (!inventory || inventory.length === 0) return;

        // 2. Группируем
        const counts: { [key: string]: number } = {};
        inventory.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

        let xPos = 0;
        
        Object.keys(counts).forEach(id => {
            const item = getItemById(id);
            if (item) {
                const count = counts[id];
                
                // --- ВЫБИРАЕМ ЦВЕТ ПО ID ПРЕДМЕТА ---
                let color = 0xffffff; // Белый по дефолту
                if (id.includes('coffee')) color = 0xbf8040; // Коричневый
                if (id.includes('bribe')) color = 0x00ff00;  // Зеленый (Деньги)
                if (id.includes('bot')) color = 0xff0000;    // Красный (Опасно)
                if (id.includes('vpn')) color = 0x0088ff;    // Синий (Технологии)

                // 1. Рисуем ЦВЕТНОЙ КВАДРАТ (Вместо иконки)
                const iconRect = this.scene.add.rectangle(xPos, 0, 30, 30, color).setOrigin(0);
                
                // 2. Рисуем счетчик рядом (x2, x3...)
                const textLabel = this.scene.add.text(xPos + 35, 5, `x${count}`, {
                    fontSize: '20px',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    fontStyle: 'bold'
                });

                this.buffsContainer.add([iconRect, textLabel]);
                
                // Сдвигаем позицию (ширина квадрата + отступ + ширина текста + отступ)
                xPos += 30 + 5 + textLabel.width + 15;
            }
        });
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