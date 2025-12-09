"use client";

export type PrivateStats = {
  services: number;
  reviews: number;
  note: number;
};

export type MenuItem = {
  id: string;
  title: string;
  icon: React.ElementType;
  count?: number;
  badge?: string;
};

