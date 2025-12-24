"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useContent } from "../ContentContext";
import Star from "@mui/icons-material/Star";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import LocationOn from "@mui/icons-material/LocationOn";
import { getDayLabels } from "@/lib/daylabel";
import { fetchWithAuth } from "../lib/auth";
import { useCachedData } from "../lib/useCachedData";
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
  createdAt?: string;
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

  const rating = averageRating > 0 ? averageRating.toFixed(1) : '-';

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
          <div className="reservationCardFirstLine">
            {formattedDate && <span className="reservationDate">{formattedDate}</span>}
            <h3 className="reservationCardTitle">{announcement.title}</h3>
          </div>
          <div className="reservationCardSecondLine">
            <span className="reservationCardTimeName">{startTime} - {providerName || "Prestataire"}</span>
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
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Helper function to transform announcement data to the expected format
  const transformAnnouncement = (a: any): AnnouncementCardData => {
    // Handle both MongoDB format and /api/annonces format
    const id = a.id || a.idAnnonce;
    const title = a.title || a.nomAnnonce;
    const category = a.category || a.typeAnnonce;
    const scope = a.scope || a.lieuAnnonce;
    const price = a.price || a.prixAnnonce;
    const description = a.description || a.descAnnonce;
    const userId = a.userId || a.userCreateur?.idUser || a.userCreateur;
    const createdAt = a.createdAt || a.datePublication;
    const photo = a.photo || a.photos?.[0]?.urlPhoto;
    const isAvailable = a.isAvailable !== undefined ? a.isAvailable : true;
    
    // Transform slots
    const slots = (a.slots || a.creneaux || []).map((c: any) => {
      // Extract day of week from dateDebut (1 = Monday, 7 = Sunday)
      // dayjs uses 0 = Sunday, so we need to convert: 0 -> 7, 1-6 -> 1-6
      const dayOfWeek = (c.day != null) ? c.day : (c.dateDebut ? (() => {
        const date = dayjs(c.dateDebut);
        const jsDay = date.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        return jsDay === 0 ? 7 : jsDay; // Convert to 1 = Monday, 7 = Sunday
      })() : undefined);
      return {
        day: dayOfWeek,
        start: c.start || c.dateDebut,
        end: c.end || c.dateFin,
        estReserve: c.estReserve,
      };
    }).filter((c: any) => c.day != null && c.day >= 1 && c.day <= 7 && !c.estReserve);

    return {
      id,
      title,
      category,
      scope,
      price,
      description,
      userId,
      createdAt,
      photo,
      slots,
      isAvailable,
    };
  };

  // Load announcements with cache - only when needed for specific views
  const { data: myAnnouncementsData, loading: loadingMyAnnouncements } = useCachedData({
    cacheKey: 'my_announcements_list',
    fetchFn: async () => {
      const res = await fetchWithAuth('/api/announcements/my-announcements');
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data?.announcements) {
          return data.announcements.map(transformAnnouncement);
        }
      }
      return [];
    },
    enabled: currentUserId != null && viewType === "my_announcements",
    userId: currentUserId,
    dependencies: [viewType],
  });

  useEffect(() => {
    if (viewType === "my_announcements") {
      // Ensure loading state shows skeletons while data is being fetched
      if (myAnnouncementsData === null) {
        setLoadingAnnouncements(true);
      }
      if (myAnnouncementsData !== null) {
        setAnnouncements(myAnnouncementsData);
      }
      // Always update loading state, and if we don't have data yet, show loading
      setLoadingAnnouncements(loadingMyAnnouncements || myAnnouncementsData === null);
    } else {
      setAnnouncements([]);
      setLoadingAnnouncements(false);
    }
  }, [myAnnouncementsData, loadingMyAnnouncements, viewType]);

  // Load reservations with cache (only when on reservations view)
  // The endpoint now returns reservations with announcement data included
  const { data: reservationsData, loading: loadingReservations } = useCachedData({
    cacheKey: 'my_reservations_list',
    fetchFn: async () => {
      const res = await fetchWithAuth("/api/reservations/my-reservations");
      const json = await res.json();
      if (res.ok && json?.ok && json?.reservations) {
        return json.reservations || [];
      }
      return [];
    },
    enabled: currentUserId != null && viewType === "reservations",
    userId: currentUserId,
    dependencies: [viewType],
  });

  useEffect(() => {
    if (viewType === "reservations") {
      if (reservationsData !== null) {
        setReservations(reservationsData);
        
        // Extract announcements from reservations and transform them
        const announcementsData = reservationsData
          .map((r: any) => r.announcement)
          .filter((a: any) => a != null)
          .map(transformAnnouncement);
        setAnnouncements(announcementsData);
      }
      setLoading(loadingReservations);
      setLoadingAnnouncements(loadingReservations);
    } else {
      setReservations([]);
      setAnnouncements([]);
      setLoading(false);
      setLoadingAnnouncements(false);
    }
  }, [reservationsData, loadingReservations, viewType]);

  // Load users (only needed for reservations view to get provider names)
  useEffect(() => {
    if (!currentUserId || viewType !== "reservations") {
      setUsers([]);
      return;
    }

    let cancelled = false;
    const loadUsers = async () => {
      try {
        const usersRes = await fetchWithAuth('/api/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData?.users && Array.isArray(usersData.users)) {
            if (!cancelled) setUsers(usersData.users);
          }
        }
      } catch (error) {
        console.error('Error loading users', error);
      }
    };

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, viewType]);


  // Get user's announcements (already filtered by endpoint, but keep for compatibility)
  const myAnnouncements = useMemo(() => {
    if (!currentUserId || viewType !== "my_announcements") return [];
    return announcements as AnnouncementCardData[];
  }, [currentUserId, announcements, viewType]);

  // Get reservations with announcement data and provider names
  // Announcements are now included in the reservation data from the API
  const reservationsWithAnnouncements = useMemo(() => {
    if (!reservations || reservations.length === 0) return [];
    
    return reservations.map((r: any) => {
      // Announcement is already included in the reservation object from the API
      const annRaw = r.announcement;
      const ann = annRaw ? transformAnnouncement(annRaw) : null;
      
      // Get provider name (prénom + première lettre du nom)
      // The provider is the owner of the announcement (ann.userId or ann.userCreateur)
      const providerUserId = ann?.userId || annRaw?.userId || annRaw?.userCreateur?.idUser || annRaw?.userCreateur;
      const provider = providerUserId ? users.find((u: any) => String(u.id) === String(providerUserId)) : null;
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
  }, [reservations, users]);

  // Load favorites with cache
  const { data: favoritesData, loading: loadingFavorites } = useCachedData({
    cacheKey: 'my_favorites_list',
    fetchFn: async () => {
      const params = new URLSearchParams({
        userId: String(currentUserId),
      });
      const res = await fetchWithAuth(`/api/favorites?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data?.favorites && Array.isArray(data.favorites)) {
        const favoritesIds = data.favorites.map((f: any) => f.announcementId);
        
        // Load each favorite announcement
        const announcementPromises = favoritesIds.map(async (announcementId: any) => {
          try {
            const annRes = await fetchWithAuth(`/api/announcements/${announcementId}`);
            if (annRes.ok) {
              const annData = await annRes.json();
              if (annData?.ok && annData?.announcement) {
                return transformAnnouncement(annData.announcement);
              }
            }
            return null;
          } catch (error) {
            console.error(`Error loading favorite announcement ${announcementId}`, error);
            return null;
          }
        });

        const loadedFavorites = await Promise.all(announcementPromises);
        return loadedFavorites.filter((a): a is AnnouncementCardData => a !== null);
      }
      return [];
    },
    enabled: currentUserId != null && viewType === "favorites",
    userId: currentUserId,
    dependencies: [viewType],
  });

  const [favorites, setFavorites] = useState<AnnouncementCardData[]>([]);

  useEffect(() => {
    if (viewType === "favorites") {
      if (favoritesData !== null) {
        setFavorites(favoritesData);
      }
      setLoadingAnnouncements(loadingFavorites);
    } else {
      setFavorites([]);
      setLoadingAnnouncements(false);
    }
  }, [favoritesData, loadingFavorites, viewType]);

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
            ): (
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
