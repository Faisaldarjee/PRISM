export interface OHLCV {
  time: number  // Unix timestamp
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ══════════════════════════════════════════
// ORDER BLOCKS
// ══════════════════════════════════════════

export interface OrderBlock {
  type: 'BULLISH' | 'BEARISH'
  high: number
  low: number
  time: number           // when it formed
  strength: 'STRONG' | 'MEDIUM' | 'WEAK'
  tested: boolean        // has price returned to it?
  broken: boolean        // has price broken through it?
  distancePercent: number // % away from current price
}

export function calculateATR(candles: OHLCV[], period: number = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    );
    trs.push(tr);
  }
  if (trs.length === 0) return 0;
  const currentTRs = trs.slice(-period);
  const sum = currentTRs.reduce((a, b) => a + b, 0);
  return sum / currentTRs.length;
}

export function getATRAtIndex(candles: OHLCV[], index: number, period: number = 14): number {
  if (index <= 0) return 0;
  const trs: number[] = [];
  const start = Math.max(1, index - period + 1);
  for (let i = start; i <= index; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    );
    trs.push(tr);
  }
  if (trs.length === 0) return 0;
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

export function isOBTested(ob: OrderBlock, candles: OHLCV[]): boolean {
  const startIndex = candles.findIndex(c => c.time === ob.time);
  if (startIndex === -1 || startIndex >= candles.length - 1) return false;
  
  const testStart = Math.min(candles.length - 1, startIndex + 3);
  for (let i = testStart; i < candles.length; i++) {
    const c = candles[i];
    if (ob.type === 'BULLISH') {
      if (c.low <= ob.high * 1.005 && c.low >= ob.low) {
        return true;
      }
    } else {
      if (c.high >= ob.low * 0.995 && c.high <= ob.high) {
        return true;
      }
    }
  }
  return false;
}

export function isOBBroken(ob: OrderBlock, candles: OHLCV[]): boolean {
  const startIndex = candles.findIndex(c => c.time === ob.time);
  if (startIndex === -1 || startIndex >= candles.length - 1) return false;
  
  const testStart = startIndex + 1;
  for (let i = testStart; i < candles.length; i++) {
    const c = candles[i];
    if (ob.type === 'BULLISH') {
      if (c.close < ob.low) return true;
    } else {
      if (c.close > ob.high) return true;
    }
  }
  return false;
}

export function detectBullishOrderBlocks(
  candles: OHLCV[], 
  lookback: number = 100
): OrderBlock[] {
  const obs: OrderBlock[] = [];
  const startIdx = Math.max(1, candles.length - lookback);
  const atr = calculateATR(candles, 14);

  for (let i = startIdx; i < candles.length - 3; i++) {
    const consecutiveBullish = 
      candles[i].close > candles[i].open &&
      candles[i+1].close > candles[i+1].open &&
      candles[i+2].close > candles[i+2].open;

    const largeBullish = 
      (candles[i].close - candles[i].open) > 1.2 * atr;

    if (consecutiveBullish || largeBullish) {
      let lastBearishCandle: OHLCV | null = null;
      let lastBearishIdx = -1;
      for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
        if (candles[k].close < candles[k].open) {
          lastBearishCandle = candles[k];
          lastBearishIdx = k;
          break;
        }
      }

      if (lastBearishCandle && lastBearishIdx !== -1) {
        const checkEnd = Math.min(candles.length - 1, lastBearishIdx + 11);
        let maxHigh = lastBearishCandle.high;
        for (let m = lastBearishIdx + 1; m <= checkEnd; m++) {
          if (candles[m].high > maxHigh) {
            maxHigh = candles[m].high;
          }
        }
        
        const moveSize = maxHigh - lastBearishCandle.open;
        const candleAtr = getATRAtIndex(candles, lastBearishIdx, 14) || atr || 1.0;
        
        let strength: 'STRONG' | 'MEDIUM' | 'WEAK' = 'WEAK';
        if (moveSize > 3 * candleAtr) {
          strength = 'STRONG';
        } else if (moveSize > 2 * candleAtr) {
          strength = 'MEDIUM';
        } else if (moveSize > 1 * candleAtr) {
          strength = 'WEAK';
        }

        const ob: OrderBlock = {
          type: 'BULLISH',
          high: lastBearishCandle.open,
          low: lastBearishCandle.close,
          time: lastBearishCandle.time,
          strength,
          tested: false,
          broken: false,
          distancePercent: 0
        };

        ob.broken = isOBBroken(ob, candles);
        ob.tested = isOBTested(ob, candles);

        if (!ob.broken) {
          const currentPrice = candles[candles.length - 1].close;
          ob.distancePercent = Number(((ob.high - currentPrice) / currentPrice * 100).toFixed(2));
          if (!obs.some(existing => existing.time === ob.time)) {
            obs.push(ob);
          }
        }
      }
    }
  }

  return obs;
}

