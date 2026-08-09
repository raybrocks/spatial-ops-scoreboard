'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Upload, Printer, Trash2, Trophy, Lock, Unlock, Edit2, Check, X, CheckSquare, ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';
import { useMatchData } from '@/hooks/use-match-data';
import { MatchData, PlayerStat } from '@/types/match';

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

export default function Home() {
  const { matches, addMatch, removeMatch, updateMatch, isLoaded } = useMatchData();
  const [uploadError, setUploadError] = useState('');
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  
  const [isAutoFetchEnabled, setIsAutoFetchEnabled] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [fetchMessage, setFetchMessage] = useState('Auto-fetch is disabled.');
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  
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
      setIsAutoFetchEnabled(false); // Turn off auto-fetch when leaving admin mode
      setFetchStatus('idle');
      setFetchMessage('Auto-fetch is disabled.');
    } else {
      const pin = window.prompt("Enter Operator PIN:");
      if (pin === "5378") {
        setIsAdminMode(true);
        setIsAutoFetchEnabled(true); // Automatically turn on when entering admin mode
      } else if (pin !== null) {
        alert("Incorrect PIN");
      }
    }
  };

  const matchesRef = useRef(matches);
  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  const isDuplicateMatch = useCallback((newMatch: MatchData) => {
    return matchesRef.current.some(m => m.matchStartTimestamp === newMatch.matchStartTimestamp);
  }, []);

  const fetchFromGameServer = useCallback(async () => {
    setFetchStatus('fetching');
    setFetchMessage('Fetching from localhost:7770...');
    try {
      const res = await fetch('http://localhost:7770/matchstats', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const parsedData = await res.json() as MatchData;
      
      if (!parsedData.matchId || typeof parsedData.team1Score !== 'number') {
        throw new Error('Invalid Match Data format received.');
      }

      if (parsedData.gameMode?.toLowerCase() === 'survival' && parsedData.playerStats) {
        const humanPlayers = parsedData.playerStats
          .filter(p => p.team === 1 && !p.isBot)
          .map(p => p.playerName)
          .sort();
        if (humanPlayers.length > 0) {
          parsedData.team1Name = humanPlayers.join('+');
        }
      }

      if (isDuplicateMatch(parsedData)) {
        setFetchStatus('success');
        setFetchMessage(`Checked at ${format(new Date(), 'HH:mm:ss')} - Latest match already in database.`);
      } else {
        await addMatch(parsedData);
        setFetchStatus('success');
        setFetchMessage(`Added new match at ${format(new Date(), 'HH:mm:ss')}!`);
      }
      setLastFetchTime(new Date());
    } catch (err: any) {
      setFetchStatus('error');
      setFetchMessage(`Failed to fetch: ${err.message}`);
    }
  }, [addMatch, isDuplicateMatch]);

  useEffect(() => {
    if (!isAutoFetchEnabled) return;

    const timer = setTimeout(() => {
      fetchFromGameServer();
    }, 0);
    const interval = setInterval(fetchFromGameServer, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isAutoFetchEnabled, fetchFromGameServer]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Automatically try to submit if it's a file upload
        const parsedData = JSON.parse(content) as MatchData;
        if (!parsedData.matchId || typeof parsedData.team1Score !== 'number') {
          throw new Error('Invalid Match Data format.');
        }
        if (isDuplicateMatch(parsedData)) {
          throw new Error('Duplicate match. A match with this timestamp already exists.');
        }
        
        if (parsedData.gameMode?.toLowerCase() === 'survival' && parsedData.playerStats) {
          const humanPlayers = parsedData.playerStats
            .filter(p => p.team === 1 && !p.isBot)
            .map(p => p.playerName)
            .sort();
          if (humanPlayers.length > 0) {
            parsedData.team1Name = humanPlayers.join('+');
          }
        }
        
        addMatch(parsedData);
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
    const today = format(new Date(), 'yyyy-MM-dd');
    dates.add(today);
    matches.forEach(m => {
      if (m.matchStartTimestamp) {
        dates.add(format(parseISO(m.matchStartTimestamp), 'yyyy-MM-dd'));
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [matches]);

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

  const { tdmMatches, survivalMatches } = useMemo(() => {
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
    return { tdmMatches: tdm, survivalMatches: survival };
  }, [sortedMatches]);

  const tdmDailySummary = useMemo(() => {
    const summary: Record<string, { matches: number, totalScore: number, wins: number }> = {};
    
    tdmMatches.forEach(match => {
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
  }, [tdmMatches]);

  const tdmPlayerSummary = useMemo(() => {
    const summary: Record<string, { score: number, kills: number, deaths: number, assists: number, matches: number, mvps: number, isBot: boolean, teamName: string }> = {};
    
    tdmMatches.forEach(match => {
      const t1Stats = match.playerStats.filter(p => p.team === 1).sort((a, b) => b.score - a.score);
      const t2Stats = match.playerStats.filter(p => p.team === 2).sort((a, b) => b.score - a.score);
      
      const t1Mvp = t1Stats.length > 0 && t1Stats[0].score > 0 && !t1Stats[0].isBot ? t1Stats[0].playerName : null;
      const t2Mvp = t2Stats.length > 0 && t2Stats[0].score > 0 && !t2Stats[0].isBot ? t2Stats[0].playerName : null;

      match.playerStats.forEach(player => {
        if (!summary[player.playerName]) {
          summary[player.playerName] = { score: 0, kills: 0, deaths: 0, assists: 0, matches: 0, mvps: 0, isBot: player.isBot, teamName: '' };
        }
        
        if (!summary[player.playerName].teamName) {
          summary[player.playerName].teamName = player.team === 1 ? (match.team1Name || 'Team 1') : (match.team2Name || 'Team 2');
        }

        summary[player.playerName].score += player.score;
        summary[player.playerName].kills += player.kills;
        summary[player.playerName].deaths += player.deaths || 0;
        summary[player.playerName].assists += player.assists || 0;
        summary[player.playerName].matches += 1;
        
        if (!player.isBot && (player.playerName === t1Mvp || player.playerName === t2Mvp)) {
          summary[player.playerName].mvps += 1;
        }
      });
    });

    return Object.entries(summary)
      .map(([name, stats]) => ({ name, ...stats }))
      .filter(p => !p.isBot) // only show real players
      .sort((a, b) => b.score - a.score);
  }, [tdmMatches]);

  const survivalTeamSummary = useMemo(() => {
    return [...survivalMatches].sort((a, b) => {
      const waveA = a.waveIndex ?? 0;
      const waveB = b.waveIndex ?? 0;
      if (waveB !== waveA) return waveB - waveA;
      return b.team1Score - a.team1Score;
    });
  }, [survivalMatches]);

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
          .print-page-break {
            page-break-after: always !important;
            break-after: page !important;
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

      {/* Header */}
      <header className="border-b border-white/10 bg-[#0D0D0D] p-4 print:bg-transparent print:border-0 print:p-0 print:mb-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 justify-center md:justify-start w-full md:w-auto">
            <Trophy className="w-8 h-8 text-cyan-400 print:hidden" />
            <img src="/logo.png" alt="KRS VR Arena" className="hidden print:block h-16 object-contain" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-cyan-400 print:text-black print:text-2xl print:tracking-widest">MIXED REALITY SHOOTER</h1>
            </div>
          </div>
          
          <div className="flex gap-3 no-print">
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
              <span className="hidden sm:inline">{isAdminMode ? 'Operator' : 'Customer'}</span>
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

      {/* Date Navigation (No Print) */}
      {availableDates.length > 0 && (
        <div className="bg-[#0D0D0D] border-b border-white/5 p-3 no-print">
          <div className="max-w-6xl mx-auto flex justify-center items-center gap-6">
            <button 
              onClick={() => {
                if (selectedDate) {
                  const idx = availableDates.indexOf(selectedDate);
                  if (idx < availableDates.length - 1) setSelectedDate(availableDates[idx + 1]);
                }
              }}
              disabled={!selectedDate || availableDates.indexOf(selectedDate) === availableDates.length - 1}
              className="p-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <span className="text-sm uppercase tracking-widest text-cyan-400 font-bold min-w-[140px] text-center">
              {selectedDate ? format(parseISO(selectedDate), 'dd.MM.yyyy') : '...'}
            </span>
            
            <button 
              onClick={() => {
                if (selectedDate) {
                  const idx = availableDates.indexOf(selectedDate);
                  if (idx > 0) setSelectedDate(availableDates[idx - 1]);
                }
              }}
              disabled={!selectedDate || availableDates.indexOf(selectedDate) === 0}
              className="p-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
        
        {/* Admin Control Section (No Print) */}
        {isAdminMode && (
          <section className="bg-[#121212] rounded-xl border border-white/10 p-6 mb-8 no-print">
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4 flex items-center gap-2 text-cyan-400">
            <Upload className="w-4 h-4" />
            Match Import & Auto-Fetch
          </h2>
          
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 border border-white/10 rounded-lg p-4 bg-black/20 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest text-white">Auto-Fetch (localhost:7770)</span>
                  <span className="text-[10px] text-gray-500">Automatically fetches latest match every minute</span>
                </div>
                <button
                  onClick={() => setIsAutoFetchEnabled(!isAutoFetchEnabled)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                    isAutoFetchEnabled 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                      : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                  }`}
                >
                  {isAutoFetchEnabled ? 'Turn OFF' : 'Turn ON'}
                </button>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${
                  fetchStatus === 'fetching' ? 'bg-yellow-400 animate-pulse' :
                  fetchStatus === 'success' ? 'bg-green-400' :
                  fetchStatus === 'error' ? 'bg-red-400' : 'bg-gray-600'
                }`}></span>
                <span className="text-xs text-gray-400 font-mono">{fetchMessage}</span>
              </div>
              
              {isAutoFetchEnabled && (
                <button 
                  onClick={fetchFromGameServer}
                  disabled={fetchStatus === 'fetching'}
                  className="mt-4 text-[10px] uppercase tracking-widest text-cyan-500 border border-cyan-500/30 hover:bg-cyan-500/10 px-3 py-1.5 rounded self-start disabled:opacity-50 transition-colors"
                >
                  Force Check Now
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-center">
              <span className="text-gray-600 text-xs font-bold uppercase tracking-widest">OR</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <label className="flex flex-col items-center justify-center w-full h-full min-h-[120px] border border-white/10 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-cyan-500/50 mb-3" />
                  <p className="mb-2 text-sm text-gray-400"><span className="font-bold text-gray-300">Click to upload</span> or drag and drop</p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">JSON match file</p>
                </div>
                <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
              </label>
              {uploadError && <p className="text-red-400 text-[10px] mt-2 font-mono text-center">{uploadError}</p>}
            </div>
          </div>
        </section>
        )}

        {/* Summaries Container with Page Break */}
        <div className="print-page-break">
          
          {/* TEAM DEATHMATCH SUMMARY */}
          {tdmMatches.length > 0 && (
            <div className="mb-8 border-b border-white/5 pb-8 print:border-none print:pb-0">
              <h2 className="text-sm font-bold tracking-widest uppercase text-yellow-500 mb-4 flex items-center gap-2 print:text-black">
                <Trophy className="w-4 h-4 print:hidden" />
                TEAM DEATHMATCH & PVP SUMMARY: {selectedDate ? format(parseISO(selectedDate), 'MMM d, yyyy') : 'All Time'}
              </h2>
              
              {/* TDM Team Stats */}
              {tdmDailySummary.length > 0 && (
                <div className="mb-6 print-section">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
                    {tdmDailySummary.map((team, idx) => (
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

              {/* TDM Player Leaderboard */}
              {tdmPlayerSummary.length > 0 && (
                <div className="print-section">
                  <div className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden print:bg-transparent print:border-gray-300">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead className="bg-[#1A1A1A] print:bg-gray-100">
                          <tr className="text-[10px] uppercase tracking-widest text-gray-500 print:text-black print:text-[8px]">
                            <th className="py-2 px-3 font-bold truncate print:py-1 print:px-2 min-w-[120px] sticky left-0 bg-[#1A1A1A] z-10 print:static print:bg-transparent">Player</th>
                            <th className="py-2 px-2 font-bold truncate print:py-1 print:px-1 min-w-[70px]">Team</th>
                            <th className="py-2 px-2 font-bold text-center min-w-[50px] print:py-1 print:px-1">Score</th>
                            <th className="py-2 px-2 font-bold text-center min-w-[50px] print:py-1 print:px-1">Kills</th>
                            <th className="py-2 px-2 font-bold text-center min-w-[50px] print:py-1 print:px-1">Deaths</th>
                            <th className="py-2 px-2 font-bold text-center min-w-[50px] print:py-1 print:px-1">AST</th>
                            <th className="py-2 px-2 font-bold text-center min-w-[50px] print:py-1 print:px-1">Matches</th>
                            <th className="py-2 px-2 font-bold text-center min-w-[50px] print:py-1 print:px-1">MVPs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs print:divide-gray-200 print:text-[10px]">
                          {tdmPlayerSummary.map((player, idx) => (
                            <tr key={player.name} className={`group hover:bg-[#1a1a1a] print:bg-transparent transition-colors ${idx === 0 ? 'bg-[#1a170c]' : 'bg-[#121212]'}`}>
                              <td className="py-2 px-3 font-medium text-gray-300 print:text-black print:py-1 print:px-2 flex items-center gap-2 sticky left-0 z-10 bg-inherit print:static print:bg-transparent border-r border-transparent print:border-none">
                                <span className="text-gray-500 w-3 text-right text-[10px] print:text-[8px] print:text-gray-600">{idx + 1}.</span>
                                <span className={`truncate ${idx === 0 ? 'text-yellow-500 font-bold' : ''}`}>{player.name}</span>
                                {idx === 0 && <span className="text-[8px] bg-yellow-500/20 text-yellow-500 px-1 py-0.5 rounded print-color-orange">1ST</span>}
                              </td>
                              <td className="py-2 px-2 text-gray-500 text-[9px] uppercase tracking-widest truncate print:text-gray-600 print:py-1 print:px-1">{player.teamName}</td>
                              <td className="py-2 px-2 font-mono text-center font-bold text-white print:py-1 print:px-1 print:text-black">{player.score}</td>
                              <td className="py-2 px-2 text-center text-gray-400 print:py-1 print:px-1 print:text-black">{player.kills}</td>
                              <td className="py-2 px-2 text-center text-gray-400 print:py-1 print:px-1 print:text-black">{player.deaths}</td>
                              <td className="py-2 px-2 text-center text-gray-400 print:py-1 print:px-1 print:text-black">{player.assists}</td>
                              <td className="py-2 px-2 text-center text-gray-500 print:py-1 print:px-1 print:text-black">{player.matches}</td>
                              <td className="py-2 px-2 text-center text-yellow-600/70 print:py-1 print:px-1 print:text-black">{player.mvps > 0 ? player.mvps : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SURVIVAL SUMMARY */}
          {survivalMatches.length > 0 && (
            <div className="mb-8 print-section">
              <h2 className="text-sm font-bold tracking-widest uppercase text-cyan-400 mb-4 flex items-center gap-2 print:text-black">
                <Crosshair className="w-4 h-4 print:hidden" />
                Survival Summary: {selectedDate ? format(parseISO(selectedDate), 'MMM d, yyyy') : 'All Time'}
              </h2>

              {survivalTeamSummary.length > 0 && (
                <div className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden print:bg-transparent print:border-gray-300">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead className="bg-[#1A1A1A] print:bg-gray-100">
                        <tr className="text-[10px] uppercase tracking-widest text-gray-500 print:text-black print:text-[8px]">
                          <th className="py-2 px-3 font-bold truncate print:py-1 print:px-2 min-w-[120px] sticky left-0 bg-[#1A1A1A] z-10 print:static print:bg-transparent">Team</th>
                          <th className="py-2 px-2 font-bold text-center min-w-[50px] print:py-1 print:px-1">Wave Reached</th>
                          <th className="py-2 px-2 font-bold text-center min-w-[50px] print:py-1 print:px-1">Team Score</th>
                          <th className="py-2 px-2 font-bold text-center min-w-[80px] print:py-1 print:px-1">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs print:divide-gray-200 print:text-[10px]">
                        {survivalTeamSummary.slice(0, 10).map((match, idx) => (
                          <tr key={match.matchId} className={`group hover:bg-[#1a1a1a] print:bg-transparent transition-colors ${idx === 0 ? 'bg-[#0f1b21]' : 'bg-[#121212]'}`}>
                            <td className="py-2 px-3 font-medium text-gray-300 print:text-black print:py-1 print:px-2 flex items-center gap-2 sticky left-0 z-10 bg-inherit print:static print:bg-transparent border-r border-transparent print:border-none">
                              <span className="text-gray-500 w-3 text-right text-[10px] print:text-[8px] print:text-gray-600">{idx + 1}.</span>
                              <span className={`truncate ${idx === 0 ? 'text-cyan-400 font-bold' : ''}`}>{match.team1Name || 'Unknown Team'}</span>
                              {idx === 0 && <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded">HIGH SCORE</span>}
                            </td>
                            <td className="py-2 px-2 font-mono text-center font-bold text-white print:py-1 print:px-1 print:text-black">{match.waveIndex !== undefined ? match.waveIndex + 1 : '-'}</td>
                            <td className="py-2 px-2 font-mono text-center font-bold text-cyan-400 print:py-1 print:px-1 print:text-black">{match.team1Score}</td>
                            <td className="py-2 px-2 font-mono text-center text-gray-500 print:py-1 print:px-1 print:text-black">{format(parseISO(match.matchStartTimestamp), 'dd.MM HH:mm')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div> {/* End Summaries Container */}

        {/* Match Details Toggle Section (No Print) */}
        {sortedMatches.length > 0 && (
          <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4 no-print mt-12">
            <h2 className="text-sm uppercase tracking-widest font-bold text-cyan-400">Match Details</h2>

            <button
              onClick={() => setShowMatchDetails(!showMatchDetails)}
              className="bg-cyan-600/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 px-6 py-2 rounded-md text-xs uppercase tracking-widest font-bold transition-colors shadow-lg shadow-cyan-900/20"
            >
              {showMatchDetails ? 'Hide match details' : 'Show details from each match'}
            </button>
          </div>
        )}

        {/* Matches List */}
        <div className={sortedMatches.length === 0 || showMatchDetails ? "block" : "hidden print:block"}>
          <div className={sortedMatches.length === 0 ? "" : "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 print:grid-cols-1 print:gap-2 print:text-[10px]"}>
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
              const duration = getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp);
              const isSurvival = match.gameMode?.toLowerCase() === 'survival';

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
                      {match.gameMode?.toLowerCase() === 'survival' && match.lifeMode && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-900/30 border border-cyan-500/20 text-[9px] text-cyan-300 uppercase tracking-widest print:text-[6px] print:bg-gray-200 print:border-gray-400 print:text-black">
                          {formatLifeMode(match.lifeMode)}
                        </span>
                      )}
                      {duration && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-gray-400 uppercase tracking-widest print:text-[6px] print:bg-gray-200 print:border-gray-400 print:text-black">
                          {duration}
                        </span>
                      )}
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
                  {!isSurvival ? (
                    <div className="p-3 flex justify-between items-center gap-3 print:p-1.5 print:gap-1">
                      {/* Team 1 */}
                      <div className={`flex-1 rounded-lg p-2 flex flex-col justify-center items-center relative overflow-hidden transition-all print:bg-transparent print:border-gray-200 print:p-1 ${team1Won ? 'bg-blue-900/30 border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-blue-950/10 border border-blue-500/10 opacity-70'}`}>
                        {team1Won && <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg shadow-md tracking-widest uppercase print:hidden">Winner</div>}
                        <div className="text-blue-400 font-bold uppercase text-[10px] flex items-center justify-center gap-1 w-full relative group min-h-[20px] print:text-black print:text-[8px] print:min-h-0 z-10">
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
                              <span className={`truncate max-w-[100px] print:max-w-full ${team1Won ? 'text-white' : ''}`}>{match.team1Name || 'Team 1'}</span>
                              <span className="shrink-0 text-[7px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1 py-0.5 rounded tracking-widest print-color-blue print:text-[5px]">BLUE</span>
                              {team1Won && <span className="hidden print:inline-block text-[6px] print:bg-gray-200 print:text-black px-1 py-0.5 rounded">WIN</span>}
                              {isAdminMode && (
                                <button onClick={() => handleEditTeamName(match.matchId, 1, match.team1Name || 'Team 1')} className="opacity-0 group-hover:opacity-100 absolute -right-1 md:-right-2 top-0 text-blue-400/50 hover:text-blue-400 transition-opacity p-0.5 bg-blue-900/50 rounded no-print">
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        <div className={`text-3xl font-black mt-1 z-10 print:text-black print:text-lg ${team1Won ? 'text-white' : 'text-blue-200/50'}`}>{match.team1Score}</div>
                      </div>
                      
                      <div className="text-gray-600 font-black text-xs uppercase tracking-widest print:text-black print:text-[8px]">VS</div>
                      
                      {/* Team 2 */}
                      <div className={`flex-1 rounded-lg p-2 flex flex-col justify-center items-center relative overflow-hidden transition-all print:bg-transparent print:border-gray-200 print:p-1 ${team2Won ? 'bg-orange-900/30 border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'bg-orange-950/10 border border-orange-500/10 opacity-70'}`}>
                        {team2Won && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg shadow-md tracking-widest uppercase print:hidden">Winner</div>}
                        <div className="text-orange-400 font-bold uppercase text-[10px] flex items-center justify-center gap-1 w-full relative group min-h-[20px] print:text-black print:text-[8px] print:min-h-0 z-10">
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
                              <span className={`truncate max-w-[100px] print:max-w-full ${team2Won ? 'text-white' : ''}`}>{match.team2Name || 'Team 2'}</span>
                              <span className="shrink-0 text-[7px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-1 py-0.5 rounded tracking-widest print-color-orange print:text-[5px]">ORANGE</span>
                              {team2Won && <span className="hidden print:inline-block text-[6px] print:bg-gray-200 print:text-black px-1 py-0.5 rounded">WIN</span>}
                              {isAdminMode && (
                                <button onClick={() => handleEditTeamName(match.matchId, 2, match.team2Name || 'Team 2')} className="opacity-0 group-hover:opacity-100 absolute -right-1 md:-right-2 top-0 text-orange-400/50 hover:text-orange-400 transition-opacity p-0.5 bg-orange-900/50 rounded no-print">
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        <div className={`text-3xl font-black mt-1 z-10 print:text-black print:text-lg ${team2Won ? 'text-white' : 'text-orange-200/50'}`}>{match.team2Score}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 flex justify-center items-center gap-3 bg-cyan-950/20 border-b border-white/5 print:bg-transparent print:border-gray-200 print:p-1.5">
                      <div className="flex flex-col items-center">
                        <span className="text-cyan-400 font-bold uppercase tracking-widest text-xs print:text-black print:text-[10px]">Survival Mode {duration ? ` ${duration}` : ''}</span>
                        {match.waveIndex !== undefined && (
                          <span className="text-2xl font-black text-white mt-1 print:text-black">Wave {match.waveIndex + 1}</span>
                        )}
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 print:text-gray-600 print:text-[8px]">Team Score: <span className="text-white font-bold">{match.team1Score}</span></span>
                      </div>
                    </div>
                  )}

                  {/* Player Stats Tables */}
                  <div className={`px-3 pb-3 grid grid-cols-1 gap-3 flex-1 print:p-1.5 print:gap-2 ${isSurvival ? '' : 'print:grid-cols-2'}`}>
                    <TeamTable teamName="Team 1" stats={match.playerStats.filter(p => p.team === 1)} color="blue" isSurvival={isSurvival} />
                    {!isSurvival && (
                      <TeamTable teamName="Team 2" stats={match.playerStats.filter(p => p.team === 2)} color="orange" />
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      </main>
    </div>
  );
}

function TeamTable({ teamName, stats, color, isSurvival }: { teamName: string, stats: PlayerStat[], color: 'blue' | 'red' | 'orange', isSurvival?: boolean }) {
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
                          <span className={`shrink-0 text-[7px] px-1 rounded uppercase tracking-wider font-bold print:text-[5px] print:bg-gray-200 print:text-black ${mvpBadge}`}>{isSurvival ? 'WINNER' : 'MVP'}</span>
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
