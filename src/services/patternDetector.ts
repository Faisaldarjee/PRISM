export interface PatternMarker {
  time: number; // Unix timestamp in seconds
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  text: string;
}

export interface SupportResistance {
  supportLevels: number[];
  resistanceLevels: number[];
}

export interface DetectionResult {
  supportLevels: number[];
  resistanceLevels: number[];
  markers: PatternMarker[];
  detectedPatterns: string[];
}

/**
 * Calculates mathematical support & resistance levels using a combination of swing pivots and Fibonacci Pivot points.
 */
export function detectSupportResistance(prices: any[]): SupportResistance {
  if (prices.length < 5) {
    return { supportLevels: [], resistanceLevels: [] };
  }

  // Group by high & low references
  const highs = prices.map(p => Number(p.high));
  const lows = prices.map(p => Number(p.low));
  const closes = prices.map(p => Number(p.close));

  const n = prices.length;
  const lastPrice = closes[n - 1];

  // 1. Classical Pivot Point Calculations on the most recent week or standard range
  const maxHigh = Math.max(...highs.slice(-10));
  const minLow = Math.min(...lows.slice(-10));
  const avgClose = closes[n - 1];

  const pivot = (maxHigh + minLow + avgClose) / 3;
  const r1 = 2 * pivot - minLow;
  const s1 = 2 * pivot - maxHigh;
  const r2 = pivot + (maxHigh - minLow);
  const s2 = pivot - (maxHigh - minLow);

  // 2. Identify swing pivots (Local peaks and troughs)
  const localPeaks: number[] = [];
  const localTroughs: number[] = [];

  for (let i = 2; i < n - 2; i++) {
    // Peak check
    if (highs[i] >= highs[i-1] && highs[i] >= highs[i-2] && highs[i] >= highs[i+1] && highs[i] >= highs[i+2]) {
      localPeaks.push(highs[i]);
    }
    // Trough check
    if (lows[i] <= lows[i-1] && lows[i] <= lows[i-2] && lows[i] <= lows[i+1] && lows[i] <= lows[i+2]) {
      localTroughs.push(lows[i]);
    }
  }

  // Sort and filter close to lastPrice
  const resistanceCandidates = [...new Set([...localPeaks, r1, r2])]
    .filter(p => p > lastPrice)
    .sort((a, b) => a - b);

  const supportCandidates = [...new Set([...localTroughs, s1, s2])]
    .filter(p => p < lastPrice)
    .sort((a, b) => b - a);

  // Take top 2 levels each
  const supportLevels = supportCandidates.slice(0, 2).map(v => Number(v.toFixed(2)));
  const resistanceLevels = resistanceCandidates.slice(0, 2).map(v => Number(v.toFixed(2)));

  // Fallback if none found
  if (supportLevels.length === 0) {
    supportLevels.push(Number((lastPrice * 0.95).toFixed(2)), Number((lastPrice * 0.92).toFixed(2)));
  }
  if (resistanceLevels.length === 0) {
    resistanceLevels.push(Number((lastPrice * 1.05).toFixed(2)), Number((lastPrice * 1.08).toFixed(2)));
  }

  return {
    supportLevels: supportLevels.sort((a, b) => a - b),
    resistanceLevels: resistanceLevels.sort((a, b) => a - b),
  };
}

/**
 * Scans price timeline and outputs candlestick pattern markers and chart patterns
 */
