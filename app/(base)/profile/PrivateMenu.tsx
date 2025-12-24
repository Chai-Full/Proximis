"use client";

import React from "react";
import "./index.css";
import { MenuItem } from "./ProfileTypes";
import { useContent } from "../ContentContext";

type Props = {
  menu: MenuItem[];
};

export default function PrivateMenu({ menu }: Props) {
  const { setCurrentPage } = useContent();

  const handleMenuClick = (itemId: string) => {
    if (itemId === "annonces") {
      // Save view preference to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("proximis_myAnnouncements_view", "my_announcements");
      }
      setCurrentPage("my_announcements");
    } else if (itemId === "reservations") {
      // Save view preference to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("proximis_myAnnouncements_view", "reservations");
      }
      setCurrentPage("my_announcements");
    } else if (itemId === "favoris") {
      // Save view preference to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("proximis_myAnnouncements_view", "favorites");
      }
      setCurrentPage("my_announcements");
    }
  };

  return (
    <div className="profileMenuList">
      {menu.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className="profileMenuCard"
            role="button"
            tabIndex={0}
            onClick={() => handleMenuClick(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleMenuClick(item.id);
              }
            }}
          >
            <div className="profileMenuLeft">
              <div className="profileMenuIcon">
                <Icon sx={{ color: "#ffffff" }} />
              </div>
              <div className="profileMenuTitleArea">
                <span className="T4">{item.title}</span>
                {item.badge ? <span className="profileBadge">{item.badge}</span> : null}
              </div>
            </div>
            <div className="profileMenuRight">
              {typeof item.count === "number" ? <span className="T4">{item.count}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

