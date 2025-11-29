import Phaser from 'phaser';
import { BasePanel } from './BasePanel';
import { MarketSimulation, MarkerType } from '../logic/MarketSimulation';

export class ChartPanel extends BasePanel {
    private simulation: MarketSimulation;
    private graphics: Phaser.GameObjects.Graphics;
    private scanlinesGraphics: Phaser.GameObjects.Graphics;
    private priceText: Phaser.GameObjects.Text;
    public showPrediction = false; // Флаг
    
    private lineColor = 0x00ff00; 

    constructor(
        scene: Phaser.Scene, x: number, y: number, width: number, height: number, 
        simulation: MarketSimulation
    ) {
        super(scene, x, y, width, height, 0x0a0a0a);
        this.simulation = simulation;

        this.graphics = scene.add.graphics();
        this.add(this.graphics);

        this.scanlinesGraphics = scene.add.graphics();
        this.add(this.scanlinesGraphics);
        this.drawScanlines(width, height);

        this.priceText = scene.add.text(width - 20, 20, '$100.00', {
            fontSize: '36px', color: '#fff', fontStyle: 'bold', fontFamily: 'monospace'
        }).setOrigin(1, 0);
        this.priceText.setShadow(0, 0, '#ffffff', 6, true, true);
        this.add(this.priceText);
    }

    public updateView() {
        this.draw();
        this.updateUI();
    }

    private draw() {
        this.graphics.clear();
        const history = this.simulation.priceHistory;
        const markers = this.simulation.markers;
        const maxPoints = this.simulation.maxPoints;

        if (history.length < 2) return;

        const w = this.width;
        const h = this.height;
        const padding = h * 0.2;

        // 1. Масштабирование (С учетом всей истории раунда)
        let min = Math.min(...history);
        let max = Math.max(...history);
        // Не учитываем currentPrice отдельно, так как она уже в истории
        if (min === max) { min -= 0.5; max += 0.5; }

        const spread = max - min;
        const visualRange = Math.max(spread, 5); 
        const center = (max + min) / 2;
        const drawMin = center - visualRange / 2;
        const scaleY = (h - padding * 2) / visualRange;
        const getY = (price: number) => h - padding - (price - drawMin) * scaleY;

        // 2. Шаг по X фиксирован: Ширина / (Макс точек за раунд)
        const stepX = w / maxPoints; 

        // Рисуем линию
        this.graphics.lineStyle(4, this.lineColor, 1);
        this.graphics.beginPath();

        // Рисуем ВСЮ историю от 0 до текущего момента
        for (let i = 0; i < history.length; i++) {
            const x = i * stepX;
            const y = getY(history[i]);
            if (i === 0) this.graphics.moveTo(x, y);
            else this.graphics.lineTo(x, y);
        }
        this.graphics.strokePath();

        // Рисуем маркеры
        markers.forEach(m => {
             const mx = m.index * stepX;
             const my = getY(m.price);
             
             let color = 0xffffff;
             if (m.type === 'BUY') color = 0x00ff00; 
             if (m.type === 'SELL') color = 0xff0000; 
             if (m.type.includes('NEWS')) color = 0xffff00; 
             
             this.graphics.fillStyle(color);
             this.graphics.fillRect(mx - 4, my - 4, 8, 8); 
             
             this.graphics.lineStyle(1, color, 0.3);
             this.graphics.beginPath();
             this.graphics.moveTo(mx, my);
             this.graphics.lineTo(mx, m.type === 'BUY' ? h : 0);
             this.graphics.strokePath();
        });

        // Фонарик на конце
        const lastX = (history.length - 1) * stepX;
        const curY = getY(history[history.length - 1]);
        this.graphics.fillStyle(0xffffff);
        this.graphics.fillRect(lastX - 3, curY - 3, 6, 6);
        
        // Пунктир цены
        this.drawDashedLine(0, curY, w, curY);
        if (this.showPrediction) {
            this.drawPrediction();
        }
    }

    private drawDashedLine(x1: number, y1: number, x2: number, y2: number) {
        this.graphics.lineStyle(1, 0xffffff, 0.2);
        const dash = 4; const gap = 4;
        const steps = Phaser.Math.Distance.Between(x1, y1, x2, y2) / (dash + gap);
        for (let i = 0; i < steps; i++) {
            const startX = Phaser.Math.Linear(x1, x2, i / steps);
            const endX = Phaser.Math.Linear(x1, x2, (i + 0.5) / steps);
             this.graphics.beginPath();
             this.graphics.moveTo(startX, y1);
             this.graphics.lineTo(endX, y2);
             this.graphics.strokePath();
        }
    }

    private drawScanlines(w: number, h: number) {
        this.scanlinesGraphics.lineStyle(1, 0x000000, 0.3);
        for (let i = 0; i < h; i += 4) {
            this.scanlinesGraphics.moveTo(0, i);
            this.scanlinesGraphics.lineTo(w, i);
        }
        this.scanlinesGraphics.strokePath();
    }

    private drawPrediction() {
        // Мы знаем targetTrend из симуляции (если передадим его сюда)
        // Но ChartPanel "глупая", она не знает будущего.
        // Поэтому "Инсайд" проще реализовать, если Simulation будет отдавать "будущие точки".
        
        // ХАК ДЛЯ ВИЗУАЛА:
        // Просто рисуем линию от текущей цены в сторону текущего тренда
        // simulation.trend мы не видим напрямую, но можем передать.
        
        // Давай сделаем проще: MainGame будет говорить чарту "нарисуй стрелку"
    }
    
    private updateUI() {
        const current = this.simulation.currentPrice;
        this.priceText.setText(`$${current.toFixed(2)}`);
        const startPrice = this.simulation.priceHistory[0] || current;
        const col = current >= startPrice ? '#00ff00' : '#ff0000';
        this.priceText.setColor(col);
        this.priceText.setShadow(0, 0, col, 10, true, true);
    }
}