import { MatchData } from '@/types/match';
import { Tournament } from '@/types/tournament';
import { format, parseISO } from 'date-fns';

export interface TournamentGroup {
  tournament: Tournament | null;
  id: string;
  title: string;
  startTime: string;
  matches: MatchData[];
}

export function getTournamentTitle(t: Tournament): string {
  const cleanName = t.name?.trim();
  return cleanName ? `${t.startTime} ${cleanName}` : `${t.startTime} Turnering`;
}

export function getTournamentsForDate(tournaments: Tournament[], dateStr: string): Tournament[] {
  return tournaments
    .filter((t) => t.date === dateStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function groupMatchesByTournament(
  matches: MatchData[],
  dayTournaments: Tournament[]
): TournamentGroup[] {
  // Sort tournaments ascending by start time
  const sortedTournaments = [...dayTournaments].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  if (sortedTournaments.length === 0) {
    return [
      {
        tournament: null,
        id: 'all-matches',
        title: 'Dagens kamper',
        startTime: '00:00',
        matches,
      },
    ];
  }

  const groups: TournamentGroup[] = [];

  // Prepare buckets for each tournament
  const tournamentBuckets = new Map<string, MatchData[]>();
  sortedTournaments.forEach((t) => {
    tournamentBuckets.set(t.id, []);
  });

  const beforeFirstTournamentMatches: MatchData[] = [];

  // Assign each match to its tournament based on start time
  matches.forEach((match) => {
    if (!match.matchStartTimestamp) return;

    let matchTime = '00:00';
    try {
      matchTime = format(parseISO(match.matchStartTimestamp), 'HH:mm');
    } catch {
      matchTime = '00:00';
    }

    // Find the latest tournament that started at or before the match time
    let assignedTournament: Tournament | null = null;
    for (let i = sortedTournaments.length - 1; i >= 0; i--) {
      if (matchTime >= sortedTournaments[i].startTime) {
        assignedTournament = sortedTournaments[i];
        break;
      }
    }

    if (assignedTournament) {
      tournamentBuckets.get(assignedTournament.id)?.push(match);
    } else {
      // Match was played before the earliest tournament of the day
      beforeFirstTournamentMatches.push(match);
    }
  });

  // If there are matches before the first tournament, add them as a separate group
  if (beforeFirstTournamentMatches.length > 0) {
    groups.push({
      tournament: null,
      id: 'before-first',
      title: `Tidligere kamper (før ${sortedTournaments[0].startTime})`,
      startTime: '00:00',
      matches: beforeFirstTournamentMatches,
    });
  }

  // Add the tournament groups in chronological order
  sortedTournaments.forEach((t) => {
    groups.push({
      tournament: t,
      id: t.id,
      title: getTournamentTitle(t),
      startTime: t.startTime,
      matches: tournamentBuckets.get(t.id) || [],
    });
  });

  return groups;
}