export function detectBearishOrderBlocks(
  candles: OHLCV[],
  lookback: number = 100
): OrderBlock[] {
  const obs: OrderBlock[] = [];
  const startIdx = Math.max(1, candles.length - lookback);
  const atr = calculateATR(candles, 14);

  for (let i = startIdx; i < candles.length - 3; i++) {
    const consecutiveBearish = 
      candles[i].close < candles[i].open &&
      candles[i+1].close < candles[i+1].open &&
      candles[i+2].close < candles[i+2].open;

    const largeBearish = 
      (candles[i].open - candles[i].close) > 1.2 * atr;

    if (consecutiveBearish || largeBearish) {
      let lastBullishCandle: OHLCV | null = null;
      let lastBullishIdx = -1;
      for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
        if (candles[k].close > candles[k].open) {
          lastBullishCandle = candles[k];
          lastBullishIdx = k;
          break;
        }
      }

      if (lastBullishCandle && lastBullishIdx !== -1) {
        const checkEnd = Math.min(candles.length - 1, lastBullishIdx + 11);
        let minLow = lastBullishCandle.low;
        for (let m = lastBullishIdx + 1; m <= checkEnd; m++) {
          if (candles[m].low < minLow) {
            minLow = candles[m].low;
          }
        }
        
        const moveSize = lastBullishCandle.open - minLow;
        const candleAtr = getATRAtIndex(candles, lastBullishIdx, 14) || atr || 1.0;
        
        let strength: 'STRONG' | 'MEDIUM' | 'WEAK' = 'WEAK';
        if (moveSize > 3 * candleAtr) {
          strength = 'STRONG';
        } else if (moveSize > 2 * candleAtr) {
          strength = 'MEDIUM';
        } else if (moveSize > 1 * candleAtr) {
          strength = 'WEAK';
        }

        const ob: OrderBlock = {
          type: 'BEARISH',
          high: lastBullishCandle.close,
          low: lastBullishCandle.open,
          time: lastBullishCandle.time,
          strength,
          tested: false,
          broken: false,
          distancePercent: 0
        };

        ob.broken = isOBBroken(ob, candles);
        ob.tested = isOBTested(ob, candles);

        if (!ob.broken) {
          const currentPrice = candles[candles.length - 1].close;
          ob.distancePercent = Number(((ob.low - currentPrice) / currentPrice * 100).toFixed(2));
          if (!obs.some(existing => existing.time === ob.time)) {
            obs.push(ob);
          }
        }
      }
    }
  }

  return obs;
}

