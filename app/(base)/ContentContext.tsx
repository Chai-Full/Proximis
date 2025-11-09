"use client";
import React, { createContext, useContext, useState } from "react";

export type PageKey = "home" | "messages" | "search" | "publish" | "annonces" | "profil" | "announce_details";

type ContentContextType = {
  currentPage: PageKey;
  // history of previous pages (stack)
  history: PageKey[];
  setCurrentPage: (p: PageKey) => void;
  goBack: () => void;
  // optional header override (used by pages like publish to show step)
  headerTitle?: string | null;
  setHeaderTitle: (t: string | null) => void;
  // selected announcement id (when viewing details)
  selectedAnnouncementId?: number | string | null;
  setSelectedAnnouncementId: (id: number | string | null) => void;
};

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPageState] = useState<PageKey>("home");
  const [history, setHistory] = useState<PageKey[]>([]);
  const [headerTitle, setHeaderTitle] = useState<string | null>(null);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<number | string | null>(null);

  const setCurrentPage = (p: PageKey) => {
    setHistory(prev => {
      // push currentPage onto history when navigating to a different page
      if (prev.length === 0 && currentPage === p) return prev;
      if (currentPage === p) return prev;
      return [...prev, currentPage];
    });
    setCurrentPageState(p);
  };

  const goBack = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setCurrentPageState(last);
      return prev.slice(0, prev.length - 1);
    });
  };

  return (
    <ContentContext.Provider value={{ currentPage, history, setCurrentPage, goBack, headerTitle, setHeaderTitle, selectedAnnouncementId, setSelectedAnnouncementId }}>
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
