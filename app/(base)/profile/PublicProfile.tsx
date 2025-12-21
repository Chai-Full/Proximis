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
        // Load user data and announcements in parallel
        const [usersRes, announcementsRes] = await Promise.all([
          fetchWithAuth('/api/users'),
          fetchWithAuth('/api/annonces?page=1&limit=1000'),
        ]);

        if (cancelled) return;

        // Load user data
        if (usersRes && usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData?.users && Array.isArray(usersData.users)) {
            if (!cancelled) setUsers(usersData.users);
          }
        }

        // Load announcements
        if (announcementsRes && announcementsRes.ok) {
          const announcementsData = await announcementsRes.json();
          if (announcementsData?.success && announcementsData?.data?.annonces) {
            const transformed = announcementsData.data.annonces.map((a: any) => ({
              id: a.idAnnonce,
              title: a.nomAnnonce,
              category: a.typeAnnonce,
              scope: a.lieuAnnonce,
              price: a.prixAnnonce,
              description: a.descAnnonce,
              userId: a.userCreateur?.idUser,
              createdAt: a.datePublication,
              photo: a.photos?.[0]?.urlPhoto,
              slots: a.creneaux?.map((c: any) => {
                let day = 0;
                if (c.dateDebut) {
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
                  start: c.dateDebut,
                  end: c.dateFin,
                  estReserve: c.estReserve,
                };
              }).filter((slot: any) => slot.day >= 1 && slot.day <= 7) || [],
              isAvailable: a.creneaux?.some((c: any) => !c.estReserve) !== false,
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

  const userAnnouncements = useMemo(
    () => (user ? announcements.filter((a: any) => Number(a.userId) === Number(user.id)) : []),
    [user, announcements]
  );
  const availableAnnouncements = useMemo(
    () => userAnnouncements.filter((a: any) => a.isAvailable !== false),
    [userAnnouncements]
  );
  const closedAnnouncements = useMemo(
    () => userAnnouncements.filter((a: any) => a.isAvailable === false),
    [userAnnouncements]
  );

  // Load reviews count and average rating
  useEffect(() => {
    if (!user || userAnnouncements.length === 0) {
      setReviewsCount(0);
      setAverageRating(0);
      return;
    }

    let cancelled = false;

    const loadReviewsStats = async () => {
      try {
        const evalResults = await Promise.all(
          userAnnouncements.map(async (announcement) => {
            try {
              const params = new URLSearchParams({
                announcementId: String(announcement.id),
              });
              const res = await fetchWithAuth(`/api/evaluations?${params.toString()}`);
              const data = await res.json();
              if (res.ok && data?.evaluations && Array.isArray(data.evaluations)) {
                return data.evaluations;
              }
            } catch (e) {
              console.error(`Error loading evaluations for announcement ${announcement.id}`, e);
            }
            return [] as any[];
          })
        );

        const allEvaluations: any[] = evalResults.flat();

        if (cancelled) return;

        const totalReviews = allEvaluations.length;
        let avgRating = 0;
        
        if (totalReviews > 0) {
          const sum = allEvaluations.reduce((acc, evaluation) => {
            const rating = typeof evaluation.rating === 'number' ? evaluation.rating : 0;
            return acc + rating;
          }, 0);
          avgRating = sum / totalReviews;
        }

        if (!cancelled) {
          setReviewsCount(totalReviews);
          setAverageRating(avgRating);
        }
      } catch (error) {
        console.error("Error loading reviews stats", error);
        if (!cancelled) {
          setReviewsCount(0);
          setAverageRating(0);
        }
      }
    };

    loadReviewsStats();

    return () => {
      cancelled = true;
    };
  }, [user, userAnnouncements]);

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
              {averageRating > 0 ? averageRating.toFixed(1).replace('.', ',') : '0'} <span style={{ color: "#8c8c8c" }}> ({reviewsCount} avis)</span>
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

