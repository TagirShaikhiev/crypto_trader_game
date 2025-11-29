import Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { NewsPanel } from '../ui/NewsPanel';
import { ChartPanel } from '../ui/ChartPanel';
import { TradingPanel } from '../ui/TradingPanel';
import { StatusPanel } from '../ui/StatusPanel';
import { OverlayPanel } from '../ui/OverlayPanel';
import { MarketSimulation } from '../logic/MarketSimulation';
import { NEWS_POOL, NewsItem } from '../data/NewsData';

interface TimelineEvent {
    triggerTime: number;
    newsItem: NewsItem;
    isPlayer: boolean;
}

interface ActiveNewsEffect {
    strength: number;
    timeLeft: number;
}

export class MainGame extends Phaser.Scene {
    // UI
    private chartPanel!: ChartPanel;
    private statusPanel!: StatusPanel;
    private tradingPanel!: TradingPanel;
    private newsPanel!: NewsPanel;
    private overlayPanel!: OverlayPanel;

    // Logic
    private simulation!: MarketSimulation;

    // State
    private isGameRunning = false;
    private cash = 10000;
    private heat = 0;
    private dayNumber = 1;

    // Trading
    private positionSize = 0;
    private entryPrice = 0;
    private isLongPosition = true;

    // Round Data
    private readonly ROUND_DURATION = 30000;
    private readonly TICK_RATE = 100;
    private timeElapsed = 0;

    // News
    private timeline: TimelineEvent[] = [];
    private activeEffects: ActiveNewsEffect[] = [];
    private playerNewsDeck: NewsItem[] = []; // Готовые новости, пришли из DeckScene

    // Carry over
    private lastClosePrice = 100;
    private prevHistory: number[] = [];

    constructor() { super('MainGame'); }

    init(data: any) {
        this.cash = data.cash || 10000;
        this.heat = data.heat || 0;
        this.dayNumber = data.dayNumber || 1;
        this.lastClosePrice = data.lastPrice || 100;
        this.prevHistory = data.history || [];
        
        // ВАЖНО: Получаем готовые новости из DeckScene
        this.playerNewsDeck = data.playerNews || [];

        this.isGameRunning = false;
        this.positionSize = 0;
        this.entryPrice = 0;
        this.timeElapsed = 0;
        this.timeline = [];
        this.activeEffects = [];

        this.simulation = new MarketSimulation(this.lastClosePrice, this.prevHistory);
    }

