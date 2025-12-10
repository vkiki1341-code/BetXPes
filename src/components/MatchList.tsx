import { useEffect, useState } from "react";
import MatchRow from "./MatchRow";
import { Match } from "@/types/betting";
import { regenerateMatchesIfNeeded } from "@/utils/matchGenerator";

interface MatchListProps {
  countryCode: string;
}

const MatchList = ({ countryCode }: MatchListProps) => {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    const loadMatches = () => {
      const generatedMatches = regenerateMatchesIfNeeded(countryCode);
      setMatches(generatedMatches);
    };

    loadMatches();
    const interval = setInterval(loadMatches, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [countryCode]);

  const handleMatchExpired = () => {
    const generatedMatches = regenerateMatchesIfNeeded(countryCode);
    setMatches(generatedMatches);
  };

  return (
    <div className="px-4 pb-6">
      {matches.map((match) => (
        <MatchRow key={match.id} match={match} onExpired={handleMatchExpired} />
      ))}
    </div>
  );
};

export default MatchList;
