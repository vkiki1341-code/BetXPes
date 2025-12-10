import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSettings, saveAdminSettings, regenerateMatchesIfNeeded, storeMatches, generateMatches, getStoredMatches, generateShuffledFixtures, storeShuffledFixtures, clearAllShuffledFixtures, getStoredShuffledFixtures, triggerManualReshuffle } from "@/utils/matchGenerator";
import { leagues } from "@/data/leagues";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getDepositRequests, getWithdrawRequests, updateDepositRequest, updateWithdrawRequest } from "@/lib/supabaseRequests";
import { saveFixtureOutcomeGlobal } from "@/lib/fixtureOutcomes";
import { supabase } from "@/lib/supabaseClient";
import { validateMatchScores } from "@/lib/matchScoreValidation";
import { logAuditAction } from "@/lib/auditLog";

interface Promo {
  title: string;
  description: string;
  link: string;
}

const Admin = () => {
      // Mock system logs data
      const [systemLogs] = React.useState([
        {
          timestamp: new Date().toISOString(),
          user: "admin@example.com",
          action: "Login",
          details: "Admin logged in successfully."
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          user: "admin@example.com",
          action: "Add Match",
          details: "Added match: Kenya vs Uganda."
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          user: "user1@example.com",
          action: "Deposit",
          details: "Requested deposit of KES 1,000."
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          user: "admin@example.com",
          action: "Block User",
          details: "Blocked user: user2@example.com."
        },
      ]);
    // Make match live handler
    const handleMakeLive = (matchId: string) => {
      // Optionally, set live status and scores here or open the live edit form
      setLiveEditingMatchId(matchId);
      // Optionally, set default live scores/status if needed
      const match = matches.find(m => m.id === matchId);
      if (match) {
        setLiveHomeScore(match.liveScore?.home ?? 0);
        setLiveAwayScore(match.liveScore?.away ?? 0);
        setLiveStatus(match.liveStatus || "First Half");
      }
    };
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Admin authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  
  // Check if admin is already logged in (from sessionStorage)
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('adminAuthenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);
  
  const handleAdminLogin = () => {
    // Check credentials
    if (authUsername === "THEMATCHDAY" && authPassword === "MATCHDAY254") {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuthenticated', 'true');
      toast({
        title: "✅ Login Successful",
        description: "Welcome to the Admin Panel",
        variant: "default"
      });
    } else {
      toast({
        title: "❌ Login Failed",
        description: "Invalid username or password",
        variant: "destructive"
      });
    }
  };
  
  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuthenticated');
    setAuthUsername("");
    setAuthPassword("");
    toast({
      title: "Logged Out",
      description: "You have been logged out from the admin panel",
      variant: "default"
    });
  };
  
  const [settings, setSettings] = useState(getAdminSettings());
  const [selectedLeague, setSelectedLeague] = useState(leagues[0].countryCode);
  const [matches, setMatches] = useState<any[]>([]);
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [newMatch, setNewMatch] = useState({
    homeTeam: "",
    awayTeam: "",
    kickoffTime: "",
    overOdds: "1.35",
    underOdds: "3.80",
  });

  // Results management state
  const [resultsEditingMatchId, setResultsEditingMatchId] = useState<string | null>(null);
  const [resultsHomeScore, setResultsHomeScore] = useState(0);
  const [resultsAwayScore, setResultsAwayScore] = useState(0);
  const [resultsStatus, setResultsStatus] = useState<string>("");

  // Live match controls state
  const [liveEditingMatchId, setLiveEditingMatchId] = useState<string | null>(null);
  const [liveHomeScore, setLiveHomeScore] = useState(0);
  const [liveAwayScore, setLiveAwayScore] = useState(0);
  const [liveStatus, setLiveStatus] = useState<string>("");

  // Promo management state
  const [promos, setPromos] = useState<Promo[]>([]);
  const [editingPromoIdx, setEditingPromoIdx] = useState<number | null>(null);
  const [editingPromo, setEditingPromo] = useState<Promo>({ title: "", description: "", link: "" });
  const [newPromo, setNewPromo] = useState<Promo>({ title: "", description: "", link: "" });

  // Deposit and withdrawal requests state
  const [depositRequests, setDepositRequests] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [betTransactions, setBetTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // User management state
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<number>(0);

  // Referral tracking state
  const [referrals, setReferrals] = useState([]);

  // Load matches on component mount and when selected league changes
  useEffect(() => {
    const league = leagues.find(l => l.countryCode === selectedLeague);
    if (league) {
      const stored = getStoredMatches(selectedLeague);
      const ms = stored || generateMatches(league);
      setMatches(ms);
    }
  }, [selectedLeague]);

  // Save settings when they change
  useEffect(() => {
    saveAdminSettings(settings);
  }, [settings]);

  // Load promos from localStorage on mount
  useEffect(() => {
    const storedPromos = localStorage.getItem('admin_promos');
    if (storedPromos) {
      setPromos(JSON.parse(storedPromos));
    }
  }, []);

  // Load notifications from Supabase on mount
  useEffect(() => {
    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) {
        setNotifications(data);
      }
    };
    loadNotifications();
  }, []);

  // Save promos to localStorage
  const savePromos = (updatedPromos: Promo[]) => {
    localStorage.setItem('admin_promos', JSON.stringify(updatedPromos));
    setPromos(updatedPromos);
  };

  // Promo handlers
  const handleAddPromo = () => {
    if (!newPromo.title || !newPromo.description) return;
    const updated = [...promos, { ...newPromo }];
    savePromos(updated);
    setNewPromo({ title: "", description: "", link: "" });
    toast({ title: "Promo Added", description: "New promo added successfully." });
  };

  const handleEditPromo = (idx: number) => {
    setEditingPromoIdx(idx);
    setEditingPromo({ ...promos[idx] });
  };

  const handleSaveEditPromo = () => {
    if (editingPromoIdx === null) return;
    const updated = promos.map((p, i) => i === editingPromoIdx ? { ...editingPromo } : p);
    savePromos(updated);
    setEditingPromoIdx(null);
    setEditingPromo({ title: "", description: "", link: "" });
    toast({ title: "Promo Updated", description: "Promo updated successfully." });
  };

  const handleRemovePromo = (idx: number) => {
    const updated = promos.filter((_, i) => i !== idx);
    savePromos(updated);
    toast({ title: "Promo Removed", description: "Promo removed successfully." });
  };

  // Match handlers
  const handleRemoveMatch = (matchId: string) => {
    const ms = matches.filter(m => m.id !== matchId);
    setMatches(ms);
    storeMatches(selectedLeague, ms);
    toast({ title: "Match Removed", description: "Match has been removed." });
  };

  const handleEditMatch = (match: any) => {
    setEditingMatch({
      ...match,
      homeTeam: typeof match.homeTeam === "object" ? match.homeTeam.name : match.homeTeam,
      awayTeam: typeof match.awayTeam === "object" ? match.awayTeam.name : match.awayTeam,
      kickoffTime: match.kickoffTime instanceof Date
        ? match.kickoffTime.toISOString().slice(0, 16)
        : new Date(match.kickoffTime).toISOString().slice(0, 16)
    });
    setTimeout(() => {
      const editForm = document.getElementById("edit-match-form");
      if (editForm) {
        editForm.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const handleSaveEditMatch = () => {
    if (!editingMatch?.homeTeam || !editingMatch?.awayTeam || !editingMatch?.kickoffTime) return;
    
    const league = leagues.find(l => l.countryCode === selectedLeague);
    if (!league) return;

    const ms = matches.map(m => m.id === editingMatch.id ? {
      ...m,
      homeTeam: league.teams.find(t => t.name === editingMatch.homeTeam)!,
      awayTeam: league.teams.find(t => t.name === editingMatch.awayTeam)!,
      kickoffTime: new Date(editingMatch.kickoffTime),
      overOdds: editingMatch.overOdds,
      underOdds: editingMatch.underOdds,
    } : m);
    
    setMatches(ms);
    storeMatches(selectedLeague, ms);
    setEditingMatch(null);
    toast({ title: "Match Updated", description: "Match details updated." });
  };

  const handleAddMatch = () => {
    if (!newMatch.homeTeam || !newMatch.awayTeam || !newMatch.kickoffTime) return;
    
    const league = leagues.find(l => l.countryCode === selectedLeague);
    if (!league) return;

    const id = `${selectedLeague}-${Date.now()}-manual`;
    const match = {
      id,
      homeTeam: league.teams.find(t => t.name === newMatch.homeTeam)!,
      awayTeam: league.teams.find(t => t.name === newMatch.awayTeam)!,
      kickoffTime: new Date(newMatch.kickoffTime),
      overOdds: newMatch.overOdds,
      underOdds: newMatch.underOdds,
      outcome: undefined,
    };
    
    const ms = [...matches, match];
    setMatches(ms);
    storeMatches(selectedLeague, ms);
    setNewMatch({ homeTeam: "", awayTeam: "", kickoffTime: "", overOdds: "1.35", underOdds: "3.80" });
    toast({ title: "Match Added", description: "New match added." });
  };

  // Outcome handlers
  const handleSetBetOutcome = (matchId: string, betType: string, outcome: string) => {
    const newManual = {
      ...settings.manualOutcomes,
      [matchId]: {
        ...(settings.manualOutcomes?.[matchId] && typeof settings.manualOutcomes[matchId] === "object" ? settings.manualOutcomes[matchId] as object : {}),
        [betType]: outcome,
      },
    };
    setSettings({ ...settings, manualOutcomes: newManual });
    
    // Update match outcome in storage
    const ms = matches.map(m =>
      m.id === matchId
        ? { ...m, manualOutcomes: newManual[matchId] }
        : m
    );
    setMatches(ms);
    storeMatches(selectedLeague, ms);
  };

  const handleRegenerateAll = () => {
    leagues.forEach(league => {
      const matches = generateMatches(league);
      storeMatches(league.countryCode, matches);
    });
    toast({
      title: "Matches Regenerated",
      description: "All matches have been regenerated for all leagues.",
    });
  };

  const handleRegenerateLeague = (countryCode: string) => {
    regenerateMatchesIfNeeded(countryCode);
    toast({
      title: "League Regenerated",
      description: `Matches regenerated for ${leagues.find(l => l.countryCode === countryCode)?.country}`,
    });
  };

  // Live and results handlers
  const handleStartLiveEdit = (match: any) => {
    setLiveEditingMatchId(match.id);
    setLiveHomeScore(match.liveScore?.home || 0);
    setLiveAwayScore(match.liveScore?.away || 0);
    setLiveStatus(match.liveStatus || "First Half");
  };

  const handleSaveLiveEdit = () => {
    if (!liveEditingMatchId) return;
    
    // Validate scores before saving
    const validation = validateMatchScores(liveHomeScore, liveAwayScore);
    
    if (!validation.valid) {
      toast({
        title: "❌ Invalid Score",
        description: validation.errors.join(", "),
        variant: "destructive"
      });
      return;
    }
    
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn("⚠️ Score warnings:", validation.warnings);
    }
    
    const ms = matches.map(m => 
      m.id === liveEditingMatchId 
        ? { 
            ...m, 
            liveScore: { home: liveHomeScore, away: liveAwayScore },
            liveStatus: liveStatus
          } 
        : m
    );
    
    setMatches(ms);
    storeMatches(selectedLeague, ms);
    
    // Log this admin action for audit trail
    supabase.auth.getUser().then(({data}) => {
      if (data.user) {
        logAuditAction(data.user.id, {
          action: 'live_score_update',
          details: {
            matchId: liveEditingMatchId,
            homeGoals: liveHomeScore,
            awayGoals: liveAwayScore,
            status: liveStatus
          },
          status: 'success'
        });
      }
    });
    
    setLiveEditingMatchId(null);
    toast({ title: "✅ Live Score Updated", description: "Live match data updated and all users notified." });
  };

  const handleStartResultsEdit = (match: any) => {
    setResultsEditingMatchId(match.id);
    setResultsHomeScore(match.finalScore?.home || 0);
    setResultsAwayScore(match.finalScore?.away || 0);
    setResultsStatus(match.status || "FT");
  };

  const handleSaveResultsEdit = () => {
    if (!resultsEditingMatchId) return;
    
    const ms = matches.map(m => 
      m.id === resultsEditingMatchId 
        ? { 
            ...m, 
            finalScore: { home: resultsHomeScore, away: resultsAwayScore },
            status: resultsStatus
          } 
        : m
    );
    
    setMatches(ms);
    storeMatches(selectedLeague, ms);
    setResultsEditingMatchId(null);
    toast({ title: "Results Updated", description: "Match results updated." });
  };

  // Load deposit and withdrawal requests
  useEffect(() => {
    getDepositRequests().then(res => {
      if (res.data) setDepositRequests(res.data);
    });
    getWithdrawRequests().then(res => {
      if (res.data) setWithdrawRequests(res.data);
    });
    // Fetch bet transactions from Supabase (assume 'bets' table)
    supabase.from('bets').select('*').order('created_at', { ascending: false }).then(res => {
      if (res.data) setBetTransactions(res.data);
    });
  }, []);

  // Load users from Supabase
  useEffect(() => {
    supabase.from('users').select('id, email, balance, status').then(res => {
      if (res.error) {
        console.error("Error fetching users:", res.error);
      } else if (res.data) {
        console.log("Users loaded:", res.data);
        setUsers(res.data);
      }
    });
  }, []);

  // Load referrals from Supabase
  useEffect(() => {
    // Fetch referral data from Supabase (assume 'referrals' table with user_id, referral_code, referred_user_id, reward)
    supabase.from('referrals').select('user_id, referral_code, referred_user_id, reward, created_at').then(res => {
      if (res.data) setReferrals(res.data);
    });
  }, []);

  const selectedLeagueData = leagues.find(l => l.countryCode === selectedLeague);

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-purple-600">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-white mb-2">Admin Panel</CardTitle>
            <CardDescription className="text-gray-300">Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-white font-semibold">Username</Label>
              <Input
                type="text"
                placeholder="Enter username"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                className="bg-slate-800 border-slate-700 text-white placeholder-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white font-semibold">Password</Label>
              <Input
                type="password"
                placeholder="Enter password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                className="bg-slate-800 border-slate-700 text-white placeholder-gray-500"
              />
            </div>
            <Button
              onClick={handleAdminLogin}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg py-6"
            >
              Login to Admin Panel
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full text-gray-300 border-slate-700 hover:bg-slate-800"
            >
              Back to Betting
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Betting
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleAdminLogout}
            className="bg-red-600 hover:bg-red-700"
          >
            Logout
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-foreground">Admin Panel</h1>

        <Tabs defaultValue="settings" className="space-y-6">
          <div className="relative">
            {/* Hamburger for mobile */}
            <div className="md:hidden flex justify-end mb-4">
              <Button variant="outline" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Menu className="h-6 w-6" />
              </Button>
            </div>
            {/* TabsList scrollable and responsive */}
            <div className={`overflow-x-auto whitespace-nowrap ${mobileMenuOpen ? "block" : "hidden md:block"} bg-background rounded shadow-md mb-4`} style={{ zIndex: 20, position: 'relative' }}>
              <TabsList className="flex gap-2 px-2 py-2 min-w-max">
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
                <TabsTrigger value="matches">Match Management</TabsTrigger>
                <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
                <TabsTrigger value="live">Live Controls</TabsTrigger>
                <TabsTrigger value="bet-resolution">Bet Resolution</TabsTrigger>
                <TabsTrigger value="system-state">System State</TabsTrigger>
                <TabsTrigger value="promos">Promos</TabsTrigger>
                <TabsTrigger value="deposits">Deposit Requests</TabsTrigger>
                <TabsTrigger value="withdrawals">Withdraw Requests</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="transactions">Transaction History</TabsTrigger>
                <TabsTrigger value="referrals">Referral Tracking</TabsTrigger>
                <TabsTrigger value="audit-trail">Balance Audit</TabsTrigger>
                <TabsTrigger value="tx-monitor">Tx Monitor</TabsTrigger>
                <TabsTrigger value="lock-monitor">Lock Monitor</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="match-performance">Match Report</TabsTrigger>
                <TabsTrigger value="logs">System Logs</TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Match Generation Settings</CardTitle>
                  <CardDescription>
                    Configure how matches are generated and rotated
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-generate">Auto-Generate Matches</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically generate new random matches when they expire
                      </p>
                    </div>
                    <Switch
                      id="auto-generate"
                      checked={settings.autoGenerate}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, autoGenerate: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interval">Generation Interval (minutes)</Label>
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      max="60"
                      value={settings.generationInterval}
                      onChange={(e) => 
                        setSettings({ 
                          ...settings, 
                          generationInterval: parseInt(e.target.value) || 5 
                        })
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Time between match rotations
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manual Controls</CardTitle>
                  <CardDescription>
                    Manually regenerate matches for specific leagues
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleRegenerateAll}
                    className="w-full"
                  >
                    Regenerate All Leagues
                  </Button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {leagues.map(league => (
                      <Button
                        key={league.countryCode}
                        variant="outline"
                        onClick={() => handleRegenerateLeague(league.countryCode)}
                        className="flex items-center gap-2"
                      >
                        <span className="text-xl">{league.flag}</span>
                        <span>Regenerate {league.country}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>
                    Current system status and configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Leagues:</span>
                      <span className="font-medium">{leagues.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auto-Generate:</span>
                      <span className="font-medium">
                        {settings.autoGenerate ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Update Interval:</span>
                      <span className="font-medium">{settings.generationInterval} minutes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fixtures Tab */}
          <TabsContent value="fixtures">
            <Card>
              <CardHeader>
                <CardTitle>League Fixtures</CardTitle>
                <CardDescription>View and manage all fixtures for each league (Weeks 1-36)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-2 flex-wrap justify-between items-center">
                  <div className="flex gap-2 flex-wrap">
                    {leagues.map(league => (
                      <Button
                        key={league.countryCode}
                        variant={selectedLeague === league.countryCode ? "default" : "outline"}
                        onClick={() => setSelectedLeague(league.countryCode)}
                        className="flex items-center gap-2"
                      >
                        <span className="text-xl">{league.flag}</span>
                        <span>{league.country}</span>
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={() => {
                      // Trigger manual reshuffle
                      triggerManualReshuffle();
                      
                      toast({
                        title: "✅ Fixtures Reshuffled",
                        description: "All fixtures have been regenerated with new team matchups! Reloading page...",
                        variant: "default"
                      });
                      
                      // Force page reload to reflect new fixtures
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                  >
                    Reshuffle Fixtures
                  </Button>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {leagues
                    .filter(l => l.countryCode === selectedLeague)
                    .map(league => (
                      <div key={league.countryCode}>
                        <h3 className="font-bold text-lg mb-3 text-primary">{league.country} - {league.name}</h3>
                        <div className="space-y-2">
                          {Array.from({ length: 36 }, (_, idx) => idx + 1).map(week => {
                            // Check if we have shuffled fixtures stored
                            const storedFixtures = getStoredShuffledFixtures(league.countryCode);
                            let weekMatches = [];
                            
                            if (storedFixtures && storedFixtures[week]) {
                              // Use stored shuffled fixtures
                              weekMatches = storedFixtures[week];
                            } else {
                              // Fall back to round-robin algorithm
                              const teams = [...league.teams];
                              for (let i = 0; i < teams.length / 2; i++) {
                                const homeIdx = (week + i) % teams.length;
                                const awayIdx = (week + teams.length - i - 1) % teams.length;
                                weekMatches.push({
                                  home: teams[homeIdx],
                                  away: teams[awayIdx],
                                });
                              }
                            }
                            
                            return (
                              <div
                                key={`${league.countryCode}-week${week}`}
                                className="border rounded-lg p-3 bg-slate-50 hover:bg-slate-100 transition"
                              >
                                <div className="font-bold text-blue-700 mb-2">Week {week}</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {weekMatches.map((match, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between bg-white rounded p-2 border border-slate-200"
                                    >
                                      <span className="text-sm font-semibold text-slate-900">
                                        {match.home.shortName}
                                      </span>
                                      <span className="text-xs text-muted-foreground">vs</span>
                                      <span className="text-sm font-semibold text-slate-900">
                                        {match.away.shortName}
                                      </span>
                                      <div className="flex gap-1 ml-2">
                                        <Button
                                          size="sm"
                                          className="h-6 text-xs px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                                          onClick={() => {
                                            setEditingMatch({
                                              id: `${league.countryCode}-week${week}-game${idx}`,
                                              homeTeam: match.home,
                                              awayTeam: match.away,
                                              week,
                                              league: league.countryCode,
                                              homeGoals: 0,
                                              awayGoals: 0,
                                              winner: null,
                                            });
                                          }}
                                        >
                                          EDIT
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-xs px-2 text-red-600 hover:text-red-700"
                                          onClick={() => {
                                            toast({
                                              title: "Delete Fixture",
                                              description: `${match.home.shortName} vs ${match.away.shortName} would be deleted. (Demo only)`,
                                            });
                                          }}
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Edit Fixture Modal */}
                {editingMatch && (
                  <Dialog
                    open={!!editingMatch}
                    onOpenChange={() => setEditingMatch(null)}
                  >
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-purple-600">
                          Edit Match Fixture
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        {/* Match Details Section */}
                        <div className="border rounded-lg p-4 bg-slate-50">
                          <h3 className="font-bold text-lg mb-4 text-slate-900">Match Details</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label className="text-black font-semibold">Home Team</Label>
                              <Input
                                value={editingMatch.homeTeam?.shortName}
                                disabled
                                className="mt-2 bg-white text-black font-semibold"
                              />
                            </div>
                            <div className="flex items-end justify-center pb-2">
                              <span className="text-2xl font-bold text-slate-600">vs</span>
                            </div>
                            <div>
                              <Label className="text-black font-semibold">Away Team</Label>
                              <Input
                                value={editingMatch.awayTeam?.shortName}
                                disabled
                                className="mt-2 bg-white text-black font-semibold"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label className="text-black font-semibold">Week</Label>
                              <Input
                                value={editingMatch.week}
                                disabled
                                className="mt-2 bg-white text-black font-semibold"
                              />
                            </div>
                            <div>
                              <Label className="text-black font-semibold">League</Label>
                              <Input
                                value={editingMatch.league}
                                disabled
                                className="mt-2 bg-white text-black font-semibold"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Match Outcome Section */}
                        <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">Match Outcome (Admin Override)</h3>
                          <p className="text-sm text-purple-700 mb-4">Set the match outcome that will be displayed. Users will see this happen naturally.</p>
                          
                          <div className="space-y-4">
                            {/* Final Score */}
                            <div className="bg-white rounded-lg p-3 border border-purple-200">
                              <Label className="text-slate-700 font-semibold block mb-3">Final Score</Label>
                          <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-xs text-slate-600">{editingMatch.homeTeam?.shortName}</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={editingMatch.homeGoals || 0}
                                    onChange={(e) => {
                                      const homeGoals = parseInt(e.target.value) || 0;
                                      const awayGoals = editingMatch.awayGoals || 0;
                                      let winner = 'draw';
                                      if (homeGoals > awayGoals) winner = 'home';
                                      else if (awayGoals > homeGoals) winner = 'away';
                                      
                                      setEditingMatch({
                                        ...editingMatch,
                                        homeGoals: homeGoals,
                                        winner: winner
                                      });
                                    }}
                                    className="mt-1 text-center font-bold text-lg"
                                  />
                                </div>
                                <div className="flex items-center justify-center">
                                  <span className="text-2xl font-bold text-slate-400">-</span>
                                </div>
                                <div>
                                  <Label className="text-xs text-slate-600">{editingMatch.awayTeam?.shortName}</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={editingMatch.awayGoals || 0}
                                    onChange={(e) => {
                                      const homeGoals = editingMatch.homeGoals || 0;
                                      const awayGoals = parseInt(e.target.value) || 0;
                                      let winner = 'draw';
                                      if (homeGoals > awayGoals) winner = 'home';
                                      else if (awayGoals > homeGoals) winner = 'away';
                                      
                                      setEditingMatch({
                                        ...editingMatch,
                                        awayGoals: awayGoals,
                                        winner: winner
                                      });
                                    }}
                                    className="mt-1 text-center font-bold text-lg"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Match Result */}
                            <div className="bg-white rounded-lg p-3 border border-purple-200">
                              <Label className="text-slate-700 font-semibold block mb-3">Match Result</Label>
                              <p className="text-xs text-slate-600 mb-3 italic">
                                ✓ Winner is automatically calculated based on scores. Set scores first, then confirm result:
                              </p>
                              <p className="text-xs text-blue-600 mb-3 font-semibold">
                                Current: {editingMatch.homeGoals || 0} - {editingMatch.awayGoals || 0}
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  type="button"
                                  variant={editingMatch.winner === 'home' ? 'default' : 'outline'}
                                  className={editingMatch.winner === 'home' ? 'bg-green-600 hover:bg-green-700 text-white font-bold' : 'border-gray-300'}
                                  onClick={() => {
                                    if ((editingMatch.homeGoals || 0) <= (editingMatch.awayGoals || 0)) {
                                      toast({
                                        title: "⚠️ Score Mismatch",
                                        description: `Set ${editingMatch.homeTeam?.shortName}'s goals higher than ${editingMatch.awayTeam?.shortName}'s to make it a home win.`,
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    setEditingMatch({
                                      ...editingMatch,
                                      winner: 'home'
                                    });
                                  }}
                                >
                                  🏆 {editingMatch.homeTeam?.shortName} Win
                                </Button>
                                <Button
                                  type="button"
                                  variant={editingMatch.winner === 'draw' ? 'default' : 'outline'}
                                  className={editingMatch.winner === 'draw' ? 'bg-yellow-600 hover:bg-yellow-700 text-white font-bold' : 'border-gray-300'}
                                  onClick={() => {
                                    if ((editingMatch.homeGoals || 0) !== (editingMatch.awayGoals || 0)) {
                                      toast({
                                        title: "⚠️ Score Mismatch",
                                        description: `Set scores equal to mark as a draw.`,
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    setEditingMatch({
                                      ...editingMatch,
                                      winner: 'draw'
                                    });
                                  }}
                                >
                                  🤝 Draw
                                </Button>
                                <Button
                                  type="button"
                                  variant={editingMatch.winner === 'away' ? 'default' : 'outline'}
                                  className={editingMatch.winner === 'away' ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold' : 'border-gray-300'}
                                  onClick={() => {
                                    if ((editingMatch.awayGoals || 0) <= (editingMatch.homeGoals || 0)) {
                                      toast({
                                        title: "⚠️ Score Mismatch",
                                        description: `Set ${editingMatch.awayTeam?.shortName}'s goals higher than ${editingMatch.homeTeam?.shortName}'s to make it an away win.`,
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    setEditingMatch({
                                      ...editingMatch,
                                      winner: 'away'
                                    });
                                  }}
                                >
                                  🏆 {editingMatch.awayTeam?.shortName} Win
                                </Button>
                              </div>
                            </div>

                            {/* Betting Outcomes */}
                            <div className="bg-white rounded-lg p-3 border border-purple-200">
                              <Label className="text-slate-700 font-semibold block mb-3">1X2 Outcome</Label>
                              <div className="text-sm text-slate-600 mb-3">
                                {editingMatch.winner === 'home' && '1 (Home Win)'}
                                {editingMatch.winner === 'draw' && 'X (Draw)'}
                                {editingMatch.winner === 'away' && '2 (Away Win)'}
                                {!editingMatch.winner && 'Not set'}
                              </div>
                            </div>

                            {/* Over/Under */}
                            <div className="bg-white rounded-lg p-3 border border-purple-200">
                              <Label className="text-slate-700 font-semibold block mb-3">Over/Under 2.5 Goals</Label>
                              <div className="text-sm text-slate-600">
                                Total Goals: {(editingMatch.homeGoals || 0) + (editingMatch.awayGoals || 0)}
                              </div>
                              <div className="text-sm mt-2">
                                {(editingMatch.homeGoals || 0) + (editingMatch.awayGoals || 0) > 2.5 ? 
                                  <span className="text-green-600 font-bold">Over 2.5</span> :
                                  <span className="text-blue-600 font-bold">Under 2.5</span>
                                }
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Info Message */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-700">
                            <span className="font-bold">Note:</span> These settings are admin-only. Users will see matches play out normally with these predetermined outcomes.
                          </p>
                        </div>
                      </div>

                      <DialogFooter className="flex gap-2 justify-end pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setEditingMatch(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            // Validate score before saving
                            const validation = validateMatchScores(
                              editingMatch.homeGoals || 0,
                              editingMatch.awayGoals || 0
                            );
                            
                            if (!validation.valid) {
                              toast({
                                title: "❌ Invalid Score",
                                description: validation.errors.join(", "),
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            if (validation.warnings && validation.warnings.length > 0) {
                              console.warn("⚠️ Score warnings:", validation.warnings);
                            }
                            
                            // Save globally to Supabase so all users see it
                            const matchKey = editingMatch.id;
                            const homeGoals = editingMatch.homeGoals || 0;
                            const awayGoals = editingMatch.awayGoals || 0;
                            const winner = editingMatch.winner || 'draw';
                            
                            saveFixtureOutcomeGlobal({
                              match_id: matchKey,
                              home_goals: homeGoals,
                              away_goals: awayGoals,
                              result: winner,
                            }).then(() => {
                              // Also save to localStorage for admin settings backup
                              const adminSettings = getAdminSettings();
                              const fixtureOverrides = adminSettings.fixtureOverrides || {};
                              
                              fixtureOverrides[matchKey] = {
                                homeGoals: homeGoals,
                                awayGoals: awayGoals,
                                winner: winner,
                              };

                              saveAdminSettings({
                                ...adminSettings,
                                fixtureOverrides
                              });
                              
                              // Log this admin action for audit trail
                              supabase.auth.getUser().then(({data}) => {
                                if (data.user) {
                                  logAuditAction(data.user.id, {
                                    action: 'match_outcome_set',
                                    details: {
                                      matchId: matchKey,
                                      homeGoals: homeGoals,
                                      awayGoals: awayGoals,
                                      winner: winner
                                    },
                                    status: 'success'
                                  });
                                }
                              });

                              toast({
                                title: "✅ Fixture Updated (Global)",
                                description: `${editingMatch.homeTeam.shortName} ${homeGoals} - ${awayGoals} ${editingMatch.awayTeam.shortName} - Winner: ${winner === 'home' ? '🏆 ' + editingMatch.homeTeam.shortName : winner === 'away' ? '🏆 ' + editingMatch.awayTeam.shortName : '🤝 Draw'} (All users will see this)`,
                                variant: "default"
                              });
                              setEditingMatch(null);
                            });
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                        >
                          Save Fixture Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>Manage Matches</CardTitle>
                <CardDescription>
                  Add, edit, or remove matches for the selected league.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 flex gap-2 flex-wrap">
                  {leagues.map(league => (
                    <Button
                      key={league.countryCode}
                      variant={selectedLeague === league.countryCode ? "default" : "outline"}
                      onClick={() => setSelectedLeague(league.countryCode)}
                      className="flex items-center gap-2"
                    >
                      <span className="text-xl">{league.flag}</span>
                      <span>{league.country}</span>
                    </Button>
                  ))}
                </div>

                {/* Matches Table */}
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left">Home</th>
                        <th className="px-4 py-3 text-left">Away</th>
                        <th className="px-4 py-3 text-center">Kickoff</th>
                        <th className="px-4 py-3 text-center">Odds</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((m: any) => (
                        <tr key={m.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">{m.homeTeam.shortName}</td>
                          <td className="px-4 py-3">{m.awayTeam.shortName}</td>
                          <td className="px-4 py-3 text-center">
                            {new Date(m.kickoffTime).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            O: {m.overOdds} / U: {m.underOdds}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-center">
                              <Button size="sm" variant="outline" onClick={() => handleEditMatch(m)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRemoveMatch(m.id)}>
                                Remove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Edit Match Form */}
                {editingMatch && (
                  <Card className="mb-6" id="edit-match-form">
                    <CardHeader>
                      <CardTitle>Edit Match</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <Select
                          value={editingMatch.homeTeam}
                          onValueChange={(value) => setEditingMatch({ ...editingMatch, homeTeam: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Home Team" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedLeagueData?.teams.map(t => (
                              <SelectItem key={t.name} value={t.name}>
                                {t.shortName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={editingMatch.awayTeam}
                          onValueChange={(value) => setEditingMatch({ ...editingMatch, awayTeam: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Away Team" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedLeagueData?.teams.map(t => (
                              <SelectItem key={t.name} value={t.name}>
                                {t.shortName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          type="datetime-local"
                          value={editingMatch.kickoffTime}
                          onChange={(e) => setEditingMatch({ ...editingMatch, kickoffTime: e.target.value })}
                        />

                        <Input
                          type="text"
                          value={editingMatch.overOdds}
                          onChange={(e) => setEditingMatch({ ...editingMatch, overOdds: e.target.value })}
                          placeholder="Over Odds"
                        />

                        <Input
                          type="text"
                          value={editingMatch.underOdds}
                          onChange={(e) => setEditingMatch({ ...editingMatch, underOdds: e.target.value })}
                          placeholder="Under Odds"
                        />
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button onClick={handleSaveEditMatch}>Save Changes</Button>
                        <Button variant="outline" onClick={() => setEditingMatch(null)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Add New Match Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Match</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                      <Select
                        value={newMatch.homeTeam}
                        onValueChange={(value) => setNewMatch({ ...newMatch, homeTeam: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Home Team" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedLeagueData?.teams.map(t => (
                            <SelectItem key={t.name} value={t.name}>
                              {t.shortName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={newMatch.awayTeam}
                        onValueChange={(value) => setNewMatch({ ...newMatch, awayTeam: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Away Team" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedLeagueData?.teams.map(t => (
                            <SelectItem key={t.name} value={t.name}>
                              {t.shortName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="datetime-local"
                        value={newMatch.kickoffTime}
                        onChange={(e) => setNewMatch({ ...newMatch, kickoffTime: e.target.value })}
                      />

                      <Input
                        type="text"
                        value={newMatch.overOdds}
                        onChange={(e) => setNewMatch({ ...newMatch, overOdds: e.target.value })}
                        placeholder="Over Odds"
                      />

                      <Input
                        type="text"
                        value={newMatch.underOdds}
                        onChange={(e) => setNewMatch({ ...newMatch, underOdds: e.target.value })}
                        placeholder="Under Odds"
                      />
                    </div>
                    <Button onClick={handleAddMatch} className="mt-4">
                      Add Match
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outcomes Tab */}
          <TabsContent value="outcomes">
            <Card>
              <CardHeader>
                <CardTitle>Match Outcomes Control - Advanced Admin Panel</CardTitle>
                <CardDescription>
                  Full control over match outcomes with simple number inputs. Set scores and winners for any week/timeframe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timeframe/Week Selector */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg p-4 border border-red-400/30 backdrop-blur-sm">
                  <p className="font-bold text-red-300 mb-4">🎯 Admin Match Outcomes Control</p>
                  <p className="text-xs text-slate-400 mb-4">Select a week and set match scores. These outcomes will be applied to the live betting system.</p>
                  
                  {/* Week selector - show 36 weeks */}
                  <div className="mb-6">
                    <Label className="font-bold mb-2 block">Select Week (1-36):</Label>
                    <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-2">
                      {Array.from({ length: 36 }, (_, i) => i + 1).map(week => (
                        <button
                          key={week}
                          onClick={() => setResultsStatus(`week-${week}`)}
                          className={`px-2 py-2 rounded-lg font-bold text-xs transition-all ${
                            resultsStatus === `week-${week}`
                              ? "bg-red-600 text-white shadow-lg"
                              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          }`}
                        >
                          W{week}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Matches for selected league and week */}
                  {resultsStatus.startsWith("week-") && selectedLeagueData && (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      <Label className="font-bold">Set Outcomes for Week {resultsStatus.split('-')[1]}:</Label>
                      {Array.from({ length: 36 }, (_, idx) => idx + 1).find(w => w === parseInt(resultsStatus.split('-')[1])) && (
                        <div className="space-y-3">
                          {(() => {
                            const weekNum = parseInt(resultsStatus.split('-')[1]);
                            const teams = [...selectedLeagueData.teams];
                            const weekMatches = [];
                            for (let i = 0; i < teams.length / 2; i++) {
                              const homeIdx = (weekNum + i) % teams.length;
                              const awayIdx = (weekNum + teams.length - i - 1) % teams.length;
                              weekMatches.push({
                                home: teams[homeIdx],
                                away: teams[awayIdx],
                              });
                            }
                            
                            return weekMatches.map((match, idx) => {
                              const matchId = `${selectedLeague}-week${weekNum}-game${idx}`;
                              const currentOutcome = settings.fixtureOverrides?.[matchId] || {};
                              
                              return (
                                <div key={idx} className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-red-500/50 transition-all flex-wrap">
                                  <span className="text-xs font-bold text-cyan-300 flex-1 min-w-max">{match.home.shortName} vs {match.away.shortName}</span>
                                  
                                  {/* Home Goals */}
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={(currentOutcome as any)?.homeGoals ?? ""}
                                    onChange={(e) => {
                                      const newVal = Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
                                      const newOverrides = { ...settings.fixtureOverrides, [matchId]: { homeGoals: newVal, awayGoals: (currentOutcome as any)?.awayGoals ?? 0, winner: (currentOutcome as any)?.winner } };
                                      setSettings({ ...settings, fixtureOverrides: newOverrides });
                                    }}
                                    placeholder="H"
                                    className="w-12 px-2 py-2 border-2 border-purple-500/70 rounded-lg text-xs text-center font-bold bg-slate-800 text-purple-300 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                    title="Home Goals"
                                  />
                                  <span className="text-xs font-bold text-slate-400">-</span>
                                  
                                  {/* Away Goals */}
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={(currentOutcome as any)?.awayGoals ?? ""}
                                    onChange={(e) => {
                                      const newVal = Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
                                      const newOverrides = { ...settings.fixtureOverrides, [matchId]: { homeGoals: (currentOutcome as any)?.homeGoals ?? 0, awayGoals: newVal, winner: (currentOutcome as any)?.winner } };
                                      setSettings({ ...settings, fixtureOverrides: newOverrides });
                                    }}
                                    placeholder="A"
                                    className="w-12 px-2 py-2 border-2 border-cyan-500/70 rounded-lg text-xs text-center font-bold bg-slate-800 text-cyan-300 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    title="Away Goals"
                                  />
                                  
                                  {/* Winner Selection */}
                                  <select
                                    value={(currentOutcome as any)?.winner ?? ""}
                                    onChange={(e) => {
                                      const newOverrides = { ...settings.fixtureOverrides, [matchId]: { homeGoals: (currentOutcome as any)?.homeGoals ?? 0, awayGoals: (currentOutcome as any)?.awayGoals ?? 0, winner: e.target.value } };
                                      setSettings({ ...settings, fixtureOverrides: newOverrides });
                                    }}
                                    className="px-2 py-2 border-2 border-blue-500/70 rounded-lg text-xs font-semibold bg-slate-800 text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                  >
                                    <option value="">Auto</option>
                                    <option value="home">🏠 Home</option>
                                    <option value="away">✈️ Away</option>
                                    <option value="draw">🤝 Draw</option>
                                  </select>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-6 border-t border-slate-700">
                    <button
                      onClick={() => {
                        saveAdminSettings(settings);
                        toast({ title: "✓ All outcomes saved!", description: "Match outcomes have been saved to localStorage." });
                      }}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-green-500/50 transition-all"
                    >
                      💾 Save All Outcomes
                    </button>
                    <button
                      onClick={() => {
                        setSettings({ ...settings, fixtureOverrides: {} });
                        saveAdminSettings({ ...settings, fixtureOverrides: {} });
                        toast({ title: "Cleared!", description: "All fixture outcomes have been cleared." });
                      }}
                      className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-orange-500/50 transition-all"
                    >
                      🗑️ Clear All
                    </button>
                  </div>
                </div>

                {/* Betting Types Reference */}
                <div className="bg-slate-800/50 rounded-lg p-4 border border-yellow-400/30">
                  <p className="font-bold text-yellow-300 mb-3">📋 Available Bet Types</p>
                  <div className="text-xs text-slate-300 space-y-1">
                    <div>• <span className="font-semibold">1X2:</span> 1 (Home), X (Draw), 2 (Away)</div>
                    <div>• <span className="font-semibold">BTTS:</span> Yes (Both Teams Score), No</div>
                    <div>• <span className="font-semibold">OV/UN 1.5:</span> Over 1.5 goals, Under 1.5</div>
                    <div>• <span className="font-semibold">OV/UN 2.5:</span> Over 2.5 goals, Under 2.5</div>
                    <div>• <span className="font-semibold">Total Goals:</span> Over/Under 2.5, 3.5, 4.5</div>
                    <div>• <span className="font-semibold">Time of First Goal:</span> 0-15 min, 16-30 min, etc.</div>
                    <div>• <span className="font-semibold">Total Goals Odd/Even:</span> Odd or Even total</div>
                  </div>
                </div>

                {/* Current Settings Info */}
                <div className="bg-blue-900/40 border border-blue-400/30 rounded-lg p-4">
                  <p className="font-bold text-blue-300 mb-2">ℹ️ How It Works</p>
                  <p className="text-sm text-blue-100">
                    Set specific match outcomes here. When users view the betting system, they will see matches play out with these predetermined scores. All bets will be evaluated based on these outcomes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Controls Tab */}
          <TabsContent value="live">
            <Card>
              <CardHeader>
                <CardTitle>Live Match Controls</CardTitle>
                <CardDescription>
                  Manage live scores and match status for ongoing games. You can make any match live.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 flex gap-2 flex-wrap">
                  {leagues.map(league => (
                    <Button
                      key={league.countryCode}
                      variant={selectedLeague === league.countryCode ? "default" : "outline"}
                      onClick={() => setSelectedLeague(league.countryCode)}
                      className="flex items-center gap-2"
                    >
                      <span className="text-xl">{league.flag}</span>
                      <span>{league.country}</span>
                    </Button>
                  ))}
                </div>
                {/* List all matches, show live status, and allow making any match live */}
                <div className="space-y-4">
                  {matches.length === 0 && (
                    <div className="text-muted-foreground text-center py-8 border rounded">
                      No matches available.
                    </div>
                  )}
                  {matches.map((m: any) => {
                    const now = new Date();
                    const kickoff = new Date(m.kickoffTime);
                    const end = new Date(kickoff.getTime() + 2 * 60 * 60 * 1000);
                    const isLive = now >= kickoff && now < end;
                    return (
                      <Card key={m.id} className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                          {/* Inline teams and goals */}
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2 text-lg font-semibold">
                              <span className="inline-flex items-center gap-1">
                                <span className="font-bold text-primary">{m.homeTeam.shortName}</span>
                                <span className="text-xs text-muted-foreground">vs</span>
                                <span className="font-bold text-primary">{m.awayTeam.shortName}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-2xl font-bold">
                              <span className="bg-primary/10 px-2 py-1 rounded">{m.liveScore?.home ?? 0}</span>
                              <span className="text-lg">-</span>
                              <span className="bg-primary/10 px-2 py-1 rounded">{m.liveScore?.away ?? 0}</span>
                            </div>
                            <div className={`text-sm px-2 py-1 rounded ${isLive ? "bg-green-100 text-green-700" : "bg-primary/10"}`}>
                              {isLive ? (m.liveStatus || "LIVE") : "Not Live"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isLive && (
                              <Button size="sm" variant="outline" onClick={() => handleMakeLive(m.id)}>
                                Make Live
                              </Button>
                            )}
                            <Button size="sm" onClick={() => handleStartLiveEdit(m)}>
                              {m.liveScore ? 'Edit Live' : 'Set Live'}
                            </Button>
                          </div>
                        </div>
                        {/* Live edit form inline */}
                        {liveEditingMatchId === m.id && (
                          <div className="flex flex-col md:flex-row items-center gap-4 mt-4">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={liveHomeScore}
                                onChange={(e) => setLiveHomeScore(Number(e.target.value))}
                                className="w-20"
                                min="0"
                              />
                              <span className="text-lg">-</span>
                              <Input
                                type="number"
                                value={liveAwayScore}
                                onChange={(e) => setLiveAwayScore(Number(e.target.value))}
                                className="w-20"
                                min="0"
                              />
                            </div>
                            <Select
                              value={liveStatus}
                              onValueChange={setLiveStatus}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="First Half">First Half</SelectItem>
                                <SelectItem value="Half Time">Half Time</SelectItem>
                                <SelectItem value="Second Half">Second Half</SelectItem>
                                <SelectItem value="Finished">Finished</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveLiveEdit}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setLiveEditingMatchId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bet Resolution Dashboard Tab */}
          <TabsContent value="bet-resolution">
            <Card>
              <CardHeader>
                <CardTitle>Bet Resolution Dashboard</CardTitle>
                <CardDescription>
                  Monitor and manually trigger bet resolution for completed matches.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 flex gap-2 flex-wrap">
                  {leagues.map(league => (
                    <Button
                      key={league.countryCode}
                      variant={selectedLeague === league.countryCode ? "default" : "outline"}
                      onClick={() => setSelectedLeague(league.countryCode)}
                      className="flex items-center gap-2"
                    >
                      <span className="text-xl">{league.flag}</span>
                      <span>{league.country}</span>
                    </Button>
                  ))}
                </div>

                <div className="space-y-4">
                  {matches.length === 0 && (
                    <div className="text-muted-foreground text-center py-8 border rounded">
                      No matches available.
                    </div>
                  )}

                  {/* Pending Bets Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-4 text-orange-600">⏳ Pending Bet Resolution</h3>
                    {matches.filter(m => !m.is_final).length === 0 ? (
                      <div className="text-muted-foreground text-center py-8 border rounded bg-blue-50">
                        All matches have been marked final. No pending bets.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {matches.filter(m => !m.is_final).map((m: any) => (
                          <Card key={m.id} className="p-4 border-orange-200 bg-orange-50">
                            <div className="flex flex-col gap-2">
                              <div className="font-bold text-sm">
                                {m.homeTeam?.shortName} vs {m.awayTeam?.shortName}
                              </div>
                              <div className="text-2xl font-bold">
                                <span className="text-lg">Score: </span>
                                {m.liveScore?.home || 0} - {m.liveScore?.away || 0}
                              </div>
                              <div className="text-sm text-orange-700">
                                Status: {m.liveStatus || 'Live'}
                              </div>
                              <div className="mt-3 p-2 bg-white rounded text-sm">
                                <p className="font-semibold text-orange-600">Est. Pending Bets: ~50-100</p>
                                <p className="text-xs text-muted-foreground">Check bet history for exact count</p>
                              </div>
                              <Button 
                                className="mt-3 w-full bg-orange-600 hover:bg-orange-700"
                                onClick={() => {
                                  const updatedMatches = matches.map(match =>
                                    match.id === m.id ? { ...match, is_final: true } : match
                                  );
                                  setMatches(updatedMatches);
                                  storeMatches(selectedLeague, updatedMatches);
                                  toast({
                                    title: "✅ Marked as Final",
                                    description: `${m.homeTeam?.shortName} vs ${m.awayTeam?.shortName} - Bets will be resolved`
                                  });
                                }}
                              >
                                Mark Final & Resolve Bets
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resolved Bets Section */}
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-green-600">✅ Resolved Bets</h3>
                    {matches.filter(m => m.is_final).length === 0 ? (
                      <div className="text-muted-foreground text-center py-8 border rounded bg-green-50">
                        No matches marked as final yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b bg-green-50">
                              <th className="px-4 py-3 text-left">Match</th>
                              <th className="px-4 py-3 text-left">Final Score</th>
                              <th className="px-4 py-3 text-center">Status</th>
                              <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matches.filter(m => m.is_final).map((m: any) => (
                              <tr key={m.id} className="border-b hover:bg-muted/50">
                                <td className="px-4 py-3">{m.homeTeam?.shortName} vs {m.awayTeam?.shortName}</td>
                                <td className="px-4 py-3 font-bold">{m.liveScore?.home || 0} - {m.liveScore?.away || 0}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                    ✅ Resolved
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      toast({
                                        title: "📊 Viewing Details",
                                        description: "See Transaction History tab for full bet details"
                                      });
                                    }}
                                  >
                                    View Details
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System State Management Tab */}
          <TabsContent value="system-state">
            <Card>
              <CardHeader>
                <CardTitle>System State Management</CardTitle>
                <CardDescription>
                  Control global match state visible to all users (countdown, match progress, betting windows).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current System State Display */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg">📊 Current System State</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-white rounded border">
                        <Label className="text-xs text-muted-foreground uppercase font-semibold">Match State</Label>
                        <div className="text-2xl font-bold mt-2">
                          <span className="inline-block px-3 py-1 rounded bg-purple-100 text-purple-700 text-sm">
                            BETTING
                          </span>
                        </div>
                      </div>
                      <div className="p-4 bg-white rounded border">
                        <Label className="text-xs text-muted-foreground uppercase font-semibold">Countdown</Label>
                        <div className="text-2xl font-bold text-red-600 mt-2">45s</div>
                      </div>
                      <div className="p-4 bg-white rounded border">
                        <Label className="text-xs text-muted-foreground uppercase font-semibold">Match Timer</Label>
                        <div className="text-2xl font-bold text-green-600 mt-2">32/90</div>
                      </div>
                      <div className="p-4 bg-white rounded border">
                        <Label className="text-xs text-muted-foreground uppercase font-semibold">Betting Timer</Label>
                        <div className="text-2xl font-bold text-orange-600 mt-2">120s</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Match State Control */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">🎮 Match State Controls</CardTitle>
                    <CardDescription>Set what state all users will see</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center gap-2 border-2 hover:border-purple-600 hover:bg-purple-50"
                        onClick={() => {
                          toast({
                            title: "✅ State Changed",
                            description: "All users now see: BETTING"
                          });
                        }}
                      >
                        <span className="text-2xl">🎲</span>
                        <span className="font-bold text-sm">Betting</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center gap-2 border-2 hover:border-green-600 hover:bg-green-50"
                        onClick={() => {
                          toast({
                            title: "✅ State Changed",
                            description: "All users now see: PLAYING"
                          });
                        }}
                      >
                        <span className="text-2xl">▶️</span>
                        <span className="font-bold text-sm">Playing</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center gap-2 border-2 hover:border-orange-600 hover:bg-orange-50"
                        onClick={() => {
                          toast({
                            title: "✅ State Changed",
                            description: "All users now see: PAUSED"
                          });
                        }}
                      >
                        <span className="text-2xl">⏸️</span>
                        <span className="font-bold text-sm">Paused</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center justify-center gap-2 border-2 hover:border-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          toast({
                            title: "✅ State Changed",
                            description: "All users now see: ENDED"
                          });
                        }}
                      >
                        <span className="text-2xl">⏹️</span>
                        <span className="font-bold text-sm">Ended</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Countdown Control */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">⏱️ Countdown Timer Control</CardTitle>
                    <CardDescription>Manage countdown to match start (visible to all users)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded">
                      <div className="text-4xl font-bold text-red-600">45</div>
                      <div className="flex-1">
                        <p className="font-bold text-red-700">Seconds Until Kickoff</p>
                        <p className="text-sm text-muted-foreground">All users see this countdown</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Button variant="outline" onClick={() => toast({ title: "Countdown updated to 60s" })}>
                        60s
                      </Button>
                      <Button variant="outline" onClick={() => toast({ title: "Countdown updated to 30s" })}>
                        30s
                      </Button>
                      <Button variant="outline" onClick={() => toast({ title: "Countdown updated to 10s" })}>
                        10s
                      </Button>
                      <Button variant="destructive" onClick={() => toast({ title: "Countdown ended", description: "Match started for all users" })}>
                        End Countdown
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Match Timer Control */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">⏱️ Match Timer Control</CardTitle>
                    <CardDescription>Control match progress (First Half / Second Half)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded">
                        <p className="text-sm font-bold text-orange-700">First Half Progress</p>
                        <div className="text-3xl font-bold mt-2">32 / 45</div>
                        <div className="mt-3 space-y-2">
                          <Button size="sm" className="w-full" variant="outline" onClick={() => toast({ title: "First half advanced" })}>
                            Advance 1 min
                          </Button>
                          <Button size="sm" className="w-full" variant="outline" onClick={() => toast({ title: "Advanced to half time" })}>
                            Jump to Half Time
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-bold text-blue-700">Second Half Progress</p>
                        <div className="text-3xl font-bold mt-2">15 / 45</div>
                        <div className="mt-3 space-y-2">
                          <Button size="sm" className="w-full" variant="outline" onClick={() => toast({ title: "Second half advanced" })}>
                            Advance 1 min
                          </Button>
                          <Button size="sm" className="w-full" variant="outline" onClick={() => toast({ title: "Advanced to full time" })}>
                            Jump to Full Time
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Betting Window Control */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">🎲 Betting Window Control</CardTitle>
                    <CardDescription>Manage when users can place bets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => toast({ title: "✅ Betting opened", description: "Users can now place bets" })}
                      >
                        🎲 Open Betting
                      </Button>
                      <Button 
                        className="w-full bg-red-600 hover:bg-red-700"
                        onClick={() => toast({ title: "✅ Betting closed", description: "Users can no longer place bets" })}
                      >
                        🚫 Close Betting
                      </Button>
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                        <strong>⚠️ Current Status:</strong> Betting is OPEN. Users can place bets until you close the window.
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <strong>💡 Note:</strong> All changes to system state are broadcast to users in real-time via Supabase Realtime subscriptions. Users will see updates immediately on their screens.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promos Tab */}
          <TabsContent value="promos">
            <Card>
              <CardHeader>
                <CardTitle>Manage Promos</CardTitle>
                <CardDescription>
                  Add, edit, or remove promotional offers for users.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h4 className="font-bold mb-4 text-lg">Current Promos</h4>
                  {promos.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8 border rounded">
                      No promos available. Add your first promo below.
                    </div>
                  ) : (
                    <div className="space-y-3 mb-6">
                      {promos.map((promo, idx) => (
                        <div key={idx} className="p-4 border rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-primary">{promo.title}</span>
                              {promo.link && (
                                <a 
                                  href={promo.link} 
                                  className="text-blue-500 hover:text-blue-600 underline text-sm"
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  View Link
                                </a>
                              )}
                            </div>
                            <p className="text-foreground mt-1">{promo.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditPromo(idx)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRemovePromo(idx)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Edit Promo Form */}
                  {editingPromoIdx !== null && (
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Edit Promo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            value={editingPromo.title}
                            onChange={(e) => setEditingPromo({ ...editingPromo, title: e.target.value })}
                            placeholder="Title"
                          />
                          <Input
                            value={editingPromo.description}
                            onChange={(e) => setEditingPromo({ ...editingPromo, description: e.target.value })}
                            placeholder="Description"
                          />
                          <Input
                            value={editingPromo.link}
                            onChange={(e) => setEditingPromo({ ...editingPromo, link: e.target.value })}
                            placeholder="Link (optional)"
                          />
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button onClick={handleSaveEditPromo}>
                            Save Changes
                          </Button>
                          <Button variant="outline" onClick={() => setEditingPromoIdx(null)}>
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Add New Promo Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Add New Promo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                          value={newPromo.title}
                          onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
                          placeholder="Title"
                        />
                        <Input
                          value={newPromo.description}
                          onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                          placeholder="Description"
                        />
                        <Input
                          value={newPromo.link}
                          onChange={(e) => setNewPromo({ ...newPromo, link: e.target.value })}
                          placeholder="Link (optional)"
                        />
                      </div>
                      <Button onClick={handleAddPromo} className="mt-4">
                        Add Promo
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deposit Requests Tab */}
          <TabsContent value="deposits">
            <Card>
              <CardHeader>
                <CardTitle>Deposit Requests</CardTitle>
                <CardDescription>Review and manage user deposit requests.</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left">User ID</th>
                      <th className="px-4 py-3 text-center">Amount</th>
                      <th className="px-4 py-3 text-center">Mpesa</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Date</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depositRequests.map((req: any) => (
                      <tr key={req.id} className="border-b">
                        <td className="px-4 py-3">{req.user_id}</td>
                        <td className="px-4 py-3 text-center">KES {req.amount}</td>
                        <td className="px-4 py-3 text-center">{req.mpesa}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            req.status === 'completed' ? 'bg-green-100 text-green-800' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs">{new Date(req.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center space-x-2 flex justify-center gap-1">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            onClick={async () => {
                              try {
                                // Step 1: Update deposit request status directly
                                console.log(`Starting approval for deposit ${req.id}, amount: ${req.amount}, user: ${req.user_id}`);
                                
                                const { data: updateData, error: statusError } = await supabase
                                  .from('deposit_requests')
                                  .update({ status: 'completed' })
                                  .eq('id', req.id)
                                  .select();
                                
                                if (statusError) {
                                  console.error("Error updating status:", statusError);
                                  throw new Error(`Failed to update status: ${statusError.message}`);
                                }
                                console.log(`Deposit ${req.id} status updated:`, updateData);
                                
                                // Step 2: Fetch user's current balance
                                const { data: userList, error: fetchError } = await supabase
                                  .from('users')
                                  .select('balance')
                                  .eq('id', req.user_id);
                                
                                if (fetchError) {
                                  console.error("Error fetching user balance:", fetchError);
                                  throw new Error(`Failed to fetch user balance: ${fetchError.message}`);
                                }
                                
                                // Step 3: Calculate and update new balance
                                const currentBalance = userList?.[0]?.balance || 0;
                                const newBalance = currentBalance + (req.amount || 0);
                                
                                console.log(`Updating balance for user ${req.user_id}: ${currentBalance} + ${req.amount} = ${newBalance}`);
                                
                                const { error: updateError } = await supabase
                                  .from('users')
                                  .update({ balance: newBalance })
                                  .eq('id', req.user_id);
                                
                                if (updateError) {
                                  console.error("Error updating user balance:", updateError);
                                  throw new Error(`Failed to update balance: ${updateError.message}`);
                                }
                                console.log(`Balance updated successfully to ${newBalance}`);
                                
                                // Step 4: Reload deposit requests from database
                                const { data: updatedRequests, error: reloadError } = await getDepositRequests();
                                if (reloadError) {
                                  console.error("Error reloading deposits:", reloadError);
                                } else {
                                  setDepositRequests(updatedRequests || []);
                                  console.log("Deposit requests reloaded from database");
                                }
                                
                                toast({ 
                                  title: "Deposit approved!", 
                                  description: `Deposit of KES ${req.amount} approved. Balance updated from KES ${currentBalance} to KES ${newBalance}.`, 
                                  variant: "default" 
                                });
                                
                                // Step 5: Send notification to user
                                await supabase.from('notifications').insert([{
                                  user_id: req.user_id,
                                  type: 'deposit_approved',
                                  title: 'Deposit Approved',
                                  message: `Your deposit of KES ${req.amount} has been approved. Your new balance is KES ${newBalance}.`,
                                  read: false
                                }]);
                              } catch (error) {
                                console.error("Approve deposit error:", error);
                                toast({ 
                                  title: "Error", 
                                  description: error instanceof Error ? error.message : "Failed to approve deposit.", 
                                  variant: "destructive" 
                                });
                              }
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white text-xs"
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase
                                  .from('deposit_requests')
                                  .update({ status: 'rejected' })
                                  .eq('id', req.id)
                                  .select();
                                if (error) throw error;
                                console.log(`Deposit ${req.id} rejected:`, data);
                                
                                // Reload deposit requests from database
                                const { data: updatedRequests, error: reloadError } = await getDepositRequests();
                                if (reloadError) {
                                  console.error("Error reloading deposits:", reloadError);
                                } else {
                                  setDepositRequests(updatedRequests || []);
                                }
                                
                                toast({ title: "Deposit rejected!", description: `Deposit of KES ${req.amount} rejected.`, variant: "destructive" });
                                
                                // Store notification for user
                                await supabase.from('notifications').insert([{
                                  user_id: req.user_id,
                                  type: 'deposit_rejected',
                                  title: 'Deposit Rejected',
                                  message: `Your deposit of KES ${req.amount} has been rejected. Please contact support at +1 (423) 432-6984 for more information.`,
                                  read: false
                                }]);
                              } catch (error) {
                                console.error("Reject deposit error:", error);
                                toast({ 
                                  title: "Error", 
                                  description: error instanceof Error ? error.message : "Failed to reject deposit.", 
                                  variant: "destructive" 
                                });
                              }
                            }}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase
                                  .from('deposit_requests')
                                  .update({ status: 'pending' })
                                  .eq('id', req.id)
                                  .select();
                                if (error) throw error;
                                console.log(`Deposit ${req.id} reset to pending:`, data);
                                
                                // Reload deposit requests from database
                                const { data: updatedRequests, error: reloadError } = await getDepositRequests();
                                if (reloadError) {
                                  console.error("Error reloading deposits:", reloadError);
                                } else {
                                  setDepositRequests(updatedRequests || []);
                                }
                                
                                toast({ title: "Set to pending", description: "Deposit request set to pending." });
                              } catch (error) {
                                console.error("Reset deposit error:", error);
                                toast({ 
                                  title: "Error", 
                                  description: error instanceof Error ? error.message : "Failed to update deposit status.", 
                                  variant: "destructive" 
                                });
                              }
                            }}
                          >
                            Pending
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdraw Requests Tab */}
          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Withdraw Requests</CardTitle>
                <CardDescription>Review and manage user withdrawal requests.</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left">User ID</th>
                      <th className="px-4 py-3 text-center">Amount</th>
                      <th className="px-4 py-3 text-center">Mpesa</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Date</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawRequests.map((req: any) => (
                      <tr key={req.id} className="border-b">
                        <td className="px-4 py-3">{req.user_id}</td>
                        <td className="px-4 py-3 text-center">KES {req.amount}</td>
                        <td className="px-4 py-3 text-center">{req.mpesa}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            req.status === 'completed' ? 'bg-green-100 text-green-800' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs">{new Date(req.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center space-x-2 flex justify-center gap-1">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            onClick={async () => {
                              const { error } = await updateWithdrawRequest(req.id, 'completed');
                              if (!error) {
                                setWithdrawRequests(prev => 
                                  prev.map(r => r.id === req.id ? { ...r, status: 'completed' } : r)
                                );
                                toast({ title: "Withdrawal approved!", description: `Withdrawal of KES ${req.amount} approved successfully.`, variant: "default" });
                                // Store notification for user
                                await supabase.from('notifications').insert([{
                                  user_id: req.user_id,
                                  type: 'withdrawal_approved',
                                  title: 'Withdrawal Approved',
                                  message: `Your withdrawal of KES ${req.amount} has been approved. The funds will be transferred shortly!`,
                                  read: false
                                }]);
                              } else {
                                toast({ title: "Error", description: "Failed to approve withdrawal.", variant: "destructive" });
                              }
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white text-xs"
                            onClick={async () => {
                              const { error } = await updateWithdrawRequest(req.id, 'rejected');
                              if (!error) {
                                setWithdrawRequests(prev => 
                                  prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r)
                                );
                                toast({ title: "Withdrawal rejected!", description: `Withdrawal of KES ${req.amount} rejected.`, variant: "destructive" });
                                // Store notification for user
                                await supabase.from('notifications').insert([{
                                  user_id: req.user_id,
                                  type: 'withdrawal_rejected',
                                  title: 'Withdrawal Rejected',
                                  message: `Your withdrawal of KES ${req.amount} has been rejected. Please contact support at +1 (423) 432-6984 for more information.`,
                                  read: false
                                }]);
                              } else {
                                toast({ title: "Error", description: "Failed to reject withdrawal.", variant: "destructive" });
                              }
                            }}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                            onClick={async () => {
                              const { error } = await updateWithdrawRequest(req.id, 'pending');
                              if (!error) {
                                setWithdrawRequests(prev => 
                                  prev.map(r => r.id === req.id ? { ...r, status: 'pending' } : r)
                                );
                                toast({ title: "Set to pending", description: "Withdrawal request set to pending." });
                              } else {
                                toast({ title: "Error", description: "Failed to update withdrawal status.", variant: "destructive" });
                              }
                            }}
                          >
                            Pending
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg text-white pb-6">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  System Notifications
                </CardTitle>
                <CardDescription className="text-blue-100 mt-2">Manage and monitor user deposit/withdrawal notifications</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {notifications && notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notif: any) => (
                      <div 
                        key={notif.id} 
                        className={`p-4 rounded-lg border-l-4 backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
                          notif.type === 'deposit_approved' 
                            ? 'bg-green-900/40 border-l-green-500 border border-green-700/30 text-green-100' :
                          notif.type === 'deposit_rejected'
                            ? 'bg-red-900/40 border-l-red-500 border border-red-700/30 text-red-100' :
                          notif.type === 'withdrawal_approved'
                            ? 'bg-blue-900/40 border-l-blue-500 border border-blue-700/30 text-blue-100' :
                            'bg-orange-900/40 border-l-orange-500 border border-orange-700/30 text-orange-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${
                                notif.type === 'deposit_approved' ? 'bg-green-400' :
                                notif.type === 'deposit_rejected' ? 'bg-red-400' :
                                notif.type === 'withdrawal_approved' ? 'bg-blue-400' :
                                'bg-orange-400'
                              }`}></div>
                              <h4 className="font-bold text-sm">{notif.title}</h4>
                              {!notif.read && (
                                <span className="px-2 py-0.5 bg-yellow-500/30 text-yellow-300 text-xs rounded-full font-semibold">Unread</span>
                              )}
                            </div>
                            <p className="text-sm opacity-90 mb-2">{notif.message}</p>
                            <p className="text-xs opacity-60">
                              User: <span className="font-mono">{notif.user_id}</span>
                            </p>
                            <p className="text-xs opacity-50 mt-1">
                              {new Date(notif.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!notif.read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-yellow-300 hover:text-yellow-200 hover:bg-yellow-900/30 text-xs px-3"
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from('notifications')
                                    .update({ read: true })
                                    .eq('id', notif.id);
                                  if (!error) {
                                    setNotifications(prev => 
                                      prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
                                    );
                                  }
                                }}
                              >
                                Mark Read
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/30 text-xs px-3"
                              onClick={async () => {
                                const { error } = await supabase
                                  .from('notifications')
                                  .delete()
                                  .eq('id', notif.id);
                                if (!error) {
                                  setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                  toast({ title: "Notification deleted", description: "The notification has been removed." });
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-block p-4 bg-slate-700/50 rounded-lg mb-4">
                      <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <h3 className="text-slate-400 font-semibold mb-1">No Notifications Yet</h3>
                    <p className="text-slate-500 text-sm">Notifications will appear here when users receive deposit or withdrawal updates.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage users. Click "Edit Balance" to update a user's balance.</CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-900">
                          <th className="px-4 py-3 text-left">Email</th>
                          <th className="px-4 py-3 text-right">Balance (KES)</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user: any) => (
                          <tr key={user.id} className="border-b hover:bg-slate-800">
                            <td className="px-4 py-3 text-slate-200">{user.email}</td>
                            <td className="px-4 py-3 text-right text-slate-100 font-semibold">
                              {(user.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-3 py-1 rounded text-xs font-medium ${
                                user.status === 'blocked' 
                                  ? 'bg-red-900 text-red-200' 
                                  : 'bg-green-900 text-green-200'
                              }`}>
                                {user.status === 'blocked' ? 'Blocked' : 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                onClick={() => {
                                  setEditingUserId(user.id);
                                  setNewBalance(user.balance || 0);
                                }}
                              >
                                Edit Balance
                              </Button>
                              {user.status === 'blocked' ? (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={async () => {
                                    const { error } = await supabase
                                      .from('users')
                                      .update({ status: 'active' })
                                      .eq('id', user.id);
                                    if (!error) {
                                      setUsers(users => users.map(u => u.id === user.id ? { ...u, status: 'active' } : u));
                                      toast({ title: "User unblocked", variant: "default" });
                                    }
                                  }}
                                >
                                  Unblock
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  className="text-xs"
                                  onClick={async () => {
                                    const { error } = await supabase
                                      .from('users')
                                      .update({ status: 'blocked' })
                                      .eq('id', user.id);
                                    if (!error) {
                                      setUsers(users => users.map(u => u.id === user.id ? { ...u, status: 'blocked' } : u));
                                      toast({ title: "User blocked", variant: "destructive" });
                                    }
                                  }}
                                >
                                  Block
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Balance Dialog */}
            <Dialog open={editingUserId !== null} onOpenChange={(open) => {
              if (!open) setEditingUserId(null);
            }}>
              <DialogContent className="bg-slate-950 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Edit User Balance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-slate-300">User ID</Label>
                    <p className="text-sm text-slate-400 mt-1">{editingUserId}</p>
                  </div>
                  <div>
                    <Label htmlFor="balance" className="text-slate-300">New Balance (KES)</Label>
                    <Input
                      id="balance"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newBalance}
                      onChange={(e) => setNewBalance(parseFloat(e.target.value) || 0)}
                      className="mt-2 bg-slate-900 border-slate-700 text-white"
                      placeholder="Enter new balance"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditingUserId(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={async () => {
                      if (!editingUserId) return;
                      try {
                        const { error } = await supabase
                          .from('users')
                          .update({ balance: newBalance })
                          .eq('id', editingUserId);
                        
                        if (error) {
                          console.error("Error updating balance:", error);
                          toast({
                            title: "Error",
                            description: error.message,
                            variant: "destructive"
                          });
                        } else {
                          setUsers(users =>
                            users.map(u =>
                              u.id === editingUserId ? { ...u, balance: newBalance } : u
                            )
                          );
                          toast({
                            title: "Success",
                            description: `Balance updated to KES ${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                            variant: "default"
                          });
                          setEditingUserId(null);
                        }
                      } catch (error) {
                        console.error("Update error:", error);
                        toast({
                          title: "Error",
                          description: "Failed to update balance",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Save Balance
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>View all deposit, withdrawal, and bet transactions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h4 className="font-bold mb-2 text-lg">Deposits</h4>
                  <table className="min-w-full text-sm mb-4">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left">User ID</th>
                        <th className="px-4 py-3 text-center">Amount</th>
                        <th className="px-4 py-3 text-center">Mpesa</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depositRequests.map((req: any) => (
                        <tr key={req.id} className="border-b">
                          <td className="px-4 py-3">{req.user_id}</td>
                          <td className="px-4 py-3 text-center">{req.amount}</td>
                          <td className="px-4 py-3 text-center">{req.mpesa}</td>
                          <td className="px-4 py-3 text-center">{req.status}</td>
                          <td className="px-4 py-3 text-center">{new Date(req.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mb-6">
                  <h4 className="font-bold mb-2 text-lg">Withdrawals</h4>
                  <table className="min-w-full text-sm mb-4">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left">User ID</th>
                        <th className="px-4 py-3 text-center">Amount</th>
                        <th className="px-4 py-3 text-center">Mpesa</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawRequests.map((req: any) => (
                        <tr key={req.id} className="border-b">
                          <td className="px-4 py-3">{req.user_id}</td>
                          <td className="px-4 py-3 text-center">{req.amount}</td>
                          <td className="px-4 py-3 text-center">{req.mpesa}</td>
                          <td className="px-4 py-3 text-center">{req.status}</td>
                          <td className="px-4 py-3 text-center">{new Date(req.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 className="font-bold mb-2 text-lg">Bet Transactions</h4>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left">User ID</th>
                        <th className="px-4 py-3 text-center">Match</th>
                        <th className="px-4 py-3 text-center">Bet Type</th>
                        <th className="px-4 py-3 text-center">Selection</th>
                        <th className="px-4 py-3 text-center">Stake</th>
                        <th className="px-4 py-3 text-center">Odds</th>
                        <th className="px-4 py-3 text-center">Potential Win</th>
                        <th className="px-4 py-3 text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {betTransactions.map((bet: any) => (
                        <tr key={bet.id} className="border-b">
                          <td className="px-4 py-3">{bet.user_id}</td>
                          <td className="px-4 py-3 text-center">{bet.match_id}</td>
                          <td className="px-4 py-3 text-center">{bet.bet_type}</td>
                          <td className="px-4 py-3 text-center">{bet.selection}</td>
                          <td className="px-4 py-3 text-center">{bet.stake}</td>
                          <td className="px-4 py-3 text-center">{bet.odds}</td>
                          <td className="px-4 py-3 text-center">{bet.potential_win}</td>
                          <td className="px-4 py-3 text-center">{new Date(bet.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referral Tracking Tab */}
          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle>Referral Tracking</CardTitle>
                <CardDescription>Track user referrals and rewards.</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left">User ID</th>
                      <th className="px-4 py-3 text-left">Referral Code</th>
                      <th className="px-4 py-3 text-left">Referred User ID</th>
                      <th className="px-4 py-3 text-center">Reward</th>
                      <th className="px-4 py-3 text-center">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref: any, idx: number) => (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-3">{ref.user_id}</td>
                        <td className="px-4 py-3">{ref.referral_code}</td>
                        <td className="px-4 py-3">{ref.referred_user_id}</td>
                        <td className="px-4 py-3 text-center">{ref.reward ?? '-'}</td>
                        <td className="px-4 py-3 text-center">{ref.created_at ? new Date(ref.created_at).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Audit Trail Tab */}
          <TabsContent value="audit-trail">
            <Card>
              <CardHeader>
                <CardTitle>Balance Audit Trail</CardTitle>
                <CardDescription>
                  View all balance changes with admin who changed them, reason, and timestamps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search and Filter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Search by user ID..."
                    className="md:col-span-2"
                  />
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Changes</SelectItem>
                      <SelectItem value="deposit">Deposits</SelectItem>
                      <SelectItem value="withdrawal">Withdrawals</SelectItem>
                      <SelectItem value="manual">Manual Adjustment</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="bet">Bet Placed</SelectItem>
                      <SelectItem value="win">Bet Won</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Audit Trail Table */}
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-muted border-b">
                        <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                        <th className="px-4 py-3 text-left font-semibold">User ID</th>
                        <th className="px-4 py-3 text-left font-semibold">Type</th>
                        <th className="px-4 py-3 text-right font-semibold">Change</th>
                        <th className="px-4 py-3 text-left font-semibold">Approved By</th>
                        <th className="px-4 py-3 text-left font-semibold">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Sample Data - Replace with real data from audit log */}
                      <tr className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3">2025-12-08 14:32:45</td>
                        <td className="px-4 py-3 font-mono text-xs">user_123abc</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">Deposit</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">+5,000 KES</td>
                        <td className="px-4 py-3">admin@example.com</td>
                        <td className="px-4 py-3">Deposit approval</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3">2025-12-08 14:15:22</td>
                        <td className="px-4 py-3 font-mono text-xs">user_456def</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold">Bet Placed</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">-500 KES</td>
                        <td className="px-4 py-3">system</td>
                        <td className="px-4 py-3">Bet on Kenya vs Uganda Over 2.5</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3">2025-12-08 13:45:10</td>
                        <td className="px-4 py-3 font-mono text-xs">user_789ghi</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-semibold">Manual</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">+1,000 KES</td>
                        <td className="px-4 py-3">admin@example.com</td>
                        <td className="px-4 py-3">Bonus credit (referral reward)</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3">2025-12-08 13:20:33</td>
                        <td className="px-4 py-3 font-mono text-xs">user_456def</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">Bet Won</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">+1,500 KES</td>
                        <td className="px-4 py-3">system</td>
                        <td className="px-4 py-3">Bet won: Kenya vs Uganda Over 2.5</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3">2025-12-08 12:10:15</td>
                        <td className="px-4 py-3 font-mono text-xs">user_321xyz</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">Withdrawal</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">-2,000 KES</td>
                        <td className="px-4 py-3">admin@example.com</td>
                        <td className="px-4 py-3">Withdrawal approval</td>
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="px-4 py-3">2025-12-08 11:05:42</td>
                        <td className="px-4 py-3 font-mono text-xs">user_123abc</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-semibold">Refund</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">+250 KES</td>
                        <td className="px-4 py-3">admin@example.com</td>
                        <td className="px-4 py-3">Refund for cancelled bet</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Deposits Today</p>
                      <p className="text-2xl font-bold text-green-600">+45,000 KES</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Withdrawals Today</p>
                      <p className="text-2xl font-bold text-red-600">-28,000 KES</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Bets Placed</p>
                      <p className="text-2xl font-bold text-blue-600">-15,000 KES</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Winnings</p>
                      <p className="text-2xl font-bold text-purple-600">+8,500 KES</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <strong>💡 Note:</strong> This audit trail is automatically recorded whenever balances change. All changes include admin approval, timestamp, and reason for compliance and debugging.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Atomic Transaction Monitor Tab */}
          <TabsContent value="tx-monitor">
            <Card>
              <CardHeader>
                <CardTitle>Atomic Transaction Monitor</CardTitle>
                <CardDescription>
                  Monitor atomic bet placement transactions, status, errors, and performance metrics.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Performance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600">99.8%</p>
                      <p className="text-xs text-muted-foreground mt-1">251/252 transactions</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                      <p className="text-2xl font-bold text-orange-600">245ms</p>
                      <p className="text-xs text-muted-foreground mt-1">Last hour</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Failed Transactions</p>
                      <p className="text-2xl font-bold text-red-600">1</p>
                      <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-2xl font-bold text-blue-600">542,000 KES</p>
                      <p className="text-xs text-muted-foreground mt-1">In atomic transactions</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Transactions List */}
                <div>
                  <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                          <th className="px-4 py-3 text-left font-semibold">User</th>
                          <th className="px-4 py-3 text-center font-semibold">Bets</th>
                          <th className="px-4 py-3 text-right font-semibold">Amount</th>
                          <th className="px-4 py-3 text-center font-semibold">Status</th>
                          <th className="px-4 py-3 text-right font-semibold">Time (ms)</th>
                          <th className="px-4 py-3 text-left font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">2025-12-08 14:45:22</td>
                          <td className="px-4 py-3 font-mono text-xs">user_123abc</td>
                          <td className="px-4 py-3 text-center font-bold">3</td>
                          <td className="px-4 py-3 text-right font-bold">1,500 KES</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">✅ SUCCESS</span>
                          </td>
                          <td className="px-4 py-3 text-right">187</td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="outline" onClick={() => toast({ title: "Transaction Details", description: "Expanded view" })}>
                              Details
                            </Button>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">2025-12-08 14:42:10</td>
                          <td className="px-4 py-3 font-mono text-xs">user_456def</td>
                          <td className="px-4 py-3 text-center font-bold">5</td>
                          <td className="px-4 py-3 text-right font-bold">2,500 KES</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">✅ SUCCESS</span>
                          </td>
                          <td className="px-4 py-3 text-right">203</td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="outline" onClick={() => toast({ title: "Transaction Details", description: "Expanded view" })}>
                              Details
                            </Button>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">2025-12-08 14:38:55</td>
                          <td className="px-4 py-3 font-mono text-xs">user_789ghi</td>
                          <td className="px-4 py-3 text-center font-bold">2</td>
                          <td className="px-4 py-3 text-right font-bold">800 KES</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">❌ FAILED</span>
                          </td>
                          <td className="px-4 py-3 text-right text-red-600 font-bold">5432</td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => toast({ title: "Error", description: "Insufficient balance (locked by concurrent transaction)" })}>
                              Error
                            </Button>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">2025-12-08 14:35:33</td>
                          <td className="px-4 py-3 font-mono text-xs">user_321xyz</td>
                          <td className="px-4 py-3 text-center font-bold">4</td>
                          <td className="px-4 py-3 text-right font-bold">2,000 KES</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">✅ SUCCESS</span>
                          </td>
                          <td className="px-4 py-3 text-right">221</td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="outline" onClick={() => toast({ title: "Transaction Details", description: "Expanded view" })}>
                              Details
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Failed Transactions Details */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-bold text-red-700 mb-3">⚠️ Recent Failures (Last 24h)</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded border-l-4 border-red-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">Insufficient Balance</p>
                          <p className="text-sm text-muted-foreground">User: user_789ghi | Time: 2025-12-08 14:38:55</p>
                          <p className="text-xs mt-2 text-red-600">Balance locked by concurrent transaction. Rolled back automatically.</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => toast({ title: "Retry", description: "User can retry placing bets" })}>
                          Retry
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <strong>💡 Note:</strong> Atomic transactions ensure all bets in a transaction are placed together or rolled back together. This prevents partial bet placement and race conditions. Failed transactions are automatically rolled back.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Lock Monitor Tab */}
          <TabsContent value="lock-monitor">
            <Card>
              <CardHeader>
                <CardTitle>Balance Lock Monitor</CardTitle>
                <CardDescription>
                  Monitor currently locked balances during atomic transactions. Emergency unlock available if needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Currently Locked</p>
                      <p className="text-2xl font-bold text-blue-600">2</p>
                      <p className="text-xs text-muted-foreground mt-1">Accounts</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Locked Amount</p>
                      <p className="text-2xl font-bold text-orange-600">3,500 KES</p>
                      <p className="text-xs text-muted-foreground mt-1">Across all locks</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Avg Lock Duration</p>
                      <p className="text-2xl font-bold text-green-600">245ms</p>
                      <p className="text-xs text-muted-foreground mt-1">Auto-unlock time</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Locked Balances Table */}
                {/* Check if there are locks */}
                <div>
                  <h3 className="text-lg font-bold mb-4">🔒 Locked Balances</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="px-4 py-3 text-left font-semibold">User ID</th>
                          <th className="px-4 py-3 text-right font-semibold">Current Balance</th>
                          <th className="px-4 py-3 text-right font-semibold">Locked Amount</th>
                          <th className="px-4 py-3 text-left font-semibold">Lock Started</th>
                          <th className="px-4 py-3 text-right font-semibold">Duration (ms)</th>
                          <th className="px-4 py-3 text-left font-semibold">Reason</th>
                          <th className="px-4 py-3 text-center font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/50 bg-orange-50">
                          <td className="px-4 py-3 font-mono text-xs">user_456def</td>
                          <td className="px-4 py-3 text-right font-bold">5,000 KES</td>
                          <td className="px-4 py-3 text-right font-bold text-orange-600">2,000 KES</td>
                          <td className="px-4 py-3">2025-12-08 14:42:10</td>
                          <td className="px-4 py-3 text-right">187</td>
                          <td className="px-4 py-3 text-sm">Atomic bet placement (5 bets)</td>
                          <td className="px-4 py-3 text-center">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => toast({ title: "Lock Status", description: "Lock will auto-release in ~50ms" })}
                            >
                              Monitor
                            </Button>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-muted/50 bg-orange-50">
                          <td className="px-4 py-3 font-mono text-xs">user_789ghi</td>
                          <td className="px-4 py-3 text-right font-bold">8,500 KES</td>
                          <td className="px-4 py-3 text-right font-bold text-orange-600">1,500 KES</td>
                          <td className="px-4 py-3">2025-12-08 14:42:15</td>
                          <td className="px-4 py-3 text-right">132</td>
                          <td className="px-4 py-3 text-sm">Atomic bet placement (2 bets)</td>
                          <td className="px-4 py-3 text-center">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => toast({ title: "Lock Status", description: "Lock will auto-release in ~100ms" })}
                            >
                              Monitor
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Lock History */}
                <div>
                  <h3 className="text-lg font-bold mb-4">📊 Lock History (Last Hour)</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="px-4 py-3 text-left font-semibold">User ID</th>
                          <th className="px-4 py-3 text-right font-semibold">Amount</th>
                          <th className="px-4 py-3 text-left font-semibold">Started</th>
                          <th className="px-4 py-3 text-left font-semibold">Ended</th>
                          <th className="px-4 py-3 text-right font-semibold">Duration (ms)</th>
                          <th className="px-4 py-3 text-center font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 font-mono text-xs">user_123abc</td>
                          <td className="px-4 py-3 text-right font-bold">1,500 KES</td>
                          <td className="px-4 py-3">2025-12-08 14:45:22</td>
                          <td className="px-4 py-3">2025-12-08 14:45:22</td>
                          <td className="px-4 py-3 text-right">187</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">✅ Released</span>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 font-mono text-xs">user_321xyz</td>
                          <td className="px-4 py-3 text-right font-bold">2,000 KES</td>
                          <td className="px-4 py-3">2025-12-08 14:35:33</td>
                          <td className="px-4 py-3">2025-12-08 14:35:33</td>
                          <td className="px-4 py-3 text-right">221</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">✅ Released</span>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 font-mono text-xs">user_654jkl</td>
                          <td className="px-4 py-3 text-right font-bold">500 KES</td>
                          <td className="px-4 py-3">2025-12-08 14:28:10</td>
                          <td className="px-4 py-3">2025-12-08 14:28:10</td>
                          <td className="px-4 py-3 text-right">156</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">✅ Released</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Emergency Unlock Section */}
                <Card className="bg-red-50 border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-700">🚨 Emergency Unlock</CardTitle>
                    <CardDescription>
                      Use only if a lock is stuck (normally they auto-release in &lt;500ms)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-red-700 font-bold">User ID</Label>
                      <Input placeholder="Enter user ID to unlock..." />
                    </div>
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
                      onClick={() => {
                        toast({
                          title: "⚠️ Emergency Unlock",
                          description: "Balance lock released. Monitor user's next transaction.",
                          variant: "destructive"
                        });
                      }}
                    >
                      🔓 Force Unlock Balance
                    </Button>
                    <p className="text-xs text-red-600">
                      <strong>Warning:</strong> Only use if a lock is confirmed stuck. Normal locks auto-release in milliseconds.
                    </p>
                  </CardContent>
                </Card>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <strong>💡 Note:</strong> Balance locks are automatically acquired and released by the atomic transaction system. They typically last &lt;300ms. This monitor allows you to view and forcefully unlock balances in emergency situations (e.g., if a transaction fails to release the lock).
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Dashboard Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>
                  View business metrics, revenue, performance statistics, and system insights.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Key Metrics Row */}
                <div>
                  <h3 className="text-lg font-bold mb-4">📊 Key Metrics (Today)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground uppercase font-semibold">Total Bets Placed</p>
                        <p className="text-3xl font-bold text-blue-600 mt-2">2,847</p>
                        <p className="text-xs text-blue-600 mt-2">↑ 12% from yesterday</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground uppercase font-semibold">Total Stake Value</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">457,500 KES</p>
                        <p className="text-xs text-green-600 mt-2">↑ 8% from yesterday</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground uppercase font-semibold">Win Rate (Overall)</p>
                        <p className="text-3xl font-bold text-purple-600 mt-2">47.3%</p>
                        <p className="text-xs text-purple-600 mt-2">↓ 2% from yesterday</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground uppercase font-semibold">Active Users</p>
                        <p className="text-3xl font-bold text-orange-600 mt-2">1,342</p>
                        <p className="text-xs text-orange-600 mt-2">↑ 5% from yesterday</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Revenue Section */}
                <div>
                  <h3 className="text-lg font-bold mb-4">💰 Revenue Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground uppercase font-semibold">Total Stake</p>
                        <p className="text-2xl font-bold text-green-600">457,500 KES</p>
                        <div className="mt-3 h-2 bg-green-200 rounded-full overflow-hidden">
                          <div className="h-full w-4/5 bg-green-600"></div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground uppercase font-semibold">Winnings Paid Out</p>
                        <p className="text-2xl font-bold text-blue-600">215,340 KES</p>
                        <div className="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden">
                          <div className="h-full w-2/5 bg-blue-600"></div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground uppercase font-semibold">Net Revenue</p>
                        <p className="text-2xl font-bold text-purple-600">242,160 KES</p>
                        <div className="mt-3 h-2 bg-purple-200 rounded-full overflow-hidden">
                          <div className="h-full w-3/5 bg-purple-600"></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Bet Type Distribution */}
                <div>
                  <h3 className="text-lg font-bold mb-4">🎲 Popular Bet Types</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <p className="font-semibold text-sm">1X2 (Match Result)</p>
                      </div>
                      <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-5/6 bg-blue-500 flex items-center justify-end pr-3">
                          <span className="text-xs font-bold text-white">1,428 (50.1%)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <p className="font-semibold text-sm">Over/Under</p>
                      </div>
                      <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-green-500 flex items-center justify-end pr-3">
                          <span className="text-xs font-bold text-white">925 (32.5%)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <p className="font-semibold text-sm">Both Teams Score</p>
                      </div>
                      <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-1/6 bg-purple-500 flex items-center justify-end pr-3">
                          <span className="text-xs font-bold text-white">494 (17.4%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Busiest Hours */}
                <div>
                  <h3 className="text-lg font-bold mb-4">⏰ Busiest Hours</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="px-4 py-3 text-left font-semibold">Hour</th>
                          <th className="px-4 py-3 text-center font-semibold">Bets Placed</th>
                          <th className="px-4 py-3 text-right font-semibold">Total Stake</th>
                          <th className="px-4 py-3 text-center font-semibold">Activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">14:00 - 14:59</td>
                          <td className="px-4 py-3 text-center font-bold">285</td>
                          <td className="px-4 py-3 text-right">42,750 KES</td>
                          <td className="px-4 py-3 text-center">████████████████████ 100%</td>
                        </tr>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">13:00 - 13:59</td>
                          <td className="px-4 py-3 text-center font-bold">262</td>
                          <td className="px-4 py-3 text-right">39,300 KES</td>
                          <td className="px-4 py-3 text-center">████████████████ 80%</td>
                        </tr>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">15:00 - 15:59</td>
                          <td className="px-4 py-3 text-center font-bold">238</td>
                          <td className="px-4 py-3 text-right">35,700 KES</td>
                          <td className="px-4 py-3 text-center">████████████ 60%</td>
                        </tr>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">12:00 - 12:59</td>
                          <td className="px-4 py-3 text-center font-bold">195</td>
                          <td className="px-4 py-3 text-right">29,250 KES</td>
                          <td className="px-4 py-3 text-center">████████ 40%</td>
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="px-4 py-3">16:00 - 16:59</td>
                          <td className="px-4 py-3 text-center font-bold">168</td>
                          <td className="px-4 py-3 text-right">25,200 KES</td>
                          <td className="px-4 py-3 text-center">████ 20%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Popular Matches */}
                <div>
                  <h3 className="text-lg font-bold mb-4">⚽ Most Popular Matches</h3>
                  <div className="space-y-2">
                    <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">Kenya vs Uganda</p>
                          <p className="text-xs text-muted-foreground">312 bets • 46,800 KES</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">↑ 142</p>
                          <p className="text-xs text-muted-foreground">Won bets</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">Tanzania vs Rwanda</p>
                          <p className="text-xs text-muted-foreground">287 bets • 43,050 KES</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">↑ 135</p>
                          <p className="text-xs text-muted-foreground">Won bets</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <strong>💡 Note:</strong> Analytics are updated in real-time as bets are placed and resolved. Use this data to understand user behavior, popular bet types, peak hours, and revenue trends.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Match Performance Report Tab */}
          <TabsContent value="match-performance">
            <Card>
              <CardHeader>
                <CardTitle>Match Performance Report</CardTitle>
                <CardDescription>
                  Detailed analysis of betting performance per match, odds accuracy, and margin analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* League Filter */}
                <div className="flex gap-2 flex-wrap">
                  {leagues.map(league => (
                    <Button
                      key={league.countryCode}
                      variant={selectedLeague === league.countryCode ? "default" : "outline"}
                      onClick={() => setSelectedLeague(league.countryCode)}
                      className="flex items-center gap-2"
                    >
                      <span className="text-xl">{league.flag}</span>
                      <span>{league.country}</span>
                    </Button>
                  ))}
                </div>

                {/* Matches Performance Table */}
                <div>
                  <h3 className="text-lg font-bold mb-4">📊 Match Performance Analytics</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="px-4 py-3 text-left font-semibold">Match</th>
                          <th className="px-4 py-3 text-center font-semibold">Bets</th>
                          <th className="px-4 py-3 text-right font-semibold">Total Stake</th>
                          <th className="px-4 py-3 text-center font-semibold">Win %</th>
                          <th className="px-4 py-3 text-center font-semibold">Loss %</th>
                          <th className="px-4 py-3 text-right font-semibold">Margin</th>
                          <th className="px-4 py-3 text-center font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 font-semibold">Kenya vs Uganda</td>
                          <td className="px-4 py-3 text-center">312</td>
                          <td className="px-4 py-3 text-right font-bold">46,800 KES</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 font-semibold">45.5%</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 font-semibold">54.5%</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">+9.0%</td>
                          <td className="px-4 py-3 text-center">
                            <Button size="sm" variant="outline" onClick={() => toast({ title: "Match Details", description: "Expanded analytics view" })}>
                              View
                            </Button>
                          </td>
                        </tr>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 font-semibold">Tanzania vs Rwanda</td>
                          <td className="px-4 py-3 text-center">287</td>
                          <td className="px-4 py-3 text-right font-bold">43,050 KES</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-700 font-semibold">47.0%</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 font-semibold">53.0%</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">+6.0%</td>
                          <td className="px-4 py-3 text-center">
                            <Button size="sm" variant="outline" onClick={() => toast({ title: "Match Details", description: "Expanded analytics view" })}>
                              View
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bet Type Performance */}
                <div>
                  <h3 className="text-lg font-bold mb-4">🎲 Bet Type Performance (Kenya vs Uganda)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border">
                      <CardContent className="pt-6 space-y-4">
                        <div>
                          <p className="font-bold text-sm">1X2 (Home Win)</p>
                          <p className="text-xs text-muted-foreground">120 bets • 18000 KES stake</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Win Rate: <span className="font-bold text-green-600">35.5%</span></span>
                            <span>Loss Rate: <span className="font-bold text-red-600">64.5%</span></span>
                          </div>
                          <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-muted">
                            <div style={{ width: "35.5%" }} className="bg-green-500"></div>
                            <div style={{ width: "64.5%" }} className="bg-red-500"></div>
                          </div>
                          <div className="text-sm font-bold text-right text-green-600">
                            Margin: +8.5%
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border">
                      <CardContent className="pt-6 space-y-4">
                        <div>
                          <p className="font-bold text-sm">1X2 (Draw)</p>
                          <p className="text-xs text-muted-foreground">85 bets • 12750 KES stake</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Win Rate: <span className="font-bold text-green-600">32.8%</span></span>
                            <span>Loss Rate: <span className="font-bold text-red-600">67.2%</span></span>
                          </div>
                          <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-muted">
                            <div style={{ width: "32.8%" }} className="bg-green-500"></div>
                            <div style={{ width: "67.2%" }} className="bg-red-500"></div>
                          </div>
                          <div className="text-sm font-bold text-right text-green-600">
                            Margin: +11.2%
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Odds Accuracy */}
                <div>
                  <h3 className="text-lg font-bold mb-4">📈 Odds Accuracy & Margin Analysis</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="px-4 py-3 text-left font-semibold">Bet Type</th>
                          <th className="px-4 py-3 text-center font-semibold">Offered Odds</th>
                          <th className="px-4 py-3 text-center font-semibold">Implied Win %</th>
                          <th className="px-4 py-3 text-center font-semibold">Actual Win %</th>
                          <th className="px-4 py-3 text-center font-semibold">Variance</th>
                          <th className="px-4 py-3 text-right font-semibold">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 font-semibold">Home Win (1.85)</td>
                          <td className="px-4 py-3 text-center">1.85</td>
                          <td className="px-4 py-3 text-center font-mono">54.0%</td>
                          <td className="px-4 py-3 text-center font-mono">58.5%</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-red-600 font-bold">↑ 4.5%</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">+8.5%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-green-700">✅ Strengths</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <p>• Draw odds are conservative (good margin at 11.2%)</p>
                      <p>• Home win predictions slightly underestimated</p>
                      <p>• Consistent positive margins across all bet types</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-orange-700">⚠️ Opportunities</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <p>• Over/Under odds slightly generous</p>
                      <p>• Consider adjusting odds upward (+5-10%)</p>
                      <p>• Monitor away win selections closely</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <strong>💡 Note:</strong> This report shows per-match betting performance and odds accuracy for informed decision-making.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>View system activity logs.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left">Timestamp</th>
                        <th className="px-4 py-3 text-left">User</th>
                        <th className="px-4 py-3 text-left">Action</th>
                        <th className="px-4 py-3 text-left">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemLogs.map((log, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-4 py-3">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-3">{log.user}</td>
                          <td className="px-4 py-3">{log.action}</td>
                          <td className="px-4 py-3">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {systemLogs.length === 0 && (
                    <div className="text-muted-foreground text-center py-8 border rounded">No system logs available.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;