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
  const { selectedAnnouncementId, setHeaderTitle, setSelectedProfileId, setCurrentPage, currentUserId, setSelectedReservationId, setSelectedConversationId, announcementUpdated, setAnnouncementUpdated } = useContent();
  const [announcement, setAnnouncement] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<any>(dayjs());
  const [isChecking, setIsChecking] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success'|'warning'|'error'|'info' }>({ open: false, message: '', severity: 'info' });
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<boolean>(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [isContacting, setIsContacting] = useState<boolean>(false);
  const [hasActiveReservations, setHasActiveReservations] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [reservationToEvaluateId, setReservationToEvaluateId] = useState<number | string | null>(null);

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
              // Load users to resolve author and current user
              const usersRes = await fetchWithAuth('/api/users');
              if (usersRes.ok) {
                const usersData = await usersRes.json();
                if (usersData?.users && Array.isArray(usersData.users)) {
                  const annUserId = typeof ann.userId === 'number' ? ann.userId : Number(ann.userId);
                  const foundAuthor = usersData.users.find((u: any) => Number(u.id) === annUserId) || null;
                  const foundCurrent = currentUserId != null ? usersData.users.find((u: any) => Number(u.id) === Number(currentUserId)) || null : null;
                  if (!cancelled) {
                    setAuthor(foundAuthor);
                    setCurrentUser(foundCurrent);
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

  // If an announcement was updated elsewhere (e.g., edit page), refresh data once
  useEffect(() => {
    const refresh = async () => {
      if (!announcementUpdated || !selectedAnnouncementId) return;
      try {
        const announcementRes = await fetchWithAuth(`/api/announcements/${selectedAnnouncementId}`);
        const announcementData = await announcementRes.json();
        if (announcementRes.ok && announcementData?.ok && announcementData?.announcement) {
          const ann = announcementData.announcement;
          const transformedSlots = (ann.slots || []).map((slot: any) => {
            if (typeof slot.day === 'number' && slot.day >= 1 && slot.day <= 7) {
              return { ...slot, day: slot.day };
            }
            if (typeof slot.day === 'string') {
              const dayNum = parseInt(slot.day, 10);
              if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 7) {
                return { ...slot, day: dayNum };
              }
            }
            if (slot.start) {
              const date = dayjs(slot.start);
              if (date.isValid()) {
                const jsDay = date.day();
                const day = jsDay === 0 ? 7 : jsDay;
                return { ...slot, day };
              }
            }
            return { ...slot, day: 0 };
          }).filter((slot: any) => {
            const day = typeof slot.day === 'number' ? slot.day : (typeof slot.day === 'string' ? parseInt(slot.day, 10) : 0);
            return !isNaN(day) && day >= 1 && day <= 7;
          });
          setAnnouncement({ ...ann, slots: transformedSlots });
        }
      } catch {}
      finally {
        setAnnouncementUpdated && setAnnouncementUpdated(false);
      }
    };
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcementUpdated]);

  // Load active reservations for this announcement (owner cannot close if any active)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!announcement?.id) { setHasActiveReservations(false); return; }
        const res = await fetchWithAuth(`/api/reservations?announcementId=${encodeURIComponent(String(announcement.id))}`);
        const data = await res.json();
        if (!cancelled && res.ok && data?.reservations && Array.isArray(data.reservations)) {
          const active = data.reservations.some((r: any) => r && (r.status === 'reserved' || r.status === 'to_pay'));
          setHasActiveReservations(Boolean(active));
        } else if (!cancelled) {
          setHasActiveReservations(false);
        }
      } catch {
        if (!cancelled) setHasActiveReservations(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [announcement?.id]);

  // Detect if the current user has a reservation to evaluate for this announcement
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!announcement?.id || currentUserId == null) { setReservationToEvaluateId(null); return; }
        const res = await fetchWithAuth(`/api/reservations?announcementId=${encodeURIComponent(String(announcement.id))}`);
        const data = await res.json();
        if (!cancelled && res.ok && data?.reservations && Array.isArray(data.reservations)) {
          const meId = Number(currentUserId);
          const toEval = data.reservations.find((r: any) => r && r.status === 'to_evaluate' && Number(r.userId) === meId);
          setReservationToEvaluateId(toEval ? toEval.id : null);
        } else if (!cancelled) {
          setReservationToEvaluateId(null);
        }
      } catch {
        if (!cancelled) setReservationToEvaluateId(null);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [announcement?.id, currentUserId]);

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

  // Compute distance between current user and announcement author (geocoding fallback)
  useEffect(() => {
    let cancelled = false;
    const computeDistance = async () => {
      setDistanceKm(null);
      if (!author || !currentUser) return;
      const directAuthor = getUserCoords(author);
      const directCurrent = getUserCoords(currentUser);
      let a = directAuthor;
      let c = directCurrent;
      if (!a) {
        const addrA = buildAddress(author);
        a = await geocodeAddress(addrA, author?.pays);
      }
      if (!c) {
        const addrC = buildAddress(currentUser);
        c = await geocodeAddress(addrC, currentUser?.pays);
      }
      if (!cancelled) {
        if (a && c) {
          setDistanceKm(haversineDistanceKm(c, a));
        } else {
          setDistanceKm(null);
        }
      }
    };
    computeDistance();
    return () => { cancelled = true; };
  }, [author, currentUser]);

  // Style calendar column headers based on available days
  useEffect(() => {
    if (!announcement?.slots || announcement.slots.length === 0) return;
    
    const availableDays = new Set(
      announcement.slots.map((slot: any) => Number(slot.day))
    );
    
    // Map our day format (1=Monday, 7=Sunday) to column index (0=Monday, 6=Sunday)
    const dayToColumnIndex = (day: number) => {
      return day === 7 ? 6 : day - 1; // Sunday is 7 in our format, but 6 in column index
    };
    
    // Apply styles to column headers after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const dayLabels = document.querySelectorAll('.MuiDayCalendar-weekDayLabel');
      dayLabels.forEach((label, index) => {
        const dayNumber = index === 6 ? 7 : index + 1; // Convert column index to our day format
        if (!availableDays.has(dayNumber)) {
          (label as HTMLElement).style.color = '#d0d0d0';
          (label as HTMLElement).style.opacity = '0.5';
        } else {
          (label as HTMLElement).style.color = '';
          (label as HTMLElement).style.opacity = '';
        }
      });
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [announcement?.slots]);

  // Reset selected slot when date changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

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

  function haversineDistanceKm(a: {lat: number, lng: number}, b: {lat: number, lng: number}) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function getUserCoords(u: any): {lat: number, lng: number} | null {
    if (!u) return null;
    const lat = u.latitude ?? u.lat ?? (u.position?.lat);
    const lng = u.longitude ?? u.lng ?? (u.position?.lng);
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng };
    }
    return null;
  }

  function buildAddress(u: any): string {
    if (!u) return '';
    const parts = [u.adresse, u.codePostal, u.ville, u.pays].filter(Boolean);
    return parts.join(' ');
  }

  async function geocodeAddress(address: string, country?: string): Promise<{lat: number, lng: number} | null> {
    try {
      if (!address || typeof window === 'undefined') return null;
      const query = (address + (country ? ' ' + country : '')).trim();
      const cacheKey = 'proximis_geocode_' + encodeURIComponent(query.toLowerCase());
      const ttlMs = 30 * 24 * 60 * 60 * 1000; // 30 days
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const obj = JSON.parse(cached);
          if (obj && obj.lat != null && obj.lng != null && obj.ts && (Date.now() - obj.ts) < ttlMs) {
            return { lat: Number(obj.lat), lng: Number(obj.lng) };
          }
        }
      } catch {}

      const countryParam = country && /france|^fr$/i.test(country) ? '&countrycodes=fr' : '';
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0${countryParam}&q=${encodeURIComponent(query)}`;
      const resp = await fetch(url, {
        headers: {
          'Accept-Language': 'fr',
        },
      });
      if (!resp.ok) return null;
      const arr = await resp.json();
      if (Array.isArray(arr) && arr.length > 0 && arr[0]?.lat && arr[0]?.lon) {
        const lat = parseFloat(arr[0].lat);
        const lng = parseFloat(arr[0].lon);
        try { localStorage.setItem(cacheKey, JSON.stringify({ lat, lng, ts: Date.now() })); } catch {}
        return { lat, lng };
      }
      return null;
    } catch {
      return null;
    }
  }

  return (
    <>
    <div className='announceDEtails'>
      <div className='announceDEtailsHeader'
        style={{
          backgroundImage: announcement.photo && !String(announcement.photo).startsWith('/uploads/') ? `url("${String(announcement.photo)}")` : undefined,
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
          {announcement?.isAvailable === false ? 'Clôturée' : 'Disponible'}
        </span>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <div
            className='TSemibold'
            style={{display: "flex", columnGap: 8, alignItems: "center", color: '#545454', cursor: 'pointer'}}
            onClick={() => {
              const authorId = author ? Number(author.id) : null;
              setSelectedProfileId && setSelectedProfileId(authorId);
              setCurrentPage && setCurrentPage('public_profile');
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
          {distanceKm != null ? (
            <span className='T6' style={{ color: "#8c8c8c"}}>à {distanceKm.toFixed(1)} km</span>
          ) : (
            <span className='T6' style={{ color: "#8c8c8c"}}>- km</span>
          )}
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
            <DateCalendar 
              value={selectedDate} 
              onChange={(d) => setSelectedDate(d)} 
              minDate={dayjs()}
              shouldDisableDate={(date) => {
                if (!announcement?.slots || announcement.slots.length === 0) {
                  return true; // Disable all dates if no slots
                }
                // Get unique available days from slots (1-7, where 1=Monday, 7=Sunday)
                const availableDays = new Set(
                  announcement.slots.map((slot: any) => Number(slot.day))
                );
                // Convert dayjs day (0=Sunday, 1=Monday, ..., 6=Saturday) to our format (1=Monday, 7=Sunday)
                const dayjsDay = date.day();
                const ourDay = dayjsDay === 0 ? 7 : dayjsDay;
                // Disable dates that don't match any available day
                return !availableDays.has(ourDay);
              }}
              sx={{
                '& .MuiPickersCalendarHeader-root': {
                  paddingLeft: '16px',
                  paddingRight: '16px',
                },
                '& .MuiDayCalendar-weekContainer': {
                  '& .MuiPickersDay-root': {
                    // Style for available days
                    '&:not(.Mui-disabled)': {
                      backgroundColor: 'rgba(255, 146, 2, 0.2)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 146, 2, 0.4)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'var(--secondary)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'var(--secondary)',
                        },
                      },
                    },
                    // Style for disabled (unavailable) days
                    '&.Mui-disabled': {
                      color: '#d0d0d0',
                      backgroundColor: '#f5f5f5',
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>
          <div className='announcementAvailabilityOptions'>
            {(() => {
              // Convert selected date to our day format (1=Monday, 7=Sunday)
              const selectedDayJs = selectedDate ? dayjs(selectedDate).day() : null;
              const selectedDay = selectedDayJs !== null ? (selectedDayJs === 0 ? 7 : selectedDayJs) : null;
              
              // Filter slots to show only those for the selected day
              const filteredSlots = announcement?.slots?.filter((slot: any) => {
                const slotDay = Number(slot.day);
                return slotDay === selectedDay;
              }) || [];
              
              // Get the original index of each slot in the full slots array for selection
              const slotsWithOriginalIndex = filteredSlots.map((slot: any) => {
                const originalIndex = announcement.slots.findIndex((s: any) => 
                  s.day === slot.day && 
                  s.start === slot.start && 
                  s.end === slot.end
                );
                return { ...slot, originalIndex };
              });
              
              if (!announcement?.slots || announcement.slots.length === 0) {
                return <div><span className='T6'>Aucun créneau disponible</span></div>;
              }
              
              if (selectedDay === null || filteredSlots.length === 0) {
                return <div><span className='T6'>Aucun créneau disponible pour ce jour</span></div>;
              }
              
              return slotsWithOriginalIndex.map((slot: any, displayIndex: number) => {
                const originalIndex = slot.originalIndex;
                return (
                  <div className='announcementAvailabilityOptionsItem' key={`${selectedDay}-${displayIndex}`}>
                    <div className='announcementAvailabilityOption' style={{ backgroundColor: 'rgba(3, 166, 137, 0.5)', color: 'white' }}>
                      <span className='T6'>{getDayLabelById(selectedDay)}</span>
                    </div>
                    <Radio
                      checked={String(selectedSlot) === String(originalIndex)}
                      onChange={() => setSelectedSlot(String(originalIndex))}
                      inputProps={{
                        'aria-label': `slot-${originalIndex}`,
                      }}
                    />
                    <div>
                      <span className='T6' style={{color: "#545454"}}>{formatTime(slot.start)} - {formatTime(slot.end)}</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
        <div className='actionSection'>
          {currentUserId != null && announcement && String(currentUserId) === String(announcement.userId) ? (
            // Owner view
            hasActiveReservations ? (
              <div
                className='T6'
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: '#FFF3CD',
                  color: '#8A6D3B',
                  border: '1px solid #FFEEBA',
                  marginBottom: 12,
                  textAlign: 'center',
                }}
              >
                Vous ne pouvez pas clôturer un Service ayant des Réservations actives.
              </div>
            ) : (
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                disabled={isClosing}
                sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                onClick={async () => {
                  if (!announcement) return;
                  const ok = typeof window !== 'undefined' ? window.confirm("Êtes-vous sûr de vouloir clôturer cette annonce ?") : false;
                  if (!ok) return;
                  try {
                    setIsClosing(true);
                    const res = await fetchWithAuth(`/api/announcements/${announcement.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: announcement.id, isAvailable: false }),
                    });
                    const json = await res.json();
                    if (res.ok && json?.ok) {
                      setAnnouncement((prev: any) => prev ? { ...prev, isAvailable: false } : prev);
                      setNotification({ open: true, message: 'Annonce clôturée', severity: 'success' });
                    } else {
                      setNotification({ open: true, message: json?.error || 'Erreur lors de la clôture.', severity: 'error' });
                    }
                  } catch {
                    setNotification({ open: true, message: 'Erreur réseau lors de la clôture.', severity: 'error' });
                  } finally {
                    setIsClosing(false);
                  }
                }}
              >
                {isClosing ? 'Clôture…' : 'Clôturer'}
              </Button>
            )
          ) : (
            <>
          <Button 
            variant="outlined"
            fullWidth
            sx={{
              textTransform: "capitalize",
              fontWeight: 600,
              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
            }}
                startIcon={<ChatBubbleOutlineOutlined />}
                disabled={isContacting || !currentUserId || !announcement || !author || announcement?.isAvailable === false}
            onClick={async () => {
              if (!currentUserId || !announcement || !author) {
                setNotification({ open: true, message: 'Impossible de contacter le propriétaire.', severity: 'error' });
                return;
              }
              
              // Prevent contacting yourself
              if (Number(currentUserId) === Number(announcement.userId)) {
                setNotification({ open: true, message: 'Vous ne pouvez pas vous contacter vous-même.', severity: 'warning' });
                return;
              }

              setIsContacting(true);
              try {
                // Check if conversation already exists
                const conversationId = `conv_${currentUserId}_${announcement.userId}_${announcement.id}`;
                
                // Try to get existing conversation
                const checkRes = await fetchWithAuth(`/api/conversations?conversationId=${encodeURIComponent(conversationId)}`);
                const checkData = await checkRes.json();
                
                if (checkRes.ok && checkData.conversation) {
                  // Conversation exists, navigate to it
                  if (setSelectedConversationId) {
                    setSelectedConversationId(conversationId);
                  }
                  if (setCurrentPage) {
                    setCurrentPage('message_chat', ['home', 'messages']);
                  }
                } else {
                  // Create new conversation with initial message
                  const currentUserRes = await fetchWithAuth('/api/users');
                  const currentUserData = currentUserRes.ok ? await currentUserRes.json() : { users: [] };
                  const currentUser = currentUserData?.users?.find((u: any) => Number(u.id) === Number(currentUserId));
                  const currentUserName = currentUser 
                    ? `${currentUser.prenom || ""} ${currentUser.nom || ""}`.trim() || currentUser.name || "Utilisateur"
                    : "Utilisateur";
                  
                  const initialMessage = `Bonjour ${author.prenom || author.nom || "Prestataire"}, je suis intéressé(e) par votre annonce "${announcement.title}".`;
                  
                  const createRes = await fetchWithAuth('/api/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fromUserId: currentUserId,
                      toUserId: announcement.userId,
                      announcementId: announcement.id,
                      initialMessage: initialMessage,
                    }),
                  });
                  
                  const createData = await createRes.json();
                  
                  if (createRes.ok && createData?.ok && createData?.conversation) {
                    // Navigate to the new conversation
                    if (setSelectedConversationId) {
                      setSelectedConversationId(createData.conversation.id);
                    }
                    if (setCurrentPage) {
                      setCurrentPage('message_chat', ['home', 'messages']);
                    }
                  } else {
                    setNotification({ 
                      open: true, 
                      message: createData?.error || 'Erreur lors de la création de la conversation.', 
                      severity: 'error' 
                    });
                  }
                }
              } catch (error) {
                console.error('Error contacting owner:', error);
                setNotification({ 
                  open: true, 
                  message: 'Erreur lors de la création de la conversation.', 
                  severity: 'error' 
                });
              } finally {
                setIsContacting(false);
              }
            }}
            >
            {isContacting ? 'Connexion...' : 'Contacter'}
          </Button>
              {reservationToEvaluateId ? (
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ textTransform: 'capitalize', fontWeight: 600, backgroundColor: '#ff9202', '&:hover': { backgroundColor: '#e58202' } }}
                  disabled={announcement?.isAvailable === false}
                  onClick={() => {
                    if (setSelectedReservationId && setCurrentPage && reservationToEvaluateId != null) {
                      setSelectedReservationId(reservationToEvaluateId);
                      setCurrentPage('evaluate');
                    }
                  }}
                >
                  Évaluer
                </Button>
              ) : (
          <Button
            variant="contained"
            fullWidth
            sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                disabled={isChecking || announcement?.isAvailable === false}
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
                  if (announcement?.isAvailable === false) {
                    setNotification({ open: true, message: 'Cette annonce est clôturée et ne peut plus être réservée.', severity: 'warning' });
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
              )}
            </>
          )}
          <div 
            style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}
            onClick={() => {
              setCurrentPage && setCurrentPage('reviews');
            }}
          >
              <Star sx={{ color: "#FFE135" }} />
              <span className='T4' style={{color:"#545454"}}>
                {averageRating !== null ? averageRating.toFixed(1) : '0'} ( {reviewsCount} {reviewsCount === 1 ? 'Avis' : 'Avis' } )
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
