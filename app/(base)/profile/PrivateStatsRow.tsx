"use client";

import React from "react";
import "./index.css";
import { PrivateStats } from "./ProfileTypes";

type Props = {
  stats: PrivateStats;
};

export default function PrivateStatsRow({ stats }: Props) {
  const items = [
    { label: "Services", value: stats.services },
    { label: "Avis", value: stats.reviews },
    { label: "Note", value: stats.note },
  ];
  return (
    <div className="profileStatsRow">
      {items.map((item) => (
        <div key={item.label} className="profileStatCard">
          <span className="profileStatValue T1 TSemibold">{item.value}</span>
          <span className="profileStatLabel">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

