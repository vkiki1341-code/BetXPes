import { Match } from "@/types/betting";
import CountdownTimer from "./CountdownTimer";
import { saveBetToSupabase } from "@/lib/supabaseBets";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";

interface MatchRowProps {
  match: Match;
  onExpired: () => void;
}


const betTypes = [
  { type: "1X2", selections: ["1", "X", "2"], odds: ["2.10", "3.20", "2.80"] },
  { type: "BTTS", selections: ["Yes", "No"], odds: ["1.90", "1.90"] },
  { type: "OV/UN 1.5", selections: ["Over 1.5", "Under 1.5"], odds: ["1.60", "2.20"] },
  { type: "OV/UN 2.5", selections: ["Over 2.5", "Under 2.5"], odds: ["2.00", "1.80"] },
  { type: "1X2 & BTTS", selections: ["1 & Yes", "1 & No", "X & Yes", "X & No", "2 & Yes", "2 & No"], odds: ["3.50", "4.00", "5.00", "5.50", "3.80", "4.20"] },
  { type: "1X2 & OV", selections: ["1 & Over", "1 & Under", "X & Over", "X & Under", "2 & Over", "2 & Under"], odds: ["3.80", "4.10", "5.20", "5.60", "4.00", "4.30"] },
];

const MatchRow = ({ match, onExpired }: MatchRowProps) => {
  const [stake, setStake] = useState("");
  const [betPlaced, setBetPlaced] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  const handlePlaceBet = async (type: string, selection: string, odds: string) => {
    if (!stake || isNaN(Number(stake)) || Number(stake) <= 0) return;
    if (!userId) {
      console.error('User not authenticated');
      return;
    }

    const bet = {
      type,
      selection,
      odds,
      stake: Number(stake),
      homeTeam: match.homeTeam.shortName,
      awayTeam: match.awayTeam.shortName,
      kickoffTime: match.kickoffTime.toISOString(),
      status: "Pending",
    };
    
    await saveBetToSupabase(bet, userId);
    setBetPlaced(true);
    setTimeout(() => setBetPlaced(false), 1500);
    setStake("");
  };


  // Helper to get logo path
  const getLogoPath = (team: any) => {
    // English teams are in /src/assets/teams/{team-name}.png
    // Others are in /src/assets/teams/{league-folder}/{team-name}.png
    const name = team.name || team.shortName;
    const lower = name.toLowerCase().replace(/\s|\.|'/g, "-").replace(/fc|f\.c\.|cfc|sc|ac|as|ss|us|udinese|calcio|club|united|stars|leopards|mah\w+/gi, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    // Try English first
    let path = `/src/assets/teams/${lower}.png`;
    // Try league folders
    if (!team.countryCode || team.countryCode === "en") return path;
    let folder = "";
    if (team.countryCode === "de") folder = "Bundesliga";
    if (team.countryCode === "es") folder = "La Liga";
    if (team.countryCode === "it") folder = "Serie A";
    if (team.countryCode === "ke") folder = "KPL";
    if (folder) path = `/src/assets/teams/${folder}/${name.replace(/\s|\.|'/g, "-")}.png`;
    return path;
  };

  return (
    <div className="p-4 bg-bet-card rounded-lg mb-2">
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center gap-2">
          <img
            src={getLogoPath(match.homeTeam)}
            alt={match.homeTeam.shortName}
            className="w-8 h-8 object-contain rounded-full border"
            onError={e => (e.currentTarget.style.display = "none")}
          />
          <span className="text-foreground font-medium">{match.homeTeam.shortName}</span>
        </div>
        <div className="flex items-center gap-2">
          <img
            src={getLogoPath(match.awayTeam)}
            alt={match.awayTeam.shortName}
            className="w-8 h-8 object-contain rounded-full border"
            onError={e => (e.currentTarget.style.display = "none")}
          />
          <span className="text-foreground font-medium">{match.awayTeam.shortName}</span>
        </div>
        <CountdownTimer targetTime={match.kickoffTime} onExpired={onExpired} />
      </div>
      <div className="mb-2">
        <input
          type="number"
          min="1"
          placeholder="Stake"
          value={stake}
          onChange={e => setStake(e.target.value)}
          className="border rounded px-2 py-1 w-24 text-sm"
        />
        {betPlaced && <span className="ml-2 text-green-600 font-bold">Bet Placed!</span>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {betTypes.map((bt) => (
          <div key={bt.type} className="bg-muted p-2 rounded">
            <div className="font-bold mb-1">{bt.type}</div>
            <div className="flex flex-wrap gap-2">
              {bt.selections.map((sel, idx) => (
                <button
                  key={sel}
                  className="bg-bet-button hover:bg-bet-button-hover px-3 py-2 rounded-md text-xs font-bold"
                  onClick={() => handlePlaceBet(bt.type, sel, bt.odds[idx])}
                >
                  {sel} <span className="ml-1">({bt.odds[idx]})</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchRow;
