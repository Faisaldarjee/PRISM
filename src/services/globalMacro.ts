import YahooFinanceClass from 'yahoo-finance2';
import { db } from './serverApi';

const YahooFinance = (typeof YahooFinanceClass === 'function' ? YahooFinanceClass : (YahooFinanceClass as any).default) as any;
const yahooFinance = new YahooFinance({
  validation: {
    logErrors: false,
    logOptionsErrors: false,
  }
});

export interface GlobalMacroData {
  sp500: { price: number; change1D: number; trend: 'UP' | 'DOWN' | 'FLAT' };
  nasdaq: { price: number; change1D: number; trend: 'UP' | 'DOWN' | 'FLAT' };
  dowJones: { price: number; change1D: number };
  
  crudeoil: { price: number; change1D: number; unit: 'USD/barrel' };
  gold: { price: number; change1D: number };
  silver: { price: number; change1D: number };
  
  usdinr: { rate: number; change1D: number; impact: string };
  dxy: { value: number; change1D: number };
  us10yrYield: { value: number; change1D: number };
  
  nikkei: { price: number; change1D: number };
  hangSeng: { price: number; change1D: number };
  sgxNifty: { price: number; change1D: number };
  
  vix: { value: number; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' };
  indiaVix: { value: number; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' };
  
  globalSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impactOnNifty: string;
  lastUpdated: string;
}

async function getSafeQuote(symbol: string, defaultPrice: number, defaultChange = 0.0) {
  try {
    const q = await yahooFinance.quote(symbol) as any;
    if (q) {
      return {
        price: q.regularMarketPrice ?? defaultPrice,
        change1D: q.regularMarketChangePercent ?? defaultChange
      };
    }
  } catch (err: any) {
    console.warn(`[globalMacro] Failed to fetch quote for ${symbol}:`, err.message);
  }
  return { price: defaultPrice, change1D: defaultChange };
}

export async function fetchGlobalMacro(): Promise<GlobalMacroData> {
  const cacheTTL = 15 * 60 * 1000; // 15 mins
  try {
    const row = db.prepare("SELECT * FROM macro_cache WHERE id = 1").get() as any;
    if (row) {
      const parsed = JSON.parse(row.data);
      const isStillValid = (Date.now() - new Date(row.updated_at).getTime()) < cacheTTL;
      if (isStillValid) {
        console.log("[GlobalMacro] Serving from cache.");
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn("[GlobalMacro] Cache fetch error:", err.message);
  }

  console.log("[GlobalMacro] Cache stale/miss. Refreshing indicators from Yahoo Finance...");

  // Fetch in parallel with safe wrappers
  const [
    sp500Raw,
    nasdaqRaw,
    dowJonesRaw,
    crudeoilRaw,
    goldRaw,
    silverRaw,
    usdinrRaw,
    dxyRaw,
    us10yRaw,
    nikkeiRaw,
    hangSengRaw,
    niftyRaw,
    vixRaw,
    indiaVixRaw
  ] = await Promise.all([
    getSafeQuote('^GSPC', 5250, 0.1),
    getSafeQuote('^IXIC', 16500, 0.2),
    getSafeQuote('^DJI', 39200, 0.05),
    getSafeQuote('CL=F', 78.5, -0.2),
    getSafeQuote('GC=F', 2360, 0.3),
    getSafeQuote('SI=F', 29.8, 0.1),
    getSafeQuote('INR=X', 83.45, 0.01),
    getSafeQuote('DX-Y.NYB', 104.3, -0.1),
    getSafeQuote('^TNX', 4.35, 0.02),
    getSafeQuote('^N225', 38800, -0.4),
    getSafeQuote('^HSI', 18200, 0.6),
    getSafeQuote('^NSEI', 22600, 0.15),
    getSafeQuote('^VIX', 14.2, -1.2),
    getSafeQuote('^INDIAVIX', 15.6, -0.8)
  ]);

  // Compute SGX Nifty estimation (if ticker fails, use Nifty close + S&P change * index coefficients)
  let sgxPrice = niftyRaw.price * (1 + (sp500Raw.change1D / 200));
  try {
    const sgxRaw = await yahooFinance.quote('^SGXNIFTY') as any;
    if (sgxRaw && sgxRaw.regularMarketPrice) {
      sgxPrice = sgxRaw.regularMarketPrice;
    }
  } catch {
    // fallback to estimation
  }

  const getTrend = (change: number): 'UP' | 'DOWN' | 'FLAT' => {
    if (change > 0.1) return 'UP';
    if (change < -0.1) return 'DOWN';
    return 'FLAT';
  };

  const getVixLevel = (val: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' => {
    if (val < 15) return 'LOW';
    if (val < 22) return 'MEDIUM';
    if (val < 30) return 'HIGH';
    return 'EXTREME';
  };

  // Overall logic
  // BULLISH: S&P500 > 0 AND crude < 80 AND VIX < 20
  // BEARISH: S&P500 < -1% OR VIX > 25 OR crude spike > 5%
  let globalSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (sp500Raw.change1D > 0 && crudeoilRaw.price < 80 && vixRaw.price < 20) {
    globalSignal = 'BULLISH';
  } else if (sp500Raw.change1D < -1.0 || vixRaw.price > 25 || crudeoilRaw.change1D > 5.0) {
    globalSignal = 'BEARISH';
  }

  // Currency Impact
  const dynamicUSINRImpact = usdinrRaw.change1D > 0 
    ? 'Weakening rupee pressures trade balance but boosts export-oriented IT sectors.' 
    : 'Strengthening rupee support foreign equity flows and controls input cost inflation.';

  // Master impact sentence
  let impactOnNifty = '';
  if (globalSignal === 'BULLISH') {
    impactOnNifty = `US S&P 500 up and VIX at ${vixRaw.price.toFixed(1)} indicates a highly favorable risk-on posture. Indian markets likely to open positive.`;
  } else if (globalSignal === 'BEARISH') {
    impactOnNifty = `High risk warnings globally with S&P indices down and/or oil spike above $80 barrels. Widen trading bounds.`;
  } else {
    impactOnNifty = `Flat to mixed global indices. Domestic stock triggers and earnings momentum will primary drive index directions today.`;
  }

  const macroResult: GlobalMacroData = {
    sp500: { price: sp500Raw.price, change1D: sp500Raw.change1D, trend: getTrend(sp500Raw.change1D) },
    nasdaq: { price: nasdaqRaw.price, change1D: nasdaqRaw.change1D, trend: getTrend(nasdaqRaw.change1D) },
    dowJones: { price: dowJonesRaw.price, change1D: dowJonesRaw.change1D },
    crudeoil: { price: crudeoilRaw.price, change1D: crudeoilRaw.change1D, unit: 'USD/barrel' },
    gold: { price: goldRaw.price, change1D: goldRaw.change1D },
    silver: { price: silverRaw.price, change1D: silverRaw.change1D },
    usdinr: { rate: usdinrRaw.price, change1D: usdinrRaw.change1D, impact: dynamicUSINRImpact },
    dxy: { value: dxyRaw.price, change1D: dxyRaw.change1D },
    us10yrYield: { value: us10yRaw.price, change1D: us10yRaw.change1D },
    nikkei: { price: nikkeiRaw.price, change1D: nikkeiRaw.change1D },
    hangSeng: { price: hangSengRaw.price, change1D: hangSengRaw.change1D },
    sgxNifty: { price: sgxPrice, change1D: niftyRaw.change1D },
    vix: { value: vixRaw.price, level: getVixLevel(vixRaw.price) },
    indiaVix: { value: indiaVixRaw.price, level: getVixLevel(indiaVixRaw.price) },
    globalSignal,
    impactOnNifty,
    lastUpdated: new Date().toISOString()
  };

  try {
    db.prepare(`
      INSERT INTO macro_cache (id, data, updated_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
    `).run(JSON.stringify(macroResult), new Date().toISOString());
  } catch (err: any) {
    console.error("[GlobalMacro] Failed to write to cache:", err.message);
  }

  return macroResult;
}

export function getMacroImpactOnSector(sector: string, data: GlobalMacroData): string {
  if (!data) return "Stable global indicators keep domestic sector triggers active.";
  const norm = sector.toUpperCase();
  
  if (norm.includes("IT") || norm.includes("TECHNOLOGY")) {
    const rateVal = data.usdinr?.rate ?? 83.45;
    return `USD/INR rate is at ${rateVal.toFixed(2)} — IT sector exports receive significant margins buffers during a weakening rupee.`;
  }
  if (norm.includes("METAL") || norm.includes("MINING")) {
    const dxyVal = data.dxy?.value ?? 104.3;
    const hsChange = data.hangSeng?.change1D ?? 0.0;
    return `DXY at ${dxyVal.toFixed(1)} and Hang Seng change (${hsChange > 0 ? '+' : ''}${hsChange.toFixed(1)}%) influence base industrial metal demand globally.`;
  }
  if (norm.includes("FMCG")) {
    const oilVal = data.crudeoil?.price ?? 78.5;
    return `Crude oil spot sits at $${oilVal.toFixed(1)} — Directly influences packaging costs, raw plastics, and FMCG corporate margins structures.`;
  }
  if (norm.includes("FINANCIAL") || norm.includes("BANK")) {
    const yieldVal = data.us10yrYield?.value ?? 4.35;
    return `Sovereign 10Y Yield at ${yieldVal.toFixed(2)}% structures banking credit flows and global retail swap rates.`;
  }
  if (norm.includes("AUTO")) {
    const oilVal = data.crudeoil?.price ?? 78.5;
    return `Crude oil prices at $${oilVal.toFixed(1)} indirectly guide freight costs, logistics volumes, and automobile purchases.`;
  }
  if (norm.includes("ENERGY") || norm.includes("POWER")) {
    const oilVal = data.crudeoil?.price ?? 78.5;
    return `Direct oil structures at $${oilVal.toFixed(1)} frame regional spot pricing bounds for utilities and energy explorers.`;
  }
  
  const vixVal = data.vix?.value ?? 14.2;
  return `Stable global indicators keep domestic sector triggers active. Global VIX registers at ${vixVal.toFixed(1)}.`;
}

export function getSGXNiftySignal(data: GlobalMacroData): string {
  if (!data?.sgxNifty) {
    return "GIFT Nifty indicates a stable open today.";
  }
  const price = data.sgxNifty.price ?? 22600;
  const change = data.sgxNifty.change1D ?? 0.15;
  const estDiff = price - price / (1 + (change / 100));
  const diffPercent = (estDiff / price) * 100;
  
  if (diffPercent > 0.15) {
    return `GIFT Nifty registers gap-up potential of +${diffPercent.toFixed(2)}% — NSE likely to open positive today.`;
  }
  if (diffPercent < -0.15) {
    return `GIFT Nifty indicates gap-down compression of ${diffPercent.toFixed(2)}% — Caution advised on morning openings.`;
  }
  return `SGX/GIFT Nifty indicates flat technical transition of ${diffPercent.toFixed(2)}% on morning open.`;
}
