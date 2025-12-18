"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useContent } from "../ContentContext";
import Star from "@mui/icons-material/Star";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import LocationOn from "@mui/icons-material/LocationOn";
import { getDayLabels } from "@/lib/daylabel";
import { fetchWithAuth } from "../lib/auth";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import updateLocale from "dayjs/plugin/updateLocale";
import "./index.css";
import { SkeletonAnnouncementCard, SkeletonReservationCard } from "../components/Skeleton";

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
  userId?: number | string;
  scope?: number;
}

function MyAnnouncementCard({ announcement, showFavoriteIcon = false }: { announcement: AnnouncementCardData; showFavoriteIcon?: boolean }) {
  const { setCurrentPage, setSelectedAnnouncementId } = useContent();
  const dayLabels = getDayLabels(announcement.slots);
  const [averageRating, setAverageRating] = useState<number>(0);

  // Load average rating from evaluations
  useEffect(() => {
    if (!announcement.id) {
      setAverageRating(0);
      return;
    }

    let cancelled = false;

    const loadRating = async () => {
      try {
        const params = new URLSearchParams({
          announcementId: String(announcement.id),
        });
        const res = await fetchWithAuth(`/api/evaluations?${params.toString()}`);
        const data = await res.json();

        if (cancelled) return;

        if (res.ok && data?.evaluations && Array.isArray(data.evaluations)) {
          const evaluations = data.evaluations;
          
          if (evaluations.length > 0) {
            const avg = evaluations.reduce((sum: number, evaluation: any) => {
              const rating = typeof evaluation.rating === 'number' ? evaluation.rating : 0;
              return sum + rating;
            }, 0) / evaluations.length;
            if (!cancelled) {
              setAverageRating(avg);
            }
          } else {
            if (!cancelled) {
              setAverageRating(0);
            }
          }
        } else {
          if (!cancelled) {
            setAverageRating(0);
          }
        }
      } catch (error) {
        console.error('Error loading rating for announcement', announcement.id, error);
        if (!cancelled) {
          setAverageRating(0);
        }
      }
    };

    loadRating();

    return () => {
      cancelled = true;
    };
  }, [announcement.id]);

  const rating = averageRating > 0 ? averageRating.toFixed(1) : '0';

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <LocationOn sx={{ color: "#8c8c8c", fontSize: "18px" }} />
                    <span className="T6" style={{ color: "#8c8c8c" }}>
                      {announcement.scope ? `à ${announcement.scope}km` : "—"}
                    </span>
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
  const { 
    setCurrentPage, 
    setSelectedReservationId, 
    setSelectedAnnouncementId,
    setSelectedConversationId,
    currentUserId 
  } = useContent();

  const handleClick = async () => {
    const status = reservation.status || "to_pay";
    
    // Actions différentes selon le statut de la réservation
    switch (status) {
      case "to_pay":
        // Action pour "A régler" : rediriger vers la page de paiement
        if (setSelectedReservationId && setCurrentPage) {
          setSelectedReservationId(reservation.id);
          setCurrentPage("reservation");
        }
        break;
      case "reserved":
        // Action pour "Réservé" : navigation vers la conversation correspondante
        if (!currentUserId || !announcement || !setCurrentPage) return;
        
        try {
          // Construct conversation ID: conv_{currentUserId}_{announcement.userId}_{announcement.id}
          const conversationId = `conv_${currentUserId}_${announcement.userId}_${announcement.id}`;
          
          // Check if conversation exists
          const checkRes = await fetchWithAuth(`/api/conversations?conversationId=${encodeURIComponent(conversationId)}`);
          const checkData = await checkRes.json();
          
          if (checkRes.ok && checkData.conversation) {
            // Conversation exists, navigate to it
            if (setSelectedConversationId) {
              setSelectedConversationId(conversationId);
            }
            setCurrentPage('message_chat', ['home', 'messages']);
          } else {
            // Create new conversation if it doesn't exist
            const createRes = await fetchWithAuth('/api/conversations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fromUserId: currentUserId,
                toUserId: announcement.userId,
                announcementId: announcement.id,
                initialMessage: `Bonjour, j'ai une réservation pour "${announcement.title}".`,
              }),
            });
            
            const createData = await createRes.json();
            
            if (createRes.ok && createData?.ok && createData?.conversation) {
              if (setSelectedConversationId) {
                setSelectedConversationId(createData.conversation.id);
              }
              setCurrentPage('message_chat', ['home', 'messages']);
            }
          }
        } catch (error) {
          console.error('Error handling reserved reservation click:', error);
        }
        break;
      case "to_evaluate":
        // Action pour "A évaluer" : ouvrir le formulaire d'évaluation
        if (setSelectedReservationId && setCurrentPage) {
          setSelectedReservationId(reservation.id);
          setCurrentPage("evaluate");
        }
        break;
      case "completed":
        // Action pour "Terminé" : navigation vers consultation de l'annonce
        if (setSelectedAnnouncementId && setCurrentPage) {
          setSelectedAnnouncementId(announcement.id);
          setCurrentPage("announce_details");
        }
        break;
      default:
        console.log("Action non définie pour le statut:", status);
    }
  };

  // Get slot start time
  const slot = announcement.slots?.[reservation.slotIndex];
  const startTime = slot?.start ? dayjs(slot.start).format("HH:mm") : "--:--";

  // Get scheduled date (reservation.date) - format: "28 sept."
  const scheduledDate = reservation.date;
  const formattedDate = scheduledDate 
    ? dayjs(scheduledDate).locale("fr").format("D MMM")
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
      className={`reservationCard ${isToEvaluate ? "reservationCardOrange" : status === "reserved" ? "reservationCardGreen" : ""}`}
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
          <h3 className="reservationCardTitle">{announcement.title}</h3>
          <div className="reservationCardTimeName">
            <span>{startTime} - {providerName || "Prestataire"}</span>
          </div>
          <div className="reservationCardDateBadge">
            {formattedDate && <span className="reservationDate">{formattedDate}</span>}
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
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

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

  // Load announcements and users from MongoDB
  // Only load if needed (for my_announcements, reservations, or favorites views)
  useEffect(() => {
    if (!currentUserId || (viewType !== "my_announcements" && viewType !== "reservations" && viewType !== "favorites")) {
      setAnnouncements([]);
      setUsers([]);
      return;
    }

    let cancelled = false;
    setLoadingAnnouncements(true);

    const loadData = async () => {
      try {
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
              slots: a.creneaux?.map((c: any) => {
                // Extract day of week from dateDebut (1 = Monday, 7 = Sunday)
                // dayjs uses 0 = Sunday, so we need to convert: 0 -> 7, 1-6 -> 1-6
                const dayOfWeek = c.dateDebut ? (() => {
                  const date = dayjs(c.dateDebut);
                  const jsDay = date.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                  return jsDay === 0 ? 7 : jsDay; // Convert to 1 = Monday, 7 = Sunday
                })() : undefined;
                return {
                  day: dayOfWeek,
                  start: c.dateDebut,
                  end: c.dateFin,
                  estReserve: c.estReserve,
                };
              }).filter((c: any) => c.day != null && c.day >= 1 && c.day <= 7 && !c.estReserve) || [],
            }));
            if (!cancelled) setAnnouncements(transformed);
          }
        }

        // Load users (only needed for reservations view to get provider names)
        if (viewType === "reservations") {
          const usersRes = await fetchWithAuth('/api/users');
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            if (usersData?.users && Array.isArray(usersData.users)) {
              if (!cancelled) setUsers(usersData.users);
            }
          }
        }
      } catch (error) {
        console.error('Error loading data', error);
      } finally {
        if (!cancelled) {
          setLoadingAnnouncements(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, viewType]);

  // Load reservations (only when on reservations view)
  useEffect(() => {
    if (!currentUserId || viewType !== "reservations") {
      setReservations([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ userId: String(currentUserId) });
        const res = await fetchWithAuth("/api/reservations?" + params.toString());
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
  }, [currentUserId, viewType]);

  // Get user's announcements
  const myAnnouncements = useMemo(() => {
    if (!currentUserId) return [];
    return announcements.filter(
      (a: any) => String(a.userId) === String(currentUserId)
    ) as AnnouncementCardData[];
  }, [currentUserId, announcements]);

  // Get reservations with announcement data and provider names
  const reservationsWithAnnouncements = useMemo(() => {
    if (!reservations || reservations.length === 0) return [];
    
    return reservations.map((r: any) => {
      const ann = announcements.find(
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
  }, [reservations, announcements, users]);

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
        const res = await fetchWithAuth(`/api/favorites?${params.toString()}`);
        const data = await res.json();
        if (res.ok && data.favorites) {
          const favoritesIds = data.favorites.map((f: any) => f.announcementId);
          const favoritesAnnouncements = announcements
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
  }, [currentUserId, viewType, announcements]);

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
        {viewType === "my_announcements" && (
          <>
            {loadingAnnouncements ? (
              <div className="announcementsList" style={{ padding: '16px' }}>
                <SkeletonAnnouncementCard />
                <SkeletonAnnouncementCard />
                <SkeletonAnnouncementCard />
              </div>
            ) : myAnnouncements.length === 0 ? (
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
            {loading || loadingAnnouncements ? (
              <div className="reservationsList">
                <SkeletonReservationCard />
                <SkeletonReservationCard />
                <SkeletonReservationCard />
              </div>
            ) : reservationsWithAnnouncements.length === 0 ? (
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
            {loadingFavorites || loadingAnnouncements ? (
              <div className="announcementsList" style={{ padding: '16px' }}>
                <SkeletonAnnouncementCard />
                <SkeletonAnnouncementCard />
                <SkeletonAnnouncementCard />
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
      </div>
    </div>
  );
}
