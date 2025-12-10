import { useEffect, useState } from "react";
import { regenerateMatchesIfNeeded } from "@/utils/matchGenerator";

interface TimeSlotsProps {
  countryCode?: string;
}

const TimeSlots = ({ countryCode = "en" }: TimeSlotsProps) => {
  const [slots, setSlots] = useState<string[]>([]);
  const [liveSlot, setLiveSlot] = useState<string | null>(null);

  useEffect(() => {
    const updateSlots = () => {
      const now = new Date();
      const newSlots: string[] = [];
      const intervalMinutes = 2;

      for (let i = 1; i <= 8; i++) {
        const future = new Date(now.getTime() + i * intervalMinutes * 60000);
        const hours = future.getHours().toString().padStart(2, "0");
        const minutes = future.getMinutes().toString().padStart(2, "0");
        newSlots.push(`${hours}:${minutes}`);
      }

      setSlots(newSlots);

      // Find the closest match kickoff time to now (live match)
      const matches = regenerateMatchesIfNeeded(countryCode);
      const nowTime = now.getTime();
      let closest: string | null = null;
      let minDiff = Infinity;
      matches.forEach((m) => {
        const kickoff = new Date(m.kickoffTime).getTime();
        const diff = Math.abs(kickoff - nowTime);
        if (diff < minDiff) {
          minDiff = diff;
          const hours = new Date(m.kickoffTime).getHours().toString().padStart(2, "0");
          const minutes = new Date(m.kickoffTime).getMinutes().toString().padStart(2, "0");
          closest = `${hours}:${minutes}`;
        }
      });
      setLiveSlot(closest);
    };

    updateSlots();
    const interval = setInterval(updateSlots, 60000);

    return () => clearInterval(interval);
  }, [countryCode]);

  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto">
      {slots.map((time) => (
        <button
          key={time}
          className={`px-4 py-2 rounded-md font-bold text-sm whitespace-nowrap transition-colors ${
            time === liveSlot
              ? "bg-primary text-primary-foreground border-2 border-green-500"
              : "bg-time-slot text-foreground hover:bg-muted"
          }`}
        >
          {time}
        </button>
      ))}
    </div>
  );
};

export default TimeSlots;
