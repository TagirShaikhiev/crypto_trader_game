export enum RoundPhase {
    PLANNING,   // Игрок пишет 3 новости
    ANALYZING,  // Ждем ответа от AI
    TRADING,    // 30 секунд экшена, новости выстреливают сами
    SUMMARY     // Итоги дня
}

export interface PlannedNews {
    text: string;
    triggerTime: number; // На какой секунде раунда сработает (например, 5, 15, 25 сек)
    marketImpacts: { [key: string]: number }; // Влияние на разные рынки (Crypto, Stocks, Bonds)
}

export class RoundManager {
    public currentPhase = RoundPhase.PLANNING;
    public roundDuration = 30000; // 30 сек
    public currentTime = 0;
    
    // Очередь запланированных новостей
    public plannedNews: PlannedNews[] = [];
    
    // Сколько новостей нужно написать перед стартом
    public requiredNewsCount = 3;

    constructor() {}

    startPlanning() {
        this.currentPhase = RoundPhase.PLANNING;
        this.plannedNews = [];
    }

    startAnalyzing() {
        this.currentPhase = RoundPhase.ANALYZING;
    }

    startTrading() {
        this.currentPhase = RoundPhase.TRADING;
        this.currentTime = 0;
    }

    // Тик таймера во время торговли
    tick(delta: number): PlannedNews[] {
        if (this.currentPhase !== RoundPhase.TRADING) return [];

        this.currentTime += delta;
        
        // Проверяем, какие новости пора выпускать
        // (Мы берем новости, чье время пришло, и удаляем их из очереди)
        const readyToFire = this.plannedNews.filter(n => n.triggerTime <= this.currentTime);
        this.plannedNews = this.plannedNews.filter(n => n.triggerTime > this.currentTime);

        return readyToFire;
    }

    isRoundOver() {
        return this.currentTime >= this.roundDuration;
    }
}