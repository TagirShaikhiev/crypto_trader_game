import Phaser from 'phaser';
import { BasePanel } from './BasePanel';

// Типы событий на графике
export type MarkerType = 'BUY' | 'SELL' | 'NEWS_BAD' | 'NEWS_GOOD';

interface Marker {
    type: MarkerType;
    price: number; // Цена, на которой было событие
}

export interface Candle {
    open: number;
    close: number;
    high: number;
    low: number;
    markers: Marker[];
}

export class ChartPanel extends BasePanel {
    private graphics: Phaser.GameObjects.Graphics;
    private priceText: Phaser.GameObjects.Text;

    // Данные
    private history: Candle[] = [];
    private activeCandle: Candle | null = null;
    
    // Настройки отображения
    private maxCandles = 40; // Всего свечей на экране
    private rightPadding = 60; // Отступ справа, чтобы последняя свеча влезала целиком
    
    public currentPrice = 100;
    public isFinished = false;
    
    private candleTimer = 0;
    private readonly CANDLE_DURATION = 5000; // 5 секунд на свечу

    private trend = 0;
    private volatility = 1;
    private targetTrend = 0;

    constructor(scene: Phaser.Scene, 
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        startPrice: number = 100,
        previousHistory: Candle[] = []) {
        super(scene, x, y, width, height, 0x111111);
        
        this.currentPrice = startPrice; // <-- Устанавливаем переданную цену
        

        this.graphics = scene.add.graphics();
        this.add(this.graphics);

        // Ценник
        this.priceText = scene.add.text(width - 20, 20, '$100.00', {
            fontSize: '32px', color: '#fff', fontStyle: 'bold', fontFamily: 'monospace'
        }).setOrigin(1, 0);
        this.add(this.priceText);

        // 1. Генерируем красивую историю (10 свечей)
        if (previousHistory.length > 0) {
            // ВАРИАНТ А: Есть реальная история из прошлого раунда
            // Копируем её себе
            this.history = [...previousHistory];
        } else {
            // ВАРИАНТ Б: Первый день, генерируем фейковую
            this.generatePrehistory(15, startPrice);
        }

        // 2. Стартуем первую живую свечу с этой же цены
        this.startNewCandle(this.currentPrice);

    }

    public getLastCandles(count: number): Candle[] {
        // Если у нас есть активная свеча, добавим её временно в конец, чтобы не потерять
        const fullHistory = this.activeCandle 
            ? [...this.history, this.activeCandle] 
            : [...this.history];
        
        // Берем последние count элементов
        return fullHistory.slice(-count);
    }

    // --- Генерация "Прошлого" с вариативностью ---
    private generatePrehistory(count: number, targetPrice: number) {
        this.history = []; // Очищаем старую историю
        let simPrice = targetPrice;
        let historyTrend = 0;

        // Генерируем свечи в обратном порядке (от будущего к прошлому)
        for (let i = 0; i < count; i++) {
            // Меняем тренд каждые 5 свечей
            if (i % 5 === 0) historyTrend = (Math.random() - 0.5) * 10;

            // Движение цены за свечу
            const percentMove = (historyTrend + (Math.random() - 0.5) * 5) / 100;
            
            // В прошлом цена была: simPrice / (1 + percentMove)
            // Например: Если сейчас 100, а рост был +10% (1.1), то раньше было 100 / 1.1 = 90.9
            const open = simPrice / (1 + percentMove);
            const close = simPrice;

            // Тени (High/Low) генерируем относительно тела свечи
            const high = Math.max(open, close) * (1 + Math.random() * 0.01);
            const low = Math.min(open, close) * (1 - Math.random() * 0.01);

            // Добавляем во временный массив
            this.history.push({
                open, close, high, low, markers: []
            });

            // Следующая итерация (вглубь прошлого) начнется с цены открытия текущей
            simPrice = open;
        }

        // ВАЖНО: Переворачиваем историю, чтобы она шла слева направо
        this.history.reverse();

        // Устанавливаем текущую цену игры равной целевой (100 или сколько передали)
        this.currentPrice = targetPrice;
    }

