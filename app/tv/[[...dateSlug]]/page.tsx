'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Trophy, Crosshair } from 'lucide-react';
import { useMatchData } from '@/hooks/use-match-data';
import { getSurvivalHighscores } from '@/lib/survival-highscores';
import { HighscoreBadge } from '@/components/HighscoreBadge';
import { TdmBanner, SurvivalBanner } from '@/components/SectionTitles';
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

export default function TVPage() {
  const { matches, isLoaded } = useMatchData();
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
          const isFinished = matches.some(m => m.matchId === data.matchId);
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
  const router = useRouter();
  const urlDate = params?.dateSlug?.[0] as string | undefined;

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
      return urlDate;
    }
    return format(new Date(), 'yyyy-MM-dd');
  });

  useEffect(() => {
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate) && urlDate !== selectedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDate(urlDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlDate]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    router.push(`/tv/${newDate}`);
  };

  const sortedMatches = useMemo(() => {
    let filtered = [...matches].filter(m => m.matchStartTimestamp);
    filtered = filtered.filter(m => format(parseISO(m.matchStartTimestamp), 'yyyy-MM-dd') === selectedDate);
    // Sort NEWEST FIRST for TV display so latest are at the top
    return filtered.sort((a, b) => new Date(b.matchStartTimestamp).getTime() - new Date(a.matchStartTimestamp).getTime());
  }, [matches, selectedDate]);

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

  const survivalHighscores = useMemo(() => getSurvivalHighscores(survivalMatches), [survivalMatches]);

  const survivalTeamSummary = useMemo(() => {
    return [...survivalMatches].sort((a, b) => {
      const waveA = a.waveIndex ?? 0;
      const waveB = b.waveIndex ?? 0;
      if (waveB !== waveA) return waveB - waveA;
      return b.team1Score - a.team1Score;
    });
  }, [survivalMatches]);

  if (!isLoaded) return <div className="h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-500 font-bold tracking-widest uppercase">Loading Live Data...</div>;

  const showSplitScreen = teamDeathmatchMatches.length > 0 && survivalMatches.length > 0;
  const gridColsClass = showSplitScreen ? 'grid-cols-2' : 'grid-cols-1 w-full';

  return (
    <div className="h-screen bg-[#0A0A0A] text-gray-200 font-sans px-6 md:px-12 pt-2 md:pt-3 pb-2 overflow-hidden flex flex-col relative">
      
      {/* Hidden Date Picker for testing */}
      <div className="absolute top-4 right-4 z-50 opacity-10 hover:opacity-100 transition-opacity">
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="bg-black/50 border border-white/20 text-gray-400 text-xs p-1 rounded outline-none"
        />
      </div>
      {liveMatch && (
        <div className={`shrink-0 flex flex-col items-center w-full ${sortedMatches.length === 0 ? 'h-full flex-1 justify-center' : 'mb-8'}`}>
           <div className={`flex flex-col items-center ${sortedMatches.length === 0 ? 'mb-8' : 'mb-4'}`}>
             <h1 className={`${sortedMatches.length === 0 ? 'text-4xl' : 'text-3xl'} font-black tracking-widest uppercase text-red-500 flex items-center justify-center gap-3 mb-3`}>
               <div className="w-5 h-5 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,1)] animate-pulse"></div>
               LIVE MATCH
             </h1>
             <div className={`${sortedMatches.length === 0 ? 'text-7xl' : 'text-5xl'} font-mono font-black text-white bg-red-950/80 border-2 border-red-500/50 px-8 py-2 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.4)] tracking-tighter`}>
               <LiveClock matchStartTimestamp={liveMatch.matchStartTimestamp} />
             </div>
           </div>
           <div className={`w-full ${sortedMatches.length === 0 ? 'max-w-[1600px] scale-110 origin-center' : 'max-w-6xl'} mx-auto shadow-[0_0_40px_rgba(239,68,68,0.15)] rounded-xl relative`}>
             <div className="absolute inset-0 border-2 border-red-500/50 rounded-xl pointer-events-none z-20"></div>
             {liveMatch.gameMode?.toLowerCase() === 'survival' ? (
               <SurvivalCard match={liveMatch} isLive />
             ) : (
               <TeamDeathmatchCard match={liveMatch} isLive />
             )}
           </div>
        </div>
      )}

      <div className={`w-full grid ${gridColsClass} gap-12 h-full flex-1 overflow-hidden ${(sortedMatches.length === 0 && liveMatch) ? 'hidden' : ''}`}>
        
        {/* TEAM DEATHMATCH SECTION */}
        {teamDeathmatchMatches.length > 0 && (
          <div className="flex flex-col h-full overflow-hidden">
            <TdmBanner />
            
            {showSplitScreen ? (
              <div className="flex flex-col flex-1 overflow-hidden min-h-0 pt-8">
                {/* TDM Leaderboard */}
                {teamDeathmatchSummary.length > 0 && (
                  <div className="mb-8 shrink-0">
                    <h2 className="text-xl font-black tracking-widest uppercase text-gray-500 mb-3 text-center">Tournament Leaderboard</h2>
                    <div className="flex flex-col gap-3">
                      {teamDeathmatchSummary.map((team, idx) => {
                        const placement = idx + 1;
                        
                        return (
                        <div key={team.name} className={`shrink-0 relative overflow-hidden ${idx === 0 ? 'bg-yellow-900/30 border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-[#121212] border border-white/10 opacity-70'} rounded-lg p-4 transition-all flex items-center justify-between`}>
                          {idx === 0 && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)] z-10"></div>}
                          
                          <div className="flex items-center gap-4 sm:gap-6 z-20 pl-2">
                            <div className={`text-4xl font-black ${idx === 0 ? 'text-yellow-500' : 'text-gray-600'} w-10 text-right`}>{placement}</div>
                            
                            <div className="flex flex-col items-start text-left">
                              <div className="flex items-center gap-3">
                                <span className={`text-xl font-bold uppercase tracking-widest ${idx === 0 ? 'text-white' : 'text-gray-300'}`}>
                                  {team.name}
                                </span>
                                {idx === 0 && <span className="bg-yellow-500 text-yellow-950 text-xs font-black px-2 py-1 rounded shadow-sm tracking-widest uppercase">Winner</span>}
                              </div>
                              <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                                {team.wins} Win{team.wins !== 1 && 's'} in {team.matches} Match{team.matches !== 1 && 'es'}
                              </div>
                            </div>
                          </div>

                          <div className="text-6xl font-black text-white tracking-tighter pr-4">
                            {team.totalScore?.toLocaleString('no-NO')}
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                )}

                {/* TDM Matches */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                   <h2 className="text-xl font-black tracking-widest uppercase text-gray-500 mb-3 text-center shrink-0">Latest Matches</h2>
                   <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden space-y-3 pb-12">
                     {teamDeathmatchMatches.map(match => (
                       <TeamDeathmatchCard key={match.matchId} match={match} />
                     ))}
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden min-h-0 pt-6">
                {/* Full width horizontal Leaderboard */}
                {teamDeathmatchSummary.length > 0 && (
                  <div className="mb-3 shrink-0">
                    <h2 className="text-2xl font-black tracking-widest uppercase text-white mb-2 text-center">Tournament Leaderboard</h2>
                    <div className="flex justify-center gap-3 px-4 w-full">
                      {teamDeathmatchSummary.slice(0, 6).map((team, idx) => {
                        const placement = idx + 1;
                        return (
                           <div key={team.name} className={`flex-1 min-w-0 max-w-[320px] relative overflow-hidden ${idx === 0 ? 'bg-yellow-900/30 border border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-[#121212] border border-white/10 opacity-70'} rounded-xl p-4 flex flex-col items-center justify-center text-center`}>
                             {idx === 0 && <div className="absolute top-0 left-0 right-0 h-1.5 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)] z-10"></div>}
                             <div className="flex flex-col items-center gap-1 mb-3 z-20">
                                <span className={`text-4xl leading-none font-black ${idx === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>{placement}</span>
                                <span className={`text-xl font-bold uppercase tracking-widest truncate max-w-full ${idx === 0 ? 'text-white' : 'text-gray-300'}`}>{team.name}</span>
                             </div>
                             {idx === 0 && <span className="bg-yellow-500 text-yellow-950 text-xs font-black px-2 py-1 rounded shadow-sm tracking-widest uppercase mb-2 z-20">Winner</span>}
                             <div className="text-6xl font-black text-white tracking-tighter my-2 z-20">{team.totalScore?.toLocaleString('no-NO')}</div>
                             <div className="text-sm text-gray-400 uppercase tracking-widest z-20 mt-1">{team.wins} Win{team.wins !== 1 && 's'} in {team.matches} Match{team.matches !== 1 && 'es'}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden px-4">
                    {/* Left side: Full details of most recent match */}
                    <div className="flex flex-col h-full min-h-0">
                      <h2 className="text-2xl font-black tracking-widest uppercase text-white mb-2 text-center shrink-0">LAST MATCH</h2>
                      <div className="overflow-y-auto [&::-webkit-scrollbar]:hidden pb-12">
                        {teamDeathmatchMatches.length > 0 && (
                           <TeamDeathmatchCard match={teamDeathmatchMatches[0]} />
                        )}
                      </div>
                    </div>
                    {/* Right side: Compact details of other matches */}
                    <div className="flex flex-col h-full min-h-0">
                      <h2 className="text-2xl font-black tracking-widest uppercase text-white mb-2 text-center shrink-0">LATEST MATCHES</h2>
                      <div className="overflow-y-auto [&::-webkit-scrollbar]:hidden space-y-2 pb-12 pr-2">
                      {teamDeathmatchMatches.length > 1 ? (
                        teamDeathmatchMatches.slice(1).map(match => (
                           <CompactTdmMatchCard key={match.matchId} match={match} />
                        ))
                      ) : (
                        <div className="h-full flex items-center justify-center border border-white/5 bg-white/5 rounded-lg text-gray-500 text-xs font-bold uppercase tracking-widest">
                          No more matches today
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}
          </div>
        )}

        {/* SURVIVAL SECTION */}
        {survivalMatches.length > 0 && (
          <div className="flex flex-col h-full overflow-hidden">
            <SurvivalBanner />
            
            {/* Survival Leaderboard */}
            {survivalTeamSummary.length > 0 && (
              <div className="mb-10 shrink-0 mt-8">
                <h2 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-4 text-center">TOP TEAMS TODAY</h2>
                <div className="bg-[#0a0505] border border-red-900/30 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#1a0a0a] border-b border-red-900/30">
                        <tr className="text-[10px] uppercase tracking-widest text-red-400/70">
                          <th className="py-2 px-3 font-bold truncate min-w-[120px]">Team</th>
                          <th className="py-2 px-2 font-bold text-center">Wave</th>
                          <th className="py-2 px-2 font-bold text-center">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {survivalTeamSummary.slice(0, 4).map((match, idx) => {
                          const placement = idx + 1;
                          return (
                          <tr key={match.matchId} className={`group hover:bg-[#1f0a0a] transition-colors ${idx === 0 ? 'bg-[#240a0a]' : 'bg-[#0a0505]'}`}>
                            <td className="py-2 px-3 font-medium text-gray-300 flex flex-col justify-center border-r border-transparent">
                              <div className="flex items-center gap-2">
                                <span className="text-red-600 w-3 text-right text-[10px]">{idx + 1}.</span>
                                <span className={`truncate ${idx === 0 ? 'text-red-500 font-bold' : ''}`}>{match.team1Name || 'Unknown Team'}</span>
                              </div>
                              <div className="ml-5 mt-1">
                                <HighscoreBadge level={survivalHighscores.get(match.matchId) || 'NONE'} />
                              </div>
                            </td>
                            <td className="py-2 px-2 font-mono text-center font-bold text-white">{match.waveIndex !== undefined ? match.waveIndex + 1 : '-'}</td>
                            <td className="py-2 px-2 font-mono text-center font-bold text-white">{match.team1Score?.toLocaleString('no-NO')}</td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
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
        
        {!liveMatch && sortedMatches.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center text-gray-500 h-64 border border-dashed border-white/10 rounded-2xl mx-8">
            <Trophy className="w-24 h-24 mb-6 opacity-50" />
            <p className="text-3xl font-black uppercase tracking-widest">Waiting for matches...</p>
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

function TeamDeathmatchCard({ match, isLive }: { match: MatchData, isLive?: boolean }) {
  const team1Won = match.team1Score > match.team2Score;
  const team2Won = match.team2Score > match.team1Score;

  return (
    <div className="bg-[#121212] rounded-xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
      <div className="flex items-center justify-between p-2 px-4 border-b border-white/10 bg-[#0D0D0D] shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-gray-400 font-bold text-xl tracking-wider">
            {format(parseISO(match.matchStartTimestamp), 'HH:mm')}
          </span>
          <div className="flex gap-3">
            <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-sm text-gray-300 uppercase tracking-widest">
              {formatGameMode(match.gameMode)}
            </span>
            {match.gameMode?.toLowerCase() === 'survival' && match.lifeMode && (
              <span className="px-3 py-1 rounded bg-gray-900/30 border border-gray-500/20 text-sm text-gray-300 uppercase tracking-widest">
                {formatLifeMode(match.lifeMode)}
              </span>
            )}
            {isLive ? (
              <span className="px-3 py-1 rounded bg-red-500/20 border border-red-500/30 text-sm text-red-400 font-bold tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <LiveClock matchStartTimestamp={match.matchStartTimestamp} />
              </span>
            ) : getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp) && (
              <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-sm text-gray-400 uppercase tracking-widest">
                {getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-3 flex justify-between items-center gap-6 shrink-0">
        {/* Team 1 (Blue) */}
        <div className={`flex-1 ${team1Won ? 'bg-blue-900/30 border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-blue-950/10 border border-blue-500/10 opacity-70'} rounded-xl p-3 pt-6 flex flex-col items-center relative overflow-hidden transition-all`}>
          {team1Won && <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-black px-4 py-1.5 rounded-bl-xl shadow-md tracking-widest uppercase">Winner</div>}
          <div className="text-blue-400 font-bold uppercase text-xl flex items-center justify-center gap-2 z-10 w-full truncate mt-1">
            <span className={`truncate ${team1Won ? 'text-white' : ''}`}>{match.team1Name || 'Team 1'}</span>
            <span className="shrink-0 text-[10px] bg-blue-500/20 border border-blue-500/30 px-2 py-1 rounded text-blue-300">BLUE</span>
          </div>
          <div className={`text-7xl font-black mt-1 z-10 ${team1Won ? 'text-white' : 'text-blue-200/50'}`}>{match.team1Score?.toLocaleString('no-NO')}</div>
        </div>
        
        <div className="text-gray-600 font-black text-2xl uppercase tracking-widest">VS</div>
        
        {/* Team 2 (Orange) */}
        <div className={`flex-1 ${team2Won ? 'bg-orange-900/30 border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'bg-orange-950/10 border border-orange-500/10 opacity-70'} rounded-xl p-3 pt-6 flex flex-col items-center relative overflow-hidden transition-all`}>
          {team2Won && <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-black px-4 py-1.5 rounded-bl-xl shadow-md tracking-widest uppercase">Winner</div>}
          <div className="text-orange-400 font-bold uppercase text-xl flex items-center justify-center gap-2 z-10 w-full truncate mt-1">
            <span className={`truncate ${team2Won ? 'text-white' : ''}`}>{match.team2Name || 'Team 2'}</span>
            <span className="shrink-0 text-[10px] bg-orange-500/20 border border-orange-500/30 px-2 py-1 rounded text-orange-300">ORANGE</span>
          </div>
          <div className={`text-7xl font-black mt-1 z-10 ${team2Won ? 'text-white' : 'text-orange-200/50'}`}>{match.team2Score?.toLocaleString('no-NO')}</div>
        </div>
      </div>
      <div className="px-3 pb-3 flex gap-3 flex-1 min-h-0 overflow-hidden">
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

function SurvivalCard({ match, isLive }: { match: MatchData, isLive?: boolean }) {
  return (
    <div className="bg-[#0a0505] rounded-xl border border-red-900/30 overflow-hidden shadow-xl flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-red-900/30 bg-[#1a0a0a] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 font-bold text-sm tracking-wider">
            {format(parseISO(match.matchStartTimestamp), 'HH:mm')}
          </span>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 uppercase tracking-widest">
              {formatGameMode(match.gameMode)}
            </span>
            {match.gameMode?.toLowerCase() === 'survival' && match.lifeMode && (
              <span className="px-2 py-0.5 rounded bg-gray-900/30 border border-gray-500/20 text-[10px] text-gray-300 uppercase tracking-widest">
                {formatLifeMode(match.lifeMode)}
              </span>
            )}
            {isLive ? (
              <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-[10px] text-red-400 font-bold tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                <LiveClock matchStartTimestamp={match.matchStartTimestamp} />
              </span>
            ) : getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp) && (
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 uppercase tracking-widest">
                {getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 flex justify-center items-center gap-4 shrink-0 bg-[#1a0a0a] border-b border-red-900/30">
        <div className="flex flex-col items-center">
          <span className="text-red-500 font-bold uppercase tracking-widest text-sm">
            Survival Mode {isLive ? <LiveClock matchStartTimestamp={match.matchStartTimestamp} /> : getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp)}
          </span>
          {match.waveIndex !== undefined && <span className="text-5xl font-black text-white mt-2">Wave {match.waveIndex + 1}</span>}
          <span className="text-xs text-red-500/70 uppercase mt-2">Team Score: <span className="text-red-400 font-bold">{match.team1Score?.toLocaleString('no-NO')}</span></span>
        </div>
      </div>
      <div className="px-4 pb-4 flex gap-4 flex-1 min-h-0 overflow-hidden mt-4">
          <div className="flex-1 min-w-0">
            <MiniTeamTable stats={match.playerStats.filter(p => p.team === 1)} color="red" isSurvival={true} />
          </div>
      </div>
    </div>
  );
}

function MiniTeamTable({ stats, color, isSurvival }: { stats: PlayerStat[], color: 'blue' | 'orange' | 'red', isSurvival?: boolean }) {
  const sortedStats = [...stats].sort((a, b) => b.score - a.score);
  const textColor = color === 'blue' ? 'text-blue-400' : color === 'red' ? 'text-red-400' : 'text-orange-400';
  const rowHighlight = color === 'blue' ? 'bg-blue-500/10' : color === 'red' ? 'bg-red-500/10' : 'bg-orange-500/10';
  const mvpBadge = color === 'blue' ? 'bg-blue-500/20 text-blue-400' : color === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400';

  return (
    <div className="bg-white/5 rounded-md overflow-hidden h-full border border-white/5">
      <table className="w-full text-left table-fixed">
        <thead className="bg-black/20 border-b border-white/5">
          <tr>
            <th className="py-1 px-2 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-left w-[46%]">Player</th>
            <th className="py-1 px-1 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-center w-[22%]">Score</th>
            <th className="py-1 px-1 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-center w-[16%]">Kills</th>
            <th className="py-1 px-1 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-center w-[16%]">Deaths</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-sm">
          {sortedStats.slice(0, 4).map((player, idx) => {
            const isMVP = !isSurvival && idx === 0 && player.score > 0;
            return (
              <tr key={idx} className={`${isMVP && !player.isBot ? rowHighlight : player.isBot ? 'opacity-70 italic' : ''}`}>
                <td className="py-1 px-2 font-medium text-gray-300 truncate">
                  <div className="flex items-center gap-2 w-full truncate">
                    <span className={`truncate ${isMVP && !player.isBot ? 'font-bold text-white' : ''}`}>{player.playerName}</span>
                    {isMVP && !player.isBot && <span className={`shrink-0 text-[10px] px-2 py-1 rounded uppercase tracking-wider font-bold ${mvpBadge}`}>MVP</span>}
                  </div>
                </td>
                <td className={`py-1 px-1 font-mono text-center font-bold ${textColor}`}>{player.score?.toLocaleString('no-NO')}</td>
                <td className="py-1 px-1 font-mono text-center text-gray-300 font-bold">{player.kills}</td>
                <td className="py-1 px-1 font-mono text-center text-gray-400 font-bold">{player.deaths}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CompactTdmMatchCard({ match }: { match: MatchData }) {
  const team1Won = match.team1Score > match.team2Score;
  const team2Won = match.team2Score > match.team1Score;
  const duration = getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp);
  const time = match.matchStartTimestamp ? format(parseISO(match.matchStartTimestamp), 'HH:mm') : '';

  return (
    <div className="bg-[#121212] border border-white/5 rounded-xl overflow-hidden flex items-center p-4 relative">
      <div className="w-16 shrink-0 flex flex-col items-center justify-center border-r border-white/5 pr-4">
        <div className="text-white font-bold text-lg">{time}</div>
        {duration && <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">{duration}</div>}
      </div>
      <div className="flex-1 flex justify-between items-center pl-5 pr-2">
        <div className="flex items-center gap-3 w-[40%]">
          <span className={`text-base font-bold uppercase truncate ${team1Won ? 'text-blue-400' : 'text-gray-400'}`}>{match.team1Name || 'Team 1'}</span>
          {team1Won && <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase">Win</span>}
        </div>
        
        <div className="flex items-center gap-5 shrink-0 font-black text-3xl">
          <span className={team1Won ? 'text-white' : 'text-gray-500'}>{match.team1Score?.toLocaleString('no-NO')}</span>
          <span className="text-gray-700 text-base">VS</span>
          <span className={team2Won ? 'text-white' : 'text-gray-500'}>{match.team2Score?.toLocaleString('no-NO')}</span>
        </div>

        <div className="flex items-center gap-3 w-[40%] justify-end">
          {team2Won && <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase">Win</span>}
          <span className={`text-base font-bold uppercase truncate text-right ${team2Won ? 'text-orange-400' : 'text-gray-400'}`}>{match.team2Name || 'Team 2'}</span>
        </div>
      </div>
    </div>
  );
}
