import { getPricesHistory, db } from './serverApi';
import { TechnicalAgent } from './agents/technicalAgent';
import { fetchHeadlinesForSymbol } from './newsFetcher';
import { ai, isGeminiSuspended, handleGeminiError } from './geminiState';

// Ensure database table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS sector_cache (
    sector TEXT PRIMARY KEY,
    data TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

function getLocalSentimentAndSummary(sectorName: string, headlines: string[]): { newsScore: 'positive' | 'negative' | 'neutral'; summary: string } {
  const positiveWords = [
    "surge", "gain", "rise", "jump", "growth", "bullish", "profit", "positive", "high", "upgrade", 
    "outperform", "buy", "expand", "robust", "strong", "win", "hike", "record", "stimulus", 
    "demand", "soar", "revival", "acquisition", "alliance", "benefit", "boost", "incentive", 
    "infusion", "support", "approval", "recovery"
  ];
  const negativeWords = [
    "drop", "fall", "sink", "decline", "bearish", "loss", "negative", "low", "downgrade", 
    "underperform", "sell", "contract", "weak", "slump", "crisis", "cut", "debt", "npa", 
    "slowdown", "concern", "crash", "deficit", "risk", "warn", "fines", "audit", "investigation",
    "penalty", "regulatory hurdle"
  ];

  let score = 0;
  const lowercaseHeadlines = headlines.map(h => h.toLowerCase());

  for (const headline of lowercaseHeadlines) {
    for (const word of positiveWords) {
      if (headline.includes(word)) {
        score++;
      }
    }
    for (const word of negativeWords) {
      if (headline.includes(word)) {
        score--;
      }
    }
  }

  let newsScore: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (score > 1) {
    newsScore = 'positive';
  } else if (score < -1) {
    newsScore = 'negative';
  }

  let summary = `Stable technical indices maintain baseline tracking with standard market parameters for ${sectorName}.`;
  
  const match = headlines.find(h => {
    const hl = h.toLowerCase();
    return positiveWords.some(pw => hl.includes(pw)) || negativeWords.some(nw => hl.includes(nw));
  });

  if (match) {
    const emotionText = newsScore === 'positive' ? 'constructive drivers' : (newsScore === 'negative' ? 'cautious metrics' : 'consolidating trends');
    summary = `Active developments indicate ${emotionText} after reports: "${match.replace(/[".']/g, '')}" highlights.`;
  } else if (headlines.length > 0) {
    const briefHeadline = headlines[0].replace(/[".']/g, '');
    summary = `Sector activity tracks alongside updates: "${briefHeadline.length > 80 ? briefHeadline.slice(0, 80) + '...' : briefHeadline}".`;
  }

  return { newsScore, summary };
}

export interface SectorDefinition {
  name: string;
  index: string;
  indexSymbol: string;
  stocks: string[];
  newsKeywords: string[];
}

export interface SectorMomentum {
  sector: string;
  name: string;
  score: number;
  priceChange1D: number;
  priceChange5D: number;
  priceChange20D: number;
  newsScore: 'positive' | 'negative' | 'neutral';
  trending: boolean;
  topStocks: string[];
  summary: string;
  updatedAt: string;
}

export const SECTORS: Record<string, SectorDefinition> = {
  BANKING: {
    name: 'Banking & Finance',
    index: 'NIFTY BANK',
    indexSymbol: '^NSEBANK',
    stocks: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 
             'IDFCFIRSTB', 'BANDHANBNK', 'FEDERALBNK', 'INDUSINDBK', 'AUBANK'],
    newsKeywords: ['bank', 'RBI', 'interest rate', 'NPA', 'credit', 'lending', 'NBFC']
  },
  IT: {
    name: 'Information Technology',
    index: 'NIFTY IT',
    indexSymbol: '^CNXIT',
    stocks: ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM', 'MPHASIS', 
             'PERSISTENT', 'COFORGE', 'OFSS'],
    newsKeywords: ['IT', 'software', 'tech', 'USD', 'outsourcing', 'AI', 'cloud']
  },
  AUTO: {
    name: 'Automobile',
    index: 'NIFTY AUTO',
    indexSymbol: '^CNXAUTO',
    stocks: ['MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO', 
             'EICHERMOT', 'ASHOKLEY', 'TVSMOTOR', 'BALKRISIND'],
    newsKeywords: ['auto', 'vehicle', 'EV', 'electric vehicle', 'fuel', 'GST auto']
  },
  PHARMA: {
    name: 'Pharmaceuticals',
    index: 'NIFTY PHARMA',
    indexSymbol: '^CNXPHARMA',
    stocks: ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'BIOCON', 
             'AUROPHARMA', 'LUPIN', 'ALKEM', 'TORNTPHARM'],
    newsKeywords: ['pharma', 'FDA', 'drug', 'USFDA', 'API', 'medicine', 'healthcare']
  },
  METALS: {
    name: 'Metals & Mining',
    index: 'NIFTY METAL',
    indexSymbol: '^CNXMETAL',
    stocks: ['TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'HINDZINC', 
             'SAIL', 'NMDC', 'COALINDIA', 'JINDALSTEL'],
    newsKeywords: ['steel', 'metal', 'aluminium', 'zinc', 'copper', 'iron ore', 'commodity']
  },
  FMCG: {
    name: 'FMCG',
    index: 'NIFTY FMCG',
    indexSymbol: '^CNXFMCG',
    stocks: ['HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR', 
             'MARICO', 'GODREJCP', 'COLPAL', 'EMAMILTD'],
    newsKeywords: ['FMCG', 'consumer', 'rural demand', 'monsoon', 'inflation', 'food']
  },
  ENERGY: {
    name: 'Energy & Power',
    index: 'NIFTY ENERGY',
    indexSymbol: '^CNXENERGY',
    stocks: ['RELIANCE', 'ONGC', 'IOC', 'BPCL', 'GAIL', 'POWERGRID', 
             'NTPC', 'ADANIGREEN', 'TATAPOWER'],
    newsKeywords: ['oil', 'crude', 'gas', 'power', 'energy', 'renewable', 'solar']
  },
  REALTY: {
    name: 'Real Estate',
    index: 'NIFTY REALTY',
    indexSymbol: '^CNXREALTY',
    stocks: ['DLF', 'GODREJPROP', 'OBEROIRLTY', 'PRESTIGE', 'BRIGADE', 
             'PHOENIXLTD', 'SOBHA'],
    newsKeywords: ['real estate', 'realty', 'property', 'housing', 'construction', 'REITs']
  },
  INFRA: {
    name: 'Infrastructure',
    index: 'NIFTY INFRA',
    indexSymbol: '^CNXINFRA',
    stocks: ['LT', 'ADANIPORTS', 'GMRINFRA', 'IRB', 'NBCC', 'NCC', 'KEC'],
    newsKeywords: ['infrastructure', 'roads', 'highways', 'ports', 'capex', 'government spending']
  },
  FINANCE: {
    name: 'Financial Services',
    index: 'NIFTY FIN SERVICE',
    indexSymbol: '^CNXFINANCE',
    stocks: ['BAJFINANCE', 'BAJAJFINSV', 'MUTHOOTFIN', 'MANAPPURAM', 
             'CHOLAFIN', 'M&MFIN', 'LICHSGFIN'],
    newsKeywords: ['NBFC', 'gold loan', 'microfinance', 'insurance', 'asset management']
  },
  DEFENCE: {
    name: 'Defence & Aerospace',
    index: 'NIFTY INDIA DEFENCE',
    indexSymbol: 'NIFTYDEFENCE.NS',
    stocks: ['HAL', 'BEL', 'COCHINSHIP', 'BEML', 'MAZDOCK', 'PARAS'],
    newsKeywords: ['defence', 'military', 'HAL', 'DRDO', 'order win', 'export']
  }
};