    // --- API ---
    public addMarker(type: MarkerType) {
        if (this.activeCandle) {
            this.activeCandle.markers.push({ 
                type, 
                price: this.currentPrice // Запоминаем цену, где поставили маркер
            });
        }
    }

    public manipulate(impact: number) {
        if (this.isFinished) return;
        
        // ВАЖНО: Мы больше не меняем this.currentPrice напрямую!
        // Мы только "толкаем" тренд. Цена изменится сама в следующем тике.
        this.trend += impact; 
        
        this.addMarker(impact > 0 ? 'NEWS_GOOD' : 'NEWS_BAD');
    }

    // --- Логика тика (Update) ---
// Добавили второй аргумент externalInfluence
    public tick(delta: number, externalInfluence: number = 0) {
        if (this.isFinished || !this.activeCandle) return;

        this.candleTimer += delta;

        // --- НОВАЯ МАТЕМАТИКА (ПРОЦЕНТНАЯ) ---

        // 1. Суммарный тренд (Внутренний + Внешний от новостей)
        // Значение 10 = Сильный рост. Значение -10 = Сильное падение.
        const totalTrend = this.trend + externalInfluence;

        // 2. Коэффициент изменения цены (Growth Factor)
        // Мы делим на 2000, чтобы замедлить процесс.
        // Если totalTrend = 10, то изменение = 0.005 (0.5%) за тик (100мс).
        // За секунду это будет ~5% роста.
        const trendFactor = totalTrend / 2000;

        // 3. Шум (Волатильность) тоже в процентах
        // volatility = 0.5 означает колебания +/- 0.05% за тик
        const noisePercent = ((Math.random() - 0.5) * this.volatility) / 1000;

        // 4. Итоговый множитель
        // 1.0 = цена не меняется. 1.01 = рост на 1%.
        const multiplier = 1 + trendFactor + noisePercent;

        // 5. Применяем
        let newPrice = this.currentPrice * multiplier;

        // ЗАЩИТА ОТ НУЛЯ (Цена не может быть меньше 1 цента)
        if (newPrice < 0.01) newPrice = 0.01;
        
        this.currentPrice = newPrice;

        // ... (дальше обновление свечи и проверка времени как раньше) ...
        this.activeCandle.close = newPrice;
        if (newPrice > this.activeCandle.high) this.activeCandle.high = newPrice;
        if (newPrice < this.activeCandle.low) this.activeCandle.low = newPrice;

        if (this.candleTimer >= this.CANDLE_DURATION && !this.isFinished) {
            this.finalizeCandle();
            this.candleTimer = 0;
        }

        // Затухание тренда
        this.trend = Phaser.Math.Linear(this.trend, this.targetTrend, 0.02);
        
        this.draw();
        this.updateUI();
    }

    private finalizeCandle() {
        if (this.activeCandle) {
            // Клонируем свечу в историю
            this.history.push({ 
                open: this.activeCandle.open,
                close: this.activeCandle.close,
                high: this.activeCandle.high,
                low: this.activeCandle.low,
                markers: [...this.activeCandle.markers] // Копируем маркеры
            });

            // Начинаем новую
            this.startNewCandle(this.activeCandle.close);
        }
    }

    private startNewCandle(open: number) {
         if (this.history.length >= this.maxCandles) {
            this.isFinished = true;
            return;
        }
        this.activeCandle = { open, close: open, high: open, low: open, markers: [] };
    }

