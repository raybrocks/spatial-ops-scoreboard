'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tournament } from '@/types/tournament';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const tournamentsRef = collection(db, 'tournaments');
    const unsubscribe = onSnapshot(tournamentsRef, (snapshot) => {
      const fetched: Tournament[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push(docSnap.data() as Tournament);
      });
      setTournaments(fetched);
      setIsLoaded(true);
    }, (error) => {
      console.error("Error fetching tournaments from Firestore:", error);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const addTournament = useCallback(async (newTournament: Tournament) => {
    try {
      await setDoc(doc(db, 'tournaments', newTournament.id), newTournament);
    } catch (error) {
      console.error("Error adding tournament to Firestore:", error);
      throw error;
    }
  }, []);

  const updateTournament = useCallback(async (tournamentId: string, updates: Partial<Tournament>) => {
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId), updates);
    } catch (error) {
      console.error("Error updating tournament in Firestore:", error);
      throw error;
    }
  }, []);

  const removeTournament = useCallback(async (tournamentId: string) => {
    try {
      await deleteDoc(doc(db, 'tournaments', tournamentId));
    } catch (error) {
      console.error("Error removing tournament from Firestore:", error);
      throw error;
    }
  }, []);

  return {
    tournaments,
    addTournament,
    updateTournament,
    removeTournament,
    isLoaded,
  };
}
