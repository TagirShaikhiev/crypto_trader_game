import Phaser from 'phaser';
import { AudioManager } from './AudioManager';
import { NewsPanel } from '../ui/NewsPanel';
import { Candle, ChartPanel } from '../ui/ChartPanel';
import { TradingPanel } from '../ui/TradingPanel';
import { StatusPanel } from '../ui/StatusPanel';
import { OverlayPanel } from '../ui/OverlayPanel';
import { NewsEditorPanel } from '../ui/NewsEditorPanel'; // <-- Импорт
import { NEWS_POOL, NewsItem, NewsType } from '../data/NewsData';
import { NewsGenerator } from '../data/NewsGenerator';

interface ActiveNewsEffect { strength: number; timeLeft: number; }

export class MainGame extends Phaser.Scene {
    // ... компоненты
    private dailyNewsQueue: NewsItem[] = [];
    private chartPanel!: ChartPanel;
    private statusPanel!: StatusPanel;
    private tradingPanel!: TradingPanel;
    private newsPanel!: NewsPanel;
    private overlayPanel!: OverlayPanel;
    private newsEditor!: NewsEditorPanel; // <-- Новая панель

    private isGameRunning = false;
    private isEditorOpen = false; // <-- Флаг редактора

    private lastClosePrice = 100;
    private prevHistory: Candle[] = [];

    // ... (остальные переменные cash, heat, activeEffects...)
    private cash = 10000;
    private heat = 0;
    private positionSize = 0;
    private entryPrice = 0;
    private activeEffects: ActiveNewsEffect[] = [];
    private newsTimer = 0;
    private nextNewsDelay = 5000;
    private dayNumber = 1;
    constructor() { super('MainGame'); }

