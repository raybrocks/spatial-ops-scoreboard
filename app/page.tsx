'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Upload, Printer, Trash2, Trophy, Lock, Unlock, Edit2, Check, X, CheckSquare } from 'lucide-react';
import { useMatchData } from '@/hooks/use-match-data';
import { MatchData, PlayerStat } from '@/types/match';

const formatGameMode = (mode?: string) => {
  if (!mode) return '';
  const lower = mode.toLowerCase();
  if (lower === 'teamdeathmatch') return 'TEAM DEATHMATCH';
  if (lower === 'freeforall') return 'FREE FOR ALL';
  return mode;
};

export default function Home() {
  const { matches, addMatch, removeMatch, updateMatch, isLoaded } = useMatchData();
  const [jsonInput, setJsonInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const [editingTeam, setEditingTeam] = useState<{matchId: string, team: 1 | 2} | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleEditTeamName = (matchId: string, team: 1 | 2, currentName: string) => {
    setEditingTeam({ matchId, team });
    setEditingName(currentName);
  };

  const saveTeamName = async () => {
    if (!editingTeam) return;
    try {
      const updates = editingTeam.team === 1 
        ? { team1Name: editingName.trim() || 'Team 1' }
        : { team2Name: editingName.trim() || 'Team 2' };
      await updateMatch(editingTeam.matchId, updates);
    } catch (error) {
      console.error("Failed to update team name", error);
    }
    setEditingTeam(null);
  };

  const cancelEdit = () => {
    setEditingTeam(null);
  };

  const handleAdminToggle = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
    } else {
      const pin = window.prompt("Enter Admin PIN:");
      if (pin === "5378") {
        setIsAdminMode(true);
      } else if (pin !== null) {
        alert("Incorrect PIN");
      }
    }
  };

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

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    matches.forEach(m => {
      if (m.matchStartTimestamp) {
        dates.add(format(parseISO(m.matchStartTimestamp), 'yyyy-MM-dd'));
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [matches]);

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]); // Default to most recent date
    }
  }, [availableDates, selectedDate]);

  const sortedMatches = useMemo(() => {
    let filtered = [...matches].filter(m => m.matchStartTimestamp);
    
    if (selectedDate) {
      filtered = filtered.filter(m => format(parseISO(m.matchStartTimestamp), 'yyyy-MM-dd') === selectedDate);
    }
    
    return filtered.sort((a, b) => new Date(a.matchStartTimestamp).getTime() - new Date(b.matchStartTimestamp).getTime());
  }, [matches, selectedDate]);

  const selectAllForPrint = () => {
    if (selectedForPrint.size === sortedMatches.length && sortedMatches.length > 0) {
      setSelectedForPrint(new Set());
    } else {
      setSelectedForPrint(new Set(sortedMatches.map(m => m.matchId)));
    }
  };

  const dailySummary = useMemo(() => {
    const summary: Record<string, { matches: number, totalScore: number, wins: number }> = {};
    
    sortedMatches.forEach(match => {
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
  }, [sortedMatches]);

  if (!isLoaded) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className={`min-h-screen bg-[#0A0A0A] text-gray-200 font-sans ${isPrintMode ? 'print-mode' : ''}`}>
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 0.5cm; }
          *, *::before, *::after {
            background: transparent !important;
            color: black !important;
            box-shadow: none !important;
            text-shadow: none !important;
            border-color: #999 !important;
          }
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-section {
            page-break-inside: avoid;
            break-inside: avoid;
            border: 1px solid #999 !important;
          }
          .print-color-blue {
            background-color: rgba(59, 130, 246, 0.15) !important;
            color: #2563eb !important;
            border-color: rgba(59, 130, 246, 0.4) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-color-orange {
            background-color: rgba(249, 115, 22, 0.15) !important;
            color: #ea580c !important;
            border-color: rgba(249, 115, 22, 0.4) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
          
          <div className="flex gap-3">
             <button
              onClick={selectAllForPrint}
              disabled={sortedMatches.length === 0}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md text-xs uppercase tracking-widest transition-colors"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">{selectedForPrint.size === sortedMatches.length && sortedMatches.length > 0 ? 'Deselect All' : 'Select All'}</span>
            </button>
             <button
              onClick={handleAdminToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs uppercase tracking-widest transition-colors ${isAdminMode ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10'}`}
            >
              {isAdminMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span className="hidden sm:inline">{isAdminMode ? 'Admin' : 'Operator'}</span>
            </button>
             <button
              onClick={() => window.print()}
              disabled={selectedForPrint.size === 0}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md text-xs uppercase tracking-widest transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print ({selectedForPrint.size})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Date Filter (No Print) */}
      {availableDates.length > 0 && (
        <div className="bg-[#0D0D0D] border-b border-white/5 p-3 no-print overflow-x-auto">
          <div className="max-w-6xl mx-auto flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-gray-500 font-bold mr-2 whitespace-nowrap">Filter by date:</span>
            <div className="flex gap-2">
              {availableDates.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${selectedDate === date ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}
                >
                  {format(parseISO(date), 'MMM d, yyyy')}
                </button>
              ))}
            </div>
            {selectedDate && (
              <button onClick={() => setSelectedDate(null)} className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors whitespace-nowrap ml-2">
                Show All
              </button>
            )}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
        
        {/* Upload Section (No Print) */}
        {isAdminMode && (
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
        )}

        {/* Daily Summary */}
        {dailySummary.length > 0 && (
          <div className="mb-6 print-section">
            <h3 className="text-sm font-bold tracking-widest uppercase text-cyan-400 mb-3 flex items-center gap-2 print:text-black">
              <Trophy className="w-4 h-4 print:hidden" />
              Daily Summary: {selectedDate ? format(parseISO(selectedDate), 'MMM d, yyyy') : 'All Time'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
              {dailySummary.map((team, idx) => (
                <div key={team.name} className={`bg-[#121212] border ${idx === 0 ? 'border-yellow-500/50 bg-yellow-950/20' : 'border-white/10'} rounded-lg p-3 print:bg-transparent print:border-gray-300 print:p-2`}>
                  <div className="text-xs text-gray-500 uppercase tracking-widest font-bold print:text-black print:text-[8px] truncate">
                    {team.name} {idx === 0 && <span className="ml-1 text-[8px] bg-yellow-500/20 text-yellow-500 px-1 py-0.5 rounded print:bg-gray-200 print:text-black">1ST</span>}
                  </div>
                  <div className="text-2xl font-black text-white mt-1 print:text-black print:text-lg">{team.totalScore}</div>
                  <div className="text-[10px] text-gray-400 mt-1 print:text-black print:text-[8px]">
                    {team.wins} Win{team.wins !== 1 && 's'} in {team.matches} Match{team.matches !== 1 && 'es'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matches List */}
        <div className={sortedMatches.length === 0 ? "" : "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 print:grid-cols-2 print:gap-2 print:text-[10px]"}>
          {sortedMatches.length === 0 ? (
            <div className="text-center py-12 bg-[#121212] rounded-xl border border-white/10 no-print">
              <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="text-sm font-bold tracking-widest uppercase text-gray-500">No matches found</h3>
              <p className="text-xs text-gray-600 mt-2">Upload a JSON result file to see it here.</p>
            </div>
          ) : (
            sortedMatches.map((match) => {
              const isSelected = selectedForPrint.has(match.matchId);
              const team1Won = match.team1Score > match.team2Score;
              const team2Won = match.team2Score > match.team1Score;

              return (
                <div 
                  key={match.matchId} 
                  className={`bg-[#121212] rounded-xl border flex flex-col transition-all overflow-hidden ${isSelected ? 'border-cyan-500 ring-2 ring-cyan-900/30 print-section' : 'border-white/10 no-print'}`}
                >
                  {/* Match Header */}
                  <div className="flex items-center justify-between p-2 md:p-3 border-b border-white/10 bg-[#0D0D0D] print:p-1.5 print:bg-gray-100 print:border-gray-300">
                    <div className="flex items-center gap-2 text-xs">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => togglePrintSelection(match.matchId)}
                        className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-cyan-500 cursor-pointer"
                        title="Select for Print"
                      />
                      <span className="text-cyan-400 font-bold print:text-black">
                        {format(parseISO(match.matchStartTimestamp), 'dd.MM.yy HH:mm')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-gray-300 uppercase tracking-widest print:text-[6px] print:bg-gray-200 print:border-gray-400 print:text-black">
                        {formatGameMode(match.gameMode)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isAdminMode && (
                        <button 
                          onClick={() => removeMatch(match.matchId)}
                          className="text-gray-600 hover:text-red-500 p-0.5 transition-colors no-print"
                          title="Delete Match"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Score Overview */}
                  <div className="p-3 flex justify-between items-center gap-3 print:p-1.5 print:gap-1">
                    {/* Team 1 */}
                    <div className="flex-1 bg-blue-950/20 border border-blue-500/20 rounded-lg p-2 flex flex-col justify-center items-center print:bg-transparent print:border-gray-200 print:p-1">
                      <div className="text-blue-400 font-bold uppercase text-[10px] flex items-center justify-center gap-1 w-full relative group min-h-[20px] print:text-black print:text-[8px] print:min-h-0">
                        {editingTeam?.matchId === match.matchId && editingTeam.team === 1 ? (
                           <div className="flex items-center gap-1 z-10">
                             <input 
                               autoFocus
                               value={editingName} 
                               onChange={(e) => setEditingName(e.target.value)} 
                               onKeyDown={(e) => { if (e.key === 'Enter') saveTeamName(); if (e.key === 'Escape') cancelEdit(); }}
                               className="bg-black/80 border border-blue-500/50 rounded px-1 w-16 md:w-20 text-center text-blue-400 focus:outline-none focus:border-blue-400"
                             />
                             <button onClick={saveTeamName} className="text-green-400 hover:text-green-300"><Check className="w-3 h-3" /></button>
                             <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-300"><X className="w-3 h-3" /></button>
                           </div>
                        ) : (
                          <>
                            <span className="truncate max-w-[100px] print:max-w-full">{match.team1Name || 'Team 1'}</span>
                            <span className="shrink-0 text-[7px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 py-0.5 rounded tracking-widest print-color-blue print:text-[5px]">BLUE</span>
                            {team1Won && <span className="text-[8px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded print:text-[6px] print:bg-gray-200 print:text-black">WIN</span>}
                            {isAdminMode && (
                              <button onClick={() => handleEditTeamName(match.matchId, 1, match.team1Name || 'Team 1')} className="opacity-0 group-hover:opacity-100 absolute -right-1 md:-right-2 top-0 text-blue-400/50 hover:text-blue-400 transition-opacity p-0.5 bg-blue-900/50 rounded no-print">
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="text-2xl font-black text-white print:text-black print:text-lg">{match.team1Score}</div>
                    </div>
                    
                    <div className="text-gray-600 font-black text-xs uppercase tracking-widest print:text-black print:text-[8px]">VS</div>
                    
                    {/* Team 2 */}
                    <div className="flex-1 bg-orange-950/20 border border-orange-500/20 rounded-lg p-2 flex flex-col justify-center items-center print:bg-transparent print:border-gray-200 print:p-1">
                      <div className="text-orange-400 font-bold uppercase text-[10px] flex items-center justify-center gap-1 w-full relative group min-h-[20px] print:text-black print:text-[8px] print:min-h-0">
                        {editingTeam?.matchId === match.matchId && editingTeam.team === 2 ? (
                           <div className="flex items-center gap-1 z-10">
                             <input 
                               autoFocus
                               value={editingName} 
                               onChange={(e) => setEditingName(e.target.value)} 
                               onKeyDown={(e) => { if (e.key === 'Enter') saveTeamName(); if (e.key === 'Escape') cancelEdit(); }}
                               className="bg-black/80 border border-orange-500/50 rounded px-1 w-16 md:w-20 text-center text-orange-400 focus:outline-none focus:border-orange-400"
                             />
                             <button onClick={saveTeamName} className="text-green-400 hover:text-green-300"><Check className="w-3 h-3" /></button>
                             <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-300"><X className="w-3 h-3" /></button>
                           </div>
                        ) : (
                          <>
                            <span className="truncate max-w-[100px] print:max-w-full">{match.team2Name || 'Team 2'}</span>
                            <span className="shrink-0 text-[7px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1 py-0.5 rounded tracking-widest print-color-orange print:text-[5px]">ORANGE</span>
                            {team2Won && <span className="text-[8px] bg-orange-500/20 text-orange-300 px-1 py-0.5 rounded print:text-[6px] print:bg-gray-200 print:text-black">WIN</span>}
                            {isAdminMode && (
                              <button onClick={() => handleEditTeamName(match.matchId, 2, match.team2Name || 'Team 2')} className="opacity-0 group-hover:opacity-100 absolute -right-1 md:-right-2 top-0 text-orange-400/50 hover:text-orange-400 transition-opacity p-0.5 bg-orange-900/50 rounded no-print">
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="text-2xl font-black text-white print:text-black print:text-lg">{match.team2Score}</div>
                    </div>
                  </div>

                  {/* Player Stats Tables */}
                  <div className="px-3 pb-3 grid grid-cols-1 gap-3 flex-1 print:p-1.5 print:gap-1.5">
                    <TeamTable teamName="Team 1" stats={match.playerStats.filter(p => p.team === 1)} color="blue" />
                    <TeamTable teamName="Team 2" stats={match.playerStats.filter(p => p.team === 2)} color="orange" />
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
    <div className="bg-white/5 border border-white/10 rounded-md overflow-hidden print:border-gray-200 print:bg-transparent">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-white/5 print:bg-gray-100">
            <tr className="text-[8px] uppercase tracking-widest text-gray-500 print:text-black print:text-[6px]">
              <th className="py-1.5 px-2 font-bold truncate print:py-0.5 print:px-1">Player</th>
              <th className="py-1.5 px-1 font-bold text-center w-[18%] print:py-0.5 print:px-0.5" title="Score">Score</th>
              <th className="py-1.5 px-1 font-bold text-center w-[12%] print:py-0.5 print:px-0.5" title="Kills">Kills</th>
              <th className="py-1.5 px-1 font-bold text-center w-[12%] print:py-0.5 print:px-0.5" title="Deaths">Deaths</th>
              <th className="py-1.5 px-1 font-bold text-center w-[12%] print:py-0.5 print:px-0.5" title="Assists">AST</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[10px] print:divide-gray-200 print:text-[8px]">
            {sortedStats.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-2 text-center text-gray-600 italic print:py-0.5">No players recorded</td>
              </tr>
            ) : (
              sortedStats.map((player, idx) => {
                const isMVP = idx === 0 && player.score > 0;
                return (
                  <tr key={idx} className={`hover:bg-white/[0.02] print:bg-transparent ${isMVP && !player.isBot ? rowHighlight : player.isBot ? 'opacity-70 italic' : ''}`}>
                    <td className="py-1.5 px-2 font-medium text-gray-300 print:text-black print:py-0.5 print:px-1 truncate">
                      <div className="flex items-center gap-1 w-full truncate">
                        <span className={`truncate ${isMVP && !player.isBot ? 'font-bold text-white print:text-black' : ''}`} title={player.playerName}>
                          {player.playerName}
                        </span>
                        {isMVP && !player.isBot && (
                          <span className={`shrink-0 text-[7px] px-1 rounded uppercase tracking-wider font-bold print:text-[5px] print:bg-gray-200 print:text-black ${mvpBadge}`}>MVP</span>
                        )}
                        {player.isBot && (
                          <span className="shrink-0 text-[7px] border border-white/20 text-gray-500 px-1 rounded uppercase font-bold print:border-gray-300 print:text-[5px]">Bot</span>
                        )}
                      </div>
                    </td>
                    <td className={`py-1.5 px-1 font-mono text-center print:py-0.5 print:text-black ${textColor}`}>{player.score}</td>
                    <td className="py-1.5 px-1 text-center text-gray-400 print:py-0.5 print:text-black">{player.kills}</td>
                    <td className="py-1.5 px-1 text-center text-gray-400 print:py-0.5 print:text-black">{player.deaths}</td>
                    <td className="py-1.5 px-1 text-center text-gray-400 print:py-0.5 print:text-black">{player.assists}</td>
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
