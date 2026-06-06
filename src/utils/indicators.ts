/**
 * Standard Exponential Moving Average (EMA) calculation
 * Returns an array of the same length as the input closes.
 * First period-1 values will be null.
 */
export function calculateEMA(closes: number[], period: number): (number | null)[] {
  const ema: (number | null)[] = [];
  if (closes.length === 0) return [];

  const k = 2 / (period + 1);

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      ema.push(null);
    } else if (i === period - 1) {
      // First value is simple moving average (SMA)
      const sum = closes.slice(0, period).reduce((acc, val) => acc + val, 0);
      ema.push(sum / period);
    } else {
      const prev = ema[i - 1];
      if (prev === null) {
        ema.push(null);
      } else {
        const nextVal = closes[i] * k + prev * (1 - k);
        ema.push(nextVal);
      }
    }
  }

  return ema;
}
