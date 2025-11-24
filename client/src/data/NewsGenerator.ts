
import { GoogleGenAI } from "@google/genai";
import { NewsType } from './NewsData';

const ai = new GoogleGenAI({apiKey: import.meta.env.VITE_GEMINI_KEY});

type NewsItem = {
  text: string;
  type: NewsType;
  strength: number;
  duration: number;
};

interface NewsItemAnswer {
  type: NewsType;
  strength: number;  // 1–15 (или как приходит)
  duration: number;  // 5000–20000
}

interface GeminiPartContent {
  text: string;  // JSON-строка, которую нужно распарсить
  role: string;  // обычно "model"
}

interface GeminiContent {
  parts: GeminiPartContent[];
  role: string;
}

interface GeminiCandidate {
  content: GeminiContent;
  finishReason: string;
  index: number;
}

interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  promptTokensDetails: { modality: string; tokenCount: number }[];
  thoughtsTokenCount: number;
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
  usageMetadata: GeminiUsageMetadata;
  modelVersion: string;
  responseId: string;
}


export function parseNews(raw: string): { news: NewsItem[] } {
  // 1. Находим все фрагменты вида:
  // "text": "...",
  // "type": "...",
  // "strength": ...,
  // "duration": ...
  const regex = /"text":\s*"([^"]+)"[\s\S]*?"type":\s*"([^"]+)"[\s\S]*?"strength":\s*(\d+)[\s\S]*?"duration":\s*(\d+)/g;

  const items: NewsItem[] = [];
  let match;

  while ((match = regex.exec(raw)) !== null) {
    items.push({
      text: match[1],
      type: match[2] as NewsType,
      strength: Number(match[3]),
      duration: Number(match[4]),
    });
  }

  return { news: items };
}

export class NewsGenerator {
    // private chat;
    // constructor() {
    //     this.chat = ai.chats.create({
    //     model: "gemini-2.5-flash",
    //     history: [
    //     {
    //         role: "user",
    //         parts: [{ text: "Hello" }],
    //     },
    //     ],
    // });
    // }
    static async generateDailyNews(count: number = 10): Promise<NewsItem[]> {
        // Промпт (Инструкция)
        const prompt = `
        You are a game content generator for a crypto trading simulator.

        Generate ${count} funny, short, chaotic news headlines.

        Output requirements:
        - Return ONLY a valid JSON object.
        - No code blocks, no markdown, no explanations.
        - The top-level object MUST be: { "news": [...] }

        Each element inside "news" must be an object with:
        - "text": string (max 10 words, in a chaotic/funny style: WallStreetBets, Bloomberg satire, yellow press)
        - "type": string ("GOOD" | "BAD" | "NEUTRAL")
        - "strength": integer 1–15
        - "duration": integer 5000–20000

        Example styles (do NOT wrap in code blocks):
        - The Trump administration believes the Kremlin has demonstrated its readiness for a peace agreement on Ukraine — CNN
        - Skoro dogovornyachok - Eduard Bahtiyarov News
        - Miners went on strike.

        Add some news about people with names Artur, Edik, Matwei, with jokes about crypto and latest news about politics"
        `;

        try {
            // 1. Отправляем запрос
            const response = await ai.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
            const text: string[] = [];
            for await (const chunk of response) {
                text.push(chunk.text || '');
            };
            // 2. Парсим JSON
            // Gemini обычно возвращает чистый JSON, если включен responseMimeType
            const parsedData = parseNews(text.join(''))
            // Проверка структуры (иногда модель может вернуть массив сразу, без ключа news)
            const rawNews = parsedData.news || parsedData;

            if (!Array.isArray(rawNews)) {
                throw new Error("Invalid JSON structure");
            }

            // 3. Преобразуем в наш формат (добавляем минусы для плохих новостей)
            const cleanNews: NewsItem[] = rawNews.map((item: any) => {
                let finalStrength = item.strength;
                if (item.type === 'BAD') finalStrength = -Math.abs(item.strength);
                if (item.type === 'NEUTRAL') finalStrength = 0;

                return {
                    text: item.text,
                    
                    // --- ИСПРАВЛЕНИЕ ТУТ ---
                    // Мы говорим TypeScript: "Мамой клянусь, это правильный тип"
                    type: item.type as NewsType, 
                    
                    strength: finalStrength,
                    duration: item.duration
                };
            });

            return cleanNews;

        } catch (error) {
            console.error("Gemini Generation failed:", error);
            return []; // Вернем пустой массив, игра подхватит старый пул
        }
    }

    static async analyzePlayerNews(text: string): Promise<NewsItem> {
        const prompt = `
        Analyze this crypto news headline written by a player: "${text}".
        
        Determine its potential impact on the market.
        Return a strictly valid JSON object (no markdown) with:
        - "type": "GOOD" (positive), "BAD" (negative), or "NEUTRAL" (if not big impact to the world or crypto world).
        - "strength": number (1 to 15). How shocking is it?
        - "duration": number (5000 to 20000). How long will the effect last?
        `;

        try {

            const response = await ai.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
            const textResp: string[] = [];
            for await (const chunk of response) {
                textResp.push(chunk.text || '');
            };
            // 2. Парсим JSON
            // Gemini обычно возвращает чистый JSON, если включен responseMimeType
            // const data = parseNews();
            const news: NewsItemAnswer = JSON.parse(textResp[0]);
            // candidates[0].content.parts[0].text
            // Корректировка знака для игры
            let finalStrength = news.strength;
            if (news.type === 'BAD') finalStrength = -Math.abs(news.strength);
            if (news.type === 'NEUTRAL') finalStrength = 0;

            return {
                    text: text,
                    type: news.type,
                    strength: finalStrength,
                    duration: news.duration
            };
        } catch (error) {
            console.error("Analysis failed:", error);
            // Фоллбэк, если AI упал: считаем новость нейтральной
            return { text: text, type: 'NEUTRAL', strength: 0, duration: 0 };
        }
    }

    static async analyzeRoundStrategy(headlines: string[]): Promise<any[]> {
        const prompt = `
        You are a financial AI game engine. 
        Analyze these 3 news headlines written by a player:
        1. "${headlines[0]}"
        2. "${headlines[1]}"
        3. "${headlines[2]}"

        For EACH headline, determine its impact on 3 separate markets: CRYPTO, STOCKS, BONDS.
        Markets react differently. For example, inflation is bad for Stocks but might be good for Gold/Bonds. Crypto is volatile.

        Return a JSON object with a key "analysis" containing an array of 3 objects.
        Each object must have:
        - "text": string (original headline)
        - "impacts": { "CRYPTO": number (-15 to 15), "STOCKS": number (-10 to 10), "BONDS": number (-5 to 5) }
        - "type": "GOOD" | "BAD" | "NEUTRAL" (general sentiment)
        `;

        try {
            const response = await ai.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
            const textResp: string[] = [];
            for await (const chunk of response) {
                textResp.push(chunk.text || '');
            };
            const parsedData = parseNews(textResp.join(''))
            // const data = JSON.parse(parsedData.text());
            return parsedData.news || [];
        } catch (error) {
            console.error("Batch Analysis failed:", error);
            // Fallback: возвращаем нули
            return headlines.map(h => ({
                text: h,
                impacts: { CRYPTO: 0, STOCKS: 0, BONDS: 0 },
                type: 'NEUTRAL'
            }));
        }
    }

    // Метод анализа пачки новостей игрока
    static async analyzeBatch(headlines: string[]): Promise<NewsItem[]> {
        // Формируем список для промпта
        const listStr = headlines.map((h, i) => `${i + 1}. "${h}"`).join("\n");

        const prompt = `
        You are a financial AI game engine.
        Analyze these ${headlines.length} crypto news headlines written by a player:
        ${listStr}

        Output requirements:
        - Return ONLY a valid JSON object.
        - No code blocks, no markdown.
        - The top-level object MUST be: { "results": [...] }
        - The order of results MUST match the order of input headlines (1st result for 1st headline, etc.).

        Each element inside "results" must be an object with:
        - "type": string ("GOOD" | "BAD" | "NEUTRAL")
        - "strength": integer 1–15
        - "duration": integer 5000–20000
        `;

        try {
            // 1. Отправляем запрос (используем твой рабочий синтаксис)
            const response = await ai.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            const text: string[] = [];
            for await (const chunk of response) {
                text.push(chunk.text || '');
            };

            // 2. Парсим JSON
            const rawString = text.join('');
            
            // Очищаем от маркдауна на всякий случай (```json ... ```)
            const cleanString = rawString.replace(/```json|```/g, '').trim();
            const parsedData = JSON.parse(cleanString); // Или используй свою функцию parseNews(rawString), если она доступна

            const rawResults = parsedData.results || [];

            // 3. Собираем итоговый массив
            // Используем map по входящим заголовкам (headlines), чтобы гарантировать порядок
            return headlines.map((headline, index) => {
                // Пытаемся найти результат по индексу, если AI вернул меньше - берем дефолт
                const item = rawResults[index] || { type: 'NEUTRAL', strength: 0, duration: 5000 };

                let finalStrength = item.strength;
                if (item.type === 'BAD') finalStrength = -Math.abs(item.strength);
                if (item.type === 'NEUTRAL') finalStrength = 0;

                return {
                    text: headline, // ВАЖНО: Возвращаем оригинальный текст игрока, а не галлюцинацию AI
                    type: item.type as NewsType,
                    strength: finalStrength,
                    duration: item.duration
                };
            });

        } catch (error) {
            console.error("Batch Analysis failed:", error);
            
            // Фоллбэк: если AI сломался, возвращаем новости как нейтральные, чтобы игра не зависла
            return headlines.map(h => ({
                text: h,
                type: 'NEUTRAL' as NewsType,
                strength: 0,
                duration: 5000
            }));
        }
    }
    
}

function parseGeminiNews(raw: string): NewsItem | null {
  // Убираем "data:" если есть
  const jsonStr = raw.replace(/^data:\s*/, "");
  const response: GeminiResponse = JSON.parse(jsonStr);

  const partText = response.candidates[0]?.content.parts[0]?.text;
  if (!partText) return null;

  // Парсим внутренний JSON
  const newsItem: NewsItem = JSON.parse(partText);
  return newsItem;
}