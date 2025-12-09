"use client";

import React from "react";
import "./index.css";
import { MenuItem } from "./ProfileTypes";

type Props = {
  menu: MenuItem[];
};

export default function PrivateMenu({ menu }: Props) {
  return (
    <div className="profileMenuList">
      {menu.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="profileMenuCard" role="button" tabIndex={0}>
            <div className="profileMenuLeft">
              <div className="profileMenuIcon">
                <Icon sx={{ color: "#1ea792" }} />
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

