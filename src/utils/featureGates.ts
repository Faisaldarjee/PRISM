export const FEATURE_GATES = {
  // Free users get these
  FREE: {
    watchlistLimit: 3,
    scannerResultsLimit: 5,
    canViewBasicChart: true,
    canViewSMC: false,
    canViewAISignals: false,
    canViewMorningBriefing: false,
    canViewAccuracyMatrix: false,
    canViewSIPHub: false,
    showAds: true,
  },
  // Pro users get everything
  PRO: {
    watchlistLimit: Infinity,
    scannerResultsLimit: Infinity,
    canViewBasicChart: true,
    canViewSMC: true,
    canViewAISignals: true,
    canViewMorningBriefing: true,
    canViewAccuracyMatrix: true,
    canViewSIPHub: true,
    showAds: false,
  }
};

export function getFeatures(isPro: boolean) {
  return isPro ? FEATURE_GATES.PRO : FEATURE_GATES.FREE;
}
