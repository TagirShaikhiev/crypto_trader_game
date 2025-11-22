import Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { NewsPanel } from '../ui/NewsPanel';
import { ChartPanel } from '../ui/ChartPanel';
import { TradingPanel } from '../ui/TradingPanel';
import { StatusPanel } from '../ui/StatusPanel';
import { OverlayPanel } from '../ui/OverlayPanel';

// Логика
import { MarketSimulation } from '../logic/MarketSimulation';
import { ReputationManager } from '../logic/ReputationManager';

export class MainGame extends Phaser.Scene {
    // --- КОМПОНЕНТЫ UI ---
    private chartPanel!: ChartPanel;
    private statusPanel!: StatusPanel;
    private tradingPanel!: TradingPanel;
    private newsPanel!: NewsPanel;
    private overlayPanel!: OverlayPanel;

    // --- ЛОГИКА (МОДЕЛИ) ---
    private simulation!: MarketSimulation;
    private reputationManager!: ReputationManager;

    // --- СОСТОЯНИЕ ИГРЫ ---
    private isGameRunning = false;
    private cash = 10000;
    private heat = 0;
    
    // Таймер раунда (30 секунд)
    private readonly ROUND_DURATION = 30000; 
    private readonly TICK_RATE = 100; // Обновление 10 раз в сек
    private roundTimeLeft = 0;

    // Трейдинг (Позиция)
    private positionSize = 0;   // Кол-во купленных лотов
    private entryPrice = 0;     // Цена входа
    private isLongPosition = true; // true = играем на повышение, false = шорт

    // Перенос данных между днями
    private lastClosePrice = 100;
    private prevHistory: number[] = [];
    private dayNumber = 1;

    constructor() {
        super('MainGame');
    }

    // 1. ИНИЦИАЛИЗАЦИЯ
    init(data: any) {
        this.cash = data.cash || 10000;
        this.heat = data.heat || 0;
        this.dayNumber = data.dayNumber || 1;
        
        this.lastClosePrice = data.lastPrice || 100;
        this.prevHistory = data.history || [];

        // Сброс
        this.isGameRunning = false;
        this.positionSize = 0;
        this.entryPrice = 0;
        this.roundTimeLeft = this.ROUND_DURATION;

        // Создаем логические модули
        this.simulation = new MarketSimulation(this.lastClosePrice, this.prevHistory);
        this.reputationManager = new ReputationManager();
    }

    create() {
        AudioManager.playGame(this);
        const { width, height } = this.scale;

        // --- 1. ПАНЕЛЬ НОВОСТЕЙ (Слева) ---
        this.newsPanel = new NewsPanel(this, 0, 0, 280, height, () => {
            this.publishDraft();
        });
        // Показываем первую заготовленную новость
        this.updateDraftUI();

        // --- 2. ГРАФИК (Центр Верх) ---
        this.chartPanel = new ChartPanel(
            this, 280, 0, 720, 550, 
            this.simulation // Передаем модель
        );

        // --- 3. ТОРГОВЛЯ (Центр Низ) ---
        this.tradingPanel = new TradingPanel(this, 280, 550, 720, 170, 
            (percent, isLong) => this.handleTradeEntry(percent, isLong)
        );
        
        // --- 4. СТАТУС (Справа) ---
        this.statusPanel = new StatusPanel(this, 1000, 0, 280, height);

        // --- 5. ОВЕРЛЕЙ (Модальные окна) ---
        this.overlayPanel = new OverlayPanel(this, 280, 0, 720, 720);

        // --- 6. ГЛАВНЫЙ ЦИКЛ ---
        this.time.addEvent({
            delay: this.TICK_RATE,
            callback: () => this.gameLoop(this.TICK_RATE),
            loop: true
        });

        // Старт дня
        this.startDay();
    }

    // ========================================================
    // ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ
    // ========================================================
    private gameLoop(delta: number) {
        if (!this.isGameRunning) return;

        this.roundTimeLeft -= delta;

        // 1. Обновляем симуляцию рынка
        this.simulation.tick(delta, 0); // 0 - внешнее влияние пока только от кнопок

        // 2. Обновляем визуализацию графика
        this.chartPanel.updateView();

        // 3. Расчет прибыли (PnL) в реальном времени
        let pnl = 0;
        if (this.positionSize > 0) {
            const currentVal = this.positionSize * this.simulation.currentPrice;
            const investVal = this.positionSize * this.entryPrice;
            
            // Если Long: (Текущая - Вход)
            // Если Short: (Вход - Текущая) -> инвертируем разницу
            pnl = this.isLongPosition ? (currentVal - investVal) : (investVal - currentVal);
        }

        // 4. Обновляем правую панель
        this.statusPanel.updateStats(this.cash, pnl, this.heat);

        // 5. Проверка конца раунда
        if (this.roundTimeLeft <= 0) {
            this.finishDay();
        }
    }

