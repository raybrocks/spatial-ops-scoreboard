'use client';

import { useState, useMemo } from 'react';
import { format, isSameDay, parseISO, subDays, addDays } from 'date-fns';
import { Upload, ChevronLeft, ChevronRight, Printer, Trash2, Trophy, Crosshair, Skull } from 'lucide-react';
import { useMatchData } from '@/hooks/use-match-data';
import { MatchData, PlayerStat } from '@/types/match';

export default function Home() {
  const { matches, addMatch, removeMatch, isLoaded } = useMatchData();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [jsonInput, setJsonInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [isPrintMode, setIsPrintMode] = useState(false);

  const handleJsonSubmit = () => {
    try {
      setUploadError('');
      const parsedData = JSON.parse(jsonInput) as MatchData;
      
      // Basic validation
      if (!parsedData.matchId || typeof parsedData.team1Score !== 'number') {
        throw new Error('Invalid Match Data format.');
      }

      addMatch(parsedData);
      setJsonInput('');
      
      // Optionally switch to the date of the uploaded match
      if (parsedData.matchStartTimestamp) {
          setSelectedDate(new Date(parsedData.matchStartTimestamp));
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse JSON.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setJsonInput(content);
        // Automatically try to submit if it's a file upload
        const parsedData = JSON.parse(content) as MatchData;
        if (!parsedData.matchId || typeof parsedData.team1Score !== 'number') {
          throw new Error('Invalid Match Data format.');
        }
        addMatch(parsedData);
        setJsonInput('');
        if (parsedData.matchStartTimestamp) {
            setSelectedDate(new Date(parsedData.matchStartTimestamp));
        }
      } catch (err: any) {
        setUploadError(err.message || 'Failed to parse uploaded JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (e.target) {
        e.target.value = '';
    }
  };

  const togglePrintSelection = (matchId: string) => {
    setSelectedForPrint(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const matchesForDate = useMemo(() => {
    return matches
      .filter((m) => {
        if (!m.matchStartTimestamp) return false;
        return isSameDay(parseISO(m.matchStartTimestamp), selectedDate);
      })
      .sort((a, b) => new Date(b.matchStartTimestamp).getTime() - new Date(a.matchStartTimestamp).getTime());
  }, [matches, selectedDate]);

  if (!isLoaded) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className={`min-h-screen bg-[#0A0A0A] text-gray-200 font-sans ${isPrintMode ? 'print-mode' : ''}`}>
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-section {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 30px;
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}} />

      {/* Header (No Print) */}
      <header className="border-b border-white/10 bg-[#0D0D0D] p-4 no-print">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight text-cyan-400">MIXED REALITY SCOREBOARD</h1>
          </div>
          
          <div className="flex items-center gap-4 bg-[#121212] border border-white/10 rounded-lg p-1">
            <button 
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="p-2 hover:bg-white/10 rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="text-sm font-medium min-w-[150px] text-center text-gray-200">
              {format(selectedDate, 'EEEE, MMM do')}
            </div>
            <button 
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="p-2 hover:bg-white/10 rounded-md transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="flex gap-3">
             <button
              onClick={() => window.print()}
              disabled={selectedForPrint.size === 0}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md text-xs uppercase tracking-widest transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Selected ({selectedForPrint.size})
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
        
        {/* Upload Section (No Print) */}
        <section className="bg-[#121212] rounded-xl border border-white/10 p-6 mb-8 no-print">
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4 flex items-center gap-2 text-cyan-400">
            <Upload className="w-4 h-4" />
            Import Match Result
          </h2>
          
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                Paste JSON Data
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{ "matchId": "...", "team1Score": 300 ... }'
                className="w-full h-32 p-3 bg-black/20 border border-white/10 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-mono text-xs resize-none text-gray-300 placeholder:text-gray-700"
              />
              {uploadError && (
                <p className="text-red-400 text-xs mt-2 font-mono">{uploadError}</p>
              )}
              <button
                onClick={handleJsonSubmit}
                disabled={!jsonInput.trim()}
                className="mt-3 w-full md:w-auto bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900/50 disabled:text-gray-500 text-white px-6 py-2 rounded-md font-bold text-sm shadow-lg shadow-cyan-900/20 transition-colors"
              >
                + ADD MATCH
              </button>
            </div>
            
            <div className="flex items-center justify-center">
              <span className="text-gray-600 text-xs font-bold uppercase tracking-widest">OR</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <label className="flex flex-col items-center justify-center w-full h-32 border border-white/10 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-cyan-500/50 mb-3" />
                  <p className="mb-2 text-sm text-gray-400"><span className="font-bold text-gray-300">Click to upload</span> or drag and drop</p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">JSON match file</p>
                </div>
                <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        </section>

        {/* Matches List */}
        <div className="space-y-8">
          {matchesForDate.length === 0 ? (
            <div className="text-center py-12 bg-[#121212] rounded-xl border border-white/10 no-print">
              <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="text-sm font-bold tracking-widest uppercase text-gray-500">No matches found</h3>
              <p className="text-xs text-gray-600 mt-2">Upload a JSON result file to see it here.</p>
            </div>
          ) : (
            matchesForDate.map((match) => {
              const isSelected = selectedForPrint.has(match.matchId);
              
              // Determine winner
              const team1Won = match.team1Score > match.team2Score;
              const team2Won = match.team2Score > match.team1Score;

              return (
                <div 
                  key={match.matchId} 
                  className={`bg-[#121212] rounded-xl border transition-all overflow-hidden ${isSelected ? 'border-cyan-500 ring-2 ring-cyan-900/30 print-section' : 'border-white/10 no-print'}`}
                >
                  {/* Match Header */}
                  <div className="flex flex-wrap items-center justify-between p-4 border-b border-white/10 bg-[#0D0D0D]">
                    <div className="flex items-center gap-4 text-sm w-full md:w-auto">
                      <label className="flex items-center gap-2 cursor-pointer no-print mr-4">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => togglePrintSelection(match.matchId)}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
                        />
                        <span className="text-xs font-medium text-gray-400">Select for Print</span>
                      </label>
                      <span className="text-gray-500 hidden md:inline">Match ID:</span>
                      <span className="font-mono text-cyan-400 hidden md:inline">{match.matchId.split('-')[0]}...</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 uppercase tracking-widest">
                        {match.gameMode}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 md:mt-0">
                      <span className="text-xs text-gray-500 italic">
                        Start: {format(parseISO(match.matchStartTimestamp), 'HH:mm:ss')}
                      </span>
                      <button 
                        onClick={() => removeMatch(match.matchId)}
                        className="text-gray-600 hover:text-red-500 transition-colors no-print p-1"
                        title="Delete Match"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Score Overview */}
                  <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Team 1 */}
                    <div className="bg-orange-950/20 border border-orange-500/20 rounded-xl p-6 relative overflow-hidden text-center md:text-left">
                      <div className="absolute -right-4 -top-4 text-orange-500/10 text-8xl font-black select-none pointer-events-none hidden md:block">01</div>
                      <div className="flex justify-center md:justify-between items-end mb-2 relative z-10">
                        <h2 className="text-orange-400 font-bold uppercase tracking-tighter text-xl">Team 1 {team1Won && <span className="ml-2 text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded tracking-widest">WINNER</span>}</h2>
                        <span className="text-xs text-orange-500/60 hidden md:inline">{match.team1Deaths} DEATHS</span>
                      </div>
                      <div className="text-5xl md:text-6xl font-black text-white relative z-10">{match.team1Score}</div>
                      <div className="mt-4 h-1 w-full bg-orange-500/20 rounded relative z-10 overflow-hidden">
                         <div className="h-full bg-orange-500" style={{ width: match.team1Score > 0 ? `${(match.team1Score / Math.max(match.team1Score, match.team2Score)) * 100}%` : '0%' }}></div>
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-6 relative overflow-hidden text-center md:text-left">
                      <div className="absolute -right-4 -top-4 text-blue-500/10 text-8xl font-black select-none pointer-events-none hidden md:block">02</div>
                      <div className="flex justify-center md:justify-between items-end mb-2 relative z-10">
                        <h2 className="text-blue-400 font-bold uppercase tracking-tighter text-xl">Team 2 {team2Won && <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded tracking-widest">WINNER</span>}</h2>
                        <span className="text-xs text-blue-500/60 hidden md:inline">{match.team2Deaths} DEATHS</span>
                      </div>
                      <div className="text-5xl md:text-6xl font-black text-white relative z-10">{match.team2Score}</div>
                      <div className="mt-4 h-1 w-full bg-blue-500/20 rounded relative z-10 overflow-hidden">
                         <div className="h-full bg-blue-500" style={{ width: match.team2Score > 0 ? `${(match.team2Score / Math.max(match.team1Score, match.team2Score)) * 100}%` : '0%' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Player Stats Tables */}
                  <div className="px-6 pb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TeamTable teamName="Team 1" stats={match.playerStats.filter(p => p.team === 1)} color="orange" />
                    <TeamTable teamName="Team 2" stats={match.playerStats.filter(p => p.team === 2)} color="blue" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

function TeamTable({ teamName, stats, color }: { teamName: string, stats: PlayerStat[], color: 'blue' | 'red' | 'orange' }) {
  const sortedStats = [...stats].sort((a, b) => b.score - a.score);
  
  const textColor = color === 'blue' ? 'text-blue-400' : (color === 'red' ? 'text-red-400' : 'text-orange-400');
  const rowHighlight = color === 'blue' ? 'bg-blue-500/5' : (color === 'red' ? 'bg-red-500/5' : 'bg-orange-500/5');
  const mvpBadge = color === 'blue' ? 'bg-blue-500/20 text-blue-400' : (color === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400');

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/5">
            <tr className="text-[10px] uppercase tracking-widest text-gray-500">
              <th className="py-3 px-4 font-bold">Player</th>
              <th className="py-3 px-2 font-bold text-center" title="Score">Score</th>
              <th className="py-3 px-2 font-bold text-center" title="Kills">Kills</th>
              <th className="py-3 px-2 font-bold text-center" title="Deaths">Deaths</th>
              <th className="py-3 px-2 font-bold text-center" title="Assists">AST</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {sortedStats.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-600 italic">No players recorded</td>
              </tr>
            ) : (
              sortedStats.map((player, idx) => {
                const isMVP = idx === 0 && player.score > 0;
                return (
                  <tr key={idx} className={`hover:bg-white/[0.02] ${isMVP && !player.isBot ? rowHighlight : player.isBot ? 'opacity-70 italic' : ''}`}>
                    <td className="py-3 px-4 font-medium flex items-center flex-wrap gap-2 text-gray-300">
                      <span className={isMVP && !player.isBot ? 'font-bold text-white' : ''}>{player.playerName}</span>
                      {isMVP && !player.isBot && (
                        <span className={`text-[8px] px-1 rounded uppercase tracking-wider font-bold ${mvpBadge}`}>MVP</span>
                      )}
                      {player.isBot && (
                        <span className="text-[8px] border border-white/20 text-gray-500 px-1 rounded uppercase font-bold">Bot</span>
                      )}
                    </td>
                    <td className={`py-3 px-2 font-mono text-center ${textColor}`}>{player.score}</td>
                    <td className="py-3 px-2 text-center text-gray-400">{player.kills}</td>
                    <td className="py-3 px-2 text-center text-gray-400">{player.deaths}</td>
                    <td className="py-3 px-2 text-center text-gray-400">{player.assists}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