    // --- ОТРИСОВКА ---
    private draw() {
        this.graphics.clear();
        
        const allCandles = this.activeCandle ? [...this.history, this.activeCandle] : [...this.history];
        if (allCandles.length === 0) return;

        // 1. Авто-зум по Y (Ищем минимум и максимум цены на экране)
        let min = Infinity, max = -Infinity;
        allCandles.forEach(c => { if(c.low < min) min = c.low; if(c.high > max) max = c.high; });
        
        const paddingPrice = (max - min) * 0.2; // 20% отступа сверху и снизу
        const safeMin = min - paddingPrice;
        const safeMax = max + paddingPrice;
        const range = safeMax - safeMin || 1;
        const scaleY = this.height / range;

        // 2. Расчет ширины (FIX ОБРЕЗКИ)
        // Эффективная ширина = ширина панели минус правый отступ
        const effectiveWidth = this.width - this.rightPadding - 10; // -10 слева отступ
        const candleWidth = (effectiveWidth / this.maxCandles) * 0.7;
        const spacing = (effectiveWidth / this.maxCandles) * 0.3;

        allCandles.forEach((c, i) => {
            // Координата X
            const x = 10 + i * (candleWidth + spacing); // 10px отступ слева
            
            // Координаты Y (инвертированы, так как Y растет вниз)
            const yOpen = this.height - (c.open - safeMin) * scaleY;
            const yClose = this.height - (c.close - safeMin) * scaleY;
            const yHigh = this.height - (c.high - safeMin) * scaleY;
            const yLow = this.height - (c.low - safeMin) * scaleY;

            const isGreen = c.close >= c.open;
            const color = isGreen ? 0x00ff00 : 0xff0000;
            
            // Рисуем свечу
            this.graphics.lineStyle(1, color).fillStyle(color);

            // Фитиль
            this.graphics.beginPath();
            this.graphics.moveTo(x + candleWidth/2, yHigh);
            this.graphics.lineTo(x + candleWidth/2, yLow);
            this.graphics.strokePath();

            // Тело
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1);
            this.graphics.fillRect(x, bodyTop, candleWidth, bodyHeight);

            // --- РИСУЕМ МАРКЕРЫ ---
            if (c.markers.length > 0) {
                c.markers.forEach((m, idx) => {
                    const offset = 15 + (idx * 12); // Смещение, если маркеров несколько
                    
                    if (m.type === 'BUY') {
                        // Зеленый треугольник ПОД свечой
                        this.drawTriangle(x + candleWidth/2, yLow + offset, true, 0x00ff00);
                    }
                    else if (m.type === 'SELL') {
                        // Красный треугольник НАД свечой
                        this.drawTriangle(x + candleWidth/2, yHigh - offset, false, 0xff0000);
                    }
                    else if (m.type === 'NEWS_GOOD') {
                        // Синий кружок НАД свечой (еще выше)
                        this.graphics.fillStyle(0x00ffff);
                        this.graphics.fillCircle(x + candleWidth/2, yHigh - offset - 10, 4);
                    }
                    else if (m.type === 'NEWS_BAD') {
                        // Оранжевый кружок НАД свечой
                        this.graphics.fillStyle(0xffaa00);
                        this.graphics.fillCircle(x + candleWidth/2, yHigh - offset - 10, 4);
                    }
                });
            }
        });

        // Пунктирная линия текущей цены
        if (this.activeCandle) {
            const yCurr = this.height - (this.currentPrice - safeMin) * scaleY;
            this.graphics.lineStyle(1, 0xffffff, 0.3);
            this.graphics.beginPath();
            this.graphics.moveTo(0, yCurr);
            this.graphics.lineTo(this.width, yCurr);
            this.graphics.strokePath();
        }
    }

    private drawTriangle(x: number, y: number, pointingUp: boolean, color: number) {
        this.graphics.fillStyle(color);
        const s = 6; // Размер треугольника
        this.graphics.beginPath();
        if (pointingUp) {
            this.graphics.moveTo(x, y - s);
            this.graphics.lineTo(x - s, y + s);
            this.graphics.lineTo(x + s, y + s);
        } else {
            this.graphics.moveTo(x, y + s);
            this.graphics.lineTo(x - s, y - s);
            this.graphics.lineTo(x + s, y - s);
        }
        this.graphics.fillPath();
    }

    private updateUI() {
        this.priceText.setText(`$${this.currentPrice.toFixed(2)}`);
        if (this.activeCandle) {
            this.priceText.setColor(this.activeCandle.close >= this.activeCandle.open ? '#00ff00' : '#ff0000');
        }
    }
}