export function getValidOrderBlocks(candles: OHLCV[]): {
  bullish: OrderBlock[]
  bearish: OrderBlock[]
  nearestBullishOB: OrderBlock | null
  nearestBearishOB: OrderBlock | null
} {
  const bullishOBs = detectBullishOrderBlocks(candles, 100);
  const bearishOBs = detectBearishOrderBlocks(candles, 100);

  const finalBullish = bullishOBs.filter(o => !o.broken).sort((a, b) => b.high - a.high).slice(0, 5);
  const finalBearish = bearishOBs.filter(o => !o.broken).sort((a, b) => a.low - b.low).slice(0, 5);

  // Fallbacks if no Order Block detected over looking back 100 candles
  if (finalBullish.length === 0 && candles.length > 0) {
    const startIdx = Math.max(0, candles.length - 100);
    let lowestLow = candles[startIdx].low;
    let lowestIdx = startIdx;
    for (let idx = startIdx; idx < candles.length; idx++) {
      if (candles[idx].low < lowestLow) {
        lowestLow = candles[idx].low;
        lowestIdx = idx;
      }
    }
    const currentPrice = candles[candles.length - 1].close;
    const fallbackOB: OrderBlock = {
      type: 'BULLISH',
      high: Number((lowestLow * 1.005).toFixed(2)),
      low: Number(lowestLow.toFixed(2)),
      time: candles[lowestIdx].time,
      strength: 'MEDIUM',
      tested: false,
      broken: false,
      distancePercent: Number(((lowestLow * 1.005 - currentPrice) / currentPrice * 100).toFixed(2))
    };
    finalBullish.push(fallbackOB);
  }

  if (finalBearish.length === 0 && candles.length > 0) {
    const startIdx = Math.max(0, candles.length - 100);
    let highestHigh = candles[startIdx].high;
    let highestIdx = startIdx;
    for (let idx = startIdx; idx < candles.length; idx++) {
      if (candles[idx].high > highestHigh) {
        highestHigh = candles[idx].high;
        highestIdx = idx;
      }
    }
    const currentPrice = candles[candles.length - 1].close;
    const fallbackOB: OrderBlock = {
      type: 'BEARISH',
      high: Number(highestHigh.toFixed(2)),
      low: Number((highestHigh * 0.995).toFixed(2)),
      time: candles[highestIdx].time,
      strength: 'MEDIUM',
      tested: false,
      broken: false,
      distancePercent: Number(((highestHigh * 0.995 - currentPrice) / currentPrice * 100).toFixed(2))
    };
    finalBearish.push(fallbackOB);
  }

  const nearestBullishOB = finalBullish.length > 0 
    ? [...finalBullish].sort((a, b) => Math.abs(a.distancePercent) - Math.abs(b.distancePercent))[0]
    : null;

  const nearestBearishOB = finalBearish.length > 0
    ? [...finalBearish].sort((a, b) => Math.abs(a.distancePercent) - Math.abs(b.distancePercent))[0]
    : null;

  return {
    bullish: finalBullish,
    bearish: finalBearish,
    nearestBullishOB,
    nearestBearishOB
  };
}

// ══════════════════════════════════════════
// MARKET STRUCTURE
// ══════════════════════════════════════════

export interface SwingPoint {
  type: 'HIGH' | 'LOW'
  price: number
  time: number
  index: number
}

export interface StructureBreak {
  type: 'BOS' | 'CHOCH'  
  direction: 'BULLISH' | 'BEARISH'
  price: number           
  time: number
  significance: 'MAJOR' | 'MINOR'
}

export interface MarketStructure {
  currentTrend: 'BULLISH' | 'BEARISH' | 'RANGING'
  swingHighs: SwingPoint[]
  swingLows: SwingPoint[]
  lastBOS: StructureBreak | null
  lastCHOCH: StructureBreak | null
  structureStrength: 'STRONG' | 'MODERATE' | 'WEAK'
  higherHighs: boolean    
  higherLows: boolean     
  lowerHighs: boolean     
  lowerLows: boolean      
}

export function detectSwingPoints(
  candles: OHLCV[],
  strength: number = 2
): { highs: SwingPoint[], lows: SwingPoint[] } {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];
  
  const start = Math.max(strength, candles.length - 100);
  const end = candles.length - strength - 1;

  for (let i = start; i <= end; i++) {
    const current = candles[i];
    
    let isHigh = true;
    for (let offset = 1; offset <= strength; offset++) {
      if (candles[i - offset].high >= current.high || candles[i + offset].high >= current.high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) {
      highs.push({
        type: 'HIGH',
        price: current.high,
        time: current.time,
        index: i
      });
    }

    let isLow = true;
    for (let offset = 1; offset <= strength; offset++) {
      if (candles[i - offset].low <= current.low || candles[i + offset].low <= current.low) {
        isLow = false;
        break;
      }
    }
    if (isLow) {
      lows.push({
        type: 'LOW',
        price: current.low,
        time: current.time,
        index: i
      });
    }
  }

  return { highs, lows };
}

