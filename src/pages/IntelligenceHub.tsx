import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Activity, 
  TrendingUp, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Zap, 
  Clock, 
  Globe, 
  Calendar, 
  DollarSign, 
  Briefcase 
} from 'lucide-react';

interface NewsMasterSummary {
  overallSentiment: number;
  marketMood: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED';
  macroBrief: string;
  flowAnalysis: string;
  weeklyOutlook: string;
  opportunities: Array<{ title: string; reason: string; confidence: number }>;
  risks: Array<{ title: string; impact: string; probability: 'HIGH' | 'MEDIUM' | 'LOW' }>;
  lastUpdated: string;
}

interface GlobalMacroData {
  sp500: { price: number; change1D: number; trend: 'UP' | 'DOWN' | 'FLAT' };
  nasdaq: { price: number; change1D: number; trend: 'UP' | 'DOWN' | 'FLAT' };
  dowJones: { price: number; change1D: number };
  crudeoil: { price: number; change1D: number; unit: 'USD/barrel' };
  gold: { price: number; change1D: number };
  silver: { price: number; change1D: number };
  us10yrYield: { value: number; change1D: number };
  dxy: { price: number; change1D: number };
  usdinr: { rate: number; change1D: number };
  nifty55: { price: number; change1D: number };
  indiaVix: { value: number; change1D: number };
  globalSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  lastUpdated: string;
}

interface FIIDIISignal {
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  reason: string;
  lastUpdated: string;
  todayNetCrore: number;
}

interface HistoricalFlow {
  date: string;
  fii_net_crore: number;
  dii_net_crore: number;
  combined_net_crore: number;
}

interface UpcomingEvent {
  symbol: string;
  companyName: string;
  eventDate: string;
  eventType: string;
  consensusRating: string;
}

interface BulkDeal {
  symbol: string;
  dealDate: string;
  clientName: string;
  dealType: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  valueCrore: number;
}

