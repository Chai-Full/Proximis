"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useContent } from "../ContentContext";
import "./index.css";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import FavoriteBorderOutlined from "@mui/icons-material/FavoriteBorderOutlined";
import Star from "@mui/icons-material/Star";
import AnnouncementCard from "../announcement/AnnouncementCard";
import ProfileHeader from "./ProfileHeader";
import PrivateStatsRow from "./PrivateStatsRow";
import PrivateMenu from "./PrivateMenu";
import { MenuItem, PrivateStats } from "./ProfileTypes";
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import OutboxIcon from '@mui/icons-material/Outbox';
import { fetchWithAuth } from "../lib/auth";
import { SkeletonProfile } from "../components/Skeleton";

export default function ProfileDetails() {
  const { selectedProfileId, currentUserId, setHeaderTitle, setCurrentPage } = useContent();
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [users, setUsers] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const targetUserId = useMemo(() => {
    if (selectedProfileId != null) return Number(selectedProfileId);
    if (currentUserId != null) return Number(currentUserId);
    return null;
  }, [selectedProfileId, currentUserId]);

  const isCurrentUser =
    targetUserId != null &&
    currentUserId != null &&
    Number(targetUserId) === Number(currentUserId);

  // Load users, announcements, and reservations from MongoDB
  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const loadData = async () => {
      try {
        // Load users
        const usersRes = await fetchWithAuth('/api/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData?.users && Array.isArray(usersData.users)) {
            if (!cancelled) setUsers(usersData.users);
          }
        }

        // Load announcements
        const announcementsRes = await fetchWithAuth('/api/annonces?page=1&limit=1000');
        if (announcementsRes.ok) {
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
              slots: a.creneaux?.map((c: any) => ({
                start: c.dateDebut,
                end: c.dateFin,
                estReserve: c.estReserve,
              })) || [],
              isAvailable: a.creneaux?.some((c: any) => !c.estReserve) !== false,
            }));
            if (!cancelled) setAnnouncements(transformed);
          }
        }

        // Load reservations
        if (currentUserId) {
          const reservationsRes = await fetchWithAuth(`/api/reservations?userId=${currentUserId}`);
          if (reservationsRes.ok) {
            const reservationsData = await reservationsRes.json();
            if (reservationsData?.reservations && Array.isArray(reservationsData.reservations)) {
              if (!cancelled) setReservations(reservationsData.reservations);
            }
          }
        }
      } catch (error) {
        console.error('Error loading data', error);
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
  }, [targetUserId, currentUserId]);

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
  const userReservations = useMemo(
    () => reservations.filter((r: any) => user && Number(r.userId) === Number(user.id)),
    [reservations, user]
  );

  // Count reservations to evaluate (status: "to_evaluate")
  const reservationsToEvaluate = useMemo(
    () => userReservations.filter((r: any) => r.status === "to_evaluate"),
    [userReservations]
  );

  // Load favorites count from API
  useEffect(() => {
    if (!isCurrentUser || !currentUserId) {
      setFavoritesCount(0);
      return;
    }

    const loadFavoritesCount = async () => {
      try {
        const params = new URLSearchParams({
          userId: String(currentUserId),
        });
        const res = await fetchWithAuth(`/api/favorites?${params.toString()}`);
        const data = await res.json();
        if (res.ok && data.favorites && Array.isArray(data.favorites)) {
          setFavoritesCount(data.favorites.length);
        } else {
          setFavoritesCount(0);
        }
      } catch (e) {
        console.error("Error loading favorites count", e);
        setFavoritesCount(0);
      }
    };

    loadFavoritesCount();
  }, [isCurrentUser, currentUserId]);

  // Load reviews count and average rating from all user's announcements
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);

  useEffect(() => {
    if (!user || userAnnouncements.length === 0) {
      setReviewsCount(0);
      setAverageRating(0);
      return;
    }

    let cancelled = false;

    const loadReviewsStats = async () => {
      try {
        // Load evaluations for all user's announcements
        const allEvaluations: any[] = [];
        
        for (const announcement of userAnnouncements) {
          try {
            const params = new URLSearchParams({
              announcementId: String(announcement.id),
            });
            const res = await fetchWithAuth(`/api/evaluations?${params.toString()}`);
            const data = await res.json();
            
            if (res.ok && data?.evaluations && Array.isArray(data.evaluations)) {
              allEvaluations.push(...data.evaluations);
            }
          } catch (e) {
            console.error(`Error loading evaluations for announcement ${announcement.id}`, e);
          }
        }

        if (cancelled) return;

        // Calculate total reviews count and average rating
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

  // Derived simple stats from available data
  const stats: PrivateStats = {
    services: userReservations.length,
    reviews: reviewsCount,
    note: averageRating,
  };

  const menu: MenuItem[] = [
    { id: "annonces", title: "Mes annonces", icon: TextSnippetIcon, count: userAnnouncements.length },
    {
      id: "reservations",
      title: "Mes réservations",
      icon: OutboxIcon,
      count: userReservations.length,
      badge: reservationsToEvaluate.length > 0 ? `${reservationsToEvaluate.length} à évaluer` : undefined,
    },
    { id: "favoris", title: "Mes favoris", icon: FavoriteBorderOutlined, count: favoritesCount },
  ];

  useEffect(() => {
    if (user && setHeaderTitle) {
      setHeaderTitle(isCurrentUser ? "Profil" : `Profil de ${fullName}`);
      return () => setHeaderTitle && setHeaderTitle(null);
    }
    setHeaderTitle && setHeaderTitle(null);
    return () => {};
  }, [isCurrentUser, user, fullName, setHeaderTitle]);

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