export function analyzeMarketStructure(
  candles: OHLCV[]
): MarketStructure {
  const { highs, lows } = detectSwingPoints(candles, 2);
  
  let currentTrend: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING';
  let lastBOS: StructureBreak | null = null;
  let lastCHOCH: StructureBreak | null = null;
  
  let higherHighs = false;
  let higherLows = false;
  let lowerHighs = false;
  let lowerLows = false;

  if (highs.length >= 2) {
    const lastH = highs[highs.length - 1];
    const prevH = highs[highs.length - 2];
    higherHighs = lastH.price > prevH.price;
    lowerHighs = lastH.price < prevH.price;
  }
  if (lows.length >= 2) {
    const lastL = lows[lows.length - 1];
    const prevL = lows[lows.length - 2];
    higherLows = lastL.price > prevL.price;
    lowerLows = lastL.price < prevL.price;
  }

  if (higherHighs && higherLows) {
    currentTrend = 'BULLISH';
  } else if (lowerHighs && lowerLows) {
    currentTrend = 'BEARISH';
  }

  let runningTrend: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING';
  if (highs.length > 0 && lows.length > 0) {
    runningTrend = (highs[0].price < (lows[0].price * 1.05)) ? 'BULLISH' : 'BEARISH';
  }

  for (let i = 5; i < candles.length; i++) {
    const c = candles[i];
    
    const activeHighs = highs.filter(h => h.index < i - 2);
    const activeLows = lows.filter(l => l.index < i - 2);

    if (activeHighs.length > 0) {
      const lastHigh = activeHighs[activeHighs.length - 1];
      if (c.close > lastHigh.price) {
        if (runningTrend === 'BULLISH') {
          lastBOS = {
            type: 'BOS',
            direction: 'BULLISH',
            price: lastHigh.price,
            time: c.time,
            significance: 'MINOR'
          };
        } else {
          lastCHOCH = {
            type: 'CHOCH',
            direction: 'BULLISH',
            price: lastHigh.price,
            time: c.time,
            significance: 'MAJOR'
          };
          runningTrend = 'BULLISH';
        }
      }
    }

    if (activeLows.length > 0) {
      const lastLow = activeLows[activeLows.length - 1];
      if (c.close < lastLow.price) {
        if (runningTrend === 'BEARISH') {
          lastBOS = {
            type: 'BOS',
            direction: 'BEARISH',
            price: lastLow.price,
            time: c.time,
            significance: 'MINOR'
          };
        } else {
          lastCHOCH = {
            type: 'CHOCH',
            direction: 'BEARISH',
            price: lastLow.price,
            time: c.time,
            significance: 'MAJOR'
          };
          runningTrend = 'BEARISH';
        }
      }
    }
  }

  if (runningTrend !== 'RANGING') {
    currentTrend = runningTrend;
  } else if (higherHighs && higherLows) {
    currentTrend = 'BULLISH';
  } else if (lowerHighs && lowerLows) {
    currentTrend = 'BEARISH';
  }

  let structureStrength: 'STRONG' | 'MODERATE' | 'WEAK' = 'MODERATE';
  if (currentTrend === 'BULLISH' && higherHighs && higherLows) {
    structureStrength = 'STRONG';
  } else if (currentTrend === 'BEARISH' && lowerHighs && lowerLows) {
    structureStrength = 'STRONG';
  } else if (currentTrend === 'RANGING') {
    structureStrength = 'WEAK';
  }

  return {
    currentTrend,
    swingHighs: highs,
    swingLows: lows,
    lastBOS,
    lastCHOCH,
    structureStrength,
    higherHighs,
    higherLows,
    lowerHighs,
    lowerLows
  };
}

