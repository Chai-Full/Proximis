"use client";
import React, { useEffect, useState } from 'react';
import { useContent } from '../ContentContext';
import { ChatBubbleOutlineOutlined, CheckBoxOutlined, FmdGoodOutlined, ModeOutlined, FavoriteBorder, Favorite } from '@mui/icons-material';
import Radio from '@mui/material/Radio';
import { getDayLabelById } from '@/lib/daylabel';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import { Button, CircularProgress } from '@mui/material';
import Notification from '../components/Notification';
import Star from '@mui/icons-material/Star';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { fetchWithAuth } from '../lib/auth';
import { SkeletonProfile } from '../components/Skeleton';

// Initialize dayjs plugins and locale
dayjs.extend(relativeTime);
dayjs.locale('fr');

export default function AnnounceDetails() {
  const { selectedAnnouncementId, setHeaderTitle, setSelectedProfileId, setCurrentPage, currentUserId, setSelectedReservationId } = useContent();
  const [announcement, setAnnouncement] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<any>(dayjs());
  const [isChecking, setIsChecking] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success'|'warning'|'error'|'info' }>({ open: false, message: '', severity: 'info' });
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<boolean>(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewsCount, setReviewsCount] = useState<number>(0);

  // Load announcement and user data from MongoDB
  useEffect(() => {
    if (!selectedAnnouncementId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const loadData = async () => {
      try {
        // Load announcement
        const announcementRes = await fetchWithAuth(`/api/announcements/${selectedAnnouncementId}`);
        if (announcementRes.ok) {
          const announcementData = await announcementRes.json();
          if (announcementData?.ok && announcementData?.announcement) {
            const ann = announcementData.announcement;
            
            // Transform slots to ensure day property is present and valid
            // Keep it simple: if day is already valid (1-7), preserve it; otherwise extract from start date
            const transformedSlots = (ann.slots || []).map((slot: any) => {
              // Check if slot already has a valid day (1-7) as number
              if (typeof slot.day === 'number' && slot.day >= 1 && slot.day <= 7) {
                // Preserve the slot exactly as is, including day: 7 for Sunday
                return { ...slot, day: slot.day };
              }
              
              // If day is a string, convert it to number
              if (typeof slot.day === 'string') {
                const dayNum = parseInt(slot.day, 10);
                if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 7) {
                  return { ...slot, day: dayNum };
                }
              }
              
              // If slot.day is missing or invalid, try to extract from start date
              if (slot.start) {
                try {
                  const date = dayjs(slot.start);
                  if (date.isValid()) {
                    const jsDay = date.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                    const day = jsDay === 0 ? 7 : jsDay; // Convert to 1 = Monday, 7 = Sunday
                    return { ...slot, day };
                  }
                } catch (e) {
                  console.error('Error parsing slot start date:', e, slot);
                }
              }
              
              // If we can't determine the day, mark as invalid (will be filtered)
              return { ...slot, day: 0 };
            }).filter((slot: any) => {
              // Filter out slots without valid day (1-7)
              const day = typeof slot.day === 'number' ? slot.day : (typeof slot.day === 'string' ? parseInt(slot.day, 10) : 0);
              return !isNaN(day) && day >= 1 && day <= 7;
            });
            
            const transformedAnnouncement = {
              ...ann,
              slots: transformedSlots,
            };
            
            if (!cancelled) {
              setAnnouncement(transformedAnnouncement);
              
              // Load author user
              if (ann.userId) {
                const usersRes = await fetchWithAuth('/api/users');
                if (usersRes.ok) {
                  const usersData = await usersRes.json();
                  if (usersData?.users && Array.isArray(usersData.users)) {
                    const annUserId = typeof ann.userId === 'number' ? ann.userId : Number(ann.userId);
                    const foundAuthor = usersData.users.find((u: any) => Number(u.id) === annUserId);
                    if (!cancelled) {
                      setAuthor(foundAuthor || null);
                    }
                  }
                }
              }
            }
          } else {
            if (!cancelled) {
              setAnnouncement(null);
            }
          }
        } else {
          if (!cancelled) {
            setAnnouncement(null);
          }
        }
      } catch (error) {
        console.error('Error loading announcement:', error);
        if (!cancelled) {
          setAnnouncement(null);
        }
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
  }, [selectedAnnouncementId]);

  // set header title to announcement title while on this page
  useEffect(() => {
    if (announcement && setHeaderTitle) {
      setHeaderTitle(String(announcement.title ?? 'Annonce'));
      return () => setHeaderTitle && setHeaderTitle(null);
    }
    // ensure headerTitle cleared if announcement missing
    setHeaderTitle && setHeaderTitle(null);
    return () => {};
  }, [announcement, setHeaderTitle]);

  useEffect(() => {
    const checkFavorite = async () => {
      if (typeof window === 'undefined' || !announcement || !currentUserId) {
        setIsFavorite(false);
        return;
      }
      try {
        const params = new URLSearchParams({
          userId: String(currentUserId),
          announcementId: String(announcement.id),
        });
        const res = await fetchWithAuth(`/api/favorites?${params.toString()}`);
        const data = await res.json();
        if (res.ok && data.exists) {
          setIsFavorite(true);
        } else {
          setIsFavorite(false);
        }
      } catch (e) {
        console.error('Error checking favorite', e);
        setIsFavorite(false);
      }
    };
    checkFavorite();
  }, [announcement, currentUserId]);

  // Load evaluations to calculate average rating and count
  useEffect(() => {
    if (!announcement) return;

    const loadEvaluations = async () => {
      try {
        const params = new URLSearchParams({
          announcementId: String(announcement.id),
        });
        const res = await fetchWithAuth(`/api/evaluations?${params.toString()}`);
        const data = await res.json();

        if (res.ok && data?.evaluations && Array.isArray(data.evaluations)) {
          const evaluations = data.evaluations;
          setReviewsCount(evaluations.length);
          
          if (evaluations.length > 0) {
            const avg = evaluations.reduce((sum: number, evaluation: any) => sum + evaluation.rating, 0) / evaluations.length;
            setAverageRating(avg);
          } else {
            setAverageRating(null);
          }
        } else {
          setReviewsCount(0);
          setAverageRating(null);
        }
      } catch (error) {
        console.error('Error loading evaluations:', error);
        setReviewsCount(0);
        setAverageRating(null);
      }
    };

    loadEvaluations();
  }, [announcement]);

  const toggleFavorite = async () => {
    if (!announcement || !currentUserId || isTogglingFavorite) return;
    
    setIsTogglingFavorite(true);
    try {
      if (isFavorite) {
        // Remove from favorites
        const params = new URLSearchParams({
          userId: String(currentUserId),
          announcementId: String(announcement.id),
        });
        const res = await fetchWithAuth(`/api/favorites?${params.toString()}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setIsFavorite(false);
          setNotification({ open: true, message: 'Retiré des favoris', severity: 'info' });
        } else {
          setNotification({ open: true, message: 'Erreur lors de la suppression', severity: 'error' });
        }
      } else {
        // Add to favorites
        const res = await fetchWithAuth('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            announcementId: announcement.id,
          }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setIsFavorite(true);
          setNotification({ open: true, message: 'Ajouté aux favoris', severity: 'success' });
        } else if (res.status === 409) {
          // Already exists, just update state
          setIsFavorite(true);
        } else {
          setNotification({ open: true, message: 'Erreur lors de l\'ajout', severity: 'error' });
        }
      }
    } catch (e) {
      console.error('Error toggling favorite', e);
      setNotification({ open: true, message: 'Erreur lors de la modification des favoris', severity: 'error' });
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Early returns after all hooks
  if (loading) {
    return <SkeletonProfile />;
  }

  if (!announcement) {
    return (
      <div style={{ padding: 16 }}>
          <h2>Annonce introuvable</h2>
          <p>ID: {String(selectedAnnouncementId)}</p>
        </div>
    );
  }

  // Check if user is the author
  const isAuthor = currentUserId != null && announcement && Number(currentUserId) === Number(announcement.userId);

  function formatTime(iso?: string | null) {
    if (!iso) return '--:--';
    try {
      return dayjs(iso).format('HH:mm');
    } catch (e) {
      return String(iso);
    }
  }

  return (
    <>
    <div className='announceDEtails'>
      <div className='announceDEtailsHeader'
        style={{
          backgroundImage: announcement.photo ? `url("${String(announcement.photo)}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
        }}
      >
        <div className='actionButtons'>
          {!isAuthor && (
            <div 
              style={{ backgroundColor: "#47474772", borderRadius: 7, display: 'flex', alignItems: 'center', height: 40, width: 40, justifyContent: 'center', cursor: 'pointer'}}
              onClick={toggleFavorite}
            >
              {isFavorite ? (
                <Favorite sx={{ color: "#ff9202", fontSize: 32, cursor: 'pointer' }} />
              ) : (
                <FavoriteBorder sx={{ color: "#FFFFFF", fontSize: 32, cursor: 'pointer' }} />
              )}
            </div>
          )}
          {isAuthor ? (
            <button
              style={{ backgroundColor: "#47474772", borderRadius: 7, display: 'flex', alignItems: 'center', height: 40, width: 40, justifyContent: 'center', cursor: 'pointer'}}
              onClick={() => {
                console.log("click");
                console.log("currentUserId : ", currentUserId);
                console.log("announcement.userId : ", announcement.userId);
                console.log("currentUserId === announcement.userId : ", currentUserId === announcement.userId);
                setCurrentPage && setCurrentPage("announce_edit");
              }}
            >
              <ModeOutlined sx={{ color: "#FFFFFF", fontSize: 32, cursor: 'pointer' }} />
            </button>
          ) : null}
        </div>
        <div className='publicationTime'>
            <span className='T6'>
              Publiée {announcement?.createdAt ? dayjs(announcement.createdAt).fromNow() : 'il y a peu de temps'}
            </span>
          </div>
      </div>
      <div className='announceDEtailsContent'>
        <span className='T6 announcementStatus' style={{ textAlign: "right"}}>
          Disponible
        </span>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <div
            className='TSemibold'
            style={{display: "flex", columnGap: 8, alignItems: "center", color: '#545454', cursor: 'pointer'}}
            onClick={() => {
              const authorId = author ? Number(author.id) : null;
              setSelectedProfileId && setSelectedProfileId(authorId);
              setCurrentPage && setCurrentPage('profil');
            }}
          >
            <div className='announceDEtailsNameLogo'>
              {String(((author?.prenom ?? author?.nom) || 'U').charAt(0) || 'U')}
            </div>
            <span className='T6'>
              Par {author ? `${author.prenom} ${author.nom}` : 'Utilisateur'}
            </span>
          </div>
          <span className='T4 TMedium announcementPrice'>
            {announcement.price ? `${announcement.price} € / h` : 'Prix non renseigné'}
          </span>
        </div>
        <div className='announceScope'>
          <FmdGoodOutlined sx={{ color: "#8c8c8c"}}/>
          <span className='T6' style={{ color: "#8c8c8c"}}>à {announcement.scope}km</span>

        </div>
        <div className='announcementDescription'>
          <span className='T4'>
            Description
          </span>
          <div className='annoucementCategory'>
            {announcement.category}
          </div>
          <p className='T6'>
            {announcement.description}
          </p>
        </div>
        <div className='announcementAvailabilities'>
          <span className='T4'>
            Disponibilité
          </span>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar value={selectedDate} onChange={(d) => setSelectedDate(d)} minDate={dayjs()} />
          </LocalizationProvider>
          <div className='announcementAvailabilityOptions'>
            {(!announcement.slots || announcement.slots.length === 0) && <div><span className='T6'>Aucun créneau disponible</span></div>}
            {announcement.slots && announcement.slots.length > 0 && announcement.slots.map((slot:any, index:number) => (
                <div className='announcementAvailabilityOptionsItem' key={index}>
                  <div className='announcementAvailabilityOption'>
                    <span className='T6'>{getDayLabelById(slot.day)}</span>
                  </div>
                    <Radio
                      checked={String(selectedSlot) === String(index)}
                      onChange={() => setSelectedSlot(String(index))}
                      inputProps={{
                        'aria-label': `slot-${index}`,
                      }}
                    />
                  <div>
                    <span className='T6' style={{color: "#545454"}}>{formatTime(slot.start)} - {formatTime(slot.end)}</span>
                  </div>

                </div>
            ))}
          </div>
        </div>
        <div className='actionSection'>
          <Button 
            variant="outlined"
            fullWidth
            sx={{
              textTransform: "capitalize",
              fontWeight: 600,
              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
            }}
            startIcon={
              <ChatBubbleOutlineOutlined />
            }
            >
            Contacter
          </Button>
          <Button
            variant="contained"
            fullWidth
            sx={{ textTransform: 'capitalize', fontWeight: 600 }}
            disabled={isChecking}
            startIcon={isChecking ? <CircularProgress size={18} color="inherit" /> : <CheckBoxOutlined />}
            onClick={async () => {
              if (selectedSlot === null) {
                setNotification({ open: true, message: 'Veuillez sélectionner un créneau avant de réserver.', severity: 'warning' });
                return;
              }
              if (!selectedDate) {
                setNotification({ open: true, message: 'Veuillez sélectionner une date.', severity: 'warning' });
                return;
              }
              // ensure selected date is not before today
              if (!dayjs(selectedDate).isValid() || dayjs(selectedDate).startOf('day').isBefore(dayjs().startOf('day'))) {
                setNotification({ open: true, message: 'La date sélectionnée ne peut pas être antérieure à aujourd\'hui.', severity: 'error' });
                return;
              }

              const idx = Number(selectedSlot);
              const slot = announcement.slots && announcement.slots[idx] ? announcement.slots[idx] : null;
              if (!slot) {
                setNotification({ open: true, message: 'Créneau invalide.', severity: 'error' });
                return;
              }
              // prevent author from reserving their own announcement
              if (typeof currentUserId !== 'undefined' && currentUserId !== null && String(currentUserId) === String(announcement.userId)) {
                setNotification({ open: true, message: 'Vous ne pouvez pas réserver votre propre annonce.', severity: 'warning' });
                return;
              }

              // map announcement slot day (1..7 with 7=Sunday) to dayjs day (0..6, 0=Sunday)
              const slotDayJs = Number(slot.day) % 7;
              const pickedDayJs = dayjs(selectedDate).day();
              if (pickedDayJs !== slotDayJs) {
                setNotification({ open: true, message: 'Le jour sélectionné ne correspond pas au jour de disponibilité du créneau.', severity: 'error' });
                return;
              }

              const normalizedDate = dayjs(selectedDate).format('YYYY-MM-DD');

              // call API to check if this slot is already taken by any user for this announcement/slotIndex/date
              setIsChecking(true);
              try {
                const params = new URLSearchParams({ announcementId: String(announcement.id), slotIndex: String(idx), date: normalizedDate });
                // Don't include userId to check if ANY user has reserved this slot for this date
                const resp = await fetchWithAuth('/api/reservations?' + params.toString());
                const json = await resp.json();
                if (resp.ok && json.exists) {
                  // Check if it's the current user's reservation
                  const userId = (() => { try { return localStorage.getItem('proximis_userId'); } catch { return null; } })();
                  const userReservation = userId && json.reservations?.find((r: any) => String(r.userId) === String(userId));
                  if (userReservation) {
                    setNotification({ open: true, message: 'Vous avez déjà réservé ce créneau à la date choisie.', severity: 'warning' });
                  } else {
                    setNotification({ open: true, message: 'Ce créneau est déjà réservé pour cette date.', severity: 'warning' });
                  }
                  setIsChecking(false);
                  return;
                }
              } catch (e) {
                // ignore check failure but warn the user
                console.error('Could not check existing reservations', e);
                setNotification({ open: true, message: 'Impossible de vérifier les réservations existantes. Réessayez.', severity: 'warning' });
                setIsChecking(false);
                return;
              }

              // Create reservation directly with status "to_pay"
              try {
                const createRes = await fetchWithAuth('/api/reservations', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    announcementId: announcement.id,
                    slotIndex: idx,
                    userId: currentUserId,
                    date: normalizedDate,
                  }),
                });
                const createData = await createRes.json();
                if (createRes.ok && createData?.ok && createData?.reservation) {
                  // Store reservation ID and navigate to payment page
                  if (setSelectedReservationId) {
                    setSelectedReservationId(createData.reservation.id);
                  }
                  setIsChecking(false);
                  setCurrentPage && setCurrentPage('reservation');
                } else {
                  setNotification({ open: true, message: createData?.error || 'Erreur lors de la création de la réservation.', severity: 'error' });
                  setIsChecking(false);
                }
              } catch (err) {
                console.error('Error creating reservation', err);
                setNotification({ open: true, message: 'Erreur serveur lors de la création de la réservation.', severity: 'error' });
                setIsChecking(false);
              }
            }}
          >
            {isChecking ? 'Vérification...' : 'Réserver'}
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
              <Star sx={{ color: "#FFE135" }} />
              <span className='T4' style={{color:"#545454"}}>
                {averageRating !== null ? averageRating.toFixed(1) : '—'} - {reviewsCount} {reviewsCount === 1 ? 'Avis' : 'Avis'}
              </span>
          </div>
          <Button 
            variant="outlined"
            fullWidth
            sx={{
              fontWeight: 600,
              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
              color: "#8C8C8C",
              borderColor: "#8C8C8C",
              textTransform: "none"
            }}
            onClick={() => {
              setCurrentPage && setCurrentPage('reviews');
            }}
            >
            Voir tous les avis
          </Button>
        </div>
      </div>
    </div>
    <Notification open={notification.open} onClose={() => setNotification(prev => ({ ...prev, open: false }))} severity={notification.severity} message={notification.message} />
    </>
  );
}
