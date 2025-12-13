"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useContent } from "../ContentContext";
import Star from "@mui/icons-material/Star";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import announcementsData from "../../../data/announcements.json";
import usersData from "../../../data/users.json";
import { getDayLabels } from "@/lib/daylabel";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import updateLocale from "dayjs/plugin/updateLocale";
import "./index.css";

dayjs.locale("fr");
dayjs.extend(updateLocale);

// Configure French month abbreviations
dayjs.updateLocale("fr", {
  monthsShort: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
});

type TabType = "my_announcements" | "reservations" | "favorites";

interface AnnouncementCardData {
  id: number | string;
  title: string;
  photo?: string;
  price?: number;
  category?: string;
  slots?: { day: number; start?: string | null; end?: string | null }[];
  isAvailable?: boolean;
  rating?: number;
  description?: string;
}

function MyAnnouncementCard({ announcement, showFavoriteIcon = false }: { announcement: AnnouncementCardData; showFavoriteIcon?: boolean }) {
  const { setCurrentPage, setSelectedAnnouncementId } = useContent();
  const dayLabels = getDayLabels(announcement.slots);
  const rating = announcement.rating ?? 4.8;

  const handleClick = () => {
    setSelectedAnnouncementId && setSelectedAnnouncementId(announcement.id);
    setCurrentPage && setCurrentPage("announce_details");
  };

  // Truncate description
  const truncatedDescription = announcement.description
    ? announcement.description.length > 50
      ? announcement.description.substring(0, 50) + "..."
      : announcement.description
    : "";

  return (
    <div className="myAnnouncementCard" onClick={handleClick} role="button" tabIndex={0}>
      <div className="myAnnouncementCardTop">
        <div className="myAnnouncementCardContent">
          <div
            className="myAnnouncementCardImage"
            style={{
              backgroundImage: announcement.photo
                ? `url("${announcement.photo}")`
                : `url('/photo1.svg')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="myAnnouncementCardDetails">
            {showFavoriteIcon ? (
              // Layout for favorites view
              <>
                <div className="myAnnouncementCardHeader">
                  <h3 className="myAnnouncementCardTitle">{announcement.title}</h3>
                  <FavoriteBorder sx={{ color: "var(--secondary)", fontSize: "18px" }} />
                </div>
                <div className="myAnnouncementCardDescriptionRating">
                  {truncatedDescription && (
                    <p className="myAnnouncementCardDescription">{truncatedDescription}</p>
                  )}
                  <div className="myAnnouncementCardRating">
                    <Star sx={{ color: "#FFE135", fontSize: "18px" }} />
                    <span>{rating}</span>
                  </div>
                </div>
                <div className="myAnnouncementCardDaysRow">
                  <div className="myAnnouncementCardDays">
                    {dayLabels.length > 0 ? (
                      dayLabels.map((day, idx) => (
                        <span key={idx} className="dayBadge">
                          {day}
                        </span>
                      ))
                    ) : (
                      <span className="dayBadge empty">Aucun créneau</span>
                    )}
                  </div>
                  <span className="priceText">{announcement.price ? `${announcement.price}€/h` : "—"}</span>
                </div>
              </>
            ) : (
              // Layout for my announcements view
              <>
                <div className="myAnnouncementCardHeader">
                  <h3 className="myAnnouncementCardTitle">{announcement.title}</h3>
                  <div className="myAnnouncementCardRating">
                    <Star sx={{ color: "#FFE135", fontSize: "18px" }} />
                    <span>{rating}</span>
                  </div>
                </div>
                {truncatedDescription && (
                  <p className="myAnnouncementCardDescription">{truncatedDescription}</p>
                )}
                <div className="myAnnouncementCardDaysRow">
                  <div className="myAnnouncementCardDays">
                    {dayLabels.length > 0 ? (
                      dayLabels.map((day, idx) => (
                        <span key={idx} className="dayBadge">
                          {day}
                        </span>
                      ))
                    ) : (
                      <span className="dayBadge empty">Aucun créneau</span>
                    )}
                  </div>
                  <span className="priceText">{announcement.price ? `${announcement.price}€/h` : "—"}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="myAnnouncementCardFooter">
        <div className="categoryBadge">{announcement.category || "Non catégorisé"}</div>
        <span
          className={`statusBadge ${announcement.isAvailable !== false ? "available" : "closed"}`}
        >
          {announcement.isAvailable !== false ? "Disponible" : "Clôturée"}
        </span>
      </div>
    </div>
  );
}

type ReservationStatus = "to_pay" | "reserved" | "to_evaluate" | "completed";

interface ReservationCardData {
  reservation: {
    id: number | string;
    announcementId: number | string;
    slotIndex: number;
    userId: number;
    date?: string;
    status?: ReservationStatus;
    createdAt?: string;
    updatedAt?: string;
  };
  announcement: AnnouncementCardData;
  providerName?: string;
}

// Helper function to convert status to French
function getStatusLabel(status?: ReservationStatus): string {
  const statusMap: Record<ReservationStatus, string> = {
    to_pay: "A régler",
    reserved: "Réservé",
    to_evaluate: "A évaluer",
    completed: "Terminé",
  };
  return status ? statusMap[status] : "A régler";
}

function ReservationCard({ data }: { data: ReservationCardData }) {
  const { reservation, announcement, providerName } = data;

  const handleClick = () => {
    const status = reservation.status || "to_pay";
    
    // Actions différentes selon le statut de la réservation
    switch (status) {
      case "to_pay":
        // Action pour "A régler" : rediriger vers la page de paiement
        // TODO: Implémenter la redirection vers la page de paiement
        console.log("Redirection vers paiement pour réservation:", reservation.id);
        break;
      case "reserved":
        // Action pour "Réservé" : afficher les détails de la réservation
        // TODO: Implémenter l'affichage des détails de la réservation
        console.log("Afficher détails réservation:", reservation.id);
        break;
      case "to_evaluate":
        // Action pour "A évaluer" : ouvrir le formulaire d'évaluation
        // TODO: Implémenter l'ouverture du formulaire d'évaluation
        console.log("Ouvrir formulaire d'évaluation pour réservation:", reservation.id);
        break;
      case "completed":
        // Action pour "Terminé" : afficher l'historique
        // TODO: Implémenter l'affichage de l'historique
        console.log("Afficher historique réservation:", reservation.id);
        break;
      default:
        console.log("Action non définie pour le statut:", status);
    }
  };

  // Get slot start time
  const slot = announcement.slots?.[reservation.slotIndex];
  const startTime = slot?.start ? dayjs(slot.start).format("HH:mm") : "--:--";

  // Get status date (updatedAt or createdAt) - format: "28 sept."
  const statusDate = reservation.updatedAt || reservation.createdAt;
  const formattedDate = statusDate 
    ? dayjs(statusDate).locale("fr").format("D MMM")
    : "";

  // Determine status badge style
  const getStatusClass = (status?: ReservationStatus) => {
    switch (status) {
      case "to_evaluate":
        return "statusToEvaluate";
      case "reserved":
        return "statusReserved";
      case "to_pay":
        return "statusToPay";
      case "completed":
        return "statusFinished";
      default:
        return "statusToPay"; // Default to "to_pay"
    }
  };

  const status = reservation.status || "to_pay";
  const statusLabel = getStatusLabel(status);
  const isToEvaluate = status === "to_evaluate";

  return (
    <div
      className={`reservationCard ${isToEvaluate ? "reservationCardOrange" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="reservationCardContent">
        <div
          className="reservationCardImage"
          style={{
            backgroundImage: announcement.photo
              ? `url("${announcement.photo}")`
              : `url('/photo1.svg')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="reservationCardDetails">
          <div className="reservationCardHeader">
            <h3 className="reservationCardTitle">{announcement.title}</h3>
            {formattedDate && <span className="reservationDate">{formattedDate}</span>}
          </div>
          <div className="reservationCardFooter">
            <div className="reservationCardTimeName">
              <AccessTimeIcon sx={{ fontSize: "16px", color: "#545454" }} />
              <span>{startTime} - {providerName || "Prestataire"}</span>
            </div>
            <span className={`reservationStatusBadge ${getStatusClass(status)}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyAnnouncementsContent() {
  const { currentUserId, setHeaderTitle, currentPage } = useContent();
  // Determine which view to show based on localStorage (set by PrivateMenu)
  const getViewType = (): TabType => {
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("proximis_myAnnouncements_view");
      if (savedView && (savedView === "my_announcements" || savedView === "reservations" || savedView === "favorites")) {
        return savedView as TabType;
      }
    }
    return "my_announcements";
  };
  const [viewType, setViewType] = useState<TabType>(getViewType);
  
  // Sync viewType with localStorage changes (when navigating from profile menu or bottom nav)
  useEffect(() => {
    const currentView = getViewType();
    setViewType(currentView);
  }, [currentPage]);
  
  const [reservations, setReservations] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Set header title based on view type
  useEffect(() => {
    const titles = {
      my_announcements: "Mes annonces",
      reservations: "Réservations",
      favorites: "Favoris",
    };
    setHeaderTitle && setHeaderTitle(titles[viewType]);
    return () => {
      setHeaderTitle && setHeaderTitle(null);
    };
  }, [setHeaderTitle, viewType]);

  // Load reservations
  useEffect(() => {
    if (!currentUserId) {
      setReservations([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ userId: String(currentUserId) });
        const res = await fetch("/api/reservations?" + params.toString());
        const json = await res.json();
        if (!mounted) return;
        if (res.ok && json?.reservations) {
          setReservations(json.reservations || []);
        } else if (res.ok && Array.isArray(json)) {
          setReservations(json);
        } else {
          setReservations([]);
        }
      } catch (e) {
        console.error("Could not load reservations", e);
        if (mounted) setReservations([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentUserId]);

  // Get user's announcements
  const myAnnouncements = useMemo(() => {
    if (!currentUserId) return [];
    const announcementsList = Array.isArray(announcementsData) ? announcementsData : [];
    return announcementsList.filter(
      (a: any) => String(a.userId) === String(currentUserId)
    ) as AnnouncementCardData[];
  }, [currentUserId]);

  // Get reservations with announcement data and provider names
  const reservationsWithAnnouncements = useMemo(() => {
    if (!reservations || reservations.length === 0) return [];
    const announcementsList = Array.isArray(announcementsData) ? announcementsData : [];
    const users = (usersData as any).users ?? [];
    
    return reservations.map((r: any) => {
      const ann = announcementsList.find(
        (a: any) => String(a.id) === String(r.announcementId)
      ) as any;
      
      // Get provider name (prénom + première lettre du nom)
      const provider = ann ? users.find((u: any) => String(u.id) === String(ann.userId)) : null;
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
      
      // Ensure reservation has status (default to "to_pay" if not set)
      const reservationWithStatus = {
        ...r,
        status: (r.status || "to_pay") as ReservationStatus,
        updatedAt: r.updatedAt || r.createdAt,
      };
      
      return {
        reservation: reservationWithStatus,
        announcement: ann || { id: r.announcementId, title: "Annonce supprimée", slots: [] },
        providerName,
      } as ReservationCardData;
    }).sort((a, b) => {
      // Sort: "to_evaluate" first (orange background), then others
      if (a.reservation.status === "to_evaluate" && b.reservation.status !== "to_evaluate") return -1;
      if (a.reservation.status !== "to_evaluate" && b.reservation.status === "to_evaluate") return 1;
      // Then sort by date (most recent first)
      const dateA = a.reservation.updatedAt || a.reservation.createdAt || "";
      const dateB = b.reservation.updatedAt || b.reservation.createdAt || "";
      return dateB.localeCompare(dateA);
    });
  }, [reservations]);

  // Get favorites (from API)
  const [favorites, setFavorites] = useState<AnnouncementCardData[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  useEffect(() => {
    if (!currentUserId || viewType !== "favorites") {
      setFavorites([]);
      return;
    }
    
    const loadFavorites = async () => {
      setLoadingFavorites(true);
      try {
        const params = new URLSearchParams({
          userId: String(currentUserId),
        });
        const res = await fetch(`/api/favorites?${params.toString()}`);
        const data = await res.json();
        if (res.ok && data.favorites) {
          const favoritesIds = data.favorites.map((f: any) => f.announcementId);
          const announcementsList = Array.isArray(announcementsData) ? announcementsData : [];
          const favoritesAnnouncements = announcementsList
            .filter((a: any) =>
              favoritesIds.some((favId: number | string) => String(favId) === String(a.id))
            ) as AnnouncementCardData[];
          setFavorites(favoritesAnnouncements);
        } else {
          setFavorites([]);
        }
      } catch (e) {
        console.error("Error loading favorites", e);
        setFavorites([]);
      } finally {
        setLoadingFavorites(false);
      }
    };
    
    loadFavorites();
  }, [currentUserId, viewType]);

  if (!currentUserId) {
    return (
      <div style={{ padding: 16, textAlign: "center" }}>
        <p>Connectez-vous pour voir vos annonces</p>
      </div>
    );
  }

  return (
    <div className="myAnnouncementsContainer">
      {/* Content */}
      <div className={`myAnnouncementsContent ${viewType === "reservations" ? "noHorizontalPadding" : ""}`}>
        {loading && viewType === "reservations" ? (
          <div style={{ padding: 16, textAlign: "center" }}>Chargement...</div>
        ) : (
          <>
            {viewType === "my_announcements" && (
              <>
                {myAnnouncements.length === 0 ? (
                  <div className="emptyState">
                    <p>Vous n'avez pas encore publié d'annonce.</p>
                  </div>
                ) : (
                  <div className="announcementsList">
                    {myAnnouncements.map((ann) => (
                      <MyAnnouncementCard key={ann.id} announcement={ann} />
                    ))}
                  </div>
                )}
              </>
            )}

            {viewType === "reservations" && (
              <>
                {reservationsWithAnnouncements.length === 0 ? (
                  <div className="emptyState">
                    <p>Vous n'avez aucune réservation.</p>
                  </div>
                ) : (
                  <div className="reservationsList">
                    {reservationsWithAnnouncements.map((data) => (
                      <ReservationCard key={data.reservation.id} data={data} />
                    ))}
                  </div>
                )}
              </>
            )}

            {viewType === "favorites" && (
              <>
                {loadingFavorites ? (
                  <div className="emptyState">
                    <p>Chargement des favoris...</p>
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="emptyState">
                    <p>Vous n'avez aucun favori.</p>
                  </div>
                ) : (
                  <div className="announcementsList">
                    {favorites.map((ann) => (
                      <MyAnnouncementCard key={ann.id} announcement={ann} showFavoriteIcon={true} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
