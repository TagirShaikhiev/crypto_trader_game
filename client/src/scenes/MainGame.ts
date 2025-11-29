import Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { NewsPanel } from '../ui/NewsPanel';
import { ChartPanel } from '../ui/ChartPanel';
import { TradingPanel } from '../ui/TradingPanel';
import { StatusPanel } from '../ui/StatusPanel';
import { OverlayPanel } from '../ui/OverlayPanel';
// Removed NewsEditorPanel import as it's not used here anymore
import { MarketSimulation } from '../logic/MarketSimulation';
import { NEWS_POOL, NewsItem } from '../data/NewsData';
import { gameState } from '../logic/GameState';

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
    // UI Components
    private chartPanel!: ChartPanel;
    private statusPanel!: StatusPanel;
    private tradingPanel!: TradingPanel;
    private newsPanel!: NewsPanel;
    private overlayPanel!: OverlayPanel;
    // Removed newsEditor

    // Logic
    private simulation!: MarketSimulation;

    // State
    private isGameRunning = false;
    
    // Trading
    private positionSize = 0;   
    private entryPrice = 0;     
    private isLongPosition = true;

    // Round Data
    private readonly ROUND_DURATION = 30000;
    private readonly TICK_RATE = 100;
    private roundTimeLeft = 0;
    private timeElapsed = 0;

    private timeline: TimelineEvent[] = [];
    private activeEffects: ActiveNewsEffect[] = [];
    
    // News from DeckScene
    private playerNewsDeck: NewsItem[] = []; 

    constructor() { super('MainGame'); }

    init(data: any) {
        // Receive news from DeckScene
        this.playerNewsDeck = data.playerNews || [];
        
        // Reset Local State
        this.isGameRunning = false;
        this.positionSize = 0;
        this.entryPrice = 0;
        this.timeElapsed = 0;
        this.roundTimeLeft = this.ROUND_DURATION;
        this.timeline = [];
        this.activeEffects = [];

        // Init Simulation from Global State
        this.simulation = new MarketSimulation(gameState.lastClosePrice, gameState.priceHistory);
    }

    create() {
        AudioManager.playGame(this);
        const { width, height } = this.scale;

        // 1. News Panel (Callback activates a specific news item)
        this.newsPanel = new NewsPanel(this, 0, 0, 280, height, (index) => {
            this.activatePlayerNews(index);
        });

        // 2. Chart
        this.chartPanel = new ChartPanel(this, 280, 0, 720, 550, this.simulation);

        // 3. Trading
        this.tradingPanel = new TradingPanel(this, 280, 550, 720, 170, 
            (percent, isLong) => this.handleTradeEntry(percent, isLong)
        );
        this.tradingPanel.on('max-clicked', () => this.tradingPanel.setInput(Math.floor(gameState.cash).toString()));

        // 4. Status
        this.statusPanel = new StatusPanel(this, 1000, 0, 280, height);
        this.statusPanel.setBuffs(gameState.inventory);

        // 5. Overlay
        this.overlayPanel = new OverlayPanel(this, 280, 0, 720, 720);

        // Timer
        this.time.addEvent({
            delay: this.TICK_RATE,
            callback: () => this.gameLoop(this.TICK_RATE),
            loop: true
        });

        // Input
        this.input.keyboard?.off('keydown');
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            this.tradingPanel.handleInput(event);
        });

        // Start the Action Phase directly
        this.startActionPhase();
    }

    private startActionPhase() {
        // Generate random market noise
        this.injectRandomEvents();
        this.timeline.sort((a, b) => a.triggerTime - b.triggerTime);

        // Show player's news buttons
        this.newsPanel.setupPlayerNewsButtons(this.playerNewsDeck);

        // Show "Market Open" overlay
        this.overlayPanel.show(
            'MARKET OPEN', 
            'News loaded. Get ready to trade.', 
            'START TRADING', 
            () => {
                this.isGameRunning = true;
            }
        );
    }

    private gameLoop(delta: number) {
        if (!this.isGameRunning) return;

        this.timeElapsed += delta;
        this.roundTimeLeft -= delta;

        // 1. Timeline Events (Random News)
        const eventsToFire = this.timeline.filter(e => e.triggerTime <= this.timeElapsed);
        eventsToFire.forEach(e => {
            this.timeline = this.timeline.filter(x => x !== e);
            this.fireEvent(e);
        });

        // 2. Active Effects
        let externalInfluence = 0;
        this.activeEffects.forEach(eff => externalInfluence += eff.strength);
        
        this.activeEffects = this.activeEffects.filter(eff => {
            eff.timeLeft -= delta;
            return eff.timeLeft > 0;
        });

        // 3. Simulation Tick
        this.simulation.tick(delta, externalInfluence);
        this.chartPanel.updateView();

        // 4. PnL Update
        let pnl = 0;
        if (this.positionSize > 0) {
            const currentVal = this.positionSize * this.simulation.currentPrice;
            const investVal = this.positionSize * this.entryPrice;
            pnl = this.isLongPosition ? (currentVal - investVal) : (investVal - currentVal);
        }
        this.statusPanel.updateStats(gameState.cash, pnl, gameState.heat);

        // 5. End of Round
        if (this.roundTimeLeft <= 0) {
            this.finishDay();
        }
    }

    // --- Player News Activation ---
    private activatePlayerNews(index: number) {
        if (!this.isGameRunning) return;
        
        const item = this.playerNewsDeck[index];
        if (!item) return;

        this.newsPanel.logNews(item.text, item.type);

        if (item.type === 'GOOD') this.simulation.addMarker('NEWS_GOOD');
        if (item.type === 'BAD') this.simulation.addMarker('NEWS_BAD');

        if (item.strength !== 0) {
            const manualStrength = item.strength * 1.5;
            this.simulation.manipulate(manualStrength);
            
            this.activeEffects.push({
                strength: manualStrength / 2,
                timeLeft: item.duration
            });
        }
        
        gameState.changeHeat(5);
    }

    // --- Random News Event ---
    private fireEvent(e: TimelineEvent) {
        this.newsPanel.logNews(e.newsItem.text, e.newsItem.type);

        if (e.newsItem.strength !== 0) {
            this.simulation.manipulate(e.newsItem.strength);
            this.activeEffects.push({
                strength: e.newsItem.strength / 2,
                timeLeft: e.newsItem.duration
            });
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

    // --- Trading Logic ---
    private handleTradeEntry(percent: number, isLong: boolean) {
        if (!this.isGameRunning) return;

        if (this.positionSize > 0) {
            this.closePosition();
            return;
        }

        const amount = gameState.cash * percent;
        if (amount < 10) return;

        gameState.cash -= amount;
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
        gameState.cash += (investVal + profit);

        this.positionSize = 0;
        this.entryPrice = 0;
        
        this.simulation.addMarker(this.isLongPosition ? 'SELL' : 'BUY');
        this.tradingPanel.updateButtons(false);
    }

    private finishDay() {
        this.isGameRunning = false;
        if (this.positionSize > 0) this.closePosition();

        // Save state
        gameState.priceHistory = this.simulation.priceHistory;
        gameState.lastClosePrice = this.simulation.currentPrice;

        const expenses = 100 + (gameState.day * 50);
        const cashBefore = gameState.cash;
        gameState.cash -= expenses;

        this.overlayPanel.show(
            'MARKET CLOSED', 
            `Calculating results...`, 
            'VIEW RESULTS', 
            () => {
                this.scene.start('ResultScene', {
                    cash: gameState.cash,
                    cashBefore: cashBefore,
                    expenses: expenses,
                    heat: gameState.heat,
                    dayNumber: gameState.day
                }); 
            }
        );
    }
}