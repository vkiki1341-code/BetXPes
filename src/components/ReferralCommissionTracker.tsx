import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Copy, TrendingUp, Users, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingCommissions: number;
  completedPayouts: number;
}

interface ReferredUser {
  id: string;
  email: string;
  joinedAt: string;
  status: 'active' | 'inactive';
  betsPlaced: number;
  totalDeposits: number;
  commissionEarned: number;
}

interface CommissionPayout {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
}

export function ReferralCommissionTracker({ userId }: { userId: string }) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferredUser[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, [userId]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);

      // Fetch referral code and stats
      const { data: userData } = await supabase
        .from('users')
        .select('referral_code, referral_commission_total, referral_commission_pending')
        .eq('id', userId)
        .single();

      if (!userData) return;

      // Fetch referred users
      const { data: referralsData } = await supabase
        .from('users')
        .select(
          `
          id,
          email,
          created_at,
          balance,
          bets!inner(id)
        `
        )
        .eq('referred_by', userData.referral_code);

      // Fetch payouts
      const { data: payoutsData } = await supabase
        .from('referral_payouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Build stats
      const totalReferrals = referralsData?.length || 0;
      const activeReferrals = referralsData?.filter(
        (r: any) => new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length || 0;

      setStats({
        referralCode: userData.referral_code,
        totalReferrals,
        activeReferrals,
        totalEarnings: userData.referral_commission_total || 0,
        pendingCommissions: userData.referral_commission_pending || 0,
        completedPayouts: payoutsData?.filter((p) => p.status === 'completed').length || 0,
      });

      // Map referrals
      const mappedReferrals: ReferredUser[] = referralsData?.map((r: any) => ({
        id: r.id,
        email: r.email,
        joinedAt: new Date(r.created_at).toLocaleDateString(),
        status: new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) ? 'active' : 'inactive',
        betsPlaced: r.bets?.length || 0,
        totalDeposits: 0, // Would need deposit history table
        commissionEarned: 0, // Would need commission tracking per referral
      })) || [];

      setReferrals(mappedReferrals);
      setPayouts(payoutsData || []);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReferralCode = async () => {
    if (stats?.referralCode) {
      const referralUrl = `${window.location.origin}?ref=${stats.referralCode}`;
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRequestPayout = async () => {
    if (payoutAmount <= 0 || !stats) return;

    try {
      const { error } = await supabase.from('referral_payouts').insert({
        user_id: userId,
        amount: payoutAmount,
        status: 'pending',
      });

      if (error) throw error;

      alert('Payout request submitted!');
      setShowPayoutDialog(false);
      setPayoutAmount(0);
      fetchReferralData();
    } catch (error) {
      console.error('Failed to request payout:', error);
      alert('Failed to request payout');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading referral data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Referrals</p>
              <p className="text-2xl font-bold text-foreground">{stats?.totalReferrals || 0}</p>
              <p className="text-xs text-accent mt-1">{stats?.activeReferrals} active</p>
            </div>
            <Users className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
              <p className="text-2xl font-bold text-primary">KES {(stats?.totalEarnings || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats?.completedPayouts} payouts</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pending Commission</p>
              <p className="text-2xl font-bold text-accent">KES {(stats?.pendingCommissions || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
            </div>
            <Wallet className="w-8 h-8 text-accent opacity-50" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Referral Link</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyReferralCode}
              className="w-full text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        </div>
      </div>

      {/* Referred Users Table */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-bold text-foreground mb-4">Referred Users</h3>
        {referrals.length === 0 ? (
          <p className="text-muted-foreground text-sm">No referrals yet. Share your link to get started!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-2 text-muted-foreground font-medium">Email</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Joined</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Bets</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral) => (
                  <tr key={referral.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 text-foreground">{referral.email}</td>
                    <td className="py-3 text-muted-foreground">{referral.joinedAt}</td>
                    <td className="py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          referral.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {referral.status}
                      </span>
                    </td>
                    <td className="py-3 text-foreground">{referral.betsPlaced}</td>
                    <td className="py-3 text-right font-bold text-primary">
                      KES {referral.commissionEarned.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout History */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-foreground">Payout History</h3>
          <Button
            onClick={() => setShowPayoutDialog(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            size="sm"
          >
            Request Payout
          </Button>
        </div>
        {payouts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No payouts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-2 text-muted-foreground font-medium">Amount</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Requested</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Processed</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 font-bold text-primary">KES {payout.amount.toLocaleString()}</td>
                    <td className="py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          payout.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : payout.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">
                      {new Date(payout.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">
                      {payout.processedAt ? new Date(payout.processedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Request Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Amount (KES)</label>
              <input
                type="number"
                min="100"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(Number(e.target.value))}
                className="w-full border border-input rounded-lg px-3 py-2 bg-background text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter amount"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: KES {stats?.pendingCommissions.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPayoutDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleRequestPayout}
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={payoutAmount <= 0 || payoutAmount > (stats?.pendingCommissions || 0)}
              >
                Request Payout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
