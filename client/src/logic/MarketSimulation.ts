import Phaser from 'phaser';

export type MarkerType = 'BUY' | 'SELL' | 'NEWS_BAD' | 'NEWS_GOOD';

export interface PriceMarker {
    price: number;
    type: MarkerType;
    index: number;
}

export class MarketSimulation {
    // Данные
    public currentPrice: number = 100;
    public priceHistory: number[] = [];
    public markers: PriceMarker[] = [];
    
    // Настройки симуляции
    public readonly maxPoints = 300; 
    private readonly POINT_DURATION = 100; // мс на точку

    // Внутреннее состояние
    private pointTimer = 0;
    private totalTime = 0;
    private trend = 0;
    private targetTrend = 0;
    private volatility = 1.5;

    // Фазы волн (для красоты)
    private phase1 = Math.random() * 100;
    private phase2 = Math.random() * 100;

    private trendMap: { time: number, value: number }[] = [];
    private currentScenarioIndex = 0;

    constructor(startPrice: number = 100, previousHistory: number[] = []) {
        this.currentPrice = startPrice;

        if (previousHistory.length > 0) {
            this.priceHistory = [...previousHistory];
        } else {
            this.generateWavePrehistory(50, startPrice);
        }
        this.generateScenario();
        // Добавляем стартовую точку
        this.priceHistory.push(this.currentPrice);
    }

    private generateScenario() {
        this.trendMap = [
            { time: 0, value: 0 },           // 0-5 сек: Тишина
            { time: 5000, value: 0.5 },      // 5-12 сек: Легкий рост (разминка)
            { time: 12000, value: 4.0 },     // 12-20 сек: МОЩНЫЙ ПАМП (Тут надо кидать новость!)
            { time: 20000, value: -1.5 },    // 20-30 сек: Откат
        ];
    }

    // --- ГЛАВНЫЙ РАСЧЕТ (Вызывать из GameLoop) ---
    public tick(delta: number, externalInfluence: number = 0) {
        this.totalTime += delta;

        // 1. Обновляем базовый тренд по сценарию
        if (this.currentScenarioIndex < this.trendMap.length - 1) {
            const nextEvent = this.trendMap[this.currentScenarioIndex + 1];
            if (this.totalTime >= nextEvent.time) {
                this.currentScenarioIndex++;
                // Плавно меняем targetTrend
                this.targetTrend = nextEvent.value; 
            }
        }

        // 2. Считаем реальный тренд (Сценарий + Новости Игрока)
        // ВАЖНО: externalInfluence теперь умножается на Репутацию (считаем в MainGame)
        const combinedTrend = this.trend + externalInfluence;
        this.pointTimer += delta;
        this.totalTime += delta;

        // 1. МАТЕМАТИКА (Здесь ты будешь править баланс в будущем)
        const wave1 = Math.sin((this.totalTime * 0.0005) + this.phase1) * 0.001; 
        const wave2 = Math.sin((this.totalTime * 0.002) + this.phase2) * 0.0005;
        const noise = (Math.random() - 0.5) * 0.0005;

        const totalTrend = (this.trend + externalInfluence) / 40000; 
        const multiplier = 1 + totalTrend + wave1 + wave2 + noise;

        let newPrice = this.currentPrice * multiplier;
        if (newPrice < 0.01) newPrice = 0.01;
        this.currentPrice = newPrice;

        // 2. УПРАВЛЕНИЕ ИСТОРИЕЙ
        if (this.pointTimer >= this.POINT_DURATION) {
            this.finalizePoint();
            this.pointTimer = 0;
        } else {
            // Просто обновляем хвост
            if (this.priceHistory.length > 0) {
                this.priceHistory[this.priceHistory.length - 1] = this.currentPrice;
            }
        }

        // Затухание тренда
        this.trend = Phaser.Math.Linear(this.trend, this.targetTrend, 0.01);
    }

    private finalizePoint() {
        // Сдвигаем массив, если переполнен
        if (this.priceHistory.length >= this.maxPoints) {
            this.priceHistory.shift();
            this.markers = this.markers
                .map(m => ({...m, index: m.index - 1}))
                .filter(m => m.index >= 0);
        }
        this.priceHistory.push(this.currentPrice);
    }

    // --- API УПРАВЛЕНИЯ ---
    public addMarker(type: MarkerType) {
        this.markers.push({
            price: this.currentPrice,
            type: type,
            index: this.priceHistory.length - 1
        });
    }

    public manipulate(impact: number) {
        this.trend += impact;
    }

    private generateWavePrehistory(count: number, targetPrice: number) {
        this.priceHistory = [];
        for (let i = 0; i < count; i++) {
            const wave = Math.sin(i * 0.1) * (targetPrice * 0.005);
            this.priceHistory.push(targetPrice + wave);
        }
        this.currentPrice = targetPrice;
    }

    public getCurrentMarketDirection(): 'BULL' | 'BEAR' | 'FLAT' {
        if (this.trend > 0.5) return 'BULL';
        if (this.trend < -0.5) return 'BEAR';
        return 'FLAT';
    }
}