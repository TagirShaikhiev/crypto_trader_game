import Phaser from 'phaser';

export class BasePanel extends Phaser.GameObjects.Container {
    protected bg: Phaser.GameObjects.Rectangle;
    width: number;
    height: number;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color: number) {
        super(scene, x, y);
        this.scene.add.existing(this);
        
        this.width = width;
        this.height = height;

        // 1. Фон панели
        // setOrigin(0) важно, чтобы координаты внутри контейнера начинались с 0,0
        this.bg = scene.add.rectangle(0, 0, width, height, color).setOrigin(0);
        this.add(this.bg);

        // 2. Маска (Обрезание контента)
        // Создаем невидимую фигуру точно по размеру панели
        const maskShape = scene.make.graphics({}).fillRect(x, y, width, height);
        const mask = maskShape.createGeometryMask();
        this.setMask(mask);
        
        // 3. Рамка (обводка) для красоты
        const border = scene.add.rectangle(0, 0, width, height).setOrigin(0);
        border.setStrokeStyle(1, 0x333333);
        this.add(border);
    }
}