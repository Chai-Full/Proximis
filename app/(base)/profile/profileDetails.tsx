"use client";
import React, { useEffect, useMemo } from "react";
import { useContent } from "../ContentContext";
import usersData from "../../../data/users.json";
import reservationsData from "../../../data/reservations.json";
import "./index.css";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import FavoriteBorderOutlined from "@mui/icons-material/FavoriteBorderOutlined";
import Star from "@mui/icons-material/Star";
import announcementsData from "../../../data/announcements.json";
import AnnouncementCard from "../announcement/AnnouncementCard";
import ProfileHeader from "./ProfileHeader";
import PrivateStatsRow from "./PrivateStatsRow";
import PrivateMenu from "./PrivateMenu";
import { MenuItem, PrivateStats } from "./ProfileTypes";
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import OutboxIcon from '@mui/icons-material/Outbox';

export default function ProfileDetails() {
  const { selectedProfileId, currentUserId, setHeaderTitle, setCurrentPage } = useContent();
  const users = (usersData as any).users ?? [];
  const reservations = (reservationsData as any).reservations ?? [];

  const targetUserId = useMemo(() => {
    if (selectedProfileId != null) return Number(selectedProfileId);
    if (currentUserId != null) return Number(currentUserId);
    return null;
  }, [selectedProfileId, currentUserId]);

  const isCurrentUser =
    targetUserId != null &&
    currentUserId != null &&
    Number(targetUserId) === Number(currentUserId);
  const user = useMemo(() => {
    if (targetUserId == null) return null;
    return users.find((u: any) => Number(u.id) === Number(targetUserId)) ?? null;
  }, [targetUserId, users]);

  const fullName = user ? `${user.prenom} ${user.nom}`.trim() : "Profil";
  const initials = fullName
    .split(/\s+/)
    .map((n) => n[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const userAnnouncements = useMemo(
    () => (user ? announcementsData.filter((a: any) => Number(a.userId) === Number(user.id)) : []),
    [user]
  );
  const availableAnnouncements = useMemo(
    () => userAnnouncements.filter((a: any) => a.isAvailable !== false),
    [userAnnouncements]
  );
  const closedAnnouncements = useMemo(
    () => userAnnouncements.filter((a: any) => a.isAvailable === false),
    [userAnnouncements]
  );
  const userReservations = useMemo(
    () => reservations.filter((r: any) => user && Number(r.userId) === Number(user.id)),
    [reservations, user]
  );

  // Derived simple stats from available data (no mock)
  const stats: PrivateStats = {
    services: userReservations.length,
    reviews: 0,
    note: 0,
  };

  const menu: MenuItem[] = [
    { id: "annonces", title: "Mes annonces", icon: TextSnippetIcon, count: userAnnouncements.length },
    {
      id: "reservations",
      title: "Mes réservations",
      icon: OutboxIcon,
      count: userReservations.length,
      badge: userReservations.length > 0 ? `${userReservations.length} à évaluer` : undefined,
    },
    { id: "favoris", title: "Mes favoris", icon: FavoriteBorderOutlined, count: 0 },
  ];

  useEffect(() => {
    if (user && setHeaderTitle) {
      setHeaderTitle(isCurrentUser ? "Profil" : `Profil de ${fullName}`);
      return () => setHeaderTitle && setHeaderTitle(null);
    }
    setHeaderTitle && setHeaderTitle(null);
    return () => {};
  }, [isCurrentUser, user, fullName, setHeaderTitle]);

  if (!user) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Profil introuvable</h2>
      </div>
    );
  }

  if (isCurrentUser) {
    return (
      <div className="announceProfile">
        <ProfileHeader
          fullName={fullName}
          initials={initials}
          rating={stats.note}
          ratingCount={stats.reviews}
          editable
          photo={user.photo ?? null}
          onEdit={() => setCurrentPage("profil_edit")}
        />
        <PrivateStatsRow stats={stats} />
        <PrivateMenu menu={menu} />
      </div>
    );
  }

  // Public profile (owner of an announcement)
  return (
    <div className="announceProfile">
      <div className="announceProfileHeader">
        <div className="avatar">
          {user.photo ? (
            <img
              src={user.photo}
              alt={fullName}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="avatarInitials">
              {initials}
            </span>
          )}
        </div>
        <div className="nameNotes">
          <span className="T4">{fullName}</span>
          <div style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
            <Star sx={{ color: "#FFE135" }} />
            <span className="T5">
              4,9 <span style={{ color: "#8c8c8c" }}> (23 avis)</span>
            </span>
          </div>
        </div>
      </div>
      <div className="announceProfileContentAvailable">
        <span className="T3">Annonces disponibles ({availableAnnouncements.length})</span>
        <div className="announceProfileContentAvailableList">
          {(() => {
            if (availableAnnouncements.length === 0) {
              return <div className="empty">Aucune annonce disponible</div>;
            }
            return availableAnnouncements.map((ann: any) => (
              <AnnouncementCard key={ann.id} announcement={ann} profilPage={true} />
            ));
          })()}
        </div>
      </div>
      <div className="announceProfileContentClosed">
        <span className="T3">Annonces clôturées ({closedAnnouncements.length})</span>
        <div className="announceProfileContentClosedList">
          {(() => {
            if (closedAnnouncements.length === 0) {
              return <div className="empty">Aucune annonce disponible</div>;
            }
            return closedAnnouncements.map((ann: any) => (
              <AnnouncementCard key={ann.id} announcement={ann} profilPage={true} />
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
