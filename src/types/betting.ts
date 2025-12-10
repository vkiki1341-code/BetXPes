export interface Team {
  name: string;
  shortName: string;
  icon: string;
  logo?: any;
}

export interface League {
  country: string;
  countryCode: string;
  flag: string;
  name: string;
  teams: Team[];
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  kickoffTime: Date;
  overOdds: string;
  underOdds: string;
  outcome?: "over" | "under";
}

export interface AdminSettings {
  autoGenerate: boolean;
  generationInterval: number; // minutes
  manualOutcomes: { [matchId: string]: { [betType: string]: string } };
  fixtureOverrides?: { [matchId: string]: { homeGoals: number; awayGoals: number; winner?: string } };
}
