import Phaser from 'phaser';
import { NewsEditorPanel } from '../ui/NewsEditorPanel';
import { NewsGenerator } from '../data/NewsGenerator';

export class DeckScene extends Phaser.Scene {
    private editor!: NewsEditorPanel;
    private draftHeadlines: string[] = [];
    private gameData: any; 
    private stepText!: Phaser.GameObjects.Text;

    constructor() { super('DeckScene'); }

    init(data: any) {
        this.gameData = data; // Сохраняем деньги, день и историю
        this.draftHeadlines = [];
    }

    create() {
        const { width, height } = this.scale;
        
        // Фон
        this.add.rectangle(0, 0, width, height, 0x111111).setOrigin(0);
        
        // Заголовок
        this.add.text(20, 20, `DAY ${this.gameData.dayNumber} / PREPARATION`, { 
            fontFamily: 'monospace', fontSize: '20px', color: '#0f0' 
        });

        this.stepText = this.add.text(width/2, 100, 'STEP 1: WRITE 3 HEADLINES', { 
            fontFamily: 'monospace', fontSize: '32px', color: '#fff' 
        }).setOrigin(0.5);

        // Индикатор прогресса (кружочки)
        this.add.circle(width/2 - 40, 150, 10, 0x333333).setName('dot1');
        this.add.circle(width/2, 150, 10, 0x333333).setName('dot2');
        this.add.circle(width/2 + 40, 150, 10, 0x333333).setName('dot3');

        // Редактор
        this.editor = new NewsEditorPanel(this, width/2, height/2 + 50, 500, 300, (text) => {
            this.handleInput(text);
        });

        // Слушаем клавиатуру
        this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.editor.handleInput(e));

        // Открываем редактор для первой новости
        this.openNextSlot();
    }

    private openNextSlot() {
        const num = this.draftHeadlines.length + 1;
        // Можно обновить заголовок редактора, если добавить метод setPrompt
        this.editor.open();
    }

    private handleInput(text: string) {
        this.editor.hide();
        this.draftHeadlines.push(text);

        // Красим индикатор
        const dot = this.children.getByName(`dot${this.draftHeadlines.length}`) as Phaser.GameObjects.Arc;
        if (dot) dot.setFillStyle(0x00ff00);

        if (this.draftHeadlines.length < 3) {
            this.time.delayedCall(200, () => this.openNextSlot());
        } else {
            this.startAnalysis();
        }
    }

    private async startAnalysis() {
        this.stepText.setText("AI ANALYZING MARKET IMPACT...");
        
        // Показываем лоадер (просто текст по центру)
        const loading = this.add.text(this.scale.width/2, this.scale.height/2, 'PLEASE WAIT', {
            fontSize: '48px', color: '#0f0', backgroundColor: '#000', padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // Запрос к AI
        const newsItems = await NewsGenerator.analyzeBatch(this.draftHeadlines);
        
        loading.destroy();

        // Переход в игру
        this.scene.start('MainGame', {
            ...this.gameData,
            playerNews: newsItems // Передаем готовые новости
        });
    }
}