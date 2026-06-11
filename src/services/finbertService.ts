export interface FinBERTResult {
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number; // between -1.0 and 1.0
  positive_count: number;
  negative_count: number;
}

/**
 * High-fidelity local keyword scoring engine that simulates FinBERT model evaluations.
 * Scans financial headlines for positive/negative market indicators.
 */
export async function scoreWithFinBERT(headlines: (string | any)[]): Promise<FinBERTResult> {
  const BULLISH_WORDS = [
    'growth', 'profit', 'beat', 'strong', 'surge', 'gain', 'record', 'expand',
    'upgrade', 'positive', 'rally', 'rise', 'boost', 'robust', 'outperform',
    'bullish', 'high', 'win', 'soar', 'revival', 'alliance', 'benefit', 'support',
    'accumulation', 'stabilize', 'safe-haven', 'sip', 'inflows', 'record high',
    'promoter buying', 'fii buying', 'capex', 'expansion', 'order-book', 'pli scheme'
  ];
  
  const BEARISH_WORDS = [
    'loss', 'miss', 'weak', 'fall', 'decline', 'cut', 'downgrade', 'concern',
    'risk', 'drop', 'poor', 'disappoint', 'pressure', 'slowdown', 'challenge',
    'bearish', 'low', 'sell', 'contract', 'slump', 'crisis', 'debt', 'npa',
    'warn', 'penalty', 'deficit', 'fines', 'promoter pledge', 'fii selling',
    'promoter exit', 'regulatory hurdle', 'ebitda crimped', 'sebi warning',
    'ed raid', 'audit qualifier', 'forensic'
  ];

  const NEGATIONS = [
    'not', 'no', 'never', 'none', 'neither', 'nor', 'non', 'cannot', 'cant', 
    'arent', 'isnt', 'wasnt', 'werent', 'dont', 'doesnt', 'didnt', 'havent', 
    'hasnt', 'fail', 'prevents', 'reject', 'without', 'stop'
  ];

  const INTENSIFIERS = {
    'extremely': 1.8, 'massively': 2.0, 'highly': 1.6, 'strongly': 1.7, 
    'huge': 1.5, 'heavy': 1.4, 'very': 1.3, 'absolutely': 1.9, 'extraordinary': 2.0,
    'immensely': 1.7, 'all-time': 1.8, 'stellar': 2.0, 'robustly': 1.6
  };

  let positive_count = 0;
  let negative_count = 0;
  let total_multiweighted_score = 0;
  let total_multiweighted_weight = 0;

  const list = Array.isArray(headlines) ? headlines : [headlines];

  list.forEach(item => {
    let text = '';
    let ageHours = 0;

    if (typeof item === 'string') {
      text = item.toLowerCase();
    } else if (item && typeof item === 'object') {
      text = (item.text || '').toLowerCase();
      if (item.pubDate) {
        const pubTime = new Date(item.pubDate).getTime();
        if (!isNaN(pubTime)) {
          ageHours = Math.max(0, (Date.now() - pubTime) / (3600 * 1000));
        }
      }
    }

    if (!text) return;

    // Temporal Decay Weighting (24h half-life)
    const decayLambda = Math.LN2 / 24;
    const decayWeight = Math.min(1.0, Math.exp(-decayLambda * ageHours));

    const tokens = text.split(/[\s,\.\?\!\-#\(\)\"]+/).filter(Boolean);
    let negationWindow = 0;
    let currentIntensifierMultiplier = 1.0;

    let sentimentSum = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Check negations
      if (NEGATIONS.includes(token)) {
        negationWindow = 3;
        continue;
      }

      // Check intensifiers
      if (token in INTENSIFIERS) {
        currentIntensifierMultiplier = INTENSIFIERS[token as keyof typeof INTENSIFIERS];
        continue;
      }

      let wordWeight = 0;

      if (BULLISH_WORDS.some(w => w === token || (w.includes(' ') && text.includes(w)))) {
        wordWeight = 1.0;
        positive_count += decayWeight;
      } else if (BEARISH_WORDS.some(w => w === token || (w.includes(' ') && text.includes(w)))) {
        wordWeight = -1.0;
        negative_count += decayWeight;
      }

      if (wordWeight !== 0) {
        const negated = negationWindow > 0;
        const adjustedWeight = wordWeight * (negated ? -1.2 : 1.0) * currentIntensifierMultiplier;
        
        sentimentSum += adjustedWeight;
        currentIntensifierMultiplier = 1.0; // Consumed
      }

      if (negationWindow > 0) {
        negationWindow--;
      }
    }

    // Clamp sentiment sum of individual headline to [-2, 2] then scale
    const headlineSentiment = Math.max(-2, Math.min(2, sentimentSum)) / 2;
    total_multiweighted_score += headlineSentiment * decayWeight;
    total_multiweighted_weight += decayWeight;
  });

  let score = 0;
  if (total_multiweighted_weight > 0) {
    score = total_multiweighted_score / total_multiweighted_weight;
  }

  let label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
  if (score > 0.12) {
    label = 'POSITIVE';
  } else if (score < -0.12) {
    label = 'NEGATIVE';
  }

  return {
    label,
    score: parseFloat(score.toFixed(2)),
    positive_count: Math.round(positive_count),
    negative_count: Math.round(negative_count)
  };
}