// ══════════════════════════════════════════
// LIQUIDITY LEVELS
// ══════════════════════════════════════════

export interface LiquidityLevel {
  type: 'BSL' | 'SSL'
  price: number
  time: number
  strength: 'MAJOR' | 'MINOR'
  swept: boolean  
  distancePercent: number
}

export function detectLiquidityLevels(
  candles: OHLCV[],
  lookback: number = 60
): {
  bsl: LiquidityLevel[]  
  ssl: LiquidityLevel[]
  nearestBSL: LiquidityLevel | null
  nearestSSL: LiquidityLevel | null
  priceApproachingBSL: boolean  
  priceApproachingSSL: boolean  
} {
  const { highs, lows } = detectSwingPoints(candles, 2);
  const currentPrice = candles[candles.length - 1].close;
  
  // Take last 5 swing highs and last 5 swing lows
  const last5Highs = highs.slice(-5);
  const last5Lows = lows.slice(-5);

  const bsl: LiquidityLevel[] = [];
  const ssl: LiquidityLevel[] = [];

  for (const h of last5Highs) {
    const spIndex = h.index;
    let swept = false;
    let touches = 1;

    for (let idx = spIndex + 1; idx < candles.length; idx++) {
      const c = candles[idx];
      if (c.high > h.price) {
        swept = true;
      }
      if (Math.abs(c.high - h.price) / h.price < 0.0025) {
        touches++;
      }
    }

    const distPercent = ((h.price - currentPrice) / currentPrice) * 100;

    bsl.push({
      type: 'BSL',
      price: h.price,
      time: h.time,
      strength: touches >= 3 ? 'MAJOR' : 'MINOR',
      swept,
      distancePercent: Number(distPercent.toFixed(2))
    });
  }

  for (const l of last5Lows) {
    const spIndex = l.index;
    let swept = false;
    let touches = 1;

    for (let idx = spIndex + 1; idx < candles.length; idx++) {
      const c = candles[idx];
      if (c.low < l.price) {
        swept = true;
      }
      if (Math.abs(c.low - l.price) / l.price < 0.0025) {
        touches++;
      }
    }

    const distPercent = ((l.price - currentPrice) / currentPrice) * 100;

    ssl.push({
      type: 'SSL',
      price: l.price,
      time: l.time,
      strength: touches >= 3 ? 'MAJOR' : 'MINOR',
      swept,
      distancePercent: Number(distPercent.toFixed(2))
    });
  }

  // Sort BSL/SSL levels to find the nearest to current price in absolute terms
  const bslSorted = [...bsl].sort((a, b) => Math.abs(a.distancePercent) - Math.abs(b.distancePercent));
  const sslSorted = [...ssl].sort((a, b) => Math.abs(a.distancePercent) - Math.abs(b.distancePercent));

  const nearestBSL = bslSorted.length > 0 ? bslSorted[0] : null;
  const nearestSSL = sslSorted.length > 0 ? sslSorted[0] : null;

  const priceApproachingBSL = nearestBSL ? Math.abs(nearestBSL.price - currentPrice) / currentPrice <= 0.02 : false;
  const priceApproachingSSL = nearestSSL ? Math.abs(nearestSSL.price - currentPrice) / currentPrice <= 0.02 : false;

  return {
    bsl: bslSorted,
    ssl: sslSorted,
    nearestBSL,
    nearestSSL,
    priceApproachingBSL,
    priceApproachingSSL
  };
}

// ══════════════════════════════════════════
// COMBINED SMC SIGNAL
// ══════════════════════════════════════════

export interface SMCAnalysis {
  orderBlocks: {
    bullish: OrderBlock[]
    bearish: OrderBlock[]
    nearestSupport: OrderBlock | null
    nearestResistance: OrderBlock | null
    priceAtBullishOB: boolean  
    priceAtBearishOB: boolean  
  }
  
  structure: MarketStructure
  
  liquidity: {
    bsl: LiquidityLevel[]
    ssl: LiquidityLevel[]
    nearestBSL: LiquidityLevel | null
    nearestSSL: LiquidityLevel | null
    recentSweep: 'BSL_SWEPT' | 'SSL_SWEPT' | null
  }
  
  smcSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL'
  smcConfidence: number  
  smcReasons: string[]   
  
  chartLevels: {
    bullishOBZones: { high: number, low: number, time: number }[]
    bearishOBZones: { high: number, low: number, time: number }[]
    bslLevels: number[]
    sslLevels: number[]
    structureBreaks: { price: number, time: number, type: string }[]
  }
}

export function generateSMCSignal(
  candles: OHLCV[]
): SMCAnalysis {
  const currentPrice = candles[candles.length - 1].close;
  const orderBlocks = getValidOrderBlocks(candles);
  const structure = analyzeMarketStructure(candles);
  const liquidity = detectLiquidityLevels(candles);

  const priceAtBullishOB = orderBlocks.nearestBullishOB 
    ? (currentPrice >= orderBlocks.nearestBullishOB.low && currentPrice <= orderBlocks.nearestBullishOB.high * 1.005)
    : false;

  const priceAtBearishOB = orderBlocks.nearestBearishOB
    ? (currentPrice <= orderBlocks.nearestBearishOB.high && currentPrice >= orderBlocks.nearestBearishOB.low * 0.995)
    : false;

  const cutoffTime = candles[Math.max(0, candles.length - 8)].time;
  
  let recentBSLSwept = false;
  let recentSSLSwept = false;
  
  const activeSwingHighs = structure.swingHighs.filter(h => h.time < cutoffTime);
  const activeSwingLows = structure.swingLows.filter(l => l.time < cutoffTime);
  const recentCandles = candles.slice(-8);

  for (const h of activeSwingHighs) {
    if (recentCandles.some(c => c.high > h.price && c.time > h.time)) {
      recentBSLSwept = true;
      break;
    }
  }

  for (const l of activeSwingLows) {
    if (recentCandles.some(c => c.low < l.price && c.time > l.time)) {
      recentSSLSwept = true;
      break;
    }
  }

  let recentSweep: 'BSL_SWEPT' | 'SSL_SWEPT' | null = null;
  if (recentSSLSwept) {
    recentSweep = 'SSL_SWEPT';
  } else if (recentBSLSwept) {
    recentSweep = 'BSL_SWEPT';
  }

  const buyConfirmations: string[] = [];
  const sellConfirmations: string[] = [];

  if (priceAtBullishOB) {
    buyConfirmations.push("Price resides within a high-demand Bullish Order Block zone.");
  }
  if (recentSweep === 'SSL_SWEPT') {
    buyConfirmations.push("Sell-side liquidity (SSL) swept recently, clearing passive retail orders.");
  }
  if (structure.currentTrend === 'BULLISH') {
    buyConfirmations.push("Market structure is solidly Bullish with higher highs and lows.");
  }
  if (structure.lastCHOCH && structure.lastCHOCH.direction === 'BULLISH') {
    buyConfirmations.push("Bullish Change of Character (CHOCH) indicating structural reversal downside.");
  }
  if (liquidity.nearestBSL && currentPrice < liquidity.nearestBSL.price) {
    buyConfirmations.push("Price sits below nearest Buy-side Liquidity (BSL) with significant room upward.");
  }

  if (priceAtBearishOB) {
    sellConfirmations.push("Price resides within a high-supply Bearish Order Block zone.");
  }
  if (recentSweep === 'BSL_SWEPT') {
    sellConfirmations.push("Buy-side liquidity (BSL) swept recently, wiping out retail buy stops.");
  }
  if (structure.currentTrend === 'BEARISH') {
    sellConfirmations.push("Market structure is solidly Bearish with lower highs and lows.");
  }
  if (structure.lastCHOCH && structure.lastCHOCH.direction === 'BEARISH') {
    sellConfirmations.push("Bearish Change of Character (CHOCH) indicating structural breakdown downside.");
  }
  if (liquidity.nearestSSL && currentPrice > liquidity.nearestSSL.price) {
    sellConfirmations.push("Price sits above nearest Sell-side Liquidity (SSL) with large downside risk.");
  }

  let smcSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' = 'NEUTRAL';
  let smcConfidence = 50;
  let smcReasons: string[] = [];

  if (candles.length < 50) {
    smcReasons = ["Insufficient price history for SMC analysis (less than 50 candles)."];
    return {
      orderBlocks: {
        bullish: orderBlocks.bullish,
        bearish: orderBlocks.bearish,
        nearestSupport: orderBlocks.nearestBullishOB,
        nearestResistance: orderBlocks.nearestBearishOB,
        priceAtBullishOB,
        priceAtBearishOB
      },
      structure,
      liquidity: {
        bsl: liquidity.bsl,
        ssl: liquidity.ssl,
        nearestBSL: liquidity.nearestBSL,
        nearestSSL: liquidity.nearestSSL,
        recentSweep
      },
      smcSignal: 'NEUTRAL',
      smcConfidence: 50,
      smcReasons,
      chartLevels: {
        bullishOBZones: [],
        bearishOBZones: [],
        bslLevels: [],
        sslLevels: [],
        structureBreaks: []
      }
    };
  }

  if (buyConfirmations.length >= 3) {
    smcSignal = 'STRONG_BUY';
    smcConfidence = Math.min(80 + buyConfirmations.length * 4, 95);
    smcReasons = buyConfirmations;
  } else if (buyConfirmations.length >= 1 && buyConfirmations.length < 3 && sellConfirmations.length === 0) {
    smcSignal = 'BUY';
    smcConfidence = 60 + buyConfirmations.length * 5;
    smcReasons = buyConfirmations;
  } else if (sellConfirmations.length >= 3) {
    smcSignal = 'STRONG_SELL';
    smcConfidence = Math.min(80 + sellConfirmations.length * 4, 95);
    smcReasons = sellConfirmations;
  } else if (sellConfirmations.length >= 1 && sellConfirmations.length < 3 && buyConfirmations.length === 0) {
    smcSignal = 'SELL';
    smcConfidence = 60 + sellConfirmations.length * 5;
    smcReasons = sellConfirmations;
  } else {
    smcSignal = 'NEUTRAL';
    smcConfidence = 50;
    smcReasons = ["Market structure and institutional price zones are in consolidation. Wait for sweep or clear break."];
  }

  const bullishOBZones = orderBlocks.bullish.map(ob => ({ high: ob.high, low: ob.low, time: ob.time }));
  const bearishOBZones = orderBlocks.bearish.map(ob => ({ high: ob.high, low: ob.low, time: ob.time }));
  const bslLevels = liquidity.bsl.map(b => b.price);
  const sslLevels = liquidity.ssl.map(s => s.price);

  const structureBreaks: { price: number, time: number, type: string }[] = [];
  if (structure.lastBOS) {
    structureBreaks.push({ price: structure.lastBOS.price, time: structure.lastBOS.time, type: 'BOS' });
  }
  if (structure.lastCHOCH) {
    structureBreaks.push({ price: structure.lastCHOCH.price, time: structure.lastCHOCH.time, type: 'CHOCH' });
  }

  return {
    orderBlocks: {
      bullish: orderBlocks.bullish,
      bearish: orderBlocks.bearish,
      nearestSupport: orderBlocks.nearestBullishOB,
      nearestResistance: orderBlocks.nearestBearishOB,
      priceAtBullishOB,
      priceAtBearishOB
    },
    structure,
    liquidity: {
      bsl: liquidity.bsl,
      ssl: liquidity.ssl,
      nearestBSL: liquidity.nearestBSL,
      nearestSSL: liquidity.nearestSSL,
      recentSweep
    },
    smcSignal,
    smcConfidence,
    smcReasons,
    chartLevels: {
      bullishOBZones,
      bearishOBZones,
      bslLevels,
      sslLevels,
      structureBreaks
    }
  };
}

// ══════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════

export function analyzeSMC(candles: OHLCV[]): SMCAnalysis {
  return generateSMCSignal(candles);
}