    create() {
        AudioManager.playGame(this);
        const { height } = this.scale;

        // 1. Новости: колбэк активирует новость из руки
        this.newsPanel = new NewsPanel(this, 0, 0, 280, height, (index) => {
            this.activatePlayerNews(index);
        });

        this.chartPanel = new ChartPanel(this, 280, 0, 720, 550, this.simulation);
        
        this.tradingPanel = new TradingPanel(this, 280, 550, 720, 170, 
            (pct, isLong) => this.handleTradeEntry(pct, isLong)
        );
        this.statusPanel = new StatusPanel(this, 1000, 0, 280, height);
        this.overlayPanel = new OverlayPanel(this, 280, 0, 720, 720);

        // Таймер
        this.time.addEvent({ delay: this.TICK_RATE, callback: () => this.gameLoop(this.TICK_RATE), loop: true });

        // Ввод (только торговля, редактора тут больше нет)
        this.input.keyboard?.off('keydown');
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            this.tradingPanel.handleInput(event);
        });

        // Подготовка к старту
        this.setupRound();
    }

    private setupRound() {
        // 1. Генерируем случайный шум рынка
        this.injectRandomEvents();
        this.timeline.sort((a, b) => a.triggerTime - b.triggerTime);

        // 2. Показываем кнопки игроку
        this.newsPanel.setupPlayerNewsButtons(this.playerNewsDeck);

        // 3. Старт
        this.overlayPanel.show('MARKET OPEN', 'Trading session started.', 'GO!', () => {
            this.isGameRunning = true;
            this.newsPanel.setState("MARKET ACTIVE");
        });
    }

    private gameLoop(delta: number) {
        if (!this.isGameRunning) return;

        this.timeElapsed += delta;

        // События (рандомные новости)
        const eventsToFire = this.timeline.filter(e => e.triggerTime <= this.timeElapsed);
        eventsToFire.forEach(e => {
            this.timeline = this.timeline.filter(x => x !== e);
            this.fireEvent(e);
        });

        // Эффекты
        let externalInfluence = 0;
        this.activeEffects.forEach(eff => externalInfluence += eff.strength);
        this.activeEffects = this.activeEffects.filter(eff => {
            eff.timeLeft -= delta;
            return eff.timeLeft > 0;
        });

        this.simulation.tick(delta, externalInfluence);
        this.chartPanel.updateView();
        this.updatePnL();

        if (this.timeElapsed >= this.ROUND_DURATION) {
            this.finishDay();
        }
    }

    // Активация новости игрока (Ручная)
    private activatePlayerNews(index: number) {
        if (!this.isGameRunning) return;
        const item = this.playerNewsDeck[index];
        if (!item) return;

        this.newsPanel.logNews(item.text, item.type);
        
        if (item.strength !== 0) {
            // Усиливаем ручные новости
            const manualStrength = item.strength * 1.5;
            this.simulation.manipulate(manualStrength);
            this.activeEffects.push({ strength: manualStrength / 2, timeLeft: item.duration });
        }
        
        if (item.type === 'GOOD') this.simulation.addMarker('NEWS_GOOD');
        if (item.type === 'BAD') this.simulation.addMarker('NEWS_BAD');

        this.changeHeat(5);
    }

    private fireEvent(e: TimelineEvent) {
        this.newsPanel.logNews(e.newsItem.text, e.newsItem.type);
        if (e.newsItem.strength !== 0) {
            this.simulation.manipulate(e.newsItem.strength);
            this.activeEffects.push({ strength: e.newsItem.strength / 2, timeLeft: e.newsItem.duration });
        }
        const mType = e.newsItem.type === 'GOOD' ? 'NEWS_GOOD' : 'NEWS_BAD';
        if (e.newsItem.type !== 'NEUTRAL') this.simulation.addMarker(mType);
    }

    private injectRandomEvents() {
        const count = Phaser.Math.Between(3, 5);
        for (let i = 0; i < count; i++) {
            const time = Phaser.Math.Between(2000, 28000);
            const rand = Math.random();
            let type: 'GOOD' | 'BAD' | 'NEUTRAL' = 'NEUTRAL';
            if (rand < 0.3) type = 'BAD'; else if (rand < 0.6) type = 'GOOD';
            const pool = NEWS_POOL[type];
            const item = pool[Phaser.Math.Between(0, pool.length - 1)];
            
            this.timeline.push({
                triggerTime: time,
                newsItem: { ...item, type, strength: item.strength },
                isPlayer: false
            });
        }
    }

    private handleTradeEntry(percent: number, isLong: boolean) {
        if (!this.isGameRunning) return;
        if (this.positionSize > 0) {
            this.closePosition();
            return;
        }
        const amount = this.cash * percent;
        if (amount < 10) return;

        this.cash -= amount;
        this.entryPrice = this.simulation.currentPrice;
        this.positionSize = amount / this.entryPrice;
        this.isLongPosition = isLong;

        this.simulation.addMarker(isLong ? 'BUY' : 'SELL'); 
        this.tradingPanel.updateButtons(true);
    }

    private closePosition() {
        if (this.positionSize <= 0) return;
        const currentVal = this.positionSize * this.simulation.currentPrice;
        const investVal = this.positionSize * this.entryPrice;
        let profit = this.isLongPosition ? (currentVal - investVal) : (investVal - currentVal);
        this.cash += (investVal + profit);
        this.positionSize = 0;
        this.entryPrice = 0;
        this.simulation.addMarker(this.isLongPosition ? 'SELL' : 'BUY');
        this.tradingPanel.updateButtons(false);
    }

    private updatePnL() {
        let pnl = 0;
        if (this.positionSize > 0) {
            const currentVal = this.positionSize * this.simulation.currentPrice;
            const investVal = this.positionSize * this.entryPrice;
            pnl = this.isLongPosition ? (currentVal - investVal) : (investVal - currentVal);
        }
        this.statusPanel.updateStats(this.cash, pnl, this.heat);
    }

    private changeHeat(val: number) {
        this.heat = Phaser.Math.Clamp(this.heat + val, 0, 100);
    }

    private finishDay() {
        this.isGameRunning = false;
        if (this.positionSize > 0) this.closePosition();

        // Переходим на экран результатов
        this.scene.start('ResultScene', {
            cash: this.cash,
            heat: this.heat,
            dayNumber: this.dayNumber,
            lastPrice: this.simulation.currentPrice,
            history: this.simulation.priceHistory
        });
    }
}