import Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { NewsPanel } from '../ui/NewsPanel';
import { ChartPanel } from '../ui/ChartPanel';
import { TradingPanel } from '../ui/TradingPanel';
import { StatusPanel } from '../ui/StatusPanel';
import { OverlayPanel } from '../ui/OverlayPanel';
import { NewsEditorPanel } from '../ui/NewsEditorPanel';
import { MarketSimulation } from '../logic/MarketSimulation';
import { NewsGenerator } from '../data/NewsGenerator';
import { NEWS_POOL, NewsItem, NewsType } from '../data/NewsData';

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
    private chartPanel!: ChartPanel;
    private statusPanel!: StatusPanel;
    private tradingPanel!: TradingPanel;
    private newsPanel!: NewsPanel;
    private overlayPanel!: OverlayPanel;
    private newsEditor!: NewsEditorPanel;

    private simulation!: MarketSimulation;

    private isGameRunning = false;
    private isEditorOpen = false;
    private isAnalyzing = false;

    private cash = 10000;
    private heat = 0;
    private dayNumber = 1;

    private positionSize = 0;
    private entryPrice = 0;
    private isLongPosition = true;

    private readonly ROUND_DURATION = 30000;
    private readonly TICK_RATE = 100;
    private timeElapsed = 0;

    private timeline: TimelineEvent[] = [];
    private activeEffects: ActiveNewsEffect[] = [];
    private draftHeadlines: string[] = [];
    private newsStep = 0;

    private lastClosePrice = 100;
    private prevHistory: number[] = [];
    private playerNewsDeck: NewsItem[] = [];

    constructor() {
        super('MainGame');
    }

    init(data: any) {
        this.cash = data.cash || 10000;
        this.heat = data.heat || 0;
        this.dayNumber = data.dayNumber || 1;
        this.lastClosePrice = data.lastPrice || 100;
        this.prevHistory = data.history || [];

        this.isGameRunning = false;
        this.isEditorOpen = false;
        this.isAnalyzing = false;
        this.positionSize = 0;
        this.entryPrice = 0;
        this.timeElapsed = 0;
        this.timeline = [];
        this.activeEffects = [];
        this.draftHeadlines = [];

        this.simulation = new MarketSimulation(this.lastClosePrice, this.prevHistory);
    }

    create() {
        AudioManager.playGame(this);
        const { width, height } = this.scale;

        this.newsPanel = new NewsPanel(this, 0, 0, 280, height, (index) => {
            this.activatePlayerNews(index);
        });
        
        this.chartPanel = new ChartPanel(this, 280, 0, 720, 550, this.simulation);

        this.tradingPanel = new TradingPanel(this, 280, 550, 720, 170, 
            (percent, isLong) => this.handleTradeEntry(percent, isLong)
        );
        
        this.statusPanel = new StatusPanel(this, 1000, 0, 280, height);
        this.overlayPanel = new OverlayPanel(this, 280, 0, 720, 720);

        this.newsEditor = new NewsEditorPanel(this, 430, 210, 420, 300, (text) => {
            this.handleDraftSubmit(text);
        });

        this.time.addEvent({
            delay: this.TICK_RATE,
            callback: () => this.gameLoop(this.TICK_RATE),
            loop: true
        });

        this.input.keyboard?.off('keydown');
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (this.isEditorOpen) {
                this.newsEditor.handleInput(event);
                return;
            }
            this.tradingPanel.handleInput(event);
        });

        this.startPlanningPhase();
    }

    private startPlanningPhase() {
        this.isGameRunning = false;
        this.draftHeadlines = [];
        this.newsStep = 1;

        this.overlayPanel.show(
            `DAY ${this.dayNumber}`, 
            'Plan your strategy. Write 3 headlines.', 
            'START PLANNING', 
            () => {
                this.openEditorForStep();
            }
        );
    }

    

    private openEditorForStep() {
        this.isEditorOpen = true;
        this.newsEditor.open();
    }

    private handleDraftSubmit(text: string) {
        this.newsEditor.hide();
        this.isEditorOpen = false;
        this.draftHeadlines.push(text);

        if (this.newsStep < 3) {
            this.newsStep++;
            this.time.delayedCall(300, () => this.openEditorForStep());
        } else {
            this.startAnalysisPhase();
        }
    }

    private async startAnalysisPhase() {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;

        this.overlayPanel.show('AI ANALYZING', 'Evaluating your headlines...', 'PLEASE WAIT', () => {});

        console.log("Sending to AI:", this.draftHeadlines); // <-- ЛОГ

        // 1. Запрос
        const playerNewsItems = await NewsGenerator.analyzeBatch(this.draftHeadlines);
        
        console.log("AI Response:", playerNewsItems); // <-- ЛОГ

        // 2. Сохраняем в "Руку" игрока
        this.playerNewsDeck = playerNewsItems;

        // 3. Добавляем РАНДОМНЫЕ события (только шум рынка)
        this.injectRandomEvents();
        this.timeline.sort((a, b) => a.triggerTime - b.triggerTime);

        this.isAnalyzing = false;
        this.overlayPanel.show('MARKET OPEN', 'News loaded into terminal.', 'START TRADING', () => {
            this.startTradingPhase();
        });
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
                newsItem: { ...item, type: type, strength: item.strength },
                isPlayer: false
            });
        }
    }

    private startTradingPhase() {
        this.isGameRunning = true;
        this.timeElapsed = 0;
        // this.newsPanel.setStatus("MARKET OPEN"); // Если метода нет, удали строку или добавь в NewsPanel
        
        // ВАЖНО: Передаем новости в панель, чтобы создать кнопки
        this.newsPanel.setupPlayerNewsButtons(this.playerNewsDeck);
    }

    private activatePlayerNews(index: number) {
        const item = this.playerNewsDeck[index];
        if (!item) return;

        // 1. Публикуем в лог
        this.newsPanel.logNews(item.text, item.type);

        // 2. Маркер
        if (item.type === 'GOOD') this.simulation.addMarker('NEWS_GOOD');
        if (item.type === 'BAD') this.simulation.addMarker('NEWS_BAD');

        // 3. Влияние на цену
        if (item.strength !== 0) {
            // Усиливаем эффект, так как это ручное управление
            const manualStrength = item.strength * 1.5; 
            this.simulation.manipulate(manualStrength);
            
            this.activeEffects.push({
                strength: manualStrength / 2,
                timeLeft: item.duration
            });
        }

        // 4. Heat
        this.changeHeat(5);
    }

    private gameLoop(delta: number) {
        if (!this.isGameRunning) return;

        this.timeElapsed += delta;

        const eventsToFire = this.timeline.filter(e => e.triggerTime <= this.timeElapsed);
        
        eventsToFire.forEach(e => {
            this.timeline = this.timeline.filter(x => x !== e);
            this.fireEvent(e);
        });

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

    private fireEvent(e: TimelineEvent) {
        this.newsPanel.logNews(e.newsItem.text, e.newsItem.type);

        if (e.newsItem.type === 'GOOD') this.simulation.addMarker('NEWS_GOOD');
        if (e.newsItem.type === 'BAD') this.simulation.addMarker('NEWS_BAD');

        if (e.newsItem.strength !== 0) {
            this.simulation.manipulate(e.newsItem.strength);
            
            this.activeEffects.push({
                strength: e.newsItem.strength / 2,
                timeLeft: e.newsItem.duration
            });
        }

        if (e.isPlayer) {
            this.changeHeat(5);
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
        
        let profit = 0;
        if (this.isLongPosition) {
            profit = currentVal - investVal;
            this.cash += (investVal + profit);
        } else {
            profit = investVal - currentVal;
            this.cash += (investVal + profit); 
        }

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

    private finishDay() {
        this.isGameRunning = false;
        if (this.positionSize > 0) this.closePosition();

        const historyToPass = this.simulation.priceHistory;

        this.overlayPanel.show(
            'MARKET CLOSED', 
            `Balance: $${this.cash.toFixed(0)}`, 
            'NEXT DAY', 
            () => {
                this.scene.restart({ 
                    cash: this.cash, 
                    heat: this.heat,
                    lastPrice: this.simulation.currentPrice,
                    history: historyToPass,
                    dayNumber: this.dayNumber + 1
                }); 
            }
        );
    }

    private changeHeat(val: number) {
        this.heat = Phaser.Math.Clamp(this.heat + val, 0, 100);
    }
}