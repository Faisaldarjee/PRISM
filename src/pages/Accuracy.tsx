import React, { useEffect, useState, useMemo } from 'react';
import { getAccuracy, runBacktest } from '../api';
import { AccuracyData } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  LineChart as LineIcon, 
  History, 
  Play, 
  Cpu,
  Sparkles,
  Award,
  CircleDot,
  HelpCircle,
  Percent,
  CheckCircle
} from 'lucide-react';

const DEFAULT_SYMBOLS_FOR_BACKTEST = [
  'GOLDBEES.NS', 
  'SILVERBEES.NS', 
  'RELIANCE.NS', 
  'HDFCBANK.NS', 
  'TATAMOTORS.NS', 
  'TCS.NS', 
  'INFY.NS', 
  'HINDZINC.NS', 
  'VEDL.NS', 
  'TITAN.NS', 
  'WAAREEENER.NS'
];

export function Accuracy() {
  const [accuracy, setAccuracy] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live Backtest states
  const [backtestSymbol, setBacktestSymbol] = useState('GOLDBEES.NS');
  const [backtesting, setBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<{ symbol: string; accuracy: number | null; tested_days: number; correct_predictions: number; error?: string } | null>(null);
  const [backtestError, setBacktestError] = useState<string | null>(null);

  async function loadAccuracy() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAccuracy();
      setAccuracy(data);
    } catch (e: any) {
      console.error('Error fetching accuracy stats:', e);
      setError(e.message || 'Statistics module offline. Verify backend connection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBacktest() {
    setBacktesting(true);
    setBacktestResult(null);
    setBacktestError(null);
    try {
      const res = await runBacktest(backtestSymbol);
      if (res && !res.error) {
        setBacktestResult(res);
        // Refresh accuracy figures from server helper
        const freshData = await getAccuracy();
        setAccuracy(freshData);
      } else if (res && res.error) {
        setBacktestError(res.error);
      } else {
        setBacktestError('Backtest execution failed.');
      }
    } catch (e: any) {
      console.error(e);
      setBacktestError(e.message || 'Validation failed. Check price cache or connectivity.');
    } finally {
      setBacktesting(false);
    }
  }

  useEffect(() => {
    loadAccuracy();
  }, []);

  const isBuilding = !accuracy || accuracy.status === 'BUILDING';

  const assetChartData = useMemo(() => {
    if (isBuilding || !accuracy?.by_asset) return [];
    return Object.entries(accuracy.by_asset).map(([asset, accuracyPct]) => ({
      name: asset.split('.')[0],
      accuracy: accuracyPct
    }));
  }, [accuracy, isBuilding]);

  const agentChartData = useMemo(() => {
    if (isBuilding || !accuracy?.by_agent) return [];
    return Object.entries(accuracy.by_agent).map(([agent, accuracyPct]) => ({
      agent: agent.toUpperCase(),
      accuracy: accuracyPct
    }));
  }, [accuracy, isBuilding]);

  const executionLedger = useMemo(() => {
    if (!isBuilding && accuracy?.recent_ledger && accuracy.recent_ledger.length > 0) {
      return accuracy.recent_ledger;
    }
    return [];
  }, [accuracy, isBuilding]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <RefreshCw size={36} className="text-[#D4A843] animate-spin" />
        <p className="font-data text-xs text-[#8892A4] animate-pulse uppercase tracking-widest">ANALYZING_CORE_MATRIX_STATISTICS...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] max-w-md mx-auto p-8 rounded-2xl bg-[#0C1018] border border-white/[0.05] shadow-xl text-center">
        <AlertCircle size={40} className="text-[#FF4757] mb-4" />
        <h3 className="text-sm font-display font-semibold text-white mb-2">Metrics Dynamic Loading Error</h3>
        <p className="text-xs text-[#8892A4] mb-6 font-body leading-relaxed">{error}</p>
        <button 
          onClick={loadAccuracy}
          className="px-4 py-2 bg-[#D4A843]/10 hover:bg-[#D4A843]/20 text-[#E8C070] border border-[#D4A843]/20 rounded-xl transition-all font-data font-bold uppercase text-[10px]"
        >
          Retry verification sync
        </button>
      </div>
    );
  }

  return (
    <div id="accuracy-matrix-vue" className="space-y-8 animate-fadeIn">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[rgba(255,255,255,0.05)] pb-5 font-sans">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-2xl font-medium tracking-tight text-white font-display">Backtest &amp; Accuracy Matrix</h2>
            {isBuilding ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 text-[#E8C070] font-mono text-[9px] uppercase tracking-wider animate-pulse">
                <CircleDot size={8} className="animate-ping" /> BUILDING_PHASE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00D084]/10 border border-[#00D084]/25 text-[#00D084] font-mono text-[9px] uppercase tracking-wider">
                <CheckCircle size={8} /> LIVE_MATHEMATICAL
              </span>
            )}
          </div>
          <p className="text-xs text-[#8892A4] font-body">
            Real time predictive performance reporting verified exactly 5 trading days after each signal compilation.
          </p>
        </div>
        <button 
          onClick={loadAccuracy} 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.05] text-[#8892A4] hover:text-white rounded-lg text-xs font-data border border-[rgba(255,255,255,0.04)] transition-all cursor-pointer"
        >
          <RefreshCw size={11} />
          RELOAD_METRICS
        </button>
      </div>

      {/* HISTORICAL CALIBRATOR ENGINE PANEL */}
      <section className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-[rgba(255,255,255,0.04)]">
          <div className="space-y-0.5">
            <h3 className="text-sm font-display font-semibold text-white flex items-center gap-1.5">
              <Cpu size={16} className="text-[#D4A843]" />
              QUANTITATIVE CALIBRATIONS SIMULATOR
            </h3>
            <p className="text-[11px] text-[#8892A4] font-body">
              Iterate the active Technical, ML, Macro, and Sentiment agents across 252 historical trading days to evaluate real performance.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={backtestSymbol}
              onChange={(e) => setBacktestSymbol(e.target.value)}
              disabled={backtesting}
              className="bg-[#05070C] border border-white/[0.06] rounded-lg p-2 font-data text-xs text-[#E8C070] focus:outline-none focus:border-[#D4A843]/60 transition-all uppercase"
            >
              {DEFAULT_SYMBOLS_FOR_BACKTEST.map((asset) => (
                <option key={asset} value={asset}>
                  {asset.split('.')[0]}
                </option>
              ))}
            </select>
            <button
              onClick={handleBacktest}
              disabled={backtesting}
              className="px-4 py-2 bg-[#D4A843] hover:bg-[#E8C070] text-[#05070C] text-xs font-data font-bold rounded-lg uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
            >
              {backtesting ? 'SIMULATING...' : 'RUN_TEST'}
            </button>
          </div>
        </div>

        {backtesting && (
          <div className="rounded-lg bg-white/[0.01] border border-white/[0.03] p-4 text-[10.5px] font-mono text-[#8892A4] space-y-1.5 animate-pulse">
            <div className="flex items-center gap-1.5 text-[#00D084] font-bold">
              <RefreshCw size={11} className="animate-spin" /> BACKTEST_RUNNING_252_BARS
            </div>
            <p className="leading-relaxed text-zinc-400">
              Generating active signals daily and checking their strict outcomes 5 trading days in the future. Zero lookahead leakage allowed.
            </p>
          </div>
        )}

        {backtestError && (
          <div className="rounded-lg bg-[#FF4757]/10 border border-[#FF4757]/20 p-4 text-[11px] font-data text-[#FF4757] flex items-center gap-2">
            <AlertCircle size={14} />
            {backtestError}
          </div>
        )}

        {backtestResult && (
          <div className="rounded-lg bg-[#00D084]/5 border border-[#00D084]/25 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#00D084] font-data text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} className="animate-bounce" />
                CONVERGENCE_TEST_COMPLETED // {backtestResult.symbol.split('.')[0]}
              </div>
              {backtestResult.accuracy !== null && backtestResult.accuracy < 60 && (
                <span className="text-[10px] text-[#FF4757] font-mono border border-[#FF4757]/30 px-2.5 py-0.5 rounded uppercase">
                  ⚠️ WARNING_LOW_ACCURACY
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-data">
              <div className="bg-[#05070C] p-3 rounded-lg border border-white/[0.02]">
                <span className="text-[8.5px] text-[#4A5568] uppercase block">Interval Tested</span>
                <span className="text-sm font-bold text-[#F0F4FF] mt-1 block font-mono">{backtestResult.tested_days} bars</span>
              </div>
              <div className="bg-[#05070C] p-3 rounded-lg border border-white/[0.02]">
                <span className="text-[8.5px] text-[#4A5568] uppercase block">Accurate Predictions</span>
                <span className="text-sm font-bold text-[#00D084] mt-1 block font-mono">{backtestResult.correct_predictions} Days</span>
              </div>
              <div className="bg-[#05070C] p-3 rounded-lg border border-[#00D084]/10 bg-gradient-to-r from-[#00D084]/5 to-transparent">
                <span className="text-[8.5px] text-[#00D084]/70 uppercase block">Calibrated Accuracy Hits</span>
                <span className="text-sm font-black text-[#00D084] mt-1 block font-mono">
                  {backtestResult.accuracy !== null ? `${backtestResult.accuracy}%` : 'N/A (No trade signals)'}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* STATE 1: BUILDING STATE */}
      {isBuilding ? (
        <div className="rounded-xl border border-dashed border-[#D4A843]/30 bg-[#D4A843]/5 p-8 text-center space-y-4 max-w-2xl mx-auto">
          <HelpCircle size={36} className="text-[#E8C070] mx-auto animate-pulse" />
          <h3 className="font-display font-semibold text-white text-base">Metrics Warehouse Generating</h3>
          <p className="text-xs text-[#8892A4] max-w-md mx-auto leading-relaxed">
            Real trade predictions are collected daily from live market scans and verified after exactly 5 trading days. 
            There are currently <strong className="text-[#E8C070] font-mono">{accuracy?.pending_predictions || 0} pending</strong> predictions logged.
          </p>
          <div className="pt-2">
            <span className="inline-block text-[10px] font-mono uppercase bg-[#D4A843]/10 text-[#E8C070] border border-[#D4A843]/20 px-3 py-1.5 rounded-full">
              👉 TRIGGER "RUN_TEST" ABOVE TO SEED HISTORICAL LOGS INSTANTLY 👈
            </span>
          </div>
        </div>
      ) : (
        /* STATE 2: LIVE METRICS VIEW */
        <>
          {/* STATS TILES */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 font-data">
            
            {/* Metric 1 */}
            <div className="glass-card p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] text-[#8892A4] uppercase tracking-wider block">Average Accuracy Hit Ratio</span>
                <span className="text-3xl font-bold text-[#00D084] font-mono">{accuracy.overall_accuracy?.toFixed(1)}%</span>
                <p className="text-[10px] text-[#4A5568]">Verified correct direction setups</p>
              </div>
              <div className="p-3 bg-[#00D084]/10 text-[#00D084] rounded-lg border border-[#00D084]/20">
                <CheckCircle2 size={20} />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="glass-card p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] text-[#8892A4] uppercase tracking-wider block">Verified vs Pending Logs</span>
                <span className="text-3xl font-bold text-white font-mono">
                  {accuracy.verified_predictions} <span className="text-xs text-[#4A5568]">/ {accuracy.pending_predictions} PND</span>
                </span>
                <p className="text-[10px] text-[#4A5568]">Real calculations stored in log database</p>
              </div>
              <div className="p-3 bg-white/[0.02] text-[#8892A4] rounded-lg border border-white/[0.04]">
                <LineIcon size={20} />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="glass-card p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] text-[#8892A4] uppercase tracking-wider block font-medium text-[#E8C070]/90">Outcome Win-to-Loss Edge</span>
                <span className="text-xl font-bold text-white font-mono block mt-1">
                  Win: <span className="text-[#00D084]">+{accuracy.avg_win_percent?.toFixed(1)}%</span> / Loss: <span className="text-[#FF4757]">{accuracy.avg_loss_percent?.toFixed(1)}%</span>
                </span>
                <p className="text-[10px] text-[#4A5568]">Real pricing results on calibration scale</p>
              </div>
              <div className="p-3 bg-[#D4A843]/10 text-[#E8C070] rounded-lg border border-[#D4A843]/20">
                <Award size={20} />
              </div>
            </div>

          </section>

          {/* CHARTS DUAL COLUMNS */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* BAR CHART */}
            <div className="glass-card p-5 flex flex-col justify-between">
              <div className="mb-4">
                <h4 className="font-display font-semibold text-sm text-[#F0F4FF]">Accuracy Segment Index</h4>
                <p className="text-[9.5px] text-[#4A5568] uppercase font-data mt-0.5">Asset accuracy index (at least 5 checked predictions needed)</p>
              </div>

              <div className="h-[240px]">
                {assetChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assetChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false}
                        axisLine={false}
                        stroke="#4A5568"
                        fontSize={10}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        stroke="#4A5568"
                        fontSize={10}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#0D1018', 
                          border: '1px solid rgba(255,255,255,0.06)', 
                          borderRadius: '8px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          color: '#F0F4FF'
                        }}
                        formatter={(v: any) => [`${v}%`, 'Accuracy']}
                      />
                      <Bar 
                        dataKey="accuracy" 
                        fill="#D4A843" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-4 text-center text-xs text-[#8892A4] uppercase tracking-wider font-mono">
                    <span>Insufficient assets hit count range</span>
                    <span className="text-[9px] text-zinc-500 mt-1 capitalize">Symbols require at least 5 logs to list in index</span>
                  </div>
                )}
              </div>
            </div>

            {/* RADAR CHART */}
            <div className="glass-card p-5 flex flex-col justify-between">
              <div className="mb-4">
                <h4 className="font-display font-semibold text-sm text-[#F0F4FF]">Agent Cognitive Weights Chart</h4>
                <p className="text-[9.5px] text-[#4A5568] uppercase font-data mt-0.5 font-bold">Reliability weighting radar matrix</p>
              </div>

              <div className="h-[240px]">
                {agentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={agentChartData}>
                      <PolarGrid stroke="rgba(255,255,255,0.05)" />
                      <PolarAngleAxis 
                        dataKey="agent" 
                        tick={{ fill: '#8892A4', fontSize: 9, fontFamily: 'monospace' }} 
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]} 
                        tick={{ fill: '#4A5568', fontSize: 8 }}
                      />
                      <Radar 
                        name="Calibrated Weight" 
                        dataKey="accuracy" 
                        stroke="#D4A843" 
                        fill="#E8C070" 
                        fillOpacity={0.12} 
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#0D1018', 
                          border: '1px solid rgba(255,255,255,0.06)', 
                          borderRadius: '8px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          color: '#F0F4FF'
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center font-data text-xs text-[#8892A4] uppercase tracking-wider animate-pulse">
                    Drawing factor radar...
                  </div>
                )}
              </div>
            </div>

          </section>

          {/* OUTCOMES TABULAR LEDGER */}
          <section className="glass-card p-5">
            <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)] pb-3.5 mb-4 font-sans">
              <History size={14} className="text-[#E8C070]" />
              <h3 className="font-display font-medium text-sm text-[#F0F4FF]">Ensemble Signals &amp; Outcomes Journal (Verified Historicals)</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-data">
                <thead>
                  <tr className="border-b border-white/[0.03] text-[#4A5568] text-[9.5px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">RECORD ID</th>
                    <th className="py-2.5 px-3">DATE</th>
                    <th className="py-2.5 px-3">ASSET</th>
                    <th className="py-2.5 px-3">SIGNAL</th>
                    <th className="py-2.5 px-3">VAL PRICE</th>
                    <th className="py-2.5 px-3">ACCURACY STATUS</th>
                    <th className="py-2.5 px-3 text-right">OUTCOME ALPHA DELTA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {executionLedger.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-3 font-mono text-[#8892A4]">{row.id}</td>
                      <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">{row.date}</td>
                      <td className="py-3 px-3 font-bold text-white font-display uppercase">{row.symbol}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                          row.action === 'BUY' 
                            ? 'bg-[#00D084]/15 text-[#00D084] border border-[#00D084]/25' 
                            : row.action === 'SELL' 
                              ? 'bg-[#FF4757]/15 text-[#FF4757] border border-[#FF4757]/25' 
                              : 'bg-white/[0.03] text-slate-350 border border-white/[0.06]'
                        }`}>
                          {row.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#8892A4]">{row.price}</td>
                      <td className="py-3 px-3">
                        <span className={`font-bold uppercase tracking-wider text-[10px] ${row.outcome === 'CORRECT' ? 'text-[#00D084]' : 'text-[#FF4757]'}`}>
                          {row.outcome}
                        </span>
                      </td>
                      <td className={`py-3 px-3 font-mono text-right font-semibold ${row.gain.startsWith('+') ? 'text-[#00D084]' : (row.gain === '0.0%' ? 'text-[#4A5568]' : 'text-[#FF4757]')}`}>
                        {row.gain}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* HONEST AUDIT DISCLAIMER CARD */}
      <footer className="rounded-xl border border-white/[0.04] bg-[#05070C] p-5 space-y-2">
        <h4 className="font-display font-semibold text-xs text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
          <AlertCircle size={12} className="text-[#D4A843]" />
          Calibrated Verification Notice
        </h4>
        <p className="text-[11px] text-[#8892A4] leading-relaxed font-body">
          Accuracy matrix scores are loaded dynamically from real SQLite database logs. 
          To prevent predictive leakage, each computed trade signal is locked for exactly 5 trading days. 
          Upon expiration of this lock window, a background process queries yFinance for the actual closing price on that trading day, 
          computes the precise percentage change mathematically, and evaluates whether the agent predicted correctly (Close Price &gt; Entry Price for BUY signal, etc.). 
          We never simulate artificial accuracy parameters or employ visual placeholders.
        </p>
      </footer>
    </div>
  );
}
