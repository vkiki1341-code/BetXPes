import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const History = () => {
  const [user, setUser] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
    // Fetch bets, promos, matches from localStorage or Supabase tables if available
    setBets(JSON.parse(localStorage.getItem("betting_bets") || "[]"));
    setPromos(JSON.parse(localStorage.getItem("betting_promos") || "[]"));
    setMatches([]); // Extend to fetch match history if stored
  }, []);

  return (
    <div className="max-w-2xl mx-auto mt-12 p-6 bg-card rounded shadow">
      <h2 className="text-xl font-bold mb-4">Account History</h2>
      <div className="mb-6">
        <h3 className="font-bold mb-2">Bets</h3>
        {bets.length === 0 ? <div className="text-muted-foreground">No bets placed.</div> : (
          <ul className="space-y-2">
            {bets.map((bet, idx) => (
              <li key={idx} className="p-2 border rounded">
                <div>Match: {bet.matchId}</div>
                <div>Type: {bet.type}</div>
                <div>Stake: {bet.stake}</div>
                <div>Status: {bet.status}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mb-6">
        <h3 className="font-bold mb-2">Promos</h3>
        {promos.length === 0 ? <div className="text-muted-foreground">No promos used.</div> : (
          <ul className="space-y-2">
            {promos.map((promo, idx) => (
              <li key={idx} className="p-2 border rounded">
                <div>Promo: {promo.title}</div>
                <div>Description: {promo.description}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="font-bold mb-2">Match Activity</h3>
        {matches.length === 0 ? <div className="text-muted-foreground">No match history.</div> : (
          <ul className="space-y-2">
            {matches.map((match, idx) => (
              <li key={idx} className="p-2 border rounded">
                <div>{match.homeTeam} vs {match.awayTeam}</div>
                <div>Score: {match.homeScore} - {match.awayScore}</div>
                <div>Status: {match.status}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default History;
