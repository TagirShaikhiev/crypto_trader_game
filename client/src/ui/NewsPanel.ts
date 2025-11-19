import Phaser from 'phaser';
import { BasePanel } from './BasePanel';
import { NewsType } from '../data/NewsData';

export class NewsPanel extends BasePanel {
    private onOpenEditor: () => void; // Новый колбэк
    
    private newsLog: Phaser.GameObjects.Text[] = [];
    private readonly MAX_LOG_SIZE = 20;

    // constructor сигнатура изменилась!
    constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onOpenEditor: () => void) {
        super(scene, x, y, w, h, 0x222222);
        this.onOpenEditor = onOpenEditor;

        this.add(scene.add.text(20, 20, 'NEWS FEED', { fontSize: '20px', color: '#aaa', fontFamily: 'monospace' }));
        this.add(scene.add.rectangle(0, 50, w, 2, 0x444444).setOrigin(0));

        // ОДНА БОЛЬШАЯ КНОПКА
        this.createMainButton(135, h - 50, w - 40, 60, 'WRITE ARTICLE');
    }

    // ... logNews() ОСТАЕТСЯ БЕЗ ИЗМЕНЕНИЙ (копируй из прошлого урока) ...
    public logNews(text: string, type: NewsType) {
        let color = '#ffffff';
        if (type === 'GOOD') color = '#00ff00';
        if (type === 'BAD') color = '#ff0000';
        if (type === 'NEUTRAL') color = '#aaaaaa';

        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit"});
        const fullText = `[${time}] ${text}`;

        const newTextObj = this.scene.add.text(15, 0, fullText, {
            fontSize: '12px', color: color, fontFamily: 'monospace', wordWrap: { width: 250 }
        });
        this.add(newTextObj);
        this.newsLog.push(newTextObj);

        if (this.newsLog.length > this.MAX_LOG_SIZE) {
            const old = this.newsLog.shift();
            old?.destroy();
        }

        let currentY = 60;
        this.newsLog.forEach(msg => {
            msg.y = currentY;
            currentY += (msg.height + 5);
        });
    }

    private createMainButton(x: number, y: number, w: number, h: number, text: string) {
        const btn = this.scene.add.rectangle(0, 0, w, h, 0x0088cc).setInteractive({ useHandCursor: true });
        const label = this.scene.add.text(0, 0, text, { 
            fontSize: '20px', fontStyle: 'bold', fontFamily: 'monospace' 
        }).setOrigin(0.5);

        const container = this.scene.add.container(x, y, [btn, label]);
        this.add(container);

        btn.on('pointerdown', () => {
            this.scene.tweens.add({ targets: container, scale: 0.95, duration: 50, yoyo: true });
            this.onOpenEditor(); // Вызываем открытие редактора
        });
    }
}