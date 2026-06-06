import React from 'react';
import { 
  ShieldAlert, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Compass,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { SMCAnalysis } from '../services/smcAnalysis';

interface SMCPanelProps {
  symbol: string;
  smcData: SMCAnalysis | null;
  loading: boolean;
}

export function SMCPanel({ symbol, smcData, loading }: SMCPanelProps) {
  const cleanSymbol = symbol.replace('.NS', '');

  // Loading skeleton block
  if (loading) {
    return (
      <div id="smc-panel-loading" className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-950/40 space-y-6 animate-pulse">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="h-6 w-48 bg-slate-800 rounded" />
          <div className="h-6 w-24 bg-slate-800 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="h-4 w-28 bg-slate-800 rounded" />
            <div className="h-12 w-full bg-slate-800/60 rounded-lg" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-28 bg-slate-800 rounded" />
            <div className="h-12 w-full bg-slate-800/60 rounded-lg" />
          </div>
        </div>
        <div className="h-24 w-full bg-slate-800/40 rounded-lg" />
      </div>
    );
  }

  // Insufficient history or missing data state
  if (!smcData || !smcData.structure || smcData.smcReasons?.length === 0 || smcData.smcReasons?.[0]?.includes("Insufficient")) {
    return (
      <div id="smc-panel-empty" className="glass-card p-8 rounded-xl border border-slate-800 bg-slate-900/10 text-center space-y-4">
        <div className="flex justify-center">
          <Compass className="h-12 w-12 text-slate-500 animate-spin-slow" />
        </div>
        <h3 className="text-md font-medium text-slate-300">SMC Engine Offline</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans leading-relaxed">
          Insufficient price history for {cleanSymbol} SMC analysis. 
          A minimum of 50 active daily candles are required to map structural pivot points.
        </p>
      </div>
    );
  }

  const { orderBlocks, structure, liquidity, smcSignal, smcConfidence, smcReasons } = smcData;

  // Configuration for signal styling
  const signalConfigs = {
    STRONG_BUY: {
      text: 'STRONG BUY',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
      icon: <TrendingUp className="h-5 w-5 text-emerald-400" />
    },
    BUY: {
      text: 'BUY',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/5 border-emerald-500/20',
      icon: <TrendingUp className="h-5 w-5 text-emerald-500" />
    },
    NEUTRAL: {
      text: 'NEUTRAL',
      color: 'text-slate-400',
      bg: 'bg-slate-500/5 border-slate-500/20',
      icon: <Activity className="h-5 w-5 text-slate-400" />
    },
    SELL: {
      text: 'SELL',
      color: 'text-rose-500',
      bg: 'bg-rose-500/5 border-rose-500/20',
      icon: <TrendingDown className="h-5 w-5 text-rose-500" />
    },
    STRONG_SELL: {
      text: 'STRONG SELL',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
      icon: <TrendingDown className="h-5 w-5 text-rose-400" />
    }
  };

  const currentConfig = signalConfigs[smcSignal] || signalConfigs.NEUTRAL;

  return (
    <div id="smc-panel-wrapper" className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-950/50 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Layers className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-sans">
              Smart Money Concepts (SMC) Engine
            </h2>
            <p className="text-[10px] text-slate-500 font-mono">
              Institutional order tracking & liquidity maps
            </p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${currentConfig.bg}`}>
          {currentConfig.icon}
          <span className={`text-xs font-bold font-mono ${currentConfig.color}`}>
            {currentConfig.text} • {smcConfidence}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. MARKET STRUCTURE */}
        <div className="space-y-4 border-r border-slate-800/50 pr-0 lg:pr-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Market Structure
            </h3>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-850">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Structure Bias</span>
                <span className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                  structure.currentTrend === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-400' :
                  structure.currentTrend === 'BEARISH' ? 'bg-rose-500/10 text-rose-400' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {structure.currentTrend}
                </span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Confidence Rating:</span>
                <span className="font-mono text-slate-300 font-medium">{structure.structureStrength}</span>
              </div>
            </div>

            {/* Swing metrics */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 bg-slate-900/30 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-500">Highs:</span>
                <span className={structure.higherHighs ? 'text-emerald-400' : 'text-rose-400'}>
                  {structure.higherHighs ? 'HH ↗' : 'LH ↘'}
                </span>
              </div>
              <div className="p-2 bg-slate-900/30 rounded border border-slate-800 flex justify-between items-center">
                <span className="text-slate-500">Lows:</span>
                <span className={structure.higherLows ? 'text-emerald-400' : 'text-rose-400'}>
                  {structure.higherLows ? 'HL ↗' : 'LL ↘'}
                </span>
              </div>
            </div>

            {/* BOS and CHOCH logs */}
            <div className="space-y-1.5 text-[10px] font-mono">
              {structure.lastCHOCH && (
                <div className="flex justify-between items-center p-1.5 bg-yellow-500/5 rounded border border-yellow-500/10">
                  <span className="text-yellow-500/80">CHOCH reversal:</span>
                  <span className="text-slate-300">₹{structure.lastCHOCH.price.toFixed(2)}</span>
                </div>
              )}
              {structure.lastBOS ? (
                <div className="flex justify-between items-center p-1.5 bg-slate-905 rounded border border-slate-800">
                  <span className="text-slate-500">Breakout (BOS):</span>
                  <span className="text-slate-300">₹{structure.lastBOS.price.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center p-1.5 bg-slate-905 rounded border border-slate-800/50">
                  <span className="text-slate-600">No recent BOS:</span>
                  <span className="text-slate-500">Consolidating</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. ORDER BLOCKS */}
        <div className="space-y-4 border-r border-slate-800/50 pr-0 lg:pr-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Layers className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Order Blocks (OB)
            </h3>
          </div>

          <div className="space-y-3 font-sans">
            {/* Bullish support OB */}
            {(() => {
              const hasOB = !!orderBlocks.nearestSupport;
              const isNear = hasOB && Math.abs(orderBlocks.nearestSupport!.distancePercent) <= 3.0;
              return (
                <div className="p-3 bg-slate-900/30 rounded-lg border border-emerald-500/25 space-y-1">
                  <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-800/20 mb-1.5">
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      🟢 {isNear ? 'Bullish OB' : 'Nearest Bullish OB'} <span className="text-[9px] text-slate-500">({isNear ? 'Support' : 'Far Support'})</span>
                    </span>
                    <span className="font-mono text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-1 py-0.5 rounded">
                      {orderBlocks.nearestSupport?.strength || 'NONE'}
                    </span>
                  </div>
                  {hasOB ? (
                    isNear ? (
                      <div>
                        <div className="font-mono text-sm text-slate-200 font-semibold">
                          ₹{orderBlocks.nearestSupport!.low.toFixed(2)} - ₹{orderBlocks.nearestSupport!.high.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                          <span>Proximity:</span>
                          <span className="text-emerald-400 font-mono font-medium">
                            {orderBlocks.nearestSupport!.distancePercent}% away (Near Price)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="font-mono text-sm text-slate-200 font-semibold">
                          ₹{orderBlocks.nearestSupport!.low.toFixed(2)} - ₹{orderBlocks.nearestSupport!.high.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-amber-500 font-mono">
                          {Math.abs(orderBlocks.nearestSupport!.distancePercent).toFixed(2)}% below current price
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-[10px] text-slate-500 leading-relaxed italic pt-1">
                      No bullish institutional accumulations detected.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Bearish resistance OB */}
            {(() => {
              const hasOB = !!orderBlocks.nearestResistance;
              const isNear = hasOB && Math.abs(orderBlocks.nearestResistance!.distancePercent) <= 3.0;
              return (
                <div className="p-3 bg-slate-900/30 rounded-lg border border-rose-500/25 space-y-1">
                  <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-800/20 mb-1.5">
                    <span className="text-rose-400 font-medium flex items-center gap-1">
                      🔴 {isNear ? 'Bearish OB' : 'Nearest Bearish OB'} <span className="text-[9px] text-slate-500">({isNear ? 'Supply' : 'Far Supply'})</span>
                    </span>
                    <span className="font-mono text-rose-400 font-bold text-[10px] bg-rose-500/10 px-1 py-0.5 rounded">
                      {orderBlocks.nearestResistance?.strength || 'NONE'}
                    </span>
                  </div>
                  {hasOB ? (
                    isNear ? (
                      <div>
                        <div className="font-mono text-sm text-slate-200 font-semibold">
                          ₹{orderBlocks.nearestResistance!.low.toFixed(2)} - ₹{orderBlocks.nearestResistance!.high.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                          <span>Proximity:</span>
                          <span className="text-rose-400 font-mono font-medium">
                            +{orderBlocks.nearestResistance!.distancePercent}% away (Near Price)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="font-mono text-sm text-slate-200 font-semibold">
                          ₹{orderBlocks.nearestResistance!.low.toFixed(2)} - ₹{orderBlocks.nearestResistance!.high.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-amber-500 font-mono">
                          {Math.abs(orderBlocks.nearestResistance!.distancePercent).toFixed(2)}% above current price
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-[10px] text-slate-500 leading-relaxed italic pt-1">
                      No bearish institutional distribution zones detected.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* 3. LIQUIDITY POOLS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldAlert className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Liquidity Pools
            </h3>
          </div>

          <div className="space-y-3 font-sans">
            {/* BSL Above list */}
            <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans border-b border-slate-800/50 pb-1 mb-1">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_4px_#F59E0B]" />
                  BSL (Buy-Side Stops Above)
                </span>
                <span className="text-[9px] px-1 py-0.5 tracking-wider bg-slate-800 rounded font-mono text-slate-300 uppercase">
                  Resistance Pools
                </span>
              </div>

              {liquidity.bsl && liquidity.bsl.length > 0 ? (
                <div className="space-y-2.5">
                  {liquidity.bsl.slice(0, 2).map((level, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="font-mono text-sm text-slate-200 font-semibold flex items-center gap-1.5">
                        <span className="text-slate-500 text-[9px] font-normal">#{i+1}</span>
                        ₹{level.price.toFixed(2)}
                        {level.strength === 'MAJOR' && (
                          <span className="text-[8px] border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-1 py-0.1 rounded font-bold">MAJOR</span>
                        )}
                        {level.swept && (
                          <span className="text-[8px] text-slate-500 line-through">SWEPT</span>
                        )}
                      </div>
                      <div className="text-[10px] text-yellow-500 font-mono flex items-center gap-0.5">
                        {level.distancePercent > 0 ? '+' : ''}{level.distancePercent}%
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-600 italic">No valid Buy Stop liquidity mapped.</div>
              )}
            </div>

            {/* SSL Below list */}
            <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans border-b border-slate-800/50 pb-1 mb-1">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_4px_#F59E0B]" />
                  SSL (Sell-Side Stops Below)
                </span>
                <span className="text-[9px] px-1 py-0.5 tracking-wider bg-slate-800 rounded font-mono text-slate-300 uppercase">
                  Support Pools
                </span>
              </div>

              {liquidity.ssl && liquidity.ssl.length > 0 ? (
                <div className="space-y-2.5">
                  {liquidity.ssl.slice(0, 2).map((level, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="font-mono text-sm text-slate-200 font-semibold flex items-center gap-1.5">
                        <span className="text-slate-500 text-[9px] font-normal">#{i+1}</span>
                        ₹{level.price.toFixed(2)}
                        {level.strength === 'MAJOR' && (
                          <span className="text-[8px] border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-1 py-0.1 rounded font-bold">MAJOR</span>
                        )}
                        {level.swept && (
                          <span className="text-[8px] text-slate-500 line-through">SWEPT</span>
                        )}
                      </div>
                      <div className="text-[10px] text-amber-500 font-mono flex items-center gap-0.5">
                        {level.distancePercent}%
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-600 italic">No valid Sell Stop liquidity mapped.</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* SMC SIGNAL REASONS LOG */}
      <div className="p-4 bg-slate-900/20 rounded-lg border border-slate-800 space-y-2.5">
        <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase font-sans">
          Institutional Thesis & Confirmations
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {smcReasons.map((reason, index) => (
            <div key={index} className="flex gap-2 items-start text-xs text-slate-300 leading-relaxed font-sans">
              <div className="pt-0.5 flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
              </div>
              <span className="text-[11px] text-slate-300">{reason}</span>
            </div>
          ))}
          {liquidity.recentSweep && (
            <div className="flex gap-2 items-start text-xs text-amber-300 leading-relaxed font-sans col-span-1 md:col-span-2">
              <div className="pt-0.5 flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-[11px] font-medium">
                {liquidity.recentSweep === 'SSL_SWEPT' 
                  ? "✓ Institutional Liquidity swept on Sell Side. Buyers are acquiring stops of exiting retailers under pressure."
                  : "⚠ Institutional Liquidity swept on Buy Side. Sellers are capitalizing on breakout chase FOMO stop triggers."}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