    create() {
        AudioManager.playGame(this);
        const { width, height } = this.scale;

        // 1. НОВОСТИ (Колбэк вызывает открытие редактора)
        this.newsPanel = new NewsPanel(this, 0, 0, 280, height, () => {
            this.openNewsEditor();
        });

        // ... (ChartPanel, TradingPanel, StatusPanel создаются как раньше) ...
        this.chartPanel = new ChartPanel(this, 280, 0, 720, 550, this.lastClosePrice, this.prevHistory);
        
        this.tradingPanel = new TradingPanel(this, 280, 550, 720, 170, 
            (a) => this.handleBuy(a), () => this.handleSell()
        );
        this.tradingPanel.on('max-clicked', () => this.tradingPanel.setInput(Math.floor(this.cash).toString()));
        
        this.statusPanel = new StatusPanel(this, 1000, 0, 280, height);
        this.overlayPanel = new OverlayPanel(this, 280, 0, 720, 720);

        // 5. СОЗДАЕМ РЕДАКТОР (По центру экрана)
        this.newsEditor = new NewsEditorPanel(this, 430, 210, 420, 300, async (text) => {
            // Этот код выполнится, когда игрок нажмет PUBLISH
            await this.processPlayerNews(text);
        });
        this.time.addEvent({ delay: 100, callback: () => this.gameLoop(100), loop: true });
        
        // Ввод цифр (покупка) работает только если редактор закрыт
        this.input.keyboard?.off('keydown');
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            
            // 1. Если открыт редактор -> пишем новости
            if (this.isEditorOpen) {
                this.newsEditor.handleInput(event); // <-- ПЕРЕДАЕМ ВВОД СЮДА
                return; 
            }

            // 2. Если редактор закрыт -> вводим сумму ставки
            this.tradingPanel.handleInput(event);
        });

        this.startDay();
    }

    private async processPlayerNews(text: string) {
        // 1. Имитация задержки (если AI ответит слишком быстро, добавим саспенса)
        // Можно убрать, если хотите реальную скорость
        const minDelay = new Promise(resolve => setTimeout(resolve, 2000));
        
        // 2. Реальный запрос к AI
        const aiAnalysis = NewsGenerator.analyzePlayerNews(text);

        // Ждем и то, и другое
        const [_, result] = await Promise.all([minDelay, aiAnalysis]);

        // 3. Результат получен!
        // Скрываем редактор
        this.newsEditor.hide(); 
        this.isEditorOpen = false;
        this.isGameRunning = true; // Снимаем с паузы

        // 4. Применяем эффект, который посчитал AI
        this.newsPanel.logNews(result.text, result.type as NewsType);
        
        // Визуальный маркер
        if (result.type === 'GOOD') this.chartPanel.addMarker('NEWS_GOOD');
        if (result.type === 'BAD') this.chartPanel.addMarker('NEWS_BAD');

        // Рыночный эффект
        if (result.strength !== 0) {
            this.chartPanel.manipulate(result.strength);
            
            this.activeEffects.push({
                strength: result.strength / 2,
                timeLeft: result.duration
            });
        }

        // Штраф за ложь/правду (AI может вернуть это тоже, но пока упростим)
        // Если новость сильная (манипуляция) — повышаем Heat
        this.changeHeat(Math.abs(result.strength)); 
    }
    
    init(data: any) {
    // Если мы передали деньги из прошлого раунда — берем их, иначе 10000
        this.cash = data.cash || 10000;
        this.heat = data.heat || 0;
        this.lastClosePrice = data.lastPrice || 100;
        
        // Если есть история — берем, иначе пустой массив
        this.prevHistory = data.history || [];

        // Сбрасываем состояние текущего раунда
        this.isGameRunning = false;
        this.isEditorOpen = false;
        this.positionSize = 0;
        this.entryPrice = 0;
        this.activeEffects = [];
    }

    // --- ЛОГИКА РЕДАКТОРА ---
    
    private openNewsEditor() {
        if (!this.isGameRunning) return;
        
        this.isGameRunning = false; // ПАУЗА ИГРЫ
        this.isEditorOpen = true;
        this.newsEditor.open();
    }

    private publishPlayerNews(text: string, type: NewsType) {
        this.isGameRunning = true;
        this.isEditorOpen = false;

        this.newsPanel.logNews(text, type);

        // СИЛА ВЛИЯНИЯ
        // Поскольку теперь это множитель тренда, значения должны быть ощутимыми.
        // 20 = очень сильный тренд (примерно +1% цены каждые 100мс, то есть +10% в секунду!)
        let strength = 0;
        if (type === 'GOOD') strength = 5;   
        if (type === 'BAD') strength = -5;

        // Мгновенный удар по тренду
        this.chartPanel.manipulate(strength); 
        
        // Долгосрочное влияние (Эхо новости)
        if (strength !== 0) {
            this.activeEffects.push({
                strength: strength / 2, 
                timeLeft: 15000 // Пусть влияет дольше (15 сек), но мягче
            });
        }

        this.changeHeat(type === 'NEUTRAL' ? -5 : 10);
    }

    // ... (остальной код: gameLoop, handleBuy, handleSell...)
    // Важно: в handleBuy/handleSell добавить проверку if (this.isEditorOpen) return;
    
    private gameLoop(delta: number) {
    if (!this.isGameRunning) return;

        // 1. ОБРАБОТКА НОВОСТЕЙ
        this.handleNewsLogic(delta);

        // 2. ВНЕШНЕЕ ВЛИЯНИЕ
        let externalInfluence = 0;
        this.activeEffects.forEach(effect => {
            externalInfluence += effect.strength;
        });

        // 3. ТИК ГРАФИКА
        this.chartPanel.tick(delta, externalInfluence);

        // --- ИСПРАВЛЕНИЕ ТУТ ---
        // Проверка конца раунда
        if (this.chartPanel.isFinished) {
            this.stopGame(); // Останавливаем игру
            
            // Показываем оверлей с результатами
            const historyToPass = this.chartPanel.getLastCandles(15);

            this.overlayPanel.show(
                'MARKET CLOSED', 
                `Balance: $${this.cash.toFixed(0)}`, 
                'NEXT DAY', 
                () => {
                    this.scene.restart({ 
                        cash: this.cash, 
                        heat: this.heat,
                        lastPrice: this.chartPanel.currentPrice,
                        history: historyToPass // <-- ПЕРЕДАЕМ В СЛЕДУЮЩИЙ РАУНД
                    }); 
                }
            );
        }

        // Расчет PnL и обновление UI
        let pnl = 0;
        if (this.positionSize > 0) {
            const currentVal = this.positionSize * this.chartPanel.currentPrice;
            const investVal = this.positionSize * this.entryPrice;
            pnl = currentVal - investVal;
        }
        this.statusPanel.updateStats(this.cash, pnl, this.heat);
    }
    
    private handleNewsLogic(delta: number) {
        // ... (старый код) ...
        this.newsTimer += delta;
        if (this.newsTimer >= this.nextNewsDelay) {
            this.spawnRandomNews();
            this.newsTimer = 0;
            this.nextNewsDelay = Phaser.Math.Between(10000, 25000);
        }
        this.activeEffects = this.activeEffects.filter(effect => {
            effect.timeLeft -= delta;
            return effect.timeLeft > 0;
        });
    }

    private spawnRandomNews() {
        // Если новости кончились — не спавним (или берем рандом из запаса)
        if (this.dailyNewsQueue.length === 0) return;

        // Берем первую новость из очереди и удаляем её оттуда
        const newsItem = this.dailyNewsQueue.shift(); 

        if (!newsItem) return;

        // Дальше старый код
        this.newsPanel.logNews(newsItem.text, newsItem.type);

        if (newsItem.type === 'GOOD') this.chartPanel.addMarker('NEWS_GOOD');
        if (newsItem.type === 'BAD') this.chartPanel.addMarker('NEWS_BAD');

        if (newsItem.strength !== 0) {
            this.activeEffects.push({
                strength: newsItem.strength,
                timeLeft: newsItem.duration
            });
        }
    }
    
    // ... handleBuy, handleSell, changeHeat, startDay, stopGame ...
    private handleBuy(amount: number) {
         if (!this.isGameRunning || this.isEditorOpen) return; // Блокировка
         // ...
         if (amount > this.cash || amount <= 0) return;
         this.cash -= amount;
         this.entryPrice = this.chartPanel.currentPrice;
         this.positionSize = amount / this.entryPrice;
         this.tradingPanel.updateButtons(true);
         this.chartPanel.addMarker('BUY');
    }

    private handleSell() {
         if (!this.isGameRunning || this.isEditorOpen) return;
         // ...
         if (this.positionSize <= 0) return;
         const exitValue = this.positionSize * this.chartPanel.currentPrice;
         this.cash += exitValue;
         this.positionSize = 0;
         this.entryPrice = 0;
         this.tradingPanel.updateButtons(false);
         this.chartPanel.addMarker('SELL');
    }
    
    private changeHeat(val: number) {
        this.heat = Phaser.Math.Clamp(this.heat + val, 0, 100);
    }

    private async startDay() {
    this.isGameRunning = false;

    // 1. Показываем загрузку
    this.overlayPanel.show(
        'DAY ' + (this.dayNumber || 1), // Можно добавить счетчик дней
        'Generating market sentiment (AI)...', 
        'LOADING...', 
        () => {} // Пустой колбэк, пока кнопка не активна
    );

    // 2. Запрашиваем новости у AI
    const aiNews = await NewsGenerator.generateDailyNews(10);

    // Если AI вернул пустоту (ошибка), берем старый пул и перемешиваем
    if (aiNews.length === 0) {
            console.log("Using fallback news");
            
            // Генерируем 10 случайных новостей из старого пула
            for(let i=0; i<10; i++) {
                const rand = Math.random();
                let type: 'GOOD' | 'BAD' | 'NEUTRAL' = 'NEUTRAL';
                
                if (rand < 0.35) type = 'BAD';
                else if (rand < 0.70) type = 'GOOD';
                
                const pool = NEWS_POOL[type];
                const newsItem = pool[Phaser.Math.Between(0, pool.length - 1)];
                
                // Добавляем в очередь копию объекта
                this.dailyNewsQueue.push({ ...newsItem, type });
            }
        } else {
            this.dailyNewsQueue = aiNews;
        }
    // 3. Обновляем оверлей — теперь можно играть
    this.overlayPanel.show(
        'MARKET OPEN', 
        `AI Generated ${this.dailyNewsQueue.length} headlines for today.`, 
        'START TRADING', 
        () => {
            this.isGameRunning = true;
        }
    );
}
    
    private stopGame() {
        this.isGameRunning = false;
    }
}