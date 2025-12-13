"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import usersData from '../../data/users.json';
import { InputsAnnounceSearch } from '../types/InputsAnnounceSearch';

export type PageKey =
  | "home"
  | "messages"
  | "message_chat"
  | "search"
  | "publish"
  | "announce_edit"
  | "annonces"
  | "profil"
  | "profil_edit"
  | "announce_details"
  | "filters"
  | "reservation"
  | "my_announcements";

type ContentContextType = {
  currentPage: PageKey;
  // history of previous pages (stack)
  history: PageKey[];
  setCurrentPage: (p: PageKey, replaceHistory?: PageKey[]) => void;
  goBack: () => void;
  clearHistory: () => void;
  // optional header override (used by pages like publish to show step)
  headerTitle?: string | null;
  setHeaderTitle: (t: string | null) => void;
  // selected announcement id (when viewing details)
  selectedAnnouncementId?: number | string | null;
  setSelectedAnnouncementId: (id: number | string | null) => void;
  // selected profile id when viewing a user's profile
  selectedProfileId?: number | null;
  setSelectedProfileId: (id: number | null) => void;
  // selected conversation id when viewing chat details
  selectedConversationId?: string | null;
  setSelectedConversationId: (id: string | null) => void;
  // current logged-in user id (simulated)
  currentUserId?: number | null;
  setCurrentUserId?: (id: number | null) => void;
  // reservation draft stored when user initiates a booking (now includes selected date ISO)
  reservationDraft?: { announcementId: number | string; slotIndex: number; date?: string } | null;
  setReservationDraft?: (d: { announcementId: number | string; slotIndex: number; date?: string } | null) => void;
  // applied filters from the filter page
  appliedFilters?: InputsAnnounceSearch | null;
  setAppliedFilters: (f: InputsAnnounceSearch | null) => void;
};

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPageState] = useState<PageKey>("home");
  const [history, setHistory] = useState<PageKey[]>([]);
  const [headerTitle, setHeaderTitle] = useState<string | null>(null);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<number | string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const users = (usersData as any).users ?? [];
  // Do not auto-login any user by default; default is null unless localStorage has a session
  // Initialize as null to avoid hydration mismatch, then update on mount
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // Load userId from localStorage after mount to avoid hydration mismatch
  React.useEffect(() => {
    try {
      const v = localStorage.getItem('proximis_userId');
      if (v) {
        setCurrentUserId(Number(v));
      }
    } catch (e) {
      // ignore
    }
  }, []);
  const [appliedFilters, setAppliedFilters] = useState<InputsAnnounceSearch | null>(null);
  const [reservationDraft, setReservationDraft] = useState<{ announcementId: number | string; slotIndex: number; date?: string } | null>(null);

  const setCurrentPage = useCallback((p: PageKey, replaceHistory?: PageKey[]) => {
    if (replaceHistory !== undefined) {
      // Replace history with the provided array
      setHistory(replaceHistory);
      setCurrentPageState(p);
    } else {
      setHistory(prev => {
        // push currentPage onto history when navigating to a different page
        if (prev.length === 0 && currentPage === p) return prev;
        if (currentPage === p) return prev;
        return [...prev, currentPage];
      });
      setCurrentPageState(p);
    }
  }, [currentPage]);

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setCurrentPageState(last);
      return prev.slice(0, prev.length - 1);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <ContentContext.Provider
      value={{
        currentPage,
        history,
        setCurrentPage,
        goBack,
        clearHistory,
        headerTitle,
        setHeaderTitle,
        selectedAnnouncementId,
        setSelectedAnnouncementId,
        selectedProfileId,
        setSelectedProfileId,
        selectedConversationId,
        setSelectedConversationId,
        currentUserId,
        setCurrentUserId,
        appliedFilters,
        setAppliedFilters,
        reservationDraft,
        setReservationDraft,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = (): ContentContextType => {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used within ContentProvider");
  return ctx;
};

export default ContentContext;
