import { Share2, User, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NotificationBell from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRealtimeBalance } from "@/hooks/useRealtimeBalance";

const BettingHeader = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [showHelp, setShowHelp] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    const fetchUserAndBalance = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      
      // Fetch balance from Supabase
      if (data.user?.id) {
        const balanceRes = await supabase
          .from("users")
          .select("balance")
          .eq("id", data.user.id);

        if (balanceRes.data && balanceRes.data.length > 0) {
          setBalance(balanceRes.data[0].balance || 0);
        }
      }
    };
    
    fetchUserAndBalance();
  }, []);

  // Subscribe to realtime balance updates via Supabase
  const { balance: realtimeBalance, isConnected } = useRealtimeBalance({
    userId: user?.id,
    onBalanceChange: (newBalance) => {
      console.log("✨ Balance updated in real-time:", newBalance);
      setBalance(newBalance);
    },
    onError: (error) => {
      console.error("Balance subscription error:", error);
      setConnectionStatus('disconnected');
    }
  });

  // Use realtime balance if available
  useEffect(() => {
    if (realtimeBalance !== null && realtimeBalance !== undefined) {
      setBalance(realtimeBalance);
    }
  }, [realtimeBalance]);

  // Update connection status
  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const appName = "BetXPesa";

    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: appName,
          text: "Join me on BetXPesa - Place live betting predictions and win!",
          url: shareUrl,
        });
      } catch (err) {
        console.log("Share cancelled or failed:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage("Link copied to clipboard!");
        setTimeout(() => setShareMessage(""), 2000);
      } catch (err) {
        alert("Failed to copy link. Please try again.");
      }
    }
  };
  return (
    <header className="bg-background border-b border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-foreground" onClick={() => setShowHelp(true)} title="How to place bets">
            <HelpCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-foreground" onClick={handleShare} title="Share this app">
            <Share2 className="w-5 h-5" />
          </Button>
          {shareMessage && <span className="text-xs text-green-600 font-medium">{shareMessage}</span>}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">
              <span className="text-primary">Bet</span>
              <span className="text-accent">XPesa</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <NotificationBell />
          <ThemeToggle />
          <div className="flex flex-col gap-1">
            <div className="border-2 border-balance-border rounded-md px-4 py-2 bg-background flex items-center gap-2">
              <span className="text-primary font-bold">💰 KES {balance.toLocaleString()}</span>
              <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} title={connectionStatus === 'connected' ? 'Realtime sync connected' : 'Realtime sync disconnected'}></span>
            </div>
            <span className="text-xs text-muted-foreground text-center">💱 1 USD = KES 130</span>
          </div>
          <button
            className="relative w-10 h-10 rounded-full bg-accent flex items-center justify-center text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 hover:scale-105 transition"
            onClick={() => navigate(user ? "/account" : "/login")}
            title={user ? "Account" : "Login"}
            aria-label={user ? "Account" : "Login"}
          >
            {user ? (
              <Avatar>
                <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || "User"} />
                <AvatarFallback>{user.email ? user.email[0].toUpperCase() : <User className="w-5 h-5" />}</AvatarFallback>
              </Avatar>
            ) : (
              <User className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Help Modal */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How to Place Bets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-bold mb-2">1. Select a Country</h3>
              <p className="text-muted-foreground">Choose a country/league from the tabs at the top to view available matches.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">2. Watch the Match</h3>
              <p className="text-muted-foreground">Wait for the pre-match countdown to end, then matches will simulate live with a timer showing the match progress.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">3. Select a Match</h3>
              <p className="text-muted-foreground">Click on a match card to view all available bet types and odds.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">4. Choose Bet Type & Selection</h3>
              <p className="text-muted-foreground">Pick a bet type (1X2, BTTS, Over/Under) and select your prediction with the odds shown.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">5. Enter Stake</h3>
              <p className="text-muted-foreground">Enter your stake amount (minimum KES 50) and click "Add to Betslip".</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">6. Place Bet</h3>
              <p className="text-muted-foreground">Open the betslip (bottom right), review your selections, and click "Place Bet" to confirm.</p>
            </div>
            <div className="bg-accent/10 p-3 rounded">
              <p className="text-xs"><strong>Tip:</strong> You must be logged in and have sufficient balance to place bets.</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded border border-blue-500/30">
              <p className="text-xs"><strong>Need Help?</strong> Contact support at <strong>+1 (423) 432-6984</strong> or visit our <a href="/contact" className="text-blue-400 hover:underline">Contact page</a>.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default BettingHeader;
