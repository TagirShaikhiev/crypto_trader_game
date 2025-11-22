import Phaser from 'phaser';

interface MatrixRainColumn {
    container: Phaser.GameObjects.Container;
    charTexts: Phaser.GameObjects.Text[];
    trailLength: number;
    speed: number;
    headCharIndex: number;
    randomCharTimer: number;
    randomCharDelay: number;
    whiteCharDelay: number;
}

export class MatrixEffect {
    private scene: Phaser.Scene;
    private columns: MatrixRainColumn[] = [];
    private fontSize: number;
    private maxVisibleChars: number = 0;
    
    // Набор символов будет генерироваться динамически
    private chars: string[] = [];

    constructor(scene: Phaser.Scene, fontSize: number = 16) {
        this.scene = scene;
        this.fontSize = fontSize;
        this.initCharSet();
        this.create();
    }

    private initCharSet() {
        this.chars = []; // Очищаем на всякий случай

        // 1. Латиница и Цифры
        const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        this.chars.push(...latin.split(''));

        // 2. КИРИЛЛИЦА (Русский алфавит)
        const cyrillic = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
        this.chars.push(...cyrillic.split(''));

        // 3. Спецсимволы (Матричный стиль + Валюты)
        // Добавил значки валют, так как игра про трейдинг
        const specials = '$+-*/=%""\'#&_(),.;:?!\\|{}<>[]^~£€¥₿'; 
        this.chars.push(...specials.split(''));
        this.chars.push('хуй');
        this.chars.push('Артур');
        this.chars.push('пидор');
        this.chars.push('че');
        this.chars.push('геи');
        this.chars.push('Z');
        this.chars.push('ZOV');
        this.chars.push('SVO');
        this.chars.push('БЭБ');
        // 4. Полуширинная Катакана (Классика из фильма)
        for (let i = 0xFF66; i <= 0xFF9D; i++) {
            this.chars.push(String.fromCharCode(i));
        }
    }

    private create() {
        const { width, height } = this.scene.scale;
        this.maxVisibleChars = Math.floor(height / this.fontSize) + 5;
        const columnCount = Math.floor(width / this.fontSize);

        for (let i = 0; i < columnCount; i++) {
            const trailLength = Phaser.Math.Between(10, Math.floor(this.maxVisibleChars / 1.5));
            const columnX = i * this.fontSize;
            const startY = Phaser.Math.Between(-height * 1.5, -height * 0.5); // Начинаем выше

            const container = this.scene.add.container(columnX, startY);
            const charTexts: Phaser.GameObjects.Text[] = [];

            for (let j = 0; j < trailLength; j++) {
                const char = this.createChar(j);
                container.add(char);
                charTexts.push(char);
            }

            this.columns.push({
                container: container,
                charTexts: charTexts,
                trailLength: trailLength,
                speed: Phaser.Math.Between(1, 5), // Скорость
                headCharIndex: 0,
                randomCharTimer: Phaser.Math.Between(0, 1000),
                randomCharDelay: Phaser.Math.Between(50, 200),
                whiteCharDelay: Phaser.Math.Between(100, 300)
            });
        }
    }

    // Метод обновления (нужно вызывать в scene.update)
    public update(time: number, delta: number) {
        const { height } = this.scene.scale;

        this.columns.forEach(col => {
            // 1. Движение
            col.container.y += col.speed;

            // 2. Мерцание случайных символов
            col.randomCharTimer += delta;
            if (col.randomCharTimer > col.randomCharDelay) {
                const randomIndex = Phaser.Math.Between(1, col.trailLength - 1);
                const char = col.charTexts[randomIndex];
                if (char) {
                    this.updateCharContent(char);
                    char.setAlpha(1 - (randomIndex / col.trailLength) * 0.9);
                }
                col.randomCharTimer = 0;
            }

            // 3. Эффект белой головы
            col.whiteCharDelay -= delta;
            if (col.whiteCharDelay <= 0) {
                const prevChar = col.charTexts[col.headCharIndex];
                if (prevChar) prevChar.setColor('#00ff00');

                col.headCharIndex = (col.headCharIndex + 1) % col.trailLength;
                const headChar = col.charTexts[col.headCharIndex];
                
                if (headChar) {
                    headChar.setColor('#ccffcc'); // Почти белый
                    headChar.setAlpha(1);
                    this.updateCharContent(headChar);
                    // Белая голова всегда жирная
                    headChar.setFontStyle('bold');
                }
                col.whiteCharDelay = Phaser.Math.Between(50, 150);
            }

            // 4. Респаун (если ушла за экран)
            if (col.container.y > height) {
                col.container.y = -col.container.height - Phaser.Math.Between(10, 100);
                
                // Немного меняем длину хвоста для разнообразия
                const newLength = Phaser.Math.Between(10, Math.floor(this.maxVisibleChars / 1.5));
                
                // Пересобираем колонку (удаляем лишнее или добавляем)
                this.resizeColumn(col, newLength);
                
                col.speed = Phaser.Math.Between(2, 5); // Меняем скорость
            }
        });
    }

    // Создание одного символа
    private createChar(index: number): Phaser.GameObjects.Text {
        const char = this.scene.add.text(0, index * this.fontSize, this.getRandomChar(), {
            fontSize: `${this.fontSize}px`,
            color: '#00ff00',
            fontFamily: 'monospace'
        }).setOrigin(0);
        
        // ЗЕРКАЛИРОВАНИЕ!
        // 50% шанс, что символ будет отзеркален по горизонтали
        char.setFlipX(Math.random() < 0.5);

        // Прозрачность хвоста
        char.setAlpha(0); 

        return char;
    }

    // Обновление текста и зеркалирования существующего объекта
    private updateCharContent(textObj: Phaser.GameObjects.Text) {
        textObj.setText(this.getRandomChar());
        textObj.setFlipX(Math.random() < 0.5);
    }

    // Пересборка колонки при респауне (оптимизация)
    private resizeColumn(col: MatrixRainColumn, newLength: number) {
        // Если новая длина меньше, удаляем лишние
        while (col.charTexts.length > newLength) {
            const char = col.charTexts.pop();
            char?.destroy();
        }
        // Если новая длина больше, добавляем новые
        while (col.charTexts.length < newLength) {
            const char = this.createChar(col.charTexts.length);
            col.container.add(char);
            col.charTexts.push(char);
        }
        
        // Сброс альфы для нового хвоста
        col.charTexts.forEach((char, i) => {
             char.setAlpha(1 - (i / newLength) * 0.9);
             char.setColor('#00ff00');
        });

        col.trailLength = newLength;
        col.headCharIndex = 0;
    }

    private getRandomChar(): string {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}