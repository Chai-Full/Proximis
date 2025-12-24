"use client";

import React from "react";
import { Button } from "@mui/material";
import { useContent } from "../ContentContext";
import { useRouter } from "next/navigation";
import {
  AddCircleOutlineOutlined,
  InboxOutlined,
  LightbulbCircleOutlined,
  Schedule,
  StarOutlineOutlined,
  Today,
} from "@mui/icons-material";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import StarsOutlined from "@mui/icons-material/StarsOutlined";
import AnnouncementCard from "../announcement/announcementCard";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { fetchWithAuth } from "../lib/auth";
import { useCachedData } from "../lib/useCachedData";
import {
  SkeletonNextRDV,
  SkeletonAnnouncementCard,
  SkeletonStats,
  Skeleton,
} from "../components/Skeleton";

export default function HomeContent() {
  const {
    currentPage,
    setCurrentPage,
    currentUserId,
    clearHistory,
    history,
    setSelectedReservationId,
    setEvaluationData,
  } = useContent();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  // SUPPRESSION DU STATE "initialDataLoaded" qui causait le blocage

  const [servicesRendered, setServicesRendered] = React.useState<number>(0);
  const [servicesReceived, setServicesReceived] = React.useState<number>(0);
  const [averageRating, setAverageRating] = React.useState<number>(0);
  const [reservationToEvaluate, setReservationToEvaluate] = React.useState<{
    reservation: any;
    announcement: any;
    providerName: string;
    completedDate: string;
  } | null>(null);
  const [recommendedAnnouncement, setRecommendedAnnouncement] =
    React.useState<any>(null);
  const [nextReservation, setNextReservation] = React.useState<{
    reservation: any;
    announcement: any;
    providerName: string;
    formattedDate: string;
    formattedTime: string;
    relativeDate: string;
  } | null>(null);

  // Track when component is mounted
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Load stats with cache
  const { data: statsData, loading: loadingStats } = useCachedData({
    cacheKey: 'home_stats',
    fetchFn: async () => {
      const res = await fetchWithAuth(`/api/stats?userId=${currentUserId}`);
      const data = await res.json();
      if (res.ok && data?.ok && data?.data) {
        return {
          servicesRendered: data.data.servicesRendered || 0,
          servicesReceived: data.data.servicesReceived || 0,
          averageRating: data.data.averageRating || 0,
        };
      }
      return { servicesRendered: 0, servicesReceived: 0, averageRating: 0 };
    },
    enabled: currentUserId != null && currentPage === "home",
    userId: currentUserId,
  });

  // Load next reservation with cache
  const { data: nextReservationData, loading: loadingNextReservation } = useCachedData({
    cacheKey: 'home_next_rdv',
    fetchFn: async () => {
      const res = await fetchWithAuth(`/api/reservations/next-rdv?userId=${currentUserId}`);
      const data = await res.json();
      if (res.ok && data?.ok && data?.data) {
        return data.data;
      }
      return null;
    },
    enabled: currentUserId != null && currentPage === "home",
    userId: currentUserId,
  });

  // Load reservation to evaluate with cache
  const { data: reservationToEvaluateData, loading: loadingReservationToEvaluate } = useCachedData({
    cacheKey: 'home_next_to_evaluate',
    fetchFn: async () => {
      const res = await fetchWithAuth(`/api/reservations/next-to-evaluate?userId=${currentUserId}`);
      const data = await res.json();
      if (res.ok && data?.ok && data?.data) {
        return data.data;
      }
      return null;
    },
    enabled: currentUserId != null && currentPage === "home",
    userId: currentUserId,
  });

  // Load most recent favorite with cache
  const { data: recommendedAnnouncementData, loading: loadingRecommended } = useCachedData({
    cacheKey: 'home_most_recent_favorite',
    fetchFn: async () => {
      const res = await fetchWithAuth(`/api/favorites/most-recent?userId=${currentUserId}`);
      const data = await res.json();
      if (res.ok && data?.ok && data?.data) {
        return data.data;
      }
      return null;
    },
    enabled: currentUserId != null && currentPage === "home",
    userId: currentUserId,
  });

  // Update states from cached data
  React.useEffect(() => {
    if (statsData) {
      setServicesRendered(statsData.servicesRendered);
      setServicesReceived(statsData.servicesReceived);
      setAverageRating(statsData.averageRating);
    } else if (!loadingStats && currentUserId == null) {
      setServicesRendered(0);
      setServicesReceived(0);
      setAverageRating(0);
    }
  }, [statsData, loadingStats, currentUserId]);

  React.useEffect(() => {
    setNextReservation(nextReservationData ?? null);
  }, [nextReservationData]);

  React.useEffect(() => {
    setReservationToEvaluate(reservationToEvaluateData ?? null);
  }, [reservationToEvaluateData]);

  React.useEffect(() => {
    setRecommendedAnnouncement(recommendedAnnouncementData ?? null);
  }, [recommendedAnnouncementData]);

  React.useEffect(() => {
    if (!mounted) return;

    const checkUserId = () => {
      if (currentUserId != null) return;

      try {
        const storedUserId = localStorage.getItem("proximis_userId");
        const storedToken = localStorage.getItem("proximis_token");
        if (storedUserId && storedToken) return;
      } catch (e) {
        // ignore
      }

      router.push("/");
    };

    const timer = setTimeout(checkUserId, 100);
    return () => clearTimeout(timer);
  }, [currentUserId, router, mounted]);

  React.useEffect(() => {
    if (currentPage === "home" && history.length === 0) {
      clearHistory && clearHistory();
    }
  }, [currentPage, clearHistory, history.length]);

  const stats = [
    { label: "Services rendus", value: String(servicesRendered) },
    { label: "Services reçus", value: String(servicesReceived) },
    {
      label: "Note moyenne",
      value: averageRating > 0 ? averageRating.toFixed(1) : "0",
    },
  ];

  // Tant que le userId n'est pas encore déterminé (undefined), on montre un loader global
  if (!mounted || currentUserId === undefined) {
    return (
      <div className="homeContainer">
        <SkeletonNextRDV />
      </div>
    );
  }

  return (
    <>
      <div className="homeContainer">
        <Button
          fullWidth
          variant="contained"
          color="secondary"
          startIcon={<AddCircleOutlineOutlined sx={{ color: "white" }} />}
          sx={{
            paddingY: "10px",
            borderRadius: "15px",
            color: "white",
            textTransform: "capitalize",
            marginBottom: "10px",
          }}
          onClick={() => {
            setCurrentPage("publish");
          }}
        >
          Publier une annonce
        </Button>
        <Button
          fullWidth
          variant="contained"
          startIcon={<InboxOutlined sx={{ color: "white" }} />}
          sx={{
            paddingY: "10px",
            borderRadius: "15px",
            backgroundColor: "var(--primary)",
            color: "white",
            textTransform: "capitalize",
            "&:hover": {
              backgroundColor: "var(--primary)",
              opacity: 0.9,
            },
            marginBottom: "10px",
          }}
          onClick={() => {
            // Save view preference to localStorage
            if (typeof window !== "undefined") {
              localStorage.setItem("proximis_myAnnouncements_view", "my_announcements");
            }
            setCurrentPage("my_announcements");
          }}
        >
          Mes annonces
        </Button>
        {loadingNextReservation ? (
          <SkeletonNextRDV />
        ) : nextReservation ? (
          <div className="nextRDV">
            <div className="nextRDVC1">
              <div className="nextRDVC1Title">
                <Today sx={{ color: "white" }} />
                <span className="T1">Prochain RDV</span>
              </div>
              <div className="nextRDVBadge">
                <span className="T6">{nextReservation.relativeDate}</span>
              </div>
            </div>
            <div className="nextRDVC2">
              <span className="T4">
                {nextReservation.announcement.title} avec{" "}
                {nextReservation.providerName}
              </span>
            </div>
            <div className="nextRDVC3">
              <div style={{ display: "flex", columnGap: "3px" }}>
                <Schedule sx={{ color: "white" }} />
                <span className="T7">
                  {nextReservation.formattedDate} -{" "}
                  {nextReservation.formattedTime}
                </span>
              </div>
            </div>
          </div>
        ) : null}
        {loadingRecommended ? (
          <div className="announcementsPromoted">
            <div className="announcementsPromotedHeader">
              <LightbulbCircleOutlined sx={{ color: "#ff9202" }} />
              <span className="T2">Annonce recommandée</span>
            </div>
            <SkeletonAnnouncementCard />
          </div>
        ) : recommendedAnnouncement ? (
          <div className="announcementsPromoted">
            <div className="announcementsPromotedHeader">
              <LightbulbCircleOutlined sx={{ color: "#ff9202" }} />
              <span className="T2">Annonce recommandée</span>
            </div>
            <AnnouncementCard announcement={recommendedAnnouncement} />
          </div>
        ) : null}
        {loadingReservationToEvaluate ? (
          <div className="anouncementActionRequire" style={{ padding: "16px" }}>
            <Skeleton
              variant="text"
              width="60%"
              height={20}
              style={{ marginBottom: "8px" }}
            />
            <Skeleton
              variant="text"
              width="80%"
              height={16}
              style={{ marginBottom: "8px" }}
            />
            <Skeleton
              variant="text"
              width="50%"
              height={14}
              style={{ marginBottom: "12px" }}
            />
            <Skeleton
              variant="rectangular"
              width="100%"
              height={40}
              style={{ borderRadius: "8px" }}
            />
          </div>
        ) : reservationToEvaluate ? (
          <div className="anouncementActionRequire">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                columnGap: "5px",
              }}
            >
              <StarOutlineOutlined sx={{ color: "#ff9202" }} />
              <span className="T2">Annonces à évaluer</span>
            </div>
            <span className="T4">
              {reservationToEvaluate.announcement.title} par{" "}
              {reservationToEvaluate.providerName}
            </span>
            {reservationToEvaluate.completedDate && (
              <span className="T6" style={{ color: "#8c8c8c" }}>
                Complété le {reservationToEvaluate.completedDate}
              </span>
            )}
            <div
              className="anouncementActionRequireBtn"
              onClick={() => {
                if (setCurrentPage && setSelectedReservationId && setEvaluationData) {
                  setSelectedReservationId(
                    reservationToEvaluate.reservation.id,
                  );
                  setEvaluationData({
                    reservation: reservationToEvaluate.reservation,
                    announcement: reservationToEvaluate.announcement,
                    providerName: reservationToEvaluate.providerName,
                  });
                  setCurrentPage("evaluate");
                }
              }}
            >
              <span className="T6">Action requise</span>
            </div>
          </div>
        ) : null}
        <div className="statsRecap">
          <div
            style={{ display: "flex", alignItems: "center", columnGap: "5px" }}
          >
            <StarsOutlined sx={{ color: "#1ea792" }} />
            <span className="T2">Vos statistiques</span>
          </div>

          <div className="statsRecapContent">
            {loadingStats ? (
              <SkeletonStats />
            ) : (
              stats.map(({ label, value }) => (
                <div key={label} className="statsRecapItem">
                  <span style={{ color: "#03A689" }}>{value}</span>
                  <span
                    className="T7"
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "wrap",
                      flex: 1,
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
