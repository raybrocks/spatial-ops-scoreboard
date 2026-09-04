'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Trophy } from 'lucide-react';
import { useMatchData } from '@/hooks/use-match-data';
import { useTournaments } from '@/hooks/use-tournaments';
import { getTournamentsForDate, getTournamentTitle, groupMatchesByTournament } from '@/lib/tournaments';
import { getSurvivalHighscores } from '@/lib/survival-highscores';
import { HighscoreBadge } from '@/components/HighscoreBadge';
import { PlayerStat, MatchData } from '@/types/match';

const formatGameMode = (mode?: string) => {
  if (!mode) return '';
  let displayMode = mode;
  const lower = mode.toLowerCase();
  if (lower === 'teamdeathmatch') displayMode = 'TEAM DEATHMATCH';
  else if (lower === 'freeforall') displayMode = 'FREE FOR ALL';
  else displayMode = mode.toUpperCase();
  return displayMode;
};

const formatLifeMode = (lifeMode?: string) => {
  if (!lifeMode) return '';
  let formattedLifeMode = lifeMode.toUpperCase();
  if (formattedLifeMode === 'TEAMLIVES') formattedLifeMode = 'TEAM LIVES';
  if (formattedLifeMode === 'INDIVIDUALLIVES') formattedLifeMode = 'INDIVIDUAL LIVES';
  return formattedLifeMode;
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

export default function SpectatorPage() {
  const { matches, isLoaded: matchesLoaded } = useMatchData();
  const { tournaments, isLoaded: tournamentsLoaded } = useTournaments();
  const isLoaded = matchesLoaded && tournamentsLoaded;
  const [liveMatch, setLiveMatch] = useState<MatchData | null>(null);

  useEffect(() => {
    const fetchLiveMatch = async () => {
      try {
        const res = await fetch('http://localhost:7770/matchsnapshot');
        if (!res.ok) {
          setLiveMatch(null);
          return;
        }
        const data = await res.json();
        if (data && data.matchId) {
          const isFinished = matches.some((m) => m.matchId === data.matchId);
          if (isFinished) {
            setLiveMatch(null);
          } else {
            setLiveMatch(data);
          }
        } else {
          setLiveMatch(null);
        }
      } catch (err) {
        setLiveMatch(null);
      }
    };

    const interval = setInterval(fetchLiveMatch, 1000);
    return () => clearInterval(interval);
  }, [matches]);

  const params = useParams();
  const urlDate = params?.dateSlug?.[0] as string | undefined;

  const todayDate = useMemo(() => {
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
      return urlDate;
    }
    return format(new Date(), 'yyyy-MM-dd');
  }, [urlDate]);

  const dayTournaments = useMemo(() => {
    return getTournamentsForDate(tournaments, todayDate);
  }, [tournaments, todayDate]);

  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('latest');

  const dayMatches = useMemo(() => {
    return matches.filter(
      (m) => m.matchStartTimestamp && format(parseISO(m.matchStartTimestamp), 'yyyy-MM-dd') === todayDate
    );
  }, [matches, todayDate]);

  const tournamentGroups = useMemo(() => {
    return groupMatchesByTournament(dayMatches, dayTournaments);
  }, [dayMatches, dayTournaments]);

  const activeTournamentId = useMemo(() => {
    if (selectedTournamentId === 'all') return 'all';
    if (selectedTournamentId === 'latest') {
      if (dayTournaments.length > 0) {
        return dayTournaments[dayTournaments.length - 1].id;
      }
      return 'all';
    }
    const exists = dayTournaments.some((t) => t.id === selectedTournamentId);
    if (exists) return selectedTournamentId;
    if (dayTournaments.length > 0) return dayTournaments[dayTournaments.length - 1].id;
    return 'all';
  }, [selectedTournamentId, dayTournaments]);

  const sortedMatches = useMemo(() => {
    let filtered: MatchData[] = [];
    if (activeTournamentId === 'all' || dayTournaments.length === 0) {
      filtered = [...dayMatches];
    } else {
      const activeGroup = tournamentGroups.find((g) => g.id === activeTournamentId);
      filtered = activeGroup ? [...activeGroup.matches] : [];
    }
    return filtered.sort((a, b) => new Date(b.matchStartTimestamp).getTime() - new Date(a.matchStartTimestamp).getTime());
  }, [dayMatches, tournamentGroups, activeTournamentId, dayTournaments]);

  const survivalHighscores = useMemo(() => getSurvivalHighscores(matches), [matches]);

  const dailySummary = useMemo(() => {
    const summary: Record<string, { matches: number, totalScore: number, wins: number }> = {};

    sortedMatches.forEach(match => {
      const t1 = (match.team1Name || 'Team 1').toUpperCase();
      const t2 = (match.team2Name || 'Team 2').toUpperCase();
      
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
  }, [sortedMatches]);

  if (!isLoaded) return <div className="h-screen w-screen bg-[#0A0A0A]"></div>;

  const displayedMatch = liveMatch || (sortedMatches.length > 0 ? sortedMatches[0] : null);
  const isLive = !!liveMatch;
  const previousMatches = isLive ? sortedMatches.slice(0, 6) : sortedMatches.slice(1, 7);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0A0A0A] text-gray-200 font-sans pointer-events-none relative">
      
      {/* Top Bar: Overall Score & Tournament Selector */}
      {dailySummary.length > 0 && (
        <div className="absolute top-0 left-0 w-full p-4 flex justify-center items-start">
          <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-8 pointer-events-auto">
            <div className="flex items-center gap-4 pr-8 border-r border-white/10">
               <Trophy className="w-10 h-10 text-yellow-500" />
               <div>
                 <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Leaderboard</div>
                 <div className="text-base font-black text-white">{format(new Date(), 'dd.MM.yyyy')}</div>
                 {dayTournaments.length > 0 && (
                   <select
                     value={selectedTournamentId}
                     onChange={(e) => setSelectedTournamentId(e.target.value)}
                     className="mt-1 bg-white/10 border border-white/20 text-yellow-400 text-xs py-0.5 px-1.5 rounded outline-none cursor-pointer"
                   >
                     <option value="latest" className="bg-[#121212] text-yellow-400 font-bold">
                       ★ Aktiv turnering
                     </option>
                     {dayTournaments.map((t) => (
                       <option key={t.id} value={t.id} className="bg-[#121212] text-white">
                         {getTournamentTitle(t)}
                       </option>
                     ))}
                     <option value="all" className="bg-[#121212] text-gray-400">
                       Hele dagen (Alle)
                     </option>
                   </select>
                 )}
               </div>
            </div>
            
            <div className="flex gap-10">
              {dailySummary.slice(0, 4).map((team, idx) => (
                <div key={team.name} className="flex flex-col items-center">
                  <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
                    {team.name} {idx === 0 && <span className="bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded text-[9px]">1ST</span>}
                  </div>
                  <div className="text-4xl font-black text-white leading-none">{team.totalScore?.toLocaleString('no-NO')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right Sidebar: Details ongoing/last match & Results all matches */}
      <div className="absolute top-28 right-6 bottom-6 w-[480px] flex flex-col gap-4">
        
        {/* Live or Latest Match Details */}
        {displayedMatch && (
          <div className={`backdrop-blur-md border rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col shrink-0 ${isLive ? 'bg-black/85 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.25)]' : 'bg-black/70 border-white/10'}`}>
             <div className={`p-3.5 px-4 text-center border-b flex items-center justify-between ${isLive ? 'bg-red-950/60 border-red-500/30' : 'bg-gray-950/40 border-gray-500/20'}`}>
               <div className="flex items-center gap-2.5">
                 {isLive && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(239,68,68,1)]"></span>}
                 <span className={`text-sm uppercase tracking-widest font-black ${isLive ? 'text-red-400' : 'text-gray-200'}`}>
                   {isLive ? 'Live Match' : 'Latest Match'}
                 </span>
               </div>
               {isLive && (
                 <div className="bg-black/60 border border-red-500/40 px-3 py-0.5 rounded-lg text-sm font-mono font-black text-white tracking-wider flex items-center gap-1.5 shadow-sm">
                   <LiveClock matchStartTimestamp={displayedMatch.matchStartTimestamp} />
                 </div>
               )}
             </div>
             
             <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-300 font-bold text-sm tracking-wider">{format(parseISO(displayedMatch.matchStartTimestamp), 'HH:mm')}</span>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 rounded bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 uppercase tracking-widest">{formatGameMode(displayedMatch.gameMode)}</span>
                    {displayedMatch.gameMode?.toLowerCase() === 'survival' && displayedMatch.lifeMode && (
                      <span className="px-2.5 py-1 rounded bg-gray-900/40 border border-gray-500/30 text-xs font-semibold text-gray-200 uppercase tracking-widest">{formatLifeMode(displayedMatch.lifeMode)}</span>
                    )}
                    {!isLive && getMatchDuration(displayedMatch.matchStartTimestamp, displayedMatch.lastUpdateTimestamp) && (
                      <span className="text-xs text-gray-300 font-medium uppercase tracking-widest bg-white/10 px-2 py-1 rounded border border-white/10">
                        {getMatchDuration(displayedMatch.matchStartTimestamp, displayedMatch.lastUpdateTimestamp)}
                      </span>
                    )}
                  </div>
                </div>
                
                {displayedMatch.gameMode?.toLowerCase() === 'survival' ? (
                  <>
                     <div className={`flex justify-center items-center mb-5 border rounded-xl p-4 flex-col ${isLive ? 'bg-red-950/20 border-red-500/30' : 'bg-gray-950/20 border-gray-500/20'}`}>
                       <span className="text-gray-300 font-bold uppercase text-xs tracking-widest">
                         Survival {!isLive && getMatchDuration(displayedMatch.matchStartTimestamp, displayedMatch.lastUpdateTimestamp)}
                       </span>
                       {displayedMatch.waveIndex !== undefined && <span className="text-4xl font-black text-white mt-1">Wave {displayedMatch.waveIndex + 1}</span>}
                       <span className="text-xs text-gray-300 uppercase mt-1.5 font-medium">Team Score: <span className="text-white font-black text-sm">{displayedMatch.team1Score?.toLocaleString('no-NO')}</span></span>
                       {!isLive && (
                         <div className="mt-2.5">
                           <HighscoreBadge level={survivalHighscores.get(displayedMatch.matchId) || 'NONE'} />
                         </div>
                       )}
                     </div>
                    <div className="flex flex-col gap-3">
                      <MiniTeamTable stats={displayedMatch.playerStats.filter(p => p.team === 1)} color="blue" isSurvival={true} isLive={isLive} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-5 gap-3">
                      <div className={`flex flex-col items-center flex-1 min-w-0 rounded-xl p-3 relative overflow-hidden transition-all ${
                        !isLive && displayedMatch.team1Score > displayedMatch.team2Score 
                          ? 'bg-blue-900/40 border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]' 
                          : isLive
                          ? 'bg-blue-950/50 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                          : 'bg-blue-950/30 border border-blue-500/20 opacity-75'
                      }`}>
                         {!isLive && displayedMatch.team1Score > displayedMatch.team2Score && (
                           <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-bl shadow-md tracking-widest uppercase">
                             Win
                           </div>
                         )}
                         <span className={`text-xs font-bold uppercase truncate w-full text-center tracking-wider ${(!isLive && displayedMatch.team1Score > displayedMatch.team2Score) || isLive ? 'text-white' : 'text-blue-300'}`}>
                           {displayedMatch.team1Name || 'Team 1'}
                         </span>
                         <span className={`text-4xl font-black mt-1 z-10 ${(!isLive && displayedMatch.team1Score > displayedMatch.team2Score) || isLive ? 'text-white' : 'text-blue-200/60'}`}>
                           {displayedMatch.team1Score?.toLocaleString('no-NO')}
                         </span>
                      </div>
                      <div className="text-xs font-black text-gray-500 shrink-0 uppercase tracking-widest">VS</div>
                      <div className={`flex flex-col items-center flex-1 min-w-0 rounded-xl p-3 relative overflow-hidden transition-all ${
                        !isLive && displayedMatch.team2Score > displayedMatch.team1Score 
                          ? 'bg-orange-900/40 border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]' 
                          : isLive
                          ? 'bg-orange-950/50 border border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                          : 'bg-orange-950/30 border border-orange-500/20 opacity-75'
                      }`}>
                         {!isLive && displayedMatch.team2Score > displayedMatch.team1Score && (
                           <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-bl shadow-md tracking-widest uppercase">
                             Win
                           </div>
                         )}
                         <span className={`text-xs font-bold uppercase truncate w-full text-center tracking-wider ${(!isLive && displayedMatch.team2Score > displayedMatch.team1Score) || isLive ? 'text-white' : 'text-orange-300'}`}>
                           {displayedMatch.team2Name || 'Team 2'}
                         </span>
                         <span className={`text-4xl font-black mt-1 z-10 ${(!isLive && displayedMatch.team2Score > displayedMatch.team1Score) || isLive ? 'text-white' : 'text-orange-200/60'}`}>
                           {displayedMatch.team2Score?.toLocaleString('no-NO')}
                         </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <MiniTeamTable stats={displayedMatch.playerStats.filter(p => p.team === 1)} color="blue" isLive={isLive} />
                      <MiniTeamTable stats={displayedMatch.playerStats.filter(p => p.team === 2)} color="orange" isLive={isLive} />
                    </div>
                  </>
                )}
             </div>
          </div>
        )}
        
        {/* Previous Matches Results */}
        {previousMatches.length > 0 && (
          <div className="bg-black/75 backdrop-blur-md border border-white/15 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col flex-1 min-h-0">
             <div className="bg-white/5 p-3 px-4 text-center border-b border-white/10 shrink-0">
               <span className="text-xs text-gray-200 uppercase tracking-widest font-black">Recent History</span>
             </div>
             
             <div className="p-3 overflow-y-auto flex-1 space-y-2.5 no-scrollbar">
               {previousMatches.map(match => {
                  const isSurvival = match.gameMode?.toLowerCase() === 'survival';
                  const t1Won = match.team1Score > match.team2Score;
                  const t2Won = match.team2Score > match.team1Score;
                  return (
                    <div key={match.matchId} className="bg-white/5 hover:bg-white/[0.08] transition-colors rounded-xl border border-white/5 flex flex-col p-2.5 text-xs">
                      <div className="flex justify-between items-center border-b border-white/5 pb-1.5 mb-2">
                         <span className="text-gray-300 text-xs font-bold tracking-wider">{format(parseISO(match.matchStartTimestamp), 'HH:mm')}</span>
                         {isSurvival ? (
                           <span className="text-gray-400 text-[10px] uppercase tracking-widest">Survival {getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp)}</span>
                         ) : (
                           <span className="text-gray-400 text-[10px] uppercase tracking-widest">{formatGameMode(match.gameMode)}</span>
                         )}
                      </div>
                      {!isSurvival ? (
                        <div className="flex justify-between items-center px-1">
                           <span className={`truncate flex-1 text-xs font-semibold ${t1Won ? 'text-blue-400 font-bold' : 'text-gray-300'}`}>{match.team1Name || 'Team 1'}</span>
                           <span className={`font-black text-base px-2 ${t1Won ? 'text-white' : 'text-gray-400'}`}>{match.team1Score?.toLocaleString('no-NO')}</span>
                           <span className="text-gray-600 text-xs font-bold">-</span>
                           <span className={`font-black text-base px-2 ${t2Won ? 'text-white' : 'text-gray-400'}`}>{match.team2Score?.toLocaleString('no-NO')}</span>
                           <span className={`truncate flex-1 text-right text-xs font-semibold ${t2Won ? 'text-orange-400 font-bold' : 'text-gray-300'}`}>{match.team2Name || 'Team 2'}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center px-1">
                          <div className="flex justify-center items-center gap-2">
                            <span className="text-gray-400 uppercase tracking-widest text-[10px]">Score:</span>
                            <span className="font-black text-base text-white">{match.team1Score?.toLocaleString('no-NO')}</span>
                            {match.waveIndex !== undefined && <span className="text-gray-400 text-[10px] ml-2 uppercase">(Wave {match.waveIndex + 1})</span>}
                          </div>
                          <div className="mt-1">
                            <HighscoreBadge level={survivalHighscores.get(match.matchId) || 'NONE'} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
               })}
             </div>
          </div>
        )}
        
      </div>
    </div>
  );
}

function LiveClock({ matchStartTimestamp }: { matchStartTimestamp?: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!matchStartTimestamp) return;
    
    const start = parseISO(matchStartTimestamp).getTime();
    
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, now - start);
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [matchStartTimestamp]);

  return <>{elapsed || '0:00'}</>;
}

function MiniTeamTable({ stats, color, isSurvival, isLive }: { stats: PlayerStat[], color: 'blue' | 'orange', isSurvival?: boolean, isLive?: boolean }) {
  const sortedStats = [...stats].sort((a, b) => b.score - a.score);
  const textColor = color === 'blue' ? 'text-blue-400' : 'text-orange-400';
  const borderColor = color === 'blue' ? 'border-blue-500/20' : 'border-orange-500/20';

  return (
    <div className={`bg-white/[0.04] rounded-xl border ${borderColor} overflow-hidden`}>
      <table className="w-full text-left table-fixed">
        <tbody className="divide-y divide-white/5 text-xs">
          {sortedStats.slice(0, 3).map((player, idx) => {
            const isMVP = !isSurvival && !isLive && idx === 0 && player.score > 0;
            return (
              <tr key={idx} className={`transition-colors ${player.isBot ? 'opacity-70 italic' : ''}`}>
                <td className="py-2.5 px-3 font-semibold text-gray-100 truncate w-[55%]">
                  <span className={`truncate text-sm ${isMVP && !player.isBot ? 'font-bold text-white' : ''}`}>
                    {player.playerName}
                  </span>
                </td>
                <td className={`py-2.5 px-2 font-mono text-center font-black text-base ${textColor}`}>
                  {player.score?.toLocaleString('no-NO')}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="bg-white/10 text-gray-200 text-xs font-bold px-2.5 py-1 rounded inline-block">
                    {player.kills}K
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
