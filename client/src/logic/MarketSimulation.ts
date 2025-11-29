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
    
    public readonly maxPoints = 300; 
    private readonly POINT_DURATION = 100;

    private pointTimer = 0;
    private totalTime = 0;
    
    // --- ПАРАМЕТРЫ РЫНКА (Независимые от игрока) ---
    private globalSentiment = 0; // -1 (Медвежий) ... 1 (Бычий). Меняется само.
    private volatility = 1.0;    // 0.5 (Спокойный) ... 3.0 (Шторм).
    
    // Тренд от новостей (Влияние игрока и AI)
    private newsTrend = 0; 

    // Фазы волн
    private phase1 = Math.random() * 100;
    private phase2 = Math.random() * 100;
    private sentimentPhase = Math.random() * 100; // Для плавного изменения настроения рынка

    constructor(startPrice: number = 100, previousHistory: number[] = []) {
        this.currentPrice = startPrice;

        if (previousHistory.length > 0) {
            this.priceHistory = [...previousHistory];
        } else {
            this.generateWavePrehistory(50, startPrice);
        }
        
        this.priceHistory.push(this.currentPrice);
    }

    public tick(delta: number, externalInfluence: number = 0) {
        this.pointTimer += delta;
        this.totalTime += delta;

        // 1. ИЗМЕНЕНИЕ ГЛОБАЛЬНОГО НАСТРОЕНИЯ (Самостоятельная жизнь рынка)
        // Очень медленная волна (период ~2 минуты)
        this.globalSentiment = Math.sin((this.totalTime * 0.0001) + this.sentimentPhase) * 0.5;

        // 2. ВОЛНЫ
        const wave1 = Math.sin((this.totalTime * 0.0005) + this.phase1) * 0.001; 
        const wave2 = Math.sin((this.totalTime * 0.002) + this.phase2) * 0.0005;
        
        // Случайный шум зависит от волатильности
        const noise = (Math.random() - 0.5) * (0.001 * this.volatility);

        // 3. СУММАРНЫЙ ВЕКТОР
        // (Глобальное настроение) + (Новости игрока/AI)
        const combinedTrend = this.globalSentiment + (this.newsTrend + externalInfluence);
        
        // Делитель 30000 - чем больше, тем медленнее движение
        const trendFactor = combinedTrend / 30000; 

        // Итоговый множитель цены
        const multiplier = 1 + trendFactor + wave1 + wave2 + noise;

        let newPrice = this.currentPrice * multiplier;
        if (newPrice < 0.01) newPrice = 0.01;
        this.currentPrice = newPrice;

        // 4. Управление историей (Массив точек)
        if (this.pointTimer >= this.POINT_DURATION) {
            this.finalizePoint();
            this.pointTimer = 0;
        } else {
            if (this.priceHistory.length > 0) {
                this.priceHistory[this.priceHistory.length - 1] = this.currentPrice;
            }
        }

        // Затухание влияния новостей (возврат к глобальному настроению)
        this.newsTrend = Phaser.Math.Linear(this.newsTrend, 0, 0.01);
    }

    private finalizePoint() {
        if (this.priceHistory.length >= this.maxPoints) {
            this.priceHistory.shift();
            this.markers = this.markers
                .map(m => ({...m, index: m.index - 1}))
                .filter(m => m.index >= 0);
        }
        this.priceHistory.push(this.currentPrice);
        
        // Иногда меняем волатильность (рынок то успокаивается, то нервничает)
        if (Math.random() < 0.05) {
            this.volatility = Phaser.Math.Clamp(this.volatility + (Math.random() - 0.5), 0.5, 3.0);
        }
    }

    public addMarker(type: MarkerType) {
        this.markers.push({
            price: this.currentPrice,
            type: type,
            index: this.priceHistory.length - 1
        });
    }

    // Игрок влияет только на newsTrend
    public manipulate(impact: number) {
        this.newsTrend += impact;
        // Резкая новость повышает волатильность
        this.volatility += Math.abs(impact) * 0.1;
    }

    private generateWavePrehistory(count: number, targetPrice: number) {
        this.priceHistory = [];
        for (let i = 0; i < count; i++) {
            this.priceHistory.push(targetPrice);
        }
        this.currentPrice = targetPrice;
    }
}