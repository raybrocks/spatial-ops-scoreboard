import { MatchData } from '@/types/match';

export interface TeamOverallStanding {
  name: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  totalPlayerScore: number;
  totalPlayerScoreAgainst: number;
  playerScoreDiff: number;
  tdmMatches: number;
  tdmWins: number;
  tdmLosses: number;
  tdmScore: number;
  tdmScoreAgainst: number;
  ctfMatches: number;
  ctfWins: number;
  ctfLosses: number;
  ctfFlags: number;
  ctfFlagsAgainst: number;
  ctfPlayerScore: number;
  kills: number;
  deaths: number;
}

function getTeamPlayerTotals(match: MatchData, teamNum: 1 | 2) {
  const players = (match.playerStats || []).filter((p) => p.team === teamNum);
  const scoreSum = players.reduce((sum, p) => sum + (p.score || 0), 0);
  const killsSum = players.reduce((sum, p) => sum + (p.kills || 0), 0);
  const deathsSum = players.reduce((sum, p) => sum + (p.deaths || 0), 0);
  return { scoreSum, killsSum, deathsSum, hasPlayers: players.length > 0 };
}

/**
 * Computes combined team standings across team-vs-team modes (TDM + CTF).
 * Ranking order:
 * 1. Total wins (descending)
 * 2. Draws (descending)
 * 3. Player score differential across all matches (descending)
 * 4. Total player score across all matches (descending)
 * 5. Total kills (descending)
 */
export function computeTeamOverallStandings(matches: MatchData[]): TeamOverallStanding[] {
  const teamMatches = matches.filter((m) => {
    const mode = m.gameMode?.toLowerCase() || '';
    return mode !== 'survival' && mode !== 'freeforall';
  });

  const summary: Record<string, TeamOverallStanding> = {};

  const ensureTeam = (name: string) => {
    if (!summary[name]) {
      summary[name] = {
        name,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        totalPlayerScore: 0,
        totalPlayerScoreAgainst: 0,
        playerScoreDiff: 0,
        tdmMatches: 0,
        tdmWins: 0,
        tdmLosses: 0,
        tdmScore: 0,
        tdmScoreAgainst: 0,
        ctfMatches: 0,
        ctfWins: 0,
        ctfLosses: 0,
        ctfFlags: 0,
        ctfFlagsAgainst: 0,
        ctfPlayerScore: 0,
        kills: 0,
        deaths: 0,
      };
    }
    return summary[name];
  };

  teamMatches.forEach((match) => {
    const mode = match.gameMode?.toLowerCase() || '';
    const isCtf = mode === 'capturetheflag';

    const t1Name = (match.team1Name || 'Team 1').trim().toUpperCase();
    const t2Name = (match.team2Name || 'Team 2').trim().toUpperCase();

    const t1 = ensureTeam(t1Name);
    const t2 = ensureTeam(t2Name);

    t1.matches += 1;
    t2.matches += 1;

    const p1 = getTeamPlayerTotals(match, 1);
    const p2 = getTeamPlayerTotals(match, 2);

    // For TDM, teamScore === sum(player.score). For CTF, player.score puts kills & flags on the same 100pt scale.
    const t1MatchPlayerScore = p1.hasPlayers ? p1.scoreSum : (isCtf ? 0 : (match.team1Score || 0));
    const t2MatchPlayerScore = p2.hasPlayers ? p2.scoreSum : (isCtf ? 0 : (match.team2Score || 0));

    t1.totalPlayerScore += t1MatchPlayerScore;
    t1.totalPlayerScoreAgainst += t2MatchPlayerScore;
    t2.totalPlayerScore += t2MatchPlayerScore;
    t2.totalPlayerScoreAgainst += t1MatchPlayerScore;

    t1.kills += p1.killsSum;
    t1.deaths += p1.deathsSum;
    t2.kills += p2.killsSum;
    t2.deaths += p2.deathsSum;

    const s1 = match.team1Score || 0;
    const s2 = match.team2Score || 0;

    if (s1 > s2) {
      t1.wins += 1;
      t2.losses += 1;
    } else if (s2 > s1) {
      t2.wins += 1;
      t1.losses += 1;
    } else {
      t1.draws += 1;
      t2.draws += 1;
    }

    if (isCtf) {
      t1.ctfMatches += 1;
      t2.ctfMatches += 1;
      t1.ctfFlags += s1;
      t1.ctfFlagsAgainst += s2;
      t2.ctfFlags += s2;
      t2.ctfFlagsAgainst += s1;
      t1.ctfPlayerScore += t1MatchPlayerScore;
      t2.ctfPlayerScore += t2MatchPlayerScore;
      if (s1 > s2) {
        t1.ctfWins += 1;
        t2.ctfLosses += 1;
      } else if (s2 > s1) {
        t2.ctfWins += 1;
        t1.ctfLosses += 1;
      }
    } else {
      t1.tdmMatches += 1;
      t2.tdmMatches += 1;
      t1.tdmScore += s1;
      t1.tdmScoreAgainst += s2;
      t2.tdmScore += s2;
      t2.tdmScoreAgainst += s1;
      if (s1 > s2) {
        t1.tdmWins += 1;
        t2.tdmLosses += 1;
      } else if (s2 > s1) {
        t2.tdmWins += 1;
        t1.tdmLosses += 1;
      }
    }
  });

  return Object.values(summary)
    .map((team) => ({
      ...team,
      playerScoreDiff: team.totalPlayerScore - team.totalPlayerScoreAgainst,
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.draws !== a.draws) return b.draws - a.draws;
      if (b.playerScoreDiff !== a.playerScoreDiff) return b.playerScoreDiff - a.playerScoreDiff;
      if (b.totalPlayerScore !== a.totalPlayerScore) return b.totalPlayerScore - a.totalPlayerScore;
      return b.kills - a.kills;
    });
}
