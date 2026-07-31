export interface PlayerStat {
  playerName: string;
  team: number;
  kills: number;
  deaths: number;
  assists: number;
  objectives: number;
  score: number;
  isBot: boolean;
}

export interface MatchData {
  matchId: string;
  gameMode: string;
  lifeMode: string;
  matchStartTimestamp: string;
  lastUpdateTimestamp: string;
  waveIndex: number;
  playerMaxLives: number;
  teamMaxLives: number;
  team1Deaths: number;
  team2Deaths: number;
  team1Score: number;
  team2Score: number;
  team1Name?: string;
  team2Name?: string;
  playerStats: PlayerStat[];
}
