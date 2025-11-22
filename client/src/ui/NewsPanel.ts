import Phaser from 'phaser';
import { BasePanel } from './BasePanel';
import { NewsType } from '../data/NewsData';

export class NewsPanel extends BasePanel {
    // Колбэк, который вызывается при нажатии кнопки
    private onAction: () => void;
    
    private newsLog: Phaser.GameObjects.Container[] = [];
    private readonly MAX_LOG_SIZE = 12;
    
    // Ссылка на текст черновика
    private draftText: Phaser.GameObjects.Text; 

    constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onAction: () => void) {
        super(scene, x, y, w, h, 0x111111);
        this.onAction = onAction; // <-- Сохраняем функцию

        // Заголовок
        const title = scene.add.text(20, 20, 'NEWS FEED', { 
            fontSize: '22px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold' 
        });
        title.setShadow(0, 0, '#00ff00', 8, true, true);
        this.add(title);
        
        this.add(scene.add.rectangle(0, 55, w, 1, 0x444444).setOrigin(0));
        this.add(scene.add.rectangle(w-2, 0, 2, h, 0x00ff00, 0.3).setOrigin(0));

        // --- ТЕКСТ ЧЕРНОВИКА ---
        this.add(scene.add.text(20, h - 140, "CURRENT DRAFT:", { 
            fontSize: '12px', color: '#888', fontFamily: 'monospace' 
        }));

        this.draftText = scene.add.text(20, h - 120, "Loading...", { 
            fontSize: '14px', color: '#fff', fontFamily: 'monospace', wordWrap: { width: w - 40 }
        });
        this.add(this.draftText);

        // КНОПКА
        this.createMainButton(20, h - 80, w - 40, 50, '> PUBLISH DRAFT_');
    }

    public setDraft(text: string, type: NewsType) {
        let color = '#ffffff';
        if (type === 'GOOD') color = '#00ff00';
        if (type === 'BAD') color = '#ff0000';
        
        this.draftText.setText(`>> ${text}`);
        this.draftText.setColor(color);
    }

    public logNews(text: string, type: NewsType) {
        let color = '#ffffff';
        if (type === 'GOOD') color = '#55ff55';
        if (type === 'BAD') color = '#ff5555';
        if (type === 'NEUTRAL') color = '#aaaaaa';

        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit"});
        
        const msgContainer = this.scene.add.container(20, 0);
        
        const timeTxt = this.scene.add.text(0, 0, `[${timeStr}]`, {
            fontSize: '12px', color: '#666666', fontFamily: 'monospace'
        });
        
        const contentTxt = this.scene.add.text(0, 16, text, {
            fontSize: '14px', color: color, fontFamily: 'monospace', wordWrap: { width: 240 }
        });

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

    private createMainButton(x: number, y: number, w: number, h: number, text: string) {
        const btn = this.scene.add.rectangle(0, 0, w, h, 0x003366).setInteractive({ useHandCursor: true });
        btn.setStrokeStyle(1, 0x0088cc);
        
        const label = this.scene.add.text(0, 0, text, { 
            fontSize: '18px', fontStyle: 'bold', fontFamily: 'monospace', color: '#00ccff'
        }).setOrigin(0.5);

        const container = this.scene.add.container(x, y, [btn, label]);
        this.add(container);

        btn.on('pointerdown', () => {
            this.scene.tweens.add({ targets: container, scale: 0.95, y: y+2, duration: 50, yoyo: true });
            
            // ВЫЗЫВАЕМ НАШУ ФУНКЦИЮ
            if (this.onAction) {
                this.onAction();
            }
        });

        btn.on('pointerover', () => { btn.setFillStyle(0x004488); label.setShadow(0, 0, '#00ccff', 5, true, true); });
        btn.on('pointerout', () => { btn.setFillStyle(0x003366); label.setShadow(0, 0, '#000', 0); });
    }
}