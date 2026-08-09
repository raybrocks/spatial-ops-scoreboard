import { MatchData } from '@/types/match';
import { format, parseISO } from 'date-fns';

export type HighscoreLevel = 'YEAR' | 'MONTH' | 'DAY' | 'NONE';

export function getSurvivalHighscores(matches: MatchData[]): Map<string, HighscoreLevel> {
  const survivalMatches = matches.filter(m => m.gameMode?.toLowerCase() === 'survival');
  
  // Group matches
  const byYear = new Map<string, MatchData[]>();
  const byMonth = new Map<string, MatchData[]>();
  const byDay = new Map<string, MatchData[]>();

  survivalMatches.forEach(match => {
    if (!match.matchStartTimestamp) return;
    try {
      const date = parseISO(match.matchStartTimestamp);
      const year = format(date, 'yyyy');
      const month = format(date, 'yyyy-MM');
      const day = format(date, 'yyyy-MM-dd');

      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(match);

      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month)!.push(match);

      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(match);
    } catch (e) {
      // Ignore invalid dates
    }
  });

  const getHighestMatchId = (matchesList: MatchData[]): string | null => {
    if (matchesList.length === 0) return null;
    let highest = matchesList[0];
    for (const m of matchesList) {
      if (m.team1Score > highest.team1Score) {
        highest = m;
      } else if (m.team1Score === highest.team1Score) {
        // If tie, pick the one that achieved it most recently
        try {
          if (new Date(m.matchStartTimestamp).getTime() > new Date(highest.matchStartTimestamp).getTime()) {
             highest = m;
          }
        } catch(e) {}
      }
    }
    return highest.matchId;
  };

  const yearlyIds = new Set<string>();
  const monthlyIds = new Set<string>();
  const dailyIds = new Set<string>();

  byYear.forEach(list => {
    const id = getHighestMatchId(list);
    if (id) yearlyIds.add(id);
  });

  byMonth.forEach(list => {
    const id = getHighestMatchId(list);
    if (id) monthlyIds.add(id);
  });

  byDay.forEach(list => {
    const id = getHighestMatchId(list);
    if (id) dailyIds.add(id);
  });

  const resultMap = new Map<string, HighscoreLevel>();

  survivalMatches.forEach(match => {
    if (yearlyIds.has(match.matchId)) {
      resultMap.set(match.matchId, 'YEAR');
    } else if (monthlyIds.has(match.matchId)) {
      resultMap.set(match.matchId, 'MONTH');
    } else if (dailyIds.has(match.matchId)) {
      resultMap.set(match.matchId, 'DAY');
    } else {
      resultMap.set(match.matchId, 'NONE');
    }
  });

  return resultMap;
}
