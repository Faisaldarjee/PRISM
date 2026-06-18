export interface AgentSignal {
  agent: 'technical' | 'smc' | 'macro' | 'sentiment' | 'news';
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number; // 0 - 100
  weight: number; // fractional weight, e.g. 0.35, sum of all active weights = 1.0
}

export interface ConsensusResult {
  finalSignal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  consensusScore: number; // Raw score from -2.0 to +2.0 based on weighted math
  agentBreakdown: AgentSignal[];
  conflictDetected: boolean;
  conflictReason?: string;
}

export class WeightedConsensusEngine {
  // Configured default weights:
  // - SMC Agent: 35% (Institutional Money Tracking)
  // - Technical Agent: 30%
  // - Sentiment/News Agent: 20%
  // - Macro Agent: 15%
  private static DEFAULT_WEIGHTS: Record<string, number> = {
    smc: 0.35,
    technical: 0.30,
    sentiment: 0.20,
    macro: 0.15
  };

  private static SIGNAL_VALUES: Record<string, number> = {
    STRONG_BUY: 2.0,
    BUY: 1.0,
    HOLD: 0.0,
    NEUTRAL: 0.0, // mapping fallback
    SELL: -1.0,
    STRONG_SELL: -2.0
  };

  /**
   * Reconcile multiple agent signals into one unified consensus decision using the weighted scoring lookup.
   */
  public static calculateConsensus(
    inputs: Array<{
      agent: 'technical' | 'smc' | 'macro' | 'sentiment' | 'news';
      signal: string;
      confidence: number;
    }>
  ): ConsensusResult {
    // 1. Process and normalize signals
    const signals: AgentSignal[] = [];
    let totalWeightUsed = 0;

    // Filter and find what weights we are compiling
    inputs.forEach(input => {
      let normSignal: AgentSignal['signal'] = 'HOLD';
      const uSig = input.signal?.trim().toUpperCase();

      if (uSig === 'STRONG_BUY' || uSig === 'STRONG BUY' || uSig === 'BULLISH' && input.confidence > 80) {
        normSignal = 'STRONG_BUY';
      } else if (uSig === 'BUY' || uSig === 'BULLISH' || uSig === 'ACCUMULATE') {
        normSignal = 'BUY';
      } else if (uSig === 'STRONG_SELL' || uSig === 'STRONG SELL' || uSig === 'BEARISH' && input.confidence > 80) {
        normSignal = 'STRONG_SELL';
      } else if (uSig === 'SELL' || uSig === 'BEARISH') {
        normSignal = 'SELL';
      } else {
        normSignal = 'HOLD';
      }

      // Map dynamic weight
      const weightKey = input.agent === 'news' ? 'sentiment' : input.agent;
      const weight = this.DEFAULT_WEIGHTS[weightKey] ?? 0.1;
      totalWeightUsed += weight;

      signals.push({
        agent: input.agent,
        signal: normSignal,
        confidence: Math.max(0, Math.min(100, input.confidence)),
        weight
      });
    });

    // 2. Re-normalize weights so the sum is exactly 1.0 if any agent failed or is missing
    if (totalWeightUsed > 0 && Math.abs(totalWeightUsed - 1.0) > 0.001) {
      signals.forEach(s => {
        s.weight = parseFloat((s.weight / totalWeightUsed).toFixed(3));
      });
    }

    // 3. Compute score: sum of [ signalValue * (confidence / 100) * weight ]
    let consensusScore = 0;
    signals.forEach(s => {
      const value = this.SIGNAL_VALUES[s.signal] ?? 0.0;
      const weightedContribution = value * (s.confidence / 100) * s.weight;
      consensusScore += weightedContribution;
    });

    // Round consensusShift to high accuracy precision
    consensusScore = parseFloat(consensusScore.toFixed(3));

    // 4. Map consensusScore to Final Signal based on specified boundary thresholds:
    // - Score > 0.8           -> STRONG BUY
    // - Score  0.3 to 0.8     -> BUY
    // - Score -0.3 to 0.3     -> HOLD
    // - Score -0.8 to -0.3    -> SELL
    // - Score < -0.8          -> STRONG SELL
    let finalSignal: ConsensusResult['finalSignal'] = 'HOLD';
    if (consensusScore > 0.8) {
      finalSignal = 'STRONG_BUY';
    } else if (consensusScore >= 0.3) {
      finalSignal = 'BUY';
    } else if (consensusScore <= -0.8) {
      finalSignal = 'STRONG_SELL';
    } else if (consensusScore <= -0.3) {
      finalSignal = 'SELL';
    } else {
      finalSignal = 'HOLD';
    }

    // 5. Conflict detection: Check if major agents contradict directly (i.e. Buy/Strong Buy vs Sell/Strong Sell)
    let conflictDetected = false;
    let conflictReason: string | undefined;

    const bullishAgents = signals.filter(s => s.signal === 'STRONG_BUY' || s.signal === 'BUY');
    const bearishAgents = signals.filter(s => s.signal === 'STRONG_SELL' || s.signal === 'SELL');

    if (bullishAgents.length > 0 && bearishAgents.length > 0) {
      conflictDetected = true;
      const smcAgent = signals.find(s => s.agent === 'smc');
      const techAgent = signals.find(s => s.agent === 'technical');

      if (smcAgent && techAgent && (
        (smcAgent.signal.includes('SELL') && techAgent.signal.includes('BUY')) ||
        (smcAgent.signal.includes('BUY') && techAgent.signal.includes('SELL'))
      )) {
        conflictReason = `SMC Smart Money flow registers ${smcAgent.signal} (${smcAgent.confidence}% conf) which conflicts directly with the Technical analysis suggesting a ${techAgent.signal} setup. Use caution.`;
      } else {
        const bulls = bullishAgents.map(b => `${b.agent.toUpperCase()} (${b.signal})`).join(', ');
        const bears = bearishAgents.map(b => `${b.agent.toUpperCase()} (${b.signal})`).join(', ');
        conflictReason = `Opposing signal vectors flagged. Bullish: [${bulls}] VS Bearish: [${bears}]. High volatility setup, market participants are split.`;
      }
    }

    return {
      finalSignal,
      consensusScore,
      agentBreakdown: signals,
      conflictDetected,
      conflictReason
    };
  }
}
