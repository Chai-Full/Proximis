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
  const [announcements, setAnnouncements] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);

  console.log("reservationToEvaluate", reservationToEvaluate);
  console.log("recommendedAnnouncement", recommendedAnnouncement);

  // Track when component is mounted
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Load announcements and users from MongoDB
  React.useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    const loadData = async () => {
      try {
        // Load announcements
        const announcementsRes = await fetchWithAuth("/api/annonces");
        console.log("the announceRes", announcementsRes);
        
        if (announcementsRes.ok) {
          const announcementsData = await announcementsRes.json();
          if (announcementsData?.success && announcementsData?.data?.annonces) {
            // Transform to match expected format
            const transformed = announcementsData.data.annonces.map(
              (a: any) => ({
                id: a.idAnnonce,
                title: a.nomAnnonce,
                category: a.typeAnnonce,
                scope: a.lieuAnnonce,
                price: a.prixAnnonce,
                description: a.descAnnonce,
                userId: a.userCreateur?.idUser,
                createdAt: a.datePublication,
                photo: a.photos?.[0]?.urlPhoto,
                slots:
                  a.creneaux
                    ?.map((c: any) => {
                      const dayOfWeek = c.dateDebut
                        ? (() => {
                            const date = dayjs(c.dateDebut);
                            const jsDay = date.day();
                            return jsDay === 0 ? 7 : jsDay;
                          })()
                        : undefined;
                      return {
                        day: dayOfWeek,
                        start: c.dateDebut,
                        end: c.dateFin,
                        estReserve: c.estReserve,
                      };
                    })
                    .filter((c: any) => c.day != null && !c.estReserve) || [],
              }),
            );
            if (!cancelled) setAnnouncements(transformed);
          }
        }

        // Load users
        const usersRes = await fetchWithAuth("/api/users");
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (
            usersData?.ok &&
            usersData?.users &&
            Array.isArray(usersData.users)
          ) {
            if (!cancelled) setUsers(usersData.users);
          } else if (usersData?.users && Array.isArray(usersData.users)) {
            // Fallback si pas de structure { ok: true, users: [...] }
            if (!cancelled) setUsers(usersData.users);
          }
        }
      } catch (error) {
        console.error("Error loading data", error);
      }
      // PLUS DE FINALLY BLOQUANT ICI
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

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

  // Load statistics
  React.useEffect(() => {
    if (!currentUserId) {
      setServicesRendered(0);
      setServicesReceived(0);
      setAverageRating(0);
      setLoadingStats(false);
      return;
    }

    let cancelled = false;
    setLoadingStats(true);

    const loadStats = async () => {
      try {
        const reservationsParams = new URLSearchParams({
          userId: String(currentUserId),
        });
        const reservationsRes = await fetchWithAuth(
          `/api/reservations?${reservationsParams.toString()}`,
        );
        const reservationsData = await reservationsRes.json();
        const reservations =
          reservationsRes.ok && reservationsData?.ok
            ? reservationsData.reservations || []
            : [];

        if (cancelled) return;

        const currentUserIdNum = Number(currentUserId);
        const servicesReceivedCount = reservations.filter((r: any) => {
          const rUserId =
            typeof r.userId === "number" ? r.userId : Number(r.userId);
          return rUserId === currentUserIdNum;
        }).length;
        setServicesReceived(servicesReceivedCount);

        const userAnnouncements = Array.isArray(announcements)
          ? announcements.filter(
              (a: any) => String(a.userId) === String(currentUserId),
            )
          : [];
        const userAnnouncementIds = userAnnouncements.map((a: any) =>
          String(a.id),
        );
        const servicesRenderedCount = reservations.filter((r: any) =>
          userAnnouncementIds.includes(String(r.announcementId)),
        ).length;
        setServicesRendered(servicesRenderedCount);

        const allEvaluations: any[] = [];
        for (const announcement of userAnnouncements) {
          try {
            const evalParams = new URLSearchParams({
              announcementId: String(announcement.id),
            });
            const evalRes = await fetchWithAuth(
              `/api/evaluations?${evalParams.toString()}`,
            );
            const evalData = await evalRes.json();

            if (
              evalRes.ok &&
              evalData?.ok &&
              evalData?.evaluations &&
              Array.isArray(evalData.evaluations)
            ) {
              allEvaluations.push(...evalData.evaluations);
            }
          } catch (e) {
            console.error(
              `Error loading evaluations for announcement ${announcement.id}`,
              e,
            );
          }
        }

        if (cancelled) return;

        let avgRating = 0;
        if (allEvaluations.length > 0) {
          const sum = allEvaluations.reduce((acc, evaluation) => {
            const rating =
              typeof evaluation.rating === "number" ? evaluation.rating : 0;
            return acc + rating;
          }, 0);
          avgRating = sum / allEvaluations.length;
        }
        setAverageRating(avgRating);
      } catch (error) {
        console.error("Error loading statistics", error);
        if (!cancelled) {
          setServicesRendered(0);
          setServicesReceived(0);
          setAverageRating(0);
        }
      } finally {
        if (!cancelled) {
          setLoadingStats(false);
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, announcements]); // Ajout de announcements pour recalculer si elles arrivent tardivement

  // Load oldest reservation to evaluate
  React.useEffect(() => {
    if (!currentUserId) {
      setReservationToEvaluate(null);
      setLoadingReservationToEvaluate(false);
      return;
    }

    let cancelled = false;
    setLoadingReservationToEvaluate(true);

    const loadReservationToEvaluate = async () => {
      try {
        const params = new URLSearchParams({
          userId: String(currentUserId),
        });
        const res = await fetchWithAuth(
          `/api/reservations?${params.toString()}`,
        );
        const data = await res.json();
        const reservations = res.ok && data?.ok ? data.reservations || [] : [];

        if (cancelled) return;

        const currentUserIdNum = Number(currentUserId);
        const toEvaluate = reservations.filter((r: any) => {
          const rUserId =
            typeof r.userId === "number" ? r.userId : Number(r.userId);
          return r.status === "to_evaluate" && rUserId === currentUserIdNum;
        });

        if (toEvaluate.length === 0) {
          if (!cancelled) setReservationToEvaluate(null);
          return;
        }

        toEvaluate.sort((a: any, b: any) => {
          const dateA = a.date || a.updatedAt || a.createdAt || "";
          const dateB = b.date || b.updatedAt || b.createdAt || "";
          return dateA.localeCompare(dateB);
        });

        const oldestReservation = toEvaluate[0];
        const announcementsList = Array.isArray(announcements)
          ? announcements
          : [];
        const oldestAnnouncementId =
          typeof oldestReservation.announcementId === "number"
            ? oldestReservation.announcementId
            : Number(oldestReservation.announcementId);
        const announcement = announcementsList.find(
          (a: any) => Number(a.id) === oldestAnnouncementId,
        );

        if (!announcement) {
          // Si on ne trouve pas l'annonce (peut-être pas encore chargée), on met null
          // Mais le chargement est fini pour cette requête
          if (!cancelled) setReservationToEvaluate(null);
          return;
        }

        const evalAnnouncementUserId =
          typeof announcement.userId === "number"
            ? announcement.userId
            : Number(announcement.userId);
        const provider = users.find(
          (u: any) => Number(u.id) === evalAnnouncementUserId,
        );
        let providerName = "Prestataire";
        if (provider) {
          const prenom = provider.prenom || "";
          const nom = provider.nom || "";
          if (prenom && nom) {
            providerName = `${prenom} ${nom.charAt(0).toUpperCase()}.`;
          } else if (prenom) {
            providerName = prenom;
          } else if (nom) {
            providerName = `${nom.charAt(0).toUpperCase()}.`;
          } else if (provider.name) {
            providerName = provider.name;
          }
        }

        const completedDate =
          oldestReservation.updatedAt || oldestReservation.createdAt || "";
        const formattedDate = completedDate
          ? dayjs(completedDate).locale("fr").format("D MMM YYYY")
          : "";

        if (!cancelled) {
          setReservationToEvaluate({
            reservation: oldestReservation,
            announcement,
            providerName,
            completedDate: formattedDate,
          });
        }
      } catch (error) {
        console.error("Error loading reservation to evaluate", error);
        if (!cancelled) setReservationToEvaluate(null);
      } finally {
        if (!cancelled) setLoadingReservationToEvaluate(false);
      }
    };

    loadReservationToEvaluate();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, announcements, users]); // Re-run when announcements/users arrive

  // Load most recent favorite announcement
  React.useEffect(() => {
    if (!currentUserId) {
      setRecommendedAnnouncement(null);
      setLoadingRecommended(false);
      return;
    }

    let cancelled = false;
    setLoadingRecommended(true);

    const loadRecommendedAnnouncement = async () => {
      try {
        const favoritesParams = new URLSearchParams({
          userId: String(currentUserId),
        });
        const favoritesRes = await fetchWithAuth(
          `/api/favorites?${favoritesParams.toString()}`,
        );
        const favoritesData = await favoritesRes.json();

        if (cancelled) return;

        if (
          !favoritesRes.ok ||
          !favoritesData?.ok ||
          !favoritesData.favorites ||
          !Array.isArray(favoritesData.favorites)
        ) {
          if (!cancelled) setRecommendedAnnouncement(null);
          return;
        }

        const favoriteIds = favoritesData.favorites.map((f: any) => {
          return typeof f.announcementId === "number"
            ? f.announcementId
            : Number(f.announcementId);
        });

        if (favoriteIds.length === 0) {
          if (!cancelled) setRecommendedAnnouncement(null);
          return;
        }

        const announcementsList = Array.isArray(announcements)
          ? announcements
          : [];
        const favoriteAnnouncements = announcementsList.filter((a: any) =>
          favoriteIds.some((favId: number) => Number(a.id) === favId),
        );

        if (favoriteAnnouncements.length === 0) {
          if (!cancelled) setRecommendedAnnouncement(null);
          return;
        }

        favoriteAnnouncements.sort((a: any, b: any) => {
          const dateA = a.createdAt || "";
          const dateB = b.createdAt || "";
          return dateB.localeCompare(dateA);
        });

        const mostRecent = favoriteAnnouncements[0];

        if (!cancelled) {
          setRecommendedAnnouncement(mostRecent);
        }
      } catch (error) {
        console.error("Error loading recommended announcement", error);
        if (!cancelled) setRecommendedAnnouncement(null);
      } finally {
        if (!cancelled) setLoadingRecommended(false);
      }
    };

    loadRecommendedAnnouncement();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, announcements]);

  // Load next reservation (closest upcoming)
  /*React.useEffect(() => {
    if (!currentUserId) {
      setNextReservation(null);
      setLoadingNextReservation(false);
      return;
    }

    SUPPRESSION DE LA CONDITION DE BLOCAGE
    On lance le chargement immédiatement, quitte à ne rien trouver si les annonces ne sont pas encore là.
    Quand "announcements" changera (chargement terminé), ce useEffect se relancera automatiquement.

    let cancelled = false;
    setLoadingNextReservation(true);

    const loadNextReservation = async () => {
      try {
        const params = new URLSearchParams({
          userId: String(currentUserId),
        });
        const res = await fetchWithAuth(
          `/api/reservations?${params.toString()}`,
        );
        const data = await res.json();
        const reservations = res.ok && data?.ok ? data.reservations || [] : [];

        if (cancelled) return;

        const now = dayjs();
        const upcoming = reservations.filter((r: any) => {
          const status = r.status || "to_pay";
          if (status !== "reserved" && status !== "to_pay") return false;
          if (!r.date) return false;
          const reservationDate = dayjs(r.date);
          return (
            reservationDate.isAfter(now) || reservationDate.isSame(now, "day")
          );
        });

        if (upcoming.length === 0) {
          if (!cancelled) setNextReservation(null);
          return;
        }

        const announcementsList = Array.isArray(announcements)
          ? announcements
          : [];

        Si les annonces sont vides (pas encore chargées), cette liste sera vide.
        Ce n'est pas grave, on affichera "rien" (loading = false) temporairement.
        Dès que les annonces arriveront, le useEffect rejouera et remplira la liste.
        const reservationsWithDateTime = upcoming
          .map((r: any) => {
            const rAnnouncementId =
              typeof r.announcementId === "number"
                ? r.announcementId
                : Number(r.announcementId);
            const announcement = announcementsList.find(
              (a: any) => Number(a.id) === rAnnouncementId,
            );
            if (
              !announcement ||
              !announcement.slots ||
              !announcement.slots[r.slotIndex]
            ) {
              return null;
            }
            const slot = announcement.slots[r.slotIndex];
            const reservationDate = dayjs(r.date);
            const slotStart = slot.start ? dayjs(slot.start) : null;
            const fullDateTime = slotStart
              ? reservationDate
                  .hour(slotStart.hour())
                  .minute(slotStart.minute())
              : reservationDate.startOf("day");

            return {
              reservation: r,
              announcement,
              fullDateTime,
            };
          })
          .filter((item: any) => item !== null);

        if (reservationsWithDateTime.length === 0) {
          if (!cancelled) setNextReservation(null);
          return;
        }

        reservationsWithDateTime.sort((a: any, b: any) => {
          return a.fullDateTime.valueOf() - b.fullDateTime.valueOf();
        });

        const closest = reservationsWithDateTime[0];
        const { reservation, announcement, fullDateTime } = closest;

        const nextAnnouncementUserId =
          typeof announcement.userId === "number"
            ? announcement.userId
            : Number(announcement.userId);
        const provider = users.find(
          (u: any) => Number(u.id) === nextAnnouncementUserId,
        );
        let providerName = "Prestataire";
        if (provider) {
          const prenom = provider.prenom || "";
          const nom = provider.nom || "";
          if (prenom && nom) {
            providerName = `${prenom} ${nom.charAt(0).toUpperCase()}.`;
          } else if (prenom) {
            providerName = prenom;
          } else if (nom) {
            providerName = `${nom.charAt(0).toUpperCase()}.`;
          } else if (provider.name) {
            providerName = provider.name;
          }
        }

        const formattedDate = fullDateTime.locale("fr").format("D MMM YYYY");
        const formattedTime = fullDateTime.format("HH:mm");

        const today = dayjs().startOf("day");
        const reservationDay = fullDateTime.startOf("day");
        const diffDays = reservationDay.diff(today, "day");
        let relativeDate = "";
        if (diffDays === 0) {
          relativeDate = "aujourd'hui";
        } else if (diffDays === 1) {
          relativeDate = "demain";
        } else {
          relativeDate = `dans ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
        }

        if (!cancelled) {
          setNextReservation({
            reservation,
            announcement,
            providerName,
            formattedDate,
            formattedTime,
            relativeDate,
          });
        }
      } catch (error) {
        console.error("Error loading next reservation", error);
        if (!cancelled) setNextReservation(null);
      } finally {
        On s'assure que le loading passe toujours à false, quoi qu'il arrive
        if (!cancelled) setLoadingNextReservation(false);
      }
    };

    loadNextReservation();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, announcements, users]);*/ // Re-run when announcements/users arrive

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
        {/* {loadingNextReservation ? (
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
        ) : null} */}
        {/* {loadingReservationToEvaluate ? (
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
        ) : null} */}
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