    // ========================================================
    // МЕХАНИКА "RHYTHM NEWS" (Тайминг и Репутация)
    // ========================================================
    private publishDraft() {
        if (!this.isGameRunning) return;

        // Получаем текущий тренд из симуляции (нам нужно приватное свойство trend)
        // Для чистоты кода лучше добавить геттер в MarketSimulation: getTrend()
        // Но пока возьмем через any или добавим геттер.
        // Предположим, что в MarketSimulation есть метод public getTrend(): number
        const currentTrend = (this.simulation as any).trend || 0; 

        // Менеджер репутации проверяет тайминг
        const result = this.reputationManager.attemptPublish(currentTrend);

        // Применяем влияние на рынок
        this.simulation.manipulate(result.impact);
        
        // Логгируем новость
        // Текст новости берем из той, что была (мы её уже сменили в менеджере, 
        // поэтому в идеале менеджер должен возвращать старую новость в result. 
        // Для простоты покажем просто эффект в логе).
        const typeStr = result.impact > 0 ? 'GOOD' : (result.impact < 0 ? 'BAD' : 'NEUTRAL');
        this.newsPanel.logNews("MARKET REACTION:", typeStr);

        // Визуальный маркер на графике
        if (typeStr === 'GOOD') this.simulation.addMarker('NEWS_GOOD');
        if (typeStr === 'BAD') this.simulation.addMarker('NEWS_BAD');

        // Всплывающий текст (Feedback)
        this.showFloatingText(result.message, result.success ? 0x00ff00 : 0xff0000);

        // Обновляем UI следующей картой
        this.updateDraftUI();
        
        // Повышаем Heat за манипуляцию
        this.changeHeat(5);
    }

    private updateDraftUI() {
        const nextNews = this.reputationManager.currentDraft;
        this.newsPanel.setDraft(nextNews.text, nextNews.type);
    }

    // ========================================================
    // ТОРГОВЛЯ
    // ========================================================
    private handleTradeEntry(percent: number, isLong: boolean) {
        if (!this.isGameRunning) return;

        // Если мы УЖЕ в сделке -> это сигнал к ЗАКРЫТИЮ
        if (this.positionSize > 0) {
            this.closePosition();
            return;
        }

        // ОТКРЫТИЕ СДЕЛКИ
        const amountToInvest = this.cash * percent;
        if (amountToInvest < 10) return; // Слишком мало денег

        this.cash -= amountToInvest;
        this.entryPrice = this.simulation.currentPrice;
        this.positionSize = amountToInvest / this.entryPrice;
        this.isLongPosition = isLong;

        // Ставим маркер
        this.simulation.addMarker(isLong ? 'BUY' : 'SELL'); // SELL тут как шорт-вход

        // Обновляем кнопки (теперь они должны стать "CLOSE")
        this.tradingPanel.updateButtons(true); 
    }

    private closePosition() {
        if (this.positionSize <= 0) return;

        // Считаем выход
        const currentVal = this.positionSize * this.simulation.currentPrice;
        const investVal = this.positionSize * this.entryPrice;
        
        let pnl = 0;
        if (this.isLongPosition) {
            pnl = currentVal - investVal;
            this.cash += currentVal; // Возвращаем тело + профит
        } else {
            // Short: мы заработали, если цена упала
            pnl = investVal - currentVal;
            this.cash += (investVal + pnl); // Возвращаем тело + профит (шорт математика упрощена)
        }

        this.positionSize = 0;
        this.entryPrice = 0;

        // Ставим маркер выхода
        // Если был Long, выходим продажей (SELL). Если Short, выходим откупом (BUY).
        this.simulation.addMarker(this.isLongPosition ? 'SELL' : 'BUY');

        this.tradingPanel.updateButtons(false);
    }

    // ========================================================
    // СИСТЕМНЫЕ
    // ========================================================
    private startDay() {
        this.isGameRunning = false;
        this.overlayPanel.show(
            `DAY ${this.dayNumber}`, 
            'Market Opening...', 
            'START SESSION', 
            () => {
                this.isGameRunning = true;
            }
        );
    }

    private finishDay() {
        this.isGameRunning = false;
        
        // Автоматически закрываем позицию в конце дня, если есть
        if (this.positionSize > 0) this.closePosition();

        // Берем историю для следующего дня
        const historyToPass = this.simulation.priceHistory;

        this.overlayPanel.show(
            'SESSION CLOSED', 
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

    private showFloatingText(msg: string, color: number) {
        const txt = this.add.text(this.scale.width / 2, this.scale.height / 2, msg, {
            fontSize: '48px', color: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(200);
        txt.setTint(color);

        this.tweens.add({
            targets: txt,
            y: txt.y - 100,
            alpha: 0,
            duration: 1500,
            onComplete: () => txt.destroy()
        });
    }
}