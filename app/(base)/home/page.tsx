"use client";

import React from "react";
import { Button } from "@mui/material";
import { useContent } from "../ContentContext";
import { useRouter } from "next/navigation";
import {
  AddCircleOutlineOutlined,
  LightbulbCircleOutlined,
  Schedule,
  StarOutlineOutlined,
  Today,
} from "@mui/icons-material";
import StarsOutlined from "@mui/icons-material/StarsOutlined";
import AnnouncementCard from "../announcement/announcementCard";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { fetchWithAuth } from "../lib/auth";
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
  } = useContent();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  // SUPPRESSION DU STATE "initialDataLoaded" qui causait le blocage

  const [servicesRendered, setServicesRendered] = React.useState<number>(0);
  const [servicesReceived, setServicesReceived] = React.useState<number>(0);
  const [averageRating, setAverageRating] = React.useState<number>(0);
  const [loadingStats, setLoadingStats] = React.useState<boolean>(true);
  const [reservationToEvaluate, setReservationToEvaluate] = React.useState<{
    reservation: any;
    announcement: any;
    providerName: string;
    completedDate: string;
  } | null>(null);
  const [loadingReservationToEvaluate, setLoadingReservationToEvaluate] =
    React.useState<boolean>(true);
  const [recommendedAnnouncement, setRecommendedAnnouncement] =
    React.useState<any>(null);
  const [loadingRecommended, setLoadingRecommended] =
    React.useState<boolean>(true);
  const [nextReservation, setNextReservation] = React.useState<{
    reservation: any;
    announcement: any;
    providerName: string;
    formattedDate: string;
    formattedTime: string;
    relativeDate: string;
  } | null>(null);
  const [loadingNextReservation, setLoadingNextReservation] =
    React.useState<boolean>(true);

  // Track when component is mounted
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Load all data when user is connected and page is active
  React.useEffect(() => {
    if (!currentUserId || currentPage !== "home") {
      // Reset all states when not connected or not on home page
      if (!currentUserId) {
        setServicesRendered(0);
        setServicesReceived(0);
        setAverageRating(0);
        setLoadingStats(false);
        setReservationToEvaluate(null);
        setLoadingReservationToEvaluate(false);
        setRecommendedAnnouncement(null);
        setLoadingRecommended(false);
        setNextReservation(null);
        setLoadingNextReservation(false);
      }
      return;
    }

    let cancelled = false;

    // Set loading states
    setLoadingStats(true);
    setLoadingNextReservation(true);
    setLoadingReservationToEvaluate(true);
    setLoadingRecommended(true);

    const loadAllData = async () => {
      try {
        // Load all data in parallel
        const [statsRes, nextRdvRes, nextToEvaluateRes, mostRecentRes] =
          await Promise.all([
            fetchWithAuth(`/api/stats?userId=${currentUserId}`),
            fetchWithAuth(`/api/reservations/next-rdv?userId=${currentUserId}`),
            fetchWithAuth(
              `/api/reservations/next-to-evaluate?userId=${currentUserId}`
            ),
            fetchWithAuth(`/api/favorites/most-recent?userId=${currentUserId}`),
          ]);

        if (cancelled) return;

        // Process stats
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData?.ok && statsData?.data) {
            setServicesRendered(statsData.data.servicesRendered || 0);
            setServicesReceived(statsData.data.servicesReceived || 0);
            setAverageRating(statsData.data.averageRating || 0);
          }
        }
        setLoadingStats(false);

        // Process next reservation
        if (nextRdvRes.ok) {
          const nextRdvData = await nextRdvRes.json();
          if (nextRdvData?.ok && nextRdvData?.data) {
            setNextReservation(nextRdvData.data);
          } else {
            setNextReservation(null);
          }
        } else {
          setNextReservation(null);
        }
        setLoadingNextReservation(false);

        // Process reservation to evaluate
        if (nextToEvaluateRes.ok) {
          const nextToEvaluateData = await nextToEvaluateRes.json();
          if (nextToEvaluateData?.ok && nextToEvaluateData?.data) {
            setReservationToEvaluate(nextToEvaluateData.data);
          } else {
            setReservationToEvaluate(null);
          }
        } else {
          setReservationToEvaluate(null);
        }
        setLoadingReservationToEvaluate(false);

        // Process most recent favorite
        if (mostRecentRes.ok) {
          const mostRecentData = await mostRecentRes.json();
          if (mostRecentData?.ok && mostRecentData?.data) {
            setRecommendedAnnouncement(mostRecentData.data);
          } else {
            setRecommendedAnnouncement(null);
          }
        } else {
          setRecommendedAnnouncement(null);
        }
        setLoadingRecommended(false);
      } catch (error) {
        console.error("Error loading home data", error);
        if (!cancelled) {
          setLoadingStats(false);
          setLoadingNextReservation(false);
          setLoadingReservationToEvaluate(false);
          setLoadingRecommended(false);
        }
      }
    };

    loadAllData();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, currentPage]); // Reload when userId changes or when arriving on home page

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
            borderRadius: "15px",
            color: "white",
            textTransform: "capitalize",
          }}
          onClick={() => {
            setCurrentPage("publish");
          }}
        >
          Publier une annonce
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
              <span className="T2">Annonces recommandée</span>
            </div>
            <SkeletonAnnouncementCard />
          </div>
        ) : recommendedAnnouncement ? (
          <div className="announcementsPromoted">
            <div className="announcementsPromotedHeader">
              <LightbulbCircleOutlined sx={{ color: "#ff9202" }} />
              <span className="T2">Annonces recommandée</span>
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
                if (setCurrentPage && setSelectedReservationId) {
                  setSelectedReservationId(
                    reservationToEvaluate.reservation.id,
                  );
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