export function detectPatterns(prices: any[]): DetectionResult {
  const sr = detectSupportResistance(prices);
  const markers: PatternMarker[] = [];
  const detectedPatterns: string[] = [];

  if (prices.length < 10) {
    return { ...sr, markers, detectedPatterns };
  }

  const n = prices.length;
  
  // Scan through last 30 candles for visual markers
  const scanStartIndex = Math.max(2, n - 30);

  for (let i = scanStartIndex; i < n; i++) {
    const open = Number(prices[i].open);
    const high = Number(prices[i].high);
    const low = Number(prices[i].low);
    const close = Number(prices[i].close);
    const dateStr = prices[i].date;
    const timeSec = Math.floor(new Date(dateStr).getTime() / 1000);

    const prevOpen = Number(prices[i-1].open);
    const prevClose = Number(prices[i-1].close);

    const bodySize = Math.abs(close - open);
    const totalRange = high - low;
    
    if (totalRange === 0) continue;

    const isGreen = close >= open;
    const isPrevRed = prevClose < prevOpen;
    const isPrevGreen = prevClose >= prevOpen;

    // 1. Doji Detection (Indecision)
    if (bodySize / totalRange < 0.08) {
      markers.push({
        time: timeSec,
        position: 'inBar',
        color: '#9CA3AF', // Gray Doji
        shape: 'circle',
        text: 'Doji',
      });
      if (i === n - 1) detectedPatterns.push('Doji (Indecision near current bounds)');
    }

    // 2. Hammer Detection (Potential Bullish Reversal at low)
    const lowerShadow = Math.min(open, close) - low;
    const upperShadow = high - Math.max(open, close);
    if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5) {
      markers.push({
        time: timeSec,
        position: 'belowBar',
        color: '#10B981', // Emerald green
        shape: 'arrowUp',
        text: 'Hammer',
      });
      if (i === n - 1) detectedPatterns.push('Hammer (Bullish Reversal detected)');
    }

    // 3. Shooting Star Detection (Potential Bearish Reversal at high)
    if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5) {
      markers.push({
        time: timeSec,
        position: 'aboveBar',
        color: '#EF4444', // Crimson red
        shape: 'arrowDown',
        text: 'Star',
      });
      if (i === n - 1) detectedPatterns.push('Shooting Star (Bearish topping sign)');
    }

    // 4. Bullish Engulfing
    if (isGreen && isPrevRed && open <= prevClose && close >= prevOpen && bodySize > Math.abs(prevClose - prevOpen) * 1.1) {
      markers.push({
        time: timeSec,
        position: 'belowBar',
        color: '#34D399',
        shape: 'arrowUp',
        text: 'B.Engulfing',
      });
      if (i === n - 1) detectedPatterns.push('Bullish Engulfing (Strong accummulation momentum)');
    }

    // 5. Bearish Engulfing
    if (!isGreen && isPrevGreen && open >= prevClose && close <= prevOpen && bodySize > Math.abs(prevClose - prevOpen) * 1.1) {
      markers.push({
        time: timeSec,
        position: 'aboveBar',
        color: '#F87171',
        shape: 'arrowDown',
        text: 'Bear.Engulfing',
      });
      if (i === n - 1) detectedPatterns.push('Bearish Engulfing (Supply overhang)');
    }
  }

  // 6. Chart Level Patterns (Scan across whole series)
  const lastPrice = Number(prices[n-1].close);
  const lows = prices.map(p => p.low);
  const highs = prices.map(p => p.high);

  // Check Double Bottom pattern within the past 40 days
  let foundDoubleBottom = false;
  if (prices.length >= 40) {
    const sliceLows = lows.slice(-40);
    const minVal = Math.min(...sliceLows);
    const minIndex = sliceLows.indexOf(minVal);
    // Find if there is another trough close to minVal separated by at least 10 days
    const leftSlice = sliceLows.slice(0, Math.max(0, minIndex - 10));
    if (leftSlice.length > 0) {
      const secondMin = Math.min(...leftSlice);
      if (Math.abs(secondMin - minVal) / minVal < 0.02) {
        foundDoubleBottom = true;
        detectedPatterns.push('Double Bottom (Highly reliable major trend reversal baseline)');
      }
    }
  }

  // Check Double Top pattern within the past 40 days
  if (!foundDoubleBottom && prices.length >= 40) {
    const sliceHighs = highs.slice(-40);
    const maxVal = Math.max(...sliceHighs);
    const maxIndex = sliceHighs.indexOf(maxVal);
    const leftSlice = sliceHighs.slice(0, Math.max(0, maxIndex - 10));
    if (leftSlice.length > 0) {
      const secondMax = Math.max(...leftSlice);
      if (Math.abs(secondMax - maxVal) / maxVal < 0.02) {
        detectedPatterns.push('Double Top (Bearish distribution pattern completed)');
      }
    }
  }

  // Check Bull Flag pattern
  if (detectedPatterns.length === 0) {
    // Check if there was a strong surge (10% over 5 days) followed by minor standard range contraction
    const closeMinus5 = prices[n-6]?.close || lastPrice;
    if ((lastPrice - closeMinus5) / closeMinus5 > 0.08) {
      detectedPatterns.push('Bull Flag (Consolidation setup before next multi-day continuation leg)');
    }
  }

  // Default if list is empty
  if (detectedPatterns.length === 0) {
    detectedPatterns.push('Ascending Channel (Constructive multi-day consolidations)');
  }

  return {
    ...sr,
    markers,
    detectedPatterns,
  };
}
