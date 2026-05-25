"use client";

import { create } from "zustand";

import type { InvestigationResponse } from "./types";

export type QuickInvestigationStatus = "idle" | "running" | "completed" | "failed";

interface QuickInvestigationState {
  status: QuickInvestigationStatus;
  sessionId: string | null;
  activeStationId: string | null;
  completedStations: number;
  totalStations: number;
  resultsByStationId: Record<string, InvestigationResponse>;
  error: string | null;
  start: (
    totalStations: number,
    resultsByStationId?: Record<string, InvestigationResponse>,
  ) => string;
  setActiveStation: (stationId: string, completedStations: number) => void;
  setStationResult: (stationId: string, response: InvestigationResponse) => void;
  hydrateSavedResults: (
    totalStations: number,
    resultsByStationId: Record<string, InvestigationResponse>,
  ) => void;
  setError: (error: string | null) => void;
  complete: () => void;
  reset: () => void;
}

const initialState = {
  status: "idle" as const,
  sessionId: null,
  activeStationId: null,
  completedStations: 0,
  totalStations: 0,
  resultsByStationId: {},
  error: null,
};

export const useInvestigationQuickActionStore = create<QuickInvestigationState>((set) => ({
  ...initialState,
  start: (totalStations, resultsByStationId = {}) => {
    const sessionId = crypto.randomUUID();

    set({
      status: "running",
      sessionId,
      activeStationId: null,
      completedStations: 0,
      totalStations,
      resultsByStationId,
      error: null,
    });

    return sessionId;
  },
  setActiveStation: (stationId, completedStations) => set({ activeStationId: stationId, completedStations }),
  setStationResult: (stationId, response) => set((state) => ({
    resultsByStationId: {
      ...state.resultsByStationId,
      [stationId]: response,
    },
  })),
  hydrateSavedResults: (totalStations, resultsByStationId) => set({
    status: "completed",
    sessionId: null,
    activeStationId: null,
    completedStations: Object.keys(resultsByStationId).length,
    totalStations,
    resultsByStationId,
    error: null,
  }),
  setError: (error) => set({ error }),
  complete: () => set((state) => ({
    status: state.error ? "failed" : "completed",
  })),
  reset: () => set(initialState),
}));
