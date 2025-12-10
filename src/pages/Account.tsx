import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, Settings, Users, History, Copy, Check, Moon, Sun, Bell, Lock, Eye, EyeOff, AlertCircle, ToggleLeft, ToggleRight, LogOut, TrendingUp, Target, Award, Activity, Calendar, Zap } from "lucide-react";

const Account = () => {
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [profile, setProfile] = useState({ email: "", username: "", verified: false, joined: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [referralData, setReferralData] = useState({ code: "", referredCount: 0, earnings: 0, pendingEarnings: 0 });
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // Real betting stats from Supabase
  const [bettingStats, setBettingStats] = useState({
    totalBets: 0,
    winRate: 0,
    totalStaked: 0,
    totalReturned: 0,
    profit: 0,
    roi: 0,
    recentBets: [] as any[]
  });
  const [accountStats, setAccountStats] = useState({
    lastLogin: "",
    loginCount: 0,
    accountAge: 0,
    verificationStatus: "Pending"
  });

  // Settings state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const [notifications, setNotifications] = useState({
    betNotifications: true,
    resultNotifications: true,
    promotionEmails: false,
    weeklyReport: true,
    loginAlerts: true,
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);

  // Helper functions
  const generateReferralCode = (input: string) => {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const prefix = input.substring(0, 3).toUpperCase();
    return `${prefix}${random}`;
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralData.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyDarkMode = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    const { error } = await supabase.auth.updateUser({
      data: { username: profile.username }
    });
    if (error) setError(error.message);
    else setSuccess("Profile updated successfully!");
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("user_settings")
      .update({ notifications })
      .eq("user_id", user?.id);

    if (error) {
      setError("Failed to save notification settings");
    } else {
      setSuccess("Notification settings saved!");
    }
    setLoading(false);
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      
      if (data.user?.id) {
        // Fetch user settings and profile
        const userSettingsRes = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", data.user.id);
        
        const userSettings = userSettingsRes.data?.[0];
        const joinDate = userSettings?.created_at 
          ? new Date(userSettings.created_at)
          : new Date();
        
        setProfile({
          email: data.user?.email || "",
          username: userSettings?.username || data.user?.user_metadata?.username || "",
          verified: userSettings?.is_verified || false,
          joined: joinDate.toLocaleDateString()
        });

        // Fetch balance
        const balanceRes = await supabase
          .from("users")
          .select("balance")
          .eq("id", data.user.id);

        if (balanceRes.data && balanceRes.data.length > 0) {
          setBalance(balanceRes.data[0].balance || 0);
        }

        // Fetch all bets for real stats calculation
        const betsRes = await supabase
          .from("bets")
          .select("*")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false });

        if (betsRes.data && betsRes.data.length > 0) {
          const allBets = betsRes.data;
          const totalBets = allBets.length;
          const winningBets = allBets.filter(b => b.result === "win").length;
          const totalStaked = allBets.reduce((sum, b) => sum + (b.amount || 0), 0);
          const totalReturned = allBets
            .filter(b => b.result === "win")
            .reduce((sum, b) => sum + ((b.amount || 0) * (b.odds || 1)), 0);
          const profit = totalReturned - totalStaked;
          const roi = totalStaked > 0 ? (profit / totalStaked) * 100 : 0;

          setBettingStats({
            totalBets,
            winRate: totalBets > 0 ? (winningBets / totalBets) * 100 : 0,
            totalStaked,
            totalReturned,
            profit,
            roi,
            recentBets: allBets.slice(0, 5)
          });
        }

        // Fetch real referral data - users who were referred BY this user
        const referredUsersRes = await supabase
          .from("user_settings")
          .select("id, username, created_at")
          .eq("referred_by", data.user.id);
        
        const referredCount = referredUsersRes.data?.length || 0;
        setReferredUsers(referredUsersRes.data || []);
        
        // Calculate earnings: 10% of (odds - 1) * amount for winning referred bets
        let totalEarnings = 0;
        if (referredUsersRes.data && referredUsersRes.data.length > 0) {
          const referredIds = referredUsersRes.data.map(r => r.id);
          const referredBetsRes = await supabase
            .from("bets")
            .select("amount, odds, result")
            .in("user_id", referredIds)
            .eq("result", "win");

          if (referredBetsRes.data) {
            totalEarnings = referredBetsRes.data.reduce((sum, b) => {
              return sum + ((b.amount || 0) * ((b.odds || 1) - 1) * 0.1);
            }, 0);
          }
        }

        setReferralData({
          code: userSettings?.referral_code || generateReferralCode(data.user.email || data.user.id),
          referredCount,
          earnings: Math.floor(totalEarnings),
          pendingEarnings: 0
        });

        // Set account stats
        const accountAgeMs = Date.now() - new Date(data.user.created_at).getTime();
        const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

        setAccountStats({
          lastLogin: new Date().toLocaleString(),
          loginCount: 1,
          accountAge: accountAgeDays,
          verificationStatus: userSettings?.is_verified ? "Verified" : "Pending"
        });

        // Load settings if they exist
        const settingsRes = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", data.user.id);
        
        if (settingsRes.data && settingsRes.data.length > 0) {
          setNotifications(settingsRes.data[0].notifications || notifications);
          setTwoFactorEnabled(settingsRes.data[0].two_factor_enabled || false);
        } else if (data.user?.id) {
          // Create default settings
          await supabase.from("user_settings").insert([
            { 
              user_id: data.user.id, 
              notifications, 
              two_factor_enabled: false 
            }
          ]);
        }
      }
    };
    fetchUserData();

    // Apply dark mode on mount
    applyDarkMode(darkMode);
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    applyDarkMode(darkMode);
  }, [darkMode]);

  // Poll balance every 3 seconds to ensure users see real-time balance from Supabase
  useEffect(() => {
    const pollBalance = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        const balanceRes = await supabase
          .from("users")
          .select("balance")
          .eq("id", data.user.id);
        
        if (balanceRes.data && balanceRes.data.length > 0) {
          setBalance(balanceRes.data[0].balance || 0);
        }
      }
    };

    const interval = setInterval(pollBalance, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Betting
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Account</h1>
          <p className="text-muted-foreground">Profile • Analytics • Settings • Security</p>
        </div>

        {/* Primary Balance Card with Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Balance Card */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Account Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold mb-4">KES {balance.toLocaleString()}</div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate("/deposit")} 
                  className="flex-1 bg-white text-blue-600 hover:bg-blue-50"
                  size="sm"
                >
                  Deposit
                </Button>
                <Button 
                  onClick={() => navigate("/withdraw")} 
                  variant="outline" 
                  className="flex-1 border-white text-white hover:bg-white/10"
                  size="sm"
                >
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profit/Loss Card */}
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Total Profit/Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-5xl font-bold mb-2 ${bettingStats.profit >= 0 ? 'text-emerald-100' : 'text-red-200'}`}>
                {bettingStats.profit >= 0 ? '+' : ''}KES {bettingStats.profit.toLocaleString()}
              </div>
              <p className="text-sm opacity-90">ROI: {bettingStats.roi.toFixed(2)}%</p>
            </CardContent>
          </Card>

          {/* Referral Earnings Card */}
          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Referral Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold mb-2">KES {referralData.earnings.toLocaleString()}</div>
              <p className="text-sm opacity-90">{referralData.referredCount} friends referred</p>
            </CardContent>
          </Card>
        </div>

        {/* Betting Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bets</p>
                  <p className="text-2xl font-bold">{bettingStats.totalBets}</p>
                </div>
                <Target className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold">{bettingStats.winRate.toFixed(1)}%</p>
                </div>
                <Award className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Staked</p>
                  <p className="text-2xl font-bold">KES {(bettingStats.totalStaked / 1000).toFixed(0)}K</p>
                </div>
                <Zap className="w-8 h-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Account Age</p>
                  <p className="text-2xl font-bold">{accountStats.accountAge}d</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed sections */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="betting">Betting</TabsTrigger>
            <TabsTrigger value="referral">Referral</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Info */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Your account details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email Address</label>
                      <Input value={profile.email} disabled className="mt-1 bg-muted" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Username</label>
                      <Input
                        placeholder="Enter your username"
                        value={profile.username}
                        onChange={e => setProfile({ ...profile, username: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    {success && <div className="text-green-500 text-sm">{success}</div>}
                    <Button onClick={handleUpdateProfile} disabled={loading} className="w-full">
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Account Status */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Account Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Verification</p>
                      <p className={`font-semibold ${profile.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                        {accountStats.verificationStatus}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="font-semibold">{profile.joined}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Age</p>
                      <p className="font-semibold">{accountStats.accountAge} days</p>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Last Login</p>
                      <p className="text-xs text-slate-500">{accountStats.lastLogin}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Betting Analytics Tab */}
          <TabsContent value="betting">
            <div className="space-y-6">
              {/* Betting Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Betting Performance</CardTitle>
                  <CardDescription>Your real betting statistics from Supabase</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Total Bets</p>
                      <p className="text-3xl font-bold">{bettingStats.totalBets}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Win Rate</p>
                      <p className="text-3xl font-bold text-green-600">{bettingStats.winRate.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Total Staked</p>
                      <p className="text-3xl font-bold">KES {bettingStats.totalStaked.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">ROI</p>
                      <p className={`text-3xl font-bold ${bettingStats.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {bettingStats.roi.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Bets Table */}
              {bettingStats.recentBets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Bets</CardTitle>
                    <CardDescription>Your 5 most recent bets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">Date</th>
                            <th className="text-left py-2 px-2">Amount</th>
                            <th className="text-left py-2 px-2">Odds</th>
                            <th className="text-left py-2 px-2">Type</th>
                            <th className="text-left py-2 px-2">Result</th>
                            <th className="text-right py-2 px-2">Profit/Loss</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bettingStats.recentBets.map((bet, idx) => {
                            const betDate = new Date(bet.created_at).toLocaleDateString();
                            const pnl = bet.result === "win" 
                              ? (bet.amount * (bet.odds - 1))
                              : -(bet.amount);
                            return (
                              <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900">
                                <td className="py-3 px-2">{betDate}</td>
                                <td className="py-3 px-2">KES {bet.amount}</td>
                                <td className="py-3 px-2">{bet.odds.toFixed(2)}</td>
                                <td className="py-3 px-2 capitalize">{bet.bet_type || 'Single'}</td>
                                <td className="py-3 px-2">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    bet.result === "win" 
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                                  }`}>
                                    {bet.result === "win" ? "Won" : "Lost"}
                                  </span>
                                </td>
                                <td className={`py-3 px-2 text-right font-semibold ${
                                  pnl >= 0 ? "text-green-600" : "text-red-600"
                                }`}>
                                  {pnl >= 0 ? '+' : ''}KES {pnl.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {bettingStats.totalBets === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground">No bets placed yet. Start betting to see your statistics!</p>
                    <Button onClick={() => navigate("/")} className="mt-4">Place Your First Bet</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral">
            <div className="space-y-4">
              {/* Referral Code Card */}
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Referral Program
                  </CardTitle>
                  <CardDescription>Earn 10% commission on your friends' winnings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-lg border-2 border-purple-300">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-3 font-medium">Your Unique Referral Code</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-4xl font-mono font-bold text-purple-600 dark:text-purple-400">{referralData.code}</div>
                      <Button
                        size="sm"
                        onClick={copyReferralLink}
                        className={`gap-2 ${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}
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
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Share your code:</strong> {window.location.origin}?ref={referralData.code}
                    </p>
                  </div>

                  <Button onClick={copyReferralLink} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 text-lg">
                    Share Referral Link
                  </Button>
                </CardContent>
              </Card>

              {/* Referral Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Users className="w-8 h-8 mx-auto mb-3 text-purple-600 opacity-50" />
                    <div className="text-3xl font-bold text-purple-600">{referralData.referredCount}</div>
                    <p className="text-xs text-muted-foreground mt-2">Friends Referred</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto mb-3 text-green-600 opacity-50" />
                    <div className="text-3xl font-bold text-green-600">KES {referralData.earnings.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-2">Total Earnings</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <Award className="w-8 h-8 mx-auto mb-3 text-blue-600 opacity-50" />
                    <div className="text-3xl font-bold text-blue-600">{referralData.referredCount > 0 ? (referralData.earnings / referralData.referredCount).toLocaleString() : '0'}</div>
                    <p className="text-xs text-muted-foreground mt-2">Avg Per Friend</p>
                  </CardContent>
                </Card>
              </div>

              {/* How It Works */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How Referrals Work</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <p className="font-semibold">Share Your Code</p>
                      <p className="text-sm text-muted-foreground">Send your referral link to friends</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <p className="font-semibold">Friend Joins</p>
                      <p className="text-sm text-muted-foreground">They sign up using your code</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="font-semibold">They Place Bets</p>
                      <p className="text-sm text-muted-foreground">Your friend starts betting on matches</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <p className="font-semibold">You Earn 10%</p>
                      <p className="text-sm text-muted-foreground">Get 10% of their winning bet profits</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* View Full Dashboard */}
              <Button onClick={() => navigate("/referral")} variant="outline" className="w-full h-12">
                View Full Referral Dashboard
              </Button>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Account Activity
                </CardTitle>
                <CardDescription>Your recent actions and login history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="font-semibold text-sm">Last Login</p>
                      <p className="text-xs text-muted-foreground">{accountStats.lastLogin}</p>
                    </div>
                    <span className="text-2xl font-bold text-green-600">✓</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="font-semibold text-sm">Account Verification</p>
                      <p className="text-xs text-muted-foreground">{profile.verified ? 'Email Verified' : 'Pending Verification'}</p>
                    </div>
                    <span className={`text-xl ${profile.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                      {profile.verified ? '✓' : '○'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="font-semibold text-sm">Account Age</p>
                      <p className="text-xs text-muted-foreground">{accountStats.accountAge} days active</p>
                    </div>
                    <Calendar className="w-5 h-5 text-blue-600 opacity-50" />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="font-semibold text-sm">Total Bets Placed</p>
                      <p className="text-xs text-muted-foreground">{bettingStats.totalBets} bets</p>
                    </div>
                    <Target className="w-5 h-5 text-purple-600 opacity-50" />
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold mb-3">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-auto flex flex-col items-start p-3" onClick={() => navigate("/")}>
                      <span className="font-semibold text-xs">My Bets</span>
                      <span className="text-xs text-muted-foreground">View betting history</span>
                    </Button>
                    <Button variant="outline" className="h-auto flex flex-col items-start p-3" onClick={() => navigate("/referral")}>
                      <span className="font-semibold text-xs">Referrals</span>
                      <span className="text-xs text-muted-foreground">Manage referrals</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Theme Settings */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    Display Settings
                  </CardTitle>
                  <CardDescription>Customize your app appearance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Dark Mode</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Reduce eye strain in low-light</p>
                    </div>
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        darkMode ? "bg-purple-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          darkMode ? "translate-x-7" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Choose what notifications you receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Bet Notifications */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Bet Notifications</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Get alerts for your bets</p>
                    </div>
                    <button
                      onClick={() => toggleNotification("betNotifications")}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        notifications.betNotifications ? "bg-green-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          notifications.betNotifications ? "translate-x-7" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Result Notifications */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Match Results</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Alerts when matches end</p>
                    </div>
                    <button
                      onClick={() => toggleNotification("resultNotifications")}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        notifications.resultNotifications ? "bg-green-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          notifications.resultNotifications ? "translate-x-7" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Weekly Report */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Weekly Report</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Summary of your activity</p>
                    </div>
                    <button
                      onClick={() => toggleNotification("weeklyReport")}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        notifications.weeklyReport ? "bg-green-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          notifications.weeklyReport ? "translate-x-7" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Login Alerts */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Login Alerts</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Security notifications</p>
                    </div>
                    <button
                      onClick={() => toggleNotification("loginAlerts")}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        notifications.loginAlerts ? "bg-green-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          notifications.loginAlerts ? "translate-x-7" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Promotion Emails */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Promotional Emails</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Offers and special deals</p>
                    </div>
                    <button
                      onClick={() => toggleNotification("promotionEmails")}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        notifications.promotionEmails ? "bg-green-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          notifications.promotionEmails ? "translate-x-7" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Save Notifications Button */}
                  <Button onClick={handleSaveNotifications} disabled={loading} className="w-full mt-4">
                    {loading ? "Saving..." : "Save Notification Settings"}
                  </Button>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card className="shadow-lg border-2 border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>Protect your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Change Password Section */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-4">
                    <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Change Password
                    </p>

                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                      <Input
                        type="password"
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                      <div className="relative mt-1">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {error && <div className="text-red-600 text-sm">{error}</div>}
                    {success && <div className="text-green-600 text-sm">{success}</div>}

                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {changingPassword ? "Updating..." : "Update Password"}
                    </Button>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Two-Factor Authentication
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {twoFactorEnabled ? "Enabled" : "Disabled"} - Add extra security
                        </p>
                      </div>
                      <button
                        onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          twoFactorEnabled
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                        }`}
                      >
                        {twoFactorEnabled ? "Enabled" : "Enable"}
                      </button>
                    </div>
                  </div>

                  {/* Reset Password Button */}
                  <Button
                    onClick={() => navigate("/forgot-password")}
                    variant="outline"
                    className="w-full justify-center"
                  >
                    Reset Password via Email
                  </Button>
                </CardContent>
              </Card>

              {/* Account Actions */}
              <Card className="shadow-lg border-2 border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Account Actions</CardTitle>
                  <CardDescription>Manage your account access</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleLogout}
                    className="w-full bg-red-600 hover:bg-red-700 justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout from All Devices
                  </Button>
                  <Button variant="outline" className="w-full justify-center">
                    Download Your Data
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full justify-center"
                  >
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Account;
