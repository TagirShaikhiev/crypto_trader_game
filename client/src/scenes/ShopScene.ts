import Phaser from 'phaser';
import { SHOP_ITEMS, ShopItem, getItemById } from '../data/ShopData';
import { gameState } from '../logic/GameState';

export class ShopScene extends Phaser.Scene {
    private cashText!: Phaser.GameObjects.Text;
    private heatText!: Phaser.GameObjects.Text;
    private itemsContainer!: Phaser.GameObjects.Container;

    constructor() { super('ShopScene'); }

    create() {
        const { width, height } = this.scale;
        
        // 1. Фон (Терминальный стиль)
        this.add.rectangle(0, 0, width, height, 0x0a0a0a).setOrigin(0);
        
        // Заголовок
        this.add.text(40, 40, 'DARKNET MARKET', { fontSize: '42px', color: '#00ff00', fontFamily: 'monospace', fontStyle: 'bold' })
            .setShadow(0, 0, '#0f0', 8, true, true);
        this.add.text(40, 90, 'Spend money to survive another day.', { fontSize: '20px', color: '#888', fontFamily: 'monospace' });

        // 2. Статус Игрока (Справа сверху)
        // Баланс
        this.add.text(width - 300, 40, 'BALANCE:', { fontSize: '14px', color: '#aaa', fontFamily: 'monospace' });
        this.cashText = this.add.text(width - 40, 60, `$${gameState.cash.toFixed(0)}`, { 
            fontSize: '36px', color: '#fff', fontFamily: 'monospace', fontStyle: 'bold' 
        }).setOrigin(1, 0);

        // Heat (Важно видеть, чтобы покупать взятки)
        this.add.text(width - 300, 110, 'HEAT LEVEL:', { fontSize: '14px', color: '#aaa', fontFamily: 'monospace' });
        this.heatText = this.add.text(width - 40, 130, `${gameState.heat}%`, { 
            fontSize: '36px', color: gameState.heat > 50 ? '#ff0000' : '#00ff00', fontFamily: 'monospace', fontStyle: 'bold' 
        }).setOrigin(1, 0);

        // 3. Список товаров
        this.itemsContainer = this.add.container(40, 200);
        
        SHOP_ITEMS.forEach((item, index) => {
            this.createItemRow(item, index);
        });

        // 4. Кнопка NEXT DAY (Внизу справа)
        const nextBtn = this.add.rectangle(width - 200, height - 80, 300, 60, 0x003366).setInteractive({useHandCursor:true});
        nextBtn.setStrokeStyle(1, 0x0088cc);
        const nextTxt = this.add.text(width - 200, height - 80, 'START NEXT DAY >', { fontSize: '24px', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);
        
        nextBtn.on('pointerdown', () => {
            this.tweens.add({ targets: [nextBtn, nextTxt], scale: 0.95, duration: 100, yoyo: true, onComplete: () => {
                // Увеличиваем день
                gameState.day++;
                // Идем в брифинг
                this.scene.start('BriefingScene');
            }});
        });

        // Hover эффект
        nextBtn.on('pointerover', () => nextBtn.setFillStyle(0x004488));
        nextBtn.on('pointerout', () => nextBtn.setFillStyle(0x003366));
    }

    private createItemRow(item: ShopItem, index: number) {
        const y = index * 100; // Высота строки
        const w = this.scale.width - 80;

        // Фон строки
        const bg = this.add.rectangle(0, y, w, 80, 0x111111).setOrigin(0).setStrokeStyle(1, 0x333333);
        this.itemsContainer.add(bg);

        // Иконка
        const icon = this.add.text(30, y + 40, item.icon, { fontSize: '40px' }).setOrigin(0.5);
        this.itemsContainer.add(icon);

        // Инфо
        const name = this.add.text(80, y + 20, item.name, { fontSize: '24px', color: '#fff', fontFamily: 'monospace', fontStyle: 'bold' });
        const desc = this.add.text(80, y + 55, item.description, { fontSize: '16px', color: '#888', fontFamily: 'monospace' });
        this.itemsContainer.add([name, desc]);

        // Цена
        const price = this.add.text(w - 160, y + 40, `$${item.price}`, { 
            fontSize: '24px', color: '#00ff00', fontFamily: 'monospace' 
        }).setOrigin(1, 0.5);
        this.itemsContainer.add(price);

        // Кнопка BUY
        const btn = this.add.rectangle(w - 60, y + 40, 100, 40, 0x222222).setInteractive({useHandCursor:true});
        btn.setStrokeStyle(1, 0x666666);
        const btnTxt = this.add.text(w - 60, y + 40, 'BUY', { fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5);
        this.itemsContainer.add([btn, btnTxt]);

        // Проверка: куплено ли уже?
        this.updateButtonState(item, btn, btnTxt);

        btn.on('pointerdown', () => {
            if (gameState.spendMoney(item.price)) {
                this.buyItem(item, btn, btnTxt);
            } else {
                // Анимация "Нет денег"
                this.tweens.add({
                    targets: [price], scale: 1.2, duration: 100, yoyo: true,
                    onStart: () => price.setColor('#ff0000'),
                    onComplete: () => price.setColor('#00ff00')
                });
            }
        });
        
        // Hover
        btn.on('pointerover', () => { if(btn.alpha === 1) btn.setFillStyle(0x333333); });
        btn.on('pointerout', () => { if(btn.alpha === 1) btn.setFillStyle(0x222222); });
    }

    private updateButtonState(item: ShopItem, btn: Phaser.GameObjects.Rectangle, txt: Phaser.GameObjects.Text) {
        // Если предмет перманентный и уже есть в инвентаре
        const isOwned = !item.oneTime && gameState.inventory.includes(item.id);
        
        if (isOwned) {
            btn.disableInteractive().setAlpha(0.5);
            txt.setText("OWNED").setColor("#666");
        }
    }

    private buyItem(item: ShopItem, btn: Phaser.GameObjects.Rectangle, txt: Phaser.GameObjects.Text) {
        // Обновляем UI баланса
        this.cashText.setText(`$${gameState.cash.toFixed(0)}`);

        // Добавляем в инвентарь
        gameState.inventory.push(item.id);

        // Визуальная реакция
        this.tweens.add({ targets: btn, scale: 0.95, duration: 50, yoyo: true });

        // Если расходник (Взятка)
        if (item.oneTime) {
            const originalText = txt.text;
            txt.setText("SOLD!").setColor("#0f0");
            this.time.delayedCall(800, () => {
                txt.setText(originalText).setColor("#fff");
            });

            // МГНОВЕННЫЕ ЭФФЕКТЫ
            if (item.id === 'bribe_small') gameState.changeHeat(-20);
            if (item.id === 'bribe_big') gameState.changeHeat(-50);
            if (item.id === 'coffee') { /* просто звук глотка */ }
            
            // Обновляем текст Heat
            this.heatText.setText(`${gameState.heat}%`);
            this.heatText.setColor(gameState.heat > 50 ? '#ff0000' : '#00ff00');

        } else {
            // Если перманентный - блокируем кнопку
            this.updateButtonState(item, btn, txt);
        }
    }
}