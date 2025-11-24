import Phaser from 'phaser';
import { BasePanel } from './BasePanel';
import { NewsType, NewsItem } from '../data/NewsData';

export class NewsPanel extends BasePanel {
    private onPublishNews: (index: number) => void;
    private newsLog: Phaser.GameObjects.Container[] = [];
    private readonly MAX_LOG_SIZE = 12;
    
    // Кнопки для новостей игрока
    private newsButtons: Phaser.GameObjects.Container[] = [];

    constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onPublishNews: (index: number) => void) {
        super(scene, x, y, w, h, 0x111111);
        this.onPublishNews = onPublishNews;

        // Заголовок
        const title = scene.add.text(20, 20, 'NEWS FEED', { 
            fontSize: '22px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold' 
        });
        title.setShadow(0, 0, '#00ff00', 8, true, true);
        this.add(title);
        
        this.add(scene.add.rectangle(0, 55, w, 1, 0x444444).setOrigin(0));
        this.add(scene.add.rectangle(w-2, 0, 2, h, 0x00ff00, 0.3).setOrigin(0));

        // Заголовки для секции кнопок
        this.add(scene.add.text(20, h - 190, "PLANNED NEWS (CLICK TO FIRE):", { 
            fontSize: '12px', color: '#888', fontFamily: 'monospace' 
        }));
    }

    // Метод для создания кнопок после фазы планирования
    public setupPlayerNewsButtons(newsItems: NewsItem[]) {
        // Очищаем старые кнопки, если есть
        this.newsButtons.forEach(btn => btn.destroy());
        this.newsButtons = [];

        const startY = this.height - 160;
        const btnHeight = 45;
        const gap = 10;

        newsItems.forEach((item, index) => {
            const y = startY + index * (btnHeight + gap);
            
            // Цвет зависит от типа (подсказка игроку)
            let color = 0x444444; // Нейтральный серый по умолчанию (пока не нажали)
            // Можно сделать подсветку типа, если AI вернул тип, но интереснее держать интригу
            // или подсвечивать рамку.
            
            const btnBg = this.scene.add.rectangle(0, 0, this.width - 40, btnHeight, 0x222222)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, 0x666666);

            // Обрезаем текст, чтобы влез
            const shortText = item.text.length > 25 ? item.text.substring(0, 22) + '...' : item.text;
            
            const text = this.scene.add.text(0, 0, `${index + 1}. ${shortText}`, {
                fontSize: '14px', fontFamily: 'monospace', color: '#fff'
            }).setOrigin(0.5);

            const container = this.scene.add.container(this.width / 2, y + btnHeight/2, [btnBg, text]);
            this.add(container);
            this.newsButtons.push(container);

            // Логика нажатия
            btnBg.on('pointerdown', () => {
                // Визуально отключаем кнопку
                btnBg.disableInteractive();
                btnBg.setFillStyle(0x000000);
                text.setColor('#444');
                text.setText("PUBLISHED");
                
                // Вызываем колбэк в MainGame
                this.onPublishNews(index);
            });

            // Hover
            btnBg.on('pointerover', () => btnBg.setFillStyle(0x333333));
            btnBg.on('pointerout', () => {
                if (text.text !== "PUBLISHED") btnBg.setFillStyle(0x222222);
            });
        });
    }

    public logNews(text: string, type: NewsType) {
        // ... (старый код лога без изменений) ...
        let color = '#ffffff';
        if (type === 'GOOD') color = '#55ff55';
        if (type === 'BAD') color = '#ff5555';
        if (type === 'NEUTRAL') color = '#aaaaaa';

        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit"});
        const msgContainer = this.scene.add.container(20, 0);
        
        const timeTxt = this.scene.add.text(0, 0, `[${timeStr}]`, { fontSize: '12px', color: '#666666', fontFamily: 'monospace' });
        const contentTxt = this.scene.add.text(0, 16, text, { fontSize: '14px', color: color, fontFamily: 'monospace', wordWrap: { width: 240 } });

        msgContainer.add([timeTxt, contentTxt]);
        const blockHeight = contentTxt.height + 20; 
        msgContainer.setData('height', blockHeight);

        this.add(msgContainer);
        this.newsLog.unshift(msgContainer);

        msgContainer.setAlpha(0);
        msgContainer.x = -50;
        this.scene.tweens.add({ targets: msgContainer, x: 20, alpha: 1, duration: 400, ease: 'Power2' });

        if (this.newsLog.length > this.MAX_LOG_SIZE) {
            const old = this.newsLog.pop();
            old?.destroy();
        }

        let currentY = 70;
        this.newsLog.forEach(msg => {
            msg.y = currentY;
            currentY += msg.getData('height');
        });
    }
}