'use client';

import { useMemo } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Trophy, Crosshair } from 'lucide-react';
import { useMatchData } from '@/hooks/use-match-data';
import { PlayerStat, MatchData } from '@/types/match';

const formatGameMode = (mode?: string, lifeMode?: string) => {
  if (!mode) return '';
  let displayMode = mode;
  const lower = mode.toLowerCase();
  if (lower === 'teamdeathmatch') displayMode = 'TEAM DEATHMATCH';
  else if (lower === 'freeforall') displayMode = 'FREE FOR ALL';
  else displayMode = mode.toUpperCase();

  if (lifeMode && lower === 'survival') {
    let formattedLifeMode = lifeMode.toUpperCase();
    if (formattedLifeMode === 'TEAMLIVES') formattedLifeMode = 'TEAM LIVES';
    if (formattedLifeMode === 'INDIVIDUALLIVES') formattedLifeMode = 'INDIVIDUAL LIVES';
    
    return `${displayMode} (${formattedLifeMode})`;
  }

  return displayMode;
};

const getMatchDuration = (start?: string, end?: string) => {
  if (!start || !end) return null;
  try {
    const mins = differenceInMinutes(parseISO(end), parseISO(start));
    if (isNaN(mins) || mins < 0) return null;
    return `${mins} MIN`;
  } catch {
    return null;
  }
};

