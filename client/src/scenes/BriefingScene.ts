import Phaser from 'phaser';
import { getItemById } from '../data/ShopData';


export class BriefingScene extends Phaser.Scene {
    private dayNumber: number = 1;
    private cash: number = 10000;
    private heat: number = 0;
    private inventory: string[] = [];

    constructor() {
        super('BriefingScene');
    }

    init(data: any) {
        this.dayNumber = data.dayNumber || 1;
        this.cash = data.cash || 10000;
        this.heat = data.heat || 0;
        this.inventory = data.inventory || [];
    }

    create() {
        const { width, height } = this.scale;

        // Фон
        this.add.rectangle(0, 0, width, height, 0x0a0a0a).setOrigin(0);

        // --- ЗАГОЛОВОК ---
        this.add.text(width/2, 80, `/// DAY ${this.dayNumber} BRIEFING ///`, {
            fontSize: '32px', color: '#00ff00', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5);

        // --- СТАТИСТИКА ИГРОКА (Слева) ---
        const startX = 100;
        let startY = 180;
        
        this.addStat(startX, startY, 'CURRENT BALANCE', `$${this.cash.toFixed(0)}`);
        this.addStat(startX, startY + 80, 'HEAT LEVEL', `${this.heat}%`, this.heat > 50 ? '#ff0000' : '#00ff00');
        this.addStat(startX, startY + 160, 'TARGET', 'SURVIVE', '#aaaaaa');

        // --- ИНВЕНТАРЬ / АКТИВНЫЕ ЭФФЕКТЫ (Справа) ---
        const invX = width / 2 + 50;
        
        this.add.text(invX, startY, 'ACTIVE LOADOUT:', { 
            fontSize: '20px', color: '#888', fontFamily: 'monospace' 
        });

        // Группируем предметы (считаем количество)
        const counts: { [key: string]: number } = {};
        this.inventory.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

        let itemY = startY + 40;
        const itemIds = Object.keys(counts);

        if (itemIds.length === 0) {
            this.add.text(invX, itemY, '- No active effects -', { fontSize: '16px', color: '#444', fontFamily: 'monospace' });
        } else {
            itemIds.forEach(id => {
                const item = getItemById(id);
                if (item) {
                    const count = counts[id];
                    const countStr = count > 1 ? ` x${count}` : '';
                    
                    this.add.text(invX, itemY, `${item.icon} ${item.name}${countStr}`, { 
                        fontSize: '18px', color: '#fff', fontFamily: 'monospace' 
                    });
                    
                    // Краткое описание эффекта
                    this.add.text(invX + 30, itemY + 25, `> ${item.description}`, { 
                        fontSize: '12px', color: '#666', fontFamily: 'monospace' 
                    });

                    itemY += 60;
                }
            });
        }

        // --- КНОПКА СТАРТА ---
        const btn = this.add.rectangle(width/2, height - 100, 300, 60, 0x00aa00).setInteractive({useHandCursor:true});
        this.add.text(width/2, height - 100, 'ENTER MARKET >', { fontSize: '24px', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);

        btn.on('pointerdown', () => {
            this.scene.start('DeckScene', { 
                dayNumber: this.dayNumber, 
                cash: this.cash, 
                heat: this.heat,
                inventory: this.inventory
                // + история графика, если она была
            });
        });
    }

    private addStat(x: number, y: number, label: string, value: string, color: string = '#fff') {
        this.add.text(x, y, label, { fontSize: '14px', color: '#666', fontFamily: 'monospace' });
        this.add.text(x, y + 20, value, { fontSize: '32px', color: color, fontFamily: 'monospace', fontStyle: 'bold' });
    }
}