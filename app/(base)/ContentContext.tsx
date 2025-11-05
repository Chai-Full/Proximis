"use client";
import React, { createContext, useContext, useState } from "react";

export type PageKey = "home" | "messages" | "publish" | "annonces" | "profil";

type ContentContextType = {
  currentPage: PageKey;
  setCurrentPage: (p: PageKey) => void;
};

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageKey>("home");
  return (
    <ContentContext.Provider value={{ currentPage, setCurrentPage }}>
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
