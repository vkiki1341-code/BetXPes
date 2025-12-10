import { useState, useEffect } from 'react';

export interface SavedBetSlip {
  id: string;
  name: string;
  bets: Array<{
    match: {
      id: string;
      homeTeam: { shortName: string; name: string };
      awayTeam: { shortName: string; name: string };
    };
    betType: string;
    selection: string;
    odds: number;
    stake: number;
  }>;
  totalStake: number;
  potentialWin: number;
  createdAt: string;
}

const BETSLIP_HISTORY_KEY = 'betslip_history';

export function useBetSlipHistory() {
  const [history, setHistory] = useState<SavedBetSlip[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(BETSLIP_HISTORY_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load bet slip history:', error);
      }
    }
    setLoaded(true);
  }, []);

  const saveBetSlip = (bets: SavedBetSlip['bets'], name?: string) => {
    if (bets.length === 0) return;

    const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);
    const potentialWin = bets.reduce((prod, bet) => prod * bet.odds, 1) * totalStake;

    const newSlip: SavedBetSlip = {
      id: Date.now().toString(),
      name: name || `Bet Slip ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      bets,
      totalStake,
      potentialWin,
      createdAt: new Date().toISOString(),
    };

    const updated = [newSlip, ...history];
    setHistory(updated);
    localStorage.setItem(BETSLIP_HISTORY_KEY, JSON.stringify(updated));
    return newSlip;
  };

  const deleteBetSlip = (id: string) => {
    const updated = history.filter(slip => slip.id !== id);
    setHistory(updated);
    localStorage.setItem(BETSLIP_HISTORY_KEY, JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(BETSLIP_HISTORY_KEY);
  };

  return {
    history,
    loaded,
    saveBetSlip,
    deleteBetSlip,
    clearHistory,
  };
}
