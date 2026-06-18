import React, { useEffect, useRef, useState } from 'react';
import { createChart, LineStyle, IChartApi, ISeriesApi, LineSeries, CandlestickSeries, HistogramSeries, createSeriesMarkers } from 'lightweight-charts';
import { calculateEMA } from '../../utils/indicators';
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

export interface PatternMarker {
  time: number; // Unix timestamp in seconds
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  text: string;
}

interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LiveChartProps {
  symbol: string;
  height?: number;
  showVolume?: boolean;
  supportLevels?: number[];
  resistanceLevels?: number[];
  patterns?: PatternMarker[];
  smcData?: any;
}

export const LiveChart: React.FC<LiveChartProps> = ({
  symbol,
  height = 420,
  showVolume = true,
  supportLevels = [],
  resistanceLevels = [],
  patterns = [],
  smcData = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const addedPriceLinesRef = useRef<any[]>([]);
  const seriesMarkersRef = useRef<any>(null);

  const [timeframe, setTimeframe] = useState<string>('1D');
  const [candles, setCandles] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // SMC Overlays toggle state
  const [showOB, setShowOB] = useState<boolean>(true);
  const [showLiq, setShowLiq] = useState<boolean>(true);
  const [showMS, setShowMS] = useState<boolean>(true);

  const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];

  // 1. Fetch candles from the backend
  const fetchChartData = async (activeTf: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    
    setError(null);
    try {
      const response = await fetch(`/api/candles/${encodeURIComponent(symbol)}?timeframe=${activeTf}&limit=300`);
      if (!response.ok) {
        throw new Error(`Failed to load historical charts for ${symbol}`);
      }
      const data = (await response.json()) as OHLCV[];
      
      // Filter out invalid/undefined times and sort/de-duplicate
      const validData = (data || [])
        .filter(c => c && typeof c.time === 'number' && !isNaN(c.time) && c.time > 0)
        .sort((a, b) => a.time - b.time);
      
      const uniqueData: OHLCV[] = [];
      const seenTimes = new Set<number>();
      for (const c of validData) {
        if (!seenTimes.has(c.time)) {
          seenTimes.add(c.time);
          uniqueData.push(c);
        }
      }
      setCandles(uniqueData);
    } catch (err: any) {
      console.error('[LiveChart] Error loading candle feed:', err.message);
      setError(err.message || 'Error loading candle feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 2. Schedule Auto-Refresh
  useEffect(() => {
    fetchChartData(timeframe, false);

    let intervalSec = 15 * 60; // default 15 minutes
    if (timeframe === '1m') intervalSec = 60;
    else if (timeframe === '5m') intervalSec = 5 * 60;
    else if (timeframe === '15m') intervalSec = 15 * 60;
    else if (timeframe === '1h') intervalSec = 60 * 60;
    else intervalSec = 4 * 60 * 60; // 4 hours for D/W

    const timer = setInterval(() => {
      console.log(`[LiveChart] Auto-refresh tick for ${symbol} on ${timeframe}`);
      fetchChartData(timeframe, true);
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [symbol, timeframe]);

  // 3. Initialize and Redraw TradingView Chart
  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    // Clear previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = containerRef.current;
    
    // Create chart
    const chart = createChart(container, {
      width: container.clientWidth,
      height: height,
      layout: {
        background: { color: '#080A0F' }, // Slate Obsidian
        textColor: '#8892A4',
        fontSize: 11,
        fontFamily: '"JetBrains Mono", Inter, sans-serif'
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        mode: 1, // Magnet / Standard crosshair
        vertLine: {
          color: '#E0B56C',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: '#E0B56C',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        visible: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add Candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#34A77A',
      downColor: '#E05252',
      borderVisible: false,
      wickUpColor: '#34A77A',
      wickDownColor: '#E05252',
    });
    candleSeriesRef.current = candlestickSeries as any;

    const seriesMarkers = createSeriesMarkers(candlestickSeries, []);
    seriesMarkersRef.current = seriesMarkers;

    // Format candle series data
    candlestickSeries.setData(
      candles
        .filter(c => c && typeof c.time === 'number' && !isNaN(c.time) && c.time > 0)
        .map(c => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
    );

    // Setup Volume Histogram series if visible
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Show on an overlay (no separate scale)
    });
    volumeSeriesRef.current = volumeSeries as any;

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // Position standard volume histograms below (bottom 20% of chart)
        bottom: 0,
      },
    });

    const vData = candles
      .filter(c => c && typeof c.time === 'number' && !isNaN(c.time) && c.time > 0)
      .map(c => ({
        time: c.time as any,
        value: c.volume || 0,
        color: c.close >= c.open ? 'rgba(0, 208, 132, 0.25)' : 'rgba(255, 71, 87, 0.25)',
      }));
    volumeSeries.setData(vData);

    // Map closes for EMA calculators
    const closes = candles.map(c => c.close);
    
    // Add EMA 20
    const ema20Vals = calculateEMA(closes, 20);
    const ema20LineData = candles
      .map((c, i) => ({
        time: c?.time as any,
        value: ema20Vals[i] as number,
      }))
      .filter(item => item && typeof item.time === 'number' && !isNaN(item.time) && item.time > 0 && item.value !== null && item.value !== undefined);

    const ema20Series = chart.addSeries(LineSeries, {
      color: '#3B82F6', // Blue for short term EMA
      lineWidth: 2,
      title: 'EMA 20',
    });
    ema20Series.setData(ema20LineData);
    ema20SeriesRef.current = ema20Series as any;

    // Add EMA 50
    const ema50Vals = calculateEMA(closes, 50);
    const ema50LineData = candles
      .map((c, i) => ({
        time: c?.time as any,
        value: ema50Vals[i] as number,
      }))
      .filter(item => item && typeof item.time === 'number' && !isNaN(item.time) && item.time > 0 && item.value !== null && item.value !== undefined);

    const ema50Series = chart.addSeries(LineSeries, {
      color: '#F59E0B', // Amber for solid mid-term EMA
      lineWidth: 2,
      title: 'EMA 50',
    });
    ema50Series.setData(ema50LineData);
    ema50SeriesRef.current = ema50Series;

    // Trigger responsive resize handling
    const handleResize = () => {
      if (chart && container) {
        const width = container.clientWidth;
        chart.resize(width, height);

        // Hide volume on mobile width (< 640px)
        const isMobile = width < 640;
        volumeSeries.applyOptions({ visible: showVolume && !isMobile });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Initial resize trigger to parse mobile width
    handleResize();

    return () => {
      resizeObserver.disconnect();
      if (seriesMarkersRef.current) {
        seriesMarkersRef.current.detach();
        seriesMarkersRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [candles, height, showVolume]);

  // 4. Handle Support/Resistance lines and Pattern Markers dynamically
  useEffect(() => {
    const candlestickSeries = candleSeriesRef.current;
    if (!candlestickSeries || candles.length === 0) return;

    // Clear existing price lines
    addedPriceLinesRef.current.forEach(line => {
      try {
        candlestickSeries.removePriceLine(line);
      } catch (err) {}
    });
    addedPriceLinesRef.current = [];

    // Draw Support Levels
    if (supportLevels && supportLevels.length > 0) {
      supportLevels.forEach((price) => {
        try {
          const line = candlestickSeries.createPriceLine({
            price,
            color: '#34A77A',
            lineWidth: 1.5,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Support ₹${Math.round(price)}`,
          });
          addedPriceLinesRef.current.push(line);
        } catch {}
      });
    }

    // Draw Resistance Levels
    if (resistanceLevels && resistanceLevels.length > 0) {
      resistanceLevels.forEach((price) => {
        try {
          const line = candlestickSeries.createPriceLine({
            price,
            color: '#E05252',
            lineWidth: 1.5,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Resistance ₹${Math.round(price)}`,
          });
          addedPriceLinesRef.current.push(line);
        } catch {}
      });
    }

    // Draw SMC Order Blocks (OB)
    if (showOB && smcData && smcData.orderBlocks) {
      const { bullish, bearish } = smcData.orderBlocks;
      
      bullish.forEach((ob: any, idx: number) => {
        try {
          const highLine = candlestickSeries.createPriceLine({
            price: ob.high,
            color: '#34A77A',
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `Bullish OB#${idx + 1} High`,
          });
          const lowLine = candlestickSeries.createPriceLine({
            price: ob.low,
            color: '#34A77A',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: false,
            title: `Bullish OB#${idx + 1} Low`,
          });
          addedPriceLinesRef.current.push(highLine, lowLine);
        } catch {}
      });

      bearish.forEach((ob: any, idx: number) => {
        try {
          const highLine = candlestickSeries.createPriceLine({
            price: ob.high,
            color: '#E05252',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: false,
            title: `Bearish OB#${idx + 1} High`,
          });
          const lowLine = candlestickSeries.createPriceLine({
            price: ob.low,
            color: '#E05252',
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `Bearish OB#${idx + 1} Low`,
          });
          addedPriceLinesRef.current.push(highLine, lowLine);
        } catch {}
      });
    }

    // Draw SMC Liquidity Levels (BSL/SSL)
    if (showLiq && smcData && smcData.liquidity) {
      const { bsl, ssl } = smcData.liquidity;
      
      bsl.forEach((b: any) => {
        try {
          const line = candlestickSeries.createPriceLine({
            price: b.price,
            color: '#F59E0B',
            lineWidth: 1.5,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `BSL Pool (${b.strength})`,
          });
          addedPriceLinesRef.current.push(line);
        } catch {}
      });

      ssl.forEach((s: any) => {
        try {
          const line = candlestickSeries.createPriceLine({
            price: s.price,
            color: '#F59E0B',
            lineWidth: 1.5,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `SSL Pool (${s.strength})`,
          });
          addedPriceLinesRef.current.push(line);
        } catch {}
      });
    }

    // Draw Structure BOS/CHOCH Price Lines
    if (showMS && smcData && smcData.structure) {
      const { lastBOS, lastCHOCH } = smcData.structure;
      
      if (lastBOS) {
        try {
          const line = candlestickSeries.createPriceLine({
            price: lastBOS.price,
            color: lastBOS.direction === 'BULLISH' ? '#10B981' : '#EF4444',
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `BOS [${lastBOS.direction}]`,
          });
          addedPriceLinesRef.current.push(line);
        } catch {}
      }

      if (lastCHOCH) {
        try {
          const line = candlestickSeries.createPriceLine({
            price: lastCHOCH.price,
            color: '#F59E0B', 
            lineWidth: 1.5,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `CHOCH [${lastCHOCH.direction}]`,
          });
          addedPriceLinesRef.current.push(line);
        } catch {}
      }
    }

    // Embed pattern markers
    if (seriesMarkersRef.current) {
      const combinedMarkers = [...patterns];

      if (showMS && smcData && smcData.structure) {
        const { swingHighs = [], swingLows = [] } = smcData.structure;
        
        swingHighs.forEach((sh: any) => {
          if (sh && typeof sh.time === 'number' && !isNaN(sh.time)) {
            combinedMarkers.push({
              time: sh.time,
              position: 'aboveBar',
              color: '#F87171',
              shape: 'circle',
              text: 'SH'
            });
          }
        });

        swingLows.forEach((sl: any) => {
          if (sl && typeof sl.time === 'number' && !isNaN(sl.time)) {
            combinedMarkers.push({
              time: sl.time,
              position: 'belowBar',
              color: '#34D399',
              shape: 'circle',
              text: 'SL'
            });
          }
        });
      }

      // De-duplicate markers at exact timestamp to prevent crash
      // ALSO filter markers to only allow timestamps that actually exist in the candle series!
      const candleTimes = new Set(candles.map(c => c.time));
      const seenTimes = new Set();
      const uniqueMarkers = combinedMarkers.filter(m => {
        if (!m || typeof m.time !== 'number' || isNaN(m.time) || m.time <= 0) return false;
        if (!candleTimes.has(m.time)) return false; // MUST exist in candles data!
        if (seenTimes.has(m.time)) return false;
        seenTimes.add(m.time);
        return true;
      });

      if (uniqueMarkers.length > 0) {
        const markers = uniqueMarkers.map(p => ({
          time: p.time as any,
          position: p.position as any,
          color: p.color,
          shape: p.shape as any,
          text: p.text,
        }));
        seriesMarkersRef.current.setMarkers(markers);
      } else {
        seriesMarkersRef.current.setMarkers([]);
      }
    }
  }, [supportLevels, resistanceLevels, patterns, candles, smcData, showOB, showLiq, showMS]);

  return (
    <div className="w-full flex flex-col bg-[#03060B] border border-[#161B22] rounded-xl overflow-hidden p-4 relative">
      {/* Timeframe Bar & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#161B22] pb-3 mb-4">
        <div className="flex items-center gap-1 bg-black/40 border border-[#161B22] rounded-lg p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              id={`tf-btn-${tf}`}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-all cursor-pointer ${
                timeframe === tf
                  ? 'bg-[#E0B56C]/10 text-[#E0B56C] border border-[#E0B56C]/30 shadow-sm'
                  : 'text-gray-400 border border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Legend / Status indicator */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2 h-0.5 bg-blue-500 rounded"></span>
            <span>EMA 20</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-0.5 bg-[#F59E0B] rounded"></span>
            <span>EMA 50</span>
          </div>
          <button 
            onClick={() => fetchChartData(timeframe)}
            className="flex items-center gap-1 text-gray-400 hover:text-[#E0B56C] transition-colors cursor-pointer"
            title="Refresh candles data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {smcData && (
        <div id="smc-visual-toggles" className="flex flex-wrap items-center gap-4 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-4 text-[11px] font-mono px-3.5">
          <span className="text-yellow-500 font-bold uppercase text-[9px] tracking-wider">
            ⚡ SMC LAYOUTS:
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input 
              type="checkbox" 
              checked={showOB} 
              onChange={() => setShowOB(!showOB)} 
              className="rounded accent-emerald-500 bg-slate-900 border-slate-700 focus:ring-0"
            />
            Order Blocks
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input 
              type="checkbox" 
              checked={showLiq} 
              onChange={() => setShowLiq(!showLiq)} 
              className="rounded accent-amber-500 bg-slate-900 border-slate-700 focus:ring-0"
            />
            Liquidity Pools
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input 
              type="checkbox" 
              checked={showMS} 
              onChange={() => setShowMS(!showMS)} 
              className="rounded accent-yellow-500 bg-slate-900 border-slate-700 focus:ring-0"
            />
            Market Structure
          </label>
        </div>
      )}

      {/* Chart Canvas Area */}
      <div className="relative w-full overflow-hidden rounded-lg bg-[#080A0F]" style={{ minHeight: `${height}px` }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#080A0F]/95">
            <div className="w-8 h-8 rounded-full border-2 border-[#E0B56C]/20 border-t-[#E0B56C] animate-spin mb-3"></div>
            <p className="text-xs font-mono text-[#8892A4]">Retrieving Candle Feeds for {symbol} ({timeframe})...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#080A0F]/95 p-4 text-center">
            <p className="text-sm font-semibold text-rose-500 mb-2">Failed to sync Yahoo price stream</p>
            <p className="text-xs font-mono text-gray-500 max-w-sm mb-4">{error}</p>
            <button
              onClick={() => fetchChartData(timeframe)}
              className="px-4 py-1.5 text-xs font-mono border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-md transition-all cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {(!loading && candles.length === 0) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#080A0F]/95 p-4 text-center">
            <p className="text-sm font-mono text-gray-400">No candle data available for {symbol} on {timeframe}</p>
            <p className="text-xs font-mono text-gray-600 mt-1">This asset might not trade in this high-frequency interval.</p>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
