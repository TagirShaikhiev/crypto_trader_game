import Phaser from 'phaser';

export class TopBar extends Phaser.GameObjects.Container {
    private bar: Phaser.GameObjects.Rectangle;
    private bg: Phaser.GameObjects.Rectangle;
    private fullWidth: number;

    constructor(scene: Phaser.Scene, width: number) {
        super(scene, 0, 0);
        this.scene.add.existing(this);
        this.setDepth(100); // Поверх всего

        this.fullWidth = width;

        // Фон (серый)
        this.bg = scene.add.rectangle(0, 0, width, 10, 0x333333).setOrigin(0);
        
        // Активная полоска
        this.bar = scene.add.rectangle(0, 0, width, 10, 0x00ff00).setOrigin(0);

        this.add([this.bg, this.bar]);
    }

    // progress: от 1.0 (начало) до 0.0 (конец)
    public setProgress(progress: number) {
        // Ограничиваем
        const p = Phaser.Math.Clamp(progress, 0, 1);
        
        // Ширина
        this.bar.width = this.fullWidth * p;

        // Цвет (Зеленый -> Желтый -> Красный)
        // Простая логика: если < 30% — красный, иначе зеленый
        if (p < 0.2) this.bar.setFillStyle(0xff0000);
        else if (p < 0.5) this.bar.setFillStyle(0xffff00);
        else this.bar.setFillStyle(0x00ff00);
    }
}