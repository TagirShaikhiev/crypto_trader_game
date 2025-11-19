import Phaser from 'phaser';
import { BasePanel } from './BasePanel';
import { NewsType } from '../data/NewsData';

export class NewsEditorPanel extends BasePanel {
    private inputText: Phaser.GameObjects.Text;
    private currentText = "";
    private cursor: Phaser.GameObjects.Text;
    
    // Элементы загрузки
    private statusText: Phaser.GameObjects.Text;
    private publishBtn: Phaser.GameObjects.Container;
    private isProcessing = false; // Блокировка ввода во время отправки

    // Обрати внимание: колбэк теперь принимает только текст (тип определит AI)
    private onSubmit: (text: string) => void;

    constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onSubmit: (text: string) => void) {
        super(scene, x, y, w, h, 0x000000);
        this.onSubmit = onSubmit;
        this.setVisible(false);
        this.setDepth(200);

        // Фон-затемнение
        this.add(scene.add.rectangle(-x, -y, 1280, 720, 0x000000, 0.8).setOrigin(0));
        
        // Рамка
        this.add(scene.add.rectangle(0, 0, w, h, 0x222222).setOrigin(0).setStrokeStyle(2, 0x444444));

        // Заголовок
        this.add(scene.add.text(w/2, 30, 'NEWS EDITOR', { fontSize: '24px', fontStyle: 'bold', fontFamily: 'monospace' }).setOrigin(0.5));

        // Поле ввода
        const inputBg = scene.add.rectangle(20, 80, w - 40, 100, 0x000000).setOrigin(0).setStrokeStyle(1, 0x666666);
        this.add(inputBg);

        this.inputText = scene.add.text(30, 90, "", { 
            fontSize: '24px', fontFamily: 'monospace', color: '#fff', wordWrap: { width: w - 60 } 
        });
        this.add(this.inputText);

        // Курсор
        this.cursor = scene.add.text(30, 90, '|', { fontSize: '24px', color: '#0f0' });
        this.add(this.cursor);
        scene.tweens.add({ targets: this.cursor, alpha: 0, duration: 500, yoyo: true, repeat: -1 });

        // --- КНОПКА ПУБЛИКАЦИИ ---
        this.publishBtn = this.createButton(w/2, 240, 200, 50, 'PUBLISH', 0x0088cc, () => this.submit());
        
        // --- ТЕКСТ СТАТУСА (Скрыт по умолчанию) ---
        this.statusText = scene.add.text(w/2, 240, 'AI ANALYZING...', { 
            fontSize: '20px', color: '#0f0', fontFamily: 'monospace' 
        }).setOrigin(0.5).setVisible(false);
        this.add(this.statusText);
    }

    // Включаем/Выключаем режим загрузки
    public setLoading(isLoading: boolean) {
        this.isProcessing = isLoading;
        this.publishBtn.setVisible(!isLoading); // Скрываем кнопку
        this.statusText.setVisible(isLoading);  // Показываем текст
        this.cursor.setVisible(!isLoading);     // Скрываем курсор
    }

    public open() {
        this.setVisible(true);
        this.currentText = "";
        this.setLoading(false); // Сброс состояния
        this.updateText();
    }

    public handleInput(e: KeyboardEvent) {
        if (!this.visible || this.isProcessing) return; // Блокируем ввод при загрузке

        if (e.key === 'Backspace') {
            this.currentText = this.currentText.slice(0, -1);
        } else if (e.key.length === 1) {
            if (this.currentText.length < 60) { // Лимит символов
                this.currentText += e.key;
            }
        }
        this.updateText();
    }

    private updateText() {
        this.inputText.setText(this.currentText);
        // Двигаем курсор (грубо, но работает для моноширины)
        // Для word-wrap сложнее, пока ставим просто в конец текста
        this.cursor.setPosition(this.inputText.x + this.inputText.width, this.inputText.y + this.inputText.height - 24);
    }

    private submit() {
        if (this.currentText.trim().length < 3) return;
        this.setLoading(true); // Включаем анимацию загрузки
        this.onSubmit(this.currentText);
    }

    private createButton(x: number, y: number, w: number, h: number, text: string, color: number, cb: () => void) {
        const btn = this.scene.add.rectangle(0, 0, w, h, color).setInteractive({useHandCursor: true});
        const lbl = this.scene.add.text(0, 0, text, { fontSize: '20px', fontStyle: 'bold' }).setOrigin(0.5);
        const cont = this.scene.add.container(x, y, [btn, lbl]);
        this.add(cont);
        btn.on('pointerdown', cb);
        return cont;
    }

    public hide() {
        this.setVisible(false);
        // Также можно сбросить текст или состояние загрузки здесь
        this.setLoading(false); 
    }
}