import { useState } from "react";
import BettingHeader from "@/components/BettingHeader";
import LanguageSelector from "@/components/LanguageSelector";
import NavigationTabs from "@/components/NavigationTabs";
import ChallengerBanner from "@/components/ChallengerBanner";
import TimeSlots from "@/components/TimeSlots";
import BettingFilters from "@/components/BettingFilters";
import MatchList from "@/components/MatchList";
import UserNotifications from "@/components/UserNotifications";

const Index = () => {
  const [selectedCountry, setSelectedCountry] = useState("en");

  return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-background py-0 px-0">
          <UserNotifications />
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl p-10 flex flex-col items-center">
            <div className="text-5xl font-extrabold text-primary mb-2 tracking-tight">Match<span className="text-accent">day</span></div>
            <div className="text-muted-foreground text-lg mb-6 text-center">Welcome to the ultimate sports betting experience. Sign up or log in to get started!</div>
            <div className="flex gap-4 w-full justify-center">
              <a href="/signup" className="px-6 py-2 rounded-lg bg-primary text-white font-semibold text-lg shadow hover:bg-primary/90 transition">Sign Up</a>
              <a href="/login" className="px-6 py-2 rounded-lg border border-primary text-primary font-semibold text-lg shadow hover:bg-primary hover:text-white transition">Login</a>
            </div>
          </div>
        </div>
  );
};

export default Index;