/**
 * Calculates sector momentum and news sentiment step-by-step
 */
export async function getSectorMomentum(sectorKey: string): Promise<SectorMomentum> {
  const sector = SECTORS[sectorKey];
  if (!sector) {
    throw new Error(`Sector with key ${sectorKey} is not defined.`);
  }

  console.log(`[SectorIntelligence] analyzing momentum for ${sector.name} (${sector.indexSymbol})...`);

  // 1. Fetch index price metrics
  let priceChange1D = 0;
  let priceChange5D = 0;
  let priceChange20D = 0;
  let trending = false;

  try {
    const prices = await getPricesHistory(sector.indexSymbol, 30);
    const len = prices.length;
    if (len >= 2) {
      const latest = prices[len - 1].close;
      const prevD1 = prices[len - 2].close;
      priceChange1D = ((latest - prevD1) / prevD1) * 100;

      if (len >= 6) {
        const prevD5 = prices[len - 6].close;
        priceChange5D = ((latest - prevD5) / prevD5) * 100;
      }
      if (len >= 21) {
        const prevD20 = prices[len - 21].close;
        priceChange20D = ((latest - prevD20) / prevD20) * 100;
      }

      // Deem trending if both 5-day and 20-day gains are positive and ascending
      trending = priceChange5D > 0 && priceChange20D > -1;
    }
  } catch (err: any) {
    console.warn(`[SectorIntelligence] Index price fetch failed for ${sector.name}:`, err.message);
  }

  // 2. Fetch combined news headlines and filter by sector-specific keywords
  let finalHeadlines: string[] = [];
  try {
    const generalNews = await fetchHeadlinesForSymbol('NIFTY');
    if (generalNews && generalNews.length > 0) {
      const keywords = sector.newsKeywords.map(k => k.toLowerCase());
      const filtered = generalNews.filter(headline => {
        const hLower = headline.toLowerCase();
        return keywords.some(kw => hLower.includes(kw));
      });
      finalHeadlines = filtered.length > 0 ? filtered.slice(0, 5) : generalNews.slice(0, 5);
    }
  } catch (err: any) {
    console.warn(`[SectorIntelligence] News fetching failed for ${sector.name}:`, err.message);
  }

  // 3. Process Gemini sentiment analysis
  let newsScore: 'positive' | 'negative' | 'neutral' = 'neutral';
  let summary = `Stable technical indices maintain baseline tracking with standard market parameters.`;

  const isSuspended = isGeminiSuspended();

  if (ai && finalHeadlines.length > 0 && !isSuspended) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze the following Indian financial market news headlines for keywords related to the ${sector.name} sector:
${finalHeadlines.map(h => "- " + h).join("\n")}

Determine if overall news sentiment for ${sector.name} is positive, negative, or neutral.
Also provide a 1-sentence micro market outlook detailing driver trends.

Return strictly a valid JSON object matching this schema:
{
  "newsScore": "positive" | "negative" | "neutral",
  "summary": "1 sentence micro summary"
}`,
        config: {
          responseMimeType: "application/json",
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      if (parsed.newsScore) newsScore = parsed.newsScore;
      if (parsed.summary) summary = parsed.summary;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn(`[SectorIntelligence] Gemini sentiment parse failed for ${sector.name}:`, errMsg);
      
      handleGeminiError(err, `Sector-${sector.name}`);

      // Rollback to dynamic local rule-based sentiment assessment
      const fallback = getLocalSentimentAndSummary(sector.name, finalHeadlines);
      newsScore = fallback.newsScore;
      summary = fallback.summary;
    }
  } else {
    // If Gemini is not configured, or headlines are empty, or Gemini is rate-limited:
    const fallback = getLocalSentimentAndSummary(sector.name, finalHeadlines);
    newsScore = fallback.newsScore;
    summary = fallback.summary;
  }

  // 4. Calculate Combined score [0 - 100]
  // Base starting reference
  let score = 50;
  // Apply price change momentum subscores (clamped safely)
  score += Math.max(-15, Math.min(15, priceChange1D * 10));
  score += Math.max(-20, Math.min(20, priceChange5D * 4));
  score += Math.max(-15, Math.min(15, priceChange20D * 1.5));

  // Sentiment multipliers
  if (newsScore === 'positive') score += 12;
  if (newsScore === 'negative') score -= 12;

  // Round and bound to 5-100 range
  score = Math.round(Math.max(5, Math.min(100, score)));

  // Retrieve top stocks for this sector
  const topStocks = await getTopStocksFromSector(sectorKey, 3);

  return {
    sector: sectorKey,
    name: sector.name,
    score,
    priceChange1D: Number(priceChange1D.toFixed(2)),
    priceChange5D: Number(priceChange5D.toFixed(2)),
    priceChange20D: Number(priceChange20D.toFixed(2)),
    newsScore,
    trending,
    topStocks,
    summary,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Returns all 11 sector strengths from database cache or fetches them fresh
 */
export async function getAllSectorStrengths(): Promise<SectorMomentum[]> {
  try {
    const rows = db.prepare("SELECT * FROM sector_cache").all() as any[];
    const now = Date.now();
    const cacheTTL = 2 * 60 * 60 * 1000; // 2 hour cache

    const isCacheValid = rows.length === Object.keys(SECTORS).length && rows.every(r => {
      const updated = new Date(r.updated_at).getTime();
      return (now - updated) < cacheTTL;
    });

    if (isCacheValid) {
      console.log(`[SectorIntelligence] cache hit. Returning ${rows.length} valid sectors.`);
      const fetched = rows.map(r => JSON.parse(r.data) as SectorMomentum);
      fetched.sort((a, b) => b.score - a.score);
      return fetched;
    }
  } catch (err: any) {
    console.warn("[SectorIntelligence] Error checking caches, proceeding to fresh calculations:", err.message);
  }

  console.log("[SectorIntelligence] Cache stale or miss. Triggering full 11-sector sequential evaluations...");
  const keys = Object.keys(SECTORS);
  const results: SectorMomentum[] = [];
  for (const key of keys) {
    results.push(await getSectorMomentum(key));
  }

  // Save to database cache
  try {
    const insertStmt = db.prepare(`
      INSERT INTO sector_cache (sector, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(sector) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `);

    const transaction = db.transaction((list) => {
      for (const r of list) {
        insertStmt.run(r.sector, JSON.stringify(r), new Date().toISOString());
      }
    });

    transaction(results);
    console.log(`[SectorIntelligence] Successfully populated sector weights cache table with ${results.length} items.`);
  } catch (err: any) {
    console.error("[SectorIntelligence] Save cache failed:", err.message);
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Query top performing setups for a specified sector stock list
 */
export async function getTopStocksFromSector(sectorKey: string, limit = 5): Promise<string[]> {
  const sector = SECTORS[sectorKey];
  if (!sector) return [];

  const stocks = sector.stocks;
  const symbolsWithNS = stocks.map(s => s.endsWith('.NS') ? s.toUpperCase() : `${s.toUpperCase()}.NS`);

  try {
    // 1. Try reading cached rankings from scanner bulk database predictions_cache
    const placeholders = symbolsWithNS.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT symbol, score 
      FROM predictions_cache 
      WHERE UPPER(symbol) IN (${placeholders})
      ORDER BY score DESC
    `).all(...symbolsWithNS) as any[];

    const foundSymbols = rows.map(r => r.symbol.toUpperCase());
    const missingSymbols = symbolsWithNS.filter(s => !foundSymbols.includes(s));

    const resolvedScores: { symbol: string; score: number }[] = rows.map(r => ({
      symbol: r.symbol,
      score: r.score
    }));

    // 2. Local fallback sequence: analyze missing stocks on-the-fly
    if (missingSymbols.length > 0) {
      console.log(`[SectorIntelligence] ${missingSymbols.length} stocks missing in bulkScanner cache. Calculating on-the-fly...`);
      const fallbackPromises = missingSymbols.map(async (sym) => {
        try {
          const prices = await getPricesHistory(sym, 35);
          if (prices && prices.length >= 30) {
            const technicals = TechnicalAgent.analyze(prices);
            const rsi = technicals.rsi;
            const adx = technicals.adx || 0;
            const bbSqueeze = technicals.bbSqueeze?.isSqueezed || false;
            const volumeRatio = technicals.volumeRatio || 1.0;

            let score = 0;
            if (adx > 25) score += 30;
            if (bbSqueeze) score += 25;
            if (volumeRatio > 1.5) score += 20;
            if (rsi >= 35 && rsi <= 65) score += 15;
            if (rsi < 30) score += 10;

            score = Math.min(100, score);
            return { symbol: sym, score };
          }
        } catch {
          // Silent catch
        }
        return { symbol: sym, score: 40 }; // default baseline score for ranking
      });

      const fallbackResults = await Promise.all(fallbackPromises);
      resolvedScores.push(...fallbackResults);
    }

    resolvedScores.sort((a, b) => b.score - a.score);
    return resolvedScores.slice(0, limit).map(item => item.symbol);
  } catch (err: any) {
    console.error("[SectorIntelligence] Error fetching setups for stock list:", err.message);
    // Simple fallback: return original sector setup list up to limit
    return symbolsWithNS.slice(0, limit);
  }
}
