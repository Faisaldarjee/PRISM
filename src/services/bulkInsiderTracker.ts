import { format, subDays } from 'date-fns';
import { db } from './serverApi';

export interface BulkDeal {
  id?: number;
  date: string;
  symbol: string;
  clientName: string;
  dealType: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  valueInCr: number;
  isSignificant: boolean;
}

export interface BulkDealSignal {
  symbol: string;
  buyingPressure: number; // in Crores
  sellingPressure: number; // in Crores
  netImpact: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  signalScore: number;  // -100 to +100
}

export interface PromoterMovement {
  symbol: string;
  promoterGroupHolding: number;
  pledgedHolding: number;
  recentPurchases: Array<{ date: string; promoterName: string; quantity: number; price: number; dValueInCr: number }>;
  recentSales: Array<{ date: string; promoterName: string; quantity: number; price: number; dValueInCr: number }>;
  isInsiderBuyingStable: boolean;
}

const CLIENT_NAMES = [
  'Societe Generale',
  'Morgan Stanley Asia Singapore PTE',
  'Goldman Sachs Singapore PTE',
  'Life Insurance Corporation of India',
  'SBI Mutual Fund',
  'HDFC Mutual Fund',
  'ICICI Prudential Mutual Fund',
  'Nippon India Mutual Fund',
  'BNP Paribas Arbitrage',
  'Plutus Wealth Management LLP',
  'Merrill Lynch Kingdom Ltd'
];

function getRecentTradingDays(count = 15): string[] {
  const dates: string[] = [];
  let d = new Date();
  while (dates.length < count) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) { // skip Sat, Sun
      dates.push(format(d, 'yyyy-MM-dd'));
    }
    d = subDays(d, 1);
  }
  return dates;
}

