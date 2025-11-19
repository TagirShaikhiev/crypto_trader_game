import Phaser from 'phaser';

export interface Candle {
    open: number;
    close: number;
    high: number;
    low: number;
}

export class MarketChart {
    private scene: Phaser.Scene;
    private graphics: Phaser.GameObjects.Graphics;
    private priceText: Phaser.GameObjects.Text;

    // Размеры области графика
    private x: number;
    private y: number;
    private width: number;
    private height: number;

    // Данные
    private history: Candle[] = []; 
    private activeCandle: Candle | null = null;
    
    // НАСТРОЙКА РАУНДА
    public readonly maxCandles = 30; // Раунд длится ровно 30 свечей
    public currentPrice = 100;
    public isFinished = false; // Флаг окончания

    private candleTimer = 0;
    private readonly CANDLE_DURATION = 10000; // 10 секунд

    // Рынок
    private trend = 0;
    private volatility = 0.5;
    private targetTrend = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.graphics = this.scene.add.graphics();
        
        this.priceText = this.scene.add.text(x + width - 20, y + 20, '$100.00', {
            fontSize: '32px', color: '#fff', fontStyle: 'bold', fontFamily: 'monospace'
        }).setOrigin(1, 0);

        // Старт первой свечи
        this.startNewCandle(100);
    }

    private startNewCandle(openPrice: number) {
        // Если место кончилось — игра окончена
        if (this.history.length >= this.maxCandles) {
            this.isFinished = true;
            this.activeCandle = null; // Больше не рисуем активную часть
            return;
        }

        this.activeCandle = {
            open: openPrice,
            close: openPrice,
            high: openPrice,
            low: openPrice
        };
        this.candleTimer = 0;
    }

    public update(delta: number) {
        if (this.isFinished || !this.activeCandle) return;

        this.candleTimer += delta;

        // Движение цены
        const noise = (Math.random() - 0.5) * this.volatility;
        const movement = noise + (this.trend * 0.1);
        
        let newPrice = this.currentPrice + movement;
        this.currentPrice = newPrice;

        // Обновляем активную свечу
        this.activeCandle.close = newPrice;
        if (newPrice > this.activeCandle.high) this.activeCandle.high = newPrice;
        if (newPrice < this.activeCandle.low) this.activeCandle.low = newPrice;

        // Если время вышло — фиксируем свечу
        if (this.candleTimer >= this.CANDLE_DURATION) {
            this.finalizeCandle();
        }

        this.trend = Phaser.Math.Linear(this.trend, this.targetTrend, 0.01);
        
        this.draw();
        this.updateUI();
    }

    private finalizeCandle() {
        if (this.activeCandle) {
            this.history.push({ ...this.activeCandle });
            // ВАЖНО: Мы НЕ удаляем старые свечи (shift), они остаются на экране
            this.startNewCandle(this.activeCandle.close);
            this.draw(); // Перерисовка сразу после фиксации
        }
    }

    // --- API ---
    public manipulate(impact: number) {
        if (this.isFinished) return;
        this.trend += impact;
        this.currentPrice += impact * 0.5; 
    }

    public setMarketMood(trendType: 'BEAR' | 'FLAT' | 'BULL') {
        switch (trendType) {
            case 'BEAR': this.targetTrend = -2; break;
            case 'FLAT': this.targetTrend = 0; break;
            case 'BULL': this.targetTrend = 2; break;
        }
    }

    // --- ГЛАВНАЯ МАГИЯ: ОТРИСОВКА С АВТО-МАСШТАБОМ ---
    private draw() {
        this.graphics.clear();
        
        const allCandles = this.activeCandle ? [...this.history, this.activeCandle] : [...this.history];
        if (allCandles.length === 0) return;

        // 1. Ищем границы цен (Min/Max) на текущем экране
        let minPrice = Infinity;
        let maxPrice = -Infinity;

        allCandles.forEach(c => {
            if (c.low < minPrice) minPrice = c.low;
            if (c.high > maxPrice) maxPrice = c.high;
        });

        // Добавляем отступы сверху и снизу (padding), чтобы график не прилипал к краям
        const padding = (maxPrice - minPrice) * 0.2; // 20% запаса
        // Защита от деления на ноль, если график плоский
        const safeMin = minPrice - (padding || 1);
        const safeMax = maxPrice + (padding || 1);
        const priceRange = safeMax - safeMin;

        // 2. Вычисляем коэффициент растяжения по высоте
        // pixelHeight = (Price - Min) * scaleY
        const scaleY = this.height / priceRange;

        // 3. Параметры ширины (фиксированные, так как кол-во свечей известно)
        // Отнимаем немного места на отступы между свечами
        const candleWidth = (this.width / this.maxCandles) * 0.8;
        const spacing = (this.width / this.maxCandles) * 0.2;

        allCandles.forEach((candle, index) => {
            const x = this.x + index * (candleWidth + spacing);
            
            // Конвертируем Цену в Пиксели Y
            // (this.y + this.height) - это низ графика. Мы отнимаем высоту цены.
            const yOpen = (this.y + this.height) - (candle.open - safeMin) * scaleY;
            const yClose = (this.y + this.height) - (candle.close - safeMin) * scaleY;
            const yHigh = (this.y + this.height) - (candle.high - safeMin) * scaleY;
            const yLow = (this.y + this.height) - (candle.low - safeMin) * scaleY;

            const isGreen = candle.close >= candle.open;
            const color = isGreen ? 0x00ff00 : 0xff0000;
            const isActive = (this.activeCandle && index === allCandles.length - 1);

            this.graphics.lineStyle(isActive ? 2 : 1, color);
            this.graphics.fillStyle(color);

            // Фитиль
            this.graphics.beginPath();
            this.graphics.moveTo(x + candleWidth/2, yHigh);
            this.graphics.lineTo(x + candleWidth/2, yLow);
            this.graphics.strokePath();

            // Тело
            const bodyY = Math.min(yOpen, yClose);
            let bodyHeight = Math.max(Math.abs(yOpen - yClose), 1);
            
            this.graphics.fillRect(x, bodyY, candleWidth, bodyHeight);

            // Пульсация активной цены (белая линия уровня)
            if (isActive) {
                this.graphics.lineStyle(1, 0xffffff, 0.3);
                this.graphics.beginPath();
                this.graphics.moveTo(this.x, yClose);
                this.graphics.lineTo(this.x + this.width, yClose);
                this.graphics.strokePath();
            }
        });
    }

    private updateUI() {
        this.priceText.setText(`$${this.currentPrice.toFixed(2)}`);
        if (this.activeCandle) {
            this.priceText.setColor(this.activeCandle.close >= this.activeCandle.open ? '#00ff00' : '#ff0000');
        }
    }
}