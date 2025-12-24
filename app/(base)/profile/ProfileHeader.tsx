"use client";

import React from "react";
import Star from "@mui/icons-material/Star";
import EditOutlined from "@mui/icons-material/EditOutlined";
import "./index.css";

type Props = {
  fullName: string;
  initials: string;
  rating: number;
  ratingCount: number;
  editable?: boolean;
  onEdit?: () => void;
  photo?: string | null;
  onRatingClick?: () => void;
};

export default function ProfileHeader({ fullName, initials, rating, ratingCount, editable, onEdit, photo, onRatingClick }: Props) {
  return (
    <div className="announceProfileHeader headerWithEdit">
      {editable ? (
        <button className="avatarEditButton floatingEdit" aria-label="Éditer le profil" onClick={onEdit}>
          <EditOutlined sx={{ color: "#03A689" }} />
        </button>
      ) : null}
      <div className="avatar">
        {photo ? (
          <img
            src={photo}
            alt={fullName}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        {!photo && <span className="avatarInitials">{initials}</span>}
      </div>
      <div className="nameNotes">
        <span className="T4 TBold">{fullName}</span>
        <div
          style={{ display: "flex", alignItems: "center", flex: "0 0 auto", gap: 4, cursor: onRatingClick ? 'pointer' : 'default' }}
          onClick={onRatingClick}
        >
          <Star sx={{ color: "#FFE135" }} />
          <span className="T5">
            {rating > 0 ? rating.toFixed(1) : '-'} <span style={{ color: "#8c8c8c" }}>({ratingCount} avis)</span>
          </span>
        </div>
      </div>
    </div>
  );
}