export function seedBulkDealsDB() {
  try {
    const row = db.prepare("SELECT COUNT(*) as count FROM bulk_deals").get() as any;
    if (row && row.count > 0) return;

    console.log("[BulkInsiderTracker] Seeding realistic bulk deals database...");
    const days = getRecentTradingDays(15);
    const symbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'TATAMOTORS.NS', 'HINDZINC.NS', 'VEDL.NS', 'TITAN.NS', 'WAAREEENER.NS'];
    
    const insertStmt = db.prepare(`
      INSERT INTO bulk_deals (date, symbol, client_name, deal_type, quantity, price, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      days.forEach((dayStr, dIndex) => {
        // Deterministically choose a couple of symbols to have bulk deals on each day
        const seedValue = dIndex * 7 + 13;
        const countOnDay = 2 + (seedValue % 3); // 2-4 deals per day

        for (let i = 0; i < countOnDay; i++) {
          const sym = symbols[(seedValue + i * dIndex) % symbols.length];
          const client = CLIENT_NAMES[(seedValue + i * 2) % CLIENT_NAMES.length];
          const type: 'BUY' | 'SELL' = (seedValue + i) % 2 === 0 ? 'BUY' : 'SELL';
          
          let basePrice = 1000;
          if (sym === 'RELIANCE.NS') basePrice = 2450;
          else if (sym === 'TCS.NS') basePrice = 3850;
          else if (sym === 'HDFCBANK.NS') basePrice = 1530;
          else if (sym === 'INFY.NS') basePrice = 1420;
          else if (sym === 'TATAMOTORS.NS') basePrice = 960;
          else if (sym === 'HINDZINC.NS') basePrice = 640;
          else if (sym === 'VEDL.NS') basePrice = 430;
          else if (sym === 'TITAN.NS') basePrice = 3200;
          else if (sym === 'WAAREEENER.NS') basePrice = 1800;

          const price = Number((basePrice * (0.98 + (i % 5) * 0.01)).toFixed(2));
          const quantity = (50000 + (seedValue * i * 3500) % 500000); // 50k to 550k shares
          
          insertStmt.run(
            dayStr,
            sym,
            client,
            type,
            quantity,
            price,
            new Date().toISOString()
          );
        }
      });
    })();
  } catch (err: any) {
    console.error("[BulkInsiderTracker] Seeding error:", err.message);
  }
}

export async function fetchBulkDeals(): Promise<BulkDeal[]> {
  seedBulkDealsDB();
  try {
    const rows = db.prepare(`
      SELECT * FROM bulk_deals
      ORDER BY date DESC, id DESC
    `).all() as any[];

    return rows.map(r => {
      const valueInCr = Number(((r.quantity * r.price) / 10000000).toFixed(2));
      return {
        id: r.id,
        date: r.date,
        symbol: r.symbol,
        clientName: r.client_name,
        dealType: r.deal_type as 'BUY' | 'SELL',
        quantity: r.quantity,
        price: r.price,
        valueInCr,
        isSignificant: valueInCr > 5.0
      };
    });
  } catch (err: any) {
    console.error("[BulkInsiderTracker] Fetch error:", err.message);
    return [];
  }
}

export async function getTodaysBigDeals(): Promise<BulkDeal[]> {
  const deals = await fetchBulkDeals();
  if (deals.length === 0) return [];
  
  // Return the most recent 15 transactions
  return deals.slice(0, 15);
}

export async function getBulkDealSignalForSymbol(symbol: string): Promise<BulkDealSignal> {
  const deals = await fetchBulkDeals();
  const filtered = deals.filter(d => d.symbol.toUpperCase() === symbol.toUpperCase());

  let buyingPressure = 0;
  let sellingPressure = 0;

  filtered.forEach(d => {
    if (d.dealType === 'BUY') {
      buyingPressure += d.valueInCr;
    } else {
      sellingPressure += d.valueInCr;
    }
  });

  const netBalance = buyingPressure - sellingPressure;
  const totalAct = buyingPressure + sellingPressure;
  
  let netImpact: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let signalScore = 0;

  if (totalAct > 0) {
    signalScore = Math.round((netBalance / totalAct) * 100);
    if (signalScore > 15 && netBalance > 5.0) {
      netImpact = 'BULLISH';
    } else if (signalScore < -15 && netBalance < -5.0) {
      netImpact = 'BEARISH';
    }
  }

  return {
    symbol,
    buyingPressure,
    sellingPressure,
    netImpact,
    signalScore
  };
}

export async function getPromoterData(symbol: string): Promise<PromoterMovement> {
  // Deterministic baseline stats
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const promoterHolding = 45 + (hash % 30); // 45% - 75%
  const pledgedHolding = (symbol === 'HINDZINC.NS' || symbol === 'VEDL.NS') ? 99.1 : (hash % 10 === 0) ? (hash % 20) : 0;
  
  const days = getRecentTradingDays(10);
  const recentPurchases: PromoterMovement['recentPurchases'] = [];
  const recentSales: PromoterMovement['recentSales'] = [];

  const promoterName = `${symbol.split('.')[0]} Promoter Holdings / Trustees`;

  // Deterministically create 1-2 transactions
  if (hash % 2 === 0) {
    const buyQty = 25000 + (hash % 175000);
    const buyPrice = 200 + (hash % 1500);
    recentPurchases.push({
      date: days[2 % days.length],
      promoterName,
      quantity: buyQty,
      price: buyPrice,
      dValueInCr: Number(((buyQty * buyPrice) / 10000000).toFixed(2))
    });
  } else {
    const sellQty = 15000 + (hash % 85000);
    const sellPrice = 200 + (hash % 1500);
    recentSales.push({
      date: days[4 % days.length],
      promoterName,
      quantity: sellQty,
      price: sellPrice,
      dValueInCr: Number(((sellQty * sellPrice) / 10000000).toFixed(2))
    });
  }

  const isInsiderBuyingStable = pledgedHolding < 25 && recentSales.length === 0;

  return {
    symbol,
    promoterGroupHolding: Number(promoterHolding.toFixed(2)),
    pledgedHolding: Number(pledgedHolding.toFixed(2)),
    recentPurchases,
    recentSales,
    isInsiderBuyingStable
  };
}
