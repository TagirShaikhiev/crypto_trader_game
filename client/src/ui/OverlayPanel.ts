import Phaser from 'phaser';

export class OverlayPanel extends Phaser.GameObjects.Container {
    private bg: Phaser.GameObjects.Rectangle;
    private titleText: Phaser.GameObjects.Text;
    private subTitleText: Phaser.GameObjects.Text;
    private actionBtn: Phaser.GameObjects.Container;
    private btnText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
        super(scene, x, y);
        this.scene.add.existing(this);
        this.setDepth(100); // Чтобы было поверх всего

        // 1. Фон (Полупрозрачный черный)
        this.bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0);
        this.add(this.bg);

        // 2. Заголовки
        this.titleText = scene.add.text(width / 2, height / 2 - 60, '', {
            fontSize: '48px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'monospace'
        }).setOrigin(0.5);
        
        this.subTitleText = scene.add.text(width / 2, height / 2 - 10, '', {
            fontSize: '20px', color: '#aaaaaa', fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.add([this.titleText, this.subTitleText]);

        // 3. Кнопка действия (пока скрыта)
        this.actionBtn = scene.add.container(width / 2, height / 2 + 80);
        const btnBg = scene.add.rectangle(0, 0, 250, 60, 0x00aa00).setInteractive({ useHandCursor: true });
        this.btnText = scene.add.text(0, 0, 'START', { fontSize: '24px', fontStyle: 'bold', fontFamily: 'monospace' }).setOrigin(0.5);
        
        this.actionBtn.add([btnBg, this.btnText]);
        this.add(this.actionBtn);

        // Анимация пульсации кнопки
        scene.tweens.add({
            targets: this.actionBtn,
            scale: 1.05,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    public show(title: string, subTitle: string, btnText: string, callback: () => void) {
        this.setVisible(true);
        this.titleText.setText(title);
        this.subTitleText.setText(subTitle);
        this.btnText.setText(btnText);

        // Очищаем старые листенеры и ставим новый
        const btnBg = this.actionBtn.getAt(0) as Phaser.GameObjects.Rectangle;
        btnBg.off('pointerdown');
        btnBg.on('pointerdown', () => {
            // Эффект нажатия
            this.scene.tweens.add({
                targets: this.actionBtn,
                scale: 0.9,
                duration: 50,
                yoyo: true,
                onComplete: () => {
                    this.setVisible(false); // Скрываем оверлей
                    callback(); // Запускаем игру
                }
            });
        });
    }

    public hide() {
        this.setVisible(false);
    }
}