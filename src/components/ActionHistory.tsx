import React, { useState, useEffect } from 'react';
import { getUserActions, getAuditStats, AuditAction } from '@/lib/auditLog';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserAction {
  id: string;
  action: string;
  details: Record<string, any>;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  created_at: string;
}

export function ActionHistory({ userId }: { userId: string }) {
  const [actions, setActions] = useState<UserAction[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [userId, filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userActions = await getUserActions(userId, 100);
      const auditStats = await getAuditStats(userId);

      setActions(userActions);
      setStats(auditStats);
    } catch (error) {
      console.error('Failed to fetch action history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActions = filter === 'all' ? actions : actions.filter((a) => a.action === filter);

  const getActionIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: '🔐 Login',
      logout: '🚪 Logout',
      signup: '📝 Sign Up',
      password_reset: '🔑 Password Reset',
      email_verified: '✅ Email Verified',
      bet_placed: '🎫 Bet Placed',
      bet_cancelled: '❌ Bet Cancelled',
      bet_won: '🎉 Bet Won',
      bet_lost: '💔 Bet Lost',
      deposit_requested: '💳 Deposit Requested',
      deposit_confirmed: '✅ Deposit Confirmed',
      withdraw_requested: '💸 Withdrawal Requested',
      withdraw_confirmed: '✅ Withdrawal Confirmed',
      profile_updated: '👤 Profile Updated',
      settings_changed: '⚙️ Settings Changed',
      referral_link_used: '🔗 Referral Used',
      admin_override: '⚡ Admin Override',
    };
    return labels[action] || action;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading action history...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Actions</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalActions}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Successful</p>
            <p className="text-2xl font-bold text-green-500">{stats.byStatus.success}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-500">{stats.byStatus.failed}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'bet_placed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('bet_placed')}
        >
          Bets
        </Button>
        <Button
          variant={filter === 'deposit_confirmed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('deposit_confirmed')}
        >
          Deposits
        </Button>
        <Button
          variant={filter === 'withdraw_confirmed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('withdraw_confirmed')}
        >
          Withdrawals
        </Button>
        <Button
          variant={filter === 'login' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('login')}
        >
          Logins
        </Button>
      </div>

      {/* Action List */}
      <div className="space-y-2">
        {filteredActions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No actions found.</p>
        ) : (
          filteredActions.map((action) => (
            <div
              key={action.id}
              className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:bg-card/80 transition"
              onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getActionIcon(action.status)}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{getActionLabel(action.action)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(action.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    action.status === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : action.status === 'failed'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {action.status}
                </span>
              </div>

              {/* Expanded Details */}
              {expandedId === action.id && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-2 text-xs">
                  {Object.entries(action.details || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="text-foreground font-mono">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                  {action.error_message && (
                    <div className="mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                      <p className="text-red-400 text-xs">{action.error_message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
