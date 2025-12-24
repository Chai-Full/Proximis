"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useContent } from "../ContentContext";
import "./index.css";
import Star from "@mui/icons-material/Star";
import AnnouncementCard from "../announcement/announcementCard";
import { fetchWithAuth } from "../lib/auth";
import { SkeletonProfile } from "../components/Skeleton";

export default function PublicProfile() {
  const { selectedProfileId, setHeaderTitle } = useContent();
  const [users, setUsers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);

  const targetUserId = useMemo(() => {
    if (selectedProfileId != null) return Number(selectedProfileId);
    return null;
  }, [selectedProfileId]);

  // Load profile data
  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const loadData = async () => {
      try {
        // Load profile info and user's announcements in parallel
        const [profileRes, announcementsRes] = await Promise.all([
          fetchWithAuth(`/api/profile/${targetUserId}`),
          fetchWithAuth(`/api/announcements?userId=${targetUserId}&page=1&limit=1000`),
        ]);

        if (cancelled) return;

        // Load profile data
        if (profileRes && profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData?.ok && profileData?.data) {
            if (!cancelled) {
              // Set user data
              setUsers([profileData.data.user]);
              // Set stats
              setReviewsCount(profileData.data.stats.reviewsCount || 0);
              setAverageRating(profileData.data.stats.averageRating || 0);
            }
          }
        }

        // Load announcements
        if (announcementsRes && announcementsRes.ok) {
          const announcementsData = await announcementsRes.json();
          if (announcementsData?.ok && announcementsData?.announcements) {
            const transformed = announcementsData.announcements.map((a: any) => ({
              id: a.id,
              title: a.title || a.nomAnnonce,
              category: a.category || a.typeAnnonce,
              scope: a.scope || a.lieuAnnonce,
              price: a.price || a.prixAnnonce,
              description: a.description || a.descAnnonce,
              userId: a.userId || a.userCreateur?.idUser || a.userCreateur,
              createdAt: a.createdAt || a.datePublication,
              photo: a.photo || a.photos?.[0]?.urlPhoto,
              slots: (a.slots || a.creneaux || []).map((c: any) => {
                let day = 0;
                if (c.day) {
                  day = c.day;
                } else if (c.dateDebut) {
                  try {
                    const date = new Date(c.dateDebut);
                    const jsDay = date.getDay();
                    day = jsDay === 0 ? 7 : jsDay;
                  } catch (e) {
                    console.error('Error parsing creneau dateDebut:', e, c);
                  }
                }
                return {
                  day,
                  start: c.start || c.dateDebut,
                  end: c.end || c.dateFin,
                  estReserve: c.estReserve || false,
                };
              }).filter((slot: any) => slot.day >= 1 && slot.day <= 7),
              isAvailable: a.isAvailable !== false, // Use the isAvailable field from the database
            }));
            if (!cancelled) setAnnouncements(transformed);
          }
        }
      } catch (error) {
        console.error('Error loading profile data', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

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

  // Announcements are already filtered by userId from the API, no need to filter again
  const userAnnouncements = useMemo(
    () => announcements,
    [announcements]
  );
  const availableAnnouncements = useMemo(
    () => userAnnouncements.filter((a: any) => a.isAvailable !== false),
    [userAnnouncements]
  );
  const closedAnnouncements = useMemo(
    () => userAnnouncements.filter((a: any) => a.isAvailable === false),
    [userAnnouncements]
  );

  // Reviews count and average rating are now loaded from the profile endpoint
  // No need for separate useEffect

  useEffect(() => {
    if (user && setHeaderTitle) {
      setHeaderTitle(`Profil de ${fullName}`);
      return () => setHeaderTitle && setHeaderTitle(null);
    }
    setHeaderTitle && setHeaderTitle(null);
    return () => {};
  }, [user, fullName, setHeaderTitle]);

  if (loading) {
    return <SkeletonProfile />;
  }

  if (!user) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Profil introuvable</h2>
      </div>
    );
  }

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
              {averageRating > 0 ? averageRating.toFixed(1).replace('.', ',') : '-'} <span style={{ color: "#8c8c8c" }}> ({reviewsCount} avis)</span>
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
              return <div className="empty">Aucune annonce clôturée</div>;
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

