
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { getBetsFromSupabase } from "@/lib/supabaseBets";
import { leagues } from "@/data/leagues";
import { Button } from "@/components/ui/button";


const Results = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [selectedLeague, setSelectedLeague] = useState(leagues[0].countryCode);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndBets = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      setUserId(uid);
      if (uid) {
        const { data, error } = await getBetsFromSupabase(uid);
        if (!error && data) setBets(data);
        else setBets([]);
      } else {
        setBets([]);
      }
      setLoading(false);
    };
    fetchUserAndBets();
  }, []);

  // Filter bets by selected league and finished matches
  const now = new Date();
  const leagueTeams = leagues.find(l => l.countryCode === selectedLeague)?.teams.map(t => t.shortName) || [];
  const finishedBets = bets.filter(bet =>
    leagueTeams.includes(bet.homeTeam) &&
    leagueTeams.includes(bet.awayTeam) &&
    new Date(bet.kickoffTime) < now
  );

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex flex-col gap-4 mb-4">
        <Button variant="ghost" onClick={() => navigate("/")} className="w-fit">
          ← Back to Betting
        </Button>
        <div className="flex gap-2 flex-wrap">
          {leagues.map(league => (
            <button
              key={league.countryCode}
              className={`px-3 py-1 rounded ${selectedLeague === league.countryCode ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
              onClick={() => setSelectedLeague(league.countryCode)}
            >
              <span className="text-xl">{league.flag}</span> {league.country}
            </button>
          ))}
        </div>
      </div>
      <h2 className="text-lg font-bold mb-4">My Results</h2>
      {loading ? (
        <div className="text-muted-foreground">Loading your results...</div>
      ) : finishedBets.length === 0 ? (
        <div className="text-muted-foreground">No results yet for this league.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {finishedBets.map((bet, idx) => (
            <div key={idx} className="bg-card rounded shadow p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span>{bet.homeTeam}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span>{bet.awayTeam}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Kickoff: {new Date(bet.kickoffTime).toLocaleString()}
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span>Bet Type: <span className="font-bold">{bet.type}</span></span>
                <span>Selection: <span className="font-bold">{bet.selection}</span></span>
                <span>Odds: <span className="font-bold">{bet.odds}</span></span>
                <span>Stake: <span className="font-bold">{bet.stake}</span></span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span>Status: <span className="font-bold">{bet.status || "Pending"}</span></span>
                <span>Outcome: <span className="font-bold">{bet.outcome ? bet.outcome.toUpperCase() : "-"}</span></span>
                {bet.payout && (
                  <span>Payout: <span className="font-bold">{bet.payout}</span></span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Results;
