'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Trophy } from 'lucide-react';
import { useMatchData } from '@/hooks/use-match-data';
import { PlayerStat } from '@/types/match';

const formatGameMode = (mode?: string) => {
  if (!mode) return '';
  const lower = mode.toLowerCase();
  if (lower === 'teamdeathmatch') return 'TEAM DEATHMATCH';
  if (lower === 'freeforall') return 'FREE FOR ALL';
  return mode;
};

export default function SpectatorPage() {
  const { matches, isLoaded } = useMatchData();

  const mostRecentDate = useMemo(() => {
    if (matches.length === 0) return null;
    const sorted = [...matches]
      .filter(m => m.matchStartTimestamp)
      .sort((a, b) => new Date(b.matchStartTimestamp).getTime() - new Date(a.matchStartTimestamp).getTime());
    if (sorted.length > 0) return format(parseISO(sorted[0].matchStartTimestamp), 'yyyy-MM-dd');
    return null;
  }, [matches]);

  const sortedMatches = useMemo(() => {
    let filtered = [...matches].filter(m => m.matchStartTimestamp);
    if (mostRecentDate) {
      filtered = filtered.filter(m => format(parseISO(m.matchStartTimestamp), 'yyyy-MM-dd') === mostRecentDate);
    }
    return filtered.sort((a, b) => new Date(b.matchStartTimestamp).getTime() - new Date(a.matchStartTimestamp).getTime());
  }, [matches, mostRecentDate]);

  const dailySummary = useMemo(() => {
    const summary: Record<string, { matches: number, totalScore: number, wins: number }> = {};
    
    let allFiltered = [...matches].filter(m => m.matchStartTimestamp);
    if (mostRecentDate) {
      allFiltered = allFiltered.filter(m => format(parseISO(m.matchStartTimestamp), 'yyyy-MM-dd') === mostRecentDate);
    }

    allFiltered.forEach(match => {
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
  }, [matches, mostRecentDate]);

  if (!isLoaded) return <div className="h-screen w-screen bg-[#0A0A0A]"></div>;

  const latestMatch = sortedMatches.length > 0 ? sortedMatches[0] : null;
  const previousMatches = sortedMatches.slice(1, 7); // Show up to 6 previous matches

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0A0A0A] text-gray-200 font-sans pointer-events-none relative">
      
      {/* Top Bar: Overall Score */}
      {dailySummary.length > 0 && (
        <div className="absolute top-0 left-0 w-full p-4 flex justify-center items-start">
          <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-8">
            <div className="flex items-center gap-4 pr-8 border-r border-white/10">
               <Trophy className="w-10 h-10 text-yellow-500" />
               <div>
                 <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Leaderboard</div>
                 <div className="text-base font-black text-white">{mostRecentDate ? format(parseISO(mostRecentDate), 'dd.MM.yyyy') : ''}</div>
               </div>
            </div>
            
            <div className="flex gap-10">
              {dailySummary.slice(0, 4).map((team, idx) => (
                <div key={team.name} className="flex flex-col items-center">
                  <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
                    {team.name} {idx === 0 && <span className="bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded text-[9px]">1ST</span>}
                  </div>
                  <div className="text-4xl font-black text-white leading-none">{team.totalScore}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right Sidebar: Details last match & Results all matches */}
      <div className="absolute top-28 right-6 bottom-6 w-[340px] flex flex-col gap-4">
        
        {/* Latest Match Details */}
        {latestMatch && (
          <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col shrink-0">
             <div className="bg-cyan-950/40 p-3 text-center border-b border-cyan-500/20">
               <span className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Latest Match</span>
             </div>
             
             <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-cyan-400 font-bold text-xs tracking-wider">{format(parseISO(latestMatch.matchStartTimestamp), 'HH:mm')}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest">{formatGameMode(latestMatch.gameMode)}</span>
                </div>
                
                <div className="flex justify-between items-center mb-5 bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                     <span className="text-[10px] font-bold text-blue-400 uppercase truncate w-full text-center">{latestMatch.team1Name || 'Team 1'}</span>
                     <span className="text-3xl font-black text-white mt-1">{latestMatch.team1Score}</span>
                  </div>
                  <div className="text-xs font-black text-gray-500 px-3 shrink-0">VS</div>
                  <div className="flex flex-col items-center flex-1 min-w-0">
                     <span className="text-[10px] font-bold text-orange-400 uppercase truncate w-full text-center">{latestMatch.team2Name || 'Team 2'}</span>
                     <span className="text-3xl font-black text-white mt-1">{latestMatch.team2Score}</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <MiniTeamTable stats={latestMatch.playerStats.filter(p => p.team === 1)} color="blue" />
                  <MiniTeamTable stats={latestMatch.playerStats.filter(p => p.team === 2)} color="orange" />
                </div>
             </div>
          </div>
        )}
        
        {/* Previous Matches Results */}
        {previousMatches.length > 0 && (
          <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col flex-1 min-h-0">
             <div className="bg-white/5 p-3 text-center border-b border-white/10 shrink-0">
               <span className="text-xs text-gray-300 uppercase tracking-widest font-bold">Recent History</span>
             </div>
             
             <div className="p-3 overflow-y-auto flex-1 space-y-2 no-scrollbar">
               {previousMatches.map(match => {
                  const t1Won = match.team1Score > match.team2Score;
                  const t2Won = match.team2Score > match.team1Score;
                  return (
                    <div key={match.matchId} className="bg-white/5 rounded-lg border border-white/5 flex flex-col p-2 text-[11px]">
                      <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1.5">
                         <span className="text-gray-400 text-[10px] font-bold">{format(parseISO(match.matchStartTimestamp), 'HH:mm')}</span>
                      </div>
                      <div className="flex justify-between items-center px-1">
                         <span className={`truncate w-24 ${t1Won ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>{match.team1Name || 'Team 1'}</span>
                         <span className={`font-black text-sm ${t1Won ? 'text-white' : 'text-gray-400'}`}>{match.team1Score}</span>
                         <span className="text-gray-700 mx-2 text-[10px]">-</span>
                         <span className={`font-black text-sm ${t2Won ? 'text-white' : 'text-gray-400'}`}>{match.team2Score}</span>
                         <span className={`truncate w-24 text-right ${t2Won ? 'text-orange-400 font-bold' : 'text-gray-400'}`}>{match.team2Name || 'Team 2'}</span>
                      </div>
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

function MiniTeamTable({ stats, color }: { stats: PlayerStat[], color: 'blue' | 'orange' }) {
  const sortedStats = [...stats].sort((a, b) => b.score - a.score);
  const textColor = color === 'blue' ? 'text-blue-400' : 'text-orange-400';

  return (
    <div className="bg-white/5 rounded-lg border border-white/5">
      <table className="w-full text-left table-fixed">
        <tbody className="divide-y divide-white/5 text-[10px]">
          {sortedStats.slice(0, 3).map((player, idx) => {
            const isMVP = idx === 0 && player.score > 0;
            return (
              <tr key={idx} className={player.isBot ? 'opacity-70 italic' : ''}>
                <td className="py-1.5 px-2 font-medium text-gray-300 truncate w-[65%]">
                  <span className={`truncate ${isMVP && !player.isBot ? 'font-bold text-white' : ''}`}>{player.playerName}</span>
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
