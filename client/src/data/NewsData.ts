export type NewsType = 'GOOD' | 'BAD' | 'NEUTRAL';

export interface NewsItem {
    text: string;
    type: NewsType;
    strength: number;   // Влияние на цену (-5 до 5)
    duration: number;   // Длительность в миллисекундах (1 свеча = 5000мс)
}

// 1 свеча = 5000мс. 
// Длительность 3 = 15000мс (3 свечи подряд цена будет под давлением)

export const NEWS_POOL = {
    GOOD: [
        { text: "Elon Musk bought the dip!", strength: 3, duration: 15000 },
        { text: "SEC approves new ETF.", strength: 2, duration: 20000 },
        { text: "Inflation drops to 0%!", strength: 4, duration: 10000 },
        { text: "Bank adopts crypto.", strength: 2, duration: 25000 },
        { text: "Whale just burned coins.", strength: 1.5, duration: 10000 },
        { text: "Trupm sucked Clinton's dick.", strength: 5.5, duration: 40000 }
    ],
    BAD: [
        { text: "Major exchange hacked!", strength: -4, duration: 10000 },
        { text: "China bans crypto (again).", strength: -3, duration: 20000 },
        { text: "CEO arrested for fraud.", strength: -5, duration: 5000 }, // Короткий но сильный удар
        { text: "Server outage at AWS.", strength: -2, duration: 15000 },
        { text: "Tax rate increased to 50%.", strength: -1.5, duration: 30000 } // Долгий негатив
    ],
    NEUTRAL: [
        { text: "Market volume is low.", strength: 0, duration: 5000 },
        { text: "Just a quiet Tuesday.", strength: 0.1, duration: 5000 }, // Легкий шум
        { text: "Traders are sleeping.", strength: -0.1, duration: 5000 },
        { text: "Waiting for Fed meeting.", strength: 0, duration: 10000 },
        { text: "Meme coin season over?", strength: 0, duration: 5000 }
    ]
};