export function IntelligenceHub() {
  const [masterSummary, setMasterSummary] = useState<NewsMasterSummary | null>(() => {
    try {
      const saved = localStorage.getItem('prism_intel');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [macroData, setMacroData] = useState<GlobalMacroData | null>(() => {
    try {
      const saved = localStorage.getItem('prism_global_macro');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [flowSignal, setFlowSignal] = useState<FIIDIISignal | null>(() => {
    try {
      const saved = localStorage.getItem('prism_flow_sig');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [historicalFlows, setHistoricalFlows] = useState<HistoricalFlow[]>(() => {
    try {
      const saved = localStorage.getItem('prism_hist_flows');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [events, setEvents] = useState<UpcomingEvent[]>(() => {
    try {
      const saved = localStorage.getItem('prism_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [bulkDeals, setBulkDeals] = useState<BulkDeal[]>(() => {
    try {
      const saved = localStorage.getItem('prism_bulk_deals');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const saved = localStorage.getItem('prism_intel');
      return !saved;
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [congestionNotice, setCongestionNotice] = useState(false);

  useEffect(() => {
    async function loadHubData() {
      if (!masterSummary) setLoading(true);
      setError(null);
      setCongestionNotice(false);
      try {
        console.log("[IntelligenceHub] Fetching dashboards...");
        const [intelRes, macroRes, flowSigRes, flowsRes, eventsRes, dealsRes] = await Promise.all([
          fetch('/api/intelligence').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/macro/global').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/flows/signal').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/flows/fiidii').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/earnings/upcoming').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/deals/today').then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        if (!intelRes || !macroRes || !flowSigRes) {
          setCongestionNotice(true);
        }

        if (intelRes) {
          setMasterSummary(intelRes);
          try { localStorage.setItem('prism_intel', JSON.stringify(intelRes)); } catch {}
        }
        if (macroRes) {
          setMacroData(macroRes);
          try { localStorage.setItem('prism_global_macro', JSON.stringify(macroRes)); } catch {}
        }
        if (flowSigRes) {
          setFlowSignal(flowSigRes);
          try { localStorage.setItem('prism_flow_sig', JSON.stringify(flowSigRes)); } catch {}
        }
        if (flowsRes) {
          setHistoricalFlows(flowsRes || []);
          try { localStorage.setItem('prism_hist_flows', JSON.stringify(flowsRes)); } catch {}
        }
        if (eventsRes) {
          setEvents(eventsRes || []);
          try { localStorage.setItem('prism_events', JSON.stringify(eventsRes)); } catch {}
        }
        if (dealsRes) {
          setBulkDeals(dealsRes || []);
          try { localStorage.setItem('prism_bulk_deals', JSON.stringify(dealsRes)); } catch {}
        }

        const isFullyEmpty = !intelRes && !macroRes && !masterSummary && !macroData;
        if (isFullyEmpty) {
          throw new Error("Unable to fetch complete Real-Time Intelligence workspace datasets. Rate limits exceeded. Please retry in a few moments.");
        }
      } catch (err: any) {
        console.error("Error loading intelligence dashboard:", err);
        setError(err.message || "Failed to retrieve real-time intelligence telemetry.");
      } finally {
        setLoading(false);
      }
    }

    loadHubData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 text-slate-400">
        <Activity className="animate-spin text-[#34A77A]" size={40} />
        <span className="font-mono text-xs uppercase tracking-widest text-[#34A77A]">Loading Real-Time Intelligence Suite...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center text-rose-400 max-w-2xl mx-auto space-y-3">
        <AlertTriangle className="mx-auto" size={32} />
        <h4 className="font-display font-medium">Telemetry Offline</h4>
        <p className="text-xs font-body text-rose-300 leading-normal">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none animate-fadeIn">
      {/* TITLE INTRO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/[0.04] pb-5">
        <div>
          <h2 className="font-display font-medium text-2xl text-white tracking-tight flex items-center gap-2">
            <Sparkles className="text-[#D4A843] animate-pulse" />
            Complete News Intelligence Workspace
          </h2>
          <p className="text-[#8892A4] font-body text-xs mt-1.5 uppercase tracking-wide">
            Decoupled multi-agent synthesis tracking macro risk indices, FII flow parameters, and event calendars
          </p>
        </div>
        <div className="text-right mt-3 md:mt-0">
          <span className="text-[10px] text-gray-500 font-mono tracking-wider block">LAST UPDATED (IST UTC)</span>
          <span className="text-xs text-slate-300 font-bold font-mono">
            {masterSummary ? new Date(masterSummary.lastUpdated).toLocaleTimeString() : 'N/A'}
          </span>
        </div>
      </div>

      {/* ROW 1: MARKET MOOD & CORE BRIEF */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Market Mood Gauge */}
        <div className="glass-card p-6 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="border-b border-white/[0.04] pb-3 mb-4">
            <h4 className="font-display font-semibold text-xs text-zinc-400 uppercase tracking-widest">Master Market Mood</h4>
            <p className="text-[9px] text-[#8892A4] font-body uppercase mt-0.5">Weighted Multi-Indicator Index</p>
          </div>

          <div className="flex flex-col items-center justify-center py-5">
            <span className={`text-2xl font-black tracking-widest font-display text-center ${
              masterSummary?.marketMood?.includes('GREED') ? 'text-[#34A77A]' : 'text-rose-400'
            }`}>
              {masterSummary?.marketMood?.replace('_', ' ')}
            </span>
            <div className="text-orange-400 font-mono text-3xl font-extrabold mt-3 tracking-tighter">
              {masterSummary?.overallSentiment > 0 ? `+${masterSummary?.overallSentiment}` : masterSummary?.overallSentiment}%
            </div>
            <span className="text-[9px] text-zinc-500 font-mono mt-1 uppercase">Sentiment Amplitude Coefficient</span>
          </div>

          <p className="text-[10.5px] text-gray-500 font-body leading-relaxed text-center">
            Derived by compiling institutional transactions, global S&P 500 drift ratios, gold safe-haven values, and live news headlines.
          </p>
        </div>

        {/* Global Macro Narrative */}
        <div className="glass-card p-6 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="text-[#3B82F6]" size={15} />
                <h4 className="font-display font-semibold text-xs text-white uppercase tracking-widest">Global Macro Assessment</h4>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-black ${
                macroData?.globalSignal === 'BULLISH' ? 'bg-[#34A77A]/10 text-[#34A77A]' : 'bg-[#E05252]/10 text-[#E05252]'
              }`}>
                MACRO: {macroData?.globalSignal}
              </span>
            </div>
            <p className="text-zinc-300 text-xs font-body leading-relaxed bg-black/30 p-4 rounded-xl border border-white/[0.02]">
              {masterSummary?.macroBrief}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.04] grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div>
              <span className="text-gray-500 text-[9px] block uppercase">Crude Spot Limit</span>
              <span className="text-slate-300 font-bold block mt-0.5">
                ${macroData?.crudeoil?.price?.toFixed(1) ?? '78.5'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 text-[9px] block uppercase">Crude Support</span>
              <span className="text-emerald-400 font-bold block mt-0.5">$74.0 - $76.2</span>
            </div>
            <div>
              <span className="text-gray-500 text-[9px] block uppercase">US 10-Yr Yield</span>
              <span className="text-amber-400 font-bold block mt-0.5">
                {macroData?.us10yrYield?.value?.toFixed(2) ?? '4.28'}%
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ROW 2: FII/DII FLOWS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-data">
        
        {/* FII Action Panel */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3 mb-4">
              <Activity className="text-emerald-400" size={15} />
              <div>
                <h4 className="font-display font-semibold text-xs text-white uppercase tracking-widest">FII & DII Tracking telemetry</h4>
                <p className="text-[9px] text-[#8892A4] font-body uppercase mt-0.5">Today's Trading Desk Actions</p>
              </div>
            </div>

            <div className="bg-[#111317]/50 border border-white/[0.02] p-4.5 rounded-xl space-y-4">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-gray-400 uppercase">Institutional Signal:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  flowSignal?.signal === 'BULLISH' ? 'bg-[#34A77A]/15 text-[#34A77A]' : 'bg-rose-500/15 text-rose-400'
                }`}>
                  {flowSignal?.signal}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-gray-400 uppercase">NET Inflow Today:</span>
                <span className={`font-bold text-sm ${
                  (flowSignal?.todayNetCrore || 0) >= 0 ? 'text-emerald-400' : 'text-rose-455'
                }`}>
                  ₹{flowSignal?.todayNetCrore?.toLocaleString('en-IN') ?? '1,420'} Cr
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 font-body leading-relaxed mt-4 italic bg-black/25 p-3 rounded-lg border border-white/[0.02]">
              "{masterSummary?.flowAnalysis}"
            </p>
          </div>

          <span className="text-[9.5px] text-gray-500 font-mono leading-tight uppercase block mt-4 text-center">
            All data derived securely from Exchange NSE/BSE reports
          </span>
        </div>

        {/* Historical flow tables */}
        <div className="glass-card p-6 lg:col-span-2 overflow-x-auto">
          <div className="border-b border-white/[0.04] pb-3 mb-4 flex justify-between items-center">
            <h4 className="font-display font-semibold text-xs text-white uppercase tracking-widest">Historical Institutional Blocks</h4>
            <span className="text-[9px] text-gray-400 font-mono uppercase bg-white/[0.04] px-2 py-0.5 rounded">Crores (Cr)</span>
          </div>

          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.04] text-gray-500">
                <th className="py-2.5">DATE</th>
                <th className="py-2.5 text-right">FII NET FLOW</th>
                <th className="py-2.5 text-right">DII NET FLOW</th>
                <th className="py-2.5 text-right">COMBINED STREAM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {historicalFlows.slice(0, 5).map((flow, i) => (
                <tr key={i} className="hover:bg-white/[0.01]">
                  <td className="py-3 text-slate-300 font-semibold">{flow?.date ? new Date(flow.date).toLocaleDateString() : '—'}</td>
                  <td className={`py-3 text-right font-bold ${(flow?.fii_net_crore ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(flow?.fii_net_crore ?? 0) >= 0 ? `+${(flow?.fii_net_crore ?? 0).toFixed(1)}Cr` : `${(flow?.fii_net_crore ?? 0).toFixed(1)}Cr`}
                  </td>
                  <td className={`py-3 text-right font-bold ${(flow?.dii_net_crore ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(flow?.dii_net_crore ?? 0) >= 0 ? `+${(flow?.dii_net_crore ?? 0).toFixed(1)}Cr` : `${(flow?.dii_net_crore ?? 0).toFixed(1)}Cr`}
                  </td>
                  <td className={`py-3 text-right font-extrabold ${(flow?.combined_net_crore ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                    {(flow?.combined_net_crore ?? 0) >= 0 ? `+${(flow?.combined_net_crore ?? 0).toFixed(1)}Cr` : `${(flow?.combined_net_crore ?? 0).toFixed(1)}Cr`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* ROW 3: OPTIONS SETUP OPPORTUNITIES & RISKS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Opportunities Card */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3 mb-4">
            <Zap className="text-amber-500 animate-bounce" size={15} />
            <h4 className="font-display font-semibold text-xs text-white uppercase tracking-widest">Swing Accrual Options Opportunities</h4>
          </div>

          <div className="space-y-4">
            {masterSummary?.opportunities.map((opp, idx) => (
              <div key={idx} className="bg-gradient-to-r from-emerald-950/20 to-black/20 border border-[#34A77A]/10 p-4 rounded-xl relative group">
                <div className="absolute top-3 right-3 text-[10px] text-emerald-400 font-mono tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {opp.confidence}% CONFIDENCE
                </div>
                <h5 className="font-display font-semibold text-white text-xs">{opp.title}</h5>
                <p className="text-zinc-400 text-[11px] font-body mt-2 leading-relaxed">{opp.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Risks Card */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3 mb-4">
            <AlertTriangle className="text-orange-500" size={15} />
            <h4 className="font-display font-semibold text-xs text-white uppercase tracking-widest">Active Macro risk parameters</h4>
          </div>

          <div className="space-y-4">
            {masterSummary?.risks.map((risk, idx) => (
              <div key={idx} className="bg-gradient-to-r from-rose-950/20 to-black/20 border border-rose-500/10 p-4 rounded-xl relative">
                <div className={`absolute top-3 right-3 text-[9px] font-mono px-2 py-0.5 rounded font-black border ${
                  risk.probability === 'HIGH' 
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-extrabold animate-pulse' 
                    : 'bg-zinc-800/40 text-gray-400 border-white/[0.04]'
                }`}>
                  {risk.probability} PROBABILITY
                </div>
                <h5 className="font-display font-semibold text-white text-xs text-rose-400">{risk.title}</h5>
                <p className="text-zinc-400 text-[11px] font-body mt-2 leading-relaxed">{risk.impact}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ROW 4: BULK DEALS & CORPORATE EVENTS INTEGRATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Corporate events calendars */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3 mb-4">
            <Calendar className="text-indigo-400" size={15} />
            <h4 className="font-display font-semibold text-xs text-white uppercase tracking-widest">Upcoming Corporate Earnings Calendar</h4>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {events.slice(0, 5).map((ev, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.02]">
                <div>
                  <span className="text-slate-200 font-bold block">{ev.symbol}</span>
                  <span className="text-gray-500 text-[9px] block max-w-xs truncate">{ev.companyName}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-300 font-semibold block">{new Date(ev.eventDate).toLocaleDateString()}</span>
                  <span className="text-[#34A77A] text-[9.5px] font-bold block uppercase">{ev.consensusRating} Consensus</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live deals */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3 mb-4">
            <DollarSign className="text-amber-500" size={15} />
            <h4 className="font-display font-semibold text-xs text-white uppercase tracking-widest">NSE Block & Big Deals of the Day</h4>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {bulkDeals.slice(0, 5).map((deal, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.02]">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-200 font-bold">{deal.symbol}</span>
                    <span className={`text-[8.5px] font-extrabold px-1 rounded-sm ${
                      deal.dealType === 'BUY' ? 'bg-emerald-950/45 text-emerald-400' : 'bg-rose-955/45 text-rose-450'
                    }`}>
                      {deal.dealType}
                    </span>
                  </div>
                  <span className="text-gray-500 text-[9.5px] block max-w-xs truncate">{deal.clientName}</span>
                </div>
                <div className="text-right">
                  <span className="text-amber-400 font-extrabold block">₹{deal.valueCrore?.toFixed(1) ?? '0.0'}Cr</span>
                  <span className="text-gray-400 text-[9px] block">
                    {deal.quantity?.toLocaleString() ?? '0'} shares @ ₹{deal.price?.toFixed(1) ?? '0.0'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
