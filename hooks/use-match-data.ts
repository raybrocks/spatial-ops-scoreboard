'use client';

import { useState, useEffect, useCallback } from 'react';
import { MatchData } from '@/types/match';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useMatchData() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Listen to matches collection in real-time
    const matchesRef = collection(db, 'matches');
    // Using onSnapshot for real-time updates
    const unsubscribe = onSnapshot(matchesRef, (snapshot) => {
      const fetchedMatches: MatchData[] = [];
      snapshot.forEach((doc) => {
        fetchedMatches.push(doc.data() as MatchData);
      });
      setMatches(fetchedMatches);
      setIsLoaded(true);
    }, (error) => {
      console.error("Error fetching matches from Firestore:", error);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const addMatch = useCallback(async (newMatch: MatchData) => {
    try {
      await setDoc(doc(db, 'matches', newMatch.matchId), newMatch);
    } catch (error) {
      console.error("Error adding match to Firestore:", error);
      throw error;
    }
  }, []);

  const removeMatch = useCallback(async (matchId: string) => {
    try {
      await deleteDoc(doc(db, 'matches', matchId));
    } catch (error) {
      console.error("Error removing match from Firestore:", error);
      throw error;
    }
  }, []);

  const updateMatch = useCallback(async (matchId: string, updates: Partial<MatchData>) => {
    try {
      await updateDoc(doc(db, 'matches', matchId), updates);
    } catch (error) {
      console.error("Error updating match in Firestore:", error);
      throw error;
    }
  }, []);

  const clearAllMatches = () => {
    console.warn("clearAllMatches is disabled when using Firestore for safety.");
  };

  return {
    matches,
    addMatch,
    removeMatch,
    updateMatch,
    clearAllMatches,
    isLoaded,
  };
}
