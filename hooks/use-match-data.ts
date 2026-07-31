'use client';

import { useState, useEffect } from 'react';
import { MatchData } from '@/types/match';

const STORAGE_KEY = 'vr_arcade_matches';

export function useMatchData() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedMatches = localStorage.getItem(STORAGE_KEY);
    if (storedMatches) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMatches(JSON.parse(storedMatches));
      } catch (e) {
        console.error('Failed to parse stored matches', e);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(true);
  }, []);

  const addMatch = (newMatch: MatchData) => {
    setMatches((prevMatches) => {
      // Check if match already exists
      if (prevMatches.some((m) => m.matchId === newMatch.matchId)) {
        return prevMatches;
      }
      const updatedMatches = [...prevMatches, newMatch];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMatches));
      return updatedMatches;
    });
  };

  const removeMatch = (matchId: string) => {
    setMatches((prevMatches) => {
      const updatedMatches = prevMatches.filter((m) => m.matchId !== matchId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMatches));
      return updatedMatches;
    });
  };

  const clearAllMatches = () => {
    setMatches([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    matches,
    addMatch,
    removeMatch,
    clearAllMatches,
    isLoaded,
  };
}
