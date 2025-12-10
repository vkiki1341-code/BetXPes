import React, { useState } from 'react';
import { Trash2, Copy, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBetSlipHistory, SavedBetSlip } from '@/hooks/useBetSlipHistory';

interface BetSlipHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadBetSlip: (betSlip: SavedBetSlip) => void;
}

export function BetSlipHistory({ open, onOpenChange, onLoadBetSlip }: BetSlipHistoryProps) {
  const { history, deleteBetSlip, clearHistory } = useBetSlipHistory();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleLoadBetSlip = (betSlip: SavedBetSlip) => {
    onLoadBetSlip(betSlip);
    onOpenChange(false);
  };

  const handleDeleteBetSlip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this bet slip?')) {
      deleteBetSlip(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Bet Slip History
          </DialogTitle>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600"
              onClick={() => {
                if (confirm('Clear all bet slip history?')) {
                  clearHistory();
                }
              }}
            >
              Clear All
            </Button>
          )}
        </DialogHeader>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mb-4 opacity-50" />
            <p>No saved bet slips yet</p>
            <p className="text-sm">Save your bet slips to quickly load them later</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((betSlip) => (
              <div
                key={betSlip.id}
                className="border border-border rounded-lg overflow-hidden bg-card hover:bg-card/80 transition"
              >
                <div
                  className="p-4 cursor-pointer flex items-center justify-between"
                  onClick={() =>
                    setExpandedId(expandedId === betSlip.id ? null : betSlip.id)
                  }
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{betSlip.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {betSlip.bets.length} bet{betSlip.bets.length !== 1 ? 's' : ''} •{' '}
                      <span className="text-primary font-bold">
                        KES {betSlip.totalStake.toLocaleString()}
                      </span>{' '}
                      • Potential win:{' '}
                      <span className="text-accent font-bold">
                        KES {betSlip.potentialWin.toLocaleString('en-US', {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(betSlip.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadBetSlip(betSlip);
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Load
                    </Button>
                    <button
                      onClick={(e) => handleDeleteBetSlip(betSlip.id, e)}
                      className="p-2 hover:bg-destructive/10 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                    {expandedId === betSlip.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === betSlip.id && (
                  <div className="border-t border-border px-4 py-3 bg-muted/50 space-y-2">
                    {betSlip.bets.map((bet, idx) => (
                      <div
                        key={idx}
                        className="text-sm p-2 bg-background rounded border border-border/50"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-foreground">
                              {bet.match.homeTeam.shortName} vs{' '}
                              {bet.match.awayTeam.shortName}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {bet.betType}: {bet.selection}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-accent">{bet.odds.toFixed(2)}</p>
                            <p className="text-muted-foreground text-xs">
                              KES {bet.stake.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
