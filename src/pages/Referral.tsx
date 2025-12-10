import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, TrendingUp, Copy, Check, Share2 } from "lucide-react";

interface Referral {
  id: string;
  referred_user_email: string;
  referred_at: string;
  status: string;
  bonus_earned: number;
}

const Referral = () => {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [userId, setUserId] = useState("");
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalReferred, setTotalReferred] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const REFERRAL_BONUS = 500; // KES 500 per referral

  useEffect(() => {
    const fetchReferralData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        navigate("/login");
        return;
      }

      setUserId(userData.user.id);

      // Fetch referral info
      const { data: referralData } = await supabase
        .from("referrals")
        .select("*")
        .eq("user_id", userData.user.id);

      if (referralData && referralData.length > 0) {
        setReferralCode(referralData[0].referral_code);
        setTotalReferred(referralData[0].referred_count || 0);
        setTotalEarnings(referralData[0].referral_earnings || 0);
      }

      // Fetch referrals list
      const { data: referralsList } = await supabase
        .from("referral_list")
        .select("*")
        .eq("referrer_id", userData.user.id)
        .order("referred_at", { ascending: false });

      if (referralsList) {
        setReferrals(referralsList);
      }

      setLoading(false);
    };

    fetchReferralData();
  }, [navigate]);

  const copyLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    const text = `Join me on BetXPesa! Get KES 500 bonus when you sign up with my referral code: ${referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join BetXPesa",
          text: text,
          url: link,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(`${text}\n${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/account")}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Referral Program</h1>
            <p className="text-slate-600">Invite friends and earn rewards</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Referred */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Friends Referred</p>
                  <p className="text-3xl font-bold text-slate-900">{totalReferred}</p>
                </div>
                <Users className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          {/* Total Earnings */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Earnings</p>
                  <p className="text-3xl font-bold text-green-600">KES {totalEarnings.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          {/* Bonus Per Referral */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Bonus Per Referral</p>
                  <p className="text-3xl font-bold text-blue-600">KES {REFERRAL_BONUS.toLocaleString()}</p>
                </div>
                <span className="text-4xl">🎁</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code Section */}
        <Card className="mb-6 shadow-lg border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle>Your Referral Code</CardTitle>
            <CardDescription>Share this code with friends to earn KES 500 per referral</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-100 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">Code</p>
                <p className="text-4xl font-mono font-bold text-purple-600">{referralCode}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={copyLink}
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-11"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  onClick={shareLink}
                  className="flex items-center justify-center gap-2 h-11 bg-purple-600 hover:bg-purple-700"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold">
                    1
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Share Your Code</p>
                  <p className="text-sm text-slate-600">Send your referral code to friends</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold">
                    2
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">They Sign Up</p>
                  <p className="text-sm text-slate-600">Friends use your code during registration</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold">
                    3
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">You Earn</p>
                  <p className="text-sm text-slate-600">Get KES 500 for each successful referral</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        {referrals.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Your Referrals ({referrals.length})</CardTitle>
              <CardDescription>Recent friends who joined via your code</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{referral.referred_user_email}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(referral.referred_at).toLocaleDateString("en-KE")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        +KES {referral.bonus_earned.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">{referral.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {referrals.length === 0 && !loading && (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Referrals Yet</h3>
              <p className="text-slate-600 mb-6">Start sharing your code to earn rewards!</p>
              <Button onClick={shareLink} className="bg-purple-600 hover:bg-purple-700">
                Share Referral Code
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Referral;
