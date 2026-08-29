'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { 
  Upload, Printer, Trash2, Trophy, Lock, Unlock, Edit2, Check, X, 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Clock, Users 
} from 'lucide-react';
import { useMatchData } from '@/hooks/use-match-data';
import { useTournaments } from '@/hooks/use-tournaments';
import { Tournament } from '@/types/tournament';
import { MatchData, PlayerStat } from '@/types/match';
import { getTournamentsForDate, getTournamentTitle, groupMatchesByTournament, TournamentGroup } from '@/lib/tournaments';
import { getSurvivalHighscores, HighscoreLevel } from '@/lib/survival-highscores';
import { HighscoreBadge } from '@/components/HighscoreBadge';
import { TdmBanner, SurvivalBanner } from '@/components/SectionTitles';

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
  const { matches, addMatch, removeMatch, updateMatch, isLoaded: matchesLoaded } = useMatchData();
  const { tournaments, addTournament, updateTournament, removeTournament, isLoaded: tournamentsLoaded } = useTournaments();
  const isLoaded = matchesLoaded && tournamentsLoaded;

  const [uploadError, setUploadError] = useState('');
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
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
    router.push(`/${newDate}`);
  };
  
  const [isAutoFetchEnabled, setIsAutoFetchEnabled] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [fetchMessage, setFetchMessage] = useState('Auto-fetch is disabled.');
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  
  const [editingTeam, setEditingTeam] = useState<{matchId: string, team: 1 | 2} | null>(null);
  const [editingName, setEditingName] = useState('');

  // --- Tournament State & Modals ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newName, setNewName] = useState('');

  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editName, setEditName] = useState('');

  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set());

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
      setIsAutoFetchEnabled(false);
      setFetchStatus('idle');
      setFetchMessage('Auto-fetch is disabled.');
    } else {
      const pin = window.prompt("Enter Operator PIN:");
      if (pin === "5378") {
        setIsAdminMode(true);
        setIsAutoFetchEnabled(true);
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
        setUploadError('');
        e.target.value = '';
      } catch (err: any) {
        setUploadError(err.message || 'Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const togglePrintSelection = (matchId: string) => {
    setSelectedForPrint(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    matches.forEach(m => {
      if (m.matchStartTimestamp) {
        dates.add(format(parseISO(m.matchStartTimestamp), 'yyyy-MM-dd'));
      }
    });
    tournaments.forEach(t => {
      if (t.date) dates.add(t.date);
    });
    return Array.from(dates).sort().reverse();
  }, [matches, tournaments]);

  const dayTournaments = useMemo(() => {
    return getTournamentsForDate(tournaments, selectedDate);
  }, [tournaments, selectedDate]);

  const dayMatches = useMemo(() => {
    return matches.filter(
      (m) => m.matchStartTimestamp && format(parseISO(m.matchStartTimestamp), 'yyyy-MM-dd') === selectedDate
    );
  }, [matches, selectedDate]);

  const tournamentGroups = useMemo(() => {
    return groupMatchesByTournament(dayMatches, dayTournaments);
  }, [dayMatches, dayTournaments]);

  // Default auto-expand latest (active) tournament on load or date switch
  useEffect(() => {
    if (tournamentGroups.length > 0) {
      const latestId = tournamentGroups[tournamentGroups.length - 1].id;
      setExpandedTournaments(new Set([latestId]));
    }
  }, [selectedDate, dayTournaments.length]);

  const toggleTournamentExpand = (id: string) => {
    setExpandedTournaments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenCreateModal = () => {
    setNewStartTime(format(new Date(), 'HH:mm'));
    setNewName('');
    setIsCreateModalOpen(true);
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStartTime) return;
    const id = `tourn_${selectedDate}_${newStartTime.replace(':', '')}_${Date.now().toString(36)}`;
    await addTournament({
      id,
      date: selectedDate,
      startTime: newStartTime,
      name: newName.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    // Auto collapse others and expand new tournament
    setExpandedTournaments(new Set([id]));
    setIsCreateModalOpen(false);
    setNewName('');
  };

  const handleOpenEditModal = (t: Tournament) => {
    setEditingTournament(t);
    setEditStartTime(t.startTime);
    setEditName(t.name || '');
  };

  const handleSaveEditTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournament || !editStartTime) return;
    await updateTournament(editingTournament.id, {
      startTime: editStartTime,
      name: editName.trim() || undefined,
    });
    setEditingTournament(null);
  };

  const handleDeleteTournament = async (id: string, title: string) => {
    if (window.confirm(`Er du sikker på at du vil slette turneringen "${title}"?\n\nKampene vil ikke bli slettet, men grupperes inn i forrige/generelle bolk.`)) {
      await removeTournament(id);
    }
  };

  const survivalHighscores = useMemo(() => {
    const allSurvival = matches.filter(m => m.gameMode?.toLowerCase() === 'survival');
    return getSurvivalHighscores(allSurvival);
  }, [matches]);

  if (!isLoaded) return <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest">Loading...</div>;

  return (
    <div className={`min-h-screen bg-[#0A0A0A] text-gray-200 font-sans ${isPrintMode ? 'print-mode' : ''}`}>
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 8mm 6mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-mode {
            background-color: white !important;
            color: black !important;
          }
          .print-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-page-break {
            page-break-before: always;
            break-before: page;
          }
          .print-color-blue {
            background-color: #dbeafe !important;
            color: #1e40af !important;
            border-color: #93c5fd !important;
          }
          .print-color-orange {
            background-color: #ffedd5 !important;
            color: #9a3412 !important;
            border-color: #fdba74 !important;
          }
        }
      `}} />

      {/* Header (No Print) */}
      <header className="border-b border-white/10 bg-[#0D0D0D] p-3 sm:p-4 sticky top-0 z-50 no-print print:bg-transparent print:border-0 print:p-0 print:mb-6">
        <div className="max-w-6xl mx-auto relative flex flex-row justify-end items-center gap-2 sm:gap-4 min-h-[40px] sm:min-h-[48px] w-full">
          {/* Centered Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.svg" 
              alt="KRS VR Arena" 
              className="h-8 sm:h-11 print:h-16 object-contain pointer-events-auto cursor-pointer transition-transform hover:scale-105" 
              onClick={() => router.push('/')}
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 z-10 ml-auto">
            {isAdminMode && (
              <>
                <button
                  onClick={handleOpenCreateModal}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-yellow-950 px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Start ny turnering</span>
                </button>

                {dayMatches.length > 0 && (
                  <button
                    onClick={() => {
                      setIsPrintMode(true);
                      setTimeout(() => {
                        window.print();
                        setIsPrintMode(false);
                      }, 100);
                    }}
                    disabled={selectedForPrint.size === 0}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${
                      selectedForPrint.size > 0
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Print ({selectedForPrint.size})</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={handleAdminToggle}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs uppercase tracking-widest transition-colors ${isAdminMode ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10'}`}
            >
              {isAdminMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span className="hidden sm:inline">{isAdminMode ? 'Operator' : 'Customer'}</span>
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
                const idx = availableDates.indexOf(selectedDate);
                if (idx < availableDates.length - 1) handleDateChange(availableDates[idx + 1]);
              }}
              disabled={availableDates.indexOf(selectedDate) >= availableDates.length - 1}
              className="p-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <span className="text-sm uppercase tracking-widest text-gray-400 font-bold min-w-[140px] text-center">
              {selectedDate ? format(parseISO(selectedDate), 'dd.MM.yyyy') : '...'}
            </span>
            
            <button 
              onClick={() => {
                const idx = availableDates.indexOf(selectedDate);
                if (idx > 0) handleDateChange(availableDates[idx - 1]);
              }}
              disabled={availableDates.indexOf(selectedDate) <= 0}
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
          <section className="bg-[#121212] rounded-xl border border-white/10 p-6 mb-8 no-print shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm uppercase tracking-widest font-bold flex items-center gap-2 text-gray-400">
                <Upload className="w-4 h-4" />
                Operatørkontroll & Auto-Fetch
              </h2>

              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-yellow-950 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)]"
              >
                <Plus className="w-4 h-4" />
                Start ny turnering ({selectedDate})
              </button>
            </div>
          
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 border border-white/10 rounded-lg p-4 bg-black/20 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-widest text-white">Auto-Fetch (localhost:7770)</span>
                    <span className="text-[10px] text-gray-500">Henter automatisk siste match fortløpende</span>
                  </div>
                  <button
                    onClick={() => setIsAutoFetchEnabled(!isAutoFetchEnabled)}
                    className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                      isAutoFetchEnabled 
                        ? 'bg-green-900/30 text-green-400 border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:bg-green-900/50' 
                        : 'bg-red-950/30 text-red-500 border border-red-500/30 hover:bg-red-900/40'
                    }`}
                  >
                    {isAutoFetchEnabled ? 'ON' : 'OFF'}
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
                    className="mt-4 text-[10px] uppercase tracking-widest text-gray-500 border border-gray-500/30 hover:bg-gray-500/10 px-3 py-1.5 rounded self-start disabled:opacity-50 transition-colors"
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
                    <Upload className="w-8 h-8 text-gray-500/50 mb-3" />
                    <p className="mb-2 text-sm text-gray-400"><span className="font-bold text-gray-300">Last opp match-fil</span> manuelt</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">JSON match file</p>
                  </div>
                  <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                </label>
                {uploadError && <p className="text-red-400 text-[10px] mt-2 font-mono text-center">{uploadError}</p>}
              </div>
            </div>
          </section>
        )}

        {/* Tournament Accordions */}
        <div className="space-y-6">
          {tournamentGroups.map((group, groupIdx) => {
            const isExpanded = expandedTournaments.has(group.id);
            const isLatest = groupIdx === tournamentGroups.length - 1;

            return (
              <div 
                key={group.id} 
                className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all"
              >
                {/* Tournament Accordion Header */}
                <div 
                  onClick={() => toggleTournamentExpand(group.id)}
                  className="p-4 md:p-5 bg-gradient-to-r from-white/[0.04] to-transparent flex items-center justify-between cursor-pointer hover:bg-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`p-2.5 rounded-xl ${isLatest && dayTournaments.length > 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-base md:text-xl font-black uppercase tracking-wider text-white">
                          {group.title}
                        </h2>
                        {isLatest && dayTournaments.length > 1 && (
                          <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
                            Aktiv
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        <span>{group.matches.length} {group.matches.length === 1 ? 'kamp' : 'kamper'} registrert</span>
                        {group.tournament && (
                          <span className="text-gray-500">• Startklokkeslett {group.tournament.startTime}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isAdminMode && group.tournament && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEditModal(group.tournament!)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition-colors"
                          title="Rediger turnering"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTournament(group.tournament!.id, group.title)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-white/10 transition-colors"
                          title="Slett turnering"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="p-2 rounded-full bg-white/5 text-gray-300 border border-white/10">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Tournament Accordion Content */}
                {isExpanded && (
                  <div className="p-4 md:p-6 border-t border-white/5 bg-[#0A0A0A]/40">
                    <TournamentContent 
                      group={group}
                      isAdminMode={isAdminMode}
                      selectedForPrint={selectedForPrint}
                      togglePrintSelection={togglePrintSelection}
                      editingTeam={editingTeam}
                      editingName={editingName}
                      setEditingName={setEditingName}
                      handleEditTeamName={handleEditTeamName}
                      saveTeamName={saveTeamName}
                      cancelEdit={cancelEdit}
                      removeMatch={removeMatch}
                      survivalHighscores={survivalHighscores}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal: Create Tournament */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 no-print">
            <div className="bg-[#141414] border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Trophy className="w-5 h-5" />
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">Start ny turnering</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-6">
                Start en ny turneringsbolk for <strong>{selectedDate}</strong>. Kamper spilt fra dette klokkeslettet vil automatisk samles her, og TV-skjermen nullstilles.
              </p>

              <form onSubmit={handleCreateTournament} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-gray-300 mb-1.5">
                    Starttidspunkt (HH:mm)
                  </label>
                  <div className="flex items-center bg-black/50 border border-white/20 rounded-lg px-3 py-2">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <input
                      type="time"
                      required
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="bg-transparent text-white w-full outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-gray-300 mb-1.5">
                    Gruppe / Navn (Valgfritt)
                  </label>
                  <div className="flex items-center bg-black/50 border border-white/20 rounded-lg px-3 py-2">
                    <Users className="w-4 h-4 text-gray-400 mr-2" />
                    <input
                      type="text"
                      placeholder="F.eks. Utdrikningslag Daniel Hansen"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-transparent text-white w-full outline-none placeholder:text-gray-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-400 hover:bg-white/5"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-yellow-500 hover:bg-yellow-400 text-yellow-950 shadow-lg shadow-yellow-500/20"
                  >
                    Opprett turnering
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Tournament */}
        {editingTournament && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 no-print">
            <div className="bg-[#141414] border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white">
                  <Edit2 className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-black uppercase tracking-wider">Rediger turnering</h3>
                </div>
                <button onClick={() => setEditingTournament(null)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditTournament} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-gray-300 mb-1.5">
                    Starttidspunkt (HH:mm)
                  </label>
                  <div className="flex items-center bg-black/50 border border-white/20 rounded-lg px-3 py-2">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <input
                      type="time"
                      required
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="bg-transparent text-white w-full outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-gray-300 mb-1.5">
                    Gruppe / Navn (Valgfritt)
                  </label>
                  <div className="flex items-center bg-black/50 border border-white/20 rounded-lg px-3 py-2">
                    <Users className="w-4 h-4 text-gray-400 mr-2" />
                    <input
                      type="text"
                      placeholder="F.eks. Utdrikningslag Daniel Hansen"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-transparent text-white w-full outline-none placeholder:text-gray-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingTournament(null)}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-400 hover:bg-white/5"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-yellow-500 hover:bg-yellow-400 text-yellow-950 shadow-lg shadow-yellow-500/20"
                  >
                    Lagre endringer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function TournamentContent({
  group,
  isAdminMode,
  selectedForPrint,
  togglePrintSelection,
  editingTeam,
  editingName,
  setEditingName,
  handleEditTeamName,
  saveTeamName,
  cancelEdit,
  removeMatch,
  survivalHighscores,
}: {
  group: TournamentGroup;
  isAdminMode: boolean;
  selectedForPrint: Set<string>;
  togglePrintSelection: (id: string) => void;
  editingTeam: { matchId: string; team: 1 | 2 } | null;
  editingName: string;
  setEditingName: (name: string) => void;
  handleEditTeamName: (matchId: string, team: 1 | 2, currentName: string) => void;
  saveTeamName: () => void;
  cancelEdit: () => void;
  removeMatch: (id: string) => void;
  survivalHighscores: Map<string, HighscoreLevel>;
}) {
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const matches = group.matches;

  const { tdmMatches, survivalMatches } = useMemo(() => {
    const tdm: MatchData[] = [];
    const survival: MatchData[] = [];
    
    matches.forEach(m => {
      const mode = m.gameMode?.toLowerCase() || '';
      if (mode === 'survival') {
        survival.push(m);
      } else if (mode !== 'freeforall') {
        tdm.push(m);
      }
    });
    return { tdmMatches: tdm, survivalMatches: survival };
  }, [matches]);

  const tdmDailySummary = useMemo(() => {
    const summary: Record<string, { matches: number, totalScore: number, wins: number }> = {};
    
    tdmMatches.forEach(match => {
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
          summary[player.playerName].teamName = player.team === 1 ? (match.team1Name || 'Team 1').toUpperCase() : (match.team2Name || 'Team 2').toUpperCase();
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
      .filter(p => !p.isBot)
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

  if (matches.length === 0) {
    return (
      <div className="text-center py-10 bg-[#0d0d0d] rounded-xl border border-white/5 no-print">
        <Trophy className="w-10 h-10 text-gray-700 mx-auto mb-3" />
        <h3 className="text-sm font-bold tracking-widest uppercase text-gray-400">Ingen kamper registrert enda</h3>
        <p className="text-xs text-gray-600 mt-1">
          Kamper som spilles etter {group.startTime} vil automatisk legges til her.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summaries Container */}
      <div className="print-page-break">
        
        {/* TEAM DEATHMATCH SUMMARY */}
        {tdmMatches.length > 0 && (
          <div className="mb-8 border-b border-white/5 pb-8 print:border-none print:pb-0">
            <TdmBanner />
            
            {/* TDM Team Stats */}
            {tdmDailySummary.length > 0 && (
              <div className="mb-6 print-section">
                <h2 className="text-sm font-bold tracking-widest uppercase text-gray-200 mb-4 print:text-black">Team Leaderboard</h2>
                <div className="flex flex-col gap-3 print:gap-2">
                  {tdmDailySummary.map((team, idx) => {
                    const placement = idx + 1;
                    
                    return (
                    <div key={team.name} className={`relative overflow-hidden ${idx === 0 ? 'bg-yellow-900/30 border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-[#121212] border border-white/10 opacity-70'} rounded-xl p-3 sm:p-4 print:bg-transparent print:border-gray-300 print:p-2 transition-all flex items-center justify-between gap-2 sm:gap-4`}>
                      {idx === 0 && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)] z-10 print:hidden"></div>}
                      
                      <div className="flex items-center gap-3 sm:gap-5 z-20 pl-1 sm:pl-2 min-w-0 flex-1">
                        <div className={`text-2xl sm:text-4xl font-black ${idx === 0 ? 'text-yellow-500' : 'text-gray-600'} w-6 sm:w-8 shrink-0 text-right`}>{placement}</div>
                        
                        <div className="flex flex-col min-w-0 flex-1 justify-center">
                          {idx === 0 && (
                            <div className="mb-1">
                              <span className="bg-yellow-500 text-yellow-950 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded shadow-sm tracking-widest uppercase inline-block print:hidden">
                                Winner
                              </span>
                            </div>
                          )}
                          <div className={`text-sm sm:text-lg md:text-xl font-bold uppercase tracking-wider truncate ${idx === 0 ? 'text-white' : 'text-gray-300'}`}>
                            {team.name}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest mt-0.5 print:text-black print:text-[8px] truncate">
                            {team.wins} Win{team.wins !== 1 && 's'} in {team.matches} Match{team.matches !== 1 && 'es'}
                          </div>
                        </div>
                      </div>

                      <div className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter shrink-0 pr-1 sm:pr-2 print:text-black print:text-2xl text-right">
                        {team.totalScore?.toLocaleString('no-NO')}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}

            {/* TDM Player Leaderboard */}
            {tdmPlayerSummary.length > 0 && (
              <div className="print-section">
                <h2 className="text-sm font-bold tracking-widest uppercase text-gray-200 mb-4 print:text-black">Player Leaderboard</h2>
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
                            </td>
                            <td className="py-2 px-2 text-gray-500 text-[9px] uppercase tracking-widest truncate print:text-gray-600 print:py-1 print:px-1">{player.teamName}</td>
                            <td className="py-2 px-2 font-mono text-center font-bold text-white print:py-1 print:px-1 print:text-black">{player.score?.toLocaleString('no-NO')}</td>
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
            <SurvivalBanner />

            {survivalTeamSummary.length > 0 && (
              <div className="print-section">
                <h2 className="text-sm font-bold tracking-widest uppercase text-red-500 mb-4 print:text-black">Team Leaderboard</h2>
                <div className="bg-[#0a0505] border border-red-900/30 rounded-lg overflow-hidden print:bg-transparent print:border-gray-300">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="bg-[#1a0a0a] border-b border-red-900/30 print:bg-gray-100">
                      <tr className="text-[10px] uppercase tracking-widest text-red-400/70 print:text-black print:text-[8px]">
                        <th className="py-2 px-3 font-bold truncate print:py-1 print:px-2 min-w-[120px] sticky left-0 bg-[#1a0a0a] z-10 print:static print:bg-transparent">Team</th>
                        <th className="py-2 px-2 font-bold text-center min-w-[50px] print:py-1 print:px-1">Wave Reached</th>
                        <th className="py-2 px-2 font-bold text-center min-w-[50px] print:py-1 print:px-1">Team Score</th>
                        <th className="py-2 px-2 font-bold text-center min-w-[80px] print:py-1 print:px-1">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs print:divide-gray-200 print:text-[10px]">
                      {survivalTeamSummary.slice(0, 10).map((match, idx) => {
                        const placement = idx + 1;
                        return (
                        <tr key={match.matchId} className={`group hover:bg-[#1f0a0a] print:bg-transparent transition-colors ${idx === 0 ? 'bg-[#240a0a]' : 'bg-[#0a0505]'}`}>
                          <td className="py-2 px-3 font-medium text-gray-300 print:text-black print:py-1 print:px-2 flex flex-col justify-center sticky left-0 z-10 bg-inherit print:static print:bg-transparent border-r border-transparent print:border-none">
                            <div className="flex items-center gap-2">
                              <span className="text-red-600 w-3 text-right text-[10px] print:text-[8px] print:text-gray-600">{idx + 1}.</span>
                              <span className={`truncate ${idx === 0 ? 'text-red-500 font-bold' : ''}`}>{match.team1Name || 'Unknown Team'}</span>
                            </div>
                            <HighscoreBadge level={survivalHighscores.get(match.matchId) || 'NONE'} className="ml-5 mt-1 self-start" />
                          </td>
                          <td className="py-2 px-2 font-mono text-center font-bold text-gray-300 print:py-1 print:px-1 print:text-black">{match.waveIndex !== undefined ? match.waveIndex + 1 : '-'}</td>
                          <td className="py-2 px-2 font-mono text-center font-bold text-red-500 print:py-1 print:px-1 print:text-black">{match.team1Score?.toLocaleString('no-NO')}</td>
                          <td className="py-2 px-2 font-mono text-center text-gray-500 print:py-1 print:px-1 print:text-black">{format(parseISO(match.matchStartTimestamp), 'dd.MM HH:mm')}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Show / Hide Match Details Button for this tournament */}
      {matches.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center no-print">
          <button
            onClick={() => setShowMatchDetails(!showMatchDetails)}
            className={`flex items-center gap-2.5 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              showMatchDetails
                ? 'bg-purple-950/30 text-purple-300 border border-purple-500/30 hover:bg-purple-900/30'
                : 'bg-purple-950/15 hover:bg-purple-900/25 text-purple-300/80 hover:text-purple-200 border border-purple-500/20 hover:border-purple-500/35'
            }`}
          >
            <span>{showMatchDetails ? 'Hide Match Details' : 'Show Match Details'}</span>
            <span className="bg-purple-950/40 text-purple-300/80 px-2 py-0.5 rounded text-[10px] font-mono border border-purple-500/20">
              {matches.length} {matches.length === 1 ? 'kamp' : 'kamper'}
            </span>
            {showMatchDetails ? <ChevronUp className="w-3.5 h-3.5 text-purple-400/70" /> : <ChevronDown className="w-3.5 h-3.5 text-purple-400/70" />}
          </button>
        </div>
      )}

      {/* Matches List */}
      <div className={showMatchDetails ? "block mt-6" : "hidden print:block mt-6"}>
        <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4 border-b border-white/10 pb-2">
          Individuelle kampkort ({matches.length})
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 print:grid-cols-1 print:gap-2 print:text-[10px]">
          {matches.map((match) => {
            const isSelected = selectedForPrint.has(match.matchId);
            const team1Won = match.team1Score > match.team2Score;
            const team2Won = match.team2Score > match.team1Score;
            const duration = getMatchDuration(match.matchStartTimestamp, match.lastUpdateTimestamp);
            const isSurvival = match.gameMode?.toLowerCase() === 'survival';

            return (
              <div 
                key={match.matchId} 
                className={`rounded-xl border flex flex-col transition-all overflow-hidden ${isSelected ? `print-section ring-2 ${isSurvival ? 'border-red-500 ring-red-900/50' : 'border-gray-500 ring-gray-700/50'}` : `no-print ${isSurvival ? 'border-red-900/30' : 'border-white/10'}`} ${isSurvival ? 'bg-[#0a0505]' : 'bg-[#121212]'}`}
              >
                {/* Match Header */}
                <div className={`flex items-center justify-between p-2 md:p-3 border-b ${isSurvival ? 'border-red-900/30 bg-[#1a0a0a]' : 'border-white/10 bg-[#0D0D0D]'} print:p-1.5 print:bg-gray-100 print:border-gray-300`}>
                  <div className="flex items-center gap-2 text-xs">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => togglePrintSelection(match.matchId)}
                      className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-gray-500 cursor-pointer"
                      title="Select for Print"
                    />
                    <span className="text-gray-400 font-bold print:text-black">
                      {format(parseISO(match.matchStartTimestamp), 'dd.MM.yy HH:mm')}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-gray-300 uppercase tracking-widest print:text-[6px] print:bg-gray-200 print:border-gray-400 print:text-black">
                      {formatGameMode(match.gameMode)}
                    </span>
                    {match.gameMode?.toLowerCase() === 'survival' && match.lifeMode && (
                      <span className="px-1.5 py-0.5 rounded bg-gray-900/30 border border-gray-500/20 text-[9px] text-gray-300 uppercase tracking-widest print:text-[6px] print:bg-gray-200 print:border-gray-400 print:text-black">
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
                    <div className={`flex-1 rounded-lg p-2 pt-5 flex flex-col justify-center items-center relative overflow-hidden transition-all print:bg-transparent print:border-gray-200 print:p-1 print:pt-1 ${team1Won ? 'bg-blue-900/30 border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-blue-950/10 border border-blue-500/10 opacity-70'}`}>
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
                      <div className={`text-3xl font-black mt-1 z-10 print:text-black print:text-lg ${team1Won ? 'text-white' : 'text-blue-200/50'}`}>{match.team1Score?.toLocaleString('no-NO')}</div>
                    </div>
                    
                    <div className="text-gray-600 font-black text-xs uppercase tracking-widest print:text-black print:text-[8px]">VS</div>
                    
                    {/* Team 2 */}
                    <div className={`flex-1 rounded-lg p-2 pt-5 flex flex-col justify-center items-center relative overflow-hidden transition-all print:bg-transparent print:border-gray-200 print:p-1 print:pt-1 ${team2Won ? 'bg-orange-900/30 border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'bg-orange-950/10 border border-orange-500/10 opacity-70'}`}>
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
                      <div className={`text-3xl font-black mt-1 z-10 print:text-black print:text-lg ${team2Won ? 'text-white' : 'text-orange-200/50'}`}>{match.team2Score?.toLocaleString('no-NO')}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 flex justify-center items-center gap-3 bg-[#1a0a0a] border-b border-red-900/30 print:bg-transparent print:border-gray-200 print:p-1.5 relative">
                    <div className="flex flex-col items-center">
                      <span className="text-red-500 font-bold uppercase tracking-widest text-xs print:text-black print:text-[10px]">Survival Mode {duration ? ` ${duration}` : ''}</span>
                      {match.waveIndex !== undefined && (
                        <span className="text-2xl font-black text-white mt-1 print:text-black">Wave {match.waveIndex + 1}</span>
                      )}
                      <span className="text-[10px] text-red-400/70 uppercase tracking-widest mt-1 print:text-gray-600 print:text-[8px]">Team Score: <span className="text-red-400 font-bold">{match.team1Score?.toLocaleString('no-NO')}</span></span>
                      <div className="mt-2">
                        <HighscoreBadge level={survivalHighscores.get(match.matchId) || 'NONE'} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Player Stats Tables */}
                <div className={`px-3 pb-3 grid grid-cols-1 gap-3 flex-1 print:p-1.5 print:gap-2 ${isSurvival ? '' : 'print:grid-cols-2'}`}>
                  <TeamTable teamName="Team 1" stats={match.playerStats.filter(p => p.team === 1)} color={isSurvival ? 'red' : 'blue'} isSurvival={isSurvival} />
                  {!isSurvival && (
                    <TeamTable teamName="Team 2" stats={match.playerStats.filter(p => p.team === 2)} color="orange" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
                const isMVP = !isSurvival && idx === 0 && player.score > 0;
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
                    <td className={`py-1.5 px-1 font-mono text-center print:py-0.5 print:text-black ${textColor}`}>{player.score?.toLocaleString('no-NO')}</td>
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