export default function TVPage() {
  const { matches, isLoaded } = useMatchData();

  const todayDate = useMemo(() => {
    return format(new Date(), 'yyyy-MM-dd');
  }, []);

  const sortedMatches = useMemo(() => {
    let filtered = [...matches].filter(m => m.matchStartTimestamp);
    filtered = filtered.filter(m => format(parseISO(m.matchStartTimestamp), 'yyyy-MM-dd') === todayDate);
    // Sort NEWEST FIRST for TV display so latest are at the top
    return filtered.sort((a, b) => new Date(b.matchStartTimestamp).getTime() - new Date(a.matchStartTimestamp).getTime());
  }, [matches, todayDate]);

  const { teamDeathmatchMatches, survivalMatches } = useMemo(() => {
    const tdm: MatchData[] = [];
    const survival: MatchData[] = [];
    
    sortedMatches.forEach(m => {
      const mode = m.gameMode?.toLowerCase() || '';
      if (mode === 'survival') {
        survival.push(m);
      } else if (mode !== 'freeforall') {
        tdm.push(m);
      }
    });
    return { teamDeathmatchMatches: tdm, survivalMatches: survival };
  }, [sortedMatches]);

  const teamDeathmatchSummary = useMemo(() => {
    const summary: Record<string, { matches: number, totalScore: number, wins: number }> = {};
    
    teamDeathmatchMatches.forEach(match => {
      const t1 = match.team1Name || 'Team 1';
      const t2 = match.team2Name || 'Team 2';
      
      if (!summary[t1]) summary[t1] = { matches: 0, totalScore: 0, wins: 0 };
      if (!summary[t2]) summary[t2] = { matches: 0, totalScore: 0, wins: 0 };
      
      summary[t1].matches += 1;
      summary[t1].totalScore += match.team1Score;
      if (match.team1Score > match.team2Score) summary[t1].wins += 1;
      
      summary[t2].matches += 1;
      summary[t2].totalScore += match.team2Score;
      if (match.team2Score > match.team1Score) summary[t2].wins += 1;
    });
    
    return Object.entries(summary)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [teamDeathmatchMatches]);

  const survivalPlayerSummary = useMemo(() => {
    const summary: Record<string, { score: number, kills: number, deaths: number, matches: number, wins: number }> = {};
    
    survivalMatches.forEach(match => {
      const t1Stats = match.playerStats.filter(p => p.team === 1 && !p.isBot).sort((a, b) => b.score - a.score);
      const winner = t1Stats.length > 0 && t1Stats[0].score > 0 ? t1Stats[0].playerName : null;

      match.playerStats.forEach(player => {
        if (player.team !== 1 || player.isBot) return; // Only team 1 players for Survival
        
        if (!summary[player.playerName]) {
          summary[player.playerName] = { score: 0, kills: 0, deaths: 0, matches: 0, wins: 0 };
        }

        summary[player.playerName].score += player.score;
        summary[player.playerName].kills += player.kills;
        summary[player.playerName].deaths += player.deaths || 0;
        summary[player.playerName].matches += 1;
        
        if (player.playerName === winner) {
          summary[player.playerName].wins += 1;
        }
      });
    });

    return Object.entries(summary)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.score - a.score);
  }, [survivalMatches]);

  if (!isLoaded) return <div className="h-screen bg-[#0A0A0A] flex items-center justify-center text-cyan-500 font-bold tracking-widest uppercase">Loading Live Data...</div>;

  const showSplitScreen = teamDeathmatchMatches.length > 0 && survivalMatches.length > 0;
  const gridColsClass = showSplitScreen ? 'grid-cols-2' : 'grid-cols-1 max-w-7xl mx-auto';

  return (
    <div className="h-screen bg-[#0A0A0A] text-gray-200 font-sans p-6 md:p-12 overflow-hidden flex flex-col">
      <div className={`w-full grid ${gridColsClass} gap-12 h-full flex-1 overflow-hidden`}>
        
        {/* TEAM DEATHMATCH SECTION */}
        {teamDeathmatchMatches.length > 0 && (
          <div className="flex flex-col h-full overflow-hidden">
            <h1 className="text-3xl font-black tracking-widest uppercase text-yellow-500 mb-8 flex items-center gap-4 shrink-0 justify-center">
              <Trophy className="w-10 h-10" />
              TEAM DEATHMATCH
            </h1>
            
            {/* TDM Leaderboard */}
            {teamDeathmatchSummary.length > 0 && (
              <div className="mb-10 shrink-0">
                <h2 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-4 text-center">Tournament Leaderboard</h2>
                <div className="grid grid-cols-2 gap-4">
                  {teamDeathmatchSummary.map((team, idx) => (
                    <div key={team.name} className={`bg-[#121212] border ${idx === 0 ? 'border-yellow-500/50 bg-yellow-950/20 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'border-white/10'} rounded-xl p-4 text-center transition-all`}>
                      <div className="text-sm text-gray-400 uppercase tracking-widest font-bold truncate">
                        {team.name} {idx === 0 && <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">1ST</span>}
                      </div>
                      <div className="text-5xl font-black text-white mt-2">{team.totalScore}</div>
                      <div className="text-xs text-gray-500 mt-2 uppercase tracking-widest font-bold">
                        <span className="text-gray-300">{team.wins}</span> Win{team.wins !== 1 && 's'} <span className="mx-2 opacity-30">|</span> <span className="text-gray-300">{team.matches}</span> Match{team.matches !== 1 && 'es'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TDM Matches */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
               <h2 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-4 text-center shrink-0">Latest Matches</h2>
               <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden space-y-4 pb-12">
                 {teamDeathmatchMatches.map(match => (
                   <TeamDeathmatchCard key={match.matchId} match={match} />
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* SURVIVAL SECTION */}
        {survivalMatches.length > 0 && (
          <div className="flex flex-col h-full overflow-hidden">
            <h1 className="text-3xl font-black tracking-widest uppercase text-cyan-400 mb-8 flex items-center gap-4 shrink-0 justify-center">
              <Crosshair className="w-10 h-10" />
              SURVIVAL MODE
            </h1>
            
            {/* Survival Leaderboard */}
            {survivalPlayerSummary.length > 0 && (
              <div className="mb-10 shrink-0">
                <h2 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-4 text-center">Top Players</h2>
                <div className="grid grid-cols-2 gap-4">
                  {survivalPlayerSummary.slice(0, 4).map((player, idx) => (
                    <div key={player.name} className={`bg-[#121212] border ${idx === 0 ? 'border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_20px_rgba(34,211,238,0.15)]' : 'border-white/10'} rounded-xl p-4 text-center transition-all`}>
                      <div className="text-sm text-gray-400 uppercase tracking-widest font-bold truncate">
                        {player.name} {idx === 0 && <span className="ml-2 text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">1ST</span>}
                      </div>
                      <div className="text-5xl font-black text-white mt-2">{player.score}</div>
                      <div className="text-xs text-gray-500 mt-2 uppercase tracking-widest font-bold">
                         <span className="text-gray-300">{player.wins}</span> Win{player.wins !== 1 && 's'} <span className="mx-2 opacity-30">|</span> <span className="text-gray-300">{player.kills}</span> Kills
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Survival Matches */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
               <h2 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-4 text-center shrink-0">Latest Matches</h2>
               <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden space-y-4 pb-12">
                 {survivalMatches.map(match => (
                   <SurvivalCard key={match.matchId} match={match} />
                 ))}
               </div>
            </div>
          </div>
        )}
        
        {sortedMatches.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center text-gray-500 h-64 border border-dashed border-white/10 rounded-2xl">
            <Trophy className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-xl font-bold uppercase tracking-widest">Waiting for matches...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamDeathmatchCard({ match }: { match: MatchData }) {
  const team1Won = match.team1Score > match.team2Score;
  const team2Won = match.team2Score > match.team1Score;

  return (
    <div className="bg-[#121212] rounded-xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#0D0D0D] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-bold text-sm tracking-wider">
            {format(parseISO(match.matchStartTimestamp), 'HH:mm')}
          </span>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 uppercase tracking-widest">
              {formatGameMode(match.gameMode, match.lifeMode)}
            </span>
            {getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp) && (
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 uppercase tracking-widest">
                {getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 flex justify-between items-center gap-4 shrink-0">
        {/* Team 1 (Blue) */}
        <div className={`flex-1 ${team1Won ? 'bg-blue-900/30 border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-blue-950/10 border border-blue-500/10 opacity-70'} rounded-lg p-3 flex flex-col items-center relative overflow-hidden transition-all`}>
          {team1Won && <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg shadow-md tracking-widest uppercase">Winner</div>}
          <div className="text-blue-400 font-bold uppercase text-xs flex items-center justify-center gap-1.5 z-10 w-full truncate mt-1">
            <span className={`truncate ${team1Won ? 'text-white' : ''}`}>{match.team1Name || 'Team 1'}</span>
            <span className="shrink-0 text-[8px] bg-blue-500/20 border border-blue-500/30 px-1 py-0.5 rounded text-blue-300">BLUE</span>
          </div>
          <div className={`text-5xl font-black mt-2 z-10 ${team1Won ? 'text-white' : 'text-blue-200/50'}`}>{match.team1Score}</div>
        </div>
        
        <div className="text-gray-600 font-black text-sm uppercase tracking-widest">VS</div>
        
        {/* Team 2 (Orange) */}
        <div className={`flex-1 ${team2Won ? 'bg-orange-900/30 border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'bg-orange-950/10 border border-orange-500/10 opacity-70'} rounded-lg p-3 flex flex-col items-center relative overflow-hidden transition-all`}>
          {team2Won && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg shadow-md tracking-widest uppercase">Winner</div>}
          <div className="text-orange-400 font-bold uppercase text-xs flex items-center justify-center gap-1.5 z-10 w-full truncate mt-1">
            <span className={`truncate ${team2Won ? 'text-white' : ''}`}>{match.team2Name || 'Team 2'}</span>
            <span className="shrink-0 text-[8px] bg-orange-500/20 border border-orange-500/30 px-1 py-0.5 rounded text-orange-300">ORANGE</span>
          </div>
          <div className={`text-5xl font-black mt-2 z-10 ${team2Won ? 'text-white' : 'text-orange-200/50'}`}>{match.team2Score}</div>
        </div>
      </div>
      <div className="px-4 pb-4 flex gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-w-0">
            <MiniTeamTable stats={match.playerStats.filter(p => p.team === 1)} color="blue" />
          </div>
          <div className="flex-1 min-w-0">
            <MiniTeamTable stats={match.playerStats.filter(p => p.team === 2)} color="orange" />
          </div>
      </div>
    </div>
  );
}

function SurvivalCard({ match }: { match: MatchData }) {
  return (
    <div className="bg-[#121212] rounded-xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#0D0D0D] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-bold text-sm tracking-wider">
            {format(parseISO(match.matchStartTimestamp), 'HH:mm')}
          </span>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 uppercase tracking-widest">
              {formatGameMode(match.gameMode, match.lifeMode)}
            </span>
            {getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp) && (
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 uppercase tracking-widest">
                {getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 flex justify-center items-center gap-4 shrink-0 bg-cyan-950/20 border-b border-white/5">
        <div className="flex flex-col items-center">
          <span className="text-cyan-400 font-bold uppercase tracking-widest text-sm">Survival Mode {getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp)}</span>
          {match.waveIndex !== undefined && <span className="text-5xl font-black text-white mt-2">Wave {match.waveIndex + 1}</span>}
          <span className="text-xs text-gray-500 uppercase mt-2">Team Score: <span className="text-white font-bold">{match.team1Score}</span></span>
        </div>
      </div>
      <div className="px-4 pb-4 flex gap-4 flex-1 min-h-0 overflow-hidden mt-4">
          <div className="flex-1 min-w-0">
            <MiniTeamTable stats={match.playerStats.filter(p => p.team === 1)} color="blue" isSurvival={true} />
          </div>
      </div>
    </div>
  );
}

function MiniTeamTable({ stats, color, isSurvival }: { stats: PlayerStat[], color: 'blue' | 'orange', isSurvival?: boolean }) {
  const sortedStats = [...stats].sort((a, b) => b.score - a.score);
  const textColor = color === 'blue' ? 'text-blue-400' : 'text-orange-400';
  const rowHighlight = color === 'blue' ? 'bg-blue-500/10' : 'bg-orange-500/10';
  const mvpBadge = color === 'blue' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400';

  return (
    <div className="bg-white/5 rounded-md overflow-hidden h-full border border-white/5">
      <table className="w-full text-left table-fixed">
        <tbody className="divide-y divide-white/5 text-[10px]">
          {sortedStats.slice(0, 4).map((player, idx) => {
            const isMVP = idx === 0 && player.score > 0;
            return (
              <tr key={idx} className={`${isMVP && !player.isBot ? rowHighlight : player.isBot ? 'opacity-70 italic' : ''}`}>
                <td className="py-1.5 px-2 font-medium text-gray-300 truncate w-[60%]">
                  <div className="flex items-center gap-1 w-full truncate">
                    <span className={`truncate ${isMVP && !player.isBot ? 'font-bold text-white' : ''}`}>{player.playerName}</span>
                    {isMVP && !player.isBot && <span className={`shrink-0 text-[6px] px-1 rounded uppercase tracking-wider font-bold ${mvpBadge}`}>{isSurvival ? 'WINNER' : 'MVP'}</span>}
                  </div>
                </td>
                <td className={`py-1.5 px-1 font-mono text-center font-bold ${textColor}`}>{player.score}</td>
                <td className="py-1.5 px-1 text-center text-gray-500">{player.kills}K</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
