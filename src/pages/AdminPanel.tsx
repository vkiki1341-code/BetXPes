import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, DollarSign, AlertCircle, BarChart3, Search, Filter, Loader, Check, X, Gamepad2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [betsData, setBetsData] = useState([]);
  const [financialData, setFinancialData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
  const [newBetStatus, setNewBetStatus] = useState<string>("");
  const [updatingBetId, setUpdatingBetId] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        
        // Check if user is admin (you can add admin verification here)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError("Please log in to access admin panel");
          setLoading(false);
          return;
        }

        // ===== FETCH REAL USERS DATA =====
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, email, balance, created_at")
          .order("created_at", { ascending: false })
          .limit(100);

        if (usersError) {
          console.error("❌ Users fetch error:", usersError);
        }

        console.log("✅ Users from Supabase:", usersData?.length || 0);

        // ===== FETCH REAL BETS DATA =====
        const { data: betsData, error: betsError } = await supabase
          .from("bets")
          .select("id, user_id, amount, odds, status")
          .limit(1000);

        if (betsError) {
          console.error("❌ Bets fetch error:", betsError);
        }

        console.log("✅ Bets from Supabase:", betsData?.length || 0);
        setBetsData(betsData || []);

        // ===== FETCH REAL NOTIFICATIONS (as disputes/support tickets) =====
        const { data: notificationsData, error: notificationsError } = await supabase
          .from("notifications")
          .select("id, user_id, type, title, message, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (notificationsError) {
          console.error("❌ Notifications fetch error:", notificationsError);
        }

        console.log("✅ Notifications from Supabase:", notificationsData?.length || 0);

        // ===== CALCULATE FINANCIAL METRICS FROM REAL DATA =====
        const totalBetsAmount = betsData?.reduce((sum, bet) => sum + (Number(bet.amount) || 0), 0) || 0;
        const winningBets = betsData?.filter(b => b.status === "won") || [];
        const losingBets = betsData?.filter(b => b.status === "lost") || [];
        const pendingBets = betsData?.filter(b => b.status === "pending") || [];
        
        const totalPayouts = winningBets.reduce((sum, bet) => sum + ((Number(bet.odds) - 1) * Number(bet.amount)), 0);
        const totalUserBalance = usersData?.reduce((sum, user) => sum + (Number(user.balance) || 0), 0) || 0;
        const platformNetRevenue = totalBetsAmount - totalPayouts;

        setFinancialData([
          { 
            label: "Total Revenue", 
            value: `KES ${Math.round(totalBetsAmount).toLocaleString()}`, 
            change: `${betsData?.length} bets`
          },
          { 
            label: "Total Bets Placed", 
            value: betsData?.length || 0, 
            change: `Pending: ${pendingBets.length}`
          },
          { 
            label: "User Payouts", 
            value: `KES ${Math.round(totalPayouts).toLocaleString()}`, 
            change: `${winningBets.length} wins`
          },
          { 
            label: "Platform Net Revenue", 
            value: `KES ${Math.round(platformNetRevenue).toLocaleString()}`, 
            change: `${losingBets.length} losses`
          }
        ]);

        console.log("📊 Financial metrics calculated:", {
          totalBetsAmount,
          totalPayouts,
          platformNetRevenue,
          totalUserBalance,
          userCount: usersData?.length
        });

        // ===== FORMAT USERS DATA FROM SUPABASE (NO DUMMY DATA) =====
        // Get user bet counts for each user
        const userBetCounts: Record<string, number> = {};
        betsData?.forEach(bet => {
          userBetCounts[bet.user_id] = (userBetCounts[bet.user_id] || 0) + 1;
        });

        const formattedUsers = (usersData || []).map((user) => ({
          id: user.id,
          name: user.email?.split('@')[0] || user.email || "User",
          email: user.email || "N/A",
          joined: user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A",
          status: "Active",
          bets: userBetCounts[user.id] || 0,  // REAL count from bets table
          balance: `KES ${Math.round(Number(user.balance) || 0).toLocaleString()}`  // REAL balance
        }));

        setUsers(formattedUsers);
        console.log("✅ Formatted users:", formattedUsers.length);

        // ===== FORMAT NOTIFICATIONS AS DISPUTES/TICKETS (REAL DATA) =====
        const formattedDisputes = (notificationsData || []).map((notif) => ({
          id: notif.id,
          user: notif.user_id ? `User ${notif.user_id.substring(0, 8)}` : "Unknown",
          type: notif.type || "Support",
          title: notif.title || "Notification",
          message: notif.message || "No details",
          date: notif.created_at ? new Date(notif.created_at).toLocaleDateString() : "N/A",
          status: "Open"  // All new notifications are "Open"
        }));

        setDisputes(formattedDisputes);
        console.log("✅ Formatted disputes/notifications:", formattedDisputes.length);

      } catch (err) {
        console.error("❌ Error fetching admin data:", err);
        setError("Failed to load admin data from Supabase");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  // ===== ADMIN FUNCTION: Update bet status =====
  const updateBetStatus = async (betId: string, newStatus: string) => {
    try {
      setUpdatingBetId(betId);
      
      // Update bet status in database
      const { error } = await supabase
        .from("bets")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", betId);
      
      if (error) {
        alert(`❌ Error updating bet: ${error.message}`);
        return;
      }
      
      // Update local state
      setBetsData(prevBets =>
        prevBets.map(bet =>
          bet.id === betId ? { ...bet, status: newStatus } : bet
        )
      );
      
      // Clear selection
      setSelectedBetId(null);
      setNewBetStatus("");
      
      console.log(`✅ Bet ${betId} updated to status: ${newStatus}`);
      alert(`✅ Bet updated successfully to: ${newStatus}`);
    } catch (err) {
      console.error("❌ Error updating bet:", err);
      alert(`❌ Failed to update bet: ${err}`);
    } finally {
      setUpdatingBetId(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApproveDispute = (id) => {
    setDisputes(disputes.map(d => d.id === id ? { ...d, status: "Resolved" } : d));
  };

  const handleRejectDispute = (id) => {
    setDisputes(disputes.filter(d => d.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900/20 to-slate-950 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
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
                Admin Panel
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl leading-relaxed">
              Manage users, disputes, and financial reporting for the BetXPesa platform.
            </p>
          </div>

          {/* Financial Overview */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {financialData.map((item, index) => (
              <div
                key={index}
                className="relative group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-all duration-500"></div>
                
                <div className="relative bg-slate-900/50 border border-slate-700/50 group-hover:border-purple-400/50 rounded-2xl p-6 transition-all duration-300">
                  <p className="text-gray-400 text-sm mb-2">{item.label}</p>
                  <p className="text-3xl font-bold text-white mb-2">{item.value}</p>
                  <span className="text-green-400 text-sm font-semibold">{item.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Tab Navigation */}
          <div className="mb-8 flex gap-4 border-b border-slate-700/50 overflow-x-auto">
            {[
              { id: "users", label: "User Management", icon: Users },
              { id: "bets", label: "Bet Management", icon: Gamepad2 },
              { id: "disputes", label: "Disputes", icon: AlertCircle },
              { id: "analytics", label: "Analytics", icon: BarChart3 }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-purple-400 text-purple-400"
                      : "border-transparent text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 text-purple-400 animate-spin" />
              <span className="ml-4 text-gray-300">Loading admin data...</span>
            </div>
          )}

          {!loading && (
            <>
          {/* Users Tab */}
          {activeTab === "users" && (
            <div>
              <div className="mb-6 flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
                <Button variant="outline" className="border-purple-400/50 text-purple-400 hover:bg-purple-500/10 flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filter
                </Button>
              </div>

              <div className="relative bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/50 border-b border-slate-700/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Email</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Joined</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Bets</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Balance</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-300">{user.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{user.email}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{user.joined}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              user.status === "Verified"
                                ? "bg-green-500/20 text-green-400"
                                : user.status === "Pending"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">{user.bets}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-purple-400">{user.balance}</td>
                          <td className="px-6 py-4 text-sm">
                            <Button size="sm" variant="outline" className="border-purple-400/50 text-purple-400 hover:bg-purple-500/10 text-xs">
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Bet Management Tab */}
          {activeTab === "bet-management" && (
            <div>
              <div className="mb-6 flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search bets by ID or user..."
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
                <select className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-gray-300 focus:outline-none focus:border-purple-400">
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {betsData.length === 0 ? (
                <div className="relative bg-slate-900/50 border border-slate-700/50 rounded-2xl p-8 text-center">
                  <p className="text-gray-400">No bets placed yet.</p>
                </div>
              ) : (
                <div className="relative bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Bet ID</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User Email</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Match</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Amount</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Odds</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Current Status</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">New Status</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {betsData.map((bet) => (
                          <tr
                            key={bet.id}
                            className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-6 py-4 text-sm text-gray-400 font-mono">{bet.id.substring(0, 8)}...</td>
                            <td className="px-6 py-4 text-sm text-gray-300">{bet.user_email || "Unknown"}</td>
                            <td className="px-6 py-4 text-sm text-gray-300">{bet.match_id?.substring(0, 8) || "N/A"}...</td>
                            <td className="px-6 py-4 text-sm text-purple-400 font-semibold">${bet.amount?.toFixed(2) || "0.00"}</td>
                            <td className="px-6 py-4 text-sm text-gray-300">{bet.odds?.toFixed(2) || "0.00"}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                bet.status === "pending"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : bet.status === "won"
                                  ? "bg-green-500/20 text-green-400"
                                  : bet.status === "lost"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-gray-500/20 text-gray-400"
                              }`}>
                                {bet.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {selectedBetId === bet.id ? (
                                <select
                                  value={newBetStatus}
                                  onChange={(e) => setNewBetStatus(e.target.value)}
                                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-purple-400"
                                >
                                  <option value="">Select status...</option>
                                  <option value="pending">Pending</option>
                                  <option value="won">Won</option>
                                  <option value="lost">Lost</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              ) : (
                                <span className="text-gray-500 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {selectedBetId === bet.id ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => updateBetStatus(bet.id, newBetStatus)}
                                    disabled={!newBetStatus || updatingBetId === bet.id}
                                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs disabled:opacity-50"
                                  >
                                    {updatingBetId === bet.id ? "..." : "Save"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedBetId(null);
                                      setNewBetStatus("");
                                    }}
                                    variant="outline"
                                    className="border-gray-600 text-gray-300 hover:bg-gray-800/50 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedBetId(bet.id)}
                                  variant="outline"
                                  className="border-purple-400/50 text-purple-400 hover:bg-purple-500/10 text-xs"
                                >
                                  Edit
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disputes Tab */}
          {activeTab === "disputes" && (
            <div>
              {disputes.length === 0 ? (
                <div className="relative bg-slate-900/50 border border-slate-700/50 rounded-2xl p-8 text-center">
                  <p className="text-gray-400">No support tickets or notifications at this time.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {disputes.map((dispute) => (
                    <div
                      key={dispute.id}
                      className="relative bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-400/30 transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-2">{dispute.title}</h3>
                          <p className="text-gray-400 text-sm mb-2">{dispute.message}</p>
                          <p className="text-gray-500 text-xs">User: {dispute.user} | Type: {dispute.type} | Date: {dispute.date}</p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ml-4 ${
                          dispute.status === "Open"
                            ? "bg-red-500/20 text-red-400"
                            : dispute.status === "In Progress"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                        }`}>
                          {dispute.status}
                        </span>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs">Resolve</Button>
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800/50 text-xs">Archive</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div>
              <div className="relative bg-slate-900/50 border border-slate-700/50 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Platform Analytics</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Bet Status Distribution</h3>
                    <div className="space-y-3">
                      {(() => {
                        const total = betsData?.length || 1;
                        const won = betsData?.filter(b => b.status === "won").length || 0;
                        const lost = betsData?.filter(b => b.status === "lost").length || 0;
                        const pending = betsData?.filter(b => b.status === "pending").length || 0;
                        const cancelled = betsData?.filter(b => b.status === "cancelled").length || 0;
                        
                        const wonPct = Math.round((won / total) * 100);
                        const lostPct = Math.round((lost / total) * 100);
                        const pendingPct = Math.round((pending / total) * 100);
                        const cancelledPct = Math.round((cancelled / total) * 100);
                        
                        return (
                          <>
                            <div>
                              <div className="flex justify-between mb-2">
                                <span className="text-green-400">Won Bets</span>
                                <span className="text-green-400 font-semibold">{wonPct}% ({won})</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${wonPct}%` }}></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between mb-2">
                                <span className="text-red-400">Lost Bets</span>
                                <span className="text-red-400 font-semibold">{lostPct}% ({lost})</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-red-600 h-2 rounded-full" style={{ width: `${lostPct}%` }}></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between mb-2">
                                <span className="text-blue-400">Pending Bets</span>
                                <span className="text-blue-400 font-semibold">{pendingPct}% ({pending})</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pendingPct}%` }}></div>
                              </div>
                            </div>
                            {cancelledPct > 0 && (
                              <div>
                                <div className="flex justify-between mb-2">
                                  <span className="text-gray-400">Cancelled Bets</span>
                                  <span className="text-gray-400 font-semibold">{cancelledPct}% ({cancelled})</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2">
                                  <div className="bg-gray-600 h-2 rounded-full" style={{ width: `${cancelledPct}%` }}></div>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">User Statistics</h3>
                    <div className="space-y-4">
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Total Registered Users</p>
                        <p className="text-2xl font-bold text-purple-400">{users.length}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Total Bets Placed</p>
                        <p className="text-2xl font-bold text-blue-400">{betsData?.length || 0}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Avg Bets per User</p>
                        <p className="text-2xl font-bold text-cyan-400">{Math.round((betsData?.length || 0) / (users.length || 1))}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Support Tickets</p>
                        <p className="text-2xl font-bold text-yellow-400">{disputes.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
            </>
          )}
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
      `}</style>
    </div>
  );
}

