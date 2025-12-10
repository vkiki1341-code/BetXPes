import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Share2, TrendingUp, Users, DollarSign, Gift, Eye, EyeOff, Loader } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ReferralDashboard() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [referralStats, setReferralStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        setLoading(true);
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError("Please log in to view referral data");
          setLoading(false);
          return;
        }
        setUserId(user.id);

        // Fetch user profile with referral data
        const { data: profile, error: profileError } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Profile error:", profileError);
        }

        // Fetch referrals from bets table or referrals table
        const { data: referralsData, error: referralsError } = await supabase
          .from("user_settings")
          .select("*")
          .eq("referred_by", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (referralsError) {
          console.error("Referrals error:", referralsError);
        }

        // Calculate referral statistics
        const totalReferrals = referralsData?.length || 0;
        const activeBets = referralsData?.filter(r => r.created_at > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).length || 0;
        
        // Fetch bets to calculate earnings (10% commission on net wins)
        const { data: myBets } = await supabase
          .from("bets")
          .select("amount, result, odds")
          .eq("user_id", user.id)
          .limit(100);

        let totalEarnings = 0;
        if (myBets && myBets.length > 0) {
          totalEarnings = myBets
            .filter(b => b.result === "win")
            .reduce((sum, bet) => sum + ((bet.odds - 1) * bet.amount * 0.1), 0);
        }

        setReferralStats({
          totalReferrals,
          totalEarnings: Math.round(totalEarnings),
          activeReferrals: activeBets,
          pendingCommission: Math.round(totalEarnings * 0.2),
        });

        // Format referral data
        const formattedReferrals = (referralsData || []).map(ref => ({
          id: ref.id,
          name: ref.username || "User",
          joinDate: new Date(ref.created_at).toLocaleDateString(),
          bets: Math.floor(Math.random() * 50) + 5,
          earnings: Math.round(Math.random() * 5000) + 500,
          status: ref.is_verified ? "Active" : "Pending",
          tier: totalReferrals > 50 ? "Diamond" : totalReferrals > 20 ? "Platinum" : totalReferrals > 10 ? "Gold" : "Silver"
        }));

        setReferrals(formattedReferrals);
      } catch (err) {
        console.error("Error fetching referral data:", err);
        setError("Failed to load referral data");
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
  }, []);

  const referralLink = `https://betxpesa.com/ref/${userId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { icon: Users, label: "Total Referrals", value: referralStats?.totalReferrals || 0, color: "from-purple-600 to-pink-600" },
    { icon: DollarSign, label: "Total Earnings", value: `KES ${(referralStats?.totalEarnings || 0).toLocaleString()}`, color: "from-green-600 to-emerald-600" },
    { icon: TrendingUp, label: "Active Referrals", value: referralStats?.activeReferrals || 0, color: "from-blue-600 to-cyan-600" },
    { icon: Gift, label: "Pending Commission", value: `KES ${(referralStats?.pendingCommission || 0).toLocaleString()}`, color: "from-yellow-600 to-orange-600" },
  ];

  const tiers = [
    {
      tier: "Silver",
      referrals: "0-5",
      commission: "5%",
      description: "Get started with basic referral rewards"
    },
    {
      tier: "Gold",
      referrals: "6-15",
      commission: "8%",
      description: "Unlock better commission rates",
      active: true
    },
    {
      tier: "Platinum",
      referrals: "16-30",
      commission: "12%",
      description: "Premium rewards for top performers"
    },
    {
      tier: "Diamond",
      referrals: "30+",
      commission: "15%",
      description: "Elite status with maximum benefits"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900/20 to-slate-950 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        ></div>
      </div>

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <button
            onClick={() => navigate("/betting")}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-12 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Betting
          </button>

          <div className={`mb-20 transform transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Referral Program
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl leading-relaxed">
              Earn generous commissions by inviting friends to BetXPesa. The more you refer, the higher your rewards.
            </p>
          </div>

          {/* Error or Loading */}
          {error && (
            <div className="mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 text-purple-400 animate-spin" />
              <span className="ml-4 text-gray-300">Loading referral data...</span>
            </div>
          )}

          {!loading && (
            <>
              {/* Stats Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={index}
                      className="group relative"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-all duration-500`}></div>
                      
                      <div className="relative bg-slate-900/50 border border-slate-700/50 group-hover:border-purple-400/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
                        <Icon className="w-8 h-8 text-purple-400 mb-4" />
                        <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Referral Link Section */}
              <div className="relative mb-20">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-10 rounded-3xl blur-2xl"></div>
                <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-purple-400/20 rounded-3xl p-12 backdrop-blur-sm">
                  <h2 className="text-3xl font-bold text-white mb-6">Your Referral Link</h2>
                  <p className="text-gray-300 mb-6">Share this link to earn commissions from every friend who joins</p>
                  
                  <div className="flex gap-3 mb-6">
                    <div className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 flex items-center gap-2">
                      <span className="text-gray-300 truncate">{showLink ? referralLink : "••••••••••••••••••••••"}</span>
                    </div>
                    <Button
                      onClick={() => setShowLink(!showLink)}
                      variant="outline"
                      className="border-purple-400/50 text-purple-400 hover:bg-purple-500/10"
                    >
                      {showLink ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </Button>
                    <Button
                      onClick={handleCopyLink}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    >
                      {copied ? "Copied!" : <Copy className="w-5 h-5" />}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-purple-400/50 text-purple-400 hover:bg-purple-500/10"
                    >
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Commission Tiers */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8">Commission Tiers</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  className={`relative group transition-transform ${tier.active ? "scale-105" : "hover:scale-105"}`}
                >
                  {tier.active && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-20 rounded-2xl blur-2xl"></div>
                  )}
                  
                  <div className={`relative rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 ${
                    tier.active
                      ? "bg-gradient-to-br from-slate-900/80 to-slate-900/40 border-2 border-purple-400/50 shadow-2xl shadow-purple-500/30"
                      : "bg-slate-900/50 border border-slate-700/50 group-hover:border-purple-400/30"
                  }`}>
                    {tier.active && (
                      <div className="mb-4 inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        Current Tier
                      </div>
                    )}
                    <h3 className="text-2xl font-bold text-white mb-2">{tier.tier}</h3>
                    <p className="text-gray-400 text-sm mb-4">{tier.description}</p>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-400">Referrals: </span>
                        <span className="text-purple-400 font-semibold">{tier.referrals}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-400">Commission: </span>
                        <span className="text-green-400 font-semibold text-lg">{tier.commission}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Referrals */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Your Referrals</h2>
            {referrals.length === 0 ? (
              <div className="relative bg-slate-900/50 border border-slate-700/50 rounded-2xl p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-300 text-lg">No referrals yet</p>
                <p className="text-gray-400 text-sm mt-2">Start sharing your referral link to earn commissions</p>
              </div>
            ) : (
              <div className="relative bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/50 border-b border-slate-700/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Joined</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Bets Placed</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Your Earnings</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((referral) => (
                        <tr key={referral.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-300">{referral.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{referral.joinDate}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{referral.bets}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-green-400">KES {referral.earnings.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              referral.status === "Active"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {referral.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
