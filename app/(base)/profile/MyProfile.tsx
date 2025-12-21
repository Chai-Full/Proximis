"use client";
import React, { useEffect, useState } from "react";
import { useContent } from "../ContentContext";
import "./index.css";
import ProfileHeader from "./ProfileHeader";
import PrivateStatsRow from "./PrivateStatsRow";
import PrivateMenu from "./PrivateMenu";
import { MenuItem, PrivateStats } from "./ProfileTypes";
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import OutboxIcon from '@mui/icons-material/Outbox';
import FavoriteBorderOutlined from "@mui/icons-material/FavoriteBorderOutlined";
import { fetchWithAuth } from "../lib/auth";
import { SkeletonProfile } from "../components/Skeleton";

export default function MyProfile() {
  const { currentUserId, setHeaderTitle, setCurrentPage } = useContent();
  const [profileStats, setProfileStats] = useState<{
    servicesRendered: number;
    reviews: number;
    averageRating: number;
    announcementsCount: number;
    reservationsCount: number;
    favoritesCount: number;
    reservationsToEvaluateCount: number;
  } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load profile data
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const loadData = async () => {
      try {
        // Load user data and stats in parallel
        const [usersRes, statsRes] = await Promise.all([
          fetchWithAuth('/api/users'),
          fetchWithAuth('/api/profile/stats'),
        ]);

        if (cancelled) return;

        // Load user data
        if (usersRes && usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData?.users && Array.isArray(usersData.users)) {
            const foundUser = usersData.users.find((u: any) => Number(u.id) === Number(currentUserId));
            if (!cancelled) setUser(foundUser || null);
          }
        }

        // Load profile stats
        if (statsRes && statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData?.ok && statsData?.data) {
            if (!cancelled) setProfileStats(statsData.data);
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
  }, [currentUserId]);

  const fullName = user ? `${user.prenom} ${user.nom}`.trim() : "Profil";
  const initials = fullName
    .split(/\s+/)
    .map((n) => n[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Derived simple stats from API data
  const stats: PrivateStats = profileStats
    ? {
        services: profileStats.servicesRendered,
        reviews: profileStats.reviews,
        note: profileStats.averageRating,
      }
    : {
        services: 0,
        reviews: 0,
        note: 0,
      };

  const menu: MenuItem[] = [
    {
      id: "annonces",
      title: "Mes annonces",
      icon: TextSnippetIcon,
      count: profileStats?.announcementsCount || 0,
    },
    {
      id: "reservations",
      title: "Mes réservations",
      icon: OutboxIcon,
      count: profileStats?.reservationsCount || 0,
      badge: profileStats && profileStats.reservationsToEvaluateCount > 0
        ? `${profileStats.reservationsToEvaluateCount} à évaluer`
        : undefined,
    },
    {
      id: "favoris",
      title: "Mes favoris",
      icon: FavoriteBorderOutlined,
      count: profileStats?.favoritesCount || 0,
    },
  ];

  useEffect(() => {
    if (setHeaderTitle) {
      setHeaderTitle("Profil");
      return () => setHeaderTitle && setHeaderTitle(null);
    }
  }, [setHeaderTitle]);

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

